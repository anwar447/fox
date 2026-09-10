import { School } from '../types';
import { getSchools, saveSchools, getAttendances, saveAttendances, addSystemNotification } from './storage';

export interface SchoolScheduleConfig {
  workStartTime: string; // e.g. "06:45"
  lateCutoffTime: string; // e.g. "07:15"
  absenceCutoffTime: string; // e.g. "08:30"
  workEndTime: string; // e.g. "13:30"
}

export const DEFAULT_SCHOOL_SCHEDULE: SchoolScheduleConfig = {
  workStartTime: '06:45',
  lateCutoffTime: '07:15',
  absenceCutoffTime: '08:30',
  workEndTime: '13:30',
};

/**
 * Returns effective schedule for a school with fallbacks
 */
export function getSchoolSchedule(school?: School | null): SchoolScheduleConfig {
  return {
    workStartTime: school?.workStartTime || DEFAULT_SCHOOL_SCHEDULE.workStartTime,
    lateCutoffTime: school?.lateCutoffTime || DEFAULT_SCHOOL_SCHEDULE.lateCutoffTime,
    absenceCutoffTime: school?.absenceCutoffTime || DEFAULT_SCHOOL_SCHEDULE.absenceCutoffTime,
    workEndTime: school?.workEndTime || DEFAULT_SCHOOL_SCHEDULE.workEndTime,
  };
}

/**
 * Parse time string to minutes from midnight
 */
export function parseTimeToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  // Extract digits
  const parts = timeStr.replace(/[^\d:]/g, '').split(':');
  if (parts.length < 2) return 0;
  let hours = parseInt(parts[0], 10) || 0;
  const minutes = parseInt(parts[1], 10) || 0;

  // If time string contains 'م' or 'PM' and hours < 12
  if ((timeStr.includes('م') || timeStr.toUpperCase().includes('PM')) && hours < 12) {
    hours += 12;
  }
  // If time string contains 'ص' or 'AM' and hours === 12
  if ((timeStr.includes('ص') || timeStr.toUpperCase().includes('AM')) && hours === 12) {
    hours = 0;
  }
  return hours * 60 + minutes;
}

/**
 * Compares two time strings in "HH:mm" format (24-hour).
 * Returns true if timeA is strictly after timeB.
 */
export function isTimeAfter(timeA: string, timeB: string): boolean {
  if (!timeA || !timeB) return false;
  const cleanA = parseTimeToMinutes(timeA);
  const cleanB = parseTimeToMinutes(timeB);
  return cleanA > cleanB;
}

/**
 * Formats a Date object or standard time into HH:mm (24-hour string)
 */
export function getTimeString(date: Date = new Date()): string {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

/**
 * Checks whether attendance is currently considered "late" based on school settings.
 */
export function isAttendanceLate(checkInTime: string | Date, school?: School | null): boolean {
  const schedule = getSchoolSchedule(school);
  const timeStr = checkInTime instanceof Date ? getTimeString(checkInTime) : checkInTime;
  return isTimeAfter(timeStr, schedule.lateCutoffTime);
}

/**
 * Checks whether attendance is past the absence cutoff threshold.
 */
export function isPastAbsenceCutoff(checkInTime: string | Date, school?: School | null): boolean {
  const schedule = getSchoolSchedule(school);
  const timeStr = checkInTime instanceof Date ? getTimeString(checkInTime) : checkInTime;
  return isTimeAfter(timeStr, schedule.absenceCutoffTime);
}

/**
 * Check if absence tracking is suspended for a school on a specific date (e.g. rain emergency)
 */
export function isAbsenceSuspendedForSchool(school?: School | null, dateStr?: string): boolean {
  if (!school || !dateStr) return false;
  const list = school.absenceSuspendedDates || [];
  return list.includes(dateStr);
}

/**
 * Toggles emergency weather / alert absence suspension for a school on a specific date.
 * When enabled:
 * - Updates school's absenceSuspendedDates
 * - Converts existing absent records for that date into excused absences with emergency reason
 * - Generates system notification to assure staff and parents
 */
export function setSchoolAbsenceSuspension(
  schoolCode: string,
  dateStr: string,
  suspend: boolean,
  reason: string = 'حالة مطرية مفاجئة / تعليق الدراسة'
): void {
  const allSchools = getSchools();
  const schoolIdx = allSchools.findIndex(
    (s) => s.code?.toUpperCase() === schoolCode.toUpperCase() || s.id === schoolCode
  );
  if (schoolIdx < 0) return;

  const school = allSchools[schoolIdx];
  const currentDates = new Set<string>(school.absenceSuspendedDates || []);

  if (suspend) {
    currentDates.add(dateStr);
    school.absenceSuspendedDates = Array.from(currentDates);
    school.absenceSuspensionReason = reason;

    // Convert today's absent records in this school to excused
    const allAtts = getAttendances();
    let modified = false;
    const updatedAtts = allAtts.map((a) => {
      const isMatch = (a.schoolCode?.toUpperCase() === schoolCode.toUpperCase()) && a.date === dateStr;
      if (isMatch && a.finalStatus === 'absent') {
        modified = true;
        return {
          ...a,
          finalStatus: 'excused' as const,
          excuseStatus: 'accepted' as const,
          excuseReason: `🌧️ ${reason} (إيقاف احتساب الغياب رسمياً)`,
          adminExcuseNotes: 'معفى بقرار الإدارة للظروف المطرية والطارئة',
        };
      }
      return a;
    });

    if (modified) {
      saveAttendances(updatedAtts, true);
    }

    addSystemNotification({
      id: `notif-susp-${Date.now()}`,
      schoolCode: school.code,
      title: '🌧️ تنبيه عاجل: إيقاف احتساب الغياب لليوم',
      message: `تم تفعيل قرار إيقاف احتساب الغياب لليوم (${dateStr}) نظراً لـ (${reason}). جميع الطلاب معفون من الغياب ولن تتأثر درجات المواظبة.`,
      type: 'info',
      createdAt: new Date().toISOString(),
    });
  } else {
    currentDates.delete(dateStr);
    school.absenceSuspendedDates = Array.from(currentDates);

    addSystemNotification({
      id: `notif-resum-${Date.now()}`,
      schoolCode: school.code,
      title: '☀️ استئناف احتساب الغياب والدوام الاعتيادي',
      message: `تم إلغاء تعليق الغياب لليوم (${dateStr}) واستئناف تسجيل الحضور والغياب بصورة اعتيادية.`,
      type: 'info',
      createdAt: new Date().toISOString(),
    });
  }

  allSchools[schoolIdx] = school;
  saveSchools(allSchools, true);
}
