import React, { Suspense, lazy, useEffect, useRef, useState } from 'react';
import {
  UploadCloud,
  Activity,
  RefreshCw,
  AlertCircle,
  ShieldAlert,
  Edit2,
  Download,
  Undo2,
  Languages,
  Github,
  FileCode2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import JSZip from 'jszip';
import { Flowchart } from './components/Flowchart';
import { analyzeSkillText } from './services/parserBridgeService';
import { fetchBridgeStatus, type BridgeStatus } from './services/bridgeStatusService';
import type { PreparedUploadFile, UploadedContextFile } from './types/intake';

const Dashboard = lazy(() => import('./components/Dashboard').then((module) => ({ default: module.Dashboard })));
const PhaseDetails = lazy(() => import('./components/PhaseDetails').then((module) => ({ default: module.PhaseDetails })));
const VectorSpace = lazy(() => import('./components/VectorSpace').then((module) => ({ default: module.VectorSpace })));
const SecurityMatrix = lazy(() => import('./components/SecurityMatrix').then((module) => ({ default: module.SecurityMatrix })));
const SideEditor = lazy(() => import('./components/SideEditor').then((module) => ({ default: module.SideEditor })));
const DecompositionBoard = lazy(() => import('./components/DecompositionBoard').then((module) => ({ default: module.DecompositionBoard })));

const GUI_REPO_URL = 'https://github.com/pingqLIN/skill-0-review-studio';
const ENGINE_REPO_URL = 'https://github.com/pingqLIN/skill-0';
const PRIMARY_SKILL_EXTENSIONS = ['.md', '.skill', '.txt'];
const CONTEXT_PREVIEW_EXTENSIONS = ['.json', '.yaml', '.yml', '.toml', '.ini', '.cfg', '.csv', '.tsv', '.log'];

type TabId = 'pipeline' | 'vector' | 'matrix';

export default function App() {
  const { t, i18n } = useTranslation();
  const darkMode = false;
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const folderInputRef = useRef<HTMLInputElement | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isDragActive, setIsDragActive] = useState(false);
  const [data, setData] = useState<any | null>(null);
  const [originalData, setOriginalData] = useState<any | null>(null);
  const [modifiedPaths, setModifiedPaths] = useState<Set<string>>(new Set());
  const [activePhase, setActivePhase] = useState<string | null>(null);
  const [inputText, setInputText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>('pipeline');
  const [isWorkspaceFocusMode, setIsWorkspaceFocusMode] = useState(false);
  const [isDerivedWorkflowOpen, setIsDerivedWorkflowOpen] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const [showSupportPanels, setShowSupportPanels] = useState(false);
  const [pendingUploadFiles, setPendingUploadFiles] = useState<PreparedUploadFile[]>([]);
  const [pendingPrimaryPath, setPendingPrimaryPath] = useState<string | null>(null);
  const [supportFiles, setSupportFiles] = useState<UploadedContextFile[]>([]);
  const [selectedContextPath, setSelectedContextPath] = useState<string | null>(null);
  const [editorConfig, setEditorConfig] = useState<{ type: 'global' | 'phase' | 'decision'; payload: any; phaseId?: string } | null>(null);
  const [bridgeStatus, setBridgeStatus] = useState<BridgeStatus | null>(null);
  const [bridgeStatusError, setBridgeStatusError] = useState<string | null>(null);

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
      role: isPrimarySkillFile(file) ? 'primary' : 'context',
      source: 'upload',
      isPrimaryCandidate: isPrimarySkillFile(file),
    };

    if (canPreviewAsText(file)) {
      try {
        prepared.text = await readFileAsText(file);
        prepared.preview = prepared.text.slice(0, 280);
      } catch {
        prepared.text = undefined;
      }
    }

    return prepared;
  };

  const expandZipUpload = async (file: File): Promise<PreparedUploadFile[]> => {
    const zip = await JSZip.loadAsync(file);
    const prepared: PreparedUploadFile[] = [];

    for (const entry of Object.values(zip.files)) {
      if (entry.dir) continue;

      const path = entry.name;
      const basename = path.split('/').pop() || path;
      const extension = getExtension(basename);
      const isPrimaryCandidate = isPrimarySkillPath(path);
      const isTextLike = isPrimaryCandidate || CONTEXT_PREVIEW_EXTENSIONS.includes(extension) || extension === '.md' || extension === '.txt';

      const item: PreparedUploadFile = {
        name: basename,
        path,
        type: extension || 'zip-entry',
        size: 0,
        role: isPrimaryCandidate ? 'primary' : 'context',
        source: 'zip',
        isPrimaryCandidate,
      };

      if (isTextLike) {
        try {
          item.text = await entry.async('string');
          item.size = item.text.length;
          item.preview = item.text.slice(0, 280);
        } catch {
          item.text = undefined;
        }
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

  const handleFiles = async (files: File[]) => {
    if (!files.length) return;

    const preparedFiles = await expandUploads(files);
    const primaryFile = preparedFiles.find((file) => file.isPrimaryCandidate && file.text) ?? null;

    setPendingUploadFiles(preparedFiles);
    setPendingPrimaryPath(primaryFile?.path ?? null);
    setSupportFiles([]);
    setSelectedContextPath(null);
    setData(null);
    setOriginalData(null);
    setModifiedPaths(new Set());
    setActivePhase(null);

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
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (files.length) {
      void handleFiles(files as File[]);
    }
    e.target.value = '';
  };

  const handlePasteUrl = () => {
    if (inputText.trim()) {
      setPendingUploadFiles([]);
      setPendingPrimaryPath(null);
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
      .map(({ isPrimaryCandidate, ...rest }) => rest);

    setSupportFiles(contextEntries);
    setSelectedContextPath(contextEntries[0]?.path ?? null);
    setInputText(primaryFile.text);
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
      setOriginalData(JSON.parse(JSON.stringify(result)));
      setModifiedPaths(new Set());
      setPendingUploadFiles([]);
      setPendingPrimaryPath(null);
      setIsWorkspaceFocusMode(false);
      setActivePhase(result.phases?.[0]?.id ?? null);
      setActiveTab('pipeline');
      setShowSupportPanels(false);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : t('app.errorFailed'));
      setData(null);
      setOriginalData(null);
      setModifiedPaths(new Set());
      setActivePhase(null);
    } finally {
      setIsExtracting(false);
    }
  };

  const handleSaveEdit = (updatedData: any) => {
    if (!editorConfig) return;
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
      const phaseIndex = newData.phases.findIndex((p: any) => p.id === updatedData.id);
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
      const phaseIndex = newData.phases.findIndex((p: any) => p.id === editorConfig.phaseId);
      if (phaseIndex !== -1) {
        const nodeIndex = newData.phases[phaseIndex].decisionNodes.findIndex((n: any) => n.id === updatedData.id);
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
    setEditorConfig(null);
  };

  const handleUndo = () => {
    if (originalData) {
      setData(JSON.parse(JSON.stringify(originalData)));
      setModifiedPaths(new Set());
    }
  };

  const convertSkillToMarkdown = (skillData: any) => {
    const parserResult = skillData?.parserResult;
    if (parserResult?.decomposition) {
      const meta = parserResult.meta ?? {};
      const original = parserResult.original_definition ?? {};
      const actions = parserResult.decomposition.actions ?? [];
      const rules = parserResult.decomposition.rules ?? [];
      const directives = parserResult.decomposition.directives ?? [];

      const lines = [
        `# ${meta.title || meta.name || skillData.projectName}`,
        '',
        `- skill_id: ${meta.skill_id || skillData.projectId}`,
        `- schema_version: ${meta.schema_version || 'unknown'}`,
        `- parser_version: ${meta.parser_version || 'unknown'}`,
        `- parser_mode: ${bridgeStatus?.mode || 'unknown'}`,
        `- parser_mode_source: ${bridgeModeDetail}`,
        `- source: ${original.source || 'uploaded skill'}`,
        '',
      ];

      if (bridgeStatus?.mode === 'standalone') {
        lines.push('> Review note: generated in standalone fallback mode. Re-run with the canonical skill-0 bridge before making a final equivalence decision.');
        lines.push('');
      }

      lines.push('## Actions', '');

      actions.forEach((action: any) => {
        lines.push(`### ${action.id} ${action.name}`);
        lines.push(`- type: ${action.action_type}`);
        lines.push(`- deterministic: ${action.deterministic}`);
        if (action.description) lines.push(`- description: ${action.description}`);
        if (action.immutable_elements?.length) lines.push(`- immutable: ${action.immutable_elements.join(', ')}`);
        if (action.mutable_elements?.length) lines.push(`- mutable: ${action.mutable_elements.join(', ')}`);
        if (action.side_effects?.length) lines.push(`- side_effects: ${action.side_effects.join(', ')}`);
        lines.push('');
      });

      lines.push('## Rules', '');
      rules.forEach((rule: any) => {
        lines.push(`### ${rule.id} ${rule.name}`);
        lines.push(`- type: ${rule.condition_type}`);
        lines.push(`- condition: ${rule.condition_expression}`);
        lines.push(`- returns: ${rule.returns}`);
        lines.push(`- fail_action: ${rule.fail_action}`);
        if (rule.branching_targets?.length) lines.push(`- branching_targets: ${rule.branching_targets.join(', ')}`);
        lines.push('');
      });

      lines.push('## Directives', '');
      directives.forEach((directive: any) => {
        lines.push(`### ${directive.id} ${directive.name}`);
        lines.push(`- type: ${directive.directive_type}`);
        lines.push(`- decomposable: ${directive.decomposable}`);
        if (directive.description) lines.push(`- description: ${directive.description}`);
        if (directive.decomposition_hint) lines.push(`- hint: ${directive.decomposition_hint}`);
        if (directive.related_elements?.length) lines.push(`- related: ${directive.related_elements.join(', ')}`);
        lines.push('');
      });

      return lines.join('\n');
    }

    const lines = [
      `# ${skillData.projectName}`,
      '',
      `- skill_id: ${skillData.projectId}`,
      `- category: ${skillData.threeClassification.category}`,
      `- granularity: ${skillData.threeClassification.granularity}`,
      `- operability: ${skillData.threeClassification.operability}`,
      `- risk_level: ${skillData.riskAssessment.level}`,
      `- parser_mode: ${bridgeStatus?.mode || 'unknown'}`,
      `- parser_mode_source: ${bridgeModeDetail}`,
      '',
    ];

    if (bridgeStatus?.mode === 'standalone') {
      lines.push('> Review note: generated in standalone fallback mode. Re-run with the canonical skill-0 bridge before making a final equivalence decision.');
      lines.push('');
    }

    lines.push('## Phase Flow', '');

    skillData.phases.forEach((phase: any) => {
      lines.push(`### Phase ${phase.id}: ${phase.name}`);
      lines.push('');
      lines.push('Inputs:');
      phase.input.forEach((item: string) => lines.push(`- ${item}`));
      lines.push('');
      lines.push('Tasks:');
      phase.tasks.forEach((task: string) => lines.push(`- ${task}`));
      lines.push('');
      if (phase.decisionNodes?.length) {
        lines.push('Decision Nodes:');
        phase.decisionNodes.forEach((node: any) => {
          lines.push(`- ${node.id}: ${node.question}`);
          lines.push(`  - threshold: ${node.threshold}`);
          lines.push(`  - yes: ${node.outcomes.yes}`);
          lines.push(`  - no: ${node.outcomes.no}`);
        });
        lines.push('');
      }
      lines.push('Outputs:');
      phase.output.forEach((item: string) => lines.push(`- ${item}`));
      lines.push('');
    });

    return lines.join('\n');
  };

  const exportSkill = () => {
    if (!data) return;
    const blob = new Blob([convertSkillToMarkdown(data)], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${data.projectId}.skill.md`;
    a.click();
    URL.revokeObjectURL(url);
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
      setIsWorkspaceFocusMode(false);
      await processSkill(payload.text, payload.name || 'example-skill');
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : t('app.errorFailed'));
    } finally {
      setIsExtracting(false);
    }
  };

  const activePhaseData = data && activePhase ? data.phases.find((phase: any) => phase.id === activePhase) : null;
  const activePhaseIndex = data && activePhase ? data.phases.findIndex((phase: any) => phase.id === activePhase) : -1;
  const decisionCount = data ? data.phases.reduce((sum: number, phase: any) => sum + (phase.decisionNodes?.length ?? 0), 0) : 0;
  const scanScore = data?.securityScan?.riskScore ?? data?.riskAssessment?.negativeIntent ?? 0;
  const firstFinding = data?.securityScan?.findings?.[0] ?? null;
  const operatorReminders = data?.reviewerSummary?.operatorReminders ?? [];
  const parserActions = data?.parserResult?.decomposition?.actions ?? [];
  const parserRules = data?.parserResult?.decomposition?.rules ?? [];
  const parserDirectives = data?.parserResult?.decomposition?.directives ?? [];
  const executionPaths = data?.parserResult?.execution_paths ?? [];
  const parserManifest = data?.parserResult?.manifest ?? null;
  const parserSupportingFiles = data?.parserResult?.supporting_files ?? [];
  const parserCommandReferences = data?.parserResult?.command_references ?? [];
  const parserAnalysisFindings = data?.parserResult?.analysis_findings ?? [];

  const workspaceTabs = data
    ? [
        {
          id: 'pipeline' as TabId,
          label: t('app.tabs.pipeline'),
          meta: `${parserActions.length}/${parserRules.length}/${parserDirectives.length}`,
        },
        {
          id: 'vector' as TabId,
          label: t('app.tabs.vector'),
          meta: t('vector.title'),
        },
        {
          id: 'matrix' as TabId,
          label: t('app.tabs.matrix'),
          meta: `${decisionCount} ${t('app.totalDecisions')}`,
        },
      ]
    : [];

  const bridgeModeLabel = bridgeStatus?.mode === 'skill-0'
    ? t('app.bridgeModeCanonical')
    : bridgeStatus?.mode === 'standalone'
      ? t('app.bridgeModeStandalone')
      : t('app.bridgeModeUnavailable');
  const bridgeModeDetail = bridgeStatus?.skill0Root
    || (bridgeStatus?.mode === 'standalone'
      ? t('app.bridgeModeBundled')
      : bridgeStatusError || t('app.bridgeModeChecking'));
  const bridgeModeSummary = bridgeStatus?.mode === 'skill-0'
    ? t('app.bridgeModeCanonicalShort')
    : bridgeStatus?.mode === 'standalone'
      ? t('app.bridgeModeStandaloneShort')
      : t('app.bridgeModeUnavailableShort');
  const bridgeReviewGuidance = bridgeStatus?.mode === 'skill-0'
    ? t('app.bridgeGuidanceCanonical')
    : bridgeStatus?.mode === 'standalone'
      ? t('app.bridgeGuidanceStandalone')
      : t('app.bridgeGuidanceUnavailable');

  const openDerivedWorkflow = () => {
    setActiveTab('pipeline');
    setIsDerivedWorkflowOpen(true);
    window.setTimeout(() => {
      document.getElementById('derived-workflow-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 80);
  };

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
        {!data ? (
          <div className="space-y-8">
            <section className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
              <div className="flex items-center justify-end px-1 py-8 text-right sm:px-2 sm:py-10 xl:min-h-[430px]">
                <div className="max-w-3xl space-y-3 text-right">
                  <p className="text-pretty-wrap text-sm font-medium text-foreground/80">{t('app.analysisReady')}</p>
                  <h2 className="text-pretty-wrap max-w-3xl text-3xl font-semibold leading-tight text-foreground sm:text-4xl sm:leading-tight">
                    {t('app.emptyTitle')}
                  </h2>
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
                    <motion.div
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="flex min-h-[300px] flex-col items-center justify-center gap-4 text-center"
                    >
                      <div className="h-16 w-16 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
                      <div className="space-y-1">
                        <p className="text-lg font-medium text-foreground">{t('app.analyzing')}</p>
                        <p className="text-sm text-muted-foreground">{t('app.applying')}</p>
                      </div>
                    </motion.div>
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
          </div>
        ) : (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="grid gap-7 xl:grid-cols-[16rem_minmax(0,1fr)_20rem]">
            <aside className="xl:sticky xl:top-28 xl:self-start">
              <div className="glass-panel space-y-5 p-4 sm:p-5">
                <div>
                  <p className="editorial-kicker">{t('app.workspace')}</p>
                  <h2 className="text-pretty-wrap mt-2 text-lg font-semibold tracking-tight text-foreground">{t('app.primaryWorkspace')}</h2>
                  <p className="text-pretty-wrap mt-2 text-sm leading-6 text-muted-foreground">{t('app.phaseFlowHint')}</p>
                </div>

                <div className="space-y-2">
                  {workspaceTabs.map((view) => (
                    <div key={view.id} className="space-y-2">
                      <button
                        onClick={() => setActiveTab(view.id)}
                        className={`workspace-nav-button ${activeTab === view.id ? 'workspace-nav-button--active' : ''}`}
                      >
                        <div>
                          <div className="text-pretty-wrap text-sm font-medium text-foreground">{view.label}</div>
                          <div className="text-pretty-wrap mt-1 text-[11px] text-muted-foreground">{view.meta}</div>
                        </div>
                        <span className="text-[10px] font-mono uppercase tracking-[0.24em] text-muted-foreground/70">{view.id}</span>
                      </button>

                      {view.id === 'pipeline' && (
                        <button
                          type="button"
                          onClick={openDerivedWorkflow}
                          className={`workspace-subnav-button text-pretty-wrap ${isDerivedWorkflowOpen ? 'workspace-subnav-button--active' : ''}`}
                        >
                          {t('app.tabs.pipeline')} {t('app.derivedWorkflow')}
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <div className="rounded-[1.35rem] border border-border/50 bg-white/42 backdrop-blur-2xl">
                  <button
                    onClick={() => setShowActions(!showActions)}
                    className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
                  >
                    <div>
                      <p className="editorial-kicker">{t('app.actionsTray')}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{t('app.quickActions')}</p>
                    </div>
                    {showActions ? <ChevronUp size={16} className="text-muted-foreground" /> : <ChevronDown size={16} className="text-muted-foreground" />}
                  </button>

                  <AnimatePresence initial={false}>
                    {showActions && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="grid gap-2 px-4 pb-4">
                          <button
                            onClick={() => setEditorConfig({ type: 'global', payload: data })}
                            className="inline-flex items-center justify-between rounded-xl border border-border/60 bg-background/76 px-3 py-2 text-sm text-foreground backdrop-blur-xl transition hover:border-primary/35"
                          >
                            <span>{t('app.openGlobalEditor')}</span>
                            <Edit2 size={14} className="text-muted-foreground" />
                          </button>
                          <button
                            onClick={exportSkill}
                            className="inline-flex items-center justify-between rounded-xl border border-border/60 bg-background/76 px-3 py-2 text-sm text-foreground backdrop-blur-xl transition hover:border-primary/35"
                          >
                            <span>{t('app.export')}</span>
                            <Download size={14} className="text-muted-foreground" />
                          </button>
                          <button
                            onClick={() => {
                              setData(null);
                              setInputText('');
                              setPendingUploadFiles([]);
                              setPendingPrimaryPath(null);
                              setIsWorkspaceFocusMode(false);
                              setSupportFiles([]);
                              setSelectedContextPath(null);
                              setShowActions(false);
                            }}
                            className="inline-flex items-center justify-between rounded-xl border border-border/60 bg-background/76 px-3 py-2 text-sm text-foreground backdrop-blur-xl transition hover:border-primary/35"
                          >
                            <span>{t('app.resetWorkspace')}</span>
                            <RefreshCw size={14} className="text-muted-foreground" />
                          </button>
                          {modifiedPaths.size > 0 && (
                            <button
                              onClick={handleUndo}
                              className="inline-flex items-center justify-between rounded-xl border border-amber-500/25 bg-amber-500/8 px-3 py-2 text-sm text-amber-700 transition hover:bg-amber-500/12"
                            >
                              <span>{t('app.undo')}</span>
                              <Undo2 size={14} />
                            </button>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="rounded-[1.35rem] border border-border/50 bg-white/42 p-4 backdrop-blur-2xl">
                  <div className="flex items-center justify-between gap-3">
                    <p className="editorial-kicker">{t('app.currentFocus')}</p>
                    <span className="rounded-full border border-border/55 bg-background/70 px-2.5 py-1 text-[11px] font-mono text-muted-foreground backdrop-blur-lg">
                      {executionPaths.length > 0 ? `${executionPaths.length} ${t('app.executionPaths')}` : '--'}
                    </span>
                  </div>
                  <div className="text-pretty-wrap mt-3 text-sm font-medium text-foreground">
                    {data?.parserResult?.meta?.title || data?.parserResult?.meta?.name || '--'}
                  </div>
                  <p className="text-pretty-wrap mt-2 text-xs leading-5 text-muted-foreground">{t('app.parserBoardHint')}</p>
                </div>

                <div className="rounded-[1.35rem] border border-border/50 bg-white/42 p-4 backdrop-blur-2xl sm:hidden">
                  <div className="flex items-center justify-between gap-3">
                    <p className="editorial-kicker">{t('app.bridgeMode')}</p>
                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
                      bridgeStatus?.mode === 'skill-0'
                        ? 'bg-emerald-500/10 text-emerald-700'
                        : bridgeStatus?.mode === 'standalone'
                          ? 'bg-amber-500/10 text-amber-700'
                          : 'bg-background/70 text-muted-foreground'
                    }`}>
                      {bridgeModeLabel}
                    </span>
                  </div>
                  <p className="mt-2 text-xs leading-5 text-muted-foreground">{bridgeModeDetail}</p>
                </div>
              </div>
            </aside>

            <section className="min-w-0 space-y-7">
              {!isWorkspaceFocusMode && (
                <Suspense fallback={<PanelFallback heightClassName="min-h-[220px]" />}>
                  <Dashboard data={data} onNavigatePhase={(id) => { setActiveTab('pipeline'); setActivePhase(id); }} modifiedPaths={modifiedPaths} />
                </Suspense>
              )}

              <div className="glass-panel-strong relative overflow-hidden px-5 py-5 sm:px-6">
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/45 to-transparent" />
                <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                  <div>
                    {!isWorkspaceFocusMode && (
                      <>
                        <p className="editorial-kicker">{t('app.analysisResult')}</p>
                        <div className="mt-3 flex flex-wrap items-center gap-3">
                          <span className="rounded-full border border-border/55 bg-background/70 px-3 py-1 text-[11px] font-mono uppercase tracking-[0.24em] text-muted-foreground backdrop-blur-lg">
                            {t('app.project')}: {data.projectId}
                          </span>
                          <span className="rounded-full border border-border/55 bg-background/70 px-3 py-1 text-[11px] text-muted-foreground backdrop-blur-lg">
                            {t('app.parserVersion')}: {data?.parserResult?.meta?.parser_version || '--'}
                          </span>
                          {parserManifest && (
                            <span className="rounded-full border border-border/55 bg-background/70 px-3 py-1 text-[11px] text-muted-foreground backdrop-blur-lg">
                              {t('app.analysisLevel')}: {parserManifest.analysis_level}
                            </span>
                          )}
                          {modifiedPaths.size > 0 && (
                            <span className="rounded-full border border-amber-500/25 bg-amber-500/10 px-3 py-1 text-[11px] font-medium text-amber-700">
                              {modifiedPaths.size} {t('app.modifiedCount')}
                            </span>
                          )}
                        </div>
                      </>
                    )}
                    <div
                      className={`${isWorkspaceFocusMode ? '' : 'mt-4'} flex w-fit cursor-pointer items-center gap-2 group`}
                      onClick={() => setEditorConfig({ type: 'global', payload: data })}
                      title={t('editor.editGlobal')}
                    >
                      <h2 className={`text-3xl font-semibold tracking-tight sm:text-[2.1rem] ${modifiedPaths.has('projectName') ? 'text-amber-600' : 'text-foreground'}`}>
                        {data.projectName}
                      </h2>
                      <Edit2 size={16} className="text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-6">
                    <StatPill label={t('app.totalActions')} value={String(parserActions.length)} />
                    <StatPill label={t('app.totalRules')} value={String(parserRules.length)} />
                    <StatPill label={t('app.totalDirectives')} value={String(parserDirectives.length)} accent={parserDirectives.length > 8 ? 'warn' : 'default'} />
                    <StatPill label={t('app.supportingFiles')} value={String(parserSupportingFiles.length)} />
                    <StatPill label={t('app.commandReferences')} value={String(parserCommandReferences.length)} accent={parserCommandReferences.length > 0 ? 'warn' : 'default'} />
                    <StatPill label={t('app.analysisFindings')} value={String(parserAnalysisFindings.length)} accent={parserAnalysisFindings.length > 0 ? 'danger' : 'default'} />
                  </div>
                </div>
              </div>


              <div className="glass-panel px-4 py-4 sm:px-5">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="editorial-kicker">{t('app.workspaceViews')}</p>
                    <p className="mt-2 text-sm text-muted-foreground">{t('app.phaseFlowHint')}</p>
                  </div>
                  <div className="flex items-center gap-1 rounded-[1rem] border border-border/45 bg-white/46 p-1 backdrop-blur-xl">
                    {workspaceTabs.map((view) => (
                      <button
                        key={view.id}
                        onClick={() => {
                          setActiveTab(view.id);
                          setIsWorkspaceFocusMode(true);
                        }}
                        className={`rounded-xl px-4 py-2 text-xs font-medium transition-all ${
                          activeTab === view.id
                            ? 'border border-border/50 bg-background/78 text-foreground shadow-sm backdrop-blur-xl'
                            : 'text-muted-foreground hover:bg-background/54 hover:text-foreground'
                        }`}
                      >
                        {view.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <AnimatePresence mode="wait">
                {activeTab === 'pipeline' && (
                  <motion.div
                    key="pipeline"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-7"
                  >
                    <Suspense fallback={<PanelFallback heightClassName="min-h-[240px]" />}>
                      <DecompositionBoard
                        parserResult={data.parserResult}
                        supportFiles={supportFiles}
                        selectedContextPath={selectedContextPath}
                        onSelectContext={setSelectedContextPath}
                      />
                    </Suspense>

                    <InsightBlock
                      id="derived-workflow-panel"
                      kicker={t('flowchart.pipeline')}
                      title={t('app.derivedWorkflow')}
                      summary={t('app.derivedWorkflowHint')}
                      isOpen={isDerivedWorkflowOpen}
                      onToggle={() => setIsDerivedWorkflowOpen((current) => !current)}
                    >
                      <div className="space-y-6">
                        <FlowStepper phases={data.phases} activePhase={activePhase} onSelectPhase={(id) => { setActiveTab('pipeline'); setActivePhase(id); }} />

                        <div className="grid gap-6 xl:grid-cols-[minmax(18rem,22rem)_minmax(0,1fr)]">
                          <div className="glass-panel min-h-[640px] px-3 py-4 sm:px-4">
                            <div className="flex items-center justify-between px-3 pb-2">
                              <div>
                                <p className="editorial-kicker">{t('flowchart.pipeline')}</p>
                                <h3 className="mt-2 text-lg font-semibold tracking-tight text-foreground">{t('app.flowSequence')}</h3>
                              </div>
                              <span className="rounded-full border border-border/55 bg-background/76 px-2.5 py-1 text-[11px] font-mono text-muted-foreground backdrop-blur-lg">
                                {activePhase ?? '--'}
                              </span>
                            </div>
                            <div className="custom-scrollbar max-h-[70vh] overflow-y-auto pr-1">
                              <Flowchart phases={data.phases} activePhase={activePhase} onSelectPhase={setActivePhase} />
                            </div>
                          </div>

                          <div className="min-h-[640px]">
                            {activePhaseData ? (
                              <Suspense fallback={<PanelFallback heightClassName="min-h-[640px]" />}>
                                <PhaseDetails
                                  phase={activePhaseData}
                                  allPhases={data.phases}
                                  onNavigatePhase={setActivePhase}
                                  onClose={() => setActivePhase(null)}
                                  onEditPhase={(phaseData) => setEditorConfig({ type: 'phase', payload: phaseData, phaseId: phaseData.id })}
                                  onEditDecision={(node) => setEditorConfig({ type: 'decision', payload: node, phaseId: activePhaseData.id })}
                                  modifiedPaths={modifiedPaths}
                                />
                              </Suspense>
                            ) : (
                              <div className="glass-panel flex min-h-[640px] items-center justify-center p-10 text-center">
                                <div className="max-w-sm space-y-3">
                                  <p className="editorial-kicker">{t('app.detailsPanel')}</p>
                                  <h3 className="text-2xl font-semibold tracking-tight text-foreground">{t('app.noActivePhase')}</h3>
                                  <p className="text-sm leading-6 text-muted-foreground">{t('app.selectPhaseHint')}</p>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </InsightBlock>
                  </motion.div>
                )}

                {activeTab === 'vector' && (
                  <motion.div key="vector" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                    <div className="glass-panel overflow-hidden p-3 sm:p-4">
                      <Suspense fallback={<PanelFallback heightClassName="min-h-[420px]" />}>
                        <VectorSpace data={data} darkMode={darkMode} />
                      </Suspense>
                    </div>
                  </motion.div>
                )}

                {activeTab === 'matrix' && (
                  <motion.div key="matrix" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                    <div className="glass-panel overflow-hidden p-3 sm:p-4">
                      <Suspense fallback={<PanelFallback heightClassName="min-h-[420px]" />}>
                        <SecurityMatrix data={data} />
                      </Suspense>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </section>

            <aside className="xl:sticky xl:top-28 xl:self-start">
              <div className="space-y-5">
                <InsightBlock
                  kicker={t('app.detailsPanel')}
                  title={t('dashboard.riskAssessment')}
                  summary={`${data.riskAssessment.level} · ${scanScore}`}
                  accent={data.riskAssessment.level === 'SAFE' || data.riskAssessment.level === 'LOW' ? 'emerald' : 'rose'}
                  defaultOpen
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <ShieldAlert size={16} className={data.riskAssessment.level === 'SAFE' || data.riskAssessment.level === 'LOW' ? 'text-emerald-500' : 'text-destructive'} />
                        <span className={`text-lg font-semibold tracking-tight ${modifiedPaths.has('riskAssessment.level') ? 'text-amber-600' : 'text-foreground'}`}>
                          {data.riskAssessment.level}
                        </span>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">{data.riskAssessment.details}</p>
                    </div>
                    <span className="rounded-full border border-border/55 bg-background/76 px-3 py-1 text-[11px] font-mono text-muted-foreground backdrop-blur-lg">
                      {scanScore}
                    </span>
                  </div>
                </InsightBlock>
                <InsightBlock
                  kicker={t('app.bridgeMode')}
                  title={bridgeModeLabel}
                  summary={bridgeModeSummary}
                  accent={bridgeStatus?.mode === 'skill-0' ? 'emerald' : 'default'}
                >
                  <div className="grid gap-3">
                    <MiniMetric label={t('app.bridgeMode')} value={bridgeModeLabel} />
                    <MiniMetric label={t('app.bridgeSource')} value={bridgeModeDetail} />
                    <div className="rounded-[1.25rem] border border-border/55 bg-background/72 p-3 text-sm leading-6 text-muted-foreground backdrop-blur-xl">
                      {bridgeReviewGuidance}
                    </div>
                  </div>
                </InsightBlock>

                <InsightBlock
                  kicker={t('app.projectSummary')}
                  title={t('app.securityScan')}
                  summary={firstFinding ? firstFinding.ruleName : t('securityMatrix.auditLogSummary')}
                >
                  {firstFinding || operatorReminders.length > 0 ? (
                    <div className="space-y-3">
                      {firstFinding && (
                        <div className="rounded-[1.25rem] border border-border/55 bg-background/72 p-3 backdrop-blur-xl">
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-sm font-medium text-foreground">{firstFinding.ruleName}</p>
                            <span className="rounded-full bg-destructive/10 px-2 py-1 text-[11px] font-medium text-destructive">
                              {firstFinding.adjustedSeverity}
                            </span>
                          </div>
                          <p className="mt-2 text-sm leading-6 text-muted-foreground">{firstFinding.description}</p>
                        </div>
                      )}
                      <div className="grid gap-2">
                        {firstFinding && (
                          <MiniMetric label={t('app.firstFinding')} value={`${firstFinding.ruleId} · L${firstFinding.lineNumber}`} />
                        )}
                        <MiniMetric label={t('app.scanScore')} value={String(scanScore)} />
                      </div>
                      {operatorReminders.length > 0 && (
                        <div className="rounded-[1.25rem] border border-border/55 bg-background/72 p-3 backdrop-blur-xl">
                          <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                            {t('app.operatorReminders')}
                          </div>
                          <div className="mt-3 space-y-3">
                            {operatorReminders.map((reminder: any) => (
                              <div key={reminder.id} className="rounded-[1rem] border border-border/45 bg-white/65 px-3 py-3">
                                <div className="flex items-center justify-between gap-3">
                                  <div className="text-sm font-medium text-foreground">{reminder.label}</div>
                                  <span className={`rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${
                                    reminder.level === 'high'
                                      ? 'bg-destructive/12 text-destructive'
                                      : reminder.level === 'medium'
                                        ? 'bg-amber-500/12 text-amber-700'
                                        : 'bg-background/70 text-muted-foreground'
                                  }`}>
                                    {reminder.level}
                                  </span>
                                </div>
                                <p className="mt-2 text-xs leading-6 text-muted-foreground">{reminder.detail}</p>
                                <p className="mt-2 text-xs font-medium leading-6 text-foreground">{reminder.action}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="rounded-[1.25rem] border border-border/55 bg-background/72 px-4 py-3 text-sm leading-6 text-muted-foreground backdrop-blur-xl">
                      {t('securityMatrix.auditLogSummaryText')}
                    </div>
                  )}
                </InsightBlock>

                <InsightBlock
                  kicker={t('app.projectSummary')}
                  title={t('dashboard.threeClassification')}
                  summary={`${data.threeClassification.category} · ${data.threeClassification.granularity}`}
                >
                  <div className="grid gap-3">
                    <MiniMetric label={t('dashboard.category')} value={data.threeClassification.category} highlight={modifiedPaths.has('threeClassification.category')} />
                    <MiniMetric label={t('dashboard.granularity')} value={data.threeClassification.granularity} />
                    <MiniMetric label={t('vector.operability')} value={`${data.threeClassification.operability}%`} />
                    <MiniMetric label={t('app.modifiedCount')} value={String(modifiedPaths.size)} highlight={modifiedPaths.size > 0} />
                  </div>
                </InsightBlock>

                <InsightBlock
                  kicker={t('app.collaborationContext')}
                  title={t('app.sourceDefinition')}
                  summary={parserManifest
                    ? `${parserSupportingFiles.length} ${t('app.supportingFiles')} · ${parserManifest.unresolved_references_count || 0} ${t('app.unresolvedReferences')}`
                    : supportFiles.length > 0
                      ? `${supportFiles.length} ${t('app.contextFiles')}`
                      : t('app.noContextFiles')}
                >
                  <div className="space-y-2">
                    {parserManifest && (
                      <div className="rounded-[1.25rem] border border-border/55 bg-background/72 px-4 py-3 text-sm leading-6 text-muted-foreground backdrop-blur-xl">
                        {t('app.analysisLevel')}: <span className="font-medium text-foreground">{parserManifest.analysis_level}</span>
                        {' · '}
                        {t('app.resolved')}: <span className="font-medium text-foreground">{parserSupportingFiles.filter((file: any) => file.resolved).length}</span>
                        {' · '}
                        {t('app.unresolved')}: <span className="font-medium text-foreground">{parserManifest.unresolved_references_count || 0}</span>
                      </div>
                    )}
                    {supportFiles.length > 0 ? supportFiles.map((file) => (
                      <button
                        key={`${file.path}-${file.size}`}
                        type="button"
                        onClick={() => setSelectedContextPath(file.path)}
                        className={`w-full rounded-[1.25rem] border px-4 py-3 text-left backdrop-blur-xl transition ${
                          selectedContextPath === file.path ? 'border-primary/35 bg-primary/8' : 'border-border/55 bg-background/72'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-sm font-medium text-foreground">{file.name}</span>
                          <span className="text-[11px] text-muted-foreground">{formatBytes(file.size)}</span>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">{file.type}</p>
                        <p className="mt-1 text-[11px] text-muted-foreground">{file.path}</p>
                      </button>
                    )) : (
                      <div className="rounded-[1.25rem] border border-border/55 bg-background/72 px-4 py-3 text-sm leading-6 text-muted-foreground backdrop-blur-xl">
                        {t('app.noContextFiles')}
                      </div>
                    )}
                  </div>
                </InsightBlock>

                <InsightBlock kicker={t('app.sourceLinks')} title={t('app.projectSummary')} summary="GitHub">
                  <div className="space-y-2">
                    <a
                      href={GUI_REPO_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between rounded-[1.25rem] border border-border/55 bg-background/72 px-4 py-3 text-sm text-foreground backdrop-blur-xl transition hover:border-primary/30"
                    >
                      <span>{t('app.guiRepo')}</span>
                      <Github size={15} className="text-muted-foreground" />
                    </a>
                    <a
                      href={ENGINE_REPO_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between rounded-[1.25rem] border border-border/55 bg-background/72 px-4 py-3 text-sm text-foreground backdrop-blur-xl transition hover:border-primary/30"
                    >
                      <span>{t('app.engineRepo')}</span>
                      <FileCode2 size={15} className="text-muted-foreground" />
                    </a>
                  </div>
                </InsightBlock>
              </div>
            </aside>
          </motion.div>
        )}
      </main>

      <Suspense fallback={null}>
        <SideEditor config={editorConfig} onClose={() => setEditorConfig(null)} onSave={handleSaveEdit} />
      </Suspense>
    </div>
  );
}

function EmptyFeatureCard({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-[1.4rem] border border-border/50 bg-white/46 p-4 shadow-[0_18px_42px_-32px_hsl(var(--foreground)/0.35)] backdrop-blur-2xl">
      <h3 className="text-sm font-medium text-foreground">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
    </div>
  );
}

function PanelFallback({ heightClassName = 'min-h-[200px]' }: { heightClassName?: string }) {
  const { t } = useTranslation();

  return (
    <div className={`flex items-center justify-center rounded-[1.25rem] border border-border/55 bg-background/72 px-4 py-6 text-sm text-muted-foreground backdrop-blur-xl ${heightClassName}`}>
      {t('app.loadingWorkspaceModule')}
    </div>
  );
}

function StatPill({ label, value, accent = 'default' }: { label: string; value: string; accent?: 'default' | 'warn' | 'danger' }) {
  const accentClass = accent === 'warn'
    ? 'border-amber-500/25 bg-amber-500/10 text-amber-700'
    : accent === 'danger'
      ? 'border-destructive/20 bg-destructive/8 text-destructive'
      : 'border-border/55 bg-background/72 text-foreground';

  return (
    <div className={`rounded-[1.2rem] border px-4 py-3 shadow-[0_14px_30px_-28px_hsl(var(--foreground)/0.4)] backdrop-blur-xl ${accentClass}`}>
      <div className="text-[10px] font-semibold uppercase tracking-[0.22em] opacity-70">{label}</div>
      <div className="mt-2 text-xl font-semibold tracking-tight">{value}</div>
    </div>
  );
}

function MiniMetric({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded-[1.2rem] border px-3 py-3 backdrop-blur-xl ${highlight ? 'border-amber-500/25 bg-amber-500/10' : 'border-border/55 bg-background/72'}`}>
      <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">{label}</div>
      <div className={`mt-2 text-sm font-medium leading-6 ${highlight ? 'text-amber-700' : 'text-foreground'}`}>{value}</div>
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

function FlowStepper({ phases, activePhase, onSelectPhase }: { phases: any[]; activePhase: string | null; onSelectPhase: (phaseId: string) => void }) {
  const { t } = useTranslation();

  return (
    <div className="glass-panel px-4 py-4 sm:px-5">
      <div>
        <p className="editorial-kicker">{t('app.flowSequence')}</p>
        <p className="mt-2 text-sm text-muted-foreground">{t('app.phaseFlowHint')}</p>
      </div>
      <div className="custom-scrollbar mt-4 flex gap-3 overflow-x-auto pb-1">
        {phases.map((phase: any, index: number) => {
          const isActive = phase.id === activePhase;
          return (
            <button key={phase.id} onClick={() => onSelectPhase(phase.id)} className={`flow-step-card min-w-[190px] ${isActive ? 'flow-step-card--active' : ''}`}>
              <div className="flex items-center justify-between gap-3">
                <span className="text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                  {t('app.phaseStep')} {index + 1}
                </span>
                <span className="rounded-full border border-border/50 bg-background/70 px-2 py-1 text-[10px] font-mono text-muted-foreground backdrop-blur-lg">
                  {phase.id}
                </span>
              </div>
              <div className="mt-3 text-sm font-medium leading-5 text-foreground">{phase.name}</div>
              <div className="mt-2 text-xs leading-5 text-muted-foreground">{phase.tasks.slice(0, 2).join(' · ')}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function InsightBlock({
  id,
  kicker,
  title,
  summary,
  children,
  accent = 'default',
  defaultOpen = false,
  isOpen: controlledOpen,
  onToggle,
}: {
  id?: string;
  kicker: string;
  title: string;
  summary?: string;
  children: React.ReactNode;
  accent?: 'default' | 'emerald' | 'rose';
  defaultOpen?: boolean;
  isOpen?: boolean;
  onToggle?: () => void;
}) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const isControlled = typeof controlledOpen === 'boolean';
  const isOpen = isControlled ? controlledOpen : internalOpen;
  const accentGlow = accent === 'emerald' ? 'before:bg-emerald-500/14' : accent === 'rose' ? 'before:bg-rose-500/14' : 'before:bg-primary/12';
  const handleToggle = () => {
    if (isControlled) {
      onToggle?.();
      return;
    }
    setInternalOpen((current) => !current);
  };

  return (
    <section id={id} className={`glass-panel relative overflow-hidden before:absolute before:right-0 before:top-0 before:h-24 before:w-24 before:rounded-bl-[2rem] before:blur-2xl ${accentGlow}`}>
      <div className="relative p-5">
        <button onClick={handleToggle} className="w-full text-left">
          <p className="editorial-kicker">{kicker}</p>
          <div className="mt-2 flex items-start justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold tracking-tight text-foreground">{title}</h3>
              {summary && <p className="mt-1 text-sm text-muted-foreground">{summary}</p>}
            </div>
            {isOpen ? <ChevronUp size={16} className="mt-1 text-muted-foreground" /> : <ChevronDown size={16} className="mt-1 text-muted-foreground" />}
          </div>
        </button>

        <AnimatePresence initial={false}>
          {isOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="mt-4">{children}</div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}
