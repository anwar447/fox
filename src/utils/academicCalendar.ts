// Saudi Academic Calendar & Smart Holiday Management System
// نظام التقويم الدراسي السعودي وإدارة العطل والمناسبات الرسمية

export type AcademicDayType = 
  | 'regular'               // يوم دراسي عادي
  | 'weekend'               // عطلة نهاية الأسبوع (الجمعة / السبت)
  | 'extended_weekend'      // إجازة نهاية أسبوع مطولة
  | 'national_day'          // اليوم الوطني السعودي (23 سبتمبر)
  | 'founding_day'          // يوم التأسيس السعودي (22 فبراير)
  | 'flag_day'              // يوم العلم السعودي (11 مارس)
  | 'ramadan_term'          // أيام الدراسة في شهر رمضان المبارك
  | 'eid_fitr'              // إجازة عيد الفطر المبارك
  | 'eid_adha'              // إجازة عيد الأضحى المبارك
  | 'midterm_break'         // إجازة منتصف الفصل الدراسي / الخريف
  | 'semester_break'        // إجازة نهاية الفصل الدراسي / الشتاء
  | 'back_to_school'        // أسبوع التهيئة وبداية العام الدراسي
  | 'final_exams'           // فترة الاختبارات النهائية والمذاكرة
  | 'summer_vacation';      // الإجازة الصيفية

export interface AcademicHolidayEvent {
  id: string;
  name: string;
  nameEn: string;
  type: AcademicDayType;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  description: string;
  isAttendanceAllowed: boolean; // هل يُسمح بالتحضير الفعلي أو لا
  themeKey: 'national' | 'founding' | 'ramadan' | 'eid' | 'back_to_school' | 'exams' | 'default';
  greetingTitle?: string;
  greetingBadge?: string;
  greetingMessage?: string;
}

export interface DayStatusResult {
  date: string;
  isWorkingDay: boolean;
  dayType: AcademicDayType;
  eventName?: string;
  eventDescription?: string;
  themeKey: 'national' | 'founding' | 'ramadan' | 'eid' | 'back_to_school' | 'exams' | 'default';
  canTakeAttendance: boolean;
  blockReason?: string;
  holidayInfo?: AcademicHolidayEvent;
}

// Saudi Academic Calendar Holidays & Seasons (1447 - 1448H / 2025 - 2027)
export const SAUDI_ACADEMIC_CALENDAR: AcademicHolidayEvent[] = [
  // 1. بداية العام الدراسي وأسبوع التهيئة
  {
    id: 'back_to_school_2026',
    name: 'أسبوع التهيئة والعودة للمدارس',
    nameEn: 'Back to School & Orientation Week',
    type: 'back_to_school',
    startDate: '2026-08-20',
    endDate: '2026-08-28',
    description: 'فترة الاستقبال والتهيئة المدرسية للطلاب مع بدء العام الدراسي الجديد.',
    isAttendanceAllowed: true,
    themeKey: 'back_to_school',
    greetingTitle: '🎒 عوداً حميداً لعام دراسي ملهم ومتميز!',
    greetingBadge: 'عام دراسي جديد',
    greetingMessage: 'أهلاً بكم في رحاب العام الدراسي الجديد. نتمنى لأبنائنا وبناتنا الطلاب وكادرنا التعليمي عاماً حافلاً بالتفوق والإنجاز.',
  },

  // 2. اليوم الوطني السعودي 96
  {
    id: 'national_day_2026',
    name: 'اليوم الوطني السعودي 96',
    nameEn: 'Saudi National Day 96',
    type: 'national_day',
    startDate: '2026-09-22',
    endDate: '2026-09-24',
    description: 'إجازة اليوم الوطني للمملكة العربية السعودية (نحلم ونحقق).',
    isAttendanceAllowed: false,
    themeKey: 'national',
    greetingTitle: '🇸🇦 نحلم ونحقق | اليوم الوطني السعودي',
    greetingBadge: 'اليوم الوطني 96',
    greetingMessage: 'دام عزك يا وطن! تهنئة خاصة لطلابنا وأولياء الأمور والكادر التعليمي بمناسبة اليوم الوطني المجيد.',
  },

  // 3. إجازة نهاية أسبوع مطولة 1
  {
    id: 'extended_weekend_1',
    name: 'إجازة نهاية أسبوع مطولة (الفصل الأول)',
    nameEn: 'Long Weekend Holiday',
    type: 'extended_weekend',
    startDate: '2026-10-18',
    endDate: '2026-10-19',
    description: 'إجازة نهاية أسبوع مطولة معتمدة وفق التقويم الدراسي لوزارة التعليم.',
    isAttendanceAllowed: false,
    themeKey: 'default',
  },

  // 4. إجازة الخريف
  {
    id: 'autumn_break_2026',
    name: 'إجازة الخريف ومنتصف الفصل',
    nameEn: 'Autumn Break',
    type: 'midterm_break',
    startDate: '2026-11-06',
    endDate: '2026-11-14',
    description: 'إجازة الخريف المعتمدة لطلاب ومنسوبي التعليم.',
    isAttendanceAllowed: false,
    themeKey: 'default',
  },

  // 5. فترة اختبارات الفصل الأول
  {
    id: 'exams_term_1',
    name: 'فترة الاختبارات التحريرية للفصل الأول',
    nameEn: 'Term 1 Final Exams',
    type: 'final_exams',
    startDate: '2026-12-15',
    endDate: '2026-12-25',
    description: 'فترة الاختبارات النهائية للفصل الأول - تحضير مرن وتنظيم قاعات.',
    isAttendanceAllowed: true,
    themeKey: 'exams',
    greetingTitle: '📝 دعواتنا لكم بالتوفيق في الاختبارات النهائية',
    greetingBadge: 'فترة الاختبارات',
    greetingMessage: 'نسأل الله التوفيق والسداد لكافة الطلاب والطالبات، مع تمنياتنا بدرجات عليا ونجاح باهر.',
  },

  // 6. إجازة نهاية الفصل الأول
  {
    id: 'term1_break',
    name: 'إجازة نهاية الفصل الدراسي الأول',
    nameEn: 'Term 1 Break',
    type: 'semester_break',
    startDate: '2026-12-26',
    endDate: '2027-01-02',
    description: 'عطلة نهاية الفصل الدراسي الأول لجميع المدارس.',
    isAttendanceAllowed: false,
    themeKey: 'default',
  },

  // 7. يوم التأسيس السعودي
  {
    id: 'founding_day_2027',
    name: 'يوم التأسيس السعودي (يوم بدينا)',
    nameEn: 'Saudi Founding Day',
    type: 'founding_day',
    startDate: '2027-02-21',
    endDate: '2027-02-23',
    description: 'إجازة رسمية احتفاءً بيوم تأسيس الدولة السعودية الأولى.',
    isAttendanceAllowed: false,
    themeKey: 'founding',
    greetingTitle: '📜 يوم بدينا | يوم التأسيس السعودي',
    greetingBadge: 'يوم التأسيس',
    greetingMessage: 'ثلاثة قرون من المجد والشموخ. كل عام ومملكتنا الغالية في عزٍ ورخاء وأمن وأمان.',
  },

  // 8. يوم العلم السعودي
  {
    id: 'flag_day_2027',
    name: 'يوم العلم السعودي',
    nameEn: 'Saudi Flag Day',
    type: 'flag_day',
    startDate: '2027-03-11',
    endDate: '2027-03-11',
    description: 'يوم العلم السعودي احتفاءً براية التوحيد والعزة.',
    isAttendanceAllowed: true,
    themeKey: 'national',
    greetingTitle: '🇸🇦 راية العز والفخر | يوم العلم',
    greetingBadge: 'يوم العلم',
    greetingMessage: 'بيرق التوحيد خفاق في سماء المجد، رمز القوة والعدل والسيادة.',
  },

  // 9. شهر رمضان المبارك
  {
    id: 'ramadan_2027',
    name: 'شهر رمضان المبارك',
    nameEn: 'Holy Month of Ramadan',
    type: 'ramadan_term',
    startDate: '2027-03-09',
    endDate: '2027-03-24',
    description: 'فترة الدراسة خلال شهر رمضان المبارك وفق المواعيد المرنة المعتمدة.',
    isAttendanceAllowed: true,
    themeKey: 'ramadan',
    greetingTitle: '🌙 مبارك عليكم شهر رمضان المبارك',
    greetingBadge: 'رمضان كريم',
    greetingMessage: 'تقبل الله منا ومنكم الصيام والقيام وصالح الأعمال، وجعل أيامه خيراً وبركة على مدارسنا وأسرنا.',
  },

  // 10. إجازة عيد الفطر المبارك
  {
    id: 'eid_fitr_2027',
    name: 'إجازة عيد الفطر المبارك',
    nameEn: 'Eid Al-Fitr Holiday',
    type: 'eid_fitr',
    startDate: '2027-03-25',
    endDate: '2027-04-06',
    description: 'إجازة عيد الفطر المبارك الرسمية لكافة المدارس والجامعات.',
    isAttendanceAllowed: false,
    themeKey: 'eid',
    greetingTitle: '🍬 تقبل الله طاعتكم وكل عام وأنتم بخير | عيد الفطر المبارك',
    greetingBadge: 'عيدكم مبارك',
    greetingMessage: 'أعاده الله علينا وعليكم باليمن والمسرات والبركات، تقبل الله منا ومنكم الطاعات.',
  },

  // 11. إجازة عيد الأضحى المبارك
  {
    id: 'eid_adha_2027',
    name: 'إجازة عيد الأضحى المبارك',
    nameEn: 'Eid Al-Adha Holiday',
    type: 'eid_adha',
    startDate: '2027-05-27',
    endDate: '2027-06-08',
    description: 'إجازة عيد الأضحى المبارك وموسم الحج.',
    isAttendanceAllowed: false,
    themeKey: 'eid',
    greetingTitle: '🕋 عيد أضحى مبارك وكل عام وأنتم بخير',
    greetingBadge: 'عيد الأضحى المبارك',
    greetingMessage: 'حجاً مبروراً وسعياً مشكوراً، أعاده الله على وطننا وأمتنا بالخير والسلام.',
  },

  // 12. الإجازة الصيفية
  {
    id: 'summer_vacation_2027',
    name: 'الإجازة الصيفية ونهاية العام الدراسي',
    nameEn: 'Summer Vacation',
    type: 'summer_vacation',
    startDate: '2027-06-25',
    endDate: '2027-08-15',
    description: 'الإجازة الصيفية الرسمية وانتهاء أعمال العام الدراسي.',
    isAttendanceAllowed: false,
    themeKey: 'default',
  }
];

/**
 * Checks a specific date against the Saudi Academic Calendar & Weekends
 */
export function getAcademicDayStatus(targetDateStr?: string): DayStatusResult {
  const dateObj = targetDateStr ? new Date(targetDateStr) : new Date();
  // Format as YYYY-MM-DD in local time
  const yyyy = dateObj.getFullYear();
  const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
  const dd = String(dateObj.getDate()).padStart(2, '0');
  const dateStr = `${yyyy}-${mm}-${dd}`;

  const dayOfWeek = dateObj.getDay(); // 0 = Sunday, 5 = Friday, 6 = Saturday
  const isWeekend = dayOfWeek === 5 || dayOfWeek === 6; // الجمعة والسبت

  // 1. Match against known official calendar events
  const matchingEvent = SAUDI_ACADEMIC_CALENDAR.find((ev) => {
    return dateStr >= ev.startDate && dateStr <= ev.endDate;
  });

  if (matchingEvent) {
    if (!matchingEvent.isAttendanceAllowed) {
      return {
        date: dateStr,
        isWorkingDay: false,
        dayType: matchingEvent.type,
        eventName: matchingEvent.name,
        eventDescription: matchingEvent.description,
        themeKey: matchingEvent.themeKey,
        canTakeAttendance: false,
        blockReason: `اليوم عطلة رسمية معتمدة: (${matchingEvent.name})`,
        holidayInfo: matchingEvent,
      };
    }

    // Special periods with active attendance (e.g. Ramadan, Exams, Back to School)
    return {
      date: dateStr,
      isWorkingDay: !isWeekend,
      dayType: isWeekend ? 'weekend' : matchingEvent.type,
      eventName: matchingEvent.name,
      eventDescription: matchingEvent.description,
      themeKey: matchingEvent.themeKey,
      canTakeAttendance: !isWeekend,
      blockReason: isWeekend ? 'عطلة نهاية الأسبوع (الجمعة / السبت)' : undefined,
      holidayInfo: matchingEvent,
    };
  }

  // 2. Standard Weekend Check
  if (isWeekend) {
    return {
      date: dateStr,
      isWorkingDay: false,
      dayType: 'weekend',
      eventName: dayOfWeek === 5 ? 'عطلة يوم الجمعة' : 'عطلة يوم السبت',
      eventDescription: 'عطلة نهاية الأسبوع المعتمدة',
      themeKey: 'default',
      canTakeAttendance: false,
      blockReason: 'اليوم عطلة نهاية الأسبوع (الجمعة / السبت)',
    };
  }

  // 3. Regular School Working Day
  return {
    date: dateStr,
    isWorkingDay: true,
    dayType: 'regular',
    eventName: 'يوم دراسي عادي',
    themeKey: 'default',
    canTakeAttendance: true,
  };
}

/**
 * Returns the currently active theme config based on date or manual override
 */
export interface ThemeConfig {
  key: 'national' | 'founding' | 'ramadan' | 'eid' | 'back_to_school' | 'exams' | 'default';
  title: string;
  badgeLabel?: string;
  badgeBg: string;
  badgeText: string;
  headerGradient: string;
  heroAccentBorder: string;
  primaryButton: string;
  iconColor: string;
  accentBg: string;
  particleIcon?: string;
}

export const THEME_CONFIGS: Record<string, ThemeConfig> = {
  national: {
    key: 'national',
    title: 'اليوم الوطني السعودي 🇸🇦',
    badgeLabel: 'نحلم ونحقق 🇸🇦',
    badgeBg: 'bg-emerald-800 text-emerald-100 border border-emerald-500/30',
    badgeText: 'text-emerald-300',
    headerGradient: 'from-emerald-950 via-slate-900 to-emerald-900',
    heroAccentBorder: 'border-emerald-500/50 shadow-emerald-900/20',
    primaryButton: 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/30',
    iconColor: 'text-emerald-400',
    accentBg: 'bg-emerald-950/40 border-emerald-800/40',
    particleIcon: '🇸🇦',
  },
  founding: {
    key: 'founding',
    title: 'يوم التأسيس السعودي 📜',
    badgeLabel: 'يوم بدينا - 1727م 📜',
    badgeBg: 'bg-amber-950 text-amber-100 border border-amber-600/40',
    badgeText: 'text-amber-400',
    headerGradient: 'from-stone-950 via-amber-950/80 to-stone-900',
    heroAccentBorder: 'border-amber-600/50 shadow-amber-900/20',
    primaryButton: 'bg-amber-700 hover:bg-amber-600 text-white shadow-amber-950/40',
    iconColor: 'text-amber-400',
    accentBg: 'bg-amber-950/30 border-amber-800/40',
    particleIcon: '📜',
  },
  ramadan: {
    key: 'ramadan',
    title: 'شهر رمضان المبارك 🌙',
    badgeLabel: 'رمضان كريم 🌙',
    badgeBg: 'bg-indigo-950 text-indigo-100 border border-amber-400/40',
    badgeText: 'text-amber-300',
    headerGradient: 'from-slate-950 via-indigo-950 to-slate-900',
    heroAccentBorder: 'border-amber-400/40 shadow-indigo-900/30',
    primaryButton: 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-950/40',
    iconColor: 'text-amber-300',
    accentBg: 'bg-indigo-950/40 border-indigo-800/40',
    particleIcon: '🌙',
  },
  eid: {
    key: 'eid',
    title: 'بهجة العيد المبارك 🍬',
    badgeLabel: 'عيدكم مبارك وكل عام وأنتم بخير 🎉',
    badgeBg: 'bg-purple-950 text-purple-100 border border-purple-400/40',
    badgeText: 'text-purple-300',
    headerGradient: 'from-slate-950 via-purple-950 to-slate-900',
    heroAccentBorder: 'border-purple-500/50 shadow-purple-900/30',
    primaryButton: 'bg-purple-600 hover:bg-purple-500 text-white shadow-purple-950/40',
    iconColor: 'text-purple-400',
    accentBg: 'bg-purple-950/40 border-purple-800/40',
    particleIcon: '✨',
  },
  back_to_school: {
    key: 'back_to_school',
    title: 'العودة للمدارس 🎒',
    badgeLabel: 'عام دراسي مفعم بالهمة 🎒',
    badgeBg: 'bg-blue-950 text-blue-100 border border-blue-400/40',
    badgeText: 'text-blue-300',
    headerGradient: 'from-slate-950 via-blue-950 to-slate-900',
    heroAccentBorder: 'border-blue-500/50 shadow-blue-900/30',
    primaryButton: 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-950/40',
    iconColor: 'text-blue-400',
    accentBg: 'bg-blue-950/40 border-blue-800/40',
    particleIcon: '🎓',
  },
  exams: {
    key: 'exams',
    title: 'فترة الاختبارات النهائية 📝',
    badgeLabel: 'فترة الاختبارات والتقييم 📝',
    badgeBg: 'bg-teal-950 text-teal-100 border border-teal-400/40',
    badgeText: 'text-teal-300',
    headerGradient: 'from-slate-950 via-teal-950 to-slate-900',
    heroAccentBorder: 'border-teal-500/50 shadow-teal-900/30',
    primaryButton: 'bg-teal-600 hover:bg-teal-500 text-white shadow-teal-950/40',
    iconColor: 'text-teal-400',
    accentBg: 'bg-teal-950/40 border-teal-800/40',
    particleIcon: '✏️',
  },
  default: {
    key: 'default',
    title: 'المظهر القياسي المتطور',
    badgeLabel: 'نظام حضورك الذكي 🏫',
    badgeBg: 'bg-emerald-950 text-emerald-200 border border-emerald-800/40',
    badgeText: 'text-emerald-400',
    headerGradient: 'from-slate-900 via-slate-800 to-emerald-950',
    heroAccentBorder: 'border-emerald-500/30 shadow-slate-900/10',
    primaryButton: 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/20',
    iconColor: 'text-emerald-400',
    accentBg: 'bg-slate-900/40 border-slate-800/40',
  }
};

/**
 * Helper to calculate actual working school days in a date range (excluding weekends and official holidays)
 */
export function calculateEffectiveSchoolDays(startDateStr: string, endDateStr: string): number {
  let count = 0;
  const curr = new Date(startDateStr);
  const end = new Date(endDateStr);

  while (curr <= end) {
    const yyyy = curr.getFullYear();
    const mm = String(curr.getMonth() + 1).padStart(2, '0');
    const dd = String(curr.getDate()).padStart(2, '0');
    const dateStr = `${yyyy}-${mm}-${dd}`;

    const status = getAcademicDayStatus(dateStr);
    if (status.isWorkingDay) {
      count++;
    }
    curr.setDate(curr.getDate() + 1);
  }

  return count;
}
