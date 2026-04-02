import { describe, expect, it } from 'vitest';
import { buildSkillDocumentDiffSummary } from '../services/reviewDiffService';
import type { SkillDocument } from '../types/skillDocument';

const beforeDocument: SkillDocument = {
  decomposition: {
    actions: [{ id: 'action.read', name: 'Read file', action_type: 'io.read' }],
    directives: [],
    rules: [],
  },
  execution_paths: [],
  meta: {
    title: 'Demo skill',
  },
  original_definition: {
    source: 'json/test',
  },
};

describe('reviewDiffService', () => {
  it('summarizes added, removed, and changed entries between SkillDocuments', () => {
    const summary = buildSkillDocumentDiffSummary(beforeDocument, {
      ...beforeDocument,
      decomposition: {
        actions: [{ id: 'action.read', name: 'Read file safely', action_type: 'io.read' }],
        directives: [{ id: 'directive.audit', name: 'Audit', directive_type: 'review' }],
        rules: [],
      },
      meta: {
        title: 'Demo skill updated',
      },
    });

    expect(summary.added).toEqual(['directive:directive.audit']);
    expect(summary.removed).toEqual([]);
    expect(summary.changed).toContain('action:action.read');
    expect(summary.changed).toContain('meta');
    expect(summary.stats.directivesAdded).toBe(1);
    expect(summary.stats.fieldsChanged).toBe(2);
  });
});
