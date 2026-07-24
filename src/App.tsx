import React, { Suspense, lazy, useCallback, useEffect, useRef, useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { fetchBridgeStatus, type BridgeStatus } from './services/bridgeStatusService';
import { getSampleScenarioContent } from './content/sampleScenarios';
import { useReviewStudioSession } from './hooks/useReviewStudioSession';
import type { DemoScenarioDefinition } from './types/demo';
import { ExternalDemoLanding } from './components/ExternalDemoLanding';
import { GuidedIntakeLanding } from './components/GuidedIntakeLanding';

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
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const folderInputRef = useRef<HTMLInputElement | null>(null);
  const zipInputRef = useRef<HTMLInputElement | null>(null);
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
    const newLang = i18n.language.startsWith('zh') ? 'en' : 'zh-TW';
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
    activeWorkspaceDraftId,
    analysisSessionId,
    data,
    deleteWorkspaceDraft,
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
    prepareDemoSkill,
    restoreWorkspaceDraft,
    selectedContextPath,
    setInputText,
    setIsDragActive,
    setPendingPrimaryPath,
    setSelectedContextPath,
    setSkillUrlInput,
    skillUrlInput,
    supportFiles,
    workspaceDraftPersistenceError,
    workspaceDraftRestored,
    workspaceDraftSavedAt,
    workspaceDrafts,
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
  if (!data) {
    return (
      <div className="app-shell min-h-screen">
        <GuidedIntakeLanding
          t={t}
          language={i18n.language}
          bridgeMode={bridgeStatus?.mode ?? null}
          bridgeModeLabel={bridgeModeLabel}
          bridgeModeDetail={bridgeModeDetail}
          llmFallbackLabel={llmFallbackLabel}
          llmFallbackDetail={llmFallbackDetail}
          inputText={inputText}
          skillUrl={skillUrlInput}
          error={error}
          isBusy={isExtracting}
          isDragActive={isDragActive}
          pendingUploadFiles={pendingUploadFiles}
          pendingPrimaryPath={pendingPrimaryPath}
          supportFiles={supportFiles}
          selectedContextPath={selectedContextPath}
          draftSavedAt={workspaceDraftSavedAt}
          draftRestored={workspaceDraftRestored}
          draftAvailable={workspaceDrafts.length > 0}
          drafts={workspaceDrafts}
          activeDraftId={activeWorkspaceDraftId}
          draftPersistenceError={workspaceDraftPersistenceError}
          activeUtilityTab={landingPaneTab}
          docs={landingDocs}
          artifacts={landingArtifacts}
          scenarios={curatedScenarios}
          guiRepoUrl={GUI_REPO_URL}
          readmeUrl={README_URL}
          modeContractUrl={MODE_CONTRACT_URL}
          fileInputRef={fileInputRef}
          folderInputRef={folderInputRef}
          zipInputRef={zipInputRef}
          onFileInputChange={handleFileInputChange}
          onInputTextChange={setInputText}
          onSkillUrlChange={setSkillUrlInput}
          onAnalyzeText={() => void handleAnalyzeTextInput()}
          onAnalyzeUpload={handleAnalyzePendingUpload}
          onAnalyzeUrl={() => void handleAnalyzeSkillUrl()}
          onDragEnter={handleDragEnter}
          onDragOver={(event) => {
            event.preventDefault();
            event.stopPropagation();
            if (!isDragActive) setIsDragActive(true);
          }}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onSetPrimaryPath={setPendingPrimaryPath}
          onSelectContextPath={setSelectedContextPath}
          onRestoreDraft={restoreWorkspaceDraft}
          onDeleteDraft={deleteWorkspaceDraft}
          onPrepareDemo={prepareDemoSkill}
          onLoadScenario={loadCuratedScenario}
          onUtilityTabChange={setLandingPaneTab}
          onOpenSettings={() => setIsLlmSettingsOpen(true)}
          onToggleLanguage={toggleLanguage}
        />
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
  return (
    <div className="app-shell min-h-screen transition-colors duration-300">
      <main className="mx-auto max-w-[1980px] px-0 py-0">
        {workspaceDraftPersistenceError && (
          <div
            role="status"
            data-testid="workspace-draft-persistence-warning"
            className="m-4 mb-0 flex items-start gap-2 rounded-[calc(var(--radius)*1.05)] bg-amber-500/10 px-4 py-3 text-sm text-amber-950"
          >
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            <span>{t('app.localDraftMemoryFallback')}</span>
          </div>
        )}
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
