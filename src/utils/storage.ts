import { 
  School, User, UserRole, Attendance, CorrectionRequest, 
  SubscriptionPaymentRequest, SystemNotification, 
  StudentPermission, StudentBehaviorLog, AdministrativeAbsenceAction,
  SchoolClassSection, isStaffOrEmployeeRole, ParentSummon
} from '../types';
import { INITIAL_SCHOOLS, INITIAL_USERS, INITIAL_PERMISSIONS, INITIAL_BEHAVIOR_LOGS } from '../data/seedData';
import { getTodayDateString } from './academic';
import { getDefaultClassesForSchoolType } from './schoolClasses';
import { broadcastAttendanceChange, broadcastCorrectionChange, broadcastNotificationChange, broadcastUserChange } from './realtime';

const STORAGE_VERSION = 'v4_clean';
const SCHOOLS_KEY = `hodoorak_schools_${STORAGE_VERSION}`;
const USERS_KEY = `hodoorak_users_${STORAGE_VERSION}`;
const ATTENDANCES_KEY = `hodoorak_attendances_${STORAGE_VERSION}`;
const PERMISSIONS_KEY = `hodoorak_permissions_${STORAGE_VERSION}`;
const BEHAVIOR_KEY = `hodoorak_behavior_${STORAGE_VERSION}`;
const CORRECTIONS_KEY = `hodoorak_corrections_${STORAGE_VERSION}`;
const PAYMENTS_KEY = `hodoorak_payments_${STORAGE_VERSION}`;
const NOTIFICATIONS_KEY = `hodoorak_notifications_${STORAGE_VERSION}`;
const CURRENT_USER_KEY = `hodoorak_current_user_${STORAGE_VERSION}`;
const ABSENCE_ACTIONS_KEY = `hodoorak_absence_actions_${STORAGE_VERSION}`;
const PARENT_SUMMONS_KEY = `hodoorak_parent_summons_${STORAGE_VERSION}`;

// Helper for fire-and-forget or background server API sync
async function apiPost(endpoint: string, body: any): Promise<any> {
  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn(`Sync failed for ${endpoint}:`, err);
  }
  return null;
}

const DELETED_SCHOOLS_KEY = 'hodoorak_deleted_schools_registry';
const DELETED_ATTENDANCES_KEY = 'hodoorak_deleted_attendance_ids_registry';
const DELETED_NOTIFICATIONS_KEY = 'hodoorak_deleted_notification_ids_registry';
export const DEFAULT_PURGED_DEMO_SCHOOLS: string[] = [];

export function getDeletedNotificationIds(): string[] {
  try {
    const raw = localStorage.getItem(DELETED_NOTIFICATIONS_KEY);
    const parsed: string[] = raw ? JSON.parse(raw) : [];
    return Array.from(new Set(parsed.map((s) => String(s))));
  } catch {
    return [];
  }
}

export function recordDeletedNotificationId(id: string): void {
  try {
    if (!id) return;
    const list = getDeletedNotificationIds();
    const str = String(id);
    if (!list.includes(str)) {
      list.push(str);
      localStorage.setItem(DELETED_NOTIFICATIONS_KEY, JSON.stringify(list));
    }
  } catch {}
}

export function getDeletedAttendanceIds(): string[] {
  try {
    const raw = localStorage.getItem(DELETED_ATTENDANCES_KEY);
    const parsed: string[] = raw ? JSON.parse(raw) : [];
    return Array.from(new Set(parsed.map((s) => String(s))));
  } catch {
    return [];
  }
}

export function recordDeletedAttendanceId(id: string): void {
  try {
    if (!id) return;
    const list = getDeletedAttendanceIds();
    const str = String(id);
    if (!list.includes(str)) {
      list.push(str);
      localStorage.setItem(DELETED_ATTENDANCES_KEY, JSON.stringify(list));
    }
  } catch {}
}

const DELETED_USERS_KEY = 'hodoorak_deleted_users_registry';

export function getDeletedUserIds(): string[] {
  try {
    const raw = localStorage.getItem(DELETED_USERS_KEY);
    const parsed: string[] = raw ? JSON.parse(raw) : [];
    return Array.from(new Set(parsed.map((x) => String(x).trim()).filter(Boolean)));
  } catch {
    return [];
  }
}

export function recordDeletedUserId(idOrNid: string): void {
  try {
    if (!idOrNid) return;
    const clean = String(idOrNid).trim();
    if (!clean) return;
    const list = getDeletedUserIds();
    if (!list.includes(clean)) {
      list.push(clean);
      localStorage.setItem(DELETED_USERS_KEY, JSON.stringify(list));
    }
  } catch {}
}

export function unrecordDeletedUserId(idOrNid: string): void {
  try {
    if (!idOrNid) return;
    const clean = String(idOrNid).trim();
    const list = getDeletedUserIds().filter((x) => x !== clean);
    localStorage.setItem(DELETED_USERS_KEY, JSON.stringify(list));
    apiPost('/api/users/unrecord-deleted', { id: clean });
  } catch {}
}

export function getDeletedSchools(): string[] {
  try {
    const raw = localStorage.getItem(DELETED_SCHOOLS_KEY);
    const parsed: string[] = raw ? JSON.parse(raw) : [];
    const set = new Set<string>(
      parsed.map((s) => String(s).toUpperCase()).filter(Boolean)
    );
    const result = Array.from(set);
    if (raw && parsed.length !== result.length) {
      localStorage.setItem(DELETED_SCHOOLS_KEY, JSON.stringify(result));
    }
    return result;
  } catch {
    return [];
  }
}

export function recordDeletedSchool(...idOrCodes: (string | undefined)[]): void {
  try {
    const list = getDeletedSchools();
    const toAdd = idOrCodes
      .filter(Boolean)
      .map((val) => String(val).toUpperCase().trim())
      .filter(Boolean);

    if (toAdd.length === 0) return;

    toAdd.forEach((upper) => {
      if (!list.includes(upper)) list.push(upper);
    });
    localStorage.setItem(DELETED_SCHOOLS_KEY, JSON.stringify(list));

    // Permanently purge this deleted school from ALL historical and legacy localStorage keys
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('hodoorak_schools')) {
        try {
          const content = localStorage.getItem(k);
          if (content) {
            const parsed = JSON.parse(content);
            if (Array.isArray(parsed)) {
              const filtered = parsed.filter((s: School) => {
                const sCode = String(s.code || '').toUpperCase();
                const sId = String(s.id || '').toUpperCase();
                return !toAdd.some((del) => del === sCode || del === sId);
              });
              localStorage.setItem(k, JSON.stringify(filtered));
            }
          }
        } catch {
          // ignore
        }
      }
    }
  } catch (err) {
    console.warn('Error recording deleted school:', err);
  }
}

// Auto-recover items from any historical/legacy localStorage key version
function recoverLegacyItems<T>(
  prefix: string, 
  keyExtractor: (item: T) => string,
  shouldSkipItem?: (item: T) => boolean
): T[] {
  const map = new Map<string, T>();
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(prefix)) {
        try {
          const content = localStorage.getItem(k);
          if (content) {
            const parsed = JSON.parse(content);
            if (Array.isArray(parsed)) {
              parsed.forEach((item) => {
                if (item) {
                  if (shouldSkipItem && shouldSkipItem(item)) return;
                  const id = keyExtractor(item);
                  if (id) {
                    if (map.has(id)) {
                      map.set(id, { ...map.get(id), ...item });
                    } else {
                      map.set(id, item);
                    }
                  }
                }
              });
            }
          }
        } catch {
          // ignore parsing error
        }
      }
    }
  } catch (err) {
    console.warn('Error reading legacy storage:', err);
  }
  return Array.from(map.values());
}

export function mergeSchools(existing: School[], incoming: School[]): School[] {
  const deleted = getDeletedSchools();
  const isDeleted = (codeOrId?: string) => {
    if (!codeOrId) return false;
    return deleted.includes(String(codeOrId).toUpperCase());
  };

  const map = new Map<string, School>();
  existing.forEach((s) => {
    if (s && (s.code || s.id)) {
      if (!isDeleted(s.code) && !isDeleted(s.id)) {
        map.set(String(s.code || s.id).toUpperCase(), s);
      }
    }
  });
  incoming.forEach((s) => {
    if (s && (s.code || s.id)) {
      if (!isDeleted(s.code) && !isDeleted(s.id)) {
        const key = String(s.code || s.id).toUpperCase();
        if (map.has(key)) {
          const prev = map.get(key)!;
          map.set(key, {
            ...prev,
            ...s,
            customClasses: s.customClasses !== undefined ? s.customClasses : prev.customClasses,
          });
        } else {
          map.set(key, s);
        }
      }
    }
  });
  return Array.from(map.values());
}

export function mergeUsers(existing: User[], incoming: User[]): User[] {
  const map = new Map<string, User>();

  const processUser = (u: User) => {
    if (!u) return;
    const cleanNid = u.nationalId ? u.nationalId.trim() : '';
    const roleKey = (u.staffTitle === 'teacher' || u.role === 'teacher') ? 'teacher' : (u.role || 'user');
    // Distinct key by ID or (nationalId + role): Keeps teacher account and parent account separate!
    const key = u.id || (cleanNid ? `nid_${cleanNid}_${roleKey}` : `${cleanNid}_${u.schoolCode || ''}`);

    if (map.has(key)) {
      const prev = map.get(key)!;
      // Merge managedSchoolCodes as a unified Set
      const unifiedSchools = Array.from(new Set([
        ...(prev.managedSchoolCodes || []),
        prev.schoolCode,
        ...(u.managedSchoolCodes || []),
        u.schoolCode,
      ])).filter(Boolean);

      const name = u.name || prev.name;
      const mobile = u.mobile || prev.mobile;
      const password = u.password || prev.password;
      const role = u.role || prev.role;
      const staffTitle = u.staffTitle || prev.staffTitle;
      const assignedClasses = (u.assignedClasses && u.assignedClasses.length > 0)
        ? u.assignedClasses
        : prev.assignedClasses;

      map.set(key, {
        ...prev,
        ...u,
        id: prev.id || u.id,
        nationalId: cleanNid || prev.nationalId,
        name,
        mobile,
        password,
        role,
        staffTitle,
        schoolCode: u.schoolCode || prev.schoolCode,
        managedSchoolCodes: unifiedSchools,
        assignedClasses,
      });
    } else {
      const initialSchools = Array.from(new Set([
        ...(u.managedSchoolCodes || []),
        u.schoolCode,
      ])).filter(Boolean);
      map.set(key, {
        ...u,
        managedSchoolCodes: initialSchools.length > 0 ? initialSchools : u.managedSchoolCodes,
      });
    }
  };

  existing.forEach(processUser);
  incoming.forEach(processUser);
  return Array.from(map.values());
}

/**
 * Universally returns all schools a user has access to, cross-referencing:
 * 1. user.schoolCode
 * 2. user.managedSchoolCodes
 * 3. All matching records for this person across the system for the SAME role
 */
export function getUserAssignedSchools(
  user: User | null,
  schools: School[],
  allUsers?: User[]
): School[] {
  if (!user || !schools || schools.length === 0) return [];
  if (user.role === 'superadmin') return schools;

  const schoolSet = new Set<string>();

  // 1. Direct schoolCode on user
  if (user.schoolCode) {
    schoolSet.add(user.schoolCode.trim().toUpperCase());
  }

  // 2. managedSchoolCodes on user
  if (Array.isArray(user.managedSchoolCodes)) {
    user.managedSchoolCodes.forEach((c) => {
      if (c) schoolSet.add(c.trim().toUpperCase());
    });
  }

  // 3. Cross-reference ONLY with records having the SAME role (so a teacher doesn't inherit child's school)
  const usersList = allUsers || getUsers();
  const cleanNid = user.nationalId ? user.nationalId.trim() : '';
  const currentRole = user.role;

  if (cleanNid) {
    usersList.forEach((u) => {
      const match = u.nationalId && u.nationalId.trim() === cleanNid && u.role === currentRole;
      if (match) {
        if (u.schoolCode) schoolSet.add(u.schoolCode.trim().toUpperCase());
        if (Array.isArray(u.managedSchoolCodes)) {
          u.managedSchoolCodes.forEach((c) => {
            if (c) schoolSet.add(c.trim().toUpperCase());
          });
        }
      }
    });
  }

  return schools.filter((s) => {
    const sCode = s.code?.trim().toUpperCase();
    const sId = s.id?.trim().toUpperCase();
    return schoolSet.has(sCode) || schoolSet.has(sId);
  });
}

/**
 * Returns alternative profiles for this person (e.g. A Teacher who also has a Parent profile for their child)
 */
export function getUserAlternativeProfiles(user: User | null, allUsers?: User[]): User[] {
  if (!user || (!user.nationalId && !user.id)) return [];
  const cleanNid = user.nationalId ? user.nationalId.trim() : '';
  const cleanMobile = user.mobile ? user.mobile.trim() : '';
  const usersList = allUsers || getUsers();

  const realAlternatives = usersList.filter((u) => {
    if (u.id === user.id) return false;
    const sameNid = Boolean(cleanNid && u.nationalId && u.nationalId.trim() === cleanNid);
    const sameMobile = Boolean(cleanMobile && u.mobile && u.mobile.trim() === cleanMobile);
    return (sameNid || sameMobile) && (u.role !== user.role || u.schoolCode !== user.schoolCode);
  });

  if (realAlternatives.length > 0) {
    return realAlternatives;
  }

  // Virtual dual-role synthesis:
  // If user is currently a teacher/employee and has children, allow switching to parent view
  if (user.role === 'teacher' || isStaffOrEmployeeRole(user.role, user.staffTitle)) {
    const hasChildren = (user.childrenNationalIds && user.childrenNationalIds.length > 0) ||
      usersList.some((u) => u.role === 'student' && ((cleanMobile && u.parentMobile === cleanMobile) || (cleanNid && user.childrenNationalIds?.includes(u.nationalId))));
    if (hasChildren) {
      return [{
        ...user,
        id: `parent-view-${user.id}`,
        role: 'parent',
      }];
    }
  }

  // If user is currently a parent, but has teacher role in database or assignedClasses:
  if (user.role === 'parent') {
    const teacherMatch = usersList.find((u) => 
      ((cleanNid && u.nationalId && u.nationalId.trim() === cleanNid) || (cleanMobile && u.mobile && u.mobile.trim() === cleanMobile)) && 
      (u.role === 'teacher' || u.staffTitle === 'teacher')
    );
    if (teacherMatch) {
      return [teacherMatch];
    } else if (user.assignedClasses && user.assignedClasses.length > 0) {
      return [{
        ...user,
        id: `teacher-view-${user.id}`,
        role: 'teacher',
        staffTitle: 'teacher',
        schoolCode: user.teachingSchoolCode || user.schoolCode,
      }];
    }
  }

  return [];
}

export function mergeAttendances(existing: Attendance[], incoming: Attendance[]): Attendance[] {
  const deletedSet = new Set(getDeletedAttendanceIds());
  const map = new Map<string, Attendance>();
  
  const getKey = (a: Attendance) => (a.studentId && a.date ? `${a.studentId}_${a.date}` : a.id);

  existing.forEach((a) => {
    if (a) {
      const key = getKey(a);
      if (!deletedSet.has(String(a.id)) && !deletedSet.has(`${a.studentId}_${a.date}`)) {
        map.set(key, a);
      }
    }
  });

  incoming.forEach((a) => {
    if (a) {
      const key = getKey(a);
      if (!deletedSet.has(String(a.id)) && !deletedSet.has(`${a.studentId}_${a.date}`)) {
        if (map.has(key)) {
          const prev = map.get(key)!;
          // Protect accepted/conditional excuse status from being reverted by stale attendance records
          const isPrevExcused = prev.excuseStatus === 'accepted' || prev.excuseStatus === 'conditional_accepted';
          const isIncomingExcused = a.excuseStatus === 'accepted' || a.excuseStatus === 'conditional_accepted';
          const preserveAccepted = isPrevExcused && !isIncomingExcused && a.finalStatus !== 'present';
          map.set(key, {
            ...prev,
            ...a,
            // Keep persistent id if previously established
            id: prev.id || a.id,
            ...(preserveAccepted ? { 
              excuseStatus: prev.excuseStatus, 
              excuseDecisionType: prev.excuseDecisionType,
              adminDecisionNotes: prev.adminDecisionNotes || a.adminDecisionNotes,
              finalStatus: prev.finalStatus || 'excused', 
              isTruant: false 
            } : {}),
          });
        } else {
          map.set(key, a);
        }
      }
    }
  });
  return Array.from(map.values());
}

export function mergeCorrections(existing: CorrectionRequest[], incoming: CorrectionRequest[]): CorrectionRequest[] {
  const map = new Map<string, CorrectionRequest>();
  existing.forEach((item) => {
    if (item && item.id) map.set(item.id, item);
  });

  const weight = (s?: string) => (s === 'approved' || s === 'conditional_approved' || s === 'rejected' ? 2 : s === 'pending' ? 1 : 0);

  incoming.forEach((item) => {
    if (item && item.id) {
      if (map.has(item.id)) {
        const prev = map.get(item.id)!;
        const prevWeight = weight(prev.status);
        const itemWeight = weight(item.status);

        // Never let incoming pending overwrite an already approved or rejected excuse
        if (itemWeight < prevWeight) {
          map.set(item.id, {
            ...item,
            status: prev.status,
            approvalType: prev.approvalType || item.approvalType,
            adminDecisionNotes: prev.adminDecisionNotes || item.adminDecisionNotes,
            decidedByName: prev.decidedByName || item.decidedByName,
            decidedByRole: prev.decidedByRole || item.decidedByRole,
            decidedAt: prev.decidedAt || item.decidedAt,
            updatedAt: prev.updatedAt || item.updatedAt,
          });
        } else {
          map.set(item.id, { ...prev, ...item });
        }
      } else {
        map.set(item.id, item);
      }
    }
  });
  return Array.from(map.values());
}

function mergeById<T extends { id?: string }>(existing: T[], incoming: T[]): T[] {
  const map = new Map<string, T>();
  existing.forEach((item) => {
    if (item && item.id) map.set(item.id, item);
  });
  incoming.forEach((item) => {
    if (item && item.id) {
      if (map.has(item.id)) {
        map.set(item.id, { ...map.get(item.id)!, ...item });
      } else {
        map.set(item.id, item);
      }
    }
  });
  return Array.from(map.values());
}

// 0. Full Sync with Server (Non-destructive two-way synchronization)
export async function syncDataFromServer(): Promise<{
  schools: School[];
  users: User[];
  attendances: Attendance[];
  permissions: StudentPermission[];
  behavior_logs: StudentBehaviorLog[];
  absence_actions: AdministrativeAbsenceAction[];
  corrections: CorrectionRequest[];
  payments: SubscriptionPaymentRequest[];
  notifications: SystemNotification[];
} | null> {
  try {
    const localSchools = getSchools();
    const localUsers = getUsers();
    const localAttendances = getAttendances();
    const localPermissions = getPermissions();
    const localBehaviorLogs = getBehaviorLogs();
    const localAbsenceActions = getAbsenceActions();
    const localCorrections = getCorrectionRequests();
    const localPayments = getPaymentRequests();
    const localNotifications = getSystemNotifications();

    // 1. If we have local data, push to server first so the server never drops them
    if (localSchools.length > 0 || localUsers.length > 1) {
      await apiPost('/api/sync', {
        schools: localSchools,
        users: localUsers,
        attendances: localAttendances,
        permissions: localPermissions,
        behavior_logs: localBehaviorLogs,
        absence_actions: localAbsenceActions,
        corrections: localCorrections,
        payments: localPayments,
        notifications: localNotifications,
        deleted_schools: getDeletedSchools(),
        deleted_attendance_ids: getDeletedAttendanceIds(),
        deleted_notification_ids: getDeletedNotificationIds(),
        deleted_user_ids: getDeletedUserIds(),
      });
    }

    // 2. Fetch server state
    const res = await fetch('/api/sync');
    if (res.ok) {
      const result = await res.json();
      if (result.success && result.data) {
        const d = result.data;

        // Sync deleted schools from server
        if (Array.isArray(d.deleted_schools) && d.deleted_schools.length > 0) {
          d.deleted_schools.forEach((del: string) => {
            recordDeletedSchool(del);
          });
        }

        // Sync deleted user IDs from server
        if (Array.isArray(d.deleted_user_ids) && d.deleted_user_ids.length > 0) {
          d.deleted_user_ids.forEach((uid: string) => {
            recordDeletedUserId(uid);
          });
        }

        // Sync deleted attendance IDs from server
        if (Array.isArray(d.deleted_attendance_ids) && d.deleted_attendance_ids.length > 0) {
          d.deleted_attendance_ids.forEach((del: string) => {
            recordDeletedAttendanceId(del);
          });
        }

        // Sync deleted notification IDs from server
        if (Array.isArray(d.deleted_notification_ids) && d.deleted_notification_ids.length > 0) {
          d.deleted_notification_ids.forEach((del: string) => {
            recordDeletedNotificationId(del);
          });
        }

        // Non-destructive merging respecting deleted items
        if (Array.isArray(d.schools)) {
          const mergedSchools = mergeSchools(localSchools, d.schools);
          saveSchools(mergedSchools, false);
        } else if (localSchools.length > 0) {
          apiPost('/api/sync', { schools: localSchools, deleted_schools: getDeletedSchools() });
        }

        if (Array.isArray(d.users) && d.users.length > 0) {
          const mergedUsers = mergeUsers(localUsers, d.users);
          saveUsers(mergedUsers, false);
        } else if (localUsers.length > 1) {
          apiPost('/api/sync', { users: localUsers });
        }

        if (Array.isArray(d.attendances) && d.attendances.length > 0) {
          const mergedAtt = mergeAttendances(localAttendances, d.attendances);
          saveAttendances(mergedAtt, false);
        }

        if (Array.isArray(d.permissions) && d.permissions.length > 0) {
          const merged = mergeById(localPermissions, d.permissions);
          savePermissions(merged, false);
        }

        if (Array.isArray(d.behavior_logs) && d.behavior_logs.length > 0) {
          const merged = mergeById(localBehaviorLogs, d.behavior_logs);
          saveBehaviorLogs(merged, false);
        }

        if (Array.isArray(d.absence_actions) && d.absence_actions.length > 0) {
          const merged = mergeById(localAbsenceActions, d.absence_actions);
          saveAbsenceActions(merged, false);
        }

        if (Array.isArray(d.corrections) && d.corrections.length > 0) {
          const merged = mergeCorrections(localCorrections, d.corrections);
          saveCorrectionRequests(merged, false);
        }

        if (Array.isArray(d.payments) && d.payments.length > 0) {
          const merged = mergeById(localPayments, d.payments);
          savePaymentRequests(merged, false);
        }

        if (Array.isArray(d.notifications) && d.notifications.length > 0) {
          const merged = mergeById(localNotifications, d.notifications);
          saveSystemNotifications(merged, false);
        }

        return {
          schools: getSchools(),
          users: getUsers(),
          attendances: getAttendances(),
          permissions: getPermissions(),
          behavior_logs: getBehaviorLogs(),
          absence_actions: getAbsenceActions(),
          corrections: getCorrectionRequests(),
          payments: getPaymentRequests(),
          notifications: getSystemNotifications(),
        };
      }
    }
  } catch (err) {
    console.warn('Could not sync with server:', err);
  }
  return null;
}

// 1. Schools
export function getSchools(): School[] {
  try {
    const deletedList = getDeletedSchools();
    const isSchoolDeleted = (s: School) => {
      const sCode = String(s?.code || '').toUpperCase();
      const sId = String(s?.id || '').toUpperCase();
      return deletedList.includes(sCode) || deletedList.includes(sId);
    };

    const raw = localStorage.getItem(SCHOOLS_KEY);
    let current: School[] = [];
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) current = parsed.filter((s) => !isSchoolDeleted(s));
    }

    // Auto-recover from any historical localStorage versions (ignoring deleted schools)
    const recovered = recoverLegacyItems<School>(
      'hodoorak_schools', 
      (s) => (s.code || s.id || '').toUpperCase(),
      isSchoolDeleted
    );
    if (recovered.length > current.length) {
      current = mergeSchools(current, recovered);
      localStorage.setItem(SCHOOLS_KEY, JSON.stringify(current));
    }

    if (current.length === 0 && INITIAL_SCHOOLS.length > 0) {
      const nonDeletedInitial = INITIAL_SCHOOLS.filter((s) => !isSchoolDeleted(s));
      if (nonDeletedInitial.length > 0) {
        saveSchools(nonDeletedInitial, false);
        return nonDeletedInitial;
      }
      return [];
    }

    // Harmonize all schools to free permanent license
    const normalized = current.map((s) => ({
      ...s,
      subscriptionPlan: 'free_forever' as const,
      subscriptionEndDate: '2099-12-31',
    }));
    return normalized;
  } catch {
    const deletedList = getDeletedSchools();
    return INITIAL_SCHOOLS.filter((s) => {
      const sCode = String(s?.code || '').toUpperCase();
      const sId = String(s?.id || '').toUpperCase();
      return !deletedList.includes(sCode) && !deletedList.includes(sId);
    });
  }
}

export function saveSchools(schools: School[], syncServer: boolean = true): void {
  const deleted = getDeletedSchools();
  const cleanSchools = schools.filter((s) => {
    const sCode = String(s.code || '').toUpperCase();
    const sId = String(s.id || '').toUpperCase();
    return !deleted.includes(sCode) && !deleted.includes(sId);
  });

  localStorage.setItem(SCHOOLS_KEY, JSON.stringify(cleanSchools));
  if (syncServer) {
    apiPost('/api/sync', { schools: cleanSchools, deleted_schools: deleted });
  }
}

export function addSchool(school: School): void {
  const list = getSchools();
  const existing = list.findIndex((s) => s.code === school.code);
  if (existing >= 0) {
    list[existing] = school;
  } else {
    list.push(school);
  }
  saveSchools(list, true);
  apiPost('/api/schools', school);
}

export function updateSchool(school: School): void {
  const list = getSchools();
  const idx = list.findIndex((s) => s.id === school.id || s.code === school.code);
  if (idx >= 0) {
    list[idx] = { ...list[idx], ...school };
  } else {
    list.push(school);
  }
  saveSchools(list, true);
  apiPost('/api/schools', school);
}

/**
 * Retrieves the current effective classes for a school, safely falling back to standard stage classes
 */
export function getSchoolCurrentClasses(school: School): SchoolClassSection[] {
  if (Array.isArray(school.customClasses) && school.customClasses.length > 0) {
    return school.customClasses;
  }
  return getDefaultClassesForSchoolType(school.type, school.isQuranSchool, school.name);
}

/**
 * Safely updates school's customClasses list
 */
export function updateSchoolCustomClasses(schoolCode: string, customClasses: SchoolClassSection[]): boolean {
  const list = getSchools();
  const idx = list.findIndex((s) => s.code?.toUpperCase() === schoolCode?.toUpperCase());
  if (idx < 0) return false;
  list[idx] = { ...list[idx], customClasses };
  saveSchools(list, true);
  apiPost('/api/schools', list[idx]);
  return true;
}

/**
 * Safely renames a class across the entire school without breaking anything:
 * Cascades to Students, Teachers' assigned classes, Attendance records, Behavior logs, Permissions, and Correction requests.
 */
export function renameSchoolClassAndCascade(
  schoolCode: string,
  oldClassName: string,
  newClassName: string
): { updatedStudentsCount: number; updatedTeachersCount: number; updatedAttendanceCount: number } {
  const cleanOld = oldClassName.trim();
  const cleanNew = newClassName.trim();
  if (!cleanOld || !cleanNew || cleanOld === cleanNew) {
    return { updatedStudentsCount: 0, updatedTeachersCount: 0, updatedAttendanceCount: 0 };
  }

  // 1. Update School customClasses
  const schools = getSchools();
  const schoolIdx = schools.findIndex(
    (s) => s.code?.toUpperCase() === schoolCode?.toUpperCase()
  );
  if (schoolIdx >= 0) {
    const school = schools[schoolIdx];
    const baseClasses = getSchoolCurrentClasses(school);
    const customClasses = baseClasses.map((c) => {
      if (c.className.trim() === cleanOld) {
        return { ...c, className: cleanNew };
      }
      return c;
    });
    schools[schoolIdx] = { ...school, customClasses };
    saveSchools(schools, true);
    apiPost('/api/schools', schools[schoolIdx]);
  }

  // 2. Cascade update to Users (Students + Teachers)
  const users = getUsers();
  let updatedStudentsCount = 0;
  let updatedTeachersCount = 0;
  let usersChanged = false;

  users.forEach((u) => {
    if (u.schoolCode?.toUpperCase() === schoolCode?.toUpperCase()) {
      if (u.className && u.className.trim() === cleanOld) {
        u.className = cleanNew;
        updatedStudentsCount++;
        usersChanged = true;
      }
      if (Array.isArray(u.assignedClasses) && u.assignedClasses.length > 0) {
        let teacherAssignedChanged = false;
        const newAssigned = u.assignedClasses.map((ac) => {
          if (ac.className.trim() === cleanOld) {
            teacherAssignedChanged = true;
            return { ...ac, className: cleanNew };
          }
          return ac;
        });
        if (teacherAssignedChanged) {
          u.assignedClasses = newAssigned;
          updatedTeachersCount++;
          usersChanged = true;
        }
      }
    }
  });
  if (usersChanged) {
    saveUsers(users, true);
  }

  // 3. Cascade update to Attendances
  const attendances = getAttendances();
  let updatedAttendanceCount = 0;
  let attsChanged = false;
  attendances.forEach((a) => {
    if (a.schoolCode?.toUpperCase() === schoolCode?.toUpperCase()) {
      if (a.className && a.className.trim() === cleanOld) {
        a.className = cleanNew;
        updatedAttendanceCount++;
        attsChanged = true;
      }
    }
  });
  if (attsChanged) {
    saveAttendances(attendances, true);
  }

  // 4. Cascade update to Behavior logs
  try {
    const behaviorLogs = getBehaviorLogs();
    let behChanged = false;
    behaviorLogs.forEach((b) => {
      if (b.schoolCode?.toUpperCase() === schoolCode?.toUpperCase()) {
        if (b.className && b.className.trim() === cleanOld) {
          b.className = cleanNew;
          behChanged = true;
        }
      }
    });
    if (behChanged) saveBehaviorLogs(behaviorLogs, true);
  } catch {}

  // 5. Cascade update to Permissions
  try {
    const permissions = getPermissions();
    let permChanged = false;
    permissions.forEach((p) => {
      if (p.schoolCode?.toUpperCase() === schoolCode?.toUpperCase()) {
        if (p.className && p.className.trim() === cleanOld) {
          p.className = cleanNew;
          permChanged = true;
        }
      }
    });
    if (permChanged) savePermissions(permissions, true);
  } catch {}

  // 6. Cascade update to Administrative Absence Actions
  try {
    const actions = getAbsenceActions();
    let actsChanged = false;
    actions.forEach((act) => {
      if (act.schoolCode?.toUpperCase() === schoolCode?.toUpperCase()) {
        if (act.className && act.className.trim() === cleanOld) {
          act.className = cleanNew;
          actsChanged = true;
        }
      }
    });
    if (actsChanged) saveAbsenceActions(actions, true);
  } catch {}

  // 7. Cascade update to Correction Requests
  try {
    const corrections = getCorrectionRequests();
    let corrChanged = false;
    corrections.forEach((c) => {
      if (c.schoolCode?.toUpperCase() === schoolCode?.toUpperCase()) {
        if (c.className && c.className.trim() === cleanOld) {
          c.className = cleanNew;
          corrChanged = true;
        }
      }
    });
    if (corrChanged) saveCorrectionRequests(corrections, true);
  } catch {}

  return { updatedStudentsCount, updatedTeachersCount, updatedAttendanceCount };
}

/**
 * Safely renames a section within a class across the school without breaking anything:
 * Cascades to Students, Teachers' assigned sections, Attendance records, Behavior logs, and Permissions.
 */
export function renameSchoolSectionAndCascade(
  schoolCode: string,
  className: string,
  oldSectionName: string,
  newSectionName: string
): { updatedStudentsCount: number; updatedTeachersCount: number; updatedAttendanceCount: number } {
  const cleanClass = className.trim();
  const cleanOldSec = oldSectionName.trim();
  const cleanNewSec = newSectionName.trim();
  if (!cleanClass || !cleanOldSec || !cleanNewSec || cleanOldSec === cleanNewSec) {
    return { updatedStudentsCount: 0, updatedTeachersCount: 0, updatedAttendanceCount: 0 };
  }

  // 1. Update School customClasses
  const schools = getSchools();
  const schoolIdx = schools.findIndex(
    (s) => s.code?.toUpperCase() === schoolCode?.toUpperCase()
  );
  if (schoolIdx >= 0) {
    const school = schools[schoolIdx];
    const baseClasses = getSchoolCurrentClasses(school);
    const customClasses = baseClasses.map((c) => {
      if (c.className.trim() === cleanClass) {
        const nextSections = c.sections.map((sec) => (sec.trim() === cleanOldSec ? cleanNewSec : sec));
        return { ...c, sections: Array.from(new Set(nextSections)) };
      }
      return c;
    });
    schools[schoolIdx] = { ...school, customClasses };
    saveSchools(schools, true);
    apiPost('/api/schools', schools[schoolIdx]);
  }

  // 2. Cascade update to Users
  const users = getUsers();
  let updatedStudentsCount = 0;
  let updatedTeachersCount = 0;
  let usersChanged = false;

  users.forEach((u) => {
    if (u.schoolCode?.toUpperCase() === schoolCode?.toUpperCase()) {
      if (u.className?.trim() === cleanClass && u.sectionName?.trim() === cleanOldSec) {
        u.sectionName = cleanNewSec;
        updatedStudentsCount++;
        usersChanged = true;
      }
      if (Array.isArray(u.assignedClasses)) {
        let assignedChanged = false;
        const newAssigned = u.assignedClasses.map((ac) => {
          if (ac.className.trim() === cleanClass && ac.sectionName.trim() === cleanOldSec) {
            assignedChanged = true;
            return { ...ac, sectionName: cleanNewSec };
          }
          return ac;
        });
        if (assignedChanged) {
          u.assignedClasses = newAssigned;
          updatedTeachersCount++;
          usersChanged = true;
        }
      }
    }
  });
  if (usersChanged) {
    saveUsers(users, true);
  }

  // 3. Cascade update to Attendances
  const attendances = getAttendances();
  let updatedAttendanceCount = 0;
  let attsChanged = false;
  attendances.forEach((a) => {
    if (a.schoolCode?.toUpperCase() === schoolCode?.toUpperCase()) {
      if (a.className?.trim() === cleanClass && a.sectionName?.trim() === cleanOldSec) {
        a.sectionName = cleanNewSec;
        updatedAttendanceCount++;
        attsChanged = true;
      }
    }
  });
  if (attsChanged) {
    saveAttendances(attendances, true);
  }

  // 4. Cascade update to Behavior logs & permissions
  try {
    const behaviorLogs = getBehaviorLogs();
    let behChanged = false;
    behaviorLogs.forEach((b) => {
      if (b.schoolCode?.toUpperCase() === schoolCode?.toUpperCase()) {
        if (b.className?.trim() === cleanClass && b.sectionName?.trim() === cleanOldSec) {
          b.sectionName = cleanNewSec;
          behChanged = true;
        }
      }
    });
    if (behChanged) saveBehaviorLogs(behaviorLogs, true);
  } catch {}

  try {
    const permissions = getPermissions();
    let permChanged = false;
    permissions.forEach((p) => {
      if (p.schoolCode?.toUpperCase() === schoolCode?.toUpperCase()) {
        if (p.className?.trim() === cleanClass && p.sectionName?.trim() === cleanOldSec) {
          p.sectionName = cleanNewSec;
          permChanged = true;
        }
      }
    });
    if (permChanged) savePermissions(permissions, true);
  } catch {}

  return { updatedStudentsCount, updatedTeachersCount, updatedAttendanceCount };
}

/**
 * Safely deletes a redundant class without breaking data:
 * If migrateToClassName is provided, enrolled students and their records migrate cleanly.
 * If no migration target is provided, students are safely preserved with unassigned class.
 */
export function deleteSchoolClassSafely(
  schoolCode: string,
  className: string,
  migrateToClassName?: string,
  migrateToSection?: string
): { affectedStudentsCount: number; deleted: boolean } {
  const cleanClass = className.trim();
  const cleanMigrateClass = migrateToClassName?.trim();
  const cleanMigrateSec = migrateToSection?.trim() || '1';

  // 1. Update School customClasses
  const schools = getSchools();
  const schoolIdx = schools.findIndex(
    (s) => s.code?.toUpperCase() === schoolCode?.toUpperCase()
  );
  if (schoolIdx < 0) return { affectedStudentsCount: 0, deleted: false };

  const school = schools[schoolIdx];
  const baseClasses = getSchoolCurrentClasses(school);
  const customClasses = baseClasses.filter(
    (c) => c.className.trim() !== cleanClass
  );
  schools[schoolIdx] = { ...school, customClasses };
  saveSchools(schools, true);
  apiPost('/api/schools', schools[schoolIdx]);

  // 2. Handle Students & Teachers
  const users = getUsers();
  let affectedStudentsCount = 0;
  let usersChanged = false;

  users.forEach((u) => {
    if (u.schoolCode?.toUpperCase() === schoolCode?.toUpperCase()) {
      if (u.className?.trim() === cleanClass) {
        affectedStudentsCount++;
        usersChanged = true;
        if (cleanMigrateClass) {
          u.className = cleanMigrateClass;
          u.sectionName = cleanMigrateSec;
        } else {
          u.className = undefined;
          u.sectionName = undefined;
        }
      }
      if (Array.isArray(u.assignedClasses)) {
        const filtered = u.assignedClasses.filter((ac) => ac.className.trim() !== cleanClass);
        if (filtered.length !== u.assignedClasses.length) {
          u.assignedClasses = filtered;
          usersChanged = true;
        }
      }
    }
  });

  if (usersChanged) {
    saveUsers(users, true);
  }

  // 3. Attendances - if migrated, update attendance records to point to new class
  if (cleanMigrateClass) {
    const attendances = getAttendances();
    let attsChanged = false;
    attendances.forEach((a) => {
      if (a.schoolCode?.toUpperCase() === schoolCode?.toUpperCase() && a.className?.trim() === cleanClass) {
        a.className = cleanMigrateClass;
        a.sectionName = cleanMigrateSec;
        attsChanged = true;
      }
    });
    if (attsChanged) {
      saveAttendances(attendances, true);
    }
  }

  return { affectedStudentsCount, deleted: true };
}

/**
 * Safely deletes a section from a class without breaking data:
 * If migrateToSection is provided, students in that section are migrated to the target section.
 */
export function deleteSchoolSectionSafely(
  schoolCode: string,
  className: string,
  sectionName: string,
  migrateToSection?: string
): { affectedStudentsCount: number; deleted: boolean } {
  const cleanClass = className.trim();
  const cleanSec = sectionName.trim();
  const cleanMigrateSec = migrateToSection?.trim();

  // 1. Update School customClasses
  const schools = getSchools();
  const schoolIdx = schools.findIndex(
    (s) => s.code?.toUpperCase() === schoolCode?.toUpperCase()
  );
  if (schoolIdx < 0) return { affectedStudentsCount: 0, deleted: false };

  const school = schools[schoolIdx];
  const baseClasses = getSchoolCurrentClasses(school);
  const customClasses = baseClasses.map((c) => {
    if (c.className.trim() === cleanClass) {
      return {
        ...c,
        sections: c.sections.filter((s) => s.trim() !== cleanSec),
      };
    }
    return c;
  });

  schools[schoolIdx] = { ...school, customClasses };
  saveSchools(schools, true);
  apiPost('/api/schools', schools[schoolIdx]);

  // 2. Handle Students & Teachers
  const users = getUsers();
  let affectedStudentsCount = 0;
  let usersChanged = false;

  users.forEach((u) => {
    if (u.schoolCode?.toUpperCase() === schoolCode?.toUpperCase()) {
      if (u.className?.trim() === cleanClass && u.sectionName?.trim() === cleanSec) {
        affectedStudentsCount++;
        usersChanged = true;
        if (cleanMigrateSec) {
          u.sectionName = cleanMigrateSec;
        } else {
          u.sectionName = undefined;
        }
      }
      if (Array.isArray(u.assignedClasses)) {
        const filtered = u.assignedClasses.filter(
          (ac) => !(ac.className.trim() === cleanClass && ac.sectionName.trim() === cleanSec)
        );
        if (filtered.length !== u.assignedClasses.length) {
          u.assignedClasses = filtered;
          usersChanged = true;
        }
      }
    }
  });

  if (usersChanged) {
    saveUsers(users, true);
  }

  // 3. Update Attendances if migrated
  if (cleanMigrateSec) {
    const attendances = getAttendances();
    let attsChanged = false;
    attendances.forEach((a) => {
      if (a.schoolCode?.toUpperCase() === schoolCode?.toUpperCase() && a.className?.trim() === cleanClass && a.sectionName?.trim() === cleanSec) {
        a.sectionName = cleanMigrateSec;
        attsChanged = true;
      }
    });
    if (attsChanged) {
      saveAttendances(attendances, true);
    }
  }

  return { affectedStudentsCount, deleted: true };
}

/**
 * Transfers one or multiple students from their current class/section to a new class and section.
 * Also cascades to their attendance records so historical reports stay consistent.
 */
export function transferStudentsToClassSection(
  schoolCode: string,
  studentIds: string[],
  targetClassName: string,
  targetSectionName: string
): { transferredCount: number } {
  const cleanClass = targetClassName.trim();
  const cleanSec = targetSectionName.trim();
  const idSet = new Set(studentIds);

  if (!cleanClass || !cleanSec || idSet.size === 0) {
    return { transferredCount: 0 };
  }

  const users = getUsers();
  let transferredCount = 0;
  let usersChanged = false;
  const affectedStudentNids = new Set<string>();

  users.forEach((u) => {
    if (u.schoolCode?.toUpperCase() === schoolCode?.toUpperCase() && idSet.has(u.id)) {
      u.className = cleanClass;
      u.sectionName = cleanSec;
      if (u.nationalId) affectedStudentNids.add(u.nationalId.trim());
      transferredCount++;
      usersChanged = true;
    }
  });

  if (usersChanged) {
    saveUsers(users, true);
  }

  // Also cascade update attendance records for these students
  if (transferredCount > 0) {
    const attendances = getAttendances();
    let attsChanged = false;
    attendances.forEach((a) => {
      if (a.schoolCode?.toUpperCase() === schoolCode?.toUpperCase()) {
        const isTargetStudent =
          (a.studentId && idSet.has(a.studentId)) ||
          (a.nationalId && affectedStudentNids.has(a.nationalId.trim()));
        if (isTargetStudent) {
          a.className = cleanClass;
          a.sectionName = cleanSec;
          attsChanged = true;
        }
      }
    });
    if (attsChanged) {
      saveAttendances(attendances, true);
    }
  }

  return { transferredCount };
}

/**
 * Updates a student's profile (name, national ID, parent phone, class, section)
 * and cascades changes to attendance records.
 */
export function updateStudentProfileAndCascade(
  schoolCode: string,
  studentId: string,
  updates: {
    name: string;
    nationalId: string;
    parentPhone?: string;
    className: string;
    sectionName: string;
  }
): { success: boolean; error?: string } {
  const cleanName = updates.name.trim();
  const cleanNid = updates.nationalId.trim();
  const cleanClass = updates.className.trim();
  const cleanSec = updates.sectionName.trim();

  if (!cleanName) return { success: false, error: 'اسم الطالب مطلوب.' };
  if (!cleanNid) return { success: false, error: 'رقم الهوية الوطنية مطلوب.' };

  const users = getUsers();
  const studentIndex = users.findIndex(
    (u) => u.id === studentId && u.schoolCode?.toUpperCase() === schoolCode?.toUpperCase()
  );

  if (studentIndex < 0) {
    return { success: false, error: 'لم يتم العثور على الطالب.' };
  }

  // Check duplicate nationalId with other students in the same school
  const duplicate = users.find(
    (u) =>
      u.id !== studentId &&
      u.schoolCode?.toUpperCase() === schoolCode?.toUpperCase() &&
      u.nationalId?.trim() === cleanNid
  );
  if (duplicate) {
    return { success: false, error: `رقم الهوية (${cleanNid}) مسجل لطالب آخر بالفعل (${duplicate.name}).` };
  }

  const oldNid = users[studentIndex].nationalId?.trim();
  const oldName = users[studentIndex].name;

  const newPhone = updates.parentPhone !== undefined ? updates.parentPhone.trim() : (users[studentIndex].parentPhone || users[studentIndex].parentMobile || '');

  users[studentIndex] = {
    ...users[studentIndex],
    name: cleanName,
    nationalId: cleanNid,
    parentPhone: newPhone,
    parentMobile: newPhone,
    className: cleanClass,
    sectionName: cleanSec,
  };

  saveUsers(users, true);

  // Cascade to attendance records
  const attendances = getAttendances();
  let attsChanged = false;
  attendances.forEach((a) => {
    if (a.schoolCode?.toUpperCase() === schoolCode?.toUpperCase()) {
      const match = a.studentId === studentId || (oldNid && a.nationalId?.trim() === oldNid);
      if (match) {
        a.studentName = cleanName;
        a.nationalId = cleanNid;
        a.className = cleanClass;
        a.sectionName = cleanSec;
        attsChanged = true;
      }
    }
  });

  if (attsChanged) {
    saveAttendances(attendances, true);
  }

  return { success: true };
}

/**
 * Adds a new class to school with custom sections
 */
export function addSchoolClass(
  schoolCode: string,
  className: string,
  sections: string[] = ['1', '2', '3']
): { success: boolean; message?: string } {
  const cleanName = className.trim();
  if (!cleanName) return { success: false, message: 'يرجى إدخال اسم الصف' };

  const schools = getSchools();
  const schoolIdx = schools.findIndex(
    (s) => s.code?.toUpperCase() === schoolCode?.toUpperCase()
  );
  if (schoolIdx < 0) return { success: false, message: 'المدرسة غير موجودة' };

  const school = schools[schoolIdx];
  const baseClasses = getSchoolCurrentClasses(school);
  const customClasses = [...baseClasses];

  if (customClasses.some((c) => c.className.trim() === cleanName)) {
    return { success: false, message: 'هذا الصف موجود مسبقاً في قائمة المدرسة' };
  }

  const cleanSections = sections.map((s) => s.trim()).filter(Boolean);
  customClasses.push({
    id: `c-custom-${Date.now()}`,
    className: cleanName,
    sections: cleanSections.length > 0 ? cleanSections : ['1', '2', '3'],
  });

  schools[schoolIdx] = { ...school, customClasses };
  saveSchools(schools, true);
  apiPost('/api/schools', schools[schoolIdx]);
  return { success: true };
}

/**
 * Adds a new section to an existing class in a school
 */
export function addSchoolSection(
  schoolCode: string,
  className: string,
  sectionName: string
): { success: boolean; message?: string } {
  const cleanClass = className.trim();
  const cleanSec = sectionName.trim();
  if (!cleanClass || !cleanSec) return { success: false, message: 'يرجى إدخال اسم الشعبة' };

  const schools = getSchools();
  const schoolIdx = schools.findIndex(
    (s) => s.code?.toUpperCase() === schoolCode?.toUpperCase()
  );
  if (schoolIdx < 0) return { success: false, message: 'المدرسة غير موجودة' };

  const school = schools[schoolIdx];
  const baseClasses = getSchoolCurrentClasses(school);
  const customClasses = baseClasses.map((c) => {
    if (c.className.trim() === cleanClass) {
      if (c.sections.some((s) => s.trim() === cleanSec)) {
        return c;
      }
      return { ...c, sections: [...c.sections, cleanSec] };
    }
    return c;
  });

  schools[schoolIdx] = { ...school, customClasses };
  saveSchools(schools, true);
  apiPost('/api/schools', schools[schoolIdx]);
  return { success: true };
}

export async function deleteSchool(schoolIdOrCode: string, extraCode?: string): Promise<void> {
  const targetKey = String(schoolIdOrCode || '').toUpperCase().trim();
  const targetExtra = extraCode ? String(extraCode).toUpperCase().trim() : '';

  // Find school in current list to get all identifiers
  const existingSchools = getSchools();
  const matched = existingSchools.find(
    (s) =>
      String(s.id || '').toUpperCase() === targetKey ||
      String(s.code || '').toUpperCase() === targetKey ||
      (targetExtra && (String(s.id || '').toUpperCase() === targetExtra || String(s.code || '').toUpperCase() === targetExtra))
  );

  const allKeysToDelete = Array.from(
    new Set([
      targetKey,
      targetExtra,
      matched?.id ? String(matched.id).toUpperCase() : '',
      matched?.code ? String(matched.code).toUpperCase() : '',
    ].filter(Boolean))
  );

  // 1. Record in deleted schools registry
  recordDeletedSchool(...allKeysToDelete);
  const deleted = getDeletedSchools();

  // 2. Remove from schools list and persist locally
  const remainingSchools = existingSchools.filter((s) => {
    const sId = String(s.id || '').toUpperCase();
    const sCode = String(s.code || '').toUpperCase();
    return !allKeysToDelete.includes(sId) && !allKeysToDelete.includes(sCode) && !deleted.includes(sId) && !deleted.includes(sCode);
  });
  saveSchools(remainingSchools, false);

  // 3. Cascade remove associated users (except superadmin)
  const allUsers = getUsers();
  const remainingUsers = allUsers.filter((u) => {
    if (u.role === 'superadmin' || u.schoolCode === 'SUPERADMIN') return true;
    const uCode = String(u.schoolCode || '').toUpperCase();
    if (allKeysToDelete.includes(uCode)) {
      if (Array.isArray(u.managedSchoolCodes) && u.managedSchoolCodes.length > 1) {
        u.managedSchoolCodes = u.managedSchoolCodes.filter((c) => !allKeysToDelete.includes(c.toUpperCase()));
        u.schoolCode = u.managedSchoolCodes[0] || '';
        return true;
      }
      return false; // Purge user associated exclusively with this deleted school
    }
    return true;
  });
  saveUsers(remainingUsers, false);

  // 4. Cascade remove attendances for this school
  const allAttendances = getAttendances();
  const remainingAttendances = allAttendances.filter(
    (a) => !allKeysToDelete.includes(String(a.schoolCode || '').toUpperCase())
  );
  saveAttendances(remainingAttendances, false);

  // 5. Cascade remove parent summons for this school
  const allSummons = getParentSummons();
  const remainingSummons = allSummons.filter(
    (s) => !allKeysToDelete.includes(String(s.schoolCode || '').toUpperCase())
  );
  saveParentSummons(remainingSummons, false);

  // 6. Delete on server backend via DELETE endpoints
  try {
    if (schoolIdOrCode) {
      await fetch(`/api/schools/${encodeURIComponent(schoolIdOrCode)}`, { method: 'DELETE' });
    }
    if (extraCode && extraCode !== schoolIdOrCode) {
      await fetch(`/api/schools/${encodeURIComponent(extraCode)}`, { method: 'DELETE' });
    }
    if (matched?.code && matched.code !== schoolIdOrCode && matched.code !== extraCode) {
      await fetch(`/api/schools/${encodeURIComponent(matched.code)}`, { method: 'DELETE' });
    }
  } catch (err) {
    console.warn('DELETE /api/schools API call failed:', err);
  }

  // 7. Push updated list with deleted markers to sync endpoint
  await apiPost('/api/sync', { 
    schools: remainingSchools,
    users: remainingUsers,
    attendances: remainingAttendances,
    parent_summons: remainingSummons,
    deleted_schools: deleted 
  });
}

export async function generateSchoolApiToken(schoolCode: string): Promise<string | null> {
  try {
    const res = await fetch(`/api/schools/${encodeURIComponent(schoolCode)}/generate-api-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    if (res.ok) {
      const result = await res.json();
      if (result.success && result.apiToken) {
        const list = getSchools();
        const idx = list.findIndex((s) => s.code === schoolCode);
        if (idx >= 0) {
          list[idx].apiToken = result.apiToken;
          saveSchools(list, false);
        }
        return result.apiToken;
      }
    }
  } catch (err) {
    console.error('Failed to generate token:', err);
  }
  return null;
}

// User Normalization & Self-Healing Helper
export function normalizeUser(u: User, availableSchools?: School[]): User {
  if (!u) return u;
  let role = u.role as string;
  let staffTitle = u.staffTitle;
  
  // Normalize staff/assistant roles
  if (role === 'admin_assistant' || role === 'assistant' || role === 'staff') {
    role = 'employee';
    if (!staffTitle) staffTitle = 'admin_assistant';
  } else if (staffTitle === 'admin_assistant' && role !== 'employee' && role !== 'superadmin') {
    role = 'employee';
  }

  // Ensure schoolCode is set if user has managedSchoolCodes or schools exist
  let schoolCode = u.schoolCode ? u.schoolCode.trim() : '';
  const managedCodes = Array.isArray(u.managedSchoolCodes) 
    ? Array.from(new Set(u.managedSchoolCodes.map((c) => (c || '').trim()).filter(Boolean)))
    : [];
  
  if (!schoolCode && managedCodes.length > 0) {
    schoolCode = managedCodes[0];
  } else if (!schoolCode && availableSchools && availableSchools.length > 0 && role !== 'superadmin') {
    schoolCode = availableSchools[0].code;
  }

  // Ensure schoolCode is included in managedSchoolCodes if user has managedSchoolCodes
  if (schoolCode && managedCodes.length > 0 && !managedCodes.includes(schoolCode)) {
    managedCodes.push(schoolCode);
  }

  // Ensure teachingSchoolCode is preserved for teachers
  let teachingSchoolCode = u.teachingSchoolCode;
  if ((role === 'teacher' || staffTitle === 'teacher') && !teachingSchoolCode && schoolCode) {
    teachingSchoolCode = schoolCode;
  }

  return {
    ...u,
    role: role as UserRole,
    staffTitle,
    schoolCode: schoolCode || u.schoolCode,
    teachingSchoolCode,
    managedSchoolCodes: managedCodes.length > 0 ? managedCodes : u.managedSchoolCodes,
  };
}

// 2. Users
export function getUsers(): User[] {
  try {
    const deletedUserIds = new Set(getDeletedUserIds());
    const isUserDeleted = (u: User): boolean => {
      const uid = String(u?.id || '').trim();
      const unid = String(u?.nationalId || '').trim();
      return Boolean((uid && deletedUserIds.has(uid)) || (unid && deletedUserIds.has(unid)));
    };

    const raw = localStorage.getItem(USERS_KEY);
    let current: User[] = [];
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) current = parsed.filter((u) => !isUserDeleted(u));
    }

    const recovered = recoverLegacyItems<User>(
      'hodoorak_users',
      (u) => u.id || `${u.nationalId}_${u.schoolCode || ''}`,
      isUserDeleted
    );
    if (recovered.length > current.length) {
      current = mergeUsers(current, recovered);
      localStorage.setItem(USERS_KEY, JSON.stringify(current));
    }

    const rawList = current.length > 0 ? current : INITIAL_USERS;
    const schools = getSchools();
    return rawList
      .filter((u) => !isUserDeleted(u))
      .map((u) => normalizeUser(u, schools));
  } catch {
    return INITIAL_USERS;
  }
}

export function saveUsers(users: User[], syncServer: boolean = true): void {
  const deletedUserIds = new Set(getDeletedUserIds());
  const cleanUsers = users.filter((u) => {
    if (u.role === 'superadmin' || u.schoolCode === 'SUPERADMIN') return true;
    const uid = String(u.id || '').trim();
    const unid = String(u.nationalId || '').trim();
    return !deletedUserIds.has(uid) && (!unid || !deletedUserIds.has(unid));
  });

  localStorage.setItem(USERS_KEY, JSON.stringify(cleanUsers));
  try {
    broadcastUserChange(cleanUsers);
  } catch (e) {
    console.error('Error broadcasting user change:', e);
  }
  if (syncServer) {
    apiPost('/api/sync', { users: cleanUsers, deleted_user_ids: getDeletedUserIds() });
  }
}

export function addUser(user: User): void {
  // Clear any tombstone so re-registering student or user is permitted
  if (user.id) unrecordDeletedUserId(user.id);
  if (user.nationalId) unrecordDeletedUserId(user.nationalId);

  const list = getUsers();
  const cleanNid = user.nationalId ? user.nationalId.trim() : '';
  const userRole = user.role || (user.staffTitle === 'teacher' ? 'teacher' : 'employee');
  const idx = list.findIndex(
    (u) =>
      u.id === user.id ||
      (cleanNid &&
        u.nationalId &&
        u.nationalId.trim() === cleanNid &&
        u.role === userRole &&
        (userRole !== 'teacher' || u.schoolCode === user.schoolCode))
  );
  if (idx >= 0) {
    const prev = list[idx];
    const unifiedSchools = Array.from(new Set([
      ...(prev.managedSchoolCodes || []),
      prev.schoolCode,
      ...(user.managedSchoolCodes || []),
      user.schoolCode,
    ])).filter(Boolean);
    list[idx] = {
      ...prev,
      ...user,
      managedSchoolCodes: unifiedSchools,
    };
  } else {
    list.push(user);
  }
  saveUsers(list, true);
  apiPost('/api/users', user);
}

export function updateUser(user: User): void {
  if (user.id) unrecordDeletedUserId(user.id);
  if (user.nationalId) unrecordDeletedUserId(user.nationalId);

  const list = getUsers();
  const cleanNid = user.nationalId ? user.nationalId.trim() : '';
  const userRole = user.role || (user.staffTitle === 'teacher' ? 'teacher' : 'employee');
  let updatedAny = false;
  const updatedList = list.map((u) => {
    const match =
      u.id === user.id ||
      (cleanNid &&
        u.nationalId &&
        u.nationalId.trim() === cleanNid &&
        u.role === userRole &&
        (userRole !== 'teacher' || u.schoolCode === user.schoolCode));
    if (match) {
      updatedAny = true;
      const unifiedSchools = Array.from(new Set([
        ...(u.managedSchoolCodes || []),
        u.schoolCode,
        ...(user.managedSchoolCodes || []),
        user.schoolCode,
      ])).filter(Boolean);
      return {
        ...u,
        ...user,
        managedSchoolCodes: unifiedSchools,
      };
    }
    return u;
  });

  if (!updatedAny) {
    updatedList.push(user);
  }

  saveUsers(updatedList, true);
  apiPost('/api/users', user);
}

/**
 * Permanently delete a student from school records and database,
 * completely wiping their attendance, parent links, and permissions
 * so they can re-register correctly without conflict.
 */
export function deleteStudentPermanently(
  studentId: string,
  studentNationalId?: string,
  schoolCode?: string
): void {
  const allUsers = getUsers();
  const targetStudent = allUsers.find(
    (u) => u.id === studentId || (studentNationalId && u.nationalId === studentNationalId)
  );
  const effectiveId = targetStudent?.id || studentId;
  const effectiveNid = (targetStudent?.nationalId || studentNationalId || '').trim();
  const effectiveSchoolCode = targetStudent?.schoolCode || schoolCode || '';

  // 1. Record in deleted users registry
  if (effectiveId) recordDeletedUserId(effectiveId);
  if (effectiveNid) recordDeletedUserId(effectiveNid);

  // 2. Remove student user from local storage and unlink from parents
  const remainingUsers = allUsers
    .filter((u) => u.id !== effectiveId && (!effectiveNid || u.nationalId !== effectiveNid))
    .map((u) => {
      if (u.role === 'parent' && Array.isArray(u.childrenNationalIds) && effectiveNid) {
        return {
          ...u,
          childrenNationalIds: u.childrenNationalIds.filter((cid) => String(cid).trim() !== effectiveNid),
        };
      }
      return u;
    });

  saveUsers(remainingUsers, true);

  // Clean from legacy keys
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith('hodoorak_users')) {
      try {
        const content = localStorage.getItem(k);
        if (content) {
          const parsed = JSON.parse(content);
          if (Array.isArray(parsed)) {
            const cleaned = parsed.filter(
              (u: User) => u.id !== effectiveId && (!effectiveNid || u.nationalId !== effectiveNid)
            );
            localStorage.setItem(k, JSON.stringify(cleaned));
          }
        }
      } catch {}
    }
  }

  // 3. Delete attendance records for this student
  const attendances = getAttendances();
  const remainingAttendances = attendances.filter(
    (a) => a.studentId !== effectiveId && (!effectiveNid || a.nationalId !== effectiveNid)
  );
  if (remainingAttendances.length !== attendances.length) {
    saveAttendances(remainingAttendances, true);
  }

  // 4. Delete permissions
  try {
    const rawPerms = localStorage.getItem('hodoorak_permissions');
    if (rawPerms) {
      const perms = JSON.parse(rawPerms);
      if (Array.isArray(perms)) {
        const cleaned = perms.filter((p: any) => p.studentId !== effectiveId);
        localStorage.setItem('hodoorak_permissions', JSON.stringify(cleaned));
      }
    }
  } catch {}

  // 5. Delete behavior logs
  try {
    const rawBeh = localStorage.getItem('hodoorak_behavior_logs');
    if (rawBeh) {
      const beh = JSON.parse(rawBeh);
      if (Array.isArray(beh)) {
        const cleaned = beh.filter((b: any) => b.studentId !== effectiveId);
        localStorage.setItem('hodoorak_behavior_logs', JSON.stringify(cleaned));
      }
    }
  } catch {}

  // 6. Notify server via POST /api/users/purge-student
  fetch('/api/users/purge-student', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      studentId: effectiveId,
      studentNationalId: effectiveNid,
      schoolCode: effectiveSchoolCode,
    }),
  }).catch(() => {});

  if (effectiveId) {
    fetch(`/api/users/${encodeURIComponent(effectiveId)}`, { method: 'DELETE' }).catch(() => {});
  }
}

export function deleteUser(userId: string): void {
  const target = getUsers().find((u) => u.id === userId);
  if (target && target.role === 'student') {
    deleteStudentPermanently(target.id, target.nationalId, target.schoolCode);
    return;
  }
  const cleanNid = target?.nationalId ? String(target.nationalId).trim() : '';
  if (userId) recordDeletedUserId(userId);
  if (cleanNid) recordDeletedUserId(cleanNid);
  const list = getUsers().filter((u) => u.id !== userId && (!cleanNid || u.nationalId !== cleanNid));
  saveUsers(list, true);
  fetch(`/api/users/${encodeURIComponent(userId)}`, { method: 'DELETE' }).catch(() => {});
}

// 3. Attendances
export function getAttendances(): Attendance[] {
  try {
    const deletedSet = new Set(getDeletedAttendanceIds());
    const raw = localStorage.getItem(ATTENDANCES_KEY);
    let current: Attendance[] = [];
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) current = parsed;
    }

    const recovered = recoverLegacyItems<Attendance>('hodoorak_attendances', (a) => a.id || `${a.studentId}_${a.date}`);
    if (recovered.length > current.length) {
      current = mergeAttendances(current, recovered);
      localStorage.setItem(ATTENDANCES_KEY, JSON.stringify(current));
    }

    return current.filter(
      (a) => !deletedSet.has(String(a.id)) && !deletedSet.has(`${a.studentId}_${a.date}`)
    );
  } catch {
    return [];
  }
}

export function saveAttendances(attendances: Attendance[], syncServer: boolean = true): void {
  const deletedSet = new Set(getDeletedAttendanceIds());
  const cleanList = attendances.filter(
    (a) => !deletedSet.has(String(a.id)) && !deletedSet.has(`${a.studentId}_${a.date}`)
  );
  localStorage.setItem(ATTENDANCES_KEY, JSON.stringify(cleanList));
  // Broadcast immediately to in-app components and all open browser tabs
  try {
    broadcastAttendanceChange(cleanList);
  } catch (e) {
    console.error('Error broadcasting attendance change:', e);
  }
  if (syncServer) {
    apiPost('/api/attendances', cleanList);
  }
}

export function getAttendancesForDate(schoolCode: string, date: string): Attendance[] {
  const all = getAttendances();
  return all.filter((a) => a.schoolCode === schoolCode && a.date === date);
}

export function getAttendancesForStudent(studentId: string): Attendance[] {
  const all = getAttendances();
  return all.filter((a) => a.studentId === studentId);
}

export function updateAttendance(attendance: Attendance): void {
  const all = getAttendances();
  const idx = all.findIndex((a) => a.id === attendance.id);
  if (idx >= 0) {
    all[idx] = attendance;
  } else {
    all.push(attendance);
  }
  saveAttendances(all, true);
}

/**
 * Permanently deletes a single attendance record by ID and registers it in the deleted list
 */
export function deleteAttendance(attendanceId: string): void {
  if (!attendanceId) return;
  recordDeletedAttendanceId(attendanceId);
  const all = getAttendances().filter((a) => a.id !== attendanceId);
  saveAttendances(all, true);
  fetch(`/api/attendances/${encodeURIComponent(attendanceId)}`, { method: 'DELETE' }).catch(() => {});
}

/**
 * Permanently deletes multiple attendance records by IDs and syncs with backend
 */
export function deleteAttendances(attendanceIds: string[]): void {
  if (!Array.isArray(attendanceIds) || attendanceIds.length === 0) return;
  attendanceIds.forEach((id) => recordDeletedAttendanceId(id));
  const delSet = new Set(attendanceIds.map(String));
  const all = getAttendances().filter((a) => !delSet.has(String(a.id)));
  saveAttendances(all, true);
  apiPost('/api/attendances/delete-batch', { ids: attendanceIds });
}

/**
 * Permanently deletes all recorded absences for a student (due to system glitch or technical error)
 * and restarts the absence calculation from scratch
 */
export function deleteStudentAllAbsences(studentId: string): number {
  if (!studentId) return 0;
  const all = getAttendances();
  const absences = all.filter(
    (a) => a.studentId === studentId && (a.finalStatus === 'absent' || a.teacherMark === 'absent')
  );
  if (absences.length === 0) return 0;
  const ids = absences.map((a) => a.id);
  deleteAttendances(ids);

  // Restart absence calculation from scratch
  const users = getUsers();
  const uIdx = users.findIndex((u) => u.id === studentId);
  if (uIdx >= 0) {
    users[uIdx].lastAbsenceResetDate = getTodayDateString();
    saveUsers(users, true);
  }

  return ids.length;
}

/**
 * Bulk converts all absences of a student to 'present' (حاضر) with administrative correction notes
 * and restarts the absence calculation from scratch
 */
export function convertStudentAllAbsencesToPresent(
  studentId: string,
  reason: string = 'تصحيح إداري بسبب عطل تقني في النظام',
  adminName?: string
): number {
  if (!studentId) return 0;
  const all = getAttendances();
  let count = 0;
  const noteSuffix = adminName ? ` (بواسطة: ${adminName})` : '';
  const fullNote = `${reason}${noteSuffix}`;

  const updated = all.map((a) => {
    if (a.studentId === studentId && (a.finalStatus === 'absent' || a.teacherMark === 'absent')) {
      count++;
      return {
        ...a,
        finalStatus: 'present' as const,
        teacherMark: 'present' as const,
        isTruant: false,
        selfCheckTime: a.selfCheckTime || '07:15 ص',
        adminDecisionNotes: fullNote,
        excuseStatus: 'accepted' as const,
      };
    }
    return a;
  });

  if (count > 0) {
    saveAttendances(updated, true);
  }

  // Restart absence calculation from scratch
  const users = getUsers();
  const uIdx = users.findIndex((u) => u.id === studentId);
  if (uIdx >= 0) {
    users[uIdx].lastAbsenceResetDate = getTodayDateString();
    saveUsers(users, true);
  }

  return count;
}

/**
 * Bulk converts all absences of MULTIPLE selected students to 'present' (حاضر)
 * and restarts the absence calculation & warning cycle from scratch
 */
export function bulkConvertMultipleStudentsAbsencesToPresent(
  studentIds: string[],
  reason: string = 'تصحيح إداري بسبب عطل تقني في النظام وإعادة بدء الحساب',
  adminName?: string
): { affectedStudentsCount: number; affectedAbsencesCount: number } {
  if (!studentIds || studentIds.length === 0) {
    return { affectedStudentsCount: 0, affectedAbsencesCount: 0 };
  }

  const all = getAttendances();
  const studentSet = new Set(studentIds);
  let affectedAbsencesCount = 0;
  const noteSuffix = adminName ? ` (بواسطة: ${adminName})` : '';
  const fullNote = `${reason}${noteSuffix}`;

  const updated = all.map((a) => {
    if (studentSet.has(a.studentId) && (a.finalStatus === 'absent' || a.teacherMark === 'absent')) {
      affectedAbsencesCount++;
      return {
        ...a,
        finalStatus: 'present' as const,
        teacherMark: 'present' as const,
        isTruant: false,
        selfCheckTime: a.selfCheckTime || '07:15 ص',
        adminDecisionNotes: fullNote,
        excuseStatus: 'accepted' as const,
      };
    }
    return a;
  });

  if (affectedAbsencesCount > 0) {
    saveAttendances(updated, true);
  }

  // Restart absence calculation and reset cycle for all selected students ("يبدا الحساب من جديد")
  const todayStr = getTodayDateString();
  const users = getUsers();
  let usersChanged = false;
  users.forEach((u) => {
    if (studentSet.has(u.id)) {
      u.lastAbsenceResetDate = todayStr;
      usersChanged = true;
    }
  });

  if (usersChanged) {
    saveUsers(users, true);
  }

  return { affectedStudentsCount: studentIds.length, affectedAbsencesCount };
}

/**
 * Permanently deletes all recorded absences for MULTIPLE selected students
 * and restarts their absence calculation from scratch
 */
export function bulkDeleteMultipleStudentsAbsences(
  studentIds: string[]
): { affectedStudentsCount: number; affectedAbsencesCount: number } {
  if (!studentIds || studentIds.length === 0) {
    return { affectedStudentsCount: 0, affectedAbsencesCount: 0 };
  }

  const all = getAttendances();
  const studentSet = new Set(studentIds);
  const absences = all.filter(
    (a) => studentSet.has(a.studentId) && (a.finalStatus === 'absent' || a.teacherMark === 'absent')
  );

  const ids = absences.map((a) => a.id);
  if (ids.length > 0) {
    deleteAttendances(ids);
  }

  // Restart absence calculation and reset cycle for all selected students ("يبدا الحساب من جديد")
  const todayStr = getTodayDateString();
  const users = getUsers();
  let usersChanged = false;
  users.forEach((u) => {
    if (studentSet.has(u.id)) {
      u.lastAbsenceResetDate = todayStr;
      usersChanged = true;
    }
  });

  if (usersChanged) {
    saveUsers(users, true);
  }

  return { affectedStudentsCount: studentIds.length, affectedAbsencesCount: ids.length };
}

/**
 * Bulk converts selected attendance records (by attendance IDs) to 'present'
 * and restarts the absence cycle for the corresponding students
 */
export function bulkConvertAttendanceRecordsToPresent(
  attendanceIds: string[],
  reason: string = 'تصحيح إداري بسبب عطل تقني - إعادة بدء الحساب',
  adminName?: string
): { affectedRecordsCount: number; affectedStudentsCount: number } {
  if (!attendanceIds || attendanceIds.length === 0) return { affectedRecordsCount: 0, affectedStudentsCount: 0 };
  const all = getAttendances();
  const idSet = new Set(attendanceIds);
  let count = 0;
  const noteSuffix = adminName ? ` (بواسطة: ${adminName})` : '';
  const fullNote = `${reason}${noteSuffix}`;
  const studentIdsAffected = new Set<string>();

  const updated = all.map((a) => {
    if (idSet.has(a.id)) {
      count++;
      studentIdsAffected.add(a.studentId);
      return {
        ...a,
        finalStatus: 'present' as const,
        teacherMark: 'present' as const,
        isTruant: false,
        selfCheckTime: a.selfCheckTime || '07:15 ص',
        adminDecisionNotes: fullNote,
        excuseStatus: 'accepted' as const,
      };
    }
    return a;
  });

  if (count > 0) {
    saveAttendances(updated, true);
  }

  // Reset cycle for affected students
  const todayStr = getTodayDateString();
  const users = getUsers();
  let usersChanged = false;
  users.forEach((u) => {
    if (studentIdsAffected.has(u.id)) {
      u.lastAbsenceResetDate = todayStr;
      usersChanged = true;
    }
  });
  if (usersChanged) {
    saveUsers(users, true);
  }

  return { affectedRecordsCount: count, affectedStudentsCount: studentIdsAffected.size };
}

/**
 * Admin edits a specific attendance record with custom status, notes, or reason
 */
export function adminUpdateAttendance(
  attendanceId: string,
  updates: Partial<Attendance>,
  adminName?: string
): Attendance | null {
  const all = getAttendances();
  const idx = all.findIndex((a) => a.id === attendanceId);
  if (idx < 0) return null;

  const prev = all[idx];
  const noteSuffix = adminName ? ` [تعديل إداري: ${adminName}]` : '';
  const newNotes = updates.adminDecisionNotes
    ? `${updates.adminDecisionNotes}${noteSuffix}`
    : prev.adminDecisionNotes;

  const merged: Attendance = {
    ...prev,
    ...updates,
    adminDecisionNotes: newNotes,
    // If status changed to present, clear truant flag
    isTruant: updates.finalStatus === 'present' ? false : (updates.isTruant ?? prev.isTruant),
  };

  all[idx] = merged;
  saveAttendances(all, true);
  return merged;
}

// 3.5 Student Classroom Permissions
export function getPermissions(): StudentPermission[] {
  try {
    const raw = localStorage.getItem(PERMISSIONS_KEY);
    if (!raw) {
      savePermissions(INITIAL_PERMISSIONS, false);
      return INITIAL_PERMISSIONS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : INITIAL_PERMISSIONS;
  } catch {
    return INITIAL_PERMISSIONS;
  }
}

export function savePermissions(permissions: StudentPermission[], syncServer: boolean = true): void {
  localStorage.setItem(PERMISSIONS_KEY, JSON.stringify(permissions));
  if (syncServer) {
    apiPost('/api/permissions', permissions);
  }
}

export function addPermission(perm: StudentPermission): void {
  const list = getPermissions();
  list.unshift(perm);
  savePermissions(list, true);
  apiPost('/api/permissions', perm);
}

export function returnStudentPermission(permissionId: string, timeIn?: string): void {
  const list = getPermissions();
  const idx = list.findIndex((p) => p.id === permissionId);
  if (idx >= 0) {
    const perm = list[idx];
    const actualTimeIn = timeIn || new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit', hour12: false });
    perm.timeIn = actualTimeIn;
    
    try {
      const [outH, outM] = perm.timeOut.split(':').map(Number);
      const [inH, inM] = actualTimeIn.split(':').map(Number);
      if (!isNaN(outH) && !isNaN(outM) && !isNaN(inH) && !isNaN(inM)) {
        const outTotal = outH * 60 + outM;
        const inTotal = inH * 60 + inM;
        perm.durationMinutes = Math.max(0, inTotal - outTotal);
      }
    } catch {
      // fallback
    }
    
    savePermissions(list, true);
  }
}

export function getPermissionsForStudent(studentId: string): StudentPermission[] {
  return getPermissions().filter((p) => p.studentId === studentId);
}

export function getStudentPermissionsToday(studentId: string, date?: string): StudentPermission[] {
  const targetDate = date || getTodayDateString();
  return getPermissions().filter((p) => p.studentId === studentId && p.date === targetDate);
}

export function getPendingExitPermissionsForSchool(schoolCode: string, date?: string): StudentPermission[] {
  const targetDate = date || getTodayDateString();
  return getPermissions().filter(
    (p) =>
      p.schoolCode === schoolCode &&
      p.date === targetDate &&
      p.permissionType === 'school_exit' &&
      (!p.exitGateStatus || p.exitGateStatus === 'pending_guard_approval')
  );
}

export function getExitPermissionsTodayForSchool(schoolCode: string, date?: string): StudentPermission[] {
  const targetDate = date || getTodayDateString();
  return getPermissions().filter(
    (p) => p.schoolCode === schoolCode && p.date === targetDate && p.permissionType === 'school_exit'
  );
}

export function confirmGuardExitPermission(
  permissionId: string,
  guardName: string = 'حارس البوابة'
): { success: boolean; permission?: StudentPermission } {
  const list = getPermissions();
  const idx = list.findIndex((p) => p.id === permissionId);
  if (idx < 0) return { success: false };

  const now = new Date();
  const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  
  const perm = list[idx];
  perm.exitGateStatus = 'confirmed_exited';
  perm.guardConfirmedAt = timeStr;
  perm.guardName = guardName;
  savePermissions(list, true);

  // Synchronize with Attendance records
  const attendances = getAttendances();
  const attIdx = attendances.findIndex((a) => a.studentId === perm.studentId && a.date === perm.date);
  if (attIdx >= 0) {
    attendances[attIdx].exitTime = timeStr;
    attendances[attIdx].exitReason = 'early_permission';
    attendances[attIdx].exitConfirmedBy = `${guardName} (بتصريح إداري معتمد)`;
    if (perm.pickupPerson) {
      attendances[attIdx].pickupPersonName = perm.pickupPerson;
    }
  } else {
    attendances.push({
      id: `att-${perm.studentId}-${perm.date}`,
      studentId: perm.studentId,
      studentName: perm.studentName,
      nationalId: perm.nationalId,
      schoolCode: perm.schoolCode,
      className: perm.className,
      sectionName: perm.sectionName,
      date: perm.date,
      selfCheckTime: null,
      teacherMark: null,
      finalStatus: 'present',
      isTruant: false,
      exitTime: timeStr,
      exitReason: 'early_permission',
      exitConfirmedBy: `${guardName} (بتصريح إداري معتمد)`,
      pickupPersonName: perm.pickupPerson,
    });
  }
  saveAttendances(attendances, true);

  return { success: true, permission: perm };
}

// 3.8 Student Behavior Logs
export function getBehaviorLogs(): StudentBehaviorLog[] {
  try {
    const raw = localStorage.getItem(BEHAVIOR_KEY);
    if (!raw) {
      saveBehaviorLogs(INITIAL_BEHAVIOR_LOGS, false);
      return INITIAL_BEHAVIOR_LOGS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : INITIAL_BEHAVIOR_LOGS;
  } catch {
    return INITIAL_BEHAVIOR_LOGS;
  }
}

export function saveBehaviorLogs(logs: StudentBehaviorLog[], syncServer: boolean = true): void {
  localStorage.setItem(BEHAVIOR_KEY, JSON.stringify(logs));
  if (syncServer) {
    apiPost('/api/sync', { behavior_logs: logs });
  }
}

export function addBehaviorLog(log: StudentBehaviorLog): void {
  const list = getBehaviorLogs();
  list.unshift(log);
  saveBehaviorLogs(list, true);
}

export function deleteBehaviorLog(logId: string): void {
  const list = getBehaviorLogs().filter((b) => b.id !== logId);
  saveBehaviorLogs(list, true);
}

export function getBehaviorLogsForStudent(studentId: string): StudentBehaviorLog[] {
  return getBehaviorLogs().filter((b) => b.studentId === studentId);
}

export function getBehaviorLogsForSchool(schoolCode: string): StudentBehaviorLog[] {
  return getBehaviorLogs().filter((b) => b.schoolCode === schoolCode);
}

// 4. Correction Requests
export function getCorrectionRequests(): CorrectionRequest[] {
  try {
    const raw = localStorage.getItem(CORRECTIONS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveCorrectionRequests(reqs: CorrectionRequest[], syncServer: boolean = true): void {
  localStorage.setItem(CORRECTIONS_KEY, JSON.stringify(reqs));
  try {
    broadcastCorrectionChange(reqs);
  } catch (e) {
    console.error(e);
  }
  if (syncServer) {
    apiPost('/api/sync', { corrections: reqs });
  }
}

export function addCorrectionRequest(req: CorrectionRequest): void {
  const list = getCorrectionRequests();
  list.unshift(req);
  saveCorrectionRequests(list, true);
}

export function updateCorrectionRequest(req: CorrectionRequest): void {
  const list = getCorrectionRequests();
  const idx = list.findIndex(
    (r) =>
      r.id === req.id ||
      (r.attendanceId && req.attendanceId && r.attendanceId === req.attendanceId) ||
      (r.studentId === req.studentId && r.date === req.date)
  );
  const updatedReq: CorrectionRequest = {
    ...req,
    updatedAt: req.updatedAt || new Date().toISOString(),
  };

  if (idx >= 0) {
    list[idx] = { ...list[idx], ...updatedReq };
  } else {
    list.unshift(updatedReq);
  }
  saveCorrectionRequests(list, true);

  // Directly call dedicated server endpoint for instant persistence
  try {
    if (updatedReq.status === 'approved' || updatedReq.status === 'conditional_approved') {
      apiPost(`/api/corrections/${encodeURIComponent(updatedReq.id)}/approve`, {
        adminDecisionNotes: updatedReq.adminDecisionNotes,
        decidedByName: updatedReq.decidedByName,
        decidedByRole: updatedReq.decidedByRole,
        attendanceId: updatedReq.attendanceId,
        studentId: updatedReq.studentId,
        date: updatedReq.date,
        approvalType: updatedReq.approvalType || (updatedReq.status === 'conditional_approved' ? 'conditional' : 'official'),
      });
    } else if (updatedReq.status === 'rejected') {
      apiPost(`/api/corrections/${encodeURIComponent(updatedReq.id)}/reject`, {
        reason: updatedReq.adminDecisionNotes,
        decidedByName: updatedReq.decidedByName,
        decidedByRole: updatedReq.decidedByRole,
        attendanceId: updatedReq.attendanceId,
        studentId: updatedReq.studentId,
        date: updatedReq.date,
      });
    } else {
      apiPost('/api/corrections', updatedReq);
    }
  } catch (err) {
    console.warn('Dedicated correction endpoint call failed:', err);
  }
}

export interface StudentExcuseStats {
  officialCount: number;
  conditionalCount: number;
  totalCount: number;
}

/**
 * Calculates the exact historical count of official excuses vs conditional excuses for a student.
 * Deduplicates by date across both Attendance and CorrectionRequest records.
 */
export function getStudentExcuseStats(studentId: string, nationalId?: string): StudentExcuseStats {
  if (!studentId && !nationalId) {
    return { officialCount: 0, conditionalCount: 0, totalCount: 0 };
  }

  const cleanStudentId = String(studentId || '').trim();
  const cleanNid = String(nationalId || '').trim();

  const allCorrections = getCorrectionRequests().filter((c) => {
    const matchId = cleanStudentId && c.studentId && String(c.studentId).trim() === cleanStudentId;
    const matchNid = cleanNid && c.nationalId && String(c.nationalId).trim() === cleanNid;
    return matchId || matchNid;
  });

  const allAttendances = getAttendances().filter((a) => {
    const matchId = cleanStudentId && a.studentId && String(a.studentId).trim() === cleanStudentId;
    const matchNid = cleanNid && a.nationalId && String(a.nationalId).trim() === cleanNid;
    return matchId || matchNid;
  });

  // Deduplicate by date (each day can only count once as either conditional or official)
  const dateMap = new Map<string, { isConditional: boolean; isOfficial: boolean }>();

  // Process Correction Requests
  allCorrections.forEach((c) => {
    if (c.status === 'approved' || c.status === 'conditional_approved') {
      const isCond = c.approvalType === 'conditional' || c.status === 'conditional_approved';
      const existing = dateMap.get(c.date) || { isConditional: false, isOfficial: false };
      if (isCond) {
        existing.isConditional = true;
      } else {
        existing.isOfficial = true;
      }
      dateMap.set(c.date, existing);
    }
  });

  // Process Attendance records
  allAttendances.forEach((a) => {
    const isAccepted = a.excuseStatus === 'accepted' || a.excuseStatus === 'conditional_accepted';
    if (isAccepted) {
      const isCond = a.excuseDecisionType === 'conditional' || a.excuseStatus === 'conditional_accepted';
      const existing = dateMap.get(a.date) || { isConditional: false, isOfficial: false };
      if (isCond) {
        existing.isConditional = true;
      } else {
        existing.isOfficial = true;
      }
      dateMap.set(a.date, existing);
    }
  });

  let officialCount = 0;
  let conditionalCount = 0;

  dateMap.forEach((val) => {
    if (val.isConditional) {
      conditionalCount++;
    } else if (val.isOfficial) {
      officialCount++;
    }
  });

  return {
    officialCount,
    conditionalCount,
    totalCount: officialCount + conditionalCount,
  };
}

// 5. Payment Requests
export function getPaymentRequests(): SubscriptionPaymentRequest[] {
  try {
    const raw = localStorage.getItem(PAYMENTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function savePaymentRequests(reqs: SubscriptionPaymentRequest[], syncServer: boolean = true): void {
  localStorage.setItem(PAYMENTS_KEY, JSON.stringify(reqs));
  if (syncServer) {
    apiPost('/api/sync', { payments: reqs });
  }
}

export function addPaymentRequest(req: SubscriptionPaymentRequest): void {
  const list = getPaymentRequests();
  list.unshift(req);
  savePaymentRequests(list, true);
}

export function updatePaymentRequest(req: SubscriptionPaymentRequest): void {
  const list = getPaymentRequests();
  const idx = list.findIndex((r) => r.id === req.id);
  if (idx >= 0) {
    list[idx] = req;
    savePaymentRequests(list, true);
  }
}

// 6. System Notifications
export function getSystemNotifications(): SystemNotification[] {
  try {
    const raw = localStorage.getItem(NOTIFICATIONS_KEY);
    if (!raw) return [];
    const parsed: SystemNotification[] = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const deleted = new Set(getDeletedNotificationIds());
    return parsed.filter((n) => n?.id && !deleted.has(String(n.id)));
  } catch {
    return [];
  }
}

export function saveSystemNotifications(n: SystemNotification[], syncServer: boolean = true): void {
  const deleted = new Set(getDeletedNotificationIds());
  const clean = (Array.isArray(n) ? n : []).filter((item) => item?.id && !deleted.has(String(item.id)));
  localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(clean));
  try {
    broadcastNotificationChange(clean);
  } catch (e) {
    console.error(e);
  }
  if (syncServer) {
    apiPost('/api/sync', { 
      notifications: clean,
      deleted_notification_ids: getDeletedNotificationIds(),
    });
  }
}

export function addSystemNotification(n: SystemNotification): void {
  const list = getSystemNotifications();
  list.unshift(n);
  saveSystemNotifications(list, true);
}

/**
 * Retract an emergency broadcast / announcement (e.g. In case of rumors or weather cancellation)
 * Marks it as officially retracted and clarifies the reason for all dashboards.
 */
export function retractSystemNotification(
  notificationId: string, 
  reason: string, 
  retractedByName?: string
): SystemNotification | null {
  if (!notificationId) return null;
  const list = getSystemNotifications();
  const idx = list.findIndex((n) => n.id === notificationId);
  if (idx < 0) return null;

  const prev = list[idx];
  const updated: SystemNotification = {
    ...prev,
    retracted: true,
    retractedAt: new Date().toISOString(),
    retractionReason: reason?.trim() || 'تم التراجع عن التعميم بناءً على التوجيهات الرسمية ونفي الشائعة',
    retractedByName: retractedByName?.trim() || prev.senderName || 'إدارة المدرسة',
  };

  list[idx] = updated;
  saveSystemNotifications(list, true);

  // Notify backend API
  apiPost(`/api/notifications/${encodeURIComponent(notificationId)}/retract`, {
    reason: updated.retractionReason,
    retractedByName: updated.retractedByName,
  });

  return updated;
}

/**
 * Permanently delete a broadcast/notification so it vanishes everywhere
 */
export function deleteSystemNotification(notificationId: string): void {
  if (!notificationId) return;
  recordDeletedNotificationId(notificationId);
  const current = getSystemNotifications().filter((n) => n.id !== notificationId);
  saveSystemNotifications(current, true);

  // Send DELETE to server API
  fetch(`/api/notifications/${encodeURIComponent(notificationId)}`, { method: 'DELETE' }).catch(() => {});
}

export function updateUserAvatar(userId: string, avatarDataUrl: string): void {
  const users = getUsers();
  const idx = users.findIndex((u) => u.id === userId);
  if (idx >= 0) {
    users[idx].avatar = avatarDataUrl;
    saveUsers(users, true);

    const currentUser = getCurrentUser();
    if (currentUser && currentUser.id === userId) {
      currentUser.avatar = avatarDataUrl;
      saveCurrentUserSession(currentUser);
    }
  }
}

// 6.5 Administrative Absence Actions
export function getAbsenceActions(): AdministrativeAbsenceAction[] {
  try {
    const raw = localStorage.getItem(ABSENCE_ACTIONS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveAbsenceActions(actions: AdministrativeAbsenceAction[], syncServer: boolean = true): void {
  localStorage.setItem(ABSENCE_ACTIONS_KEY, JSON.stringify(actions));
  if (syncServer) {
    apiPost('/api/sync', { absence_actions: actions });
  }
}

export function addAbsenceAction(action: AdministrativeAbsenceAction): void {
  const list = getAbsenceActions();
  list.unshift(action);
  saveAbsenceActions(list, true);

  if (action.resetCycle) {
    const users = getUsers();
    const idx = users.findIndex((u) => u.id === action.studentId);
    if (idx >= 0) {
      users[idx].lastAbsenceResetDate = action.date || getTodayDateString();
      saveUsers(users, true);
    }
  }
}

export function getAbsenceActionsForStudent(studentId: string): AdministrativeAbsenceAction[] {
  return getAbsenceActions().filter((a) => a.studentId === studentId);
}

export function getAbsenceActionsForSchool(schoolCode: string): AdministrativeAbsenceAction[] {
  return getAbsenceActions().filter((a) => a.schoolCode === schoolCode);
}

// 7. Current User Session
export function getCurrentUserSession(): User | null {
  try {
    const raw = localStorage.getItem(CURRENT_USER_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed) return null;
    const schools = getSchools();
    const allUsers = getUsers();

    let activeUser = parsed;
    const cleanNid = parsed.nationalId ? parsed.nationalId.trim() : '';
    if (cleanNid || parsed.id) {
      const matching = allUsers.filter(
        (u) =>
          (cleanNid && u.nationalId && u.nationalId.trim() === cleanNid) ||
          (parsed.id && u.id === parsed.id)
      );
      if (matching.length > 0) {
        const allManaged = Array.from(new Set([
          ...(parsed.managedSchoolCodes || []),
          parsed.schoolCode,
          ...matching.flatMap((m) => [m.schoolCode, ...(m.managedSchoolCodes || [])]),
        ])).filter(Boolean) as string[];

        const staffTitle = parsed.staffTitle || matching.find((m) => m.staffTitle)?.staffTitle;
        const name = parsed.name || matching.find((m) => m.name)?.name || parsed.name;

        // Preserve assignedClasses from teacher matching record if parsed session is missing them
        const teacherRec = matching.find((m) => (m.assignedClasses && m.assignedClasses.length > 0) || m.role === 'teacher');
        const assignedClasses = (parsed.assignedClasses && parsed.assignedClasses.length > 0)
          ? parsed.assignedClasses
          : teacherRec?.assignedClasses;
        const teachingSchoolCode = parsed.teachingSchoolCode || teacherRec?.teachingSchoolCode || (teacherRec?.role === 'teacher' ? teacherRec.schoolCode : undefined);

        activeUser = {
          ...parsed,
          name,
          staffTitle,
          assignedClasses,
          teachingSchoolCode,
          managedSchoolCodes: allManaged,
        };
      }
    }

    return normalizeUser(activeUser, schools);
  } catch {
    return null;
  }
}

export function saveCurrentUserSession(user: User | null): void {
  if (!user) {
    localStorage.removeItem(CURRENT_USER_KEY);
  } else {
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
  }
}

export const getCurrentUser = getCurrentUserSession;
export const setCurrentUser = saveCurrentUserSession;
export const setUserState = saveCurrentUserSession;

// 8. Clean Production Reset
export function cleanResetToEmptyProductionData(): void {
  saveAttendances([], true);
  savePermissions([], true);
  saveBehaviorLogs([], true);
  saveCorrectionRequests([], true);
  saveAbsenceActions([], true);
  savePaymentRequests([], true);
  saveSystemNotifications([], true);

  const users = getUsers().map((u) => ({
    ...u,
    lastAbsenceResetDate: undefined,
  }));
  saveUsers(users, true);

  window.location.reload();
}

// 9. Reset All Data Completely on Server and Local
export async function resetAllDataToSeed(): Promise<void> {
  try {
    await fetch('/api/reset-all', { method: 'POST' });
  } catch (err) {
    console.warn('Reset all API call failed:', err);
  }

  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && (k.startsWith('hodoorak_') || k.startsWith('deleted_'))) {
      keysToRemove.push(k);
    }
  }
  keysToRemove.forEach((k) => localStorage.removeItem(k));
  window.location.reload();
}

// 10. Official Parent Summons Management
export function getParentSummons(): ParentSummon[] {
  try {
    const raw = localStorage.getItem(PARENT_SUMMONS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveParentSummons(list: ParentSummon[], syncServer: boolean = true): void {
  const clean = Array.isArray(list) ? list : [];
  localStorage.setItem(PARENT_SUMMONS_KEY, JSON.stringify(clean));
  if (syncServer) {
    apiPost('/api/sync', { parent_summons: clean });
  }
}

export function getParentSummonsForStudent(studentId: string, studentNationalId?: string): ParentSummon[] {
  const all = getParentSummons();
  const cleanNid = studentNationalId ? studentNationalId.trim() : '';
  return all.filter(
    (s) => s.studentId === studentId || (cleanNid && s.studentNationalId && s.studentNationalId.trim() === cleanNid)
  );
}

export function getParentSummonsForSchool(schoolCode: string): ParentSummon[] {
  const cleanCode = (schoolCode || '').toUpperCase();
  return getParentSummons().filter((s) => s.schoolCode && s.schoolCode.toUpperCase() === cleanCode);
}

export function addParentSummon(summon: ParentSummon): void {
  const list = getParentSummons();
  list.unshift(summon);
  saveParentSummons(list, true);
}

export function updateParentSummon(updated: ParentSummon): void {
  const list = getParentSummons();
  const idx = list.findIndex((s) => s.id === updated.id);
  if (idx >= 0) {
    list[idx] = updated;
    saveParentSummons(list, true);
  }
}

export function deleteParentSummon(id: string): void {
  const list = getParentSummons().filter((s) => s.id !== id);
  saveParentSummons(list, true);
}
