import React, { Suspense, lazy, useCallback, useEffect, useRef, useState } from 'react';
import {
  Activity,
  AlertCircle,
  BookOpen,
  FileText,
  Github,
  Info,
  Languages,
  PlayCircle,
  ShieldCheck,
  SlidersHorizontal,
  UploadCloud,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { fetchBridgeStatus, type BridgeStatus } from './services/bridgeStatusService';
import { getSampleScenarioContent } from './content/sampleScenarios';
import { useReviewStudioSession } from './hooks/useReviewStudioSession';
import type { DemoScenarioDefinition } from './types/demo';
import { ExternalDemoLanding } from './components/ExternalDemoLanding';

const GUI_REPO_URL = 'https://github.com/pingqLIN/skill-0-review-studio';
const ENGINE_REPO_URL = 'https://github.com/pingqLIN/skill-0';
const README_URL = `${GUI_REPO_URL}/blob/main/README.md`;
const DOCS_INDEX_URL = `${GUI_REPO_URL}/blob/main/docs/README.md`;
const DEMO_PLAN_URL = `${GUI_REPO_URL}/blob/main/docs/20-online-demo-plan-2026-04-03.md`;
const DEPLOYMENT_GUIDE_URL = `${GUI_REPO_URL}/blob/main/docs/06-deployment-operations-and-configuration.md`;
const MODE_CONTRACT_URL = `${GUI_REPO_URL}/blob/main/docs/shared/02-mode-and-equivalence-contract.md`;
const ReviewWorkspace = lazy(() => import('./components/ReviewWorkspace').then((module) => ({ default: module.ReviewWorkspace })));
const LlmSettingsDialog = lazy(() => import('./components/LlmSettingsDialog').then((module) => ({ default: module.LlmSettingsDialog })));

type LandingPaneTabId = 'overview' | 'outputs' | 'docs' | 'scenarios';

export default function App() {
  const { t, i18n } = useTranslation();
  const darkMode = false;
  const workspaceTitleId = 'landing-workspace-title';
  const intakeTitleId = 'landing-intake-title';
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const folderInputRef = useRef<HTMLInputElement | null>(null);
  const [bridgeStatus, setBridgeStatus] = useState<BridgeStatus | null>(null);
  const [bridgeStatusError, setBridgeStatusError] = useState<string | null>(null);
  const [isLlmSettingsOpen, setIsLlmSettingsOpen] = useState(false);
  const [isPublicDemoEntry, setIsPublicDemoEntry] = useState(() => window.location.pathname === '/demo');

  useEffect(() => {
    const preventWindowDrop = (event: DragEvent) => {
      if (event.dataTransfer?.types?.includes('Files')) {
        event.preventDefault();
      }
    };

    window.addEventListener('dragover', preventWindowDrop);
    window.addEventListener('drop', preventWindowDrop);

    return () => {
      window.removeEventListener('dragover', preventWindowDrop);
      window.removeEventListener('drop', preventWindowDrop);
    };
  }, []);

  useEffect(() => {
    const handlePopState = () => setIsPublicDemoEntry(window.location.pathname === '/demo');
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    if (folderInputRef.current) {
      folderInputRef.current.setAttribute('webkitdirectory', '');
      folderInputRef.current.setAttribute('directory', '');
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadBridgeStatus = async () => {
      try {
        const status = await fetchBridgeStatus();
        if (!cancelled) {
          setBridgeStatus(status);
          setBridgeStatusError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setBridgeStatus(null);
          setBridgeStatusError(err instanceof Error ? err.message : 'Unknown bridge status error');
        }
      }
    };

    void loadBridgeStatus();

    return () => {
      cancelled = true;
    };
  }, []);

  const toggleLanguage = () => {
    const newLang = i18n.language.startsWith('zh') ? 'en' : 'zh';
    i18n.changeLanguage(newLang);
  };

  const bridgeModeLabel = bridgeStatus?.mode === 'skill-0'
    ? t('app.bridgeModeCanonical')
    : bridgeStatus?.mode === 'standalone'
      ? t('app.bridgeModeStandalone')
      : t('app.bridgeModeUnavailable');
  const bridgeModeDetail = bridgeStatus?.skill0Root
    || (bridgeStatus?.mode === 'standalone'
      ? t('app.bridgeModeBundled')
      : bridgeStatusError || t('app.bridgeModeChecking'));
  const llmFallbackLabel = bridgeStatus?.llmFallbackAvailable
    ? t('app.llmFallbackAvailable')
    : t('app.llmFallbackUnavailable');
  const llmFallbackDetail = bridgeStatus?.llmFallbackAvailable
    ? [bridgeStatus?.llmProvider, bridgeStatus?.llmModel].filter(Boolean).join('/') || t('app.llmFallbackReady')
    : bridgeStatus?.llmReason || t('app.llmFallbackDisabledHint');
  const sampleScenarioContent = getSampleScenarioContent(i18n.language);
  const handleBridgeStatusChange = useCallback((status: BridgeStatus) => {
    setBridgeStatus(status);
    setBridgeStatusError(null);
  }, []);
  const openWorkspace = useCallback(() => {
    window.history.pushState({}, '', '/');
    setIsPublicDemoEntry(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);
  const landingDocs = [
    {
      title: t('app.resourceDocsIndexTitle'),
      body: t('app.resourceDocsIndexBody'),
      href: DOCS_INDEX_URL,
    },
    {
      title: t('app.resourceDeployTitle'),
      body: t('app.resourceDeployBody'),
      href: DEPLOYMENT_GUIDE_URL,
    },
    {
      title: t('app.resourcePlanTitle'),
      body: t('app.resourcePlanBody'),
      href: DEMO_PLAN_URL,
    },
  ];
  const curatedScenarios: DemoScenarioDefinition[] = [
    {
      id: 'mode-aware',
      type: 'server-example',
      title: sampleScenarioContent[0].title,
      body: sampleScenarioContent[0].body,
      focus: sampleScenarioContent[0].focus,
      artifacts: sampleScenarioContent[0].artifacts,
      cta: sampleScenarioContent[0].cta,
      reviewPreset: {
        id: 'mode-aware',
        title: sampleScenarioContent[0].title,
        focus: sampleScenarioContent[0].focus,
        nextStep: sampleScenarioContent[0].preset.nextStep,
        reviewStatus: sampleScenarioContent[0].preset.reviewStatus,
        reviewSummary: sampleScenarioContent[0].preset.reviewSummary,
        reviewerSignoff: sampleScenarioContent[0].preset.reviewerSignoff,
        reviewChecklist: sampleScenarioContent[0].preset.reviewChecklist,
        notes: [sampleScenarioContent[0].preset.note],
        seedValidationRun: sampleScenarioContent[0].preset.seedValidationRun,
      },
    },
    {
      id: 'bundle-review',
      type: 'local-bundle',
      title: sampleScenarioContent[1].title,
      body: sampleScenarioContent[1].body,
      focus: sampleScenarioContent[1].focus,
      artifacts: sampleScenarioContent[1].artifacts,
      cta: sampleScenarioContent[1].cta,
      skillName: 'bundle-intake-review',
      primaryPath: 'demo/bundle-review/SKILL.md',
      text: `---
name: bundle-intake-review
description: Demo-safe review bundle for manifest-oriented standalone analysis.
---

# Bundle Intake Review

Review a demo-safe skill bundle before approving execution in a shared automation repo.

## Workflow

- Parse the primary skill and supporting references together.
- Surface unresolved bundle references and authority-bearing commands.
- Require reviewer notes and sign-off before export.

## Rules

- Always inspect referenced policy files before approval.
- Never sign off on unresolved bundle references.
- Verify helper scripts before allowing execution.

## References

Read [Policy](docs/policy.md).
Inspect \`scripts/run.py\` before execution.

\`\`\`bash
python scripts/run.py
\`\`\`
`,
      contextFiles: [
        {
          name: 'policy.md',
          path: 'demo/bundle-review/docs/policy.md',
          type: '.md',
          size: 188,
          role: 'context',
          source: 'upload',
          preview: '# Bundle Review Policy',
          text: `# Bundle Review Policy

- Confirm the bundle only references approved documentation.
- Escalate any execution authority or missing reference before sign-off.
`,
        },
        {
          name: 'run.py',
          path: 'demo/bundle-review/scripts/run.py',
          type: '.py',
          size: 149,
          role: 'context',
          source: 'upload',
          preview: 'print("bundle review demo")',
          text: `print("bundle review demo")
print("verify policy before execution")
`,
        },
      ],
      reviewPreset: {
        id: 'bundle-review',
        title: sampleScenarioContent[1].title,
        focus: sampleScenarioContent[1].focus,
        nextStep: sampleScenarioContent[1].preset.nextStep,
        reviewStatus: sampleScenarioContent[1].preset.reviewStatus,
        reviewSummary: sampleScenarioContent[1].preset.reviewSummary,
        reviewerSignoff: sampleScenarioContent[1].preset.reviewerSignoff,
        reviewChecklist: sampleScenarioContent[1].preset.reviewChecklist,
        notes: [sampleScenarioContent[1].preset.note],
        seedValidationRun: sampleScenarioContent[1].preset.seedValidationRun,
        seedConsistencyRun: sampleScenarioContent[1].preset.seedConsistencyRun,
        seedPathRun: sampleScenarioContent[1].preset.seedPathRun,
      },
    },
    {
      id: 'publish-gate',
      type: 'local-bundle',
      title: sampleScenarioContent[2].title,
      body: sampleScenarioContent[2].body,
      focus: sampleScenarioContent[2].focus,
      artifacts: sampleScenarioContent[2].artifacts,
      cta: sampleScenarioContent[2].cta,
      skillName: 'publish-approval-gate',
      primaryPath: 'demo/publish-approval/SKILL.md',
      text: `---
name: publish-approval-gate
description: Demo-safe release review scenario focused on sign-off gates and exported evidence.
---

# Publish Approval Gate

Use this scenario to review a release-oriented skill before allowing an external publish step.

## Workflow

- Parse the release procedure and approval checkpoints.
- Check the release checklist before enabling publish commands.
- Export a review report with final summary and sign-off notes.

## Rules

- Always confirm reviewer summary before publish approval.
- Never approve missing release checklist evidence.
- Restrict external publish commands until sign-off gates are complete.

## Commands

\`\`\`bash
npm run build
npm run release:preview
\`\`\`
`,
      contextFiles: [
        {
          name: 'release-checklist.md',
          path: 'demo/publish-approval/checklists/release-checklist.md',
          type: '.md',
          size: 186,
          role: 'context',
          source: 'upload',
          preview: '# Release Checklist',
          text: `# Release Checklist

- Validation and consistency checks reviewed
- Reviewer summary added
- Sign-off gates confirmed before publish approval
`,
        },
      ],
      reviewPreset: {
        id: 'publish-gate',
        title: sampleScenarioContent[2].title,
        focus: sampleScenarioContent[2].focus,
        nextStep: sampleScenarioContent[2].preset.nextStep,
        reviewStatus: sampleScenarioContent[2].preset.reviewStatus,
        reviewSummary: sampleScenarioContent[2].preset.reviewSummary,
        reviewerSignoff: sampleScenarioContent[2].preset.reviewerSignoff,
        reviewChecklist: sampleScenarioContent[2].preset.reviewChecklist,
        notes: [sampleScenarioContent[2].preset.note],
        seedValidationRun: sampleScenarioContent[2].preset.seedValidationRun,
        seedConsistencyRun: sampleScenarioContent[2].preset.seedConsistencyRun,
      },
    },
  ];
  const {
    activeDemoPreset,
    analysisSessionId,
    availableWorkspaceDraft,
    data,
    discardWorkspaceDraft,
    error,
    handleAnalyzePendingUpload,
    handleAnalyzeSkillUrl,
    handleAnalyzeTextInput,
    handleDragEnter,
    handleDragLeave,
    handleDrop,
    handleFileInputChange,
    handleResetWorkspace,
    handleSaveEdit,
    handleUndo,
    inputText,
    isDragActive,
    isExtracting,
    loadCuratedScenario,
    modifiedPaths,
    originalData,
    pendingPrimaryPath,
    pendingUploadFiles,
    restoreAvailableWorkspaceDraft,
    selectedContextPath,
    setInputText,
    setIsDragActive,
    setPendingPrimaryPath,
    setSelectedContextPath,
    setSkillUrlInput,
    skillUrlInput,
    supportFiles,
    workspaceDraftRestored,
    workspaceDraftSavedAt,
  } = useReviewStudioSession({
    exampleDemoPreset: curatedScenarios[0]?.reviewPreset ?? null,
    t,
  });
  const landingArtifacts = [
    {
      title: t('app.reviewOutputReportTitle'),
      body: t('app.reviewOutputReportBody'),
    },
    {
      title: t('app.reviewOutputJsonTitle'),
      body: t('app.reviewOutputJsonBody'),
    },
    {
      title: t('app.reviewOutputSkillTitle'),
      body: t('app.reviewOutputSkillBody'),
    },
  ];
  const [landingPaneTab, setLandingPaneTab] = useState<LandingPaneTabId>('overview');
  const landingPaneTabs: Array<{ id: LandingPaneTabId; label: string }> = [
    { id: 'overview', label: t('app.landingOverviewTab') },
    { id: 'outputs', label: t('app.landingOutputsTab') },
    { id: 'docs', label: t('app.landingDocsTab') },
    { id: 'scenarios', label: t('app.landingScenariosTab') },
  ];
  const handleLandingPaneTabKeyDown = (
    tabIndex: number,
    event: React.KeyboardEvent<HTMLButtonElement>,
  ) => {
    const tabs = event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="tab"]');
    if (!tabs?.length) {
      return;
    }

    const focusTabAt = (index: number) => {
      const nextIndex = (index + landingPaneTabs.length) % landingPaneTabs.length;
      const nextTab = landingPaneTabs[nextIndex];
      setLandingPaneTab(nextTab.id);
      tabs[nextIndex]?.focus();
    };

    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      event.preventDefault();
      focusTabAt(tabIndex + 1);
      return;
    }

    if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      event.preventDefault();
      focusTabAt(tabIndex - 1);
      return;
    }

    if (event.key === 'Home') {
      event.preventDefault();
      focusTabAt(0);
      return;
    }

    if (event.key === 'End') {
      event.preventDefault();
      focusTabAt(landingPaneTabs.length - 1);
    }
  };
  if (isPublicDemoEntry) {
    return (
      <ExternalDemoLanding
        docsIndexUrl={DOCS_INDEX_URL}
        guiRepoUrl={GUI_REPO_URL}
        modeContractUrl={MODE_CONTRACT_URL}
        deploymentGuideUrl={DEPLOYMENT_GUIDE_URL}
        language={i18n.language}
        onOpenWorkspace={openWorkspace}
        onToggleLanguage={toggleLanguage}
        onLoadScenario={(scenarioId) => {
          const scenario = curatedScenarios.find((candidate) => candidate.id === scenarioId);
          if (scenario) {
            loadCuratedScenario(scenario);
          }
          openWorkspace();
        }}
      />
    );
  }
  return (
    <div className="app-shell min-h-screen transition-colors duration-300">
      {!data && (
        <header className="frost-banner">
          <div className="mx-auto flex max-w-[1980px] flex-wrap items-start justify-between gap-4 px-4 py-4 sm:px-6 lg:flex-nowrap lg:items-center lg:px-8">
            <div className="flex min-w-0 items-center gap-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-[calc(var(--radius)*1.05)] bg-primary text-sm font-bold text-primary-foreground">
                S0
              </div>
              <div className="min-w-0">
                <p className="editorial-kicker">{t('app.workspace')}</p>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <h1 id={workspaceTitleId} className="text-lg font-semibold tracking-tight text-foreground sm:text-xl">{t('app.title')}</h1>
                  <span className="hidden text-xs text-foreground/60 sm:inline">{t('app.subtitle')}</span>
                </div>
              </div>
            </div>

            <div className="ml-auto flex flex-wrap items-stretch justify-end gap-2">
              <div className={`landing-toolbar-control hidden gap-2 rounded-[calc(var(--radius)*1.05)] px-3 py-2 text-left sm:inline-flex ${
                bridgeStatus?.mode === 'skill-0'
                  ? 'bg-emerald-500/14 text-emerald-950'
                  : bridgeStatus?.mode === 'standalone'
                    ? 'bg-amber-500/14 text-amber-950'
                    : 'bg-muted text-muted-foreground'
              }`} title={`${bridgeModeLabel} · ${bridgeModeDetail}\n${llmFallbackLabel} · ${llmFallbackDetail}`}>
                <span className={`status-led ${
                  bridgeStatus?.mode === 'skill-0' ? 'status-led--canonical'
                    : bridgeStatus?.mode === 'standalone' ? 'status-led--standalone'
                    : 'status-led--unavailable'
                }`} />
                <div className="min-w-0 whitespace-nowrap leading-tight">
                  <div className="text-xs font-semibold leading-tight">{bridgeModeLabel}</div>
                  <div className="mt-0.5 text-[10px] leading-tight opacity-70">{llmFallbackLabel}</div>
                </div>
              </div>
              <a
                href={GUI_REPO_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="landing-toolbar-control editorial-button-secondary px-3 py-2 text-sm font-medium text-muted-foreground"
                title={t('app.guiRepo')}
              >
                <Github size={16} />
                <span className="hidden md:inline">GitHub</span>
              </a>
              <button
                type="button"
                onClick={() => setIsLlmSettingsOpen(true)}
                className="landing-toolbar-control editorial-button-secondary px-3 py-2 text-sm font-medium text-muted-foreground"
                title={t('app.llmAdminTitle')}
              >
                <SlidersHorizontal size={16} />
                <span className="hidden md:inline">{t('app.aiSettings')}</span>
              </button>
              <button
                onClick={toggleLanguage}
                className="landing-toolbar-control editorial-button-secondary px-3 py-2 text-sm font-medium text-muted-foreground"
                title="Toggle Language"
              >
                <Languages size={16} />
                <span className="uppercase">{i18n.language.startsWith('zh') ? 'EN' : '中文'}</span>
              </button>
            </div>
          </div>
        </header>
      )}

      <main className={`mx-auto max-w-[1980px] ${data ? 'px-0 py-0' : 'px-4 py-6 sm:px-6 lg:px-8 lg:py-8'}`}>
        {!data && workspaceDraftSavedAt && (
          <div
            data-testid="workspace-draft-status"
            className="surface-panel-muted mb-5 flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm text-foreground"
          >
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">{t('app.localDraft')}</div>
              <div className="mt-1 font-medium">
                {workspaceDraftRestored ? t('app.localDraftRestored') : t('app.localDraftAvailable')}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="text-xs font-mono text-muted-foreground">{formatDraftTimestamp(workspaceDraftSavedAt)}</div>
              {availableWorkspaceDraft && (
                <>
                  <button
                    type="button"
                    onClick={restoreAvailableWorkspaceDraft}
                    className="editorial-button-secondary px-3 py-2 text-sm font-medium"
                  >
                    {t('app.restoreDraft')}
                  </button>
                  <button
                    type="button"
                    onClick={discardWorkspaceDraft}
                    className="editorial-button-secondary px-3 py-2 text-sm font-medium text-muted-foreground"
                  >
                    {t('app.discardDraft')}
                  </button>
                </>
              )}
            </div>
          </div>
        )}
        {!data ? (
          <div className="space-y-6">
            <section className="grid gap-6 2xl:grid-cols-[minmax(0,1.12fr)_minmax(30rem,0.88fr)]">
              <section aria-labelledby={workspaceTitleId} className="glass-panel-strong hero-pattern px-5 py-6 sm:px-7 sm:py-7">
                <div className="space-y-6">
                  <div className="flex flex-wrap gap-2" role="tablist" aria-label={t('app.workspace')}>
                    {landingPaneTabs.map((tab, tabIndex) => (
                      <button
                        key={tab.id}
                        type="button"
                        id={`landing-tab-${tab.id}`}
                        role="tab"
                        aria-selected={landingPaneTab === tab.id}
                        aria-controls={`landing-panel-${tab.id}`}
                        tabIndex={landingPaneTab === tab.id ? 0 : -1}
                        data-state={landingPaneTab === tab.id ? 'active' : 'inactive'}
                        onClick={() => setLandingPaneTab(tab.id)}
                        onKeyDown={(event) => handleLandingPaneTabKeyDown(tabIndex, event)}
                        className="editorial-tab-button px-3 py-1.5"
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  <div
                    id={`landing-panel-${landingPaneTab}`}
                    role="tabpanel"
                    aria-labelledby={`landing-tab-${landingPaneTab}`}
                    tabIndex={0}
                  >
                    {landingPaneTab === 'outputs' ? (
                    <div className="max-w-4xl space-y-4">
                      <h2 className="display-serif text-4xl leading-[0.95] text-foreground sm:text-[3.2rem]">
                        {t('app.reviewOutputsTitle')}
                      </h2>
                      <p className="editorial-kicker">{t('app.reviewOutputsKicker')}</p>
                      <p className="max-w-3xl text-sm leading-7 text-foreground/72 sm:text-[1.02rem]">
                        {t('app.reviewOutputsLead')}
                      </p>
                      <div className="grid gap-3 md:grid-cols-3">
                        {landingArtifacts.map((item) => (
                          <div key={item.title} className="surface-panel-muted px-4 py-4">
                            <div className="text-sm font-semibold text-foreground">{item.title}</div>
                            <p className="mt-2 text-sm leading-6 text-foreground/72">{item.body}</p>
                          </div>
                        ))}
                      </div>
                      <div className="flex flex-wrap gap-3">
                        <a
                          href={README_URL}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="editorial-button-secondary px-5 py-3 text-sm font-medium"
                        >
                          <BookOpen size={16} />
                          {t('app.reviewOutputsReadmeCta')}
                        </a>
                        <a
                          href={MODE_CONTRACT_URL}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="editorial-button-secondary px-5 py-3 text-sm font-medium"
                        >
                          <ShieldCheck size={16} />
                          {t('app.reviewOutputsContractCta')}
                        </a>
                      </div>
                    </div>
                  ) : landingPaneTab === 'docs' ? (
                    <div className="max-w-4xl space-y-4">
                      <h2 className="display-serif text-4xl leading-[0.95] text-foreground sm:text-[3.2rem]">
                        {t('app.resourcesTitle')}
                      </h2>
                      <p className="editorial-kicker">{t('app.resourcesKicker')}</p>
                      <p className="max-w-3xl text-sm leading-7 text-foreground/72 sm:text-[1.02rem]">
                        {t('app.resourcesLead')}
                      </p>
                      <div className="grid gap-3 md:grid-cols-3">
                        {landingDocs.map((item) => (
                          <a
                            key={item.title}
                            href={item.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="surface-panel-muted px-4 py-4 text-left transition hover:bg-card"
                          >
                            <div className="text-sm font-semibold text-foreground">{item.title}</div>
                            <p className="mt-2 text-sm leading-6 text-foreground/72">{item.body}</p>
                          </a>
                        ))}
                      </div>
                    </div>
                  ) : landingPaneTab === 'scenarios' ? (
                    <div className="max-w-4xl space-y-4">
                      <h2 className="display-serif text-4xl leading-[0.95] text-foreground sm:text-[3.2rem]">
                        {t('app.sampleScenariosTitle')}
                      </h2>
                      <p className="editorial-kicker">{t('app.sampleScenariosKicker')}</p>
                      <p className="max-w-3xl text-sm leading-7 text-foreground/72 sm:text-[1.02rem]">
                        {t('app.sampleScenariosLead')}
                      </p>
                      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {curatedScenarios.map((scenario) => (
                          <div
                            key={scenario.id}
                            className="scenario-card flex flex-col"
                          >
                            <div className="text-sm font-semibold text-foreground">{scenario.title}</div>
                            <p className="mt-2 flex-1 text-sm leading-6 text-foreground/72">{scenario.body}</p>
                            <div className="mt-3 space-y-2">
                              <div className="surface-ground px-3 py-2">
                                <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">{t('app.sampleScenarioFocusLabel')}</div>
                                <p className="mt-1 text-xs leading-5 text-foreground">{scenario.focus}</p>
                              </div>
                              <button
                                type="button"
                                onClick={() => loadCuratedScenario(scenario)}
                                className="editorial-button-primary w-full px-4 py-2.5 text-sm font-medium"
                              >
                                <PlayCircle size={14} />
                                {scenario.cta}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="max-w-4xl space-y-5">
                      <p className="editorial-kicker">{t('app.landingEyebrow')}</p>
                      <h2 className="display-serif text-4xl leading-[0.95] text-foreground sm:text-[3.4rem]">
                        {t('app.title')}
                      </h2>
                      <p className="max-w-3xl text-sm leading-7 text-foreground/72 sm:text-[1.02rem]">
                        {t('app.landingTagline')}
                      </p>

                      {/* Pipeline stepper — directional cue */}
                      <div className="parser-stepper mt-2">
                        <div className="parser-stepper__step parser-stepper__step--done">
                          <span className="parser-stepper__num">1</span>
                          <div>
                            <div>{t('app.stepIntake')}</div>
                            <div className="mt-0.5 text-[0.65rem] font-normal opacity-75">{t('app.stepIntakeDesc')}</div>
                          </div>
                        </div>
                        <div className="parser-stepper__connector parser-stepper__connector--done" />
                        <div className="parser-stepper__step parser-stepper__step--done">
                          <span className="parser-stepper__num">2</span>
                          <div>
                            <div>{t('app.stepParse')}</div>
                            <div className="mt-0.5 text-[0.65rem] font-normal opacity-75">{t('app.stepParseDesc')}</div>
                          </div>
                        </div>
                        <div className="parser-stepper__connector" />
                        <div className="parser-stepper__step parser-stepper__step--active">
                          <span className="parser-stepper__num">3</span>
                          <div>
                            <div>{t('app.stepReview')}</div>
                            <div className="mt-0.5 text-[0.65rem] font-normal opacity-75">{t('app.stepReviewDesc')}</div>
                          </div>
                        </div>
                        <div className="parser-stepper__connector" />
                        <div className="parser-stepper__step">
                          <span className="parser-stepper__num">4</span>
                          <div>
                            <div>{t('app.stepExport')}</div>
                            <div className="mt-0.5 text-[0.65rem] font-normal opacity-75">{t('app.stepExportDesc')}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  </div>
                </div>
              </section>

              <aside aria-labelledby={intakeTitleId} className="intake-section px-5 py-5 sm:px-6 sm:py-6 2xl:sticky 2xl:top-28 2xl:self-start">
                <div className="mb-5 flex items-start justify-between gap-4">
                  <div>
                    <p className="editorial-kicker">{t('app.inputStudio')}</p>
                    <h2 id={intakeTitleId} className="mt-2 text-xl font-semibold tracking-tight text-foreground">{t('app.analyzeNew')}</h2>
                  </div>
                  <div className="editorial-icon-well p-3 text-muted-foreground">
                    <UploadCloud size={22} />
                  </div>
                </div>

                <div
                  onDragEnter={handleDragEnter}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (!isDragActive) setIsDragActive(true);
                  }}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`editorial-dropzone p-5 transition-colors ${
                    isDragActive
                      ? 'border-foreground/18 bg-card'
                      : 'hover:bg-card'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".md,.txt,.skill,.json,.yaml,.yml,.toml,.ini,.cfg,.csv,.tsv,.zip,text/plain,application/json,application/zip"
                    multiple
                    onChange={handleFileInputChange}
                    className="hidden"
                  />
                  <input
                    ref={folderInputRef}
                    type="file"
                    multiple
                    onChange={handleFileInputChange}
                    className="hidden"
                  />
                  {isExtracting ? (
                    <div className="flex min-h-[300px] flex-col items-center justify-center gap-4 text-center">
                      <div className="h-16 w-16 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
                      <div className="space-y-1">
                        <p className="text-lg font-medium text-foreground">{t('app.analyzing')}</p>
                        <p className="text-sm text-foreground/70">{t('app.applying')}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="surface-panel px-4 py-4">
                        <div className="flex flex-col gap-3">
                          <div className="group relative space-y-1">
                            <div className="flex items-center gap-2">
                              <label htmlFor="skill-url-input" className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                                {t('app.skillUrlLabel')}
                              </label>
                              <span className="editorial-chip px-2 py-1 text-[10px] text-muted-foreground">
                                <Info size={12} />
                              </span>
                            </div>
                            <div className="editorial-hover-note text-xs leading-5">
                              {t('app.skillUrlHint')}
                            </div>
                          </div>
                          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
                            <input
                              id="skill-url-input"
                              data-testid="skill-url-input"
                              type="url"
                              inputMode="url"
                              value={skillUrlInput}
                              onChange={(e) => setSkillUrlInput(e.target.value)}
                              onKeyDown={(event) => {
                                if (event.key === 'Enter') {
                                  event.preventDefault();
                                  void handleAnalyzeSkillUrl();
                                }
                              }}
                              placeholder={t('app.skillUrlPlaceholder')}
                              className="editorial-input-surface w-full px-4 py-3 text-sm leading-6 outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => void handleAnalyzeSkillUrl()}
                              disabled={!skillUrlInput.trim()}
                              className="editorial-button-secondary px-5 py-3 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              <UploadCloud size={16} />
                              {t('app.skillUrlCta')}
                            </button>
                          </div>
                        </div>
                      </div>
                      <div className="group relative">
                        <div className="mb-2 flex items-center gap-2">
                          <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">{t('app.skillTextLabel')}</span>
                          <span className="editorial-chip px-2 py-1 text-[10px] text-muted-foreground">
                            <Info size={12} />
                          </span>
                        </div>
                        <div className="editorial-hover-note text-xs leading-5">
                          {t('app.skillTextHint')}
                        </div>
                      </div>
                      <textarea
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        placeholder={t('app.placeholder')}
                        className="editorial-input-surface min-h-40 w-full resize-none px-4 py-3 text-sm leading-6 outline-none"
                      />

                      {error && (
                        <div className="flex items-start gap-2 rounded-[calc(var(--radius)*1.05)] bg-destructive/10 px-3 py-2 text-sm text-destructive">
                          <AlertCircle size={16} className="mt-0.5 shrink-0" />
                          <span>{error}</span>
                        </div>
                      )}
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="group relative flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{t('app.bundleUploadLabel')}</span>
                          <span className="editorial-chip px-2 py-1 text-[10px] text-muted-foreground">
                            <Info size={12} />
                          </span>
                          <div className="editorial-hover-note text-xs leading-5">
                            {t('app.bundleUploadHint')}
                          </div>
                        </div>
                        <div className="flex flex-col gap-3 sm:flex-row">
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="editorial-button-secondary px-5 py-3 text-sm font-medium"
                          >
                            <UploadCloud size={16} />
                            {t('app.selectFiles')}
                          </button>
                          <button
                            type="button"
                            onClick={() => folderInputRef.current?.click()}
                            className="editorial-button-secondary px-5 py-3 text-sm font-medium"
                          >
                            <UploadCloud size={16} />
                            {t('app.selectFolder')}
                          </button>
                          <button
                            onClick={pendingUploadFiles.length > 0 ? handleAnalyzePendingUpload : () => void handleAnalyzeTextInput()}
                            disabled={pendingUploadFiles.length > 0 ? !pendingPrimaryPath : !inputText.trim()}
                            className="editorial-button-primary px-5 py-3 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <Activity size={16} />
                            {pendingUploadFiles.length > 0 ? t('app.reviewAndAnalyze') : t('app.analyzeBtn')}
                          </button>
                        </div>
                      </div>

                      {pendingUploadFiles.length > 0 && (
                        <div className="surface-panel-muted px-4 py-3">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">{t('app.intakePreview')}</div>
                              <p className="mt-2 text-sm leading-6 text-foreground/70">{t('app.intakePreviewHint')}</p>
                            </div>
                            <div className="editorial-chip px-3 py-1.5 text-[11px] font-medium text-foreground">
                              {pendingUploadFiles.length} {t('app.intakeFiles')}
                            </div>
                          </div>
                          <div className="mt-3 grid gap-2">
                            {pendingUploadFiles.map((file) => {
                              const isSelectedPrimary = file.path === pendingPrimaryPath;
                              return (
                                <button
                                  key={`${file.path}-${file.size}`}
                                  type="button"
                                  onClick={() => file.isPrimaryCandidate && setPendingPrimaryPath(file.path)}
                                  className={`rounded-[calc(var(--radius)*1.02)] px-3 py-3 text-left transition ${
                                    isSelectedPrimary
                                      ? 'bg-background'
                                      : 'bg-muted'
                                  } ${file.isPrimaryCandidate ? 'hover:bg-card' : ''}`}
                                >
                                  <div className="flex items-center justify-between gap-3">
                                    <div className="text-sm font-medium text-foreground">{file.name}</div>
                                    <div className="flex items-center gap-2">
                                      <span className="text-[11px] text-muted-foreground">{formatBytes(file.size)}</span>
                                      <span className={`editorial-chip px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${
                                        isSelectedPrimary
                                          ? 'bg-background text-foreground'
                                          : file.isPrimaryCandidate
                                            ? 'bg-[#efe2d4] text-[#6f4f25]'
                                            : 'bg-card text-muted-foreground'
                                      }`}>
                                        {isSelectedPrimary ? t('app.primarySkill') : file.isPrimaryCandidate ? t('app.primaryCandidate') : t('app.contextOnly')}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="mt-1 text-xs text-muted-foreground">{file.path}</div>
                                  {file.preview && <p className="mt-2 text-xs leading-6 text-muted-foreground">{file.preview}</p>}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {supportFiles.length > 0 && (
                        <div className="surface-panel-muted px-4 py-3">
                          <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">{t('app.collaborationContext')}</div>
                          <div className="mt-3 grid gap-2">
                            {supportFiles.map((file) => (
                              <button
                                key={`${file.path}-${file.size}`}
                                type="button"
                                onClick={() => setSelectedContextPath(file.path)}
                                className={`rounded-[calc(var(--radius)*1.02)] px-3 py-3 text-left transition ${
                                  selectedContextPath === file.path ? 'bg-background' : 'bg-muted'
                                }`}
                              >
                                <div className="flex items-center justify-between gap-3">
                                  <div className="text-sm font-medium text-foreground">{file.name}</div>
                                  <div className="text-[11px] text-muted-foreground">{formatBytes(file.size)}</div>
                                </div>
                                <div className="mt-1 text-xs text-muted-foreground">{file.type}</div>
                                <div className="mt-1 text-[11px] text-muted-foreground">{file.path}</div>
                                {file.preview && (
                                  <p className="mt-2 text-xs leading-6 text-muted-foreground">{file.preview}</p>
                                )}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

              </aside>
            </section>
          </div>
        ) : (
          <Suspense fallback={<div className="px-6 py-10 text-sm text-muted-foreground">{t('app.loading')}</div>}>
            <React.Fragment key={analysisSessionId}>
              <ReviewWorkspace
                data={data}
                originalData={originalData}
                demoPreset={activeDemoPreset}
                darkMode={darkMode}
                modifiedPaths={modifiedPaths}
                supportFiles={supportFiles}
                selectedContextPath={selectedContextPath}
                bridgeStatus={bridgeStatus}
                bridgeStatusError={bridgeStatusError}
                guiRepoUrl={GUI_REPO_URL}
                engineRepoUrl={ENGINE_REPO_URL}
                workspaceDraftSavedAt={workspaceDraftSavedAt}
                workspaceDraftRestored={workspaceDraftRestored}
                currentLanguage={i18n.language}
                onOpenLlmSettings={() => setIsLlmSettingsOpen(true)}
                onSelectContextPath={setSelectedContextPath}
                onSaveEdit={handleSaveEdit}
                onToggleLanguage={toggleLanguage}
                onUndo={handleUndo}
                onResetWorkspace={handleResetWorkspace}
              />
            </React.Fragment>
          </Suspense>
        )}
      </main>
      {isLlmSettingsOpen && (
        <Suspense fallback={null}>
          <LlmSettingsDialog
            open={isLlmSettingsOpen}
            onClose={() => setIsLlmSettingsOpen(false)}
            onBridgeStatusChange={handleBridgeStatusChange}
          />
        </Suspense>
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

function formatDraftTimestamp(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
}
