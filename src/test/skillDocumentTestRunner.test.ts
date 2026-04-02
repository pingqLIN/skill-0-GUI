import { describe, expect, it } from 'vitest';
import {
  createPathTestRun,
  createValidationRun,
} from '../services/skillDocumentTestRunner';
import type { SkillDocument } from '../types/skillDocument';

const baseDocument: SkillDocument = {
  decomposition: {
    actions: [
      { id: 'action.read', name: 'Read file', action_type: 'io.read' },
      { id: 'action.write', name: 'Write file', action_type: 'io.write' },
    ],
    directives: [],
    rules: [],
  },
  execution_paths: [
    {
      id: 'path.main',
      name: 'Main path',
      steps: ['action.read', 'action.write'],
    },
  ],
  meta: {
    schema_version: '1.0.0',
    title: 'Demo skill',
  },
  original_definition: {
    source: 'json/test',
  },
};

describe('skillDocumentTestRunner', () => {
  it('creates a passing path walk for a valid execution path', () => {
    const run = createPathTestRun(baseDocument);

    expect(run.status).toBe('passed');
    expect(run.actualPath).toEqual(['action.read', 'action.write']);
    expect(run.message).toContain('Walked 1 execution path');
  });

  it('fails the path walk when an execution path references a missing step', () => {
    const run = createPathTestRun({
      ...baseDocument,
      execution_paths: [
        {
          id: 'path.main',
          steps: ['action.read', 'action.missing'],
        },
      ],
    });

    expect(run.status).toBe('failed');
    expect(run.actualPath).toEqual(['action.read']);
    expect(run.message).toContain('missing step action.missing');
  });

  it('preserves validation warnings in reviewer-facing validation runs', () => {
    const run = createValidationRun({
      ...baseDocument,
      original_definition: undefined,
    });

    expect(run.status).toBe('passed');
    expect(run.errors).toHaveLength(0);
    expect(run.warnings).toHaveLength(1);
    expect(run.warnings?.[0]?.code).toBe('SCHEMA_ORIGINAL_DEFINITION_RECOMMENDED');
  });
});
