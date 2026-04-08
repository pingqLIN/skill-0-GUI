import type { ActionNode, DiffSummary, DirectiveNode, RuleNode, SkillDocument } from '../types/skillDocument';

type NamedNode = ActionNode | RuleNode | DirectiveNode;
type CollectionKind = 'action' | 'rule' | 'directive';

function stableText(value: unknown) {
  return JSON.stringify(value ?? null);
}

function summarizeCollectionDiff<T extends NamedNode>(
  kind: CollectionKind,
  before: T[],
  after: T[],
  added: string[],
  removed: string[],
  changed: string[],
) {
  const beforeMap = new Map(before.map((item) => [item.id, item]));
  const afterMap = new Map(after.map((item) => [item.id, item]));

  for (const id of afterMap.keys()) {
    if (!beforeMap.has(id)) {
      added.push(`${kind}:${id}`);
    }
  }

  for (const id of beforeMap.keys()) {
    if (!afterMap.has(id)) {
      removed.push(`${kind}:${id}`);
    }
  }

  for (const [id, currentItem] of afterMap.entries()) {
    const previousItem = beforeMap.get(id);
    if (!previousItem) {
      continue;
    }

    if (stableText(previousItem) !== stableText(currentItem)) {
      changed.push(`${kind}:${id}`);
    }
  }
}

export function buildSkillDocumentDiffSummary(before: SkillDocument, after: SkillDocument): DiffSummary {
  const added: string[] = [];
  const removed: string[] = [];
  const changed: string[] = [];

  summarizeCollectionDiff('action', before.decomposition.actions, after.decomposition.actions, added, removed, changed);
  summarizeCollectionDiff('rule', before.decomposition.rules, after.decomposition.rules, added, removed, changed);
  summarizeCollectionDiff('directive', before.decomposition.directives, after.decomposition.directives, added, removed, changed);

  if (stableText(before.meta) !== stableText(after.meta)) {
    changed.push('meta');
  }

  if (stableText(before.original_definition) !== stableText(after.original_definition)) {
    changed.push('original_definition');
  }

  if (stableText(before.execution_paths ?? []) !== stableText(after.execution_paths ?? [])) {
    changed.push('execution_paths');
  }

  return {
    added,
    changed,
    removed,
    stats: {
      actionsAdded: added.filter((item) => item.startsWith('action:')).length,
      actionsRemoved: removed.filter((item) => item.startsWith('action:')).length,
      directivesAdded: added.filter((item) => item.startsWith('directive:')).length,
      directivesRemoved: removed.filter((item) => item.startsWith('directive:')).length,
      fieldsChanged: changed.length,
      rulesAdded: added.filter((item) => item.startsWith('rule:')).length,
      rulesRemoved: removed.filter((item) => item.startsWith('rule:')).length,
    },
  };
}

export function buildModifiedPathsDiffSummary(modifiedPaths: Iterable<string> | undefined): DiffSummary | null {
  if (!modifiedPaths) {
    return null;
  }

  const changed = Array.from(modifiedPaths)
    .filter((path): path is string => typeof path === 'string' && path !== 'metrics')
    .sort();

  if (changed.length === 0) {
    return null;
  }

  return {
    added: [],
    changed,
    removed: [],
    stats: {
      actionsAdded: 0,
      actionsRemoved: 0,
      directivesAdded: 0,
      directivesRemoved: 0,
      fieldsChanged: changed.length,
      rulesAdded: 0,
      rulesRemoved: 0,
    },
  };
}
