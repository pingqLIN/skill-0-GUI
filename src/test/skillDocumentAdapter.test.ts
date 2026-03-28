import { describe, expect, it } from 'vitest';
import {
  buildReviewDataFromSkillDocument,
  extractSkillDocumentFromReviewData,
  parseSkillDocumentJson,
} from '../services/skillDocumentAdapter';

const skillDocument = {
  decomposition: {
    actions: [
      {
        action_type: 'io_read',
        id: 'a_001',
        name: 'Read project files',
      },
    ],
    directives: [
      {
        decomposable: true,
        description: 'Keep evidence attached to every finding.',
        directive_type: 'strategy',
        id: 'd_001',
        name: 'Evidence first',
      },
    ],
    rules: [
      {
        condition_expression: 'findings.length > 0',
        id: 'r_001',
        name: 'Review findings before approval',
        returns: 'boolean',
      },
    ],
  },
  execution_paths: [
    {
      id: 'path_001',
      name: 'default-review-path',
      steps: ['a_001', 'r_001', 'd_001'],
    },
  ],
  meta: {
    description: 'Imported skill document for studio review.',
    schema_version: '2.4.0',
    skill_id: 'claude__imported-skill',
    title: 'Imported Skill',
  },
};

describe('skillDocumentAdapter', () => {
  it('parses valid skill document JSON text', () => {
    expect(parseSkillDocumentJson(JSON.stringify(skillDocument))).toEqual(skillDocument);
    expect(parseSkillDocumentJson('{"invalid":true}')).toBeNull();
  });

  it('builds review workspace data from a skill document import', () => {
    const imported = buildReviewDataFromSkillDocument(skillDocument, {
      fileName: 'imported-skill.json',
      sourceLabel: 'json/test',
    });

    expect(imported.projectName).toBe('Imported Skill');
    expect(imported.bridge.mode).toBe('unknown');
    expect(imported.reviewerSummary.mode).toBe('unknown');
    expect(imported.reviewerSummary.equivalenceNote).toBe('equivalence_unverified');
    expect(imported.reviewerSummary.finalDecisionGuidance).toContain('Parser execution was not re-run');
    expect(imported.parserResult.execution_paths).toHaveLength(1);
    expect(imported.parserResult.original_definition.source).toBe('json/test');
    expect(imported.securityScan.findings[0].ruleId).toBe('IMPORT-001');
  });

  it('extracts a skill document back from review workspace data', () => {
    const imported = buildReviewDataFromSkillDocument(skillDocument, {
      fileName: 'imported-skill.json',
      sourceLabel: 'json/test',
    });

    expect(extractSkillDocumentFromReviewData(imported)).toEqual(imported.parserResult);
  });
});
