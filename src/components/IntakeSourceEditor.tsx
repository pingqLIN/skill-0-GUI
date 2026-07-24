import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, FileCode2, FileText, RotateCcw, Search, ShieldCheck } from 'lucide-react';
import type { PreparedUploadFile } from '../types/intake';

type IntakeSourceEditorProps = {
  files: PreparedUploadFile[];
  primaryPath: string | null;
  isBusy: boolean;
  language: string;
  onSelectPrimary: (path: string) => void;
  onUpdateFile: (path: string, text: string) => void;
  onAnalyze: () => void;
};

export function IntakeSourceEditor({
  files,
  primaryPath,
  isBusy,
  language,
  onSelectPrimary,
  onUpdateFile,
  onAnalyze,
}: IntakeSourceEditorProps) {
  const isZh = language.startsWith('zh');
  const [selectedPath, setSelectedPath] = useState<string | null>(primaryPath ?? files[0]?.path ?? null);
  const [query, setQuery] = useState('');
  const initialTextByPath = useRef(new Map<string, string | undefined>());

  useEffect(() => {
    for (const file of files) {
      if (!initialTextByPath.current.has(file.path)) {
        initialTextByPath.current.set(file.path, file.text);
      }
    }
  }, [files]);

  useEffect(() => {
    if (selectedPath && files.some((file) => file.path === selectedPath)) return;
    setSelectedPath(primaryPath ?? files[0]?.path ?? null);
  }, [files, primaryPath, selectedPath]);

  const visibleFiles = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return files;
    return files.filter((file) => file.path.toLowerCase().includes(normalizedQuery));
  }, [files, query]);
  const selectedFile = files.find((file) => file.path === selectedPath) ?? null;
  const canEdit = Boolean(selectedFile?.text !== undefined) && !isBusy;
  const originalText = selectedFile ? initialTextByPath.current.get(selectedFile.path) : undefined;
  const isModified = Boolean(selectedFile && selectedFile.text !== originalText);

  return (
    <section className="intake-source-editor" aria-labelledby="intake-source-editor-title" data-testid="intake-source-editor">
      <header className="intake-source-editor__header">
        <div>
          <p className="editorial-kicker">{isZh ? 'SOURCE EDITOR' : 'SOURCE EDITOR'}</p>
          <h1 id="intake-source-editor-title" className="display-serif">{isZh ? '分析前先整理原始內容' : 'Prepare source before analysis'}</h1>
          <p>{isZh ? '在瀏覽器內編輯匯入文字檔；分析會使用儲存在此處的最新版本。二進位或無法讀取的檔案保持唯讀。' : 'Edit imported text files in the browser. Analysis uses the latest saved source; binary or unreadable files remain read-only.'}</p>
        </div>
        <div className="intake-source-editor__actions">
          <div className="intake-source-editor__status"><ShieldCheck size={17} aria-hidden="true" />{isZh ? '本機草稿自動儲存' : 'Saved to local draft automatically'}</div>
          <button type="button" className="intake-source-editor__analyze" disabled={isBusy || !primaryPath} onClick={onAnalyze}>
            {isZh ? '分析最新來源' : 'Analyze latest source'} <ArrowRight size={16} aria-hidden="true" />
          </button>
        </div>
      </header>

      <div className="intake-source-editor__workspace">
        <aside aria-label={isZh ? '匯入檔案' : 'Imported files'}>
          <label className="intake-source-editor__search">
            <Search size={16} aria-hidden="true" />
            <span className="sr-only">{isZh ? '搜尋檔案' : 'Search files'}</span>
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={isZh ? '搜尋路徑' : 'Search paths'} />
          </label>
          <div className="intake-source-editor__file-list">
            {visibleFiles.map((file) => (
              <button
                key={file.path}
                type="button"
                className={file.path === selectedPath ? 'is-selected' : ''}
                aria-pressed={file.path === selectedPath}
                onClick={() => setSelectedPath(file.path)}
              >
                {file.text === undefined ? <FileCode2 size={16} aria-hidden="true" /> : <FileText size={16} aria-hidden="true" />}
                <span><strong>{file.name}</strong><small>{file.path}</small></span>
                {file.path === primaryPath && <em>{isZh ? '主要' : 'Primary'}</em>}
              </button>
            ))}
          </div>
        </aside>

        <div className="intake-source-editor__content">
          {selectedFile ? (
            <>
              <div className="intake-source-editor__toolbar">
                <div><strong>{selectedFile.path}</strong><span>{selectedFile.text === undefined ? (isZh ? '唯讀檔案' : 'Read-only file') : (isModified ? (isZh ? '已修改' : 'Modified') : (isZh ? '未修改' : 'Unmodified'))}</span></div>
                <div>
                  {selectedFile.isPrimaryCandidate && (
                    <button type="button" className={selectedFile.path === primaryPath ? 'is-primary' : ''} disabled={isBusy} onClick={() => onSelectPrimary(selectedFile.path)}>
                      {selectedFile.path === primaryPath ? (isZh ? '主要 SKILL' : 'Primary SKILL') : (isZh ? '設為主要 SKILL' : 'Set as primary SKILL')}
                    </button>
                  )}
                  <button type="button" disabled={!isModified || isBusy} onClick={() => onUpdateFile(selectedFile.path, originalText ?? '')}>
                    <RotateCcw size={15} aria-hidden="true" />{isZh ? '還原' : 'Revert'}
                  </button>
                </div>
              </div>
              {selectedFile.text === undefined ? (
                <div className="intake-source-editor__readonly"><FileCode2 size={28} aria-hidden="true" /><p>{isZh ? '此檔案不是可讀文字，內容不會顯示或修改；它仍會保留在 bundle 中供後續檢查。' : 'This file is not readable text, so its contents are not displayed or changed. It remains in the bundle for later inspection.'}</p></div>
              ) : (
                <textarea
                  aria-label={isZh ? `${selectedFile.name} 原始內容` : `${selectedFile.name} source content`}
                  value={selectedFile.text}
                  disabled={!canEdit}
                  spellCheck={false}
                  onChange={(event) => onUpdateFile(selectedFile.path, event.target.value)}
                />
              )}
            </>
          ) : <div className="intake-source-editor__readonly"><p>{isZh ? '尚未匯入可編輯的檔案。' : 'No editable file has been imported yet.'}</p></div>}
        </div>
      </div>
    </section>
  );
}
