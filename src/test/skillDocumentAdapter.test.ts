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

  it('preserves prior session provenance when rebuilding after an edit', () => {
    const rebuilt = buildReviewDataFromSkillDocument(skillDocument, {
      editSource: 'structured',
      existingSession: {
        bridge: {
          error: null,
          mode: 'skill-0',
          skill0Root: '/home/miles/dev2/skill-0',
        },
        reviewerSummary: {
          equivalenceNote: 'implementation_identity',
          finalDecisionGuidance: 'Final equivalence review is acceptable.',
          mode: 'canonical',
          operatorReminders: [
            {
              action: 'Review parser findings before approval.',
              detail: 'Canonical review session.',
              id: 'rem-existing',
              label: 'Canonical review',
              level: 'medium',
            },
          ],
        },
      },
      fileName: 'edited-skill.json',
      sourceLabel: 'json/editor',
    });

    expect(rebuilt.bridge.mode).toBe('skill-0');
    expect(rebuilt.bridge.skill0Root).toBe('/home/miles/dev2/skill-0');
    expect(rebuilt.reviewerSummary.mode).toBe('canonical');
    expect(rebuilt.reviewerSummary.equivalenceNote).toBe('equivalence_unverified');
    expect(rebuilt.reviewerSummary.finalDecisionGuidance).toContain('after the last canonical skill-0 parser run');
    expect(rebuilt.reviewerSummary.operatorReminders.some((reminder: any) => reminder.id === 'rem-existing')).toBe(true);
    expect(rebuilt.reviewerSummary.operatorReminders.some((reminder: any) => reminder.id === 'rem-structured-edit')).toBe(true);
    expect(rebuilt.securityScan.findings[0].ruleId).toBe('EDIT-001');
  });

  it('preserves malformed execution path entries for downstream validation', () => {
    const extracted = extractSkillDocumentFromReviewData({
      parserResult: {
        decomposition: skillDocument.decomposition,
        execution_paths: [
          {
            branches: [{ condition: 'fallback' }],
            name: 'broken-path',
          },
        ],
        meta: skillDocument.meta,
      },
    });

    expect(extracted?.execution_paths).toEqual([
      {
        branches: [{ condition: 'fallback', target: '' }],
        entry_condition: undefined,
        failure_end: undefined,
        id: '',
        name: 'broken-path',
        steps: [],
        success_end: undefined,
      },
    ]);
  });
});
