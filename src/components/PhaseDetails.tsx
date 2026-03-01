import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronRight, ArrowRight, Database, CheckSquare, GitMerge, FileSearch } from 'lucide-react';

export function PhaseDetails({ phase }: { phase: any }) {
  return (
    <motion.div 
      key={phase.id}
      initial={{ opacity: 0, x: 10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-8"
    >
      <div>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
            {phase.id}
          </div>
          <h2 className="text-2xl font-bold">{phase.name}</h2>
        </div>
        
        {/* I/O Flow */}
        <div className="flex items-center gap-4 bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-x-auto">
          <div className="flex-1 min-w-[150px]">
            <h4 className="text-xs font-semibold text-zinc-500 uppercase mb-2 flex items-center gap-1"><Database size={12}/> Inputs</h4>
            <div className="flex flex-wrap gap-2">
              {phase.input.map((item: string) => (
                <span key={item} className="px-2 py-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded text-xs font-mono text-zinc-600 dark:text-zinc-300">
                  {item}
                </span>
              ))}
            </div>
          </div>
          <ArrowRight className="text-zinc-400 flex-shrink-0" />
          <div className="flex-1 min-w-[150px]">
            <h4 className="text-xs font-semibold text-zinc-500 uppercase mb-2 flex items-center gap-1"><Database size={12}/> Outputs</h4>
            <div className="flex flex-wrap gap-2">
              {phase.output.map((item: string) => (
                <span key={item} className="px-2 py-1 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded text-xs font-mono text-indigo-700 dark:text-indigo-300">
                  {item}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Tasks */}
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-500 mb-3 flex items-center gap-2">
            <CheckSquare size={16} /> Tasks
          </h3>
          <ul className="space-y-2">
            {phase.tasks.map((task: string, idx: number) => (
              <li key={idx} className="flex items-start gap-2 text-sm">
                <div className="mt-0.5 w-4 h-4 rounded-full border border-zinc-300 dark:border-zinc-600 flex items-center justify-center flex-shrink-0">
                  <div className="w-2 h-2 rounded-full bg-zinc-300 dark:bg-zinc-600" />
                </div>
                <span className="font-mono text-zinc-700 dark:text-zinc-300">{task}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Decision Nodes */}
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-500 mb-3 flex items-center gap-2">
            <GitMerge size={16} /> Decision Nodes
          </h3>
          <div className="space-y-3">
            {phase.decisionNodes.map((node: any) => (
              <DecisionNode key={node.id} node={node} />
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function DecisionNode({ node }: { node: any, key?: React.Key }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden bg-white dark:bg-zinc-900">
      <button 
        onClick={() => setExpanded(!expanded)}
        className="w-full p-3 flex items-center justify-between bg-zinc-50 dark:bg-zinc-800/50 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 flex items-center justify-center text-xs font-bold">
            {node.id}
          </div>
          <span className="font-medium text-sm">{node.question}</span>
        </div>
        {expanded ? <ChevronDown size={16} className="text-zinc-500" /> : <ChevronRight size={16} className="text-zinc-500" />}
      </button>
      
      <AnimatePresence>
        {expanded && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="p-4 space-y-4 border-t border-zinc-200 dark:border-zinc-800 text-sm">
              <div>
                <span className="text-xs font-semibold text-zinc-500 uppercase">Rules & Threshold</span>
                <div className="mt-1 flex flex-wrap gap-2">
                  {node.rules.map((rule: string, idx: number) => (
                    <span key={idx} className="px-2 py-1 bg-zinc-100 dark:bg-zinc-800 rounded font-mono text-xs">
                      {rule}
                    </span>
                  ))}
                  <span className="px-2 py-1 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 rounded font-mono text-xs border border-amber-200 dark:border-amber-800/50">
                    Threshold: {node.threshold}
                  </span>
                </div>
              </div>
              
              <div>
                <span className="text-xs font-semibold text-zinc-500 uppercase">Outcomes</span>
                <div className="mt-1 grid grid-cols-2 gap-2">
                  <div className="p-2 border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50 dark:bg-emerald-900/10 rounded text-emerald-700 dark:text-emerald-400 text-xs">
                    <span className="font-bold mr-1">YES:</span> {node.outcomes.yes}
                  </div>
                  <div className="p-2 border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-900/10 rounded text-red-700 dark:text-red-400 text-xs">
                    <span className="font-bold mr-1">NO:</span> {node.outcomes.no}
                  </div>
                </div>
              </div>

              <div className="p-3 bg-indigo-50 dark:bg-indigo-900/10 rounded-lg border border-indigo-100 dark:border-indigo-900/30">
                <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase flex items-center gap-1 mb-1">
                  <FileSearch size={12} /> Traceability Evidence
                </span>
                <p className="text-zinc-700 dark:text-zinc-300 text-xs italic">"{node.evidence}"</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
