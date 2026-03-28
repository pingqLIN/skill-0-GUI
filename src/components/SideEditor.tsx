import React, { useEffect, useId, useRef, useState } from 'react';
import { X, Save } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';

export function SideEditor({ config, onClose, onSave }: { config: any, onClose: () => void, onSave: (data: any) => void }) {
  const { t } = useTranslation();
  const [formData, setFormData] = useState<any>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const initialFieldRef = useRef<HTMLInputElement | HTMLSelectElement | null>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);
  const titleId = useId();

  useEffect(() => {
    if (config) {
      setFormData(JSON.parse(JSON.stringify(config.payload)));
    }
  }, [config]);

  useEffect(() => {
    if (!config) {
      return;
    }

    previouslyFocusedRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const frame = window.requestAnimationFrame(() => {
      initialFieldRef.current?.focus();
    });

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== 'Tab' || !panelRef.current) {
        return;
      }

      const focusableElements = panelRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );

      if (focusableElements.length === 0) {
        return;
      }

      const first = focusableElements[0];
      const last = focusableElements[focusableElements.length - 1];
      const activeElement = document.activeElement;

      if (event.shiftKey && activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('keydown', handleKeyDown);
      previouslyFocusedRef.current?.focus();
    };
  }, [config, onClose]);

  if (!config || !formData) return null;

  const handleChange = (field: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }));
  };

  const handleNestedChange = (parent: string, field: string, value: any) => {
    setFormData((prev: any) => ({
      ...prev,
      [parent]: { ...prev[parent], [field]: value }
    }));
  };

  const handleListChange = (field: string, value: string) => {
    const items = value
      .split('\n')
      .map((item) => item.trim())
      .filter(Boolean);

    setFormData((prev: any) => ({
      ...prev,
      [field]: items,
    }));
  };

  const listValue = (items: unknown) => Array.isArray(items) ? items.join('\n') : '';

  return (
    <AnimatePresence>
      {config && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            aria-hidden="true"
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40"
          />
          <motion.div
            ref={panelRef}
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="fixed inset-y-0 right-0 z-50 flex h-full w-full max-w-[400px] flex-col border-l border-border/60 bg-card shadow-2xl"
          >
            <div className="flex items-center justify-between p-5 border-b border-border/50 bg-muted/10">
              <div>
                <h2 id={titleId} className="font-semibold tracking-tight text-sm text-foreground">
                  {config.type === 'global'
                    ? t('editor.editGlobal')
                    : config.type === 'phase'
                      ? t('editor.editPhase')
                      : t('editor.editDecision')}
                </h2>
                <p className="text-[10px] text-muted-foreground/80 mt-1 uppercase tracking-widest">
                  {config.type === 'global'
                    ? t('editor.globalDesc')
                    : config.type === 'phase'
                      ? t('editor.phaseDesc')
                      : t('editor.decisionDesc')}
                </p>
              </div>
              <button
                onClick={onClose}
                aria-label={t('editor.close')}
                className="p-1.5 hover:bg-muted/50 rounded-full text-muted-foreground/70 hover:text-foreground transition-colors"
              >
                <X size={16} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
              {config.type === 'global' && (
                <>
                  <div className="space-y-2">
                    <label className="text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-widest">{t('editor.projectName')}</label>
                    <input 
                      ref={initialFieldRef}
                      type="text" 
                      value={formData.projectName} 
                      onChange={(e) => handleChange('projectName', e.target.value)}
                      className="w-full bg-background border border-border/60 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all shadow-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-widest">{t('editor.riskLevel')}</label>
                    <select 
                      value={formData.riskAssessment.level} 
                      onChange={(e) => handleNestedChange('riskAssessment', 'level', e.target.value)}
                      className="w-full bg-background border border-border/60 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all shadow-sm"
                    >
                      <option value="SAFE">Safe</option>
                      <option value="LOW">Low</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="HIGH">High</option>
                      <option value="CRITICAL">Critical</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-widest">{t('editor.category')}</label>
                    <input 
                      type="text" 
                      value={formData.threeClassification.category} 
                      onChange={(e) => handleNestedChange('threeClassification', 'category', e.target.value)}
                      className="w-full bg-background border border-border/60 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all shadow-sm"
                    />
                  </div>
                </>
              )}

              {config.type === 'decision' && (
                <>
                  <div className="space-y-2">
                    <label className="text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-widest">{t('editor.question')}</label>
                    <input 
                      ref={initialFieldRef}
                      type="text" 
                      value={formData.question} 
                      onChange={(e) => handleChange('question', e.target.value)}
                      className="w-full bg-background border border-border/60 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all shadow-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-widest">{t('editor.threshold')}</label>
                    <input 
                      type="text" 
                      value={formData.threshold} 
                      onChange={(e) => handleChange('threshold', e.target.value)}
                      className="w-full bg-background border border-border/60 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all shadow-sm font-mono text-xs"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <div className="space-y-2">
                      <label className="text-[10px] font-semibold text-emerald-500/80 uppercase tracking-widest">{t('editor.outcomeYes')}</label>
                      <input 
                        type="text" 
                        value={formData.outcomes.yes} 
                        onChange={(e) => handleNestedChange('outcomes', 'yes', e.target.value)}
                        className="w-full bg-background border border-border/60 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all shadow-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-semibold text-destructive/80 uppercase tracking-widest">{t('editor.outcomeNo')}</label>
                      <input 
                        type="text" 
                        value={formData.outcomes.no} 
                        onChange={(e) => handleNestedChange('outcomes', 'no', e.target.value)}
                        className="w-full bg-background border border-border/60 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-destructive/50 focus:border-destructive/50 transition-all shadow-sm"
                      />
                    </div>
                  </div>
                </>
              )}

              {config.type === 'phase' && (
                <>
                  <div className="space-y-2">
                    <label className="text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-widest">{t('editor.phaseName')}</label>
                    <input
                      ref={initialFieldRef}
                      type="text"
                      value={formData.name ?? ''}
                      onChange={(e) => handleChange('name', e.target.value)}
                      className="w-full bg-background border border-border/60 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all shadow-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-widest">{t('phaseDetails.inputs')}</label>
                    <textarea
                      value={listValue(formData.input)}
                      onChange={(e) => handleListChange('input', e.target.value)}
                      className="min-h-28 w-full resize-y bg-background border border-border/60 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all shadow-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-widest">{t('phaseDetails.tasks')}</label>
                    <textarea
                      value={listValue(formData.tasks)}
                      onChange={(e) => handleListChange('tasks', e.target.value)}
                      className="min-h-32 w-full resize-y bg-background border border-border/60 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all shadow-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-widest">{t('phaseDetails.outputs')}</label>
                    <textarea
                      value={listValue(formData.output)}
                      onChange={(e) => handleListChange('output', e.target.value)}
                      className="min-h-28 w-full resize-y bg-background border border-border/60 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all shadow-sm"
                    />
                  </div>
                </>
              )}
            </div>

            <div className="p-5 border-t border-border/50 bg-muted/5">
              <button 
                onClick={() => onSave(formData)}
                className="w-full bg-primary text-primary-foreground py-2.5 rounded-lg text-sm font-medium flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors shadow-sm"
              >
                <Save size={16} /> {t('editor.save')}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
