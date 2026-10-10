import React from 'react';
import { 
  Menu, 
  Sun, 
  Moon, 
  BookOpen, 
  Radio, 
  HardDrive, 
  User, 
  LogOut, 
  LogIn, 
  Sparkles,
  CloudCheck,
  CheckCircle2
} from 'lucide-react';
import { Notebook, UserProfile } from '../types';

interface HeaderProps {
  onToggleSidebar: () => void;
  currentTab: string;
  currentNotebook: Notebook;
  notebooks: Notebook[];
  onSelectNotebook: (id: string) => void;
  isDark: boolean;
  onToggleTheme: () => void;
  onOpenLiveVoice: () => void;
  onOpenGoogleDrive: () => void;
  userProfile?: UserProfile | null;
  onSignInGoogle: () => void;
  onSignOutGoogle: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onToggleSidebar,
  currentTab,
  currentNotebook,
  notebooks,
  onSelectNotebook,
  isDark,
  onToggleTheme,
  onOpenLiveVoice,
  onOpenGoogleDrive,
  userProfile,
  onSignInGoogle,
  onSignOutGoogle,
}) => {
  const tabTitles: Record<string, string> = {
    home: 'الرئيسية والمتابعة',
    chat: 'المعلم الذكي (Gemini Chat)',
    sources: 'المصادر والكتب والمستندات',
    studio: 'استوديو المذاكرة والتلخيص',
    science: 'مختبر العلوم والتصوير 3D',
    tools: 'الأدوات والحاسبة العلمية',
  };

  return (
    <header className="h-16 bg-white/90 dark:bg-[#121b18]/90 backdrop-blur-md border-b border-slate-200/80 dark:border-[#22352f] px-3 sm:px-6 flex items-center justify-between sticky top-0 z-30 shrink-0">
      {/* Left: Mobile hamburger & Title */}
      <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
        <button
          type="button"
          onClick={onToggleSidebar}
          className="lg:hidden p-2 rounded-xl text-slate-500 hover:text-teal-700 hover:bg-slate-100 dark:hover:bg-[#1c2c26] transition-colors cursor-pointer"
          aria-label="القائمة الجانبية"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="min-w-0 flex items-center gap-2">
          <h2 className="text-sm sm:text-base font-extrabold text-slate-800 dark:text-slate-100 truncate">
            {tabTitles[currentTab] || 'المعلم'}
          </h2>

          {/* Active Notebook Selector Pill */}
          <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-teal-50 dark:bg-teal-950/70 border border-teal-200/80 dark:border-teal-800/60 text-teal-800 dark:text-teal-200 text-xs font-bold shadow-2xs">
            <BookOpen className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0" />
            <select
              value={currentNotebook.id}
              onChange={(e) => onSelectNotebook(e.target.value)}
              className="bg-transparent text-xs font-bold outline-none cursor-pointer text-teal-900 dark:text-teal-200 truncate max-w-[130px] lg:max-w-[180px]"
            >
              {notebooks.map((nb) => (
                <option key={nb.id} value={nb.id} className="bg-white dark:bg-[#14201c] text-slate-800 dark:text-slate-100">
                  {nb.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Right Action Icons: Live Voice, Google Drive, Google Auth, Theme */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        {/* Gemini 3.8 Live API Voice Trigger */}
        <button
          type="button"
          onClick={onOpenLiveVoice}
          className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm shadow-teal-600/20 transition-all cursor-pointer active:scale-95 shrink-0"
          title="محادثة صوتية حية مع Gemini 3.8 Live"
        >
          <Radio className="w-3.5 h-3.5 animate-pulse text-amber-300" />
          <span className="hidden sm:inline">صوت مباشر (Live)</span>
        </button>

        {/* Google Drive Import Trigger */}
        <button
          type="button"
          onClick={onOpenGoogleDrive}
          className="px-2.5 py-1.5 rounded-xl border border-teal-200 dark:border-teal-800 bg-teal-50 dark:bg-teal-950/50 text-teal-800 dark:text-teal-200 hover:bg-teal-100 transition-colors font-bold text-xs flex items-center gap-1.5 cursor-pointer shrink-0"
          title="استيراد من Google Drive"
        >
          <HardDrive className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
          <span className="hidden md:inline">Google Drive</span>
        </button>

        {/* Google User Sign-in / Profile Pill */}
        {userProfile ? (
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-xl bg-slate-100 dark:bg-[#1a2d26] border border-slate-200 dark:border-[#263c33] text-xs">
            {userProfile.photoURL ? (
              <img
                src={userProfile.photoURL}
                alt={userProfile.displayName}
                className="w-5 h-5 rounded-full object-cover border border-teal-500"
              />
            ) : (
              <User className="w-4 h-4 text-teal-600" />
            )}
            <span className="hidden lg:inline font-bold text-slate-800 dark:text-slate-100 max-w-[90px] truncate">
              {userProfile.displayName.split(' ')[0]}
            </span>
            <button
              type="button"
              onClick={onSignOutGoogle}
              className="p-1 text-slate-400 hover:text-rose-500 rounded-lg cursor-pointer transition-colors"
              title="تسجيل الخروج"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={onSignInGoogle}
            className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#182622] text-slate-700 dark:text-slate-200 hover:bg-slate-50 text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
            title="تسجيل الدخول بحساب Google"
          >
            <LogIn className="w-3.5 h-3.5 text-teal-600" />
            <span className="hidden sm:inline">دخول Google</span>
          </button>
        )}

        {/* Theme Toggle */}
        <button
          type="button"
          onClick={onToggleTheme}
          className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-[#1c2c26] transition-colors cursor-pointer"
          aria-label="تبديل المظهر"
          title={isDark ? 'المظهر الفاتح' : 'المظهر الليلي'}
        >
          {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
        </button>
      </div>
    </header>
  );
};
