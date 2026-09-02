// Academic Calendar & Themes

export interface AcademicDayStatus {
  isHoliday: boolean;
  holidayName?: string;
  theme?: 'ramadan' | 'national_day' | 'founding_day' | 'flag_day' | 'standard';
  description?: string;
}

export const THEME_CONFIGS = {
  standard: {
    name: 'الافتراضي',
    primaryColor: '#059669',
    badgeColor: 'bg-emerald-100 text-emerald-800',
    bannerGradient: 'from-emerald-800 to-slate-900',
  },
  ramadan: {
    name: 'شهر رمضان المبارك',
    primaryColor: '#6366f1',
    badgeColor: 'bg-indigo-100 text-indigo-900',
    bannerGradient: 'from-indigo-900 via-purple-900 to-slate-900',
  },
  national_day: {
    name: 'اليوم الوطني السعودي',
    primaryColor: '#15803d',
    badgeColor: 'bg-green-100 text-green-900',
    bannerGradient: 'from-green-900 via-emerald-900 to-slate-900',
  },
  founding_day: {
    name: 'يوم التأسيس السعودي',
    primaryColor: '#92400e',
    badgeColor: 'bg-amber-100 text-amber-900',
    bannerGradient: 'from-amber-950 via-stone-900 to-slate-950',
  },
  flag_day: {
    name: 'يوم العلم السعودي',
    primaryColor: '#166534',
    badgeColor: 'bg-emerald-100 text-emerald-900',
    bannerGradient: 'from-emerald-950 via-green-900 to-slate-950',
  },
};

export function getAcademicDayStatus(date: Date = new Date()): AcademicDayStatus {
  const dayOfWeek = date.getDay(); // 0 = Sunday, 5 = Friday, 6 = Saturday
  const isWeekend = dayOfWeek === 5 || dayOfWeek === 6;

  if (isWeekend) {
    return {
      isHoliday: true,
      holidayName: dayOfWeek === 5 ? 'إجازة نهاية الأسبوع (الجمعة)' : 'إجازة نهاية الأسبوع (السبت)',
      theme: 'standard',
      description: 'عطلة نهاية الأسبوع الرسمية',
    };
  }

  // Sample check for specific months or dates if needed
  return {
    isHoliday: false,
    theme: 'standard',
  };
}
