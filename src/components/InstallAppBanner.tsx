import React, { useState, useEffect } from 'react';
import { Download, Smartphone, X, Check } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export const InstallAppBanner: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [installedSuccess, setInstalledSuccess] = useState(false);

  useEffect(() => {
    // Check if app is already running as standalone (PWA installed)
    const isStandaloneMode = 
      window.matchMedia('(display-mode: standalone)').matches || 
      (window.navigator as any).standalone === true;

    if (isStandaloneMode) {
      setIsStandalone(true);
      return;
    }

    // Listen for beforeinstallprompt event on Android / Chrome / Edge / modern browsers
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      setDeferredPrompt(promptEvent);
      
      // Auto-trigger direct install prompt if available
      try {
        promptEvent.prompt().then(() => {
          promptEvent.userChoice.then((choice) => {
            if (choice.outcome === 'accepted') {
              setInstalledSuccess(true);
              setTimeout(() => setIsDismissed(true), 2500);
            }
          });
        }).catch(() => {
          // Fallback handled silently
        });
      } catch (err) {
        // Handled silently
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Listen for app installed event
    const handleAppInstalled = () => {
      setInstalledSuccess(true);
      setDeferredPrompt(null);
      setTimeout(() => {
        setIsDismissed(true);
      }, 3000);
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  // If already installed or dismissed, hide
  if (isStandalone || isDismissed) {
    return null;
  }

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        if (choice.outcome === 'accepted') {
          setInstalledSuccess(true);
          setTimeout(() => setIsDismissed(true), 2500);
        }
        setDeferredPrompt(null);
      } catch (err) {
        console.error('Install prompt error:', err);
      }
    } else {
      // In iOS Safari or unsupported direct install, gracefully dismiss without annoying overlays
      setIsDismissed(true);
    }
  };

  return (
    <>
      {/* Sleek Minimal Auto-Install Banner */}
      <div 
        id="pwa-install-banner"
        className="fixed bottom-4 sm:bottom-6 left-4 right-4 sm:left-auto sm:right-6 z-50 sm:max-w-md bg-slate-900/95 text-white p-3.5 rounded-2xl shadow-2xl border border-emerald-500/40 backdrop-blur-md animate-fadeIn transition-all"
        dir="rtl"
      >
        <div className="flex items-center gap-3">
          {/* App Icon */}
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-white shrink-0 shadow-md">
            <Smartphone className="w-5 h-5 text-white" />
          </div>

          <div className="flex-1 space-y-0.5 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-black text-emerald-400">تطبيق حضورك</span>
              <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[9px] font-bold">
                تثبيت فوري
              </span>
            </div>
            
            <p className="text-[11px] text-slate-300 truncate">
              تثبيت التطبيق على الشاشة الرئيسية للوصول السريع
            </p>
          </div>

          {/* Quick 1-Click Action */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              id="btn-install-app"
              onClick={handleInstallClick}
              className="py-1.5 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs transition-all shadow-md cursor-pointer flex items-center gap-1"
            >
              <Download className="w-3.5 h-3.5" />
              <span>تثبيت</span>
            </button>
            
            <button
              type="button"
              onClick={() => setIsDismissed(true)}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
              title="إغلاق"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {installedSuccess && (
          <div className="mt-2 p-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 text-xs font-bold flex items-center gap-1.5">
            <Check className="w-4 h-4 text-emerald-400" />
            <span>تم تثبيت التطبيق بنجاح!</span>
          </div>
        )}
      </div>
    </>
  );
};

