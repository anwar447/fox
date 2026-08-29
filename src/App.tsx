import React, { useState, useEffect } from 'react';
import { User, School, Attendance, Excuse, Emergency, AttendanceStatus, NoorComparison } from './types';
import { 
  initializeStorageIfEmpty,
  resetToDefaultSeed,
  getSchools,
  saveSchools,
  saveSchool,
  getUsers,
  saveUsers,
  saveUser,
  updateUserPassword,
  getCurrentUser,
  setCurrentUser,
  getSelectedSchoolCode,
  setSelectedSchoolCode,
  getAttendances,
  saveAttendances,
  recordStudentSelfCheckIn,
  updateTeacherAttendance,
  bulkUpdateTeacherAttendance,
  getExcuses,
  addExcuse,
  updateExcuseStatus,
  getEmergencies,
  broadcastEmergency,
  respondToEmergency,
  saveNoorLog,
  updateUserProfilePhoto,
  importStudentsBatch,
} from './utils/storage';

import { Header } from './components/Header';
import { DemoSwitcher } from './components/DemoSwitcher';
import { LoginModal } from './components/LoginModal';
import { StudentPortal } from './components/StudentPortal';
import { TeacherPortal } from './components/TeacherPortal';
import { ParentPortal } from './components/ParentPortal';
import { EmployeeDashboard } from './components/EmployeeDashboard';
import { SuperAdminPortal } from './components/SuperAdminPortal';
import { LandingPage } from './components/LandingPage';
import { SchoolCreationWizard } from './components/SchoolCreationWizard';
import { PaymentInfoModal } from './components/PaymentInfoModal';
import { SubscriptionExpiredModal } from './components/SubscriptionExpiredModal';
import { InstallAppBanner } from './components/InstallAppBanner';
import { AcademicHolidayBanner } from './components/AcademicHolidayBanner';
import { requestWebNotificationPermission, triggerNotification } from './utils/notifications';
import { getAcademicDayStatus, THEME_CONFIGS } from './utils/academicCalendar';

import { Sparkles, Building2, BookOpen, GraduationCap, Users, ShieldCheck, Bell } from 'lucide-react';

export default function App() {
  const [schools, setSchools] = useState<School[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [attendances, setAttendances] = useState<Attendance[]>([]);
  const [excuses, setExcuses] = useState<Excuse[]>([]);
  const [emergencies, setEmergencies] = useState<Emergency[]>([]);
  const [currentUser, setCurrentUserState] = useState<User | null>(null);
  const [selectedSchoolCode, setSelectedSchoolCodeState] = useState<string>('RAYA-1448');
  const [themeOverride, setThemeOverride] = useState<string>('auto');

  // UI Modals
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isDemoSwitcherOpen, setIsDemoSwitcherOpen] = useState(false);
  const [isSchoolWizardOpen, setIsSchoolWizardOpen] = useState(false);
  const [paymentModalState, setPaymentModalState] = useState<{
    isOpen: boolean;
    plan: 'semester' | 'yearly';
    schoolName?: string;
  }>({
    isOpen: false,
    plan: 'semester',
  });

  // Initialize storage on load
  useEffect(() => {
    initializeStorageIfEmpty();
    refreshAllData();

    // Check if ?superadmin in URL
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('superadmin')) {
      const allUsers = getUsers();
      const superUser = allUsers.find((u) => u.role === 'superadmin');
      if (superUser) {
        handleSelectUser(superUser);
      }
    }
  }, []);

  const refreshAllData = () => {
    const s = getSchools();
    const u = getUsers();
    const a = getAttendances();
    const e = getExcuses();
    const emg = getEmergencies();
    const curr = getCurrentUser();
    const sc = getSelectedSchoolCode();

    setSchools(s);
    setUsers(u);
    setAttendances(a);
    setExcuses(e);
    setEmergencies(emg);
    setCurrentUserState(curr);
    setSelectedSchoolCodeState(sc);
  };

  const handleSelectSchool = (code: string) => {
    setSelectedSchoolCodeState(code);
    setSelectedSchoolCode(code);
  };

  const handleSelectUser = (user: User) => {
    setCurrentUserState(user);
    setCurrentUser(user);
    if (user.schoolCode && user.schoolCode !== 'GLOBAL') {
      handleSelectSchool(user.schoolCode);
    }
  };

  const handleLogout = () => {
    setCurrentUserState(null);
    setCurrentUser(null);
  };

  const handleResetData = () => {
    resetToDefaultSeed();
    refreshAllData();
  };

  // Student Actions
  const handleStudentCheckIn = (timeHHMMSS: string) => {
    if (!currentUser) return;
    recordStudentSelfCheckIn(currentUser.id, selectedSchoolCode, timeHHMMSS);
    setAttendances(getAttendances());
  };

  const handleSubmitExcuse = (excuseData: Omit<Excuse, 'id' | 'submittedAt'>) => {
    addExcuse(excuseData);
    setExcuses(getExcuses());
  };

  const handleUpdateStudentPhoto = (photoUrl: string) => {
    if (!currentUser) return;
    updateUserProfilePhoto(currentUser.id, photoUrl);
    refreshAllData();
  };

  // Teacher Actions
  const handleTeacherUpdateAttendance = (
    studentId: string,
    teacherMark: AttendanceStatus,
    schoolCode: string,
    className: string,
    sectionName: string,
    dateStr?: string
  ) => {
    updateTeacherAttendance(studentId, teacherMark, schoolCode, className, sectionName, dateStr);
    setAttendances(getAttendances());
  };

  const handleTeacherBulkUpdateAttendance = (
    students: { id: string; className: string; sectionName: string }[],
    teacherMark: 'present' | 'absent',
    schoolCode: string
  ) => {
    bulkUpdateTeacherAttendance(students, teacherMark, schoolCode);
    setAttendances(getAttendances());
  };

  // Employee & Management Actions
  const handleSaveSchool = (school: School) => {
    saveSchool(school);
    refreshAllData();
  };

  const handleDeleteSchool = (schoolId: string) => {
    const list = schools.filter((s) => s.id !== schoolId);
    saveSchools(list);
    refreshAllData();
  };

  const handleToggleSuspendSchool = (schoolId: string) => {
    const school = schools.find((s) => s.id === schoolId);
    if (school) {
      const updated = { ...school, isSuspended: !school.isSuspended };
      saveSchool(updated);
      refreshAllData();
    }
  };

  const handleSaveUser = (user: User) => {
    saveUser(user);
    refreshAllData();
  };

  const handleDeleteUser = (userId: string) => {
    const list = users.filter((u) => u.id !== userId);
    saveUsers(list);
    refreshAllData();
  };

  const handleResetPassword = (nationalId: string, newPass: string) => {
    updateUserPassword(nationalId, newPass);
    refreshAllData();
  };

  const handleBroadcastEmergency = (emergencyData: Omit<Emergency, 'id' | 'createdAt' | 'responses'>) => {
    broadcastEmergency(emergencyData);
    setEmergencies(getEmergencies());
  };

  const handleRespondEmergency = (
    emergencyId: string,
    status: 'safe' | 'needs_help' | 'acknowledged',
    note?: string
  ) => {
    if (!currentUser) return;
    respondToEmergency(emergencyId, currentUser.id, currentUser.name, currentUser.role, status, note);
    setEmergencies(getEmergencies());
  };

  const handleUpdateExcuseStatus = (id: string, status: 'approved' | 'rejected', reason?: string) => {
    updateExcuseStatus(id, status, reason);
    setExcuses(getExcuses());
    setAttendances(getAttendances());
  };

  const handleImportStudentsBatch = (
    students: Array<{
      nationalId: string;
      name: string;
      className: string;
      sectionName: string;
      parentMobile?: string;
    }>
  ) => {
    importStudentsBatch(selectedSchoolCode, students);
    refreshAllData();
  };

  const handleSaveNoorComparison = (log: NoorComparison) => {
    saveNoorLog(log);
  };

  // Parent Actions
  const handleLinkChild = (nationalId: string): boolean => {
    if (!currentUser) return false;
    const currentChildren = currentUser.childrenNationalIds || [];
    if (!currentChildren.includes(nationalId)) {
      const updatedUser: User = {
        ...currentUser,
        childrenNationalIds: [...currentChildren, nationalId],
      };
      saveUser(updatedUser);
      setCurrentUserState(updatedUser);
      setCurrentUser(updatedUser);
      refreshAllData();
      return true;
    }
    return true;
  };

  const handleSendParentNote = (
    studentId: string,
    studentName: string,
    nationalId: string,
    schoolCode: string,
    noteText: string
  ) => {
    if (!currentUser) return;
    triggerNotification(
      'ملاحظة واردة من ولي الأمر',
      `أرسل ولي أمر الطالب ${studentName} (${nationalId}) ملاحظة: "${noteText}"`,
      'general',
      schoolCode,
      'employee'
    );
  };

  // School Wizard Created
  const handleSchoolCreated = (newSchool: School, founderUser: User, assistantUsers: User[]) => {
    saveSchool(newSchool);
    saveUser(founderUser);
    assistantUsers.forEach((asst) => saveUser(asst));
    
    // Automatically select school and log in as founder
    handleSelectSchool(newSchool.code);
    handleSelectUser(founderUser);
    refreshAllData();
  };

  const currentSchool = schools.find((s) => s.code === selectedSchoolCode) || schools[0] || {
    id: 'default',
    name: 'مدرسة ثانوية صقر قريش',
    code: 'RAYA-1448',
    logo: 'https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=150&auto=format&fit=crop&q=80',
    city: 'الرياض',
    type: 'secondary' as const,
    contact: '0114567890',
    managerName: 'أ. فهد بن عبدالعزيز المنصور',
    timings: {
      tabour: '06:45',
      firstPeriod: '07:00',
      lateAfter: '07:15',
      absentAfter: '07:45',
      breakTime: '09:30',
      dismissal: '13:00',
    },
    geofence: {
      lat: 24.7136,
      lng: 46.6753,
      radius: 300,
      addressName: 'طريق الملك فهد، الرياض',
    },
    createdBy: '1000472181',
    createdAt: '2026-08-01',
    subscriptionPlan: 'silver' as const,
    subscriptionExpiryDate: '2027-06-30',
    isSuspended: false,
  };

  const activeEmergencyCount = emergencies.filter(
    (e) => e.schoolCode === selectedSchoolCode && e.active
  ).length;

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-900 flex flex-col font-sans selection:bg-emerald-500 selection:text-white" dir="rtl">
      
      {/* Global Application Header */}
      <Header
        currentUser={currentUser}
        schools={schools}
        selectedSchoolCode={selectedSchoolCode}
        onSelectSchool={handleSelectSchool}
        onOpenLogin={() => setIsLoginModalOpen(true)}
        onLogout={handleLogout}
        onOpenDemoSwitcher={() => setIsDemoSwitcherOpen(true)}
        activeEmergencyCount={activeEmergencyCount}
        onOpenEmergencyModal={() => setIsDemoSwitcherOpen(true)}
      />

      {/* Main App Content View based on logged-in role */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-12">
        
        {currentUser && (
          <AcademicHolidayBanner
            currentThemeKey={themeOverride === 'auto' ? undefined : themeOverride}
            onSelectThemeOverride={setThemeOverride}
          />
        )}
        
        {/* Subscription Expired / Suspended Guard */}
        {currentUser && currentUser.role !== 'superadmin' && currentSchool && (currentSchool.isSuspended || (currentSchool.subscriptionExpiryDate && new Date(currentSchool.subscriptionExpiryDate).getTime() < new Date().setHours(0,0,0,0))) ? (
          <SubscriptionExpiredModal
            isOpen={true}
            school={currentSchool}
            onOpenPaymentModal={(plan) => {
              setPaymentModalState({
                isOpen: true,
                plan: plan,
                schoolName: currentSchool.name,
              });
            }}
            onLogout={handleLogout}
          />
        ) : !currentUser ? (
          // Rich Interactive Landing Page
          <LandingPage
            schools={schools}
            users={users}
            onSelectUser={handleSelectUser}
            onOpenLogin={() => setIsLoginModalOpen(true)}
            onOpenDemoSwitcher={() => setIsDemoSwitcherOpen(true)}
            onOpenRegisterSchool={() => setIsSchoolWizardOpen(true)}
            onOpenPaymentModal={(plan) => {
              if (plan === 'free_forever') {
                setIsSchoolWizardOpen(true);
              } else {
                setPaymentModalState({
                  isOpen: true,
                  plan: plan,
                  schoolName: undefined,
                });
              }
            }}
          />
        ) : currentUser.role === 'superadmin' ? (
          // Super Admin (Owner Subscription & License Portal)
          <SuperAdminPortal
            schools={schools}
            users={users}
            onSaveSchool={handleSaveSchool}
            onDeleteSchool={handleDeleteSchool}
            onToggleSuspendSchool={handleToggleSuspendSchool}
          />
        ) : currentUser.role === 'employee' ? (
          // Founder Employee & Assistants View
          <EmployeeDashboard
            currentUser={currentUser}
            schools={schools}
            selectedSchoolCode={selectedSchoolCode}
            onSelectSchool={handleSelectSchool}
            users={users}
            attendances={attendances}
            excuses={excuses}
            emergencies={emergencies}
            onSaveSchool={handleSaveSchool}
            onDeleteSchool={handleDeleteSchool}
            onSaveUser={handleSaveUser}
            onDeleteUser={handleDeleteUser}
            onResetPassword={handleResetPassword}
            onBroadcastEmergency={handleBroadcastEmergency}
            onUpdateExcuseStatus={handleUpdateExcuseStatus}
            onSaveNoorComparison={handleSaveNoorComparison}
            onImportStudentsBatch={handleImportStudentsBatch}
            onRefreshData={refreshAllData}
          />
        ) : currentUser.role === 'teacher' ? (
          // Teacher View
          <TeacherPortal
            currentUser={currentUser}
            schools={schools}
            selectedSchoolCode={selectedSchoolCode}
            onSelectSchool={handleSelectSchool}
            users={users}
            attendances={attendances}
            onUpdateAttendance={handleTeacherUpdateAttendance}
            onBulkUpdateAttendance={handleTeacherBulkUpdateAttendance}
          />
        ) : currentUser.role === 'student' ? (
          // Student View with Photo Upload & Digital ID Card
          <StudentPortal
            currentUser={currentUser}
            school={currentSchool}
            attendances={attendances}
            excuses={excuses}
            emergencies={emergencies}
            onCheckIn={handleStudentCheckIn}
            onSubmitExcuse={handleSubmitExcuse}
            onRespondEmergency={handleRespondEmergency}
            onUpdatePhoto={handleUpdateStudentPhoto}
          />
        ) : (
          // Parent View
          <ParentPortal
            currentUser={currentUser}
            schools={schools}
            users={users}
            attendances={attendances}
            excuses={excuses}
            onLinkChild={handleLinkChild}
            onSendParentNote={handleSendParentNote}
          />
        )}

      </main>

      {/* PWA App Install Suggestion Banner */}
      <InstallAppBanner />

      {/* Modals & Wizards */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        schools={schools}
        users={users}
        onLoginSuccess={handleSelectUser}
        onOpenDemoSwitcher={() => {}}
      />

      <SchoolCreationWizard
        isOpen={isSchoolWizardOpen}
        onClose={() => setIsSchoolWizardOpen(false)}
        currentUser={currentUser}
        onSchoolCreated={handleSchoolCreated}
      />

      <PaymentInfoModal
        isOpen={paymentModalState.isOpen}
        onClose={() => setPaymentModalState(prev => ({ ...prev, isOpen: false }))}
        selectedPlan={paymentModalState.plan}
        schoolName={paymentModalState.schoolName}
        onConfirmPayment={(transferRef, senderName) => {
          setPaymentModalState(prev => ({ ...prev, isOpen: false }));
          setIsSchoolWizardOpen(true);
        }}
      />

    </div>
  );
}
