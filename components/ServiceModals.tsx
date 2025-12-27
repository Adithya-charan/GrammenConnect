
import React, { useState, useRef, useEffect } from 'react';
import { Modal, Button, Input } from './Shared';
import { generateContent, generateVisionContent, chatWithBot, transliterateText, recognizeSahayakIntent, extractMandiItem } from '../services/geminiService';
import { getAllCachedItems } from '../services/cacheService';
import { speak } from '../services/speechService';
import { Mic, Send, Camera, Upload, Image as ImageIcon, Plus, AlertTriangle, MapPin, MessageCircle, FileText, Download, Check, Languages, Sparkles, User, Activity, ArrowRight, Phone, X, Key, Info, RefreshCw, ShoppingCart, HelpingHand, Stethoscope, Users, HandHeart, ShoppingBag, Volume2, ChevronLeft } from 'lucide-react';
import { MarketItem, Language, ModalType } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import ReactMarkdown from 'react-markdown';

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

const PhoneticHelper: React.FC<{ text: string; setText: (v: string) => void; targetLang: Language }> = ({ text, setText, targetLang }) => {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  if (targetLang === 'en') return null;
  const handleTransliterate = async () => {
    if (!text) return;
    setLoading(true);
    const result = await transliterateText(text, targetLang);
    setText(result);
    setLoading(false);
  };
  return (
    <button onClick={handleTransliterate} disabled={loading || !text} className="p-3 rounded-full bg-white text-green-600 border border-green-50 shadow-sm hover:shadow-lg hover:scale-110 transition-all">
       <Languages size={20} className={loading ? 'animate-spin' : ''} />
    </button>
  );
};

export const GovernanceModal: React.FC<{ isOpen: boolean; onClose: () => void; language: Language }> = ({ isOpen, onClose, language }) => {
  const { t } = useLanguage();
  const [messages, setMessages] = useState<{role: 'user' | 'model', text: string}[]>([
    { role: 'model', text: "Namaste! I am your Sarkari Saathi. I can help you understand government procedures, documents, and public services." }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { if (isOpen) bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, isOpen]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setLoading(true);
    const response = await chatWithBot(messages, userMsg, "You are Sarkari Saathi, a professional yet accessible assistant helping Indian rural citizens with government-related queries like forms, RTI, and public services.", language);
    setMessages(prev => [...prev, { role: 'model', text: response }]);
    setLoading(false);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t("Governance Aid")} maxWidth="max-w-md">
       <div className="flex flex-col h-[550px]">
         <div className="flex-1 overflow-y-auto space-y-4 p-2 custom-scrollbar">
           {messages.map((m, i) => (
             <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
               <div className={`max-w-[85%] p-4 rounded-2xl text-sm font-medium ${m.role === 'user' ? 'bg-red-600 text-white shadow-lg' : 'bg-gray-100 text-gray-800 shadow-sm'}`}>
                 <ReactMarkdown className="prose prose-sm max-w-none">{m.text}</ReactMarkdown>
               </div>
             </div>
           ))}
           {loading && <div className="text-xs text-gray-400 font-black animate-pulse uppercase tracking-widest">Sarkari Saathi thinking...</div>}
           <div ref={bottomRef} />
         </div>
         <div className="pt-4 mt-4 border-t flex gap-3 items-center">
           <PhoneticHelper text={input} setText={setInput} targetLang={language} />
           <div className="flex-1 relative">
             <input className="w-full bg-gray-50 border-2 border-transparent rounded-full px-5 py-3 outline-none focus:bg-white focus:border-red-500 font-medium text-sm pr-12" placeholder={t("Ask about services...")} value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSend()} />
             <button onClick={handleSend} className="absolute right-2 top-1/2 -translate-y-1/2 bg-red-600 text-white p-2 rounded-full hover:bg-red-700 shadow-md transition-all active:scale-90"><Send size={16} /></button>
           </div>
         </div>
       </div>
    </Modal>
  );
};

export const CommunityHelpModal: React.FC<{ isOpen: boolean; onClose: () => void; language: Language; initialView?: 'request' | 'volunteer' }> = ({ isOpen, onClose, language, initialView = 'request' }) => {
  const { t } = useLanguage();
  const [view, setView] = useState<'request' | 'volunteer'>(initialView);
  const [reqType, setReqType] = useState('Medical');
  const [reqDesc, setReqDesc] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (isOpen && initialView) setView(initialView);
  }, [isOpen, initialView]);

  const activeRequests = [
    { id: '1', type: t('Medical'), location: 'Ward 4, Sonapur', desc: 'Need urgent medicine transport for elderly patient.', status: 'Urgent', time: '10m ago' },
    { id: '2', type: t('Documents'), location: 'Main Panchayat Office', desc: 'Need help reading pension form.', status: 'Pending', time: '1h ago' },
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
    <Modal isOpen={isOpen} onClose={() => { onClose(); setSubmitted(false); }} title={t("Community Help")} maxWidth="max-w-lg">
      <div className="flex p-1.5 bg-emerald-50 rounded-2xl mb-8 border border-emerald-100">
        <button onClick={() => setView('request')} className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${view === 'request' ? 'bg-white text-emerald-700 shadow-md' : 'text-emerald-500 hover:text-emerald-600'}`}>{t("Request Help")}</button>
        <button onClick={() => setView('volunteer')} className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${view === 'volunteer' ? 'bg-white text-emerald-700 shadow-md' : 'text-emerald-500 hover:text-emerald-600'}`}>{t("Be a Volunteer")}</button>
      </div>

      {submitted ? (
        <div className="flex flex-col items-center justify-center py-16 text-center animate-in zoom-in duration-500">
           <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6 shadow-inner"><Check size={40} /></div>
           <h3 className="text-xl font-black text-gray-900 uppercase tracking-tighter mb-2">{t("Success!")}</h3>
           <p className="text-gray-500 font-medium">Request shared with local volunteers.</p>
        </div>
      ) : view === 'request' ? (
        <div className="space-y-6">
           <div className="grid grid-cols-2 gap-4">
             <button onClick={() => setReqType('Medical')} className={`p-6 rounded-3xl border-4 transition-all active:scale-95 ${reqType === 'Medical' ? 'border-red-100 bg-red-50 text-red-600 shadow-lg' : 'border-gray-50 text-gray-400'}`}>
                <Activity size={32} /> <span className="text-[10px] font-black uppercase tracking-widest mt-2 block">{t("Medical")}</span>
             </button>
             <button onClick={() => setReqType('Other')} className={`p-6 rounded-3xl border-4 transition-all active:scale-95 ${reqType === 'Other' ? 'border-blue-100 bg-blue-50 text-blue-600 shadow-lg' : 'border-gray-50 text-gray-400'}`}>
                <HelpingHand size={32} /> <span className="text-[10px] font-black uppercase tracking-widest mt-2 block">{t("General")}</span>
             </button>
           </div>
           <textarea className="w-full h-40 p-5 bg-gray-50 border-2 border-transparent rounded-2xl outline-none focus:bg-white focus:border-emerald-500 transition-all font-medium" placeholder="Describe what you need help with..." value={reqDesc} onChange={e => setReqDesc(e.target.value)} />
           <Button onClick={handleSubmit} isLoading={loading} className="w-full bg-emerald-600 hover:bg-emerald-700 py-5 font-black uppercase tracking-widest rounded-2xl shadow-xl">{t("Request Help")}</Button>
        </div>
      ) : (
        <div className="space-y-4">
           {activeRequests.map((req) => (
             <div key={req.id} className="p-6 bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-xl transition-all">
                <div className="flex justify-between items-start mb-3">
                   <span className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-widest ${req.status === 'Urgent' ? 'bg-red-50 text-red-600' : 'bg-yellow-50 text-yellow-600'}`}>{req.status}</span>
                   <span className="text-[10px] text-gray-300 font-bold">{req.time}</span>
                </div>
                <h4 className="font-bold text-gray-900 mb-2 uppercase text-sm tracking-tight">{req.type}</h4>
                <p className="text-gray-500 text-sm font-medium mb-4">{req.desc}</p>
                <div className="flex items-center justify-between">
                   <span className="text-[10px] font-bold text-gray-400 flex items-center gap-1 uppercase"><MapPin size={12}/> {req.location}</span>
                   <button className="bg-emerald-50 text-emerald-700 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-600 hover:text-white transition-all">{t("Help Now")}</button>
                </div>
             </div>
           ))}
        </div>
      )}
    </Modal>
  );
};

export const GlobalChatModal: React.FC<{ isOpen: boolean; onClose: () => void; language: Language; onActionTrigger?: (action: any) => void }> = ({ isOpen, onClose, language, onActionTrigger }) => {
  const { t } = useLanguage();
  const [messages, setMessages] = useState<{role: 'user' | 'model', text: string}[]>([
    { role: 'model', text: "Namaste! I am SAHAYAK AI. Speak to control GrameenConnect. Try: 'Open kisan mandi' or 'I have a fever'." }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { if (isOpen) bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, isOpen]);

  const handleSend = async (forcedText?: string) => {
    const textToSend = forcedText || input;
    if (!textToSend.trim() || loading) return;
    
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: textToSend }]);
    setLoading(true);

    try {
      const sahayakResult = await recognizeSahayakIntent(textToSend, language);
      
      if (sahayakResult && sahayakResult.action !== "unknown") {
        if (sahayakResult.text) {
          setMessages(prev => [...prev, { role: 'model', text: sahayakResult.text }]);
          speak(sahayakResult.text, language);
        }

        if (onActionTrigger && (sahayakResult.action === "navigate" || sahayakResult.action === "type_health_input" || sahayakResult.action === "plan_mobility")) {
          // IMPORTANT: Removed onClose() from here to avoid the state reset bug.
          // App.tsx handles the modal state transition.
          setTimeout(() => {
            onActionTrigger(sahayakResult);
          }, 1500);
        }
      } else {
        const fallbackMsg = await generateContent(`The user said "${textToSend}". Clarify that you can only help with: Kisan Mandi, Swasthya Saathi, Community Help, Resume, and Mobility Planner.`, language, "You are SAHAYAK AI. You are strict about only operating website tools. Never chat casually.");
        setMessages(prev => [...prev, { role: 'model', text: fallbackMsg }]);
        speak(fallbackMsg, language);
      }
    } catch (e) {
      console.error("Sahayak Processing Error:", e);
    } finally {
      setLoading(false);
    }
  };

  const startListening = () => {
    if (!('webkitSpeechRecognition' in window)) {
      alert("Voice recognition not supported in this browser.");
      return;
    }
    const recognition = new (window as any).webkitSpeechRecognition();
    recognition.lang = SPEECH_LANG_MAP[language] || 'en-IN';
    recognition.onstart = () => setListening(true);
    recognition.onend = () => setListening(false);
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      handleSend(transcript);
    };
    recognition.start();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t("Sahayak AI")} maxWidth="max-w-md">
       <div className="flex flex-col h-[550px]">
         <div className="flex-1 overflow-y-auto space-y-4 p-2 custom-scrollbar">
           {messages.map((m, i) => (
             <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
               <div className={`max-w-[85%] p-4 rounded-2xl text-sm font-medium ${m.role === 'user' ? 'bg-green-600 text-white shadow-lg' : 'bg-gray-100 text-gray-800 shadow-sm'}`}>
                 <ReactMarkdown className="prose prose-sm max-w-none prose-green">{m.text}</ReactMarkdown>
               </div>
             </div>
           ))}
           {loading && <div className="text-xs text-gray-400 font-black animate-pulse uppercase tracking-widest">{t("SAHAYAK THINKING...")}</div>}
           <div ref={bottomRef} />
         </div>
         <div className="pt-4 mt-4 border-t flex flex-col gap-3">
           <div className="flex gap-2">
             <PhoneticHelper text={input} setText={setInput} targetLang={language} />
             <div className="flex-1 relative">
               <input className="w-full bg-gray-50 border-2 border-transparent rounded-full px-5 py-3 outline-none focus:bg-white focus:border-green-500 font-medium text-sm pr-12" placeholder="Tell Sahayak what to do..." value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSend()} />
               <button onClick={() => handleSend()} className="absolute right-2 top-1/2 -translate-y-1/2 bg-green-600 text-white p-2 rounded-full hover:bg-green-700 shadow-md transition-all active:scale-90"><Send size={16} /></button>
             </div>
             <button onClick={startListening} className={`p-3 rounded-full shadow-lg transition-all active:scale-90 ${listening ? 'bg-red-500 animate-pulse text-white' : 'bg-purple-600 text-white hover:bg-purple-700'}`}>
               {listening ? <Mic size={20} /> : <Sparkles size={20} />}
             </button>
           </div>
         </div>
       </div>
    </Modal>
  );
};

export const ChatModal: React.FC<{ isOpen: boolean; onClose: () => void; language: Language; initialInput?: string }> = ({ isOpen, onClose, language, initialInput }) => {
  const { t } = useLanguage();
  const [messages, setMessages] = useState<{role: 'user' | 'model', text: string}[]>([
    { role: 'model', text: "Namaste! I am Swasthya Saathi. Describe your symptoms and I will try to help." }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && initialInput && messages.length === 1) {
      handleSend(initialInput);
    }
  }, [isOpen, initialInput]);

  useEffect(() => { if (isOpen) bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, isOpen]);

  const handleSend = async (forcedText?: string) => {
    const textToSend = forcedText || input;
    if (!textToSend.trim() || loading) return;
    
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: textToSend }]);
    setLoading(true);
    const response = await chatWithBot(messages, textToSend, "Swasthya Saathi Health Assistant. Render your answers in Markdown. Be concise and focus on simple home remedies or advising a doctor visit.", language);
    setMessages(prev => [...prev, { role: 'model', text: response }]);
    setLoading(false);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t("Swasthya Saathi")} maxWidth="max-w-md">
       <div className="flex flex-col h-[550px]">
         <div className="flex-1 overflow-y-auto space-y-4 p-2 custom-scrollbar">
           <div className="bg-red-50 text-red-600 text-[10px] p-3 rounded-xl border border-red-100 font-black tracking-widest uppercase mb-4">{t("Disclaimer")}</div>
           {messages.map((m, i) => (
             <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
               <div className={`max-w-[85%] p-4 rounded-2xl text-sm font-medium ${m.role === 'user' ? 'bg-pink-600 text-white shadow-lg' : 'bg-gray-100 text-gray-800 shadow-sm'}`}>
                 <ReactMarkdown className="prose prose-sm max-w-none prose-pink">{m.text}</ReactMarkdown>
               </div>
             </div>
           ))}
           <div ref={bottomRef} />
         </div>
         <div className="pt-4 mt-4 border-t flex gap-3 items-center">
           <PhoneticHelper text={input} setText={setInput} targetLang={language} />
           <div className="flex-1 relative">
             <input className="w-full bg-gray-50 border-2 border-transparent rounded-full px-5 py-3 outline-none focus:bg-white focus:border-pink-500 font-medium text-sm pr-12" placeholder="Describe symptoms..." value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSend()} />
             <button onClick={() => handleSend()} className="absolute right-2 top-1/2 -translate-y-1/2 bg-pink-600 text-white p-2 rounded-full hover:bg-pink-700 shadow-md transition-all active:scale-90"><Send size={16} /></button>
           </div>
         </div>
       </div>
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
    const res = await generateVisionContent("Explain this image simply for a rural user. Use Markdown for formatting.", base64Data, mimeType, language);
    setResult(res);
    setLoading(false);
  };
  return (
    <Modal isOpen={isOpen} onClose={() => { onClose(); setImage(null); setResult(null); }} title={t("Vision")}>
      <div className="flex flex-col items-center space-y-6">
        {!image ? (
          <button onClick={() => fileInputRef.current?.click()} className="border-4 border-dashed border-green-100 bg-green-50 rounded-[3rem] p-20 w-full flex flex-col items-center gap-4 hover:bg-green-100 transition-all group">
             <Camera size={56} className="text-green-500 group-hover:scale-110 transition-transform" />
             <span className="font-black text-green-700 uppercase tracking-widest text-xs">{t("Upload Photo")}</span>
          </button>
        ) : (
          <div className="w-full space-y-6">
            <img src={image} className="max-h-64 mx-auto rounded-3xl object-contain shadow-2xl border-4 border-white" />
            {!result ? <Button onClick={analyzeImage} isLoading={loading} className="w-full py-4 font-black uppercase tracking-widest text-xs rounded-2xl">{t("Explain This")}</Button> : (
              <div className="bg-green-50 p-6 rounded-[2.5rem] border-2 border-green-100 animate-in zoom-in duration-300">
                <ReactMarkdown className="text-gray-700 text-base font-medium leading-relaxed prose prose-green max-w-none">{result}</ReactMarkdown>
                <Button onClick={() => simulateDownload('Analysis.txt', result)} variant="outline" className="w-full mt-6 py-4 font-black uppercase tracking-widest text-xs rounded-2xl">
                   <Download size={16} /> {t("Download Analysis")}
                </Button>
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
  const [sellStep, setSellStep] = useState<0 | 1>(0); // 0: Method select, 1: Form/Photo
  const [sellImage, setSellImage] = useState<string | null>(null);
  const [isPosting, setIsPosting] = useState(false);
  const [isVoiceFilling, setIsVoiceFilling] = useState(false);
  const [newItem, setNewItem] = useState({ name: '', price: '', contact: '', location: 'My Village' });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { t } = useLanguage();

  const handlePost = () => {
    if (!sellImage || !newItem.name || !newItem.price) return;
    setIsPosting(true);
    setTimeout(() => {
      const addedItem: MarketItem = {
        id: Math.random().toString(36).substr(2, 9),
        name: newItem.name,
        price: newItem.price,
        seller: "Me (Local)",
        location: newItem.location,
        contact: newItem.contact,
        image: sellImage
      };
      setItems(prev => [addedItem, ...prev]);
      setIsPosting(false);
      setSellImage(null);
      setNewItem({ name: '', price: '', contact: '', location: 'My Village' });
      setView('buy');
      setSellStep(0);
    }, 1200);
  };

  const handleVoiceFill = () => {
    if (!('webkitSpeechRecognition' in window)) {
      alert("Speech recognition not supported");
      return;
    }
    const recognition = new (window as any).webkitSpeechRecognition();
    recognition.lang = SPEECH_LANG_MAP[language] || 'en-IN';
    recognition.onstart = () => setIsVoiceFilling(true);
    recognition.onend = () => setIsVoiceFilling(false);
    recognition.onresult = async (event: any) => {
      const speech = event.results[0][0].transcript;
      const extracted = await extractMandiItem(speech, language);
      if (extracted.name) {
        setNewItem(prev => ({ 
          ...prev, 
          name: extracted.name || prev.name, 
          price: extracted.price || prev.price,
          contact: extracted.contact || prev.contact,
          location: extracted.location || prev.location
        }));
        setSellStep(1); // Advance to photo upload after voice fill
      }
    };
    recognition.start();
  };

  const speakItem = (item: MarketItem) => {
    const text = `${t("Item Name")}: ${item.name}. ${t("Price")}: ${item.price}. ${t("Contact Seller")}: ${item.seller}`;
    speak(text, language);
  };

  return (
    <Modal isOpen={isOpen} onClose={() => { onClose(); setView('buy'); setSellImage(null); setSellStep(0); }} title={t("Kisan Mandi")} maxWidth="max-w-4xl">
      <div className="flex justify-between items-center mb-8">
        <h3 className="text-2xl font-black text-gray-900 uppercase tracking-tighter">
          {view === 'buy' ? t("Kisan Mandi") : t("Sell Produce")}
        </h3>
        <button 
          onClick={() => {
            if (view === 'buy') setView('sell');
            else {
              setView('buy');
              setSellStep(0);
            }
          }} 
          className={`px-6 py-3 rounded-xl font-black uppercase tracking-widest text-[10px] transition-all border-2 ${view === 'buy' ? 'bg-green-600 text-white border-green-600' : 'bg-white text-gray-400 border-gray-100'}`}
        >
           {view === 'buy' ? t("Sell Produce") : t("Back to Market")}
        </button>
      </div>

      {view === 'buy' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((item) => (
            <div key={item.id} className="bg-white border border-gray-100 rounded-[2rem] overflow-hidden hover:shadow-xl transition-all relative group shadow-sm">
              <img src={item.image} className="w-full h-40 object-cover" />
              <button 
                onClick={() => speakItem(item)}
                className="absolute top-4 right-4 bg-white/95 p-3 rounded-full text-green-600 hover:bg-green-600 hover:text-white transition-all shadow-xl border border-white active:scale-90"
              >
                <Volume2 size={20} />
              </button>
              <div className="p-6">
                <div className="flex justify-between items-start mb-2">
                   <h4 className="font-black uppercase tracking-tight text-gray-900">{item.name}</h4>
                   <span className="text-xs font-black text-green-600">{item.price}</span>
                </div>
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4 space-y-1">
                   <div className="flex items-center gap-1"><User size={12}/> {item.seller}</div>
                   <div className="flex items-center gap-1"><MapPin size={12}/> {item.location}</div>
                </div>
                <a href={`tel:${item.contact}`} className="w-full bg-green-50 text-green-700 py-3 rounded-xl flex items-center justify-center gap-2 font-black uppercase tracking-widest text-[10px] border border-green-100 hover:bg-green-600 hover:text-white transition-all">
                   <Phone size={14}/> {t("Contact Seller")}
                </a>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="max-w-2xl mx-auto space-y-6 pb-10">
          {sellStep === 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in slide-in-from-bottom-6">
              <button 
                onClick={handleVoiceFill}
                className="bg-green-600 p-12 rounded-[3rem] border-4 border-white shadow-2xl hover:scale-105 active:scale-95 transition-all flex flex-col items-center gap-6 group"
              >
                <div className={`p-6 rounded-full ${isVoiceFilling ? 'bg-red-500 animate-pulse' : 'bg-white/20'} text-white shadow-inner`}>
                   <Mic size={56} />
                </div>
                <div className="text-center">
                   <h4 className="text-xl font-black text-white uppercase tracking-tighter">{t("Describe via Voice")}</h4>
                   <p className="text-green-100 text-xs mt-2 font-medium">{t("Tell us what you are selling")}</p>
                </div>
              </button>
              
              <button 
                onClick={() => setSellStep(1)}
                className="bg-white p-12 rounded-[3rem] border-4 border-gray-50 shadow-xl hover:scale-105 active:scale-95 transition-all flex flex-col items-center gap-6 group"
              >
                <div className="p-6 rounded-full bg-gray-50 text-green-600 shadow-inner group-hover:bg-green-50">
                   <Plus size={56} />
                </div>
                <div className="text-center">
                   <h4 className="text-xl font-black text-gray-900 uppercase tracking-tighter">{t("Manual Entry")}</h4>
                   <p className="text-gray-400 text-xs mt-2 font-medium">{t("Fill details yourself")}</p>
                </div>
              </button>
            </div>
          ) : (
            <div className="space-y-6 animate-in fade-in duration-500">
              <button onClick={() => setSellStep(0)} className="flex items-center gap-2 text-gray-400 font-black uppercase tracking-widest text-[10px] mb-4 hover:text-green-600">
                <ChevronLeft size={16} /> {t("Change Method")}
              </button>
              
              <div className="bg-green-50 p-5 rounded-3xl border border-green-100 flex items-center justify-between shadow-sm">
                 <div className="flex items-center gap-4">
                   <div className="bg-green-600 text-white p-3 rounded-2xl shadow-lg"><Sparkles size={20}/></div>
                   <div>
                     <p className="text-xs font-black uppercase tracking-widest text-green-800">Sahayak AI</p>
                     <p className="text-[10px] text-green-600 font-bold uppercase tracking-widest mt-0.5">{isVoiceFilling ? t("Listening...") : t("Update via Voice")}</p>
                   </div>
                 </div>
                 <button 
                   onClick={handleVoiceFill}
                   className={`p-4 rounded-full transition-all shadow-lg active:scale-95 ${isVoiceFilling ? 'bg-red-500 text-white animate-pulse' : 'bg-white text-green-600 border border-green-100'}`}
                 >
                   <Mic size={24} />
                 </button>
              </div>

              {!sellImage ? (
                <div className="border-4 border-dashed border-gray-100 bg-gray-50 rounded-[3rem] p-12 flex flex-col items-center gap-6 shadow-inner">
                   <div className="grid grid-cols-2 gap-4 w-full">
                      <button onClick={handleVoiceFill} className="flex flex-col items-center gap-2 p-6 bg-white rounded-3xl border border-gray-100 hover:border-green-400 transition-all group">
                         <div className="p-4 bg-green-50 text-green-600 rounded-2xl group-hover:bg-green-600 group-hover:text-white transition-all"><Mic size={24}/></div>
                         <span className="font-black text-[10px] uppercase tracking-widest text-gray-500 group-hover:text-green-600">{t("Voice Describe")}</span>
                      </button>
                      <button onClick={() => fileInputRef.current?.click()} className="flex flex-col items-center gap-2 p-6 bg-white rounded-3xl border border-gray-100 hover:border-blue-400 transition-all group">
                         <div className="p-4 bg-blue-50 text-blue-600 rounded-2xl group-hover:bg-blue-600 group-hover:text-white transition-all"><Camera size={24}/></div>
                         <span className="font-black text-[10px] uppercase tracking-widest text-gray-500 group-hover:text-blue-600">{t("Choose Photo")}</span>
                      </button>
                   </div>
                   <input type="file" ref={fileInputRef} hidden accept="image/*" onChange={(e) => {
                     const file = e.target.files?.[0];
                     if (file) {
                       const reader = new FileReader();
                       reader.onloadend = () => setSellImage(reader.result as string);
                       reader.readAsDataURL(file);
                     }
                   }} />
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="relative group">
                    <img src={sellImage} className="w-full h-56 object-cover rounded-[2.5rem] border-4 border-white shadow-2xl" />
                    <button onClick={() => setSellImage(null)} className="absolute top-4 right-4 bg-red-500 text-white p-2.5 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity active:scale-90">
                      <X size={18} />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <Input label={t("Item Name")} placeholder="e.g. Rice" value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})} />
                    <Input label={t("Price")} placeholder="₹20/kg" value={newItem.price} onChange={e => setNewItem({...newItem, price: e.target.value})} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <Input label={t("Contact")} type="tel" value={newItem.contact} onChange={e => setNewItem({...newItem, contact: e.target.value})} />
                    <Input label={t("Village / City")} value={newItem.location} onChange={e => setNewItem({...newItem, location: e.target.value})} />
                  </div>
                  <Button onClick={handlePost} isLoading={isPosting} className="w-full py-5 rounded-[2rem] font-black uppercase tracking-widest shadow-xl">{t("Post Listing")}</Button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </Modal>
  );
};

export const OfflineResourcesModal: React.FC<{ isOpen: boolean; onClose: () => void; language: Language }> = ({ isOpen, onClose, language }) => {
  const { t } = useLanguage();
  const cachedItems = getAllCachedItems();
  const keys = Object.keys(cachedItems);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t("Offline Resources")}>
       <div className="space-y-4">
         {keys.length === 0 ? (
           <div className="p-8 text-center text-gray-500 font-bold uppercase tracking-widest text-xs">
             No saved resources yet. Use the "Save for Offline" button on learning modules to see them here.
           </div>
         ) : (
           <div className="grid grid-cols-1 gap-3">
             {keys.map((key, idx) => {
               const title = key.split('_')[1]?.substring(0, 30) + '...' || `Resource ${idx + 1}`;
               return (
                 <div key={key} className="p-4 bg-gray-50 border border-gray-100 rounded-xl flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="bg-emerald-100 p-2 rounded-lg"><FileText className="text-emerald-600" size={20} /></div>
                      <span className="text-sm font-bold text-gray-800">{title}</span>
                    </div>
                    <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Saved</span>
                 </div>
               );
             })}
           </div>
         )}
       </div>
    </Modal>
  );
};
