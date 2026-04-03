import React, { Suspense, lazy, useEffect, useRef, useState } from 'react';
import {
  Activity,
  AlertCircle,
  BookOpen,
  FileText,
  Github,
  Languages,
  PlayCircle,
  ShieldCheck,
  UploadCloud,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { analyzeSkillText } from './services/parserBridgeService';
import { fetchBridgeStatus, type BridgeStatus } from './services/bridgeStatusService';
import { buildReviewDataFromSkillDocument, parseSkillDocumentJson } from './services/skillDocumentAdapter';
import type { PreparedUploadFile, UploadedContextFile } from './types/intake';
import type { SkillDocument } from './types/skillDocument';
import type { EditorConfig } from './types/workspace';

const ReviewWorkspace = lazy(() => import('./components/ReviewWorkspace').then((module) => ({ default: module.ReviewWorkspace })));

const GUI_REPO_URL = 'https://github.com/pingqLIN/skill-0-review-studio';
const ENGINE_REPO_URL = 'https://github.com/pingqLIN/skill-0';
const DOCS_INDEX_URL = `${GUI_REPO_URL}/blob/main/docs/README.md`;
const DEMO_PLAN_URL = `${GUI_REPO_URL}/blob/main/docs/20-online-demo-plan-2026-04-03.md`;
const DEPLOYMENT_GUIDE_URL = `${GUI_REPO_URL}/blob/main/docs/06-deployment-operations-and-configuration.md`;
const PRIMARY_SKILL_EXTENSIONS = ['.md', '.skill', '.txt'];
const CONTEXT_PREVIEW_EXTENSIONS = ['.json', '.yaml', '.yml', '.toml', '.ini', '.cfg', '.csv', '.tsv', '.log'];
const WORKSPACE_DRAFT_STORAGE_KEY = 'skill-0-review-studio.workspace-draft.v1';

type WorkspaceDraftSnapshot = {
  data: any | null;
  originalData: any | null;
  modifiedPaths: string[];
  inputText: string;
  pendingUploadFiles: PreparedUploadFile[];
  pendingPrimaryPath: string | null;
  supportFiles: UploadedContextFile[];
  selectedContextPath: string | null;
  updatedAt: string | null;
};

function readWorkspaceDraft(): WorkspaceDraftSnapshot | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(WORKSPACE_DRAFT_STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') {
      return null;
    }

    return {
      data: 'data' in parsed ? parsed.data : null,
      originalData: 'originalData' in parsed ? parsed.originalData : null,
      modifiedPaths: Array.isArray(parsed.modifiedPaths) ? parsed.modifiedPaths.filter((item): item is string => typeof item === 'string') : [],
      inputText: typeof parsed.inputText === 'string' ? parsed.inputText : '',
      pendingUploadFiles: Array.isArray(parsed.pendingUploadFiles) ? parsed.pendingUploadFiles : [],
      pendingPrimaryPath: typeof parsed.pendingPrimaryPath === 'string' ? parsed.pendingPrimaryPath : null,
      supportFiles: Array.isArray(parsed.supportFiles) ? parsed.supportFiles : [],
      selectedContextPath: typeof parsed.selectedContextPath === 'string' ? parsed.selectedContextPath : null,
      updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : null,
    };
  } catch {
    return null;
  }
}

function writeWorkspaceDraft(snapshot: WorkspaceDraftSnapshot) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(WORKSPACE_DRAFT_STORAGE_KEY, JSON.stringify(snapshot));
}

function hasSameWorkspaceDraftContent(left: WorkspaceDraftSnapshot, right: WorkspaceDraftSnapshot) {
  return JSON.stringify({
    data: left.data,
    originalData: left.originalData,
    modifiedPaths: left.modifiedPaths,
    inputText: left.inputText,
    pendingUploadFiles: left.pendingUploadFiles,
    pendingPrimaryPath: left.pendingPrimaryPath,
    supportFiles: left.supportFiles,
    selectedContextPath: left.selectedContextPath,
    updatedAt: null,
  }) === JSON.stringify({
    data: right.data,
    originalData: right.originalData,
    modifiedPaths: right.modifiedPaths,
    inputText: right.inputText,
    pendingUploadFiles: right.pendingUploadFiles,
    pendingPrimaryPath: right.pendingPrimaryPath,
    supportFiles: right.supportFiles,
    selectedContextPath: right.selectedContextPath,
    updatedAt: null,
  });
}

function clearWorkspaceDraft() {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.removeItem(WORKSPACE_DRAFT_STORAGE_KEY);
}

export default function App() {
  const { t, i18n } = useTranslation();
  const darkMode = false;
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const folderInputRef = useRef<HTMLInputElement | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isDragActive, setIsDragActive] = useState(false);
  const [data, setData] = useState<any | null>(null);
  const [analysisSessionId, setAnalysisSessionId] = useState(0);
  const [originalData, setOriginalData] = useState<any | null>(null);
  const [modifiedPaths, setModifiedPaths] = useState<Set<string>>(new Set());
  const [inputText, setInputText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pendingUploadFiles, setPendingUploadFiles] = useState<PreparedUploadFile[]>([]);
  const [pendingPrimaryPath, setPendingPrimaryPath] = useState<string | null>(null);
  const [supportFiles, setSupportFiles] = useState<UploadedContextFile[]>([]);
  const [selectedContextPath, setSelectedContextPath] = useState<string | null>(null);
  const [bridgeStatus, setBridgeStatus] = useState<BridgeStatus | null>(null);
  const [bridgeStatusError, setBridgeStatusError] = useState<string | null>(null);
  const [workspaceDraftSavedAt, setWorkspaceDraftSavedAt] = useState<string | null>(null);
  const [workspaceDraftRestored, setWorkspaceDraftRestored] = useState(false);
  const hasHydratedWorkspaceDraftRef = useRef(false);
  const skipNextWorkspaceDraftPersistRef = useRef(false);

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

  useEffect(() => {
    const snapshot = readWorkspaceDraft();
    if (snapshot) {
      setData(snapshot.data);
      setOriginalData(snapshot.originalData);
      setModifiedPaths(new Set(snapshot.modifiedPaths));
      setInputText(snapshot.inputText);
      setPendingUploadFiles(snapshot.pendingUploadFiles);
      setPendingPrimaryPath(snapshot.pendingPrimaryPath);
      setSupportFiles(snapshot.supportFiles);
      setSelectedContextPath(snapshot.selectedContextPath);
      setWorkspaceDraftSavedAt(snapshot.updatedAt);
      setWorkspaceDraftRestored(true);
      skipNextWorkspaceDraftPersistRef.current = true;
    }

    hasHydratedWorkspaceDraftRef.current = true;
  }, []);

  useEffect(() => {
    if (!hasHydratedWorkspaceDraftRef.current) {
      return;
    }

    if (skipNextWorkspaceDraftPersistRef.current) {
      skipNextWorkspaceDraftPersistRef.current = false;
      return;
    }

    const hasDraftState = Boolean(
      data
      || originalData
      || inputText.trim()
      || pendingUploadFiles.length > 0
      || supportFiles.length > 0,
    );

    if (!hasDraftState) {
      clearWorkspaceDraft();
      setWorkspaceDraftSavedAt(null);
      setWorkspaceDraftRestored(false);
      return;
    }

    const nextSnapshot: WorkspaceDraftSnapshot = {
      data,
      originalData,
      modifiedPaths: Array.from(modifiedPaths),
      inputText,
      pendingUploadFiles,
      pendingPrimaryPath,
      supportFiles,
      selectedContextPath,
      updatedAt: workspaceDraftSavedAt,
    };
    const existingSnapshot = readWorkspaceDraft();
    if (existingSnapshot && hasSameWorkspaceDraftContent(existingSnapshot, nextSnapshot)) {
      if (workspaceDraftRestored) {
        return;
      }
    }

    const updatedAt = new Date().toISOString();
    writeWorkspaceDraft({
      ...nextSnapshot,
      updatedAt,
    });
    setWorkspaceDraftSavedAt(updatedAt);
    setWorkspaceDraftRestored(false);
  }, [data, originalData, modifiedPaths, inputText, pendingUploadFiles, pendingPrimaryPath, supportFiles, selectedContextPath]);

  const toggleLanguage = () => {
    const newLang = i18n.language.startsWith('zh') ? 'en' : 'zh';
    i18n.changeLanguage(newLang);
  };

  const getExtension = (fileName: string) => {
    const dotIndex = fileName.lastIndexOf('.');
    return dotIndex >= 0 ? fileName.slice(dotIndex).toLowerCase() : '';
  };

  const getUploadPath = (file: File) => file.webkitRelativePath || file.name;

  const isPrimarySkillFile = (file: File) => {
    const target = getUploadPath(file).toLowerCase();
    const extension = getExtension(target);
    return PRIMARY_SKILL_EXTENSIONS.includes(extension) || target.endsWith('skill.md');
  };

  const isPrimarySkillPath = (path: string) => {
    const lower = path.toLowerCase();
    const extension = getExtension(lower);
    return PRIMARY_SKILL_EXTENSIONS.includes(extension) || lower.endsWith('skill.md');
  };

  const canPreviewAsText = (file: File) => {
    const extension = getExtension(file.name);
    return isPrimarySkillFile(file) || CONTEXT_PREVIEW_EXTENSIONS.includes(extension) || file.type.startsWith('text/');
  };

  const readFileAsText = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result ?? ''));
      reader.onerror = () => reject(reader.error || new Error(`Failed to read ${file.name}`));
      reader.readAsText(file);
    });

  const prepareUploadFile = async (file: File): Promise<PreparedUploadFile> => {
    const path = getUploadPath(file);
    const prepared: PreparedUploadFile = {
      name: file.name,
      path,
      type: file.type || getExtension(file.name) || 'unknown',
      size: file.size,
      role: 'context',
      source: 'upload',
      isPrimaryCandidate: false,
    };

    if (canPreviewAsText(file)) {
      try {
        prepared.text = await readFileAsText(file);
        prepared.preview = prepared.text.slice(0, 280);
        const isSkillDocumentImport = Boolean(parseSkillDocumentJson(prepared.text));
        prepared.isPrimaryCandidate = isPrimarySkillFile(file) || isSkillDocumentImport;
        prepared.role = prepared.isPrimaryCandidate ? 'primary' : 'context';
      } catch {
        prepared.text = undefined;
      }
    } else {
      prepared.isPrimaryCandidate = isPrimarySkillFile(file);
      prepared.role = prepared.isPrimaryCandidate ? 'primary' : 'context';
    }

    return prepared;
  };

  const expandZipUpload = async (file: File): Promise<PreparedUploadFile[]> => {
    const { default: JSZip } = await import('jszip');
    const zip = await JSZip.loadAsync(file);
    const prepared: PreparedUploadFile[] = [];

    for (const entry of Object.values(zip.files)) {
      if (entry.dir) continue;

      const path = entry.name;
      const basename = path.split('/').pop() || path;
      const extension = getExtension(basename);
      const isPrimaryPathCandidate = isPrimarySkillPath(path);
      const isTextLike = isPrimaryPathCandidate || CONTEXT_PREVIEW_EXTENSIONS.includes(extension) || extension === '.md' || extension === '.txt';

      const item: PreparedUploadFile = {
        name: basename,
        path,
        type: extension || 'zip-entry',
        size: 0,
        role: 'context',
        source: 'zip',
        isPrimaryCandidate: false,
      };

      if (isTextLike) {
        try {
          item.text = await entry.async('string');
          item.size = item.text.length;
          item.preview = item.text.slice(0, 280);
          const isSkillDocumentImport = Boolean(parseSkillDocumentJson(item.text));
          item.isPrimaryCandidate = isPrimaryPathCandidate || isSkillDocumentImport;
          item.role = item.isPrimaryCandidate ? 'primary' : 'context';
        } catch {
          item.text = undefined;
        }
      } else {
        item.isPrimaryCandidate = isPrimaryPathCandidate;
        item.role = item.isPrimaryCandidate ? 'primary' : 'context';
      }

      prepared.push(item);
    }

    return prepared;
  };

  const expandUploads = async (files: File[]) => {
    const prepared: PreparedUploadFile[] = [];

    for (const file of files) {
      if (getExtension(file.name) === '.zip') {
        prepared.push(...await expandZipUpload(file));
      } else {
        prepared.push(await prepareUploadFile(file));
      }
    }

    return prepared;
  };

  const loadSkillDocument = (
    document: SkillDocument,
    options: {
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
    setError(null);
  };

  const handleFiles = async (files: File[]) => {
    if (!files.length) return;

    const preparedFiles = await expandUploads(files);
    const primaryFile = preparedFiles.find((file) => file.isPrimaryCandidate && file.text) ?? null;
    const standaloneJsonImport = preparedFiles.length === 1 && preparedFiles[0].text
      ? parseSkillDocumentJson(preparedFiles[0].text)
      : null;

    setPendingUploadFiles(preparedFiles);
    setPendingPrimaryPath(primaryFile?.path ?? null);
    setSupportFiles([]);
    setSelectedContextPath(null);
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

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    const files = e.dataTransfer.files ? Array.from(e.dataTransfer.files) : [];
    if (files.length) {
      void handleFiles(files as File[]);
    }
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.types.includes('Files')) {
      setIsDragActive(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const nextTarget = e.relatedTarget as Node | null;
    if (!nextTarget || !e.currentTarget.contains(nextTarget)) {
      setIsDragActive(false);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []) as File[];
    if (files.length) {
      void handleFiles(files);
    }
    e.target.value = '';
  };

  const handlePasteUrl = () => {
    const trimmed = inputText.trim();

    if (trimmed) {
      setPendingUploadFiles([]);
      setPendingPrimaryPath(null);
      const importedSkillDocument = parseSkillDocumentJson(trimmed);
      if (importedSkillDocument) {
        loadSkillDocument(importedSkillDocument, {
          fileName: 'pasted-skill.json',
          sourceLabel: 'json/paste',
        });
        return;
      }
      void processSkill(inputText);
    } else {
      setError(t('app.errorEmpty'));
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

  const processSkill = async (
    text: string,
    skillName = 'uploaded-skill',
    options: { contextFiles?: UploadedContextFile[]; primaryPath?: string | null } = {},
  ) => {
    setIsExtracting(true);
    setError(null);
    try {
      const result = await analyzeSkillText(text, skillName, options);
      setData(result);
      setAnalysisSessionId((current) => current + 1);
      setOriginalData(JSON.parse(JSON.stringify(result)));
      setModifiedPaths(new Set());
      setPendingUploadFiles([]);
      setPendingPrimaryPath(null);
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

  const handleSaveEdit = (editorConfig: Exclude<EditorConfig, null>, updatedData: any) => {
    if (!data) return;

    if (editorConfig.type === 'json' || editorConfig.type === 'skillDocument') {
      const sourceLabel = data?.parserResult?.original_definition?.source || 'json/editor';
      const rebuiltData = buildReviewDataFromSkillDocument(updatedData, {
        editSource: editorConfig.type === 'json' ? 'json' : 'structured',
        existingSession: data,
        fileName: `${data.projectId || 'skill-document'}.json`,
        sourceLabel,
      });
      setData(rebuiltData);
      setModifiedPaths(new Set([editorConfig.type === 'json' ? 'skillDocument.json' : 'skillDocument.structured']));
      return;
    }

    const newData = JSON.parse(JSON.stringify(data));
    const newModified = new Set(modifiedPaths);
    let metricsChanged = false;

    if (editorConfig.type === 'global') {
      if (newData.projectName !== updatedData.projectName) newModified.add('projectName');
      if (newData.riskAssessment.level !== updatedData.riskAssessment.level) newModified.add('riskAssessment.level');
      if (newData.threeClassification.category !== updatedData.threeClassification.category) newModified.add('threeClassification.category');

      newData.projectName = updatedData.projectName;
      newData.riskAssessment = updatedData.riskAssessment;
      newData.threeClassification = updatedData.threeClassification;
      metricsChanged = true;
    } else if (editorConfig.type === 'phase') {
      const phaseIndex = newData.phases.findIndex((phase: any) => phase.id === updatedData.id);
      if (phaseIndex !== -1) {
        const oldPhase = newData.phases[phaseIndex];
        const basePath = `phases.${updatedData.id}`;

        if (oldPhase.name !== updatedData.name) newModified.add(`${basePath}.name`);
        if (JSON.stringify(oldPhase.input) !== JSON.stringify(updatedData.input)) newModified.add(`${basePath}.input`);
        if (JSON.stringify(oldPhase.tasks) !== JSON.stringify(updatedData.tasks)) newModified.add(`${basePath}.tasks`);
        if (JSON.stringify(oldPhase.output) !== JSON.stringify(updatedData.output)) newModified.add(`${basePath}.output`);

        newData.phases[phaseIndex] = { ...oldPhase, ...updatedData };
        metricsChanged = true;
      }
    } else if (editorConfig.type === 'decision') {
      const phaseIndex = newData.phases.findIndex((phase: any) => phase.id === editorConfig.phaseId);
      if (phaseIndex !== -1) {
        const nodeIndex = newData.phases[phaseIndex].decisionNodes.findIndex((node: any) => node.id === updatedData.id);
        if (nodeIndex !== -1) {
          const oldNode = newData.phases[phaseIndex].decisionNodes[nodeIndex];
          const basePath = `phases.${editorConfig.phaseId}.decisionNodes.${updatedData.id}`;

          if (oldNode.question !== updatedData.question) newModified.add(`${basePath}.question`);
          if (oldNode.threshold !== updatedData.threshold) newModified.add(`${basePath}.threshold`);
          if (oldNode.outcomes.yes !== updatedData.outcomes.yes) newModified.add(`${basePath}.outcomes.yes`);
          if (oldNode.outcomes.no !== updatedData.outcomes.no) newModified.add(`${basePath}.outcomes.no`);

          newData.phases[phaseIndex].decisionNodes[nodeIndex] = updatedData;
          metricsChanged = true;
        }
      }
    }

    if (metricsChanged) {
      newData.globalMetrics.decisionConfidence = Math.min(100, Math.max(0, newData.globalMetrics.decisionConfidence + Math.floor(Math.random() * 11) - 5));
      newData.globalMetrics.reworkRate = Math.min(100, Math.max(0, newData.globalMetrics.reworkRate + Math.floor(Math.random() * 5) - 2));
      newModified.add('metrics');
    }

    setData(newData);
    setModifiedPaths(newModified);
  };

  const handleUndo = () => {
    if (originalData) {
      setData(JSON.parse(JSON.stringify(originalData)));
      setModifiedPaths(new Set());
    }
  };

  const handleResetWorkspace = () => {
    clearWorkspaceDraft();
    setData(null);
    setOriginalData(null);
    setModifiedPaths(new Set());
    setInputText('');
    setPendingUploadFiles([]);
    setPendingPrimaryPath(null);
    setSupportFiles([]);
    setSelectedContextPath(null);
    setError(null);
    setWorkspaceDraftSavedAt(null);
    setWorkspaceDraftRestored(false);
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
      setPendingUploadFiles([]);
      setPendingPrimaryPath(null);
      await processSkill(payload.text, payload.name || 'example-skill');
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : t('app.errorFailed'));
    } finally {
      setIsExtracting(false);
    }
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
  const landingHighlights = [
    {
      title: t('app.demoFeatureModeTitle'),
      body: t('app.demoFeatureModeBody'),
      icon: ShieldCheck,
    },
    {
      title: t('app.demoFeatureFlowTitle'),
      body: t('app.demoFeatureFlowBody'),
      icon: PlayCircle,
    },
    {
      title: t('app.demoFeatureExportTitle'),
      body: t('app.demoFeatureExportBody'),
      icon: FileText,
    },
  ];
  const landingPaths = [
    {
      title: t('app.demoPathSampleTitle'),
      body: t('app.demoPathSampleBody'),
    },
    {
      title: t('app.demoPathImportTitle'),
      body: t('app.demoPathImportBody'),
    },
    {
      title: t('app.demoPathReviewTitle'),
      body: t('app.demoPathReviewBody'),
    },
  ];
  const landingDocs = [
    {
      title: t('app.demoDocsIndexTitle'),
      body: t('app.demoDocsIndexBody'),
      href: DOCS_INDEX_URL,
    },
    {
      title: t('app.demoDocsDeployTitle'),
      body: t('app.demoDocsDeployBody'),
      href: DEPLOYMENT_GUIDE_URL,
    },
    {
      title: t('app.demoDocsPlanTitle'),
      body: t('app.demoDocsPlanBody'),
      href: DEMO_PLAN_URL,
    },
  ];

  return (
    <div className="app-shell min-h-screen transition-colors duration-300">
      <header className="frost-banner">
        <div className="mx-auto flex max-w-[1680px] items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-sm font-bold text-primary-foreground shadow-[0_18px_40px_-24px_hsl(var(--foreground)/0.55)]">
              S0
            </div>
            <div className="min-w-0">
              <p className="editorial-kicker">{t('app.workspace')}</p>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <h1 className="text-lg font-semibold tracking-tight text-foreground sm:text-xl">{t('app.title')}</h1>
                <span className="hidden text-xs text-muted-foreground/80 sm:inline">{t('app.subtitle')}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className={`hidden rounded-[1rem] border px-3 py-2 text-left backdrop-blur-xl sm:block ${
              bridgeStatus?.mode === 'skill-0'
                ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-800'
                : bridgeStatus?.mode === 'standalone'
                  ? 'border-amber-500/25 bg-amber-500/10 text-amber-800'
                  : 'border-border/50 bg-card/60 text-muted-foreground'
            }`}>
              <div className="text-[10px] font-semibold uppercase tracking-[0.22em] opacity-75">{t('app.bridgeMode')}</div>
              <div className="mt-1 text-xs font-medium">{bridgeModeLabel}</div>
              <div className="mt-1 max-w-[18rem] truncate text-[11px] opacity-80" title={bridgeModeDetail}>
                {bridgeModeDetail}
              </div>
            </div>
            <a
              href={GUI_REPO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-border/50 bg-card/60 px-3 py-2 text-sm font-medium text-muted-foreground backdrop-blur-xl transition-colors hover:border-primary/28 hover:text-foreground"
              title={t('app.guiRepo')}
            >
              <Github size={16} />
              <span className="hidden sm:inline">GitHub</span>
            </a>
            <button
              onClick={toggleLanguage}
              className="inline-flex items-center gap-2 rounded-full border border-border/50 bg-card/60 px-3 py-2 text-sm font-medium text-muted-foreground backdrop-blur-xl transition-colors hover:border-primary/28 hover:text-foreground"
              title="Toggle Language"
            >
              <Languages size={16} />
              <span className="uppercase">{i18n.language.startsWith('zh') ? 'EN' : '中文'}</span>
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1680px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        {workspaceDraftSavedAt && (
          <div
            data-testid="workspace-draft-status"
            className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-[1.2rem] border border-border/55 bg-background/72 px-4 py-3 text-sm text-foreground backdrop-blur-xl"
          >
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">{t('app.localDraft')}</div>
              <div className="mt-1 font-medium">
                {workspaceDraftRestored ? t('app.localDraftRestored') : t('app.localDraftAutosaved')}
              </div>
            </div>
            <div className="text-xs font-mono text-muted-foreground">{formatDraftTimestamp(workspaceDraftSavedAt)}</div>
          </div>
        )}
        {!data ? (
          <div className="space-y-8">
            <section className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
              <div className="flex items-center justify-end px-1 py-8 text-right sm:px-2 sm:py-10 xl:min-h-[430px]">
                <div className="max-w-3xl space-y-5 text-right">
                  <div className="space-y-3">
                    <p className="text-pretty-wrap text-sm font-medium text-foreground/80">{t('app.demoEyebrow')}</p>
                    <h2 className="text-pretty-wrap max-w-3xl text-3xl font-semibold leading-tight text-foreground sm:text-4xl sm:leading-tight">
                      {t('app.demoTitle')}
                    </h2>
                    <p className="ml-auto max-w-2xl text-pretty text-sm leading-7 text-muted-foreground sm:text-base">
                      {t('app.demoLead')}
                    </p>
                  </div>

                  <div className="flex flex-wrap justify-end gap-3">
                    <button
                      type="button"
                      onClick={loadExampleSkill}
                      className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-medium text-primary-foreground shadow-[0_18px_40px_-28px_hsl(var(--foreground)/0.7)] transition hover:bg-primary/92"
                    >
                      <PlayCircle size={16} />
                      {t('app.demoPrimaryCta')}
                    </button>
                    <a
                      href={DOCS_INDEX_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-2 rounded-full border border-border/60 bg-background/72 px-5 py-3 text-sm font-medium text-foreground transition hover:border-primary/32 hover:text-primary"
                    >
                      <BookOpen size={16} />
                      {t('app.demoDocsCta')}
                    </a>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3">
                    {landingHighlights.map((item) => {
                      const Icon = item.icon;
                      return (
                        <div key={item.title} className="rounded-[1.35rem] border border-border/55 bg-background/70 px-4 py-4 text-left backdrop-blur-xl">
                          <div className="inline-flex rounded-2xl border border-border/55 bg-background/75 p-2 text-muted-foreground">
                            <Icon size={18} />
                          </div>
                          <h3 className="mt-4 text-sm font-semibold text-foreground">{item.title}</h3>
                          <p className="mt-2 text-xs leading-6 text-muted-foreground">{item.body}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="glass-panel px-5 py-5 sm:px-6 sm:py-6">
                <div className="mb-5 flex items-start justify-between gap-4">
                  <div>
                    <p className="editorial-kicker">{t('app.inputStudio')}</p>
                    <h3 className="mt-2 text-xl font-semibold tracking-tight text-foreground">{t('app.analyzeNew')}</h3>
                  </div>
                  <div className="rounded-2xl border border-border/45 bg-background/45 p-3 text-muted-foreground shadow-inner backdrop-blur-xl">
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
                  className={`rounded-[1.5rem] border border-dashed p-5 backdrop-blur-xl transition-colors ${
                    isDragActive
                      ? 'border-primary/50 bg-primary/10 shadow-[0_0_0_1px_hsl(var(--primary)/0.18)]'
                      : 'border-border/60 bg-background/46 hover:border-primary/32 hover:bg-card/60'
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
                        <p className="text-sm text-muted-foreground">{t('app.applying')}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <p className="text-sm leading-6 text-muted-foreground">{t('app.inputGuide')}</p>
                      <textarea
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        placeholder={t('app.placeholder')}
                        className="min-h-40 w-full resize-none rounded-[1.35rem] border border-input/75 bg-white/55 px-4 py-3 text-sm leading-6 shadow-inner backdrop-blur-xl outline-none transition focus:border-primary/40 focus:ring-2 focus:ring-primary/18"
                      />

                      {error && (
                        <div className="flex items-start gap-2 rounded-xl border border-destructive/15 bg-destructive/10 px-3 py-2 text-sm text-destructive backdrop-blur-lg">
                          <AlertCircle size={16} className="mt-0.5 shrink-0" />
                          <span>{error}</span>
                        </div>
                      )}

                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="text-xs text-muted-foreground">{t('app.inputDrop')}</div>
                        <div className="flex flex-col gap-3 sm:flex-row">
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="inline-flex items-center justify-center gap-2 rounded-xl border border-border/60 bg-background/70 px-5 py-3 text-sm font-medium text-foreground transition hover:border-primary/35 hover:text-primary"
                          >
                            <UploadCloud size={16} />
                            {t('app.selectFiles')}
                          </button>
                          <button
                            type="button"
                            onClick={() => folderInputRef.current?.click()}
                            className="inline-flex items-center justify-center gap-2 rounded-xl border border-border/60 bg-background/70 px-5 py-3 text-sm font-medium text-foreground transition hover:border-primary/35 hover:text-primary"
                          >
                            <UploadCloud size={16} />
                            {t('app.selectFolder')}
                          </button>
                          <button
                            onClick={pendingUploadFiles.length > 0 ? handleAnalyzePendingUpload : handlePasteUrl}
                            disabled={pendingUploadFiles.length > 0 ? !pendingPrimaryPath : !inputText.trim()}
                            className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-medium text-primary-foreground shadow-[0_18px_40px_-28px_hsl(var(--foreground)/0.7)] transition hover:bg-primary/92 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <Activity size={16} />
                            {pendingUploadFiles.length > 0 ? t('app.reviewAndAnalyze') : t('app.analyzeBtn')}
                          </button>
                        </div>
                      </div>

                      {pendingUploadFiles.length > 0 && (
                        <div className="rounded-[1.2rem] border border-border/55 bg-white/44 px-4 py-3 backdrop-blur-xl">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">{t('app.intakePreview')}</div>
                              <p className="mt-2 text-sm leading-6 text-muted-foreground">{t('app.intakePreviewHint')}</p>
                            </div>
                            <div className="rounded-full border border-border/55 bg-background/72 px-3 py-1.5 text-[11px] font-medium text-foreground">
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
                                  className={`rounded-[1rem] border px-3 py-3 text-left transition ${
                                    isSelectedPrimary
                                      ? 'border-primary/35 bg-primary/10'
                                      : 'border-border/50 bg-background/68'
                                  } ${file.isPrimaryCandidate ? 'hover:border-primary/30' : ''}`}
                                >
                                  <div className="flex items-center justify-between gap-3">
                                    <div className="text-sm font-medium text-foreground">{file.name}</div>
                                    <div className="flex items-center gap-2">
                                      <span className="text-[11px] text-muted-foreground">{formatBytes(file.size)}</span>
                                      <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${
                                        isSelectedPrimary
                                          ? 'bg-primary/14 text-primary'
                                          : file.isPrimaryCandidate
                                            ? 'bg-emerald-500/12 text-emerald-700'
                                            : 'bg-background/72 text-muted-foreground'
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
                        <div className="rounded-[1.2rem] border border-border/55 bg-white/44 px-4 py-3 backdrop-blur-xl">
                          <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">{t('app.collaborationContext')}</div>
                          <div className="mt-3 grid gap-2">
                            {supportFiles.map((file) => (
                              <button
                                key={`${file.path}-${file.size}`}
                                type="button"
                                onClick={() => setSelectedContextPath(file.path)}
                                className={`rounded-[1rem] border px-3 py-3 text-left transition ${
                                  selectedContextPath === file.path ? 'border-primary/35 bg-primary/8' : 'border-border/50 bg-background/68'
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

                <div className="mt-5 flex items-center justify-between gap-4 rounded-[1.35rem] border border-border/45 bg-white/48 px-4 py-3 backdrop-blur-xl">
                  <div>
                    <p className="text-xs font-medium text-foreground">{t('app.tryExample')}</p>
                    <p className="text-xs text-muted-foreground">{t('app.workspaceHint')}</p>
                  </div>
                  <button
                    onClick={loadExampleSkill}
                    className="rounded-full border border-border/60 px-4 py-2 text-xs font-medium text-muted-foreground transition hover:border-primary/32 hover:text-foreground"
                  >
                    {t('app.loadExample')}
                  </button>
                </div>
              </div>
            </section>

            <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
              <div className="glass-panel px-5 py-5 sm:px-6 sm:py-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="editorial-kicker">{t('app.demoPathKicker')}</p>
                    <h3 className="mt-2 text-xl font-semibold tracking-tight text-foreground">{t('app.demoPathTitle')}</h3>
                    <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground">{t('app.demoPathLead')}</p>
                  </div>
                  <div className="rounded-2xl border border-border/45 bg-background/45 p-3 text-muted-foreground shadow-inner backdrop-blur-xl">
                    <PlayCircle size={22} />
                  </div>
                </div>
                <div className="mt-5 grid gap-3">
                  {landingPaths.map((item, index) => (
                    <div key={item.title} className="rounded-[1.2rem] border border-border/55 bg-background/68 px-4 py-4 backdrop-blur-xl">
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-sm font-semibold text-foreground">{item.title}</div>
                        <div className="rounded-full border border-border/55 bg-background/72 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                          {t('app.demoStepLabel')} {index + 1}
                        </div>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.body}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="glass-panel px-5 py-5 sm:px-6 sm:py-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="editorial-kicker">{t('app.demoDocsKicker')}</p>
                    <h3 className="mt-2 text-xl font-semibold tracking-tight text-foreground">{t('app.demoDocsTitle')}</h3>
                    <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground">{t('app.demoDocsLead')}</p>
                  </div>
                  <div className="rounded-2xl border border-border/45 bg-background/45 p-3 text-muted-foreground shadow-inner backdrop-blur-xl">
                    <BookOpen size={22} />
                  </div>
                </div>
                <div className="mt-5 grid gap-3">
                  {landingDocs.map((item) => (
                    <a
                      key={item.title}
                      href={item.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-[1.2rem] border border-border/55 bg-background/68 px-4 py-4 text-left backdrop-blur-xl transition hover:border-primary/30 hover:bg-card/72"
                    >
                      <div className="text-sm font-semibold text-foreground">{item.title}</div>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.body}</p>
                    </a>
                  ))}
                </div>
              </div>
            </section>
          </div>
        ) : (
          <Suspense
            fallback={(
              <div className="glass-panel flex min-h-[420px] items-center justify-center px-4 py-6 text-sm text-muted-foreground">
                {t('app.loadingWorkspaceModule')}
              </div>
            )}
          >
            <ReviewWorkspace
              key={analysisSessionId}
              data={data}
              originalData={originalData}
              darkMode={darkMode}
              modifiedPaths={modifiedPaths}
              supportFiles={supportFiles}
              selectedContextPath={selectedContextPath}
              bridgeStatus={bridgeStatus}
              bridgeStatusError={bridgeStatusError}
              guiRepoUrl={GUI_REPO_URL}
              engineRepoUrl={ENGINE_REPO_URL}
              onSelectContextPath={setSelectedContextPath}
              onSaveEdit={handleSaveEdit}
              onUndo={handleUndo}
              onResetWorkspace={handleResetWorkspace}
            />
          </Suspense>
        )}
      </main>
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
