import { SchoolTimings } from '../types';

/**
 * Calculates Haversine distance between two coordinates in meters
 */
export function calculateDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // metres
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

/**
 * Checks if coordinate is inside school geofence
 */
export function isInsideGeofence(
  userLat: number,
  userLng: number,
  schoolLat: number,
  schoolLng: number,
  radiusMeters: number
): { isInside: boolean; distance: number } {
  const distance = calculateDistanceMeters(userLat, userLng, schoolLat, schoolLng);
  return {
    isInside: distance <= radiusMeters,
    distance,
  };
}

/**
 * Converts "HH:mm" time string to minutes from midnight
 */
export function timeToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

/**
 * Evaluates current time relative to school timings
 */
export function checkSchoolTimeStatus(
  timings: SchoolTimings,
  customCurrentTime?: string // for testing/simulation
): {
  isSchoolHours: boolean;
  statusLabel: string;
  statusType: 'before' | 'on_time' | 'late' | 'absent_time' | 'dismissed';
  currentTimeFormatted: string;
} {
  const now = new Date();
  const currentMinutes = customCurrentTime
    ? timeToMinutes(customCurrentTime)
    : now.getHours() * 60 + now.getMinutes();

  const currentHHMM = customCurrentTime
    ? customCurrentTime
    : `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  const tabourMin = timeToMinutes(timings.tabour || '06:45');
  const firstPeriodMin = timeToMinutes(timings.firstPeriod || '07:00');
  const lateAfterMin = timeToMinutes(timings.lateAfter || '07:15');
  const absentAfterMin = timeToMinutes(timings.absentAfter || '07:45');
  const dismissalMin = timeToMinutes(timings.dismissal || '13:00');

  if (currentMinutes < tabourMin - 30) {
    return {
      isSchoolHours: false,
      statusLabel: 'قبل بدء الدوام المدرسي',
      statusType: 'before',
      currentTimeFormatted: currentHHMM,
    };
  }

  if (currentMinutes > dismissalMin + 60) {
    return {
      isSchoolHours: false,
      statusLabel: 'انتهى الدوام المدرسي',
      statusType: 'dismissed',
      currentTimeFormatted: currentHHMM,
    };
  }

  if (currentMinutes <= lateAfterMin) {
    return {
      isSchoolHours: true,
      statusLabel: 'وقت الحضور المبكر (حاضر)',
      statusType: 'on_time',
      currentTimeFormatted: currentHHMM,
    };
  }

  if (currentMinutes <= absentAfterMin) {
    return {
      isSchoolHours: true,
      statusLabel: 'فترة التأخر الصباحي (متأخر)',
      statusType: 'late',
      currentTimeFormatted: currentHHMM,
    };
  }

  return {
    isSchoolHours: true,
    statusLabel: 'مضى وقت الحضور الصباحي (يُسجل غياب)',
    statusType: 'absent_time',
    currentTimeFormatted: currentHHMM,
  };
}
