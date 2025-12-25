
import React, { useState, useEffect, useRef } from 'react';
import { createTutorChat, generateSpeech, decodeBase64, decodeAudioData } from '../services/geminiService';
import { ChatMessage } from '../types';
import { 
  Send, 
  ChevronLeft, 
  Bot, 
  User, 
  Loader2, 
  Sparkles,
  RefreshCcw,
  Trash2,
  Volume2
} from 'lucide-react';

const CHAT_STORAGE_KEY = 'deutsch_pro_v3_chat_history';

interface TutorChatProps {
  masteredWords: string[];
  onBack: () => void;
}

const TutorChat: React.FC<TutorChatProps> = ({ masteredWords, onBack }) => {
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const saved = localStorage.getItem(CHAT_STORAGE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Failed to parse chat history", e);
      }
    }
    return [
      {
        role: 'model',
        text: "Hallo! Ich bin dein DeutschPro Coach. Lass uns sprechen! Ich benutze nur die Wörter, die du schon gelernt hast. Wie geht es dir heute?",
        timestamp: Date.now()
      }
    ];
  });

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [playingIndex, setPlayingIndex] = useState<number | null>(null);
  const [chatSession, setChatSession] = useState<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const initChat = async () => {
      const session = await createTutorChat(masteredWords, messages);
      setChatSession(session);
    };
    initChat();
  }, [masteredWords]);

  useEffect(() => {
    localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages));
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const resetChat = async () => {
    if (!window.confirm("Do you want to clear your conversation history?")) return;
    const initialGreeting: ChatMessage = {
      role: 'model',
      text: "Hallo! Lass uns neu anfangen. Wie kann ich dir heute mit deinem Deutsch helfen?",
      timestamp: Date.now()
    };
    setMessages([initialGreeting]);
    const session = await createTutorChat(masteredWords, []);
    setChatSession(session);
  };

  const playMessage = async (text: string, index: number) => {
    if (playingIndex !== null) return;
    setPlayingIndex(index);
    try {
      const base64Audio = await generateSpeech(text);
      if (base64Audio) {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        const bytes = decodeBase64(base64Audio);
        const audioBuffer = await decodeAudioData(bytes, audioContext);
        const source = audioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioContext.destination);
        source.onended = () => setPlayingIndex(null);
        source.start();
      } else {
        setPlayingIndex(null);
      }
    } catch (e) {
      console.error(e);
      setPlayingIndex(null);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !chatSession || isLoading) return;

    const userMessage: ChatMessage = {
      role: 'user',
      text: input,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await chatSession.sendMessage({ message: input });
      const botMessage: ChatMessage = {
        role: 'model',
        text: response.text || 'Entschuldigung, ich habe das nicht verstanden.',
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error("Chat Error:", error);
      setMessages(prev => [...prev, {
        role: 'model',
        text: "I encountered a connection error. Please check your project's billing or API key status.",
        timestamp: Date.now()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] flex flex-col max-w-5xl mx-auto border-x border-slate-800">
      <header className="px-6 py-5 border-b border-slate-800 bg-[#020617]/80 backdrop-blur-xl flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center space-x-4">
          <button onClick={onBack} className="p-2 hover:bg-slate-800 rounded-xl transition-colors">
            <ChevronLeft className="w-6 h-6 text-slate-400" />
          </button>
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center shadow-lg shadow-indigo-600/20">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white leading-tight">DeutschPro Coach</h2>
              <div className="flex items-center space-x-2">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Memory Active</span>
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button 
            onClick={resetChat}
            className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all"
            title="Reset Conversation"
          >
            <Trash2 className="w-5 h-5" />
          </button>
          <div className="hidden md:flex items-center space-x-2 bg-slate-900 px-4 py-2 rounded-xl border border-slate-800">
            <Sparkles className="w-4 h-4 text-indigo-400" />
            <span className="text-xs font-bold text-slate-400">{masteredWords.length} Learned Words</span>
          </div>
        </div>
      </header>

      <main 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-6 space-y-6 scroll-smooth no-scrollbar"
      >
        {messages.map((msg, i) => (
          <div 
            key={i} 
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-slide-in`}
          >
            <div className={`max-w-[85%] flex items-start space-x-3 ${msg.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'user' ? 'bg-slate-800' : 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/20'}`}>
                {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>
              <div className="relative group">
                <div className={`p-4 rounded-3xl text-sm leading-relaxed ${
                  msg.role === 'user' 
                    ? 'bg-indigo-600 text-white rounded-tr-none shadow-lg' 
                    : 'bg-slate-900 border border-slate-800 text-slate-200 rounded-tl-none pr-10'
                }`}>
                  {msg.text}
                </div>
                {msg.role === 'model' && (
                  <button 
                    onClick={() => playMessage(msg.text, i)}
                    className={`absolute right-2 top-2 p-1.5 rounded-xl transition-all ${playingIndex === i ? 'bg-indigo-500 text-white animate-pulse' : 'bg-slate-800/50 text-slate-500 hover:text-white opacity-0 group-hover:opacity-100'}`}
                  >
                    {playingIndex === i ? <Loader2 className="w-3 h-3 animate-spin" /> : <Volume2 className="w-3 h-3" />}
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start animate-pulse">
             <div className="flex items-start space-x-3">
                <div className="w-8 h-8 rounded-full bg-indigo-600/10 flex items-center justify-center border border-indigo-500/10">
                  <Loader2 className="w-4 h-4 text-indigo-500 animate-spin" />
                </div>
                <div className="bg-slate-900/50 border border-slate-800/50 p-4 rounded-3xl rounded-tl-none">
                  <div className="flex space-x-1">
                    <div className="w-1.5 h-1.5 bg-indigo-500/50 rounded-full animate-bounce" />
                    <div className="w-1.5 h-1.5 bg-indigo-500/50 rounded-full animate-bounce delay-75" />
                    <div className="w-1.5 h-1.5 bg-indigo-500/50 rounded-full animate-bounce delay-150" />
                  </div>
                </div>
             </div>
          </div>
        )}
      </main>

      <footer className="p-6 border-t border-slate-800 bg-[#020617]">
        <form onSubmit={handleSend} className="relative max-w-4xl mx-auto">
          <input 
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your German response here..."
            className="w-full bg-slate-900 border border-slate-800 rounded-2xl py-5 pl-6 pr-16 text-sm focus:outline-none focus:border-indigo-500 transition-all placeholder-slate-600"
          />
          <button 
            type="submit"
            disabled={!input.trim() || isLoading}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 text-white rounded-xl shadow-lg transition-all"
          >
            {isLoading ? <RefreshCcw className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
          </button>
        </form>
        <p className="text-center text-[10px] text-slate-600 mt-4 uppercase tracking-[0.2em]">
          Coach remembers your dialogue history.
        </p>
      </footer>
    </div>
  );
};

export default TutorChat;
