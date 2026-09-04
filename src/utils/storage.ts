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

// 0. Full Sync with Server
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
    const res = await fetch('/api/sync');
    if (res.ok) {
      const result = await res.json();
      if (result.success && result.data) {
        const d = result.data;
        if (Array.isArray(d.schools)) saveSchools(d.schools, false);
        if (Array.isArray(d.users)) saveUsers(d.users, false);
        if (Array.isArray(d.attendances)) saveAttendances(d.attendances, false);
        if (Array.isArray(d.permissions)) savePermissions(d.permissions, false);
        if (Array.isArray(d.behavior_logs)) saveBehaviorLogs(d.behavior_logs, false);
        if (Array.isArray(d.absence_actions)) saveAbsenceActions(d.absence_actions, false);
        if (Array.isArray(d.corrections)) saveCorrectionRequests(d.corrections, false);
        if (Array.isArray(d.payments)) savePaymentRequests(d.payments, false);
        if (Array.isArray(d.notifications)) saveSystemNotifications(d.notifications, false);
        return d;
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
    const raw = localStorage.getItem(SCHOOLS_KEY);
    if (!raw) {
      saveSchools(INITIAL_SCHOOLS, false);
      return INITIAL_SCHOOLS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : INITIAL_SCHOOLS;
  } catch {
    return INITIAL_SCHOOLS;
  }
}

export function saveSchools(schools: School[], syncServer: boolean = true): void {
  localStorage.setItem(SCHOOLS_KEY, JSON.stringify(schools));
  if (syncServer) {
    apiPost('/api/sync', { schools });
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
    list[idx] = school;
    saveSchools(list, true);
    apiPost('/api/schools', school);
  }
}

export function deleteSchool(schoolIdOrCode: string): void {
  const list = getSchools().filter((s) => s.id !== schoolIdOrCode && s.code !== schoolIdOrCode);
  saveSchools(list, true);
  fetch(`/api/schools/${encodeURIComponent(schoolIdOrCode)}`, { method: 'DELETE' }).catch(() => {});
}

// 2. Users
export function getUsers(): User[] {
  try {
    const raw = localStorage.getItem(USERS_KEY);
    if (!raw) {
      saveUsers(INITIAL_USERS, false);
      return INITIAL_USERS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_USERS;
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
    list[idx] = user;
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
    list[idx] = user;
    saveUsers(list, true);
    apiPost('/api/users', user);
  }
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
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
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
