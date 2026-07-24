import { Archive, ArrowRight, FileUp, FolderOpen, FolderSearch } from 'lucide-react';

type BundleIntakePanelProps = {
  language: string;
  isBusy: boolean;
  pendingFileCount: number;
  hasPrimaryFile: boolean;
  onUploadFiles: () => void;
  onUploadFolder: () => void;
  onUploadZip: () => void;
  onAnalyze: () => void;
};

export function BundleIntakePanel({
  language,
  isBusy,
  pendingFileCount,
  hasPrimaryFile,
  onUploadFiles,
  onUploadFolder,
  onUploadZip,
  onAnalyze,
}: BundleIntakePanelProps) {
  const isZh = language.startsWith('zh');

  return (
    <section className="bundle-intake-panel" aria-labelledby="bundle-intake-title" data-testid="bundle-intake-panel">
      <header>
        <h2 id="bundle-intake-title" className="display-serif">{isZh ? '匯入 skill bundle' : 'Import a skill bundle'}</h2>
        <p>{isZh ? '選擇原始檔案／資料夾，或直接匯入資料夾 ZIP。系統會要求指定主要 SKILL，其他項目會成為支援內容。' : 'Choose source files or a folder, or import a folder ZIP. The primary SKILL stays explicit and remaining items become supporting context.'}</p>
      </header>
      <div className="bundle-intake-panel__choices">
        <article>
          <span className="bundle-intake-panel__icon"><FolderOpen size={34} aria-hidden="true" /></span>
          <h3>{isZh ? '上傳檔案／資料夾' : 'Upload files or folder'}</h3>
          <p>{isZh ? '保留原始資料夾結構，適合直接檢查開發中的 skill bundle。' : 'Preserve the source structure for an in-progress skill bundle.'}</p>
          <div>
            <button type="button" disabled={isBusy} onClick={onUploadFiles}>
              <FileUp size={16} aria-hidden="true" />
              {isZh ? '選擇檔案' : 'Choose files'}
            </button>
            <button type="button" disabled={isBusy} onClick={onUploadFolder}>
              <FolderSearch size={16} aria-hidden="true" />
              {isZh ? '選擇資料夾' : 'Choose folder'}
            </button>
          </div>
        </article>
        <article>
          <span className="bundle-intake-panel__icon"><Archive size={34} aria-hidden="true" /></span>
          <h3>{isZh ? '上傳資料夾 ZIP' : 'Upload a folder ZIP'}</h3>
          <p>{isZh ? '一次匯入封裝好的 bundle；ZIP 會在瀏覽器中展開並保留相對路徑。' : 'Import a packaged bundle; the ZIP is expanded in-browser with relative paths retained.'}</p>
          <button type="button" disabled={isBusy} onClick={onUploadZip}>
            <Archive size={16} aria-hidden="true" />
            {isZh ? '選擇 ZIP 檔案' : 'Choose ZIP file'}
          </button>
        </article>
      </div>
      <footer className="bundle-intake-panel__footer">
        <span>
          {pendingFileCount > 0
            ? (isZh ? `已選擇 ${pendingFileCount} 個檔案` : `${pendingFileCount} file${pendingFileCount === 1 ? '' : 's'} selected`)
            : (isZh ? '選擇 bundle 後即可開始分析' : 'Choose a bundle to begin analysis')}
        </span>
        <button
          type="button"
          data-testid="bundle-analyze-button"
          disabled={isBusy || !hasPrimaryFile}
          onClick={onAnalyze}
        >
          {isBusy ? (isZh ? '分析中…' : 'Analyzing…') : (isZh ? '審查並分析' : 'Review and analyze')}
          <ArrowRight size={16} aria-hidden="true" />
        </button>
      </footer>
    </section>
  );
}
