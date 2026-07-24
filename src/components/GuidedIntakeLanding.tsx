import { useEffect, useMemo, useState } from 'react';
import type { ChangeEventHandler, DragEventHandler, KeyboardEvent, ReactNode, RefObject } from 'react';
import {
  BookOpen,
  Braces,
  Boxes,
  CircleHelp,
  Code2,
  Download,
  FileJson,
  FileText,
  FolderOpen,
  Github,
  Grid3X3,
  Languages,
  Link2,
  Network,
  PlayCircle,
  SlidersHorizontal,
  Workflow,
} from 'lucide-react';
import type { DemoScenarioDefinition } from '../types/demo';
import type { PreparedUploadFile, UploadedContextFile } from '../types/intake';
import {
  IntakeReviewRail,
  type IntakeReviewRailCopy,
} from './IntakeReviewRail';
import {
  TaskFirstIntake,
  type TaskFirstIntakeCopy,
  type TaskFirstIntakeTab,
  type TaskFirstTask,
} from './TaskFirstIntake';

type UtilityTab = 'overview' | 'outputs' | 'docs' | 'scenarios';

type ResourceCard = {
  title: string;
  body: string;
  href?: string;
};

export type GuidedIntakeLandingProps = {
  t: (key: string) => string;
  language: string;
  bridgeMode: 'skill-0' | 'standalone' | null;
  bridgeModeLabel: string;
  bridgeModeDetail: string;
  llmFallbackLabel: string;
  llmFallbackDetail: string;
  inputText: string;
  skillUrl: string;
  error: string | null;
  isBusy: boolean;
  isDragActive: boolean;
  pendingUploadFiles: PreparedUploadFile[];
  pendingPrimaryPath: string | null;
  supportFiles: UploadedContextFile[];
  selectedContextPath: string | null;
  draftSavedAt: string | null;
  draftRestored: boolean;
  draftAvailable: boolean;
  draftPersistenceError: string | null;
  activeUtilityTab: UtilityTab;
  docs: ResourceCard[];
  artifacts: ResourceCard[];
  scenarios: DemoScenarioDefinition[];
  guiRepoUrl: string;
  readmeUrl: string;
  modeContractUrl: string;
  fileInputRef: RefObject<HTMLInputElement | null>;
  folderInputRef: RefObject<HTMLInputElement | null>;
  onFileInputChange: ChangeEventHandler<HTMLInputElement>;
  onInputTextChange: (value: string) => void;
  onSkillUrlChange: (value: string) => void;
  onAnalyzeText: () => void;
  onAnalyzeUpload: () => void;
  onAnalyzeUrl: () => void;
  onDragEnter: DragEventHandler<HTMLDivElement>;
  onDragOver: DragEventHandler<HTMLDivElement>;
  onDragLeave: DragEventHandler<HTMLDivElement>;
  onDrop: DragEventHandler<HTMLDivElement>;
  onSetPrimaryPath: (path: string) => void;
  onSelectContextPath: (path: string) => void;
  onRestoreDraft: () => void;
  onDiscardDraft: () => void;
  onLoadScenario: (scenario: DemoScenarioDefinition) => void;
  onUtilityTabChange: (tab: UtilityTab) => void;
  onOpenSettings: () => void;
  onToggleLanguage: () => void;
};

const navItems = [
  { label: 'Pipeline', icon: Workflow, active: true },
  { label: 'Vector', icon: Network },
  { label: 'Matrix', icon: Grid3X3 },
  { label: 'Editor', icon: Code2 },
  { label: 'JSON', icon: Braces },
];

export function GuidedIntakeLanding({
  t,
  language,
  bridgeMode,
  bridgeModeLabel,
  bridgeModeDetail,
  llmFallbackLabel,
  llmFallbackDetail,
  inputText,
  skillUrl,
  error,
  isBusy,
  isDragActive,
  pendingUploadFiles,
  pendingPrimaryPath,
  supportFiles,
  selectedContextPath,
  draftSavedAt,
  draftRestored,
  draftAvailable,
  draftPersistenceError,
  activeUtilityTab,
  docs,
  artifacts,
  scenarios,
  guiRepoUrl,
  readmeUrl,
  modeContractUrl,
  fileInputRef,
  folderInputRef,
  onFileInputChange,
  onInputTextChange,
  onSkillUrlChange,
  onAnalyzeText,
  onAnalyzeUpload,
  onAnalyzeUrl,
  onDragEnter,
  onDragOver,
  onDragLeave,
  onDrop,
  onSetPrimaryPath,
  onSelectContextPath,
  onRestoreDraft,
  onDiscardDraft,
  onLoadScenario,
  onUtilityTabChange,
  onOpenSettings,
  onToggleLanguage,
}: GuidedIntakeLandingProps) {
  const isZh = language.startsWith('zh');
  const [selectedTask, setSelectedTask] = useState<TaskFirstTask>('review');
  const [activeInputTab, setActiveInputTab] = useState<TaskFirstIntakeTab>('paste');
  useEffect(() => {
    if (pendingUploadFiles.length > 0) {
      setActiveInputTab('upload');
    }
  }, [pendingUploadFiles.length]);
  const utilityTabs: Array<{ id: UtilityTab; label: string }> = [
    { id: 'overview', label: t('app.landingOverviewTab') },
    { id: 'outputs', label: t('app.landingOutputsTab') },
    { id: 'docs', label: t('app.landingDocsTab') },
    { id: 'scenarios', label: t('app.landingScenariosTab') },
  ];

  const copy = useMemo<TaskFirstIntakeCopy>(() => isZh ? {
    kicker: 'Skill-0 Review Studio',
    title: '導引式 intake：選擇審查目標',
    lead: '先選目的，再提供最適合的輸入方式與可驗證流程。',
    chooseTask: '選擇審查任務',
    chooseTaskLabel: '選擇審查任務',
    selected: '已選擇',
    select: '選擇',
    inputTitle: '輸入要審查的內容',
    inputHint: '支援 SkillDocument JSON、Markdown、純文字、檔案 bundle、資料夾與 HTTPS URL。',
    selectedFiles: (count) => `已選擇 ${count} 個檔案`,
    pasteTab: '貼上內容',
    uploadTab: '上傳檔案',
    urlTab: '從 URL 取得',
    pasteLabel: '貼上要審查的內容',
    pastePlaceholder: t('app.placeholder'),
    uploadTitle: '上傳 skill 與參考資料',
    uploadHint: '選擇主要 SKILL 檔案，也可連同 policy、script 與 checklist 一起匯入。',
    selectFiles: t('app.selectFiles'),
    selectFolder: t('app.selectFolder'),
    urlLabel: t('app.skillUrlLabel'),
    urlHint: t('app.skillUrlSupported'),
    pasteFormatHint: '支援 JSON、Markdown 或純文字（最大 2MB）。',
    uploadFormatHint: '確認主要 skill 後，即可送入目前的 parser。',
    tasks: {
      review: { title: '審查一個 skill', description: '對單一 SkillDocument 進行內容與結構驗證。' },
      compare: { title: '審查 skill bundle', description: '匯入主要 skill 與支援檔案，檢查引用、policy 與執行內容。' },
      draft: { title: '繼續已儲存的草稿', description: draftAvailable ? '恢復本機最近一次未完成的審查。' : '目前沒有可恢復的本機草稿。' },
      demo: { title: '開啟示範工作區', description: '載入安全範例，體驗完整審查流程。' },
    },
  } : {
    kicker: 'Skill-0 Review Studio',
    title: 'Guided intake: choose a review goal',
    lead: 'Choose the goal first; the studio will present the best-fit input and a verifiable path.',
    chooseTask: 'Choose a review task',
    chooseTaskLabel: 'Choose a review task',
    selected: 'Selected',
    select: 'Select',
    inputTitle: 'Add content to review',
    inputHint: 'Supports SkillDocument JSON, Markdown, text, file bundles, folders, and HTTPS URLs.',
    selectedFiles: (count) => `${count} file${count === 1 ? '' : 's'} selected`,
    pasteTab: 'Paste content',
    uploadTab: 'Upload files',
    urlTab: 'Import URL',
    pasteLabel: 'Paste content to review',
    pastePlaceholder: t('app.placeholder'),
    uploadTitle: 'Upload a skill and its context',
    uploadHint: 'Choose the primary SKILL file and optionally include policies, scripts, and checklists.',
    selectFiles: t('app.selectFiles'),
    selectFolder: t('app.selectFolder'),
    urlLabel: t('app.skillUrlLabel'),
    urlHint: t('app.skillUrlSupported'),
    pasteFormatHint: 'JSON, Markdown, or plain text up to 2 MB.',
    uploadFormatHint: 'Confirm the primary skill, then send the bundle to the active parser.',
    tasks: {
      review: { title: 'Review one skill', description: 'Validate the content and structure of a single SkillDocument.' },
      compare: { title: 'Review a skill bundle', description: 'Import a primary skill with supporting files to inspect references, policies, and execution content.' },
      draft: { title: 'Continue a saved draft', description: draftAvailable ? 'Restore the most recent unfinished local review.' : 'No restorable local draft is available.' },
      demo: { title: 'Open a demo workspace', description: 'Load a safe example and experience the complete review flow.' },
    },
  }, [draftAvailable, isZh, t]);

  const railCopy = useMemo<IntakeReviewRailCopy>(() => isZh ? {
    title: '審查置邊欄 (REVIEW RAIL)',
    currentMode: '目前模式',
    noMode: '尚未確認',
    session: 'Session',
    readiness: '審查就緒度',
    completed: (complete, total) => `已完成 ${complete} / ${total} 項`,
    inputReady: '輸入內容已準備',
    analysisComplete: '分析已完成',
    schemaLoaded: 'Schema 已載入',
    contentValidated: '內容已驗證',
    reviewApproved: '審查已核可',
    draftProgress: '草稿狀態',
    draftUnsaved: '草稿有尚未分析的變更',
    draftSaved: '本機草稿已儲存',
    draftNone: '尚未建立本機草稿',
    recentActivity: '最近活動',
    noActivity: '等待選擇審查目標',
    exportReadiness: '匯出就緒度',
    exportReady: '可匯出',
    exportBlocked: '尚不可匯出',
    exportPending: '等待審查完成',
    notProvided: '未提供',
  } : {
    title: 'Review rail',
    currentMode: 'Current mode',
    noMode: 'Not confirmed',
    session: 'Session',
    readiness: 'Review readiness',
    completed: (complete, total) => `${complete} of ${total} complete`,
    inputReady: 'Input is ready',
    analysisComplete: 'Analysis complete',
    schemaLoaded: 'Schema loaded',
    contentValidated: 'Content validated',
    reviewApproved: 'Review approved',
    draftProgress: 'Draft status',
    draftUnsaved: 'Draft has changes pending analysis',
    draftSaved: 'Local draft saved',
    draftNone: 'No local draft yet',
    recentActivity: 'Recent activity',
    noActivity: 'Choose a review goal to begin',
    exportReadiness: 'Export readiness',
    exportReady: 'Ready to export',
    exportBlocked: 'Not ready to export',
    exportPending: 'Waiting for review',
    notProvided: 'Not provided',
  }, [isZh]);

  const selectTask = (task: TaskFirstTask) => {
    setSelectedTask(task);
    if (task === 'review') {
      setActiveInputTab('paste');
      onUtilityTabChange('overview');
    } else if (task === 'compare') {
      setActiveInputTab('upload');
      onUtilityTabChange('overview');
    } else if (task === 'draft') {
      if (draftAvailable) onRestoreDraft();
    } else if (scenarios[0]) {
      onLoadScenario(scenarios[0]);
    }
  };

  const handleUtilityKeyDown = (index: number, event: KeyboardEvent<HTMLButtonElement>) => {
    if (!['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    let nextIndex = index;
    if (event.key === 'ArrowRight') nextIndex = (index + 1) % utilityTabs.length;
    if (event.key === 'ArrowLeft') nextIndex = (index - 1 + utilityTabs.length) % utilityTabs.length;
    if (event.key === 'Home') nextIndex = 0;
    if (event.key === 'End') nextIndex = utilityTabs.length - 1;
    onUtilityTabChange(utilityTabs[nextIndex].id);
    document.getElementById(`guided-utility-${utilityTabs[nextIndex].id}`)?.focus();
  };

  const taskStatus = selectedTask === 'compare'
    ? {
        label: isZh ? 'Bundle 審查模式' : 'Bundle review mode',
        detail: isZh ? '請選擇主要 skill；其餘檔案會明確作為支援脈絡，不會被宣稱為版本 diff。' : 'Choose the primary skill. Remaining files are explicit supporting context, not a claimed version diff.',
        tone: 'neutral' as const,
      }
    : selectedTask === 'draft' && !draftAvailable
      ? {
          label: isZh ? '沒有可恢復的草稿' : 'No saved draft is available',
          detail: isZh ? '先匯入內容，系統會在本機保存後續工作。' : 'Import content first; subsequent work will be saved locally.',
          tone: 'neutral' as const,
        }
      : null;

  const inputReady = Boolean(inputText.trim() || skillUrl.trim() || pendingUploadFiles.length);
  const shownCards = activeUtilityTab === 'outputs' ? artifacts : activeUtilityTab === 'docs' ? docs : [];

  return (
    <div className="guided-intake-shell">
      <input
        ref={fileInputRef}
        type="file"
        accept=".md,.txt,.skill,.json,.yaml,.yml,.toml,.ini,.cfg,.csv,.tsv,.zip,text/plain,application/json,application/zip"
        multiple
        onChange={onFileInputChange}
        className="hidden"
      />
      <input ref={folderInputRef} type="file" multiple onChange={onFileInputChange} className="hidden" />

      <nav className="guided-intake-nav" aria-label={isZh ? '工作區導覽' : 'Workspace navigation'}>
        <div className="guided-intake-mark" aria-hidden="true">&gt;_</div>
        <div className="guided-intake-nav-items">
          {navItems.map(({ label, icon: Icon, active }) => (
            <button
              key={label}
              type="button"
              className={active ? 'is-active' : ''}
              aria-current={active ? 'page' : undefined}
              aria-disabled={!active}
              title={!active ? (isZh ? '分析完成後開放' : 'Available after analysis') : label}
            >
              <Icon size={20} aria-hidden="true" />
              <span>{label}</span>
            </button>
          ))}
        </div>
        <div className="guided-intake-nav-export">
          <Download size={20} aria-hidden="true" />
          <span>Export</span>
        </div>
      </nav>

      <header className="guided-intake-topbar">
        <div className="guided-intake-brand">
          <span className="display-serif">{t('app.title')}</span>
          <span className="guided-intake-bridge">
            <Link2 size={13} aria-hidden="true" />
            {bridgeMode === 'skill-0'
              ? 'Canonical Skill-0 bridge'
              : bridgeMode === 'standalone'
                ? 'Standalone parser bridge'
                : 'Bridge status pending'}
          </span>
        </div>
        <div className="guided-intake-top-actions">
          <span className="guided-intake-mode" title={`${bridgeModeLabel} · ${bridgeModeDetail}\n${llmFallbackLabel} · ${llmFallbackDetail}`}>
            <span
              className={`status-led ${
                bridgeMode === 'skill-0'
                  ? 'status-led--canonical'
                  : bridgeMode === 'standalone'
                    ? 'status-led--standalone'
                    : 'status-led--unavailable'
              }`}
              aria-hidden="true"
            />
            <span data-testid="bridge-mode-label">{bridgeModeLabel}</span>
            <span className="sr-only">{llmFallbackLabel}</span>
          </span>
          <a href={guiRepoUrl} target="_blank" rel="noopener noreferrer" title={t('app.guiRepo')}><Github size={17} /><span>GitHub</span></a>
          <button type="button" onClick={onOpenSettings} title={t('app.llmAdminTitle')}><SlidersHorizontal size={17} /><span>{t('app.aiSettings')}</span></button>
          <button type="button" onClick={onToggleLanguage} title="Toggle Language"><Languages size={17} /><span>{isZh ? 'EN' : '中文'}</span></button>
        </div>
      </header>

      <main className="guided-intake-main">
        {draftPersistenceError && (
          <div role="status" data-testid="workspace-draft-persistence-warning" className="guided-intake-warning">
            {t('app.localDraftMemoryFallback')}
          </div>
        )}
        {draftSavedAt && (
          <div data-testid="workspace-draft-status" className="guided-intake-draftbar">
            <div>
              <strong>{t('app.localDraft')}</strong>
              <span>{draftRestored ? t('app.localDraftRestored') : t('app.localDraftAvailable')}</span>
            </div>
            <div>
              <time dateTime={draftSavedAt}>{new Date(draftSavedAt).toLocaleString()}</time>
              {draftAvailable && <button type="button" onClick={onRestoreDraft}>{t('app.restoreDraft')}</button>}
              {draftAvailable && <button type="button" onClick={onDiscardDraft}>{t('app.discardDraft')}</button>}
            </div>
          </div>
        )}

        {activeUtilityTab === 'overview' ? (
          <>
            <TaskFirstIntake
              inputText={inputText}
              skillUrl={skillUrl}
              onInputTextChange={onInputTextChange}
              onSkillUrlChange={onSkillUrlChange}
              onPrimaryAction={activeInputTab === 'upload' ? onAnalyzeUpload : onAnalyzeText}
              onImportUrl={onAnalyzeUrl}
              onUploadFiles={() => fileInputRef.current?.click()}
              onUploadFolder={() => folderInputRef.current?.click()}
              onSelectTask={selectTask}
              onActiveTabChange={setActiveInputTab}
              onDragEnter={onDragEnter}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
              selectedTask={selectedTask}
              activeTab={activeInputTab}
              error={error}
              status={taskStatus}
              isBusy={isBusy}
              isDragActive={isDragActive}
              pendingUploadCount={pendingUploadFiles.length}
              primaryActionDisabled={activeInputTab === 'upload' && !pendingPrimaryPath}
              primaryActionLabel={activeInputTab === 'upload' ? t('app.reviewAndAnalyze') : t('app.analyzeBtn')}
              importUrlLabel={t('app.skillUrlCta')}
              copy={copy}
            />
            {pendingUploadFiles.length > 0 && (
              <section className="guided-intake-file-list" aria-label={t('app.intakePreview')}>
                <header><strong>{t('app.intakePreview')}</strong><span>{pendingUploadFiles.length} {t('app.intakeFiles')}</span></header>
                {pendingUploadFiles.map((file) => (
                  <button
                    key={`${file.path}-${file.size}`}
                    type="button"
                    disabled={!file.isPrimaryCandidate}
                    aria-pressed={file.path === pendingPrimaryPath}
                    onClick={() => file.isPrimaryCandidate && onSetPrimaryPath(file.path)}
                  >
                    <span><FileText size={16} />{file.name}</span>
                    <small><span>{file.path}</span><span aria-hidden="true"> · </span><span>{formatBytes(file.size)}</span></small>
                  </button>
                ))}
              </section>
            )}
            {supportFiles.length > 0 && (
              <section className="guided-intake-file-list" aria-label={t('app.collaborationContext')}>
                <header><strong>{t('app.collaborationContext')}</strong></header>
                {supportFiles.map((file) => (
                  <button key={`${file.path}-${file.size}`} type="button" aria-pressed={file.path === selectedContextPath} onClick={() => onSelectContextPath(file.path)}>
                    <span><FolderOpen size={16} />{file.name}</span>
                    <small><span>{file.path}</span><span aria-hidden="true"> · </span><span>{formatBytes(file.size)}</span></small>
                  </button>
                ))}
              </section>
            )}
          </>
        ) : activeUtilityTab === 'scenarios' ? (
          <UtilityPanel kicker={t('app.sampleScenariosKicker')} title={t('app.sampleScenariosTitle')} lead={t('app.sampleScenariosLead')}>
            <div className="guided-intake-card-grid">
              {scenarios.map((scenario) => (
                <article key={scenario.id}>
                  <PlayCircle size={24} aria-hidden="true" />
                  <h3>{scenario.title}</h3>
                  <p>{scenario.body}</p>
                  <small>{scenario.focus}</small>
                  <button type="button" onClick={() => onLoadScenario(scenario)}>{scenario.cta}</button>
                </article>
              ))}
            </div>
          </UtilityPanel>
        ) : (
          <UtilityPanel
            kicker={activeUtilityTab === 'outputs' ? t('app.reviewOutputsKicker') : t('app.resourcesKicker')}
            title={activeUtilityTab === 'outputs' ? t('app.reviewOutputsTitle') : t('app.resourcesTitle')}
            lead={activeUtilityTab === 'outputs' ? t('app.reviewOutputsLead') : t('app.resourcesLead')}
          >
            <div className="guided-intake-card-grid">
              {shownCards.map((card) => card.href ? (
                <a key={card.title} href={card.href} target="_blank" rel="noopener noreferrer"><BookOpen size={22} /><h3>{card.title}</h3><p>{card.body}</p></a>
              ) : (
                <article key={card.title}><FileJson size={22} /><h3>{card.title}</h3><p>{card.body}</p></article>
              ))}
            </div>
            {activeUtilityTab === 'outputs' && (
              <div className="guided-intake-panel-actions">
                <a href={readmeUrl} target="_blank" rel="noopener noreferrer">{t('app.reviewOutputsReadmeCta')}</a>
                <a href={modeContractUrl} target="_blank" rel="noopener noreferrer">{t('app.reviewOutputsContractCta')}</a>
              </div>
            )}
          </UtilityPanel>
        )}
      </main>

      <IntakeReviewRail
        mode={bridgeModeLabel}
        readiness={{ inputReady }}
        draft={{ isDirty: inputReady && !draftSavedAt, savedAt: draftSavedAt }}
        activities={[{
          id: `selected-${selectedTask}`,
          label: copy.tasks[selectedTask].title,
          detail: isZh ? '目前選擇的審查目標' : 'Current review goal',
          status: 'current',
        }]}
        exportState={{ ready: false, reason: isZh ? '完成分析、內容驗證與 reviewer 核可後開放。' : 'Complete analysis, validation, and reviewer approval first.' }}
        copy={railCopy}
        className="guided-intake-rail"
      />

      <footer className="guided-intake-dock">
        <div className="guided-intake-dock-tabs" role="tablist" aria-label={t('app.workspace')}>
          {utilityTabs.map((tab, index) => (
            <button
              key={tab.id}
              id={`guided-utility-${tab.id}`}
              type="button"
              role="tab"
              aria-selected={activeUtilityTab === tab.id}
              tabIndex={activeUtilityTab === tab.id ? 0 : -1}
              onClick={() => onUtilityTabChange(tab.id)}
              onKeyDown={(event) => handleUtilityKeyDown(index, event)}
            >
              {tab.id === 'overview' && <Boxes size={16} />}
              {tab.id === 'outputs' && <Download size={16} />}
              {tab.id === 'docs' && <BookOpen size={16} />}
              {tab.id === 'scenarios' && <PlayCircle size={16} />}
              {tab.label}
            </button>
          ))}
        </div>
        <div className="guided-intake-dock-help"><CircleHelp size={16} />{isZh ? '鍵盤：Tab / 方向鍵' : 'Keyboard: Tab / arrow keys'}</div>
      </footer>
    </div>
  );
}

function UtilityPanel({ kicker, title, lead, children }: { kicker: string; title: string; lead: string; children: ReactNode }) {
  return (
    <section className="guided-intake-utility-panel">
      <p className="editorial-kicker">{kicker}</p>
      <h1 className="display-serif">{title}</h1>
      <p>{lead}</p>
      {children}
    </section>
  );
}

function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / (1024 ** exponent);
  return `${value.toFixed(value >= 10 || exponent === 0 ? 0 : 1)} ${units[exponent]}`;
}
