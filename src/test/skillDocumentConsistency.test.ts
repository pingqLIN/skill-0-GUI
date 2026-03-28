import { describe, expect, it } from 'vitest';
import { checkSkillDocumentConsistency } from '../services/skillDocumentConsistency';

describe('skillDocumentConsistency', () => {
  it('accepts a consistent SkillDocument', () => {
    const result = checkSkillDocumentConsistency({
      decomposition: {
        actions: [{ id: 'a_001', name: 'Read files', action_type: 'io_read' }],
        directives: [{ id: 'd_001', name: 'Keep evidence', directive_type: 'strategy' }],
        rules: [{ id: 'r_001', name: 'Review findings' }],
      },
      execution_paths: [{ id: 'path_001', steps: ['a_001', 'r_001', 'd_001'] }],
      meta: { title: 'Imported Skill' },
    });

    expect(result.valid).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  it('reports duplicate ids and missing execution path references', () => {
    const result = checkSkillDocumentConsistency({
      decomposition: {
        actions: [
          { id: 'dup_001', name: 'Read files', action_type: 'io_read' },
          { id: 'dup_001', name: 'Write files', action_type: 'io_write' },
        ],
        directives: [],
        rules: [{ id: 'r_001', name: 'Review findings' }],
      },
      execution_paths: [{ id: 'path_001', steps: ['dup_001', 'missing_step'] }],
      meta: { title: 'Imported Skill' },
    });

    expect(result.valid).toBe(false);
    expect(result.issues.some((issue) => issue.type === 'duplicate_id')).toBe(true);
    expect(result.issues.some((issue) => issue.type === 'missing_reference')).toBe(true);
  });

  it('reports invalid branch targets and orphan paths', () => {
    const result = checkSkillDocumentConsistency({
      decomposition: {
        actions: [{ id: 'a_001', name: 'Read files', action_type: 'io_read' }],
        directives: [],
        rules: [],
      },
      execution_paths: [
        {
          branches: [{ target: 'missing_path' }],
          id: 'path_001',
          steps: ['a_001'],
        },
        {
          id: 'path_002',
          steps: ['a_001'],
        },
      ],
      meta: { title: 'Imported Skill' },
    });

    expect(result.valid).toBe(false);
    expect(result.issues.some((issue) => issue.type === 'invalid_branch')).toBe(true);
    expect(result.issues.some((issue) => issue.type === 'orphan_path')).toBe(true);
  });

  it('accepts forward branch references to later execution paths', () => {
    const result = checkSkillDocumentConsistency({
      decomposition: {
        actions: [{ id: 'a_001', name: 'Read files', action_type: 'io_read' }],
        directives: [],
        rules: [],
      },
      execution_paths: [
        {
          branches: [{ target: 'path_002' }],
          id: 'path_001',
          steps: ['a_001'],
        },
        {
          entry_condition: 'when advanced mode is enabled',
          id: 'path_002',
          steps: ['a_001'],
        },
      ],
      meta: { title: 'Imported Skill' },
    });

    expect(result.valid).toBe(true);
    expect(result.issues.some((issue) => issue.type === 'invalid_branch')).toBe(false);
  });

  it('warns when multiple implicit root paths are present', () => {
    const result = checkSkillDocumentConsistency({
      decomposition: {
        actions: [{ id: 'a_001', name: 'Read files', action_type: 'io_read' }],
        directives: [],
        rules: [],
      },
      execution_paths: [
        { id: 'path_001', steps: ['a_001'] },
        { id: 'path_002', steps: ['a_001'] },
      ],
      meta: { title: 'Imported Skill' },
    });

    expect(result.valid).toBe(true);
    expect(result.issues.filter((issue) => issue.type === 'orphan_path')).toHaveLength(2);
  });
});
