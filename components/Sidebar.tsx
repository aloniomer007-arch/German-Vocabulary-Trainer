
import React from 'react';
import { GameState } from '../types';
import { RotateCcw, Undo2, Users, Monitor, ChevronRight } from 'lucide-react';

interface SidebarProps {
  gameState: GameState;
  onReset: () => void;
  onUndo: () => void;
  playMode: 'pvp' | 'pva';
  setPlayMode: (mode: 'pvp' | 'pva') => void;
  isAiThinking: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  gameState, onReset, onUndo, playMode, setPlayMode, isAiThinking 
}) => {
  return (
    <div className="flex flex-col flex-1 space-y-6 overflow-hidden">
      {/* Play Mode Selector */}
      <div className="bg-slate-800/50 p-1 rounded-xl flex">
        <button 
          onClick={() => setPlayMode('pva')}
          className={`flex-1 flex items-center justify-center space-x-2 py-2 rounded-lg transition-all ${playMode === 'pva' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
        >
          <Monitor className="w-4 h-4" />
          <span className="text-sm font-medium">Vs AI</span>
        </button>
        <button 
          onClick={() => setPlayMode('pvp')}
          className={`flex-1 flex items-center justify-center space-x-2 py-2 rounded-lg transition-all ${playMode === 'pvp' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
        >
          <Users className="w-4 h-4" />
          <span className="text-sm font-medium">Friend</span>
        </button>
      </div>

      {/* Game Status Card */}
      <div className="bg-slate-800/50 rounded-2xl p-4 border border-slate-700/50">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Current Turn</span>
          <div className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${gameState.turn === 'w' ? 'bg-white text-black' : 'bg-black text-white border border-slate-700'}`}>
            {gameState.turn === 'w' ? 'White' : 'Black'}
          </div>
        </div>
        
        <div className="space-y-2">
          {gameState.isCheck && !gameState.isCheckmate && (
            <div className="bg-amber-500/20 text-amber-400 text-sm px-3 py-2 rounded-lg flex items-center space-x-2">
              <span className="block w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              <span>Check!</span>
            </div>
          )}
          {isAiThinking && (
            <div className="bg-indigo-500/20 text-indigo-400 text-sm px-3 py-2 rounded-lg flex items-center space-x-2">
              <span className="block w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
              <span>AI is thinking...</span>
            </div>
          )}
        </div>
      </div>

      {/* History */}
      <div className="flex-1 overflow-hidden flex flex-col">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 px-1">Move History</h3>
        <div className="flex-1 bg-slate-800/30 rounded-2xl p-4 border border-slate-700/50 overflow-y-auto font-mono text-sm space-y-1">
          {gameState.history.length === 0 ? (
            <div className="text-slate-600 italic text-center py-4">No moves yet</div>
          ) : (
            <div className="grid grid-cols-2 gap-x-4 gap-y-1">
              {Array.from({ length: Math.ceil(gameState.history.length / 2) }).map((_, i) => (
                <React.Fragment key={i}>
                  <div className="flex items-center space-x-2">
                    <span className="text-slate-600 w-4 text-right">{i + 1}.</span>
                    <span className="text-slate-200">{gameState.history[i * 2]}</span>
                  </div>
                  <div className="text-slate-200">
                    {gameState.history[i * 2 + 1] || ''}
                  </div>
                </React.Fragment>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={onUndo}
          className="flex items-center justify-center space-x-2 px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-colors border border-slate-700"
        >
          <Undo2 className="w-4 h-4" />
          <span className="text-sm font-medium">Undo</span>
        </button>
        <button
          onClick={onReset}
          className="flex items-center justify-center space-x-2 px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-colors border border-slate-700"
        >
          <RotateCcw className="w-4 h-4" />
          <span className="text-sm font-medium">Reset</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
