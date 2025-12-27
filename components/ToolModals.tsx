
import React, { useState, useEffect, useRef } from 'react';
import { Modal, Input, Button } from './Shared';
import { generateContent, getMobilityPlan, extractResumeDetails, extractSchemeDetails, extractMobilityDetails } from '../services/geminiService';
import { speak } from '../services/speechService';
import { MapPin, User, Briefcase, GraduationCap, Mic, Volume2, ShieldCheck, AlertTriangle, Navigation, ExternalLink, Sparkles, ChevronRight, ChevronLeft, Flag } from 'lucide-react';
import { Language } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import ReactMarkdown from 'react-markdown';
import L from 'leaflet';

// Fix for Leaflet marker icons in modern environments
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const SPEECH_LANG_MAP: Record<string, string> = {
  'en': 'en-IN', 'hi': 'hi-IN', 'bn': 'bn-IN', 'te': 'te-IN', 'mr': 'mr-IN', 'ta': 'ta-IN', 'ur': 'ur-PK', 'gu': 'gu-IN', 'kn': 'kn-IN', 'ml': 'ml-IN', 'pa': 'pa-IN', 'or': 'or-IN', 'as': 'as-IN' 
};

// --- Resume Builder ---
export const ResumeModal: React.FC<{ isOpen: boolean; onClose: () => void; language: Language }> = ({ isOpen, onClose, language }) => {
  const [step, setStep] = useState(0);
  const [data, setData] = useState({ name: '', location: '', skills: '', experience: '', education: '' });
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [isVoiceFilling, setIsVoiceFilling] = useState(false);
  const { t } = useLanguage();

  const generateResume = async () => {
    setLoading(true);
    const prompt = `Create a professional resume summary for a rural worker based on this info: Name: ${data.name}, Location: ${data.location}, Skills: ${data.skills}, Experience: ${data.experience}, Education: ${data.education}. Format nicely with sections.`;
    const res = await generateContent(prompt, language);
    setResult(res);
    setLoading(false);
    setStep(1);
  };

  const handleVoiceFill = () => {
    if (!('webkitSpeechRecognition' in window)) return;
    const recognition = new (window as any).webkitSpeechRecognition();
    recognition.lang = SPEECH_LANG_MAP[language] || 'en-IN';
    recognition.onstart = () => setIsVoiceFilling(true);
    recognition.onend = () => setIsVoiceFilling(false);
    recognition.onresult = async (event: any) => {
      const speech = event.results[0][0].transcript;
      const extracted = await extractResumeDetails(speech, language);
      setData(prev => ({ ...prev, ...extracted }));
    };
    recognition.start();
  };

  return (
    <Modal isOpen={isOpen} onClose={() => { onClose(); setStep(0); setResult(''); }} title={t("Smart Resume Builder")}>
      {step === 0 ? (
        <div className="space-y-4">
          <div className="bg-green-50 p-5 rounded-3xl border border-green-100 flex items-center justify-between shadow-sm mb-4">
             <div className="flex items-center gap-4">
               <div className="bg-green-600 text-white p-2.5 rounded-2xl shadow-lg"><Sparkles size={20}/></div>
               <div>
                 <p className="text-xs font-black uppercase tracking-widest text-green-800">{t("Sahayak AI")}</p>
                 <p className="text-[10px] text-green-600 font-bold uppercase tracking-widest mt-0.5">{isVoiceFilling ? t("Listening...") : t("Voice Fill Form")}</p>
               </div>
             </div>
             <button onClick={handleVoiceFill} className={`p-4 rounded-full transition-all shadow-lg active:scale-90 ${isVoiceFilling ? 'bg-red-500 text-white animate-pulse' : 'bg-white text-green-600 hover:bg-green-50 border border-green-100'}`}><Mic size={24} /></button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label={t("Full Name")} placeholder="" value={data.name} onChange={e => setData({...data, name: e.target.value})} icon={<User size={16}/>} />
            <Input label={t("Village / City")} placeholder="" value={data.location} onChange={e => setData({...data, location: e.target.value})} />
          </div>
          <Input label={t("Skills")} placeholder="" value={data.skills} onChange={e => setData({...data, skills: e.target.value})} />
          <Input label={t("Work Experience")} placeholder="" value={data.experience} onChange={e => setData({...data, experience: e.target.value})} />
          <Input label={t("Education")} placeholder="" value={data.education} onChange={e => setData({...data, education: e.target.value})} />
          <div className="pt-4"><Button onClick={generateResume} isLoading={loading} className="w-full py-4 font-black uppercase tracking-widest">{t("Generate")}</Button></div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="relative group">
            <div className="bg-gray-50 p-6 rounded-2xl border border-gray-200 text-sm whitespace-pre-wrap font-medium leading-relaxed">{result}</div>
            <button onClick={() => speak(result, language)} className="absolute top-4 right-4 p-3 bg-white text-green-600 rounded-full shadow-lg border border-gray-100 hover:bg-green-600 hover:text-white transition-all"><Volume2 size={20} /></button>
          </div>
          <div className="flex gap-3">
             <Button variant="outline" onClick={() => setStep(0)} className="flex-1 py-4 font-black uppercase tracking-widest text-[10px]">{t("Edit Details")}</Button>
             <Button onClick={onClose} className="flex-1 py-4 font-black uppercase tracking-widest text-[10px]">{t("Close")}</Button>
          </div>
        </div>
      )}
    </Modal>
  );
};

// --- Scheme Matcher ---
export const SchemeModal: React.FC<{ isOpen: boolean; onClose: () => void; language: Language }> = ({ isOpen, onClose, language }) => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [data, setData] = useState({ age: '', gender: 'Male', occupation: '', income: '', state: '' });
  const [isVoiceFilling, setIsVoiceFilling] = useState(false);
  const { t } = useLanguage();

  const handleVoiceFill = () => {
    if (!('webkitSpeechRecognition' in window)) return;
    const recognition = new (window as any).webkitSpeechRecognition();
    recognition.lang = SPEECH_LANG_MAP[language] || 'en-IN';
    recognition.onstart = () => setIsVoiceFilling(true);
    recognition.onend = () => setIsVoiceFilling(false);
    recognition.onresult = async (event: any) => {
      const speech = event.results[0][0].transcript;
      const extracted = await extractSchemeDetails(speech, language);
      setData(prev => ({ ...prev, ...extracted }));
    };
    recognition.start();
  };

  const findSchemes = async () => {
    setLoading(true);
    const prompt = `List 3 government schemes for: Age ${data.age}, ${data.gender}, ${data.occupation}, ${data.state}, Income ${data.income}. Return names and brief benefits as bullet list.`;
    const res = await generateContent(prompt, language, "Sarkari Scheme Assistant. Concise output.");
    setResult(res);
    setLoading(false);
  };

  return (
    <Modal isOpen={isOpen} onClose={() => { onClose(); setResult(null); }} title={t("Scheme Matcher")}>
       {!result ? (
         <div className="space-y-4">
           <div className="bg-green-50 p-5 rounded-3xl border border-green-100 flex items-center justify-between shadow-sm mb-4">
              <div className="flex items-center gap-4">
                <div className="bg-green-600 text-white p-2.5 rounded-2xl shadow-lg"><Sparkles size={20}/></div>
                <div>
                  <p className="text-xs font-black uppercase tracking-widest text-green-800">{t("Sahayak AI")}</p>
                  <p className="text-[10px] text-green-600 font-bold uppercase tracking-widest mt-0.5">{isVoiceFilling ? t("Listening...") : t("Voice Fill Form")}</p>
                </div>
              </div>
              <button onClick={handleVoiceFill} className={`p-4 rounded-full transition-all shadow-lg active:scale-90 ${isVoiceFilling ? 'bg-red-500 text-white animate-pulse' : 'bg-white text-green-600 hover:bg-green-50 border border-green-100'}`}><Mic size={24} /></button>
           </div>
           <div className="grid grid-cols-2 gap-4">
             <Input label={t("Age")} type="number" placeholder="" value={data.age} onChange={e => setData({...data, age: e.target.value})} />
             <div className="flex flex-col gap-1">
               <label className="text-sm font-medium text-gray-700">{t("Gender")}</label>
               <select className="px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-green-500 font-medium" value={data.gender} onChange={e => setData({...data, gender: e.target.value})}>
                 <option value="Male">Male</option>
                 <option value="Female">Female</option>
                 <option value="Other">Other</option>
               </select>
             </div>
           </div>
           <Input label={t("Occupation")} placeholder="" value={data.occupation} onChange={e => setData({...data, occupation: e.target.value})} />
           <Input label={t("Income")} placeholder="" value={data.income} onChange={e => setData({...data, income: e.target.value})} />
           <Input label={t("State / District")} placeholder="" value={data.state} onChange={e => setData({...data, state: e.target.value})} />
           <Button onClick={findSchemes} isLoading={loading} className="w-full mt-2 py-4 font-black uppercase tracking-widest">{t("Find My Schemes")}</Button>
         </div>
       ) : (
         <div className="space-y-4">
           <div className="relative group">
            <div className="bg-green-50 p-6 rounded-2xl text-gray-800 text-sm whitespace-pre-line font-medium leading-relaxed">{result}</div>
            <button onClick={() => speak(result || '', language)} className="absolute top-4 right-4 p-3 bg-white text-green-600 rounded-full shadow-lg border border-gray-100 hover:bg-green-600 hover:text-white transition-all"><Volume2 size={20} /></button>
           </div>
           <Button onClick={() => setResult(null)} variant="outline" className="w-full py-4 font-black uppercase tracking-widest">{t("Search Again")}</Button>
         </div>
       )}
    </Modal>
  );
};

// --- Mobility Planner (Wizard UI) ---
export const MobilityModal: React.FC<{ isOpen: boolean; onClose: () => void; language: Language; initialData?: { start?: string; end?: string } }> = ({ isOpen, onClose, language, initialData }) => {
  const [wizardStep, setWizardStep] = useState(1);
  const [data, setData] = useState({ start: '', end: '', aid: 'None' });
  const [planningResult, setPlanningResult] = useState<{ text: string; links: { title: string; uri: string }[] } | null>(null);
  const [loading, setLoading] = useState(false);
  const [isVoiceFilling, setIsVoiceFilling] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMap = useRef<L.Map | null>(null);
  const { t } = useLanguage();

  useEffect(() => {
    if (initialData && isOpen) {
      setData(prev => ({ ...prev, ...initialData }));
      if (initialData.start && initialData.end) setWizardStep(3);
    }
  }, [initialData, isOpen]);

  useEffect(() => {
    let timer: any;
    if (wizardStep === 4 && mapRef.current) {
      timer = setTimeout(() => {
        if (!mapRef.current || leafletMap.current) return;
        
        const hash = (str: string) => str.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
        const lat = 20.5937 + ((hash(data.start) % 400) - 200) / 1000; 
        const lng = 78.9629 + ((hash(data.end) % 400) - 200) / 1000;
        
        try {
          leafletMap.current = L.map(mapRef.current, { 
            zoomControl: true, 
            scrollWheelZoom: false 
          }).setView([lat, lng], 13);
          
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { 
            attribution: '&copy; OpenStreetMap' 
          }).addTo(leafletMap.current);
          
          L.marker([lat, lng]).addTo(leafletMap.current).bindPopup(`${t("Start Location")}: ${data.start}`).openPopup();
          
          // CRITICAL: Call invalidateSize after slight delay to handle modal rendering/small screens
          setTimeout(() => leafletMap.current?.invalidateSize(), 200);
          setTimeout(() => leafletMap.current?.invalidateSize(), 600);
          setTimeout(() => leafletMap.current?.invalidateSize(), 1500);
        } catch (e) { 
          console.error("Map Error:", e); 
        }
      }, 600);
    }
    return () => {
      clearTimeout(timer);
      if (leafletMap.current) { 
        leafletMap.current.remove(); 
        leafletMap.current = null; 
      }
    };
  }, [wizardStep, data.start, data.end, t]);

  const handleVoiceFill = () => {
    if (!('webkitSpeechRecognition' in window)) return;
    const recognition = new (window as any).webkitSpeechRecognition();
    recognition.lang = SPEECH_LANG_MAP[language] || 'en-IN';
    recognition.onstart = () => setIsVoiceFilling(true);
    recognition.onend = () => setIsVoiceFilling(false);
    recognition.onresult = async (event: any) => {
      const speech = event.results[0][0].transcript;
      const extracted = await extractMobilityDetails(speech, language);
      setData(prev => ({ ...prev, ...extracted }));
      if (extracted.start && extracted.end) {
          setWizardStep(4);
          startPlanning(extracted.start, extracted.end, extracted.aid);
      }
    };
    recognition.start();
  };

  const startPlanning = async (s: string, e: string, a: string) => {
    setLoading(true);
    const plan = await getMobilityPlan(s, e, a, language);
    setPlanningResult(plan);
    setLoading(false);
  };

  const next = () => {
    if (wizardStep === 3) {
      setWizardStep(4);
      startPlanning(data.start, data.end, data.aid);
    } else setWizardStep(wizardStep + 1);
  };

  const prev = () => setWizardStep(wizardStep - 1);

  return (
    <Modal isOpen={isOpen} onClose={() => { onClose(); setWizardStep(1); setPlanningResult(null); }} title={t("Mobility Planner")} maxWidth="max-w-4xl">
      <div className="space-y-6">
        {wizardStep < 4 && (
          <div className="bg-green-50 p-5 rounded-3xl border border-green-100 flex items-center justify-between shadow-sm">
             <div className="flex items-center gap-4">
               <div className="bg-green-600 text-white p-2.5 rounded-2xl shadow-lg"><Sparkles size={20}/></div>
               <div>
                 <p className="text-xs font-black text-green-800 uppercase tracking-widest">{t("Sahayak AI")}</p>
                 <p className="text-[10px] text-green-600 font-bold uppercase mt-0.5">{isVoiceFilling ? t("Listening...") : t("Speak trip details")}</p>
               </div>
             </div>
             <button onClick={handleVoiceFill} className={`p-4 rounded-full transition-all shadow-lg active:scale-90 ${isVoiceFilling ? 'bg-red-500 text-white animate-pulse' : 'bg-white text-green-600 border border-green-100'}`}><Mic size={24} /></button>
          </div>
        )}

        {wizardStep < 4 && (
          <div className="flex justify-between items-center px-2 mb-8">
            {[1, 2, 3].map(s => (
              <div key={s} className="flex flex-col items-center gap-2">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black transition-all ${wizardStep >= s ? 'bg-green-600 text-white shadow-lg' : 'bg-gray-100 text-gray-400'}`}>{s}</div>
                <span className={`text-[9px] font-black uppercase tracking-widest ${wizardStep === s ? 'text-green-600' : 'text-gray-300'}`}>
                  {s === 1 ? t("Select Start") : s === 2 ? t("Select End") : t("Select Aid")}
                </span>
              </div>
            ))}
          </div>
        )}

        <div className="min-h-[350px]">
          {wizardStep === 1 && (
            <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
               <h3 className="text-2xl font-black text-gray-900 uppercase tracking-tighter">{t("Select Start")}</h3>
               <Input placeholder="Enter village or town..." value={data.start} onChange={e => setData({...data, start: e.target.value})} icon={<MapPin size={20}/>} className="py-4 px-6 text-lg" />
            </div>
          )}
          {wizardStep === 2 && (
            <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
               <h3 className="text-2xl font-black text-gray-900 uppercase tracking-tighter">{t("Select End")}</h3>
               <Input placeholder="Enter destination..." value={data.end} onChange={e => setData({...data, end: e.target.value})} icon={<Flag size={20}/>} className="py-4 px-6 text-lg" />
            </div>
          )}
          {wizardStep === 3 && (
            <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
               <h3 className="text-2xl font-black text-gray-900 uppercase tracking-tighter">{t("Select Aid")}</h3>
               <div className="grid grid-cols-2 gap-4">
                 {['None', 'Wheelchair', 'Walking Stick', 'Crutches'].map(aid => (
                    <button key={aid} onClick={() => setData({...data, aid})} className={`p-6 rounded-[2rem] border-4 transition-all flex flex-col items-center gap-3 ${data.aid === aid ? 'bg-green-50 border-green-500 text-green-700 shadow-xl' : 'bg-white border-gray-100 text-gray-400 hover:border-green-100'}`}>
                       <span className="text-xs font-black uppercase tracking-widest">{t(aid)}</span>
                    </button>
                 ))}
               </div>
            </div>
          )}
          {wizardStep === 4 && (
            <div className="space-y-4 animate-in fade-in duration-500">
               {loading ? (
                 <div className="flex flex-col items-center justify-center py-24 gap-4"><div className="animate-spin rounded-full h-12 w-12 border-4 border-green-500 border-t-transparent"></div><p className="text-xs font-black text-gray-400 uppercase tracking-widest">{t("Calculating Path")}</p></div>
               ) : planningResult && (
                 <div className="space-y-5">
                   <div className="bg-emerald-50 border-2 border-emerald-100 rounded-[2.5rem] p-6 relative">
                     <button onClick={() => speak(planningResult.text, language)} className="absolute top-4 right-4 p-3 bg-white text-emerald-600 rounded-full shadow-lg border border-emerald-50 hover:bg-emerald-600 hover:text-white transition-all"><Volume2 size={20} /></button>
                     <h4 className="font-black text-emerald-800 uppercase tracking-tight mb-3 flex items-center gap-2"><ShieldCheck size={20}/> {t("Safe Route Found")}</h4>
                     <ReactMarkdown className="text-emerald-700 text-sm font-medium leading-relaxed pr-10">{planningResult.text}</ReactMarkdown>
                   </div>
                   <div className="flex flex-wrap gap-2">
                     {planningResult.links.map((link, idx) => (
                       <a key={idx} href={link.uri} target="_blank" rel="noopener noreferrer" className="bg-blue-50 text-blue-700 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-blue-100 flex items-center gap-2 hover:bg-blue-100 transition-all"><ExternalLink size={14}/> {link.title}</a>
                     ))}
                   </div>
                   {/* Responsive Map Height for small screens */}
                   <div className="h-[50vh] min-h-[300px] max-h-[500px] w-full bg-gray-50 rounded-[2.5rem] overflow-hidden border-2 border-gray-100 shadow-inner relative">
                      <div ref={mapRef} className="absolute inset-0 w-full h-full" style={{ zIndex: 1 }} />
                   </div>
                   <Button variant="outline" onClick={() => { setWizardStep(1); setPlanningResult(null); }} className="w-full py-4 rounded-3xl font-black uppercase tracking-widest text-[10px]">{t("Plan Another")}</Button>
                 </div>
               )}
            </div>
          )}
        </div>

        {wizardStep < 4 && (
          <div className="flex gap-4 pt-6">
            {wizardStep > 1 && <Button variant="outline" onClick={prev} className="flex-1 py-4 font-black uppercase tracking-widest rounded-2xl"><ChevronLeft size={18}/> {t("Previous")}</Button>}
            <Button onClick={next} disabled={(wizardStep === 1 && !data.start) || (wizardStep === 2 && !data.end)} className="flex-1 py-4 font-black uppercase tracking-widest rounded-2xl shadow-lg">{wizardStep === 3 ? t("Find Safe Route") : t("Next")} <ChevronRight size={18}/></Button>
          </div>
        )}
      </div>
    </Modal>
  );
};
