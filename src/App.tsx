import React, { useState } from 'react';
import { Moon, Sun, UploadCloud, Link as LinkIcon, FileCode2, Activity, RefreshCw, AlertCircle, Database, ShieldAlert } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { mockSkillData } from './data/mockData';
import { Flowchart } from './components/Flowchart';
import { PhaseDetails } from './components/PhaseDetails';
import { Dashboard } from './components/Dashboard';
import { VectorSpace } from './components/VectorSpace';
import { SecurityMatrix } from './components/SecurityMatrix';
import { analyzeSkillText } from './services/staticAnalyzerService';

export default function App() {
  const [darkMode, setDarkMode] = useState(true);
  const [isExtracting, setIsExtracting] = useState(false);
  const [data, setData] = useState<any | null>(null);
  const [activePhase, setActivePhase] = useState<string | null>(null);
  const [inputText, setInputText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'pipeline' | 'vector' | 'matrix'>('pipeline');

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
      setError('Please enter a skill description, code snippet, or URL.');
    }
  };

  const processSkill = async (text: string) => {
    setIsExtracting(true);
    setError(null);
    try {
      const result = await analyzeSkillText(text);
      setData(result);
      if (result.phases && result.phases.length > 0) {
        setActivePhase(result.phases[0].id);
      }
      setActiveTab('pipeline');
    } catch (err) {
      console.error(err);
      setError('Failed to analyze the skill. Please try again or use a different input.');
      // Fallback to mock data on error for demonstration
      setData(mockSkillData);
      setActivePhase(mockSkillData.phases[0].id);
      setActiveTab('pipeline');
    } finally {
      setIsExtracting(false);
    }
  };

  return (
    <div className={`min-h-screen transition-colors duration-300 ${darkMode ? 'dark bg-zinc-950 text-zinc-50' : 'bg-zinc-50 text-zinc-900'}`}>
      {/* Header */}
      <header className="border-b border-zinc-200 dark:border-zinc-800 px-6 py-4 flex justify-between items-center sticky top-0 bg-inherit z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-indigo-600 flex items-center justify-center text-white font-bold font-mono">
            S0
          </div>
          <h1 className="font-semibold tracking-tight text-lg">Skill-0 Engine (Static Mode)</h1>
        </div>
        <button 
          onClick={() => setDarkMode(!darkMode)}
          className="p-2 rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors"
        >
          {darkMode ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </header>

      <main className="max-w-7xl mx-auto p-6 space-y-6">
        {!data ? (
          <div className="mt-10 max-w-2xl mx-auto">
            <div 
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              className="border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-2xl p-12 flex flex-col items-center justify-center text-center hover:border-indigo-500 dark:hover:border-indigo-500 transition-colors bg-zinc-100/50 dark:bg-zinc-900/50"
            >
              {isExtracting ? (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center gap-4"
                >
                  <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                  <p className="text-lg font-medium animate-pulse">Extracting Skill & Parsing Code...</p>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400 font-mono">Applying static AST & heuristic analysis</p>
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col items-center gap-4 w-full"
                >
                  <div className="p-4 bg-zinc-200 dark:bg-zinc-800 rounded-full">
                    <UploadCloud size={32} className="text-zinc-600 dark:text-zinc-300" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold mb-2">Analyze a New Skill</h2>
                    <p className="text-zinc-500 dark:text-zinc-400 max-w-md text-sm mb-6">
                      Drag & drop a text file, or paste a skill description/code snippet below to dynamically generate the execution pipeline and risk assessment.
                    </p>
                  </div>
                  
                  <div className="w-full space-y-3">
                    <textarea 
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      placeholder="e.g., A python script that scrapes user data from a website and saves it to a local CSV file..."
                      className="w-full h-32 p-3 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none resize-none"
                    />
                    
                    {error && (
                      <div className="flex items-center gap-2 text-red-500 text-sm bg-red-50 dark:bg-red-900/20 p-2 rounded">
                        <AlertCircle size={16} />
                        {error}
                      </div>
                    )}

                    <div className="flex gap-4 justify-center">
                      <button 
                        onClick={handlePasteUrl}
                        disabled={!inputText.trim()}
                        className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Activity size={16} /> Analyze Skill
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
            
            <div className="mt-8 text-center">
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Or try with a pre-configured example:
              </p>
              <button 
                onClick={() => processSkill("A secure data pipeline that encrypts user logs before storing them in an AWS S3 bucket. It requires read access to local logs and write access to S3.")}
                className="mt-2 text-indigo-600 dark:text-indigo-400 text-sm hover:underline"
              >
                Load "Secure Data Pipeline" Example
              </button>
            </div>
          </div>
        ) : (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Header Info */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
              <div>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 font-mono mb-1">PROJECT: {data.projectId}</p>
                <h2 className="text-3xl font-bold tracking-tight">{data.projectName}</h2>
              </div>
              <button 
                onClick={() => {
                  setData(null);
                  setInputText('');
                }}
                className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 flex items-center gap-1"
              >
                <RefreshCw size={14} /> Analyze Another Skill
              </button>
            </div>

            {/* Dashboard */}
            <Dashboard data={data} />

            {/* Tabs */}
            <div className="flex items-center gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-px">
              <button
                onClick={() => setActiveTab('pipeline')}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'pipeline' 
                    ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' 
                    : 'border-transparent text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100'
                }`}
              >
                <Activity size={16} /> Execution Pipeline
              </button>
              <button
                onClick={() => setActiveTab('vector')}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'vector' 
                    ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' 
                    : 'border-transparent text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100'
                }`}
              >
                <Database size={16} /> Vector Semantics (3D)
              </button>
              <button
                onClick={() => setActiveTab('matrix')}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'matrix' 
                    ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' 
                    : 'border-transparent text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100'
                }`}
              >
                <ShieldAlert size={16} /> Compliance Matrix
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
                  className="grid grid-cols-1 lg:grid-cols-3 gap-6"
                >
                  <div className="lg:col-span-1 border border-zinc-200 dark:border-zinc-800 rounded-xl bg-white dark:bg-zinc-900/50 overflow-hidden flex flex-col h-[600px]">
                    <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900">
                      <h3 className="font-semibold flex items-center gap-2">
                        <Activity size={16} className="text-indigo-500" />
                        Execution Pipeline
                      </h3>
                    </div>
                    <div className="p-4 flex-1 overflow-y-auto">
                      <Flowchart 
                        phases={data.phases} 
                        activePhase={activePhase} 
                        onSelectPhase={setActivePhase} 
                      />
                    </div>
                  </div>

                  <div className="lg:col-span-2 border border-zinc-200 dark:border-zinc-800 rounded-xl bg-white dark:bg-zinc-900/50 overflow-hidden flex flex-col h-[600px]">
                    <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900">
                      <h3 className="font-semibold flex items-center gap-2">
                        <FileCode2 size={16} className="text-indigo-500" />
                        Phase Details & Traceability
                      </h3>
                    </div>
                    <div className="p-6 flex-1 overflow-y-auto">
                      {activePhase && data.phases.find((p: any) => p.id === activePhase) && (
                        <PhaseDetails phase={data.phases.find((p: any) => p.id === activePhase)!} />
                      )}
                    </div>
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
    </div>
  );
}
