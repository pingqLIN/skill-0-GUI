import React, { useState } from 'react';
import {
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  FileSearch,
  BookOpen,
  ExternalLink,
  ShieldCheck,
  FileText,
  GitMerge,
  ChevronDown,
  ChevronRight,
  AlertOctagon,
  Info,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';

const SEVERITY_WEIGHTS: Record<string, number> = {
  critical: 28,
  high: 20,
  medium: 12,
  low: 6,
};

const FRAMEWORK_LINKS = [
  {
    label: 'OWASP',
    href: 'https://owasp.org/www-project-top-ten/',
    title: 'OWASP Top 10',
  },
  {
    label: 'GDPR',
    href: 'https://gdpr.eu/what-is-gdpr/',
    title: 'General Data Protection Regulation overview',
  },
  {
    label: 'SOC2',
    href: 'https://www.aicpa-cima.com/topic/audit-assurance/audit-and-assurance-greater-than-soc-2',
    title: 'AICPA SOC 2 overview',
  },
];

export function SecurityMatrix({ data }: { data: any }) {
  const { t } = useTranslation();
  const [expandedNode, setExpandedNode] = useState<string | null>(null);
  const [expandedFinding, setExpandedFinding] = useState<number | null>(null);

  const allNodes = data.phases.flatMap((phase: any) =>
    (phase.decisionNodes || []).map((node: any) => ({
      ...node,
      phaseId: phase.id,
      phaseName: phase.name,
    })),
  );

  const { riskAssessment, securityScan } = data;
  const findings = securityScan?.findings || [];
  const hasFindings = findings.length > 0;
  const anomalyScore = Math.min(
    100,
    findings.reduce((sum: number, finding: any) => sum + (SEVERITY_WEIGHTS[finding.adjustedSeverity?.toLowerCase()] ?? 4), 0) + (securityScan?.blocked ? 20 : 0),
  );
  const combinedRiskScore = Math.round((riskAssessment.negativeIntent * 0.6) + (anomalyScore * 0.4));

  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'critical': return 'text-red-500 bg-red-500/10 border-red-500/20';
      case 'high': return 'text-orange-500 bg-orange-500/10 border-orange-500/20';
      case 'medium': return 'text-amber-500 bg-amber-500/10 border-amber-500/20';
      case 'low': return 'text-blue-500 bg-blue-500/10 border-blue-500/20';
      default: return 'text-slate-500 bg-slate-500/10 border-slate-500/20';
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="relative rounded-xl border border-border/60 bg-card p-4 shadow-sm group">
          <div className="flex items-center gap-2 text-muted-foreground/70 mb-2">
            <ShieldAlert size={14} className={riskAssessment.level === 'SAFE' || riskAssessment.level === 'LOW' ? 'text-emerald-500' : 'text-amber-500'} />
            <span className="text-[10px] font-semibold uppercase tracking-widest">{t('securityMatrix.overallRisk')}</span>
          </div>
          <div className="text-2xl font-semibold tracking-tight text-foreground">{riskAssessment.level}</div>
          <div className="mt-1 inline-flex cursor-help items-center gap-1 border-b border-dashed border-muted-foreground/50 text-[10px] uppercase tracking-wider text-muted-foreground/80">
            {t('securityMatrix.basedOnIntent')}
          </div>
          <div className="invisible absolute left-0 top-full z-50 mt-2 w-72 rounded-lg border border-border bg-popover p-3 text-xs text-popover-foreground opacity-0 shadow-lg transition-all group-hover:visible group-hover:opacity-100">
            <div className="mb-2 flex items-center gap-2 font-semibold">
              <Info size={12} /> {t('securityMatrix.riskFormulaTitle', 'Risk Calculation Formula')}
            </div>
            <div className="rounded border border-border/50 bg-muted/40 p-2 font-mono text-[10px]">
              Risk = (Negative Intent % × 0.6) + (Anomaly Score × 0.4)
            </div>
            <div className="mt-2 text-[10px] text-muted-foreground">
              Current score: {combinedRiskScore} = ({riskAssessment.negativeIntent} × 0.6) + ({anomalyScore} × 0.4)
            </div>
            <ul className="mt-2 space-y-1 text-[10px] text-muted-foreground">
              <li>Low: 0 - 30</li>
              <li>Medium: 31 - 60</li>
              <li>High: 61 - 100</li>
            </ul>
          </div>
        </div>

        <div className="relative rounded-xl border border-border/60 bg-card p-4 shadow-sm group">
          <div className="flex items-center gap-2 text-muted-foreground/70 mb-2">
            <AlertTriangle size={14} className="text-amber-500" />
            <span className="text-[10px] font-semibold uppercase tracking-widest">{t('securityMatrix.detectedAnomaly')}</span>
          </div>
          <div className="text-2xl font-semibold tracking-tight text-foreground">{anomalyScore}</div>
          <div className="mt-1 inline-flex cursor-help items-center gap-1 border-b border-dashed border-muted-foreground/50 text-[10px] uppercase tracking-wider text-muted-foreground/80">
            {t('securityMatrix.anomalyFormulaTitle')}
          </div>
          <div className="invisible absolute left-0 top-full z-50 mt-2 w-72 rounded-lg border border-border bg-popover p-3 text-xs text-popover-foreground opacity-0 shadow-lg transition-all group-hover:visible group-hover:opacity-100">
            <div className="mb-2 flex items-center gap-2 font-semibold">
              <Info size={12} /> {t('securityMatrix.anomalyFormulaTitle')}
            </div>
            <div className="rounded border border-border/50 bg-muted/40 p-2 font-mono text-[10px]">
              Anomaly Score = Σ(severity weight) + blocked bonus
            </div>
            <ul className="mt-2 space-y-1 text-[10px] text-muted-foreground">
              <li>Critical = 28</li>
              <li>High = 20</li>
              <li>Medium = 12</li>
              <li>Low = 6</li>
              <li>Blocked bonus = 20</li>
            </ul>
          </div>
        </div>

        <div className="relative rounded-xl border border-border/60 bg-card p-4 shadow-sm group">
          <div className="flex items-center gap-2 text-muted-foreground/70 mb-2">
            <ShieldCheck size={14} className="text-indigo-500/70" />
            <span className="text-[10px] font-semibold uppercase tracking-widest">{t('securityMatrix.securityGates')}</span>
          </div>
          <div className="text-2xl font-semibold tracking-tight text-foreground">{allNodes.length}</div>
          <div className="mt-1 inline-flex cursor-help items-center gap-1 border-b border-dashed border-muted-foreground/50 text-[10px] uppercase tracking-wider text-muted-foreground/80">
            {t('securityMatrix.activeDecisionNodes')}
          </div>
          <div className="invisible absolute left-0 top-full z-50 mt-2 w-80 rounded-lg border border-border bg-popover p-3 text-xs text-popover-foreground opacity-0 shadow-lg transition-all group-hover:visible group-hover:opacity-100">
            <div className="mb-2 font-semibold">{t('securityMatrix.associatedNodes')}</div>
            <div className="max-h-56 space-y-2 overflow-auto pr-1 text-[10px] text-muted-foreground">
              {allNodes.map((node: any) => (
                <div key={node.id} className="rounded border border-border/40 bg-muted/30 px-2 py-2">
                  <div className="font-mono text-foreground">{node.id} · P{node.phaseId}</div>
                  <div className="mt-1 leading-5">{node.question}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border/60 bg-card p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center gap-2 text-muted-foreground/70 mb-2">
            <ShieldCheck size={14} className="text-indigo-500/70" />
            <span className="text-[10px] font-semibold uppercase tracking-widest">{t('securityMatrix.frameworks')}</span>
          </div>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {FRAMEWORK_LINKS.map((framework) => (
              <a
                key={framework.label}
                href={framework.href}
                target="_blank"
                rel="noopener noreferrer"
                title={framework.title}
                className="inline-flex items-center gap-1 rounded border border-border/50 bg-muted/50 px-2 py-1 text-[10px] font-mono text-muted-foreground transition-colors hover:border-primary/30 hover:bg-primary/10 hover:text-primary"
              >
                {framework.label}
                <ExternalLink size={8} />
              </a>
            ))}
          </div>
          <div className="pt-2 text-[10px] uppercase tracking-wider text-muted-foreground/80">{t('securityMatrix.alignedStandards')}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
        <div className="space-y-6 lg:col-span-3">
          {hasFindings && (
            <div className="flex flex-col overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm">
              <div className="flex items-center justify-between border-b border-border/50 bg-muted/10 p-4">
                <div>
                  <h3 className="flex items-center gap-2 text-sm font-semibold tracking-tight text-foreground">
                    <AlertOctagon size={14} className="text-destructive/70" />
                    Security Findings
                  </h3>
                  <p className="mt-1 text-xs text-muted-foreground/80">
                    Vulnerabilities detected by the context-aware security scanner
                  </p>
                </div>
                <div className="flex items-center gap-4 text-[10px] font-mono uppercase tracking-widest">
                  <div className="flex items-center gap-1.5 rounded border border-amber-500/20 bg-amber-500/10 px-2 py-1 text-amber-600 dark:text-amber-400">
                    <AlertTriangle size={12} /> {t('securityMatrix.flags')}: {findings.length}
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full whitespace-nowrap text-left text-sm">
                  <thead>
                    <tr className="border-b border-border/50 bg-muted/5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground/70">
                      <th className="w-8 px-4 py-3 font-semibold"></th>
                      <th className="px-4 py-3 font-semibold">Rule</th>
                      <th className="px-4 py-3 font-semibold">Severity</th>
                      <th className="px-4 py-3 font-semibold">Context</th>
                      <th className="px-4 py-3 font-semibold">Line</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {findings.map((finding: any, idx: number) => {
                      const isExpanded = expandedFinding === idx;
                      return (
                        <React.Fragment key={idx}>
                          <tr className={`group cursor-pointer transition-colors hover:bg-muted/5 ${isExpanded ? 'bg-muted/5' : ''}`} onClick={() => setExpandedFinding(isExpanded ? null : idx)}>
                            <td className="px-4 py-3 text-muted-foreground/50">
                              {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                            </td>
                            <td className="px-4 py-3 font-mono text-xs text-primary/80">
                              <div className="flex flex-col">
                                <span>{finding.ruleId}</span>
                                <span className="max-w-[200px] truncate text-[10px] text-muted-foreground">{finding.ruleName}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex items-center rounded border px-2 py-0.5 text-[10px] font-mono font-semibold uppercase ${getSeverityColor(finding.adjustedSeverity)}`}>
                                {finding.adjustedSeverity}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-xs font-medium text-foreground/90">
                              <span className="inline-flex items-center rounded border border-border/50 bg-muted/50 px-1.5 py-0.5 text-[10px] font-mono">
                                {finding.contextType}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span className="rounded border border-slate-700 bg-slate-800 px-2 py-1 font-mono text-[10px] font-medium text-slate-200">
                                Line {finding.lineNumber}
                              </span>
                            </td>
                          </tr>
                          <AnimatePresence>
                            {isExpanded && (
                              <tr>
                                <td colSpan={5} className="border-b border-border/40 p-0">
                                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden bg-muted/10">
                                    <div className="flex flex-col gap-3 px-12 py-4">
                                      <div>
                                        <h5 className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">
                                          <FileSearch size={12} /> Description
                                        </h5>
                                        <p className="max-w-3xl whitespace-normal text-xs leading-relaxed text-muted-foreground/90">
                                          {finding.description}
                                        </p>
                                      </div>
                                      <div>
                                        <h5 className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">
                                          <FileText size={12} /> Match Context
                                        </h5>
                                        <div className="overflow-x-auto rounded-md border border-slate-800 bg-slate-900 p-3">
                                          <code className="whitespace-pre-wrap font-mono text-xs text-slate-300">
                                            {finding.lineContent}
                                          </code>
                                        </div>
                                      </div>
                                      {finding.originalSeverity !== finding.adjustedSeverity && (
                                        <div>
                                          <h5 className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">
                                            <GitMerge size={12} /> Severity Adjustment
                                          </h5>
                                          <p className="border-l-2 border-primary/30 py-1 pl-3 text-xs italic leading-relaxed text-muted-foreground/90">
                                            {finding.adjustmentReason}
                                          </p>
                                        </div>
                                      )}
                                      <div>
                                        <h5 className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">
                                          <BookOpen size={12} /> Detection Standard
                                        </h5>
                                        <a href={finding.standardUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                                          {finding.detectionStandard} <ExternalLink size={10} />
                                        </a>
                                      </div>
                                    </div>
                                  </motion.div>
                                </td>
                              </tr>
                            )}
                          </AnimatePresence>
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="flex flex-col overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm">
            <div className="flex items-center justify-between border-b border-border/50 bg-muted/10 p-4">
              <div>
                <h3 className="flex items-center gap-2 text-sm font-semibold tracking-tight text-foreground">
                  <ShieldAlert size={14} className="text-indigo-500/70" />
                  {t('securityMatrix.complianceRiskMatrix')}
                </h3>
                <p className="mt-1 text-xs text-muted-foreground/80">
                  {t('securityMatrix.auditLogDesc')}
                </p>
              </div>
              <div className="flex items-center gap-4 text-[10px] font-mono uppercase tracking-widest">
                <div className="flex items-center gap-1.5 rounded border border-emerald-500/20 bg-emerald-500/10 px-2 py-1 text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 size={12} /> {t('securityMatrix.passed')}: {allNodes.length}
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full whitespace-nowrap text-left text-sm">
                <thead>
                  <tr className="border-b border-border/50 bg-muted/5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground/70">
                    <th className="w-8 px-4 py-3 font-semibold"></th>
                    <th className="px-4 py-3 font-semibold">{t('securityMatrix.node')}</th>
                    <th className="px-4 py-3 font-semibold">{t('securityMatrix.phase')}</th>
                    <th className="px-4 py-3 font-semibold">{t('securityMatrix.decisionQuestion')}</th>
                    <th className="px-4 py-3 font-semibold">{t('securityMatrix.threshold')}</th>
                    <th className="px-4 py-3 font-semibold">{t('securityMatrix.status')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {allNodes.map((node: any, idx: number) => {
                    const isExpanded = expandedNode === node.id;
                    return (
                      <React.Fragment key={idx}>
                        <tr className={`group cursor-pointer transition-colors hover:bg-muted/5 ${isExpanded ? 'bg-muted/5' : ''}`} onClick={() => setExpandedNode(isExpanded ? null : node.id)}>
                          <td className="px-4 py-3 text-muted-foreground/50">
                            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                          </td>
                          <td className="px-4 py-3 font-mono text-xs text-primary/80">{node.id}</td>
                          <td className="px-4 py-3 text-muted-foreground">
                            <span className="inline-flex items-center rounded border border-border/50 bg-muted/50 px-1.5 py-0.5 text-[10px] font-mono">
                              P{node.phaseId}: {node.phaseName}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs font-medium text-foreground/90">{node.question}</td>
                          <td className="px-4 py-3">
                            <span className="rounded border border-slate-700 bg-slate-800 px-2 py-1 font-mono text-[10px] font-medium text-slate-200">
                              {node.threshold}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1.5 text-[10px] font-mono text-emerald-600 dark:text-emerald-400">
                              <CheckCircle2 size={12} /> {t('securityMatrix.pass')}
                            </div>
                          </td>
                        </tr>
                        <AnimatePresence>
                          {isExpanded && (
                            <tr>
                              <td colSpan={6} className="border-b border-border/40 p-0">
                                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden bg-muted/10">
                                  <div className="flex flex-col gap-3 px-12 py-4">
                                    <div>
                                      <h5 className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">
                                        <FileSearch size={12} /> {t('securityMatrix.evidenceTrace')}
                                      </h5>
                                      <p className="border-l-2 border-primary/30 py-1 pl-3 text-xs italic leading-relaxed text-muted-foreground/90">
                                        {node.evidence}
                                      </p>
                                    </div>
                                    <div>
                                      <h5 className="mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">{t('securityMatrix.outcomes')}</h5>
                                      <div className="flex items-center gap-3 text-[10px] font-mono">
                                        <div className="flex items-center gap-1 rounded border border-emerald-500/20 bg-emerald-500/5 px-1.5 py-0.5 text-emerald-600 dark:text-emerald-400">
                                          {t('securityMatrix.yes')}: {node.outcomes.yes}
                                        </div>
                                        <div className="flex items-center gap-1 rounded border border-destructive/20 bg-destructive/5 px-1.5 py-0.5 text-destructive">
                                          {t('securityMatrix.no')}: {node.outcomes.no}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </motion.div>
                              </td>
                            </tr>
                          )}
                        </AnimatePresence>
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="space-y-4 lg:col-span-1">
          <div className="rounded-xl border border-border/60 bg-card p-5 shadow-sm">
            <h4 className="mb-4 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">
              <BookOpen size={14} className="text-primary/70" />
              {t('securityMatrix.referencePolicies')}
            </h4>
            <ul className="space-y-3">
              <li>
                <a href="https://gdpr.eu/what-is-gdpr/" target="_blank" rel="noopener noreferrer" className="group flex flex-col gap-1">
                  <div className="flex items-center justify-between text-xs font-semibold text-foreground/90 transition-colors group-hover:text-primary">
                    {t('securityMatrix.dataPrivacyPolicy')} <ExternalLink size={12} className="opacity-0 transition-opacity group-hover:opacity-100" />
                  </div>
                  <span className="text-[10px] text-muted-foreground/70">GDPR • {t('securityMatrix.updated2DaysAgo')}</span>
                </a>
              </li>
              <li className="h-px w-full bg-border/50" />
              <li>
                <a href="https://www.aicpa-cima.com/topic/audit-assurance/audit-and-assurance-greater-than-soc-2" target="_blank" rel="noopener noreferrer" className="group flex flex-col gap-1">
                  <div className="flex items-center justify-between text-xs font-semibold text-foreground/90 transition-colors group-hover:text-primary">
                    {t('securityMatrix.accessControlMatrix')} <ExternalLink size={12} className="opacity-0 transition-opacity group-hover:opacity-100" />
                  </div>
                  <span className="text-[10px] text-muted-foreground/70">SOC 2 • {t('securityMatrix.requiredForPhaseC')}</span>
                </a>
              </li>
              <li className="h-px w-full bg-border/50" />
              <li>
                <a href="https://owasp.org/www-project-top-ten/" target="_blank" rel="noopener noreferrer" className="group flex flex-col gap-1">
                  <div className="flex items-center justify-between text-xs font-semibold text-foreground/90 transition-colors group-hover:text-primary">
                    {t('securityMatrix.owaspMitigationGuide')} <ExternalLink size={12} className="opacity-0 transition-opacity group-hover:opacity-100" />
                  </div>
                  <span className="text-[10px] text-muted-foreground/70">OWASP Top 10</span>
                </a>
              </li>
            </ul>
          </div>

          <div className="rounded-xl border border-primary/10 bg-primary/5 p-5 shadow-sm">
            <h4 className="mb-3 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest text-primary/80">
              <FileText size={14} />
              {t('securityMatrix.auditLogSummary')}
            </h4>
            <p className="mb-4 text-xs leading-relaxed text-muted-foreground/80">
              {t('securityMatrix.auditLogSummaryText')}
            </p>
            <div className="flex items-center gap-2 rounded border border-border/50 bg-background/50 p-2 text-[10px] font-mono text-muted-foreground/80">
              <CheckCircle2 size={12} className="text-emerald-500/70" />
              {t('securityMatrix.lastScanned')}: {new Date().toISOString().split('T')[0]}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
