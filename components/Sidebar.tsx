
import React from 'react';
import { GameState, AIAnalysis } from '../types';
import { 
  RotateCcw, 
  Undo2, 
  Users, 
  Monitor, 
  Activity, 
  History,
  TrendingUp,
  BrainCircuit
} from 'lucide-react';

interface SidebarProps {
  gameState: GameState;
  onReset: () => void;
  onUndo: () => void;
  playMode: 'pvp' | 'pva';
  setPlayMode: (mode: 'pvp' | 'pva') => void;
  isAiThinking: boolean;
  aiAnalysis: AIAnalysis | null;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  gameState, onReset, onUndo, playMode, setPlayMode, isAiThinking, aiAnalysis
}) => {
  return (
    <div className="flex flex-col w-full flex-1 space-y-6 lg:max-h-[80vh]">
      {/* Mode Switcher */}
      <div className="bg-slate-900/50 p-1.5 rounded-2xl flex border border-slate-800">
        <button 
          onClick={() => setPlayMode('pva')}
          className={`flex-1 flex items-center justify-center space-x-2 py-3 rounded-xl transition-all ${playMode === 'pva' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}
        >
          <Monitor className="w-4 h-4" />
          <span className="text-xs font-bold uppercase tracking-widest">Vs Gemini</span>
        </button>
        <button 
          onClick={() => setPlayMode('pvp')}
          className={`flex-1 flex items-center justify-center space-x-2 py-3 rounded-xl transition-all ${playMode === 'pvp' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}
        >
          <Users className="w-4 h-4" />
          <span className="text-xs font-bold uppercase tracking-widest">Vs Friend</span>
        </button>
      </div>

      {/* Live Status */}
      <div className="bg-slate-900/40 rounded-[32px] p-6 border border-slate-800/60">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-2">
            <Activity className="w-4 h-4 text-slate-500" />
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Live Status</span>
          </div>
          <div className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${gameState.turn === 'w' ? 'bg-white text-black' : 'bg-slate-800 text-white border border-slate-700'}`}>
            {gameState.turn === 'w' ? 'White Move' : 'Black Move'}
          </div>
        </div>

        <div className="space-y-4">
          {gameState.isCheck && (
            <div className="flex items-center space-x-3 text-red-400 bg-red-500/10 p-4 rounded-2xl border border-red-500/20 animate-pulse">
              <span className="w-2 h-2 rounded-full bg-red-500" />
              <span className="text-sm font-bold uppercase tracking-widest">Check!</span>
            </div>
          )}
          
          {isAiThinking ? (
             <div className="flex items-center space-x-3 text-indigo-400 bg-indigo-500/10 p-4 rounded-2xl border border-indigo-500/20">
               <BrainCircuit className="w-5 h-5 animate-spin" />
               <span className="text-sm font-bold uppercase tracking-widest">Gemini is thinking...</span>
             </div>
          ) : aiAnalysis && (
            <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-2xl border border-slate-700/50">
               <div className="flex items-center space-x-3">
                 <TrendingUp className="w-4 h-4 text-emerald-400" />
                 <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Evaluation</span>
               </div>
               <span className="text-sm font-mono font-bold text-white">{aiAnalysis.evaluation}</span>
            </div>
          )}
        </div>
      </div>

      {/* Move History */}
      <div className="flex-1 min-h-[200px] flex flex-col bg-slate-900/40 rounded-[32px] border border-slate-800/60 p-6 overflow-hidden">
        <div className="flex items-center space-x-2 mb-4">
          <History className="w-4 h-4 text-slate-500" />
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Notation History</span>
        </div>
        
        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
          {gameState.history.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center opacity-20">
               <Activity className="w-12 h-12 mb-2" />
               <span className="text-xs font-bold uppercase">No moves logged</span>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-x-6 gap-y-3">
              {Array.from({ length: Math.ceil(gameState.history.length / 2) }).map((_, i) => (
                <React.Fragment key={i}>
                  <div className="flex items-center justify-between group">
                    <span className="text-[10px] font-mono text-slate-600 w-4">{i + 1}.</span>
                    <span className="flex-1 text-sm font-mono font-bold text-indigo-300 ml-2">{gameState.history[i * 2]}</span>
                  </div>
                  <div className="text-sm font-mono font-bold text-slate-400">
                    {gameState.history[i * 2 + 1] || ''}
                  </div>
                </React.Fragment>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-4 pt-4">
        <button 
          onClick={onUndo}
          className="flex items-center justify-center space-x-3 py-4 bg-slate-900 border border-slate-800 hover:border-slate-600 text-slate-400 hover:text-white rounded-2xl transition-all"
        >
          <Undo2 className="w-5 h-5" />
          <span className="text-xs font-bold uppercase tracking-widest">Undo</span>
        </button>
        <button 
          onClick={onReset}
          className="flex items-center justify-center space-x-3 py-4 bg-slate-900 border border-slate-800 hover:border-indigo-500/50 text-slate-400 hover:text-white rounded-2xl transition-all"
        >
          <RotateCcw className="w-5 h-5" />
          <span className="text-xs font-bold uppercase tracking-widest">Reset</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
