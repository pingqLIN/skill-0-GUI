import { useEffect, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { Download, FilePenLine, Files, Trash2, X } from 'lucide-react';
import type { WorkspaceDraftEntry } from '../hooks/useWorkspaceDraftState';

type DraftLibraryProps = {
  drafts: WorkspaceDraftEntry[];
  activeDraftId: string | null;
  language: string;
  onEditDraft: (draftId: string) => void;
  onDeleteDraft: (draftId: string) => void;
  onExportDraft: (draftId: string) => void;
};

export function DraftLibrary({
  drafts,
  activeDraftId,
  language,
  onEditDraft,
  onDeleteDraft,
  onExportDraft,
}: DraftLibraryProps) {
  const isZh = language.startsWith('zh');
  const [selectedDraftId, setSelectedDraftId] = useState<string | null>(activeDraftId ?? drafts[0]?.id ?? null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  useEffect(() => {
    if (selectedDraftId && drafts.some((draft) => draft.id === selectedDraftId)) return;
    setSelectedDraftId(activeDraftId ?? drafts[0]?.id ?? null);
    setPendingDeleteId(null);
  }, [activeDraftId, drafts, selectedDraftId]);

  const selectedDraft = drafts.find((draft) => draft.id === selectedDraftId) ?? null;
  const handleDraftKeyDown = (index: number, event: KeyboardEvent<HTMLButtonElement>) => {
    if (!['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    let nextIndex = index;
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') nextIndex = (index + 1) % drafts.length;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') nextIndex = (index - 1 + drafts.length) % drafts.length;
    if (event.key === 'Home') nextIndex = 0;
    if (event.key === 'End') nextIndex = drafts.length - 1;
    const nextDraft = drafts[nextIndex];
    setSelectedDraftId(nextDraft.id);
    setPendingDeleteId(null);
    event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="radio"]')[nextIndex]?.focus();
  };

  return (
    <section className="draft-library" aria-labelledby="draft-library-title" data-testid="draft-library">
      <header className="draft-library__header">
        <div>
          <h2 id="draft-library-title" className="display-serif">{isZh ? '本機草稿' : 'Local drafts'}</h2>
          <p>{isZh ? `最多保留 5 筆，目前 ${drafts.length} 筆。選擇草稿後可繼續編輯、刪除或輸出。` : `Up to 5 drafts are retained; ${drafts.length} saved. Select one to edit, delete, or export.`}</p>
        </div>
        <span aria-label={isZh ? `${drafts.length} / 5 筆草稿` : `${drafts.length} of 5 drafts`}>
          {drafts.length} / 5
        </span>
      </header>

      {drafts.length === 0 ? (
        <div className="draft-library__empty">
          <Files size={34} aria-hidden="true" />
          <strong>{isZh ? '尚未建立草稿' : 'No drafts yet'}</strong>
          <p>{isZh ? '選擇其他審查任務並開始輸入，系統會自動在本機建立草稿。' : 'Choose another review task and start entering content; a local draft will be created automatically.'}</p>
        </div>
      ) : (
        <>
          <div className="draft-library__list" role="radiogroup" aria-label={isZh ? '選擇草稿' : 'Choose a draft'}>
            {drafts.map((draft, index) => {
              const isSelected = draft.id === selectedDraftId;
              const detail = draft.pendingUploadFiles.length > 0
                ? (isZh ? `${draft.pendingUploadFiles.length} 個 bundle 檔案` : `${draft.pendingUploadFiles.length} bundle files`)
                : draft.skillUrlInput
                  ? draft.skillUrlInput
                  : (draft.inputText.trim().split(/\s+/).length
                    ? (isZh ? `${draft.inputText.trim().split(/\s+/).length} 個文字單位` : `${draft.inputText.trim().split(/\s+/).length} text units`)
                    : (isZh ? '尚未輸入內容' : 'No content yet'));
              return (
                <button
                  key={draft.id}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  tabIndex={isSelected ? 0 : -1}
                  className={isSelected ? 'is-selected' : ''}
                  data-testid={`draft-row-${draft.id}`}
                  onClick={() => {
                    setSelectedDraftId(draft.id);
                    setPendingDeleteId(null);
                  }}
                  onKeyDown={(event) => handleDraftKeyDown(index, event)}
                >
                  <span className="draft-library__selector" aria-hidden="true" />
                  <span>
                    <strong>{draft.title}</strong>
                    <small>{detail}</small>
                  </span>
                  <time dateTime={draft.updatedAt ?? undefined}>
                    {draft.updatedAt
                      ? new Date(draft.updatedAt).toLocaleString(isZh ? 'zh-TW' : 'en-US')
                      : (isZh ? '時間未記錄' : 'Time unavailable')}
                  </time>
                </button>
              );
            })}
          </div>

          <div className="draft-library__actions" aria-live="polite">
            {pendingDeleteId === selectedDraft?.id ? (
              <>
                <span>{isZh ? `確定刪除「${selectedDraft?.title}」？` : `Delete “${selectedDraft?.title}”?`}</span>
                <button
                  type="button"
                  className="is-danger"
                  onClick={() => {
                    if (selectedDraft) onDeleteDraft(selectedDraft.id);
                    setPendingDeleteId(null);
                  }}
                >
                  <Trash2 size={16} aria-hidden="true" />
                  {isZh ? '確認刪除' : 'Confirm delete'}
                </button>
                <button type="button" onClick={() => setPendingDeleteId(null)}>
                  <X size={16} aria-hidden="true" />
                  {isZh ? '取消' : 'Cancel'}
                </button>
              </>
            ) : (
              <>
                <button type="button" disabled={!selectedDraft} onClick={() => selectedDraft && onEditDraft(selectedDraft.id)}>
                  <FilePenLine size={16} aria-hidden="true" />
                  {isZh ? '繼續編輯' : 'Continue editing'}
                </button>
                <button type="button" disabled={!selectedDraft} onClick={() => selectedDraft && onExportDraft(selectedDraft.id)}>
                  <Download size={16} aria-hidden="true" />
                  {isZh ? '輸出草稿' : 'Export draft'}
                </button>
                <button type="button" disabled={!selectedDraft} onClick={() => selectedDraft && setPendingDeleteId(selectedDraft.id)}>
                  <Trash2 size={16} aria-hidden="true" />
                  {isZh ? '刪除草稿' : 'Delete draft'}
                </button>
              </>
            )}
          </div>
        </>
      )}
    </section>
  );
}
