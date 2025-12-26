
import React, { useState, useEffect, useRef } from 'react';
import { Modal, Input, Button } from './Shared';
import { generateContent } from '../services/geminiService';
import { MapPin, User, Briefcase, GraduationCap, Mic, Volume2, ShieldCheck, AlertTriangle, Navigation } from 'lucide-react';
import { Language } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import L from 'leaflet';

// --- Resume Builder ---
export const ResumeModal: React.FC<{ isOpen: boolean; onClose: () => void; language: Language }> = ({ isOpen, onClose, language }) => {
  const [step, setStep] = useState(0);
  const [data, setData] = useState({ name: '', location: '', skills: '', experience: '', education: '' });
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const { t } = useLanguage();

  const generateResume = async () => {
    setLoading(true);
    const prompt = `Create a professional resume summary for a rural worker based on this info: Name: ${data.name}, Location: ${data.location}, Skills: ${data.skills}, Experience: ${data.experience}, Education: ${data.education}. Format nicely with sections.`;
    const res = await generateContent(prompt, language);
    setResult(res);
    setLoading(false);
    setStep(1);
  };

  return (
    <Modal isOpen={isOpen} onClose={() => { onClose(); setStep(0); setResult(''); }} title={t("Smart Resume Builder")}>
      {step === 0 ? (
        <div className="space-y-4">
          <p className="text-gray-600 mb-4">{t("Resume Description")}</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label={t("Full Name")} placeholder="" value={data.name} onChange={e => setData({...data, name: e.target.value})} icon={<User size={16}/>} />
            <Input label={t("Village / City")} placeholder="" value={data.location} onChange={e => setData({...data, location: e.target.value})} />
          </div>
          <Input label={t("Skills")} placeholder="" value={data.skills} onChange={e => setData({...data, skills: e.target.value})} />
          <Input label={t("Work Experience")} placeholder="" value={data.experience} onChange={e => setData({...data, experience: e.target.value})} />
          <Input label={t("Education")} placeholder="" value={data.education} onChange={e => setData({...data, education: e.target.value})} />
          <div className="pt-4">
            <Button onClick={generateResume} isLoading={loading} className="w-full">{t("Generate")}</Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 text-sm whitespace-pre-wrap font-mono">
            {result}
          </div>
          <div className="flex gap-3">
             <Button variant="outline" onClick={() => setStep(0)} className="flex-1">{t("Edit Details")}</Button>
             <Button onClick={onClose} className="flex-1">{t("Download PDF")}</Button>
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
  const { t } = useLanguage();

  const findSchemes = async () => {
    setLoading(true);
    const prompt = `List 3 specific Indian government schemes for a ${data.age} year old ${data.gender} working as ${data.occupation} in ${data.state} with income ₹${data.income}. Return as a concise bulleted list.`;
    const res = await generateContent(prompt, language);
    setResult(res);
    setLoading(false);
  };

  return (
    <Modal isOpen={isOpen} onClose={() => { onClose(); setResult(null); }} title={t("Scheme Matcher")}>
       {!result ? (
         <div className="space-y-4">
           <p className="text-gray-600">{t("Scheme Description")}</p>
           <div className="grid grid-cols-2 gap-4">
             <Input label={t("Age")} type="number" placeholder="" value={data.age} onChange={e => setData({...data, age: e.target.value})} />
             <div className="flex flex-col gap-1">
               <label className="text-sm font-medium text-gray-700">{t("Gender")}</label>
               <select className="px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-green-500" value={data.gender} onChange={e => setData({...data, gender: e.target.value})}>
                 <option value="Male">Male</option>
                 <option value="Female">Female</option>
                 <option value="Other">Other</option>
               </select>
             </div>
           </div>
           <Input label={t("Occupation")} placeholder="" value={data.occupation} onChange={e => setData({...data, occupation: e.target.value})} />
           <Input label={t("Income")} placeholder="" value={data.income} onChange={e => setData({...data, income: e.target.value})} />
           <Input label={t("State / District")} placeholder="" value={data.state} onChange={e => setData({...data, state: e.target.value})} />
           <Button onClick={findSchemes} isLoading={loading} className="w-full mt-2">{t("Find My Schemes")}</Button>
         </div>
       ) : (
         <div className="space-y-4">
           <h3 className="font-semibold text-green-700">{t("Recommended")}:</h3>
           <div className="bg-green-50 p-4 rounded-lg text-gray-800 text-sm whitespace-pre-line">
             {result}
           </div>
           <Button onClick={() => setResult(null)} variant="outline" className="w-full">{t("Search Again")}</Button>
         </div>
       )}
    </Modal>
  );
};

// --- Mobility Planner ---
export const MobilityModal: React.FC<{ isOpen: boolean; onClose: () => void; language: Language }> = ({ isOpen, onClose, language }) => {
  const [step, setStep] = useState(0);
  const [data, setData] = useState({ start: '', end: '', aid: 'None', time: '' });
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMap = useRef<L.Map | null>(null);
  const { t } = useLanguage();

  useEffect(() => {
    // Re-initialize map when step changes to 'Results' (step 2)
    let timer: any;
    if (step === 2 && mapRef.current) {
      // Small delay to ensure the modal's animation finishes and container has actual width/height
      timer = setTimeout(() => {
        if (!mapRef.current) return;
        
        // Cleanup existing map if it somehow exists
        if (leafletMap.current) {
          leafletMap.current.remove();
        }

        const lat = 22.5726;
        const lng = 88.3639;
        
        leafletMap.current = L.map(mapRef.current).setView([lat, lng], 14);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap'
        }).addTo(leafletMap.current);

        const routePoints: L.LatLngExpression[] = [
          [lat, lng],
          [lat + 0.005, lng + 0.005],
          [lat + 0.01, lng + 0.008]
        ];

        L.polyline(routePoints, { color: '#10b981', weight: 6, opacity: 0.8 }).addTo(leafletMap.current);
        L.marker([lat, lng]).addTo(leafletMap.current).bindPopup("Start").openPopup();
        L.marker([lat + 0.01, lng + 0.008]).addTo(leafletMap.current).bindPopup("Destination");
        
        // Crucial for Leaflet in dynamic containers/modals
        leafletMap.current.invalidateSize();
      }, 200);
    }
    return () => {
      clearTimeout(timer);
      if (leafletMap.current) {
        leafletMap.current.remove();
        leafletMap.current = null;
      }
    };
  }, [step]);

  const handleSearch = () => {
    setStep(1);
    setTimeout(() => setStep(2), 1500);
  };

  return (
    <Modal isOpen={isOpen} onClose={() => { onClose(); setStep(0); }} title={t("Mobility Planner")}>
      {step === 0 && (
        <div className="space-y-5">
           <p className="text-gray-600">{t("Mobility Description")}</p>
           <Input label={t("Start Location")} placeholder="" value={data.start} onChange={e => setData({...data, start: e.target.value})} icon={<MapPin size={16}/>} />
           <Input label={t("Destination")} placeholder="" value={data.end} onChange={e => setData({...data, end: e.target.value})} />
           <div className="grid grid-cols-2 gap-4">
             <div className="flex flex-col gap-1">
               <label className="text-sm font-medium text-gray-700">{t("Mobility Aid")}</label>
               <select className="px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-green-500" value={data.aid} onChange={e => setData({...data, aid: e.target.value})}>
                 <option value="None">None</option>
                 <option value="Wheelchair">Wheelchair</option>
                 <option value="Walking Stick">Walking Stick</option>
                 <option value="Crutches">Crutches</option>
               </select>
             </div>
             <Input label={t("Time")} type="time" value={data.time} onChange={e => setData({...data, time: e.target.value})} />
           </div>
           <Button onClick={handleSearch} className="w-full py-4 mt-2 font-black uppercase tracking-widest rounded-2xl">
             {t("Find Safe Route")}
           </Button>
        </div>
      )}
      {step === 1 && (
        <div className="flex flex-col items-center justify-center py-24">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-green-500 border-t-transparent mb-4"></div>
          <p className="text-gray-500 font-black uppercase tracking-widest text-[10px]">{t("Calculating Path")}</p>
        </div>
      )}
      {step === 2 && (
        <div className="space-y-4 animate-in fade-in duration-500">
          <div className="bg-green-50 border border-green-200 rounded-2xl p-5 flex items-start gap-4 shadow-sm">
             <ShieldCheck className="text-green-600 shrink-0 mt-1" size={24} />
             <div>
               <h4 className="font-black text-green-800 uppercase tracking-tight">{t("Safe Route Found")}</h4>
               <p className="text-sm text-green-700 mt-1 leading-relaxed">This route is paved and well-lit. Avoids construction on the main road.</p>
             </div>
          </div>
          
          <div className="h-80 w-full relative bg-gray-50 rounded-[2rem] overflow-hidden border-2 border-gray-100 shadow-inner">
             <div ref={mapRef} className="h-full w-full z-10" />
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
               <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Estimated Time</p>
               <p className="font-black text-gray-900 text-lg">15 mins</p>
             </div>
             <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
               <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Route Distance</p>
               <p className="font-black text-gray-900 text-lg">1.2 km</p>
             </div>
          </div>

          <div className="flex gap-4 pt-4">
            <Button variant="outline" onClick={() => setStep(0)} className="flex-1 py-4 font-black uppercase tracking-widest text-[10px]">{t("Plan Another")}</Button>
            <Button onClick={onClose} className="flex-1 py-4 font-black uppercase tracking-widest text-[10px]">{t("Close")}</Button>
          </div>
        </div>
      )}
    </Modal>
  );
};
