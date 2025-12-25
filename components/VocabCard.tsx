
import React, { useState } from 'react';
import { VocabItem } from '../types';
import { generateSpeech, decodeBase64, decodeAudioData } from '../services/geminiService';
import { Languages, BookOpen, Quote, Eye, Volume2, Loader2, Sparkles } from 'lucide-react';

interface VocabCardProps {
  item: VocabItem;
}

const VocabCard: React.FC<VocabCardProps> = ({ item }) => {
  const [showExample, setShowExample] = useState(false);
  const [playingKey, setPlayingKey] = useState<string | null>(null);

  const genderColor = {
    der: 'text-blue-400',
    die: 'text-red-400',
    das: 'text-emerald-400',
    none: 'text-slate-400'
  };

  const sanitizeConjugation = (val?: string) => {
    if (!val || val.trim() === '' || val === '-') return '—';
    let cleaned = val.replace(/cant find|can't find|unknown|status:|pr\.\.\.|not found|missing|\?\?/gi, '');
    cleaned = cleaned.replace(/\(.*\)/g, '').trim();
    const isError = /^(cant|can't|find|unknown|not|found|missing)$/i.test(cleaned);
    return (cleaned && !isError) ? cleaned : '—';
  };

  const playPronunciation = async (textToSpeak: string, key: string) => {
    if (playingKey) return;
    
    // Auto-include article for main word if it's a noun
    let finalSpeechText = textToSpeak;
    if (textToSpeak === item.word && item.type === 'noun' && item.gender && item.gender !== 'none') {
      finalSpeechText = `${item.gender} ${item.word}`;
    }

    setPlayingKey(key);
    try {
      const base64Audio = await generateSpeech(finalSpeechText);
      if (base64Audio) {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        const bytes = decodeBase64(base64Audio);
        const audioBuffer = await decodeAudioData(bytes, audioContext);
        
        const source = audioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioContext.destination);
        source.onended = () => setPlayingKey(null);
        source.start();
      } else {
        setPlayingKey(null);
      }
    } catch (e) {
      console.error("Playback failed", e);
      setPlayingKey(null);
    }
  };

  return (
    <div className="w-full max-w-2xl card-gradient border border-slate-800 rounded-[40px] p-10 shadow-2xl relative overflow-hidden group">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-indigo-500 to-transparent opacity-50" />

      <div className="flex justify-between items-center mb-12">
        <span className="px-4 py-1.5 bg-indigo-500/10 text-indigo-400 text-xs font-bold rounded-full border border-indigo-500/20 tracking-[0.2em] uppercase">
          {item.level} • {item.type}
        </span>
        <div className="flex items-center space-x-4">
          {item.isIrregular && (
            <span className="flex items-center space-x-1 text-amber-500 text-[10px] font-bold uppercase tracking-widest">
              <Sparkles className="w-3 h-3" />
              <span>Starkes Verb</span>
            </span>
          )}
          <button 
            onClick={() => playPronunciation(item.word, 'main')}
            className={`p-2 rounded-full transition-all ${playingKey === 'main' ? 'bg-indigo-500 text-white animate-pulse' : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'}`}
            title="Listen to word"
          >
            {playingKey === 'main' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Volume2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <div className="text-center mb-16">
        <div className="flex items-center justify-center space-x-4 mb-4">
          {item.type === 'noun' && item.gender && (
             <span className={`text-3xl font-serif italic opacity-40 ${genderColor[item.gender]}`}>
               {item.gender}
             </span>
          )}
          <h2 className="text-6xl md:text-7xl font-serif font-bold text-white tracking-tight leading-none">
            {item.word}
          </h2>
        </div>
        <p className="text-2xl text-slate-400 flex items-center justify-center space-x-3">
          <Languages className="w-6 h-6 opacity-30" />
          <span>{item.translation}</span>
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 mb-12">
        {item.type === 'noun' && item.plural && (
          <div className="bg-white/5 p-6 rounded-3xl border border-white/5 backdrop-blur-sm flex justify-between items-center">
            <div>
              <h4 className="text-slate-500 text-[10px] font-bold uppercase mb-2 tracking-widest">Pluralform</h4>
              <p className="text-white text-xl font-medium">
                {item.plural.toLowerCase() === 'none' ? 'none' : `die ${item.plural}`}
              </p>
            </div>
            {item.plural.toLowerCase() !== 'none' && (
              <button 
                onClick={() => playPronunciation(`die ${item.plural}`, 'plural')}
                className={`p-2 rounded-xl transition-all ${playingKey === 'plural' ? 'bg-indigo-500 text-white' : 'bg-slate-800/50 text-slate-500 hover:text-white'}`}
              >
                {playingKey === 'plural' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Volume2 className="w-4 h-4" />}
              </button>
            )}
          </div>
        )}

        {item.type === 'verb' && item.conjugation && (
          <div className="bg-white/5 p-6 rounded-[32px] border border-white/5 backdrop-blur-sm">
            <h4 className="text-slate-500 text-[10px] font-bold uppercase mb-6 tracking-widest text-center">Verb Konjugation</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Infinitiv', val: item.word, key: 'v1' },
                { label: 'Präsens', val: item.conjugation.present3rd, key: 'v2' },
                { label: 'Präteritum', val: item.conjugation.past, key: 'v3' },
                { label: 'Perfekt', val: item.conjugation.pastParticiple, key: 'v4' }
              ].map((c) => (
                <button 
                  key={c.key}
                  onClick={() => playPronunciation(c.val, c.key)}
                  className={`text-center group/conj p-2 rounded-2xl transition-all ${playingKey === c.key ? 'bg-indigo-500/20' : 'hover:bg-white/5'}`}
                >
                  <div className="text-[9px] text-slate-500 uppercase mb-2 group-hover/conj:text-indigo-400 transition-colors">{c.label}</div>
                  <div className="text-sm font-bold text-white truncate flex items-center justify-center space-x-1">
                    <span>{sanitizeConjugation(c.val)}</span>
                    {playingKey === c.key ? <Loader2 className="w-3 h-3 animate-spin text-indigo-400" /> : <Volume2 className="w-3 h-3 opacity-0 group-hover/conj:opacity-100 text-indigo-400 transition-opacity" />}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="relative pt-8 border-t border-white/5">
        <div className="flex items-center justify-between mb-4">
          <button 
            onClick={() => setShowExample(!showExample)}
            className="flex items-center space-x-2 text-slate-500 hover:text-white transition-colors text-xs font-bold uppercase tracking-widest"
          >
            <BookOpen className="w-4 h-4" />
            <span>Context Usage</span>
            <Eye className={`w-3 h-3 transition-transform ${showExample ? 'rotate-180' : ''}`} />
          </button>
          {showExample && (
            <button 
              onClick={() => playPronunciation(item.example, 'example')}
              className={`flex items-center space-x-2 px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${playingKey === 'example' ? 'bg-indigo-500 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}
            >
              {playingKey === 'example' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Volume2 className="w-3 h-3" />}
              <span>Play Sentence</span>
            </button>
          )}
        </div>

        <div className={`space-y-4 transition-all duration-500 overflow-hidden ${showExample ? 'max-h-60 opacity-100' : 'max-h-0 opacity-0'}`}>
          <div className="flex items-start space-x-3">
            <Quote className="w-6 h-6 text-indigo-500/50 shrink-0" />
            <p className="text-xl text-slate-200 font-serif italic leading-relaxed">
              {item.example}
            </p>
          </div>
          <p className="text-sm text-slate-500 pl-9 leading-relaxed">
            {item.exampleTranslation}
          </p>
        </div>
      </div>
    </div>
  );
};

export default VocabCard;
