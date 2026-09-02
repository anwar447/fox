// Geolocation & Distance Calculation (Haversine formula)

export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c); // distance in meters
}

export interface UserLocationResult {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
}

export function getCurrentCoordinates(): Promise<UserLocationResult> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('خدمة تحديد الموقع الجغرافي غير مدعومة في متصفحك'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: position.timestamp,
        });
      },
      (error) => {
        let msg = 'تعذر الحصول على الموقع الجغرافي';
        if (error.code === error.PERMISSION_DENIED) {
          msg = 'تم رفض الإذن بالوصول للموقع. يرجى تفعيل الموقع من إعدادات المتصفح.';
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          msg = 'الموقع الجغرافي غير متاح حالياً.';
        } else if (error.code === error.TIMEOUT) {
          msg = 'انتهت مهلة تحديد الموقع.';
        }
        reject(new Error(msg));
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  });
}
