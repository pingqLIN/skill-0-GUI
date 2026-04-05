export type Provenance = {
  level?: 'basic' | 'full';
  source?: {
    kind?: string;
    ref?: string;
    version?: string;
  };
  original_text?: string;
  location?: {
    locator?: string;
  };
  extraction?: {
    method?: string;
    inferred?: boolean;
    confidence?: number;
  };
};

export type ActionNode = {
  id: string;
  name: string;
  action_type: string;
  description?: string;
  deterministic?: boolean;
  mutable_elements?: string[];
  immutable_elements?: string[];
  side_effects?: string[];
  notes?: string;
};

export type RuleNode = {
  id: string;
  name: string;
  condition_type?: string;
  condition_expression?: string;
  description?: string;
  returns?: string;
  fail_action?: string;
  notes?: string;
};

export type DirectiveNode = {
  id: string;
  name: string;
  directive_type: string;
  description?: string;
  decomposable?: boolean;
  decomposition_hint?: string;
  provenance?: Provenance;
  notes?: string;
};

export type PathBranch = {
  condition?: string;
  target: string;
};

export type ExecutionPath = {
  id: string;
  name?: string;
  entry_condition?: string;
  steps: string[];
  branches?: PathBranch[];
  success_end?: string;
  failure_end?: string;
};

export type SkillDocument = {
  meta: {
    title?: string;
    name?: string;
    description?: string;
    version?: string;
    schema_version?: string;
    author?: string;
    source?: string;
    tags?: string[];
    parse_timestamp?: string;
    parser_version?: string;
    parsed_by?: string;
    skill_id?: string;
  };
  decomposition: {
    actions: ActionNode[];
    rules: RuleNode[];
    directives: DirectiveNode[];
  };
  execution_paths?: ExecutionPath[];
  original_definition?: {
    skill_description?: string;
    skill_name?: string;
    source?: string;
  };
};

export type ReviewNote = {
  id: string;
  createdAt: string;
  author: string;
  content: string;
  severity?: 'info' | 'warning' | 'critical';
};

export type ElementReviewNote = {
  id: string;
  elementId: string;
  elementType: 'action' | 'rule' | 'directive';
  createdAt: string;
  author: string;
  content: string;
  status?: 'open' | 'resolved';
};

export type ReviewDecision = {
  id: string;
  timestamp: string;
  action:
    | 'added_element'
    | 'edited_element'
    | 'deleted_element'
    | 'validated'
    | 'tested'
    | 'review_status_updated'
    | 'handoff_state_updated'
    | 'review_profile_updated'
    | 'approved'
    | 'requested_changes';
  targetId?: string;
  summary: string;
};

export type ReviewProfile =
  | 'mode_verification'
  | 'bundle_evidence_review'
  | 'publish_gate_review';

export type HandoffState =
  | 'ready_for_review'
  | 'needs_evidence'
  | 'needs_changes'
  | 'approved_for_export';

export type ReviewChecklist = {
  modeConfirmed: boolean;
  validationReviewed: boolean;
  diffReviewed: boolean;
  evidenceReady: boolean;
};

export type DiffSummary = {
  added: string[];
  removed: string[];
  changed: string[];
  stats: {
    actionsAdded: number;
    rulesAdded: number;
    directivesAdded: number;
    actionsRemoved: number;
    rulesRemoved: number;
    directivesRemoved: number;
    fieldsChanged: number;
  };
};

export type ReviewState = {
  reviewerName?: string;
  reviewStatus: 'draft' | 'in_review' | 'changes_requested' | 'approved';
  startedAt?: string;
  updatedAt?: string;
  handoffState?: HandoffState;
  reviewProfile?: ReviewProfile;
  reviewSummary?: string;
  reviewerSignoff?: string;
  checklist?: ReviewChecklist;
  globalNotes: ReviewNote[];
  elementNotes: ElementReviewNote[];
  decisionLog: ReviewDecision[];
  diffSummary?: DiffSummary;
};

export type ContextSummaryItem = {
  id: 'policy_and_reference' | 'supporting_files' | 'analysis_findings' | 'source_provenance';
  label: string;
  count: number;
  status: 'complete' | 'attention' | 'blocked';
  detail: string;
};

export type ReviewPacket = {
  exportedAt: string;
  projectId: string;
  projectName: string;
  parserMode: 'skill-0' | 'standalone' | 'unknown';
  parserModeSource: string;
  reviewMode: string;
  equivalenceStatus: string;
  reviewDecisionGuidance: string;
  operatorReminders: Array<Record<string, unknown>>;
  handoffState: HandoffState;
  reviewProfile: ReviewProfile;
  reviewState: ReviewState;
  reviewChecklist: ReviewChecklistItem[];
  contextSummary: ContextSummaryItem[];
  validationEvidence: ValidationEvidence | null;
  skillDocument: SkillDocument | null;
};

export type ReviewChecklistItem = {
  id: string;
  label: string;
  status: 'complete' | 'attention' | 'blocked';
  detail: string;
};

export type ValidationIssue = {
  code: string;
  path: string;
  message: string;
  severity: 'error' | 'warning';
};

export type ValidationRun = {
  id: string;
  startedAt: string;
  finishedAt?: string;
  status: 'running' | 'passed' | 'failed';
  errors: ValidationIssue[];
  warnings?: ValidationIssue[];
};

export type ConsistencyIssue = {
  type: 'duplicate_id' | 'missing_reference' | 'orphan_path' | 'empty_required_field' | 'invalid_branch';
  targetId?: string;
  message: string;
  severity: 'error' | 'warning';
};

export type ConsistencyRun = {
  id: string;
  startedAt: string;
  finishedAt?: string;
  status: 'running' | 'passed' | 'failed';
  issues: ConsistencyIssue[];
  warnings?: ConsistencyIssue[];
};

export type ValidationEvidence = {
  provenance: {
    parsedBy: string;
    parserVersion: string;
    schemaVersion: string;
    skillId: string;
    source: string;
  };
  validationRun: ValidationRun;
  consistencyRun: ConsistencyRun;
  evidenceWarnings: string[];
};

export type PathTestRun = {
  id: string;
  name: string;
  startedAt: string;
  finishedAt?: string;
  inputContext?: Record<string, unknown>;
  expectedPath?: string[];
  actualPath?: string[];
  status: 'running' | 'passed' | 'failed';
  message?: string;
};

export type RegressionRun = {
  id: string;
  baselineVersion: string;
  currentVersion: string;
  status: 'running' | 'passed' | 'failed';
  changesDetected: string[];
};

export type TestState = {
  validationRuns: ValidationRun[];
  consistencyRuns: ConsistencyRun[];
  pathTestRuns: PathTestRun[];
  regressionRuns: RegressionRun[];
  latestStatus: {
    schemaValid: boolean | null;
    consistencyValid: boolean | null;
    pathTestsPassed: boolean | null;
  };
};

export type EditorState = {
  sessionId: string;
  fileName: string | null;
  sourceText: string | null;
  originalSkillJson: SkillDocument | null;
  currentSkillJson: SkillDocument | null;
  selectedView: 'form' | 'json' | 'graph';
  selectedElementId: string | null;
  selectedElementType: 'action' | 'rule' | 'directive' | null;
  dirty: boolean;
  lastSavedAt: string | null;
  autoSaveEnabled: boolean;
  ui: {
    leftPanelTab: 'source' | 'outline' | 'elements' | 'coverage';
    rightPanelTab: 'validation' | 'tests' | 'notes' | 'diff';
    expandedSections: string[];
  };
};
