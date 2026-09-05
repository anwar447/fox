import { School, SchoolClassSection, User } from '../types';
import { getUsers } from './storage';

/**
 * Generates standard Saudi educational classes and sections according to school stage.
 */
export function getDefaultClassesForSchoolType(
  type?: 'elementary' | 'middle' | 'secondary' | 'quran' | string,
  isQuran?: boolean
): SchoolClassSection[] {
  if (type === 'quran' || isQuran) {
    return [
      { id: 'c-q1', className: 'حلقة التلقين والقاعدة النورانية', sections: ['1', '2'] },
      { id: 'c-q2', className: 'حلقة الحفظ والمراجعة (المستوى الأول)', sections: ['1', '2'] },
      { id: 'c-q3', className: 'حلقة الحفظ والمراجعة (المستوى الثاني)', sections: ['1', '2'] },
      { id: 'c-q4', className: 'حلقة الإتقان وتثبيت الحفظ', sections: ['1', '2'] },
    ];
  }

  if (type === 'elementary') {
    return [
      { id: 'c-e1', className: 'الأول الابتدائي', sections: ['1', '2', '3'] },
      { id: 'c-e2', className: 'الثاني الابتدائي', sections: ['1', '2', '3'] },
      { id: 'c-e3', className: 'الثالث الابتدائي', sections: ['1', '2', '3'] },
      { id: 'c-e4', className: 'الرابع الابتدائي', sections: ['1', '2', '3'] },
      { id: 'c-e5', className: 'الخامس الابتدائي', sections: ['1', '2', '3'] },
      { id: 'c-e6', className: 'السادس الابتدائي', sections: ['1', '2', '3'] },
    ];
  }

  if (type === 'secondary') {
    return [
      { id: 'c-s1', className: 'الأول الثانوي', sections: ['1', '2', '3'] },
      { id: 'c-s2', className: 'الثاني الثانوي', sections: ['1', '2', '3'] },
      { id: 'c-s3', className: 'الثالث الثانوي', sections: ['1', '2', '3'] },
    ];
  }

  // Default: Middle School (المرحلة المتوسطة)
  return [
    { id: 'c-m1', className: 'الأول المتوسط', sections: ['1', '2', '3'] },
    { id: 'c-m2', className: 'الثاني المتوسط', sections: ['1', '2', '3'] },
    { id: 'c-m3', className: 'الثالث المتوسط', sections: ['1', '2', '3'] },
  ];
}

/**
 * Returns strictly isolated classes for a specific school.
 * 1. Checks school.customClasses.
 * 2. If empty, recovers classes from existing students registered in this school.
 * 3. Fallbacks to stage-appropriate defaults (Elementary, Middle, Secondary, or Quran).
 */
export function getSchoolClasses(school: School, explicitUsers?: User[]): SchoolClassSection[] {
  if (!school) return [];

  // 1. Explicit customClasses saved for this school
  if (Array.isArray(school.customClasses) && school.customClasses.length > 0) {
    return school.customClasses;
  }

  // 2. Safely recover classes if students already exist under this school code
  try {
    const allUsers = explicitUsers || getUsers();
    const studentsInSchool = allUsers.filter(
      (u) => u.schoolCode === school.code && u.role === 'student' && u.className
    );

    if (studentsInSchool.length > 0) {
      const classMap: Record<string, Set<string>> = {};
      studentsInSchool.forEach((s) => {
        const cName = (s.className || '').trim();
        if (cName) {
          if (!classMap[cName]) classMap[cName] = new Set();
          const sec = (s.sectionName || '1').trim();
          classMap[cName].add(sec);
        }
      });

      const recovered: SchoolClassSection[] = Object.entries(classMap).map(([className, secSet], idx) => ({
        id: `c-rec-${idx + 1}`,
        className,
        sections: secSet.size > 0 ? Array.from(secSet).sort() : ['1', '2', '3'],
      }));

      if (recovered.length > 0) {
        return recovered;
      }
    }
  } catch {
    // Ignore error
  }

  // 3. Defaults based on school type
  return getDefaultClassesForSchoolType(school.type, school.isQuranSchool);
}
