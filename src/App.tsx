import React, { useState } from 'react';
import { Moon, Sun, UploadCloud, Link as LinkIcon, FileCode2, Activity, RefreshCw, AlertCircle, Database, ShieldAlert, Edit2, Download, Undo2, Languages, Github } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { mockSkillData } from './data/mockData';
import { Flowchart } from './components/Flowchart';
import { PhaseDetails } from './components/PhaseDetails';
import { Dashboard } from './components/Dashboard';
import { VectorSpace } from './components/VectorSpace';
import { SecurityMatrix } from './components/SecurityMatrix';
import { SideEditor } from './components/SideEditor';
import { analyzeSkillText } from './services/geminiService';

export default function App() {
  const { t, i18n } = useTranslation();
  const [darkMode, setDarkMode] = useState(true);
  const [isExtracting, setIsExtracting] = useState(false);
  const [data, setData] = useState<any | null>(null);
  const [originalData, setOriginalData] = useState<any | null>(null);
  const [modifiedPaths, setModifiedPaths] = useState<Set<string>>(new Set());
  const [activePhase, setActivePhase] = useState<string | null>(null);
  const [inputText, setInputText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'pipeline' | 'vector' | 'matrix'>('pipeline');
  const [editorConfig, setEditorConfig] = useState<{ type: 'global' | 'decision', payload: any, phaseId?: string } | null>(null);

  const toggleLanguage = () => {
    const newLang = i18n.language.startsWith('zh') ? 'en' : 'zh';
    i18n.changeLanguage(newLang);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      const reader = new FileReader();
      reader.onload = async (event) => {
        const text = event.target?.result as string;
        if (text) {
          await processSkill(text);
        }
      };
      reader.readAsText(file);
    }
  };

  const handlePasteUrl = () => {
    if (inputText.trim()) {
      processSkill(inputText);
    } else {
      setError(t('app.errorEmpty'));
    }
  };

  const processSkill = async (text: string) => {
    setIsExtracting(true);
    setError(null);
    try {
      const result = await analyzeSkillText(text);
      setData(result);
      setOriginalData(JSON.parse(JSON.stringify(result)));
      setModifiedPaths(new Set());
      if (result.phases && result.phases.length > 0) {
        setActivePhase(result.phases[0].id);
      }
      setActiveTab('pipeline');
    } catch (err) {
      console.error(err);
      setError(t('app.errorFailed'));
      // Fallback to mock data on error for demonstration
      setData(mockSkillData);
      setOriginalData(JSON.parse(JSON.stringify(mockSkillData)));
      setModifiedPaths(new Set());
      setActivePhase(mockSkillData.phases[0].id);
      setActiveTab('pipeline');
    } finally {
      setIsExtracting(false);
    }
  };

  const handleSaveEdit = (updatedData: any) => {
    if (!editorConfig) return;
    const newData = JSON.parse(JSON.stringify(data));
    const newModified = new Set(modifiedPaths);
    let metricsChanged = false;

    if (editorConfig.type === 'global') {
      if (newData.projectName !== updatedData.projectName) newModified.add('projectName');
      if (newData.riskAssessment.level !== updatedData.riskAssessment.level) newModified.add('riskAssessment.level');
      if (newData.threeClassification.category !== updatedData.threeClassification.category) newModified.add('threeClassification.category');

      newData.projectName = updatedData.projectName;
      newData.riskAssessment = updatedData.riskAssessment;
      newData.threeClassification = updatedData.threeClassification;
      metricsChanged = true;
    } else if (editorConfig.type === 'decision') {
      const phaseIndex = newData.phases.findIndex((p: any) => p.id === editorConfig.phaseId);
      if (phaseIndex !== -1) {
        const nodeIndex = newData.phases[phaseIndex].decisionNodes.findIndex((n: any) => n.id === updatedData.id);
        if (nodeIndex !== -1) {
          const oldNode = newData.phases[phaseIndex].decisionNodes[nodeIndex];
          const basePath = `phases.${editorConfig.phaseId}.decisionNodes.${updatedData.id}`;
          
          if (oldNode.question !== updatedData.question) newModified.add(`${basePath}.question`);
          if (oldNode.threshold !== updatedData.threshold) newModified.add(`${basePath}.threshold`);
          if (oldNode.outcomes.yes !== updatedData.outcomes.yes) newModified.add(`${basePath}.outcomes.yes`);
          if (oldNode.outcomes.no !== updatedData.outcomes.no) newModified.add(`${basePath}.outcomes.no`);

          newData.phases[phaseIndex].decisionNodes[nodeIndex] = updatedData;
          metricsChanged = true;
        }
      }
    }

    if (metricsChanged) {
      // Recalculate some metrics to show dynamic updates
      newData.globalMetrics.decisionConfidence = Math.min(100, Math.max(0, newData.globalMetrics.decisionConfidence + Math.floor(Math.random() * 11) - 5));
      newData.globalMetrics.reworkRate = Math.min(100, Math.max(0, newData.globalMetrics.reworkRate + Math.floor(Math.random() * 5) - 2));
      newModified.add('metrics');
    }

    setData(newData);
    setModifiedPaths(newModified);
    setEditorConfig(null);
  };

  const handleUndo = () => {
    if (originalData) {
      setData(JSON.parse(JSON.stringify(originalData)));
      setModifiedPaths(new Set());
    }
  };

  const exportSkill = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${data.projectId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className={`min-h-screen transition-colors duration-300 ${darkMode ? 'dark' : ''}`}>
      {/* Header */}
      <header className="border-b border-border px-6 py-4 flex justify-between items-center sticky top-0 bg-background z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-primary flex items-center justify-center text-primary-foreground font-bold font-mono">
            S0
          </div>
          <h1 className="font-semibold tracking-tight text-lg">{t('app.title')}</h1>
        </div>
        <div className="flex items-center gap-2">
          <a 
            href="https://github.com/pingqLIN/skill-0" 
            target="_blank" 
            rel="noopener noreferrer"
            className="p-2 rounded-full hover:bg-muted transition-colors flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
            title="GitHub Repository"
          >
            <Github size={18} />
            <span className="hidden sm:inline">GitHub</span>
          </a>
          <button 
            onClick={toggleLanguage}
            className="p-2 rounded-full hover:bg-muted transition-colors flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
            title="Toggle Language"
          >
            <Languages size={18} />
            <span className="uppercase">{i18n.language.startsWith('zh') ? 'EN' : '中文'}</span>
          </button>
          <button 
            onClick={() => setDarkMode(!darkMode)}
            className="p-2 rounded-full hover:bg-muted transition-colors"
          >
            {darkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6 space-y-6">
        {!data ? (
          <div className="mt-10 max-w-2xl mx-auto">
            <div 
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              className="border-2 border-dashed border-border rounded-2xl p-12 flex flex-col items-center justify-center text-center hover:border-primary transition-colors bg-card"
            >
              {isExtracting ? (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center gap-4"
                >
                  <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                  <p className="text-lg font-medium animate-pulse">{t('app.analyzing')}</p>
                  <p className="text-sm text-muted-foreground font-mono">{t('app.applying')}</p>
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col items-center gap-4 w-full"
                >
                  <div className="p-4 bg-muted rounded-full">
                    <UploadCloud size={32} className="text-muted-foreground" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold mb-2">{t('app.analyzeNew')}</h2>
                    <p className="text-muted-foreground max-w-md text-sm mb-6">
                      {t('app.dragDrop')}
                    </p>
                  </div>
                  
                  <div className="w-full space-y-3">
                    <textarea 
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      placeholder={t('app.placeholder')}
                      className="w-full h-32 p-3 rounded-lg border border-input bg-background text-sm focus:ring-2 focus:ring-ring focus:border-transparent outline-none resize-none"
                    />
                    
                    {error && (
                      <div className="flex items-center gap-2 text-destructive text-sm bg-destructive/10 p-2 rounded">
                        <AlertCircle size={16} />
                        {error}
                      </div>
                    )}

                    <div className="flex gap-4 justify-center">
                      <button 
                        onClick={handlePasteUrl}
                        disabled={!inputText.trim()}
                        className="flex items-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Activity size={16} /> {t('app.analyzeBtn')}
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
            
            <div className="mt-8 text-center">
              <p className="text-sm text-muted-foreground">
                {t('app.tryExample')}
              </p>
              <button 
                onClick={() => processSkill(t('app.exampleText'))}
                className="mt-2 text-primary text-sm hover:underline"
              >
                {t('app.loadExample')}
              </button>
            </div>
          </div>
        ) : (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Section Divider */}
            <div className="flex items-center gap-4 py-4">
              <div className="h-px bg-border/50 flex-1" />
              <span className="text-[10px] font-mono text-muted-foreground/70 uppercase tracking-[0.2em]">{t('app.analysisResult')}</span>
              <div className="h-px bg-border/50 flex-1" />
            </div>

            {/* Header Info */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 px-1 mb-2">
              <div>
                <p className="text-[10px] text-muted-foreground font-mono mb-1.5 uppercase tracking-widest">{t('app.project')}: {data.projectId}</p>
                <div 
                  className="flex items-center gap-2 group cursor-pointer w-fit" 
                  onClick={() => setEditorConfig({ type: 'global', payload: data })}
                  title={t('editor.editGlobal')}
                >
                  <h2 className={`text-2xl font-semibold tracking-tight ${modifiedPaths.has('projectName') ? 'text-amber-500 dark:text-amber-400' : 'text-foreground'}`}>{data.projectName}</h2>
                  <Edit2 size={14} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
              <div className="flex items-center gap-3">
                {modifiedPaths.size > 0 && (
                  <button 
                    onClick={handleUndo}
                    className="px-3 py-1.5 bg-muted/50 text-muted-foreground text-xs rounded-md font-medium flex items-center gap-1.5 hover:bg-muted transition-colors shadow-sm border border-border/50"
                  >
                    <Undo2 size={14} /> {t('app.undo')}
                  </button>
                )}
                <button 
                  onClick={() => {
                    setData(null);
                    setInputText('');
                  }}
                  className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1.5 transition-colors px-2 py-1.5"
                >
                  <RefreshCw size={12} /> {t('app.analyzeAnother')}
                </button>
                <button 
                  onClick={exportSkill}
                  className="px-3 py-1.5 bg-primary text-primary-foreground text-xs rounded-md font-medium flex items-center gap-1.5 hover:bg-primary/90 transition-colors shadow-sm"
                >
                  <Download size={14} /> {t('app.export')}
                </button>
              </div>
            </div>

            {/* Dashboard (Always visible on top) */}
            <Dashboard data={data} onNavigatePhase={(id) => { setActiveTab('pipeline'); setActivePhase(id); }} modifiedPaths={modifiedPaths} />

            {/* Tabs (Segmented Control Style) */}
            <div className="flex items-center gap-1 bg-muted/30 p-1 rounded-lg w-fit border border-border/40 mt-4">
              <button
                onClick={() => setActiveTab('pipeline')}
                className={`flex items-center gap-2 px-4 py-1.5 text-xs font-medium rounded-md transition-all ${
                  activeTab === 'pipeline' 
                    ? 'bg-background text-foreground shadow-sm border border-border/50' 
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                }`}
              >
                {t('app.tabs.pipeline')}
              </button>
              <button
                onClick={() => setActiveTab('vector')}
                className={`flex items-center gap-2 px-4 py-1.5 text-xs font-medium rounded-md transition-all ${
                  activeTab === 'vector' 
                    ? 'bg-background text-foreground shadow-sm border border-border/50' 
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                }`}
              >
                {t('app.tabs.vector')}
              </button>
              <button
                onClick={() => setActiveTab('matrix')}
                className={`flex items-center gap-2 px-4 py-1.5 text-xs font-medium rounded-md transition-all ${
                  activeTab === 'matrix' 
                    ? 'bg-background text-foreground shadow-sm border border-border/50' 
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                }`}
              >
                {t('app.tabs.matrix')}
              </button>
            </div>

            {/* Tab Content */}
            <AnimatePresence mode="wait">
              {activeTab === 'pipeline' && (
                <motion.div 
                  key="pipeline"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="grid grid-cols-1 lg:grid-cols-12 gap-6"
                >
                  <div className="lg:col-span-4 flex flex-col h-[calc(100vh-320px)] min-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                    <Flowchart 
                      phases={data.phases} 
                      activePhase={activePhase} 
                      onSelectPhase={setActivePhase} 
                    />
                  </div>

                  <div className="lg:col-span-8 flex flex-col h-[calc(100vh-320px)] min-h-[500px] overflow-y-auto">
                    {activePhase && data.phases.find((p: any) => p.id === activePhase) && (
                      <PhaseDetails 
                        phase={data.phases.find((p: any) => p.id === activePhase)!} 
                        allPhases={data.phases}
                        onNavigatePhase={setActivePhase}
                        onClose={() => setActivePhase(null)}
                        onEditDecision={(node) => setEditorConfig({ type: 'decision', payload: node, phaseId: activePhase })}
                        modifiedPaths={modifiedPaths}
                      />
                    )}
                  </div>
                </motion.div>
              )}

              {activeTab === 'vector' && (
                <motion.div
                  key="vector"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <VectorSpace data={data} darkMode={darkMode} />
                </motion.div>
              )}

              {activeTab === 'matrix' && (
                <motion.div
                  key="matrix"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <SecurityMatrix data={data} />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </main>
      
      <SideEditor 
        config={editorConfig} 
        onClose={() => setEditorConfig(null)} 
        onSave={handleSaveEdit} 
      />
    </div>
  );
}
