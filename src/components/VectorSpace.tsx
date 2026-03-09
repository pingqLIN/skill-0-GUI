import React, { useMemo, useRef, useEffect, useState } from 'react';
import ForceGraph3D from 'react-force-graph-3d';
import { Database } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export function VectorSpace({ data, darkMode }: { data: any, darkMode: boolean }) {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<any>();
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      if (entries[0]) {
        const { width, height } = entries[0].contentRect;
        setDimensions({ width, height });
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const graphData = useMemo(() => {
    const nodes: any[] = [];
    const links: any[] = [];

    // Center Node (Skill)
    nodes.push({ id: 'skill', name: data.projectName, group: 0, val: 20 });

    // Phase Nodes
    data.phases.forEach((phase: any, i: number) => {
      nodes.push({ id: phase.id, name: `${t('vector.phase')} ${phase.id}: ${phase.name}`, group: 1, val: 10 });
      links.push({ source: 'skill', target: phase.id, value: 2 });

      // Task Nodes (Simulating Vector Embeddings)
      phase.tasks.forEach((task: string, j: number) => {
        const taskId = `${phase.id}-task-${j}`;
        nodes.push({ id: taskId, name: task, group: 2, val: 5 });
        links.push({ source: phase.id, target: taskId, value: 1 });
      });

      // Output Nodes
      phase.output.forEach((out: string, k: number) => {
        const outId = `${phase.id}-out-${k}`;
        nodes.push({ id: outId, name: out, group: 3, val: 5 });
        links.push({ source: phase.id, target: outId, value: 1 });
      });
    });

    return { nodes, links };
  }, [data, t]);

  useEffect(() => {
    if (graphRef.current) {
      // Adjust physics for better 3D spacing
      graphRef.current.d3Force('charge').strength(-150);
      graphRef.current.d3Force('link').distance(50);
    }
  }, [graphData]);

  // Force dark mode for better visual clarity in 3D space
  const bgColor = '#0f172a'; // slate-900
  const linkColor = '#cbd5e1'; // slate-300 for bright, visible lines
  
  // High contrast bright colors for nodes
  const groupColors = ['#38bdf8', '#34d399', '#fbbf24', '#f87171']; // sky-400, emerald-400, amber-400, red-400

  return (
    <div className="w-full h-[600px] border border-border/60 rounded-xl overflow-hidden relative bg-slate-900 flex flex-col shadow-sm">
      <div className="absolute top-0 left-0 right-0 p-5 z-10 pointer-events-none bg-slate-900/80 border-b border-slate-800">
        <h3 className="text-slate-50 font-semibold tracking-tight text-sm flex items-center gap-2">
          <Database size={14} className="text-sky-400" />
          {t('vector.semanticVectorEmbeddings')}
        </h3>
        <p className="text-slate-300 font-medium text-xs mt-2 max-w-md leading-relaxed">
          {t('vector.semanticVectorDesc')}
        </p>
      </div>
      
      <div ref={containerRef} className="flex-1 w-full h-full cursor-move mt-[80px]">
        <ForceGraph3D
          ref={graphRef}
          graphData={graphData}
          nodeLabel={(node: any) => `
            <div style="
              background: rgba(15, 23, 42, 0.95);
              color: #f8fafc;
              padding: 6px 10px;
              border-radius: 6px;
              border: 1px solid rgba(51, 65, 85, 0.8);
              font-family: system-ui, -apple-system, sans-serif;
              font-size: 12px;
              font-weight: 500;
              box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
              backdrop-filter: blur(4px);
              max-width: 250px;
              white-space: normal;
              word-wrap: break-word;
            ">
              ${node.name}
            </div>
          `}
          nodeColor={(node: any) => groupColors[node.group % groupColors.length]}
          backgroundColor={bgColor}
          linkColor={() => linkColor}
          nodeRelSize={6}
          linkWidth={1.5}
          width={dimensions.width}
          height={dimensions.height - 80}
          enableNodeDrag={false}
        />
      </div>
    </div>
  );
}
