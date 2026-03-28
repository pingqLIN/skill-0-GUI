import { describe, expect, it } from 'vitest';
import {
  buildReviewPacketFromReviewData,
  buildValidationEvidenceFromReviewData,
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

  it('builds a review packet from review workspace data', () => {
    const imported = buildReviewDataFromSkillDocument(skillDocument, {
      fileName: 'imported-skill.json',
      sourceLabel: 'json/test',
    });

    const reviewPacket = buildReviewPacketFromReviewData(imported, {
      bridgeMode: 'unknown',
      bridgeModeSource: 'json/test',
      equivalenceStatus: 'equivalence_unverified',
      modifiedPaths: ['projectName', 'phases.A.name', 'metrics'],
      reviewDecisionGuidance: 'Re-run the canonical bridge before final approval.',
      reviewMode: 'unknown',
      reviewState: {
        decisionLog: [{
          action: 'requested_changes',
          id: 'decision-001',
          summary: 'Need canonical bridge rerun.',
          timestamp: '2026-03-28T00:00:00.000Z',
        }],
        elementNotes: [],
        globalNotes: [{
          author: 'Miles',
          content: 'Need a canonical rerun and schema validation evidence.',
          createdAt: '2026-03-28T00:00:00.000Z',
          id: 'note-001',
        }],
        reviewStatus: 'changes_requested',
        reviewerName: 'Miles',
        updatedAt: '2026-03-28T00:00:00.000Z',
      },
    });

    expect(reviewPacket).not.toBeNull();
    expect(reviewPacket?.projectId).toBe('claude__imported-skill');
    expect(reviewPacket?.skillDocument?.meta.skill_id).toBe('claude__imported-skill');
    expect(reviewPacket?.reviewState.reviewStatus).toBe('changes_requested');
    expect(reviewPacket?.reviewState.diffSummary?.changed).toEqual(['phases.A.name', 'projectName']);
    expect(reviewPacket?.reviewState.diffSummary?.stats.fieldsChanged).toBe(2);
    expect(reviewPacket?.validationEvidence?.provenance.schemaVersion).toBe('2.4.0');
    expect(reviewPacket?.reviewChecklist.map((item) => item.id)).toEqual([
      'bridge-mode',
      'schema-validation',
      'consistency-review',
      'review-decision',
    ]);
    expect(reviewPacket?.reviewChecklist[0].status).toBe('blocked');
    expect(reviewPacket?.operatorReminders).toHaveLength(1);
    expect(reviewPacket?.reviewDecisionGuidance).toContain('canonical bridge');
  });

  it('builds validation evidence from review workspace data', () => {
    const imported = buildReviewDataFromSkillDocument(skillDocument, {
      fileName: 'imported-skill.json',
      sourceLabel: 'json/test',
    });

    const validationEvidence = buildValidationEvidenceFromReviewData(imported);

    expect(validationEvidence).not.toBeNull();
    expect(validationEvidence?.provenance.schemaVersion).toBe('2.4.0');
    expect(validationEvidence?.validationRun.errors).toHaveLength(0);
    expect(validationEvidence?.consistencyRun.issues).toHaveLength(0);
    expect(validationEvidence?.evidenceWarnings).toContain('app.validationImportedJsonWarning');
  });

  it('uses the current review mode when building validation evidence warnings', () => {
    const imported = buildReviewDataFromSkillDocument(skillDocument, {
      fileName: 'imported-skill.json',
      sourceLabel: 'json/test',
    });

    const validationEvidence = buildValidationEvidenceFromReviewData(imported, {
      reviewMode: 'standalone',
    });

    expect(validationEvidence).not.toBeNull();
    expect(validationEvidence?.evidenceWarnings).toContain('app.validationStandaloneWarning');
    expect(validationEvidence?.evidenceWarnings).not.toContain('app.validationImportedJsonWarning');
  });

  it('surfaces schema and consistency failures in validation evidence', () => {
    const brokenDocument = {
      ...skillDocument,
      execution_paths: [
        {
          id: 'path_001',
          name: 'broken-path',
          steps: ['missing_001'],
        },
      ],
      meta: {
        ...skillDocument.meta,
        schema_version: 'unknown',
      },
    };
    const imported = buildReviewDataFromSkillDocument(brokenDocument, {
      fileName: 'broken-skill.json',
      sourceLabel: 'json/test',
    });

    const validationEvidence = buildValidationEvidenceFromReviewData(imported);

    expect(validationEvidence).not.toBeNull();
    expect(validationEvidence?.validationRun.errors.map((issue) => issue.code)).toContain('missing_schema_version');
    expect(validationEvidence?.consistencyRun.issues.map((issue) => issue.type)).toContain('missing_reference');
    expect(validationEvidence?.consistencyRun.issues.map((issue) => issue.message)).toContain(
      'app.validationMissingStepReference:path_001:missing_001',
    );
  });
});
