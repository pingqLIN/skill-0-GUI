import React, { Suspense, lazy, useState } from 'react';
import {
  ShieldAlert,
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
import { extractSkillDocumentFromReviewData } from '../services/skillDocumentAdapter';
import { checkSkillDocumentConsistency } from '../services/skillDocumentConsistency';
import { validateSkillDocument } from '../services/skillDocumentValidation';
import type { UploadedContextFile } from '../types/intake';
import type { EditorConfig, WorkspaceTabId } from '../types/workspace';

const Dashboard = lazy(() => import('./Dashboard').then((module) => ({ default: module.Dashboard })));
const PhaseDetails = lazy(() => import('./PhaseDetails').then((module) => ({ default: module.PhaseDetails })));
const VectorSpace = lazy(() => import('./VectorSpace').then((module) => ({ default: module.VectorSpace })));
const SecurityMatrix = lazy(() => import('./SecurityMatrix').then((module) => ({ default: module.SecurityMatrix })));
const SideEditor = lazy(() => import('./SideEditor').then((module) => ({ default: module.SideEditor })));
const DecompositionBoard = lazy(() => import('./DecompositionBoard').then((module) => ({ default: module.DecompositionBoard })));

type ReviewWorkspaceProps = {
  data: any;
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
  const [isWorkspaceFocusMode, setIsWorkspaceFocusMode] = useState(false);
  const [isDerivedWorkflowOpen, setIsDerivedWorkflowOpen] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const [editorConfig, setEditorConfig] = useState<EditorConfig>(null);

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
    ? t('app.bridgeGuidanceCanonical')
    : bridgeStatus?.mode === 'standalone'
      ? t('app.bridgeGuidanceStandalone')
      : t('app.bridgeGuidanceUnavailable');
  const skillDocument = extractSkillDocumentFromReviewData(data);
  const validationResult = skillDocument ? validateSkillDocument(skillDocument) : null;
  const validationIssues = validationResult?.issues ?? [];
  const validationErrors = validationIssues.filter((issue) => issue.severity === 'error');
  const validationWarnings = validationIssues.filter((issue) => issue.severity === 'warning');
  const consistencyResult = skillDocument ? checkSkillDocumentConsistency(skillDocument) : null;
  const consistencyIssues = consistencyResult?.issues ?? [];
  const consistencyErrors = consistencyIssues.filter((issue) => issue.severity === 'error');
  const consistencyWarnings = consistencyIssues.filter((issue) => issue.severity === 'warning');
  const reviewMode = data?.reviewerSummary?.mode
    || (bridgeStatus?.mode === 'skill-0'
      ? 'canonical'
      : bridgeStatus?.mode === 'standalone'
        ? 'standalone'
        : 'unknown');
  const reviewEquivalenceStatus = data?.reviewerSummary?.equivalenceNote
    || (reviewMode === 'canonical' ? 'implementation_identity' : 'equivalence_unverified');
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

  const openDerivedWorkflow = () => {
    setActiveTab('pipeline');
    setIsDerivedWorkflowOpen(true);
    window.setTimeout(() => {
      document.getElementById('derived-workflow-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 80);
  };

  const convertSkillToMarkdown = (skillData: any) => {
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
        `- equivalence_status: ${reviewEquivalenceStatus}`,
        `- review_decision_guidance: ${reviewDecisionGuidance}`,
        `- schema_validation_status: ${validationResult?.valid ? 'valid' : 'invalid'}`,
        `- schema_validation_errors: ${validationErrors.length}`,
        `- schema_validation_warnings: ${validationWarnings.length}`,
        `- consistency_status: ${consistencyResult?.valid ? 'consistent' : 'inconsistent'}`,
        `- consistency_errors: ${consistencyErrors.length}`,
        `- consistency_warnings: ${consistencyWarnings.length}`,
        `- source: ${original.source || 'uploaded skill'}`,
        '',
      ];

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
      `- equivalence_status: ${reviewEquivalenceStatus}`,
      `- review_decision_guidance: ${reviewDecisionGuidance}`,
      `- schema_validation_status: ${validationResult?.valid ? 'valid' : 'invalid'}`,
      `- schema_validation_errors: ${validationErrors.length}`,
      `- schema_validation_warnings: ${validationWarnings.length}`,
      `- consistency_status: ${consistencyResult?.valid ? 'consistent' : 'inconsistent'}`,
      `- consistency_errors: ${consistencyErrors.length}`,
      `- consistency_warnings: ${consistencyWarnings.length}`,
      '',
    ];

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
    const blob = new Blob([convertSkillToMarkdown(data)], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${data.projectId}-${exportModeSuffix}.skill.md`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const exportSkillJson = () => {
    if (!skillDocument) {
      return;
    }

    const blob = new Blob([JSON.stringify(skillDocument, null, 2)], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${data.projectId}-${exportModeSuffix}.skill.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="grid gap-7 xl:grid-cols-[16rem_minmax(0,1fr)_20rem]">
        <aside className="xl:sticky xl:top-28 xl:self-start">
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

            <div className="rounded-[1.35rem] border border-border/50 bg-white/42 backdrop-blur-2xl">
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
                        className="inline-flex items-center justify-between rounded-xl border border-border/60 bg-background/76 px-3 py-2 text-sm text-foreground backdrop-blur-xl transition hover:border-primary/35"
                      >
                        <span>{t('app.openGlobalEditor')}</span>
                        <Edit2 size={14} className="text-muted-foreground" />
                      </button>
                      {skillDocument && (
                        <button
                          onClick={() => setEditorConfig({ type: 'skillDocument', payload: skillDocument })}
                          className="inline-flex items-center justify-between rounded-xl border border-border/60 bg-background/76 px-3 py-2 text-sm text-foreground backdrop-blur-xl transition hover:border-primary/35"
                        >
                          <span>{t('app.openStructuredEditor')}</span>
                          <Edit2 size={14} className="text-muted-foreground" />
                        </button>
                      )}
                      {skillDocument && (
                        <button
                          onClick={() => setEditorConfig({ type: 'skillDocument', payload: skillDocument })}
                          className="inline-flex items-center justify-between rounded-xl border border-border/60 bg-background/76 px-3 py-2 text-sm text-foreground backdrop-blur-xl transition hover:border-primary/35"
                        >
                          <span>{t('app.openStructuredEditor')}</span>
                          <Edit2 size={14} className="text-muted-foreground" />
                        </button>
                      )}
                      {skillDocument && (
                        <button
                          onClick={() => setEditorConfig({ type: 'json', payload: skillDocument })}
                          className="inline-flex items-center justify-between rounded-xl border border-border/60 bg-background/76 px-3 py-2 text-sm text-foreground backdrop-blur-xl transition hover:border-primary/35"
                        >
                          <span>{t('app.openJsonEditor')}</span>
                          <FileCode2 size={14} className="text-muted-foreground" />
                        </button>
                      )}
                      <button
                        onClick={exportSkill}
                        className="inline-flex items-center justify-between rounded-xl border border-border/60 bg-background/76 px-3 py-2 text-sm text-foreground backdrop-blur-xl transition hover:border-primary/35"
                      >
                        <span>{t('app.export')}</span>
                        <Download size={14} className="text-muted-foreground" />
                      </button>
                      {skillDocument && (
                        <button
                          onClick={exportSkillJson}
                          className="inline-flex items-center justify-between rounded-xl border border-border/60 bg-background/76 px-3 py-2 text-sm text-foreground backdrop-blur-xl transition hover:border-primary/35"
                        >
                          <span>{t('app.exportJson')}</span>
                          <Download size={14} className="text-muted-foreground" />
                        </button>
                      )}
                      <button
                        onClick={onResetWorkspace}
                        className="inline-flex items-center justify-between rounded-xl border border-border/60 bg-background/76 px-3 py-2 text-sm text-foreground backdrop-blur-xl transition hover:border-primary/35"
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

            <div className="rounded-[1.35rem] border border-border/50 bg-white/42 p-4 backdrop-blur-2xl">
              <div className="flex items-center justify-between gap-3">
                <p className="editorial-kicker">{t('app.currentFocus')}</p>
                <span className="rounded-full border border-border/55 bg-background/70 px-2.5 py-1 text-[11px] font-mono text-muted-foreground backdrop-blur-lg">
                  {executionPaths.length > 0 ? `${executionPaths.length} ${t('app.executionPaths')}` : '--'}
                </span>
              </div>
              <div className="text-pretty-wrap mt-3 text-sm font-medium text-foreground">
                {data?.parserResult?.meta?.title || data?.parserResult?.meta?.name || '--'}
              </div>
              <p className="text-pretty-wrap mt-2 text-xs leading-5 text-muted-foreground">{t('app.parserBoardHint')}</p>
            </div>

            <div className="rounded-[1.35rem] border border-border/50 bg-white/42 p-4 backdrop-blur-2xl sm:hidden">
              <div className="flex items-center justify-between gap-3">
                <p className="editorial-kicker">{t('app.bridgeMode')}</p>
                <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
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
          </div>
        </aside>

        <section className="min-w-0 space-y-7">
          {!isWorkspaceFocusMode && (
            <Suspense fallback={<PanelFallback heightClassName="min-h-[220px]" />}>
              <Dashboard data={data} onNavigatePhase={(id) => { setActiveTab('pipeline'); setActivePhase(id); }} modifiedPaths={modifiedPaths} />
            </Suspense>
          )}

          <div className="glass-panel-strong relative overflow-hidden px-5 py-5 sm:px-6">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/45 to-transparent" />
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div>
                {!isWorkspaceFocusMode && (
                  <>
                    <p className="editorial-kicker">{t('app.analysisResult')}</p>
                    <div className="mt-3 flex flex-wrap items-center gap-3">
                      <span className="rounded-full border border-border/55 bg-background/70 px-3 py-1 text-[11px] font-mono uppercase tracking-[0.24em] text-muted-foreground backdrop-blur-lg">
                        {t('app.project')}: {data.projectId}
                      </span>
                      <span className="rounded-full border border-border/55 bg-background/70 px-3 py-1 text-[11px] text-muted-foreground backdrop-blur-lg">
                        {t('app.parserVersion')}: {data?.parserResult?.meta?.parser_version || '--'}
                      </span>
                      {parserManifest && (
                        <span className="rounded-full border border-border/55 bg-background/70 px-3 py-1 text-[11px] text-muted-foreground backdrop-blur-lg">
                          {t('app.analysisLevel')}: {parserManifest.analysis_level}
                        </span>
                      )}
                      {modifiedPaths.size > 0 && (
                        <span className="rounded-full border border-amber-500/25 bg-amber-500/10 px-3 py-1 text-[11px] font-medium text-amber-700">
                          {modifiedPaths.size} {t('app.modifiedCount')}
                        </span>
                      )}
                    </div>
                  </>
                )}
                <div
                  className={`${isWorkspaceFocusMode ? '' : 'mt-4'} flex w-fit cursor-pointer items-center gap-2 group`}
                  onClick={() => setEditorConfig({ type: 'global', payload: data })}
                  title={t('editor.editGlobal')}
                >
                  <h2 className={`text-3xl font-semibold tracking-tight sm:text-[2.1rem] ${modifiedPaths.has('projectName') ? 'text-amber-600' : 'text-foreground'}`}>
                    {data.projectName}
                  </h2>
                  <Edit2 size={16} className="text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-6">
                <StatPill label={t('app.totalActions')} value={String(parserActions.length)} />
                <StatPill label={t('app.totalRules')} value={String(parserRules.length)} />
                <StatPill label={t('app.totalDirectives')} value={String(parserDirectives.length)} accent={parserDirectives.length > 8 ? 'warn' : 'default'} />
                <StatPill label={t('app.supportingFiles')} value={String(parserSupportingFiles.length)} />
                <StatPill label={t('app.commandReferences')} value={String(parserCommandReferences.length)} accent={parserCommandReferences.length > 0 ? 'warn' : 'default'} />
                <StatPill label={t('app.analysisFindings')} value={String(parserAnalysisFindings.length)} accent={parserAnalysisFindings.length > 0 ? 'danger' : 'default'} />
              </div>
            </div>
          </div>

          <div className="glass-panel px-4 py-4 sm:px-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="editorial-kicker">{t('app.workspaceViews')}</p>
                <p className="mt-2 text-sm text-muted-foreground">{t('app.phaseFlowHint')}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {isWorkspaceFocusMode && (
                  <button
                    type="button"
                    onClick={() => setIsWorkspaceFocusMode(false)}
                    className="rounded-xl border border-border/50 bg-background/76 px-4 py-2 text-xs font-medium text-foreground shadow-sm backdrop-blur-xl transition hover:border-primary/35 hover:text-primary"
                  >
                    {t('app.returnToOverview')}
                  </button>
                )}
                <div className="flex items-center gap-1 rounded-[1rem] border border-border/45 bg-white/46 p-1 backdrop-blur-xl">
                {workspaceTabs.map((view) => (
                  <button
                    key={view.id}
                    onClick={() => {
                      setActiveTab(view.id);
                      setIsWorkspaceFocusMode(true);
                    }}
                    className={`rounded-xl px-4 py-2 text-xs font-medium transition-all ${
                      activeTab === view.id
                        ? 'border border-border/50 bg-background/78 text-foreground shadow-sm backdrop-blur-xl'
                        : 'text-muted-foreground hover:bg-background/54 hover:text-foreground'
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
                      <div className="glass-panel min-h-[640px] px-3 py-4 sm:px-4">
                        <div className="flex items-center justify-between px-3 pb-2">
                          <div>
                            <p className="editorial-kicker">{t('flowchart.pipeline')}</p>
                            <h3 className="mt-2 text-lg font-semibold tracking-tight text-foreground">{t('app.flowSequence')}</h3>
                          </div>
                          <span className="rounded-full border border-border/55 bg-background/76 px-2.5 py-1 text-[11px] font-mono text-muted-foreground backdrop-blur-lg">
                            {activePhase ?? '--'}
                          </span>
                        </div>
                        <div className="custom-scrollbar max-h-[70vh] overflow-y-auto pr-1">
                          <Flowchart phases={data.phases} activePhase={activePhase} onSelectPhase={setActivePhase} />
                        </div>
                      </div>

                      <div className="min-h-[640px]">
                        {activePhaseData ? (
                          <Suspense fallback={<PanelFallback heightClassName="min-h-[640px]" />}>
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
                          <div className="glass-panel flex min-h-[640px] items-center justify-center p-10 text-center">
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

        <aside className="xl:sticky xl:top-28 xl:self-start">
          <div className="space-y-5">
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
                      {validationIssues.slice(0, 5).map((issue) => (
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
                        </div>
                      ))}
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
                      {consistencyIssues.slice(0, 5).map((issue, index) => (
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
                        </div>
                      ))}
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
              title={t('dashboard.riskAssessment')}
              summary={`${data.riskAssessment.level} · ${scanScore}`}
              accent={data.riskAssessment.level === 'SAFE' || data.riskAssessment.level === 'LOW' ? 'emerald' : 'rose'}
              defaultOpen
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <ShieldAlert size={16} className={data.riskAssessment.level === 'SAFE' || data.riskAssessment.level === 'LOW' ? 'text-emerald-500' : 'text-destructive'} />
                    <span className={`text-lg font-semibold tracking-tight ${modifiedPaths.has('riskAssessment.level') ? 'text-amber-600' : 'text-foreground'}`}>
                      {data.riskAssessment.level}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{data.riskAssessment.details}</p>
                </div>
                <span className="rounded-full border border-border/55 bg-background/76 px-3 py-1 text-[11px] font-mono text-muted-foreground backdrop-blur-lg">
                  {scanScore}
                </span>
              </div>
            </InsightBlock>
            <InsightBlock
              kicker={t('app.bridgeMode')}
              title={bridgeModeLabel}
              summary={bridgeModeSummary}
              accent={bridgeStatus?.mode === 'skill-0' ? 'emerald' : 'default'}
            >
              <div className="grid gap-3">
                <MiniMetric label={t('app.bridgeMode')} value={bridgeModeLabel} />
                <MiniMetric label={t('app.bridgeSource')} value={bridgeModeDetail} />
                <div className="rounded-[1.25rem] border border-border/55 bg-background/72 p-3 text-sm leading-6 text-muted-foreground backdrop-blur-xl">
                  {bridgeReviewGuidance}
                </div>
              </div>
            </InsightBlock>

            <InsightBlock
              kicker={t('app.projectSummary')}
              title={t('app.securityScan')}
              summary={firstFinding ? firstFinding.ruleName : t('securityMatrix.auditLogSummary')}
            >
              {firstFinding || operatorReminders.length > 0 ? (
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
                  </div>
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
              kicker={t('app.projectSummary')}
              title={t('dashboard.threeClassification')}
              summary={`${data.threeClassification.category} · ${data.threeClassification.granularity}`}
            >
              <div className="grid gap-3">
                <MiniMetric label={t('dashboard.category')} value={data.threeClassification.category} highlight={modifiedPaths.has('threeClassification.category')} />
                <MiniMetric label={t('dashboard.granularity')} value={data.threeClassification.granularity} />
                <MiniMetric label={t('vector.operability')} value={`${data.threeClassification.operability}%`} />
                <MiniMetric label={t('app.modifiedCount')} value={String(modifiedPaths.size)} highlight={modifiedPaths.size > 0} />
              </div>
            </InsightBlock>

            <InsightBlock
              kicker={t('app.collaborationContext')}
              title={t('app.sourceDefinition')}
              summary={parserManifest
                ? `${parserSupportingFiles.length} ${t('app.supportingFiles')} · ${parserManifest.unresolved_references_count || 0} ${t('app.unresolvedReferences')}`
                : supportFiles.length > 0
                  ? `${supportFiles.length} ${t('app.contextFiles')}`
                  : t('app.noContextFiles')}
            >
              <div className="space-y-2">
                {parserManifest && (
                  <div className="rounded-[1.25rem] border border-border/55 bg-background/72 px-4 py-3 text-sm leading-6 text-muted-foreground backdrop-blur-xl">
                    {t('app.analysisLevel')}: <span className="font-medium text-foreground">{parserManifest.analysis_level}</span>
                    {' · '}
                    {t('app.resolved')}: <span className="font-medium text-foreground">{parserSupportingFiles.filter((file: any) => file.resolved).length}</span>
                    {' · '}
                    {t('app.unresolved')}: <span className="font-medium text-foreground">{parserManifest.unresolved_references_count || 0}</span>
                  </div>
                )}
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

function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / (1024 ** exponent);
  return `${value.toFixed(value >= 10 || exponent === 0 ? 0 : 1)} ${units[exponent]}`;
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
