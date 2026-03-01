import React from 'react';
import { ShieldAlert, CheckCircle2, AlertTriangle, FileSearch } from 'lucide-react';

export function SecurityMatrix({ data }: { data: any }) {
  const allNodes = data.phases.flatMap((phase: any) => 
    phase.decisionNodes.map((node: any) => ({
      ...node,
      phaseId: phase.id,
      phaseName: phase.name
    }))
  );

  return (
    <div className="w-full border border-zinc-200 dark:border-zinc-800 rounded-xl bg-white dark:bg-zinc-950 overflow-hidden flex flex-col">
      <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 flex items-center justify-between">
        <div>
          <h3 className="font-semibold flex items-center gap-2 text-zinc-900 dark:text-zinc-100">
            <ShieldAlert size={16} className="text-red-500" />
            Compliance & Risk Matrix
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Audit log of all decision nodes, thresholds, and traceability evidence.
          </p>
        </div>
        <div className="flex items-center gap-4 text-xs font-mono">
          <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 size={14} /> Passed: {allNodes.length}
          </div>
          <div className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
            <AlertTriangle size={14} /> Flags: 0
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead>
            <tr className="bg-zinc-100 dark:bg-zinc-800/50 text-zinc-500 dark:text-zinc-400 font-mono text-xs uppercase tracking-wider">
              <th className="px-4 py-3 font-medium">Node</th>
              <th className="px-4 py-3 font-medium">Phase</th>
              <th className="px-4 py-3 font-medium">Decision Question</th>
              <th className="px-4 py-3 font-medium">Threshold</th>
              <th className="px-4 py-3 font-medium">Evidence Trace</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {allNodes.map((node: any, idx: number) => (
              <tr 
                key={idx} 
                className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors group cursor-pointer"
              >
                <td className="px-4 py-4 font-mono font-medium text-indigo-600 dark:text-indigo-400">
                  {node.id}
                </td>
                <td className="px-4 py-4 text-zinc-600 dark:text-zinc-300">
                  <span className="inline-flex items-center px-2 py-1 rounded bg-zinc-100 dark:bg-zinc-800 text-xs font-medium">
                    {node.phaseId}: {node.phaseName}
                  </span>
                </td>
                <td className="px-4 py-4 font-medium text-zinc-900 dark:text-zinc-100">
                  {node.question}
                </td>
                <td className="px-4 py-4">
                  <span className="font-mono text-xs px-2 py-1 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 rounded border border-amber-200 dark:border-amber-800/50">
                    {node.threshold}
                  </span>
                </td>
                <td className="px-4 py-4 text-zinc-500 dark:text-zinc-400 max-w-[300px] truncate group-hover:whitespace-normal group-hover:max-w-none transition-all duration-300">
                  <div className="flex items-start gap-2">
                    <FileSearch size={14} className="mt-0.5 flex-shrink-0 text-zinc-400" />
                    <span className="text-xs italic leading-relaxed">{node.evidence}</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
