import React from 'react';
import { motion } from 'framer-motion';
import { ArrowDown, CheckCircle2, GitMerge } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export function Flowchart({ phases, activePhase, onSelectPhase }: { phases: any[], activePhase: string | null, onSelectPhase: (id: string) => void }) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col pl-2 py-4">
      {phases.map((phase, index) => {
        const isActive = phase.id === activePhase;
        return (
          <React.Fragment key={phase.id}>
            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              onClick={() => onSelectPhase(phase.id)}
              className={`w-full p-4 rounded-xl border text-left transition-all ${
                isActive 
                  ? 'border-primary/50 border-[1.5px] bg-card shadow-sm' 
                  : 'border-border/60 hover:border-border bg-muted/10'
              }`}
            >
              <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-muted-foreground/70 mb-2">
                <CheckCircle2 size={12} className={isActive ? 'text-primary' : 'text-muted-foreground/50'} />
                {t('flowchart.phase')} {phase.id}
              </div>
              <div className="font-semibold text-sm text-foreground tracking-tight">{phase.name}</div>
              <div className="text-xs text-muted-foreground/80 mt-1.5 truncate">
                {phase.tasks[0]}...
              </div>
            </motion.button>
            
            {/* Decision Node Link */}
            {phase.decisionNodes && phase.decisionNodes.length > 0 && (
              <div className="flex flex-col items-start ml-6 my-1 gap-1">
                <div className="w-px h-3 bg-border/60 ml-4"></div>
                {phase.decisionNodes.map((node: any, idx: number) => (
                  <button 
                    key={idx}
                    onClick={(e) => { e.stopPropagation(); onSelectPhase(phase.id); }}
                    className="border border-amber-300 bg-amber-100 text-amber-900 dark:border-amber-700/50 dark:bg-amber-900/40 dark:text-amber-200 rounded-md px-2.5 py-1.5 text-[10px] font-medium flex items-center gap-1.5 shadow-sm hover:bg-amber-200 dark:hover:bg-amber-900/60 transition-colors max-w-[220px] text-left"
                    title={node.question}
                  >
                    <GitMerge size={12} className="shrink-0" />
                    <span className="truncate">{node.question}</span>
                  </button>
                ))}
              </div>
            )}
            
            {/* Output Arrow */}
            {index < phases.length - 1 && (() => {
              const nextPhase = phases[index + 1];
              const matchingFlows = phase.output.filter((out: string) => nextPhase.input.includes(out));
              const flowLabel = matchingFlows.length > 0 ? matchingFlows[0] : t('flowchart.contextTransfer');
              
              return (
                <div className="flex flex-col items-start ml-6 my-1 relative">
                  <div className="w-px h-5 bg-border/60 relative overflow-hidden ml-4">
                    <motion.div 
                      className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-transparent via-primary/50 to-transparent opacity-50"
                      animate={{ y: ['-100%', '100%'] }}
                      transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                    />
                  </div>
                  <div className="border border-primary/20 rounded-full px-2.5 py-1 text-[10px] bg-primary/5 text-primary font-mono flex items-center gap-1.5 shadow-sm z-10 relative">
                    <motion.div
                      animate={{ y: [0, 2, 0] }}
                      transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                    >
                      <ArrowDown size={10} />
                    </motion.div>
                    {flowLabel}
                  </div>
                  <div className="w-px h-5 bg-border/60 relative overflow-hidden ml-4">
                    <motion.div 
                      className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-transparent via-primary/50 to-transparent opacity-50"
                      animate={{ y: ['-100%', '100%'] }}
                      transition={{ repeat: Infinity, duration: 1.5, ease: "linear", delay: 0.75 }}
                    />
                  </div>
                </div>
              );
            })()}
          </React.Fragment>
        );
      })}
    </div>
  );
}
