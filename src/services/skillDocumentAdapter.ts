import type {
  ActionNode,
  DirectiveNode,
  ExecutionPath,
  RuleNode,
  SkillDocument,
} from '../types/skillDocument';

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function inferRiskLevel(score: number) {
  if (score >= 70) return 'HIGH';
  if (score >= 35) return 'MEDIUM';
  if (score > 0) return 'LOW';
  return 'SAFE';
}

function slugifySkillName(input: string) {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'imported-skill';
}

function hasStringIdList(items: unknown) {
  return Array.isArray(items) && items.every((item) => isRecord(item) && typeof item.id === 'string');
}

function normalizeExecutionPaths(value: unknown): ExecutionPath[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item) => isRecord(item) && typeof item.id === 'string' && Array.isArray(item.steps))
    .map((item) => ({
      branches: Array.isArray(item.branches)
        ? item.branches
          .filter((branch) => isRecord(branch) && typeof branch.target === 'string')
          .map((branch) => ({
            condition: typeof branch.condition === 'string' ? branch.condition : undefined,
            target: branch.target as string,
          }))
        : undefined,
      entry_condition: typeof item.entry_condition === 'string' ? item.entry_condition : undefined,
      failure_end: typeof item.failure_end === 'string' ? item.failure_end : undefined,
      id: item.id as string,
      name: typeof item.name === 'string' ? item.name : undefined,
      steps: (item.steps as unknown[]).filter((step): step is string => typeof step === 'string'),
      success_end: typeof item.success_end === 'string' ? item.success_end : undefined,
    }));
}

export function isSkillDocument(value: unknown): value is SkillDocument {
  if (!isRecord(value) || !isRecord(value.meta) || !isRecord(value.decomposition)) {
    return false;
  }

  return hasStringIdList(value.decomposition.actions)
    && hasStringIdList(value.decomposition.rules)
    && hasStringIdList(value.decomposition.directives);
}

export function parseSkillDocumentJson(text: string): SkillDocument | null {
  try {
    const parsed = JSON.parse(text);
    return isSkillDocument(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function buildRuleDecisionNodes(rules: RuleNode[]) {
  return rules.map((rule, index) => ({
    evidence: `${rule.condition_type || 'rule'} • ${rule.condition_expression || rule.description || ''}`.trim(),
    id: rule.id || `C${index + 1}`,
    outcomes: {
      no: rule.fail_action || 'review',
      yes: 'retain decomposition path',
    },
    question: rule.name || rule.description || `Rule ${index + 1}`,
    rules: [rule.condition_expression || rule.description || 'evaluate condition'],
    threshold: rule.condition_expression || rule.returns || 'boolean',
  }));
}

export function buildReviewDataFromSkillDocument(
  document: SkillDocument,
  options: { fileName?: string; sourceLabel?: string } = {},
) {
  const meta = document.meta ?? {};
  const actions = document.decomposition.actions ?? [];
  const rules = document.decomposition.rules ?? [];
  const directives = document.decomposition.directives ?? [];
  const executionPaths = document.execution_paths ?? [];
  const category = directives[0]?.directive_type || actions[0]?.action_type || 'skill_document';
  const nonDeterministic = actions.filter((action) => action.deterministic === false).length;
  const strategicDirectives = directives.filter((directive) => directive.decomposable).length;
  const negativeIntent = clamp((actions.length * 4) + (rules.length * 6) + (nonDeterministic * 8), 6, 72);
  const riskLevel = inferRiskLevel(negativeIntent);
  const operability = clamp(64 + (actions.length * 3) + (rules.length * 2) - (nonDeterministic * 4), 28, 96);
  const decisionConfidence = clamp(68 + (rules.length * 4) + (executionPaths.length * 3), 42, 97);
  const reworkRate = clamp(8 + (nonDeterministic * 6) + (strategicDirectives * 2), 4, 52);
  const goalAchievementRate = clamp(76 + (actions.length * 2) + strategicDirectives, 55, 98);
  const normalizedSkillName = slugifySkillName(meta.name || meta.title || options.fileName || 'imported-skill');
  const sourceLabel = options.sourceLabel || 'json/import';
  const reviewGuidance = 'Loaded from skill JSON import. Parser execution was not re-run. Validate structure and re-run through the canonical bridge before final equivalence decisions.';
  const parserResult = {
    ...document,
    execution_paths: executionPaths,
    meta: {
      ...meta,
      name: meta.name || normalizedSkillName,
      parsed_by: meta.parsed_by || 'json-import',
      parser_version: meta.parser_version || 'json-import',
      schema_version: meta.schema_version || 'unknown',
      skill_id: meta.skill_id || `json__${normalizedSkillName}`,
      title: meta.title || meta.name || options.fileName || 'Imported Skill Document',
    },
    original_definition: {
      skill_description: document.original_definition?.skill_description || meta.description || 'Imported Skill JSON document.',
      skill_name: document.original_definition?.skill_name || meta.name || normalizedSkillName,
      source: document.original_definition?.source || meta.source || sourceLabel,
    },
  };
  const ruleDecisionNodes = buildRuleDecisionNodes(rules);
  const directivePhaseTasks = directives.length
    ? directives.map((directive: DirectiveNode) => `${directive.name || directive.directive_type}: ${directive.description || 'No description'}`)
    : ['No directives imported'];

  return {
    bridge: {
      error: 'Loaded from skill JSON import. Parser execution was not re-run.',
      mode: 'unknown',
      skill0Root: null,
    },
    globalMetrics: {
      decisionConfidence,
      deliveryTime: Number((0.8 + (actions.length * 0.05) + (rules.length * 0.04)).toFixed(1)),
      goalAchievementRate,
      reworkRate,
    },
    parserResult,
    phases: [
      {
        decisionNodes: [],
        id: 'A',
        input: ['skill_document_json'],
        name: 'JSON Intake',
        output: ['document_context'],
        tasks: [parserResult.original_definition.source, parserResult.meta.name, parserResult.meta.description || 'No description'],
      },
      {
        decisionNodes: [],
        id: 'B',
        input: ['document_context'],
        name: 'Action Decomposition',
        output: ['action_graph'],
        tasks: actions.length ? actions.map((action: ActionNode) => `${action.id} · ${action.name}`) : ['No actions imported'],
      },
      {
        decisionNodes: ruleDecisionNodes.length ? ruleDecisionNodes : [{
          evidence: 'No rules were present in the imported SkillDocument.',
          id: 'C0',
          outcomes: { no: 'review skill structure', yes: 'continue' },
          question: 'Are rule definitions present?',
          rules: ['rules.length > 0'],
          threshold: '>= 1',
        }],
        id: 'C',
        input: ['action_graph'],
        name: 'Rule Evaluation',
        output: ['rule_matrix'],
        tasks: rules.length ? rules.map((rule: RuleNode) => `${rule.id} · ${rule.name || rule.condition_expression || rule.description}`) : ['No rules imported'],
      },
      {
        decisionNodes: [],
        id: 'D',
        input: ['rule_matrix'],
        name: 'Directive Mapping',
        output: ['directive_map'],
        tasks: directivePhaseTasks,
      },
      {
        decisionNodes: [],
        id: 'E',
        input: ['directive_map'],
        name: 'Path Coverage',
        output: ['path_bundle'],
        tasks: executionPaths.length
          ? executionPaths.map((path: ExecutionPath) => `${path.id} · ${(path.steps || []).join(' -> ')}`)
          : ['No execution paths imported'],
      },
      {
        decisionNodes: [],
        id: 'F',
        input: ['path_bundle'],
        name: 'Review Snapshot',
        output: ['skill_document_review'],
        tasks: [
          `actions ${actions.length}`,
          `rules ${rules.length}`,
          `directives ${directives.length}`,
          `paths ${executionPaths.length}`,
        ],
      },
    ],
    projectId: parserResult.meta.skill_id,
    projectName: parserResult.meta.title,
    reviewerSummary: {
      equivalenceNote: 'equivalence_unverified',
      finalDecisionGuidance: reviewGuidance,
      mode: 'unknown',
      operatorReminders: [
        {
          action: 'Run schema validation and a canonical bridge re-check before relying on this import for final review.',
          detail: 'This session was restored from a SkillDocument JSON payload rather than a live parser execution.',
          id: 'rem-json-import',
          label: 'Imported JSON session',
          level: 'medium',
        },
      ],
    },
    riskAssessment: {
      details: 'Loaded from skill JSON import. Structural metrics are available, but parser execution was not re-run in this session.',
      level: riskLevel,
      negativeIntent,
    },
    securityScan: {
      blocked: false,
      findings: [{
        adjustedSeverity: 'MEDIUM',
        adjustmentReason: 'Imported JSON provenance requires explicit re-validation.',
        contextType: 'bridge',
        description: reviewGuidance,
        detectionStandard: 'SkillDocument import',
        lineContent: sourceLabel,
        lineNumber: 0,
        originalSeverity: 'MEDIUM',
        ruleId: 'IMPORT-001',
        ruleName: 'Imported SkillDocument JSON',
        standardUrl: 'https://github.com/pingqLIN/skill-0-review-studio',
      }],
      riskLevel,
      riskScore: negativeIntent,
    },
    threeClassification: {
      category,
      granularity: actions.length > 8 || directives.length > 6 ? 'Composite' : 'Atomic',
      operability,
    },
  };
}

export function extractSkillDocumentFromReviewData(data: unknown): SkillDocument | null {
  if (isSkillDocument(data)) {
    return data;
  }

  if (!isRecord(data) || !isRecord(data.parserResult)) {
    return null;
  }

  const parserResult = data.parserResult;
  if (!isRecord(parserResult.meta) || !isRecord(parserResult.decomposition)) {
    return null;
  }

  if (!hasStringIdList(parserResult.decomposition.actions)
    || !hasStringIdList(parserResult.decomposition.rules)
    || !hasStringIdList(parserResult.decomposition.directives)) {
    return null;
  }

  return {
    decomposition: {
      actions: parserResult.decomposition.actions as ActionNode[],
      directives: parserResult.decomposition.directives as DirectiveNode[],
      rules: parserResult.decomposition.rules as RuleNode[],
    },
    execution_paths: normalizeExecutionPaths(parserResult.execution_paths),
    meta: parserResult.meta as SkillDocument['meta'],
    original_definition: isRecord(parserResult.original_definition)
      ? parserResult.original_definition as SkillDocument['original_definition']
      : undefined,
  };
}
