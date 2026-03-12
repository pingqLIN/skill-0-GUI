import React, { useState } from 'react';
import { Clock, Target, ShieldAlert, CheckCircle2, Activity, Layers, Zap, ArrowRight, ChevronDown, ChevronUp, BarChart3 } from 'lucide-react';
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, Radar, Tooltip } from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';

export function Dashboard({ data, onNavigatePhase, modifiedPaths = new Set() }: { data: any, onNavigatePhase: (id: string) => void, modifiedPaths?: Set<string> }) {
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(true);
  const { globalMetrics, riskAssessment, threeClassification, phases } = data;

  const radarData = [
    { subject: t('dashboard.radar.operability'), A: threeClassification.operability, fullMark: 100 },
    { subject: t('dashboard.radar.safety'), A: 100 - riskAssessment.negativeIntent, fullMark: 100 },
    { subject: t('dashboard.radar.confidence'), A: globalMetrics.decisionConfidence, fullMark: 100 },
    { subject: t('dashboard.radar.achievement'), A: globalMetrics.goalAchievementRate, fullMark: 100 },
    { subject: t('dashboard.radar.efficiency'), A: 100 - (globalMetrics.reworkRate * 5), fullMark: 100 },
  ];

  const riskPhase = phases?.find((p: any) => p.name.includes('Risk'))?.id || 'C';
  const classPhase = phases?.find((p: any) => p.name.includes('Class'))?.id || 'B';

  return (
    <div className="flex flex-col gap-3">
      <div 
        className="flex items-center justify-between bg-card border border-border/60 rounded-xl p-3 shadow-sm cursor-pointer hover:bg-muted/30 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 text-foreground">
            <BarChart3 size={16} className="text-primary/70" />
            <span className="text-sm font-semibold tracking-tight">{t('dashboard.summary')}</span>
          </div>
          
          <AnimatePresence>
            {!isExpanded && (
              <motion.div 
                initial={{ opacity: 0, x: -10 }} 
                animate={{ opacity: 1, x: 0 }} 
                exit={{ opacity: 0, x: -10 }}
                className="hidden md:flex items-center gap-6 text-xs"
              >
                <div className="flex items-center gap-1.5">
                  <ShieldAlert size={14} className={riskAssessment.level === 'SAFE' || riskAssessment.level === 'LOW' ? 'text-emerald-500' : 'text-destructive'} />
                  <span className={`font-medium ${modifiedPaths.has('riskAssessment.level') ? 'text-amber-500 dark:text-amber-400' : ''}`}>{riskAssessment.level} {t('dashboard.risk')}</span>
                </div>
                <div className="w-px h-4 bg-border/60" />
                <div className="flex items-center gap-1.5">
                  <Layers size={14} className="text-muted-foreground/70" />
                  <span className={`font-medium ${modifiedPaths.has('threeClassification.category') ? 'text-amber-500 dark:text-amber-400' : ''}`}>{threeClassification.category}</span>
                </div>
                <div className="w-px h-4 bg-border/60" />
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 size={14} className="text-muted-foreground/70" />
                  <span className={`font-medium ${modifiedPaths.has('metrics') ? 'text-amber-500 dark:text-amber-400' : ''}`}>{globalMetrics.decisionConfidence}% {t('dashboard.confidence')}</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <button className="p-1 hover:bg-muted/50 rounded-full text-muted-foreground transition-colors">
          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      </div>

      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 pt-1">
              {/* KPIs */}
              <div className="lg:col-span-1 grid grid-cols-2 gap-3">
                <MetricCard 
                  icon={<Clock size={14} className="text-muted-foreground/70" />}
                  label={t('dashboard.deliveryTime')}
                  value={`${globalMetrics.deliveryTime}s`}
                />
                <MetricCard 
                  icon={<CheckCircle2 size={14} className="text-muted-foreground/70" />}
                  label={t('dashboard.decisionConfidence')}
                  value={`${globalMetrics.decisionConfidence}%`}
                  isModified={modifiedPaths.has('metrics')}
                />
                <MetricCard 
                  icon={<Activity size={14} className="text-muted-foreground/70" />}
                  label={t('dashboard.reworkRate')}
                  value={`${globalMetrics.reworkRate}%`}
                  isModified={modifiedPaths.has('metrics')}
                />
                <MetricCard 
                  icon={<Target size={14} className="text-muted-foreground/70" />}
                  label={t('dashboard.goalAchievement')}
                  value={`${globalMetrics.goalAchievementRate}%`}
                />
              </div>

              {/* Radar Chart */}
              <div className="lg:col-span-2 border border-border/60 rounded-xl p-4 bg-card/50 h-full min-h-[220px] flex items-center justify-center shadow-sm">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="65%" data={radarData}>
                    <PolarGrid stroke="var(--color-border)" strokeOpacity={0.6} />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: 'var(--color-muted-foreground)', fontSize: 10, fontWeight: 500 }} />
                    <Radar name="Skill" dataKey="A" stroke="var(--color-primary)" strokeWidth={1.5} fill="var(--color-primary)" fillOpacity={0.1} />
                    <Tooltip contentStyle={{ backgroundColor: 'var(--color-popover)', border: '1px solid var(--color-border)', borderRadius: '8px', fontSize: '12px', color: 'var(--color-popover-foreground)', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>

              {/* Risk & Classification */}
              <div className="lg:col-span-1 flex flex-col gap-3">
                <div className="border border-border/60 rounded-xl p-4 bg-card/50 flex-1 shadow-sm flex flex-col justify-center relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-destructive/5 to-transparent rounded-bl-full pointer-events-none" />
                  <h4 className="text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-widest mb-2">{t('dashboard.riskAssessment')}</h4>
                  <div className="flex items-center justify-between mb-3 z-10">
                    <div className="flex items-center gap-2">
                      <ShieldAlert size={16} className={riskAssessment.level === 'SAFE' || riskAssessment.level === 'LOW' ? 'text-emerald-500' : 'text-destructive'} />
                      <span className={`font-semibold text-base tracking-tight ${modifiedPaths.has('riskAssessment.level') ? 'text-amber-500 dark:text-amber-400' : ''}`}>{riskAssessment.level} {t('dashboard.risk')}</span>
                    </div>
                    <span className="text-[10px] font-mono border border-border/50 bg-background/50 px-1.5 py-0.5 rounded text-muted-foreground">
                      {riskAssessment.negativeIntent} {t('dashboard.intent', 'Score')}
                    </span>
                  </div>
                  <button 
                    onClick={() => onNavigatePhase(riskPhase)}
                    className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground mt-auto hover:text-primary transition-colors cursor-pointer w-fit"
                  >
                    {t('dashboard.phase')} {riskPhase} <ArrowRight size={10} className="group-hover:translate-x-0.5 transition-transform" />
                  </button>
                </div>
                
                <div className="border border-border/60 rounded-xl p-4 bg-card/50 flex-1 shadow-sm flex flex-col justify-center relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-primary/5 to-transparent rounded-bl-full pointer-events-none" />
                  <h4 className="text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-widest mb-2">{t('dashboard.threeClassification')}</h4>
                  <div className="space-y-1.5 mb-3 z-10">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-muted-foreground flex items-center gap-1.5"><Layers size={12}/> {t('dashboard.category')}</span>
                      <span className={`font-medium text-right max-w-[120px] truncate ${modifiedPaths.has('threeClassification.category') ? 'text-amber-500 dark:text-amber-400' : ''}`} title={threeClassification.category}>{threeClassification.category}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-muted-foreground flex items-center gap-1.5"><Zap size={12}/> {t('dashboard.granularity')}</span>
                      <span className="font-medium">{threeClassification.granularity}</span>
                    </div>
                  </div>
                  <button 
                    onClick={() => onNavigatePhase(classPhase)}
                    className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground mt-auto hover:text-primary transition-colors cursor-pointer w-fit"
                  >
                    {t('dashboard.phase')} {classPhase} <ArrowRight size={10} className="group-hover:translate-x-0.5 transition-transform" />
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

function MetricCard({ icon, label, value, isModified }: { icon: React.ReactNode, label: string, value: string, isModified?: boolean }) {
  return (
    <div className={`border rounded-xl p-3 flex flex-col justify-between h-full min-h-[90px] shadow-sm transition-colors ${isModified ? 'border-amber-500/40 bg-amber-500/5' : 'border-border/60 bg-card/50'}`}>
      <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
        {icon}
        <span className="text-[10px] font-medium uppercase tracking-wider">{label}</span>
      </div>
      <div className={`text-xl font-semibold tracking-tight ${isModified ? 'text-amber-600 dark:text-amber-400' : 'text-foreground'}`}>{value}</div>
    </div>
  );
}
