import React, { useEffect, useId, useRef, useState } from 'react';
import { Plus, Save, Trash2, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { parseSkillDocumentJson } from '../services/skillDocumentAdapter';
import type { ActionNode, DirectiveNode, ExecutionPath, RuleNode, SkillDocument } from '../types/skillDocument';

type SideEditorProps = {
  config: any;
  onClose: () => void;
  onSave: (data: any) => void;
};

type SkillCollectionKey = 'actions' | 'rules' | 'directives' | 'execution_paths';

function parseLineList(value: string) {
  return value
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean);
}

function listValue(items: unknown) {
  return Array.isArray(items) ? items.join('\n') : '';
}

function branchesToText(branches: ExecutionPath['branches']) {
  if (!Array.isArray(branches) || branches.length === 0) {
    return '';
  }

  return branches
    .map((branch) => {
      const condition = branch.condition?.trim();
      return condition ? `${condition} => ${branch.target}` : branch.target;
    })
    .join('\n');
}

function parseBranchesText(value: string): NonNullable<ExecutionPath['branches']> {
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const arrowIndex = line.indexOf('=>');
      if (arrowIndex === -1) {
        return { target: line };
      }

      const condition = line.slice(0, arrowIndex).trim();
      const target = line.slice(arrowIndex + 2).trim();
      return {
        condition: condition || undefined,
        target,
      };
    });
}

function createEmptyAction(): ActionNode {
  return {
    action_type: '',
    description: '',
    deterministic: undefined,
    id: '',
    immutable_elements: [],
    mutable_elements: [],
    name: '',
    notes: '',
    side_effects: [],
  };
}

function createEmptyRule(): RuleNode {
  return {
    condition_expression: '',
    condition_type: '',
    description: '',
    fail_action: '',
    id: '',
    name: '',
    notes: '',
    returns: '',
  };
}

function createEmptyDirective(): DirectiveNode {
  return {
    decomposable: undefined,
    decomposition_hint: '',
    description: '',
    directive_type: '',
    id: '',
    name: '',
    notes: '',
  };
}

function createEmptyExecutionPath(): ExecutionPath {
  return {
    branches: [],
    entry_condition: '',
    failure_end: '',
    id: '',
    name: '',
    steps: [],
    success_end: '',
  };
}

export function SideEditor({ config, onClose, onSave }: SideEditorProps) {
  const { t } = useTranslation();
  const [formData, setFormData] = useState<any>(null);
  const [jsonText, setJsonText] = useState('');
  const [jsonError, setJsonError] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const initialFieldRef = useRef<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | null>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);
  const titleId = useId();

  useEffect(() => {
    if (config) {
      setFormData(JSON.parse(JSON.stringify(config.payload)));
      if (config.type === 'json') {
        setJsonText(JSON.stringify(config.payload, null, 2));
        setJsonError(null);
      } else {
        setJsonText('');
        setJsonError(null);
      }
    }
  }, [config]);

  useEffect(() => {
    if (!config) {
      return;
    }

    previouslyFocusedRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const frame = window.requestAnimationFrame(() => {
      initialFieldRef.current?.focus();
    });

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== 'Tab' || !panelRef.current) {
        return;
      }

      const focusableElements = panelRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );

      if (focusableElements.length === 0) {
        return;
      }

      const first = focusableElements[0];
      const last = focusableElements[focusableElements.length - 1];
      const activeElement = document.activeElement;

      if (event.shiftKey && activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('keydown', handleKeyDown);
      previouslyFocusedRef.current?.focus();
    };
  }, [config, onClose]);

  if (!config || !formData) return null;

  const handleChange = (field: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }));
  };

  const handleNestedChange = (parent: string, field: string, value: any) => {
    setFormData((prev: any) => ({
      ...prev,
      [parent]: { ...prev[parent], [field]: value },
    }));
  };

  const handleListChange = (field: string, value: string) => {
    setFormData((prev: any) => ({
      ...prev,
      [field]: parseLineList(value),
    }));
  };

  const handleSkillMetaChange = (field: keyof SkillDocument['meta'], value: string) => {
    setFormData((prev: SkillDocument) => ({
      ...prev,
      meta: {
        ...prev.meta,
        [field]: value,
      },
    }));
  };

  const handleSkillListFieldChange = (
    collection: Exclude<SkillCollectionKey, 'execution_paths'>,
    index: number,
    field: string,
    value: string[],
  ) => {
    setFormData((prev: SkillDocument) => ({
      ...prev,
      decomposition: {
        ...prev.decomposition,
        [collection]: prev.decomposition[collection].map((item, itemIndex) => (
          itemIndex === index
            ? { ...item, [field]: value }
            : item
        )),
      },
    }));
  };

  const handleSkillFieldChange = (
    collection: Exclude<SkillCollectionKey, 'execution_paths'>,
    index: number,
    field: string,
    value: string | boolean | undefined,
  ) => {
    setFormData((prev: SkillDocument) => ({
      ...prev,
      decomposition: {
        ...prev.decomposition,
        [collection]: prev.decomposition[collection].map((item, itemIndex) => (
          itemIndex === index
            ? { ...item, [field]: value }
            : item
        )),
      },
    }));
  };

  const handleExecutionPathFieldChange = (
    index: number,
    field: keyof ExecutionPath,
    value: string | string[] | NonNullable<ExecutionPath['branches']>,
  ) => {
    setFormData((prev: SkillDocument) => ({
      ...prev,
      execution_paths: (prev.execution_paths ?? []).map((executionPath, pathIndex) => (
        pathIndex === index
          ? { ...executionPath, [field]: value }
          : executionPath
      )),
    }));
  };

  const addSkillCollectionItem = (collection: SkillCollectionKey) => {
    setFormData((prev: SkillDocument) => {
      if (collection === 'execution_paths') {
        return {
          ...prev,
          execution_paths: [...(prev.execution_paths ?? []), createEmptyExecutionPath()],
        };
      }

      const nextItem =
        collection === 'actions'
          ? createEmptyAction()
          : collection === 'rules'
            ? createEmptyRule()
            : createEmptyDirective();

      return {
        ...prev,
        decomposition: {
          ...prev.decomposition,
          [collection]: [...prev.decomposition[collection], nextItem],
        },
      };
    });
  };

  const removeSkillCollectionItem = (collection: SkillCollectionKey, index: number) => {
    setFormData((prev: SkillDocument) => {
      if (collection === 'execution_paths') {
        return {
          ...prev,
          execution_paths: (prev.execution_paths ?? []).filter((_, pathIndex) => pathIndex !== index),
        };
      }

      return {
        ...prev,
        decomposition: {
          ...prev.decomposition,
          [collection]: prev.decomposition[collection].filter((_, itemIndex) => itemIndex !== index),
        },
      };
    });
  };

  const formatJson = () => {
    try {
      const parsed = JSON.parse(jsonText);
      setJsonText(JSON.stringify(parsed, null, 2));
      setJsonError(null);
    } catch (error) {
      setJsonError(error instanceof Error ? error.message : t('editor.invalidJson'));
    }
  };

  const handleSave = () => {
    if (config.type !== 'json') {
      onSave(formData);
      return;
    }

    const parsedSkillDocument = parseSkillDocumentJson(jsonText);
    if (!parsedSkillDocument) {
      try {
        JSON.parse(jsonText);
        setJsonError(t('editor.invalidSkillDocument'));
      } catch (error) {
        setJsonError(error instanceof Error ? error.message : t('editor.invalidJson'));
      }
      return;
    }

    setJsonError(null);
    onSave(parsedSkillDocument);
  };

  const renderSectionHeader = (title: string, description: string, action: React.ReactNode) => (
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p>
      </div>
      {action}
    </div>
  );

  const panelMaxWidth = config.type === 'skillDocument' ? 'max-w-[720px]' : 'max-w-[400px]';

  return (
    <AnimatePresence>
      {config && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            aria-hidden="true"
            className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm"
          />
          <motion.div
            ref={panelRef}
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className={`fixed inset-y-0 right-0 z-50 flex h-full w-full ${panelMaxWidth} flex-col border-l border-border/60 bg-card shadow-2xl`}
          >
            <div className="border-b border-border/50 bg-muted/10 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 id={titleId} className="text-sm font-semibold tracking-tight text-foreground">
                    {config.type === 'global'
                      ? t('editor.editGlobal')
                      : config.type === 'phase'
                        ? t('editor.editPhase')
                        : config.type === 'decision'
                          ? t('editor.editDecision')
                          : config.type === 'skillDocument'
                            ? t('editor.editStructured')
                            : t('editor.editJson')}
                  </h2>
                  <p className="mt-1 text-[10px] uppercase tracking-widest text-muted-foreground/80">
                    {config.type === 'global'
                      ? t('editor.globalDesc')
                      : config.type === 'phase'
                        ? t('editor.phaseDesc')
                        : config.type === 'decision'
                          ? t('editor.decisionDesc')
                          : config.type === 'skillDocument'
                            ? t('editor.structuredDesc')
                            : t('editor.jsonDesc')}
                  </p>
                </div>
                <button
                  onClick={onClose}
                  aria-label={t('editor.close')}
                  className="rounded-full p-1.5 text-muted-foreground/70 transition-colors hover:bg-muted/50 hover:text-foreground"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            <div className="custom-scrollbar flex-1 overflow-y-auto p-6">
              <div className="space-y-6">
                {config.type === 'global' && (
                  <>
                    <div className="space-y-2">
                      <label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">{t('editor.projectName')}</label>
                      <input
                        ref={initialFieldRef}
                        type="text"
                        value={formData.projectName}
                        onChange={(event) => handleChange('projectName', event.target.value)}
                        className="w-full rounded-lg border border-border/60 bg-background px-3 py-2 text-sm shadow-sm transition-all focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/50"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">{t('editor.riskLevel')}</label>
                      <select
                        value={formData.riskAssessment.level}
                        onChange={(event) => handleNestedChange('riskAssessment', 'level', event.target.value)}
                        className="w-full rounded-lg border border-border/60 bg-background px-3 py-2 text-sm shadow-sm transition-all focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/50"
                      >
                        <option value="SAFE">Safe</option>
                        <option value="LOW">Low</option>
                        <option value="MEDIUM">Medium</option>
                        <option value="HIGH">High</option>
                        <option value="CRITICAL">Critical</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">{t('editor.category')}</label>
                      <input
                        type="text"
                        value={formData.threeClassification.category}
                        onChange={(event) => handleNestedChange('threeClassification', 'category', event.target.value)}
                        className="w-full rounded-lg border border-border/60 bg-background px-3 py-2 text-sm shadow-sm transition-all focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/50"
                      />
                    </div>
                  </>
                )}

                {config.type === 'decision' && (
                  <>
                    <div className="space-y-2">
                      <label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">{t('editor.question')}</label>
                      <input
                        ref={initialFieldRef}
                        type="text"
                        value={formData.question}
                        onChange={(event) => handleChange('question', event.target.value)}
                        className="w-full rounded-lg border border-border/60 bg-background px-3 py-2 text-sm shadow-sm transition-all focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/50"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">{t('editor.threshold')}</label>
                      <input
                        type="text"
                        value={formData.threshold}
                        onChange={(event) => handleChange('threshold', event.target.value)}
                        className="w-full rounded-lg border border-border/60 bg-background px-3 py-2 font-mono text-xs shadow-sm transition-all focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/50"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4 pt-2">
                      <div className="space-y-2">
                        <label className="text-[10px] font-semibold uppercase tracking-widest text-emerald-500/80">{t('editor.outcomeYes')}</label>
                        <input
                          type="text"
                          value={formData.outcomes.yes}
                          onChange={(event) => handleNestedChange('outcomes', 'yes', event.target.value)}
                          className="w-full rounded-lg border border-border/60 bg-background px-3 py-2 text-sm shadow-sm transition-all focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-semibold uppercase tracking-widest text-destructive/80">{t('editor.outcomeNo')}</label>
                        <input
                          type="text"
                          value={formData.outcomes.no}
                          onChange={(event) => handleNestedChange('outcomes', 'no', event.target.value)}
                          className="w-full rounded-lg border border-border/60 bg-background px-3 py-2 text-sm shadow-sm transition-all focus:border-destructive/50 focus:outline-none focus:ring-2 focus:ring-destructive/50"
                        />
                      </div>
                    </div>
                  </>
                )}

                {config.type === 'phase' && (
                  <>
                    <div className="space-y-2">
                      <label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">{t('editor.phaseName')}</label>
                      <input
                        ref={initialFieldRef}
                        type="text"
                        value={formData.name ?? ''}
                        onChange={(event) => handleChange('name', event.target.value)}
                        className="w-full rounded-lg border border-border/60 bg-background px-3 py-2 text-sm shadow-sm transition-all focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/50"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">{t('phaseDetails.inputs')}</label>
                      <textarea
                        value={listValue(formData.input)}
                        onChange={(event) => handleListChange('input', event.target.value)}
                        className="min-h-28 w-full resize-y rounded-lg border border-border/60 bg-background px-3 py-2 text-sm shadow-sm transition-all focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/50"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">{t('phaseDetails.tasks')}</label>
                      <textarea
                        value={listValue(formData.tasks)}
                        onChange={(event) => handleListChange('tasks', event.target.value)}
                        className="min-h-32 w-full resize-y rounded-lg border border-border/60 bg-background px-3 py-2 text-sm shadow-sm transition-all focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/50"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">{t('phaseDetails.outputs')}</label>
                      <textarea
                        value={listValue(formData.output)}
                        onChange={(event) => handleListChange('output', event.target.value)}
                        className="min-h-28 w-full resize-y rounded-lg border border-border/60 bg-background px-3 py-2 text-sm shadow-sm transition-all focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/50"
                      />
                    </div>
                  </>
                )}

                {config.type === 'skillDocument' && (
                  <>
                    <div className="rounded-2xl border border-border/60 bg-background/72 p-4 backdrop-blur-xl">
                      {renderSectionHeader(
                        t('editor.metaSection'),
                        t('editor.metaSectionHelp'),
                        <span className="rounded-full border border-border/60 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                          {t('editor.requiredBasics')}
                        </span>,
                      )}
                      <div className="mt-4 grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">{t('editor.skillTitle')}</label>
                          <input
                            ref={initialFieldRef}
                            type="text"
                            value={formData.meta?.title ?? ''}
                            onChange={(event) => handleSkillMetaChange('title', event.target.value)}
                            className="w-full rounded-lg border border-border/60 bg-background px-3 py-2 text-sm shadow-sm transition-all focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/50"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">{t('editor.skillName')}</label>
                          <input
                            type="text"
                            value={formData.meta?.name ?? ''}
                            onChange={(event) => handleSkillMetaChange('name', event.target.value)}
                            className="w-full rounded-lg border border-border/60 bg-background px-3 py-2 text-sm shadow-sm transition-all focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/50"
                          />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                          <label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">{t('editor.skillDescription')}</label>
                          <textarea
                            value={formData.meta?.description ?? ''}
                            onChange={(event) => handleSkillMetaChange('description', event.target.value)}
                            className="min-h-24 w-full resize-y rounded-lg border border-border/60 bg-background px-3 py-2 text-sm shadow-sm transition-all focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/50"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">{t('editor.skillVersion')}</label>
                          <input
                            type="text"
                            value={formData.meta?.version ?? ''}
                            onChange={(event) => handleSkillMetaChange('version', event.target.value)}
                            className="w-full rounded-lg border border-border/60 bg-background px-3 py-2 text-sm shadow-sm transition-all focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/50"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">{t('editor.skillSchemaVersion')}</label>
                          <input
                            type="text"
                            value={formData.meta?.schema_version ?? ''}
                            onChange={(event) => handleSkillMetaChange('schema_version', event.target.value)}
                            className="w-full rounded-lg border border-border/60 bg-background px-3 py-2 text-sm shadow-sm transition-all focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/50"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-border/60 bg-background/72 p-4 backdrop-blur-xl">
                      {renderSectionHeader(
                        t('editor.actionsSection'),
                        t('editor.actionsSectionHelp'),
                        <button
                          type="button"
                          onClick={() => addSkillCollectionItem('actions')}
                          className="inline-flex items-center gap-2 rounded-full border border-border/60 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground transition hover:border-primary/35 hover:text-foreground"
                        >
                          <Plus size={12} />
                          {t('editor.addAction')}
                        </button>,
                      )}
                      <div className="mt-4 space-y-4">
                        {formData.decomposition.actions.map((action: ActionNode, index: number) => (
                          <div key={`action-${index}`} className="rounded-2xl border border-border/55 bg-card/70 p-4">
                            <div className="mb-3 flex items-center justify-between gap-3">
                              <p className="text-sm font-semibold text-foreground">{action.id || `${t('editor.actionLabel')} ${index + 1}`}</p>
                              <button
                                type="button"
                                onClick={() => removeSkillCollectionItem('actions', index)}
                                aria-label={`${t('editor.remove')} ${t('editor.actionLabel')}`}
                                className="rounded-full border border-destructive/20 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-destructive transition hover:bg-destructive/8"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                            <div className="grid gap-4 md:grid-cols-2">
                              <div className="space-y-2">
                                <label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">{t('editor.id')}</label>
                                <input type="text" value={action.id} onChange={(event) => handleSkillFieldChange('actions', index, 'id', event.target.value)} className="w-full rounded-lg border border-border/60 bg-background px-3 py-2 text-sm shadow-sm transition-all focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/50" />
                              </div>
                              <div className="space-y-2">
                                <label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">{t('editor.name')}</label>
                                <input type="text" value={action.name} onChange={(event) => handleSkillFieldChange('actions', index, 'name', event.target.value)} className="w-full rounded-lg border border-border/60 bg-background px-3 py-2 text-sm shadow-sm transition-all focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/50" />
                              </div>
                              <div className="space-y-2">
                                <label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">{t('editor.actionType')}</label>
                                <input type="text" value={action.action_type} onChange={(event) => handleSkillFieldChange('actions', index, 'action_type', event.target.value)} className="w-full rounded-lg border border-border/60 bg-background px-3 py-2 text-sm shadow-sm transition-all focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/50" />
                              </div>
                              <div className="space-y-2">
                                <label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">{t('editor.deterministic')}</label>
                                <select
                                  value={action.deterministic === undefined ? '' : action.deterministic ? 'true' : 'false'}
                                  onChange={(event) => handleSkillFieldChange('actions', index, 'deterministic', event.target.value === '' ? undefined : event.target.value === 'true')}
                                  className="w-full rounded-lg border border-border/60 bg-background px-3 py-2 text-sm shadow-sm transition-all focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/50"
                                >
                                  <option value="">{t('editor.notSpecified')}</option>
                                  <option value="true">{t('editor.yes')}</option>
                                  <option value="false">{t('editor.no')}</option>
                                </select>
                              </div>
                              <div className="space-y-2 md:col-span-2">
                                <label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">{t('editor.description')}</label>
                                <textarea value={action.description ?? ''} onChange={(event) => handleSkillFieldChange('actions', index, 'description', event.target.value)} className="min-h-24 w-full resize-y rounded-lg border border-border/60 bg-background px-3 py-2 text-sm shadow-sm transition-all focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/50" />
                              </div>
                              <div className="space-y-2">
                                <label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">{t('editor.mutableElements')}</label>
                                <textarea value={listValue(action.mutable_elements)} onChange={(event) => handleSkillListFieldChange('actions', index, 'mutable_elements', parseLineList(event.target.value))} className="min-h-24 w-full resize-y rounded-lg border border-border/60 bg-background px-3 py-2 text-sm shadow-sm transition-all focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/50" />
                              </div>
                              <div className="space-y-2">
                                <label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">{t('editor.immutableElements')}</label>
                                <textarea value={listValue(action.immutable_elements)} onChange={(event) => handleSkillListFieldChange('actions', index, 'immutable_elements', parseLineList(event.target.value))} className="min-h-24 w-full resize-y rounded-lg border border-border/60 bg-background px-3 py-2 text-sm shadow-sm transition-all focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/50" />
                              </div>
                              <div className="space-y-2 md:col-span-2">
                                <label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">{t('editor.sideEffects')}</label>
                                <textarea value={listValue(action.side_effects)} onChange={(event) => handleSkillListFieldChange('actions', index, 'side_effects', parseLineList(event.target.value))} className="min-h-24 w-full resize-y rounded-lg border border-border/60 bg-background px-3 py-2 text-sm shadow-sm transition-all focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/50" />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-border/60 bg-background/72 p-4 backdrop-blur-xl">
                      {renderSectionHeader(
                        t('editor.rulesSection'),
                        t('editor.rulesSectionHelp'),
                        <button
                          type="button"
                          onClick={() => addSkillCollectionItem('rules')}
                          className="inline-flex items-center gap-2 rounded-full border border-border/60 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground transition hover:border-primary/35 hover:text-foreground"
                        >
                          <Plus size={12} />
                          {t('editor.addRule')}
                        </button>,
                      )}
                      <div className="mt-4 space-y-4">
                        {formData.decomposition.rules.map((rule: RuleNode, index: number) => (
                          <div key={`rule-${index}`} className="rounded-2xl border border-border/55 bg-card/70 p-4">
                            <div className="mb-3 flex items-center justify-between gap-3">
                              <p className="text-sm font-semibold text-foreground">{rule.id || `${t('editor.ruleLabel')} ${index + 1}`}</p>
                              <button
                                type="button"
                                onClick={() => removeSkillCollectionItem('rules', index)}
                                aria-label={`${t('editor.remove')} ${t('editor.ruleLabel')}`}
                                className="rounded-full border border-destructive/20 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-destructive transition hover:bg-destructive/8"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                            <div className="grid gap-4 md:grid-cols-2">
                              <div className="space-y-2">
                                <label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">{t('editor.id')}</label>
                                <input type="text" value={rule.id} onChange={(event) => handleSkillFieldChange('rules', index, 'id', event.target.value)} className="w-full rounded-lg border border-border/60 bg-background px-3 py-2 text-sm shadow-sm transition-all focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/50" />
                              </div>
                              <div className="space-y-2">
                                <label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">{t('editor.name')}</label>
                                <input type="text" value={rule.name} onChange={(event) => handleSkillFieldChange('rules', index, 'name', event.target.value)} className="w-full rounded-lg border border-border/60 bg-background px-3 py-2 text-sm shadow-sm transition-all focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/50" />
                              </div>
                              <div className="space-y-2">
                                <label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">{t('editor.conditionType')}</label>
                                <input type="text" value={rule.condition_type ?? ''} onChange={(event) => handleSkillFieldChange('rules', index, 'condition_type', event.target.value)} className="w-full rounded-lg border border-border/60 bg-background px-3 py-2 text-sm shadow-sm transition-all focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/50" />
                              </div>
                              <div className="space-y-2">
                                <label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">{t('editor.returns')}</label>
                                <input type="text" value={rule.returns ?? ''} onChange={(event) => handleSkillFieldChange('rules', index, 'returns', event.target.value)} className="w-full rounded-lg border border-border/60 bg-background px-3 py-2 text-sm shadow-sm transition-all focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/50" />
                              </div>
                              <div className="space-y-2 md:col-span-2">
                                <label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">{t('editor.conditionExpression')}</label>
                                <textarea value={rule.condition_expression ?? ''} onChange={(event) => handleSkillFieldChange('rules', index, 'condition_expression', event.target.value)} className="min-h-24 w-full resize-y rounded-lg border border-border/60 bg-background px-3 py-2 font-mono text-xs shadow-sm transition-all focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/50" />
                              </div>
                              <div className="space-y-2 md:col-span-2">
                                <label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">{t('editor.description')}</label>
                                <textarea value={rule.description ?? ''} onChange={(event) => handleSkillFieldChange('rules', index, 'description', event.target.value)} className="min-h-24 w-full resize-y rounded-lg border border-border/60 bg-background px-3 py-2 text-sm shadow-sm transition-all focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/50" />
                              </div>
                              <div className="space-y-2 md:col-span-2">
                                <label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">{t('editor.failAction')}</label>
                                <input type="text" value={rule.fail_action ?? ''} onChange={(event) => handleSkillFieldChange('rules', index, 'fail_action', event.target.value)} className="w-full rounded-lg border border-border/60 bg-background px-3 py-2 text-sm shadow-sm transition-all focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/50" />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-border/60 bg-background/72 p-4 backdrop-blur-xl">
                      {renderSectionHeader(
                        t('editor.directivesSection'),
                        t('editor.directivesSectionHelp'),
                        <button
                          type="button"
                          onClick={() => addSkillCollectionItem('directives')}
                          className="inline-flex items-center gap-2 rounded-full border border-border/60 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground transition hover:border-primary/35 hover:text-foreground"
                        >
                          <Plus size={12} />
                          {t('editor.addDirective')}
                        </button>,
                      )}
                      <div className="mt-4 space-y-4">
                        {formData.decomposition.directives.map((directive: DirectiveNode, index: number) => (
                          <div key={`directive-${index}`} className="rounded-2xl border border-border/55 bg-card/70 p-4">
                            <div className="mb-3 flex items-center justify-between gap-3">
                              <p className="text-sm font-semibold text-foreground">{directive.id || `${t('editor.directiveLabel')} ${index + 1}`}</p>
                              <button
                                type="button"
                                onClick={() => removeSkillCollectionItem('directives', index)}
                                aria-label={`${t('editor.remove')} ${t('editor.directiveLabel')}`}
                                className="rounded-full border border-destructive/20 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-destructive transition hover:bg-destructive/8"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                            <div className="grid gap-4 md:grid-cols-2">
                              <div className="space-y-2">
                                <label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">{t('editor.id')}</label>
                                <input type="text" value={directive.id} onChange={(event) => handleSkillFieldChange('directives', index, 'id', event.target.value)} className="w-full rounded-lg border border-border/60 bg-background px-3 py-2 text-sm shadow-sm transition-all focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/50" />
                              </div>
                              <div className="space-y-2">
                                <label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">{t('editor.name')}</label>
                                <input type="text" value={directive.name} onChange={(event) => handleSkillFieldChange('directives', index, 'name', event.target.value)} className="w-full rounded-lg border border-border/60 bg-background px-3 py-2 text-sm shadow-sm transition-all focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/50" />
                              </div>
                              <div className="space-y-2">
                                <label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">{t('editor.directiveType')}</label>
                                <input type="text" value={directive.directive_type} onChange={(event) => handleSkillFieldChange('directives', index, 'directive_type', event.target.value)} className="w-full rounded-lg border border-border/60 bg-background px-3 py-2 text-sm shadow-sm transition-all focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/50" />
                              </div>
                              <div className="space-y-2">
                                <label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">{t('editor.decomposable')}</label>
                                <select
                                  value={directive.decomposable === undefined ? '' : directive.decomposable ? 'true' : 'false'}
                                  onChange={(event) => handleSkillFieldChange('directives', index, 'decomposable', event.target.value === '' ? undefined : event.target.value === 'true')}
                                  className="w-full rounded-lg border border-border/60 bg-background px-3 py-2 text-sm shadow-sm transition-all focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/50"
                                >
                                  <option value="">{t('editor.notSpecified')}</option>
                                  <option value="true">{t('editor.yes')}</option>
                                  <option value="false">{t('editor.no')}</option>
                                </select>
                              </div>
                              <div className="space-y-2 md:col-span-2">
                                <label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">{t('editor.description')}</label>
                                <textarea value={directive.description ?? ''} onChange={(event) => handleSkillFieldChange('directives', index, 'description', event.target.value)} className="min-h-24 w-full resize-y rounded-lg border border-border/60 bg-background px-3 py-2 text-sm shadow-sm transition-all focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/50" />
                              </div>
                              <div className="space-y-2 md:col-span-2">
                                <label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">{t('editor.decompositionHint')}</label>
                                <textarea value={directive.decomposition_hint ?? ''} onChange={(event) => handleSkillFieldChange('directives', index, 'decomposition_hint', event.target.value)} className="min-h-24 w-full resize-y rounded-lg border border-border/60 bg-background px-3 py-2 text-sm shadow-sm transition-all focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/50" />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-border/60 bg-background/72 p-4 backdrop-blur-xl">
                      {renderSectionHeader(
                        t('editor.executionPathsSection'),
                        t('editor.executionPathsSectionHelp'),
                        <button
                          type="button"
                          onClick={() => addSkillCollectionItem('execution_paths')}
                          className="inline-flex items-center gap-2 rounded-full border border-border/60 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground transition hover:border-primary/35 hover:text-foreground"
                        >
                          <Plus size={12} />
                          {t('editor.addExecutionPath')}
                        </button>,
                      )}
                      <div className="mt-4 space-y-4">
                        {(formData.execution_paths ?? []).map((executionPath: ExecutionPath, index: number) => (
                          <div key={`path-${index}`} className="rounded-2xl border border-border/55 bg-card/70 p-4">
                            <div className="mb-3 flex items-center justify-between gap-3">
                              <p className="text-sm font-semibold text-foreground">{executionPath.id || `${t('editor.executionPathLabel')} ${index + 1}`}</p>
                              <button
                                type="button"
                                onClick={() => removeSkillCollectionItem('execution_paths', index)}
                                aria-label={`${t('editor.remove')} ${t('editor.executionPathLabel')}`}
                                className="rounded-full border border-destructive/20 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-destructive transition hover:bg-destructive/8"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                            <div className="grid gap-4 md:grid-cols-2">
                              <div className="space-y-2">
                                <label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">{t('editor.id')}</label>
                                <input type="text" value={executionPath.id} onChange={(event) => handleExecutionPathFieldChange(index, 'id', event.target.value)} className="w-full rounded-lg border border-border/60 bg-background px-3 py-2 text-sm shadow-sm transition-all focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/50" />
                              </div>
                              <div className="space-y-2">
                                <label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">{t('editor.name')}</label>
                                <input type="text" value={executionPath.name ?? ''} onChange={(event) => handleExecutionPathFieldChange(index, 'name', event.target.value)} className="w-full rounded-lg border border-border/60 bg-background px-3 py-2 text-sm shadow-sm transition-all focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/50" />
                              </div>
                              <div className="space-y-2 md:col-span-2">
                                <label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">{t('editor.entryCondition')}</label>
                                <input type="text" value={executionPath.entry_condition ?? ''} onChange={(event) => handleExecutionPathFieldChange(index, 'entry_condition', event.target.value)} className="w-full rounded-lg border border-border/60 bg-background px-3 py-2 text-sm shadow-sm transition-all focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/50" />
                              </div>
                              <div className="space-y-2">
                                <label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">{t('editor.steps')}</label>
                                <textarea value={listValue(executionPath.steps)} onChange={(event) => handleExecutionPathFieldChange(index, 'steps', parseLineList(event.target.value))} className="min-h-28 w-full resize-y rounded-lg border border-border/60 bg-background px-3 py-2 font-mono text-xs shadow-sm transition-all focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/50" />
                              </div>
                              <div className="space-y-2">
                                <label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">{t('editor.branches')}</label>
                                <textarea value={branchesToText(executionPath.branches)} onChange={(event) => handleExecutionPathFieldChange(index, 'branches', parseBranchesText(event.target.value))} className="min-h-28 w-full resize-y rounded-lg border border-border/60 bg-background px-3 py-2 font-mono text-xs shadow-sm transition-all focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/50" />
                                <p className="text-[11px] leading-5 text-muted-foreground">{t('editor.branchesHelp')}</p>
                              </div>
                              <div className="space-y-2">
                                <label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">{t('editor.successEnd')}</label>
                                <input type="text" value={executionPath.success_end ?? ''} onChange={(event) => handleExecutionPathFieldChange(index, 'success_end', event.target.value)} className="w-full rounded-lg border border-border/60 bg-background px-3 py-2 text-sm shadow-sm transition-all focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/50" />
                              </div>
                              <div className="space-y-2">
                                <label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">{t('editor.failureEnd')}</label>
                                <input type="text" value={executionPath.failure_end ?? ''} onChange={(event) => handleExecutionPathFieldChange(index, 'failure_end', event.target.value)} className="w-full rounded-lg border border-border/60 bg-background px-3 py-2 text-sm shadow-sm transition-all focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/50" />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {config.type === 'json' && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">{t('editor.jsonDocument')}</label>
                      <button
                        type="button"
                        onClick={formatJson}
                        className="rounded-full border border-border/60 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground transition hover:border-primary/35 hover:text-foreground"
                      >
                        {t('editor.formatJson')}
                      </button>
                    </div>
                    <textarea
                      ref={initialFieldRef}
                      value={jsonText}
                      onChange={(event) => {
                        setJsonText(event.target.value);
                        if (jsonError) {
                          setJsonError(null);
                        }
                      }}
                      className="min-h-[420px] w-full resize-y rounded-lg border border-border/60 bg-background px-3 py-3 font-mono text-xs leading-6 shadow-sm transition-all focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/50"
                      spellCheck={false}
                    />
                    <p className="text-xs leading-6 text-muted-foreground">{t('editor.jsonHelp')}</p>
                    {jsonError && (
                      <div className="rounded-lg border border-destructive/20 bg-destructive/8 px-3 py-2 text-xs leading-6 text-destructive">
                        {jsonError}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="border-t border-border/50 bg-muted/5 p-5">
              <button
                onClick={handleSave}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-2.5 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
              >
                <Save size={16} /> {t('editor.save')}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
