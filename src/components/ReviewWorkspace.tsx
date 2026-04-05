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
  RefreshCw,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Flowchart } from './Flowchart';
import type { BridgeStatus } from '../services/bridgeStatusService';
import {
  buildReviewPacketFromReviewData,
  buildValidationEvidenceFromReviewData,
  extractSkillDocumentFromReviewData,
} from '../services/skillDocumentAdapter';
import { checkSkillDocumentConsistency } from '../services/skillDocumentConsistency';
import { buildSkillDocumentDiffSummary } from '../services/reviewDiffService';
import {
  createConsistencyRun,
  createPathTestRun,
  createValidationRun,
} from '../services/skillDocumentTestRunner';
import {
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
import type { DemoReviewPreset } from '../App';

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
  onSelectContextPath: (path: string | null) => void;
  onSaveEdit: (config: Exclude<EditorConfig, null>, updatedData: any) => void;
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
  onSelectContextPath,
  onSaveEdit,
  onUndo,
  onResetWorkspace,
}: ReviewWorkspaceProps) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<WorkspaceTabId>('pipeline');
  const [activePhase, setActivePhase] = useState<string | null>(null);
  const [activeInsightTab, setActiveInsightTab] = useState<'review' | 'checks' | 'context'>('review');
  const [isWorkspaceFocusMode, setIsWorkspaceFocusMode] = useState(false);
  const [isDerivedWorkflowOpen, setIsDerivedWorkflowOpen] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const [editorConfig, setEditorConfig] = useState<EditorConfig>(null);
  const [validationRuns, setValidationRuns] = useState<ValidationRun[]>([]);
  const [consistencyRuns, setConsistencyRuns] = useState<ConsistencyRun[]>([]);
  const [pathTestRuns, setPathTestRuns] = useState<PathTestRun[]>([]);
  const [globalNotes, setGlobalNotes] = useState<ReviewNote[]>([]);
  const [elementNotes, setElementNotes] = useState<ElementReviewNote[]>([]);
  const [reviewStatus, setReviewStatus] = useState<ReviewState['reviewStatus']>(
    data?.reviewerSummary?.reviewStatus
      || (bridgeStatus?.mode === 'skill-0' ? 'in_review' : 'draft'),
  );
  const [decisionLog, setDecisionLog] = useState<ReviewDecision[]>([]);
  const [noteDraft, setNoteDraft] = useState('');
  const [noteTarget, setNoteTarget] = useState('global');
  const [reviewerName, setReviewerName] = useState(data?.reviewerSummary?.reviewerName || '');
  const [reviewerNotes, setReviewerNotes] = useState(data?.reviewerSummary?.reviewerNotes || '');
  const [reviewSummaryDraft, setReviewSummaryDraft] = useState('');
  const [reviewerSignoff, setReviewerSignoff] = useState('');
  const [reviewChecklist, setReviewChecklist] = useState<ReviewChecklist>(DEFAULT_REVIEW_CHECKLIST);
  const [reviewProfile, setReviewProfile] = useState<ReviewProfile>(() => deriveReviewProfile({
    bridgeMode: bridgeStatus?.mode ?? 'unknown',
    demoPresetId: demoPreset?.id ?? null,
    reviewStatus: data?.reviewerSummary?.reviewStatus,
    supportFileCount: supportFiles.length,
  }));
  const [handoffState, setHandoffState] = useState<HandoffState>('ready_for_review');
  const [reviewDraftSavedAt, setReviewDraftSavedAt] = useState<string | null>(null);
  const [reviewDraftRestored, setReviewDraftRestored] = useState(false);
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
  const bridgeModeLabel = bridgeStatus?.mode === 'skill-0'
    ? t('app.bridgeModeCanonical')
    : bridgeStatus?.mode === 'standalone'
      ? t('app.bridgeModeStandalone')
      : t('app.bridgeModeUnavailable');
  const bridgeModeDetail = bridgeStatus?.skill0Root
    || (bridgeStatus?.mode === 'standalone'
      ? t('app.bridgeModeBundled')
      : bridgeStatusError || t('app.bridgeModeChecking'));
  const bridgeModeSummary = bridgeStatus?.mode === 'skill-0'
    ? t('app.bridgeModeCanonicalShort')
    : bridgeStatus?.mode === 'standalone'
      ? t('app.bridgeModeStandaloneShort')
      : t('app.bridgeModeUnavailableShort');
  const bridgeReviewGuidance = bridgeStatus?.mode === 'skill-0'
    ? t('app.bridgeHelpCanonical')
    : bridgeStatus?.mode === 'standalone'
      ? t('app.bridgeHelpStandalone')
      : t('app.bridgeHelpUnavailable');
  const reviewReadinessLabel = bridgeStatus?.mode === 'skill-0'
    ? t('app.reviewEvidenceCanonical')
    : bridgeStatus?.mode === 'standalone'
      ? t('app.reviewEvidenceStandalone')
      : t('app.reviewEvidenceUnavailable');
  const reviewReadinessStyles = bridgeStatus?.mode === 'skill-0'
    ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-800'
    : bridgeStatus?.mode === 'standalone'
      ? 'border-amber-500/25 bg-amber-500/10 text-amber-800'
      : 'border-border/55 bg-background/70 text-muted-foreground';
  const skillDocument = extractSkillDocumentFromReviewData(data);
  const originalSkillDocument = originalData ? extractSkillDocumentFromReviewData(originalData) : null;
  const reviewDraftStorageKey = data?.projectId ? `${REVIEW_DRAFT_STORAGE_PREFIX}:${data.projectId}` : null;
  const diffSummary: DiffSummary | null = skillDocument && originalSkillDocument
    ? buildSkillDocumentDiffSummary(originalSkillDocument, skillDocument)
    : null;
  const validationResult = skillDocument ? validateSkillDocument(skillDocument) : null;
  const validationIssues = validationResult?.issues ?? [];
  const validationErrors = validationIssues.filter((issue) => issue.severity === 'error');
  const validationWarnings = validationIssues.filter((issue) => issue.severity === 'warning');
  const consistencyResult = skillDocument ? checkSkillDocumentConsistency(skillDocument) : null;
  const consistencyIssues = consistencyResult?.issues ?? [];
  const consistencyErrors = consistencyIssues.filter((issue) => issue.severity === 'error');
  const consistencyWarnings = consistencyIssues.filter((issue) => issue.severity === 'warning');
  const insightTabs = [
    { id: 'review' as const, label: t('app.reviewDecisionPanel'), meta: `${decisionLog.length} ${t('app.decisionCount')}` },
    { id: 'checks' as const, label: t('app.detailsPanel'), meta: `${validationErrors.length + consistencyErrors.length} ${t('app.validationErrors')}` },
    { id: 'context' as const, label: t('app.projectSummary'), meta: `${parserSupportingFiles.length} ${t('app.supportingFiles')}` },
  ];
  const noteTargets = [
    { label: t('app.noteTargetGlobal'), value: 'global' },
    ...skillDocument.decomposition.actions.map((action) => ({
      label: `${t('app.noteTargetAction')} · ${action.id} · ${action.name}`,
      value: `action:${action.id}`,
    })),
    ...skillDocument.decomposition.rules.map((rule) => ({
      label: `${t('app.noteTargetRule')} · ${rule.id} · ${rule.name}`,
      value: `rule:${rule.id}`,
    })),
    ...skillDocument.decomposition.directives.map((directive) => ({
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
        setReviewStatus(data?.reviewerSummary?.reviewStatus || (bridgeStatus?.mode === 'skill-0' ? 'in_review' : 'draft'));
        setReviewerName(data?.reviewerSummary?.reviewerName || '');
        setReviewerNotes(data?.reviewerSummary?.reviewerNotes || '');
      setDecisionLog([]);
      setNoteTarget('global');
      setReviewSummaryDraft('');
      setReviewerSignoff('');
      setReviewChecklist(DEFAULT_REVIEW_CHECKLIST);
      setReviewProfile(deriveReviewProfile({
        bridgeMode: bridgeStatus?.mode ?? 'unknown',
        demoPresetId: demoPreset?.id ?? null,
        reviewStatus: data?.reviewerSummary?.reviewStatus,
        supportFileCount: supportFiles.length,
      }));
      setHandoffState(deriveDefaultHandoffState({
        hasBlockingChecks,
        reviewChecklist: DEFAULT_REVIEW_CHECKLIST,
        reviewStatus: data?.reviewerSummary?.reviewStatus || (bridgeStatus?.mode === 'skill-0' ? 'in_review' : 'draft'),
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
          bridgeMode: bridgeStatus?.mode ?? 'unknown',
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
      setReviewStatus(data?.reviewerSummary?.reviewStatus || (bridgeStatus?.mode === 'skill-0' ? 'in_review' : 'draft'));
      setReviewerName(data?.reviewerSummary?.reviewerName || '');
      setReviewerNotes(data?.reviewerSummary?.reviewerNotes || '');
      setDecisionLog([]);
      setNoteTarget('global');
      setReviewSummaryDraft('');
      setReviewerSignoff('');
      setReviewChecklist(DEFAULT_REVIEW_CHECKLIST);
      setReviewProfile(deriveReviewProfile({
        bridgeMode: bridgeStatus?.mode ?? 'unknown',
        demoPresetId: demoPreset?.id ?? null,
        reviewStatus: data?.reviewerSummary?.reviewStatus,
        supportFileCount: supportFiles.length,
      }));
      setHandoffState(deriveDefaultHandoffState({
        hasBlockingChecks,
        reviewChecklist: DEFAULT_REVIEW_CHECKLIST,
        reviewStatus: data?.reviewerSummary?.reviewStatus || (bridgeStatus?.mode === 'skill-0' ? 'in_review' : 'draft'),
      }));
      setReviewDraftSavedAt(null);
      setReviewDraftRestored(false);
    }

    hasHydratedReviewDraftRef.current = true;
  }, [bridgeStatus?.mode, data?.reviewerSummary?.reviewStatus, data?.reviewerSummary?.reviewerName, data?.reviewerSummary?.reviewerNotes, reviewDraftStorageKey]);

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
      bridgeMode: bridgeStatus?.mode ?? 'unknown',
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
  }, [bridgeStatus?.mode, demoPreset, hasBlockingChecks, skillDocument, supportFiles.length]);

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
      bridgeMode: bridgeStatus?.mode ?? 'unknown',
      demoPresetId: demoPreset?.id ?? null,
      reviewStatus: data?.reviewerSummary?.reviewStatus,
      supportFileCount: supportFiles.length,
    }));
    setHandoffState(deriveDefaultHandoffState({
      hasBlockingChecks,
      reviewChecklist: DEFAULT_REVIEW_CHECKLIST,
      reviewStatus: data?.reviewerSummary?.reviewStatus || (bridgeStatus?.mode === 'skill-0' ? 'in_review' : 'draft'),
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
  const reviewMode = data?.reviewerSummary?.mode
    || (bridgeStatus?.mode === 'skill-0'
      ? 'canonical'
      : bridgeStatus?.mode === 'standalone'
        ? 'standalone'
        : 'unknown');
  const reviewEquivalenceStatus = data?.reviewerSummary?.equivalenceNote
    || (reviewMode === 'canonical' ? 'implementation_identity' : 'equivalence_unverified');
  const reviewEquivalenceLabel = reviewEquivalenceStatus === 'implementation_identity'
    ? t('app.equivalenceImplementationIdentity')
    : reviewEquivalenceStatus === 'equivalence_unverified'
      ? t('app.equivalenceUnverified')
      : t('app.equivalencePending');
  const reviewDecisionGuidance = data?.reviewerSummary?.finalDecisionGuidance
    || (bridgeStatus?.mode === 'skill-0'
      ? 'Result was produced by the canonical skill-0 bridge. Final equivalence review is acceptable if supporting files and findings are inspected.'
      : bridgeStatus?.mode === 'standalone'
        ? 'Result was produced by the standalone compatibility path. Re-run with the canonical skill-0 bridge before parity-sensitive or final equivalence decisions.'
        : 'Parser mode could not be verified. Do not treat this result as final equivalence evidence until bridge status is confirmed.');
  const exportModeSuffix = reviewMode === 'canonical'
    ? 'canonical'
    : reviewMode === 'standalone'
      ? 'standalone'
      : 'unknown';
  const bridgeToneClass = bridgeStatus?.mode === 'skill-0'
    ? 'border-emerald-500/20 bg-emerald-500/8 text-emerald-900'
    : bridgeStatus?.mode === 'standalone'
      ? 'border-amber-500/20 bg-amber-500/10 text-amber-900'
      : 'border-border/50 bg-background/70 text-foreground';
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

  const openDerivedWorkflow = () => {
    setActiveTab('pipeline');
    setIsDerivedWorkflowOpen(true);
    window.setTimeout(() => {
      document.getElementById('derived-workflow-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 80);
  };

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
        `- parser_mode: ${bridgeStatus?.mode || 'unknown'}`,
        `- parser_mode_source: ${bridgeModeDetail}`,
        `- review_mode: ${reviewMode}`,
        `- review_profile: ${reviewProfile}`,
        `- equivalence_status: ${reviewEquivalenceStatus}`,
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
      `- parser_mode: ${bridgeStatus?.mode || 'unknown'}`,
      `- parser_mode_source: ${bridgeModeDetail}`,
      `- review_mode: ${reviewMode}`,
      `- review_profile: ${reviewProfile}`,
      `- review_status: ${reviewStatus}`,
      `- handoff_state: ${effectiveHandoffState}`,
      `- equivalence_status: ${reviewEquivalenceStatus}`,
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
      `- parser_mode: ${bridgeStatus?.mode || 'unknown'}`,
      `- parser_mode_source: ${bridgeModeDetail}`,
      `- review_mode: ${reviewMode}`,
      `- review_profile: ${reviewProfile}`,
      `- review_status: ${reviewStatus}`,
      `- handoff_state: ${effectiveHandoffState}`,
      `- equivalence_status: ${reviewEquivalenceStatus}`,
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
      `- actions: ${skillDocument.decomposition.actions.length}`,
      `- rules: ${skillDocument.decomposition.rules.length}`,
      `- directives: ${skillDocument.decomposition.directives.length}`,
      `- execution_paths: ${(skillDocument.execution_paths ?? []).length}`,
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
      bridgeMode: (bridgeStatus?.mode ?? 'unknown') as ReviewPacket['parserMode'],
      bridgeModeSource: bridgeModeDetail,
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
          className="mb-5 rounded-[1.4rem] border border-primary/20 bg-primary/8 px-4 py-4 text-foreground backdrop-blur-xl"
          data-testid="demo-review-preset"
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-3xl">
              <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">{t('app.sampleGuide')}</div>
              <h2 className="mt-2 text-lg font-semibold tracking-tight text-foreground">{demoPreset.title}</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{demoPreset.focus}</p>
            </div>
            <div className="rounded-full border border-primary/20 bg-background/72 px-3 py-1.5 text-[11px] font-medium text-foreground">
              {t(reviewStatusLabelKey(reviewStatus))}
            </div>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <div className="rounded-[1rem] border border-border/55 bg-background/72 px-3 py-3">
              <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{t('app.sampleNextStep')}</div>
              <div className="mt-2 text-sm leading-6 text-foreground">{demoPreset.nextStep}</div>
            </div>
            <div className="rounded-[1rem] border border-border/55 bg-background/72 px-3 py-3">
              <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{t('app.samplePrefilled')}</div>
              <div className="mt-2 text-sm leading-6 text-foreground">{reviewerSignoff || t('app.reviewerSignoffPending')}</div>
            </div>
            <div className="rounded-[1rem] border border-border/55 bg-background/72 px-3 py-3">
              <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{t('app.sampleChecklist')}</div>
              <div className="mt-2 text-sm leading-6 text-foreground">{checklistCompletedCount}/4</div>
            </div>
          </div>
        </motion.div>
      )}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="grid gap-5 xl:grid-cols-[15rem_minmax(0,1fr)] 2xl:grid-cols-[15rem_minmax(0,1fr)_24rem]">
        <aside className="space-y-4 xl:sticky xl:top-28 xl:self-start">
          <div className="glass-panel space-y-5 p-4 sm:p-5">
            <div>
              <p className="editorial-kicker">{t('app.workspace')}</p>
              <h2 className="text-pretty-wrap mt-2 text-lg font-semibold tracking-tight text-foreground">{t('app.primaryWorkspace')}</h2>
              <p className="text-pretty-wrap mt-2 text-sm leading-6 text-muted-foreground">{t('app.phaseFlowHint')}</p>
            </div>

            <div className="space-y-2">
              {workspaceTabs.map((view) => (
                <div key={view.id} className="space-y-2">
                  <button
                    onClick={() => setActiveTab(view.id)}
                    className={`workspace-nav-button ${activeTab === view.id ? 'workspace-nav-button--active' : ''}`}
                  >
                    <div>
                      <div className="text-pretty-wrap text-sm font-medium text-foreground">{view.label}</div>
                      <div className="text-pretty-wrap mt-1 text-[11px] text-muted-foreground">{view.meta}</div>
                    </div>
                    <span className="text-[10px] font-mono uppercase tracking-[0.24em] text-muted-foreground/70">{view.id}</span>
                  </button>

                  {view.id === 'pipeline' && (
                    <button
                      type="button"
                      onClick={openDerivedWorkflow}
                      className={`workspace-subnav-button text-pretty-wrap ${isDerivedWorkflowOpen ? 'workspace-subnav-button--active' : ''}`}
                    >
                      {t('app.tabs.pipeline')} {t('app.derivedWorkflow')}
                    </button>
                  )}
                </div>
              ))}
            </div>

            <div className="surface-panel-muted">
              <button
                onClick={() => setShowActions((current) => !current)}
                className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
              >
                <div>
                  <p className="editorial-kicker">{t('app.actionsTray')}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{t('app.quickActions')}</p>
                </div>
                {showActions ? <ChevronUp size={16} className="text-muted-foreground" /> : <ChevronDown size={16} className="text-muted-foreground" />}
              </button>

              <AnimatePresence initial={false}>
                {showActions && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="grid gap-2 px-4 pb-4">
                      <button
                        onClick={() => setEditorConfig({ type: 'global', payload: data })}
                        className="editorial-action-button px-3 py-2 text-sm text-foreground"
                      >
                        <span>{t('app.openGlobalEditor')}</span>
                        <Edit2 size={14} className="text-muted-foreground" />
                      </button>
                      {skillDocument && (
                        <button
                          onClick={() => setEditorConfig({ type: 'skillDocument', payload: skillDocument })}
                          className="editorial-action-button px-3 py-2 text-sm text-foreground"
                        >
                          <span>{t('app.openStructuredEditor')}</span>
                          <Edit2 size={14} className="text-muted-foreground" />
                        </button>
                      )}
                      {skillDocument && (
                        <button
                          onClick={() => setEditorConfig({ type: 'json', payload: skillDocument })}
                          className="editorial-action-button px-3 py-2 text-sm text-foreground"
                        >
                          <span>{t('app.openJsonEditor')}</span>
                          <FileCode2 size={14} className="text-muted-foreground" />
                        </button>
                      )}
                      <button
                        onClick={exportSkill}
                        disabled={!canExportArtifacts}
                        className="editorial-action-button px-3 py-2 text-sm text-foreground disabled:cursor-not-allowed disabled:opacity-55"
                      >
                        <span>{t('app.export')}</span>
                        <Download size={14} className="text-muted-foreground" />
                      </button>
                      {skillDocument && (
                        <button
                          onClick={exportSkillJson}
                          disabled={!canExportArtifacts}
                          className="editorial-action-button px-3 py-2 text-sm text-foreground disabled:cursor-not-allowed disabled:opacity-55"
                        >
                          <span>{t('app.exportJson')}</span>
                          <Download size={14} className="text-muted-foreground" />
                        </button>
                      )}
                      {skillDocument && (
                        <button
                          onClick={exportReviewReport}
                          disabled={!canExportArtifacts}
                          className="editorial-action-button px-3 py-2 text-sm text-foreground disabled:cursor-not-allowed disabled:opacity-55"
                        >
                          <span>{t('app.exportReviewReport')}</span>
                          <Download size={14} className="text-muted-foreground" />
                        </button>
                      )}
                      <button
                        onClick={exportReviewPacket}
                        disabled={!canExportArtifacts}
                        className="editorial-action-button px-3 py-2 text-sm text-foreground disabled:cursor-not-allowed disabled:opacity-55"
                      >
                        <span>{t('app.exportReviewPacket')}</span>
                        <Download size={14} className="text-muted-foreground" />
                      </button>
                      <button
                        onClick={handleResetWorkspace}
                        className="editorial-action-button px-3 py-2 text-sm text-foreground"
                      >
                        <span>{t('app.resetWorkspace')}</span>
                        <RefreshCw size={14} className="text-muted-foreground" />
                      </button>
                      {modifiedPaths.size > 0 && (
                        <button
                          onClick={onUndo}
                          className="inline-flex items-center justify-between rounded-xl border border-amber-500/25 bg-amber-500/8 px-3 py-2 text-sm text-amber-700 transition hover:bg-amber-500/12"
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

            <div className="surface-panel-muted p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="editorial-kicker">{t('app.currentFocus')}</p>
                <span className="editorial-chip px-2.5 py-1 text-[11px] font-mono text-muted-foreground">
                  {executionPaths.length > 0 ? `${executionPaths.length} ${t('app.executionPaths')}` : '--'}
                </span>
              </div>
              <div className="text-pretty-wrap mt-3 text-sm font-medium text-foreground">
                {data?.parserResult?.meta?.title || data?.parserResult?.meta?.name || '--'}
              </div>
              <p className="text-pretty-wrap mt-2 text-xs leading-5 text-muted-foreground">{t('app.parserBoardHint')}</p>
            </div>

            <div className="surface-panel-muted p-4 sm:hidden">
              <div className="flex items-center justify-between gap-3">
                <p className="editorial-kicker">{t('app.bridgeMode')}</p>
                <span className={`editorial-chip px-2.5 py-1 text-[11px] font-medium ${
                  bridgeStatus?.mode === 'skill-0'
                    ? 'bg-emerald-500/10 text-emerald-700'
                    : bridgeStatus?.mode === 'standalone'
                      ? 'bg-amber-500/10 text-amber-700'
                      : 'bg-background/70 text-muted-foreground'
                }`}>
                  {bridgeModeLabel}
                </span>
              </div>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">{bridgeModeDetail}</p>
            </div>

            <div
              data-testid="review-readiness-banner"
              className={`surface-panel-muted p-4 ${reviewReadinessStyles}`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle size={15} className="shrink-0" />
                  <p className="editorial-kicker text-current/80">{t('app.reviewEvidenceStatus')}</p>
                </div>
                <span className="editorial-chip px-2.5 py-1 text-[11px] font-medium text-current">
                  {reviewReadinessLabel}
                </span>
              </div>
              <p className="mt-2 text-xs leading-5 text-current/80">{bridgeReviewGuidance}</p>
            </div>
          </div>
        </aside>

        <section className="min-w-0 space-y-5">
          {!isWorkspaceFocusMode && (
            <Suspense fallback={<PanelFallback heightClassName="min-h-[220px]" />}>
              <Dashboard data={data} onNavigatePhase={(id) => { setActiveTab('pipeline'); setActivePhase(id); }} modifiedPaths={modifiedPaths} />
            </Suspense>
          )}

          <div className="glass-panel-strong relative overflow-hidden px-5 py-5 sm:px-6">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/45 to-transparent" />
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(18rem,0.8fr)]">
              <div>
                {!isWorkspaceFocusMode && (
                  <>
                    <p className="editorial-kicker">{t('app.analysisResult')}</p>
                    <div className="mt-3 flex flex-wrap items-center gap-2.5">
                      <span className="editorial-chip px-3 py-1 text-[11px] font-mono uppercase tracking-[0.24em] text-muted-foreground">
                        {t('app.project')}: {data.projectId}
                      </span>
                      <span className="editorial-chip px-3 py-1 text-[11px] text-muted-foreground">
                        {t('app.parserVersion')}: {data?.parserResult?.meta?.parser_version || '--'}
                      </span>
                      {parserManifest && (
                        <span className="editorial-chip px-3 py-1 text-[11px] text-muted-foreground">
                          {t('app.analysisLevel')}: {parserManifest.analysis_level}
                        </span>
                      )}
                    </div>
                  </>
                )}
                <div
                  className={`${isWorkspaceFocusMode ? '' : 'mt-4'} group flex w-fit cursor-pointer items-center gap-2`}
                  onClick={() => setEditorConfig({ type: 'global', payload: data })}
                  title={t('editor.editGlobal')}
                >
                  <h2 className={`display-serif text-[2.3rem] leading-none sm:text-[2.8rem] ${modifiedPaths.has('projectName') ? 'text-amber-600' : 'text-foreground'}`}>
                    {data.projectName}
                  </h2>
                  <Edit2 size={16} className="text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                </div>
                <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">{bridgeReviewGuidance}</p>
              </div>

              <div data-testid="review-decision-panel" className="surface-panel-muted px-4 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="editorial-kicker">{t('app.reviewDecisionPanel')}</p>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">{t('app.reviewPacketHint')}</p>
                  </div>
                  <span className="editorial-chip px-3 py-1 text-[11px] font-medium text-foreground">
                    {reviewStatusLabel}
                  </span>
                </div>
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  <MiniMetric label={t('app.reviewerName')} value={reviewerName.trim() || t('app.reviewerUnassigned')} highlight={Boolean(reviewerName.trim())} />
                  <MiniMetric label={t('app.validationEvidence')} value={validationStatusLabel} highlight={!validationHasErrors} />
                  <MiniMetric label={t('app.bridgeMode')} value={bridgeModeSummary} highlight={bridgeStatus?.mode === 'skill-0'} />
                  <MiniMetric label={t('app.equivalenceStatus')} value={reviewEquivalenceLabel} highlight={reviewEquivalenceLabel === t('app.equivalenceImplementationIdentity')} />
                </div>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  <MiniMetric label={t('app.handoffState')} value={handoffSummary} highlight={effectiveHandoffState === 'approved_for_export'} />
                  <MiniMetric label={t('app.reviewProfile')} value={reviewProfileSummary} highlight />
                </div>
                {reviewerNotes.trim() && (
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">{reviewerNotes.trim()}</p>
                )}
              </div>
            </div>

            <div data-testid="review-truth-banner" className={`surface-panel-muted mt-4 px-4 py-4 ${bridgeToneClass}`}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle size={15} className="shrink-0" />
                  <p className="editorial-kicker text-current/80">{t('app.reviewTruthPanel')}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-[11px]">
                  <span className="editorial-chip px-3 py-1 font-medium">{bridgeModeSummary}</span>
                  <span className="editorial-chip px-3 py-1 font-medium">
                    {t('app.reviewEvidenceStatus')}: {reviewReadinessLabel}
                  </span>
                  <span className="editorial-chip px-3 py-1 font-medium">
                    {t('app.equivalenceStatus')}: {reviewEquivalenceLabel}
                  </span>
                  <span className="editorial-chip px-3 py-1 font-medium">
                    {t('app.handoffState')}: {handoffSummary}
                  </span>
                </div>
              </div>
              <p className="mt-2 text-xs leading-5 text-current/75">{t('app.bridgeSource')}: {bridgeModeDetail}</p>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
              <StatPill label={t('app.totalActions')} value={String(parserActions.length)} />
              <StatPill label={t('app.totalRules')} value={String(parserRules.length)} />
              <StatPill label={t('app.totalDirectives')} value={String(parserDirectives.length)} accent={parserDirectives.length > 8 ? 'warn' : 'default'} />
              <StatPill label={t('app.supportingFiles')} value={String(parserSupportingFiles.length)} />
              <StatPill label={t('app.commandReferences')} value={String(parserCommandReferences.length)} accent={parserCommandReferences.length > 0 ? 'warn' : 'default'} />
              <StatPill label={t('app.analysisFindings')} value={String(parserAnalysisFindings.length)} accent={parserAnalysisFindings.length > 0 ? 'danger' : 'default'} />
            </div>
          </div>

          <div className="glass-panel px-4 py-4 sm:px-5">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <p className="editorial-kicker">{t('app.workspaceViews')}</p>
                <p className="mt-2 text-sm text-muted-foreground">{t('app.phaseFlowHint')}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {isWorkspaceFocusMode && (
                  <button
                    type="button"
                    onClick={() => setIsWorkspaceFocusMode(false)}
                    className="editorial-button-secondary px-4 py-2 text-xs font-medium"
                  >
                    {t('app.returnToOverview')}
                  </button>
                )}
                <div className="segment-control">
                  {workspaceTabs.map((view) => (
                    <button
                      key={view.id}
                      onClick={() => {
                        setActiveTab(view.id);
                        setIsWorkspaceFocusMode(true);
                      }}
                      className={`segment-control__button px-4 py-2 text-xs font-medium transition-all ${
                        activeTab === view.id
                          ? 'segment-control__button--active'
                          : 'text-muted-foreground'
                      }`}
                    >
                      {view.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <AnimatePresence mode="wait">
            {activeTab === 'pipeline' && (
              <motion.div
                key="pipeline"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-7"
              >
                <Suspense fallback={<PanelFallback heightClassName="min-h-[240px]" />}>
                  <DecompositionBoard
                    parserResult={data.parserResult}
                    supportFiles={supportFiles}
                    selectedContextPath={selectedContextPath}
                    onSelectContext={onSelectContextPath}
                  />
                </Suspense>

                <InsightBlock
                  id="derived-workflow-panel"
                  kicker={t('flowchart.pipeline')}
                  title={t('app.derivedWorkflow')}
                  summary={t('app.derivedWorkflowHint')}
                  isOpen={isDerivedWorkflowOpen}
                  onToggle={() => setIsDerivedWorkflowOpen((current) => !current)}
                >
                  <div className="space-y-6">
                    <FlowStepper phases={data.phases} activePhase={activePhase} onSelectPhase={(id) => { setActiveTab('pipeline'); setActivePhase(id); }} />

	                    <div className="grid gap-6 xl:grid-cols-[minmax(18rem,22rem)_minmax(0,1fr)]">
	                      <div className="glass-panel px-3 py-4 sm:px-4 xl:min-h-[640px]">
                        <div className="flex items-center justify-between px-3 pb-2">
                          <div>
                            <p className="editorial-kicker">{t('flowchart.pipeline')}</p>
                            <h3 className="mt-2 text-lg font-semibold tracking-tight text-foreground">{t('app.flowSequence')}</h3>
                          </div>
                          <span className="editorial-chip px-2.5 py-1 text-[11px] font-mono text-muted-foreground">
                            {activePhase ?? '--'}
                          </span>
                        </div>
	                        <div className="custom-scrollbar pr-1 xl:max-h-[70vh] xl:overflow-y-auto">
	                          <Flowchart phases={data.phases} activePhase={activePhase} onSelectPhase={setActivePhase} />
	                        </div>
	                      </div>

	                      <div className="xl:min-h-[640px]">
	                        {activePhaseData ? (
	                          <Suspense fallback={<PanelFallback heightClassName="xl:min-h-[640px]" />}>
	                            <PhaseDetails
	                              phase={activePhaseData}
	                              allPhases={data.phases}
                              onNavigatePhase={setActivePhase}
                              onClose={() => setActivePhase(null)}
                              onEditPhase={(phaseData) => setEditorConfig({ type: 'phase', payload: phaseData, phaseId: phaseData.id })}
                              onEditDecision={(node) => setEditorConfig({ type: 'decision', payload: node, phaseId: activePhaseData.id })}
                              modifiedPaths={modifiedPaths}
	                            />
	                          </Suspense>
	                        ) : (
	                          <div className="glass-panel flex items-center justify-center p-10 text-center xl:min-h-[640px]">
	                            <div className="max-w-sm space-y-3">
	                              <p className="editorial-kicker">{t('app.detailsPanel')}</p>
	                              <h3 className="text-2xl font-semibold tracking-tight text-foreground">{t('app.noActivePhase')}</h3>
                              <p className="text-sm leading-6 text-muted-foreground">{t('app.selectPhaseHint')}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </InsightBlock>
              </motion.div>
            )}

            {activeTab === 'vector' && (
              <motion.div key="vector" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                <div className="glass-panel overflow-hidden p-3 sm:p-4">
                  <Suspense fallback={<PanelFallback heightClassName="min-h-[420px]" />}>
                    <VectorSpace data={data} darkMode={darkMode} />
                  </Suspense>
                </div>
              </motion.div>
            )}

            {activeTab === 'matrix' && (
              <motion.div key="matrix" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                <div className="glass-panel overflow-hidden p-3 sm:p-4">
                  <Suspense fallback={<PanelFallback heightClassName="min-h-[420px]" />}>
                    <SecurityMatrix data={data} />
                  </Suspense>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        <aside className="order-last 2xl:sticky 2xl:top-28 2xl:self-start">
          <div className="space-y-4">
            <div className="glass-panel p-3">
              <div className="segment-control">
                {insightTabs.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveInsightTab(tab.id)}
                    className={`segment-control__button flex-1 px-3 py-2 text-left transition ${
                      activeInsightTab === tab.id
                        ? 'segment-control__button--active'
                        : 'text-muted-foreground'
                    }`}
                  >
                    <div className="text-[10px] font-semibold uppercase tracking-[0.18em]">{tab.id}</div>
                    <div className="mt-1 text-sm font-medium">{tab.label}</div>
                    <div className="mt-1 text-[11px] opacity-75">{tab.meta}</div>
                  </button>
                ))}
              </div>
            </div>

            {activeInsightTab === 'review' && (
              <>
                <InsightBlock
                  kicker={t('app.detailsPanel')}
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
                    <div className="rounded-[1.15rem] border border-border/60 bg-background/76 px-3 py-3 text-sm leading-6 text-muted-foreground">
                      <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{t('app.nextAction')}</div>
                      <p className="mt-2 font-medium text-foreground">{nextActionLabel}</p>
                      <p className="mt-1 text-sm leading-6 text-muted-foreground">{handoffGuidance}</p>
                    </div>
                    {reviewDraftSavedAt && (
                      <div
                        data-testid="review-draft-status"
                        className="rounded-[1.05rem] border border-border/55 bg-background/68 px-3 py-3 text-sm text-foreground backdrop-blur-xl"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">{t('app.localDraft')}</div>
                            <div className="mt-1 font-medium">
                              {reviewDraftRestored ? t('app.localDraftRestored') : t('app.localDraftAutosaved')}
                            </div>
                          </div>
                          <div className="text-xs font-mono text-muted-foreground">{formatDraftTimestamp(reviewDraftSavedAt)}</div>
                        </div>
                      </div>
                    )}
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
                            className="w-full rounded-[1.05rem] border border-border/60 bg-background/76 px-3 py-3 text-sm text-foreground outline-none transition focus:border-primary/40"
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
                            className="w-full rounded-[1.05rem] border border-border/60 bg-background/76 px-3 py-3 text-sm text-foreground outline-none transition focus:border-primary/40"
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
                          className="w-full rounded-[1.05rem] border border-border/60 bg-background/76 px-3 py-3 text-sm text-foreground outline-none transition focus:border-primary/40"
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
                          className="min-h-20 w-full resize-none rounded-[1.15rem] border border-border/60 bg-background/76 px-3 py-3 text-sm leading-6 text-foreground outline-none transition focus:border-primary/40"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <textarea
                        value={reviewSummaryDraft}
                        onChange={(event) => setReviewSummaryDraft(event.target.value)}
                        placeholder={t('app.reviewSummaryPlaceholder')}
                        className="min-h-24 w-full resize-none rounded-[1.15rem] border border-border/60 bg-background/76 px-3 py-3 text-sm leading-6 text-foreground outline-none transition focus:border-primary/40"
                      />
                      <input
                        type="text"
                        value={reviewerSignoff}
                        onChange={(event) => setReviewerSignoff(event.target.value)}
                        placeholder={t('app.reviewerSignoffPlaceholder')}
                        className="w-full rounded-[1.05rem] border border-border/60 bg-background/76 px-3 py-3 text-sm text-foreground outline-none transition focus:border-primary/40"
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
                        className="rounded-[1.15rem] border border-border/60 bg-background/76 px-3 py-3 text-left text-sm text-foreground backdrop-blur-xl transition hover:border-primary/35"
                      >
                        {t('app.returnToDraft')}
                      </button>
                      <button
                        type="button"
                        onClick={() => updateReviewStatus('in_review')}
                        className="rounded-[1.15rem] border border-border/60 bg-background/76 px-3 py-3 text-left text-sm text-foreground backdrop-blur-xl transition hover:border-primary/35"
                      >
                        {t('app.markInReview')}
                      </button>
                      <button
                        type="button"
                        onClick={() => updateReviewStatus('approved')}
                        className="rounded-[1.15rem] border border-border/60 bg-background/76 px-3 py-3 text-left text-sm text-foreground backdrop-blur-xl transition hover:border-primary/35"
                      >
                        {t('app.markApproved')}
                      </button>
                      <button
                        type="button"
                        onClick={() => updateReviewStatus('changes_requested')}
                        className="rounded-[1.15rem] border border-border/60 bg-background/76 px-3 py-3 text-left text-sm text-foreground backdrop-blur-xl transition hover:border-primary/35"
                      >
                        {t('app.requestChanges')}
                      </button>
                    </div>
                    <div className={`rounded-[1.15rem] border px-3 py-3 text-sm leading-6 ${
                      canExportArtifacts
                        ? 'border-emerald-500/25 bg-emerald-500/8 text-emerald-900'
                        : 'border-amber-500/25 bg-amber-500/8 text-amber-900'
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
                      <div className="rounded-[1.25rem] border border-border/55 bg-background/72 px-4 py-3 text-sm leading-6 text-muted-foreground backdrop-blur-xl">
                        {t('app.reviewDecisionLogEmpty')}
                      </div>
                    )}
                  </div>
                </InsightBlock>

                <InsightBlock
                  kicker={t('app.detailsPanel')}
                  title={t('app.reviewerNotes')}
                  summary={globalNotes.length + elementNotes.length > 0 ? `${globalNotes.length + elementNotes.length} ${t('app.notesCount')}` : t('app.reviewerNotesIdleShort')}
                  defaultOpen
                >
                  <div className="space-y-3">
                    <select
                      value={noteTarget}
                      onChange={(event) => setNoteTarget(event.target.value)}
                      className="w-full rounded-[1.1rem] border border-border/60 bg-background/76 px-3 py-3 text-sm text-foreground outline-none transition focus:border-primary/40"
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
                      className="min-h-28 w-full resize-none rounded-[1.2rem] border border-border/60 bg-background/76 px-3 py-3 text-sm leading-6 text-foreground outline-none transition focus:border-primary/40"
                    />
                    <button
                      type="button"
                      onClick={addReviewNote}
                      disabled={!noteDraft.trim()}
                      className="w-full rounded-[1.1rem] bg-primary px-4 py-3 text-sm font-medium text-primary-foreground transition hover:bg-primary/92 disabled:cursor-not-allowed disabled:opacity-55"
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
                      <div className="rounded-[1.25rem] border border-border/55 bg-background/72 px-4 py-3 text-sm leading-6 text-muted-foreground backdrop-blur-xl">
                        {t('app.reviewerNotesIdle')}
                      </div>
                    )}
                  </div>
                </InsightBlock>

                <InsightBlock
                  kicker={t('app.detailsPanel')}
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
                    <div className="rounded-[1.25rem] border border-border/55 bg-background/72 px-4 py-3 text-sm leading-6 text-muted-foreground backdrop-blur-xl">
                      {t('app.diffSummaryUnavailable')}
                    </div>
                  )}
                </InsightBlock>
              </>
            )}

            {activeInsightTab === 'checks' && (
              <>
                <InsightBlock
                  kicker={t('app.detailsPanel')}
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

                <InsightBlock
                  kicker={t('app.detailsPanel')}
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
                              <div key={`${issue.code}-${issue.path}`} className="rounded-[1.25rem] border border-border/55 bg-background/72 px-4 py-3 text-sm leading-6 text-muted-foreground backdrop-blur-xl">
                                <div className="flex items-center justify-between gap-3">
                                  <span className="font-medium text-foreground">{issue.code}</span>
                                  <span className={`rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${
                                    issue.severity === 'error'
                                      ? 'bg-destructive/12 text-destructive'
                                      : 'bg-amber-500/12 text-amber-700'
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
                                    className="mt-3 inline-flex items-center rounded-full border border-border/60 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground transition hover:border-primary/35 hover:text-foreground"
                                  >
                                    {t('app.openIssueInEditor')}
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="rounded-[1.25rem] border border-emerald-500/20 bg-emerald-500/8 px-4 py-3 text-sm leading-6 text-emerald-800">
                          {t('app.validationNoIssues')}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="rounded-[1.25rem] border border-border/55 bg-background/72 px-4 py-3 text-sm leading-6 text-muted-foreground backdrop-blur-xl">
                      {t('app.validationUnavailable')}
                    </div>
                  )}
                </InsightBlock>

                <InsightBlock
                  kicker={t('app.detailsPanel')}
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
                              <div key={`${issue.type}-${issue.targetId || index}`} className="rounded-[1.25rem] border border-border/55 bg-background/72 px-4 py-3 text-sm leading-6 text-muted-foreground backdrop-blur-xl">
                                <div className="flex items-center justify-between gap-3">
                                  <span className="font-medium text-foreground">{issue.type}</span>
                                  <span className={`rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${
                                    issue.severity === 'error'
                                      ? 'bg-destructive/12 text-destructive'
                                      : 'bg-amber-500/12 text-amber-700'
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
                                    className="mt-3 inline-flex items-center rounded-full border border-border/60 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground transition hover:border-primary/35 hover:text-foreground"
                                  >
                                    {t('app.openIssueInEditor')}
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="rounded-[1.25rem] border border-emerald-500/20 bg-emerald-500/8 px-4 py-3 text-sm leading-6 text-emerald-800">
                          {t('app.consistencyNoIssues')}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="rounded-[1.25rem] border border-border/55 bg-background/72 px-4 py-3 text-sm leading-6 text-muted-foreground backdrop-blur-xl">
                      {t('app.consistencyUnavailable')}
                    </div>
                  )}
                </InsightBlock>

                <InsightBlock
                  kicker={t('app.detailsPanel')}
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
                        className="rounded-[1.15rem] border border-border/60 bg-background/76 px-3 py-3 text-left text-sm text-foreground backdrop-blur-xl transition hover:border-primary/35 disabled:cursor-not-allowed disabled:opacity-55"
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
                        className="rounded-[1.15rem] border border-border/60 bg-background/76 px-3 py-3 text-left text-sm text-foreground backdrop-blur-xl transition hover:border-primary/35 disabled:cursor-not-allowed disabled:opacity-55"
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
                        className="rounded-[1.15rem] border border-border/60 bg-background/76 px-3 py-3 text-left text-sm text-foreground backdrop-blur-xl transition hover:border-primary/35 disabled:cursor-not-allowed disabled:opacity-55"
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
                      <div className="rounded-[1.25rem] border border-border/55 bg-background/72 px-4 py-3 text-sm leading-6 text-muted-foreground backdrop-blur-xl">
                        {t('app.reviewerTestsIdle')}
                      </div>
                    )}
                  </div>
                </InsightBlock>

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
                          <div className="rounded-[1.25rem] border border-amber-500/25 bg-amber-500/8 p-3 text-sm leading-6 text-amber-900">
                            {validationEvidence.evidenceWarnings.map((warning) => (
                              <p key={warning}>{t(warning)}</p>
                            ))}
                          </div>
                        )}

                        {validationEvidence.validationRun.errors.length > 0 && (
                          <div className="rounded-[1.25rem] border border-border/55 bg-background/72 p-3 backdrop-blur-xl">
                            <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                              {t('app.validationIssues')}
                            </div>
                            <div className="mt-3 space-y-2">
                              {validationEvidence.validationRun.errors.map((issue) => (
                                <div key={`${issue.code}-${issue.path}`} className="rounded-[1rem] border border-border/45 bg-white/65 px-3 py-2 text-xs leading-6 text-muted-foreground">
                                  <div className="font-medium text-foreground">{translateEvidenceMessage(issue.message)}</div>
                                  <div>{issue.path}</div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {validationEvidence.consistencyRun.issues.length > 0 && (
                          <div className="rounded-[1.25rem] border border-border/55 bg-background/72 p-3 backdrop-blur-xl">
                            <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                              {t('app.consistencyIssues')}
                            </div>
                            <div className="mt-3 space-y-2">
                              {validationEvidence.consistencyRun.issues.map((issue, index) => (
                                <div key={`${issue.type}-${issue.targetId || index}`} className="rounded-[1rem] border border-border/45 bg-white/65 px-3 py-2 text-xs leading-6 text-muted-foreground">
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
                            <div className="rounded-[1.25rem] border border-emerald-500/20 bg-emerald-500/8 px-4 py-3 text-sm leading-6 text-emerald-900">
                              {t('app.validationNoIssues')}
                            </div>
                        )}
                      </>
                    ) : (
                      <div className="rounded-[1.25rem] border border-border/55 bg-background/72 px-4 py-3 text-sm leading-6 text-muted-foreground backdrop-blur-xl">
                        {t('app.validationUnavailable')}
                      </div>
                    )}
                  </div>
                </InsightBlock>
              </>
            )}

            {activeInsightTab === 'context' && (
              <>
                <InsightBlock
                  kicker={t('app.projectSummary')}
                  title={t('app.contextLayers')}
                  summary={`${contextSummary.length} ${t('app.contextBuckets')}`}
                  defaultOpen
                >
                  <div className="grid gap-2 sm:grid-cols-2">
                    {contextSummary.map((item) => (
                      <div key={item.id} className="rounded-[1.15rem] border border-border/55 bg-background/72 px-3 py-3">
                        <div className="flex items-center justify-between gap-3">
                          <div className="text-sm font-medium text-foreground">{item.label}</div>
                          <span className={`rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${
                            item.status === 'blocked'
                              ? 'bg-destructive/12 text-destructive'
                              : item.status === 'attention'
                                ? 'bg-amber-500/12 text-amber-700'
                                : 'bg-emerald-500/12 text-emerald-700'
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
                          <div key={`${reference.command || reference.id || index}`} className="rounded-[1.15rem] border border-border/55 bg-background/72 px-4 py-3 text-sm leading-6 text-muted-foreground">
                            <div className="font-medium text-foreground">{reference.command || reference.label || reference.id || `reference-${index + 1}`}</div>
                            {(reference.detail || reference.path) && (
                              <p className="mt-1">{reference.detail || reference.path}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-[1.25rem] border border-border/55 bg-background/72 px-4 py-3 text-sm leading-6 text-muted-foreground backdrop-blur-xl">
                        {t('app.contextPolicyReferenceEmpty')}
                      </div>
                    )}
                  </div>
                </InsightBlock>

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
                        className={`w-full rounded-[1.25rem] border px-4 py-3 text-left backdrop-blur-xl transition ${
                          selectedContextPath === file.path ? 'border-primary/35 bg-primary/8' : 'border-border/55 bg-background/72'
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
                      <div className="rounded-[1.25rem] border border-border/55 bg-background/72 px-4 py-3 text-sm leading-6 text-muted-foreground backdrop-blur-xl">
                        {t('app.noContextFiles')}
                      </div>
                    )}
                  </div>
                </InsightBlock>

                <InsightBlock
                  kicker={t('app.contextBucketAnalysisFindings')}
                  title={t('app.contextBucketAnalysisFindings')}
                  summary={firstFinding ? firstFinding.ruleName : `${parserAnalysisFindings.length} ${t('app.analysisFindings')}`}
                  accent={firstFinding ? 'rose' : parserAnalysisFindings.length > 0 ? 'default' : 'emerald'}
                >
                  {firstFinding || operatorReminders.length > 0 || parserAnalysisFindings.length > 0 ? (
                    <div className="space-y-3">
                      {firstFinding && (
                        <div className="rounded-[1.25rem] border border-border/55 bg-background/72 p-3 backdrop-blur-xl">
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-sm font-medium text-foreground">{firstFinding.ruleName}</p>
                            <span className="rounded-full bg-destructive/10 px-2 py-1 text-[11px] font-medium text-destructive">
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
                            <div key={`${finding.id || finding.code || index}`} className="rounded-[1rem] border border-border/45 bg-white/65 px-3 py-3">
                              <div className="text-sm font-medium text-foreground">{finding.label || finding.title || finding.code || `finding-${index + 1}`}</div>
                              {(finding.detail || finding.message) && (
                                <p className="mt-2 text-xs leading-6 text-muted-foreground">{finding.detail || finding.message}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                      {operatorReminders.length > 0 && (
                        <div className="rounded-[1.25rem] border border-border/55 bg-background/72 p-3 backdrop-blur-xl">
                          <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                            {t('app.operatorReminders')}
                          </div>
                          <div className="mt-3 space-y-3">
                            {operatorReminders.map((reminder: any) => (
                              <div key={reminder.id} className="rounded-[1rem] border border-border/45 bg-white/65 px-3 py-3">
                                <div className="flex items-center justify-between gap-3">
                                  <div className="text-sm font-medium text-foreground">{reminder.label}</div>
                                  <span className={`rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${
                                    reminder.level === 'high'
                                      ? 'bg-destructive/12 text-destructive'
                                      : reminder.level === 'medium'
                                        ? 'bg-amber-500/12 text-amber-700'
                                        : 'bg-background/70 text-muted-foreground'
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
                    <div className="rounded-[1.25rem] border border-border/55 bg-background/72 px-4 py-3 text-sm leading-6 text-muted-foreground backdrop-blur-xl">
                      {t('securityMatrix.auditLogSummaryText')}
                    </div>
                  )}
                </InsightBlock>

                <InsightBlock
                  kicker={t('app.contextBucketSourceProvenance')}
                  title={t('app.contextBucketSourceProvenance')}
                  summary={bridgeModeSummary}
                >
                  <div className="space-y-3">
                    {parserManifest && (
                      <div className="rounded-[1.25rem] border border-border/55 bg-background/72 px-4 py-3 text-sm leading-6 text-muted-foreground backdrop-blur-xl">
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

                <InsightBlock kicker={t('app.sourceLinks')} title={t('app.projectSummary')} summary="GitHub">
                  <div className="space-y-2">
                    <a
                      href={guiRepoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between rounded-[1.25rem] border border-border/55 bg-background/72 px-4 py-3 text-sm text-foreground backdrop-blur-xl transition hover:border-primary/30"
                    >
                      <span>{t('app.guiRepo')}</span>
                      <Github size={15} className="text-muted-foreground" />
                    </a>
                    <a
                      href={engineRepoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between rounded-[1.25rem] border border-border/55 bg-background/72 px-4 py-3 text-sm text-foreground backdrop-blur-xl transition hover:border-primary/30"
                    >
                      <span>{t('app.engineRepo')}</span>
                      <FileCode2 size={15} className="text-muted-foreground" />
                    </a>
                  </div>
                </InsightBlock>
              </>
            )}
          </div>
        </aside>
      </motion.div>

      <Suspense fallback={null}>
        <SideEditor
          config={editorConfig}
          onClose={() => setEditorConfig(null)}
          onSave={(updatedData) => {
            if (!editorConfig) {
              return;
            }
            onSaveEdit(editorConfig, updatedData);
            setEditorConfig(null);
          }}
        />
      </Suspense>
    </>
  );
}

function PanelFallback({ heightClassName = 'min-h-[200px]' }: { heightClassName?: string }) {
  const { t } = useTranslation();

  return (
    <div className={`flex items-center justify-center rounded-[1.25rem] border border-border/55 bg-background/72 px-4 py-6 text-sm text-muted-foreground backdrop-blur-xl ${heightClassName}`}>
      {t('app.loadingWorkspaceModule')}
    </div>
  );
}

function StatPill({ label, value, accent = 'default' }: { label: string; value: string; accent?: 'default' | 'warn' | 'danger' }) {
  const accentClass = accent === 'warn'
    ? 'border-amber-500/25 bg-amber-500/10 text-amber-700'
    : accent === 'danger'
      ? 'border-destructive/20 bg-destructive/8 text-destructive'
      : 'border-border/55 bg-background/72 text-foreground';

  return (
    <div className={`rounded-[1.2rem] border px-4 py-3 shadow-[0_14px_30px_-28px_hsl(var(--foreground)/0.4)] backdrop-blur-xl ${accentClass}`}>
      <div className="text-[10px] font-semibold uppercase tracking-[0.22em] opacity-70">{label}</div>
      <div className="mt-2 text-xl font-semibold tracking-tight">{value}</div>
    </div>
  );
}

function MiniMetric({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded-[1.2rem] border px-3 py-3 backdrop-blur-xl ${highlight ? 'border-amber-500/25 bg-amber-500/10' : 'border-border/55 bg-background/72'}`}>
      <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">{label}</div>
      <div className={`mt-2 text-sm font-medium leading-6 ${highlight ? 'text-amber-700' : 'text-foreground'}`}>{value}</div>
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
    <div className={`rounded-[1.25rem] border px-4 py-3 backdrop-blur-xl ${runStatusClassName(status)}`}>
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
    <div className="rounded-[1.25rem] border border-border/55 bg-background/72 px-4 py-3 backdrop-blur-xl">
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
    <div className="rounded-[1.25rem] border border-border/55 bg-background/72 px-4 py-3 backdrop-blur-xl">
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
    <div className="rounded-[1.25rem] border border-border/55 bg-background/72 px-4 py-3 backdrop-blur-xl">
      <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">{title}</div>
      {items.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {items.map((item) => (
            <span key={`${title}-${item}`} className="rounded-full border border-border/50 bg-white/70 px-3 py-1 text-[11px] text-foreground">
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
    return 'border-destructive/20 bg-destructive/8';
  }
  if (status === 'passed') {
    return 'border-emerald-500/20 bg-emerald-500/8';
  }
  return 'border-border/55 bg-background/72';
}

function runStatusBadgeClassName(status: 'running' | 'passed' | 'failed') {
  if (status === 'failed') {
    return 'bg-destructive/12 text-destructive';
  }
  if (status === 'passed') {
    return 'bg-emerald-500/12 text-emerald-700';
  }
  return 'bg-background/70 text-muted-foreground';
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
  bridgeMode: BridgeStatus['mode'] | 'unknown';
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
      className={`rounded-[1.05rem] border px-3 py-3 text-left text-sm transition ${
        checked
          ? 'border-emerald-500/30 bg-emerald-500/10 text-foreground'
          : 'border-border/60 bg-background/76 text-foreground'
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

function FlowStepper({ phases, activePhase, onSelectPhase }: { phases: any[]; activePhase: string | null; onSelectPhase: (phaseId: string) => void }) {
  const { t } = useTranslation();

  return (
    <div className="glass-panel px-4 py-4 sm:px-5">
      <div>
        <p className="editorial-kicker">{t('app.flowSequence')}</p>
        <p className="mt-2 text-sm text-muted-foreground">{t('app.phaseFlowHint')}</p>
      </div>
      <div className="custom-scrollbar mt-4 flex gap-3 overflow-x-auto pb-1">
        {phases.map((phase: any, index: number) => {
          const isActive = phase.id === activePhase;
          return (
            <button key={phase.id} onClick={() => onSelectPhase(phase.id)} className={`flow-step-card min-w-[190px] ${isActive ? 'flow-step-card--active' : ''}`}>
              <div className="flex items-center justify-between gap-3">
                <span className="text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                  {t('app.phaseStep')} {index + 1}
                </span>
                <span className="rounded-full border border-border/50 bg-background/70 px-2 py-1 text-[10px] font-mono text-muted-foreground backdrop-blur-lg">
                  {phase.id}
                </span>
              </div>
              <div className="mt-3 text-sm font-medium leading-5 text-foreground">{phase.name}</div>
              <div className="mt-2 text-xs leading-5 text-muted-foreground">{phase.tasks.slice(0, 2).join(' · ')}</div>
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
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const isControlled = typeof controlledOpen === 'boolean';
  const isOpen = isControlled ? controlledOpen : internalOpen;
  const accentGlow = accent === 'emerald' ? 'before:bg-emerald-500/14' : accent === 'rose' ? 'before:bg-rose-500/14' : 'before:bg-primary/12';

  const handleToggle = () => {
    if (isControlled) {
      onToggle?.();
      return;
    }
    setInternalOpen((current) => !current);
  };

  return (
    <section id={id} className={`glass-panel relative overflow-hidden before:absolute before:right-0 before:top-0 before:h-24 before:w-24 before:rounded-bl-[2rem] before:blur-2xl ${accentGlow}`}>
      <div className="relative p-5">
        <button onClick={handleToggle} className="w-full text-left">
          <p className="editorial-kicker">{kicker}</p>
          <div className="mt-2 flex items-start justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold tracking-tight text-foreground">{title}</h3>
              {summary && <p className="mt-1 text-sm text-muted-foreground">{summary}</p>}
            </div>
            {isOpen ? <ChevronUp size={16} className="mt-1 text-muted-foreground" /> : <ChevronDown size={16} className="mt-1 text-muted-foreground" />}
          </div>
        </button>

        <AnimatePresence initial={false}>
          {isOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="mt-4">{children}</div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}
