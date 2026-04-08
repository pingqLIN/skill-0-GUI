import { describe, expect, it } from 'vitest';
import { applyEditorSave } from '../services/editorSaveService';

const baseData = {
  projectId: 'editor-demo',
  projectName: 'Editor Demo',
  phases: [
    {
      id: 'phase-a',
      name: 'Phase A',
      input: ['input-a'],
      tasks: ['task-a'],
      output: ['output-a'],
      decisionNodes: [
        {
          id: 'A1',
          question: 'Question A1',
          threshold: '100%',
          outcomes: { yes: 'Proceed', no: 'Stop' },
        },
      ],
    },
  ],
  riskAssessment: { level: 'LOW', details: 'review' },
  threeClassification: { category: 'review', granularity: 'task', operability: 92 },
  globalMetrics: { decisionConfidence: 84, reworkRate: 14, goalAchievementRate: 95, deliveryTime: 1.2 },
  parserResult: {
    meta: { title: 'Editor Demo', name: 'Editor Demo', skill_id: 'editor-demo', parser_version: 'v1', schema_version: '2.4.0' },
    decomposition: {
      actions: [{ id: 'a_001', name: 'Read bundle', action_type: 'io_read' }],
      rules: [],
      directives: [],
    },
    execution_paths: [{ id: 'path_001', name: 'default', steps: ['a_001'] }],
    original_definition: { source: 'editor-save-test' },
  },
  reviewerSummary: { reviewStatus: 'draft', operatorReminders: [] },
};

describe('applyEditorSave', () => {
  it('updates global fields without mutating unrelated metrics', () => {
    const result = applyEditorSave({
      data: baseData,
      editorConfig: {
        type: 'global',
        payload: baseData,
      },
      modifiedPaths: new Set<string>(),
      updatedData: {
        projectName: 'Editor Demo Renamed',
        riskAssessment: { level: 'MEDIUM', details: 'review' },
        threeClassification: { category: 'verification', granularity: 'task', operability: 92 },
      },
    });

    expect(result).not.toBeNull();
    expect(result?.data.projectName).toBe('Editor Demo Renamed');
    expect(result?.data.riskAssessment.level).toBe('MEDIUM');
    expect(result?.data.threeClassification.category).toBe('verification');
    expect(result?.data.globalMetrics).toEqual(baseData.globalMetrics);
    expect(Array.from(result?.modifiedPaths ?? [])).toEqual([
      'projectName',
      'riskAssessment.level',
      'threeClassification.category',
    ]);
  });

  it('preserves previous change markers when saving through the structured editor', () => {
    const updatedSkillDocument = {
      meta: {
        title: 'Structured Editor Demo',
        name: 'Structured Editor Demo',
        description: 'Updated through the structured editor',
        version: '1.0.0',
        schema_version: '2.4.0',
        parser_version: 'v1',
        skill_id: 'editor-demo',
      },
      decomposition: {
        actions: [{ id: 'a_001', name: 'Read bundle', action_type: 'io_read' }],
        rules: [],
        directives: [],
      },
      execution_paths: [{ id: 'path_001', name: 'default', steps: ['a_001'] }],
      original_definition: {
        source: 'editor-save-test',
      },
    };

    const result = applyEditorSave({
      data: baseData,
      editorConfig: {
        type: 'skillDocument',
        payload: updatedSkillDocument,
      },
      modifiedPaths: new Set(['projectName']),
      updatedData: updatedSkillDocument,
    });

    expect(result).not.toBeNull();
    expect(result?.data.projectName).toBe('Structured Editor Demo');
    expect(Array.from(result?.modifiedPaths ?? [])).toEqual([
      'projectName',
      'skillDocument.structured',
    ]);
  });
});
