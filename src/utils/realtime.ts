import { Attendance, CorrectionRequest, SystemNotification, User } from '../types';

// Storage keys matching storage.ts v4_clean
const STORAGE_VERSION = 'v4_clean';
const ATTENDANCES_KEY = `hodoorak_attendances_${STORAGE_VERSION}`;
const DELETED_ATTENDANCES_KEY = 'hodoorak_deleted_attendance_ids_registry';
const CORRECTIONS_KEY = `hodoorak_corrections_${STORAGE_VERSION}`;
const NOTIFICATIONS_KEY = `hodoorak_notifications_${STORAGE_VERSION}`;
const USERS_KEY = `hodoorak_users_${STORAGE_VERSION}`;

// Types of listeners
type AttendanceListener = (attendances: Attendance[]) => void;
type CorrectionListener = (corrections: CorrectionRequest[]) => void;
type NotificationListener = (notifications: SystemNotification[]) => void;
type UserListener = (users: User[]) => void;

class RealtimeHub {
  private attendanceListeners = new Set<AttendanceListener>();
  private correctionListeners = new Set<CorrectionListener>();
  private notificationListeners = new Set<NotificationListener>();
  private userListeners = new Set<UserListener>();
  private broadcastChannel: BroadcastChannel | null = null;
  private eventSource: EventSource | null = null;
  private reconnectTimeout: any = null;
  private isInitialized = false;

  constructor() {
    // Delay initialization slightly or initialize on first import
    if (typeof window !== 'undefined') {
      this.init();
    }
  }

  public init() {
    if (this.isInitialized || typeof window === 'undefined') return;
    this.isInitialized = true;

    // 1. Setup Cross-tab BroadcastChannel
    try {
      if ('BroadcastChannel' in window) {
        this.broadcastChannel = new BroadcastChannel('hodoorak_realtime_hub');
        this.broadcastChannel.onmessage = (event) => {
          const msg = event.data;
          if (!msg || !msg.type) return;

          if (msg.type === 'attendances_updated' && Array.isArray(msg.attendances)) {
            this.handleIncomingAttendances(msg.attendances, false);
          } else if (msg.type === 'corrections_updated' && Array.isArray(msg.corrections)) {
            this.handleIncomingCorrections(msg.corrections, false);
          } else if (msg.type === 'notifications_updated' && Array.isArray(msg.notifications)) {
            this.handleIncomingNotifications(msg.notifications, false);
          } else if (msg.type === 'users_updated' && Array.isArray(msg.users)) {
            this.handleIncomingUsers(msg.users, false);
          }
        };
      }
    } catch (e) {
      console.warn('BroadcastChannel not supported in this environment', e);
    }

    // 2. Setup Server-Sent Events (SSE) for cross-device instant sync
    this.setupEventSource();

    // 3. Setup window storage event fallback
    window.addEventListener('storage', (e) => {
      if (e.key === ATTENDANCES_KEY && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed)) {
            this.notifyAttendanceListeners(parsed);
          }
        } catch {}
      }
      if (e.key === USERS_KEY && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed)) {
            this.notifyUserListeners(parsed);
          }
        } catch {}
      }
    });

    // 4. Custom window event listener
    window.addEventListener('hodoorak_internal_attendance_change', ((e: CustomEvent) => {
      if (e.detail && Array.isArray(e.detail)) {
        this.notifyAttendanceListeners(e.detail);
      }
    }) as EventListener);

    window.addEventListener('hodoorak_internal_user_change', ((e: CustomEvent) => {
      if (e.detail && Array.isArray(e.detail)) {
        this.notifyUserListeners(e.detail);
      }
    }) as EventListener);
  }

  private setupEventSource() {
    if (typeof window === 'undefined' || !('EventSource' in window)) return;

    try {
      if (this.eventSource) {
        this.eventSource.close();
      }

      this.eventSource = new EventSource('/api/events');

      this.eventSource.addEventListener('attendances_updated', (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data);
          if (data && Array.isArray(data.attendances)) {
            this.handleIncomingAttendances(data.attendances, true);
          }
        } catch (err) {
          console.error('Error parsing attendances_updated SSE event:', err);
        }
      });

      this.eventSource.addEventListener('corrections_updated', (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data);
          if (data && Array.isArray(data.corrections)) {
            this.handleIncomingCorrections(data.corrections, true);
          }
        } catch (err) {
          console.error('Error parsing corrections_updated SSE event:', err);
        }
      });

      this.eventSource.addEventListener('notifications_updated', (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data);
          if (data && Array.isArray(data.notifications)) {
            this.handleIncomingNotifications(data.notifications, true);
          }
        } catch (err) {
          console.error('Error parsing notifications_updated SSE event:', err);
        }
      });

      this.eventSource.addEventListener('users_updated', (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data);
          if (data && Array.isArray(data.users)) {
            this.handleIncomingUsers(data.users, true);
          }
        } catch (err) {
          console.error('Error parsing users_updated SSE event:', err);
        }
      });

      this.eventSource.onerror = () => {
        if (this.eventSource) {
          this.eventSource.close();
          this.eventSource = null;
        }
        // Auto reconnect after 3 seconds
        clearTimeout(this.reconnectTimeout);
        this.reconnectTimeout = setTimeout(() => {
          this.setupEventSource();
        }, 3000);
      };
    } catch (err) {
      console.warn('Error setting up EventSource:', err);
    }
  }

  private handleIncomingAttendances(incomingList: Attendance[], broadcastToTabs = true) {
    try {
      // Get deleted IDs to sanitize
      let deletedSet = new Set<string>();
      try {
        const delRaw = localStorage.getItem(DELETED_ATTENDANCES_KEY);
        if (delRaw) {
          const arr = JSON.parse(delRaw);
          if (Array.isArray(arr)) arr.forEach((id) => deletedSet.add(String(id)));
        }
      } catch {}

      const cleanList = incomingList.filter(
        (a) => !deletedSet.has(String(a.id)) && !deletedSet.has(`${a.studentId}_${a.date}`)
      );

      // Save to localStorage
      localStorage.setItem(ATTENDANCES_KEY, JSON.stringify(cleanList));

      // Notify local listeners
      this.notifyAttendanceListeners(cleanList);

      // Broadcast to other tabs if from SSE
      if (broadcastToTabs && this.broadcastChannel) {
        try {
          this.broadcastChannel.postMessage({
            type: 'attendances_updated',
            attendances: cleanList,
            timestamp: Date.now(),
          });
        } catch {}
      }
    } catch (e) {
      console.error('Error handling incoming attendances:', e);
    }
  }

  private handleIncomingCorrections(incomingCorrections: CorrectionRequest[], broadcastToTabs = true) {
    try {
      localStorage.setItem(CORRECTIONS_KEY, JSON.stringify(incomingCorrections));
      for (const listener of this.correctionListeners) {
        try {
          listener(incomingCorrections);
        } catch (e) {
          console.error(e);
        }
      }
      if (broadcastToTabs && this.broadcastChannel) {
        try {
          this.broadcastChannel.postMessage({
            type: 'corrections_updated',
            corrections: incomingCorrections,
            timestamp: Date.now(),
          });
        } catch {}
      }
    } catch (e) {
      console.error(e);
    }
  }

  private handleIncomingNotifications(incomingNotifs: SystemNotification[], broadcastToTabs = true) {
    try {
      localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(incomingNotifs));
      for (const listener of this.notificationListeners) {
        try {
          listener(incomingNotifs);
        } catch (e) {
          console.error(e);
        }
      }
      if (broadcastToTabs && this.broadcastChannel) {
        try {
          this.broadcastChannel.postMessage({
            type: 'notifications_updated',
            notifications: incomingNotifs,
            timestamp: Date.now(),
          });
        } catch {}
      }
    } catch (e) {
      console.error(e);
    }
  }

  private handleIncomingUsers(incomingUsers: User[], broadcastToTabs = true) {
    try {
      localStorage.setItem(USERS_KEY, JSON.stringify(incomingUsers));
      this.notifyUserListeners(incomingUsers);
      if (broadcastToTabs && this.broadcastChannel) {
        try {
          this.broadcastChannel.postMessage({
            type: 'users_updated',
            users: incomingUsers,
            timestamp: Date.now(),
          });
        } catch {}
      }
    } catch (e) {
      console.error('Error handling incoming users:', e);
    }
  }

  private notifyAttendanceListeners(attendances: Attendance[]) {
    for (const listener of this.attendanceListeners) {
      try {
        listener(attendances);
      } catch (err) {
        console.error('Error invoking attendance listener:', err);
      }
    }
  }

  private notifyUserListeners(users: User[]) {
    for (const listener of this.userListeners) {
      try {
        listener(users);
      } catch (err) {
        console.error('Error invoking user listener:', err);
      }
    }
  }

  // Public method called by saveAttendances or component actions
  public broadcastLocalAttendanceUpdate(attendances: Attendance[]) {
    // 1. Notify current tab listeners immediately
    this.notifyAttendanceListeners(attendances);

    // 2. Dispatch window event
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('hodoorak_internal_attendance_change', {
          detail: attendances,
        })
      );
    }

    // 3. Broadcast to all other open tabs via BroadcastChannel (0ms delay)
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage({
          type: 'attendances_updated',
          attendances,
          timestamp: Date.now(),
        });
      } catch (e) {
        console.warn('BroadcastChannel postMessage failed:', e);
      }
    }
  }

  // Public method called by saveUsers or user actions
  public broadcastLocalUserUpdate(users: User[]) {
    // 1. Notify current tab listeners immediately
    this.notifyUserListeners(users);

    // 2. Dispatch window event
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('hodoorak_internal_user_change', {
          detail: users,
        })
      );
    }

    // 3. Broadcast to all other open tabs via BroadcastChannel (0ms delay)
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage({
          type: 'users_updated',
          users,
          timestamp: Date.now(),
        });
      } catch (e) {
        console.warn('BroadcastChannel postMessage failed:', e);
      }
    }
  }

  // Subscribe to attendance changes
  public onAttendanceUpdate(listener: AttendanceListener): () => void {
    this.attendanceListeners.add(listener);
    return () => {
      this.attendanceListeners.delete(listener);
    };
  }

  // Subscribe to user list changes
  public onUserUpdate(listener: UserListener): () => void {
    this.userListeners.add(listener);
    return () => {
      this.userListeners.delete(listener);
    };
  }

  // Subscribe to excuse/correction changes
  public onCorrectionUpdate(listener: CorrectionListener): () => void {
    this.correctionListeners.add(listener);
    return () => {
      this.correctionListeners.delete(listener);
    };
  }

  // Subscribe to notifications
  public onNotificationUpdate(listener: NotificationListener): () => void {
    this.notificationListeners.add(listener);
    return () => {
      this.notificationListeners.delete(listener);
    };
  }
}

// Global Singleton Instance
export const realtimeHub = new RealtimeHub();

/**
 * Register a real-time listener for attendance updates.
 * Fires immediately when:
 * - A teacher saves attendance
 * - An administrator changes a student status from absent to present
 * - An excuse is approved or rejected
 * - An update arrives from the server via SSE
 * - Another tab or window changes attendance
 */
export function onRealtimeAttendanceUpdate(callback: (attendances: Attendance[]) => void): () => void {
  return realtimeHub.onAttendanceUpdate(callback);
}

/**
 * Register a real-time listener for user updates (student registration, parent linking, etc.).
 */
export function onRealtimeUserUpdate(callback: (users: User[]) => void): () => void {
  return realtimeHub.onUserUpdate(callback);
}

/**
 * Register a real-time listener for parent excuse / correction updates.
 */
export function onRealtimeCorrectionUpdate(callback: (corrections: CorrectionRequest[]) => void): () => void {
  return realtimeHub.onCorrectionUpdate(callback);
}

/**
 * Broadcast local attendance changes to all listeners and other tabs immediately.
 */
export function broadcastAttendanceChange(attendances: Attendance[]): void {
  realtimeHub.broadcastLocalAttendanceUpdate(attendances);
}

/**
 * Broadcast local user changes (registration, role change) to all listeners and other tabs immediately.
 */
export function broadcastUserChange(users: User[]): void {
  realtimeHub.broadcastLocalUserUpdate(users);
}

/**
 * Broadcast local correction/excuse changes to all listeners and other tabs immediately.
 */
export function broadcastCorrectionChange(corrections: CorrectionRequest[]): void {
  realtimeHub['handleIncomingCorrections'](corrections, true);
}

/**
 * Broadcast local notification changes to all listeners and other tabs immediately.
 */
export function broadcastNotificationChange(notifications: SystemNotification[]): void {
  realtimeHub['handleIncomingNotifications'](notifications, true);
}
