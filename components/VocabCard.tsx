
import React, { useState, useEffect, useRef } from 'react';
import { VocabItem } from '../types';
import { generateSpeech, decodeBase64, decodeAudioData } from '../services/geminiService';
import { 
  Languages, 
  BookOpen, 
  Quote, 
  Eye, 
  Volume2, 
  Loader2, 
  Sparkles, 
  Mic, 
  CheckCircle,
  AlertCircle,
  Hash
} from 'lucide-react';

interface VocabCardProps {
  item: VocabItem;
}

const VocabCard: React.FC<VocabCardProps> = ({ item }) => {
  // Safety check: if item is missing, don't crash
  if (!item) return null;

  const [showExample, setShowExample] = useState(false);
  const [playingKey, setPlayingKey] = useState<string | null>(null);
  
  // Pronunciation Test State
  const [isRecording, setIsRecording] = useState(false);
  const [testResult, setTestResult] = useState<{ score: number; text: string; status: 'idle' | 'success' | 'warning' | 'error' }>({
    score: 0,
    text: '',
    status: 'idle'
  });
  const recognitionRef = useRef<any>(null);

  // CRITICAL: Reset pronunciation results when switching items
  useEffect(() => {
    setIsRecording(false);
    setTestResult({ score: 0, text: '', status: 'idle' });
    setShowExample(false);
    setPlayingKey(null);
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch(e) {}
    }
  }, [item?.id]);

  const genderColor = {
    der: 'text-blue-400',
    die: 'text-red-400',
    das: 'text-emerald-400',
    none: 'text-slate-400'
  };

  /**
   * Cleans conjugation values to prevent AI hallucinations like "present3rd: isst" 
   * or markdown artifacts like "_hat_getrunken_".
   */
  const sanitizeConjugation = (val?: string) => {
    if (!val) return '—';
    let cleaned = String(val).trim();
    if (cleaned === '' || cleaned === '-' || cleaned === '—' || cleaned === '_') return '—';

    // Remove markdown emphasis (underscores/asterisks)
    cleaned = cleaned.replace(/[_*]/g, '');

    // Remove redundant key prefixes (e.g., "present3rd: isst" -> "isst")
    cleaned = cleaned.replace(/^(present3rd|present|past|pastParticiple|result|conjugation|word|translation|perfekt|präteritum|präsens|infinitive|infinitiv)[:.\s]+/gi, '');
    
    // Remove technical artifacts or error strings
    cleaned = cleaned.replace(/cant find|can't find|unknown|status:|pr\.\.\.|not found|missing|\?\?|connection:|closed/gi, '');
    
    // Remove leading/trailing dots, spaces, or colons
    cleaned = cleaned.replace(/^[.\s:]+/, '').replace(/[.\s:]+$/, '');
    
    // Remove any text inside parentheses (usually explanations the model adds)
    cleaned = cleaned.replace(/\(.*\)/g, '').trim();
    
    return cleaned || '—';
  };

  // Strip article from word if it's already provided in the gender field
  const getDisplayWord = () => {
    if (item.type === 'noun' && item.gender && item.gender !== 'none') {
      const lowerWord = item.word.toLowerCase();
      const article = item.gender.toLowerCase() + ' ';
      if (lowerWord.startsWith(article)) {
        return item.word.substring(article.length);
      }
    }
    return item.word;
  };

  // Helper to fix "die die" redundancy in plural nouns
  const getDisplayPlural = () => {
    if (!item.plural) return 'none';
    const raw = item.plural.trim();
    if (raw.toLowerCase() === 'none' || raw === '-') return 'none';
    
    // If plural already starts with "die", don't add another one
    if (raw.toLowerCase().startsWith('die ')) return raw;
    if (raw.toLowerCase() === 'die') return 'die';
    
    return `die ${raw}`;
  };

  const playPronunciation = async (textToSpeak: string, key: string) => {
    if (playingKey || textToSpeak === '—') return;
    
    let finalSpeechText = textToSpeak;
    if (textToSpeak === item.word && item.type === 'noun' && item.gender && item.gender !== 'none') {
      const display = getDisplayWord();
      finalSpeechText = `${item.gender} ${display}`;
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

  const startPronunciationTest = () => {
    if (isRecording) {
      recognitionRef.current?.stop();
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in this browser.");
      return;
    }

    setIsRecording(true);
    setTestResult({ score: 0, text: '', status: 'idle' });

    const recognition = new SpeechRecognition();
    recognition.lang = 'de-DE';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: any) => {
      const speechToText = event.results[0][0].transcript.toLowerCase().replace(/[.,!?]/g, '');
      const target = getDisplayWord().toLowerCase().replace(/[.,!?]/g, '');
      const confidence = event.results[0][0].confidence;
      
      const isMatch = speechToText.includes(target) || target.includes(speechToText);
      const score = isMatch ? Math.round(confidence * 100) : Math.round(confidence * 40);
      
      let status: 'success' | 'warning' | 'error' = 'error';
      if (score > 85) status = 'success';
      else if (score > 60) status = 'warning';

      setTestResult({
        score,
        text: event.results[0][0].transcript,
        status
      });
    };

    recognition.onerror = () => {
      setIsRecording(false);
      setTestResult(prev => ({ ...prev, status: 'error', text: 'Mic error' }));
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  return (
    <div className="w-full max-w-2xl card-gradient border border-slate-800 rounded-[40px] p-10 shadow-2xl relative overflow-hidden group">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-indigo-500 to-transparent opacity-50" />

      <div className="flex justify-between items-center mb-12">
        <span className="px-4 py-1.5 bg-indigo-500/10 text-indigo-400 text-xs font-bold rounded-full border border-indigo-500/20 tracking-[0.2em] uppercase">
          {item.level} • {item.type}
        </span>
        <div className="flex items-center space-x-3">
          {item.isIrregular && (
            <span className="flex items-center space-x-1 text-amber-500 text-[10px] font-bold uppercase tracking-widest">
              <Sparkles className="w-3 h-3" />
              <span>Starkes Verb</span>
            </span>
          )}
          <button 
            onClick={() => playPronunciation(item.word, 'main')}
            className={`p-2 rounded-full transition-all ${playingKey === 'main' ? 'bg-indigo-500 text-white animate-pulse' : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'}`}
          >
            {playingKey === 'main' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Volume2 className="w-4 h-4" />}
          </button>
          <button 
            onClick={startPronunciationTest}
            className={`p-2 rounded-full transition-all ${isRecording ? 'bg-red-500 text-white animate-pulse' : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'}`}
            title="Practice Pronunciation"
          >
            <Mic className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="text-center mb-12">
        <div className="flex items-center justify-center space-x-4 mb-4">
          {item.type === 'noun' && item.gender && (
             <span className={`text-3xl font-serif italic opacity-40 ${genderColor[item.gender]}`}>
               {item.gender}
             </span>
          )}
          <h2 className="text-6xl md:text-7xl font-serif font-bold text-white tracking-tight leading-none">
            {getDisplayWord()}
          </h2>
        </div>
        <p className="text-2xl text-slate-400 flex items-center justify-center space-x-3">
          <Languages className="w-6 h-6 opacity-30" />
          <span>{item.translation}</span>
        </p>

        {(isRecording || testResult.status !== 'idle') && (
          <div className="mt-8 animate-in fade-in slide-in-from-top-4 duration-300">
            <div className={`inline-flex items-center space-x-4 px-6 py-3 rounded-2xl border ${
              isRecording ? 'bg-slate-900 border-indigo-500/30' : 
              testResult.status === 'success' ? 'bg-emerald-500/10 border-emerald-500/30' :
              testResult.status === 'warning' ? 'bg-amber-500/10 border-amber-500/30' : 'bg-red-500/10 border-red-500/30'
            }`}>
              {isRecording ? (
                <>
                  <div className="flex space-x-1 items-end h-4">
                    <div className="w-1 bg-indigo-500 animate-[bounce_0.6s_infinite]" />
                    <div className="w-1 bg-indigo-500 animate-[bounce_0.8s_infinite]" />
                    <div className="w-1 bg-indigo-500 animate-[bounce_0.5s_infinite]" />
                    <div className="w-1 bg-indigo-500 animate-[bounce_0.7s_infinite]" />
                  </div>
                  <span className="text-xs font-bold text-indigo-400 uppercase tracking-widest">Listening...</span>
                </>
              ) : (
                <>
                  {testResult.status === 'success' ? <CheckCircle className="w-4 h-4 text-emerald-500" /> : <AlertCircle className="w-4 h-4 text-amber-500" />}
                  <div className="flex flex-col items-start text-left">
                    <span className={`text-[10px] font-bold uppercase tracking-widest ${
                      testResult.status === 'success' ? 'text-emerald-500' : 'text-amber-500'
                    }`}>
                      Accuracy: {testResult.score}%
                    </span>
                    <span className="text-xs text-slate-400">Heard: "{testResult.text || '...'}"</span>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 mb-12">
        {item.type === 'noun' && item.plural && (
          <div className="bg-white/5 p-6 rounded-3xl border border-white/5 backdrop-blur-sm flex justify-between items-center">
            <div>
              <h4 className="text-slate-500 text-[10px] font-bold uppercase mb-2 tracking-widest">Pluralform</h4>
              <p className="text-white text-xl font-medium">
                {getDisplayPlural()}
              </p>
            </div>
            {getDisplayPlural() !== 'none' && (
              <button 
                onClick={() => playPronunciation(getDisplayPlural(), 'plural')}
                className={`p-2 rounded-xl transition-all ${playingKey === 'plural' ? 'bg-indigo-500 text-white' : 'bg-slate-800/50 text-slate-500 hover:text-white'}`}
              >
                {playingKey === 'plural' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Volume2 className="w-4 h-4" />}
              </button>
            )}
          </div>
        )}

        {item.type === 'preposition' && item.cases && item.cases.length > 0 && (
          <div className="bg-white/5 p-6 rounded-3xl border border-white/5 backdrop-blur-sm">
            <h4 className="text-slate-500 text-[10px] font-bold uppercase mb-4 tracking-widest text-center">Grammatischer Kasus</h4>
            <div className="flex flex-wrap justify-center gap-3">
              {item.cases.map((kasus, idx) => (
                <div key={idx} className="flex items-center space-x-2 bg-indigo-500/10 border border-indigo-500/20 px-4 py-2 rounded-xl">
                  <Hash className="w-3 h-3 text-indigo-400" />
                  <span className="text-sm font-bold text-indigo-300">{kasus}</span>
                </div>
              ))}
            </div>
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
              ].map((c) => {
                const cleanVal = sanitizeConjugation(c.val);
                return (
                  <button 
                    key={c.key}
                    disabled={cleanVal === '—'}
                    onClick={() => playPronunciation(cleanVal, c.key)}
                    className={`text-center group/conj p-2 rounded-2xl transition-all ${playingKey === c.key ? 'bg-indigo-500/20' : cleanVal === '—' ? 'opacity-40 cursor-default' : 'hover:bg-white/5'}`}
                  >
                    <div className="text-[9px] text-slate-500 uppercase mb-2 group-hover/conj:text-indigo-400 transition-colors">{c.label}</div>
                    <div className="text-sm font-bold text-white truncate flex items-center justify-center space-x-1">
                      <span>{cleanVal}</span>
                      {playingKey === c.key ? (
                        <Loader2 className="w-3 h-3 animate-spin text-indigo-400" />
                      ) : (
                        cleanVal !== '—' && <Volume2 className="w-3 h-3 opacity-0 group-hover/conj:opacity-100 text-indigo-400 transition-opacity" />
                      )}
                    </div>
                  </button>
                );
              })}
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
