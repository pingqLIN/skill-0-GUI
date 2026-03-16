import React from 'react';
import { motion } from 'framer-motion';
import { ArrowDown, CheckCircle2, GitMerge } from 'lucide-react';
import { useTranslation } from 'react-i18next';

type FlowRelationship = {
  key: string;
  kind: 'direct' | 'deferred' | 'terminal';
  label: string;
  title: string;
};

export function Flowchart({ phases, activePhase, onSelectPhase }: { phases: any[], activePhase: string | null, onSelectPhase: (id: string) => void }) {
  const { t } = useTranslation();

  const getTargetPhases = (artifact: string) =>
    phases.filter((candidate) => candidate.input.includes(artifact)).map((candidate) => candidate.id);

  const getFlowRelationships = (phase: any, nextPhase: any): FlowRelationship[] =>
    phase.output.flatMap((artifact: string) => {
      const targetPhaseIds = getTargetPhases(artifact);

      if (targetPhaseIds.length === 0) {
        return [{
          key: `${phase.id}-${artifact}-terminal`,
          kind: 'terminal',
          label: `${artifact} -> END`,
          title: `${artifact} has no downstream phase consumer.`,
        }];
      }

      const directTargets = targetPhaseIds.filter((targetPhaseId) => targetPhaseId === nextPhase.id);
      const deferredTargets = targetPhaseIds.filter((targetPhaseId) => targetPhaseId !== nextPhase.id);

      return [
        ...directTargets.map((targetPhaseId) => ({
          key: `${phase.id}-${artifact}-${targetPhaseId}-direct`,
          kind: 'direct' as const,
          label: `${artifact} -> P${targetPhaseId}`,
          title: `${artifact} flows directly into Phase ${targetPhaseId}.`,
        })),
        ...deferredTargets.map((targetPhaseId) => ({
          key: `${phase.id}-${artifact}-${targetPhaseId}-deferred`,
          kind: 'deferred' as const,
          label: `${artifact} -> P${targetPhaseId} (later)`,
          title: `${artifact} bypasses Phase ${nextPhase.id} and is consumed in Phase ${targetPhaseId}.`,
        })),
      ];
    });

  return (
    <div className="flex flex-col pl-2 py-4">
      {phases.map((phase, index) => {
        const isActive = phase.id === activePhase;
        const nextPhase = phases[index + 1];
        const flowRelationships = nextPhase ? getFlowRelationships(phase, nextPhase) : [];
        const isFlowActive = nextPhase ? phase.id === activePhase || nextPhase.id === activePhase : false;

        return (
          <React.Fragment key={phase.id}>
            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              onClick={() => onSelectPhase(phase.id)}
              className={`w-full p-4 rounded-xl border text-left transition-all ${
                isActive
                  ? 'border-primary/60 border-[1.5px] bg-card shadow-sm'
                  : 'border-border/75 hover:border-primary/30 bg-muted/10'
              }`}
            >
              <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.2em] text-muted-foreground/80 mb-2">
                <CheckCircle2 size={12} className={isActive ? 'text-primary' : 'text-muted-foreground/50'} />
                {t('flowchart.phase')} {phase.id}
              </div>
              <div className="font-semibold text-base text-foreground tracking-tight">{phase.name}</div>
              <div className="text-sm text-muted-foreground/90 mt-1.5 truncate">
                {phase.tasks[0]}...
              </div>
            </motion.button>

            {phase.decisionNodes && phase.decisionNodes.length > 0 && (
              <div className="flex flex-col items-start ml-6 my-1 gap-1">
                <div className="w-[2px] h-3 bg-border/80 ml-4"></div>
                {phase.decisionNodes.map((node: any, idx: number) => (
                  <button
                    key={idx}
                    onClick={(e) => { e.stopPropagation(); onSelectPhase(phase.id); }}
                    className="border border-amber-400 bg-amber-100 text-amber-900 dark:border-amber-700/50 dark:bg-amber-900/40 dark:text-amber-200 rounded-md px-2.5 py-1.5 text-[11px] font-medium flex items-center gap-1.5 shadow-sm hover:bg-amber-200 dark:hover:bg-amber-900/60 transition-colors max-w-[240px] text-left"
                    title={node.question}
                  >
                    <GitMerge size={12} className="shrink-0" />
                    <span className="truncate">{node.question}</span>
                  </button>
                ))}
              </div>
            )}

            {nextPhase && (
              <div className="flex flex-col items-start ml-6 my-1 relative">
                <div className="w-[2px] h-4 bg-border/80 relative overflow-hidden ml-4">
                  <motion.div
                    className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-transparent via-primary/70 to-transparent opacity-70"
                    animate={{ y: ['-120%', '120%'] }}
                    transition={{ repeat: Infinity, duration: isFlowActive ? 1.25 : 1.7, ease: 'linear' }}
                  />
                  <motion.div
                    className="absolute left-1/2 top-0 h-3 w-1.5 -translate-x-1/2 rounded-full bg-primary/60 blur-[1px]"
                    animate={{ y: ['-20%', '140%'], opacity: [0, 1, 0], scale: [0.8, 1.15, 0.8] }}
                    transition={{ repeat: Infinity, duration: isFlowActive ? 1.35 : 1.8, ease: 'easeInOut' }}
                  />
                </div>

                <div className={`relative z-10 ml-[-3px] max-w-[270px] overflow-hidden rounded-2xl border px-2.5 py-2.5 shadow-sm ${
                  isFlowActive
                    ? 'border-primary/35 bg-gradient-to-b from-primary/10 via-primary/5 to-background'
                    : 'border-primary/25 bg-gradient-to-b from-primary/[0.07] via-background to-background'
                }`}>
                  <motion.div
                    className="pointer-events-none absolute inset-x-3 top-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent"
                    animate={{ x: ['-20%', '20%'], opacity: [0.35, 0.85, 0.35] }}
                    transition={{ repeat: Infinity, duration: 2.2, ease: 'easeInOut' }}
                  />

                  <div className="mb-2 flex items-center gap-1.5 px-1 text-[10px] font-semibold uppercase tracking-[0.24em] text-primary/80">
                    <motion.div
                      animate={{ y: [0, 2, 0], opacity: [0.7, 1, 0.7] }}
                      transition={{ repeat: Infinity, duration: 1.4, ease: 'easeInOut' }}
                    >
                      <ArrowDown size={10} />
                    </motion.div>
                    {t('flowchart.contextTransfer')}
                  </div>

                  <div className="flex flex-col gap-1.5">
                    {flowRelationships.map((flow, flowIndex) => (
                      <motion.div
                        key={flow.key}
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.22, delay: flowIndex * 0.04 }}
                        className={`relative flex items-center gap-2 overflow-hidden rounded-xl border px-2 py-1.5 text-[11px] font-mono shadow-sm ${
                          flow.kind === 'direct'
                            ? 'border-primary/35 bg-primary/10 text-primary'
                            : flow.kind === 'deferred'
                              ? 'border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300'
                              : 'border-border/75 bg-background/80 text-muted-foreground/90'
                        }`}
                        title={flow.title}
                      >
                        <motion.span
                          className={`relative z-10 h-1.5 w-1.5 shrink-0 rounded-full ${
                            flow.kind === 'direct'
                              ? 'bg-primary/80'
                              : flow.kind === 'deferred'
                                ? 'bg-sky-500/80'
                                : 'bg-muted-foreground/50'
                          }`}
                          animate={{ scale: [1, 1.45, 1], opacity: [0.65, 1, 0.65] }}
                          transition={{ repeat: Infinity, duration: 1.4, delay: flowIndex * 0.12, ease: 'easeInOut' }}
                        />
                        <span className="relative z-10 truncate">{flow.label}</span>
                        <motion.div
                          className={`pointer-events-none absolute inset-y-0 left-[-30%] w-[28%] skew-x-[-20deg] ${
                            flow.kind === 'direct'
                              ? 'bg-gradient-to-r from-transparent via-primary/20 to-transparent'
                              : flow.kind === 'deferred'
                                ? 'bg-gradient-to-r from-transparent via-sky-400/20 to-transparent'
                                : 'bg-gradient-to-r from-transparent via-white/10 to-transparent'
                          }`}
                          animate={{ x: ['0%', '440%'] }}
                          transition={{ repeat: Infinity, duration: 2.8, delay: flowIndex * 0.18, ease: 'easeInOut' }}
                        />
                      </motion.div>
                    ))}
                  </div>
                </div>

                <div className="w-[2px] h-4 bg-border/80 relative overflow-hidden ml-4">
                  <motion.div
                    className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-transparent via-primary/70 to-transparent opacity-70"
                    animate={{ y: ['-120%', '120%'] }}
                    transition={{ repeat: Infinity, duration: isFlowActive ? 1.25 : 1.7, ease: 'linear', delay: 0.45 }}
                  />
                  <motion.div
                    className="absolute left-1/2 top-0 h-3 w-1.5 -translate-x-1/2 rounded-full bg-primary/60 blur-[1px]"
                    animate={{ y: ['-20%', '140%'], opacity: [0, 1, 0], scale: [0.8, 1.15, 0.8] }}
                    transition={{ repeat: Infinity, duration: isFlowActive ? 1.35 : 1.8, ease: 'easeInOut', delay: 0.3 }}
                  />
                </div>
              </div>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

