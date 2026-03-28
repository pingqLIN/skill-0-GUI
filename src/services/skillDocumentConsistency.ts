import type { ConsistencyIssue, SkillDocument } from '../types/skillDocument';

type ConsistencyResult = {
  issues: ConsistencyIssue[];
  valid: boolean;
};

function pushIssue(
  issues: ConsistencyIssue[],
  type: ConsistencyIssue['type'],
  message: string,
  severity: ConsistencyIssue['severity'],
  targetId?: string,
) {
  issues.push({
    message,
    severity,
    targetId,
    type,
  });
}

export function checkSkillDocumentConsistency(skillDocument: SkillDocument): ConsistencyResult {
  const issues: ConsistencyIssue[] = [];
  const elementIds = new Map<string, 'action' | 'rule' | 'directive'>();
  const pathIds = new Set<string>();
  const referencedPathIds = new Set<string>();
  const executionPaths = Array.isArray(skillDocument.execution_paths) ? skillDocument.execution_paths : [];

  const registerId = (id: string, kind: 'action' | 'rule' | 'directive' | 'path') => {
    if (!id) return;

    if (kind === 'path') {
      if (pathIds.has(id) || elementIds.has(id)) {
        pushIssue(issues, 'duplicate_id', `Duplicate id detected: ${id}`, 'error', id);
        return;
      }
      pathIds.add(id);
      return;
    }

    if (elementIds.has(id) || pathIds.has(id)) {
      pushIssue(issues, 'duplicate_id', `Duplicate id detected: ${id}`, 'error', id);
      return;
    }

    elementIds.set(id, kind);
  };

  for (const action of skillDocument.decomposition.actions) {
    registerId(action.id, 'action');
    if (!action.name?.trim()) {
      pushIssue(issues, 'empty_required_field', `Action ${action.id || '(missing id)'} is missing a visible name.`, 'warning', action.id);
    }
  }

  for (const rule of skillDocument.decomposition.rules) {
    registerId(rule.id, 'rule');
    if (!rule.name?.trim()) {
      pushIssue(issues, 'empty_required_field', `Rule ${rule.id || '(missing id)'} is missing a visible name.`, 'warning', rule.id);
    }
  }

  for (const directive of skillDocument.decomposition.directives) {
    registerId(directive.id, 'directive');
    if (!directive.name?.trim()) {
      pushIssue(issues, 'empty_required_field', `Directive ${directive.id || '(missing id)'} is missing a visible name.`, 'warning', directive.id);
    }
  }

  executionPaths.forEach((executionPath) => {
    registerId(executionPath.id, 'path');
  });

  const implicitRootCandidates: string[] = [];

  executionPaths.forEach((executionPath, index) => {
    if (!Array.isArray(executionPath.steps) || executionPath.steps.length === 0) {
      pushIssue(issues, 'orphan_path', `Execution path ${executionPath.id || `(index ${index})`} has no usable steps.`, 'warning', executionPath.id);
      return;
    }

    executionPath.steps.forEach((step) => {
      if (!elementIds.has(step)) {
        pushIssue(
          issues,
          'missing_reference',
          `Execution path ${executionPath.id} references missing element id: ${step}`,
          'error',
          executionPath.id,
        );
      }
    });

    executionPath.branches?.forEach((branch) => {
      if (!branch.target || !pathIds.has(branch.target)) {
        pushIssue(
          issues,
          'invalid_branch',
          `Execution path ${executionPath.id} points to missing branch target: ${branch.target || '(empty)'}`,
          'error',
          executionPath.id,
        );
        return;
      }
      referencedPathIds.add(branch.target);
    });
    const hasEntryCondition = Boolean(executionPath.entry_condition?.trim());
    const isReferenced = referencedPathIds.has(executionPath.id);
    if (!hasEntryCondition && !isReferenced) {
      implicitRootCandidates.push(executionPath.id);
    }
  });

  if (implicitRootCandidates.length > 1) {
    implicitRootCandidates.forEach((pathId) => {
      pushIssue(
        issues,
        'orphan_path',
        `Execution path ${pathId} is one of multiple implicit root paths. Add an entry condition or branch reference to disambiguate execution flow.`,
        'warning',
        pathId,
      );
    });
  }

  return {
    issues,
    valid: !issues.some((issue) => issue.severity === 'error'),
  };
}
