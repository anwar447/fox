import { 
  School, User, Attendance, CorrectionRequest, 
  SubscriptionPaymentRequest, SystemNotification, 
  StudentPermission, StudentBehaviorLog, AdministrativeAbsenceAction 
} from '../types';
import { INITIAL_SCHOOLS, INITIAL_USERS, INITIAL_PERMISSIONS, INITIAL_BEHAVIOR_LOGS } from '../data/seedData';
import { getTodayDateString } from './academic';

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
export const DEFAULT_PURGED_DEMO_SCHOOLS = ['RAYA-1448', 'SCH-RAYA-1', 'QURAN-100', 'SCH-QURAN-1'];

export function getDeletedSchools(): string[] {
  try {
    const raw = localStorage.getItem(DELETED_SCHOOLS_KEY);
    const parsed: string[] = raw ? JSON.parse(raw) : [];
    const set = new Set<string>([
      ...DEFAULT_PURGED_DEMO_SCHOOLS.map((s) => s.toUpperCase()),
      ...parsed.map((s) => String(s).toUpperCase()),
    ]);
    return Array.from(set);
  } catch {
    return [...DEFAULT_PURGED_DEMO_SCHOOLS];
  }
}

export function recordDeletedSchool(idOrCode: string, extraCode?: string): void {
  try {
    const list = getDeletedSchools();
    const toAdd = [idOrCode, extraCode].filter(Boolean) as string[];
    toAdd.forEach((val) => {
      const upper = String(val).toUpperCase();
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
                return !toAdd.some((del) => {
                  const delUpper = String(del).toUpperCase();
                  return delUpper === sCode || delUpper === sId;
                });
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
            customClasses: (s.customClasses && s.customClasses.length > 0) ? s.customClasses : prev.customClasses,
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
  existing.forEach((u) => {
    if (u) {
      const key = u.id || `${u.nationalId}_${u.schoolCode || ''}`;
      map.set(key, u);
    }
  });
  incoming.forEach((u) => {
    if (u) {
      const key = u.id || `${u.nationalId}_${u.schoolCode || ''}`;
      if (map.has(key)) {
        map.set(key, { ...map.get(key)!, ...u });
      } else {
        map.set(key, u);
      }
    }
  });
  return Array.from(map.values());
}

export function mergeAttendances(existing: Attendance[], incoming: Attendance[]): Attendance[] {
  const map = new Map<string, Attendance>();
  existing.forEach((a) => {
    if (a) {
      const key = a.id || `${a.studentId}_${a.date}`;
      map.set(key, a);
    }
  });
  incoming.forEach((a) => {
    if (a) {
      const key = a.id || `${a.studentId}_${a.date}`;
      if (map.has(key)) {
        map.set(key, { ...map.get(key)!, ...a });
      } else {
        map.set(key, a);
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
          const merged = mergeById(localCorrections, d.corrections);
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
    }
    return current;
  } catch {
    return INITIAL_SCHOOLS;
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

export function deleteSchool(schoolIdOrCode: string, extraCode?: string): void {
  recordDeletedSchool(schoolIdOrCode, extraCode);
  const deleted = getDeletedSchools();

  const list = getSchools().filter((s) => {
    const sId = String(s.id || '').toUpperCase();
    const sCode = String(s.code || '').toUpperCase();
    return !deleted.includes(sId) && !deleted.includes(sCode);
  });
  saveSchools(list, false);

  // Send DELETE to server API
  fetch(`/api/schools/${encodeURIComponent(schoolIdOrCode)}`, { method: 'DELETE' }).catch(() => {});
  if (extraCode && extraCode !== schoolIdOrCode) {
    fetch(`/api/schools/${encodeURIComponent(extraCode)}`, { method: 'DELETE' }).catch(() => {});
  }

  // Push updated list with deleted markers to sync endpoint
  apiPost('/api/sync', { 
    schools: list,
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

// 2. Users
export function getUsers(): User[] {
  try {
    const raw = localStorage.getItem(USERS_KEY);
    let current: User[] = [];
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) current = parsed;
    }

    const recovered = recoverLegacyItems<User>('hodoorak_users', (u) => u.id || `${u.nationalId}_${u.schoolCode || ''}`);
    if (recovered.length > current.length) {
      current = mergeUsers(current, recovered);
      localStorage.setItem(USERS_KEY, JSON.stringify(current));
    }

    return current.length > 0 ? current : INITIAL_USERS;
  } catch {
    return INITIAL_USERS;
  }
}

export function saveUsers(users: User[], syncServer: boolean = true): void {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
  if (syncServer) {
    apiPost('/api/sync', { users });
  }
}

export function addUser(user: User): void {
  const list = getUsers();
  const idx = list.findIndex((u) => u.nationalId === user.nationalId && u.schoolCode === user.schoolCode);
  if (idx >= 0) {
    list[idx] = { ...list[idx], ...user };
  } else {
    list.push(user);
  }
  saveUsers(list, true);
  apiPost('/api/users', user);
}

export function updateUser(user: User): void {
  const list = getUsers();
  const idx = list.findIndex((u) => u.id === user.id);
  if (idx >= 0) {
    list[idx] = { ...list[idx], ...user };
  } else {
    list.push(user);
  }
  saveUsers(list, true);
  apiPost('/api/users', user);
}

export function deleteUser(userId: string): void {
  const list = getUsers().filter((u) => u.id !== userId);
  saveUsers(list, true);
  fetch(`/api/users/${encodeURIComponent(userId)}`, { method: 'DELETE' }).catch(() => {});
}

// 3. Attendances
export function getAttendances(): Attendance[] {
  try {
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

    return current;
  } catch {
    return [];
  }
}

export function saveAttendances(attendances: Attendance[], syncServer: boolean = true): void {
  localStorage.setItem(ATTENDANCES_KEY, JSON.stringify(attendances));
  if (syncServer) {
    apiPost('/api/attendances', attendances);
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
  const idx = list.findIndex((r) => r.id === req.id);
  if (idx >= 0) {
    list[idx] = req;
    saveCorrectionRequests(list, true);
  }
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
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveSystemNotifications(n: SystemNotification[], syncServer: boolean = true): void {
  localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(n));
  if (syncServer) {
    apiPost('/api/sync', { notifications: n });
  }
}

export function addSystemNotification(n: SystemNotification): void {
  const list = getSystemNotifications();
  list.unshift(n);
  saveSystemNotifications(list, true);
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
    return raw ? JSON.parse(raw) : null;
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

  localStorage.removeItem(SCHOOLS_KEY);
  localStorage.removeItem(USERS_KEY);
  localStorage.removeItem(ATTENDANCES_KEY);
  localStorage.removeItem(PERMISSIONS_KEY);
  localStorage.removeItem(BEHAVIOR_KEY);
  localStorage.removeItem(CORRECTIONS_KEY);
  localStorage.removeItem(PAYMENTS_KEY);
  localStorage.removeItem(NOTIFICATIONS_KEY);
  localStorage.removeItem(CURRENT_USER_KEY);
  localStorage.removeItem(ABSENCE_ACTIONS_KEY);
  window.location.reload();
}
