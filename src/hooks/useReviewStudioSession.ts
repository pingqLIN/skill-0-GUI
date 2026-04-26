import { useCallback, useState, type ChangeEvent, type DragEvent } from 'react';
import { applyEditorSave } from '../services/editorSaveService';
import { analyzeSkillText, resolveSkillUrl } from '../services/parserBridgeService';
import { buildReviewDataFromSkillDocument, parseSkillDocumentJson } from '../services/skillDocumentAdapter';
import { prepareUploads } from '../services/uploadPreparationService';
import type { DemoReviewPreset, DemoScenarioDefinition } from '../types/demo';
import type { PreparedUploadFile, UploadedContextFile } from '../types/intake';
import type { SkillDocument } from '../types/skillDocument';
import type { EditorConfig } from '../types/workspace';
import { useWorkspaceDraftState, type WorkspaceDraftSnapshot } from './useWorkspaceDraftState';

type UseReviewStudioSessionArgs = {
  exampleDemoPreset: DemoReviewPreset | null;
  t: (key: string) => string;
};

export function useReviewStudioSession({ exampleDemoPreset, t }: UseReviewStudioSessionArgs) {
  const [isExtracting, setIsExtracting] = useState(false);
  const [isDragActive, setIsDragActive] = useState(false);
  const [data, setData] = useState<any | null>(null);
  const [analysisSessionId, setAnalysisSessionId] = useState(0);
  const [originalData, setOriginalData] = useState<any | null>(null);
  const [modifiedPaths, setModifiedPaths] = useState<Set<string>>(new Set());
  const [inputText, setInputText] = useState('');
  const [skillUrlInput, setSkillUrlInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pendingUploadFiles, setPendingUploadFiles] = useState<PreparedUploadFile[]>([]);
  const [pendingPrimaryPath, setPendingPrimaryPath] = useState<string | null>(null);
  const [supportFiles, setSupportFiles] = useState<UploadedContextFile[]>([]);
  const [selectedContextPath, setSelectedContextPath] = useState<string | null>(null);
  const [activeDemoPreset, setActiveDemoPreset] = useState<DemoReviewPreset | null>(null);

  const handleApplyWorkspaceDraftSnapshot = useCallback((snapshot: WorkspaceDraftSnapshot) => {
    setData(snapshot.data);
    setOriginalData(snapshot.originalData);
    setModifiedPaths(new Set(snapshot.modifiedPaths));
    setInputText(snapshot.inputText);
    setSkillUrlInput(snapshot.skillUrlInput);
    setPendingUploadFiles(snapshot.pendingUploadFiles);
    setPendingPrimaryPath(snapshot.pendingPrimaryPath);
    setSupportFiles(snapshot.supportFiles);
    setSelectedContextPath(snapshot.selectedContextPath);
    setActiveDemoPreset(null);
  }, []);

  const {
    availableWorkspaceDraft,
    workspaceDraftSavedAt,
    workspaceDraftRestored,
    restoreAvailableWorkspaceDraft,
    discardWorkspaceDraft,
    clearWorkspaceDraftState,
  } = useWorkspaceDraftState({
    data,
    originalData,
    modifiedPaths,
    inputText,
    skillUrlInput,
    pendingUploadFiles,
    pendingPrimaryPath,
    supportFiles,
    selectedContextPath,
    onApplySnapshot: handleApplyWorkspaceDraftSnapshot,
  });

  const loadSkillDocument = (
    document: SkillDocument,
    options: {
      demoPreset?: DemoReviewPreset | null;
      fileName?: string;
      sourceLabel?: string;
      supportFiles?: UploadedContextFile[];
      selectedContextPath?: string | null;
    } = {},
  ) => {
    const imported = buildReviewDataFromSkillDocument(document, options);
    setData(imported);
    setAnalysisSessionId((current) => current + 1);
    setOriginalData(JSON.parse(JSON.stringify(imported)));
    setModifiedPaths(new Set());
    setPendingUploadFiles([]);
    setPendingPrimaryPath(null);
    setSupportFiles(options.supportFiles ?? []);
    setSelectedContextPath(options.selectedContextPath ?? null);
    setInputText(JSON.stringify(document, null, 2));
    setActiveDemoPreset(options.demoPreset ?? null);
    setError(null);
  };

  const applyAnalysisResult = (result: any) => {
    setData(result);
    setAnalysisSessionId((current) => current + 1);
    setOriginalData(JSON.parse(JSON.stringify(result)));
    setModifiedPaths(new Set());
    setPendingUploadFiles([]);
    setPendingPrimaryPath(null);
  };

  const getUrlImportErrorMessage = (err: unknown) => {
    const code = typeof err === 'object' && err && 'code' in err && typeof err.code === 'string'
      ? err.code
      : null;
    const detail = typeof err === 'object' && err && 'detail' in err && typeof err.detail === 'string'
      ? err.detail
      : null;

    if (code === 'missing_skill_url') return t('app.errorSkillUrlEmpty');
    if (code === 'invalid_url') return t('app.errorSkillUrlInvalid');
    if (code === 'unsupported_protocol') return t('app.errorSkillUrlProtocol');
    if (code === 'unsupported_url_host') return t('app.errorSkillUrlUnsupportedHost');
    if (code === 'unsupported_github_url') return t('app.errorSkillUrlUnsupportedGitHub');
    if (code === 'unsupported_file_type') return t('app.errorSkillUrlUnsupportedFileType');
    if (code === 'non_text_response') return t('app.errorSkillUrlNonText');
    if (code === 'empty_remote_content') return t('app.errorSkillUrlEmptyRemote');
    if (code === 'remote_fetch_failed' && detail) return detail;

    if (detail) return detail;
    return err instanceof Error ? err.message : t('app.errorFailed');
  };

  const processSkill = async (
    text: string,
    skillName = 'uploaded-skill',
    options: { contextFiles?: UploadedContextFile[]; primaryPath?: string | null } = {},
  ) => {
    setIsExtracting(true);
    setError(null);
    try {
      const result = await analyzeSkillText(text, skillName, options);
      applyAnalysisResult(result);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : t('app.errorFailed'));
      setData(null);
      setOriginalData(null);
      setModifiedPaths(new Set());
    } finally {
      setIsExtracting(false);
    }
  };

  const handleFiles = async (files: File[]) => {
    if (!files.length) return;

    const preparedFiles = await prepareUploads(files);
    const primaryFile = preparedFiles.find((file) => file.isPrimaryCandidate && file.text) ?? null;
    const standaloneJsonImport = preparedFiles.length === 1 && preparedFiles[0].text
      ? parseSkillDocumentJson(preparedFiles[0].text)
      : null;

    setPendingUploadFiles(preparedFiles);
    setPendingPrimaryPath(primaryFile?.path ?? null);
    setSupportFiles([]);
    setSelectedContextPath(null);
    setActiveDemoPreset(null);
    setSkillUrlInput('');
    setData(null);
    setOriginalData(null);
    setModifiedPaths(new Set());

    if (!primaryFile && standaloneJsonImport) {
      loadSkillDocument(standaloneJsonImport, {
        fileName: preparedFiles[0].name,
        sourceLabel: preparedFiles[0].path,
      });
      return;
    }

    if (primaryFile) {
      setInputText(primaryFile.text || '');
      setError(null);
      return;
    }

    setInputText('');
    setError(t('app.errorPrimarySkillMissing'));
  };

  const handleDrop = (event: DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragActive(false);
    const files = event.dataTransfer.files ? Array.from(event.dataTransfer.files) : [];
    if (files.length) {
      void handleFiles(files as File[]);
    }
  };

  const handleDragEnter = (event: DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    if (event.dataTransfer.types.includes('Files')) {
      setIsDragActive(true);
    }
  };

  const handleDragLeave = (event: DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    const nextTarget = event.relatedTarget as Node | null;
    if (!nextTarget || !event.currentTarget.contains(nextTarget)) {
      setIsDragActive(false);
    }
  };

  const handleFileInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []) as File[];
    if (files.length) {
      void handleFiles(files);
    }
    event.target.value = '';
  };

  const handleAnalyzeTextInput = async () => {
    const trimmed = inputText.trim();

    if (trimmed) {
      setPendingUploadFiles([]);
      setPendingPrimaryPath(null);
      setActiveDemoPreset(null);
      setSkillUrlInput('');
      const importedSkillDocument = parseSkillDocumentJson(trimmed);
      if (importedSkillDocument) {
        loadSkillDocument(importedSkillDocument, {
          fileName: 'pasted-skill.json',
          sourceLabel: 'json/paste',
        });
        return;
      }
      await processSkill(inputText);
    } else {
      setError(t('app.errorEmpty'));
    }
  };

  const handleAnalyzeSkillUrl = async () => {
    const trimmed = skillUrlInput.trim();

    if (!trimmed) {
      setError(t('app.errorSkillUrlEmpty'));
      return;
    }

    setIsExtracting(true);
    setError(null);
    setPendingUploadFiles([]);
    setPendingPrimaryPath(null);
    setSupportFiles([]);
    setSelectedContextPath(null);
    setActiveDemoPreset(null);

    try {
      const payload = await resolveSkillUrl(trimmed);
      setInputText(payload.text);

      const importedSkillDocument = parseSkillDocumentJson(payload.text);
      if (importedSkillDocument) {
        loadSkillDocument(importedSkillDocument, {
          fileName: payload.fileName,
          sourceLabel: payload.resolvedUrl,
        });
        return;
      }

      const result = await analyzeSkillText(payload.text, payload.fileName, {
        primaryPath: payload.primaryPath,
      });
      applyAnalysisResult(result);
    } catch (err) {
      const isHandledUrlImportError = typeof err === 'object' && err && 'code' in err && typeof err.code === 'string';
      if (!isHandledUrlImportError) {
        console.error(err);
      }
      setError(getUrlImportErrorMessage(err));
      setData(null);
      setOriginalData(null);
      setModifiedPaths(new Set());
    } finally {
      setIsExtracting(false);
    }
  };

  const handleAnalyzePendingUpload = () => {
    const primaryFile = pendingUploadFiles.find((file) => file.path === pendingPrimaryPath && file.text)
      ?? pendingUploadFiles.find((file) => file.isPrimaryCandidate && file.text);

    if (!primaryFile?.text) {
      setError(t('app.errorPrimarySkillMissing'));
      return;
    }

    const contextEntries = pendingUploadFiles
      .filter((file) => file.path !== primaryFile.path)
      .map(({ isPrimaryCandidate, role: _role, ...rest }) => ({
        ...rest,
        role: 'context' as const,
      }));

    setSupportFiles(contextEntries);
    setSelectedContextPath(contextEntries[0]?.path ?? null);
    setActiveDemoPreset(null);
    setSkillUrlInput('');
    setInputText(primaryFile.text);
    const importedSkillDocument = parseSkillDocumentJson(primaryFile.text);
    if (importedSkillDocument) {
      loadSkillDocument(importedSkillDocument, {
        fileName: primaryFile.name,
        sourceLabel: primaryFile.path,
        selectedContextPath: contextEntries[0]?.path ?? null,
        supportFiles: contextEntries,
      });
      return;
    }
    void processSkill(primaryFile.text, primaryFile.name, {
      contextFiles: contextEntries,
      primaryPath: primaryFile.path,
    });
  };

  const handleSaveEdit = (editorConfig: Exclude<EditorConfig, null>, updatedData: any) => {
    const result = applyEditorSave({
      data,
      editorConfig,
      modifiedPaths,
      updatedData,
    });

    if (!result) {
      return;
    }

    setData(result.data);
    setModifiedPaths(result.modifiedPaths);
  };

  const handleUndo = () => {
    if (originalData) {
      setData(JSON.parse(JSON.stringify(originalData)));
      setModifiedPaths(new Set());
    }
  };

  const handleResetWorkspace = () => {
    clearWorkspaceDraftState();
    setData(null);
    setOriginalData(null);
    setModifiedPaths(new Set());
    setInputText('');
    setSkillUrlInput('');
    setPendingUploadFiles([]);
    setPendingPrimaryPath(null);
    setSupportFiles([]);
    setSelectedContextPath(null);
    setActiveDemoPreset(null);
    setError(null);
  };

  const loadExampleSkill = async () => {
    setIsExtracting(true);
    setError(null);
    try {
      const response = await fetch('/api/example-skill');
      const payload = await response.json().catch(() => null);

      if (!response.ok || !payload?.text) {
        throw new Error(payload?.error || t('app.errorFailed'));
      }

      setSupportFiles(payload?.source ? [{
        name: payload.name || 'example-skill',
        path: payload.source,
        type: 'example/skill',
        size: payload.text.length,
        role: 'context',
        source: 'upload',
        preview: payload.source,
      }] : []);
      setSelectedContextPath(payload?.source || null);
      setInputText(payload.text);
      setSkillUrlInput('');
      setPendingUploadFiles([]);
      setPendingPrimaryPath(null);
      setActiveDemoPreset(exampleDemoPreset);
      await processSkill(payload.text, payload.name || 'example-skill');
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : t('app.errorFailed'));
    } finally {
      setIsExtracting(false);
    }
  };

  const loadCuratedScenario = (scenario: DemoScenarioDefinition) => {
    if (scenario.type === 'server-example') {
      void loadExampleSkill();
      return;
    }

    const text = scenario.text || '';
    const contextFiles = scenario.contextFiles || [];
    setActiveDemoPreset(scenario.reviewPreset ?? null);
    setSupportFiles(contextFiles);
    setSelectedContextPath(contextFiles[0]?.path ?? null);
    setInputText(text);
    setSkillUrlInput('');
    setPendingUploadFiles([]);
    setPendingPrimaryPath(null);
    setError(null);
    void processSkill(text, scenario.skillName || 'demo-scenario', {
      contextFiles,
      primaryPath: scenario.primaryPath ?? null,
    });
  };

  return {
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
  };
}
