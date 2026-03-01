import React from 'react';
import { motion } from 'framer-motion';
import { ArrowDown } from 'lucide-react';

export function Flowchart({ phases, activePhase, onSelectPhase }: { phases: any[], activePhase: string | null, onSelectPhase: (id: string) => void }) {
  return (
    <div className="flex flex-col items-center py-4">
      {phases.map((phase, index) => {
        const isActive = phase.id === activePhase;
        return (
          <React.Fragment key={phase.id}>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onSelectPhase(phase.id)}
              className={`w-full max-w-[240px] p-3 rounded-lg border text-left transition-colors relative ${
                isActive 
                  ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-900 dark:text-indigo-100 shadow-sm' 
                  : 'border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600 bg-white dark:bg-zinc-800/50'
              }`}
            >
              {isActive && (
                <motion.div 
                  layoutId="activeIndicator"
                  className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500 rounded-l-lg"
                />
              )}
              <div className="flex items-center gap-3">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  isActive ? 'bg-indigo-500 text-white' : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300'
                }`}>
                  {phase.id}
                </div>
                <span className="font-medium text-sm truncate">{phase.name}</span>
              </div>
            </motion.button>
            
            {index < phases.length - 1 && (
              <div className="h-8 w-px bg-zinc-300 dark:bg-zinc-700 my-1 relative flex justify-center">
                <ArrowDown size={12} className="absolute bottom-0 text-zinc-400 dark:text-zinc-600 translate-y-1/2 bg-white dark:bg-zinc-900" />
              </div>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}
