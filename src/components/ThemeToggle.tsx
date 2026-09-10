import React, { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';

interface ThemeToggleProps {
  className?: string;
  showLabel?: boolean;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ className = '', showLabel = false }) => {
  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const stored = localStorage.getItem('hodoorak_theme');
    if (stored) return stored === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
      localStorage.setItem('hodoorak_theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('hodoorak_theme', 'light');
    }
  }, [isDark]);

  const toggleTheme = () => {
    setIsDark((prev) => !prev);
  };

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`relative inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl transition-all cursor-pointer border select-none ${
        isDark
          ? 'bg-slate-800 hover:bg-slate-700 text-amber-300 border-slate-700 shadow-xs'
          : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200 shadow-2xs'
      } ${className}`}
      title={isDark ? 'التحويل إلى الوضع النهاري (فاتح)' : 'التحويل إلى الوضع الليلي المريح للعين (داكن)'}
      aria-label="تبديل وضع الألوان"
    >
      {isDark ? (
        <>
          <Sun className="w-3.5 h-3.5 text-amber-400 fill-amber-400 animate-spin-slow" />
          {showLabel && (
            <span className="text-[11px] font-bold text-amber-200">وضع النهار</span>
          )}
        </>
      ) : (
        <>
          <Moon className="w-3.5 h-3.5 text-slate-700 fill-slate-700" />
          {showLabel && (
            <span className="text-[11px] font-bold text-slate-700">وضع القراءة المريح</span>
          )}
        </>
      )}
    </button>
  );
};
