
import React, { useState, useMemo, useEffect } from 'react';
import { VocabItem, UserProgress, Level } from '../types';
import { 
  ChevronLeft, 
  Search, 
  CheckCircle2, 
  Clock, 
  History, 
  Volume2, 
  Trash2, 
  BookOpen,
  Loader2,
  PlayCircle,
  X,
  Zap,
  RotateCcw,
  Plus,
  Sparkles,
  Info,
  AlertCircle
} from 'lucide-react';
import { generateSpeech, decodeBase64, decodeAudioData, fetchWordDetails } from '../services/geminiService';
import VocabCard from './VocabCard';

interface LexiconProps {
  progress: UserProgress;
  setProgress: React.Dispatch<React.SetStateAction<UserProgress>>;
  onBack: () => void;
}

const Lexicon: React.FC<LexiconProps> = ({ progress, setProgress, onBack }) => {
  const [tab, setTab] = useState<'MASTERED' | 'LEARNING' | 'ALL'>('ALL');
  const [search, setSearch] = useState('');
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<VocabItem | null>(null);
  
  // Add Word State
  const [isAddingWord, setIsAddingWord] = useState(false);
  const [newWordInput, setNewWordInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  // Review Session State
  const [isReviewing, setIsReviewing] = useState(false);
  const [reviewItems, setReviewItems] = useState<VocabItem[]>([]);
  const [reviewIndex, setReviewIndex] = useState(0);

  const list = useMemo(() => {
    let items: VocabItem[] = [];
    if (tab === 'MASTERED') items = progress.masteredItems;
    else if (tab === 'LEARNING') items = progress.learningItems;
    else {
      const combined = [...progress.masteredItems, ...progress.learningItems];
      const seen = new Set();
      items = combined.filter(el => {
        const duplicate = seen.has(el.id);
        seen.add(el.id);
        return !duplicate;
      });
    }

    if (!search) return items;
    return items.filter(i => 
      i.word.toLowerCase().includes(search.toLowerCase()) || 
      i.translation.toLowerCase().includes(search.toLowerCase())
    );
  }, [tab, progress.masteredItems, progress.learningItems, search]);

  const handleAddWord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWordInput.trim() || isGenerating) return;

    setIsGenerating(true);
    setAddError(null);
    try {
      const details = await fetchWordDetails(newWordInput.trim());
      if (details) {
        if (!details.exists) {
          setAddError("No such word exists in German");
          setIsGenerating(false);
          return;
        }

        setProgress(prev => {
          const exists = [...prev.masteredItems, ...prev.learningItems].some(i => 
            i.word.toLowerCase() === details.word.toLowerCase() && 
            i.type === details.type
          );
          
          if (exists) {
            setAddError(`This ${details.type} is already in your lexicon.`);
            return prev;
          }

          const newStats = { ...prev.levelStats };
          newStats[details.level] = (newStats[details.level] || 0) + 1;

          return {
            ...prev,
            levelStats: newStats,
            masteredItems: [details, ...prev.masteredItems]
          };
        });

        // Close modal only if successful
        if (!progress.masteredItems.some(i => i.word.toLowerCase() === details.word.toLowerCase() && i.type === details.type)) {
          setNewWordInput('');
          setIsAddingWord(false);
        }
      } else {
        setAddError("Could not connect to Philologist. Please try again.");
      }
    } catch (err) {
      console.error(err);
      setAddError("An error occurred while adding the word.");
    } finally {
      setIsGenerating(false);
    }
  };

  const startReview = () => {
    if (list.length === 0) return;
    const shuffled = [...list].sort(() => Math.random() - 0.5);
    setReviewItems(shuffled);
    setReviewIndex(0);
    setIsReviewing(true);
  };

  const handleReviewAction = (item: VocabItem, correct: boolean) => {
    setProgress(prev => {
      const isAlreadyInMastered = prev.masteredItems.some(i => i.id === item.id);
      const isAlreadyInLearning = prev.learningItems.some(i => i.id === item.id);
      const newStats = { ...prev.levelStats };

      if (correct) {
        if (isAlreadyInMastered) {
          return {
            ...prev,
            learningItems: prev.learningItems.filter(i => i.id !== item.id)
          };
        }
        newStats[item.level] = (newStats[item.level] || 0) + 1;
        return {
          ...prev,
          levelStats: newStats,
          learningItems: prev.learningItems.filter(i => i.id !== item.id),
          masteredItems: [item, ...prev.masteredItems]
        };
      } else {
        if (isAlreadyInMastered) {
          newStats[item.level] = Math.max(0, (newStats[item.level] || 0) - 1);
        }
        if (isAlreadyInLearning) {
          return {
            ...prev,
            levelStats: newStats,
            masteredItems: prev.masteredItems.filter(i => i.id !== item.id)
          };
        }
        return {
          ...prev,
          levelStats: newStats,
          masteredItems: prev.masteredItems.filter(i => i.id !== item.id),
          learningItems: [item, ...prev.learningItems]
        };
      }
    });

    if (reviewIndex < reviewItems.length - 1) {
      setReviewIndex(prev => prev + 1);
    } else {
      setIsReviewing(false);
    }
  };

  const playPronunciation = async (e: React.MouseEvent, word: string, id: string) => {
    e.stopPropagation();
    if (playingId) return;
    setPlayingId(id);
    try {
      const base64Audio = await generateSpeech(word);
      if (base64Audio) {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        const bytes = decodeBase64(base64Audio);
        const audioBuffer = await decodeAudioData(bytes, audioContext);
        const source = audioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioContext.destination);
        source.onended = () => setPlayingId(null);
        source.start();
      } else {
        setPlayingId(null);
      }
    } catch (e) {
      console.error(e);
      setPlayingId(null);
    }
  };

  const toggleMastery = (e: React.MouseEvent, item: VocabItem) => {
    e.stopPropagation();
    const isMastered = progress.masteredItems.some(i => i.id === item.id);
    setProgress(prev => {
      const newStats = { ...prev.levelStats };
      if (isMastered) {
        newStats[item.level] = Math.max(0, (newStats[item.level] || 0) - 1);
        return {
          ...prev,
          levelStats: newStats,
          masteredItems: prev.masteredItems.filter(i => i.id !== item.id),
          learningItems: [item, ...prev.learningItems]
        };
      } else {
        newStats[item.level] = (newStats[item.level] || 0) + 1;
        return {
          ...prev,
          levelStats: newStats,
          learningItems: prev.learningItems.filter(i => i.id !== item.id),
          masteredItems: [item, ...prev.masteredItems]
        };
      }
    });
  };

  const deleteItem = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const itemToDelete = [...progress.masteredItems, ...progress.learningItems].find(i => i.id === id);
    setProgress(prev => {
      const newStats = { ...prev.levelStats };
      if (itemToDelete && prev.masteredItems.some(i => i.id === id)) {
        newStats[itemToDelete.level] = Math.max(0, (newStats[itemToDelete.level] || 0) - 1);
      }
      return {
        ...prev,
        levelStats: newStats,
        masteredItems: prev.masteredItems.filter(i => i.id !== id),
        learningItems: prev.learningItems.filter(i => i.id !== id)
      };
    });
  };

  return (
    <div className="min-h-screen bg-[#020617] text-white flex flex-col relative">
      {/* Word Preview Modal */}
      {selectedItem && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-[#020617]/90 backdrop-blur-xl animate-in fade-in duration-300"
          onClick={() => setSelectedItem(null)}
        >
          <div 
            className="w-full max-w-2xl relative"
            onClick={e => e.stopPropagation()}
          >
            <button 
              onClick={() => setSelectedItem(null)}
              className="absolute -top-12 right-0 text-slate-500 hover:text-white transition-all bg-slate-900 p-2 rounded-full border border-slate-800"
            >
              <X className="w-6 h-6" />
            </button>
            <VocabCard item={selectedItem} />
          </div>
        </div>
      )}

      {/* Add Word Modal */}
      {isAddingWord && (
        <div 
          className="fixed inset-0 z-[101] flex items-center justify-center p-6 bg-[#020617]/95 backdrop-blur-2xl animate-in fade-in zoom-in-95 duration-200"
          onClick={() => !isGenerating && setIsAddingWord(false)}
        >
          <div 
            className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-[32px] p-8 shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-serif font-bold text-white">Add New Word</h3>
              {!isGenerating && (
                <button onClick={() => setIsAddingWord(false)} className="text-slate-500 hover:text-white">
                  <X className="w-6 h-6" />
                </button>
              )}
            </div>
            
            <form onSubmit={handleAddWord} className="space-y-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2 ml-1">German Word</label>
                  <input 
                    autoFocus
                    type="text"
                    placeholder="e.g. Herausforderung"
                    value={newWordInput}
                    onChange={e => {
                      setNewWordInput(e.target.value);
                      if (addError) setAddError(null);
                    }}
                    disabled={isGenerating}
                    className={`w-full bg-slate-800 border rounded-2xl py-4 px-6 focus:outline-none transition-all text-lg font-serif ${addError ? 'border-red-500/50 focus:border-red-500' : 'border-slate-700 focus:border-indigo-500'}`}
                  />
                  {addError && (
                    <div className="flex items-center space-x-2 mt-3 text-red-400 animate-in slide-in-from-top-2">
                      <AlertCircle className="w-4 h-4" />
                      <span className="text-xs font-bold uppercase tracking-widest">{addError}</span>
                    </div>
                  )}
                </div>
                
                <div className="bg-indigo-500/5 border border-indigo-500/20 p-4 rounded-2xl flex items-start space-x-3">
                  <Info className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    <span className="font-bold text-indigo-300">Tip:</span> For ambiguous words, add context in parentheses. 
                    Example: <code className="text-white">Essen (food)</code> vs <code className="text-white">Essen (to eat)</code>.
                  </p>
                </div>
              </div>

              {isGenerating ? (
                <div className="flex flex-col items-center justify-center py-6 space-y-4">
                  <div className="relative">
                    <Loader2 className="w-12 h-12 text-indigo-500 animate-spin" />
                    <Sparkles className="w-5 h-5 text-indigo-300 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                  </div>
                  <p className="text-slate-400 text-sm animate-pulse">AI Philologist is analyzing grammar...</p>
                </div>
              ) : (
                <button 
                  type="submit"
                  disabled={!newWordInput.trim()}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 text-white py-4 rounded-2xl font-bold flex items-center justify-center space-x-2 transition-all shadow-lg shadow-indigo-600/20"
                >
                  <Plus className="w-5 h-5" />
                  <span>Generate & Add to Mastered</span>
                </button>
              )}
            </form>
          </div>
        </div>
      )}

      {/* Main Lexicon Header and List code (remains identical to previous) */}
      <header className="px-6 py-8 border-b border-slate-800 bg-[#020617]/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <button onClick={onBack} className="flex items-center space-x-2 text-slate-400 hover:text-white transition-all group">
              <ChevronLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
              <span className="font-bold uppercase tracking-widest text-xs">Back to Dashboard</span>
            </button>
            
            <div className="flex items-center space-x-3">
              <button 
                onClick={() => setIsAddingWord(true)}
                className="flex items-center space-x-2 bg-slate-900 border border-slate-800 hover:border-indigo-500/50 text-slate-200 px-6 py-2 rounded-xl font-bold text-sm transition-all"
              >
                <Plus className="w-4 h-4 text-indigo-400" />
                <span>Add Word</span>
              </button>
              <button 
                onClick={startReview}
                disabled={list.length === 0}
                className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 disabled:hover:bg-indigo-600 text-white px-6 py-2 rounded-xl font-bold text-sm shadow-lg shadow-indigo-600/20 transition-all"
              >
                <PlayCircle className="w-4 h-4" />
                <span>Practice Pool</span>
              </button>
            </div>
          </div>

          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
             <div>
                <h2 className="text-4xl font-serif font-bold mb-2">My Lexicon</h2>
                <p className="text-slate-500 text-sm">Reviewing your personal vocabulary collection. Click any word to see its full flashcard.</p>
             </div>
             <div className="flex items-center space-x-2 bg-indigo-500/10 px-4 py-1.5 rounded-full border border-indigo-500/20">
                <BookOpen className="w-4 h-4 text-indigo-400" />
                <span className="text-xs font-bold text-indigo-300 uppercase tracking-widest">
                  {list.length} Words in Pool
                </span>
              </div>
          </div>

          <div className="flex flex-col md:flex-row md:items-center space-y-4 md:space-y-0 md:space-x-4">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
              <input 
                type="text"
                placeholder="Search word or translation..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:border-indigo-500/50 transition-all placeholder-slate-600"
              />
            </div>
            
            <div className="flex bg-slate-900 p-1.5 rounded-2xl border border-slate-800">
              <button 
                onClick={() => setTab('ALL')}
                className={`flex items-center space-x-2 px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${tab === 'ALL' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
              >
                <History className="w-4 h-4" />
                <span>All</span>
              </button>
              <button 
                onClick={() => setTab('MASTERED')}
                className={`flex items-center space-x-2 px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${tab === 'MASTERED' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Mastered</span>
              </button>
              <button 
                onClick={() => setTab('LEARNING')}
                className={`flex items-center space-x-2 px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${tab === 'LEARNING' ? 'bg-red-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
              >
                <Clock className="w-4 h-4" />
                <span>Learning</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 p-6 overflow-y-auto">
        <div className="max-w-7xl mx-auto">
          {list.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-600">
              <RotateCcw className="w-16 h-16 mb-4 opacity-20" />
              <p className="text-xl font-medium">No words to display</p>
              <p className="text-sm">Try adding a new word manually!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {list.map(item => {
                const isMastered = progress.masteredItems.some(i => i.id === item.id);
                return (
                  <div 
                    key={item.id} 
                    onClick={() => setSelectedItem(item)}
                    className="group bg-slate-900/40 border border-slate-800/60 p-6 rounded-[32px] hover:border-slate-700 transition-all flex flex-col justify-between relative overflow-hidden cursor-pointer"
                  >
                    <div className={`absolute top-0 left-0 w-1 h-full ${isMastered ? 'bg-emerald-500' : 'bg-red-500'}`} />
                    
                    <div>
                      <div className="flex justify-between items-start mb-4">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                          {item.level} • {item.type}
                        </span>
                        <div className="flex items-center space-x-2">
                          <button 
                            onClick={(e) => playPronunciation(e, item.word, item.id)}
                            className={`p-2 rounded-full transition-all ${playingId === item.id ? 'bg-indigo-500 text-white' : 'hover:bg-slate-800 text-slate-400'}`}
                          >
                            {playingId === item.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Volume2 className="w-3 h-3" />}
                          </button>
                          <button 
                            onClick={(e) => toggleMastery(e, item)}
                            title={isMastered ? "Move to Learning" : "Mark as Mastered"}
                            className={`p-2 rounded-full transition-all ${isMastered ? 'text-emerald-500 hover:bg-emerald-500/10' : 'text-slate-500 hover:bg-slate-800'}`}
                          >
                            <CheckCircle2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <h3 className="text-2xl font-serif font-bold text-white mb-1 group-hover:text-indigo-400 transition-colors">
                        {item.word}
                      </h3>
                      <p className="text-slate-400 text-sm mb-6">{item.translation}</p>
                    </div>

                    <div className="flex items-center justify-between border-t border-slate-800/50 pt-4">
                      <div className="flex items-center space-x-2 text-[10px] font-bold text-slate-600 uppercase tracking-widest">
                        {isMastered ? (
                          <span className="flex items-center text-emerald-500">
                             <CheckCircle2 className="w-3 h-3 mr-1" /> Mastered
                          </span>
                        ) : (
                          <span className="flex items-center text-red-500">
                             <Clock className="w-3 h-3 mr-1" /> To Review
                          </span>
                        )}
                      </div>
                      <button 
                        onClick={(e) => deleteItem(e, item.id)}
                        className="p-2 text-slate-700 hover:text-red-500 transition-all opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Lexicon;
