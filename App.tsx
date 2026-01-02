import React, { useState, useEffect } from 'react';
import { Level, VocabItem, ViewState, UserProgress, QuizSession, LEVEL_TARGETS } from './types';
import { fetchQuizBatch } from './services/geminiService';
import { INITIAL_DATA } from './initialData';
import VocabCard from './components/VocabCard';
import Lexicon from './components/Lexicon';
import TutorChat from './components/TutorChat';
import { 
  BrainCircuit, 
  ArrowRight, 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  Target,
  BarChart3,
  Library as LibraryIcon,
  MessageSquare,
  AlertTriangle,
  Database
} from 'lucide-react';

const STORAGE_KEY = 'deutsch_pro_v3_lexicon';

const App: React.FC = () => {
  const [isInitializing, setIsInitializing] = useState(true);
  const [view, setView] = useState<ViewState>('HOME');
  const [progress, setProgress] = useState<UserProgress>(INITIAL_DATA.progress);

  const [session, setSession] = useState<QuizSession | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [quizSize, setQuizSize] = useState(50);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const initData = async () => {
      try {
        const response = await fetch('/backup.json');
        if (response.ok) {
          const dbData = await response.json();
          if (dbData.progress) {
            setProgress(dbData.progress);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(dbData.progress));
            setIsInitializing(false);
            return;
          }
        }
      } catch (err) {
        console.warn("Database record unavailable, using cache.");
      }

      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        setProgress(JSON.parse(saved));
      }
      setIsInitializing(false);
    };

    initData();
  }, []);

  useEffect(() => {
    if (!isInitializing) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
    }
  }, [progress, isInitializing]);

  const startQuiz = async (level: Level) => {
    setView('LOADING');
    setErrorMessage(null);
    try {
      const excludeWords = [
        ...progress.masteredItems.map(i => i.word),
        ...progress.learningItems.map(i => i.word)
      ];
      
      const batch = await fetchQuizBatch(level, quizSize, excludeWords);
      
      if (!batch || batch.length === 0) {
        throw new Error("Engine returned empty word set.");
      }

      setSession({
        level,
        items: batch,
        results: { mastered: [], toStudy: [] }
      });
      setCurrentIndex(0);
      setView('QUIZ');
    } catch (e: any) {
      setErrorMessage(e.message || "Failed to connect to active vocab engine.");
      setView('HOME');
    }
  };

  const finalizeSession = (mastered: VocabItem[], toStudy: VocabItem[]) => {
    if (!session) return;
    setProgress(prev => {
      const existingMasteredIds = new Set(prev.masteredItems.map(i => i.id));
      const newMastered = mastered.filter(i => !existingMasteredIds.has(i.id));
      const newMasteredIds = new Set(mastered.map(i => i.id));
      const filteredLearning = prev.learningItems.filter(i => !newMasteredIds.has(i.id));
      const currentToStudy = toStudy.filter(i => !newMasteredIds.has(i.id));
      return {
        masteredItems: [...prev.masteredItems, ...newMastered],
        learningItems: [...filteredLearning, ...currentToStudy],
        levelStats: {
          ...prev.levelStats,
          [session.level]: prev.levelStats[session.level] + newMastered.length
        }
      };
    });
    setView('HOME');
  };

  if (isInitializing || view === 'LOADING') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center space-y-6 bg-[#020617]">
        <div className="relative">
          <Loader2 className="w-20 h-20 text-indigo-500 animate-spin" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
            {isInitializing ? <Database className="w-8 h-8 text-white" /> : <BrainCircuit className="w-10 h-10 text-white" />}
          </div>
        </div>
        <div className="text-center animate-pulse">
          <h2 className="text-3xl font-serif font-bold text-white mb-2">
            {isInitializing ? "Connecting Database" : "Building Level"}
          </h2>
          <p className="text-slate-400">
            {isInitializing ? "Hydrating state..." : "Selecting unique items..."}
          </p>
        </div>
      </div>
    );
  }

  if (view === 'CHAT') return <TutorChat masteredWords={progress.masteredItems.map(i => i.word)} onBack={() => setView('HOME')} />;
  if (view === 'LIBRARY') return <Lexicon progress={progress} setProgress={setProgress} onBack={() => setView('HOME')} />;

  if (view === 'QUIZ' && session && session.items.length > 0) {
    const item = session.items[currentIndex];
    const progressPercent = ((currentIndex + 1) / session.items.length) * 100;

    if (!item) {
      setView('HOME');
      return null;
    }

    return (
      <div className="min-h-screen flex flex-col p-4 md:p-8 max-w-5xl mx-auto bg-[#020617]">
        <header className="flex items-center justify-between mb-8 md:mb-16">
          <button onClick={() => setView('HOME')} className="text-slate-500 hover:text-white"><XCircle className="w-6 h-6" /></button>
          <div className="flex-1 max-w-md mx-8">
            <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-indigo-500 transition-all duration-500" style={{ width: `${progressPercent}%` }} />
            </div>
          </div>
          <div className="text-right">
             <span className="block text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Progress</span>
             <span className="font-mono text-white font-bold">{currentIndex + 1} / {session.items.length}</span>
          </div>
        </header>

        <main className="flex-1 flex flex-col items-center justify-center">
          <VocabCard item={item} />
          <div className="mt-16 flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-8 w-full max-w-2xl">
            <button onClick={() => currentIndex < session.items.length - 1 ? (setCurrentIndex(prev => prev + 1), setSession({...session, results: {...session.results, toStudy: [...session.results.toStudy, item]}})) : finalizeSession(session.results.mastered, [...session.results.toStudy, item])} className="flex-1 flex items-center justify-center space-x-4 px-8 py-5 bg-slate-900 border border-red-500/20 hover:border-red-500/50 text-red-400 rounded-3xl transition-all">
              <XCircle className="w-7 h-7" />
              <div className="text-left"><span className="block font-bold">Still Learning</span></div>
            </button>
            <button onClick={() => currentIndex < session.items.length - 1 ? (setCurrentIndex(prev => prev + 1), setSession({...session, results: {...session.results, mastered: [...session.results.mastered, item]}})) : finalizeSession([...session.results.mastered, item], session.results.toStudy)} className="flex-1 flex items-center justify-center space-x-4 px-8 py-5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-3xl shadow-2xl transition-all">
              <CheckCircle2 className="w-7 h-7" />
              <div className="text-left"><span className="block font-bold">Mastered</span></div>
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#020617]">
      <nav className="px-6 py-5 border-b border-slate-800 flex items-center justify-between sticky top-0 bg-[#020617]/80 backdrop-blur-xl z-50">
        <div className="flex items-center space-x-4">
          <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-xl flex items-center justify-center">
            <BrainCircuit className="text-white w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-serif font-bold text-white">DeutschPro</h1>
            <span className="text-[9px] font-bold uppercase tracking-widest text-slate-500">Active Vocab Engine</span>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <button onClick={() => setView('CHAT')} className="flex items-center space-x-2 bg-slate-900/50 px-4 py-2 rounded-xl border border-slate-800 hover:border-indigo-500/30 transition-all">
            <MessageSquare className="w-4 h-4 text-indigo-400" />
            <span className="text-xs font-bold text-slate-300">AI Coach</span>
          </button>
          <button onClick={() => setView('LIBRARY')} className="flex items-center space-x-2 bg-indigo-600 px-4 py-2 rounded-xl text-white hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-600/20">
            <LibraryIcon className="w-4 h-4" />
            <span className="text-xs font-bold">Lexicon ({progress.masteredItems.length})</span>
          </button>
        </div>
      </nav>

      <main className="flex-1 max-w-7xl mx-auto px-6 py-12 w-full">
        {errorMessage && (
          <div className="mb-12 bg-red-500/10 border border-red-500/20 p-4 rounded-2xl flex items-center space-x-4 text-red-400">
            <AlertTriangle className="w-6 h-6" />
            <p className="font-bold text-sm uppercase tracking-widest">{errorMessage}</p>
          </div>
        )}

        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12">
          <header className="max-w-2xl">
            <h2 className="text-5xl font-serif font-bold text-white mb-4">Daily Mastery</h2>
            <p className="text-slate-400 text-lg">Master core German words across all proficiency levels.</p>
          </header>
          
          <div className="mt-6 md:mt-0 flex items-center space-x-4 bg-slate-900 p-2 rounded-2xl border border-slate-800">
             <span className="text-xs font-bold text-slate-500 ml-4 mr-2 uppercase tracking-widest">Session Size</span>
             {[50, 75, 100].map(sz => (
               <button key={sz} onClick={() => setQuizSize(sz)} className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${quizSize === sz ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}>{sz}</button>
             ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
          {['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].map((l) => {
            const mastery = progress.levelStats[l as Level] || 0;
            const target = LEVEL_TARGETS[l as Level];
            const percent = Math.min((mastery / target) * 100, 100);
            return (
              <button key={l} onClick={() => startQuiz(l as Level)} className="group relative text-left bg-slate-900/40 border border-slate-800/60 hover:border-indigo-500/40 p-8 rounded-[40px] transition-all hover:-translate-y-1">
                <div className="flex justify-between items-start mb-16 relative z-10">
                  <span className="text-5xl font-serif font-bold text-indigo-500">{l}</span>
                  <div className="bg-slate-800/80 p-3 rounded-2xl group-hover:bg-indigo-600 text-slate-500 group-hover:text-white transition-all"><Target className="w-5 h-5" /></div>
                </div>
                <div className="space-y-4 relative z-10">
                  <div className="flex justify-between items-end"><h3 className="text-xl font-bold text-white">Words Mastered</h3><span className="text-sm font-mono text-slate-400">{mastery} / {target}</span></div>
                  <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden"><div className="h-full bg-indigo-500 transition-all duration-700" style={{ width: `${percent}%` }} /></div>
                  <div className="flex items-center justify-between pt-4"><div className="flex items-center text-indigo-400 font-bold"><span>Start Batch</span><ArrowRight className="w-4 h-4 ml-2" /></div></div>
                </div>
              </button>
            );
          })}
        </div>

        <section className="relative overflow-hidden bg-indigo-600/5 border border-indigo-500/20 p-8 md:p-12 rounded-[48px] group">
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="max-w-xl text-center md:text-left">
              <h3 className="text-4xl font-serif font-bold text-white mb-4">Practice with your AI Coach</h3>
              <p className="text-slate-400 text-lg mb-8 leading-relaxed">
                Connect with an AI trained on your personal Lexicon. Practice real-world dialogue using exactly the words you've mastered.
              </p>
              <button onClick={() => setView('CHAT')} className="inline-flex items-center space-x-4 bg-indigo-600 hover:bg-indigo-500 text-white px-10 py-5 rounded-3xl font-bold text-lg shadow-2xl transition-all">
                <span>Start Konversation</span>
                <ArrowRight className="w-6 h-6" />
              </button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default App;