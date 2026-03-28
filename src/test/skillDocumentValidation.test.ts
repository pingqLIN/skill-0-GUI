import { describe, expect, it } from 'vitest';
import { validateSkillDocument } from '../services/skillDocumentValidation';

describe('skillDocumentValidation', () => {
  it('accepts a well-formed SkillDocument with no errors', () => {
    const result = validateSkillDocument({
      decomposition: {
        actions: [{ id: 'a_001', name: 'Read files', action_type: 'io_read' }],
        directives: [{ id: 'd_001', name: 'Keep evidence', directive_type: 'strategy' }],
        rules: [{ id: 'r_001', name: 'Review findings' }],
      },
      execution_paths: [{ id: 'path_001', steps: ['a_001', 'r_001', 'd_001'] }],
      meta: {
        title: 'Imported Skill',
      },
      original_definition: {
        source: 'json/test',
      },
    });

    expect(result.valid).toBe(true);
    expect(result.issues.filter((issue) => issue.severity === 'error')).toHaveLength(0);
  });

  it('returns warnings when provenance metadata is missing', () => {
    const result = validateSkillDocument({
      decomposition: {
        actions: [],
        directives: [],
        rules: [],
      },
      meta: {
        title: 'Imported Skill',
      },
    });

    expect(result.valid).toBe(true);
    expect(result.issues).toContainEqual(expect.objectContaining({
      code: 'SCHEMA_ORIGINAL_DEFINITION_RECOMMENDED',
      severity: 'warning',
    }));
  });

  it('returns errors for malformed decomposition nodes', () => {
    const result = validateSkillDocument({
      decomposition: {
        actions: [{ id: '', name: 'Read files', action_type: '' }],
        directives: [{ id: 'd_001', name: '', directive_type: '' }],
        rules: [{ id: '', name: '' }],
      },
      execution_paths: [{ id: '', steps: ['ok', ''] }],
      meta: {},
    } as any);

    expect(result.valid).toBe(false);
    expect(result.issues.some((issue) => issue.code === 'SCHEMA_META_TITLE')).toBe(true);
    expect(result.issues.some((issue) => issue.code === 'SCHEMA_ACTION_TYPE')).toBe(true);
    expect(result.issues.some((issue) => issue.code === 'SCHEMA_PATH_STEP')).toBe(true);
  });
});
