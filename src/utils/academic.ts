export const CODE_TO_GRADE: Record<string, string> = {
  '0730': 'الأول المتوسط',
  '0830': 'الثاني المتوسط',
  '0930': 'الثالث المتوسط',
  '1314': 'الأول الثانوي',
  '1416': 'الثاني الثانوي',
  '1516': 'الثالث الثانوي',
};

export const GRADE_TO_CODE: Record<string, string> = {
  'الأول المتوسط': '0730',
  'الثاني المتوسط': '0830',
  'الثالث المتوسط': '0930',
  'الأول الثانوي': '1314',
  'الثاني الثانوي': '1416',
  'الثالث الثانوي': '1516',
};

export const CODE_TO_SECTION: Record<string, string> = {
  '1': 'أ',
  '2': 'ب',
  '3': 'ج',
  '4': 'د',
  '5': 'هـ',
};

export const SECTION_TO_CODE: Record<string, string> = {
  'أ': '1',
  'ب': '2',
  'ج': '3',
  'د': '4',
  'هـ': '5',
};

export const ALL_GRADES_INTERMEDIATE = [
  'الأول المتوسط',
  'الثاني المتوسط',
  'الثالث المتوسط',
];

export const ALL_GRADES_SECONDARY = [
  'الأول الثانوي',
  'الثاني الثانوي',
  'الثالث الثانوي',
];

export const ALL_SECTIONS = ['أ', 'ب', 'ج', 'د', 'هـ'];

/**
 * Returns a human-friendly readable class name.
 * e.g., "أولى ثانوي فصل ب" or "الأول المتوسط - شعبة أ"
 */
export function formatReadableClass(className: string, sectionName: string): string {
  const cleanGrade = CODE_TO_GRADE[className] || className;
  const cleanSection = CODE_TO_SECTION[sectionName] || sectionName;
  return `${cleanGrade} (شعبة ${cleanSection})`;
}

/**
 * Normalizes grade string to pure readable name (strips code if present)
 */
export function normalizeGrade(gradeInput: string): string {
  if (CODE_TO_GRADE[gradeInput]) {
    return CODE_TO_GRADE[gradeInput];
  }
  return gradeInput;
}

/**
 * Normalizes section string to letter (strips number if present)
 */
export function normalizeSection(sectionInput: string): string {
  if (CODE_TO_SECTION[sectionInput]) {
    return CODE_TO_SECTION[sectionInput];
  }
  return sectionInput;
}

/**
 * Gets Saudi Hijri date / formatted Arabic standard date
 */
export function getArabicFormattedDate(dateStr?: string | Date): { gregorian: string; hijri: string; dayName: string } {
  let dateObj: Date;
  try {
    dateObj = typeof dateStr === 'string' ? new Date(dateStr) : dateStr instanceof Date ? dateStr : new Date();
    if (isNaN(dateObj.getTime())) {
      dateObj = new Date();
    }
  } catch {
    dateObj = new Date();
  }
  
  const dayNames = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
  const dayIndex = isNaN(dateObj.getDay()) ? 0 : dateObj.getDay();
  const dayName = dayNames[dayIndex] || 'اليوم';

  let gregorian = '';
  try {
    gregorian = dateObj.toLocaleDateString('ar-SA-u-nu-latn', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    gregorian = dateObj.toISOString().slice(0, 10);
  }

  let hijri = '';
  try {
    hijri = new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura-nu-latn', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(dateObj);
  } catch {
    hijri = gregorian;
  }

  return { gregorian, hijri, dayName };
}

export const getHijriDateInfo = getArabicFormattedDate;

/**
 * Returns today date string in YYYY-MM-DD format
 */
export function getTodayDateString(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
