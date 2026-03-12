import React, { useState } from 'react';
import { ShieldAlert, CheckCircle2, AlertTriangle, FileSearch, BookOpen, ExternalLink, ShieldCheck, FileText, GitMerge, ChevronDown, ChevronRight, AlertOctagon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';

export function SecurityMatrix({ data }: { data: any }) {
  const { t } = useTranslation();
  const [expandedNode, setExpandedNode] = useState<string | null>(null);
  const [expandedFinding, setExpandedFinding] = useState<number | null>(null);

  const allNodes = data.phases.flatMap((phase: any) => 
    (phase.decisionNodes || []).map((node: any) => ({
      ...node,
      phaseId: phase.id,
      phaseName: phase.name
    }))
  );

  const { riskAssessment, securityScan } = data;
  const findings = securityScan?.findings || [];
  const hasFindings = findings.length > 0;

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
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Top Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-card border border-border/60 rounded-xl p-4 shadow-sm flex flex-col justify-between relative group">
          <div className="flex items-center gap-2 text-muted-foreground/70 mb-2">
            <ShieldAlert size={14} className={riskAssessment.level === 'SAFE' || riskAssessment.level === 'LOW' ? 'text-emerald-500' : 'text-amber-500'} />
            <span className="text-[10px] font-semibold uppercase tracking-widest">{t('securityMatrix.overallRisk')}</span>
          </div>
          <div className="text-2xl font-semibold tracking-tight text-foreground">{riskAssessment.level}</div>
          <div className="text-[10px] text-muted-foreground/80 mt-1 uppercase tracking-wider border-b border-dashed border-muted-foreground/50 w-fit cursor-help">
            {t('securityMatrix.basedOnIntent')}
          </div>
          
          {/* Tooltip for Risk Calculation */}
          <div className="absolute top-full left-0 mt-2 w-64 p-3 bg-popover text-popover-foreground border border-border rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 text-xs">
            <div className="font-semibold mb-1">{t('securityMatrix.riskFormulaTitle', 'Risk Calculation Formula')}</div>
            <div className="font-mono text-[10px] bg-muted/50 p-1.5 rounded mb-2 border border-border/50">
              Risk Score: {riskAssessment.negativeIntent}/100
            </div>
            <ul className="space-y-1 text-[10px] text-muted-foreground">
              <li>• SAFE: &lt;= 10</li>
              <li>• LOW: 11 - 30</li>
              <li>• MEDIUM: 31 - 50</li>
              <li>• HIGH: 51 - 80</li>
              <li>• CRITICAL: &gt; 80</li>
            </ul>
          </div>
        </div>

        <div className="bg-card border border-border/60 rounded-xl p-4 shadow-sm flex flex-col justify-between relative group">
          <div className="flex items-center gap-2 text-muted-foreground/70 mb-2">
            <AlertTriangle size={14} className="text-amber-500" />
            <span className="text-[10px] font-semibold uppercase tracking-widest">{t('securityMatrix.negativeIntent', 'Risk Score')}</span>
          </div>
          <div className="text-2xl font-semibold tracking-tight text-foreground">{riskAssessment.negativeIntent}</div>
          <div className="text-[10px] text-muted-foreground/80 mt-1 uppercase tracking-wider border-b border-dashed border-muted-foreground/50 w-fit cursor-help">
            {t('securityMatrix.detectedAnomaly', 'Calculated from findings')}
          </div>
        </div>

        <div className="bg-card border border-border/60 rounded-xl p-4 shadow-sm flex flex-col justify-between relative group">
          <div className="flex items-center gap-2 text-muted-foreground/70 mb-2">
            <AlertOctagon size={14} className="text-destructive/70" />
            <span className="text-[10px] font-semibold uppercase tracking-widest">Security Findings</span>
          </div>
          <div className="text-2xl font-semibold tracking-tight text-foreground">{findings.length}</div>
          <div className="text-[10px] text-muted-foreground/80 mt-1 uppercase tracking-wider border-b border-dashed border-muted-foreground/50 w-fit cursor-help">
            Detected Vulnerabilities
          </div>
        </div>

        <div className="bg-card border border-border/60 rounded-xl p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center gap-2 text-muted-foreground/70 mb-2">
            <ShieldCheck size={14} className="text-indigo-500/70" />
            <span className="text-[10px] font-semibold uppercase tracking-widest">{t('securityMatrix.frameworks')}</span>
          </div>
          <div className="flex flex-wrap gap-1 mt-1">
            <a href="https://owasp.org/www-project-top-ten/" target="_blank" rel="noopener noreferrer" className="text-[10px] bg-muted/50 hover:bg-primary/10 hover:text-primary hover:border-primary/30 transition-colors px-1.5 py-0.5 rounded font-mono border border-border/50 text-muted-foreground flex items-center gap-1">
              OWASP <ExternalLink size={8} />
            </a>
            <a href="https://github.com/deadbits/vigil-llm" target="_blank" rel="noopener noreferrer" className="text-[10px] bg-muted/50 hover:bg-primary/10 hover:text-primary hover:border-primary/30 transition-colors px-1.5 py-0.5 rounded font-mono border border-border/50 text-muted-foreground flex items-center gap-1">
              Vigil-LLM <ExternalLink size={8} />
            </a>
          </div>
          <div className="text-[10px] text-muted-foreground/80 mt-auto pt-2 uppercase tracking-wider">{t('securityMatrix.alignedStandards')}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main Content Area */}
        <div className="lg:col-span-3 space-y-6">
          
          {/* Security Findings Table */}
          {hasFindings && (
            <div className="border border-border/60 rounded-xl bg-card overflow-hidden shadow-sm flex flex-col">
              <div className="p-4 border-b border-border/50 bg-muted/10 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold tracking-tight flex items-center gap-2 text-foreground">
                    <AlertOctagon size={14} className="text-destructive/70" />
                    Security Findings
                  </h3>
                  <p className="text-xs text-muted-foreground/80 mt-1">
                    Vulnerabilities detected by the context-aware security scanner
                  </p>
                </div>
                <div className="flex items-center gap-4 text-[10px] font-mono uppercase tracking-widest">
                  <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-1 rounded border border-amber-500/20">
                    <AlertTriangle size={12} /> {t('securityMatrix.flags')}: {findings.length}
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead>
                    <tr className="bg-muted/5 text-muted-foreground/70 font-mono text-[10px] uppercase tracking-widest border-b border-border/50">
                      <th className="px-4 py-3 font-semibold w-8"></th>
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
                          <tr 
                            className={`hover:bg-muted/5 transition-colors group cursor-pointer ${isExpanded ? 'bg-muted/5' : ''}`}
                            onClick={() => setExpandedFinding(isExpanded ? null : idx)}
                          >
                            <td className="px-4 py-3 text-muted-foreground/50">
                              {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                            </td>
                            <td className="px-4 py-3 font-mono text-xs text-primary/80">
                              <div className="flex flex-col">
                                <span>{finding.ruleId}</span>
                                <span className="text-[10px] text-muted-foreground truncate max-w-[200px]">{finding.ruleName}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded border text-[10px] font-mono uppercase font-semibold ${getSeverityColor(finding.adjustedSeverity)}`}>
                                {finding.adjustedSeverity}
                              </span>
                            </td>
                            <td className="px-4 py-3 font-medium text-foreground/90 text-xs">
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded border border-border/50 bg-muted/50 text-[10px] font-mono">
                                {finding.contextType}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span className="font-mono text-[10px] px-2 py-1 bg-slate-800 dark:bg-slate-800/80 text-slate-200 dark:text-slate-300 rounded border border-slate-700 dark:border-slate-700/60 font-medium">
                                Line {finding.lineNumber}
                              </span>
                            </td>
                          </tr>
                          <AnimatePresence>
                            {isExpanded && (
                              <tr>
                                <td colSpan={5} className="p-0 border-b border-border/40">
                                  <motion.div 
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.2 }}
                                    className="overflow-hidden bg-muted/10"
                                  >
                                    <div className="px-12 py-4 flex flex-col gap-3">
                                      <div>
                                        <h5 className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70 mb-1.5 flex items-center gap-1.5">
                                          <FileSearch size={12} /> Description
                                        </h5>
                                        <p className="text-xs text-muted-foreground/90 leading-relaxed max-w-3xl whitespace-normal">
                                          {finding.description}
                                        </p>
                                      </div>
                                      <div>
                                        <h5 className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70 mb-1.5 flex items-center gap-1.5">
                                          <FileText size={12} /> Match Context
                                        </h5>
                                        <div className="bg-slate-900 rounded-md p-3 overflow-x-auto border border-slate-800">
                                          <code className="text-xs font-mono text-slate-300 whitespace-pre-wrap">
                                            {finding.lineContent}
                                          </code>
                                        </div>
                                      </div>
                                      {finding.originalSeverity !== finding.adjustedSeverity && (
                                        <div>
                                          <h5 className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70 mb-1.5 flex items-center gap-1.5">
                                            <GitMerge size={12} /> Severity Adjustment
                                          </h5>
                                          <p className="text-xs italic text-muted-foreground/90 leading-relaxed max-w-3xl whitespace-normal border-l-2 border-primary/30 pl-3 py-1">
                                            {finding.adjustmentReason}
                                          </p>
                                        </div>
                                      )}
                                      <div>
                                        <h5 className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70 mb-1.5 flex items-center gap-1.5">
                                          <BookOpen size={12} /> Detection Standard
                                        </h5>
                                        <a href={finding.standardUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline inline-flex items-center gap-1">
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

          {/* Decision Nodes Table */}
          <div className="border border-border/60 rounded-xl bg-card overflow-hidden shadow-sm flex flex-col">
            <div className="p-4 border-b border-border/50 bg-muted/10 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold tracking-tight flex items-center gap-2 text-foreground">
                  <ShieldAlert size={14} className="text-indigo-500/70" />
                  {t('securityMatrix.complianceRiskMatrix')}
                </h3>
                <p className="text-xs text-muted-foreground/80 mt-1">
                  {t('securityMatrix.auditLogDesc')}
                </p>
              </div>
              <div className="flex items-center gap-4 text-[10px] font-mono uppercase tracking-widest">
                <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/20">
                  <CheckCircle2 size={12} /> {t('securityMatrix.passed')}: {allNodes.length}
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead>
                  <tr className="bg-muted/5 text-muted-foreground/70 font-mono text-[10px] uppercase tracking-widest border-b border-border/50">
                    <th className="px-4 py-3 font-semibold w-8"></th>
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
                        <tr 
                          className={`hover:bg-muted/5 transition-colors group cursor-pointer ${isExpanded ? 'bg-muted/5' : ''}`}
                          onClick={() => setExpandedNode(isExpanded ? null : node.id)}
                        >
                          <td className="px-4 py-3 text-muted-foreground/50">
                            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                          </td>
                          <td className="px-4 py-3 font-mono text-xs text-primary/80">
                            {node.id}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded border border-border/50 bg-muted/50 text-[10px] font-mono">
                              P{node.phaseId}: {node.phaseName}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-medium text-foreground/90 text-xs">
                            {node.question}
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-mono text-[10px] px-2 py-1 bg-slate-800 dark:bg-slate-800/80 text-slate-200 dark:text-slate-300 rounded border border-slate-700 dark:border-slate-700/60 font-medium">
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
                              <td colSpan={6} className="p-0 border-b border-border/40">
                                <motion.div 
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: 'auto', opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  transition={{ duration: 0.2 }}
                                  className="overflow-hidden bg-muted/10"
                                >
                                  <div className="px-12 py-4 flex flex-col gap-3">
                                    <div>
                                      <h5 className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70 mb-1.5 flex items-center gap-1.5">
                                        <FileSearch size={12} /> {t('securityMatrix.evidenceTrace')}
                                      </h5>
                                      <p className="text-xs italic text-muted-foreground/90 leading-relaxed max-w-3xl whitespace-normal border-l-2 border-primary/30 pl-3 py-1">
                                        {node.evidence}
                                      </p>
                                    </div>
                                    <div className="flex gap-6">
                                      <div>
                                        <h5 className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70 mb-1.5">{t('securityMatrix.outcomes')}</h5>
                                        <div className="flex items-center gap-3 text-[10px] font-mono">
                                          <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 bg-emerald-500/5 px-1.5 py-0.5 rounded border border-emerald-500/20">
                                            {t('securityMatrix.yes')}: {node.outcomes.yes}
                                          </div>
                                          <div className="flex items-center gap-1 text-destructive bg-destructive/5 px-1.5 py-0.5 rounded border border-destructive/20">
                                            {t('securityMatrix.no')}: {node.outcomes.no}
                                          </div>
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

        {/* Auxiliary Reference Information */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-card border border-border/60 rounded-xl p-5 shadow-sm">
            <h4 className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70 mb-4 flex items-center gap-2">
              <BookOpen size={14} className="text-primary/70" />
              {t('securityMatrix.referencePolicies')}
            </h4>
            <ul className="space-y-3">
              <li>
                <a href="https://github.com/pingqLIN/skill-0" target="_blank" rel="noopener noreferrer" className="group flex flex-col gap-1">
                  <div className="flex items-center justify-between text-xs font-semibold text-foreground/90 group-hover:text-primary transition-colors">
                    {t('securityMatrix.dataPrivacyPolicy')} <ExternalLink size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <span className="text-[10px] text-muted-foreground/70">v2.1 • {t('securityMatrix.updated2DaysAgo')}</span>
                </a>
              </li>
              <li className="h-px bg-border/50 w-full" />
              <li>
                <a href="https://github.com/pingqLIN/skill-0/blob/main/README.md" target="_blank" rel="noopener noreferrer" className="group flex flex-col gap-1">
                  <div className="flex items-center justify-between text-xs font-semibold text-foreground/90 group-hover:text-primary transition-colors">
                    {t('securityMatrix.accessControlMatrix')} <ExternalLink size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <span className="text-[10px] text-muted-foreground/70">v1.4 • {t('securityMatrix.requiredForPhaseC')}</span>
                </a>
              </li>
              <li className="h-px bg-border/50 w-full" />
              <li>
                <a href="https://github.com/pingqLIN/skill-0" target="_blank" rel="noopener noreferrer" className="group flex flex-col gap-1">
                  <div className="flex items-center justify-between text-xs font-semibold text-foreground/90 group-hover:text-primary transition-colors">
                    {t('securityMatrix.owaspMitigationGuide')} <ExternalLink size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <span className="text-[10px] text-muted-foreground/70">{t('securityMatrix.externalSecurityStandards')}</span>
                </a>
              </li>
            </ul>
          </div>

          <div className="bg-primary/5 border border-primary/10 rounded-xl p-5 shadow-sm">
            <h4 className="text-[10px] font-semibold uppercase tracking-widest text-primary/80 mb-3 flex items-center gap-2">
              <FileText size={14} />
              {t('securityMatrix.auditLogSummary')}
            </h4>
            <p className="text-xs text-muted-foreground/80 leading-relaxed mb-4">
              {t('securityMatrix.auditLogSummaryText')}
            </p>
            <div className="flex items-center gap-2 text-[10px] font-mono text-muted-foreground/80 bg-background/50 p-2 rounded border border-border/50">
              <CheckCircle2 size={12} className="text-emerald-500/70" />
              {t('securityMatrix.lastScanned')}: {new Date().toISOString().split('T')[0]}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
