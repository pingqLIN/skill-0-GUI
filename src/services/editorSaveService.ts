import { buildReviewDataFromSkillDocument } from './skillDocumentAdapter';
import type { EditorConfig } from '../types/workspace';

type ApplyEditorSaveArgs = {
  data: any | null;
  editorConfig: Exclude<EditorConfig, null>;
  modifiedPaths: Set<string>;
  updatedData: any;
};

type ApplyEditorSaveResult = {
  data: any;
  modifiedPaths: Set<string>;
};

export function applyEditorSave({
  data,
  editorConfig,
  modifiedPaths,
  updatedData,
}: ApplyEditorSaveArgs): ApplyEditorSaveResult | null {
  if (!data) {
    return null;
  }

  if (editorConfig.type === 'json' || editorConfig.type === 'skillDocument') {
    const sourceLabel = data?.parserResult?.original_definition?.source || 'json/editor';
    const rebuiltData = buildReviewDataFromSkillDocument(updatedData, {
      editSource: editorConfig.type === 'json' ? 'json' : 'structured',
      existingSession: data,
      fileName: `${data.projectId || 'skill-document'}.json`,
      sourceLabel,
    });
    const nextModifiedPaths = new Set(modifiedPaths);
    nextModifiedPaths.add(editorConfig.type === 'json' ? 'skillDocument.json' : 'skillDocument.structured');

    return {
      data: rebuiltData,
      modifiedPaths: nextModifiedPaths,
    };
  }

  const nextData = JSON.parse(JSON.stringify(data));
  const nextModifiedPaths = new Set(modifiedPaths);

  if (editorConfig.type === 'global') {
    if (nextData.projectName !== updatedData.projectName) nextModifiedPaths.add('projectName');
    if (nextData.riskAssessment.level !== updatedData.riskAssessment.level) nextModifiedPaths.add('riskAssessment.level');
    if (nextData.threeClassification.category !== updatedData.threeClassification.category) nextModifiedPaths.add('threeClassification.category');

    nextData.projectName = updatedData.projectName;
    nextData.riskAssessment = updatedData.riskAssessment;
    nextData.threeClassification = updatedData.threeClassification;
  } else if (editorConfig.type === 'phase') {
    const phaseIndex = nextData.phases.findIndex((phase: any) => phase.id === updatedData.id);
    if (phaseIndex !== -1) {
      const oldPhase = nextData.phases[phaseIndex];
      const basePath = `phases.${updatedData.id}`;

      if (oldPhase.name !== updatedData.name) nextModifiedPaths.add(`${basePath}.name`);
      if (JSON.stringify(oldPhase.input) !== JSON.stringify(updatedData.input)) nextModifiedPaths.add(`${basePath}.input`);
      if (JSON.stringify(oldPhase.tasks) !== JSON.stringify(updatedData.tasks)) nextModifiedPaths.add(`${basePath}.tasks`);
      if (JSON.stringify(oldPhase.output) !== JSON.stringify(updatedData.output)) nextModifiedPaths.add(`${basePath}.output`);

      nextData.phases[phaseIndex] = { ...oldPhase, ...updatedData };
    }
  } else if (editorConfig.type === 'decision') {
    const phaseIndex = nextData.phases.findIndex((phase: any) => phase.id === editorConfig.phaseId);
    if (phaseIndex !== -1) {
      const nodeIndex = nextData.phases[phaseIndex].decisionNodes.findIndex((node: any) => node.id === updatedData.id);
      if (nodeIndex !== -1) {
        const oldNode = nextData.phases[phaseIndex].decisionNodes[nodeIndex];
        const basePath = `phases.${editorConfig.phaseId}.decisionNodes.${updatedData.id}`;

        if (oldNode.question !== updatedData.question) nextModifiedPaths.add(`${basePath}.question`);
        if (oldNode.threshold !== updatedData.threshold) nextModifiedPaths.add(`${basePath}.threshold`);
        if (oldNode.outcomes.yes !== updatedData.outcomes.yes) nextModifiedPaths.add(`${basePath}.outcomes.yes`);
        if (oldNode.outcomes.no !== updatedData.outcomes.no) nextModifiedPaths.add(`${basePath}.outcomes.no`);

        nextData.phases[phaseIndex].decisionNodes[nodeIndex] = updatedData;
      }
    }
  }

  return {
    data: nextData,
    modifiedPaths: nextModifiedPaths,
  };
}
