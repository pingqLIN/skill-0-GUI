import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Info, ArrowRight, ArrowLeft, Edit2, ShieldAlert, ChevronDown, ChevronUp } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { ConsistencyRun, PathTestRun, ValidationRun } from '../types/skillDocument';

type WorkspaceEvidence = {
  bridgeMode: 'skill-0' | 'standalone' | 'llm-assisted' | 'unknown';
  parserFindingCount: number;
  supportingFileCount: number;
  latestValidationRun: ValidationRun | null;
  latestConsistencyRun: ConsistencyRun | null;
  latestPathTestRun: PathTestRun | null;
};

type PhaseDetailsProps = {
  phase: any;
  allPhases: any[];
  onNavigatePhase: (id: string) => void;
  onClose: () => void;
  onEditPhase: (phase: any) => void;
  onEditDecision: (node: any) => void;
  modifiedPaths?: Set<string>;
  evidence?: WorkspaceEvidence;
  onOpenChecks?: () => void;
  onOpenSupportingFiles?: () => void;
};

export function PhaseDetails({
  phase,
  allPhases,
  onNavigatePhase,
  onClose,
  onEditPhase,
  onEditDecision,
  modifiedPaths = new Set(),
  evidence,
  onOpenChecks,
  onOpenSupportingFiles,
}: PhaseDetailsProps) {
  const { t } = useTranslation();
  const [showTelemetry, setShowTelemetry] = useState(false);
  const getSourcePhase = (input: string) => allPhases.find(p => p.output.includes(input))?.id;
  const getTargetPhases = (output: string) => allPhases.filter(p => p.input.includes(output)).map(p => p.id);
  const workspaceRuns = [
    evidence?.latestValidationRun && { label: t('phaseDetails.schemaValidation'), run: evidence.latestValidationRun },
    evidence?.latestConsistencyRun && { label: t('phaseDetails.consistencyCheck'), run: evidence.latestConsistencyRun },
    evidence?.latestPathTestRun && { label: t('phaseDetails.pathWalk'), run: evidence.latestPathTestRun },
  ].filter(Boolean) as Array<{ label: string; run: ValidationRun | ConsistencyRun | PathTestRun }>;

  return (
    <motion.div 
      key={phase.id}
      initial={{ opacity: 0, x: 10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.2 }}
      className="bg-card border border-border/70 rounded-xl p-6 shadow-sm flex flex-col h-full"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold tracking-tight flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-primary/70" />
          {t('phaseDetails.phase')} {phase.id} — {phase.name}
        </h2>
        <button onClick={onClose} aria-label={t('app.close')} className="text-muted-foreground/50 hover:text-foreground transition-colors p-1">
          <X size={18} />
        </button>
      </div>

      {/* Info Description */}
      <div className="mb-8">
        <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground/80 mb-2">
          <Info size={12} /> {t('phaseDetails.purpose')}
        </div>
        <p className="text-sm text-muted-foreground/90 leading-relaxed">
          {t('phaseDetails.description')}
        </p>
      </div>

      <div className="h-[2px] w-full bg-border/75 mb-8" />

      {/* 3-Column Grid */}
      <div className="grid grid-cols-1 md:grid-cols-[1fr_1.5fr_1fr] gap-6 mb-8">
        {/* Inputs */}
        <div className="flex flex-col">
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground/80 mb-4">{t('phaseDetails.inputs')}</h3>
          <div className="space-y-6 my-auto">
            {phase.input.map((item: string, idx: number) => {
              const source = getSourcePhase(item);
              return (
                <div key={idx} className="flex items-center gap-2">
                  {source ? (
                    <button 
                      onClick={() => onNavigatePhase(source)} 
                      className="text-[11px] font-mono bg-muted/55 px-2 py-1 rounded text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors shrink-0 border border-border/70" 
                      title={`${t('phaseDetails.generatedBy')} ${source}`}
                    >
                      P{source}
                    </button>
                  ) : (
                    <span className="text-[11px] font-mono bg-transparent border border-border/70 px-2 py-1 rounded text-muted-foreground/60 shrink-0" title={t('phaseDetails.externalInput')}>
                      EXT
                    </span>
                  )}
                  
                  <div className="flex-1 relative flex items-center justify-center min-w-[40px]">
                    <div className="w-full h-[2px] bg-border/70 relative overflow-hidden">
                      <motion.div 
                        className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-transparent via-primary/40 to-transparent"
                        animate={{ x: ['-100%', '100%'] }}
                        transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                      />
                    </div>
                    <div className="absolute -top-3 bg-card px-1.5 text-[10px] font-mono text-muted-foreground/80 whitespace-nowrap max-w-[110px] truncate" title={item}>
                      {item}
                    </div>
                    <ArrowRight size={12} className="absolute right-0 text-primary/65 translate-x-1/2 bg-card" />
                  </div>
                  
                  <div className="w-2 h-2 rounded-full bg-primary/60 shrink-0" />
                </div>
              );
            })}
          </div>
        </div>

        {/* Tasks */}
        <div className="flex flex-col">
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground/80 mb-4">{t('phaseDetails.tasks')}</h3>
          <div className="bg-muted/5 border border-border/65 rounded-lg p-4 space-y-3 h-full shadow-sm">
            {phase.tasks.map((task: string, idx: number) => (
              <div key={idx} className="text-sm text-muted-foreground/95 flex items-start gap-2.5">
                <div className="mt-2 h-1.5 w-1.5 rounded-full bg-primary/55 shrink-0" />
                <span className="leading-relaxed">{task}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Outputs */}
        <div className="flex flex-col">
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground/80 mb-4">{t('phaseDetails.outputs')}</h3>
          <div className="space-y-6 my-auto">
            {phase.output.map((item: string, idx: number) => {
              const targets = getTargetPhases(item);
              return (
                <div key={idx} className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-primary/60 shrink-0" />
                  
                  <div className="flex-1 relative flex items-center justify-center min-w-[40px]">
                    <div className="w-full h-[2px] bg-border/70 relative overflow-hidden">
                      <motion.div 
                        className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-transparent via-primary/40 to-transparent"
                        animate={{ x: ['-100%', '100%'] }}
                        transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                      />
                    </div>
                    <div className="absolute -top-3 bg-card px-1.5 text-[10px] font-mono text-muted-foreground/80 whitespace-nowrap max-w-[110px] truncate" title={item}>
                      {item}
                    </div>
                    <ArrowRight size={12} className="absolute right-0 text-primary/65 translate-x-1/2 bg-card" />
                  </div>
                  
                  {targets.length > 0 ? (
                    <div className="flex flex-col gap-1 shrink-0">
                      {targets.map((targetPhaseId: string) => (
                        <button 
                          key={targetPhaseId}
                          onClick={() => onNavigatePhase(targetPhaseId)} 
                          className="text-[10px] font-mono bg-muted/50 px-1.5 py-1 rounded text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors border border-border/50"
                          title={`${t('phaseDetails.consumedBy')} ${targetPhaseId}`}
                        >
                          P{targetPhaseId}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <span className="text-[11px] font-mono bg-transparent border border-border/70 px-2 py-1 rounded text-muted-foreground/60 shrink-0" title={t('phaseDetails.finalOutput')}>
                      END
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="h-[2px] w-full bg-border/75 mb-6" />

      {/* Decision Section */}
      {phase.decisionNodes && phase.decisionNodes.length > 0 && (
        <div className="mb-8 space-y-4">
          {phase.decisionNodes.map((node: any, idx: number) => {
            const basePath = `phases.${phase.id}.decisionNodes.${node.id}`;
            const isQuestionModified = modifiedPaths.has(`${basePath}.question`);
            const isThresholdModified = modifiedPaths.has(`${basePath}.threshold`);
            const isYesModified = modifiedPaths.has(`${basePath}.outcomes.yes`);

            return (
              <div key={idx}>
                <h3 className={`text-[11px] font-semibold uppercase tracking-[0.2em] mb-3 ${isQuestionModified ? 'text-amber-500 dark:text-amber-400' : 'text-muted-foreground/70'}`}>
                  {t('phaseDetails.decision')}: {node.question}
                </h3>
                <button
                  type="button"
                  className="w-full bg-muted/10 border border-border/65 rounded-lg p-3 flex flex-wrap items-center gap-3 text-left text-sm group hover:border-primary/40 transition-colors shadow-sm"
                  onClick={() => onEditDecision(node)}
                  title={t('phaseDetails.clickToEdit')}
                >
                  <span className={`font-mono text-sm border px-2.5 py-1 rounded cursor-help border-b-dashed ${isThresholdModified ? 'bg-amber-100 border-amber-300 text-amber-800 dark:bg-amber-900/40 dark:border-amber-700/50 dark:text-amber-300' : 'bg-background border-border/65 border-b-primary/40 text-muted-foreground'}`} title={node.evidence}>
                    {node.rules?.[0] || node.threshold}
                  </span>
                  <span className="text-muted-foreground/50">→</span>
                  <span className={isYesModified ? 'text-amber-600 dark:text-amber-400 font-medium' : 'text-foreground font-medium'}>{node.outcomes.yes}</span>
                  <Edit2 size={14} className="text-muted-foreground/40 opacity-0 group-hover:opacity-100 transition-opacity ml-auto" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Evidence boundary (Collapsible) */}
      <div className="mt-auto pt-6 border-t-2 border-border/70 flex flex-col gap-4">
        <button
          type="button"
          onClick={() => setShowTelemetry(!showTelemetry)}
          aria-expanded={showTelemetry}
          aria-controls={`phase-evidence-boundary-${phase.id}`}
          className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-muted/30 transition-colors border border-transparent hover:border-border/40 group"
        >
          <div className="flex items-center gap-2">
            <ShieldAlert size={14} className="text-muted-foreground/70 group-hover:text-primary/70 transition-colors" />
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground/80 group-hover:text-foreground/80 transition-colors">{t('phaseDetails.evidenceBoundary')}</h3>
          </div>
          {showTelemetry ? <ChevronUp size={14} className="text-muted-foreground/50" /> : <ChevronDown size={14} className="text-muted-foreground/50" />}
        </button>

        <AnimatePresence>
          {showTelemetry && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              id={`phase-evidence-boundary-${phase.id}`}
              className="overflow-hidden"
            >
              <div className="pt-2 flex flex-col gap-4">
                {workspaceRuns.length > 0 ? (
                  <div data-testid="phase-workspace-evidence" className="bg-primary/5 p-4 rounded-lg border border-primary/15 shadow-sm">
                    <h4 className="text-xs font-semibold text-foreground/80 mb-1">{t('phaseDetails.workspaceEvidenceTitle')}</h4>
                    <p className="text-xs leading-5 text-muted-foreground/80">{t('phaseDetails.workspaceEvidenceScope')}</p>
                    <div className="mt-3 space-y-2">
                      {workspaceRuns.map(({ label, run }) => (
                        <div key={run.id} className="flex items-center justify-between gap-3 rounded border border-border/55 bg-background/50 px-3 py-2 text-xs">
                          <span className="font-medium text-foreground/80">{label}</span>
                          <span className={run.status === 'passed' ? 'text-emerald-700 dark:text-emerald-400' : run.status === 'failed' ? 'text-destructive' : 'text-amber-700 dark:text-amber-400'}>
                            {t(`phaseDetails.runStatus.${run.status}`)}
                          </span>
                        </div>
                      ))}
                    </div>
                    {onOpenChecks && (
                      <button type="button" onClick={onOpenChecks} className="mt-3 text-xs font-medium text-primary hover:underline">
                        {t('phaseDetails.openWorkspaceChecks')}
                      </button>
                    )}
                  </div>
                ) : (
                  <div data-testid="phase-evidence-boundary" className="bg-amber-500/5 p-4 rounded-lg border border-amber-500/20 shadow-sm" role="status">
                    <h4 className="text-xs font-semibold text-foreground/80 mb-2">{t('phaseDetails.evidenceNotCapturedTitle')}</h4>
                    <p className="text-xs leading-6 text-muted-foreground/80">{t('phaseDetails.evidenceNotCapturedBody')}</p>
                    <p className="mt-2 text-xs leading-6 text-muted-foreground/80">{t('phaseDetails.evidenceReviewHint')}</p>
                  </div>
                )}
                {evidence && (
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground/80">
                    <span>{t('phaseDetails.parserFindings', { count: evidence.parserFindingCount })}</span>
                    <span>{t('phaseDetails.supportingFiles', { count: evidence.supportingFileCount })}</span>
                    {onOpenSupportingFiles && evidence.supportingFileCount > 0 && (
                      <button type="button" onClick={onOpenSupportingFiles} className="font-medium text-primary hover:underline">
                        {t('phaseDetails.openSupportingFiles')}
                      </button>
                    )}
                  </div>
                )}
                <div className="bg-primary/5 p-3 rounded-lg border border-primary/10">
                  <h4 className="text-xs font-semibold text-primary/80 mb-1.5">{t('phaseDetails.purposeExplanation')}</h4>
                  <p className="text-xs text-muted-foreground/80 leading-relaxed">
                    {t('phaseDetails.purposeText1')} <strong className="text-foreground/80 font-medium">{phase.name.toLowerCase()}</strong>. {t('phaseDetails.purposeText2')}
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
