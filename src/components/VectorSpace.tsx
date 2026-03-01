import React, { useMemo, useRef, useEffect, useState } from 'react';
import ForceGraph3D from 'react-force-graph-3d';
import { Database } from 'lucide-react';

export function VectorSpace({ data, darkMode }: { data: any, darkMode: boolean }) {
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
      nodes.push({ id: phase.id, name: `Phase ${phase.id}: ${phase.name}`, group: 1, val: 10 });
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
  }, [data]);

  useEffect(() => {
    if (graphRef.current) {
      // Adjust physics for better 3D spacing
      graphRef.current.d3Force('charge').strength(-150);
      graphRef.current.d3Force('link').distance(50);
    }
  }, [graphData]);

  return (
    <div className="w-full h-[600px] border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden relative bg-zinc-50 dark:bg-zinc-950 flex flex-col">
      <div className="absolute top-0 left-0 right-0 p-4 z-10 pointer-events-none bg-gradient-to-b from-zinc-50/80 dark:from-zinc-950/80 to-transparent">
        <h3 className="text-zinc-900 dark:text-zinc-100 font-mono text-sm font-bold flex items-center gap-2">
          <Database size={16} className="text-indigo-500" />
          Semantic Vector Embeddings (3D Space)
        </h3>
        <p className="text-zinc-500 dark:text-zinc-400 text-xs mt-1 max-w-md">
          Visualizing the skill's tasks, inputs, and outputs as vector embeddings in a high-dimensional semantic space. Drag to rotate, scroll to zoom.
        </p>
      </div>
      
      <div ref={containerRef} className="flex-1 w-full h-full cursor-move">
        <ForceGraph3D
          ref={graphRef}
          graphData={graphData}
          nodeLabel="name"
          nodeAutoColorBy="group"
          backgroundColor={darkMode ? '#09090b' : '#fafafa'}
          linkColor={() => darkMode ? '#3f3f46' : '#e4e4e7'}
          nodeRelSize={6}
          linkWidth={1.5}
          width={dimensions.width}
          height={dimensions.height}
          enableNodeDrag={false}
        />
      </div>
    </div>
  );
}
