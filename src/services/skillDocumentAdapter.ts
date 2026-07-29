import type {
  ActionNode,
  ConsistencyRun,
  ContextSummaryItem,
  DirectiveNode,
  ExecutionPath,
  DiffSummary,
  HandoffState,
  ReviewPacket,
  ReviewChecklistItem,
  ReviewProfile,
  ReviewState,
  RuleNode,
  SkillDocument,
  ValidationEvidence,
  ValidationRun,
} from '../types/skillDocument';
import { buildModifiedPathsDiffSummary } from './reviewDiffService';

type BuildReviewDataOptions = {
  fileName?: string;
  sourceLabel?: string;
  existingSession?: unknown;
  editSource?: 'import' | 'json' | 'structured';
};

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
    .filter((item) => isRecord(item))
    .map((item) => ({
      branches: Array.isArray(item.branches)
        ? item.branches
          .filter((branch) => isRecord(branch))
          .map((branch) => ({
            condition: typeof branch.condition === 'string' ? branch.condition : undefined,
            target: typeof branch.target === 'string' ? branch.target : '',
          }))
        : undefined,
      entry_condition: typeof item.entry_condition === 'string' ? item.entry_condition : undefined,
      failure_end: typeof item.failure_end === 'string' ? item.failure_end : undefined,
      id: typeof item.id === 'string' ? item.id : '',
      name: typeof item.name === 'string' ? item.name : undefined,
      steps: Array.isArray(item.steps)
        ? item.steps.filter((step): step is string => typeof step === 'string')
        : [],
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

function mapBridgeModeToReviewMode(mode: unknown) {
  if (mode === 'skill-0') return 'canonical';
  if (mode === 'standalone') return 'standalone';
  if (mode === 'llm-assisted') return 'llm-assisted';
  return 'unknown';
}

function dedupeOperatorReminders(reminders: unknown[]) {
  const seen = new Set<string>();
  return reminders.filter((reminder) => {
    if (!isRecord(reminder) || typeof reminder.id !== 'string') {
      return false;
    }
    if (seen.has(reminder.id)) {
      return false;
    }
    seen.add(reminder.id);
    return true;
  });
}

function buildReviewGuidance(reviewMode: 'canonical' | 'standalone' | 'llm-assisted' | 'unknown', editSource: 'import' | 'json' | 'structured') {
  if (editSource === 'import') {
    return 'Loaded from skill JSON import. Parser execution was not re-run. Validate structure and re-run through the canonical bridge before final equivalence decisions.';
  }

  const editorLabel = editSource === 'json' ? 'JSON editor' : 'structured editor';
  if (reviewMode === 'canonical') {
    return `This SkillDocument was updated in the ${editorLabel} after the last canonical skill-0 parser run. Original parser provenance is preserved, but final equivalence requires a fresh canonical re-run before approval.`;
  }
  if (reviewMode === 'standalone') {
    return `This SkillDocument was updated in the ${editorLabel} after the last standalone parser run. Original parser provenance is preserved, but final equivalence still requires a fresh canonical re-run before approval.`;
  }
  if (reviewMode === 'llm-assisted') {
    return `This SkillDocument was updated in the ${editorLabel} after an AI-assisted recovery run. Keep it draft-only and re-run through the canonical bridge before any final equivalence decision.`;
  }
  return `This SkillDocument was updated in the ${editorLabel} after an unverified or imported session. Confirm parser mode and re-run through the canonical bridge before final equivalence decisions.`;
}

function buildReviewChecklist(
  bridgeMode: ReviewPacket['parserMode'],
  bridgeModeSource: string,
  reviewState: ReviewState,
  validationEvidence: ValidationEvidence | null,
): ReviewChecklistItem[] {
  const validationErrors = validationEvidence?.validationRun.errors.filter((issue) => issue.severity === 'error').length ?? 0;
  const validationWarnings = (validationEvidence?.validationRun.errors.filter((issue) => issue.severity === 'warning').length ?? 0)
    + (validationEvidence?.evidenceWarnings.length ?? 0);
  const consistencyErrors = validationEvidence?.consistencyRun.issues.filter((issue) => issue.severity === 'error').length ?? 0;
  const consistencyWarnings = validationEvidence?.consistencyRun.issues.filter((issue) => issue.severity === 'warning').length ?? 0;
  const notesCount = reviewState.globalNotes.length + reviewState.elementNotes.length;

  return [
    {
      detail: bridgeMode === 'skill-0'
        ? `Canonical skill-0 bridge confirmed via ${bridgeModeSource}.`
        : bridgeMode === 'standalone'
          ? `Standalone bridge active via ${bridgeModeSource}. Canonical rerun still recommended before final parity claims.`
          : bridgeMode === 'llm-assisted'
            ? `LLM-assisted recovery path active via ${bridgeModeSource}. Keep this packet draft-only until a canonical rerun is completed.`
          : `Bridge mode is unverified. Source: ${bridgeModeSource}.`,
      id: 'bridge-mode',
      label: 'Bridge mode verified',
      status: bridgeMode === 'skill-0' ? 'complete' : bridgeMode === 'unknown' ? 'blocked' : 'attention',
    },
    {
      detail: !validationEvidence
        ? 'No validation evidence was attached to this review packet.'
        : validationErrors > 0
          ? `${validationErrors} schema validation errors remain open.`
          : validationWarnings > 0
            ? `${validationWarnings} validation warnings require reviewer acknowledgement.`
            : 'Schema validation signals are clean.',
      id: 'schema-validation',
      label: 'Schema validation reviewed',
      status: !validationEvidence ? 'blocked' : validationErrors > 0 ? 'blocked' : validationWarnings > 0 ? 'attention' : 'complete',
    },
    {
      detail: !validationEvidence
        ? 'No consistency evidence was attached to this review packet.'
        : consistencyErrors > 0
          ? `${consistencyErrors} execution consistency errors remain open.`
          : consistencyWarnings > 0
            ? `${consistencyWarnings} consistency warnings require reviewer acknowledgement.`
            : 'Execution-path and reference consistency checks are clean.',
      id: 'consistency-review',
      label: 'Consistency review completed',
      status: !validationEvidence ? 'blocked' : consistencyErrors > 0 ? 'blocked' : consistencyWarnings > 0 ? 'attention' : 'complete',
    },
    {
      detail: reviewState.reviewStatus === 'draft'
        ? 'Reviewer decision is still draft.'
        : `${reviewState.reviewStatus} recorded with ${notesCount} notes attached.`,
      id: 'review-decision',
      label: 'Reviewer decision recorded',
      status: reviewState.reviewStatus === 'draft' ? 'attention' : 'complete',
    },
  ];
}

export function buildReviewDataFromSkillDocument(
  document: SkillDocument,
  options: BuildReviewDataOptions = {},
) {
  const meta = document.meta ?? {};
  const actions = document.decomposition.actions ?? [];
  const rules = document.decomposition.rules ?? [];
  const directives = document.decomposition.directives ?? [];
  const executionPaths = document.execution_paths ?? [];
  const previousSession = isRecord(options.existingSession) ? options.existingSession : null;
  const previousBridge = previousSession && isRecord(previousSession.bridge) ? previousSession.bridge : null;
  const previousReviewerSummary = previousSession && isRecord(previousSession.reviewerSummary)
    ? previousSession.reviewerSummary
    : null;
  const reviewMode = previousReviewerSummary && typeof previousReviewerSummary.mode === 'string'
    ? previousReviewerSummary.mode as 'canonical' | 'standalone' | 'llm-assisted' | 'unknown'
    : mapBridgeModeToReviewMode(previousBridge?.mode);
  const editSource = options.editSource ?? 'import';
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
  const reviewGuidance = buildReviewGuidance(reviewMode, editSource);
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
  const reviewerMode = editSource === 'import' ? 'unknown' : reviewMode;
  const reminderId = editSource === 'json' ? 'rem-json-edit' : editSource === 'structured' ? 'rem-structured-edit' : 'rem-json-import';
  const reminderLabel = editSource === 'json'
    ? 'Edited JSON session'
    : editSource === 'structured'
      ? 'Edited structured session'
      : 'Imported JSON session';
  const reminderAction = editSource === 'import'
    ? 'Run schema validation and a canonical bridge re-check before relying on this import for final review.'
    : 'Re-run schema validation and the canonical bridge before relying on edited content for final equivalence review.';
  const reminderDetail = editSource === 'import'
    ? 'This session was restored from a SkillDocument JSON payload rather than a live parser execution.'
    : `This session keeps its last known parser provenance, but the content was edited through the ${editSource === 'json' ? 'JSON editor' : 'structured editor'} after that parser run.`;
  const previousOperatorReminders = previousReviewerSummary && Array.isArray(previousReviewerSummary.operatorReminders)
    ? previousReviewerSummary.operatorReminders
    : [];

  return {
    bridge: {
      error: reviewGuidance,
      mode: previousBridge?.mode === 'skill-0' || previousBridge?.mode === 'standalone' || previousBridge?.mode === 'llm-assisted'
        ? previousBridge.mode
        : 'unknown',
      skill0Root: typeof previousBridge?.skill0Root === 'string' ? previousBridge.skill0Root : null,
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
      equivalenceNote: editSource === 'import'
        ? 'equivalence_unverified'
        : 'equivalence_unverified',
      finalDecisionGuidance: reviewGuidance,
      mode: reviewerMode,
      operatorReminders: dedupeOperatorReminders([
        ...previousOperatorReminders,
        {
          action: reminderAction,
          detail: reminderDetail,
          id: reminderId,
          label: reminderLabel,
          level: 'medium',
        },
      ]),
    },
    riskAssessment: {
      details: reviewGuidance,
      level: riskLevel,
      negativeIntent,
    },
    securityScan: {
      blocked: false,
      findings: [{
        adjustedSeverity: 'MEDIUM',
        adjustmentReason: editSource === 'import'
          ? 'Imported JSON provenance requires explicit re-validation.'
          : 'Edited SkillDocument provenance requires explicit re-validation.',
        contextType: 'bridge',
        description: reviewGuidance,
        detectionStandard: editSource === 'import' ? 'SkillDocument import' : 'SkillDocument edit',
        lineContent: sourceLabel,
        lineNumber: 0,
        originalSeverity: 'MEDIUM',
        ruleId: editSource === 'import' ? 'IMPORT-001' : 'EDIT-001',
        ruleName: editSource === 'import' ? 'Imported SkillDocument JSON' : 'Edited SkillDocument session',
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

export function buildReviewPacketFromReviewData(
  data: unknown,
  options: {
    bridgeMode: ReviewPacket['parserMode'];
    bridgeModeSource: string;
    canonicalRerunRequired: boolean;
    contextSummary?: ContextSummaryItem[];
    equivalenceStatus: string;
    handoffState?: HandoffState;
    reviewDecisionGuidance: string;
    reviewProfile?: ReviewProfile;
    reviewMode: string;
    reviewState: ReviewState;
    skillDocument?: SkillDocument | null;
    modifiedPaths?: Iterable<string>;
    validationEvidence?: ValidationEvidence | null;
  },
): ReviewPacket | null {
  if (!isRecord(data)) {
    return null;
  }

  const skillDocument = options.skillDocument ?? extractSkillDocumentFromReviewData(data);
  const projectId = typeof data.projectId === 'string'
    ? data.projectId
    : skillDocument?.meta?.skill_id || 'unknown-project';
  const projectName = typeof data.projectName === 'string'
    ? data.projectName
    : skillDocument?.meta?.title || skillDocument?.meta?.name || 'Untitled Review';
  const reviewerSummary = isRecord(data.reviewerSummary) ? data.reviewerSummary : null;
  const bridge = isRecord(data.bridge) ? data.bridge : null;
  const operatorReminders = Array.isArray(reviewerSummary?.operatorReminders)
    ? reviewerSummary.operatorReminders.filter((item): item is Record<string, unknown> => isRecord(item))
    : [];
  const validationEvidence = options.validationEvidence ?? buildValidationEvidenceFromReviewData(data, {
    reviewMode: options.reviewMode,
  });
  const diffSummary = options.reviewState.diffSummary ?? buildModifiedPathsDiffSummary(options.modifiedPaths) ?? undefined;
  const reviewState = diffSummary
    ? { ...options.reviewState, diffSummary }
    : options.reviewState;

  return {
    contextSummary: options.contextSummary ?? [],
    draftOnly: options.bridgeMode === 'llm-assisted'
      || (reviewerSummary?.draft_only === true)
      || (bridge?.draft_only === true),
    equivalenceStatus: options.equivalenceStatus,
    canonicalRerunRequired: options.canonicalRerunRequired,
    exportedAt: new Date().toISOString(),
    fallbackReason: typeof reviewerSummary?.fallback_reason === 'string'
      ? reviewerSummary.fallback_reason
      : typeof bridge?.fallback_reason === 'string'
        ? bridge.fallback_reason
        : null,
    handoffState: options.handoffState ?? reviewState.handoffState ?? 'ready_for_review',
    llmModel: typeof reviewerSummary?.model === 'string'
      ? reviewerSummary.model
      : typeof bridge?.model === 'string'
        ? bridge.model
        : null,
    llmProvider: typeof reviewerSummary?.provider === 'string'
      ? reviewerSummary.provider
      : typeof bridge?.provider === 'string'
        ? bridge.provider
        : null,
    operatorReminders,
    parserMode: options.bridgeMode,
    parserModeSource: options.bridgeModeSource,
    projectId,
    projectName,
    reviewDecisionGuidance: options.reviewDecisionGuidance,
    reviewChecklist: buildReviewChecklist(options.bridgeMode, options.bridgeModeSource, reviewState, validationEvidence),
    reviewProfile: options.reviewProfile ?? reviewState.reviewProfile ?? 'mode_verification',
    reviewMode: options.reviewMode,
    reviewState,
    schemaValidation: typeof reviewerSummary?.schema_validation === 'string'
      ? reviewerSummary.schema_validation
      : typeof bridge?.schema_validation === 'string'
        ? bridge.schema_validation
        : null,
    validationEvidence,
    skillDocument,
  };
}

export function buildValidationEvidenceFromReviewData(
  data: unknown,
  options: { reviewMode?: string } = {},
): ValidationEvidence | null {
  if (!isRecord(data)) {
    return null;
  }

  const skillDocument = extractSkillDocumentFromReviewData(data);
  if (!skillDocument) {
    return null;
  }

  const meta = skillDocument.meta ?? {};
  const actions = skillDocument.decomposition.actions ?? [];
  const rules = skillDocument.decomposition.rules ?? [];
  const directives = skillDocument.decomposition.directives ?? [];
  const executionPaths = skillDocument.execution_paths ?? [];
  const allIds = [...actions, ...rules, ...directives].map((item) => item.id);
  const duplicateIds = allIds.filter((id, index) => allIds.indexOf(id) !== index);
  const knownIds = new Set(allIds);
  const missingStepReferences = executionPaths.flatMap((path) =>
    path.steps
      .filter((step) => !knownIds.has(step))
      .map((step) => ({ pathId: path.id, step })),
  );
  const reviewMode = options.reviewMode
    || (isRecord(data.reviewerSummary) && typeof data.reviewerSummary.mode === 'string'
    ? data.reviewerSummary.mode
    : 'unknown');

  const validationErrors: ValidationRun['errors'] = [];
  const consistencyIssues: ConsistencyRun['issues'] = [];
  const evidenceWarnings: string[] = [];

  if (!meta.schema_version || meta.schema_version === 'unknown') {
    validationErrors.push({
      code: 'missing_schema_version',
      message: 'app.validationMissingSchemaVersion',
      path: 'meta.schema_version',
      severity: 'error',
    });
  }

  if (!meta.skill_id) {
    validationErrors.push({
      code: 'missing_skill_id',
      message: 'app.validationMissingSkillId',
      path: 'meta.skill_id',
      severity: 'warning',
    });
  }

  if (!(meta.title || meta.name)) {
    validationErrors.push({
      code: 'missing_title',
      message: 'app.validationMissingTitle',
      path: 'meta.title',
      severity: 'warning',
    });
  }

  if (actions.length + rules.length + directives.length === 0) {
    validationErrors.push({
      code: 'empty_decomposition',
      message: 'app.validationEmptyDecomposition',
      path: 'decomposition',
      severity: 'warning',
    });
  }

  duplicateIds.forEach((duplicateId) => {
    consistencyIssues.push({
      message: 'app.validationDuplicateId',
      severity: 'error',
      targetId: duplicateId,
      type: 'duplicate_id',
    });
  });

  missingStepReferences.forEach(({ pathId, step }) => {
    consistencyIssues.push({
      message: `app.validationMissingStepReference:${pathId}:${step}`,
      severity: 'error',
      targetId: pathId,
      type: 'missing_reference',
    });
  });

  if (executionPaths.length === 0) {
    consistencyIssues.push({
      message: 'app.validationMissingExecutionPaths',
      severity: 'warning',
      type: 'orphan_path',
    });
  }

  if (reviewMode === 'unknown') {
    evidenceWarnings.push('app.validationImportedJsonWarning');
  } else if (reviewMode === 'standalone') {
    evidenceWarnings.push('app.validationStandaloneWarning');
  } else if (reviewMode === 'llm-assisted') {
    evidenceWarnings.push('app.validationLlmAssistedWarning');
  }

  return {
    consistencyRun: {
      finishedAt: new Date().toISOString(),
      id: 'consistency-current',
      issues: consistencyIssues,
      startedAt: new Date().toISOString(),
      status: consistencyIssues.some((issue) => issue.severity === 'error') ? 'failed' : 'passed',
    },
    evidenceWarnings,
    provenance: {
      parsedBy: meta.parsed_by || 'unknown',
      parserVersion: meta.parser_version || 'unknown',
      schemaVersion: meta.schema_version || 'unknown',
      skillId: meta.skill_id || 'unknown',
      source: skillDocument.original_definition?.source || meta.source || 'unknown',
    },
    validationRun: {
      errors: validationErrors,
      finishedAt: new Date().toISOString(),
      id: 'schema-current',
      startedAt: new Date().toISOString(),
      status: validationErrors.some((issue) => issue.severity === 'error') ? 'failed' : 'passed',
    },
  };
}
