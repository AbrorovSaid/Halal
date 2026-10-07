import React, { useState } from 'react';
import {
  Truck,
  Beef,
  HardDrive,
  LogOut,
  FolderOpen,
  CheckCircle2,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';
import { User } from 'firebase/auth';

interface NavbarProps {
  activeTab: 'entry' | 'boss';
  setActiveTab: (tab: 'entry' | 'boss') => void;
  user: User | null;
  onLogin: () => void;
  onLogout: () => void;
  isLoggingIn: boolean;
  driveFolderUrl: string | null;
  onOpenShareModal?: () => void;
  shiftsCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  user,
  onLogin,
  onLogout,
  isLoggingIn,
  driveFolderUrl,
  onOpenShareModal,
  shiftsCount,
}) => {
  const [showDriveMenu, setShowDriveMenu] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-slate-900 border-b border-slate-800 shadow-lg text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-18">
          {/* Logo & System Brand */}
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-red-600 to-amber-600 flex items-center justify-center shadow-md shadow-red-950/50">
              <Beef className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base sm:text-lg tracking-tight text-white flex items-center gap-1.5">
                  <span className="text-amber-400 font-black drop-shadow-sm">ОАО</span> Пинский мясокомбинат
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                  Учёт смен
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                Забой скота • Загрузка машин • Тоннаж мяса • Видеофиксация
              </p>
            </div>
          </div>

          {/* Mode Switcher */}
          <div className="flex items-center bg-slate-950/80 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setActiveTab('entry')}
              className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'entry'
                  ? 'bg-amber-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <Truck className="w-4 h-4" />
              <span>Внесение смены</span>
            </button>

            <button
              onClick={() => setActiveTab('boss')}
              className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-sm font-medium transition-all relative ${
                activeTab === 'boss'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Отчёт для начальника</span>
              {shiftsCount > 0 && (
                <span className="px-1.5 py-0.2 text-[11px] font-bold rounded-full bg-slate-900 text-emerald-400 border border-emerald-500/30">
                  {shiftsCount}
                </span>
              )}
            </button>
          </div>

          {/* Right Action Tools: Google Drive Integration */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Google Drive Status & Auth */}
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setShowDriveMenu(!showDriveMenu)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 border border-slate-700 text-xs sm:text-sm text-slate-200 transition-colors"
                >
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <HardDrive className="w-4 h-4 text-emerald-400" />
                  <span className="hidden sm:inline font-medium">Google Диск</span>
                  <span className="text-[11px] text-slate-400 hidden lg:inline">
                    ({user.displayName || user.email?.split('@')[0]})
                  </span>
                </button>

                {showDriveMenu && (
                  <div
                    className="absolute right-0 mt-2 w-72 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-3 z-50 text-slate-200"
                    onMouseLeave={() => setShowDriveMenu(false)}
                  >
                    <div className="flex items-center gap-2 pb-2 mb-2 border-b border-slate-800">
                      <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-sm">
                        {user.displayName?.[0] || 'U'}
                      </div>
                      <div className="truncate">
                        <p className="text-xs font-semibold text-white truncate">
                          {user.displayName || 'Пользователь Google'}
                        </p>
                        <p className="text-[11px] text-slate-400 truncate">{user.email}</p>
                      </div>
                    </div>

                    <div className="space-y-1 text-xs">
                      <div className="flex items-center gap-2 text-emerald-400 py-1 px-2 rounded bg-emerald-950/40 border border-emerald-900/40">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Синхронизация отчётов активна</span>
                      </div>

                      {driveFolderUrl && (
                        <a
                          href={driveFolderUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center justify-between py-2 px-2 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
                        >
                          <span className="flex items-center gap-2">
                            <FolderOpen className="w-4 h-4 text-amber-400" />
                            <span>Папка отчётов на Диске</span>
                          </span>
                          <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
                        </a>
                      )}
                    </div>

                    <div className="pt-2 mt-2 border-t border-slate-800">
                      <button
                        onClick={() => {
                          setShowDriveMenu(false);
                          onLogout();
                        }}
                        className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-950/30 rounded-lg transition-colors"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Отключить Google аккаунт</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Google Sign-in button styled as requested in Workspace Skill */
              <button
                onClick={onLogin}
                disabled={isLoggingIn}
                className="gsi-material-button text-xs"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  backgroundColor: '#ffffff',
                  color: '#1f1f1f',
                  border: '1px solid #747775',
                  borderRadius: '8px',
                  padding: '6px 12px',
                  fontWeight: 500,
                  cursor: isLoggingIn ? 'wait' : 'pointer',
                  fontSize: '12px',
                }}
              >
                <div style={{ marginRight: '8px', display: 'flex', alignItems: 'center' }}>
                  <svg
                    version="1.1"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 48 48"
                    style={{ width: '18px', height: '18px', display: 'block' }}
                  >
                    <path
                      fill="#EA4335"
                      d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                    ></path>
                    <path
                      fill="#4285F4"
                      d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                    ></path>
                    <path
                      fill="#FBBC05"
                      d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                    ></path>
                    <path
                      fill="#34A853"
                      d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                    ></path>
                  </svg>
                </div>
                <span>{isLoggingIn ? 'Подключение...' : 'Подключить Google Диск'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
