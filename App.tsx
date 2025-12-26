
import React, { useState, useContext, createContext, useEffect, useRef } from 'react';
import { User as UserIcon, LogOut, Eye, Globe, BookOpen, Wifi, WifiOff, BarChart3, Cloud, Briefcase, Landmark, Navigation, ShoppingCart, Heart, Shield, GraduationCap, X, Mic, MessageCircle, ChevronDown, Download, ArrowRight, Sparkles, HandHelping, Check, AlertCircle, Scan, Camera } from 'lucide-react';
import { User, AppView, ModalType, LearningModule, Language, MarketItem } from './types';
import { Button, Card, Input, Modal } from './components/Shared';
import { ResumeModal, SchemeModal, MobilityModal } from './components/ToolModals';
import { GovernanceModal, ChatModal, VisionModal, KisanModal, GlobalChatModal, OfflineResourcesModal, CommunityHelpModal } from './components/ServiceModals';
import { LearningViewer } from './components/LearningModule';
import { useLanguage, LANGUAGES } from './contexts/LanguageContext';
import { generateVisionContent } from './services/geminiService';

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
  const currentLang = LANGUAGES.find(l => l.code === language) || LANGUAGES[0];

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 bg-white hover:bg-green-50 px-4 py-2 rounded-full border border-green-100 shadow-sm transition-all duration-300 group"
      >
        <span className="text-xl">{currentLang.flag}</span>
        <span className="text-sm font-bold text-gray-700">{currentLang.localName}</span>
        <ChevronDown size={16} className={`text-gray-400 group-hover:text-green-600 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-3 w-64 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200 py-2">
            <div className="px-4 py-2 border-b border-gray-50 mb-1">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{t("Select Language")}</span>
            </div>
            <div className="max-h-96 overflow-y-auto custom-scrollbar px-1">
              {LANGUAGES.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => { setLanguage(lang.code); setIsOpen(false); }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all ${language === lang.code ? 'bg-green-50 text-green-700' : 'text-gray-700 hover:bg-gray-50'}`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{lang.flag}</span>
                    <div className="flex flex-col items-start leading-tight">
                      <span className="text-sm font-bold">{lang.localName}</span>
                      <span className="text-[10px] text-gray-400">{lang.name}</span>
                    </div>
                  </div>
                  {language === lang.code && <Check size={16} className="text-green-600" />}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

// --- Face Authentication Component ---
const FaceAuth: React.FC<{ onSuccess: (name: string) => void; language: Language }> = ({ onSuccess, language }) => {
  const [active, setActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'user',
          width: { ideal: 400 },
          height: { ideal: 400 }
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
    
    try {
      const context = canvasRef.current.getContext('2d');
      if (!context) throw new Error("Canvas context failed");
      
      // Ensure canvas matches video dimensions for accurate capture
      canvasRef.current.width = videoRef.current.videoWidth;
      canvasRef.current.height = videoRef.current.videoHeight;
      
      context.drawImage(videoRef.current, 0, 0);
      const imageData = canvasRef.current.toDataURL('image/jpeg', 0.85);
      const base64 = imageData.split(',')[1];

      // Highly specific prompt for adversarial detection
      const prompt = `
        TASK: BIOMETRIC AUTHENTICITY AND FACE VERIFICATION.
        
        STRICT DETECTION RULES:
        1. "VERIFIED" only if:
           - A clear, unobstructed human face is centered in the frame.
           - The eyes are visible and look like real human eyes.
           - NO hands, fingers, or objects are touching or covering any part of the face.
        
        2. "RETRY" immediately if:
           - Any hand, finger, or physical object is visible near or over the face.
           - The user is holding a phone, photo, or digital screen in front of the camera.
           - The face is blurred, too dark, or mostly cut off.
           - The image contains multiple people.
           - The image contains animals or inanimate objects disguised as faces.
        
        OUTPUT REQUIREMENT: Respond ONLY with the single word "VERIFIED" or the single word "RETRY". Do not provide any other text.
      `;

      // Pass true to skipLanguageInstruction to ensure model returns English keyword "VERIFIED"
      const result = await generateVisionContent(
        prompt, 
        base64, 
        "image/jpeg", 
        language,
        true 
      );

      const normalizedResult = result.toUpperCase().trim();
      
      if (normalizedResult.includes("VERIFIED")) {
        onSuccess("Grameen Citizen");
      } else {
        setError("Verification Failed. Please remove hands/objects and center your face.");
      }
    } catch (err) {
      console.error("Auth Error:", err);
      setError("Technical error during scan. Please check lighting and try again.");
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
  };

  if (!active) {
    return (
      <button 
        onClick={startCamera}
        className="w-full flex items-center justify-center gap-3 bg-indigo-50 text-indigo-700 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] border-2 border-indigo-100 hover:bg-indigo-600 hover:text-white hover:border-indigo-600 transition-all active:scale-95"
      >
        <Scan size={18} /> Face Sign In
      </button>
    );
  }

  return (
    <div className="space-y-6 flex flex-col items-center animate-in zoom-in duration-300">
      <div className="relative w-64 h-64 rounded-full overflow-hidden border-4 border-green-500 shadow-2xl bg-black">
        <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover scale-x-[-1]" />
        <div className="animate-scan" />
        {loading && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center z-20">
            <div className="animate-spin rounded-full h-10 w-10 border-4 border-white border-t-transparent" />
          </div>
        )}
      </div>
      <canvas ref={canvasRef} className="hidden" />
      {error && <p className="text-red-500 text-[10px] font-black uppercase tracking-widest text-center max-w-[240px] leading-tight mt-2">{error}</p>}
      <div className="flex gap-3 w-full">
         <Button onClick={captureAndVerify} isLoading={loading} className="flex-1 bg-green-600 hover:bg-green-700 py-4 font-black text-[10px] uppercase tracking-widest">Scan Face</Button>
         <Button variant="outline" onClick={stopCamera} className="flex-1 py-4 font-black text-[10px] uppercase tracking-widest">Cancel</Button>
      </div>
    </div>
  );
};

const Header: React.FC<{ user: User | null, onViewChange: (v: AppView) => void, onLogin: () => void, onVision: () => void }> = ({ user, onViewChange, onLogin, onVision }) => {
  const { elderMode, toggleElderMode, isOffline, toggleOffline } = useContext(AppContext);
  const { t } = useLanguage();

  return (
    <header className={`bg-white/80 backdrop-blur-md border-b sticky top-0 z-40 shadow-sm transition-colors duration-500 ${isOffline ? 'border-amber-100' : 'border-green-50'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
        <div className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-all active:scale-95" onClick={() => onViewChange(AppView.LANDING)}>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-2xl shadow-lg transition-all duration-500 ${isOffline ? 'bg-gradient-to-br from-amber-500 to-orange-600 shadow-amber-200' : 'bg-gradient-to-br from-green-500 to-emerald-600 shadow-green-200'}`}>G</div>
          <span className={`font-black text-gray-900 tracking-tighter ${elderMode ? 'text-3xl' : 'text-2xl'}`}>{t("GrameenConnect")}</span>
        </div>
        
        <div className="hidden lg:flex items-center gap-6">
          <nav className="flex items-center gap-5">
            <button onClick={() => onViewChange(AppView.LANDING)} className="text-gray-500 hover:text-green-600 font-bold transition-colors text-xs uppercase tracking-widest">{t("Home")}</button>
            <button onClick={() => user ? onViewChange(AppView.PORTAL) : onLogin()} className="text-gray-500 hover:text-green-600 font-bold transition-colors text-xs uppercase tracking-widest">{t("Portal")}</button>
          </nav>
          
          <div className="h-6 w-px bg-gray-200"></div>

          <div className="flex items-center gap-3">
            <button 
              onClick={toggleOffline} 
              className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 border flex items-center gap-2 ${isOffline ? 'bg-amber-600 text-white border-amber-700 shadow-lg shadow-amber-100' : 'bg-white text-gray-500 hover:text-green-600 border-gray-100 shadow-sm'}`}
            >
              {isOffline ? <WifiOff size={14} /> : <Wifi size={14} />}
              {isOffline ? t("Offline") : t("Online")}
            </button>

            {user && (
              <button 
                onClick={onVision} 
                disabled={isOffline}
                className={`px-4 py-2 rounded-full flex items-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 border shadow-sm ${isOffline ? 'bg-gray-50 text-gray-300 border-gray-100 cursor-not-allowed opacity-50' : 'bg-purple-50 text-purple-700 border-purple-100 hover:bg-purple-100'}`}
              >
                <Eye size={14} /> {t("Vision")}
              </button>
            )}
            
            <button onClick={toggleElderMode} className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 border ${elderMode ? 'bg-green-600 text-white border-green-700' : 'bg-white text-gray-500 hover:text-green-600 border-gray-100 shadow-sm'}`}>
              <UserIcon size={14} className="inline" /> {t("Elder Mode")}
            </button>
            <LanguageSelector />
          </div>
        </div>

        <div className="lg:hidden flex items-center gap-2">
          <button onClick={toggleOffline} className={`p-2 rounded-full border transition-all ${isOffline ? 'bg-amber-600 text-white border-amber-700' : 'bg-white text-gray-400 border-gray-100'}`}>
            {isOffline ? <WifiOff size={16} /> : <Wifi size={16} />}
          </button>
          <LanguageSelector />
        </div>
      </div>
      
      {isOffline && (
        <div className="bg-amber-600 text-white py-1.5 px-4 text-center text-[10px] font-black uppercase tracking-[0.3em] flex items-center justify-center gap-3 animate-in slide-in-from-top duration-300">
          <AlertCircle size={14} />
          {t("Working Offline")} - {t("Limited Access")}
        </div>
      )}
    </header>
  );
};

const Footer = () => {
  const { t } = useLanguage();
  return (
    <footer className="bg-gray-900 text-gray-400 py-12 mt-auto">
      <div className="max-w-7xl mx-auto px-4 text-center">
        <div className="flex justify-center items-center gap-3 mb-8">
          <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center text-white font-black">G</div>
          <span className="font-black text-white text-xl tracking-tighter">GrameenConnect</span>
        </div>
        <p className="mb-8 text-gray-500 max-w-md mx-auto">{t("Empowering")}</p>
        <div className="flex justify-center flex-wrap gap-x-12 gap-y-4 text-xs font-bold uppercase tracking-widest">
          <a href="#" className="hover:text-white transition-colors">{t("Privacy Policy")}</a>
          <a href="#" className="hover:text-white transition-colors">{t("Accessibility")}</a>
          <a href="#" className="hover:text-white transition-colors">{t("Volunteer")}</a>
        </div>
        <div className="mt-12 pt-8 border-t border-gray-800 text-[10px] font-medium text-gray-600">
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
  const nameParts = appName.split(' ');
  
  const renderAppName = () => {
    if (language === 'en') return <>Grameen<span className="text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-emerald-600">Connect</span></>;
    if (nameParts.length > 1) return <>{nameParts[0]} <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-emerald-600">{nameParts.slice(1).join(' ')}</span></>;
    return <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-emerald-600">{appName}</span>;
  };

  return (
    <div className="flex flex-col items-center w-full min-h-screen">
      <div className="w-full bg-gradient-to-b from-green-100/50 via-white to-white py-24 px-4 text-center flex flex-col items-center justify-center min-h-[75vh] pb-48">
        <div className={`inline-flex items-center gap-2 bg-white border px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.2em] mb-12 shadow-sm animate-in fade-in slide-in-from-top-4 duration-700 transition-colors ${isOffline ? 'text-amber-700 border-amber-100' : 'text-green-700 border-green-100'}`}>
          <Shield size={14} className={isOffline ? 'fill-amber-100' : 'fill-green-100'} /> {t("Trusted by")}
        </div>
        
        <h1 className={`font-black text-gray-900 mb-8 leading-[1.1] tracking-tighter max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-8 duration-700 delay-100 ${elderMode ? 'text-7xl md:text-9xl' : 'text-6xl md:text-8xl'}`}>
          {renderAppName()}
        </h1>
        
        <p className={`text-gray-500 max-w-2xl mx-auto mb-16 leading-relaxed font-medium animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200 ${elderMode ? 'text-3xl' : 'text-xl'}`}>
          {t("Empowering")}
        </p>
        
        <div className="animate-in fade-in zoom-in duration-700 delay-300">
          <Button 
            onClick={onGetStarted} 
            className={`relative overflow-hidden group shadow-2xl hover:scale-105 active:scale-95 transform transition-all duration-300 rounded-full flex items-center gap-4 text-white border-4 border-white ${isOffline ? 'from-amber-600 to-orange-600 shadow-amber-200 bg-gradient-to-r' : 'from-green-600 to-emerald-600 shadow-green-200 bg-gradient-to-r'} ${elderMode ? 'px-16 py-8 text-3xl' : 'px-14 py-6 text-xl font-black uppercase tracking-widest'}`}
          >
            <span className="relative z-10 flex items-center gap-3">
               {t("Get Started")} <ArrowRight size={elderMode ? 32 : 24} className="group-hover:translate-x-2 transition-transform duration-300"/>
            </span>
            <div className="absolute inset-0 -translate-x-full group-hover:animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/30 to-transparent z-0"></div>
          </Button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 pb-24 grid grid-cols-1 md:grid-cols-3 gap-10 -mt-32 relative z-10">
        <Card className="border-t-4 border-t-green-500 shadow-2xl hover:shadow-green-200 shadow-gray-200/50 transition-all duration-500 bg-white group hover:-translate-y-4 p-10 flex flex-col items-center md:items-start text-center md:text-left">
          <div className="bg-green-50 w-20 h-20 rounded-3xl flex items-center justify-center text-green-600 mb-8 group-hover:rotate-6 transition-transform shadow-inner border border-green-100"><BookOpen size={36} /></div>
          <h3 className="text-2xl font-black mb-4 text-gray-900 group-hover:text-green-600 transition-colors uppercase tracking-tight">{t("Citizen Portal")}</h3>
          <p className="text-gray-400 font-medium leading-relaxed">{t("Portal Description")}</p>
        </Card>
        <Card className={`border-t-4 shadow-2xl shadow-gray-200/50 transition-all duration-500 bg-white group hover:-translate-y-4 p-10 flex flex-col items-center md:items-start text-center md:text-left ${isOffline ? 'border-t-amber-500 hover:shadow-amber-200' : 'border-t-blue-500 hover:shadow-blue-200'}`}>
          <div className={`w-20 h-20 rounded-3xl flex items-center justify-center mb-8 group-hover:rotate-6 transition-transform shadow-inner border ${isOffline ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-blue-50 text-blue-600 border-blue-100'}`}>{isOffline ? <WifiOff size={36} /> : <Wifi size={16} />}</div>
          <h3 className={`text-2xl font-black mb-4 text-gray-900 uppercase tracking-tight transition-colors ${isOffline ? 'group-hover:text-amber-600' : 'group-hover:text-blue-600'}`}>{t("Offline Ready")}</h3>
          <p className="text-gray-400 font-medium leading-relaxed">{t("Offline Description")}</p>
        </Card>
        <Card className="border-t-4 border-t-orange-500 shadow-2xl hover:shadow-orange-200 shadow-gray-200/50 transition-all duration-500 bg-white group hover:-translate-y-4 p-10 flex flex-col items-center md:items-start text-center md:text-left">
          <div className="bg-orange-50 w-20 h-20 rounded-3xl flex items-center justify-center text-orange-600 mb-8 group-hover:rotate-6 transition-transform shadow-inner border border-orange-100"><BarChart3 size={36} /></div>
          <h3 className="text-2xl font-black mb-4 text-gray-900 group-hover:text-orange-600 transition-colors uppercase tracking-tight">{t("Admin Dashboard")}</h3>
          <p className="text-gray-400 font-medium leading-relaxed">{t("Admin Description")}</p>
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
    <div className="max-w-7xl mx-auto px-4 py-12 space-y-20 animate-in slide-in-from-bottom-8 duration-500">
      <div className={`rounded-[3rem] p-12 md:p-16 text-white shadow-3xl relative overflow-hidden group transition-all duration-500 ${isOffline ? 'bg-gradient-to-br from-amber-600 via-orange-700 to-amber-900 shadow-amber-200' : 'bg-gradient-to-br from-green-600 via-emerald-700 to-green-900 shadow-green-200'}`}>
        <div className="relative z-10 max-w-3xl">
          <div className="bg-white/10 backdrop-blur-md px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest mb-6 inline-block border border-white/20">
            {isOffline ? t("Working Offline") : t("Portal Access Granted")}
          </div>
          <h2 className={`font-black mb-6 tracking-tighter leading-none ${elderMode ? 'text-6xl md:text-8xl' : 'text-5xl md:text-7xl'}`}>{t("Citizen Portal")}</h2>
          <p className="text-white text-xl md:text-2xl opacity-80 leading-relaxed font-medium">{isOffline ? t("Offline Notice") : t("Dashboard Hero")}</p>
        </div>
        <div className="absolute right-0 top-0 h-full w-1/2 bg-white/5 skew-x-12 transform translate-x-20 pointer-events-none group-hover:translate-x-16 transition-transform duration-1000"></div>
        <div className="absolute -bottom-20 -right-20 w-[40rem] h-[40rem] bg-white/10 rounded-full blur-[120px] pointer-events-none group-hover:scale-110 transition-transform duration-1000"></div>
      </div>

      <section>
        <div className="flex items-center gap-4 mb-10">
          <div className={`w-2 h-10 rounded-full transition-colors ${isOffline ? 'bg-amber-500' : 'bg-green-500'}`}></div>
          <h3 className={`font-black text-gray-900 uppercase tracking-tighter ${elderMode ? 'text-4xl' : 'text-3xl'}`}>{t("Recommended")}</h3>
        </div>
        <div className="flex flex-wrap gap-4">
          {(isOffline ? [t("Offline Guide"), t("First Aid"), t("Local Contacts"), t("Emergency Map")] : [t("UPI Payments"), t("Aadhaar e-KYC"), t("Weather Alert"), t("Job Openings")]).map(c => (
             <button key={c} className={`bg-white border-2 px-8 py-3.5 rounded-2xl text-sm font-black transition-all active:scale-95 uppercase tracking-widest ${isOffline ? 'border-amber-100 text-amber-600 hover:border-amber-500 hover:bg-amber-50 hover:shadow-amber-100' : 'border-gray-100 text-gray-500 hover:border-green-500 hover:text-green-700 hover:bg-green-50 hover:shadow-green-100'}`}>{c}</button>
          ))}
        </div>
      </section>

      <section>
        <div className="flex items-center gap-4 mb-10">
          <div className={`w-2 h-10 rounded-full ${isOffline ? 'bg-amber-400' : 'bg-blue-500'}`}></div>
          <h3 className={`font-black text-gray-900 uppercase tracking-tighter ${elderMode ? 'text-4xl' : 'text-3xl'}`}>{t("Tools")}</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <Card onClick={() => onOpenTool(ModalType.RESUME)} className={`group bg-white border-2 border-gray-50 transition-all ${isOffline ? 'opacity-50 grayscale pointer-events-none' : 'hover:border-blue-300'}`}>
             <div className="bg-blue-50 w-16 h-16 rounded-3xl flex items-center justify-center text-blue-600 mb-6 group-hover:scale-110 transition-transform shadow-inner border border-blue-100"><Briefcase size={28}/></div>
             <h4 className="font-black text-gray-900 text-lg uppercase tracking-tight mb-3">{t("Smart Resume Builder")}</h4>
             <p className="text-sm text-gray-400 font-medium leading-relaxed">{isOffline ? t("Limited Access") : t("Resume Description")}</p>
          </Card>
          <Card onClick={() => onOpenTool(ModalType.SCHEMES)} className={`group bg-white border-2 border-gray-50 transition-all ${isOffline ? 'opacity-50 grayscale pointer-events-none' : 'hover:border-orange-300'}`}>
             <div className="bg-orange-50 w-16 h-16 rounded-3xl flex items-center justify-center text-orange-600 mb-6 group-hover:scale-110 transition-transform shadow-inner border border-orange-100"><Landmark size={28}/></div>
             <h4 className="font-black text-gray-900 text-lg uppercase tracking-tight mb-3">{t("Scheme Matcher")}</h4>
             <p className="text-sm text-gray-400 font-medium leading-relaxed">{isOffline ? t("Limited Access") : t("Scheme Description")}</p>
          </Card>
          <Card onClick={() => onOpenTool(ModalType.MOBILITY)} className={`group bg-white border-2 border-gray-50 transition-all ${isOffline ? 'border-amber-100 hover:border-amber-300' : 'hover:border-purple-300'}`}>
             <div className={`${isOffline ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-purple-50 text-purple-600 border-purple-100'} w-16 h-16 rounded-3xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-inner border`}><Navigation size={28}/></div>
             <h4 className="font-black text-gray-900 text-lg uppercase tracking-tight mb-3">{t("Mobility Planner")}</h4>
             <p className="text-sm text-gray-400 font-medium leading-relaxed">{isOffline ? t("Viewing Offline Maps") : t("Mobility Description")}</p>
          </Card>
          <Card onClick={() => onOpenTool(ModalType.GOVERNANCE)} className={`group bg-white border-2 border-gray-50 transition-all ${isOffline ? 'opacity-50 grayscale pointer-events-none' : 'hover:border-red-300'}`}>
             <div className="bg-red-50 w-16 h-16 rounded-3xl flex items-center justify-center text-red-600 mb-6 group-hover:scale-110 transition-transform shadow-inner border border-red-100"><Mic size={28}/></div>
             <h4 className="font-black text-gray-900 text-lg uppercase tracking-tight mb-3">{t("Governance Aid")}</h4>
             <p className="text-sm text-gray-400 font-medium leading-relaxed">{isOffline ? t("Limited Access") : t("Governance Description")}</p>
          </Card>
        </div>
      </section>

      <section>
        <div className="flex items-center gap-4 mb-10">
          <div className={`w-2 h-10 rounded-full ${isOffline ? 'bg-orange-500' : 'bg-emerald-500'}`}></div>
          <h3 className={`font-black text-gray-900 uppercase tracking-tighter ${elderMode ? 'text-4xl' : 'text-3xl'}`}>{t("Essential Services")}</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
           <Card onClick={() => onOpenTool(ModalType.MARKET)} className={`flex items-center gap-8 transition-all p-10 border-2 border-gray-50 group ${isOffline ? 'opacity-50 pointer-events-none' : 'hover:border-green-300 hover:bg-green-50/20'}`}>
              <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center text-green-600 shrink-0 shadow-inner group-hover:scale-110 transition-transform duration-500"><ShoppingCart size={32}/></div>
              <div>
                <h4 className="font-black text-xl text-gray-900 mb-2 uppercase tracking-tight">{t("Kisan Mandi")}</h4>
                <p className="text-gray-400 text-sm font-medium leading-snug">{isOffline ? t("Limited Access") : t("Market Description")}</p>
              </div>
           </Card>
           <Card onClick={() => onOpenTool(ModalType.HEALTH_CHAT)} className={`flex items-center gap-8 transition-all p-10 border-2 border-gray-50 group ${isOffline ? 'opacity-50 pointer-events-none' : 'hover:border-pink-300 hover:bg-pink-50/20'}`}>
              <div className="w-20 h-20 bg-pink-50 rounded-full flex items-center justify-center text-pink-600 shrink-0 shadow-inner group-hover:scale-110 transition-transform duration-500"><Heart size={32}/></div>
              <div>
                <h4 className="font-black text-xl text-gray-900 mb-2 uppercase tracking-tight">{t("Swasthya Saathi")}</h4>
                <p className="text-gray-400 text-sm font-medium leading-snug">{isOffline ? t("Limited Access") : t("Health Description")}</p>
              </div>
           </Card>
           <Card onClick={() => onOpenTool(ModalType.COMMUNITY_HELP)} className={`flex items-center gap-8 transition-all p-10 border-2 border-gray-50 group ${isOffline ? 'border-amber-200 hover:border-amber-400 hover:bg-amber-50/20' : 'hover:border-emerald-400 hover:bg-emerald-50/20'}`}>
              <div className={`w-20 h-20 rounded-full flex items-center justify-center shrink-0 shadow-inner group-hover:scale-110 transition-transform duration-500 ${isOffline ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'}`}><HandHelping size={32}/></div>
              <div>
                <h4 className="font-black text-xl text-gray-900 mb-2 uppercase tracking-tight">{t("Community Help")}</h4>
                <p className="text-gray-400 text-sm font-medium leading-snug">{isOffline ? t("View Downloaded Requests") : t("Community Description")}</p>
              </div>
           </Card>
        </div>
      </section>

      <section className="pb-24">
        <div className="flex justify-between items-end mb-12">
           <div className="flex items-center gap-4">
             <div className={`w-2 h-10 rounded-full ${isOffline ? 'bg-amber-400' : 'bg-yellow-400'}`}></div>
             <h3 className={`font-black text-gray-900 uppercase tracking-tighter ${elderMode ? 'text-4xl' : 'text-3xl'}`}>{t("Learning Modules")}</h3>
           </div>
           <button className={`text-xs font-black uppercase tracking-widest hover:underline decoration-4 underline-offset-8 ${isOffline ? 'text-amber-700' : 'text-green-700'}`}>{isOffline ? t("Offline Content") : t("All Resources")}</button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
           {learningModules.map(module => (
             <div key={module.id} className={`bg-white border-2 rounded-[2.5rem] p-8 transition-all flex flex-col h-full group ${isOffline ? 'border-amber-50 hover:border-amber-300 hover:shadow-amber-100' : 'border-gray-50 hover:shadow-2xl hover:shadow-green-100 hover:border-green-100'}`}>
               <div className="flex justify-between items-start mb-8">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-3xl group-hover:rotate-12 transition-transform shadow-inner border ${isOffline ? 'bg-amber-50 border-amber-100' : 'bg-gray-50 border-gray-100'}`}>{module.icon}</div>
                  {isOffline && <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest border border-amber-100 px-3 py-1.5 rounded-xl bg-amber-50 flex items-center gap-1.5"><WifiOff size={10}/> {t("Downloaded")}</span>}
                  {!isOffline && <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest border border-gray-100 px-3 py-1.5 rounded-xl bg-gray-50">{module.category}</span>}
               </div>
               <h4 className={`font-black mb-3 text-xl uppercase tracking-tight transition-colors ${isOffline ? 'group-hover:text-amber-600 text-gray-700' : 'group-hover:text-green-600 text-gray-900'}`}>{module.title}</h4>
               <p className="text-gray-400 text-sm mb-10 flex-grow font-medium leading-relaxed">{module.description}</p>
               <Button onClick={() => onOpenLearning(module)} variant='secondary' className={`w-full text-xs font-black uppercase tracking-widest py-4 rounded-2xl ${isOffline ? 'bg-amber-100 text-amber-800' : ''}`}>{t("Start Learning")}</Button>
             </div>
           ))}
        </div>
        <div className="flex justify-center mt-20">
           <Button variant="outline" className={`px-12 py-5 rounded-full border-2 text-sm font-black uppercase tracking-widest active:scale-95 ${isOffline ? 'border-amber-100 text-amber-600 hover:border-amber-300 hover:bg-amber-50' : ''}`} onClick={() => onOpenTool(ModalType.OFFLINE_RESOURCES)}>{isOffline ? t("Offline Resources") : t("Discover More")}</Button>
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
  
  // Persistent items state for Kisan Mandi to fix the "not posting list" bug
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
    setLoginLoading(true);
    setTimeout(() => {
      setUser({ name: name || email.split('@')[0], email: email || 'face-auth@grameen.com' });
      setLoginLoading(false);
      setModal(ModalType.NONE);
      setView(AppView.PORTAL);
    }, 1000);
  };

  return (
    <AppContext.Provider value={{ elderMode, toggleElderMode, isOffline, toggleOffline }}>
      <div className={`min-h-screen flex flex-col bg-white font-sans ${elderMode ? 'text-lg' : 'text-base'}`}>
        {view !== AppView.LEARNING_DETAIL && (
          <Header 
            user={user} 
            onViewChange={setView} 
            onLogin={() => setModal(ModalType.LOGIN)} 
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
            <div className="fixed bottom-10 right-10 z-40 animate-in zoom-in duration-300">
              <button 
                onClick={() => setModal(ModalType.GLOBAL_CHAT)}
                className="bg-green-600 hover:bg-green-700 text-white px-8 py-5 rounded-full shadow-3xl shadow-green-200 transition-all hover:scale-110 active:scale-95 flex items-center gap-4 group border-4 border-white"
              >
                <MessageCircle size={28} className="fill-current" />
                <span className="font-black uppercase tracking-widest hidden md:inline text-sm">{t("Sahayak AI")}</span>
              </button>
            </div>
          )}
        </main>
        
        {view !== AppView.LEARNING_DETAIL && <Footer />}

        <Modal isOpen={modal === ModalType.LOGIN} onClose={() => setModal(ModalType.NONE)} title={t("Welcome")} maxWidth="max-w-md">
          <div className="space-y-6 pt-2">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">{t("Access Dashboard")}</p>
            
            <div className="space-y-4">
              <Input label={t("Email Address")} placeholder="name@village.com" value={email} onChange={e => setEmail(e.target.value)} />
              <Input label={t("Password")} type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} />
              <Button onClick={() => handleLogin()} isLoading={loginLoading} className="w-full py-4 font-black uppercase tracking-widest rounded-2xl">{t("Sign In")}</Button>
            </div>

            <div className="relative py-4">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-100"></div></div>
              <div className="relative flex justify-center text-[10px] font-black uppercase tracking-widest text-gray-300"><span className="bg-white px-4">OR</span></div>
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
        
        <KisanModal 
          isOpen={modal === ModalType.MARKET} 
          onClose={() => setModal(ModalType.NONE)} 
          language={language}
          items={marketItems}
          setItems={setMarketItems}
        />
        
        <VisionModal isOpen={modal === ModalType.VISION} onClose={() => setModal(ModalType.NONE)} language={language} />
        <OfflineResourcesModal isOpen={modal === ModalType.OFFLINE_RESOURCES} onClose={() => setModal(ModalType.NONE)} language={language} />
        <CommunityHelpModal isOpen={modal === ModalType.COMMUNITY_HELP} onClose={() => setModal(ModalType.NONE)} language={language} />
      </div>
    </AppContext.Provider>
  );
}
