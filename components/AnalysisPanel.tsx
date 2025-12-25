
import React from 'react';
import { AIAnalysis } from '../types';
import { Brain, Quote, Target, Lightbulb } from 'lucide-react';

interface AnalysisPanelProps {
  analysis: AIAnalysis | null;
  isAnalyzing: boolean;
  history: string[];
}

const AnalysisPanel: React.FC<AnalysisPanelProps> = ({ analysis, isAnalyzing, history }) => {
  if (isAnalyzing) {
    return (
      <div className="flex flex-col items-center justify-center h-full space-y-4 text-center animate-pulse">
        <div className="p-4 bg-indigo-500/20 rounded-full">
          <Brain className="w-12 h-12 text-indigo-500" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-white">Calculating...</h3>
          <p className="text-slate-400 text-sm max-w-[200px]">
            Gemini is evaluating positional depth and tactical opportunities.
          </p>
        </div>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="flex flex-col items-center justify-center h-full space-y-4 text-center">
        <div className="p-4 bg-slate-800 rounded-full">
          <Brain className="w-12 h-12 text-slate-600" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-slate-400">Position Analysis</h3>
          <p className="text-slate-500 text-sm max-w-[200px]">
            Click "AI Insights" to get tactical advice and positional evaluations.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full space-y-6 animate-in fade-in slide-in-from-right duration-500">
      <div className="flex items-center space-x-2 text-indigo-400">
        <Brain className="w-5 h-5" />
        <span className="text-sm font-bold uppercase tracking-wider">AI Coach Feedback</span>
      </div>

      <div className="space-y-6">
        <section className="bg-slate-800/40 border border-indigo-500/20 rounded-2xl p-5 shadow-sm">
          <div className="flex items-start space-x-3">
            <Quote className="w-6 h-6 text-indigo-500 shrink-0" />
            <div>
              <h4 className="font-bold text-white mb-1">Evaluation</h4>
              <p className="text-slate-300 text-sm leading-relaxed">{analysis.evaluation}</p>
            </div>
          </div>
        </section>

        {analysis.bestMove && (
          <section className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-5">
            <div className="flex items-start space-x-3">
              <Target className="w-6 h-6 text-emerald-500 shrink-0" />
              <div>
                <h4 className="font-bold text-emerald-500 mb-1">Best Move</h4>
                <div className="inline-block bg-emerald-500 text-emerald-950 px-3 py-1 rounded text-lg font-mono font-bold mb-2">
                  {analysis.bestMove}
                </div>
                <p className="text-slate-300 text-sm leading-relaxed">{analysis.suggestion}</p>
              </div>
            </div>
          </section>
        )}

        <section className="bg-slate-800/40 border border-slate-700 rounded-2xl p-5">
          <div className="flex items-start space-x-3">
            <Lightbulb className="w-6 h-6 text-amber-500 shrink-0" />
            <div>
              <h4 className="font-bold text-white mb-1">Coach's Explanation</h4>
              <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">{analysis.explanation}</p>
            </div>
          </div>
        </section>
      </div>

      <div className="mt-auto pt-6">
        <p className="text-[10px] text-slate-600 text-center italic">
          AI analysis is powered by Gemini 3 Pro. Move accuracy may vary.
        </p>
      </div>
    </div>
  );
};

export default AnalysisPanel;
