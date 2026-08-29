import { InAppNotification, UserRole } from '../types';

const STORAGE_KEY = 'hodork_notifications_v1';

// Request Browser Web Push Notification permission
export async function requestWebNotificationPermission(): Promise<'granted' | 'denied' | 'default'> {
  if (!('Notification' in window)) {
    console.warn('This browser does not support desktop notifications');
    return 'denied';
  }

  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch (err) {
    console.error('Error requesting notification permission:', err);
    return 'denied';
  }
}

export function isWebNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function getWebNotificationPermission(): 'granted' | 'denied' | 'default' | 'unsupported' {
  if (!isWebNotificationSupported()) return 'unsupported';
  return Notification.permission;
}

// Play modern pleasant notification chime via Web Audio API
export function playNotificationChime(type: 'success' | 'alert' | 'emergency' = 'alert') {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    
    if (type === 'emergency') {
      // High pitch urgent tone
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(880, ctx.currentTime); // A5
      osc.frequency.setValueAtTime(440, ctx.currentTime + 0.15); // A4
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.3);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.5);
    } else if (type === 'success') {
      // Smooth positive major chord
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
      osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.1); // E5
      osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.2); // G5
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    } else {
      // Normal ping
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(900, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    }
  } catch (e) {
    // Ignore audio context autoplay restrictions
  }
}

// Send system notification (works in background / minimized tabs / closed modal)
export function triggerNotification(
  title: string,
  body: string,
  type: 'emergency' | 'attendance' | 'truant' | 'subscription' | 'excuse' | 'behavior' | 'general' = 'general',
  schoolCode?: string,
  targetRole: UserRole | 'all' = 'all'
) {
  // 1. Play sound
  if (type === 'emergency') {
    playNotificationChime('emergency');
  } else if (type === 'attendance') {
    playNotificationChime('success');
  } else {
    playNotificationChime('alert');
  }

  // 2. Dispatch Browser Web Push Notification if allowed
  if (isWebNotificationSupported() && Notification.permission === 'granted') {
    try {
      const n = new Notification(title, {
        body,
        icon: '/favicon.ico',
        tag: `hodork-${Date.now()}`,
        requireInteraction: type === 'emergency',
      });
      n.onclick = () => {
        window.focus();
        n.close();
      };
    } catch (err) {
      console.warn('Native notification failed:', err);
    }
  }

  // 3. Store in In-App Notification Center
  const item: InAppNotification = {
    id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    title,
    body,
    type,
    timestamp: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
    read: false,
    schoolCode,
    targetRole,
  };

  const list = getStoredNotifications();
  list.unshift(item);
  saveStoredNotifications(list);

  return item;
}

export function getStoredNotifications(): InAppNotification[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
    
    // Seed initial notifications
    const defaults: InAppNotification[] = [
      {
        id: 'notif-init-1',
        title: 'تنبيه طوارئ: حالة مطرية',
        body: 'تم تحويل الدوام الحضوري إلى منصة مدرستي عن بُعد اعتباراً من الحصة الرابعة.',
        type: 'emergency',
        timestamp: '06:15 ص',
        read: false,
        schoolCode: 'RAYA-1448',
        targetRole: 'all',
      },
      {
        id: 'notif-init-2',
        title: 'تأكيد الحضور الذاتي',
        body: 'تم تسجيل حضورك اليوم بنجاح داخل النطاق الجغرافي للمدرسة الساعة 06:52 ص.',
        type: 'attendance',
        timestamp: '06:52 ص',
        read: true,
        schoolCode: 'SAQR-1448',
        targetRole: 'student',
      },
      {
        id: 'notif-init-3',
        title: 'رصد تباين الحضور (كشف الهارب)',
        body: 'تم رصد 2 حالة تباين بين تسجيل الجوال وغياب الحصة من قبل المعلم.',
        type: 'truant',
        timestamp: '07:30 ص',
        read: false,
        schoolCode: 'RAYA-1448',
        targetRole: 'employee',
      },
    ];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(defaults));
    return defaults;
  } catch {
    return [];
  }
}

export function saveStoredNotifications(notifications: InAppNotification[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications));
  } catch (err) {
    console.error('Failed to save notifications:', err);
  }
}

export function markNotificationAsRead(id: string) {
  const list = getStoredNotifications();
  const item = list.find((n) => n.id === id);
  if (item) {
    item.read = true;
    saveStoredNotifications(list);
  }
}

export function markAllNotificationsAsRead() {
  const list = getStoredNotifications();
  list.forEach((n) => (n.read = true));
  saveStoredNotifications(list);
}

export function clearAllNotifications() {
  saveStoredNotifications([]);
}
