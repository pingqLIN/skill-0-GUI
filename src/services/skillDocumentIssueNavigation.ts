import type { ConsistencyIssue, SkillDocument, ValidationIssue } from '../types/skillDocument';

function isSupportedValidationPath(path: string) {
  return path.startsWith('meta.')
    || path.startsWith('decomposition.actions[')
    || path.startsWith('decomposition.rules[')
    || path.startsWith('decomposition.directives[')
    || path.startsWith('execution_paths[');
}

function findSkillDocumentNodePath(skillDocument: SkillDocument, targetId?: string) {
  if (!targetId) {
    return null;
  }

  const actionIndex = skillDocument.decomposition.actions.findIndex((action) => action.id === targetId);
  if (actionIndex !== -1) {
    return `decomposition.actions[${actionIndex}]`;
  }

  const ruleIndex = skillDocument.decomposition.rules.findIndex((rule) => rule.id === targetId);
  if (ruleIndex !== -1) {
    return `decomposition.rules[${ruleIndex}]`;
  }

  const directiveIndex = skillDocument.decomposition.directives.findIndex((directive) => directive.id === targetId);
  if (directiveIndex !== -1) {
    return `decomposition.directives[${directiveIndex}]`;
  }

  const executionPathIndex = (skillDocument.execution_paths ?? []).findIndex((executionPath) => executionPath.id === targetId);
  if (executionPathIndex !== -1) {
    return `execution_paths[${executionPathIndex}]`;
  }

  return null;
}

export function resolveValidationIssueFieldPath(issue: ValidationIssue) {
  return isSupportedValidationPath(issue.path) ? issue.path : null;
}

export function resolveConsistencyIssueFieldPath(skillDocument: SkillDocument, issue: ConsistencyIssue) {
  const nodePath = findSkillDocumentNodePath(skillDocument, issue.targetId);
  if (!nodePath) {
    return null;
  }

  if (issue.type === 'empty_required_field') {
    return `${nodePath}.name`;
  }
  if (issue.type === 'missing_reference') {
    return `${nodePath}.steps`;
  }
  if (issue.type === 'invalid_branch') {
    return `${nodePath}.branches`;
  }
  if (issue.type === 'orphan_path') {
    return `${nodePath}.entry_condition`;
  }
  return `${nodePath}.id`;
}
