import React, { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import {
  ChevronDown,
  ChevronUp,
  ExternalLink,
  FileCode2,
  FileText,
  GitBranch,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  TerminalSquare,
} from 'lucide-react';
import type { UploadedContextFile } from '../types/intake';

type SectionId = 'source' | 'manifest' | 'actions' | 'rules' | 'directives' | 'commands' | 'findings' | 'paths' | 'json';

const SCHEMA_URL = 'https://github.com/pingqLIN/skill-0/blob/main/schema/skill-decomposition.schema.json';
const PARSER_URL = 'https://github.com/pingqLIN/skill-0/blob/main/scripts/auto_parse.py';

export function DecompositionBoard({
  parserResult,
  supportFiles,
  selectedContextPath,
  onSelectContext,
}: {
  parserResult: any;
  supportFiles: UploadedContextFile[];
  selectedContextPath: string | null;
  onSelectContext: (path: string) => void;
}) {
  const { t } = useTranslation();
  const [openSection, setOpenSection] = useState<SectionId>('actions');

  const meta = parserResult?.meta ?? {};
  const original = parserResult?.original_definition ?? {};
  const decomposition = parserResult?.decomposition ?? {};
  const actions = decomposition.actions ?? [];
  const rules = decomposition.rules ?? [];
  const directives = decomposition.directives ?? [];
  const executionPaths = parserResult?.execution_paths ?? [];
  const manifest = parserResult?.manifest ?? null;
  const manifestFiles = parserResult?.supporting_files ?? [];
  const commandReferences = parserResult?.command_references ?? [];
  const analysisFindings = parserResult?.analysis_findings ?? [];
  const delegationNodes = parserResult?.delegation_nodes ?? [];

  const summaryCards = useMemo(() => ([
    { label: t('app.totalActions'), value: actions.length, icon: <Sparkles size={14} className="text-primary/70" /> },
    { label: t('app.totalRules'), value: rules.length, icon: <ShieldCheck size={14} className="text-primary/70" /> },
    { label: t('app.totalDirectives'), value: directives.length, icon: <GitBranch size={14} className="text-primary/70" /> },
    { label: t('app.executionPaths'), value: executionPaths.length, icon: <FileCode2 size={14} className="text-primary/70" /> },
    { label: t('app.supportingFiles'), value: manifestFiles.length, icon: <FileText size={14} className="text-primary/70" /> },
    { label: t('app.analysisFindings'), value: analysisFindings.length, icon: <ShieldAlert size={14} className="text-primary/70" /> },
  ]), [actions.length, analysisFindings.length, directives.length, executionPaths.length, manifestFiles.length, rules.length, t]);

  const traceMap = useMemo(() => {
    const rankMatches = (entity: { id?: string; name?: string; description?: string; condition_expression?: string }) => {
      const haystack = `${entity.id || ''} ${entity.name || ''} ${entity.description || ''} ${entity.condition_expression || ''}`.toLowerCase();
      const tokens = haystack.split(/[^a-z0-9_]+/i).filter((token) => token.length >= 4);

      return supportFiles
        .map((file) => {
          const corpus = `${file.name} ${file.path} ${file.preview || ''}`.toLowerCase();
          const score = tokens.reduce((sum, token) => sum + (corpus.includes(token) ? 1 : 0), 0);
          return { file, score };
        })
        .filter((entry) => entry.score > 0)
        .sort((left, right) => right.score - left.score)
        .slice(0, 3)
        .map((entry) => entry.file);
    };

    return {
      actions: new Map(actions.map((action: any) => [action.id, rankMatches(action)])),
      rules: new Map(rules.map((rule: any) => [rule.id, rankMatches(rule)])),
      directives: new Map(directives.map((directive: any) => [directive.id, rankMatches(directive)])),
    };
  }, [actions, directives, rules, supportFiles]);

  const reverseTrace = useMemo(() => {
    if (!selectedContextPath) {
      return { actions: [], rules: [], directives: [] };
    }

    const collectMatches = (items: any[], bucket: Map<string, UploadedContextFile[]>) =>
      items.filter((item) => (bucket.get(item.id) || []).some((file) => file.path === selectedContextPath));

    return {
      actions: collectMatches(actions, traceMap.actions),
      rules: collectMatches(rules, traceMap.rules),
      directives: collectMatches(directives, traceMap.directives),
    };
  }, [actions, directives, rules, selectedContextPath, traceMap.actions, traceMap.directives, traceMap.rules]);

  const selectedContext = supportFiles.find((file) => file.path === selectedContextPath) || null;

  return (
    <div className="space-y-5">
      <section className="glass-panel-strong relative overflow-hidden px-5 py-5 sm:px-6">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/45 to-transparent" />
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <div>
              <p className="editorial-kicker">{t('app.decompositionBoard')}</p>
              <h3 className="mt-2 font-serif text-3xl font-semibold tracking-tight text-foreground">
                {meta.title || meta.name || t('app.analysisResult')}
              </h3>
            </div>
            <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
              {meta.description || original.skill_description || t('app.parserBoardHint')}
            </p>
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <MetaLink href={SCHEMA_URL} label={`${t('app.schemaVersion')}: ${meta.schema_version || 'n/a'}`} />
              <MetaLink href={PARSER_URL} label={`${t('app.parserVersion')}: ${meta.parser_version || 'n/a'}`} />
              <MetaPill label={`${t('app.sourceDefinition')}: ${original.source || meta.skill_layer || 'uploaded skill'}`} />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {summaryCards.map((card) => (
              <div key={card.label} className="rounded-[1.2rem] border border-border/55 bg-background/72 px-4 py-3 shadow-[0_14px_30px_-28px_hsl(var(--foreground)/0.4)] backdrop-blur-xl">
                <div className="flex items-center gap-2 text-muted-foreground">
                  {card.icon}
                  <span className="text-[10px] font-semibold uppercase tracking-[0.22em]">{card.label}</span>
                </div>
                <div className="mt-3 text-2xl font-semibold tracking-tight text-foreground">{card.value}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="space-y-3">
        <BoardSection
          title={t('app.sourceDefinition')}
          summary={original.source || meta.skill_layer || t('app.analysisResult')}
          isOpen={openSection === 'source'}
          onToggle={() => setOpenSection(openSection === 'source' ? 'actions' : 'source')}
        >
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
            <div className="rounded-[1.35rem] border border-border/55 bg-white/48 p-4 backdrop-blur-2xl">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <FileText size={16} className="text-primary/70" />
                {meta.title || meta.name || original.skill_name || t('app.analysisResult')}
              </div>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">
                {meta.description || original.skill_description || t('app.parserBoardHint')}
              </p>
              {supportFiles.length > 0 && (
                <div className="mt-4">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">{t('app.collaborationContext')}</div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {supportFiles.map((file) => (
                      <button
                        key={file.path}
                        type="button"
                        onClick={() => onSelectContext(file.path)}
                        className={`rounded-full border px-3 py-1.5 text-[11px] font-medium transition ${
                          selectedContextPath === file.path
                            ? 'border-primary/35 bg-primary/10 text-primary'
                            : 'border-border/55 bg-background/72 text-foreground hover:border-primary/30'
                        }`}
                        title={file.path}
                      >
                        {file.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {selectedContext && (
                <div className="mt-4 rounded-[1.15rem] border border-border/50 bg-background/72 px-3 py-3 backdrop-blur-xl">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">{t('app.reverseTrace')}</div>
                  <div className="mt-2 text-sm font-medium text-foreground">{selectedContext.name}</div>
                  <div className="mt-1 text-xs text-muted-foreground">{selectedContext.path}</div>
                  {selectedContext.preview && (
                    <p className="mt-3 text-xs leading-6 text-muted-foreground">{selectedContext.preview}</p>
                  )}
                  <div className="mt-3 grid gap-2 md:grid-cols-3">
                    <InfoCell label={t('app.totalActions')} value={String(reverseTrace.actions.length)} />
                    <InfoCell label={t('app.totalRules')} value={String(reverseTrace.rules.length)} />
                    <InfoCell label={t('app.totalDirectives')} value={String(reverseTrace.directives.length)} />
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {reverseTrace.actions.map((item: any) => (
                      <span key={item.id} className="rounded-full border border-border/55 bg-white/70 px-3 py-1.5 text-[11px] font-medium text-foreground">{item.id}</span>
                    ))}
                    {reverseTrace.rules.map((item: any) => (
                      <span key={item.id} className="rounded-full border border-border/55 bg-white/70 px-3 py-1.5 text-[11px] font-medium text-foreground">{item.id}</span>
                    ))}
                    {reverseTrace.directives.map((item: any) => (
                      <span key={item.id} className="rounded-full border border-border/55 bg-white/70 px-3 py-1.5 text-[11px] font-medium text-foreground">{item.id}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="grid gap-3">
              <InfoCell label={t('app.project')} value={meta.skill_id || 'n/a'} />
              <InfoCell label={t('app.schemaVersion')} value={meta.schema_version || 'n/a'} />
              <InfoCell label={t('app.parserVersion')} value={meta.parser_version || 'n/a'} />
              <InfoCell label={t('app.source')} value={original.source || meta.skill_layer || 'n/a'} />
            </div>
          </div>
        </BoardSection>

        <BoardSection
          title={t('app.manifestSummary')}
          summary={manifest?.analysis_level || t('app.analysisResult')}
          isOpen={openSection === 'manifest'}
          onToggle={() => setOpenSection(openSection === 'manifest' ? 'actions' : 'manifest')}
        >
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
            <div className="rounded-[1.35rem] border border-border/55 bg-white/48 p-4 backdrop-blur-2xl">
              <div className="text-sm font-medium text-foreground">
                {manifest?.entry_skill?.path || original.source || meta.skill_layer || 'SKILL.md'}
              </div>
              <p className="mt-2 text-sm leading-7 text-muted-foreground">
                {manifest
                  ? `${manifest.supporting_files_count || 0} supporting references, ${manifest.command_references_count || 0} command references, ${manifest.delegation_nodes_count || 0} delegation signals.`
                  : t('app.noManifestSummary')}
              </p>
              {delegationNodes.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {delegationNodes.map((node: any) => (
                    <span key={node.id} className="rounded-full border border-border/55 bg-background/72 px-3 py-1.5 text-[11px] font-medium text-foreground">
                      {node.kind}{node.agent ? ` · ${node.agent}` : ''}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="grid gap-3">
              <InfoCell label={t('app.analysisLevel')} value={manifest?.analysis_level || parserResult?.parser_meta?.analysis_level || 'single_file'} />
              <InfoCell label={t('app.supportingFiles')} value={String(manifest?.supporting_files_count || manifestFiles.length)} />
              <InfoCell label={t('app.commandReferences')} value={String(manifest?.command_references_count || commandReferences.length)} />
              <InfoCell label={t('app.unresolvedReferences')} value={String(manifest?.unresolved_references_count || 0)} />
            </div>
          </div>
          <div className="mt-4 grid gap-3">
            {manifestFiles.length > 0 ? manifestFiles.map((file: any) => (
              <div key={file.id} className="rounded-[1.2rem] border border-border/55 bg-background/72 px-4 py-3 shadow-[0_14px_30px_-28px_hsl(var(--foreground)/0.4)] backdrop-blur-xl">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-medium text-foreground">{file.path}</div>
                    <div className="mt-1 text-xs text-muted-foreground">{file.kind} · {file.resolved ? t('app.resolved') : t('app.unresolved')}</div>
                  </div>
                  <div className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${file.resolved ? 'bg-emerald-500/12 text-emerald-700' : 'bg-amber-500/12 text-amber-700'}`}>
                    {file.resolved ? t('app.resolved') : t('app.unresolved')}
                  </div>
                </div>
                <p className="mt-2 text-xs leading-6 text-muted-foreground">{file.summary}</p>
              </div>
            )) : (
              <EmptyState label={t('app.noSupportingFiles')} />
            )}
          </div>
        </BoardSection>

        <BoardSection
          title={t('app.totalActions')}
          summary={`${actions.length} items`}
          isOpen={openSection === 'actions'}
          onToggle={() => setOpenSection(openSection === 'actions' ? 'rules' : 'actions')}
        >
          <div className="grid gap-3">
            {actions.map((action: any) => (
              <div key={action.id}>
                <EntityCard
                  id={action.id}
                  title={action.name}
                  subtitle={action.action_type}
                  description={action.description}
                  traceFiles={traceMap.actions.get(action.id) || []}
                  selectedContextPath={selectedContextPath}
                  onSelectContext={onSelectContext}
                  properties={[
                    { label: 'deterministic', value: String(action.deterministic) },
                    { label: 'immutable', value: (action.immutable_elements ?? []).join(', ') || 'none' },
                    { label: 'mutable', value: (action.mutable_elements ?? []).join(', ') || 'none' },
                    { label: 'effects', value: (action.side_effects ?? []).join(', ') || 'none' },
                  ]}
                />
              </div>
            ))}
          </div>
        </BoardSection>

        <BoardSection
          title={t('app.totalRules')}
          summary={`${rules.length} items`}
          isOpen={openSection === 'rules'}
          onToggle={() => setOpenSection(openSection === 'rules' ? 'directives' : 'rules')}
        >
          <div className="grid gap-3">
            {rules.map((rule: any) => (
              <div key={rule.id}>
                <EntityCard
                  id={rule.id}
                  title={rule.name}
                  subtitle={rule.condition_type}
                  description={rule.condition_expression}
                  traceFiles={traceMap.rules.get(rule.id) || []}
                  selectedContextPath={selectedContextPath}
                  onSelectContext={onSelectContext}
                  properties={[
                    { label: 'returns', value: rule.returns || 'n/a' },
                    { label: 'fail_action', value: rule.fail_action || 'n/a' },
                    { label: 'branching_targets', value: (rule.branching_targets ?? []).join(', ') || 'none' },
                  ]}
                />
              </div>
            ))}
          </div>
        </BoardSection>

        <BoardSection
          title={t('app.totalDirectives')}
          summary={`${directives.length} items`}
          isOpen={openSection === 'directives'}
          onToggle={() => setOpenSection(openSection === 'directives' ? 'paths' : 'directives')}
        >
          <div className="grid gap-3">
            {directives.map((directive: any) => (
              <div key={directive.id}>
                <EntityCard
                  id={directive.id}
                  title={directive.name}
                  subtitle={directive.directive_type}
                  description={directive.description}
                  traceFiles={traceMap.directives.get(directive.id) || []}
                  selectedContextPath={selectedContextPath}
                  onSelectContext={onSelectContext}
                  properties={[
                    { label: 'decomposable', value: String(directive.decomposable) },
                    { label: 'hint', value: directive.decomposition_hint || 'n/a' },
                    { label: 'related', value: (directive.related_elements ?? []).join(', ') || 'none' },
                  ]}
                />
              </div>
            ))}
          </div>
        </BoardSection>

        <BoardSection
          title={t('app.commandReferences')}
          summary={`${commandReferences.length} items`}
          isOpen={openSection === 'commands'}
          onToggle={() => setOpenSection(openSection === 'commands' ? 'findings' : 'commands')}
        >
          <div className="grid gap-3">
            {commandReferences.length > 0 ? commandReferences.map((command: any) => (
              <div key={command.id} className="rounded-[1.35rem] border border-border/55 bg-white/48 p-4 backdrop-blur-2xl">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-sm font-semibold tracking-tight text-foreground">
                    <TerminalSquare size={16} className="text-primary/70" />
                    {command.id}
                  </div>
                  <div className="rounded-full border border-border/55 bg-background/72 px-2.5 py-1 text-[11px] font-mono text-muted-foreground">
                    {command.risk_grade} · {command.authority_profile}
                  </div>
                </div>
                <pre className="mt-3 overflow-x-auto rounded-[1rem] border border-border/45 bg-slate-950/88 px-3 py-2 text-xs leading-6 text-slate-100">
                  {command.command}
                </pre>
                <div className="mt-3 grid gap-2 md:grid-cols-3">
                  <InfoCell label={t('app.source')} value={command.source_path} />
                  <InfoCell label={t('app.shellFamily')} value={command.shell_family} />
                  <InfoCell label={t('app.riskGrade')} value={command.risk_grade} />
                </div>
              </div>
            )) : (
              <EmptyState label={t('app.noCommandReferences')} />
            )}
          </div>
        </BoardSection>

        <BoardSection
          title={t('app.analysisFindings')}
          summary={`${analysisFindings.length} items`}
          isOpen={openSection === 'findings'}
          onToggle={() => setOpenSection(openSection === 'findings' ? 'paths' : 'findings')}
        >
          <div className="grid gap-3">
            {analysisFindings.length > 0 ? analysisFindings.map((finding: any) => (
              <div key={finding.finding_id} className="rounded-[1.35rem] border border-border/55 bg-white/48 p-4 backdrop-blur-2xl">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-semibold tracking-tight text-foreground">{finding.title}</div>
                  <div className="rounded-full border border-border/55 bg-background/72 px-2.5 py-1 text-[11px] font-mono text-muted-foreground">
                    {finding.severity} · {finding.confidence}
                  </div>
                </div>
                <div className="mt-2 text-xs text-muted-foreground">
                  {finding.category} · {finding.recommended_action}
                </div>
                {finding.affected_paths?.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {finding.affected_paths.map((item: string) => (
                      <span key={item} className="rounded-full border border-border/55 bg-background/72 px-2.5 py-1 text-[11px] font-medium text-foreground">
                        {item}
                      </span>
                    ))}
                  </div>
                )}
                {finding.evidence?.length > 0 && (
                  <div className="mt-3 grid gap-2">
                    {finding.evidence.map((evidence: any, index: number) => (
                      <div key={`${finding.finding_id}-${index}`} className="rounded-[1rem] border border-border/45 bg-background/72 px-3 py-2">
                        <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">{evidence.kind}</div>
                        <div className="mt-1 text-xs text-foreground">{evidence.excerpt}</div>
                        <div className="mt-1 text-xs text-muted-foreground">{evidence.explanation}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )) : (
              <EmptyState label={t('app.noAnalysisFindings')} />
            )}
          </div>
        </BoardSection>

        <BoardSection
          title={t('app.executionPaths')}
          summary={`${executionPaths.length} items`}
          isOpen={openSection === 'paths'}
          onToggle={() => setOpenSection(openSection === 'paths' ? 'json' : 'paths')}
        >
          <div className="grid gap-3">
            {executionPaths.length > 0 ? executionPaths.map((path: any) => (
              <div key={path.path_id} className="rounded-[1.35rem] border border-border/55 bg-white/48 p-4 backdrop-blur-2xl">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-semibold tracking-tight text-foreground">Path {path.path_id}</div>
                  <div className="rounded-full border border-border/55 bg-background/72 px-2.5 py-1 text-[11px] font-mono text-muted-foreground">{path.sequence?.length ?? 0} steps</div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {(path.sequence ?? []).map((step: string) => (
                    <span key={step} className="rounded-full border border-border/55 bg-background/72 px-2.5 py-1 text-[11px] font-medium text-foreground">
                      {step}
                    </span>
                  ))}
                </div>
              </div>
            )) : (
              <EmptyState label={t('app.noExecutionPaths')} />
            )}
          </div>
        </BoardSection>

        <BoardSection
          title={t('app.rawJson')}
          summary={t('app.canonicalPayload')}
          isOpen={openSection === 'json'}
          onToggle={() => setOpenSection(openSection === 'json' ? 'actions' : 'json')}
        >
          <pre className="custom-scrollbar overflow-x-auto rounded-[1.35rem] border border-border/55 bg-slate-950/88 p-4 text-xs leading-6 text-slate-100">
            {JSON.stringify(parserResult, null, 2)}
          </pre>
        </BoardSection>
      </div>
    </div>
  );
}

function BoardSection({
  title,
  summary,
  isOpen,
  onToggle,
  children,
}: {
  title: string;
  summary?: string;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <section className="glass-panel overflow-hidden">
      <button onClick={onToggle} className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left sm:px-6">
        <div>
          <p className="editorial-kicker">{title}</p>
          {summary && <p className="mt-2 text-sm text-muted-foreground">{summary}</p>}
        </div>
        {isOpen ? <ChevronUp size={16} className="text-muted-foreground" /> : <ChevronDown size={16} className="text-muted-foreground" />}
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
            <div className="px-5 pb-5 sm:px-6 sm:pb-6">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

function EntityCard({
  id,
  title,
  subtitle,
  description,
  properties,
  traceFiles,
  selectedContextPath,
  onSelectContext,
}: {
  id: string;
  title: string;
  subtitle?: string;
  description?: string;
  properties: Array<{ label: string; value: string }>;
  traceFiles: UploadedContextFile[];
  selectedContextPath: string | null;
  onSelectContext: (path: string) => void;
}) {
  return (
    <div className="rounded-[1.35rem] border border-border/55 bg-white/48 p-4 backdrop-blur-2xl">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-border/55 bg-background/72 px-2.5 py-1 text-[11px] font-mono text-muted-foreground">{id}</span>
            {subtitle && <span className="rounded-full border border-primary/20 bg-primary/8 px-2.5 py-1 text-[11px] font-medium text-primary">{subtitle}</span>}
          </div>
          <h4 className="text-lg font-semibold tracking-tight text-foreground">{title}</h4>
          {description && <p className="text-sm leading-7 text-muted-foreground">{description}</p>}
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {properties.map((property) => (
          <div key={property.label}>
            <InfoCell label={property.label} value={property.value} />
          </div>
        ))}
      </div>

      {traceFiles.length > 0 && (
        <div className="mt-4 rounded-[1.15rem] border border-border/50 bg-background/72 px-3 py-3 backdrop-blur-xl">
          <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">{'trace links'}</div>
          <div className="mt-3 flex flex-wrap gap-2">
            {traceFiles.map((file) => (
              <button
                key={file.path}
                type="button"
                onClick={() => onSelectContext(file.path)}
                className={`rounded-full border px-3 py-1.5 text-[11px] font-medium transition ${
                  selectedContextPath === file.path
                    ? 'border-primary/35 bg-primary/10 text-primary'
                    : 'border-border/55 bg-white/70 text-foreground hover:border-primary/30'
                }`}
                title={file.path}
              >
                {file.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function InfoCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.15rem] border border-border/50 bg-background/72 px-3 py-3 backdrop-blur-xl">
      <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">{label}</div>
      <div className="mt-2 text-sm leading-6 text-foreground">{value}</div>
    </div>
  );
}

function MetaLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 rounded-full border border-border/55 bg-background/72 px-3 py-1.5 backdrop-blur-xl transition hover:border-primary/30 hover:text-primary"
    >
      <span>{label}</span>
      <ExternalLink size={12} />
    </a>
  );
}

function MetaPill({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-border/55 bg-background/72 px-3 py-1.5 backdrop-blur-xl">
      {label}
    </span>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="rounded-[1.35rem] border border-dashed border-border/60 bg-white/40 px-4 py-5 text-sm text-muted-foreground">
      {label}
    </div>
  );
}
