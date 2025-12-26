
import React, { useState, useContext, createContext, useEffect, useRef } from 'react';
import { User as UserIcon, LogOut, Eye, Globe, BookOpen, Wifi, WifiOff, BarChart3, Cloud, Briefcase, Landmark, Navigation, ShoppingCart, Heart, Shield, GraduationCap, X, Mic, MessageCircle, ChevronDown, Download, ArrowRight, Sparkles, HandHelping, Check, AlertCircle, Scan, Camera, Loader2, Languages } from 'lucide-react';
import { User, AppView, ModalType, LearningModule, Language, MarketItem } from './types';
import { Button, Card, Input, Modal } from './components/Shared';
import { ResumeModal, SchemeModal, MobilityModal } from './components/ToolModals';
import { GovernanceModal, ChatModal, VisionModal, KisanModal, GlobalChatModal, OfflineResourcesModal, CommunityHelpModal } from './components/ServiceModals';
import { LearningViewer } from './components/LearningModule';
import { useLanguage, LANGUAGES } from './contexts/LanguageContext';
import { generateVisionContent } from './services/geminiService';
import { speak } from './services/speechService';

// --- Context ---
interface AppContextType {
  elderMode: boolean;
  toggleElderMode: () => void;
  isOffline: boolean;
  toggleOffline: () => void;
}

const AppContext = createContext<AppContextType>({ 
  elderMode: false, 
  toggleElderMode: () => {}, 
  isOffline: false,
  toggleOffline: () => {},
});

const LanguageSelector: React.FC = () => {
  const { language, setLanguage, t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const currentLang = LANGUAGES.find(l => l.code === language) || LANGUAGES[0];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl border transition-all duration-300 group shadow-sm ${isOpen ? 'bg-green-50 border-green-200 ring-2 ring-green-100' : 'bg-white border-gray-100 hover:border-green-200'}`}
      >
        <div className="flex items-center gap-2">
           <span className="text-xl leading-none">{currentLang.flag}</span>
           <span className="text-sm font-black text-gray-800 tracking-tight">{currentLang.localName}</span>
        </div>
        <ChevronDown size={16} className={`text-gray-400 group-hover:text-green-600 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-3 w-80 bg-white rounded-[2rem] shadow-3xl border border-gray-50 overflow-hidden z-50 animate-in fade-in slide-in-from-top-4 duration-300 py-3">
          <div className="px-6 py-3 border-b border-gray-50 mb-2 flex items-center justify-between">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{t("Select Language")}</span>
            <Languages size={14} className="text-gray-300" />
          </div>
          <div className="max-h-[360px] overflow-y-auto custom-scrollbar px-2 space-y-1">
            {LANGUAGES.map((lang) => (
              <button
                key={lang.code}
                onClick={() => { 
                  setLanguage(lang.code); 
                  setIsOpen(false);
                  speak(lang.localName, lang.code);
                }}
                className={`w-full flex items-center justify-between px-4 py-3.5 rounded-2xl transition-all group ${language === lang.code ? 'bg-green-600 text-white shadow-xl shadow-green-100' : 'text-gray-700 hover:bg-green-50 hover:text-green-700'}`}
              >
                <div className="flex items-center gap-4">
                  <span className="text-2xl group-hover:scale-110 transition-transform">{lang.flag}</span>
                  <div className="flex flex-col items-start leading-tight">
                    <span className="text-sm font-black uppercase tracking-tight">{lang.localName}</span>
                    <span className={`text-[10px] font-bold uppercase tracking-widest ${language === lang.code ? 'text-green-100' : 'text-gray-400 group-hover:text-green-500'}`}>{lang.name}</span>
                  </div>
                </div>
                {language === lang.code && <Check size={18} className="text-white" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// --- Face Authentication Component ---
const FaceAuth: React.FC<{ onSuccess: (name: string) => void; language: Language }> = ({ onSuccess, language }) => {
  const [active, setActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusText, setStatusText] = useState<string>('');
  const [isSuccess, setIsSuccess] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { t } = useLanguage();

  useEffect(() => {
    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const startCamera = async () => {
    setActive(true);
    setError(null);
    setStatusText('');
    setIsSuccess(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 480 }
        } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      setError("Camera Access Denied. Please enable camera permissions.");
      setActive(false);
    }
  };

  const captureAndVerify = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    setLoading(true);
    setError(null);
    setStatusText(t('Loading'));
    
    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      if (!context) throw new Error("Canvas context failed");
      
      canvas.width = 320;
      canvas.height = 240;
      
      context.translate(canvas.width, 0);
      context.scale(-1, 1);
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      const imageData = canvas.toDataURL('image/jpeg', 0.4);
      const base64 = imageData.split(',')[1];

      const prompt = `
        Focus ONLY on the person in the very front center. 
        IGNORE background patterns, shadows, or other objects.
        Is there exactly one clear human face in the foreground?
        Reply "YES" or "NO: [reason]".
      `;

      const result = await generateVisionContent(
        prompt, 
        base64, 
        "image/jpeg", 
        language,
        true 
      );

      const normalizedResult = result.toUpperCase();
      
      if (normalizedResult.includes("YES")) {
        setIsSuccess(true);
        setStatusText('OK');
        onSuccess("Verified Citizen");
      } else {
        const reason = result.includes("NO:") ? result.split("NO:")[1].trim() : "Ensure face is clear";
        setError(`Retry: ${reason.split('.')[0]}`);
        setStatusText('');
      }
    } catch (err) {
      console.error("Auth Error:", err);
      setError("Connection error.");
    } finally {
      setLoading(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setActive(false);
    setStatusText('');
    setIsSuccess(false);
  };

  if (!active) {
    return (
      <button 
        onClick={startCamera}
        className="w-full flex items-center justify-center gap-3 bg-indigo-50 text-indigo-700 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] border-2 border-indigo-100 hover:bg-indigo-600 hover:text-white hover:border-indigo-600 transition-all active:scale-95 shadow-sm"
      >
        <Scan size={18} /> Face Sign In
      </button>
    );
  }

  return (
    <div className="space-y-6 flex flex-col items-center animate-in zoom-in duration-300">
      <div className={`relative w-64 h-64 rounded-full overflow-hidden border-4 transition-all duration-300 shadow-2xl bg-black ${isSuccess ? 'border-green-500' : error ? 'border-red-500' : loading ? 'border-indigo-400' : 'border-gray-200'}`}>
        <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover scale-x-[-1]" />
        {!loading && !error && !isSuccess && <div className="animate-scan" />}
        {(loading || isSuccess) && (
          <div className={`absolute inset-0 flex flex-col items-center justify-center z-20 ${isSuccess ? 'bg-green-500/20' : 'bg-black/40'}`}>
            {isSuccess ? <Check size={48} className="text-white animate-bounce" /> : <Loader2 size={40} className="text-white animate-spin" />}
          </div>
        )}
      </div>
      
      <div className="text-center min-h-[30px] px-4">
        {statusText && <p className="text-green-600 text-[10px] font-black uppercase tracking-widest">{statusText}</p>}
        {error && <p className="text-red-500 text-[10px] font-black uppercase tracking-widest leading-tight">{error}</p>}
      </div>

      {!isSuccess && (
        <div className="flex gap-3 w-full">
           <Button 
              onClick={captureAndVerify} 
              isLoading={loading} 
              disabled={loading}
              className="flex-1 bg-indigo-600 hover:bg-indigo-700 py-4 font-black text-[10px] uppercase tracking-widest shadow-xl"
            >
              Scan
            </Button>
           <Button 
              variant="outline" 
              onClick={stopCamera} 
              className="flex-1 py-4 font-black text-[10px] uppercase tracking-widest border-gray-200"
            >
              Cancel
            </Button>
        </div>
      )}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};

const Header: React.FC<{ 
  user: User | null, 
  onViewChange: (v: AppView) => void, 
  onLogin: () => void, 
  onLogout: () => void,
  onVision: () => void 
}> = ({ user, onViewChange, onLogin, onLogout, onVision }) => {
  const { elderMode, toggleElderMode, isOffline, toggleOffline } = useContext(AppContext);
  const { t } = useLanguage();

  return (
    <header className={`bg-white/80 backdrop-blur-md border-b sticky top-0 z-40 shadow-sm transition-colors duration-500 ${isOffline ? 'border-amber-100' : 'border-green-50'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        <div className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-all active:scale-95" onClick={() => onViewChange(AppView.LANDING)}>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-2xl shadow-lg transition-all duration-500 ${isOffline ? 'bg-gradient-to-br from-amber-500 to-orange-600 shadow-amber-200' : 'bg-gradient-to-br from-green-500 to-emerald-600 shadow-green-200'}`}>G</div>
          <span className={`font-black text-gray-900 tracking-tighter transition-all ${elderMode ? 'text-3xl' : 'text-2xl'}`}>{t("GrameenConnect")}</span>
        </div>
        
        <div className="hidden lg:flex items-center gap-6">
          <nav className="flex items-center gap-5">
            <button onClick={() => onViewChange(AppView.LANDING)} className="text-gray-500 hover:text-green-600 font-black transition-colors text-[10px] uppercase tracking-widest">{t("Home")}</button>
            <button onClick={() => user ? onViewChange(AppView.PORTAL) : onLogin()} className="text-gray-500 hover:text-green-600 font-black transition-colors text-[10px] uppercase tracking-widest">{t("Portal")}</button>
          </nav>
          
          <div className="h-6 w-px bg-gray-200"></div>

          <div className="flex items-center gap-3">
            <button 
              onClick={toggleOffline} 
              className={`px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 border flex items-center gap-2 ${isOffline ? 'bg-amber-600 text-white border-amber-700 shadow-xl shadow-amber-100' : 'bg-white text-gray-500 hover:text-green-600 border-gray-100 shadow-sm'}`}
            >
              {isOffline ? <WifiOff size={14} /> : <Wifi size={14} />}
              {isOffline ? t("Offline") : t("Online")}
            </button>

            {user && (
              <>
                <button 
                  onClick={onVision} 
                  disabled={isOffline}
                  className={`px-5 py-2.5 rounded-2xl flex items-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 border shadow-sm ${isOffline ? 'bg-gray-50 text-gray-300 border-gray-100 cursor-not-allowed opacity-50' : 'bg-purple-50 text-purple-700 border-purple-100 hover:bg-purple-100'}`}
                >
                  <Eye size={14} /> {t("Vision")}
                </button>
                <button 
                  onClick={onLogout}
                  className="px-5 py-2.5 rounded-2xl flex items-center gap-2 text-[10px] font-black uppercase tracking-widest bg-red-50 text-red-600 border border-red-100 hover:bg-red-600 hover:text-white transition-all active:scale-95 shadow-sm"
                >
                  <LogOut size={14} /> {t("Sign Out")}
                </button>
              </>
            )}
            
            <button onClick={toggleElderMode} className={`px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 border ${elderMode ? 'bg-green-600 text-white border-green-700 shadow-xl shadow-green-100' : 'bg-white text-gray-500 hover:text-green-600 border-gray-100 shadow-sm'}`}>
              <UserIcon size={14} className="inline" /> {t("Elder Mode")}
            </button>
            <LanguageSelector />
          </div>
        </div>

        <div className="lg:hidden flex items-center gap-2">
          {user && (
             <button onClick={onLogout} className="p-3 rounded-2xl border border-red-100 bg-red-50 text-red-500 shadow-sm active:scale-95">
               <LogOut size={16} />
             </button>
          )}
          <LanguageSelector />
        </div>
      </div>
    </header>
  );
};

const Footer = () => {
  const { t } = useLanguage();
  return (
    <footer className="bg-gray-900 text-gray-400 py-16 mt-auto">
      <div className="max-w-7xl mx-auto px-4 text-center">
        <div className="flex justify-center items-center gap-3 mb-10">
          <div className="w-10 h-10 bg-green-500 rounded-xl flex items-center justify-center text-white font-black text-xl">G</div>
          <span className="font-black text-white text-2xl tracking-tighter">GrameenConnect</span>
        </div>
        <p className="mb-10 text-gray-500 max-w-md mx-auto font-medium leading-relaxed">{t("Empowering")}</p>
        <div className="flex justify-center flex-wrap gap-x-12 gap-y-6 text-[10px] font-black uppercase tracking-[0.2em]">
          <a href="#" className="hover:text-white transition-colors">{t("Privacy Policy")}</a>
          <a href="#" className="hover:text-white transition-colors">{t("Accessibility")}</a>
          <a href="#" className="hover:text-white transition-colors">{t("Volunteer")}</a>
        </div>
        <div className="mt-16 pt-10 border-t border-gray-800 text-[10px] font-bold text-gray-600 uppercase tracking-widest">
          © 2024 GRAMEENCONNECT INITIATIVE. ALL RIGHTS RESERVED.
        </div>
      </div>
    </footer>
  );
};

const LandingPage: React.FC<{ onGetStarted: () => void }> = ({ onGetStarted }) => {
  const { elderMode, isOffline } = useContext(AppContext);
  const { t, language } = useLanguage();
  const appName = t("GrameenConnect");
  
  return (
    <div className="flex flex-col items-center w-full min-h-screen">
      <div className="w-full bg-gradient-to-b from-green-100/30 via-white to-white py-32 px-4 text-center flex flex-col items-center justify-center min-h-[85vh] pb-56">
        <div className={`inline-flex items-center gap-3 bg-white border px-6 py-2.5 rounded-full text-[10px] font-black uppercase tracking-[0.3em] mb-14 shadow-sm animate-in fade-in slide-in-from-top-6 duration-1000 transition-colors ${isOffline ? 'text-amber-700 border-amber-100' : 'text-green-700 border-green-100'}`}>
          <Shield size={16} className={isOffline ? 'fill-amber-100' : 'fill-green-100'} /> {t("Trusted by")}
        </div>
        
        <h1 className={`font-black text-gray-900 mb-10 leading-[1.05] tracking-tighter max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-10 duration-1000 delay-200 ${elderMode ? 'text-7xl md:text-[10rem]' : 'text-6xl md:text-9xl'}`}>
          {language === 'en' ? (
             <>Grameen<span className="text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-emerald-600">Connect</span></>
          ) : (
             <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-emerald-600 leading-tight">{appName}</span>
          )}
        </h1>
        
        <p className={`text-gray-500 max-w-3xl mx-auto mb-20 leading-relaxed font-medium animate-in fade-in slide-in-from-bottom-6 duration-1000 delay-400 ${elderMode ? 'text-3xl' : 'text-2xl'}`}>
          {t("Empowering")}
        </p>
        
        <div className="animate-in fade-in zoom-in duration-1000 delay-600">
          <Button 
            onClick={onGetStarted} 
            className={`relative overflow-hidden group shadow-[0_20px_60px_-15px_rgba(16,185,129,0.3)] hover:scale-110 active:scale-95 transform transition-all duration-500 rounded-full flex items-center gap-5 text-white border-4 border-white ${isOffline ? 'from-amber-600 to-orange-600 shadow-amber-200 bg-gradient-to-r' : 'from-green-600 to-emerald-600 shadow-green-200 bg-gradient-to-r'} ${elderMode ? 'px-20 py-10 text-4xl' : 'px-16 py-8 text-2xl font-black uppercase tracking-[0.2em]'}`}
          >
            <span className="relative z-10 flex items-center gap-4">
               {t("Get Started")} <ArrowRight size={elderMode ? 40 : 32} className="group-hover:translate-x-3 transition-transform duration-500"/>
            </span>
          </Button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 pb-32 grid grid-cols-1 md:grid-cols-3 gap-12 -mt-40 relative z-10">
        <Card className="border-t-4 border-t-green-500 shadow-3xl bg-white p-12 flex flex-col items-center md:items-start text-center md:text-left group hover:-translate-y-6 transition-all duration-700">
          <div className="bg-green-50 w-24 h-24 rounded-[2.5rem] flex items-center justify-center text-green-600 mb-10 group-hover:rotate-12 transition-transform duration-500"><BookOpen size={44} /></div>
          <h3 className="text-3xl font-black mb-6 text-gray-900 uppercase tracking-tight leading-none">{t("Citizen Portal")}</h3>
          <p className="text-gray-400 font-medium text-lg leading-relaxed">{t("Portal Description")}</p>
        </Card>
        <Card className={`border-t-4 shadow-3xl bg-white p-12 flex flex-col items-center md:items-start text-center md:text-left group hover:-translate-y-6 transition-all duration-700 ${isOffline ? 'border-t-amber-500' : 'border-t-blue-500'}`}>
          <div className={`w-24 h-24 rounded-[2.5rem] flex items-center justify-center mb-10 group-hover:rotate-12 transition-transform duration-500 ${isOffline ? 'bg-amber-50 text-amber-600' : 'bg-blue-50 text-blue-600'}`}>{isOffline ? <WifiOff size={44} /> : <Wifi size={44} />}</div>
          <h3 className="text-3xl font-black mb-6 text-gray-900 uppercase tracking-tight leading-none">{t("Offline Ready")}</h3>
          <p className="text-gray-400 font-medium text-lg leading-relaxed">{t("Offline Description")}</p>
        </Card>
        <Card className="border-t-4 border-t-orange-500 shadow-3xl bg-white p-12 flex flex-col items-center md:items-start text-center md:text-left group hover:-translate-y-6 transition-all duration-700">
          <div className="bg-orange-50 w-24 h-24 rounded-[2.5rem] flex items-center justify-center text-orange-600 mb-10 group-hover:rotate-12 transition-transform duration-500"><BarChart3 size={44} /></div>
          <h3 className="text-3xl font-black mb-6 text-gray-900 uppercase tracking-tight leading-none">{t("Admin Dashboard")}</h3>
          <p className="text-gray-400 font-medium text-lg leading-relaxed">{t("Admin Description")}</p>
        </Card>
      </div>
    </div>
  );
};

const Dashboard: React.FC<{ user: User, onOpenTool: (t: ModalType) => void, onOpenLearning: (m: LearningModule) => void }> = ({ user, onOpenTool, onOpenLearning }) => {
  const { elderMode, isOffline } = useContext(AppContext);
  const { t } = useLanguage();
  
  const learningModules: LearningModule[] = [
    { id: '1', title: t('UPI Payments Basics'), category: t('Finance'), description: t('Learn how to use BHIM and PhonePe safely.'), icon: '💸' },
    { id: '2', title: t('Telehealth Consultation'), category: t('Health'), description: t('How to book and attend a doctor appointment online.'), icon: '🩺' },
    { id: '3', title: t('Government Crop Insurance'), category: t('Agriculture'), description: t('Step-by-step guide to apply for PMFBY.'), icon: '🌾' },
    { id: '4', title: t('Banking Security'), category: t('Finance'), description: t('Keep your bank account safe from fraud.'), icon: '🔐' },
    { id: '5', title: t('Digital Land Records'), category: t('Government'), description: t('How to access and read digital land records.'), icon: '📜' },
    { id: '6', title: t('Online School Admission'), category: t('Education'), description: t('Applying for school admission through online portals.'), icon: '🎒' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 py-16 space-y-24 animate-in slide-in-from-bottom-12 duration-700">
      <div className={`rounded-[4rem] p-16 md:p-24 text-white shadow-3xl relative overflow-hidden group transition-all duration-700 ${isOffline ? 'bg-gradient-to-br from-amber-600 via-orange-700 to-amber-900 shadow-amber-200' : 'bg-gradient-to-br from-green-600 via-emerald-700 to-green-900 shadow-green-200'}`}>
        <div className="relative z-10 max-w-4xl">
          <div className="bg-white/10 backdrop-blur-md px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.3em] mb-8 inline-block border border-white/20">
            {isOffline ? t("Working Offline") : t("Portal Access Granted")}
          </div>
          <h2 className={`font-black mb-8 tracking-tighter leading-[0.9] ${elderMode ? 'text-7xl md:text-9xl' : 'text-6xl md:text-8xl'}`}>{t("Citizen Portal")}</h2>
          <p className="text-white text-2xl md:text-3xl opacity-80 leading-relaxed font-medium max-w-2xl">{isOffline ? t("Offline Notice") : t("Dashboard Hero")}</p>
        </div>
        <div className="absolute right-[-10%] bottom-[-10%] opacity-10 group-hover:scale-110 transition-transform duration-1000">
           <Landmark size={400} />
        </div>
      </div>

      <section>
        <div className="flex items-center gap-5 mb-14">
          <div className={`w-3 h-12 rounded-full transition-colors ${isOffline ? 'bg-amber-500 shadow-lg shadow-amber-100' : 'bg-green-500 shadow-lg shadow-green-100'}`}></div>
          <h3 className={`font-black text-gray-900 uppercase tracking-tighter ${elderMode ? 'text-5xl' : 'text-4xl'}`}>{t("Recommended")}</h3>
        </div>
        <div className="flex flex-wrap gap-5">
          {(isOffline ? [t("Offline Guide"), t("First Aid"), t("Local Contacts"), t("Emergency Map")] : [t("UPI Payments"), t("Aadhaar e-KYC"), t("Weather Alert"), t("Job Openings")]).map(c => (
             <button key={c} className={`bg-white border-2 px-10 py-4.5 rounded-3xl text-sm font-black transition-all active:scale-95 uppercase tracking-widest shadow-sm ${isOffline ? 'border-amber-100 text-amber-600 hover:border-amber-500 hover:bg-amber-50' : 'border-gray-50 text-gray-500 hover:border-green-500 hover:text-green-700 hover:bg-green-50'}`}>{c}</button>
          ))}
        </div>
      </section>

      <section>
        <div className="flex items-center gap-5 mb-14">
          <div className={`w-3 h-12 rounded-full ${isOffline ? 'bg-amber-400' : 'bg-blue-500'}`}></div>
          <h3 className={`font-black text-gray-900 uppercase tracking-tighter ${elderMode ? 'text-5xl' : 'text-4xl'}`}>{t("Tools")}</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          <Card onClick={() => onOpenTool(ModalType.RESUME)} className={`group bg-white border-2 border-gray-50 rounded-[3rem] p-10 transition-all ${isOffline ? 'opacity-50 grayscale pointer-events-none' : 'hover:border-blue-300'}`}>
             <div className="bg-blue-50 w-20 h-20 rounded-[2rem] flex items-center justify-center text-blue-600 mb-8 group-hover:scale-110 group-hover:rotate-6 transition-all duration-500 shadow-inner"><Briefcase size={32}/></div>
             <h4 className="font-black text-gray-900 text-xl uppercase tracking-tight mb-4 leading-none">{t("Smart Resume Builder")}</h4>
             <p className="text-base text-gray-400 font-medium leading-relaxed">{isOffline ? t("Limited Access") : t("Resume Description")}</p>
          </Card>
          <Card onClick={() => onOpenTool(ModalType.SCHEMES)} className={`group bg-white border-2 border-gray-50 rounded-[3rem] p-10 transition-all ${isOffline ? 'opacity-50 grayscale pointer-events-none' : 'hover:border-orange-300'}`}>
             <div className="bg-orange-50 w-20 h-20 rounded-[2rem] flex items-center justify-center text-orange-600 mb-8 group-hover:scale-110 group-hover:rotate-6 transition-all duration-500 shadow-inner"><Landmark size={32}/></div>
             <h4 className="font-black text-gray-900 text-xl uppercase tracking-tight mb-4 leading-none">{t("Scheme Matcher")}</h4>
             <p className="text-base text-gray-400 font-medium leading-relaxed">{isOffline ? t("Limited Access") : t("Scheme Description")}</p>
          </Card>
          <Card onClick={() => onOpenTool(ModalType.MOBILITY)} className={`group bg-white border-2 border-gray-50 rounded-[3rem] p-10 transition-all ${isOffline ? 'border-amber-100 hover:border-amber-300' : 'hover:border-purple-300'}`}>
             <div className={`${isOffline ? 'bg-amber-50 text-amber-600' : 'bg-purple-50 text-purple-600'} w-20 h-20 rounded-[2rem] flex items-center justify-center mb-8 group-hover:scale-110 group-hover:rotate-6 transition-all duration-500 shadow-inner`}><Navigation size={32}/></div>
             <h4 className="font-black text-gray-900 text-xl uppercase tracking-tight mb-4 leading-none">{t("Mobility Planner")}</h4>
             <p className="text-base text-gray-400 font-medium leading-relaxed">{isOffline ? t("Viewing Offline Maps") : t("Mobility Description")}</p>
          </Card>
          <Card onClick={() => onOpenTool(ModalType.GOVERNANCE)} className={`group bg-white border-2 border-gray-50 rounded-[3rem] p-10 transition-all ${isOffline ? 'opacity-50 grayscale pointer-events-none' : 'hover:border-red-300'}`}>
             <div className="bg-red-50 w-20 h-20 rounded-[2rem] flex items-center justify-center text-red-600 mb-8 group-hover:scale-110 group-hover:rotate-6 transition-all duration-500 shadow-inner"><Mic size={32}/></div>
             <h4 className="font-black text-gray-900 text-xl uppercase tracking-tight mb-4 leading-none">{t("Governance Aid")}</h4>
             <p className="text-base text-gray-400 font-medium leading-relaxed">{isOffline ? t("Limited Access") : t("Governance Description")}</p>
          </Card>
        </div>
      </section>

      <section className="pb-32">
        <div className="flex justify-between items-end mb-16">
           <div className="flex items-center gap-5">
             <div className={`w-3 h-12 rounded-full ${isOffline ? 'bg-amber-400' : 'bg-yellow-400'}`}></div>
             <h3 className={`font-black text-gray-900 uppercase tracking-tighter ${elderMode ? 'text-5xl' : 'text-4xl'}`}>{t("Learning Modules")}</h3>
           </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-12">
           {learningModules.map(module => (
             <div key={module.id} className={`bg-white border-2 rounded-[3.5rem] p-10 transition-all flex flex-col h-full group ${isOffline ? 'border-amber-50 hover:border-amber-300 shadow-amber-50' : 'border-gray-50 hover:shadow-3xl hover:border-green-100 shadow-sm'}`}>
               <div className="flex justify-between items-start mb-10">
                  <div className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center text-4xl transition-all border ${isOffline ? 'bg-amber-50 border-amber-100' : 'bg-gray-50 border-gray-100 group-hover:bg-green-50 group-hover:border-green-100 group-hover:scale-110'}`}>{module.icon}</div>
               </div>
               <h4 className={`font-black mb-4 text-2xl uppercase tracking-tight transition-colors leading-tight ${isOffline ? 'group-hover:text-amber-600 text-gray-700' : 'group-hover:text-green-600 text-gray-900'}`}>{module.title}</h4>
               <p className="text-gray-400 text-lg mb-12 flex-grow font-medium leading-relaxed">{module.description}</p>
               <Button onClick={() => onOpenLearning(module)} variant='secondary' className={`w-full text-xs font-black uppercase tracking-[0.2em] py-5 rounded-2xl ${isOffline ? 'bg-amber-100 text-amber-800' : ''}`}>{t("Start Learning")}</Button>
             </div>
           ))}
        </div>
      </section>
    </div>
  );
};

export default function App() {
  const [view, setView] = useState<AppView>(AppView.LANDING);
  const [user, setUser] = useState<User | null>(null);
  const [modal, setModal] = useState<ModalType>(ModalType.NONE);
  const [selectedModule, setSelectedModule] = useState<LearningModule | null>(null);
  const [elderMode, setElderMode] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  
  const [marketItems, setMarketItems] = useState<MarketItem[]>([
    { id: '1', name: 'Organic Wheat', price: '₹25/kg', seller: 'Ramesh Kumar', location: 'Sonapur', contact: '9876543210', image: 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?auto=format&fit=crop&q=80&w=400' },
    { id: '2', name: 'Fresh Potatoes', price: '₹15/kg', seller: 'Savitri Devi', location: 'Village East', contact: '9123456780', image: 'https://images.unsplash.com/photo-1518977676601-b53f82aba655?auto=format&fit=crop&q=80&w=400' }
  ]);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  const toggleElderMode = () => setElderMode(!elderMode);
  const toggleOffline = () => setIsOffline(!isOffline);
  const { t, language } = useLanguage();

  const handleLogin = (name?: string) => {
    if (!name && !email) return;
    
    if (name) {
      setUser({ name, email: 'face-auth@grameen.com' });
      setModal(ModalType.NONE);
      setView(AppView.PORTAL);
      speak(t("Welcome") + " " + name, language);
      return;
    }

    setLoginLoading(true);
    setTimeout(() => {
      setUser({ name: email.split('@')[0], email });
      setLoginLoading(false);
      setModal(ModalType.NONE);
      setView(AppView.PORTAL);
      speak(t("Welcome"), language);
    }, 1000);
  };

  const handleLogout = () => {
    setUser(null);
    setView(AppView.LANDING);
    setModal(ModalType.NONE);
    setEmail('');
    setPassword('');
  };

  return (
    <AppContext.Provider value={{ elderMode, toggleElderMode, isOffline, toggleOffline }}>
      <div className={`min-h-screen flex flex-col bg-white font-sans selection:bg-green-100 selection:text-green-900 ${elderMode ? 'text-lg' : 'text-base'}`}>
        {view !== AppView.LEARNING_DETAIL && (
          <Header 
            user={user} 
            onViewChange={setView} 
            onLogin={() => setModal(ModalType.LOGIN)} 
            onLogout={handleLogout}
            onVision={() => setModal(ModalType.VISION)}
          />
        )}
        
        <main className="flex-grow relative bg-white">
          {view === AppView.LANDING && (
            <LandingPage onGetStarted={() => {
              if (user) setView(AppView.PORTAL);
              else setModal(ModalType.LOGIN);
            }} />
          )}
          
          {view === AppView.PORTAL && user && (
            <Dashboard 
              user={user} 
              onOpenTool={setModal} 
              onOpenLearning={(m) => { setSelectedModule(m); setView(AppView.LEARNING_DETAIL); }}
            />
          )}

          {view === AppView.LEARNING_DETAIL && selectedModule && (
            <LearningViewer module={selectedModule} onBack={() => setView(AppView.PORTAL)} language={language} isOffline={isOffline} />
          )}

          {user && !isOffline && (
            <div className="fixed bottom-12 right-12 z-40 animate-in zoom-in duration-500">
              <button 
                onClick={() => setModal(ModalType.GLOBAL_CHAT)}
                className="bg-green-600 hover:bg-green-700 text-white px-10 py-6 rounded-full shadow-[0_20px_60px_-15px_rgba(16,185,129,0.5)] transition-all hover:scale-110 active:scale-95 flex items-center gap-5 group border-4 border-white"
              >
                <MessageCircle size={32} className="fill-current" />
                <span className="font-black uppercase tracking-[0.2em] hidden md:inline text-sm">{t("Sahayak AI")}</span>
              </button>
            </div>
          )}
        </main>
        
        {view !== AppView.LEARNING_DETAIL && <Footer />}

        <Modal isOpen={modal === ModalType.LOGIN} onClose={() => setModal(ModalType.NONE)} title={t("Welcome")} maxWidth="max-w-md">
          <div className="space-y-8 pt-4">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] text-center mb-2">{t("Access Dashboard")}</p>
            <div className="space-y-5">
              <Input label={t("Email Address")} placeholder="name@village.com" value={email} onChange={e => setEmail(e.target.value)} />
              <Input label={t("Password")} type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} />
              <Button onClick={() => handleLogin()} isLoading={loginLoading} className="w-full py-5 font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-green-100">{t("Sign In")}</Button>
            </div>
            <div className="relative py-4">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-100"></div></div>
              <div className="relative flex justify-center text-[10px] font-black uppercase tracking-[0.4em] text-gray-300"><span className="bg-white px-6">OR</span></div>
            </div>
            <FaceAuth onSuccess={(name) => handleLogin(name)} language={language} />
          </div>
        </Modal>

        <ResumeModal isOpen={modal === ModalType.RESUME} onClose={() => setModal(ModalType.NONE)} language={language} />
        <SchemeModal isOpen={modal === ModalType.SCHEMES} onClose={() => setModal(ModalType.NONE)} language={language} />
        <MobilityModal isOpen={modal === ModalType.MOBILITY} onClose={() => setModal(ModalType.NONE)} language={language} />
        <GovernanceModal isOpen={modal === ModalType.GOVERNANCE} onClose={() => setModal(ModalType.NONE)} language={language} />
        <ChatModal isOpen={modal === ModalType.HEALTH_CHAT} onClose={() => setModal(ModalType.NONE)} language={language} />
        <GlobalChatModal isOpen={modal === ModalType.GLOBAL_CHAT} onClose={() => setModal(ModalType.NONE)} language={language} />
        <KisanModal isOpen={modal === ModalType.MARKET} onClose={() => setModal(ModalType.NONE)} language={language} items={marketItems} setItems={setMarketItems} />
        <VisionModal isOpen={modal === ModalType.VISION} onClose={() => setModal(ModalType.NONE)} language={language} />
        <OfflineResourcesModal isOpen={modal === ModalType.OFFLINE_RESOURCES} onClose={() => setModal(ModalType.NONE)} language={language} />
        <CommunityHelpModal isOpen={modal === ModalType.COMMUNITY_HELP} onClose={() => setModal(ModalType.NONE)} language={language} />
      </div>
    </AppContext.Provider>
  );
}
