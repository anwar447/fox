import React from 'react';
import { 
  getAcademicDayStatus, 
  THEME_CONFIGS, 
  SAUDI_ACADEMIC_CALENDAR,
  DayStatusResult 
} from '../utils/academicCalendar';
import { 
  Calendar, 
  Sparkles, 
  Moon, 
  Flag, 
  Scroll, 
  BookOpen, 
  AlertCircle, 
  CheckCircle2, 
  XCircle,
  Palette,
  Clock
} from 'lucide-react';

interface AcademicHolidayBannerProps {
  currentThemeKey?: string;
  onSelectThemeOverride?: (themeKey: string) => void;
  selectedDate?: string;
}

export const AcademicHolidayBanner: React.FC<AcademicHolidayBannerProps> = ({
  currentThemeKey,
  onSelectThemeOverride,
  selectedDate
}) => {
  const dayStatus: DayStatusResult = getAcademicDayStatus(selectedDate);
  const activeThemeKey = currentThemeKey || dayStatus.themeKey;
  const theme = THEME_CONFIGS[activeThemeKey] || THEME_CONFIGS.default;

  const holiday = dayStatus.holidayInfo;

  return (
    <div className="w-full space-y-3 mb-6">
      {/* Top Special Occasion Greeting / Alert Bar */}
      {holiday?.greetingTitle ? (
        <div className={`p-4 sm:p-5 rounded-2xl bg-linear-to-r ${theme.headerGradient} text-white shadow-lg border ${theme.heroAccentBorder} relative overflow-hidden transition-all`}>
          {/* Ambient Particles / Background Accent */}
          <div className="absolute top-2 left-4 text-4xl opacity-20 select-none">
            {theme.particleIcon || '🇸🇦'}
          </div>

          <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1 text-right">
              <div className="flex items-center gap-2">
                <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-black ${theme.badgeBg}`}>
                  {holiday.greetingBadge || theme.badgeLabel}
                </span>
                <span className="text-xs text-slate-300 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>{holiday.startDate} إلى {holiday.endDate}</span>
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                <span>{holiday.greetingTitle}</span>
              </h3>
              <p className="text-xs sm:text-sm text-slate-200 leading-relaxed max-w-3xl">
                {holiday.greetingMessage || holiday.description}
              </p>
            </div>

            {/* Attendance Status Pill */}
            <div className="shrink-0">
              {holiday.isAttendanceAllowed ? (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-bold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>جلسات التحضير نشطة اليوم</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-bold">
                  <Moon className="w-4 h-4 text-amber-400" />
                  <span>عطلة رسمية (لا يتم احتساب غياب)</span>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : !dayStatus.isWorkingDay ? (
        /* Regular Weekend Bar */
        <div className="p-3.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-slate-400"></span>
            <span className="font-bold">{dayStatus.eventName}</span>
            <span className="text-slate-500 text-[11px]">— عطلة أسبوعية لا تتضمن رصد غياب أو خصومات سلوك</span>
          </div>
          <span className="px-2 py-0.5 rounded-md bg-slate-200 text-slate-600 text-[10px] font-bold">
            إجازة نهاية الأسبوع
          </span>
        </div>
      ) : null}

      {/* Interactive Theme Switcher Bar for School Admin & Testing */}
      {onSelectThemeOverride && (
        <div className="flex items-center justify-between flex-wrap gap-2 px-3 py-2 rounded-xl bg-white border border-slate-200/80 shadow-2xs text-xs">
          <div className="flex items-center gap-2 text-slate-600 font-bold">
            <Palette className="w-3.5 h-3.5 text-emerald-600" />
            <span className="text-[11px]">مظهر المنظومة التلقائي بحسب المناسبة السعودية:</span>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto py-1">
            <button
              onClick={() => onSelectThemeOverride('auto')}
              className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                !currentThemeKey || currentThemeKey === 'auto'
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
            >
              🔄 تلقائي بحسب التاريخ
            </button>
            <button
              onClick={() => onSelectThemeOverride('national')}
              className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                currentThemeKey === 'national'
                  ? 'bg-emerald-700 text-white shadow-2xs'
                  : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200'
              }`}
            >
              🇸🇦 اليوم الوطني
            </button>
            <button
              onClick={() => onSelectThemeOverride('founding')}
              className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                currentThemeKey === 'founding'
                  ? 'bg-amber-800 text-white shadow-2xs'
                  : 'bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200'
              }`}
            >
              📜 يوم التأسيس
            </button>
            <button
              onClick={() => onSelectThemeOverride('ramadan')}
              className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                currentThemeKey === 'ramadan'
                  ? 'bg-indigo-900 text-white shadow-2xs'
                  : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-200'
              }`}
            >
              🌙 شهر رمضان
            </button>
            <button
              onClick={() => onSelectThemeOverride('eid')}
              className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                currentThemeKey === 'eid'
                  ? 'bg-purple-800 text-white shadow-2xs'
                  : 'bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-200'
              }`}
            >
              🍬 بهجة الأعياد
            </button>
            <button
              onClick={() => onSelectThemeOverride('exams')}
              className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                currentThemeKey === 'exams'
                  ? 'bg-teal-800 text-white shadow-2xs'
                  : 'bg-teal-50 hover:bg-teal-100 text-teal-900 border border-teal-200'
              }`}
            >
              📝 فترة الاختبارات
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
