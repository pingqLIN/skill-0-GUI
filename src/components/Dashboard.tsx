import React, { useState } from 'react';
import {
  Clock,
  Target,
  ShieldAlert,
  CheckCircle2,
  Activity,
  Layers,
  Zap,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  BarChart3,
} from 'lucide-react';
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, Radar, Tooltip } from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';

export function Dashboard({ data, onNavigatePhase, modifiedPaths = new Set() }: { data: any; onNavigatePhase: (id: string) => void; modifiedPaths?: Set<string> }) {
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(true);
  const globalMetrics = data?.globalMetrics ?? {};
  const riskAssessment = data?.riskAssessment ?? {};
  const threeClassification = data?.threeClassification ?? {};
  const phases = Array.isArray(data?.phases) ? data.phases : [];
  const manifest = data?.parserResult?.manifest ?? null;
  const parserFindings = data?.parserResult?.analysis_findings ?? [];
  const hasIncompleteSnapshot = !Number.isFinite(Number(globalMetrics.deliveryTime))
    || !Number.isFinite(Number(globalMetrics.decisionConfidence))
    || !Number.isFinite(Number(globalMetrics.reworkRate))
    || !Number.isFinite(Number(globalMetrics.goalAchievementRate))
    || typeof riskAssessment.level !== 'string'
    || typeof threeClassification.category !== 'string';

  const radarData = [
    { subject: t('dashboard.radar.operability'), A: Number(threeClassification.operability ?? 0), fullMark: 100 },
    { subject: t('dashboard.radar.safety'), A: 100 - Number(riskAssessment.negativeIntent ?? 0), fullMark: 100 },
    { subject: t('dashboard.radar.confidence'), A: Number(globalMetrics.decisionConfidence ?? 0), fullMark: 100 },
    { subject: t('dashboard.radar.achievement'), A: Number(globalMetrics.goalAchievementRate ?? 0), fullMark: 100 },
    { subject: t('dashboard.radar.efficiency'), A: 100 - (Number(globalMetrics.reworkRate ?? 0) * 5), fullMark: 100 },
  ];

  const riskPhase = phases.find((p: any) => typeof p?.name === 'string' && p.name.includes('Risk'))?.id ?? null;
  const classPhase = phases.find((p: any) => typeof p?.name === 'string' && p.name.includes('Class'))?.id ?? null;

  return (
    <div className="flex flex-col gap-3">
      <button
        className="flex items-center justify-between rounded-[1.35rem] border border-border/50 bg-white/44 px-4 py-3 text-left shadow-[0_18px_38px_-30px_hsl(var(--foreground)/0.35)] backdrop-blur-2xl transition-colors hover:border-primary/26"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-foreground">
            <BarChart3 size={16} className="text-primary/70" />
            <span className="text-sm font-semibold tracking-tight">{t('dashboard.summary')}</span>
          </div>
          <AnimatePresence>
            {!isExpanded && (
              <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="hidden md:flex items-center gap-4 text-xs text-muted-foreground">
                <span>{riskAssessment.level || '--'}</span>
                <span className="h-4 w-px bg-border/60" />
                <span>{threeClassification.category || '--'}</span>
                <span className="h-4 w-px bg-border/60" />
                <span>{formatMetric(globalMetrics.decisionConfidence, '%')} {t('dashboard.confidence')}</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        {isExpanded ? <ChevronUp size={16} className="text-muted-foreground" /> : <ChevronDown size={16} className="text-muted-foreground" />}
      </button>

      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.28, ease: 'easeInOut' }} className="overflow-hidden">
            <div className="grid grid-cols-1 gap-4 pt-1 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1.25fr)_minmax(0,1fr)]">
              {hasIncompleteSnapshot && (
                <div data-testid="dashboard-incomplete-state" className="lg:col-span-3 rounded-[1.2rem] border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-900">
                  <div className="font-medium">{t('dashboard.incompleteSnapshot')}</div>
                  <div className="mt-1 text-xs leading-5">{t('dashboard.incompleteSnapshotHint')}</div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <MetricCard icon={<Clock size={14} className="text-muted-foreground/70" />} label={t('dashboard.deliveryTime')} value={formatMetric(globalMetrics.deliveryTime, 's')} />
                <MetricCard icon={<CheckCircle2 size={14} className="text-muted-foreground/70" />} label={t('dashboard.decisionConfidence')} value={formatMetric(globalMetrics.decisionConfidence, '%')} isModified={modifiedPaths.has('metrics')} />
                <MetricCard icon={<Activity size={14} className="text-muted-foreground/70" />} label={t('dashboard.reworkRate')} value={formatMetric(globalMetrics.reworkRate, '%')} isModified={modifiedPaths.has('metrics')} />
                <MetricCard icon={<Target size={14} className="text-muted-foreground/70" />} label={t('dashboard.goalAchievement')} value={formatMetric(globalMetrics.goalAchievementRate, '%')} />
              </div>

              <div className="rounded-[1.35rem] border border-border/50 bg-white/42 p-4 shadow-[0_18px_38px_-32px_hsl(var(--foreground)/0.35)] backdrop-blur-2xl min-h-[220px]">
                <ResponsiveContainer width="100%" height={220}>
                  <RadarChart cx="50%" cy="50%" outerRadius="66%" data={radarData}>
                    <PolarGrid stroke="var(--color-border)" strokeOpacity={0.6} />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: 'var(--color-muted-foreground)', fontSize: 10, fontWeight: 500 }} />
                    <Radar name="Skill" dataKey="A" stroke="var(--color-primary)" strokeWidth={1.5} fill="var(--color-primary)" fillOpacity={0.14} />
                    <Tooltip contentStyle={{ backgroundColor: 'rgba(255,255,255,0.92)', border: '1px solid rgba(148,163,184,0.3)', borderRadius: '14px', fontSize: '12px', color: 'var(--color-popover-foreground)', boxShadow: '0 18px 36px -28px rgba(15,23,42,0.35)', backdropFilter: 'blur(14px)' }} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>

              <div className="flex flex-col gap-3">
                <div className="rounded-[1.35rem] border border-border/50 bg-white/42 p-4 shadow-[0_18px_38px_-32px_hsl(var(--foreground)/0.35)] backdrop-blur-2xl group">
                  <h4 className="text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground/70">{t('dashboard.riskAssessment')}</h4>
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <ShieldAlert size={16} className={riskAssessment.level === 'SAFE' || riskAssessment.level === 'LOW' ? 'text-emerald-500' : 'text-destructive'} />
                      <span className={`font-semibold text-base tracking-tight ${modifiedPaths.has('riskAssessment.level') ? 'text-amber-600' : 'text-foreground'}`}>{riskAssessment.level || '--'} {t('dashboard.risk')}</span>
                    </div>
                    <span className="rounded-full border border-border/50 bg-background/70 px-2 py-1 text-[10px] font-mono text-muted-foreground backdrop-blur-lg">{formatMetric(riskAssessment.negativeIntent)}</span>
                  </div>
                  {manifest && (
                    <p className="mt-3 text-xs leading-6 text-muted-foreground">
                      {t('dashboard.parserSignals')}: {manifest.unresolved_references_count || 0} {t('dashboard.unresolved')} · {manifest.command_references_count || 0} {t('dashboard.commands')} · {parserFindings.length} {t('dashboard.findings')}
                    </p>
                  )}
                  <button
                    type="button"
                    data-testid="dashboard-risk-phase-action"
                    disabled={!riskPhase}
                    onClick={() => riskPhase && onNavigatePhase(riskPhase)}
                    className="mt-4 inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground transition hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {t('dashboard.phase')} {riskPhase || '--'} <ArrowRight size={10} className="transition-transform group-hover:translate-x-0.5" />
                  </button>
                </div>

                <div className="rounded-[1.35rem] border border-border/50 bg-white/42 p-4 shadow-[0_18px_38px_-32px_hsl(var(--foreground)/0.35)] backdrop-blur-2xl group">
                  <h4 className="text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground/70">{t('dashboard.threeClassification')}</h4>
                  <div className="mt-3 space-y-2 text-xs">
                    <div className="flex items-center justify-between gap-3">
                      <span className="flex items-center gap-1.5 text-muted-foreground"><Layers size={12} /> {t('dashboard.category')}</span>
                      <span className={`font-medium text-right ${modifiedPaths.has('threeClassification.category') ? 'text-amber-600' : 'text-foreground'}`}>{threeClassification.category || '--'}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="flex items-center gap-1.5 text-muted-foreground"><Zap size={12} /> {t('dashboard.granularity')}</span>
                      <span className="font-medium text-foreground">{threeClassification.granularity || '--'}</span>
                    </div>
                    {manifest && (
                      <>
                        <div className="flex items-center justify-between gap-3">
                          <span className="flex items-center gap-1.5 text-muted-foreground"><Layers size={12} /> {t('dashboard.analysisLevel')}</span>
                          <span className="font-medium text-foreground">{manifest.analysis_level || '--'}</span>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <span className="flex items-center gap-1.5 text-muted-foreground"><Zap size={12} /> {t('dashboard.supportingRefs')}</span>
                          <span className="font-medium text-foreground">{manifest.supporting_files_count || 0}</span>
                        </div>
                      </>
                    )}
                  </div>
                  <button
                    type="button"
                    data-testid="dashboard-class-phase-action"
                    disabled={!classPhase}
                    onClick={() => classPhase && onNavigatePhase(classPhase)}
                    className="mt-4 inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground transition hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {t('dashboard.phase')} {classPhase || '--'} <ArrowRight size={10} className="transition-transform group-hover:translate-x-0.5" />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function formatMetric(value: unknown, suffix = '') {
  if (!Number.isFinite(Number(value))) {
    return `--${suffix}`;
  }

  return `${Number(value)}${suffix}`;
}

function MetricCard({ icon, label, value, isModified }: { icon: React.ReactNode; label: string; value: string; isModified?: boolean }) {
  return (
    <div className={`rounded-[1.2rem] border p-3 shadow-[0_16px_34px_-30px_hsl(var(--foreground)/0.3)] backdrop-blur-2xl transition-colors ${isModified ? 'border-amber-500/35 bg-amber-500/10' : 'border-border/50 bg-white/42'}`}>
      <div className="flex items-center gap-1.5 text-muted-foreground">
        {icon}
        <span className="text-[10px] font-medium uppercase tracking-wider">{label}</span>
      </div>
      <div className={`mt-4 text-xl font-semibold tracking-tight ${isModified ? 'text-amber-600' : 'text-foreground'}`}>{value}</div>
    </div>
  );
}
