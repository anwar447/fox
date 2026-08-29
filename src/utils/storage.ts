import { School, User, Attendance, Excuse, Emergency, NoorComparison, SchoolClassSection, BehaviorDeduction, BehaviorNote } from '../types';
import { generateInitialData } from '../data/seedData';
import { getTodayDateString } from './academic';

const STORAGE_KEYS = {
  SCHOOLS: 'hodork_schools_v1',
  USERS: 'hodork_users_v1',
  ATTENDANCES: 'hodork_attendances_v1',
  EXCUSES: 'hodork_excuses_v1',
  EMERGENCIES: 'hodork_emergencies_v1',
  CURRENT_USER: 'hodork_current_user_v1',
  SELECTED_SCHOOL_CODE: 'hodork_selected_school_v1',
  NOOR_COMPARISONS: 'hodork_noor_sync_v1',
  GPS_SIM_OVERRIDE: 'hodork_gps_sim_v1',
  BEHAVIOR_DEDUCTIONS: 'hodork_behavior_deductions_v1',
  BEHAVIOR_NOTES: 'hodork_behavior_notes_v1',
};

export function initializeStorageIfEmpty(): void {
  try {
    const existingSchools = localStorage.getItem(STORAGE_KEYS.SCHOOLS);
    const existingUsers = localStorage.getItem(STORAGE_KEYS.USERS);
    
    if (!existingSchools || !existingUsers) {
      const initial = generateInitialData();
      localStorage.setItem(STORAGE_KEYS.SCHOOLS, JSON.stringify(initial.schools));
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(initial.users));
      localStorage.setItem(STORAGE_KEYS.ATTENDANCES, JSON.stringify(initial.attendances));
      localStorage.setItem(STORAGE_KEYS.EXCUSES, JSON.stringify(initial.excuses));
      localStorage.setItem(STORAGE_KEYS.EMERGENCIES, JSON.stringify(initial.emergencies));
      localStorage.setItem(STORAGE_KEYS.BEHAVIOR_DEDUCTIONS, JSON.stringify([]));
      localStorage.setItem(STORAGE_KEYS.BEHAVIOR_NOTES, JSON.stringify([]));
      
      // Default to null user (Landing Page)
      localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
      localStorage.removeItem(STORAGE_KEYS.SELECTED_SCHOOL_CODE);
    }
  } catch (err) {
    console.error('Failed to initialize storage:', err);
  }
}

export function resetToDefaultSeed(): void {
  const initial = generateInitialData();
  localStorage.setItem(STORAGE_KEYS.SCHOOLS, JSON.stringify(initial.schools));
  localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(initial.users));
  localStorage.setItem(STORAGE_KEYS.ATTENDANCES, JSON.stringify(initial.attendances));
  localStorage.setItem(STORAGE_KEYS.EXCUSES, JSON.stringify(initial.excuses));
  localStorage.setItem(STORAGE_KEYS.EMERGENCIES, JSON.stringify(initial.emergencies));
  localStorage.setItem(STORAGE_KEYS.BEHAVIOR_DEDUCTIONS, JSON.stringify([]));
  localStorage.setItem(STORAGE_KEYS.BEHAVIOR_NOTES, JSON.stringify([]));
  localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
  localStorage.removeItem(STORAGE_KEYS.SELECTED_SCHOOL_CODE);
}

/**
 * Cleans all demo/test attendances, excuses, behavior notes, and student records for a clean school start
 */
export function wipeSchoolStudentData(schoolCode: string): void {
  // 1. Remove student users belonging to this school, keep admin and teachers if needed
  const users = getUsers().filter((u) => !(u.role === 'student' && u.schoolCode === schoolCode));
  saveUsers(users);

  // 2. Remove all attendances for this school
  const attendances = getAttendances().filter((a) => a.schoolCode !== schoolCode);
  saveAttendances(attendances);

  // 3. Remove excuses
  const excuses = getExcuses().filter((e) => e.schoolCode !== schoolCode);
  saveExcuses(excuses);

  // 4. Remove behavior records
  const deductions = getBehaviorDeductions().filter((d) => d.schoolCode !== schoolCode);
  saveBehaviorDeductions(deductions);

  const notes = getBehaviorNotes().filter((n) => n.schoolCode !== schoolCode);
  saveBehaviorNotes(notes);
}

/**
 * Resets the entire system into a pristine clean state with only the founder/admin account
 */
export function wipeAllToPristineProduction(customAdminName = 'مدير النظام', customSchoolName = 'المدرسة الرئيسية'): void {
  const cleanSchool: School = {
    id: 'sch-primary-1',
    name: customSchoolName,
    code: 'SCH-1448',
    logo: 'https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=150&auto=format&fit=crop&q=80',
    city: 'الرياض',
    educationOffice: 'مكتب التعليم',
    type: 'intermediate',
    contact: '0500000000',
    managerName: customAdminName,
    createdBy: 'usr-admin-primary',
    subscriptionPlan: 'yearly',
    subscriptionStartDate: '2026-01-01',
    subscriptionExpiryDate: '2028-08-01',
    maxStudents: 500,
    createdAt: '2026-01-01',
    customClasses: [
      { id: 'c-1', className: 'الأول المتوسط', sections: ['1', '2'] },
      { id: 'c-2', className: 'الثاني المتوسط', sections: ['1', '2'] },
      { id: 'c-3', className: 'الثالث المتوسط', sections: ['1', '2'] },
    ],
    timings: {
      tabour: '06:45',
      firstPeriod: '07:00',
      lateAfter: '07:00',
      absentAfter: '07:30',
      breakTime: '09:30',
      dismissal: '13:00',
    },
    geofence: {
      lat: 24.7136,
      lng: 46.6753,
      radius: 300,
      addressName: 'المبنى المدرسي',
    },
  };

  const cleanAdminUser: User = {
    id: 'usr-admin-primary',
    name: customAdminName,
    nationalId: '1000000000',
    password: 'admin',
    role: 'employee',
    schoolCode: cleanSchool.code,
    mobile: '0500000000',
    email: 'admin@school.edu.sa',
    photoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  };

  const superAdminUser: User = {
    id: 'usr-super-admin',
    name: 'المشرف العام المركزي',
    nationalId: '9999999999',
    password: 'super',
    role: 'superadmin',
    schoolCode: 'ALL',
    mobile: '0509999999',
    email: 'superadmin@hodork.sa',
    photoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
  };

  localStorage.setItem(STORAGE_KEYS.SCHOOLS, JSON.stringify([cleanSchool]));
  localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify([superAdminUser, cleanAdminUser]));
  localStorage.setItem(STORAGE_KEYS.ATTENDANCES, JSON.stringify([]));
  localStorage.setItem(STORAGE_KEYS.EXCUSES, JSON.stringify([]));
  localStorage.setItem(STORAGE_KEYS.EMERGENCIES, JSON.stringify([]));
  localStorage.setItem(STORAGE_KEYS.BEHAVIOR_DEDUCTIONS, JSON.stringify([]));
  localStorage.setItem(STORAGE_KEYS.BEHAVIOR_NOTES, JSON.stringify([]));
  localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(cleanAdminUser));
  localStorage.setItem(STORAGE_KEYS.SELECTED_SCHOOL_CODE, cleanSchool.code);
}

// Schools
export function getSchools(): School[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SCHOOLS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveSchools(schools: School[]): void {
  localStorage.setItem(STORAGE_KEYS.SCHOOLS, JSON.stringify(schools));
}

export function saveSchool(school: School): void {
  const list = getSchools();
  const index = list.findIndex((s) => s.id === school.id || s.code === school.code);
  if (index >= 0) {
    list[index] = school;
  } else {
    list.push(school);
  }
  saveSchools(list);
}

// Users
export function getUsers(): User[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.USERS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveUsers(users: User[]): void {
  localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
}

export function saveUser(user: User): void {
  const list = getUsers();
  const index = list.findIndex((u) => u.id === user.id || u.nationalId === user.nationalId);
  if (index >= 0) {
    list[index] = { ...list[index], ...user };
  } else {
    list.push(user);
  }
  saveUsers(list);
}

export function updateUserPassword(nationalId: string, newPass: string): boolean {
  const list = getUsers();
  const user = list.find((u) => u.nationalId === nationalId);
  if (user) {
    user.password = newPass;
    saveUsers(list);
    return true;
  }
  return false;
}

// Current User & Session
export function getCurrentUser(): User | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setCurrentUser(user: User | null): void {
  if (user) {
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
  } else {
    localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
  }
}

export function getSelectedSchoolCode(): string {
  return localStorage.getItem(STORAGE_KEYS.SELECTED_SCHOOL_CODE) || 'RAYA-1448';
}

export function setSelectedSchoolCode(code: string): void {
  localStorage.setItem(STORAGE_KEYS.SELECTED_SCHOOL_CODE, code);
}

// Attendances
export function getAttendances(): Attendance[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ATTENDANCES);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveAttendances(attendances: Attendance[]): void {
  localStorage.setItem(STORAGE_KEYS.ATTENDANCES, JSON.stringify(attendances));
}

export function recordStudentSelfCheckIn(
  studentId: string,
  schoolCode: string,
  timeHHMMSS: string
): Attendance {
  const list = getAttendances();
  const today = getTodayDateString();
  const users = getUsers();
  const student = users.find((u) => u.id === studentId || u.nationalId === studentId);

  let record = list.find(
    (a) => (a.studentId === studentId || a.nationalId === student?.nationalId) && a.date === today
  );

  if (record) {
    record.selfCheckTime = timeHHMMSS;
    // Check if previously marked absent by teacher -> turns into Truant check!
    if (record.teacherMark === 'absent') {
      record.isTruant = true;
      record.finalStatus = 'absent';
    } else {
      record.finalStatus = record.teacherMark || 'present';
      record.isTruant = false;
    }
    record.updatedAt = new Date().toISOString();
  } else {
    record = {
      id: `att-${studentId}-${today}`,
      studentId: student?.id || studentId,
      studentName: student?.name || 'طالب',
      nationalId: student?.nationalId || studentId,
      schoolCode: schoolCode,
      className: student?.className || 'الأول المتوسط',
      sectionName: student?.sectionName || 'أ',
      date: today,
      selfCheckTime: timeHHMMSS,
      teacherMark: null,
      finalStatus: 'present',
      isTruant: false,
      updatedAt: new Date().toISOString(),
    };
    list.push(record);
  }

  saveAttendances(list);
  return record;
}

export function updateTeacherAttendance(
  studentId: string,
  teacherMark: 'present' | 'absent' | 'late' | 'excused',
  schoolCode: string,
  className: string,
  sectionName: string,
  dateStr?: string
): Attendance {
  const list = getAttendances();
  const today = dateStr || getTodayDateString();
  const users = getUsers();
  const student = users.find((u) => u.id === studentId || u.nationalId === studentId);

  let record = list.find(
    (a) => (a.studentId === studentId || a.nationalId === student?.nationalId) && a.date === today
  );

  if (record) {
    record.teacherMark = teacherMark;
    // Truant logic: student checked in on mobile + teacher marked absent
    if (record.selfCheckTime && teacherMark === 'absent') {
      record.isTruant = true;
      record.finalStatus = 'absent';
    } else {
      record.isTruant = false;
      record.finalStatus = teacherMark;
    }
    record.updatedAt = new Date().toISOString();
  } else {
    record = {
      id: `att-${studentId}-${today}`,
      studentId: student?.id || studentId,
      studentName: student?.name || 'طالب',
      nationalId: student?.nationalId || studentId,
      schoolCode: schoolCode,
      className: className,
      sectionName: sectionName,
      date: today,
      selfCheckTime: null,
      teacherMark: teacherMark,
      finalStatus: teacherMark,
      isTruant: false,
      updatedAt: new Date().toISOString(),
    };
    list.push(record);
  }

  saveAttendances(list);
  return record;
}

export function bulkUpdateTeacherAttendance(
  students: { id: string; className: string; sectionName: string }[],
  teacherMark: 'present' | 'absent',
  schoolCode: string,
  dateStr?: string
): void {
  students.forEach((std) => {
    updateTeacherAttendance(std.id, teacherMark, schoolCode, std.className, std.sectionName, dateStr);
  });
}

// Excuses
export function getExcuses(): Excuse[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.EXCUSES);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveExcuses(excuses: Excuse[]): void {
  localStorage.setItem(STORAGE_KEYS.EXCUSES, JSON.stringify(excuses));
}

export function addExcuse(excuse: Omit<Excuse, 'id' | 'submittedAt'>): Excuse {
  const list = getExcuses();
  const newExcuse: Excuse = {
    ...excuse,
    id: `exc-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    submittedAt: new Date().toLocaleString('ar-SA'),
  };
  list.unshift(newExcuse);
  saveExcuses(list);
  return newExcuse;
}

export function updateExcuseStatus(
  id: string,
  status: 'approved' | 'rejected',
  rejectionReason?: string,
  reviewedBy?: string
): void {
  const list = getExcuses();
  const item = list.find((e) => e.id === id);
  if (item) {
    item.status = status;
    if (rejectionReason) item.rejectionReason = rejectionReason;
    if (reviewedBy) item.reviewedBy = reviewedBy;
    item.reviewedAt = new Date().toLocaleString('ar-SA');
    saveExcuses(list);
    
    // Update attendance record for that date
    const attendances = getAttendances();
    const att = attendances.find((a) => (a.studentId === item.studentId || a.nationalId === item.nationalId) && a.date === item.date);
    if (att) {
      if (status === 'approved') {
        att.finalStatus = 'excused';
        att.teacherMark = 'excused';
        att.excuseReason = item.description;
        att.isTruant = false;
      } else if (status === 'rejected') {
        if (att.finalStatus === 'excused') {
          att.finalStatus = 'absent';
        }
      }
      saveAttendances(attendances);
    }
  }
}

// Emergencies
export function getEmergencies(): Emergency[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.EMERGENCIES);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveEmergencies(emergencies: Emergency[]): void {
  localStorage.setItem(STORAGE_KEYS.EMERGENCIES, JSON.stringify(emergencies));
}

export function broadcastEmergency(emergency: Omit<Emergency, 'id' | 'createdAt' | 'responses'>): Emergency {
  const list = getEmergencies();
  const newEmg: Emergency = {
    ...emergency,
    id: `emg-${Date.now()}`,
    createdAt: new Date().toLocaleString('ar-SA'),
    responses: [],
  };
  list.unshift(newEmg);
  saveEmergencies(list);
  return newEmg;
}

export function respondToEmergency(
  emergencyId: string,
  userId: string,
  userName: string,
  role: any,
  status: 'safe' | 'needs_help' | 'acknowledged',
  note?: string
): void {
  const list = getEmergencies();
  const emg = list.find((e) => e.id === emergencyId);
  if (emg) {
    const existingIndex = emg.responses.findIndex((r) => r.userId === userId);
    const resp = {
      userId,
      userName,
      role,
      status,
      respondedAt: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
      note,
    };
    if (existingIndex >= 0) {
      emg.responses[existingIndex] = resp;
    } else {
      emg.responses.push(resp);
    }
    saveEmergencies(list);
  }
}

// Noor Comparison & Daily Manual Count
export function getNoorLogs(): NoorComparison[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.NOOR_COMPARISONS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function getNoorDailyManualCount(schoolCode: string, date: string): number {
  try {
    const key = `hodork_noor_daily_${schoolCode}_${date}`;
    const val = localStorage.getItem(key);
    return val !== null ? parseInt(val, 10) : 0;
  } catch {
    return 0;
  }
}

export function saveNoorDailyManualCount(schoolCode: string, date: string, count: number): void {
  const key = `hodork_noor_daily_${schoolCode}_${date}`;
  localStorage.setItem(key, String(count));
}

// School Classes & Sections Management
export function getSchoolClasses(schoolCode: string): SchoolClassSection[] {
  const schools = getSchools();
  const school = schools.find((s) => s.code === schoolCode);
  if (school && school.customClasses && school.customClasses.length > 0) {
    return school.customClasses;
  }

  // Default fallback classes based on school type
  if (school?.type === 'secondary') {
    return [
      { id: 'cls-1', className: 'الأول الثانوي', classCode: '1314', sections: ['1', '2', '3', '4'] },
      { id: 'cls-2', className: 'الثاني الثانوي', classCode: '1315', sections: ['1', '2', '3'] },
      { id: 'cls-3', className: 'الثالث الثانوي', classCode: '1316', sections: ['1', '2', '3'] },
    ];
  } else if (school?.type === 'elementary') {
    return [
      { id: 'cls-1', className: 'الأول الابتدائي', sections: ['1', '2'] },
      { id: 'cls-2', className: 'الثاني الابتدائي', sections: ['1', '2'] },
      { id: 'cls-3', className: 'الثالث الابتدائي', sections: ['1', '2'] },
      { id: 'cls-4', className: 'الرابع الابتدائي', sections: ['1', '2'] },
      { id: 'cls-5', className: 'الخامس الابتدائي', sections: ['1', '2'] },
      { id: 'cls-6', className: 'السادس الابتدائي', sections: ['1', '2'] },
    ];
  } else {
    return [
      { id: 'cls-1', className: 'الأول المتوسط', sections: ['1', '2', '3', '4'] },
      { id: 'cls-2', className: 'الثاني المتوسط', sections: ['1', '2', '3'] },
      { id: 'cls-3', className: 'الثالث المتوسط', sections: ['1', '2', '3'] },
    ];
  }
}

export function saveSchoolClasses(schoolCode: string, classes: SchoolClassSection[]): void {
  const schools = getSchools();
  const school = schools.find((s) => s.code === schoolCode);
  if (school) {
    school.customClasses = classes;
    saveSchools(schools);
  }
}

// Batch Import Students from Excel
export function importStudentsBatch(
  schoolCode: string,
  newStudents: Array<{
    nationalId: string;
    name: string;
    className: string;
    sectionName: string;
    parentMobile?: string;
  }>
): { addedCount: number; updatedCount: number } {
  const users = getUsers();
  const today = getTodayDateString();
  const attendances = getAttendances();

  let addedCount = 0;
  let updatedCount = 0;

  // Retrieve current school classes
  const existingClasses = getSchoolClasses(schoolCode);
  const classesList: SchoolClassSection[] = existingClasses.map((c) => ({
    ...c,
    sections: [...c.sections],
  }));

  // Helper to match or create class accurately
  const getOrCreateClass = (rawClassName: string): string => {
    const trimmed = rawClassName.trim();
    // 1. Direct classCode match
    const matchByCode = classesList.find((c) => c.classCode && (c.classCode === trimmed || c.classCode.toLowerCase() === trimmed.toLowerCase()));
    if (matchByCode) return matchByCode.className;

    // 2. Direct className match
    const matchByName = classesList.find((c) => c.className === trimmed || c.className.toLowerCase() === trimmed.toLowerCase());
    if (matchByName) return matchByName.className;

    // 3. Partial match
    const matchPartial = classesList.find((c) => c.className.includes(trimmed) || trimmed.includes(c.className));
    if (matchPartial) return matchPartial.className;

    // 4. Create new class entry
    classesList.push({
      id: `cls-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      className: trimmed,
      sections: ['1'],
    });
    return trimmed;
  };

  newStudents.forEach((st) => {
    const targetClassName = getOrCreateClass(st.className);
    const targetSectionName = st.sectionName ? String(st.sectionName).trim() : '1';

    // Ensure section is registered in class
    const clsObj = classesList.find((c) => c.className === targetClassName);
    if (clsObj && !clsObj.sections.includes(targetSectionName)) {
      clsObj.sections.push(targetSectionName);
      clsObj.sections.sort();
    }

    const existingIndex = users.findIndex(
      (u) => u.nationalId === st.nationalId || (u.name === st.name && (u.schoolCode === schoolCode || u.schoolCode === 'RAYA-1448'))
    );

    const pass = st.nationalId.length >= 4 ? st.nationalId.slice(-4) : '1234';

    if (existingIndex >= 0) {
      users[existingIndex].name = st.name;
      users[existingIndex].className = targetClassName;
      users[existingIndex].sectionName = targetSectionName;
      if (st.parentMobile) users[existingIndex].parentMobile = st.parentMobile;
      users[existingIndex].schoolCode = schoolCode;
      updatedCount++;
    } else {
      const newUser: User = {
        id: `usr-std-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        nationalId: st.nationalId,
        name: st.name,
        mobile: st.parentMobile || '0500000000',
        parentMobile: st.parentMobile || '',
        password: pass,
        role: 'student',
        schoolCode: schoolCode,
        className: targetClassName,
        sectionName: targetSectionName,
      };
      users.push(newUser);
      addedCount++;

      // Create today's default attendance record if not exists
      const existingAtt = attendances.find((a) => a.nationalId === st.nationalId && a.date === today);
      if (!existingAtt) {
        attendances.push({
          id: `att-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          studentId: newUser.id,
          studentName: newUser.name,
          nationalId: newUser.nationalId,
          schoolCode: schoolCode,
          className: newUser.className || '',
          sectionName: newUser.sectionName || '1',
          date: today,
          selfCheckTime: null,
          teacherMark: null,
          finalStatus: 'absent',
          isTruant: false,
          parentMobile: newUser.parentMobile,
          updatedAt: new Date().toISOString(),
        });
      }
    }
  });

  saveSchoolClasses(schoolCode, classesList);
  saveUsers(users);
  saveAttendances(attendances);

  return { addedCount, updatedCount };
}

// SuperAdmin operations
export function deleteSchool(schoolId: string): void {
  const schools = getSchools().filter((s) => s.id !== schoolId && s.code !== schoolId);
  saveSchools(schools);
}

export function setSchoolSubscriptionFree(schoolId: string): void {
  const schools = getSchools();
  const school = schools.find((s) => s.id === schoolId || s.code === schoolId);
  if (school) {
    school.subscriptionPlan = 'free_forever';
    school.subscriptionExpiryDate = '2099-12-31';
    school.maxStudents = 9999;
    school.isSuspended = false;
    school.notes = 'ترخيص مجاني دائم معتمد من الإدارة العامة للمنظومة';
    saveSchools(schools);
  }
}

export function saveNoorLog(log: NoorComparison): void {
  const list = getNoorLogs();
  const idx = list.findIndex(
    (l) => l.schoolCode === log.schoolCode && l.date === log.date && l.className === log.className && l.sectionName === log.sectionName
  );
  if (idx >= 0) {
    list[idx] = log;
  } else {
    list.push(log);
  }
  localStorage.setItem(STORAGE_KEYS.NOOR_COMPARISONS, JSON.stringify(list));
}

// GPS Simulation State
export function getGpsSimulationState(): 'inside' | 'outside' | 'real_gps' {
  return (localStorage.getItem(STORAGE_KEYS.GPS_SIM_OVERRIDE) as any) || 'inside';
}

export function setGpsSimulationState(state: 'inside' | 'outside' | 'real_gps'): void {
  localStorage.setItem(STORAGE_KEYS.GPS_SIM_OVERRIDE, state);
}

export function updateUserProfilePhoto(userId: string, photoUrl: string): void {
  const users = getUsers();
  const user = users.find((u) => u.id === userId);
  if (user) {
    user.photoUrl = photoUrl;
    saveUsers(users);

    const curr = getCurrentUser();
    if (curr && curr.id === userId) {
      curr.photoUrl = photoUrl;
      setCurrentUser(curr);
    }

    // Also update today's attendance record photo
    const attendances = getAttendances();
    attendances.forEach((att) => {
      if (att.studentId === userId || att.nationalId === user.nationalId) {
        att.photoUrl = photoUrl;
      }
    });
    saveAttendances(attendances);
  }
}

// ==========================================
// Behavior & Discipline System (100 Points)
// ==========================================

export function getBehaviorDeductions(): BehaviorDeduction[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.BEHAVIOR_DEDUCTIONS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveBehaviorDeductions(deductions: BehaviorDeduction[]): void {
  localStorage.setItem(STORAGE_KEYS.BEHAVIOR_DEDUCTIONS, JSON.stringify(deductions));
}

export function addBehaviorDeduction(deduction: Omit<BehaviorDeduction, 'id' | 'createdAt'>): BehaviorDeduction {
  const list = getBehaviorDeductions();
  const newDeduction: BehaviorDeduction = {
    ...deduction,
    id: `beh-ded-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    createdAt: new Date().toISOString(),
  };
  list.unshift(newDeduction);
  saveBehaviorDeductions(list);
  return newDeduction;
}

export function deleteBehaviorDeduction(id: string): void {
  const list = getBehaviorDeductions().filter((d) => d.id !== id);
  saveBehaviorDeductions(list);
}

// Teacher Behavior Notes
export function getBehaviorNotes(): BehaviorNote[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.BEHAVIOR_NOTES);
    if (raw) return JSON.parse(raw);
    
    // Default initial seed note for realistic preview
    const initialNotes: BehaviorNote[] = [
      {
        id: 'note-seed-1',
        studentId: 'std-seed-3',
        studentNationalId: '1000472203',
        studentName: 'فيصل عمر إبراهيم الدوسري',
        schoolCode: 'RAYA-1448',
        className: 'الأول المتوسط',
        sectionName: 'أ',
        teacherId: 'teacher-raya-1',
        teacherName: 'أ. فهد ناصر العتيبي',
        category: 'classroom_disruption',
        categoryLabel: 'إثارة الفوضى أثناء الحصة الدراسية',
        description: 'تكرار الحديث الجانبي مع الزملاء ومقاطعة شرح المعلم بعد التنبيه الأول.',
        date: getTodayDateString(),
        createdAt: new Date(Date.now() - 3600000).toISOString(),
        status: 'pending',
      }
    ];
    localStorage.setItem(STORAGE_KEYS.BEHAVIOR_NOTES, JSON.stringify(initialNotes));
    return initialNotes;
  } catch {
    return [];
  }
}

export function saveBehaviorNotes(notes: BehaviorNote[]): void {
  localStorage.setItem(STORAGE_KEYS.BEHAVIOR_NOTES, JSON.stringify(notes));
}

export function addBehaviorNote(note: Omit<BehaviorNote, 'id' | 'createdAt' | 'status'>): BehaviorNote {
  const list = getBehaviorNotes();
  const newNote: BehaviorNote = {
    ...note,
    id: `bn-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    status: 'pending',
    createdAt: new Date().toISOString(),
  };
  list.unshift(newNote);
  saveBehaviorNotes(list);
  return newNote;
}

export function resolveBehaviorNote(
  noteId: string,
  resolution: {
    status: 'resolved_with_deduction' | 'resolved_warning_only' | 'dismissed';
    deductedPoints?: number;
    adminDecisionNote?: string;
    resolvedBy: string;
  }
): void {
  const notes = getBehaviorNotes();
  const note = notes.find((n) => n.id === noteId);
  if (note) {
    note.status = resolution.status;
    note.adminDecisionNote = resolution.adminDecisionNote;
    note.deductedPoints = resolution.deductedPoints;
    note.resolvedBy = resolution.resolvedBy;
    note.resolvedAt = new Date().toISOString();
    saveBehaviorNotes(notes);

    // If deduction approved, record in BehaviorDeduction
    if (resolution.status === 'resolved_with_deduction' && resolution.deductedPoints && resolution.deductedPoints > 0) {
      addBehaviorDeduction({
        studentId: note.studentId,
        studentNationalId: note.studentNationalId,
        studentName: note.studentName,
        schoolCode: note.schoolCode,
        className: note.className,
        sectionName: note.sectionName,
        type: 'teacher_note_approved',
        points: resolution.deductedPoints,
        reason: `${note.categoryLabel}: ${note.description}${resolution.adminDecisionNote ? ` (قرار الإدارة: ${resolution.adminDecisionNote})` : ''}`,
        date: getTodayDateString(),
        recordedBy: resolution.resolvedBy,
        teacherNoteId: note.id,
        notifiedParent: true,
      });
    }
  }
}

/**
 * Calculates current student behavior score out of 100
 * Base: 100 points
 * Automated deduction: -1 point per late day
 * Manual/Administrative deduction: points from deductions records
 */
export function calculateStudentBehaviorScore(
  studentId: string,
  studentNationalId: string,
  schoolCode: string
): {
  baseScore: number;
  totalScore: number;
  currentScore: number;
  tardinessDays: number;
  tardinessDeductions: number;
  manualDeductions: BehaviorDeduction[];
  manualDeductionsList: BehaviorDeduction[];
  manualDeductionPoints: number;
  manualDeductionsTotal: number;
  totalDeductions: number;
} {
  const attendances = getAttendances();
  const allDeductions = getBehaviorDeductions();

  // Find tardiness records (marked late)
  const tardinessRecords = attendances.filter(
    (a) =>
      (a.studentId === studentId || a.nationalId === studentNationalId) &&
      (a.schoolCode === schoolCode || schoolCode === 'ALL') &&
      a.finalStatus === 'late'
  );
  const tardinessDays = tardinessRecords.length;
  const tardinessDeductions = tardinessDays * 1; // -1 pt for each late day

  // Find manual or teacher-approved deductions
  const studentDeductions = allDeductions.filter(
    (d) =>
      (d.studentId === studentId || d.studentNationalId === studentNationalId) &&
      (d.schoolCode === schoolCode || schoolCode === 'ALL')
  );

  const manualDeductionPoints = studentDeductions.reduce((sum, d) => sum + (d.points || 0), 0);
  const totalDeductions = tardinessDeductions + manualDeductionPoints;
  const totalScore = Math.max(0, 100 - totalDeductions);

  return {
    baseScore: 100,
    totalScore,
    currentScore: totalScore,
    tardinessDays,
    tardinessDeductions,
    manualDeductions: studentDeductions,
    manualDeductionsList: studentDeductions,
    manualDeductionPoints,
    manualDeductionsTotal: manualDeductionPoints,
    totalDeductions,
  };
}

// ==========================================
// Student Transfer, Promotion, and Deletion
// ==========================================

export function transferStudentClass(
  studentId: string,
  newClassName: string,
  newSectionName: string
): boolean {
  const users = getUsers();
  const student = users.find((u) => u.id === studentId || u.nationalId === studentId);
  if (student && student.role === 'student') {
    student.className = newClassName;
    student.sectionName = newSectionName;
    saveUsers(users);

    // Also update today's attendance record
    const today = getTodayDateString();
    const attendances = getAttendances();
    const todayAtt = attendances.find((a) => (a.studentId === student.id || a.nationalId === student.nationalId) && a.date === today);
    if (todayAtt) {
      todayAtt.className = newClassName;
      todayAtt.sectionName = newSectionName;
      saveAttendances(attendances);
    }
    return true;
  }
  return false;
}

export function deleteStudent(studentIdOrNationalId: string): boolean {
  const users = getUsers();
  const index = users.findIndex((u) => u.id === studentIdOrNationalId || u.nationalId === studentIdOrNationalId);
  if (index >= 0) {
    const student = users[index];
    users.splice(index, 1);
    saveUsers(users);

    // Clean up attendance records for this student
    const attendances = getAttendances().filter((a) => a.studentId !== student.id && a.nationalId !== student.nationalId);
    saveAttendances(attendances);

    // Clean up behavior deductions
    const deductions = getBehaviorDeductions().filter((d) => d.studentId !== student.id && d.studentNationalId !== student.nationalId);
    saveBehaviorDeductions(deductions);

    return true;
  }
  return false;
}

/**
 * Academic Year Progression / Promotion Rule Engine
 * Moves students to the next grade keeping their section intact.
 */
export const GRADE_PROGRESSION_MAP: Record<string, string> = {
  // Intermediate (المتوسطة)
  'الأول المتوسط': 'الثاني المتوسط',
  'الثاني المتوسط': 'الثالث المتوسط',
  'الثالث المتوسط': 'خريج المرحلة المتوسطة',

  // Secondary (الثانوية)
  'الأول الثانوي': 'الثاني الثانوي',
  'الثاني الثانوي': 'الثالث الثانوي',
  'الثالث الثانوي': 'خريج المرحلة الثانوية',

  // Elementary (الابتدائية)
  'الأول الابتدائي': 'الثاني الابتدائي',
  'الثاني الابتدائي': 'الثالث الابتدائي',
  'الثالث الابتدائي': 'الرابع الابتدائي',
  'الرابع الابتدائي': 'الخامس الابتدائي',
  'الخامس الابتدائي': 'السادس الابتدائي',
  'السادس الابتدائي': 'خريج المرحلة الابتدائية',
};

export function promoteStudentsAcademicYear(
  schoolCode: string,
  targetGradeFilter?: string // if provided, only promotes this specific grade, else all in school
): { promotedCount: number; graduatedCount: number; affectedStudents: { name: string; from: string; to: string; section: string }[] } {
  const users = getUsers();
  let promotedCount = 0;
  let graduatedCount = 0;
  const affectedStudents: { name: string; from: string; to: string; section: string }[] = [];

  users.forEach((u) => {
    if (u.role === 'student' && (u.schoolCode === schoolCode || schoolCode === 'ALL')) {
      if (!targetGradeFilter || u.className === targetGradeFilter) {
        const currentGrade = u.className || 'الأول المتوسط';
        const nextGrade = GRADE_PROGRESSION_MAP[currentGrade];

        if (nextGrade) {
          affectedStudents.push({
            name: u.name,
            from: currentGrade,
            to: nextGrade,
            section: u.sectionName || 'أ',
          });

          u.className = nextGrade;
          if (nextGrade.includes('خريج')) {
            graduatedCount++;
          } else {
            promotedCount++;
          }
        }
      }
    }
  });

  saveUsers(users);
  return { promotedCount, graduatedCount, affectedStudents };
}

/**
 * Delete all students in a specific school (with their attendance and behavior records)
 */
export function deleteAllSchoolStudents(schoolCode: string): { deletedCount: number } {
  const users = getUsers();
  const studentsToDelete = users.filter((u) => u.role === 'student' && (u.schoolCode === schoolCode || (schoolCode === 'RAYA-1448' || u.schoolCode === 'RAYA-1448')));
  const remainingUsers = users.filter((u) => !(u.role === 'student' && (u.schoolCode === schoolCode || (schoolCode === 'RAYA-1448' || u.schoolCode === 'RAYA-1448'))));
  
  saveUsers(remainingUsers);

  // Also clean up attendances for deleted students in this school
  const attendances = getAttendances();
  const remainingAttendances = attendances.filter((a) => a.schoolCode !== schoolCode && a.schoolCode !== 'RAYA-1448');
  saveAttendances(remainingAttendances);

  // Also clean up behavior deductions for this school
  const deductions = getBehaviorDeductions();
  const remainingDeductions = deductions.filter((d) => d.schoolCode !== schoolCode && d.schoolCode !== 'RAYA-1448');
  saveBehaviorDeductions(remainingDeductions);

  // Also clean up excuses for this school
  const excuses = getExcuses();
  const remainingExcuses = excuses.filter((e) => e.schoolCode !== schoolCode && e.schoolCode !== 'RAYA-1448');
  saveExcuses(remainingExcuses);

  // Also clean up behavior notes for this school
  const notes = getBehaviorNotes();
  const remainingNotes = notes.filter((n) => n.schoolCode !== schoolCode && n.schoolCode !== 'RAYA-1448');
  saveBehaviorNotes(remainingNotes);

  return { deletedCount: studentsToDelete.length };
}


