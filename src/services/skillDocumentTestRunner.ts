import { checkSkillDocumentConsistency } from './skillDocumentConsistency';
import { validateSkillDocument } from './skillDocumentValidation';
import type {
  ConsistencyRun,
  PathTestRun,
  SkillDocument,
  ValidationRun,
} from '../types/skillDocument';

function createRunId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function nowIso() {
  return new Date().toISOString();
}

export function createValidationRun(skillDocument: SkillDocument): ValidationRun {
  const startedAt = nowIso();
  const result = validateSkillDocument(skillDocument);
  const errors = result.issues.filter((issue) => issue.severity === 'error');
  const warnings = result.issues.filter((issue) => issue.severity === 'warning');

  return {
    errors,
    finishedAt: nowIso(),
    id: createRunId('validation'),
    startedAt,
    status: errors.length > 0 ? 'failed' : 'passed',
    warnings,
  };
}

export function createConsistencyRun(skillDocument: SkillDocument): ConsistencyRun {
  const startedAt = nowIso();
  const result = checkSkillDocumentConsistency(skillDocument);
  const errors = result.issues.filter((issue) => issue.severity === 'error');
  const warnings = result.issues.filter((issue) => issue.severity === 'warning');

  return {
    finishedAt: nowIso(),
    id: createRunId('consistency'),
    issues: errors,
    startedAt,
    status: errors.length > 0 ? 'failed' : 'passed',
    warnings,
  };
}

function buildElementIdSet(skillDocument: SkillDocument) {
  return new Set([
    ...skillDocument.decomposition.actions.map((action) => action.id),
    ...skillDocument.decomposition.rules.map((rule) => rule.id),
    ...skillDocument.decomposition.directives.map((directive) => directive.id),
  ].filter(Boolean));
}

function resolveRootPath(skillDocument: SkillDocument) {
  const executionPaths = Array.isArray(skillDocument.execution_paths) ? skillDocument.execution_paths : [];
  if (executionPaths.length === 0) {
    return null;
  }

  const referencedTargets = new Set(
    executionPaths.flatMap((path) => (path.branches ?? []).map((branch) => branch.target).filter(Boolean)),
  );

  const rootCandidates = executionPaths.filter((path) => !referencedTargets.has(path.id));
  return rootCandidates[0] ?? executionPaths[0];
}

export function createPathTestRun(skillDocument: SkillDocument): PathTestRun {
  const startedAt = nowIso();
  const rootPath = resolveRootPath(skillDocument);
  const executionPaths = Array.isArray(skillDocument.execution_paths) ? skillDocument.execution_paths : [];
  const pathMap = new Map(executionPaths.map((path) => [path.id, path]));
  const validElementIds = buildElementIdSet(skillDocument);

  if (!rootPath) {
    return {
      finishedAt: nowIso(),
      id: createRunId('path'),
      message: 'No execution paths are available for a path walk.',
      name: 'Path walk',
      startedAt,
      status: 'failed',
    };
  }

  const visitedPathIds = new Set<string>();
  const actualPath: string[] = [];
  let currentPath = rootPath;

  while (currentPath) {
    if (visitedPathIds.has(currentPath.id)) {
      return {
        actualPath,
        finishedAt: nowIso(),
        id: createRunId('path'),
        message: `Cycle detected while walking execution path ${currentPath.id}.`,
        name: currentPath.name || currentPath.id || 'Path walk',
        startedAt,
        status: 'failed',
      };
    }

    visitedPathIds.add(currentPath.id);

    if (!Array.isArray(currentPath.steps) || currentPath.steps.length === 0) {
      return {
        actualPath,
        finishedAt: nowIso(),
        id: createRunId('path'),
        message: `Execution path ${currentPath.id || '(unknown)'} has no walkable steps.`,
        name: currentPath.name || currentPath.id || 'Path walk',
        startedAt,
        status: 'failed',
      };
    }

    for (const step of currentPath.steps) {
      if (!validElementIds.has(step)) {
        return {
          actualPath,
          finishedAt: nowIso(),
          id: createRunId('path'),
          message: `Execution path ${currentPath.id} references missing step ${step}.`,
          name: currentPath.name || currentPath.id || 'Path walk',
          startedAt,
          status: 'failed',
        };
      }

      actualPath.push(step);
    }

    const nextBranch = currentPath.branches?.find((branch) => branch.target);
    if (!nextBranch) {
      return {
        actualPath,
        finishedAt: nowIso(),
        id: createRunId('path'),
        message: `Walked ${visitedPathIds.size} execution path${visitedPathIds.size === 1 ? '' : 's'} successfully.`,
        name: currentPath.name || currentPath.id || 'Path walk',
        startedAt,
        status: 'passed',
      };
    }

    const nextPath = pathMap.get(nextBranch.target);
    if (!nextPath) {
      return {
        actualPath,
        finishedAt: nowIso(),
        id: createRunId('path'),
        message: `Execution path ${currentPath.id} points to missing branch target ${nextBranch.target}.`,
        name: currentPath.name || currentPath.id || 'Path walk',
        startedAt,
        status: 'failed',
      };
    }

    currentPath = nextPath;
  }

  return {
    actualPath,
    finishedAt: nowIso(),
    id: createRunId('path'),
    message: 'Path walk finished without traversing any execution paths.',
    name: rootPath.name || rootPath.id || 'Path walk',
    startedAt,
    status: 'failed',
  };
}
