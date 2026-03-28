import React, { Suspense, lazy, useMemo, useState } from 'react';
import { Boxes, Database, Orbit } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const is3DEnabled = import.meta.env.VITE_ENABLE_3D !== 'false';
const VectorSpace3D = is3DEnabled
  ? lazy(() => import('./VectorSpace3D').then((module) => ({ default: module.VectorSpace3D })))
  : null;

type PositionedNode = {
  id: string;
  name: string;
  group: number;
  radius: number;
  x: number;
  y: number;
};

type PositionedLink = {
  source: string;
  target: string;
};

function polarPoint(cx: number, cy: number, radius: number, angle: number) {
  return {
    x: cx + (Math.cos(angle) * radius),
    y: cy + (Math.sin(angle) * radius),
  };
}

function createSemanticMap(data: any, phaseLabel: string) {
  const nodes: PositionedNode[] = [];
  const links: PositionedLink[] = [];
  const center = { x: 500, y: 310 };
  const phaseOrbit = 210;
  const phaseCount = Math.max(data?.phases?.length ?? 0, 1);

  nodes.push({
    id: 'skill',
    name: data.projectName,
    group: 0,
    radius: 20,
    x: center.x,
    y: center.y,
  });

  data.phases.forEach((phase: any, phaseIndex: number) => {
    const phaseAngle = ((Math.PI * 2) / phaseCount) * phaseIndex - (Math.PI / 2);
    const phasePoint = polarPoint(center.x, center.y, phaseOrbit, phaseAngle);
    const phaseNodeId = phase.id;
    nodes.push({
      id: phaseNodeId,
      name: `${phaseLabel} ${phase.id}: ${phase.name}`,
      group: 1,
      radius: 14,
      x: phasePoint.x,
      y: phasePoint.y,
    });
    links.push({ source: 'skill', target: phaseNodeId });

    const phaseChildren = [
      ...phase.tasks.slice(0, 4).map((task: string, index: number) => ({
        id: `${phase.id}-task-${index}`,
        name: task,
        group: 2,
      })),
      ...phase.output.slice(0, 3).map((output: string, index: number) => ({
        id: `${phase.id}-output-${index}`,
        name: output,
        group: 3,
      })),
    ];

    const omittedCount = Math.max(phase.tasks.length - 4, 0) + Math.max(phase.output.length - 3, 0);
    if (omittedCount > 0) {
      phaseChildren.push({
        id: `${phase.id}-more`,
        name: `+${omittedCount} more`,
        group: 4,
      });
    }

    const childCount = Math.max(phaseChildren.length, 1);
    phaseChildren.forEach((child, childIndex) => {
      const offset = (((Math.PI * 1.25) / childCount) * childIndex) - (Math.PI * 0.625);
      const childPoint = polarPoint(phasePoint.x, phasePoint.y, 105, phaseAngle + offset);
      nodes.push({
        ...child,
        radius: child.group === 4 ? 8 : 10,
        x: childPoint.x,
        y: childPoint.y,
      });
      links.push({ source: phaseNodeId, target: child.id });
    });
  });

  return { center, links, nodes };
}

function truncateLabel(input: string, limit: number) {
  return input.length > limit ? `${input.slice(0, limit - 1)}…` : input;
}

export function VectorSpace({ data, darkMode }: { data: any; darkMode: boolean }) {
  const { t } = useTranslation();
  const [viewMode, setViewMode] = useState<'map' | '3d'>('map');

  const semanticMap = useMemo(() => createSemanticMap(data, t('vector.phase')), [data, t]);
  const nodeMap = useMemo(
    () => new Map(semanticMap.nodes.map((node) => [node.id, node])),
    [semanticMap.nodes],
  );

  const groupColors = ['#38bdf8', '#34d399', '#fbbf24', '#f87171', '#c084fc'];
  const summary = [
    { label: t('app.totalActions'), value: String(data?.parserResult?.decomposition?.actions?.length ?? 0) },
    { label: t('app.totalRules'), value: String(data?.parserResult?.decomposition?.rules?.length ?? 0) },
    { label: t('app.totalDirectives'), value: String(data?.parserResult?.decomposition?.directives?.length ?? 0) },
    { label: t('vector.operabilityScore'), value: `${data?.threeClassification?.operability ?? 0}%` },
  ];

  const isMapView = viewMode === 'map';

  return (
    <div className="overflow-hidden rounded-[1.4rem] border border-border/60 bg-slate-950 shadow-sm">
      <div className="border-b border-slate-800 bg-slate-900/88 px-5 py-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 text-sm font-semibold tracking-tight text-slate-50">
              <Database size={15} className="text-sky-400" />
              {t('vector.semanticVectorEmbeddings')}
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              {isMapView ? t('vector.semanticMapDesc') : t('vector.semanticVectorDesc')}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setViewMode('map')}
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-medium transition ${
                isMapView
                  ? 'border-sky-400/30 bg-sky-400/12 text-sky-100'
                  : 'border-slate-700 bg-slate-900/70 text-slate-300 hover:border-slate-500'
              }`}
            >
              <Boxes size={14} />
              {t('vector.semanticMapMode')}
            </button>
            {is3DEnabled ? (
              <button
                type="button"
                onClick={() => setViewMode('3d')}
                className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-medium transition ${
                  !isMapView
                    ? 'border-emerald-400/30 bg-emerald-400/12 text-emerald-100'
                    : 'border-slate-700 bg-slate-900/70 text-slate-300 hover:border-slate-500'
                }`}
              >
                <Orbit size={14} />
                {t('vector.interactive3dMode')}
              </button>
            ) : (
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-800 bg-slate-900/70 px-3 py-2 text-xs font-medium text-slate-400">
                <Orbit size={14} />
                {t('vector.interactive3dDisabled')}
              </div>
            )}
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {summary.map((item) => (
            <div key={item.label} className="rounded-[1.1rem] border border-slate-800 bg-slate-950/70 px-3 py-3 backdrop-blur-xl">
              <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">{item.label}</div>
              <div className="mt-2 text-base font-semibold text-slate-100">{item.value}</div>
            </div>
          ))}
        </div>
      </div>

      {isMapView ? (
        <div className="grid gap-4 p-4 xl:grid-cols-[minmax(0,1fr)_17rem]">
          <div className="overflow-hidden rounded-[1.25rem] border border-slate-800 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.12),_transparent_42%),linear-gradient(180deg,rgba(15,23,42,0.96),rgba(2,6,23,0.98))] p-3">
            <svg viewBox="0 0 1000 720" className="h-[480px] w-full">
              {semanticMap.links.map((link) => {
                const source = nodeMap.get(link.source);
                const target = nodeMap.get(link.target);
                if (!source || !target) {
                  return null;
                }

                return (
                  <line
                    key={`${link.source}-${link.target}`}
                    x1={source.x}
                    y1={source.y}
                    x2={target.x}
                    y2={target.y}
                    stroke="rgba(148, 163, 184, 0.38)"
                    strokeWidth={source.id === 'skill' ? 2.8 : 1.6}
                  />
                );
              })}

              {semanticMap.nodes.map((node) => (
                <g key={node.id} transform={`translate(${node.x}, ${node.y})`}>
                  <circle
                    r={node.radius}
                    fill={groupColors[node.group % groupColors.length]}
                    opacity={node.group === 4 ? 0.76 : 1}
                    stroke="rgba(15, 23, 42, 0.9)"
                    strokeWidth={node.group === 0 ? 4 : 2}
                  />
                  <text
                    y={node.radius + 18}
                    textAnchor="middle"
                    fill="rgba(226, 232, 240, 0.96)"
                    fontSize={node.group === 0 ? 14 : 11}
                    fontWeight={node.group === 0 ? 700 : 500}
                  >
                    {truncateLabel(node.name, node.group === 1 ? 22 : 18)}
                  </text>
                </g>
              ))}
            </svg>
          </div>

          <div className="space-y-3">
            <div className="rounded-[1.25rem] border border-slate-800 bg-slate-950/72 p-4">
              <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">{t('vector.currentTarget')}</div>
              <div className="mt-2 text-base font-semibold text-slate-100">{data.projectName}</div>
              <p className="mt-2 text-sm leading-6 text-slate-300">{t('vector.mapReviewHint')}</p>
            </div>

            <div className="rounded-[1.25rem] border border-slate-800 bg-slate-950/72 p-4">
              <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">{t('vector.details')}</div>
              <div className="mt-3 grid gap-3">
                <Metric label={t('vector.category')} value={data?.threeClassification?.category ?? '--'} />
                <Metric label={t('vector.granularity')} value={data?.threeClassification?.granularity ?? '--'} />
                <Metric label={t('vector.distance')} value={`${semanticMap.nodes.length} nodes / ${semanticMap.links.length} links`} />
              </div>
            </div>

            <div className="rounded-[1.25rem] border border-slate-800 bg-slate-950/72 p-4">
              <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">{t('vector.analysis')}</div>
              <p className="mt-2 text-sm leading-6 text-slate-300">{t('vector.rebuildRecommendation')}</p>
            </div>
          </div>
        </div>
      ) : is3DEnabled ? (
        <div className="p-4">
          <Suspense fallback={<VectorFallback label={t('app.loadingWorkspaceModule')} />}>
            {VectorSpace3D ? <VectorSpace3D data={data} darkMode={darkMode} /> : null}
          </Suspense>
        </div>
      ) : (
        <div className="p-4">
          <div className="flex min-h-[420px] items-center justify-center rounded-[1.25rem] border border-slate-800 bg-slate-950/72 px-6 py-8 text-center">
            <div className="max-w-lg space-y-3">
              <div className="text-sm font-semibold tracking-tight text-slate-100">{t('vector.interactive3dDisabled')}</div>
              <p className="text-sm leading-6 text-slate-300">{t('vector.publicMode3dNote')}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1rem] border border-slate-800 bg-slate-900/75 px-3 py-3">
      <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">{label}</div>
      <div className="mt-2 text-sm font-medium text-slate-100">{value}</div>
    </div>
  );
}

function VectorFallback({ label }: { label: string }) {
  return (
    <div className="flex min-h-[420px] items-center justify-center rounded-[1.25rem] border border-slate-800 bg-slate-950/72 px-4 py-6 text-sm text-slate-300">
      {label}
    </div>
  );
}
