import React from 'react';
import { Clock, Target, ShieldAlert, CheckCircle2, Activity, Layers, Zap } from 'lucide-react';
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, Radar, Tooltip } from 'recharts';

export function Dashboard({ data }: { data: any }) {
  const { globalMetrics, riskAssessment, threeClassification } = data;

  const radarData = [
    { subject: 'Operability', A: threeClassification.operability, fullMark: 100 },
    { subject: 'Safety', A: 100 - riskAssessment.negativeIntent, fullMark: 100 },
    { subject: 'Confidence', A: globalMetrics.decisionConfidence, fullMark: 100 },
    { subject: 'Achievement', A: globalMetrics.goalAchievementRate, fullMark: 100 },
    { subject: 'Efficiency', A: 100 - (globalMetrics.reworkRate * 5), fullMark: 100 },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
      {/* KPIs */}
      <div className="lg:col-span-2 grid grid-cols-2 gap-4">
        <MetricCard 
          icon={<Clock size={18} className="text-blue-500" />}
          label="Delivery Time"
          value={`${globalMetrics.deliveryTime}h`}
        />
        <MetricCard 
          icon={<Target size={18} className="text-emerald-500" />}
          label="Goal Achievement"
          value={`${globalMetrics.goalAchievementRate}%`}
        />
        <MetricCard 
          icon={<CheckCircle2 size={18} className="text-indigo-500" />}
          label="Decision Confidence"
          value={`${globalMetrics.decisionConfidence}%`}
        />
        <MetricCard 
          icon={<Activity size={18} className="text-amber-500" />}
          label="Rework Rate"
          value={`${globalMetrics.reworkRate}%`}
        />
      </div>

      {/* Radar Chart */}
      <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 bg-white dark:bg-zinc-900/50 hidden lg:block h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
            <PolarGrid stroke="#52525b" strokeOpacity={0.3} />
            <PolarAngleAxis dataKey="subject" tick={{ fill: '#71717a', fontSize: 10 }} />
            <Radar name="Skill" dataKey="A" stroke="#6366f1" fill="#6366f1" fillOpacity={0.3} />
            <Tooltip contentStyle={{ backgroundColor: '#18181b', border: 'none', borderRadius: '8px', fontSize: '12px', color: '#fff' }} />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      {/* Risk & Classification */}
      <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 bg-white dark:bg-zinc-900/50 flex flex-col justify-between">
        <div>
          <h4 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2">Risk Assessment</h4>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldAlert size={16} className={riskAssessment.level === 'Low' ? 'text-emerald-500' : 'text-red-500'} />
              <span className="font-medium">{riskAssessment.level} Risk</span>
            </div>
            <span className="text-sm font-mono bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded">
              {riskAssessment.negativeIntent}% Intent
            </span>
          </div>
        </div>
        
        <div className="h-px bg-zinc-200 dark:bg-zinc-800 my-3" />
        
        <div>
          <h4 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2">Three-Classification</h4>
          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-zinc-500 dark:text-zinc-400 flex items-center gap-1"><Layers size={14}/> Category</span>
              <span className="font-medium">{threeClassification.category}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-zinc-500 dark:text-zinc-400 flex items-center gap-1"><Zap size={14}/> Granularity</span>
              <span className="font-medium">{threeClassification.granularity}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ icon, label, value }: { icon: React.ReactNode, label: string, value: string }) {
  return (
    <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 bg-white dark:bg-zinc-900/50 flex flex-col justify-between h-[92px]">
      <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400 mb-1">
        {icon}
        <span className="text-sm font-medium">{label}</span>
      </div>
      <div className="text-2xl font-bold tracking-tight">{value}</div>
    </div>
  );
}
