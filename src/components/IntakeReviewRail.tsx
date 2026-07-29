import {
  CheckCircle2,
  Circle,
  Clock3,
  Download,
  FileClock,
  ShieldCheck,
} from 'lucide-react';

export type IntakeReadinessState = {
  inputReady?: boolean;
  analysisComplete?: boolean;
  schemaLoaded?: boolean;
  contentValidated?: boolean;
  reviewApproved?: boolean;
};

export type IntakeReviewActivity = {
  id: string;
  label: string;
  detail?: string;
  timestamp?: string;
  status?: 'complete' | 'current' | 'pending';
};

export type IntakeDraftState = {
  isDirty?: boolean;
  savedAt?: string | null;
};

export type IntakeExportState = {
  ready?: boolean;
  reason?: string;
};

export type IntakeReviewRailCopy = {
  title: string;
  currentMode: string;
  noMode: string;
  session: string;
  readiness: string;
  completed: (complete: number, total: number) => string;
  inputReady: string;
  analysisComplete: string;
  schemaLoaded: string;
  contentValidated: string;
  reviewApproved: string;
  draftProgress: string;
  draftUnsaved: string;
  draftSaved: string;
  draftNone: string;
  recentActivity: string;
  noActivity: string;
  exportReadiness: string;
  exportReady: string;
  exportBlocked: string;
  exportPending: string;
  notProvided: string;
};

export const defaultIntakeReviewRailCopy: IntakeReviewRailCopy = {
  title: '審查置邊欄',
  currentMode: '目前模式',
  noMode: '尚未選擇',
  session: 'Session',
  readiness: '審查就緒度',
  completed: (complete, total) => `已完成 ${complete} / ${total} 項檢查`,
  inputReady: '已準備審查內容',
  analysisComplete: '分析已完成',
  schemaLoaded: 'Schema 已載入',
  contentValidated: '內容已驗證',
  reviewApproved: '審查已核可',
  draftProgress: '交付進度',
  draftUnsaved: '本機草稿有未儲存的變更',
  draftSaved: '本機草稿已儲存',
  draftNone: '尚未儲存本機草稿',
  recentActivity: '最近活動',
  noActivity: '尚未有審查活動',
  exportReadiness: '匯出就緒度',
  exportReady: '可匯出',
  exportBlocked: '尚不可匯出',
  exportPending: '等待審查完成',
  notProvided: '未提供',
};

export type IntakeReviewRailProps = {
  mode?: string | null;
  sessionId?: string | null;
  readiness?: IntakeReadinessState;
  draft?: IntakeDraftState;
  activities?: IntakeReviewActivity[];
  exportState?: IntakeExportState;
  copy?: IntakeReviewRailCopy;
  className?: string;
};

type ReadinessItem = {
  key: keyof IntakeReadinessState;
  label: string;
};

export function IntakeReviewRail({
  mode,
  sessionId,
  readiness = {},
  draft,
  activities = [],
  exportState,
  copy = defaultIntakeReviewRailCopy,
  className = '',
}: IntakeReviewRailProps) {
  const readinessItems: ReadinessItem[] = [
    { key: 'inputReady', label: copy.inputReady },
    { key: 'analysisComplete', label: copy.analysisComplete },
    { key: 'schemaLoaded', label: copy.schemaLoaded },
    { key: 'contentValidated', label: copy.contentValidated },
    { key: 'reviewApproved', label: copy.reviewApproved },
  ];
  const completedChecks = readinessItems.filter(({ key }) => readiness[key] === true).length;
  const completionPercent = (completedChecks / readinessItems.length) * 100;
  const inferredExportReady = readiness.contentValidated === true && readiness.reviewApproved === true;
  const exportReady = exportState?.ready ?? inferredExportReady;
  const exportStatus = exportReady
    ? copy.exportReady
    : completedChecks === 0
      ? copy.exportPending
      : copy.exportBlocked;
  const draftStatus = draft?.isDirty
    ? copy.draftUnsaved
    : draft?.savedAt
      ? copy.draftSaved
      : copy.draftNone;

  return (
    <aside
      aria-labelledby="intake-review-rail-title"
      className={`order-last min-w-0 border-t border-border/70 bg-card/70 px-5 py-6 text-foreground sm:px-6 2xl:order-none 2xl:sticky 2xl:top-28 2xl:self-start 2xl:border-l 2xl:border-t-0 ${className}`}
    >
      <div className="space-y-6">
        <header>
          <h2 id="intake-review-rail-title" className="text-sm font-semibold tracking-[0.08em] text-foreground">
            {copy.title}
          </h2>
          <dl className="mt-3 space-y-1 text-sm">
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-muted-foreground">{copy.currentMode}</dt>
              <dd className="min-w-0 truncate text-right font-medium">{mode || copy.noMode}</dd>
            </div>
            {sessionId ? (
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-muted-foreground">{copy.session}</dt>
                <dd className="min-w-0 truncate font-mono text-xs text-foreground/80">{sessionId}</dd>
              </div>
            ) : null}
          </dl>
        </header>

        <section aria-labelledby="intake-readiness-title" className="border-t border-border/70 pt-5">
          <div className="flex items-baseline justify-between gap-3">
            <h3 id="intake-readiness-title" className="text-sm font-semibold">{copy.readiness}</h3>
            <span className="shrink-0 text-xs text-muted-foreground">{copy.completed(completedChecks, readinessItems.length)}</span>
          </div>
          <div
            aria-label={copy.completed(completedChecks, readinessItems.length)}
            aria-valuemax={readinessItems.length}
            aria-valuemin={0}
            aria-valuenow={completedChecks}
            className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted"
            role="progressbar"
          >
            <div className="h-full rounded-full bg-primary transition-[width] duration-300 motion-reduce:transition-none" style={{ width: `${completionPercent}%` }} />
          </div>
          <ul className="mt-4 space-y-2.5" aria-label={copy.readiness}>
            {readinessItems.map(({ key, label }) => {
              const complete = readiness[key] === true;
              return (
                <li key={key} className={`flex items-center gap-2 text-sm ${complete ? 'text-foreground' : 'text-muted-foreground'}`}>
                  {complete ? <CheckCircle2 aria-hidden="true" size={16} className="shrink-0 text-emerald-600" /> : <Circle aria-hidden="true" size={16} className="shrink-0" />}
                  <span>{label}</span>
                </li>
              );
            })}
          </ul>
        </section>

        <section aria-labelledby="intake-draft-progress-title" className="border-t border-border/70 pt-5">
          <h3 id="intake-draft-progress-title" className="text-sm font-semibold">{copy.draftProgress}</h3>
          <div className="mt-3 flex items-start gap-2 text-sm text-muted-foreground">
            <FileClock aria-hidden="true" size={17} className="mt-0.5 shrink-0" />
            <div>
              <p className="text-foreground">{draftStatus}</p>
              {draft?.savedAt ? <p className="mt-1 text-xs">{draft.savedAt}</p> : null}
            </div>
          </div>
        </section>

        <section aria-labelledby="intake-recent-activity-title" className="border-t border-border/70 pt-5">
          <h3 id="intake-recent-activity-title" className="text-sm font-semibold">{copy.recentActivity}</h3>
          {activities.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">{copy.noActivity}</p>
          ) : (
            <ol className="mt-3 space-y-3" aria-label={copy.recentActivity}>
              {activities.map((activity) => (
                <li key={activity.id} className="flex gap-2.5 text-sm">
                  <ActivityIcon status={activity.status} />
                  <div className="min-w-0">
                    <p className="text-foreground">{activity.label}</p>
                    {activity.detail ? <p className="mt-0.5 text-xs text-muted-foreground">{activity.detail}</p> : null}
                    {activity.timestamp ? <time className="mt-1 block text-xs text-muted-foreground">{activity.timestamp}</time> : null}
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>

        <section aria-labelledby="intake-export-readiness-title" className="border-t border-border/70 pt-5">
          <h3 id="intake-export-readiness-title" className="text-sm font-semibold">{copy.exportReadiness}</h3>
          <div className={`mt-3 flex items-start gap-2 text-sm ${exportReady ? 'text-emerald-700' : 'text-muted-foreground'}`}>
            {exportReady ? <ShieldCheck aria-hidden="true" size={17} className="mt-0.5 shrink-0" /> : <Download aria-hidden="true" size={17} className="mt-0.5 shrink-0" />}
            <div>
              <p className="font-medium">{exportStatus}</p>
              {exportState?.reason ? <p className="mt-1 text-xs text-muted-foreground">{exportState.reason}</p> : null}
            </div>
          </div>
        </section>
      </div>
    </aside>
  );
}

function ActivityIcon({ status }: { status: IntakeReviewActivity['status'] }) {
  if (status === 'complete') {
    return <CheckCircle2 aria-hidden="true" size={16} className="mt-0.5 shrink-0 text-emerald-600" />;
  }

  if (status === 'current') {
    return <Clock3 aria-hidden="true" size={16} className="mt-0.5 shrink-0 text-primary" />;
  }

  return <Circle aria-hidden="true" size={16} className="mt-0.5 shrink-0 text-muted-foreground" />;
}
