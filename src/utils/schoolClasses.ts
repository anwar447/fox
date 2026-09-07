import { School, SchoolClassSection, User } from '../types';
import { getUsers } from './storage';

/**
 * Detects school stage intelligently from type and name
 */
export function detectSchoolStage(school?: { type?: string; name?: string; isQuranSchool?: boolean }): 'elementary' | 'middle' | 'secondary' | 'quran' | 'combined' {
  if (!school) return 'middle';
  const name = (school.name || '').trim();
  const type = (school.type || '').trim().toLowerCase();

  if (school.isQuranSchool || type === 'quran' || name.includes('تحفيظ') || name.includes('قرآن')) {
    return 'quran';
  }
  if (name.includes('مجمع') || (name.includes('متوسط') && name.includes('ثانوي')) || (name.includes('ابتدائي') && name.includes('متوسط'))) {
    return 'combined';
  }
  if (type === 'elementary' || name.includes('ابتدائي') || name.includes('ابتدائية')) {
    return 'elementary';
  }
  if (type === 'secondary' || name.includes('ثانوي') || name.includes('ثانوية')) {
    return 'secondary';
  }
  // Default to middle (المرحلة المتوسطة)
  return 'middle';
}

/**
 * Generates standard Saudi educational classes and sections according to school stage.
 */
export function getDefaultClassesForSchoolType(
  type?: 'elementary' | 'middle' | 'secondary' | 'quran' | 'combined' | string,
  isQuran?: boolean,
  schoolName?: string
): SchoolClassSection[] {
  const effectiveStage = detectSchoolStage({ type, name: schoolName, isQuranSchool: isQuran });

  if (effectiveStage === 'quran') {
    return [
      { id: 'c-q1', className: 'حلقة التلقين والقاعدة النورانية', sections: ['1', '2', '3'] },
      { id: 'c-q2', className: 'حلقة الحفظ والمراجعة (المستوى الأول)', sections: ['1', '2', '3'] },
      { id: 'c-q3', className: 'حلقة الحفظ والمراجعة (المستوى الثاني)', sections: ['1', '2', '3'] },
      { id: 'c-q4', className: 'حلقة الإتقان وتثبيت الحفظ', sections: ['1', '2', '3'] },
    ];
  }

  if (effectiveStage === 'elementary') {
    return [
      { id: 'c-e1', className: 'الأول الابتدائي', sections: ['1', '2', '3', '4', '5'] },
      { id: 'c-e2', className: 'الثاني الابتدائي', sections: ['1', '2', '3', '4', '5'] },
      { id: 'c-e3', className: 'الثالث الابتدائي', sections: ['1', '2', '3', '4', '5'] },
      { id: 'c-e4', className: 'الرابع الابتدائي', sections: ['1', '2', '3', '4', '5'] },
      { id: 'c-e5', className: 'الخامس الابتدائي', sections: ['1', '2', '3', '4', '5'] },
      { id: 'c-e6', className: 'السادس الابتدائي', sections: ['1', '2', '3', '4', '5'] },
    ];
  }

  if (effectiveStage === 'secondary') {
    return [
      { id: 'c-s1', className: 'الأول الثانوي', sections: ['1', '2', '3', '4', '5'] },
      { id: 'c-s2', className: 'الثاني الثانوي', sections: ['1', '2', '3', '4', '5'] },
      { id: 'c-s3', className: 'الثالث الثانوي', sections: ['1', '2', '3', '4', '5'] },
    ];
  }

  if (effectiveStage === 'combined') {
    return [
      { id: 'c-m1', className: 'الأول المتوسط', sections: ['1', '2', '3', '4', '5'] },
      { id: 'c-m2', className: 'الثاني المتوسط', sections: ['1', '2', '3', '4', '5'] },
      { id: 'c-m3', className: 'الثالث المتوسط', sections: ['1', '2', '3', '4', '5'] },
      { id: 'c-s1', className: 'الأول الثانوي', sections: ['1', '2', '3', '4', '5'] },
      { id: 'c-s2', className: 'الثاني الثانوي', sections: ['1', '2', '3', '4', '5'] },
      { id: 'c-s3', className: 'الثالث الثانوي', sections: ['1', '2', '3', '4', '5'] },
    ];
  }

  // Standard Middle School (المرحلة المتوسطة) - ALWAYS includes all 3 middle grades
  return [
    { id: 'c-m1', className: 'الأول المتوسط', sections: ['1', '2', '3', '4', '5'] },
    { id: 'c-m2', className: 'الثاني المتوسط', sections: ['1', '2', '3', '4', '5'] },
    { id: 'c-m3', className: 'الثالث المتوسط', sections: ['1', '2', '3', '4', '5'] },
  ];
}

/**
 * Returns strictly isolated and complete classes for a specific school.
 * Crucially: it MERGES base stage classes with any custom/student-recovered classes
 * so that standard middle school grades (الأول، الثاني، الثالث المتوسط) are NEVER omitted.
 */
export function getSchoolClasses(school: School, explicitUsers?: User[]): SchoolClassSection[] {
  if (!school) return [];

  // 1. If explicit customClasses are configured for this school, return them directly as authoritative!
  if (Array.isArray(school.customClasses) && school.customClasses.length > 0) {
    return school.customClasses;
  }

  // 2. Otherwise start with complete base classes for this school type and name
  const baseClasses = getDefaultClassesForSchoolType(school.type, school.isQuranSchool, school.name);
  const classMap: Map<string, Set<string>> = new Map();

  // Populate base classes and standard sections
  baseClasses.forEach((bc) => {
    classMap.set(bc.className.trim(), new Set(bc.sections || ['1', '2', '3']));
  });

  // 3. Safely merge classes recovered from students registered in this school
  try {
    const allUsers = explicitUsers || getUsers();
    const studentsInSchool = allUsers.filter(
      (u) =>
        u.schoolCode?.toUpperCase() === school.code?.toUpperCase() &&
        u.role === 'student' &&
        u.className
    );

    studentsInSchool.forEach((s) => {
      const cName = (s.className || '').trim();
      if (cName) {
        const sec = (s.sectionName || '1').trim();
        if (!classMap.has(cName)) {
          classMap.set(cName, new Set([sec, '1', '2', '3']));
        } else {
          classMap.get(cName)!.add(sec);
        }
      }
    });
  } catch {
    // Ignore error
  }

  // Convert back to structured array with stable IDs
  let counter = 1;
  const result: SchoolClassSection[] = [];
  for (const [className, secSet] of classMap.entries()) {
    const sortedSections = Array.from(secSet).sort((a, b) => {
      const numA = parseInt(a, 10);
      const numB = parseInt(b, 10);
      if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
      return a.localeCompare(b, 'ar');
    });

    result.push({
      id: `c-stage-${counter++}`,
      className,
      sections: sortedSections.length > 0 ? sortedSections : ['1', '2', '3'],
    });
  }

  return result.length > 0 ? result : baseClasses;
}
