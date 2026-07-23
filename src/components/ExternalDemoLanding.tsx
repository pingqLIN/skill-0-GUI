import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Download,
  FileCheck2,
  FileText,
  Github,
  Languages,
  ShieldCheck,
  Upload,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';

type DemoScenarioId = 'mode-aware' | 'publish-gate';

type ExternalDemoLandingProps = {
  docsIndexUrl: string;
  guiRepoUrl: string;
  modeContractUrl: string;
  deploymentGuideUrl: string;
  language: string;
  onLoadScenario: (scenarioId: DemoScenarioId) => void;
  onOpenWorkspace: () => void;
  onToggleLanguage: () => void;
};

const workflowSteps = [
  { id: 'intake', icon: Upload },
  { id: 'validate', icon: ShieldCheck },
  { id: 'review', icon: FileCheck2 },
  { id: 'export', icon: Download },
] as const;

export function ExternalDemoLanding({
  docsIndexUrl,
  guiRepoUrl,
  modeContractUrl,
  deploymentGuideUrl,
  language,
  onLoadScenario,
  onOpenWorkspace,
  onToggleLanguage,
}: ExternalDemoLandingProps) {
  const { t } = useTranslation();

  return (
    <div className="demo-entry-page min-h-screen bg-background text-foreground">
      <header className="demo-entry-header">
        <div className="demo-entry-shell flex min-h-20 items-center justify-between gap-4">
          <button type="button" className="demo-entry-brand" onClick={onOpenWorkspace} aria-label={t('app.demoEntryOpenWorkspace')}>
            <span aria-hidden="true" className="demo-entry-mark">S0</span>
            <span>{t('app.title')}</span>
          </button>
          <div className="flex items-center gap-2">
            <button type="button" className="demo-entry-icon-button" onClick={onToggleLanguage} title={t('app.demoEntryLanguage')}>
              <Languages size={17} />
              <span>{language.startsWith('zh') ? 'EN' : '中文'}</span>
            </button>
            <a className="demo-entry-icon-button" href={guiRepoUrl} target="_blank" rel="noopener noreferrer" title="GitHub">
              <Github size={19} />
              <span className="sr-only">GitHub</span>
            </a>
          </div>
        </div>
      </header>

      <main className="demo-entry-shell pb-14 pt-12 sm:pt-16">
        <section className="demo-entry-hero" aria-labelledby="demo-entry-title">
          <div className="demo-entry-hero-copy">
            <h1 id="demo-entry-title">{t('app.demoEntryTitle')}</h1>
            <p className="demo-entry-lead">{t('app.demoEntryLead')}</p>
            <p className="demo-entry-scope">{t('app.demoEntryScope')}</p>
            <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-3">
              <button type="button" className="demo-entry-primary" onClick={onOpenWorkspace}>
                {t('app.demoEntryOpenWorkspace')}
                <ArrowRight size={18} aria-hidden="true" />
              </button>
              <a className="demo-entry-text-link" href={modeContractUrl} target="_blank" rel="noopener noreferrer">
                {t('app.demoEntryModeContract')}
                <ArrowRight size={16} aria-hidden="true" />
              </a>
            </div>
          </div>

          <section className="demo-entry-evidence" aria-label={t('app.demoEntryEvidenceSheet')}>
            <div className="demo-entry-evidence-toolbar">
              <span className="flex items-center gap-2 font-semibold"><FileText size={15} /> SKILL.md</span>
              <span className="demo-entry-readonly">{t('app.demoEntryReadOnly')}</span>
              <span className="ml-auto flex items-center gap-1 text-xs"><FileCheck2 size={14} /> {t('app.demoEntryEvidenceSheet')}</span>
            </div>
            <div className="demo-entry-evidence-body">
              <div className="demo-entry-document" aria-label={t('app.demoEntryDocumentPreview')}>
                <code>
                  <span><b># skill: file-summarizer</b></span>
                  <span>## summary</span>
                  <span>{t('app.demoEntryDocumentSummary')}</span>
                  <span>## inputs</span>
                  <span>- path: string (required)</span>
                  <span>- max_tokens: integer (optional, default: 512)</span>
                  <span>## constraints</span>
                  <span>- {t('app.demoEntryDocumentConstraint')}</span>
                </code>
                <div className="demo-entry-annotation demo-entry-annotation--blue">{t('app.demoEntryAnnotationOne')}</div>
                <div className="demo-entry-annotation demo-entry-annotation--green">{t('app.demoEntryAnnotationTwo')}</div>
              </div>
              <aside className="demo-entry-annotation-list" aria-label={t('app.demoEntryAnnotations')}>
                <h2>{t('app.demoEntryAnnotations')}</h2>
                <div><b>{t('app.demoEntryLineSix')}</b><p>{t('app.demoEntryAnnotationOne')}</p></div>
                <div><b>{t('app.demoEntryLineNine')}</b><p>{t('app.demoEntryAnnotationTwo')}</p></div>
                <div className="demo-entry-signoff"><CheckCircle2 size={16} /><span>{t('app.demoEntrySignoffReady')}</span></div>
              </aside>
            </div>
          </section>
        </section>

        <section className="demo-entry-flow" aria-labelledby="demo-entry-flow-title">
          <div>
            <h2 id="demo-entry-flow-title">{t('app.demoEntryFlowTitle')}</h2>
            <ol>
              {workflowSteps.map(({ id, icon: Icon }) => (
                <li key={id}>
                  <Icon aria-hidden="true" size={26} />
                  <div><strong>{t(`app.demoEntryStep${id[0].toUpperCase()}${id.slice(1)}`)}</strong><span>{t(`app.demoEntryStep${id[0].toUpperCase()}${id.slice(1)}Desc`)}</span></div>
                </li>
              ))}
            </ol>
          </div>
          <aside className="demo-entry-trust" aria-labelledby="demo-entry-trust-title">
            <ShieldCheck aria-hidden="true" size={32} />
            <div><h2 id="demo-entry-trust-title">{t('app.demoEntryTrustTitle')}</h2><p>{t('app.demoEntryTrustBody')}</p></div>
          </aside>
        </section>

        <section className="demo-entry-examples" aria-labelledby="demo-entry-examples-title">
          <h2 id="demo-entry-examples-title">{t('app.demoEntryExamplesTitle')}</h2>
          <div className="demo-entry-example-list">
            <ExampleRow title={t('app.demoEntryModeAwareTitle')} body={t('app.demoEntryModeAwareBody')} icon={FileText} onClick={() => onLoadScenario('mode-aware')} label={t('app.demoEntryLoadExample')} />
            <ExampleRow title={t('app.demoEntryPublishGateTitle')} body={t('app.demoEntryPublishGateBody')} icon={ShieldCheck} onClick={() => onLoadScenario('publish-gate')} label={t('app.demoEntryLoadExample')} />
          </div>
        </section>
      </main>

      <footer className="demo-entry-footer">
        <div className="demo-entry-shell flex flex-wrap items-center gap-x-8 gap-y-3 py-6 text-sm">
          <a href={docsIndexUrl} target="_blank" rel="noopener noreferrer"><BookOpen size={16} /> {t('app.demoEntryDocs')}</a>
          <a href={deploymentGuideUrl} target="_blank" rel="noopener noreferrer"><FileText size={16} /> {t('app.demoEntryDeploymentGuide')}</a>
          <a href={guiRepoUrl} target="_blank" rel="noopener noreferrer"><Github size={16} /> GitHub</a>
        </div>
      </footer>
    </div>
  );
}

function ExampleRow({
  title,
  body,
  icon: Icon,
  onClick,
  label,
}: {
  title: string;
  body: string;
  icon: LucideIcon;
  onClick: () => void;
  label: string;
}) {
  return (
    <article className="demo-entry-example-row">
      <Icon aria-hidden="true" size={24} />
      <div><h3>{title}</h3><p>{body}</p></div>
      <button type="button" className="demo-entry-primary" onClick={onClick}>{label}<ArrowRight size={17} aria-hidden="true" /></button>
    </article>
  );
}
