import React, { useState, useEffect } from 'react';
import { Calendar, Clock } from 'lucide-react';
import { getHijriDateInfo } from '../utils/academic';

interface LiveClockHeaderProps {
  className?: string;
  variant?: 'card' | 'badge' | 'compact';
}

export const LiveClockHeader: React.FC<LiveClockHeaderProps> = ({ 
  className = '',
  variant = 'card'
}) => {
  const [currentTime, setCurrentTime] = useState<string>('');
  const [dateInfo, setDateInfo] = useState(getHijriDateInfo());

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      // Format time with seconds in Arabic 12-hour format
      let hours = now.getHours();
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const seconds = String(now.getSeconds()).padStart(2, '0');
      const ampm = hours >= 12 ? 'م' : 'ص';
      hours = hours % 12;
      hours = hours ? hours : 12;
      
      setCurrentTime(`${hours}:${minutes}:${seconds} ${ampm}`);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Get day name
  const dayName = new Intl.DateTimeFormat('ar-SA', { weekday: 'long' }).format(new Date());

  if (variant === 'compact') {
    return (
      <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-white/90 border border-slate-200/80 shadow-xs text-xs ${className}`} dir="rtl">
        <span className="font-black text-slate-900 text-sm">{dayName}</span>
        <span className="text-slate-300">|</span>
        <span className="text-slate-600 font-medium text-[11px]">{dateInfo.hijriFormatted}</span>
        <span className="text-slate-300">|</span>
        <div className="flex items-center gap-1 font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200/60">
          <Clock className="w-3 h-3 text-emerald-600 animate-pulse" />
          <span>{currentTime}</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-gradient-to-l from-slate-900 via-slate-850 to-slate-900 text-white rounded-3xl p-4 sm:p-5 shadow-lg border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-right ${className}`} dir="rtl">
      {/* Day & Dates Section */}
      <div className="flex items-center gap-3.5">
        <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0 shadow-inner">
          <Calendar className="w-6 h-6" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-lg sm:text-2xl font-black text-emerald-400 tracking-tight">
              {dayName}
            </span>
            <span className="text-[10px] sm:text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
              توقيت مكة المكرمة
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-slate-300 mt-0.5 font-medium">
            <span>التاريخ الهجري: <strong className="text-amber-300 font-bold">{dateInfo.hijriFormatted}</strong></span>
            <span className="text-slate-600 hidden sm:inline">•</span>
            <span>التاريخ الميلادي: <strong className="text-slate-200 font-bold">{dateInfo.gregorianFormatted}</strong></span>
          </div>
        </div>
      </div>

      {/* Live Clock Section */}
      <div className="flex items-center gap-2.5 bg-slate-950/70 border border-slate-800/90 px-4 py-2.5 rounded-2xl shadow-inner mr-auto sm:mr-0">
        <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
        <Clock className="w-4 h-4 text-emerald-400" />
        <div className="text-left">
          <span className="text-[10px] text-slate-400 block font-bold leading-none">الوقت الآن</span>
          <span className="font-mono text-base sm:text-lg font-black text-emerald-300 tracking-widest block leading-tight">
            {currentTime}
          </span>
        </div>
      </div>
    </div>
  );
};
