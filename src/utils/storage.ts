import { 
  School, User, Attendance, CorrectionRequest, 
  SubscriptionPaymentRequest, SystemNotification, 
  StudentPermission, StudentBehaviorLog, AdministrativeAbsenceAction 
} from '../types';
import { INITIAL_SCHOOLS, INITIAL_USERS, INITIAL_PERMISSIONS, INITIAL_BEHAVIOR_LOGS, generateInitialAttendances } from '../data/seedData';
import { getTodayDateString } from './academic';

const SCHOOLS_KEY = 'hodoorak_schools_prod_v2';
const USERS_KEY = 'hodoorak_users_prod_v2';
const ATTENDANCES_KEY = 'hodoorak_attendances_prod_v2';
const PERMISSIONS_KEY = 'hodoorak_permissions_prod_v2';
const BEHAVIOR_KEY = 'hodoorak_behavior_prod_v2';
const CORRECTIONS_KEY = 'hodoorak_corrections_prod_v2';
const PAYMENTS_KEY = 'hodoorak_payments_prod_v2';
const NOTIFICATIONS_KEY = 'hodoorak_notifications_prod_v2';
const CURRENT_USER_KEY = 'hodoorak_current_user_prod_v2';
const ABSENCE_ACTIONS_KEY = 'hodoorak_absence_actions_prod_v2';

// 1. Schools
export function getSchools(): School[] {
  try {
    const raw = localStorage.getItem(SCHOOLS_KEY);
    if (!raw) {
      saveSchools(INITIAL_SCHOOLS);
      return INITIAL_SCHOOLS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : INITIAL_SCHOOLS;
  } catch {
    return INITIAL_SCHOOLS;
  }
}


export function saveSchools(schools: School[]): void {
  localStorage.setItem(SCHOOLS_KEY, JSON.stringify(schools));
}

export function addSchool(school: School): void {
  const list = getSchools();
  const existing = list.findIndex((s) => s.code === school.code);
  if (existing >= 0) {
    list[existing] = school;
  } else {
    list.push(school);
  }
  saveSchools(list);
}

export function updateSchool(school: School): void {
  const list = getSchools();
  const idx = list.findIndex((s) => s.id === school.id || s.code === school.code);
  if (idx >= 0) {
    list[idx] = school;
    saveSchools(list);
  }
}

export function deleteSchool(schoolIdOrCode: string): void {
  const list = getSchools().filter((s) => s.id !== schoolIdOrCode && s.code !== schoolIdOrCode);
  saveSchools(list);
}

// 2. Users
export function getUsers(): User[] {
  try {
    const raw = localStorage.getItem(USERS_KEY);
    if (!raw) {
      saveUsers(INITIAL_USERS);
      return INITIAL_USERS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_USERS;
  } catch {
    return INITIAL_USERS;
  }
}

export function saveUsers(users: User[]): void {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

export function addUser(user: User): void {
  const list = getUsers();
  const idx = list.findIndex((u) => u.nationalId === user.nationalId && u.schoolCode === user.schoolCode);
  if (idx >= 0) {
    list[idx] = user;
  } else {
    list.push(user);
  }
  saveUsers(list);
}

export function updateUser(user: User): void {
  const list = getUsers();
  const idx = list.findIndex((u) => u.id === user.id);
  if (idx >= 0) {
    list[idx] = user;
    saveUsers(list);
  }
}

export function deleteUser(userId: string): void {
  const list = getUsers().filter((u) => u.id !== userId);
  saveUsers(list);
}

// 3. Attendances
export function getAttendances(): Attendance[] {
  try {
    const raw = localStorage.getItem(ATTENDANCES_KEY);
    if (!raw) {
      const users = getUsers();
      const initialAtt = generateInitialAttendances(users, 'RAYA-1448');
      saveAttendances(initialAtt);
      return initialAtt;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveAttendances(attendances: Attendance[]): void {
  localStorage.setItem(ATTENDANCES_KEY, JSON.stringify(attendances));
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
  saveAttendances(all);
}

// 3.5 Student Classroom Permissions (الاستئذان وتكرار الخروج من الحصة)
export function getPermissions(): StudentPermission[] {
  try {
    const raw = localStorage.getItem(PERMISSIONS_KEY);
    if (!raw) {
      savePermissions(INITIAL_PERMISSIONS);
      return INITIAL_PERMISSIONS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : INITIAL_PERMISSIONS;
  } catch {
    return INITIAL_PERMISSIONS;
  }
}

export function savePermissions(permissions: StudentPermission[]): void {
  localStorage.setItem(PERMISSIONS_KEY, JSON.stringify(permissions));
}

export function addPermission(perm: StudentPermission): void {
  const list = getPermissions();
  list.unshift(perm);
  savePermissions(list);
}

export function returnStudentPermission(permissionId: string, timeIn?: string): void {
  const list = getPermissions();
  const idx = list.findIndex((p) => p.id === permissionId);
  if (idx >= 0) {
    const perm = list[idx];
    const actualTimeIn = timeIn || new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit', hour12: false });
    perm.timeIn = actualTimeIn;
    
    // Calculate duration
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
    
    savePermissions(list);
  }
}

export function getPermissionsForStudent(studentId: string): StudentPermission[] {
  return getPermissions().filter((p) => p.studentId === studentId);
}

export function getStudentPermissionsToday(studentId: string, date?: string): StudentPermission[] {
  const targetDate = date || getTodayDateString();
  return getPermissions().filter((p) => p.studentId === studentId && p.date === targetDate);
}

// 3.8 Student Behavior Logs (سجل السلوك والمواظبة والدرجات التعويضية)
export function getBehaviorLogs(): StudentBehaviorLog[] {
  try {
    const raw = localStorage.getItem(BEHAVIOR_KEY);
    if (!raw) {
      saveBehaviorLogs(INITIAL_BEHAVIOR_LOGS);
      return INITIAL_BEHAVIOR_LOGS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : INITIAL_BEHAVIOR_LOGS;
  } catch {
    return INITIAL_BEHAVIOR_LOGS;
  }
}

export function saveBehaviorLogs(logs: StudentBehaviorLog[]): void {
  localStorage.setItem(BEHAVIOR_KEY, JSON.stringify(logs));
}

export function addBehaviorLog(log: StudentBehaviorLog): void {
  const list = getBehaviorLogs();
  list.unshift(log);
  saveBehaviorLogs(list);
}

export function deleteBehaviorLog(logId: string): void {
  const list = getBehaviorLogs().filter((b) => b.id !== logId);
  saveBehaviorLogs(list);
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

export function saveCorrectionRequests(reqs: CorrectionRequest[]): void {
  localStorage.setItem(CORRECTIONS_KEY, JSON.stringify(reqs));
}

export function addCorrectionRequest(req: CorrectionRequest): void {
  const list = getCorrectionRequests();
  list.unshift(req);
  saveCorrectionRequests(list);
}

export function updateCorrectionRequest(req: CorrectionRequest): void {
  const list = getCorrectionRequests();
  const idx = list.findIndex((r) => r.id === req.id);
  if (idx >= 0) {
    list[idx] = req;
    saveCorrectionRequests(list);
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

export function savePaymentRequests(reqs: SubscriptionPaymentRequest[]): void {
  localStorage.setItem(PAYMENTS_KEY, JSON.stringify(reqs));
}

export function addPaymentRequest(req: SubscriptionPaymentRequest): void {
  const list = getPaymentRequests();
  list.unshift(req);
  savePaymentRequests(list);
}

export function updatePaymentRequest(req: SubscriptionPaymentRequest): void {
  const list = getPaymentRequests();
  const idx = list.findIndex((r) => r.id === req.id);
  if (idx >= 0) {
    list[idx] = req;
    savePaymentRequests(list);
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

export function saveSystemNotifications(n: SystemNotification[]): void {
  localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(n));
}

export function addSystemNotification(n: SystemNotification): void {
  const list = getSystemNotifications();
  list.unshift(n);
  saveSystemNotifications(list);
}

export function updateUserAvatar(userId: string, avatarDataUrl: string): void {
  const users = getUsers();
  const idx = users.findIndex((u) => u.id === userId);
  if (idx >= 0) {
    users[idx].avatar = avatarDataUrl;
    saveUsers(users);

    const currentUser = getCurrentUser();
    if (currentUser && currentUser.id === userId) {
      currentUser.avatar = avatarDataUrl;
      saveCurrentUserSession(currentUser);
    }
  }
}

// 6.5 Administrative Absence Actions (إجراءات الإنذار وتكرار الغياب 5 أيام)
export function getAbsenceActions(): AdministrativeAbsenceAction[] {
  try {
    const raw = localStorage.getItem(ABSENCE_ACTIONS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveAbsenceActions(actions: AdministrativeAbsenceAction[]): void {
  localStorage.setItem(ABSENCE_ACTIONS_KEY, JSON.stringify(actions));
}

export function addAbsenceAction(action: AdministrativeAbsenceAction): void {
  const list = getAbsenceActions();
  list.unshift(action);
  saveAbsenceActions(list);

  // If resetCycle is requested, update user's lastAbsenceResetDate
  if (action.resetCycle) {
    const users = getUsers();
    const idx = users.findIndex((u) => u.id === action.studentId);
    if (idx >= 0) {
      users[idx].lastAbsenceResetDate = action.date || getTodayDateString();
      saveUsers(users);
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

// 8. Clean Production Reset (بدء تشغيل إنتاجي نظيف بدون بيانات وسجلات تجريبية)
export function cleanResetToEmptyProductionData(): void {
  // Clear all dynamic attendances, permissions, logs, corrections, absence actions
  saveAttendances([]);
  savePermissions([]);
  saveBehaviorLogs([]);
  saveCorrectionRequests([]);
  saveAbsenceActions([]);
  savePaymentRequests([]);
  saveSystemNotifications([]);

  // Reset users' lastAbsenceResetDate
  const users = getUsers().map((u) => ({
    ...u,
    lastAbsenceResetDate: undefined,
  }));
  saveUsers(users);

  window.location.reload();
}

// 9. Reset All
export function resetAllDataToSeed(): void {
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
