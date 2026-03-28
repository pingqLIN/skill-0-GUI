import { describe, expect, it } from 'vitest';
import {
  resolveConsistencyIssueFieldPath,
  resolveValidationIssueFieldPath,
} from '../services/skillDocumentIssueNavigation';

const skillDocument = {
  decomposition: {
    actions: [{ id: 'a_001', name: 'Read files', action_type: 'io_read' }],
    directives: [{ id: 'd_001', name: 'Keep evidence', directive_type: 'strategy' }],
    rules: [{ id: 'r_001', name: 'Review findings' }],
  },
  execution_paths: [{ id: 'path_001', steps: ['a_001', 'r_001', 'd_001'] }],
  meta: { title: 'Imported Skill' },
};

describe('skillDocumentIssueNavigation', () => {
  it('keeps supported validation paths intact', () => {
    expect(resolveValidationIssueFieldPath({
      code: 'SCHEMA_PATH_ID',
      message: 'Each execution path requires a non-empty string `id`.',
      path: 'execution_paths[0].id',
      severity: 'error',
    })).toBe('execution_paths[0].id');

    expect(resolveValidationIssueFieldPath({
      code: 'SCHEMA_ORIGINAL_DEFINITION_RECOMMENDED',
      message: 'original_definition is recommended.',
      path: 'original_definition',
      severity: 'warning',
    })).toBeNull();
  });

  it('maps consistency issues to structured editor fields', () => {
    expect(resolveConsistencyIssueFieldPath(skillDocument, {
      message: 'Execution path path_001 references missing element id: missing_step',
      severity: 'error',
      targetId: 'path_001',
      type: 'missing_reference',
    })).toBe('execution_paths[0].steps');

    expect(resolveConsistencyIssueFieldPath(skillDocument, {
      message: 'Action a_001 is missing a visible name.',
      severity: 'warning',
      targetId: 'a_001',
      type: 'empty_required_field',
    })).toBe('decomposition.actions[0].name');
  });
});
