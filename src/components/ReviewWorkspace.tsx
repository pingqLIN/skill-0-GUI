import React, { Suspense, lazy, useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  Edit2,
  Download,
  Undo2,
  Github,
  FileCode2,
  ChevronDown,
  ChevronUp,
  Languages,
  RefreshCw,
  SlidersHorizontal,
} from 'lucide-react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Flowchart } from './Flowchart';
import type { BridgeStatus } from '../services/bridgeStatusService';
import {
  buildReviewPacketFromReviewData,
  buildValidationEvidenceFromReviewData,
  extractSkillDocumentFromReviewData,
} from '../services/skillDocumentAdapter';
import { checkSkillDocumentConsistency } from '../services/skillDocumentConsistency';
import { buildModifiedPathsDiffSummary, buildSkillDocumentDiffSummary } from '../services/reviewDiffService';
import {
  createConsistencyRun,
  createPathTestRun,
  createValidationRun,
} from '../services/skillDocumentTestRunner';
import {
  buildReviewIssueNavigationTargets,
  resolveConsistencyIssueFieldPath,
  resolveValidationIssueFieldPath,
} from '../services/skillDocumentIssueNavigation';
import { validateSkillDocument } from '../services/skillDocumentValidation';
import type { UploadedContextFile } from '../types/intake';
import type {
  ConsistencyRun,
  ContextSummaryItem,
  DiffSummary,
  ElementReviewNote,
  HandoffState,
  PathTestRun,
  ReviewChecklist,
  ReviewDecision,
  ReviewNote,
  ReviewPacket,
  ReviewProfile,
  ReviewState,
  ValidationRun,
} from '../types/skillDocument';
import type { EditorConfig, WorkspaceTabId } from '../types/workspace';
import type { DemoReviewPreset } from '../types/demo';

type PipelineSubviewId = 'summary' | 'analysis' | 'decomposition' | 'pipeline' | 'derived';

const Dashboard = lazy(() => import('./Dashboard').then((module) => ({ default: module.Dashboard })));
const PhaseDetails = lazy(() => import('./PhaseDetails').then((module) => ({ default: module.PhaseDetails })));
const VectorSpace = lazy(() => import('./VectorSpace').then((module) => ({ default: module.VectorSpace })));
const SecurityMatrix = lazy(() => import('./SecurityMatrix').then((module) => ({ default: module.SecurityMatrix })));
const SideEditor = lazy(() => import('./SideEditor').then((module) => ({ default: module.SideEditor })));
const DecompositionBoard = lazy(() => import('./DecompositionBoard').then((module) => ({ default: module.DecompositionBoard })));
const REVIEW_DRAFT_STORAGE_PREFIX = 'skill-0-review-studio.review-draft.v1';
const DEFAULT_REVIEW_CHECKLIST: ReviewChecklist = {
  modeConfirmed: false,
  validationReviewed: false,
  diffReviewed: false,
  evidenceReady: false,
};

function hasSameReviewDraftContent(left: Record<string, unknown>, right: Record<string, unknown>) {
  return JSON.stringify({
    validationRuns: left.validationRuns,
    consistencyRuns: left.consistencyRuns,
    pathTestRuns: left.pathTestRuns,
    globalNotes: left.globalNotes,
    elementNotes: left.elementNotes,
    noteTarget: left.noteTarget,
    reviewStatus: left.reviewStatus,
    reviewerName: left.reviewerName,
    reviewerNotes: left.reviewerNotes,
    reviewSummaryDraft: left.reviewSummaryDraft,
    reviewerSignoff: left.reviewerSignoff,
    handoffState: left.handoffState,
    reviewProfile: left.reviewProfile,
    reviewChecklist: left.reviewChecklist,
    decisionLog: left.decisionLog,
    updatedAt: null,
  }) === JSON.stringify({
    validationRuns: right.validationRuns,
    consistencyRuns: right.consistencyRuns,
    pathTestRuns: right.pathTestRuns,
    globalNotes: right.globalNotes,
    elementNotes: right.elementNotes,
    noteTarget: right.noteTarget,
    reviewStatus: right.reviewStatus,
    reviewerName: right.reviewerName,
    reviewerNotes: right.reviewerNotes,
    reviewSummaryDraft: right.reviewSummaryDraft,
    reviewerSignoff: right.reviewerSignoff,
    handoffState: right.handoffState,
    reviewProfile: right.reviewProfile,
    reviewChecklist: right.reviewChecklist,
    decisionLog: right.decisionLog,
    updatedAt: null,
  });
}

function normalizeReviewChecklist(value: unknown): ReviewChecklist {
  if (!value || typeof value !== 'object') {
    return DEFAULT_REVIEW_CHECKLIST;
  }

  const candidate = value as Partial<ReviewChecklist>;
  return {
    modeConfirmed: Boolean(candidate.modeConfirmed),
    validationReviewed: Boolean(candidate.validationReviewed),
    diffReviewed: Boolean(candidate.diffReviewed),
    evidenceReady: Boolean(candidate.evidenceReady),
  };
}

function normalizeReviewProfile(value: unknown): ReviewProfile | null {
  if (value === 'mode_verification' || value === 'bundle_evidence_review' || value === 'publish_gate_review') {
    return value;
  }

  return null;
}

function normalizeHandoffState(value: unknown): HandoffState | null {
  if (value === 'ready_for_review' || value === 'needs_evidence' || value === 'needs_changes' || value === 'approved_for_export') {
    return value;
  }

  return null;
}

type ReviewWorkspaceProps = {
  data: any;
  demoPreset: DemoReviewPreset | null;
  originalData: any | null;
  darkMode: boolean;
  modifiedPaths: Set<string>;
  supportFiles: UploadedContextFile[];
  selectedContextPath: string | null;
  bridgeStatus: BridgeStatus | null;
  bridgeStatusError: string | null;
  guiRepoUrl: string;
  engineRepoUrl: string;
  workspaceDraftSavedAt?: string | null;
  workspaceDraftRestored?: boolean;
  currentLanguage: string;
  onOpenLlmSettings: () => void;
  onSelectContextPath: (path: string | null) => void;
  onSaveEdit: (config: Exclude<EditorConfig, null>, updatedData: any) => void;
  onToggleLanguage: () => void;
  onUndo: () => void;
  onResetWorkspace: () => void;
};

export function ReviewWorkspace({
  data,
  demoPreset,
  originalData,
  darkMode,
  modifiedPaths,
  supportFiles,
  selectedContextPath,
  bridgeStatus,
  bridgeStatusError,
  guiRepoUrl,
  engineRepoUrl,
  workspaceDraftSavedAt = null,
  workspaceDraftRestored = false,
  currentLanguage,
  onOpenLlmSettings,
  onSelectContextPath,
  onSaveEdit,
  onToggleLanguage,
  onUndo,
  onResetWorkspace,
}: ReviewWorkspaceProps) {
  const { t } = useTranslation();
  const prefersReducedMotion = useReducedMotion();
  const initialBridgeMode = data?.bridge?.mode === 'skill-0' || data?.bridge?.mode === 'standalone' || data?.bridge?.mode === 'llm-assisted'
    ? data.bridge.mode
    : bridgeStatus?.mode ?? 'unknown';
  const initialReviewStatus = data?.reviewerSummary?.reviewStatus
    || (initialBridgeMode === 'skill-0' ? 'in_review' : 'draft');
  const [activeTab, setActiveTab] = useState<WorkspaceTabId>('pipeline');
  const [activePhase, setActivePhase] = useState<string | null>(null);
  const [activeBottomTab, setActiveBottomTab] = useState<'review' | 'checks' | 'context' | null>(null);
  const [activeReviewSub, setActiveReviewSub] = useState<'decision' | 'notes' | 'diff'>('decision');
  const [activeChecksSub, setActiveChecksSub] = useState<'posture' | 'schema' | 'consistency' | 'tests' | 'evidence'>('posture');
  const [activeContextSub, setActiveContextSub] = useState<'summary' | 'policy' | 'files' | 'analysis' | 'source' | 'links'>('summary');
  const [activePipelineSubview, setActivePipelineSubview] = useState<PipelineSubviewId>('summary');
  const [isWorkspaceFocusMode, setIsWorkspaceFocusMode] = useState(false);
  const [isTopToolbarExpanded, setIsTopToolbarExpanded] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const [editorConfig, setEditorConfig] = useState<EditorConfig>(null);
  const [validationRuns, setValidationRuns] = useState<ValidationRun[]>([]);
  const [consistencyRuns, setConsistencyRuns] = useState<ConsistencyRun[]>([]);
  const [pathTestRuns, setPathTestRuns] = useState<PathTestRun[]>([]);
  const [globalNotes, setGlobalNotes] = useState<ReviewNote[]>([]);
  const [elementNotes, setElementNotes] = useState<ElementReviewNote[]>([]);
  const [reviewStatus, setReviewStatus] = useState<ReviewState['reviewStatus']>(initialReviewStatus);
  const [decisionLog, setDecisionLog] = useState<ReviewDecision[]>([]);
  const [noteDraft, setNoteDraft] = useState('');
  const [noteTarget, setNoteTarget] = useState('global');
  const [reviewerName, setReviewerName] = useState(data?.reviewerSummary?.reviewerName || '');
  const [reviewerNotes, setReviewerNotes] = useState(data?.reviewerSummary?.reviewerNotes || '');
  const [reviewSummaryDraft, setReviewSummaryDraft] = useState('');
  const [reviewerSignoff, setReviewerSignoff] = useState('');
  const [reviewChecklist, setReviewChecklist] = useState<ReviewChecklist>(DEFAULT_REVIEW_CHECKLIST);
  const [reviewProfile, setReviewProfile] = useState<ReviewProfile>(() => deriveReviewProfile({
    bridgeMode: initialBridgeMode,
    demoPresetId: demoPreset?.id ?? null,
    reviewStatus: data?.reviewerSummary?.reviewStatus,
    supportFileCount: supportFiles.length,
  }));
  const [handoffState, setHandoffState] = useState<HandoffState>('ready_for_review');
  const [reviewDraftSavedAt, setReviewDraftSavedAt] = useState<string | null>(null);
  const [reviewDraftRestored, setReviewDraftRestored] = useState(false);
  const issueReturnRef = useRef<{
    activeTab: WorkspaceTabId;
    activeBottomTab: 'review' | 'checks' | 'context' | null;
    activeChecksSub: 'posture' | 'schema' | 'consistency' | 'tests' | 'evidence';
    activeContextSub: 'summary' | 'policy' | 'files' | 'analysis' | 'source' | 'links';
    activePipelineSubview: PipelineSubviewId;
    activePhase: string | null;
  } | null>(null);
  const hasHydratedReviewDraftRef = useRef(false);
  const hadStoredReviewDraftRef = useRef(false);
  const skipNextReviewDraftPersistRef = useRef(false);
  const appliedDemoPresetIdRef = useRef<string | null>(null);

  const parserActions = data?.parserResult?.decomposition?.actions ?? [];
  const parserRules = data?.parserResult?.decomposition?.rules ?? [];
  const parserDirectives = data?.parserResult?.decomposition?.directives ?? [];
  const executionPaths = data?.parserResult?.execution_paths ?? [];
  const parserManifest = data?.parserResult?.manifest ?? null;
  const parserSupportingFiles = data?.parserResult?.supporting_files ?? [];
  const parserCommandReferences = data?.parserResult?.command_references ?? [];
  const parserAnalysisFindings = data?.parserResult?.analysis_findings ?? [];
  const activePhaseData = activePhase ? data?.phases?.find((phase: any) => phase.id === activePhase) : null;
  const decisionCount = data?.phases?.reduce((sum: number, phase: any) => sum + (phase.decisionNodes?.length ?? 0), 0) ?? 0;
  const scanScore = data?.securityScan?.riskScore ?? data?.riskAssessment?.negativeIntent ?? 0;
  const firstFinding = data?.securityScan?.findings?.[0] ?? null;
  const operatorReminders = data?.reviewerSummary?.operatorReminders ?? [];
  const activeBridgeMode = initialBridgeMode;
  const activeBridgeSkill0Root = typeof data?.bridge?.skill0Root === 'string'
    ? data.bridge.skill0Root
    : bridgeStatus?.skill0Root ?? null;
  const activeBridgeProvider = typeof data?.bridge?.provider === 'string'
    ? data.bridge.provider
    : null;
  const activeBridgeModel = typeof data?.bridge?.model === 'string'
    ? data.bridge.model
    : null;
  const activeBridgeFallbackReason = typeof data?.bridge?.fallback_reason === 'string'
    ? data.bridge.fallback_reason
    : typeof data?.reviewerSummary?.fallback_reason === 'string'
      ? data.reviewerSummary.fallback_reason
      : null;
  const activeBridgeDraftOnly = data?.bridge?.draft_only === true || data?.reviewerSummary?.draft_only === true;
  const activeBridgeSchemaValidation = typeof data?.bridge?.schema_validation === 'string'
    ? data.bridge.schema_validation
    : typeof data?.reviewerSummary?.schema_validation === 'string'
      ? data.reviewerSummary.schema_validation
      : null;
  const workspaceTabs = [
    {
      id: 'pipeline' as WorkspaceTabId,
      label: t('app.tabs.pipeline'),
      meta: `${parserActions.length}/${parserRules.length}/${parserDirectives.length}`,
    },
    {
      id: 'vector' as WorkspaceTabId,
      label: t('app.tabs.vector'),
      meta: t('vector.title'),
    },
    {
      id: 'matrix' as WorkspaceTabId,
      label: t('app.tabs.matrix'),
      meta: `${decisionCount} ${t('app.totalDecisions')}`,
    },
  ];
  const pipelineSubviews = [
    {
      id: 'summary' as PipelineSubviewId,
      label: t('dashboard.summary'),
      meta: `${data?.globalMetrics?.decisionConfidence ?? '--'}% ${t('dashboard.confidence')}`,
    },
    {
      id: 'analysis' as PipelineSubviewId,
      label: t('app.analysisResult'),
      meta: `${parserAnalysisFindings.length} ${t('app.analysisFindings')}`,
    },
    {
      id: 'decomposition' as PipelineSubviewId,
      label: t('app.standardDecomposition'),
      meta: `${parserActions.length}/${parserRules.length}/${parserDirectives.length}`,
    },
    {
      id: 'pipeline' as PipelineSubviewId,
      label: t('app.standardPipeline'),
      meta: t('app.stepReview'),
    },
    {
      id: 'derived' as PipelineSubviewId,
      label: t('app.derivedWorkflow'),
      meta: `${decisionCount} ${t('app.totalDecisions')}`,
    },
  ];
  const bridgeModeLabel = activeBridgeMode === 'skill-0'
    ? t('app.bridgeModeCanonical')
    : activeBridgeMode === 'standalone'
      ? t('app.bridgeModeStandalone')
      : activeBridgeMode === 'llm-assisted'
        ? t('app.bridgeModeLlmAssisted')
      : t('app.bridgeModeUnavailable');
  const bridgeModeDetail = activeBridgeMode === 'llm-assisted'
    ? [
        activeBridgeProvider && activeBridgeModel
          ? `${activeBridgeProvider}/${activeBridgeModel}`
          : activeBridgeProvider || activeBridgeModel,
        activeBridgeSchemaValidation ? `schema ${activeBridgeSchemaValidation}` : null,
        activeBridgeFallbackReason,
      ].filter(Boolean).join(' · ') || t('app.bridgeModeLlmAssistedDetail')
    : activeBridgeSkill0Root
      || (activeBridgeMode === 'standalone'
        ? t('app.bridgeModeBundled')
        : bridgeStatusError || t('app.bridgeModeChecking'));
  const bridgeModeSummary = activeBridgeMode === 'skill-0'
    ? t('app.bridgeModeCanonicalShort')
    : activeBridgeMode === 'standalone'
      ? t('app.bridgeModeStandaloneShort')
      : activeBridgeMode === 'llm-assisted'
        ? t('app.bridgeModeLlmAssistedShort')
      : t('app.bridgeModeUnavailableShort');
  const llmFallbackLabel = activeBridgeMode === 'llm-assisted' || bridgeStatus?.llmFallbackAvailable
    ? t('app.llmFallbackAvailable')
    : t('app.llmFallbackUnavailable');
  const llmFallbackDetail = activeBridgeMode === 'llm-assisted'
    ? [activeBridgeProvider, activeBridgeModel].filter(Boolean).join('/') || activeBridgeFallbackReason || t('app.llmFallbackReady')
    : bridgeStatus?.llmFallbackAvailable
      ? [bridgeStatus?.llmProvider, bridgeStatus?.llmModel].filter(Boolean).join('/') || t('app.llmFallbackReady')
      : bridgeStatus?.llmReason || t('app.llmFallbackDisabledHint');
  const bridgeReviewGuidance = activeBridgeMode === 'skill-0'
    ? t('app.bridgeHelpCanonical')
    : activeBridgeMode === 'standalone'
      ? t('app.bridgeHelpStandalone')
      : activeBridgeMode === 'llm-assisted'
        ? t('app.bridgeHelpLlmAssisted')
      : t('app.bridgeHelpUnavailable');
  const reviewReadinessLabel = activeBridgeMode === 'skill-0'
    ? t('app.reviewEvidenceCanonical')
    : activeBridgeMode === 'standalone'
      ? t('app.reviewEvidenceStandalone')
      : activeBridgeMode === 'llm-assisted'
        ? t('app.reviewEvidenceLlmAssisted')
      : t('app.reviewEvidenceUnavailable');
  const reviewReadinessStyles = activeBridgeMode === 'skill-0'
    ? 'bg-emerald-500/12 text-emerald-950'
    : activeBridgeMode === 'standalone'
      ? 'bg-amber-500/12 text-amber-950'
      : activeBridgeMode === 'llm-assisted'
        ? 'bg-sky-500/12 text-sky-950'
      : 'bg-muted text-muted-foreground';
  const skillDocument = extractSkillDocumentFromReviewData(data);
  const originalSkillDocument = originalData ? extractSkillDocumentFromReviewData(originalData) : null;
  const reviewDraftStorageKey = data?.projectId ? `${REVIEW_DRAFT_STORAGE_PREFIX}:${data.projectId}` : null;
  const skillDocumentDiffSummary = skillDocument && originalSkillDocument
    ? buildSkillDocumentDiffSummary(originalSkillDocument, skillDocument)
    : null;
  const modifiedPathsDiffSummary = buildModifiedPathsDiffSummary(modifiedPaths);
  const skillDocumentDiffHasEntries = Boolean(skillDocumentDiffSummary)
    && (skillDocumentDiffSummary.added.length > 0
      || skillDocumentDiffSummary.removed.length > 0
      || skillDocumentDiffSummary.changed.length > 0);
  const diffSummary: DiffSummary | null = skillDocumentDiffHasEntries
    ? skillDocumentDiffSummary
    : modifiedPathsDiffSummary ?? skillDocumentDiffSummary;
  const visibleModifiedPaths = Array.from(modifiedPaths)
    .filter((path): path is string => typeof path === 'string' && path !== 'metrics');
  const validationResult = skillDocument ? validateSkillDocument(skillDocument) : null;
  const validationIssues = validationResult?.issues ?? [];
  const validationErrors = validationIssues.filter((issue) => issue.severity === 'error');
  const validationWarnings = validationIssues.filter((issue) => issue.severity === 'warning');
  const consistencyResult = skillDocument ? checkSkillDocumentConsistency(skillDocument) : null;
  const consistencyIssues = consistencyResult?.issues ?? [];
  const consistencyErrors = consistencyIssues.filter((issue) => issue.severity === 'error');
  const consistencyWarnings = consistencyIssues.filter((issue) => issue.severity === 'warning');
  const blockingIssueInbox = buildReviewIssueNavigationTargets(skillDocument, validationErrors, consistencyErrors)
    .map((issue) => {
      const contextFile = supportFiles.find((file) => issue.targetId && (file.path.includes(issue.targetId) || file.name.includes(issue.targetId)));
      const phase = data?.phases?.find((candidate: any) => issue.targetId && JSON.stringify(candidate).includes(issue.targetId));
      return {
        ...issue,
        contextPath: contextFile?.path ?? null,
        phaseId: phase?.id ?? null,
      };
    });
  const skillDocumentActions = skillDocument?.decomposition.actions ?? [];
  const skillDocumentRules = skillDocument?.decomposition.rules ?? [];
  const skillDocumentDirectives = skillDocument?.decomposition.directives ?? [];
  const skillDocumentExecutionPaths = skillDocument?.execution_paths ?? [];
  const insightTabs = [
    { id: 'review' as const, label: t('app.reviewDecisionPanel'), meta: `${decisionLog.length} ${t('app.decisionCount')}` },
    { id: 'checks' as const, label: t('app.detailsPanel'), meta: `${validationErrors.length + consistencyErrors.length} ${t('app.validationErrors')}` },
    { id: 'context' as const, label: t('app.projectSummary'), meta: `${parserSupportingFiles.length} ${t('app.supportingFiles')}` },
  ];
  const currentFocusTitle = data?.parserResult?.meta?.title || data?.parserResult?.meta?.name || '--';
  const activeWorkspaceTab = workspaceTabs.find((view) => view.id === activeTab) ?? workspaceTabs[0];
  const activePipelineSubviewMeta = pipelineSubviews.find((view) => view.id === activePipelineSubview) ?? pipelineSubviews[0];
  const activeInsightSummary = activeBottomTab ? insightTabs.find((tab) => tab.id === activeBottomTab) ?? null : null;
  const workspaceDraftStatusLabel = workspaceDraftRestored ? t('app.localDraftRestored') : t('app.localDraftAutosaved');
  const reviewDraftStatusLabel = reviewDraftRestored ? t('app.localDraftRestored') : t('app.localDraftAutosaved');
  const languageToggleLabel = currentLanguage.startsWith('zh') ? 'EN' : '中文';
  const hasDraftStatus = Boolean(workspaceDraftSavedAt || reviewDraftSavedAt);
  const noteTargets = [
    { label: t('app.noteTargetGlobal'), value: 'global' },
    ...skillDocumentActions.map((action) => ({
      label: `${t('app.noteTargetAction')} · ${action.id} · ${action.name}`,
      value: `action:${action.id}`,
    })),
    ...skillDocumentRules.map((rule) => ({
      label: `${t('app.noteTargetRule')} · ${rule.id} · ${rule.name}`,
      value: `rule:${rule.id}`,
    })),
    ...skillDocumentDirectives.map((directive) => ({
      label: `${t('app.noteTargetDirective')} · ${directive.id} · ${directive.name}`,
      value: `directive:${directive.id}`,
    })),
  ];
  const latestValidationRun = validationRuns[0] ?? null;
  const latestConsistencyRun = consistencyRuns[0] ?? null;
  const latestPathTestRun = pathTestRuns[0] ?? null;
  const checklistCompletedCount = Object.values(reviewChecklist).filter(Boolean).length;
  const hasBlockingChecks = validationErrors.length > 0
    || consistencyErrors.length > 0
    || latestValidationRun?.status === 'failed'
    || latestConsistencyRun?.status === 'failed'
    || latestPathTestRun?.status === 'failed';
  const derivedHandoffState = deriveDefaultHandoffState({
    hasBlockingChecks,
    reviewChecklist,
    reviewStatus,
  });
  const allowedHandoffStates = getAllowedHandoffStates({
    derivedHandoffState,
    hasBlockingChecks,
    reviewStatus,
  });
  const topDeckTransition = prefersReducedMotion
    ? { duration: 0 }
    : { duration: 0.15, ease: [0.22, 1, 0.36, 1] };
  const surfaceTransition = prefersReducedMotion
    ? { duration: 0 }
    : { duration: 0.20, ease: [0.22, 1, 0.36, 1] };
  const shellTransition = prefersReducedMotion
    ? { duration: 0 }
    : { duration: 0.28, ease: [0.22, 1, 0.36, 1] };
  const drawerTransition = prefersReducedMotion
    ? { duration: 0 }
    : { type: 'spring', damping: 30, stiffness: 260, mass: 0.85 };
  const drawerSubviewKey = activeBottomTab === 'review'
    ? `review-${activeReviewSub}`
    : activeBottomTab === 'checks'
      ? `checks-${activeChecksSub}`
      : activeBottomTab === 'context'
        ? `context-${activeContextSub}`
        : 'closed';

  useEffect(() => {
    if (!reviewDraftStorageKey || typeof window === 'undefined') {
      return;
    }

    try {
      const raw = window.localStorage.getItem(reviewDraftStorageKey);
      if (!raw) {
        hadStoredReviewDraftRef.current = false;
        setValidationRuns([]);
        setConsistencyRuns([]);
        setPathTestRuns([]);
        setGlobalNotes([]);
        setElementNotes([]);
        setReviewStatus(initialReviewStatus);
        setReviewerName(data?.reviewerSummary?.reviewerName || '');
        setReviewerNotes(data?.reviewerSummary?.reviewerNotes || '');
        setDecisionLog([]);
        setNoteTarget('global');
        setReviewSummaryDraft('');
        setReviewerSignoff('');
        setReviewChecklist(DEFAULT_REVIEW_CHECKLIST);
        setReviewProfile(deriveReviewProfile({
          bridgeMode: activeBridgeMode,
          demoPresetId: demoPreset?.id ?? null,
          reviewStatus: data?.reviewerSummary?.reviewStatus,
          supportFileCount: supportFiles.length,
        }));
        setHandoffState(deriveDefaultHandoffState({
          hasBlockingChecks,
          reviewChecklist: DEFAULT_REVIEW_CHECKLIST,
          reviewStatus: initialReviewStatus,
        }));
        setReviewDraftSavedAt(null);
        setReviewDraftRestored(false);
        hasHydratedReviewDraftRef.current = true;
        return;
      }

      hadStoredReviewDraftRef.current = true;
      const parsed = JSON.parse(raw);
      setValidationRuns(Array.isArray(parsed.validationRuns) ? parsed.validationRuns : []);
      setConsistencyRuns(Array.isArray(parsed.consistencyRuns) ? parsed.consistencyRuns : []);
      setPathTestRuns(Array.isArray(parsed.pathTestRuns) ? parsed.pathTestRuns : []);
      setGlobalNotes(Array.isArray(parsed.globalNotes) ? parsed.globalNotes : []);
      setElementNotes(Array.isArray(parsed.elementNotes) ? parsed.elementNotes : []);
      setReviewStatus(isReviewStatus(parsed.reviewStatus) ? parsed.reviewStatus : 'draft');
      setReviewerName(typeof parsed.reviewerName === 'string' ? parsed.reviewerName : data?.reviewerSummary?.reviewerName || '');
      setReviewerNotes(typeof parsed.reviewerNotes === 'string' ? parsed.reviewerNotes : data?.reviewerSummary?.reviewerNotes || '');
      setDecisionLog(Array.isArray(parsed.decisionLog) ? parsed.decisionLog : []);
      setNoteTarget(typeof parsed.noteTarget === 'string' ? parsed.noteTarget : 'global');
      setReviewSummaryDraft(typeof parsed.reviewSummaryDraft === 'string' ? parsed.reviewSummaryDraft : '');
      setReviewerSignoff(typeof parsed.reviewerSignoff === 'string' ? parsed.reviewerSignoff : '');
      setReviewChecklist(normalizeReviewChecklist(parsed.reviewChecklist));
      setReviewProfile(
        normalizeReviewProfile(parsed.reviewProfile)
        || deriveReviewProfile({
          bridgeMode: activeBridgeMode,
          demoPresetId: demoPreset?.id ?? null,
          reviewStatus: parsed.reviewStatus,
          supportFileCount: supportFiles.length,
        }),
      );
      setHandoffState(
        normalizeHandoffState(parsed.handoffState)
        || deriveDefaultHandoffState({
          hasBlockingChecks,
          reviewChecklist: normalizeReviewChecklist(parsed.reviewChecklist),
          reviewStatus: isReviewStatus(parsed.reviewStatus) ? parsed.reviewStatus : 'draft',
        }),
      );
      setReviewDraftSavedAt(typeof parsed.updatedAt === 'string' ? parsed.updatedAt : null);
      setReviewDraftRestored(true);
      skipNextReviewDraftPersistRef.current = true;
    } catch {
      hadStoredReviewDraftRef.current = false;
      setValidationRuns([]);
      setConsistencyRuns([]);
      setPathTestRuns([]);
      setGlobalNotes([]);
      setElementNotes([]);
      setReviewStatus(initialReviewStatus);
      setReviewerName(data?.reviewerSummary?.reviewerName || '');
      setReviewerNotes(data?.reviewerSummary?.reviewerNotes || '');
      setDecisionLog([]);
      setNoteTarget('global');
      setReviewSummaryDraft('');
      setReviewerSignoff('');
      setReviewChecklist(DEFAULT_REVIEW_CHECKLIST);
      setReviewProfile(deriveReviewProfile({
        bridgeMode: activeBridgeMode,
        demoPresetId: demoPreset?.id ?? null,
        reviewStatus: data?.reviewerSummary?.reviewStatus,
        supportFileCount: supportFiles.length,
      }));
      setHandoffState(deriveDefaultHandoffState({
        hasBlockingChecks,
        reviewChecklist: DEFAULT_REVIEW_CHECKLIST,
        reviewStatus: initialReviewStatus,
      }));
      setReviewDraftSavedAt(null);
      setReviewDraftRestored(false);
    }

    hasHydratedReviewDraftRef.current = true;
  }, [
    activeBridgeMode,
    data?.reviewerSummary?.reviewStatus,
    data?.reviewerSummary?.reviewerName,
    data?.reviewerSummary?.reviewerNotes,
    initialReviewStatus,
    reviewDraftStorageKey,
  ]);

  useEffect(() => {
    if (!reviewDraftStorageKey || typeof window === 'undefined') {
      return;
    }

    if (!hasHydratedReviewDraftRef.current) {
      return;
    }

    if (skipNextReviewDraftPersistRef.current) {
      skipNextReviewDraftPersistRef.current = false;
      return;
    }

    const hasPersistedState = validationRuns.length > 0
      || consistencyRuns.length > 0
      || pathTestRuns.length > 0
      || globalNotes.length > 0
      || elementNotes.length > 0
      || decisionLog.length > 0
      || reviewerName.trim().length > 0
      || reviewerNotes.trim().length > 0
      || reviewSummaryDraft.trim().length > 0
      || reviewerSignoff.trim().length > 0
      || Object.values(reviewChecklist).some(Boolean)
      || reviewStatus !== 'draft';

    if (!hasPersistedState && noteTarget === 'global') {
      window.localStorage.removeItem(reviewDraftStorageKey);
      setReviewDraftSavedAt(null);
      setReviewDraftRestored(false);
      return;
    }

    const nextDraftPayload = {
      consistencyRuns,
      elementNotes,
      globalNotes,
      noteTarget,
      pathTestRuns,
      reviewStatus,
      reviewerName,
      reviewerNotes,
      reviewSummaryDraft,
      reviewerSignoff,
      handoffState,
      reviewProfile,
      reviewChecklist,
      decisionLog,
      validationRuns,
      updatedAt: reviewDraftSavedAt,
    };
    try {
      const raw = window.localStorage.getItem(reviewDraftStorageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object' && hasSameReviewDraftContent(parsed as Record<string, unknown>, nextDraftPayload)) {
          if (reviewDraftRestored) {
            return;
          }
        }
      }
    } catch {
      // Ignore comparison failures and overwrite with the latest draft payload below.
    }

    const updatedAt = new Date().toISOString();
    window.localStorage.setItem(reviewDraftStorageKey, JSON.stringify({
      ...nextDraftPayload,
      updatedAt,
    }));
    setReviewDraftSavedAt(updatedAt);
    setReviewDraftRestored(false);
  }, [reviewDraftStorageKey, validationRuns, consistencyRuns, pathTestRuns, globalNotes, elementNotes, noteTarget, reviewStatus, reviewerName, reviewerNotes, reviewSummaryDraft, reviewerSignoff, handoffState, reviewProfile, reviewChecklist, decisionLog]);
  useEffect(() => {
    if (!demoPreset || !skillDocument || !hasHydratedReviewDraftRef.current) {
      return;
    }

    if (appliedDemoPresetIdRef.current === demoPreset.id) {
      return;
    }

    if (hadStoredReviewDraftRef.current) {
      appliedDemoPresetIdRef.current = demoPreset.id;
      return;
    }

    const timestamp = new Date().toISOString();
    const seededValidationRuns = demoPreset.seedValidationRun ? [createValidationRun(skillDocument)] : [];
    const seededConsistencyRuns = demoPreset.seedConsistencyRun ? [createConsistencyRun(skillDocument)] : [];
    const seededPathRuns = demoPreset.seedPathRun ? [createPathTestRun(skillDocument)] : [];

    setGlobalNotes(demoPreset.notes.map((content, index) => ({
      author: 'Demo Reviewer',
      content,
      createdAt: timestamp,
      id: `demo-note-${demoPreset.id}-${index + 1}`,
      severity: 'info',
    })));
    setElementNotes([]);
    setNoteTarget('global');
    setReviewStatus(demoPreset.reviewStatus);
    setReviewSummaryDraft(demoPreset.reviewSummary);
    setReviewerSignoff(demoPreset.reviewerSignoff);
    setReviewChecklist(demoPreset.reviewChecklist);
    setReviewProfile(deriveReviewProfile({
      bridgeMode: activeBridgeMode,
      demoPresetId: demoPreset.id,
      reviewStatus: demoPreset.reviewStatus,
      supportFileCount: supportFiles.length,
    }));
    setHandoffState(deriveDefaultHandoffState({
      hasBlockingChecks,
      reviewChecklist: demoPreset.reviewChecklist,
      reviewStatus: demoPreset.reviewStatus,
    }));
    setValidationRuns(seededValidationRuns);
    setConsistencyRuns(seededConsistencyRuns);
    setPathTestRuns(seededPathRuns);
    setDecisionLog(buildDemoPresetDecisionLog(demoPreset, timestamp, seededValidationRuns, seededConsistencyRuns, seededPathRuns));
    setReviewDraftRestored(false);
    appliedDemoPresetIdRef.current = demoPreset.id;
  }, [activeBridgeMode, demoPreset, hasBlockingChecks, skillDocument, supportFiles.length]);

  useEffect(() => {
    setHandoffState(derivedHandoffState);
  }, [derivedHandoffState]);

  useEffect(() => {
    if (allowedHandoffStates.includes(handoffState)) {
      return;
    }

    setHandoffState(derivedHandoffState);
  }, [allowedHandoffStates, derivedHandoffState, handoffState]);
  const appendDecision = (action: ReviewDecision['action'], summary: string, targetId?: string) => {
    const timestamp = new Date().toISOString();
    setDecisionLog((current) => [
      {
        action,
        id: `decision-${timestamp}-${Math.random().toString(36).slice(2, 8)}`,
        summary,
        targetId,
        timestamp,
      },
      ...current,
    ].slice(0, 12));
  };
  const addValidationRun = () => {
    if (!skillDocument) {
      return;
    }

    const run = createValidationRun(skillDocument);
    setValidationRuns((current) => [run, ...current].slice(0, 6));
    appendDecision('validated', `Validation run ${run.status}.`);
  };
  const addConsistencyRun = () => {
    if (!skillDocument) {
      return;
    }

    const run = createConsistencyRun(skillDocument);
    setConsistencyRuns((current) => [run, ...current].slice(0, 6));
    appendDecision('tested', `Consistency run ${run.status}.`);
  };
  const addPathTestRun = () => {
    if (!skillDocument) {
      return;
    }

    const run = createPathTestRun(skillDocument);
    setPathTestRuns((current) => [run, ...current].slice(0, 6));
    appendDecision('tested', `Path walk ${run.status}.`);
  };
  const addReviewNote = () => {
    const content = noteDraft.trim();
    if (!content) {
      return;
    }

    const createdAt = new Date().toISOString();
    if (noteTarget === 'global') {
      setGlobalNotes((current) => [
        {
          author: 'Reviewer',
          content,
          createdAt,
          id: `note-${createdAt}`,
          severity: 'info',
        },
        ...current,
      ]);
    } else {
      const [elementType, elementId] = noteTarget.split(':');
      if (elementType && elementId && (elementType === 'action' || elementType === 'rule' || elementType === 'directive')) {
        setElementNotes((current) => [
          {
            author: 'Reviewer',
            content,
            createdAt,
            elementId,
            elementType,
            id: `element-note-${createdAt}`,
            status: 'open',
          },
          ...current,
        ]);
      }
    }

    setNoteDraft('');
  };
  const updateReviewStatus = (nextStatus: 'draft' | 'in_review' | 'changes_requested' | 'approved') => {
    if (nextStatus === reviewStatus) {
      return;
    }

    setReviewStatus(nextStatus);
    appendDecision(
      nextStatus === 'approved'
        ? 'approved'
        : nextStatus === 'changes_requested'
          ? 'requested_changes'
          : 'review_status_updated',
      `Review status changed to ${nextStatus}.`,
    );
  };
  const updateReviewProfile = (nextProfile: ReviewProfile) => {
    if (nextProfile === reviewProfile) {
      return;
    }

    setReviewProfile(nextProfile);
    appendDecision('review_profile_updated', `Review profile changed to ${nextProfile}.`);
  };
  const updateHandoffState = (nextState: HandoffState) => {
    if (nextState === handoffState || !allowedHandoffStates.includes(nextState)) {
      return;
    }

    setHandoffState(nextState);
    appendDecision('handoff_state_updated', `Handoff state changed to ${nextState}.`);
  };
  const toggleReviewChecklist = (key: keyof ReviewChecklist) => {
    setReviewChecklist((current) => {
      const nextValue = !current[key];
      appendDecision(
        'review_status_updated',
        `Sign-off gate ${key} ${nextValue ? 'completed' : 'reopened'}.`,
      );
      return {
        ...current,
        [key]: nextValue,
      };
    });
  };
  const handleResetWorkspace = () => {
    if (reviewDraftStorageKey && typeof window !== 'undefined') {
      window.localStorage.removeItem(reviewDraftStorageKey);
    }

    setReviewSummaryDraft('');
    setReviewerSignoff('');
    setReviewChecklist(DEFAULT_REVIEW_CHECKLIST);
    setReviewProfile(deriveReviewProfile({
      bridgeMode: activeBridgeMode,
      demoPresetId: demoPreset?.id ?? null,
      reviewStatus: data?.reviewerSummary?.reviewStatus,
      supportFileCount: supportFiles.length,
    }));
    setHandoffState(deriveDefaultHandoffState({
      hasBlockingChecks,
      reviewChecklist: DEFAULT_REVIEW_CHECKLIST,
      reviewStatus: initialReviewStatus,
    }));
    setReviewDraftSavedAt(null);
    setReviewDraftRestored(false);
    onResetWorkspace();
  };
  const openSkillDocumentEditor = (focusPath?: string) => {
    if (!skillDocument) {
      return;
    }

    setEditorConfig({
      type: 'skillDocument',
      payload: skillDocument,
      focusPath,
    });
  };
  const rememberIssueReturnPoint = () => {
    issueReturnRef.current = {
      activeTab,
      activeBottomTab,
      activeChecksSub,
      activeContextSub,
      activePipelineSubview,
      activePhase,
    };
  };
  const returnToIssueInbox = () => {
    const returnPoint = issueReturnRef.current;
    issueReturnRef.current = null;
    if (returnPoint) {
      setActiveTab(returnPoint.activeTab);
      setActiveBottomTab(returnPoint.activeBottomTab);
      setActiveChecksSub(returnPoint.activeChecksSub);
      setActiveContextSub(returnPoint.activeContextSub);
      setActivePipelineSubview(returnPoint.activePipelineSubview);
      setActivePhase(returnPoint.activePhase);
    }
  };
  const openBlockingIssueInEditor = (focusPath: string | null) => {
    if (!focusPath) {
      return;
    }

    rememberIssueReturnPoint();
    openSkillDocumentEditor(focusPath);
  };
  const openBlockingIssueContext = (contextPath: string) => {
    onSelectContextPath(contextPath);
    setActiveBottomTab('context');
    setActiveContextSub('files');
  };
  const openBlockingIssuePhase = (phaseId: string) => {
    setActiveTab('pipeline');
    setActiveBottomTab(null);
    setActivePipelineSubview('derived');
    setActivePhase(phaseId);
  };
  const reviewMode = data?.reviewerSummary?.mode
    || (activeBridgeMode === 'skill-0'
      ? 'canonical'
      : activeBridgeMode === 'standalone'
        ? 'standalone'
        : activeBridgeMode === 'llm-assisted'
          ? 'llm-assisted'
        : 'unknown');
  const reviewEquivalenceStatus = data?.reviewerSummary?.equivalenceNote
    || (reviewMode === 'canonical'
      ? 'implementation_identity'
      : reviewMode === 'llm-assisted'
        ? 'draft_only_ai_assisted'
        : 'equivalence_unverified');
  const reviewEquivalenceLabel = reviewEquivalenceStatus === 'implementation_identity'
    ? t('app.equivalenceImplementationIdentity')
    : reviewEquivalenceStatus === 'equivalence_unverified'
      ? t('app.equivalenceUnverified')
      : reviewEquivalenceStatus === 'draft_only_ai_assisted'
        ? t('app.equivalenceAiAssistedDraft')
      : t('app.equivalencePending');
  const canonicalRerunRequired = reviewMode !== 'canonical' || reviewEquivalenceStatus !== 'implementation_identity';
  const reviewDecisionGuidance = data?.reviewerSummary?.finalDecisionGuidance
    || (activeBridgeMode === 'skill-0'
      ? 'Result was produced by the canonical skill-0 bridge. Final equivalence review is acceptable if supporting files and findings are inspected.'
      : activeBridgeMode === 'standalone'
        ? 'Result was produced by the standalone compatibility path. Re-run with the canonical skill-0 bridge before parity-sensitive or final equivalence decisions.'
        : activeBridgeMode === 'llm-assisted'
          ? 'Result was recovered through the LLM-assisted fallback path. Use it for draft review and format recovery only. Do not treat it as final equivalence evidence.'
        : 'Parser mode could not be verified. Do not treat this result as final equivalence evidence until bridge status is confirmed.');
  const exportModeSuffix = reviewMode === 'canonical'
    ? 'canonical'
    : reviewMode === 'standalone'
      ? 'standalone'
      : reviewMode === 'llm-assisted'
        ? 'llm-assisted'
      : 'unknown';
  const bridgeToneClass = activeBridgeMode === 'skill-0'
    ? 'bg-emerald-500/12 text-emerald-950'
    : activeBridgeMode === 'standalone'
      ? 'bg-amber-500/12 text-amber-950'
      : activeBridgeMode === 'llm-assisted'
        ? 'bg-sky-500/12 text-sky-950'
      : 'bg-muted text-foreground';
  const reviewStatusLabel = reviewStatus === 'approved'
    ? t('app.reviewStatusApproved')
    : reviewStatus === 'changes_requested'
      ? t('app.reviewStatusChangesRequested')
      : reviewStatus === 'in_review'
        ? t('app.reviewStatusInReview')
        : t('app.reviewStatusDraft');
  const validationEvidence = buildValidationEvidenceFromReviewData(data, { reviewMode });
  const validationHasErrors = Boolean(
    validationEvidence?.validationRun.errors.some((issue) => issue.severity === 'error')
      || validationEvidence?.consistencyRun.issues.some((issue) => issue.severity === 'error'),
  );
  const validationHasWarnings = Boolean(
    validationEvidence?.evidenceWarnings.length
      || validationEvidence?.validationRun.errors.some((issue) => issue.severity === 'warning')
      || validationEvidence?.consistencyRun.issues.some((issue) => issue.severity === 'warning'),
  );
  const hasAttentionChecks = !hasBlockingChecks && (
    validationWarnings.length > 0
    || consistencyWarnings.length > 0
    || Boolean(validationEvidence?.evidenceWarnings.length)
  );
  const validationStatusLabel = validationHasErrors
    ? t('app.validationStatusFailed')
    : validationHasWarnings
      ? t('app.validationStatusAttention')
      : t('app.validationStatusPassed');
  const effectiveHandoffState = allowedHandoffStates.includes(handoffState) ? handoffState : derivedHandoffState;
  const exportBlockedReasons = buildExportBlockedReasons({
    checklistCompletedCount,
    hasBlockingChecks,
    reviewStatus,
  }).map((reason) => t(reason));
  const canExportArtifacts = effectiveHandoffState === 'approved_for_export' && exportBlockedReasons.length === 0;
  const reviewProfileSummary = t(reviewProfileLabelKey(reviewProfile));
  const handoffSummary = t(handoffStateLabelKey(effectiveHandoffState));
  const handoffGuidance = t(handoffStateGuidanceKey(effectiveHandoffState));
  const nextActionLabel = t(reviewProfileNextStepKey(reviewProfile, effectiveHandoffState));
  const contextSummary = buildContextSummary({
    bridgeModeDetail,
    commandReferences: parserCommandReferences,
    findings: parserAnalysisFindings,
    operatorReminders,
    scanScore,
    selectedContextPath,
    supportFiles,
  }).map((item) => ({
    ...item,
    label: t(item.label),
    detail: t(item.detail),
  }));
  const translateEvidenceMessage = (message: string) => {
    if (message.startsWith('app.validationMissingStepReference:')) {
      const [, pathId, step] = message.split(':');
      return `${t('app.validationMissingStepReference')} ${pathId} -> ${step}`;
    }

    return message.startsWith('app.') ? t(message) : message;
  };
  const handleTopToolbarToggle = () => {
    setShowActions(false);
    setIsTopToolbarExpanded((current) => !current);
  };

  const handleOpenGlobalEditorFromToolbar = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setShowActions(false);
    setEditorConfig({ type: 'global', payload: data });
  };

  useEffect(() => {
    if (activeBottomTab) {
      setShowActions(false);
      setIsTopToolbarExpanded(false);
    }
  }, [activeBottomTab]);

  const buildReviewStateSnapshot = (): ReviewState => {
    const timestamp = new Date().toISOString();
    const normalizedReviewerName = reviewerName.trim();
    const normalizedNotes = reviewerNotes.trim();
    const decisionAction = reviewStatus === 'approved'
      ? 'approved'
      : reviewStatus === 'changes_requested'
        ? 'requested_changes'
        : 'validated';
    const synthesizedDecision = {
      action: decisionAction,
      id: `decision-${timestamp}`,
      summary: `${reviewStatusLabel} · ${reviewDecisionGuidance}`,
      timestamp,
    } satisfies ReviewDecision;
    const synthesizedNotes = normalizedNotes ? [
      {
        author: normalizedReviewerName || 'reviewer',
        content: normalizedNotes,
        createdAt: timestamp,
        id: `note-${timestamp}`,
        severity: reviewStatus === 'changes_requested' ? 'warning' : 'info',
      } satisfies ReviewNote,
    ] : [];

    return {
      checklist: reviewChecklist,
      decisionLog: decisionLog.length > 0 ? decisionLog : [synthesizedDecision],
      diffSummary: diffSummary ?? undefined,
      elementNotes,
      globalNotes: [
        ...synthesizedNotes,
        ...globalNotes,
      ],
      handoffState: effectiveHandoffState,
      reviewProfile,
      reviewStatus,
      reviewSummary: reviewSummaryDraft.trim() || undefined,
      reviewerName: normalizedReviewerName || undefined,
      reviewerSignoff: reviewerSignoff.trim() || undefined,
      updatedAt: timestamp,
    };
  };

  const convertSkillToMarkdown = (skillData: any) => {
    const reviewState = buildReviewStateSnapshot();
    const parserResult = skillData?.parserResult;
    if (parserResult?.decomposition) {
      const meta = parserResult.meta ?? {};
      const original = parserResult.original_definition ?? {};
      const actions = parserResult.decomposition.actions ?? [];
      const rules = parserResult.decomposition.rules ?? [];
      const directives = parserResult.decomposition.directives ?? [];

      const lines = [
        `# ${meta.title || meta.name || skillData.projectName}`,
        '',
        `- skill_id: ${meta.skill_id || skillData.projectId}`,
        `- schema_version: ${meta.schema_version || 'unknown'}`,
        `- parser_version: ${meta.parser_version || 'unknown'}`,
        `- parser_mode: ${activeBridgeMode}`,
        `- parser_mode_source: ${bridgeModeDetail}`,
        `- review_mode: ${reviewMode}`,
        `- review_profile: ${reviewProfile}`,
        `- equivalence_status: ${reviewEquivalenceStatus}`,
        `- draft_only: ${activeBridgeDraftOnly ? 'true' : 'false'}`,
        `- llm_provider: ${activeBridgeProvider || 'n/a'}`,
        `- llm_model: ${activeBridgeModel || 'n/a'}`,
        `- llm_schema_validation: ${activeBridgeSchemaValidation || 'n/a'}`,
        `- fallback_reason: ${activeBridgeFallbackReason || 'n/a'}`,
        `- handoff_state: ${effectiveHandoffState}`,
        `- review_decision_guidance: ${reviewDecisionGuidance}`,
        `- review_status: ${reviewStatus}`,
        `- reviewer: ${reviewerName.trim() || 'unassigned'}`,
        `- reviewer_signoff: ${reviewerSignoff.trim() || 'unassigned'}`,
        `- schema_validation_status: ${validationResult?.valid ? 'valid' : 'invalid'}`,
        `- schema_validation_errors: ${validationErrors.length}`,
        `- schema_validation_warnings: ${validationWarnings.length}`,
        `- consistency_status: ${consistencyResult?.valid ? 'consistent' : 'inconsistent'}`,
        `- consistency_errors: ${consistencyErrors.length}`,
        `- consistency_warnings: ${consistencyWarnings.length}`,
        `- source: ${original.source || 'uploaded skill'}`,
        '',
      ];

      if (reviewerNotes.trim()) {
        lines.push(`> Reviewer notes: ${reviewerNotes.trim()}`);
        lines.push('');
      }

      if (reviewEquivalenceStatus !== 'implementation_identity') {
        lines.push(`> Review note: ${reviewDecisionGuidance}`);
        lines.push('');
      }

      if (activeBridgeDraftOnly) {
        lines.push(`> AI-assisted recovery: ${t('app.bridgeDraftOnlyWarning')}`);
        lines.push('');
      }

      if (validationIssues.length > 0) {
        lines.push('## Validation Summary', '');
        validationIssues.slice(0, 5).forEach((issue) => {
          lines.push(`- [${issue.severity}] ${issue.code} @ ${issue.path}: ${issue.message}`);
        });
        lines.push('');
      }

      if (consistencyIssues.length > 0) {
        lines.push('## Consistency Summary', '');
        consistencyIssues.slice(0, 5).forEach((issue) => {
          lines.push(`- [${issue.severity}] ${issue.type}${issue.targetId ? ` @ ${issue.targetId}` : ''}: ${issue.message}`);
        });
        lines.push('');
      }

      lines.push('## Actions', '');

      actions.forEach((action: any) => {
        lines.push(`### ${action.id} ${action.name}`);
        lines.push(`- type: ${action.action_type}`);
        lines.push(`- deterministic: ${action.deterministic}`);
        if (action.description) lines.push(`- description: ${action.description}`);
        if (action.immutable_elements?.length) lines.push(`- immutable: ${action.immutable_elements.join(', ')}`);
        if (action.mutable_elements?.length) lines.push(`- mutable: ${action.mutable_elements.join(', ')}`);
        if (action.side_effects?.length) lines.push(`- side_effects: ${action.side_effects.join(', ')}`);
        lines.push('');
      });

      lines.push('## Rules', '');
      rules.forEach((rule: any) => {
        lines.push(`### ${rule.id} ${rule.name}`);
        lines.push(`- type: ${rule.condition_type}`);
        lines.push(`- condition: ${rule.condition_expression}`);
        lines.push(`- returns: ${rule.returns}`);
        lines.push(`- fail_action: ${rule.fail_action}`);
        if (rule.branching_targets?.length) lines.push(`- branching_targets: ${rule.branching_targets.join(', ')}`);
        lines.push('');
      });

      lines.push('## Directives', '');
      directives.forEach((directive: any) => {
        lines.push(`### ${directive.id} ${directive.name}`);
        lines.push(`- type: ${directive.directive_type}`);
        lines.push(`- decomposable: ${directive.decomposable}`);
        if (directive.description) lines.push(`- description: ${directive.description}`);
        if (directive.decomposition_hint) lines.push(`- hint: ${directive.decomposition_hint}`);
        if (directive.related_elements?.length) lines.push(`- related: ${directive.related_elements.join(', ')}`);
        lines.push('');
      });

      return lines.join('\n');
    }

    const lines = [
      `# ${skillData.projectName}`,
      '',
      `- skill_id: ${skillData.projectId}`,
      `- category: ${skillData.threeClassification.category}`,
      `- granularity: ${skillData.threeClassification.granularity}`,
      `- operability: ${skillData.threeClassification.operability}`,
      `- risk_level: ${skillData.riskAssessment.level}`,
      `- parser_mode: ${activeBridgeMode}`,
      `- parser_mode_source: ${bridgeModeDetail}`,
      `- review_mode: ${reviewMode}`,
      `- review_profile: ${reviewProfile}`,
      `- review_status: ${reviewStatus}`,
      `- handoff_state: ${effectiveHandoffState}`,
      `- equivalence_status: ${reviewEquivalenceStatus}`,
      `- canonical_rerun_required: ${canonicalRerunRequired ? 'true' : 'false'}`,
      `- draft_only: ${activeBridgeDraftOnly ? 'true' : 'false'}`,
      `- llm_provider: ${activeBridgeProvider || 'n/a'}`,
      `- llm_model: ${activeBridgeModel || 'n/a'}`,
      `- llm_schema_validation: ${activeBridgeSchemaValidation || 'n/a'}`,
      `- fallback_reason: ${activeBridgeFallbackReason || 'n/a'}`,
      `- review_decision_guidance: ${reviewDecisionGuidance}`,
      `- reviewer: ${reviewerName.trim() || 'unassigned'}`,
      `- reviewer_signoff: ${reviewerSignoff.trim() || 'unassigned'}`,
      `- schema_validation_status: ${validationResult?.valid ? 'valid' : 'invalid'}`,
      `- schema_validation_errors: ${validationErrors.length}`,
      `- schema_validation_warnings: ${validationWarnings.length}`,
      `- consistency_status: ${consistencyResult?.valid ? 'consistent' : 'inconsistent'}`,
      `- consistency_errors: ${consistencyErrors.length}`,
      `- consistency_warnings: ${consistencyWarnings.length}`,
      '',
    ];

    if (reviewerNotes.trim()) {
      lines.push(`> Reviewer notes: ${reviewerNotes.trim()}`);
      lines.push('');
    }

    if (reviewEquivalenceStatus !== 'implementation_identity') {
      lines.push(`> Review note: ${reviewDecisionGuidance}`);
      lines.push('');
    }

    if (activeBridgeDraftOnly) {
      lines.push(`> AI-assisted recovery: ${t('app.bridgeDraftOnlyWarning')}`);
      lines.push('');
    }

    if (validationIssues.length > 0) {
      lines.push('## Validation Summary', '');
      validationIssues.slice(0, 5).forEach((issue) => {
        lines.push(`- [${issue.severity}] ${issue.code} @ ${issue.path}: ${issue.message}`);
      });
      lines.push('');
    }

    if (consistencyIssues.length > 0) {
      lines.push('## Consistency Summary', '');
      consistencyIssues.slice(0, 5).forEach((issue) => {
        lines.push(`- [${issue.severity}] ${issue.type}${issue.targetId ? ` @ ${issue.targetId}` : ''}: ${issue.message}`);
      });
      lines.push('');
    }

    lines.push('## Phase Flow', '');

    skillData.phases.forEach((phase: any) => {
      lines.push(`### Phase ${phase.id}: ${phase.name}`);
      lines.push('');
      lines.push('Inputs:');
      phase.input.forEach((item: string) => lines.push(`- ${item}`));
      lines.push('');
      lines.push('Tasks:');
      phase.tasks.forEach((task: string) => lines.push(`- ${task}`));
      lines.push('');
      if (phase.decisionNodes?.length) {
        lines.push('Decision Nodes:');
        phase.decisionNodes.forEach((node: any) => {
          lines.push(`- ${node.id}: ${node.question}`);
          lines.push(`  - threshold: ${node.threshold}`);
          lines.push(`  - yes: ${node.outcomes.yes}`);
          lines.push(`  - no: ${node.outcomes.no}`);
        });
        lines.push('');
      }
      lines.push('Outputs:');
      phase.output.forEach((item: string) => lines.push(`- ${item}`));
      lines.push('');
    });

    return lines.join('\n');
  };

  const exportSkill = () => {
    if (!canExportArtifacts) {
      return;
    }

    downloadBlob(
      new Blob([convertSkillToMarkdown(data)], { type: 'text/markdown;charset=utf-8' }),
      `${data.projectId}-${exportModeSuffix}.skill.md`,
    );
  };

  const exportSkillJson = () => {
    if (!skillDocument || !canExportArtifacts) {
      return;
    }

    downloadBlob(
      new Blob([JSON.stringify(skillDocument, null, 2)], { type: 'application/json;charset=utf-8' }),
      `${data.projectId}-${exportModeSuffix}.skill.json`,
    );
  };

  const exportReviewReport = () => {
    if (!skillDocument || !canExportArtifacts) {
      return;
    }

    const reportLines = [
      `# Review Report: ${data.projectName}`,
      '',
      `- generated_at: ${new Date().toISOString()}`,
      `- skill_id: ${data.projectId}`,
      `- parser_mode: ${activeBridgeMode}`,
      `- parser_mode_source: ${bridgeModeDetail}`,
      `- review_mode: ${reviewMode}`,
      `- review_profile: ${reviewProfile}`,
      `- review_status: ${reviewStatus}`,
      `- handoff_state: ${effectiveHandoffState}`,
      `- equivalence_status: ${reviewEquivalenceStatus}`,
      `- canonical_rerun_required: ${canonicalRerunRequired ? 'true' : 'false'}`,
      `- draft_only: ${activeBridgeDraftOnly ? 'true' : 'false'}`,
      `- llm_provider: ${activeBridgeProvider || 'n/a'}`,
      `- llm_model: ${activeBridgeModel || 'n/a'}`,
      `- llm_schema_validation: ${activeBridgeSchemaValidation || 'n/a'}`,
      `- fallback_reason: ${activeBridgeFallbackReason || 'n/a'}`,
      `- schema_validation_status: ${validationResult?.valid ? 'valid' : 'invalid'}`,
      `- consistency_status: ${consistencyResult?.valid ? 'consistent' : 'inconsistent'}`,
      `- reviewer_signoff: ${reviewerSignoff || 'unassigned'}`,
      `- signoff_gates_completed: ${checklistCompletedCount}/4`,
      `- reviewer_note_count: ${globalNotes.length + elementNotes.length}`,
      `- diff_entry_count: ${diffSummary ? diffSummary.added.length + diffSummary.removed.length + diffSummary.changed.length : 0}`,
      `- reviewer_test_status: ${summarizeTestPanel(t, latestValidationRun, latestConsistencyRun, latestPathTestRun)}`,
      '',
      '## Review Decision Guidance',
      '',
      reviewDecisionGuidance,
      '',
      ...(activeBridgeDraftOnly ? [
        '## Draft-only Warning',
        '',
        t('app.bridgeDraftOnlyWarning'),
        '',
      ] : []),
      '## Reviewer Summary',
      '',
      reviewSummaryDraft.trim() || 'No reviewer summary captured.',
      '',
      '## Sign-off Gates',
      '',
      `- ${reviewChecklist.modeConfirmed ? '[x]' : '[ ]'} ${t('app.reviewChecklistModeConfirmed')}`,
      `- ${reviewChecklist.validationReviewed ? '[x]' : '[ ]'} ${t('app.reviewChecklistValidationReviewed')}`,
      `- ${reviewChecklist.diffReviewed ? '[x]' : '[ ]'} ${t('app.reviewChecklistDiffReviewed')}`,
      `- ${reviewChecklist.evidenceReady ? '[x]' : '[ ]'} ${t('app.reviewChecklistEvidenceReady')}`,
      '',
      '## SkillDocument Snapshot',
      '',
      `- actions: ${skillDocumentActions.length}`,
      `- rules: ${skillDocumentRules.length}`,
      `- directives: ${skillDocumentDirectives.length}`,
      `- execution_paths: ${skillDocumentExecutionPaths.length}`,
      '',
    ];

    if (globalNotes.length > 0) {
      reportLines.push('## Session Notes', '');
      globalNotes.forEach((note) => {
        reportLines.push(`- ${note.createdAt} :: ${note.content}`);
      });
      reportLines.push('');
    }

    if (elementNotes.length > 0) {
      reportLines.push('## Element Notes', '');
      elementNotes.forEach((note) => {
        reportLines.push(`- ${note.createdAt} :: ${capitalizeNoteType(note.elementType)} ${note.elementId} :: ${note.content}`);
      });
      reportLines.push('');
    }

    reportLines.push('## Diff Summary', '');
    if (diffSummary) {
      reportLines.push(
        `- added: ${diffSummary.added.length}`,
        `- removed: ${diffSummary.removed.length}`,
        `- changed: ${diffSummary.changed.length}`,
        `- fields_changed: ${diffSummary.stats.fieldsChanged}`,
      );
      if (diffSummary.added.length > 0) {
        reportLines.push('', '### Added', '');
        diffSummary.added.forEach((entry) => reportLines.push(`- ${entry}`));
      }
      if (diffSummary.removed.length > 0) {
        reportLines.push('', '### Removed', '');
        diffSummary.removed.forEach((entry) => reportLines.push(`- ${entry}`));
      }
      if (diffSummary.changed.length > 0) {
        reportLines.push('', '### Changed', '');
        diffSummary.changed.forEach((entry) => reportLines.push(`- ${entry}`));
      }
      reportLines.push('');
    } else {
      reportLines.push('- Diff summary unavailable.', '');
    }

    reportLines.push('## Validation Snapshot', '');
    if (validationIssues.length > 0) {
      validationIssues.slice(0, 10).forEach((issue) => {
        reportLines.push(`- [${issue.severity}] ${issue.code} @ ${issue.path}: ${issue.message}`);
      });
    } else {
      reportLines.push('- No schema issues detected.');
    }
    reportLines.push('', '## Consistency Snapshot', '');
    if (consistencyIssues.length > 0) {
      consistencyIssues.slice(0, 10).forEach((issue) => {
        reportLines.push(`- [${issue.severity}] ${issue.type}${issue.targetId ? ` @ ${issue.targetId}` : ''}: ${issue.message}`);
      });
    } else {
      reportLines.push('- No consistency issues detected.');
    }

    reportLines.push('', '## Reviewer Test Runs', '');
    if (!latestValidationRun && !latestConsistencyRun && !latestPathTestRun) {
      reportLines.push('- No reviewer-facing runs captured.');
    } else {
      if (latestValidationRun) {
        reportLines.push(
          `- Validation [${latestValidationRun.status}] ${latestValidationRun.finishedAt || latestValidationRun.startedAt} :: ${latestValidationRun.errors.length} errors / ${(latestValidationRun.warnings ?? []).length} warnings`,
        );
      }
      if (latestConsistencyRun) {
        reportLines.push(
          `- Consistency [${latestConsistencyRun.status}] ${latestConsistencyRun.finishedAt || latestConsistencyRun.startedAt} :: ${latestConsistencyRun.issues.length} errors / ${(latestConsistencyRun.warnings ?? []).length} warnings`,
        );
      }
      if (latestPathTestRun) {
        reportLines.push(
          `- Path walk [${latestPathTestRun.status}] ${latestPathTestRun.finishedAt || latestPathTestRun.startedAt} :: ${latestPathTestRun.message || ((latestPathTestRun.actualPath ?? []).join(' -> ') || 'No path summary available.')}`,
        );
      }
    }

    reportLines.push('', '## Decision Log', '');
    if (decisionLog.length === 0) {
      reportLines.push('- No reviewer decisions captured.');
    } else {
      decisionLog.forEach((decision) => {
        reportLines.push(`- ${decision.timestamp} :: ${decision.action}${decision.targetId ? ` @ ${decision.targetId}` : ''} :: ${decision.summary}`);
      });
    }

    reportLines.push('');

    downloadBlob(
      new Blob([reportLines.join('\n')], { type: 'text/markdown;charset=utf-8' }),
      `${data.projectId}-${exportModeSuffix}-review-report.md`,
    );
  };

  const exportReviewPacket = () => {
    if (!canExportArtifacts) {
      return;
    }

    const reviewPacket = buildReviewPacketFromReviewData(data, {
      bridgeMode: activeBridgeMode as ReviewPacket['parserMode'],
      bridgeModeSource: bridgeModeDetail,
      canonicalRerunRequired,
      contextSummary,
      equivalenceStatus: reviewEquivalenceStatus,
      handoffState: effectiveHandoffState,
      modifiedPaths,
      reviewDecisionGuidance,
      reviewProfile,
      reviewMode,
      reviewState: buildReviewStateSnapshot(),
      skillDocument,
      validationEvidence,
    });
    if (!reviewPacket) {
      return;
    }

    const blob = new Blob([JSON.stringify(reviewPacket, null, 2)], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${data.projectId}-${exportModeSuffix}.review-packet.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      {demoPreset && (
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-5 rounded-[calc(var(--radius)*1.02)] bg-card px-4 py-4 text-foreground"
          data-testid="demo-review-preset"
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-3xl">
              <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">{t('app.sampleGuide')}</div>
              <h2 className="mt-2 text-lg font-semibold tracking-tight text-foreground">{demoPreset.title}</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{demoPreset.focus}</p>
            </div>
            <div className="rounded-[calc(var(--radius)*1.02)] bg-muted px-3 py-1.5 text-[11px] font-medium text-foreground">
              {t(reviewStatusLabelKey(reviewStatus))}
            </div>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <div className="rounded-[calc(var(--radius)*1.02)] bg-muted px-3 py-3">
              <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{t('app.sampleNextStep')}</div>
              <div className="mt-2 text-sm leading-6 text-foreground">{demoPreset.nextStep}</div>
            </div>
            <div className="rounded-[calc(var(--radius)*1.02)] bg-muted px-3 py-3">
              <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{t('app.samplePrefilled')}</div>
              <div className="mt-2 text-sm leading-6 text-foreground">{reviewerSignoff || t('app.reviewerSignoffPending')}</div>
            </div>
            <div className="rounded-[calc(var(--radius)*1.02)] bg-muted px-3 py-3">
              <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{t('app.sampleChecklist')}</div>
              <div className="mt-2 text-sm leading-6 text-foreground">{checklistCompletedCount}/4</div>
            </div>
          </div>
        </motion.div>
      )}
      <motion.div
        initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={shellTransition}
        className="review-workbench-v2 relative flex h-screen flex-col overflow-x-hidden"
      >
        <nav className="review-workspace-navigation flex flex-wrap items-center gap-1" role="tablist" aria-label={t('app.workspaceViews')}>
          {workspaceTabs.map((view, index) => (
            <div key={view.id} className="flex items-center gap-1">
              <button
                id={`workspace-view-${view.id}`}
                type="button"
                role="tab"
                aria-selected={activeTab === view.id}
                aria-controls={`workspace-stage-${view.id}`}
                onClick={() => {
                  setActiveTab(view.id);
                  setIsWorkspaceFocusMode(view.id !== 'pipeline');
                }}
                className={`flex items-center gap-2 rounded-[calc(var(--radius)*1.02)] px-3 py-1.5 text-sm transition-colors ${activeTab === view.id ? 'bg-primary text-primary-foreground font-medium' : 'hover:bg-muted text-foreground/70'}`}
              >
                <span className={`inline-flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold ${activeTab === view.id ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-foreground/10 text-foreground/70'}`}>
                  {index + 1}
                </span>
                <span>{view.label}</span>
              </button>
            </div>
          ))}
        </nav>
        <header className="sticky top-0 z-20 shrink-0">
          <div className="review-top-dock px-4 py-4 sm:px-6">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                <div className="review-workspace-identity min-w-0 flex flex-1 items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[calc(var(--radius)*1.05)] bg-primary text-sm font-bold text-primary-foreground">
                    S0
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <p className="editorial-kicker">{t('app.workspace')}</p>
                      <span className="rounded-[calc(var(--radius)*1.02)] bg-muted px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                        {t('app.toolbarContextZone')}
                      </span>
                      <span className="text-xs text-foreground/60">{data.projectId}</span>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-2">
                      <h1 className="text-lg font-semibold tracking-tight text-foreground sm:text-xl">{t('app.title')}</h1>
                      <span className="rounded-[calc(var(--radius)*1.02)] bg-muted px-3 py-1.5 text-xs text-foreground/72">
                        {t('app.currentFocus')}: <span className="font-medium text-foreground">{currentFocusTitle}</span>
                      </span>
                    </div>
                    <div className="review-workspace-metadata mt-2 flex flex-wrap items-center gap-2 text-xs text-foreground/72">
                      <div
                        className={`inline-flex items-center gap-2 rounded-[calc(var(--radius)*1.02)] px-3 py-1.5 ${reviewReadinessStyles}`}
                      >
                        <AlertTriangle size={14} />
                        <span className="font-medium">{reviewReadinessLabel}</span>
                      </div>
                      <span className="inline-flex items-center gap-2 rounded-[calc(var(--radius)*1.02)] bg-muted px-3 py-1.5">
                        <span className={`status-led ${
                          activeBridgeMode === 'skill-0' ? 'status-led--canonical'
                            : activeBridgeMode === 'standalone' ? 'status-led--standalone'
                            : 'status-led--unavailable'
                        }`} />
                        {t('app.bridgeMode')}: {bridgeModeSummary}
                      </span>
                      <span className="rounded-[calc(var(--radius)*1.02)] bg-muted px-3 py-1.5">
                        {activeWorkspaceTab.label}: {activeWorkspaceTab.meta}
                      </span>
                      {activeInsightSummary && (
                        <span className="rounded-[calc(var(--radius)*1.02)] bg-muted px-3 py-1.5">
                          {activeInsightSummary.label}: {activeInsightSummary.meta}
                        </span>
                      )}
                      {hasDraftStatus && (
                        <span className="rounded-[calc(var(--radius)*1.02)] bg-muted px-3 py-1.5">
                          {t('app.localDraft')}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="review-workspace-top-actions flex flex-wrap items-stretch gap-2 xl:justify-end">
                  <span className="landing-toolbar-control hidden rounded-[calc(var(--radius)*1.02)] bg-muted px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground xl:inline-flex">
                    {t('app.toolbarFixedTools')}
                  </span>
                  <button
                    type="button"
                    onClick={handleTopToolbarToggle}
                    aria-expanded={isTopToolbarExpanded}
                    aria-controls="top-toolbar-context-deck"
                    className="landing-toolbar-control editorial-button-secondary px-3 py-2 text-sm font-medium text-muted-foreground"
                    title={isTopToolbarExpanded ? t('app.toolbarCollapse') : t('app.toolbarExpand')}
                  >
                    {isTopToolbarExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    <span className="hidden sm:inline">{isTopToolbarExpanded ? t('app.toolbarCollapse') : t('app.toolbarExpand')}</span>
                  </button>
                  <a
                    href={guiRepoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="landing-toolbar-control editorial-button-secondary px-3 py-2 text-sm font-medium text-muted-foreground"
                    title={t('app.guiRepo')}
                  >
                    <Github size={16} />
                    <span className="hidden sm:inline">GitHub</span>
                  </a>
                  <button
                    type="button"
                    onClick={onOpenLlmSettings}
                    className="landing-toolbar-control editorial-button-secondary px-3 py-2 text-sm font-medium text-muted-foreground"
                    title={t('app.llmAdminTitle')}
                  >
                    <SlidersHorizontal size={16} />
                    <span className="hidden sm:inline">{t('app.aiSettings')}</span>
                  </button>
                  <button
                    type="button"
                    onClick={onToggleLanguage}
                    className="landing-toolbar-control editorial-button-secondary px-3 py-2 text-sm font-medium text-muted-foreground"
                    title="Toggle Language"
                  >
                    <Languages size={16} />
                    <span className="uppercase">{languageToggleLabel}</span>
                  </button>
                </div>
              </div>

              <AnimatePresence initial={false}>
                {isTopToolbarExpanded && (
                  <motion.div
                    id="top-toolbar-context-deck"
                    data-testid="top-toolbar-context-deck"
                    initial={prefersReducedMotion ? false : { opacity: 0, y: -12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={prefersReducedMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: -12 }}
                    transition={topDeckTransition}
                    className={`grid items-start gap-3 ${isWorkspaceFocusMode ? 'xl:grid-cols-[minmax(0,1.35fr)_minmax(19rem,0.9fr)]' : 'xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)_minmax(18rem,0.95fr)]'}`}
                  >
                    {isWorkspaceFocusMode ? (
                      <div className="surface-panel-muted px-4 py-3">
                        <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
                          <div className="min-w-0 xl:max-w-[28rem]">
                            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{t('app.currentFocus')}</div>
                            <div className="mt-1 truncate text-sm font-semibold text-foreground" title={currentFocusTitle}>
                              {currentFocusTitle}
                            </div>
                            <div className="mt-2 text-xs leading-6 text-foreground/68">
                              {activeWorkspaceTab.label} · {activeWorkspaceTab.meta}
                            </div>
                          </div>
                          <div className="grid gap-2 sm:grid-cols-2 xl:min-w-[23rem]">
                            <div className="rounded-[calc(var(--radius)*1.02)] bg-background px-3 py-2">
                              <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{t('app.bridgeMode')}</div>
                              <div className="mt-1 text-xs font-semibold text-foreground">{bridgeModeSummary}</div>
                            </div>
                            <div className="rounded-[calc(var(--radius)*1.02)] bg-background px-3 py-2">
                              <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{t('app.llmFallbackStatus')}</div>
                              <div className="mt-1 text-xs font-semibold text-foreground">{llmFallbackLabel}</div>
                            </div>
                            <div className="rounded-[calc(var(--radius)*1.02)] bg-background px-3 py-2">
                              <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{t('app.reviewDecisionPanel')}</div>
                              <div className="mt-1 text-xs font-semibold text-foreground">{reviewStatusLabel}</div>
                            </div>
                            <div className="rounded-[calc(var(--radius)*1.02)] bg-background px-3 py-2">
                              <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{t('app.validationEvidence')}</div>
                              <div className="mt-1 text-xs font-semibold text-foreground">{reviewReadinessLabel}</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="surface-panel-muted px-4 py-3">
                          <div className="flex flex-col gap-3">
                            <div className="min-w-0">
                              <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{t('app.currentFocus')}</div>
                              <div className="mt-1 truncate text-sm font-semibold text-foreground" title={currentFocusTitle}>
                                {currentFocusTitle}
                              </div>
                              <div className="mt-2 text-xs leading-6 text-foreground/68">{bridgeModeSummary} · {reviewStatusLabel}</div>
                            </div>
                            <div className="flex flex-wrap items-center gap-2 text-xs text-foreground/68">
                              <span className="rounded-[calc(var(--radius)*1.02)] bg-background px-3 py-1.5">
                                {t('app.project')}: {data.projectName}
                              </span>
                              <span className="rounded-[calc(var(--radius)*1.02)] bg-background px-3 py-1.5">
                                {reviewStatusLabel}
                              </span>
                              <span className="rounded-[calc(var(--radius)*1.02)] bg-background px-3 py-1.5">
                                {reviewReadinessLabel}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="surface-panel-muted px-4 py-3">
                          <div className="flex flex-col gap-3">
                            <div>
                              <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{t('app.bridgeMode')}</div>
                              <div className="mt-1 text-sm font-semibold text-foreground">{bridgeModeLabel}</div>
                              <div className="mt-2 text-xs leading-6 text-foreground/68 break-words">{bridgeModeDetail}</div>
                              <div className="mt-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{t('app.llmFallbackStatus')}</div>
                              <div className="mt-1 text-sm font-semibold text-foreground">{llmFallbackLabel}</div>
                              <div className="mt-1 text-xs leading-6 text-foreground/68 break-words">{llmFallbackDetail}</div>
                            </div>
                            <div className="flex flex-wrap items-center gap-2 text-xs text-foreground/68">
                              <span className="rounded-[calc(var(--radius)*1.02)] bg-background px-3 py-1.5">{bridgeModeSummary}</span>
                              <span className="rounded-[calc(var(--radius)*1.02)] bg-background px-3 py-1.5">{reviewReadinessLabel}</span>
                            </div>
                          </div>
                        </div>
                      </>
                    )}

                    <div className="surface-panel-muted px-4 py-3">
                      <div className="flex flex-col gap-3">
                        <div className={`grid gap-3 ${isWorkspaceFocusMode ? 'lg:grid-cols-[minmax(0,1fr)_minmax(12rem,0.85fr)]' : 'sm:grid-cols-2 xl:grid-cols-1'}`}>
                          <div data-testid="review-draft-status">
                            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{t('app.localDraft')}</div>
                            {hasDraftStatus ? (
                              <div className="mt-2 flex flex-wrap gap-2">
                                {workspaceDraftSavedAt && (
                                  <DraftStatusBadge
                                    label={t('app.workspace')}
                                    status={workspaceDraftStatusLabel}
                                    timestamp={workspaceDraftSavedAt}
                                  />
                                )}
                                {reviewDraftSavedAt && (
                                  <DraftStatusBadge
                                    label={t('app.reviewDecisionPanel')}
                                    status={reviewDraftStatusLabel}
                                    timestamp={reviewDraftSavedAt}
                                  />
                                )}
                              </div>
                            ) : (
                              <div className="mt-1 text-sm text-foreground/68">--</div>
                            )}
                          </div>
                          <div>
                            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{t('app.workspaceViews')}</div>
                            <div className="mt-1 text-sm font-semibold text-foreground">{activeWorkspaceTab.label}</div>
                            <div className="mt-1 text-xs text-foreground/68">{activeWorkspaceTab.meta}</div>
                            <div className="mt-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{t('app.reviewDecisionPanel')}</div>
                            <div className="mt-1 text-sm font-semibold text-foreground">
                              {activeInsightSummary?.label || t('app.reviewDecisionPanel')}
                            </div>
                            <div className="mt-1 text-xs text-foreground/68">
                              {activeInsightSummary?.meta || reviewReadinessLabel}
                            </div>
                          </div>
                        </div>

                        <div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-border/55 pt-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              onClick={handleOpenGlobalEditorFromToolbar}
                              data-testid="top-toolbar-open-global-editor-shortcut"
                              className="editorial-button-secondary px-3 py-2 text-xs font-medium"
                            >
                              <Edit2 size={14} />
                              <span>{t('app.openGlobalEditor')}</span>
                            </button>
                            {skillDocument && (
                              <button
                                type="button"
                                onClick={() => setEditorConfig({ type: 'skillDocument', payload: skillDocument })}
                                data-testid="top-toolbar-open-structured-editor-shortcut"
                                className="editorial-button-secondary px-3 py-2 text-xs font-medium"
                              >
                                <Edit2 size={14} />
                                <span>{t('app.openStructuredEditor')}</span>
                              </button>
                            )}
                            {skillDocument && (
                              <button
                                type="button"
                                onClick={() => setEditorConfig({ type: 'json', payload: skillDocument })}
                                data-testid="top-toolbar-open-json-editor-shortcut"
                                className="editorial-button-secondary px-3 py-2 text-xs font-medium"
                              >
                                <FileCode2 size={14} />
                                <span>{t('app.openJsonEditor')}</span>
                              </button>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                          <div className="relative">
                            <button
                              type="button"
                              onClick={() => setShowActions((current) => !current)}
                              data-testid="top-toolbar-actions-trigger"
                              className={`flex items-center gap-2 px-3 py-2 text-sm rounded-[calc(var(--radius)*1.02)] transition-colors ${showActions ? 'bg-muted text-foreground' : 'text-muted-foreground hover:bg-card'}`}
                            >
                              <span>{t('app.actionsTray')}</span>
                              {showActions ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                            </button>

                            <AnimatePresence>
                              {showActions && (
                                <motion.div
                                  data-testid="top-toolbar-actions-menu"
                                  initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.98, y: 10 }}
                                  animate={{ opacity: 1, scale: 1, y: 0 }}
                                  exit={prefersReducedMotion ? { opacity: 1, scale: 1, y: 0 } : { opacity: 0, scale: 0.98, y: 10 }}
                                  transition={surfaceTransition}
                                  className="absolute right-0 top-full z-50 mt-2 max-h-[min(32rem,calc(100vh-7rem))] w-64 overflow-y-auto rounded-xl border border-border bg-card p-2 shadow-xl"
                                >
                                  <div className="grid gap-2 px-4 pb-4">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setShowActions(false);
                                        exportSkill();
                                      }}
                                      disabled={!canExportArtifacts}
                                      className="editorial-action-button px-3 py-2 text-sm text-foreground disabled:cursor-not-allowed disabled:opacity-55"
                                    >
                                      <span>{t('app.export')}</span>
                                      <Download size={14} className="text-muted-foreground" />
                                    </button>
                                    {skillDocument && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setShowActions(false);
                                          exportSkillJson();
                                        }}
                                        disabled={!canExportArtifacts}
                                        className="editorial-action-button px-3 py-2 text-sm text-foreground disabled:cursor-not-allowed disabled:opacity-55"
                                      >
                                        <span>{t('app.exportJson')}</span>
                                        <Download size={14} className="text-muted-foreground" />
                                      </button>
                                    )}
                                    {skillDocument && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setShowActions(false);
                                          exportReviewReport();
                                        }}
                                        disabled={!canExportArtifacts}
                                        className="editorial-action-button px-3 py-2 text-sm text-foreground disabled:cursor-not-allowed disabled:opacity-55"
                                      >
                                        <span>{t('app.exportReviewReport')}</span>
                                        <Download size={14} className="text-muted-foreground" />
                                      </button>
                                    )}
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setShowActions(false);
                                        exportReviewPacket();
                                      }}
                                      disabled={!canExportArtifacts}
                                      data-testid="top-toolbar-export-review-packet"
                                      className="editorial-action-button px-3 py-2 text-sm text-foreground disabled:cursor-not-allowed disabled:opacity-55"
                                    >
                                      <span>{t('app.exportReviewPacket')}</span>
                                      <Download size={14} className="text-muted-foreground" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setShowActions(false);
                                        handleResetWorkspace();
                                      }}
                                      className="editorial-action-button px-3 py-2 text-sm text-foreground"
                                    >
                                      <span>{t('app.resetWorkspace')}</span>
                                      <RefreshCw size={14} className="text-muted-foreground" />
                                    </button>
                                    {modifiedPaths.size > 0 && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setShowActions(false);
                                          onUndo();
                                        }}
                                        className="inline-flex items-center justify-between rounded-[calc(var(--radius)*1.02)] bg-amber-500/12 px-3 py-2 text-sm text-amber-900 transition hover:bg-amber-500/18"
                                      >
                                        <span>{t('app.undo')}</span>
                                        <Undo2 size={14} />
                                      </button>
                                    )}
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex flex-col gap-3">
                {activeTab === 'pipeline' && (
                  <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex flex-wrap items-center gap-1" data-testid="pipeline-subview-nav">
                      {pipelineSubviews.map((view) => (
                        <button
                          key={view.id}
                          type="button"
                          onClick={() => setActivePipelineSubview(view.id)}
                          data-testid={`pipeline-subview-${view.id}`}
                          className={`rounded-[calc(var(--radius)*1.02)] px-3 py-1.5 text-xs transition-colors ${activePipelineSubview === view.id ? 'bg-muted text-foreground font-medium shadow-sm' : 'text-muted-foreground hover:bg-card'}`}
                        >
                          {view.label}
                        </button>
                      ))}
                    </div>
                    <div className="text-xs text-foreground/60">
                      {activePipelineSubviewMeta.label}: {activePipelineSubviewMeta.meta}
                    </div>
                  </div>
                )}

              </div>
            </div>
          </div>
        </header>

        <section className="review-stage-shell z-0 flex-1 overflow-y-auto px-4 py-2 pb-24 sm:px-6 sm:py-3 custom-scrollbar">
          <aside
            aria-label={t('app.blockingIssueInbox')}
            data-testid="persistent-review-rail"
            className="sticky top-0 z-10 mb-3 overflow-hidden rounded-[calc(var(--radius)*1.04)] border border-border/65 bg-background/95 shadow-sm backdrop-blur-md"
          >
            <div className="flex min-w-max items-stretch divide-x divide-border/55 overflow-x-auto sm:min-w-0">
              <div className="min-w-40 px-3 py-2.5">
                <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{t('app.reviewStatus')}</div>
                <div className="mt-1 text-sm font-semibold text-foreground">{t(reviewStatusLabelKey(reviewStatus))}</div>
              </div>
              <div className="min-w-32 px-3 py-2.5">
                <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{t('app.reviewChecklist')}</div>
                <div className="mt-1 text-sm font-semibold text-foreground">{checklistCompletedCount} {t('app.reviewChecklistDone')} · 4</div>
              </div>
              <div className="min-w-40 px-3 py-2.5">
                <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{t('app.handoffState')}</div>
                <div className="mt-1 text-sm font-semibold text-foreground">{handoffSummary}</div>
              </div>
              <div className="min-w-40 px-3 py-2.5">
                <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{t('app.exportReadiness')}</div>
                <div
                  aria-label={canExportArtifacts ? t('app.exportReady') : t('app.exportLocked')}
                  className={`mt-1 text-sm font-semibold ${canExportArtifacts ? 'text-emerald-800' : 'text-amber-800'}`}
                >
                  {canExportArtifacts ? '✓' : '—'}
                </div>
              </div>
              <div className="min-w-[19rem] flex-1 px-3 py-2.5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{t('app.blockingIssueInbox')}</div>
                    <div className="mt-1 text-xs text-muted-foreground">{t('app.blockingIssueInboxHint')}</div>
                  </div>
                  <span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${blockingIssueInbox.length > 0 ? 'bg-destructive/12 text-destructive' : 'bg-emerald-500/12 text-emerald-900'}`}>
                    {blockingIssueInbox.length}
                  </span>
                </div>
                {blockingIssueInbox.length > 0 ? (
                  <div className="mt-2 flex gap-2 overflow-x-auto pb-0.5" data-testid="blocking-issue-inbox">
                    {blockingIssueInbox.map((issue) => (
                      <div key={issue.id} className="min-w-64 rounded-[calc(var(--radius)*1.02)] bg-muted px-3 py-2 text-xs text-muted-foreground">
                        <div className="flex items-center justify-between gap-2">
                          <span aria-label={issue.title} className="font-semibold text-foreground">
                            {issue.source === 'schema' ? t('app.validationIssues') : t('app.consistencyIssues')}
                          </span>
                          <span className="rounded-full bg-destructive/12 px-2 py-0.5 text-[10px] font-semibold text-destructive">{issue.source}</span>
                        </div>
                        <p className="mt-1 line-clamp-2 leading-5">{issue.message}</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {issue.focusPath && (
                            <button type="button" onClick={() => openBlockingIssueInEditor(issue.focusPath)} className="text-[10px] font-semibold uppercase tracking-[0.14em] text-primary hover:underline">
                              {t('app.openBlockingIssueInEditor')}
                            </button>
                          )}
                          {issue.contextPath && (
                            <button type="button" onClick={() => openBlockingIssueContext(issue.contextPath)} className="text-[10px] font-semibold uppercase tracking-[0.14em] text-foreground/70 hover:text-foreground hover:underline">
                              {t('app.openIssueContext')}
                            </button>
                          )}
                          {issue.phaseId && (
                            <button type="button" onClick={() => openBlockingIssuePhase(issue.phaseId)} className="text-[10px] font-semibold uppercase tracking-[0.14em] text-foreground/70 hover:text-foreground hover:underline">
                              {t('app.openIssuePhase')}
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-2 text-xs text-emerald-900">{t('app.blockingIssueNone')}</p>
                )}
              </div>
            </div>
          </aside>
          <AnimatePresence mode="wait">
            {activeTab === 'pipeline' && (
              <motion.div
                key={`pipeline-${activePipelineSubview}`}
                initial={prefersReducedMotion ? false : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={prefersReducedMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: -10 }}
                transition={surfaceTransition}
                className="space-y-4 lg:space-y-5"
                data-testid={`pipeline-section-content-${activePipelineSubview}`}
                id="workspace-stage-pipeline"
                role="tabpanel"
                aria-labelledby="workspace-view-pipeline"
              >
                {activePipelineSubview === 'summary' && (
                  <Suspense fallback={<PanelFallback heightClassName="min-h-[220px]" />}>
                    <div className="review-main-surface glass-panel-strong overflow-hidden px-4 py-4 sm:px-5">
                      <Dashboard
                        data={data}
                        onNavigatePhase={(id) => {
                          setActiveTab('pipeline');
                          setIsWorkspaceFocusMode(false);
                          setActivePipelineSubview('derived');
                          setActivePhase(id);
                        }}
                        modifiedPaths={modifiedPaths}
                      />
                    </div>
                  </Suspense>
                )}

                {activePipelineSubview === 'analysis' && (
                  <div className="review-main-surface glass-panel-strong relative overflow-hidden px-4 py-4 sm:px-5">
                    <div className="grid gap-3 xl:grid-cols-[minmax(0,1.28fr)_minmax(17rem,0.72fr)]">
                      <div>
                        <p className="editorial-kicker">{t('app.analysisResult')}</p>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <span className="editorial-chip editorial-chip--truncate px-3 py-1 text-[11px] font-mono uppercase tracking-[0.24em] text-muted-foreground">
                            {t('app.project')}: {data.projectId}
                          </span>
                          <span className="editorial-chip editorial-chip--truncate px-3 py-1 text-[11px] text-muted-foreground">
                            {t('app.parserVersion')}: {data?.parserResult?.meta?.parser_version || '--'}
                          </span>
                          {parserManifest && (
                            <span className="editorial-chip editorial-chip--truncate px-3 py-1 text-[11px] text-muted-foreground">
                              {t('app.analysisLevel')}: {parserManifest.analysis_level}
                            </span>
                          )}
                        </div>
                        <div
                          className="mt-2 group flex w-fit cursor-pointer items-center gap-2"
                          onClick={() => setEditorConfig({ type: 'global', payload: data })}
                          title={t('editor.editGlobal')}
                        >
                          <h2 className={`display-serif text-[1.72rem] leading-[0.98] sm:text-[2.02rem] ${modifiedPaths.has('projectName') ? 'text-amber-600' : 'text-foreground'}`}>
                            {data.projectName}
                          </h2>
                          <Edit2 size={16} className="text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                        </div>
                        <p className="mt-1.5 max-w-3xl text-[0.88rem] leading-5 text-foreground/74">{bridgeReviewGuidance}</p>
                      </div>

                      <div data-testid="review-decision-panel" className="review-structural-panel surface-panel-muted px-4 py-3.5">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="editorial-kicker">{t('app.reviewDecisionPanel')}</p>
                            <p className="mt-1.5 text-sm leading-5 text-foreground/72">{t('app.reviewPacketHint')}</p>
                          </div>
                          <span className="editorial-chip px-3 py-1 text-[11px] font-medium text-foreground">
                            {reviewStatusLabel}
                          </span>
                        </div>
                        <div className="mt-3 grid gap-2 sm:grid-cols-2">
                          <MiniMetric label={t('app.reviewerName')} value={reviewerName.trim() || t('app.reviewerUnassigned')} highlight={Boolean(reviewerName.trim())} />
                          <MiniMetric label={t('app.validationEvidence')} value={validationStatusLabel} highlight={!validationHasErrors} />
                          <MiniMetric label={t('app.handoffState')} value={handoffSummary} highlight={effectiveHandoffState === 'approved_for_export'} />
                          <MiniMetric label={t('app.reviewProfile')} value={reviewProfileSummary} highlight />
                        </div>
                      </div>
                    </div>

                    <div data-testid="review-truth-banner" className={`truth-strip mt-3 ${bridgeToneClass}`}>
                      <AlertTriangle size={14} className="shrink-0" />
                      <span className="truth-strip__tag">{bridgeModeSummary}</span>
                      <span className="truth-strip__divider" />
                      <span className="truth-strip__tag">{reviewReadinessLabel}</span>
                      <span className="truth-strip__divider" />
                      <span className="truth-strip__tag">{reviewEquivalenceLabel}</span>
                      <span className="truth-strip__divider" />
                      <span className="truth-strip__tag">{handoffSummary}</span>
                      {activeBridgeDraftOnly && (
                        <>
                          <span className="truth-strip__divider" />
                          <span className="truth-strip__tag truth-strip__tag--wrap text-amber-800">{t('app.bridgeDraftOnlyWarning')}</span>
                        </>
                      )}
                    </div>

                    {visibleModifiedPaths.length > 0 && (
                      <div data-testid="edit-verification-strip" className="review-structural-panel mt-2.5 flex flex-col gap-2.5 rounded-[calc(var(--radius)*1.02)] border border-amber-500/18 bg-amber-500/8 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
                        <div className="min-w-0">
                          <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-900/80">{t('app.editVerification')}</div>
                          <div className="mt-1 text-sm font-medium text-amber-950">{t('app.editVerificationSummary', { count: visibleModifiedPaths.length })}</div>
                          <div className="mt-1.5 flex flex-wrap gap-1.5">
                            {visibleModifiedPaths.slice(0, 4).map((path) => (
                              <span key={path} className="rounded-[calc(var(--radius)*1.02)] bg-background/90 px-2.5 py-1 text-[11px] text-foreground/78">
                                {path}
                              </span>
                            ))}
                            {visibleModifiedPaths.length > 4 && (
                              <span className="rounded-[calc(var(--radius)*1.02)] bg-background/90 px-2.5 py-1 text-[11px] text-foreground/78">
                                +{visibleModifiedPaths.length - 4}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-[calc(var(--radius)*1.02)] bg-background/90 px-3 py-1.5 text-xs text-foreground/72">
                            {diffSummary ? `${diffSummary.stats.fieldsChanged} ${t('app.diffEntries')}` : t('app.editVerificationPending')}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setActiveBottomTab('review');
                              setActiveReviewSub('diff');
                            }}
                            className="editorial-button-secondary px-3 py-2 text-xs font-medium"
                          >
                            {t('app.compareChanges')}
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="mt-3 grid gap-2 sm:grid-cols-3 xl:grid-cols-6">
                      <StatPill label={t('app.totalActions')} value={String(parserActions.length)} />
                      <StatPill label={t('app.totalRules')} value={String(parserRules.length)} />
                      <StatPill label={t('app.totalDirectives')} value={String(parserDirectives.length)} accent={parserDirectives.length > 8 ? 'warn' : 'default'} />
                      <StatPill label={t('app.supportingFiles')} value={String(parserSupportingFiles.length)} />
                      <StatPill label={t('app.commandReferences')} value={String(parserCommandReferences.length)} accent={parserCommandReferences.length > 0 ? 'warn' : 'default'} />
                      <StatPill label={t('app.analysisFindings')} value={String(parserAnalysisFindings.length)} accent={parserAnalysisFindings.length > 0 ? 'danger' : 'default'} />
                    </div>
                  </div>
                )}

                {activePipelineSubview === 'decomposition' && (
                  <Suspense fallback={<PanelFallback heightClassName="min-h-[240px]" />}>
                    <section className="review-structural-panel glass-panel overflow-hidden p-4 sm:p-4">
                      <div className="mb-3 flex flex-col gap-1.5 lg:flex-row lg:items-end lg:justify-between">
                        <div>
                        <p className="editorial-kicker">{t('app.standardDecomposition')}</p>
                          <p className="mt-1 max-w-3xl text-sm leading-5 text-foreground/72">{t('app.standardDecompositionHint')}</p>
                        </div>
                        <span className="editorial-chip w-fit px-3 py-1 text-[11px] text-muted-foreground">
                          {parserActions.length} {t('app.totalActions')}
                        </span>
                      </div>
                      <div className="max-h-[72vh] overflow-y-auto custom-scrollbar rounded-[calc(var(--radius)*1.05)] border border-border/40 bg-card/20 pb-3">
                        <DecompositionBoard
                          parserResult={data.parserResult}
                          supportFiles={supportFiles}
                          selectedContextPath={selectedContextPath}
                          onSelectContext={onSelectContextPath}
                        />
                      </div>
                    </section>
                  </Suspense>
                )}

                {activePipelineSubview === 'pipeline' && (
                  <StandardPipelineView
                    bridgeModeSummary={bridgeModeSummary}
                    handoffSummary={handoffSummary}
                    reviewReadinessLabel={reviewReadinessLabel}
                    reviewStatusLabel={reviewStatusLabel}
                  />
                )}

                {activePipelineSubview === 'derived' && (
                  <section id="derived-workflow-panel" className="space-y-4">
                    <div className="review-main-surface glass-panel-strong overflow-hidden px-4 py-4 sm:px-5">
                      <div className="flex flex-col gap-1.5 lg:flex-row lg:items-end lg:justify-between">
                        <div>
                          <p className="editorial-kicker">{t('app.derivedWorkflow')}</p>
                          <p className="mt-1 max-w-3xl text-sm leading-5 text-foreground/72">{t('app.derivedWorkflowHint')}</p>
                        </div>
                        <span className="editorial-chip w-fit px-3 py-1 text-[11px] text-muted-foreground">
                          {data.phases.length} {t('app.phaseStep')}
                        </span>
                      </div>

                      <div className="mt-3">
                        <FlowStepper
                          phases={data.phases}
                          activePhase={activePhase}
                          compact
                          onSelectPhase={(id) => { setActiveTab('pipeline'); setActivePhase(id); }}
                        />
                      </div>
                    </div>

                    <div className="grid gap-4 xl:grid-cols-[minmax(17rem,20rem)_minmax(0,1fr)]">
                      <div className="review-structural-panel glass-panel px-3 py-3.5 sm:px-4 xl:min-h-[360px] xl:max-h-[44vh] flex flex-col">
                        <div className="flex items-center justify-between px-3 pb-2">
                          <div>
                            <p className="editorial-kicker">{t('flowchart.pipeline')}</p>
                            <h3 className="mt-1.5 text-base font-semibold tracking-tight text-foreground">{t('app.flowSequence')}</h3>
                          </div>
                          <span className="editorial-chip px-2.5 py-1 text-[11px] font-mono text-muted-foreground">
                            {activePhase ?? '--'}
                          </span>
                        </div>
                        <div className="custom-scrollbar pr-1 flex-1 overflow-y-auto">
                          <Flowchart phases={data.phases} activePhase={activePhase} onSelectPhase={setActivePhase} />
                        </div>
                      </div>

                      <div className="xl:min-h-[360px] xl:max-h-[44vh] flex flex-col">
                        {activePhaseData ? (
                          <Suspense fallback={<PanelFallback heightClassName="xl:min-h-[400px]" />}>
                            <PhaseDetails
                              phase={activePhaseData}
                              allPhases={data.phases}
                              onNavigatePhase={setActivePhase}
                              onClose={() => setActivePhase(null)}
                              onEditPhase={(phaseData) => setEditorConfig({ type: 'phase', payload: phaseData, phaseId: phaseData.id })}
                              onEditDecision={(node) => setEditorConfig({ type: 'decision', payload: node, phaseId: activePhaseData.id })}
                              modifiedPaths={modifiedPaths}
                              evidence={{
                                bridgeMode: activeBridgeMode,
                                parserFindingCount: parserAnalysisFindings.length,
                                supportingFileCount: supportFiles.length,
                                latestValidationRun,
                                latestConsistencyRun,
                                latestPathTestRun,
                              }}
                              onOpenChecks={() => {
                                setActiveBottomTab('checks');
                                setActiveChecksSub('tests');
                              }}
                              onOpenSupportingFiles={() => {
                                setActiveBottomTab('context');
                                setActiveContextSub('files');
                              }}
                            />
                          </Suspense>
                        ) : (
                          <div className="review-structural-panel glass-panel flex-1 flex items-center justify-center p-8 text-center xl:min-h-[360px]">
                            <div className="max-w-sm space-y-3">
                              <p className="editorial-kicker">{t('app.detailsPanel')}</p>
                              <h3 className="text-xl font-semibold tracking-tight text-foreground">{t('app.noActivePhase')}</h3>
                              <p className="text-sm leading-5 text-foreground/70">{t('app.selectPhaseHint')}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </section>
                )}
              </motion.div>
            )}

            {activeTab === 'vector' && (
              <motion.div
                key="vector"
                initial={prefersReducedMotion ? false : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={prefersReducedMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: -10 }}
                transition={surfaceTransition}
                id="workspace-stage-vector"
                role="tabpanel"
                aria-labelledby="workspace-view-vector"
              >
                <div className="review-structural-panel glass-panel overflow-hidden p-3 sm:p-4">
                  <Suspense fallback={<PanelFallback heightClassName="min-h-[420px]" />}>
                    <VectorSpace data={data} darkMode={darkMode} />
                  </Suspense>
                </div>
              </motion.div>
            )}

            {activeTab === 'matrix' && (
              <motion.div
                key="matrix"
                initial={prefersReducedMotion ? false : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={prefersReducedMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: -10 }}
                transition={surfaceTransition}
                id="workspace-stage-matrix"
                role="tabpanel"
                aria-labelledby="workspace-view-matrix"
              >
                <div className="review-structural-panel glass-panel overflow-hidden p-3 sm:p-4">
                  <Suspense fallback={<PanelFallback heightClassName="min-h-[420px]" />}>
                    <SecurityMatrix data={data} />
                  </Suspense>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* Bottom Toolbar & Drawer */}
        <div className="fixed bottom-0 left-0 right-0 z-40 flex flex-col items-center pointer-events-none">
          {/* Overlay Drawer */}
          <AnimatePresence>
            {activeBottomTab && (
              <motion.div
                initial={prefersReducedMotion ? false : { y: '100%', opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={prefersReducedMotion ? { y: 0, opacity: 1 } : { y: '100%', opacity: 0 }}
                transition={drawerTransition}
                id="review-insight-drawer"
                role="region"
                aria-labelledby="review-insight-drawer-title"
                className="review-bottom-drawer w-full max-w-[1980px] pointer-events-auto bg-card border-t border-border shadow-2xl rounded-t-3xl max-h-[55vh] flex flex-col"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-3 border-b border-border/50">
                  <div className="flex flex-wrap items-center gap-4">
                    <h3 id="review-insight-drawer-title" className="font-semibold text-lg text-foreground whitespace-nowrap">
                      {insightTabs.find(t => t.id === activeBottomTab)?.label}
                    </h3>

                    {activeBottomTab === 'review' && (
                      <div aria-label={t('app.reviewDecisionPanel')} className="flex bg-muted/50 rounded-full p-1 border border-border/50 overflow-x-auto hide-scrollbar">
                        <button id="review-subtab-decision" aria-pressed={activeReviewSub === 'decision'} aria-controls="drawer-view-review-decision" data-testid="review-subtab-decision" onClick={() => setActiveReviewSub('decision')} className={`drawer-subtab-button px-4 py-1.5 rounded-full text-xs font-medium whitespace-nowrap ${activeReviewSub === 'decision' ? 'drawer-subtab-button--active' : ''}`}>{t('app.reviewDecision')}</button>
                        <button id="review-subtab-notes" aria-pressed={activeReviewSub === 'notes'} aria-controls="drawer-view-review-notes" data-testid="review-subtab-notes" onClick={() => setActiveReviewSub('notes')} className={`drawer-subtab-button px-4 py-1.5 rounded-full text-xs font-medium whitespace-nowrap ${activeReviewSub === 'notes' ? 'drawer-subtab-button--active' : ''}`}>{t('app.reviewNotes')}</button>
                        <button id="review-subtab-diff" aria-pressed={activeReviewSub === 'diff'} aria-controls="drawer-view-review-diff" data-testid="review-subtab-diff" onClick={() => setActiveReviewSub('diff')} className={`drawer-subtab-button px-4 py-1.5 rounded-full text-xs font-medium whitespace-nowrap ${activeReviewSub === 'diff' ? 'drawer-subtab-button--active' : ''}`}>{t('app.diffSummary')}</button>
                      </div>
                    )}

                    {activeBottomTab === 'checks' && (
                      <div aria-label={t('app.detailsPanel')} className="flex bg-muted/50 rounded-full p-1 border border-border/50 flex-wrap sm:flex-nowrap overflow-x-auto hide-scrollbar">
                        <button id="checks-subtab-posture" aria-pressed={activeChecksSub === 'posture'} aria-controls="drawer-view-checks-posture" data-testid="checks-subtab-posture" onClick={() => setActiveChecksSub('posture')} className={`drawer-subtab-button px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap ${activeChecksSub === 'posture' ? 'drawer-subtab-button--active' : ''}`}>{t('app.checksPosture')}</button>
                        <button id="checks-subtab-schema" aria-pressed={activeChecksSub === 'schema'} aria-controls="drawer-view-checks-schema" data-testid="checks-subtab-schema" onClick={() => setActiveChecksSub('schema')} className={`drawer-subtab-button px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap ${activeChecksSub === 'schema' ? 'drawer-subtab-button--active' : ''}`}>{t('app.schemaValidation')}</button>
                        <button id="checks-subtab-consistency" aria-pressed={activeChecksSub === 'consistency'} aria-controls="drawer-view-checks-consistency" data-testid="checks-subtab-consistency" onClick={() => setActiveChecksSub('consistency')} className={`drawer-subtab-button px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap ${activeChecksSub === 'consistency' ? 'drawer-subtab-button--active' : ''}`}>{t('app.consistencyChecks')}</button>
                        <button id="checks-subtab-tests" aria-pressed={activeChecksSub === 'tests'} aria-controls="drawer-view-checks-tests" data-testid="checks-subtab-tests" onClick={() => setActiveChecksSub('tests')} className={`drawer-subtab-button px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap ${activeChecksSub === 'tests' ? 'drawer-subtab-button--active' : ''}`}>{t('app.reviewerTests')}</button>
                        <button id="checks-subtab-evidence" aria-pressed={activeChecksSub === 'evidence'} aria-controls="drawer-view-checks-evidence" data-testid="checks-subtab-evidence" onClick={() => setActiveChecksSub('evidence')} className={`drawer-subtab-button px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap ${activeChecksSub === 'evidence' ? 'drawer-subtab-button--active' : ''}`}>{t('app.validationEvidence')}</button>
                      </div>
                    )}

                    {activeBottomTab === 'context' && (
                      <div aria-label={t('app.projectSummary')} className="flex bg-muted/50 rounded-full p-1 border border-border/50 flex-wrap sm:flex-nowrap overflow-x-auto hide-scrollbar">
                        <button id="context-subtab-summary" aria-pressed={activeContextSub === 'summary'} aria-controls="drawer-view-context-summary" data-testid="context-subtab-summary" onClick={() => setActiveContextSub('summary')} className={`drawer-subtab-button px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap ${activeContextSub === 'summary' ? 'drawer-subtab-button--active' : ''}`}>{t('app.projectSummary')}</button>
                        <button id="context-subtab-policy" aria-pressed={activeContextSub === 'policy'} aria-controls="drawer-view-context-policy" data-testid="context-subtab-policy" onClick={() => setActiveContextSub('policy')} className={`drawer-subtab-button px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap ${activeContextSub === 'policy' ? 'drawer-subtab-button--active' : ''}`}>{t('app.commandReferences')}</button>
                        <button id="context-subtab-files" aria-pressed={activeContextSub === 'files'} aria-controls="drawer-view-context-files" data-testid="context-subtab-files" onClick={() => setActiveContextSub('files')} className={`drawer-subtab-button px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap ${activeContextSub === 'files' ? 'drawer-subtab-button--active' : ''}`}>{t('app.supportingFiles')}</button>
                        <button id="context-subtab-analysis" aria-pressed={activeContextSub === 'analysis'} aria-controls="drawer-view-context-analysis" data-testid="context-subtab-analysis" onClick={() => setActiveContextSub('analysis')} className={`drawer-subtab-button px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap ${activeContextSub === 'analysis' ? 'drawer-subtab-button--active' : ''}`}>{t('app.analysisResult')}</button>
                        <button id="context-subtab-source" aria-pressed={activeContextSub === 'source'} aria-controls="drawer-view-context-source" data-testid="context-subtab-source" onClick={() => setActiveContextSub('source')} className={`drawer-subtab-button px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap ${activeContextSub === 'source' ? 'drawer-subtab-button--active' : ''}`}>{t('app.contextBucketSourceProvenance')}</button>
                        <button id="context-subtab-links" aria-pressed={activeContextSub === 'links'} aria-controls="drawer-view-context-links" data-testid="context-subtab-links" onClick={() => setActiveContextSub('links')} className={`drawer-subtab-button px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap ${activeContextSub === 'links' ? 'drawer-subtab-button--active' : ''}`}>{t('app.sourceLinks')}</button>
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveBottomTab(null)}
                    aria-label={t('app.close')}
                    className="p-2 rounded-full hover:bg-muted text-muted-foreground transition-colors shrink-0"
                  >
                    <ChevronDown size={20} />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto p-4 sm:p-5 custom-scrollbar">
                  <div className="max-w-7xl mx-auto">
                    <AnimatePresence mode="wait" initial={false}>
                      <motion.div
                        key={drawerSubviewKey}
                        id={`drawer-view-${drawerSubviewKey}`}
                        role="region"
                        aria-labelledby="review-insight-drawer-title"
                        data-testid={`drawer-view-${drawerSubviewKey}`}
                        initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={prefersReducedMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}
                        transition={surfaceTransition}
                      >
                    {activeBottomTab === 'review' && (
              <>
                {activeReviewSub === 'decision' && (
                  <InsightBlock
                    kicker={t('app.reviewDecision')}
                  title={t('app.workflowCheckpoint')}
                  summary={handoffSummary}
                  accent={effectiveHandoffState === 'approved_for_export' ? 'emerald' : effectiveHandoffState === 'needs_changes' ? 'rose' : 'default'}
                  defaultOpen
                >
                  <div className="space-y-3">
                    <div className="grid gap-2 sm:grid-cols-2">
                      <MiniMetric label={t('app.reviewStatus')} value={t(reviewStatusLabelKey(reviewStatus))} highlight={reviewStatus !== 'draft'} />
                      <MiniMetric label={t('app.handoffState')} value={handoffSummary} highlight={effectiveHandoffState === 'approved_for_export'} />
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <MiniMetric label={t('app.reviewProfile')} value={reviewProfileSummary} highlight />
                      <MiniMetric label={t('app.reviewDecisionLog')} value={`${decisionLog.length} ${t('app.decisionCount')}`} highlight={decisionLog.length > 0} />
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <MiniMetric label={t('app.reviewChecklist')} value={`${checklistCompletedCount}/4`} highlight={checklistCompletedCount === 4} />
                      <MiniMetric
                        label={t('app.reviewerSignoffLabel')}
                        value={reviewerSignoff || t('app.reviewerSignoffPending')}
                        highlight={Boolean(reviewerSignoff)}
                      />
                    </div>
                    <div className="rounded-[calc(var(--radius)*1.02)] bg-muted px-3 py-3 text-sm leading-6 text-muted-foreground">
                      <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{t('app.nextAction')}</div>
                      <p className="mt-2 font-medium text-foreground">{nextActionLabel}</p>
                      <p className="mt-1 text-sm leading-6 text-foreground/72">{handoffGuidance}</p>
                    </div>
                    <div className="space-y-2">
                      <div className="grid gap-2 sm:grid-cols-2">
                        <div className="space-y-1">
                          <label htmlFor="review-profile-input" className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                            {t('app.reviewProfile')}
                          </label>
                          <select
                            id="review-profile-input"
                            value={reviewProfile}
                            onChange={(event) => updateReviewProfile(event.target.value as ReviewProfile)}
                            className="editorial-field w-full px-3 py-3 text-sm text-foreground outline-none"
                          >
                            <option value="mode_verification">{t('app.reviewProfileModeVerification')}</option>
                            <option value="bundle_evidence_review">{t('app.reviewProfileBundleEvidenceReview')}</option>
                            <option value="publish_gate_review">{t('app.reviewProfilePublishGateReview')}</option>
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label htmlFor="handoff-state-input" className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                            {t('app.handoffState')}
                          </label>
                          <select
                            id="handoff-state-input"
                            value={effectiveHandoffState}
                            onChange={(event) => updateHandoffState(event.target.value as HandoffState)}
                            className="editorial-field w-full px-3 py-3 text-sm text-foreground outline-none"
                          >
                            {allowedHandoffStates.map((state) => (
                              <option key={state} value={state}>
                                {t(handoffStateLabelKey(state))}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label htmlFor="reviewer-name-input" className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                          {t('app.reviewerName')}
                        </label>
                        <input
                          id="reviewer-name-input"
                          type="text"
                          value={reviewerName}
                          onChange={(event) => setReviewerName(event.target.value)}
                          placeholder={t('app.reviewerNamePlaceholder')}
                          className="editorial-field w-full px-3 py-3 text-sm text-foreground outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <label htmlFor="reviewer-notes-input" className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                          {t('app.reviewNotes')}
                        </label>
                        <textarea
                          id="reviewer-notes-input"
                          value={reviewerNotes}
                          onChange={(event) => setReviewerNotes(event.target.value)}
                          className="editorial-field min-h-20 w-full resize-none px-3 py-3 text-sm leading-6 text-foreground outline-none"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <textarea
                        value={reviewSummaryDraft}
                        onChange={(event) => setReviewSummaryDraft(event.target.value)}
                        placeholder={t('app.reviewSummaryPlaceholder')}
                        className="editorial-field min-h-24 w-full resize-none px-3 py-3 text-sm leading-6 text-foreground outline-none"
                      />
                      <input
                        type="text"
                        value={reviewerSignoff}
                        onChange={(event) => setReviewerSignoff(event.target.value)}
                        placeholder={t('app.reviewerSignoffPlaceholder')}
                        className="editorial-field w-full px-3 py-3 text-sm text-foreground outline-none"
                      />
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <ChecklistToggle
                        label={t('app.reviewChecklistModeConfirmed')}
                        checked={reviewChecklist.modeConfirmed}
                        onToggle={() => toggleReviewChecklist('modeConfirmed')}
                      />
                      <ChecklistToggle
                        label={t('app.reviewChecklistValidationReviewed')}
                        checked={reviewChecklist.validationReviewed}
                        onToggle={() => toggleReviewChecklist('validationReviewed')}
                      />
                      <ChecklistToggle
                        label={t('app.reviewChecklistDiffReviewed')}
                        checked={reviewChecklist.diffReviewed}
                        onToggle={() => toggleReviewChecklist('diffReviewed')}
                      />
                      <ChecklistToggle
                        label={t('app.reviewChecklistEvidenceReady')}
                        checked={reviewChecklist.evidenceReady}
                        onToggle={() => toggleReviewChecklist('evidenceReady')}
                      />
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <button
                        type="button"
                        onClick={() => updateReviewStatus('draft')}
                        className="editorial-choice-button px-3 py-3 text-left text-sm"
                      >
                        {t('app.returnToDraft')}
                      </button>
                      <button
                        type="button"
                        onClick={() => updateReviewStatus('in_review')}
                        className="editorial-choice-button px-3 py-3 text-left text-sm"
                      >
                        {t('app.markInReview')}
                      </button>
                      <button
                        type="button"
                        onClick={() => updateReviewStatus('approved')}
                        className="editorial-choice-button px-3 py-3 text-left text-sm"
                      >
                        {t('app.markApproved')}
                      </button>
                      <button
                        type="button"
                        onClick={() => updateReviewStatus('changes_requested')}
                        className="editorial-choice-button px-3 py-3 text-left text-sm"
                      >
                        {t('app.requestChanges')}
                      </button>
                    </div>
                    <div className={`rounded-[calc(var(--radius)*1.02)] px-3 py-3 text-sm leading-6 ${
                      canExportArtifacts
                        ? 'bg-emerald-500/12 text-emerald-950 export-ready-glow'
                        : 'bg-amber-500/12 text-amber-950'
                    }`}>
                      <div className="text-[10px] font-semibold uppercase tracking-[0.18em]">{t('app.exportReadiness')}</div>
                      <p className="mt-2 font-medium">
                        {canExportArtifacts ? t('app.exportReady') : t('app.exportLocked')}
                      </p>
                      {!canExportArtifacts && exportBlockedReasons.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {exportBlockedReasons.map((reason) => (
                            <p key={reason}>- {reason}</p>
                          ))}
                        </div>
                      )}
                    </div>
                    {decisionLog.length > 0 ? (
                      <div className="space-y-2">
                        {decisionLog.map((decision) => (
                          <div key={decision.id}>
                            <DecisionCard
                              action={decision.action}
                              summary={decision.summary}
                              timestamp={decision.timestamp}
                            />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-[calc(var(--radius)*1.02)] bg-muted px-4 py-3 text-sm leading-6 text-muted-foreground">
                        {t('app.reviewDecisionLogEmpty')}
                      </div>
                    )}
                  </div>
                </InsightBlock>
                )}

                {activeReviewSub === 'notes' && (
                  <InsightBlock
                    kicker={t('app.reviewNotes')}
                  title={t('app.reviewerNotes')}
                  summary={globalNotes.length + elementNotes.length > 0 ? `${globalNotes.length + elementNotes.length} ${t('app.notesCount')}` : t('app.reviewerNotesIdleShort')}
                  defaultOpen
                >
                  <div className="space-y-3">
                    <select
                      value={noteTarget}
                      onChange={(event) => setNoteTarget(event.target.value)}
                      className="editorial-field w-full px-3 py-3 text-sm text-foreground outline-none"
                    >
                      {noteTargets.map((target) => (
                        <option key={target.value} value={target.value}>
                          {target.label}
                        </option>
                      ))}
                    </select>
                    <textarea
                      value={noteDraft}
                      onChange={(event) => setNoteDraft(event.target.value)}
                      placeholder={t('app.reviewerNotesPlaceholder')}
                      className="editorial-field min-h-28 w-full resize-none px-3 py-3 text-sm leading-6 text-foreground outline-none"
                    />
                    <button
                      type="button"
                      onClick={addReviewNote}
                      disabled={!noteDraft.trim()}
                      className="editorial-button-primary w-full px-4 py-3 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-55"
                    >
                      {t('app.addReviewerNote')}
                    </button>

                    {globalNotes.length > 0 || elementNotes.length > 0 ? (
                      <div className="space-y-2">
                        {globalNotes.map((note) => (
                          <div key={note.id}>
                            <NoteCard
                              label={t('app.noteTargetGlobal')}
                              timestamp={note.createdAt}
                              content={note.content}
                            />
                          </div>
                        ))}
                        {elementNotes.map((note) => (
                          <div key={note.id}>
                            <NoteCard
                              label={`${t(`app.noteTarget${capitalizeNoteType(note.elementType)}`)} · ${note.elementId}`}
                              timestamp={note.createdAt}
                              content={note.content}
                            />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-[calc(var(--radius)*1.02)] bg-muted px-4 py-3 text-sm leading-6 text-muted-foreground">
                        {t('app.reviewerNotesIdle')}
                      </div>
                    )}
                  </div>
                </InsightBlock>
                )}

                {activeReviewSub === 'diff' && (
                  <InsightBlock
                    kicker={t('app.analysisResult')}
                  title={t('app.diffSummary')}
                  summary={diffSummary ? summarizeDiffSummary(t, diffSummary) : t('app.diffSummaryUnavailable')}
                  defaultOpen
                >
                  {diffSummary ? (
                    <div className="space-y-3">
                      <div className="grid gap-2 sm:grid-cols-2">
                        <MiniMetric label={t('app.diffAdded')} value={String(diffSummary.added.length)} highlight={diffSummary.added.length > 0} />
                        <MiniMetric label={t('app.diffRemoved')} value={String(diffSummary.removed.length)} highlight={diffSummary.removed.length > 0} />
                        <MiniMetric label={t('app.diffChanged')} value={String(diffSummary.changed.length)} highlight={diffSummary.changed.length > 0} />
                        <MiniMetric label={t('app.diffFieldsChanged')} value={String(diffSummary.stats.fieldsChanged)} highlight={diffSummary.stats.fieldsChanged > 0} />
                      </div>
                      <DiffList title={t('app.diffAdded')} items={diffSummary.added} emptyLabel={t('app.diffNone')} />
                      <DiffList title={t('app.diffRemoved')} items={diffSummary.removed} emptyLabel={t('app.diffNone')} />
                      <DiffList title={t('app.diffChanged')} items={diffSummary.changed} emptyLabel={t('app.diffNone')} />
                    </div>
                  ) : (
                    <div className="rounded-[calc(var(--radius)*1.02)] bg-muted px-4 py-3 text-sm leading-6 text-muted-foreground">
                      {t('app.diffSummaryUnavailable')}
                    </div>
                  )}
                </InsightBlock>
                )}
              </>
            )}

            {activeBottomTab === 'checks' && (
              <>
                {activeChecksSub === 'posture' && (
                  <InsightBlock
                    kicker={t('app.checksPosture')}
                  title={t('app.checksPosture')}
                  summary={hasBlockingChecks ? t('app.checksBlocked') : hasAttentionChecks ? t('app.checksAttention') : t('app.checksClean')}
                  accent={hasBlockingChecks ? 'rose' : hasAttentionChecks ? 'default' : 'emerald'}
                  defaultOpen
                >
                  <div className="grid gap-2 sm:grid-cols-2">
                    <MiniMetric label={t('app.handoffState')} value={handoffSummary} highlight={effectiveHandoffState === 'approved_for_export'} />
                    <MiniMetric label={t('app.exportReadiness')} value={canExportArtifacts ? t('app.exportReady') : t('app.exportLocked')} highlight={canExportArtifacts} />
                    <MiniMetric label={t('app.validationErrors')} value={String(validationErrors.length + consistencyErrors.length)} highlight={hasBlockingChecks} />
                    <MiniMetric label={t('app.validationWarnings')} value={String(validationWarnings.length + consistencyWarnings.length)} highlight={hasAttentionChecks} />
                  </div>
                </InsightBlock>
                )}

                {activeChecksSub === 'schema' && (
                  <InsightBlock
                    kicker={t('app.schemaValidation')}
                  title={t('app.schemaValidation')}
                  summary={validationResult
                    ? validationErrors.length > 0
                      ? `${t('app.validationInvalid')} · ${validationErrors.length} ${t('app.validationErrors')}`
                      : validationWarnings.length > 0
                        ? `${t('app.validationValid')} · ${validationWarnings.length} ${t('app.validationWarnings')}`
                        : t('app.validationValid')
                    : t('app.validationUnavailable')}
                  accent={validationErrors.length > 0 ? 'rose' : validationWarnings.length > 0 ? 'default' : 'emerald'}
                  defaultOpen
                >
                  {validationResult ? (
                    <div className="space-y-3">
                      <div className="grid gap-2">
                        <MiniMetric label={t('app.validationStatus')} value={validationResult.valid ? t('app.validationValid') : t('app.validationInvalid')} />
                        <MiniMetric label={t('app.validationSchema')} value={validationResult.schemaLabel} />
                        <MiniMetric label={t('app.validationErrors')} value={String(validationErrors.length)} highlight={validationErrors.length > 0} />
                        <MiniMetric label={t('app.validationWarnings')} value={String(validationWarnings.length)} highlight={validationWarnings.length > 0} />
                      </div>
                      {validationIssues.length > 0 ? (
                        <div className="space-y-2">
                          {validationIssues.slice(0, 5).map((issue) => {
                            const focusPath = resolveValidationIssueFieldPath(issue);
                            return (
                              <div key={`${issue.code}-${issue.path}`} className="rounded-[calc(var(--radius)*1.02)] bg-muted px-4 py-3 text-sm leading-6 text-muted-foreground">
                                <div className="flex items-center justify-between gap-3">
                                  <span className="font-medium text-foreground">{issue.code}</span>
                                  <span className={`rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${
                                    issue.severity === 'error'
                                      ? 'bg-destructive/12 text-destructive'
                                      : 'bg-amber-500/12 text-amber-800'
                                  }`}>
                                    {issue.severity}
                                  </span>
                                </div>
                                <p className="mt-2 text-xs font-mono text-muted-foreground">{issue.path}</p>
                                <p className="mt-2">{issue.message}</p>
                                {focusPath && (
                                  <button
                                    type="button"
                                    onClick={() => openSkillDocumentEditor(focusPath)}
                                    className="mt-3 inline-flex items-center rounded-[calc(var(--radius)*1.02)] bg-background px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground transition hover:text-foreground"
                                  >
                                    {t('app.openIssueInEditor')}
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="rounded-[calc(var(--radius)*1.02)] bg-emerald-500/12 px-4 py-3 text-sm leading-6 text-emerald-950">
                          {t('app.validationNoIssues')}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="rounded-[calc(var(--radius)*1.02)] bg-muted px-4 py-3 text-sm leading-6 text-muted-foreground">
                      {t('app.validationUnavailable')}
                    </div>
                  )}
                </InsightBlock>
                )}

                {activeChecksSub === 'consistency' && (
                  <InsightBlock
                    kicker={t('app.consistencyChecks')}
                  title={t('app.consistencyChecks')}
                  summary={consistencyResult
                    ? consistencyErrors.length > 0
                      ? `${t('app.consistencyInvalid')} · ${consistencyErrors.length} ${t('app.consistencyErrors')}`
                      : consistencyWarnings.length > 0
                        ? `${t('app.consistencyValid')} · ${consistencyWarnings.length} ${t('app.consistencyWarnings')}`
                        : t('app.consistencyValid')
                    : t('app.consistencyUnavailable')}
                  accent={consistencyErrors.length > 0 ? 'rose' : consistencyWarnings.length > 0 ? 'default' : 'emerald'}
                  defaultOpen
                >
                  {consistencyResult ? (
                    <div className="space-y-3">
                      <div className="grid gap-2">
                        <MiniMetric label={t('app.consistencyStatus')} value={consistencyResult.valid ? t('app.consistencyValid') : t('app.consistencyInvalid')} />
                        <MiniMetric label={t('app.consistencyErrors')} value={String(consistencyErrors.length)} highlight={consistencyErrors.length > 0} />
                        <MiniMetric label={t('app.consistencyWarnings')} value={String(consistencyWarnings.length)} highlight={consistencyWarnings.length > 0} />
                      </div>
                      {consistencyIssues.length > 0 ? (
                        <div className="space-y-2">
                          {consistencyIssues.slice(0, 5).map((issue, index) => {
                            const focusPath = skillDocument ? resolveConsistencyIssueFieldPath(skillDocument, issue) : null;
                            return (
                              <div key={`${issue.type}-${issue.targetId || index}`} className="rounded-[calc(var(--radius)*1.02)] bg-muted px-4 py-3 text-sm leading-6 text-muted-foreground">
                                <div className="flex items-center justify-between gap-3">
                                  <span className="font-medium text-foreground">{issue.type}</span>
                                  <span className={`rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${
                                    issue.severity === 'error'
                                      ? 'bg-destructive/12 text-destructive'
                                      : 'bg-amber-500/12 text-amber-800'
                                  }`}>
                                    {issue.severity}
                                  </span>
                                </div>
                                {issue.targetId && (
                                  <p className="mt-2 text-xs font-mono text-muted-foreground">{issue.targetId}</p>
                                )}
                                <p className="mt-2">{issue.message}</p>
                                {focusPath && (
                                  <button
                                    type="button"
                                    onClick={() => openSkillDocumentEditor(focusPath)}
                                    className="mt-3 inline-flex items-center rounded-[calc(var(--radius)*1.02)] bg-background px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground transition hover:text-foreground"
                                  >
                                    {t('app.openIssueInEditor')}
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="rounded-[calc(var(--radius)*1.02)] bg-emerald-500/12 px-4 py-3 text-sm leading-6 text-emerald-950">
                          {t('app.consistencyNoIssues')}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="rounded-[calc(var(--radius)*1.02)] bg-muted px-4 py-3 text-sm leading-6 text-muted-foreground">
                      {t('app.consistencyUnavailable')}
                    </div>
                  )}
                </InsightBlock>
                )}

                {activeChecksSub === 'tests' && (
                  <InsightBlock
                    kicker={t('app.reviewerTests')}
                  title={t('app.reviewerTests')}
                  summary={summarizeTestPanel(t, latestValidationRun, latestConsistencyRun, latestPathTestRun)}
                  accent={
                    latestValidationRun?.status === 'failed' || latestConsistencyRun?.status === 'failed' || latestPathTestRun?.status === 'failed'
                      ? 'rose'
                      : latestValidationRun || latestConsistencyRun || latestPathTestRun
                        ? 'emerald'
                        : 'default'
                  }
                  defaultOpen
                >
                  <div className="space-y-3">
                    <div className="grid gap-2 sm:grid-cols-3">
                      <button
                        type="button"
                        onClick={addValidationRun}
                        disabled={!skillDocument}
                        className="editorial-choice-button px-3 py-3 text-left text-sm disabled:cursor-not-allowed disabled:opacity-55"
                      >
                        <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                          {t('app.reviewerTests')}
                        </div>
                        <div className="mt-2 font-medium">{t('app.runValidation')}</div>
                      </button>
                      <button
                        type="button"
                        onClick={addConsistencyRun}
                        disabled={!skillDocument}
                        className="editorial-choice-button px-3 py-3 text-left text-sm disabled:cursor-not-allowed disabled:opacity-55"
                      >
                        <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                          {t('app.reviewerTests')}
                        </div>
                        <div className="mt-2 font-medium">{t('app.runConsistency')}</div>
                      </button>
                      <button
                        type="button"
                        onClick={addPathTestRun}
                        disabled={!skillDocument}
                        className="editorial-choice-button px-3 py-3 text-left text-sm disabled:cursor-not-allowed disabled:opacity-55"
                      >
                        <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                          {t('app.reviewerTests')}
                        </div>
                        <div className="mt-2 font-medium">{t('app.runPathWalk')}</div>
                      </button>
                    </div>

                    {latestValidationRun || latestConsistencyRun || latestPathTestRun ? (
                      <div className="space-y-2">
                        {latestValidationRun && (
                          <RunCard
                            label={t('app.runValidation')}
                            status={latestValidationRun.status}
                            timestamp={latestValidationRun.finishedAt || latestValidationRun.startedAt}
                            summary={`${latestValidationRun.errors.length} ${t('app.validationErrors')} · ${(latestValidationRun.warnings ?? []).length} ${t('app.validationWarnings')}`}
                          />
                        )}
                        {latestConsistencyRun && (
                          <RunCard
                            label={t('app.runConsistency')}
                            status={latestConsistencyRun.status}
                            timestamp={latestConsistencyRun.finishedAt || latestConsistencyRun.startedAt}
                            summary={`${latestConsistencyRun.issues.length} ${t('app.consistencyErrors')} · ${(latestConsistencyRun.warnings ?? []).length} ${t('app.consistencyWarnings')}`}
                          />
                        )}
                        {latestPathTestRun && (
                          <RunCard
                            label={t('app.runPathWalk')}
                            status={latestPathTestRun.status}
                            timestamp={latestPathTestRun.finishedAt || latestPathTestRun.startedAt}
                            summary={latestPathTestRun.message || ((latestPathTestRun.actualPath ?? []).join(' -> ') || t('app.pathWalkIdle'))}
                          />
                        )}
                      </div>
                    ) : (
                      <div className="rounded-[calc(var(--radius)*1.02)] bg-muted px-4 py-3 text-sm leading-6 text-muted-foreground">
                        {t('app.reviewerTestsIdle')}
                      </div>
                    )}
                  </div>
                </InsightBlock>
                )}

                {activeChecksSub === 'evidence' && (
                  <InsightBlock
                    kicker={t('app.validationEvidence')}
                  title={validationStatusLabel}
                  summary={validationEvidence?.provenance.schemaVersion || 'n/a'}
                  accent={validationHasErrors ? 'rose' : validationHasWarnings ? 'default' : 'emerald'}
                  defaultOpen
                >
                  <div data-testid="validation-evidence-panel" className="space-y-3">
                    {validationEvidence ? (
                      <>
                        <div className="grid gap-2">
                          <MiniMetric label={t('app.schemaVersion')} value={validationEvidence.provenance.schemaVersion} />
                          <MiniMetric label={t('app.parserVersion')} value={validationEvidence.provenance.parserVersion} />
                          <MiniMetric label={t('app.reviewMode')} value={reviewMode} />
                          <MiniMetric label={t('app.source')} value={validationEvidence.provenance.source} />
                        </div>

                        {validationEvidence.evidenceWarnings.length > 0 && (
                          <div className="rounded-[calc(var(--radius)*1.02)] bg-amber-500/12 p-3 text-sm leading-6 text-amber-950">
                            {validationEvidence.evidenceWarnings.map((warning) => (
                              <p key={warning}>{t(warning)}</p>
                            ))}
                          </div>
                        )}

                        {validationEvidence.validationRun.errors.length > 0 && (
                          <div className="rounded-[calc(var(--radius)*1.02)] bg-muted p-3">
                            <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                              {t('app.validationIssues')}
                            </div>
                            <div className="mt-3 space-y-2">
                              {validationEvidence.validationRun.errors.map((issue) => (
                                <div key={`${issue.code}-${issue.path}`} className="rounded-[calc(var(--radius)*1.02)] bg-background px-3 py-2 text-xs leading-6 text-muted-foreground">
                                  <div className="font-medium text-foreground">{translateEvidenceMessage(issue.message)}</div>
                                  <div>{issue.path}</div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {validationEvidence.consistencyRun.issues.length > 0 && (
                          <div className="rounded-[calc(var(--radius)*1.02)] bg-muted p-3">
                            <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                              {t('app.consistencyIssues')}
                            </div>
                            <div className="mt-3 space-y-2">
                              {validationEvidence.consistencyRun.issues.map((issue, index) => (
                                <div key={`${issue.type}-${issue.targetId || index}`} className="rounded-[calc(var(--radius)*1.02)] bg-background px-3 py-2 text-xs leading-6 text-muted-foreground">
                                  <div className="font-medium text-foreground">{translateEvidenceMessage(issue.message)}</div>
                                  {issue.targetId && <div>{issue.targetId}</div>}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {validationEvidence.validationRun.errors.length === 0
                          && validationEvidence.consistencyRun.issues.length === 0
                          && validationEvidence.evidenceWarnings.length === 0 && (
                            <div className="rounded-[calc(var(--radius)*1.02)] bg-emerald-500/12 px-4 py-3 text-sm leading-6 text-emerald-950">
                              {t('app.validationNoIssues')}
                            </div>
                        )}
                      </>
                    ) : (
                      <div className="rounded-[calc(var(--radius)*1.02)] bg-muted px-4 py-3 text-sm leading-6 text-muted-foreground">
                        {t('app.validationUnavailable')}
                      </div>
                    )}
                  </div>
                </InsightBlock>
                )}
              </>
            )}

            {activeBottomTab === 'context' && (
              <>
                {activeContextSub === 'summary' && (
                  <InsightBlock
                    kicker={t('app.projectSummary')}
                  title={t('app.contextLayers')}
                  summary={`${contextSummary.length} ${t('app.contextBuckets')}`}
                  defaultOpen
                >
                  <div className="grid gap-2 sm:grid-cols-2">
                    {contextSummary.map((item) => (
                      <div key={item.id} className="rounded-[calc(var(--radius)*1.02)] bg-muted px-3 py-3">
                        <div className="flex items-center justify-between gap-3">
                          <div className="text-sm font-medium text-foreground">{item.label}</div>
                          <span className={`rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${
                            item.status === 'blocked'
                              ? 'bg-destructive/12 text-destructive'
                              : item.status === 'attention'
                                ? 'bg-amber-500/12 text-amber-800'
                                : 'bg-emerald-500/12 text-emerald-800'
                          }`}>
                            {item.status}
                          </span>
                        </div>
                        <div className="mt-2 text-xl font-semibold tracking-tight text-foreground">{item.count}</div>
                        <p className="mt-1 text-sm leading-6 text-muted-foreground">{item.detail}</p>
                      </div>
                    ))}
                  </div>
                </InsightBlock>
                )}

                {activeContextSub === 'policy' && (
                  <InsightBlock
                    kicker={t('app.contextBucketPolicyReference')}
                  title={t('app.contextBucketPolicyReference')}
                  summary={`${parserCommandReferences.length} ${t('app.commandReferences')}`}
                  accent={parserCommandReferences.length > 0 ? 'default' : 'rose'}
                >
                  <div className="grid gap-3">
                    <MiniMetric label={t('app.commandReferences')} value={String(parserCommandReferences.length)} highlight={parserCommandReferences.length > 0} />
                    <MiniMetric
                      label={t('app.supportingFiles')}
                      value={String(supportFiles.filter((file) => /policy|reference|checklist|docs?/i.test(`${file.name} ${file.path}`)).length)}
                      highlight={supportFiles.some((file) => /policy|reference|checklist|docs?/i.test(`${file.name} ${file.path}`))}
                    />
                    {parserCommandReferences.length > 0 ? (
                      <div className="space-y-2">
                        {parserCommandReferences.slice(0, 5).map((reference: any, index: number) => (
                          <div key={`${reference.command || reference.id || index}`} className="rounded-[calc(var(--radius)*1.02)] bg-muted px-4 py-3 text-sm leading-6 text-muted-foreground">
                            <div className="font-medium text-foreground">{reference.command || reference.label || reference.id || `reference-${index + 1}`}</div>
                            {(reference.detail || reference.path) && (
                              <p className="mt-1">{reference.detail || reference.path}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-[calc(var(--radius)*1.02)] bg-muted px-4 py-3 text-sm leading-6 text-muted-foreground">
                        {t('app.contextPolicyReferenceEmpty')}
                      </div>
                    )}
                  </div>
                </InsightBlock>
                )}

                {activeContextSub === 'files' && (
                  <InsightBlock
                    kicker={t('app.contextBucketSupportingFiles')}
                  title={t('app.contextBucketSupportingFiles')}
                  summary={supportFiles.length > 0 ? `${supportFiles.length} ${t('app.contextFiles')}` : t('app.noContextFiles')}
                >
                  <div className="space-y-2">
                    {supportFiles.length > 0 ? supportFiles.map((file) => (
                      <button
                        key={`${file.path}-${file.size}`}
                        type="button"
                        onClick={() => onSelectContextPath(file.path)}
                        className={`w-full rounded-[calc(var(--radius)*1.02)] px-4 py-3 text-left transition ${
                          selectedContextPath === file.path ? 'bg-background' : 'bg-muted'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-sm font-medium text-foreground">{file.name}</span>
                          <span className="text-[11px] text-muted-foreground">{formatBytes(file.size)}</span>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">{file.type}</p>
                        <p className="mt-1 text-[11px] text-muted-foreground">{file.path}</p>
                      </button>
                    )) : (
                      <div className="rounded-[calc(var(--radius)*1.02)] bg-muted px-4 py-3 text-sm leading-6 text-muted-foreground">
                        {t('app.noContextFiles')}
                      </div>
                    )}
                  </div>
                </InsightBlock>
                )}

                {activeContextSub === 'analysis' && (
                  <InsightBlock
                    kicker={t('app.contextBucketAnalysisFindings')}
                  title={t('app.contextBucketAnalysisFindings')}
                  summary={firstFinding ? firstFinding.ruleName : `${parserAnalysisFindings.length} ${t('app.analysisFindings')}`}
                  accent={firstFinding ? 'rose' : parserAnalysisFindings.length > 0 ? 'default' : 'emerald'}
                >
                  {firstFinding || operatorReminders.length > 0 || parserAnalysisFindings.length > 0 ? (
                    <div className="space-y-3">
                      {firstFinding && (
                        <div className="rounded-[calc(var(--radius)*1.02)] bg-muted p-3">
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-sm font-medium text-foreground">{firstFinding.ruleName}</p>
                            <span className="rounded-[calc(var(--radius)*1.05)] bg-destructive/12 px-2 py-1 text-[11px] font-medium text-destructive">
                              {firstFinding.adjustedSeverity}
                            </span>
                          </div>
                          <p className="mt-2 text-sm leading-6 text-muted-foreground">{firstFinding.description}</p>
                        </div>
                      )}
                      <div className="grid gap-2">
                        {firstFinding && (
                          <MiniMetric label={t('app.firstFinding')} value={`${firstFinding.ruleId} · L${firstFinding.lineNumber}`} />
                        )}
                        <MiniMetric label={t('app.scanScore')} value={String(scanScore)} />
                        <MiniMetric label={t('app.analysisFindings')} value={String(parserAnalysisFindings.length)} highlight={parserAnalysisFindings.length > 0} />
                      </div>
                      {parserAnalysisFindings.length > 0 && (
                        <div className="space-y-2">
                          {parserAnalysisFindings.slice(0, 4).map((finding: any, index: number) => (
                            <div key={`${finding.id || finding.code || index}`} className="rounded-[calc(var(--radius)*1.02)] bg-background px-3 py-3">
                              <div className="text-sm font-medium text-foreground">{finding.label || finding.title || finding.code || `finding-${index + 1}`}</div>
                              {(finding.detail || finding.message) && (
                                <p className="mt-2 text-xs leading-6 text-muted-foreground">{finding.detail || finding.message}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                      {operatorReminders.length > 0 && (
                        <div className="rounded-[calc(var(--radius)*1.02)] bg-muted p-3">
                          <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                            {t('app.operatorReminders')}
                          </div>
                          <div className="mt-3 space-y-3">
                            {operatorReminders.map((reminder: any) => (
                              <div key={reminder.id} className="rounded-[calc(var(--radius)*1.02)] bg-background px-3 py-3">
                                <div className="flex items-center justify-between gap-3">
                                  <div className="text-sm font-medium text-foreground">{reminder.label}</div>
                                  <span className={`rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${
                                    reminder.level === 'high'
                                      ? 'bg-destructive/12 text-destructive'
                                      : reminder.level === 'medium'
                                        ? 'bg-amber-500/12 text-amber-800'
                                        : 'bg-card/98 text-muted-foreground'
                                  }`}>
                                    {reminder.level}
                                  </span>
                                </div>
                                <p className="mt-2 text-xs leading-6 text-muted-foreground">{reminder.detail}</p>
                                <p className="mt-2 text-xs font-medium leading-6 text-foreground">{reminder.action}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="rounded-[calc(var(--radius)*1.02)] bg-muted px-4 py-3 text-sm leading-6 text-muted-foreground">
                      {t('securityMatrix.auditLogSummaryText')}
                    </div>
                  )}
                </InsightBlock>
                )}

                {activeContextSub === 'source' && (
                  <InsightBlock
                    kicker={t('app.contextBucketSourceProvenance')}
                  title={t('app.contextBucketSourceProvenance')}
                  summary={bridgeModeSummary}
                >
                  <div className="space-y-3">
                    {parserManifest && (
                      <div className="rounded-[calc(var(--radius)*1.02)] bg-muted px-4 py-3 text-sm leading-6 text-muted-foreground">
                        {t('app.analysisLevel')}: <span className="font-medium text-foreground">{parserManifest.analysis_level}</span>
                        {' · '}
                        {t('app.resolved')}: <span className="font-medium text-foreground">{parserSupportingFiles.filter((file: any) => file.resolved).length}</span>
                        {' · '}
                        {t('app.unresolved')}: <span className="font-medium text-foreground">{parserManifest.unresolved_references_count || 0}</span>
                      </div>
                    )}
                    <MiniMetric label={t('app.bridgeMode')} value={bridgeModeLabel} />
                    <MiniMetric label={t('app.bridgeSource')} value={bridgeModeDetail} />
                    <MiniMetric label={t('app.modifiedCount')} value={String(modifiedPaths.size)} highlight={modifiedPaths.size > 0} />
                    {selectedContextPath && (
                      <MiniMetric label={t('app.sourceDefinition')} value={selectedContextPath} />
                    )}
                  </div>
                </InsightBlock>
                )}

                {activeContextSub === 'links' && (
                  <InsightBlock kicker={t('app.sourceLinks')} title={t('app.projectSummary')} summary="GitHub">
                  <div className="space-y-2">
                    <a
                      href={guiRepoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between rounded-[calc(var(--radius)*1.02)] bg-muted px-4 py-3 text-sm text-foreground transition hover:bg-card"
                    >
                      <span>{t('app.guiRepo')}</span>
                      <Github size={15} className="text-muted-foreground" />
                    </a>
                    <a
                      href={engineRepoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between rounded-[calc(var(--radius)*1.02)] bg-muted px-4 py-3 text-sm text-foreground transition hover:bg-card"
                    >
                      <span>{t('app.engineRepo')}</span>
                      <FileCode2 size={15} className="text-muted-foreground" />
                    </a>
                  </div>
                </InsightBlock>
                )}
              </>
            )}
                      </motion.div>
                    </AnimatePresence>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Fixed Toolbar Base */}
          <div className="review-bottom-toolbar w-full pointer-events-auto bg-background/95 backdrop-blur-md border-t border-border/40 p-2 sm:p-3 flex justify-center">
            <div className="flex flex-wrap items-center gap-2 max-w-5xl">
              {insightTabs.map((tab) => {
                const isActive = activeBottomTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveBottomTab(isActive ? null : tab.id)}
                    aria-expanded={isActive}
                    aria-controls="review-insight-drawer"
                    data-testid={`insight-tab-${tab.id}`}
                    className={`review-bottom-tab-button flex items-center gap-3 px-4 py-2.5 rounded-full ${
                      isActive
                        ? 'review-bottom-tab-button--active bg-primary text-primary-foreground'
                        : 'bg-muted/60 text-foreground'
                    }`}
                  >
                    <div className="text-sm font-semibold">{tab.label}</div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full hidden sm:inline ${isActive ? 'bg-primary-foreground/20' : 'bg-background text-muted-foreground'}`}>
                      {tab.meta}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </motion.div>

      <Suspense fallback={null}>
        <SideEditor
          config={editorConfig}
          onClose={() => {
            setEditorConfig(null);
            returnToIssueInbox();
          }}
          onSave={(updatedData) => {
            if (!editorConfig) {
              return;
            }
            onSaveEdit(editorConfig, updatedData);
            setEditorConfig(null);
            returnToIssueInbox();
          }}
        />
      </Suspense>
    </>
  );
}

function StandardPipelineView({
  bridgeModeSummary,
  handoffSummary,
  reviewReadinessLabel,
  reviewStatusLabel,
}: {
  bridgeModeSummary: string;
  handoffSummary: string;
  reviewReadinessLabel: string;
  reviewStatusLabel: string;
}) {
  const { t } = useTranslation();
  const steps = [
    { description: t('app.stepIntakeDesc'), id: '1', label: t('app.stepIntake'), status: 'done' as const },
    { description: t('app.stepParseDesc'), id: '2', label: t('app.stepParse'), status: 'done' as const },
    { description: t('app.stepReviewDesc'), id: '3', label: t('app.stepReview'), status: 'active' as const },
    { description: t('app.stepExportDesc'), id: '4', label: t('app.stepExport'), status: 'next' as const },
  ];

  return (
    <div className="review-main-surface glass-panel-strong relative overflow-hidden px-4 py-4 sm:px-5">
      <div className="grid gap-3 xl:grid-cols-[minmax(0,1.45fr)_minmax(17rem,0.8fr)]">
        <div className="space-y-3">
          <div className="flex flex-col gap-1.5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="editorial-kicker">{t('app.standardPipeline')}</p>
              <p className="mt-1 text-sm leading-5 text-foreground/72">{t('app.standardPipelineHint')}</p>
            </div>
            <span className="editorial-chip w-fit px-3 py-1 text-[11px] text-muted-foreground">
              4 {t('app.phaseStep')}
            </span>
          </div>

          <div className="parser-stepper parser-stepper--compact">
            {steps.map((step, index) => (
              <React.Fragment key={step.id}>
                <div className={`parser-stepper__step ${step.status === 'done' ? 'parser-stepper__step--done' : step.status === 'active' ? 'parser-stepper__step--active' : ''}`}>
                  <span className="parser-stepper__num">{step.id}</span>
                  <span>{step.label}</span>
                </div>
                {index < steps.length - 1 && (
                  <div className={`parser-stepper__connector ${index < 2 ? 'parser-stepper__connector--done' : ''}`} />
                )}
              </React.Fragment>
            ))}
          </div>

          <div className="grid gap-2 md:grid-cols-2">
            {steps.map((step) => (
              <div key={step.id} className="review-structural-panel surface-panel-muted px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                      {t('app.phaseStep')} {step.id}
                    </div>
                    <div className="mt-1.5 text-base font-semibold tracking-tight text-foreground">{step.label}</div>
                  </div>
                  <span className="editorial-chip px-2.5 py-1 text-[10px] text-muted-foreground">
                    {step.status}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-5 text-foreground/72">{step.description}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="review-structural-panel surface-panel-muted px-4 py-3.5">
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
            <MiniMetric label={t('app.bridgeMode')} value={bridgeModeSummary} highlight />
            <MiniMetric label={t('app.validationEvidence')} value={reviewReadinessLabel} highlight />
            <MiniMetric label={t('app.reviewDecisionPanel')} value={reviewStatusLabel} highlight />
            <MiniMetric label={t('app.handoffState')} value={handoffSummary} highlight={handoffSummary === t('app.handoffStateApprovedForExport')} />
          </div>
        </div>
      </div>
    </div>
  );
}

function PanelFallback({ heightClassName = 'min-h-[200px]' }: { heightClassName?: string }) {
  const { t } = useTranslation();

  return (
    <div className={`flex items-center justify-center rounded-[calc(var(--radius)*1.02)] bg-muted px-4 py-6 text-sm text-muted-foreground ${heightClassName}`}>
      {t('app.loadingWorkspaceModule')}
    </div>
  );
}

function StatPill({ label, value, accent = 'default' }: { label: string; value: string; accent?: 'default' | 'warn' | 'danger' }) {
  const accentClass = accent === 'warn'
    ? 'bg-amber-500/12 text-amber-900'
    : accent === 'danger'
      ? 'bg-destructive/10 text-destructive'
      : 'bg-muted text-foreground';

  return (
    <div className={`rounded-[calc(var(--radius)*1.02)] px-3.5 py-2.5 ${accentClass}`}>
      <div className="text-[10px] font-semibold uppercase tracking-[0.22em] opacity-70">{label}</div>
      <div className="mt-1.5 text-lg font-semibold tracking-tight">{value}</div>
    </div>
  );
}

function MiniMetric({ label, value, highlight = false, variant }: { label: string; value: string; highlight?: boolean; variant?: 'default' | 'success' | 'warning' | 'danger' }) {
  const effectiveVariant = variant || (highlight ? 'warning' : 'default');
  const variantClasses = {
    default: 'bg-muted',
    success: 'bg-emerald-500/10 border-l-4 border-emerald-500',
    warning: 'bg-amber-500/10 border-l-4 border-amber-500',
    danger: 'bg-destructive/10 border-l-4 border-destructive',
  };
  const valueClasses = {
    default: 'text-foreground',
    success: 'text-emerald-900',
    warning: 'text-amber-900',
    danger: 'text-destructive',
  };
  return (
    <div className={`rounded-[calc(var(--radius)*1.02)] px-3 py-2.5 ${variantClasses[effectiveVariant]}`}>
      <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">{label}</div>
      <div className={`mt-1.5 text-base font-semibold leading-5 tracking-tight ${valueClasses[effectiveVariant]}`}>{value}</div>
    </div>
  );
}

function RunCard({
  label,
  status,
  timestamp,
  summary,
}: {
  label: string;
  status: 'running' | 'passed' | 'failed';
  timestamp: string;
  summary: string;
}) {
  return (
    <div className={`rounded-[calc(var(--radius)*1.02)] px-4 py-3 ${runStatusClassName(status)}`}>
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-foreground">{label}</span>
        <span className={`rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${runStatusBadgeClassName(status)}`}>
          {status}
        </span>
      </div>
      <p className="mt-2 text-xs font-mono text-muted-foreground">{formatRunTimestamp(timestamp)}</p>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{summary}</p>
    </div>
  );
}

function NoteCard({
  label,
  timestamp,
  content,
}: {
  label: string;
  timestamp: string;
  content: string;
}) {
  return (
    <div className="rounded-[calc(var(--radius)*1.02)] bg-muted px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-foreground">{label}</span>
        <span className="text-[11px] font-mono text-muted-foreground">{formatRunTimestamp(timestamp)}</span>
      </div>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{content}</p>
    </div>
  );
}

function DecisionCard({
  action,
  summary,
  timestamp,
}: {
  action: ReviewDecision['action'];
  summary: string;
  timestamp: string;
}) {
  return (
    <div className="rounded-[calc(var(--radius)*1.02)] bg-muted px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-foreground">{action}</span>
        <span className="text-[11px] font-mono text-muted-foreground">{formatRunTimestamp(timestamp)}</span>
      </div>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{summary}</p>
    </div>
  );
}

function DiffList({ title, items, emptyLabel }: { title: string; items: string[]; emptyLabel: string }) {
  return (
    <div className="rounded-[calc(var(--radius)*1.02)] bg-muted px-4 py-3">
      <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">{title}</div>
      {items.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {items.map((item) => (
            <span key={`${title}-${item}`} className="rounded-[calc(var(--radius)*1.02)] bg-background px-3 py-1 text-[11px] text-foreground">
              {item}
            </span>
          ))}
        </div>
      ) : (
        <p className="mt-3 text-sm leading-6 text-muted-foreground">{emptyLabel}</p>
      )}
    </div>
  );
}

function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / (1024 ** exponent);
  return `${value.toFixed(value >= 10 || exponent === 0 ? 0 : 1)} ${units[exponent]}`;
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

function formatRunTimestamp(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
}

function runStatusClassName(status: 'running' | 'passed' | 'failed') {
  if (status === 'failed') {
    return 'bg-destructive/10';
  }
  if (status === 'passed') {
    return 'bg-emerald-500/12';
  }
  return 'bg-muted';
}

function runStatusBadgeClassName(status: 'running' | 'passed' | 'failed') {
  if (status === 'failed') {
    return 'bg-destructive/12 text-destructive';
  }
  if (status === 'passed') {
    return 'bg-emerald-500/12 text-emerald-800';
  }
  return 'bg-card/98 text-muted-foreground';
}

function summarizeTestPanel(
  t: (key: string) => string,
  validationRun: ValidationRun | null,
  consistencyRun: ConsistencyRun | null,
  pathRun: PathTestRun | null,
) {
  const statuses = [validationRun?.status, consistencyRun?.status, pathRun?.status].filter(Boolean);
  if (statuses.length === 0) {
    return t('app.reviewerTestsIdleShort');
  }

  if (statuses.includes('failed')) {
    return t('app.reviewerTestsFailed');
  }

  if (statuses.every((status) => status === 'passed')) {
    return t('app.reviewerTestsPassed');
  }

  return t('app.reviewerTestsMixed');
}

function buildDemoPresetDecisionLog(
  demoPreset: DemoReviewPreset,
  timestamp: string,
  validationRuns: ValidationRun[],
  consistencyRuns: ConsistencyRun[],
  pathTestRuns: PathTestRun[],
): ReviewDecision[] {
  const decisions: ReviewDecision[] = [
    {
      action: demoPreset.reviewStatus === 'approved'
        ? 'approved'
        : demoPreset.reviewStatus === 'changes_requested'
          ? 'requested_changes'
          : 'review_status_updated',
      id: `demo-decision-${demoPreset.id}-status`,
      summary: `Sample workspace loaded with review status ${demoPreset.reviewStatus}.`,
      timestamp,
    },
    {
      action: 'review_status_updated',
      id: `demo-decision-${demoPreset.id}-checklist`,
      summary: `Sample workspace seeded ${Object.values(demoPreset.reviewChecklist).filter(Boolean).length}/4 sign-off gates.`,
      timestamp,
    },
  ];

  if (validationRuns.length > 0) {
    decisions.unshift({
      action: 'validated',
      id: `demo-decision-${demoPreset.id}-validation`,
      summary: `Sample workspace seeded validation run ${validationRuns[0].status}.`,
      timestamp,
    });
  }
  if (consistencyRuns.length > 0) {
    decisions.unshift({
      action: 'tested',
      id: `demo-decision-${demoPreset.id}-consistency`,
      summary: `Sample workspace seeded consistency run ${consistencyRuns[0].status}.`,
      timestamp,
    });
  }
  if (pathTestRuns.length > 0) {
    decisions.unshift({
      action: 'tested',
      id: `demo-decision-${demoPreset.id}-path`,
      summary: `Sample workspace seeded path walk ${pathTestRuns[0].status}.`,
      timestamp,
    });
  }

  return decisions.slice(0, 12);
}

function deriveReviewProfile({
  bridgeMode,
  demoPresetId,
  reviewStatus,
  supportFileCount,
}: {
  bridgeMode: BridgeStatus['mode'] | 'llm-assisted' | 'unknown';
  demoPresetId: string | null;
  reviewStatus?: ReviewState['reviewStatus'];
  supportFileCount: number;
}): ReviewProfile {
  if (demoPresetId === 'bundle-review') {
    return 'bundle_evidence_review';
  }
  if (demoPresetId === 'publish-gate') {
    return 'publish_gate_review';
  }
  if (supportFileCount > 0) {
    return 'bundle_evidence_review';
  }
  if (reviewStatus === 'approved') {
    return 'publish_gate_review';
  }
  if (bridgeMode === 'skill-0' || demoPresetId === 'mode-aware') {
    return 'mode_verification';
  }

  return 'mode_verification';
}

function deriveDefaultHandoffState({
  hasBlockingChecks,
  reviewChecklist,
  reviewStatus,
}: {
  hasBlockingChecks: boolean;
  reviewChecklist: ReviewChecklist;
  reviewStatus: ReviewState['reviewStatus'];
}): HandoffState {
  if (reviewStatus === 'changes_requested') {
    return 'needs_changes';
  }

  if (hasBlockingChecks || Object.values(reviewChecklist).some((value) => !value)) {
    return 'needs_evidence';
  }

  if (reviewStatus === 'approved') {
    return 'approved_for_export';
  }

  return 'ready_for_review';
}

function getAllowedHandoffStates({
  derivedHandoffState,
  hasBlockingChecks,
  reviewStatus,
}: {
  derivedHandoffState: HandoffState;
  hasBlockingChecks: boolean;
  reviewStatus: ReviewState['reviewStatus'];
}): HandoffState[] {
  const options: HandoffState[] = ['ready_for_review', 'needs_evidence', 'needs_changes'];

  if (!hasBlockingChecks && reviewStatus === 'approved') {
    options.push('approved_for_export');
  }

  if (derivedHandoffState === 'approved_for_export' && !options.includes('approved_for_export')) {
    options.push('approved_for_export');
  }

  return options;
}

function buildExportBlockedReasons({
  checklistCompletedCount,
  hasBlockingChecks,
  reviewStatus,
}: {
  checklistCompletedCount: number;
  hasBlockingChecks: boolean;
  reviewStatus: ReviewState['reviewStatus'];
}) {
  const reasons: string[] = [];

  if (reviewStatus !== 'approved') {
    reasons.push('app.exportBlockedReviewStatus');
  }
  if (checklistCompletedCount < 4) {
    reasons.push('app.exportBlockedGates');
  }
  if (hasBlockingChecks) {
    reasons.push('app.exportBlockedChecks');
  }

  return reasons;
}

function buildContextSummary({
  bridgeModeDetail,
  commandReferences,
  findings,
  operatorReminders,
  scanScore,
  selectedContextPath,
  supportFiles,
}: {
  bridgeModeDetail: string;
  commandReferences: any[];
  findings: any[];
  operatorReminders: any[];
  scanScore: number;
  selectedContextPath: string | null;
  supportFiles: UploadedContextFile[];
}): ContextSummaryItem[] {
  const policyReferenceCount = commandReferences.length
    + supportFiles.filter((file) => /policy|reference|checklist|docs?/i.test(`${file.name} ${file.path}`)).length;
  const analysisCount = findings.length + operatorReminders.length + (scanScore > 0 ? 1 : 0);

  return [
    {
      count: policyReferenceCount,
      detail: policyReferenceCount > 0 ? 'app.contextPolicyReferenceDetail' : 'app.contextPolicyReferenceEmpty',
      id: 'policy_and_reference',
      label: 'app.contextBucketPolicyReference',
      status: policyReferenceCount > 0 ? 'complete' : 'attention',
    },
    {
      count: supportFiles.length,
      detail: supportFiles.length > 0 ? 'app.contextSupportingFilesDetail' : 'app.noContextFiles',
      id: 'supporting_files',
      label: 'app.contextBucketSupportingFiles',
      status: supportFiles.length > 0 ? 'complete' : 'attention',
    },
    {
      count: analysisCount,
      detail: analysisCount > 0 ? 'app.contextAnalysisFindingsDetail' : 'app.contextAnalysisFindingsEmpty',
      id: 'analysis_findings',
      label: 'app.contextBucketAnalysisFindings',
      status: findings.length > 0 ? 'attention' : operatorReminders.length > 0 ? 'attention' : 'complete',
    },
    {
      count: 3 + (selectedContextPath ? 1 : 0),
      detail: bridgeModeDetail ? 'app.contextSourceProvenanceDetail' : 'app.contextSourceProvenanceEmpty',
      id: 'source_provenance',
      label: 'app.contextBucketSourceProvenance',
      status: bridgeModeDetail ? 'complete' : 'blocked',
    },
  ];
}

function summarizeDiffSummary(t: (key: string) => string, diffSummary: DiffSummary) {
  const totalChanges = diffSummary.added.length + diffSummary.removed.length + diffSummary.changed.length;
  return totalChanges > 0 ? `${totalChanges} ${t('app.diffEntries')}` : t('app.diffNone');
}

function capitalizeNoteType(value: 'action' | 'rule' | 'directive') {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function isReviewStatus(value: unknown): value is 'draft' | 'in_review' | 'changes_requested' | 'approved' {
  return value === 'draft' || value === 'in_review' || value === 'changes_requested' || value === 'approved';
}

function reviewProfileLabelKey(value: ReviewProfile) {
  if (value === 'bundle_evidence_review') {
    return 'app.reviewProfileBundleEvidenceReview';
  }
  if (value === 'publish_gate_review') {
    return 'app.reviewProfilePublishGateReview';
  }
  return 'app.reviewProfileModeVerification';
}

function handoffStateLabelKey(value: HandoffState) {
  if (value === 'needs_evidence') {
    return 'app.handoffStateNeedsEvidence';
  }
  if (value === 'needs_changes') {
    return 'app.handoffStateNeedsChanges';
  }
  if (value === 'approved_for_export') {
    return 'app.handoffStateApprovedForExport';
  }
  return 'app.handoffStateReadyForReview';
}

function handoffStateGuidanceKey(value: HandoffState) {
  if (value === 'needs_evidence') {
    return 'app.handoffGuidanceNeedsEvidence';
  }
  if (value === 'needs_changes') {
    return 'app.handoffGuidanceNeedsChanges';
  }
  if (value === 'approved_for_export') {
    return 'app.handoffGuidanceApprovedForExport';
  }
  return 'app.handoffGuidanceReadyForReview';
}

function reviewProfileNextStepKey(profile: ReviewProfile, handoffState: HandoffState) {
  if (handoffState === 'approved_for_export') {
    return 'app.nextActionApprovedForExport';
  }
  if (handoffState === 'needs_changes') {
    return 'app.nextActionNeedsChanges';
  }
  if (profile === 'bundle_evidence_review') {
    return 'app.nextActionBundleEvidenceReview';
  }
  if (profile === 'publish_gate_review') {
    return 'app.nextActionPublishGateReview';
  }
  return 'app.nextActionModeVerification';
}

function reviewStatusLabelKey(value: 'draft' | 'in_review' | 'changes_requested' | 'approved') {
  if (value === 'in_review') {
    return 'app.reviewStatusInReview';
  }
  if (value === 'changes_requested') {
    return 'app.reviewStatusChangesRequested';
  }
  if (value === 'approved') {
    return 'app.reviewStatusApproved';
  }
  return 'app.reviewStatusDraft';
}

function DraftStatusBadge({ label, status, timestamp }: { label: string; status: string; timestamp: string }) {
  return (
    <div className="rounded-[calc(var(--radius)*1.02)] bg-background px-3 py-2 text-xs text-foreground">
      <div className="font-semibold">{label}</div>
      <div className="mt-1 text-foreground/72">{status}</div>
      <div className="mt-1 font-mono text-[11px] text-muted-foreground">{formatDraftTimestamp(timestamp)}</div>
    </div>
  );
}

function formatDraftTimestamp(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
}

function ChecklistToggle({ label, checked, onToggle }: { label: string; checked: boolean; onToggle: () => void }) {
  const { t } = useTranslation();

  return (
    <button
      type="button"
      onClick={onToggle}
      className={`rounded-[calc(var(--radius)*1.02)] px-3 py-3 text-left text-sm transition ${
        checked
          ? 'bg-emerald-500/12 text-foreground'
          : 'bg-muted text-foreground'
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <span>{label}</span>
        <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          {checked ? t('app.reviewChecklistDone') : t('app.reviewChecklistOpen')}
        </span>
      </div>
    </button>
  );
}

function FlowStepper({
  phases,
  activePhase,
  onSelectPhase,
  compact = false,
}: {
  phases: any[];
  activePhase: string | null;
  onSelectPhase: (phaseId: string) => void;
  compact?: boolean;
}) {
  const { t } = useTranslation();

  return (
    <div className={`glass-panel ${compact ? 'px-0 py-0' : 'px-4 py-4 sm:px-5'}`}>
      {!compact && (
        <div>
          <p className="editorial-kicker">{t('app.flowSequence')}</p>
          <p className="mt-2 text-sm text-muted-foreground">{t('app.phaseFlowHint')}</p>
        </div>
      )}
      <div className={`custom-scrollbar flex overflow-x-auto pb-1 ${compact ? 'gap-2' : 'mt-4 gap-3'}`}>
        {phases.map((phase: any, index: number) => {
          const isActive = phase.id === activePhase;
          return (
            <button
              key={phase.id}
              onClick={() => onSelectPhase(phase.id)}
              className={`flow-step-card ${compact ? 'min-w-[168px] px-3 py-3' : 'min-w-[190px]'} ${isActive ? 'flow-step-card--active' : ''}`}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                  {t('app.phaseStep')} {index + 1}
                </span>
                <span className="rounded-[calc(var(--radius)*1.02)] bg-background px-2 py-1 text-[10px] font-mono text-muted-foreground">
                  {phase.id}
                </span>
              </div>
              <div className={`text-sm font-medium leading-5 text-foreground ${compact ? 'mt-2' : 'mt-3'}`}>{phase.name}</div>
              <div className={`text-xs leading-5 text-muted-foreground ${compact ? 'mt-1.5' : 'mt-2'}`}>{phase.tasks.slice(0, 2).join(' · ')}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function InsightBlock({
  id,
  kicker,
  title,
  summary,
  children,
  accent = 'default',
  defaultOpen = false,
  isOpen: controlledOpen,
  onToggle,
}: {
  id?: string;
  kicker: string;
  title: string;
  summary?: string;
  children: React.ReactNode;
  accent?: 'default' | 'emerald' | 'rose';
  defaultOpen?: boolean;
  isOpen?: boolean;
  onToggle?: () => void;
}) {
  const accentClass = accent === 'emerald' ? 'drawer-section--emerald' : accent === 'rose' ? 'drawer-section--rose' : '';

  return (
    <section id={id} className={`drawer-section ${accentClass}`}>
      <p className="editorial-kicker">{kicker}</p>
      <div className="mt-2 flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold tracking-tight text-foreground">{title}</h3>
          {summary && <p className="mt-1 text-sm text-muted-foreground">{summary}</p>}
        </div>
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}
