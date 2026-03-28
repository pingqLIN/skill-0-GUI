import React, { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react';
import { Database } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const ForceGraph3D = lazy(() => import('react-force-graph-3d'));

export function VectorSpace3D({ data, darkMode: _darkMode }: { data: any; darkMode: boolean }) {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<any>();
  const [dimensions, setDimensions] = useState({ width: 800, height: 520 });

  useEffect(() => {
    if (!containerRef.current) {
      return;
    }

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

    nodes.push({ id: 'skill', name: data.projectName, group: 0, val: 20 });

    data.phases.forEach((phase: any) => {
      nodes.push({ id: phase.id, name: `${t('vector.phase')} ${phase.id}: ${phase.name}`, group: 1, val: 10 });
      links.push({ source: 'skill', target: phase.id, value: 2 });

      phase.tasks.slice(0, 5).forEach((task: string, index: number) => {
        const taskId = `${phase.id}-task-${index}`;
        nodes.push({ id: taskId, name: task, group: 2, val: 5 });
        links.push({ source: phase.id, target: taskId, value: 1 });
      });

      phase.output.slice(0, 4).forEach((output: string, index: number) => {
        const outputId = `${phase.id}-out-${index}`;
        nodes.push({ id: outputId, name: output, group: 3, val: 5 });
        links.push({ source: phase.id, target: outputId, value: 1 });
      });
    });

    return { nodes, links };
  }, [data, t]);

  useEffect(() => {
    if (graphRef.current) {
      graphRef.current.d3Force('charge').strength(-150);
      graphRef.current.d3Force('link').distance(52);
    }
  }, [graphData]);

  const groupColors = ['#38bdf8', '#34d399', '#fbbf24', '#f87171'];

  return (
    <div className="overflow-hidden rounded-[1.25rem] border border-slate-800 bg-slate-950 shadow-sm">
      <div className="border-b border-slate-800 bg-slate-900/80 px-5 py-4">
        <h3 className="flex items-center gap-2 text-sm font-semibold tracking-tight text-slate-50">
          <Database size={14} className="text-sky-400" />
          {t('vector.interactive3dMode')}
        </h3>
        <p className="mt-2 max-w-2xl text-xs font-medium leading-relaxed text-slate-300">
          {t('vector.semanticVectorDesc')}
        </p>
      </div>

      <div ref={containerRef} className="h-[520px] w-full cursor-move">
        <Suspense fallback={<GraphFallback label={t('app.loadingWorkspaceModule')} />}>
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
            backgroundColor="#020617"
            linkColor={() => '#cbd5e1'}
            nodeRelSize={6}
            linkWidth={1.5}
            width={dimensions.width}
            height={dimensions.height}
            enableNodeDrag={false}
          />
        </Suspense>
      </div>
    </div>
  );
}

function GraphFallback({ label }: { label: string }) {
  return (
    <div className="flex h-full w-full items-center justify-center rounded-[1rem] border border-slate-800 bg-slate-950/72 px-6 py-8 text-sm text-slate-300">
      {label}
    </div>
  );
}
