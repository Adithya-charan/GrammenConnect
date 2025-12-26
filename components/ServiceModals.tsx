
import React, { useState, useRef, useEffect } from 'react';
import { Modal, Button, Input } from './Shared';
import { generateContent, generateVisionContent, chatWithBot, transliterateText } from '../services/geminiService';
import { Mic, Send, Camera, Upload, Image as ImageIcon, Plus, AlertTriangle, MapPin, MessageCircle, FileText, Download, Check, Languages, Sparkles, User, Activity, ArrowRight, Phone, X, Key, Info, RefreshCw, ShoppingCart } from 'lucide-react';
import { MarketItem, Language } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

const SPEECH_LANG_MAP: Record<Language, string> = {
  'en': 'en-IN', 'hi': 'hi-IN', 'bn': 'bn-IN', 'te': 'te-IN', 'mr': 'mr-IN', 'ta': 'ta-IN', 'ur': 'ur-IN', 'gu': 'gu-IN', 'kn': 'kn-IN', 'ml': 'ml-IN', 'pa': 'pa-IN', 'or': 'or-IN', 'as': 'as-IN' 
};

export const simulateDownload = (fileName: string, content: string) => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};

// --- Transliteration UI Component ---
const PhoneticHelper: React.FC<{ text: string; setText: (v: string) => void; targetLang: Language }> = ({ text, setText, targetLang }) => {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  
  if (targetLang === 'en') return null;

  const handleTransliterate = async () => {
    if (!text) return;
    setLoading(true);
    const result = await transliterateText(text, targetLang);
    setText(result);
    setLoading(false);
  };

  return (
    <div className="relative group">
      <button 
        onClick={handleTransliterate}
        disabled={loading || !text}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`p-3 rounded-full transition-all duration-300 flex items-center justify-center border-2 ${loading ? 'bg-green-50 text-green-600 border-green-200' : 'bg-white text-green-600 border-green-50 hover:border-green-300 hover:shadow-lg hover:scale-110'} ${!text ? 'opacity-50 grayscale' : ''}`}
        title={t("Phonetic Typing")}
      >
        <Languages size={20} className={loading ? 'animate-spin' : ''} />
      </button>
      
      {isHovered && text && !loading && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 px-3 py-1.5 bg-green-900 text-white text-[10px] font-black uppercase tracking-widest rounded-lg whitespace-nowrap shadow-xl animate-in fade-in zoom-in duration-200">
          {t("Transliterate")}
        </div>
      )}
    </div>
  );
};

export const CommunityHelpModal: React.FC<{ isOpen: boolean; onClose: () => void; language: Language }> = ({ isOpen, onClose, language }) => {
  const { t } = useLanguage();
  const [view, setView] = useState<'request' | 'volunteer'>('request');
  const [reqType, setReqType] = useState('Medical');
  const [reqDesc, setReqDesc] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const activeRequests = [
    { id: '1', type: t('Medical'), location: t('Ward 4, Sonapur'), desc: t('Need urgent medicine transport for elderly patient.'), status: t('Urgent'), time: t('10m ago') },
    { id: '2', type: t('Documents'), location: t('Main Panchayat Office'), desc: t('Need help reading pension form and local guidance.'), status: t('Pending'), time: t('1h ago') },
  ];

  const handleSubmit = () => {
    if (!reqDesc.trim()) return;
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setSubmitted(true);
      setTimeout(() => { setSubmitted(false); onClose(); setReqDesc(''); }, 2000);
    }, 1500);
  };

  return (
    <Modal isOpen={isOpen} onClose={() => { onClose(); setView('request'); setSubmitted(false); }} title={t("Community Help")} maxWidth="max-w-lg">
      <div className="flex p-1.5 bg-emerald-50 rounded-2xl mb-8 border border-emerald-100">
        <button 
          onClick={() => setView('request')}
          className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${view === 'request' ? 'bg-white text-emerald-700 shadow-md' : 'text-emerald-500 hover:text-emerald-600'}`}
        >
          {t("Raise Request")}
        </button>
        <button 
          onClick={() => setView('volunteer')}
          className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${view === 'volunteer' ? 'bg-white text-emerald-700 shadow-md' : 'text-emerald-500 hover:text-emerald-600'}`}
        >
          {t("Be a Volunteer")}
        </button>
      </div>

      {submitted ? (
        <div className="flex flex-col items-center justify-center py-16 text-center animate-in zoom-in duration-500">
           <div className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6 shadow-inner"><Check size={48} className="animate-in fade-in zoom-in duration-300 delay-200" /></div>
           <h3 className="text-2xl font-black text-gray-900 uppercase tracking-tighter mb-2">{t("Success!")}</h3>
           <p className="text-gray-500 font-medium">{t("Your community request has been broadasted.")}</p>
        </div>
      ) : view === 'request' ? (
        <div className="space-y-6">
           <div className="grid grid-cols-2 gap-4">
             <button onClick={() => setReqType('Medical')} className={`p-6 rounded-3xl border-4 flex flex-col items-center gap-4 transition-all active:scale-95 ${reqType === 'Medical' ? 'border-red-100 bg-red-50 text-red-600 shadow-lg shadow-red-100' : 'border-gray-50 text-gray-400 hover:border-gray-100 hover:text-gray-500'}`}>
                <Activity size={32} /> <span className="text-[10px] font-black uppercase tracking-widest">{t("Medical")}</span>
             </button>
             <button onClick={() => setReqType('Food/Water')} className={`p-6 rounded-3xl border-4 flex flex-col items-center gap-4 transition-all active:scale-95 ${reqType === 'Food/Water' ? 'border-blue-100 bg-blue-50 text-blue-600 shadow-lg shadow-blue-100' : 'border-gray-50 text-gray-400 hover:border-gray-100 hover:text-gray-500'}`}>
                <ImageIcon size={32} /> <span className="text-[10px] font-black uppercase tracking-widest">{t("Food/Water")}</span>
             </button>
           </div>
           
           <div className="space-y-2">
             <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] px-2">{t("Describe Need")}</label>
             <textarea 
               className="w-full h-40 p-6 bg-gray-50 border-2 border-transparent rounded-3xl outline-none focus:bg-white focus:border-emerald-500 transition-all text-sm font-medium leading-relaxed resize-none"
               placeholder="..."
               value={reqDesc}
               onChange={e => setReqDesc(e.target.value)}
             />
           </div>
           
           <Button onClick={handleSubmit} isLoading={loading} className="w-full bg-emerald-600 hover:bg-emerald-700 py-5 font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-emerald-100">
             {t("Raise Request")}
           </Button>
        </div>
      ) : (
        <div className="space-y-6">
           {activeRequests.map((req, idx) => (
             <div key={req.id} className="p-6 bg-white border-2 border-gray-50 rounded-3xl shadow-sm hover:shadow-xl hover:border-emerald-100 transition-all animate-in slide-in-from-bottom-4" style={{ animationDelay: `${idx * 100}ms` }}>
                <div className="flex justify-between items-start mb-4">
                   <div className="flex items-center gap-3">
                      <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${req.status === t('Urgent') ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-yellow-50 text-yellow-600 border border-yellow-100'}`}>{req.status}</span>
                      <span className="text-xs font-black text-gray-900 uppercase tracking-tight">{req.type}</span>
                   </div>
                   <span className="text-[10px] text-gray-300 font-bold uppercase">{req.time}</span>
                </div>
                <p className="text-gray-500 font-medium mb-6 leading-relaxed">{req.desc}</p>
                <div className="flex items-center justify-between">
                   <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-wide"><MapPin size={14} className="text-gray-300"/> {req.location}</div>
                   <button className="bg-emerald-50 text-emerald-700 px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-600 hover:text-white transition-all active:scale-95 border border-emerald-100">{t("Help Now")}</button>
                </div>
             </div>
           ))}
        </div>
      )}
    </Modal>
  );
};

export const GlobalChatModal: React.FC<{ isOpen: boolean; onClose: () => void; language: Language }> = ({ isOpen, onClose, language }) => {
  const { t } = useLanguage();
  const [messages, setMessages] = useState<{role: 'user' | 'model', text: string}[]>([
    { role: 'model', text: t("Sahayak Welcome") }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [needsApiKey, setNeedsApiKey] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]);

  const handleOpenKeySelection = async () => {
    try {
      // @ts-ignore
      await window.aistudio.openSelectKey();
      setNeedsApiKey(false);
      setMessages(prev => [...prev, { role: 'model', text: "API Key connected. Please try your request again." }]);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setLoading(true);
    
    const response = await chatWithBot(messages, userMsg, t("Sahayak AI Assistant"), language);
    
    if (response === "ERROR_PRO_KEY_REQUIRED") {
      setNeedsApiKey(true);
      setMessages(prev => [...prev, { 
        role: 'model', 
        text: "I need you to connect your API key to handle complex tasks like coding. Please click the button below to connect." 
      }]);
    } else {
      setMessages(prev => [...prev, { role: 'model', text: response }]);
    }
    setLoading(false);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t("Sahayak AI")} maxWidth="max-w-md">
       <div className="flex flex-col h-[600px] -mt-2">
         <div className="flex-1 overflow-y-auto p-2 space-y-6 custom-scrollbar pr-4">
           {messages.map((m, i) => (
             <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2`}>
               <div className={`max-w-[85%] p-5 rounded-[2rem] text-sm font-medium leading-relaxed ${m.role === 'user' ? 'bg-green-600 text-white rounded-br-none shadow-xl shadow-green-100' : 'bg-gray-100 text-gray-800 rounded-bl-none shadow-sm'}`}>
                 {m.text}
               </div>
             </div>
           ))}
           {loading && (
             <div className="flex justify-start animate-pulse">
               <div className="bg-gray-100 p-4 rounded-[2rem] rounded-bl-none text-gray-400 text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                 <div className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce"></div>
                 <div className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce delay-75"></div>
                 <div className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce delay-150"></div>
               </div>
             </div>
           )}
           <div ref={bottomRef} />
         </div>

         {needsApiKey && (
           <div className="mb-4 animate-in fade-in zoom-in duration-300">
              <button 
                onClick={handleOpenKeySelection}
                className="w-full bg-blue-600 text-white p-4 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 shadow-xl hover:bg-blue-700 transition-all active:scale-95"
              >
                <Key size={18} /> Connect Paid API Key
              </button>
              <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" className="text-[9px] text-gray-400 mt-2 block text-center uppercase font-bold hover:text-blue-500 flex items-center justify-center gap-1">
                <Info size={10} /> View Billing Documentation
              </a>
           </div>
         )}

         <div className="pt-6 mt-4 border-t border-gray-50 flex gap-3 items-center">
           <PhoneticHelper text={input} setText={setInput} targetLang={language} />
           <div className="flex-1 relative">
             <input 
               className="w-full border-2 border-gray-100 bg-gray-50 rounded-full px-6 py-4 outline-none focus:ring-4 focus:ring-green-50 focus:border-green-500 focus:bg-white transition-all pr-14 text-sm font-medium"
               placeholder={t("Ask Anything")}
               value={input}
               onChange={(e) => setInput(e.target.value)}
               onKeyDown={(e) => e.key === 'Enter' && handleSend()}
             />
             <button onClick={handleSend} disabled={loading || !input.trim()} className="absolute right-2 top-1/2 -translate-y-1/2 bg-green-600 text-white p-3 rounded-full hover:bg-green-700 shadow-lg disabled:opacity-50 disabled:grayscale transition-all active:scale-95">
               <Send size={18} />
             </button>
           </div>
         </div>
       </div>
    </Modal>
  );
};

export const ChatModal: React.FC<{ isOpen: boolean; onClose: () => void; language: Language }> = ({ isOpen, onClose, language }) => {
  const { t } = useLanguage();
  const [messages, setMessages] = useState<{role: 'user' | 'model', text: string}[]>([
    { role: 'model', text: t("Health Welcome") }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setLoading(true);
    const response = await chatWithBot(messages, userMsg, t("Swasthya Saathi"), language);
    setMessages(prev => [...prev, { role: 'model', text: response }]);
    setLoading(false);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t("Swasthya Saathi")} maxWidth="max-w-md">
       <div className="flex flex-col h-[600px] -mt-2">
         <div className="flex-1 overflow-y-auto p-2 space-y-6 custom-scrollbar pr-4">
           <div className="bg-red-50 text-red-600 text-[10px] p-4 rounded-3xl border border-red-100 flex items-start gap-3 uppercase font-black tracking-widest shadow-sm">
             <AlertTriangle size={16} className="mt-0.5 shrink-0"/>
             <span>{t("Disclaimer")}</span>
           </div>
           {messages.map((m, i) => (
             <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2`}>
               <div className={`max-w-[85%] p-5 rounded-[2rem] text-sm font-medium leading-relaxed ${m.role === 'user' ? 'bg-pink-600 text-white rounded-br-none shadow-xl shadow-pink-100' : 'bg-gray-100 text-gray-800 rounded-bl-none shadow-sm'}`}>
                 {m.text}
               </div>
             </div>
           ))}
           {loading && (
             <div className="flex justify-start animate-pulse">
               <div className="bg-gray-100 p-4 rounded-[2rem] text-gray-400 text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                 <div className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce"></div>
                 <div className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce delay-75"></div>
                 <div className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce delay-150"></div>
               </div>
             </div>
           )}
           <div ref={bottomRef} />
         </div>
         <div className="pt-6 mt-4 border-t border-gray-50 flex gap-3 items-center">
           <PhoneticHelper text={input} setText={setInput} targetLang={language} />
           <div className="flex-1 relative">
             <input 
               className="w-full border-2 border-gray-100 bg-gray-50 rounded-full px-6 py-4 outline-none focus:ring-4 focus:ring-pink-50 focus:border-pink-500 focus:bg-white transition-all pr-14 text-sm font-medium"
               placeholder={t("Describe Symptoms")}
               value={input}
               onChange={(e) => setInput(e.target.value)}
               onKeyDown={(e) => e.key === 'Enter' && handleSend()}
             />
             <button onClick={handleSend} disabled={loading || !input.trim()} className="absolute right-2 top-1/2 -translate-y-1/2 bg-pink-600 text-white p-3 rounded-full hover:bg-pink-700 shadow-lg disabled:opacity-50 disabled:grayscale transition-all active:scale-95">
               <Send size={18} />
             </button>
           </div>
         </div>
       </div>
    </Modal>
  );
};

export const OfflineResourcesModal: React.FC<{ isOpen: boolean; onClose: () => void; language: Language }> = ({ isOpen, onClose, language }) => {
  const { t } = useLanguage();
  const [downloadedItems, setDownloadedItems] = useState<string[]>([]);
  const resources = [
    { id: '1', title: t('First Aid Basic Guide'), size: '1.2 MB', content: t('OFFLINE GUIDE: First Aid\n\n1. Cuts: Clean with water.\n2. Burns: Cool water.') },
    { id: '2', title: t('Emergency Contacts'), size: '0.1 MB', content: t('OFFLINE GUIDE: Emergency\n\nAmbulance: 102') },
  ];
  const handleDownload = (id: string, title: string, content: string) => {
    simulateDownload(`${title.replace(/\s+/g, '_')}.txt`, content);
    setDownloadedItems(prev => [...prev, id]);
  };
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t("Offline Resources")}>
       <div className="space-y-4">
          <div className="grid gap-3">
            {resources.map((item) => (
              <div key={item.id} className="flex items-center justify-between p-4 bg-gray-50 border border-gray-100 rounded-xl">
                 <div className="flex items-center gap-3">
                    <div className="bg-white p-2 rounded-lg border border-gray-200 text-green-600"><FileText size={20} /></div>
                    <div>
                      <h4 className="font-semibold text-gray-800 text-sm">{item.title}</h4>
                      <p className="text-[10px] text-gray-500 uppercase font-bold">{item.size}</p>
                    </div>
                 </div>
                 <button onClick={() => handleDownload(item.id, item.title, item.content)} disabled={downloadedItems.includes(item.id)} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${downloadedItems.includes(item.id) ? 'bg-green-100 text-green-700' : 'bg-green-600 text-white shadow-sm'}`}>
                   {downloadedItems.includes(item.id) ? <Check size={14} /> : <Download size={14} />}
                   {downloadedItems.includes(item.id) ? t("Downloaded") : t("Download")}
                 </button>
              </div>
            ))}
          </div>
       </div>
    </Modal>
  );
};

export const GovernanceModal: React.FC<{ isOpen: boolean; onClose: () => void; language: Language }> = ({ isOpen, onClose, language }) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);
  const { t } = useLanguage();

  useEffect(() => {
    if ('webkitSpeechRecognition' in window) {
      const recognition = new (window as any).webkitSpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = SPEECH_LANG_MAP[language] || 'en-IN';
      
      recognition.onresult = (event: any) => { 
        setTranscript(event.results[0][0].transcript); 
        setIsListening(false); 
      };

      recognition.onerror = (event: any) => {
        console.error("Speech Recognition Error:", event.error);
        setError(`Microphone error: ${event.error}. Please ensure browser permissions.`);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    } else {
      setError("Voice recognition not supported in this browser.");
    }

    return () => {
      recognitionRef.current?.stop();
    };
  }, [language]);

  const toggleMic = () => {
    setError(null);
    if (isListening) { 
      recognitionRef.current?.stop(); 
      setIsListening(false); 
    }
    else { 
      setTranscript(''); 
      try {
        recognitionRef.current?.start(); 
        setIsListening(true); 
      } catch (e) {
        setError("Could not access microphone.");
      }
    }
  };

  const handleDraft = async () => {
    if (!transcript) return;
    setLoading(true);
    setError(null);
    try {
      const systemPrompt = "Draft a formal government grievance letter in India. Use a very professional and authoritative tone. Address the relevant local authority.";
      const userPrompt = `Draft a grievance letter about: "${transcript}". Provide placeholders for personal details.`;
      const text = await generateContent(userPrompt, language, systemPrompt);
      setDraft(text);
    } catch (err) {
      setError("Failed to create draft. Check your internet.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={() => { onClose(); setDraft(''); setTranscript(''); setError(null); }} title={t("Governance Aid")}>
      {!draft ? (
        <div className="flex flex-col items-center py-6 space-y-8">
          <div className="text-center space-y-2 px-4">
            <h4 className="font-black text-gray-900 uppercase tracking-tighter text-xl">{t("Speak Your Concern")}</h4>
            <p className="text-gray-400 text-sm font-medium">{t("Tell us your problem and we will draft the formal document.")}</p>
          </div>

          <div className="relative">
            <button 
              onClick={toggleMic} 
              className={`w-32 h-32 rounded-full flex items-center justify-center transition-all duration-500 shadow-2xl ${isListening ? 'bg-red-500 scale-110' : 'bg-green-600 hover:bg-green-700 hover:scale-105 active:scale-95'}`}
            >
              {isListening && <div className="animate-ping absolute w-full h-full bg-red-400 rounded-full opacity-50"></div>}
              <Mic size={56} className="text-white relative z-10" />
            </button>
            {isListening && <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-red-500 font-black text-[10px] uppercase tracking-widest animate-pulse">{t("Listening...")}</div>}
          </div>

          <div className="w-full max-w-sm">
            <div className={`p-6 rounded-3xl min-h-[100px] flex items-center justify-center text-center transition-all ${transcript ? 'bg-green-50 border-2 border-green-100 text-green-900' : 'bg-gray-50 border-2 border-dashed border-gray-200 text-gray-400'} font-medium`}>
              {transcript || t("Transcript will appear here...")}
            </div>
          </div>

          {error && <div className="bg-red-50 text-red-600 p-4 rounded-2xl flex items-center gap-3 text-xs font-bold uppercase tracking-tight"><AlertTriangle size={16} />{error}</div>}

          {transcript && (
            <div className="flex gap-4 w-full">
              <Button variant="outline" onClick={() => setTranscript('')} className="flex-1 py-4 uppercase font-black tracking-widest text-[10px]">{t("Clear")}</Button>
              <Button onClick={handleDraft} isLoading={loading} className="flex-1 py-4 uppercase font-black tracking-widest text-[10px] shadow-xl shadow-green-100">{t("Draft Letter")}</Button>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center justify-between px-2">
            <h4 className="font-black text-gray-900 uppercase tracking-tight text-lg">{t("Letter Preview")}</h4>
          </div>
          <textarea 
            className="w-full h-80 p-6 bg-gray-50 border-2 border-gray-100 rounded-3xl text-sm font-serif leading-relaxed outline-none focus:bg-white focus:border-green-500 transition-all shadow-inner" 
            value={draft} 
            onChange={(e) => setDraft(e.target.value)}
          />
          <div className="flex gap-4">
            <Button variant="outline" onClick={() => setDraft('')} className="flex-1 py-4 uppercase font-black tracking-widest text-[10px]">{t("Try Again")}</Button>
            <Button onClick={() => simulateDownload('Formal_Letter.txt', draft)} className="flex-1 py-4 bg-blue-600 hover:bg-blue-700 text-white uppercase font-black tracking-widest text-[10px] shadow-xl shadow-blue-100">
              <Download size={16} /> {t("Download")}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
};

export const VisionModal: React.FC<{ isOpen: boolean; onClose: () => void; language: Language }> = ({ isOpen, onClose, language }) => {
  const [image, setImage] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { t } = useLanguage();
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  };
  const analyzeImage = async () => {
    if (!image) return;
    setLoading(true);
    const base64Data = image.split(',')[1];
    const mimeType = image.split(';')[0].split(':')[1];
    const res = await generateVisionContent(t("Explain simply."), base64Data, mimeType, language);
    setResult(res);
    setLoading(false);
  };
  return (
    <Modal isOpen={isOpen} onClose={() => { onClose(); setImage(null); setResult(null); }} title={t("Vision")}>
      <div className="flex flex-col items-center space-y-6">
        {!image ? (
          <button onClick={() => fileInputRef.current?.click()} className="border-2 border-dashed border-green-300 bg-green-50 rounded-xl p-10 w-full flex flex-col items-center gap-3"><Camera size={48} className="text-green-500" /><span className="font-semibold text-green-700">{t("Upload Photo")}</span></button>
        ) : (
          <div className="w-full space-y-4">
            <img src={image} className="max-h-64 mx-auto rounded-xl object-contain" />
            {!result ? <Button onClick={analyzeImage} isLoading={loading} className="w-full">{t("Explain This")}</Button> : (
              <div className="bg-green-50 p-4 rounded-xl border border-green-100">
                <p className="text-gray-700 text-sm whitespace-pre-wrap">{result}</p>
                <Button onClick={() => simulateDownload('Analysis.txt', result)} variant="outline" className="w-full mt-4">{t("Download")}</Button>
              </div>
            )}
          </div>
        )}
        <input type="file" ref={fileInputRef} hidden accept="image/*" onChange={handleFileChange} />
      </div>
    </Modal>
  );
};

export const KisanModal: React.FC<{ 
  isOpen: boolean; 
  onClose: () => void; 
  language: Language;
  items: MarketItem[];
  setItems: React.Dispatch<React.SetStateAction<MarketItem[]>>;
}> = ({ isOpen, onClose, language, items, setItems }) => {
  const [view, setView] = useState<'buy' | 'sell'>('buy');
  const [sellImage, setSellImage] = useState<string | null>(null);
  const [isPosting, setIsPosting] = useState(false);
  const [newItem, setNewItem] = useState({ name: '', price: '', contact: '', location: 'My Village' });
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { t } = useLanguage();

  const handleSellUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setSellImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handlePost = () => {
    if (!sellImage || !newItem.name || !newItem.price || !newItem.contact) {
      alert("Please fill all details and upload an image.");
      return;
    }

    setIsPosting(true);
    setTimeout(() => {
      const addedItem: MarketItem = {
        id: Math.random().toString(36).substr(2, 9),
        name: newItem.name,
        price: newItem.price,
        seller: "Me (You)",
        location: newItem.location,
        contact: newItem.contact,
        image: sellImage
      };

      setItems(prev => [addedItem, ...prev]);
      setIsPosting(false);
      setSellImage(null);
      setNewItem({ name: '', price: '', contact: '', location: 'My Village' });
      setView('buy');
    }, 1200);
  };

  return (
    <Modal isOpen={isOpen} onClose={() => { onClose(); setView('buy'); setSellImage(null); }} title={t("Kisan Mandi")} maxWidth="max-w-5xl">
      <div className="flex justify-between items-center mb-10">
        <div className="flex flex-col">
          <h3 className="text-3xl font-black text-gray-900 tracking-tighter uppercase">{view === 'buy' ? t("Kisan Mandi") : t("List Your Produce")}</h3>
          <p className="text-[10px] text-gray-400 font-black uppercase tracking-[0.3em]">{view === 'buy' ? t('Live Local Marketplace') : t('Enter Item Details')}</p>
        </div>
        <button 
          onClick={() => setView(view === 'buy' ? 'sell' : 'buy')} 
          className={`px-8 py-3.5 rounded-2xl font-black uppercase tracking-widest text-xs transition-all active:scale-95 flex items-center gap-3 border-2 ${view === 'buy' ? 'bg-green-600 text-white border-green-600 shadow-xl shadow-green-100 hover:bg-green-700' : 'bg-white text-gray-400 border-gray-100 hover:border-green-500 hover:text-green-600'}`}
        >
           {view === 'buy' ? <><Plus size={18} /> {t("Sell Produce")}</> : <><RefreshCw size={18} /> {t("Back to Market")}</>}
        </button>
      </div>

      {view === 'buy' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pb-10">
          {items.map((item, idx) => (
            <div key={item.id} className="group bg-white border-2 border-gray-50 rounded-[2.5rem] overflow-hidden shadow-sm hover:shadow-2xl transition-all duration-500 animate-in slide-in-from-bottom-4" style={{ animationDelay: `${idx * 100}ms` }}>
              <div className="relative h-60 overflow-hidden bg-gray-100">
                <img src={item.image} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" />
                <div className="absolute top-5 right-5 bg-white/95 backdrop-blur-md px-5 py-2.5 rounded-2xl shadow-xl border border-white">
                  <span className="text-sm font-black text-green-600">{item.price}</span>
                </div>
                {item.seller === "Me (You)" && <div className="absolute top-5 left-5 bg-blue-600 text-white px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg">Your Listing</div>}
              </div>
              <div className="p-8">
                <h4 className="font-black text-2xl text-gray-900 uppercase tracking-tight mb-6">{item.name}</h4>
                <div className="space-y-4 mb-8 text-xs font-bold text-gray-400 uppercase tracking-widest">
                  <div className="flex items-center gap-4"><div className="bg-green-50 p-2 rounded-xl text-green-500"><User size={16} /></div>{item.seller}</div>
                  <div className="flex items-center gap-4"><div className="bg-green-50 p-2 rounded-xl text-green-500"><MapPin size={16} /></div>{item.location}</div>
                </div>
                <a href={`tel:${item.contact}`} className="w-full bg-green-50 text-green-700 border-2 border-green-100 py-4.5 rounded-[2rem] flex items-center justify-center gap-3 font-black uppercase tracking-widest text-xs hover:bg-green-600 hover:text-white transition-all shadow-sm"><Phone size={16} /> {t("Contact Seller")}</a>
              </div>
            </div>
          ))}
          {items.length === 0 && <div className="col-span-full py-20 text-center"><p className="text-gray-300 font-black uppercase tracking-widest text-xs">No items currently listed.</p></div>}
        </div>
      ) : (
        <div className="max-w-2xl mx-auto space-y-10 py-4 pb-12">
          {!sellImage ? (
            <div onClick={() => fileInputRef.current?.click()} className="border-4 border-dashed border-gray-100 bg-gray-50 rounded-[4rem] p-24 flex flex-col items-center gap-8 cursor-pointer hover:bg-green-50 hover:border-green-200 transition-all group shadow-inner">
               <div className="w-24 h-24 bg-white rounded-[2rem] flex items-center justify-center text-gray-200 group-hover:text-green-500 shadow-xl transition-all"><Camera size={48} /></div>
               <span className="font-black text-gray-400 uppercase tracking-[0.3em] text-xs block">{t("Tap to upload photo")}</span>
               <input type="file" ref={fileInputRef} hidden accept="image/*" onChange={handleSellUpload} />
            </div>
          ) : (
            <div className="space-y-8 animate-in slide-in-from-bottom-8 duration-500">
              <div className="relative h-64 rounded-[3rem] overflow-hidden border-4 border-white shadow-2xl bg-gray-100">
                <img src={sellImage} className="w-full h-full object-cover" />
                <button onClick={() => setSellImage(null)} className="absolute top-4 right-4 bg-white/90 text-red-500 p-4 rounded-full shadow-lg hover:bg-red-500 hover:text-white transition-all"><X size={20} /></button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input label={t("Item Name")} placeholder={t("e.g. Fresh Tomatoes")} value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})} />
                <Input label={t("Expected Price")} placeholder={t("e.g. ₹20/kg")} value={newItem.price} onChange={e => setNewItem({...newItem, price: e.target.value})} />
              </div>
              <Input label={t("Contact Phone Number")} type="tel" placeholder="9876543210" value={newItem.contact} onChange={e => setNewItem({...newItem, contact: e.target.value})} />
              <Button onClick={handlePost} isLoading={isPosting} className="w-full py-6 font-black uppercase tracking-widest rounded-[2.5rem] bg-green-600 hover:bg-green-700 text-lg flex items-center justify-center gap-3"><Sparkles size={24} /> {t("Post My Listing")}</Button>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
};
