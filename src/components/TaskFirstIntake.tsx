import { useId, useState } from 'react';
import type { DragEventHandler, KeyboardEvent } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  CircleAlert,
  ClipboardPaste,
  FileText,
  FileUp,
  Files,
  FlaskConical,
  FolderOpen,
  FolderSearch,
  Link2,
  LoaderCircle,
  Upload,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export type TaskFirstTask = 'review' | 'compare' | 'draft' | 'demo';
export type TaskFirstIntakeTab = 'paste' | 'upload' | 'url';

type IntakeStatus = {
  label: string;
  detail?: string;
  tone?: 'neutral' | 'success' | 'warning' | 'error';
};

export type TaskFirstIntakeCopy = {
  kicker: string;
  title: string;
  lead: string;
  chooseTask: string;
  chooseTaskLabel: string;
  selected: string;
  select: string;
  inputTitle: string;
  inputHint: string;
  selectedFiles: (count: number) => string;
  pasteTab: string;
  uploadTab: string;
  urlTab: string;
  pasteLabel: string;
  pastePlaceholder: string;
  uploadTitle: string;
  uploadHint: string;
  selectFiles: string;
  selectFolder: string;
  urlLabel: string;
  urlHint: string;
  pasteFormatHint: string;
  uploadFormatHint: string;
  tasks: Record<TaskFirstTask, { title: string; description: string }>;
};

type TaskDefinition = {
  id: TaskFirstTask;
  title: string;
  description: string;
  icon: LucideIcon;
};

type TabDefinition = {
  id: TaskFirstIntakeTab;
  label: string;
  icon: LucideIcon;
};

const taskDefinitions: TaskDefinition[] = [
  { id: 'review', title: '審查一個 skill', description: '對單一 SkillDocument 進行內容與結構驗證。', icon: FileText },
  { id: 'compare', title: '審查 skill bundle', description: '匯入主要 skill 與支援檔案，檢查引用、policy 與執行內容。', icon: Files },
  { id: 'draft', title: '繼續已儲存的草稿', description: '回到先前未完成的審查，繼續後續作業。', icon: FolderOpen },
  { id: 'demo', title: '開啟示範工作區', description: '載入範例資料，以體驗審查流程與工具功能。', icon: FlaskConical },
];

const tabDefinitions: TabDefinition[] = [
  { id: 'paste', label: '貼上內容', icon: ClipboardPaste },
  { id: 'upload', label: '上傳檔案', icon: Upload },
  { id: 'url', label: '從 URL 取得', icon: Link2 },
];

export type TaskFirstIntakeProps = {
  inputText: string;
  skillUrl: string;
  onInputTextChange: (value: string) => void;
  onSkillUrlChange: (value: string) => void;
  onPrimaryAction: () => void;
  onImportUrl: () => void;
  onUploadFiles: () => void;
  onUploadFolder?: () => void;
  onSelectTask?: (task: TaskFirstTask) => void;
  onActiveTabChange?: (tab: TaskFirstIntakeTab) => void;
  onDragEnter?: DragEventHandler<HTMLDivElement>;
  onDragOver?: DragEventHandler<HTMLDivElement>;
  onDragLeave?: DragEventHandler<HTMLDivElement>;
  onDrop?: DragEventHandler<HTMLDivElement>;
  selectedTask?: TaskFirstTask;
  activeTab?: TaskFirstIntakeTab;
  error?: string | null;
  status?: IntakeStatus | null;
  isBusy?: boolean;
  isDragActive?: boolean;
  pendingUploadCount?: number;
  primaryActionDisabled?: boolean;
  primaryActionLabel?: string;
  importUrlLabel?: string;
  copy?: Partial<TaskFirstIntakeCopy>;
  className?: string;
};

const defaultCopy: TaskFirstIntakeCopy = {
  kicker: 'Skill-0 Review Studio',
  title: '導引式 intake：選擇審查目標',
  lead: '選擇本次審查的目的，我們將提供最適合的輸入方式與驗證流程。',
  chooseTask: '選擇審查任務',
  chooseTaskLabel: '選擇審查任務',
  selected: '已選擇',
  select: '選擇',
  inputTitle: '輸入要審查的內容',
  inputHint: '可貼上 SkillDocument、Markdown 或純文字；支援檔案、資料夾與 HTTPS URL。',
  selectedFiles: (count) => `已選擇 ${count} 個檔案`,
  pasteTab: '貼上內容',
  uploadTab: '上傳檔案',
  urlTab: '從 URL 取得',
  pasteLabel: '貼上要審查的內容',
  pastePlaceholder: '# SKILL-001\n\n將 SkillDocument JSON、Markdown 或純文字貼到這裡…',
  uploadTitle: '上傳 skill 與參考資料',
  uploadHint: '選擇一個主要 SKILL 檔案，或連同 policy、script、release checklist 等支援內容一起匯入。',
  selectFiles: '選擇檔案',
  selectFolder: '掃描資料夾',
  urlLabel: 'Skill URL',
  urlHint: '支援 GitHub blob URL、raw.githubusercontent.com 檔案與 raw gist 連結。',
  pasteFormatHint: '支援格式：JSON、Markdown 或純文字（最大 2MB）。',
  uploadFormatHint: '確認主要 skill 後，即可送入標準 parser。',
  tasks: {
    review: { title: '審查一個 skill', description: '對單一 SkillDocument 進行內容與結構驗證。' },
    compare: { title: '審查 skill bundle', description: '匯入主要 skill 與支援檔案，檢查引用、policy 與執行內容。' },
    draft: { title: '繼續已儲存的草稿', description: '回到先前未完成的審查，繼續後續作業。' },
    demo: { title: '開啟示範工作區', description: '載入範例資料，以體驗審查流程與工具功能。' },
  },
};

const statusStyles: Record<NonNullable<IntakeStatus['tone']>, string> = {
  neutral: 'border-border bg-muted text-foreground',
  success: 'border-emerald-600/20 bg-emerald-500/10 text-emerald-950',
  warning: 'border-amber-600/20 bg-amber-500/10 text-amber-950',
  error: 'border-destructive/20 bg-destructive/10 text-destructive',
};

export function TaskFirstIntake({
  inputText, skillUrl, onInputTextChange, onSkillUrlChange, onPrimaryAction, onImportUrl, onUploadFiles,
  onUploadFolder, onSelectTask, onActiveTabChange, onDragEnter, onDragOver, onDragLeave, onDrop,
  selectedTask, activeTab, error, status, isBusy = false, isDragActive = false, pendingUploadCount = 0,
  primaryActionDisabled = false, primaryActionLabel = '開始解析並進入審查', importUrlLabel = '匯入 URL',
  copy: copyOverrides, className = '',
}: TaskFirstIntakeProps) {
  const [uncontrolledTask, setUncontrolledTask] = useState<TaskFirstTask>('review');
  const [uncontrolledTab, setUncontrolledTab] = useState<TaskFirstIntakeTab>('paste');
  const task = selectedTask ?? uncontrolledTask;
  const tab = activeTab ?? uncontrolledTab;
  const instanceId = useId();
  const errorId = `${instanceId}-error`;
  const tabsId = `${instanceId}-tabs`;
  const copy = { ...defaultCopy, ...copyOverrides };
  const tasks = taskDefinitions.map((definition) => ({ ...definition, ...copy.tasks[definition.id] }));
  const tabs = tabDefinitions.map((definition) => ({
    ...definition,
    label: definition.id === 'paste' ? copy.pasteTab : definition.id === 'upload' ? copy.uploadTab : copy.urlTab,
  }));

  const selectTask = (nextTask: TaskFirstTask) => {
    if (selectedTask === undefined) setUncontrolledTask(nextTask);
    onSelectTask?.(nextTask);
  };
  const selectTab = (nextTab: TaskFirstIntakeTab) => {
    if (activeTab === undefined) setUncontrolledTab(nextTab);
    onActiveTabChange?.(nextTab);
  };
  const handleTaskKeyDown = (taskIndex: number, event: KeyboardEvent<HTMLButtonElement>) => {
    const taskButtons = event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="radio"]');
    if (!taskButtons?.length) return;
    const focusTask = (index: number) => {
      const nextIndex = (index + tasks.length) % tasks.length;
      selectTask(tasks[nextIndex].id);
      taskButtons[nextIndex]?.focus();
    };
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') { event.preventDefault(); focusTask(taskIndex + 1); }
    else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') { event.preventDefault(); focusTask(taskIndex - 1); }
    else if (event.key === 'Home') { event.preventDefault(); focusTask(0); }
    else if (event.key === 'End') { event.preventDefault(); focusTask(tasks.length - 1); }
  };
  const handleTabKeyDown = (tabIndex: number, event: KeyboardEvent<HTMLButtonElement>) => {
    const tabsInList = event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="tab"]');
    if (!tabsInList?.length) return;
    const focusTab = (index: number) => {
      const nextIndex = (index + tabs.length) % tabs.length;
      selectTab(tabs[nextIndex].id);
      tabsInList[nextIndex]?.focus();
    };
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') { event.preventDefault(); focusTab(tabIndex + 1); }
    else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') { event.preventDefault(); focusTab(tabIndex - 1); }
    else if (event.key === 'Home') { event.preventDefault(); focusTab(0); }
    else if (event.key === 'End') { event.preventDefault(); focusTab(tabs.length - 1); }
  };
  const currentPrimaryLabel = tab === 'url' ? importUrlLabel : primaryActionLabel;
  const currentPrimaryDisabled = isBusy || primaryActionDisabled || (tab === 'paste' && !inputText.trim()) || (tab === 'upload' && pendingUploadCount === 0) || (tab === 'url' && !skillUrl.trim());
  const runPrimaryAction = () => { if (tab === 'url') { onImportUrl(); return; } onPrimaryAction(); };

  return (
    <section aria-labelledby={`${instanceId}-title`} className={`task-first-intake ${className}`}>
      <div className="border-b border-border/70 px-5 py-5 sm:px-7 sm:py-6">
        <p className="editorial-kicker">{copy.kicker}</p>
        <h1 id={`${instanceId}-title`} className="display-serif mt-3 text-4xl leading-[0.96] text-foreground sm:text-[3.1rem]">{copy.title}</h1>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-muted-foreground sm:text-base">{copy.lead}</p>
      </div>
      <div className="space-y-8 px-5 py-6 sm:px-7 sm:py-7">
        <fieldset>
          <legend className="text-sm font-semibold text-foreground">{copy.chooseTask}</legend>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4" role="radiogroup" aria-label={copy.chooseTaskLabel}>
            {tasks.map(({ id, title, description, icon: Icon }, index) => {
              const isSelected = task === id;
              return <button key={id} data-testid={`intake-task-${id}`} type="button" role="radio" aria-checked={isSelected} tabIndex={isSelected ? 0 : -1} onClick={() => selectTask(id)} onKeyDown={(event) => handleTaskKeyDown(index, event)} className={`group relative flex min-h-52 flex-col items-center border p-5 text-center transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${isSelected ? 'border-primary bg-primary/[0.045] shadow-sm' : 'border-border bg-card hover:border-primary/40 hover:bg-muted/40'}`}>
                <span className={`absolute right-3 top-3 inline-flex h-5 w-5 items-center justify-center rounded-sm border ${isSelected ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-background text-transparent'}`} aria-hidden="true"><CheckCircle2 size={14} strokeWidth={2.5} /></span>
                <span className={`mt-3 flex h-14 w-14 items-center justify-center text-foreground transition-colors ${isSelected ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'}`} aria-hidden="true"><Icon size={45} strokeWidth={1.5} /></span>
                <span className="mt-5 text-lg font-semibold tracking-tight text-foreground">{title}</span><span className="mt-2 text-sm leading-6 text-muted-foreground">{description}</span><span className={`mt-auto pt-5 text-sm font-semibold ${isSelected ? 'text-primary' : 'text-muted-foreground'}`}>{isSelected ? copy.selected : copy.select}</span>
              </button>;
            })}
          </div>
        </fieldset>
        <div>
          <div className="flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-sm font-semibold text-foreground">{copy.inputTitle}</h2><p className="mt-1 text-xs leading-5 text-muted-foreground">{copy.inputHint}</p></div>{pendingUploadCount > 0 && <span className="editorial-chip px-3 py-1.5 text-xs font-medium" aria-live="polite">{copy.selectedFiles(pendingUploadCount)}</span>}</div>
          <div className={`mt-4 border border-border bg-card ${isDragActive ? 'border-primary bg-primary/[0.035]' : ''}`} onDragEnter={onDragEnter} onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}>
            <div className="flex flex-wrap border-b border-border" role="tablist" aria-label={copy.inputTitle}>
              {tabs.map(({ id, label, icon: Icon }, index) => <button key={id} data-testid={`intake-tab-${id}`} id={`${tabsId}-${id}`} type="button" role="tab" aria-selected={tab === id} aria-controls={`${tabsId}-panel-${id}`} tabIndex={tab === id ? 0 : -1} data-state={tab === id ? 'active' : 'inactive'} onClick={() => selectTab(id)} onKeyDown={(event) => handleTabKeyDown(index, event)} className={`inline-flex flex-1 items-center justify-center gap-2 border-r border-border px-4 py-3 text-sm font-semibold transition last:border-r-0 sm:flex-none sm:justify-start ${tab === id ? 'bg-background text-foreground shadow-[inset_0_-2px_0_hsl(var(--primary))]' : 'bg-muted/45 text-muted-foreground hover:bg-muted hover:text-foreground'}`}><Icon size={16} aria-hidden="true" />{label}</button>)}
            </div>
            <div id={`${tabsId}-panel-${tab}`} role="tabpanel" aria-labelledby={`${tabsId}-${tab}`} className="p-4 sm:p-5">
              {tab === 'paste' && <label className="block"><span className="sr-only">{copy.pasteLabel}</span><span className="grid min-h-64 grid-cols-[2.75rem_minmax(0,1fr)] overflow-hidden border border-border bg-muted/45 font-mono text-sm leading-6"><span className="select-none border-r border-border bg-muted px-3 py-4 text-right text-xs leading-6 text-muted-foreground" aria-hidden="true">{Array.from({ length: 9 }, (_, index) => <span key={index} className="block">{index + 1}</span>)}</span><textarea data-testid="skill-text-input" value={inputText} onChange={(event) => onInputTextChange(event.target.value)} placeholder={copy.pastePlaceholder} aria-describedby={error ? errorId : undefined} className="min-h-64 w-full resize-y bg-transparent px-4 py-4 font-mono text-sm leading-6 text-foreground outline-none placeholder:text-muted-foreground/70" /></span></label>}
              {tab === 'upload' && <div className="flex min-h-64 flex-col items-center justify-center border border-dashed border-border bg-muted/30 px-5 py-8 text-center"><FileUp size={36} className="text-muted-foreground" aria-hidden="true" /><h3 className="mt-4 text-base font-semibold text-foreground">{copy.uploadTitle}</h3><p className="mt-2 max-w-lg text-sm leading-6 text-muted-foreground">{copy.uploadHint}</p><div className="mt-5 flex flex-col gap-3 sm:flex-row"><button type="button" onClick={onUploadFiles} disabled={isBusy} className="editorial-button-secondary px-4 py-2.5 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50"><Upload size={16} aria-hidden="true" />{copy.selectFiles}</button>{onUploadFolder && <button type="button" onClick={onUploadFolder} disabled={isBusy} className="editorial-button-secondary px-4 py-2.5 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50"><FolderSearch size={16} aria-hidden="true" />{copy.selectFolder}</button>}</div></div>}
              {tab === 'url' && <form className="flex min-h-64 flex-col justify-center" onSubmit={(event) => { event.preventDefault(); if (!currentPrimaryDisabled) onImportUrl(); }}><label htmlFor={`${instanceId}-skill-url`} className="text-sm font-semibold text-foreground">{copy.urlLabel}</label><p className="mt-2 text-sm leading-6 text-muted-foreground">{copy.urlHint}</p><div className="mt-5 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]"><input id={`${instanceId}-skill-url`} data-testid="skill-url-input" type="url" inputMode="url" value={skillUrl} onChange={(event) => onSkillUrlChange(event.target.value)} placeholder="https://github.com/org/repo/blob/main/SKILL.md" aria-describedby={error ? errorId : undefined} className="editorial-input-surface min-w-0 px-4 py-3 text-sm outline-none" /><button type="submit" disabled={currentPrimaryDisabled} className="editorial-button-primary px-5 py-3 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50"><Link2 size={16} aria-hidden="true" />{importUrlLabel}</button></div></form>}
              {error && <div id={errorId} role="alert" className="mt-4 flex items-start gap-2 border border-destructive/20 bg-destructive/10 px-3 py-3 text-sm leading-6 text-destructive"><CircleAlert size={17} className="mt-0.5 shrink-0" aria-hidden="true" /><span>{error}</span></div>}
              {status && <div role="status" aria-live="polite" className={`mt-4 flex items-start gap-2 border px-3 py-3 text-sm leading-6 ${statusStyles[status.tone ?? 'neutral']}`}>{isBusy ? <LoaderCircle size={17} className="mt-0.5 shrink-0 animate-spin" aria-hidden="true" /> : <CheckCircle2 size={17} className="mt-0.5 shrink-0" aria-hidden="true" />}<span><span className="font-semibold">{status.label}</span>{status.detail ? ` · ${status.detail}` : ''}</span></div>}
              {tab !== 'url' && <div className="mt-5 flex flex-col-reverse gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between"><p className="text-xs leading-5 text-muted-foreground">{tab === 'upload' ? copy.uploadFormatHint : copy.pasteFormatHint}</p><button type="button" onClick={runPrimaryAction} disabled={currentPrimaryDisabled} className="editorial-button-primary shrink-0 px-5 py-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50">{isBusy && <LoaderCircle size={16} className="animate-spin" aria-hidden="true" />}{currentPrimaryLabel}{!isBusy && <ArrowRight size={16} aria-hidden="true" />}</button></div>}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
