import React, { useState, useEffect, useMemo } from 'react';
import { User, School, Attendance, isStaffOrEmployeeRole } from './types';
import { 
  getCurrentUser, setCurrentUser, getSchools, saveSchools,
  getUsers, saveUsers, getAttendances, syncDataFromServer 
} from './utils/storage';
import { parseParentRegistrationToken, parseMagicToken } from './utils/magicLink';
import { getTodayDateString } from './utils/academic';
import { getAcademicDayStatus } from './utils/academicCalendar';

// Components
import { Header } from './components/Header';
import { InstallAppBanner } from './components/InstallAppBanner';
import { AcademicHolidayBanner } from './components/AcademicHolidayBanner';
import { LandingPage } from './components/LandingPage';
import { SuperAdminPortal } from './components/SuperAdminPortal';
import { EmployeeDashboard } from './components/EmployeeDashboard';
import { TeacherPortal } from './components/TeacherPortal';
import { ParentPortal } from './components/ParentPortal';
import { StudentPortal } from './components/StudentPortal';

// Modals
import { LoginModal } from './components/LoginModal';
import { DonationModal } from './components/DonationModal';
import { SubscriptionExpiredModal } from './components/SubscriptionExpiredModal';
import { PaymentInfoModal } from './components/PaymentInfoModal';
import { ParentRegistrationLinkModal } from './components/ParentRegistrationLinkModal';
import { ParentStudentSelfRegistrationModal } from './components/ParentStudentSelfRegistrationModal';
import { StaffRegistrationLinkModal } from './components/StaffRegistrationLinkModal';
import { StaffSelfRegistrationModal } from './components/StaffSelfRegistrationModal';
import { StudentQrCardModal } from './components/StudentQrCardModal';
import { GatekeeperScannerModal } from './components/GatekeeperScannerModal';
import { AttendanceCorrectionModal } from './components/AttendanceCorrectionModal';
import { StudentDossierModal } from './components/StudentDossierModal';
import { DailyPrincipalReportModal } from './components/DailyPrincipalReportModal';
import { ClassExcelManagerModal } from './components/ClassExcelManagerModal';
import { ClassRosterManagerModal } from './components/ClassRosterManagerModal';
import { StaffManagementModal } from './components/StaffManagementModal';
import { AdminArchiveReportModal } from './components/AdminArchiveReportModal';
import { InteractiveMapPicker } from './components/InteractiveMapPicker';
import { SchoolCreationWizard } from './components/SchoolCreationWizard';
import { CounselorApiIntegrationModal } from './components/CounselorApiIntegrationModal';
import { DirectLinksModal } from './components/DirectLinksModal';

export function App() {
  const [currentUser, setUserState] = useState<User | null>(() => getCurrentUser());
  const [schools, setSchools] = useState<School[]>(() => getSchools());
  const [users, setUsers] = useState<User[]>(() => getUsers());
  const [attendances, setAttendances] = useState<Attendance[]>(() => getAttendances());
  const [impersonatedSchool, setImpersonatedSchool] = useState<School | null>(null);

  // Selected School for API integration modal (Counselor app)
  const [selectedSchoolForApi, setSelectedSchoolForApi] = useState<School | null>(null);

  const [urlSchoolCode, setUrlSchoolCode] = useState<string>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('school') || params.get('code') || params.get('schoolCode') || params.get('joinSchool') || params.get('joinStaff') || '';
  });

  // Current active school (resiliently resolved across code, id, managed schools, and fallback)
  const currentSchool: School | null = useMemo(() => {
    if (!currentUser) return null;
    if (currentUser.role === 'superadmin') {
      return impersonatedSchool;
    }

    if (!schools || schools.length === 0) return null;

    // 1. Direct match by schoolCode (checking code and id, trimmed and case-insensitive)
    if (currentUser.schoolCode) {
      const codeClean = currentUser.schoolCode.trim().toUpperCase();
      const direct = schools.find(
        (s) =>
          s.code?.trim().toUpperCase() === codeClean ||
          s.id?.trim().toUpperCase() === codeClean
      );
      if (direct) return direct;
    }

    // 2. Match from user's managedSchoolCodes (multi-school assignment)
    if (Array.isArray(currentUser.managedSchoolCodes) && currentUser.managedSchoolCodes.length > 0) {
      for (const mCode of currentUser.managedSchoolCodes) {
        if (!mCode) continue;
        const cleanM = mCode.trim().toUpperCase();
        const managed = schools.find(
          (s) =>
            s.code?.trim().toUpperCase() === cleanM ||
            s.id?.trim().toUpperCase() === cleanM
        );
        if (managed) return managed;
      }
    }

    // 3. Fallback safely to first school for any logged-in school user
    if (schools.length > 0) {
      return schools[0];
    }

    return null;
  }, [currentUser, impersonatedSchool, schools]);

  // Synchronize schoolCode if currentUser was missing it or if it resolved to an existing school
  useEffect(() => {
    if (currentUser && currentSchool && currentUser.role !== 'superadmin') {
      if (currentUser.schoolCode !== currentSchool.code) {
        const allAssigned = Array.from(new Set([
          currentSchool.code,
          ...(currentUser.managedSchoolCodes || []),
        ]));
        const updated: User = {
          ...currentUser,
          schoolCode: currentSchool.code,
          managedSchoolCodes: allAssigned,
        };
        setCurrentUser(updated);
        setUserState(updated);
      }
    }
  }, [currentUser, currentSchool]);

  // Modals state
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isDonationOpen, setIsDonationOpen] = useState(false);
  const [isSubscriptionExpiredOpen, setIsSubscriptionExpiredOpen] = useState(false);
  
  // Payment Modal
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [selectedPlanForPayment, setSelectedPlanForPayment] = useState<'yearly'>('yearly');

  // Parent self registration & invitation
  const [isParentRegLinkOpen, setIsParentRegLinkOpen] = useState(false);
  const [isSelfRegOpen, setIsSelfRegOpen] = useState(false);
  const [selfRegSchoolCode, setSelfRegSchoolCode] = useState<string>('');

  // Staff self registration & invitation
  const [isStaffRegLinkOpen, setIsStaffRegLinkOpen] = useState(false);
  const [isStaffSelfRegOpen, setIsStaffSelfRegOpen] = useState(false);
  const [staffRegSchoolCode, setStaffRegSchoolCode] = useState<string>('');

  // Gatekeeper & Attendance Modals
  const [isGatekeeperScannerOpen, setIsGatekeeperScannerOpen] = useState(false);
  const [isDailyReportOpen, setIsDailyReportOpen] = useState(false);
  const [isClassExcelManagerOpen, setIsClassExcelManagerOpen] = useState(false);
  const [classManagerInitialTab, setClassManagerInitialTab] = useState<'excel' | 'manual' | 'classes'>('excel');
  const [schoolForClassManager, setSchoolForClassManager] = useState<School | null>(null);

  // Class Roster & Student Management & Print Modal
  const [isClassRosterOpen, setIsClassRosterOpen] = useState(false);
  const [rosterSelectedClass, setRosterSelectedClass] = useState<string>('');
  const [rosterSelectedSection, setRosterSelectedSection] = useState<string>('');
  const [schoolForClassRoster, setSchoolForClassRoster] = useState<School | null>(null);
  const [isStaffManagementOpen, setIsStaffManagementOpen] = useState(false);
  const [isArchiveReportOpen, setIsArchiveReportOpen] = useState(false);
  const [isMapPickerOpen, setIsMapPickerOpen] = useState(false);
  // School Creation Wizard
  const [isSchoolWizardOpen, setIsSchoolWizardOpen] = useState(false);
  const [wizardInitialPlan, setWizardInitialPlan] = useState<'trial' | 'yearly' | 'free_forever'>('yearly');

  // Student Dossier & QR Card & Correction
  const [selectedStudentForDossier, setSelectedStudentForDossier] = useState<User | null>(null);
  const [selectedStudentForQr, setSelectedStudentForQr] = useState<User | null>(null);
  const [selectedAttendanceForCorrection, setSelectedAttendanceForCorrection] = useState<Attendance | null>(null);
  const [isDirectLinksOpen, setIsDirectLinksOpen] = useState(false);

  // Initial & periodic server sync
  useEffect(() => {
    const doSync = () => {
      syncDataFromServer().then((data) => {
        if (data) {
          if (Array.isArray(data.schools) && data.schools.length > 0) {
            setSchools(data.schools);
          }
          if (Array.isArray(data.users) && data.users.length > 0) {
            setUsers(data.users);

            // Re-sync active user session if assigned schools or roles were updated on the server
            const stored = getCurrentUser();
            if (stored && stored.role !== 'superadmin') {
              const cleanNid = stored.nationalId ? stored.nationalId.trim() : '';
              // Match strictly by identity AND same role to prevent cross-role school contamination
              const matchingRecords = data.users.filter(
                (u) =>
                  ((cleanNid && u.nationalId && u.nationalId.trim() === cleanNid) || (stored.id && u.id === stored.id)) &&
                  u.role === stored.role
              );
              if (matchingRecords.length > 0) {
                const allManagedCodes = Array.from(new Set([
                  ...(stored.managedSchoolCodes || []),
                  stored.schoolCode,
                  ...matchingRecords.flatMap((m) => [m.schoolCode, ...(m.managedSchoolCodes || [])]),
                ])).filter(Boolean) as string[];

                const primary = matchingRecords[0];

                if (
                  allManagedCodes.length > (stored.managedSchoolCodes?.length || 0) ||
                  stored.role !== primary.role ||
                  stored.staffTitle !== primary.staffTitle
                ) {
                  const refreshed: User = {
                    ...stored,
                    ...primary,
                    schoolCode: stored.schoolCode || primary.schoolCode,
                    managedSchoolCodes: allManagedCodes,
                  };
                  setCurrentUser(refreshed);
                  setUserState(refreshed);
                }
              }
            }
          }
          if (Array.isArray(data.attendances)) {
            setAttendances(data.attendances);
          }
        }
      });
    };

    doSync();
    const interval = setInterval(doSync, 8000);
    return () => clearInterval(interval);
  }, []);

  // Parse Magic Link / Registration Token / Direct URL on page load
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    
    // Direct portal / links query params
    const portalParam = params.get('portal');
    const linksParam = params.get('links');
    if (linksParam) {
      setIsDirectLinksOpen(true);
    }
    if (portalParam) {
      const schCode = params.get('school') || params.get('code') || params.get('schoolCode');
      if (schCode) {
        setUrlSchoolCode(schCode.toUpperCase());
      }
      setIsLoginOpen(true);
    }
    const magicToken = params.get('token');
    if (magicToken) {
      const parsedPayload = parseMagicToken(magicToken);
      if (parsedPayload) {
        const allU = getUsers();
        const existing = allU.find((u) => u.id === parsedPayload.userId);
        if (existing) {
          handleLoginSuccess(existing);
          return;
        }
      }
    }

    // Direct actions (e.g. ?joinSchool=SCH-7912&action=register-parent or ?joinStaff=SCH-7912&action=register-staff)
    const directAction = (params.get('action') || params.get('mode') || '').trim().toLowerCase();

    const isStaffAction = [
      'register-staff',
      'register_staff',
      'staffregister',
      'staff-register',
      'staff_register',
      'staff',
      'teacher',
      'teachers',
      'register-teacher',
      'teacherregister',
      'teacher-register',
      'joinstaff',
      'join-staff',
      'join_staff',
    ].includes(directAction);

    const isParentAction = [
      'register-parent',
      'register_parent',
      'parentregister',
      'parent-register',
      'register',
      'student',
      'students',
      'parent',
      'parents',
      'joinschool',
      'join-school',
    ].includes(directAction);

    const directStaffParam = params.get('joinStaff') || params.get('joinTeacher') || params.get('staffToken');
    const directParentParam = params.get('joinSchool') || params.get('regToken') || params.get('join');
    const generalSchoolParam = params.get('schoolCode') || params.get('code') || params.get('school');

    // 1. Staff / Teacher Registration (highest priority when staff action or joinStaff param present)
    if (directStaffParam || isStaffAction) {
      const rawStaffCode = directStaffParam || generalSchoolParam || directParentParam || '';
      const parsed = parseParentRegistrationToken(rawStaffCode);
      const codeToUse = parsed?.schoolCode || rawStaffCode.trim().toUpperCase();
      if (codeToUse) {
        setStaffRegSchoolCode(codeToUse);
        setUrlSchoolCode(codeToUse);
      }
      setIsSelfRegOpen(false);
      setIsStaffSelfRegOpen(true);
      return;
    }

    // 2. Parent / Student Self-Registration
    if (directParentParam || isParentAction) {
      const rawParentCode = directParentParam || generalSchoolParam || '';
      const parsed = parseParentRegistrationToken(rawParentCode);
      const codeToUse = parsed?.schoolCode || rawParentCode.trim().toUpperCase();
      if (codeToUse) {
        setSelfRegSchoolCode(codeToUse);
        setUrlSchoolCode(codeToUse);
      }
      setIsStaffSelfRegOpen(false);
      setIsSelfRegOpen(true);
      return;
    }

    // 3. Direct Class & Section Management Action (e.g. ?action=classes or ?classes=true)
    if (directAction === 'classes' || directAction === 'sections' || params.get('classes')) {
      const targetCode = generalSchoolParam || directParentParam || directStaffParam || '';
      const cleanTarget = targetCode.trim().toUpperCase();
      if (cleanTarget) {
        setUrlSchoolCode(cleanTarget);
        const sch = schools.find((s) => s.code?.trim().toUpperCase() === cleanTarget || s.id?.trim().toUpperCase() === cleanTarget);
        if (sch) setSchoolForClassManager(sch);
      } else if (schools.length > 0) {
        setSchoolForClassManager(schools[0]);
      }
      setClassManagerInitialTab('classes');
      setIsClassExcelManagerOpen(true);
      return;
    }

    // 4. Direct Class Roster & Student Management Action (e.g. ?action=roster or ?roster=true)
    if (directAction === 'roster' || directAction === 'students' || params.get('roster') || params.get('students')) {
      const targetCode = generalSchoolParam || directParentParam || directStaffParam || '';
      const cleanTarget = targetCode.trim().toUpperCase();
      if (cleanTarget) {
        setUrlSchoolCode(cleanTarget);
        const sch = schools.find((s) => s.code?.trim().toUpperCase() === cleanTarget || s.id?.trim().toUpperCase() === cleanTarget);
        if (sch) setSchoolForClassRoster(sch);
      } else if (schools.length > 0) {
        setSchoolForClassRoster(schools[0]);
      }
      const pClass = params.get('class') || '';
      const pSec = params.get('section') || params.get('sec') || '';
      if (pClass) setRosterSelectedClass(pClass);
      if (pSec) setRosterSelectedSection(pSec);
      setIsClassRosterOpen(true);
      return;
    }

    // 3. Fallback for general school parameters with login or default
    if (generalSchoolParam) {
      const parsed = parseParentRegistrationToken(generalSchoolParam);
      const codeToUse = parsed?.schoolCode || generalSchoolParam.trim().toUpperCase();
      setUrlSchoolCode(codeToUse);
      if (directAction === 'login' || portalParam) {
        setIsLoginOpen(true);
      } else {
        setSelfRegSchoolCode(codeToUse);
        setIsSelfRegOpen(true);
      }
      return;
    }
  }, [schools]);

  // Sync state helpers
  const refreshAll = () => {
    setSchools(getSchools());
    setUsers(getUsers());
    setAttendances(getAttendances());
    setUserState(getCurrentUser());
  };

  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    setUserState(user);
    refreshAll();
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setUserState(null);
  };

  const handleSwitchUser = (user: User) => {
    setCurrentUser(user);
    setUserState(user);
    refreshAll();
  };

  const handleSwitchSchool = (school: School) => {
    if (currentUser) {
      // Collect all assigned schools so switching school never loses any previously assigned school
      const allCodes = Array.from(new Set([
        currentUser.schoolCode,
        ...(currentUser.managedSchoolCodes || []),
        school.code,
      ]));
      const updatedUser: User = { 
        ...currentUser, 
        schoolCode: school.code,
        managedSchoolCodes: allCodes,
      };
      setCurrentUser(updatedUser);
      setUserState(updatedUser);

      // Persist in all users in storage
      const allUsers = getUsers();
      let hasChange = false;
      const updatedUsers = allUsers.map((u) => {
        if (u.id === currentUser.id || u.nationalId === currentUser.nationalId) {
          hasChange = true;
          return {
            ...u,
            schoolCode: school.code,
            managedSchoolCodes: allCodes,
          };
        }
        return u;
      });
      if (hasChange) {
        saveUsers(updatedUsers, true);
      }
    }
    refreshAll();
  };

  const openPaymentWithPlan = (plan: 'yearly' | 'free_forever') => {
    setWizardInitialPlan(plan);
    if (plan !== 'free_forever') {
      setSelectedPlanForPayment('yearly');
    }
    setIsSchoolWizardOpen(true);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans antialiased selection:bg-emerald-500 selection:text-white flex flex-col" dir="rtl">
      
      {/* PWA Install App Banner */}
      <InstallAppBanner />

      {/* Top Header */}
      <Header
        currentUser={currentUser}
        currentSchool={currentSchool}
        schools={schools}
        allUsers={users}
        onSwitchSchool={handleSwitchSchool}
        onSwitchUser={(user) => {
          handleLoginSuccess(user);
        }}
        onLogout={handleLogout}
        onOpenLogin={() => setIsLoginOpen(true)}
        onOpenRegisterSchool={() => setIsSchoolWizardOpen(true)}
        onOpenDonationModal={() => setIsDonationOpen(true)}
        onOpenDirectLinks={() => setIsDirectLinksOpen(true)}
      />

      {/* Official Academic Calendar Banner */}
      <AcademicHolidayBanner status={getAcademicDayStatus()} />

      {/* Main Content View by Role */}
      <main className="flex-1">
        {!currentUser || currentUser.role === 'guest' ? (
          <LandingPage
            schools={schools}
            onOpenLogin={() => setIsLoginOpen(true)}
            onOpenRegisterSchool={() => setIsSchoolWizardOpen(true)}
            onOpenParentRegistration={() => {
              setSelfRegSchoolCode('');
              setIsSelfRegOpen(true);
            }}
            onOpenStaffRegistration={() => {
              setStaffRegSchoolCode('');
              setIsStaffSelfRegOpen(true);
            }}
            onOpenPaymentModal={openPaymentWithPlan}
            onOpenDonationModal={() => setIsDonationOpen(true)}
          />
        ) : currentUser.role === 'superadmin' ? (
          impersonatedSchool ? (
            <div className="space-y-4">
              {/* Top return bar for Super Admin */}
              <div className="bg-gradient-to-r from-amber-600 via-amber-700 to-amber-800 text-white px-4 sm:px-6 py-3 shadow-lg flex flex-wrap items-center justify-between gap-3 border-b border-amber-500/50" dir="rtl">
                <div className="flex items-center gap-3">
                  <span className="p-2 rounded-xl bg-amber-500/40 border border-amber-300/30 text-amber-100 text-sm font-bold shadow-xs">
                    👑 وضع المشرف العام
                  </span>
                  <div>
                    <span className="text-xs text-amber-200 block">أنت الآن تدير المدرسة وتتحكم بكافة الصلاحيات:</span>
                    <strong className="text-sm sm:text-base font-black text-white">
                      {impersonatedSchool.name} ({impersonatedSchool.code})
                    </strong>
                  </div>
                </div>

                <button
                  onClick={() => setImpersonatedSchool(null)}
                  className="py-2 px-4 rounded-xl bg-white hover:bg-amber-50 text-amber-950 font-black text-xs shadow-md transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <span>العودة للوحة تحكم المشرف العام ↵</span>
                </button>
              </div>

              {/* Render full Employee Dashboard as principal proxy */}
              <EmployeeDashboard
                currentUser={{
                  ...currentUser,
                  role: 'employee',
                  name: `${currentUser.name} (إشراف)`,
                  schoolCode: impersonatedSchool.code,
                }}
                currentSchool={impersonatedSchool}
                schools={schools}
                onSwitchSchool={(s) => setImpersonatedSchool(s)}
                onOpenCreateSchool={() => setIsSchoolWizardOpen(true)}
                onOpenDailyReport={() => setIsDailyReportOpen(true)}
                onOpenGatekeeperScanner={() => setIsGatekeeperScannerOpen(true)}
                onOpenMapPicker={() => setIsMapPickerOpen(true)}
                onOpenClassExcelManager={() => {
                  setClassManagerInitialTab('excel');
                  setIsClassExcelManagerOpen(true);
                }}
                onOpenClassManagerTab={(tab) => {
                  setClassManagerInitialTab(tab);
                  setIsClassExcelManagerOpen(true);
                }}
                onOpenStaffManagement={() => setIsStaffManagementOpen(true)}
                onOpenStaffRegistrationLink={() => setIsStaffRegLinkOpen(true)}
                onOpenArchiveReport={() => setIsArchiveReportOpen(true)}
                onOpenParentRegistrationLink={() => setIsParentRegLinkOpen(true)}
                onOpenDirectStudentRegistration={() => {
                  setSelfRegSchoolCode(impersonatedSchool.code);
                  setIsSelfRegOpen(true);
                }}
                onOpenStudentDossier={(student) => setSelectedStudentForDossier(student)}
                onOpenCounselorApi={() => setSelectedSchoolForApi(impersonatedSchool)}
                onOpenPaymentModal={() => {
                  setSelectedPlanForPayment('yearly');
                  setIsPaymentOpen(true);
                }}
                onOpenClassRoster={(className, sectionName) => {
                  setSchoolForClassRoster(impersonatedSchool);
                  setRosterSelectedClass(className || '');
                  setRosterSelectedSection(sectionName || '');
                  setIsClassRosterOpen(true);
                }}
              />
            </div>
          ) : (
            <SuperAdminPortal
              currentUser={currentUser}
              schools={schools}
              users={users}
              attendances={attendances}
              onRefresh={refreshAll}
              onOpenCreateSchool={() => setIsSchoolWizardOpen(true)}
              onImpersonateSchool={(sch) => setImpersonatedSchool(sch)}
              onOpenApiIntegration={(sch) => setSelectedSchoolForApi(sch)}
              onOpenClassManager={(sch) => {
                setSchoolForClassManager(sch);
                setClassManagerInitialTab('classes');
                setIsClassExcelManagerOpen(true);
              }}
              onOpenClassRoster={(sch) => {
                setSchoolForClassRoster(sch);
                setRosterSelectedClass('');
                setRosterSelectedSection('');
                setIsClassRosterOpen(true);
              }}
            />
          )
        ) : isStaffOrEmployeeRole(currentUser.role, currentUser.staffTitle) && currentSchool ? (
          <EmployeeDashboard
            key={currentSchool.code}
            currentUser={{
              ...currentUser,
              role: 'employee',
              staffTitle: currentUser.staffTitle || (
                ((currentUser.role as string) === 'admin_assistant' || (currentUser.role as string) === 'assistant')
                  ? 'admin_assistant'
                  : 'principal'
              ),
              schoolCode: currentSchool.code,
              managedSchoolCodes: Array.from(new Set([
                currentSchool.code,
                ...(currentUser.managedSchoolCodes || []),
              ])),
            }}
            currentSchool={currentSchool}
            schools={schools}
            onSwitchSchool={handleSwitchSchool}
            onOpenCreateSchool={
              (!currentUser.staffTitle || currentUser.staffTitle === 'principal')
                ? () => setIsSchoolWizardOpen(true)
                : undefined
            }
            onOpenDailyReport={() => setIsDailyReportOpen(true)}
            onOpenGatekeeperScanner={() => setIsGatekeeperScannerOpen(true)}
            onOpenMapPicker={() => setIsMapPickerOpen(true)}
            onOpenClassExcelManager={() => {
              setClassManagerInitialTab('excel');
              setIsClassExcelManagerOpen(true);
            }}
            onOpenClassManagerTab={(tab) => {
              setClassManagerInitialTab(tab);
              setIsClassExcelManagerOpen(true);
            }}
            onOpenStaffManagement={() => setIsStaffManagementOpen(true)}
            onOpenStaffRegistrationLink={() => setIsStaffRegLinkOpen(true)}
            onOpenArchiveReport={() => setIsArchiveReportOpen(true)}
            onOpenParentRegistrationLink={() => setIsParentRegLinkOpen(true)}
            onOpenDirectStudentRegistration={() => {
              setSelfRegSchoolCode(currentSchool.code);
              setIsSelfRegOpen(true);
            }}
            onOpenStudentDossier={(student) => setSelectedStudentForDossier(student)}
            onOpenCounselorApi={() => setSelectedSchoolForApi(currentSchool)}
            onOpenPaymentModal={() => {
              setSelectedPlanForPayment('yearly');
              setIsPaymentOpen(true);
            }}
            onOpenClassRoster={(className, sectionName) => {
              setSchoolForClassRoster(currentSchool);
              setRosterSelectedClass(className || '');
              setRosterSelectedSection(sectionName || '');
              setIsClassRosterOpen(true);
            }}
          />
        ) : currentUser.role === 'teacher' && currentSchool ? (
          <TeacherPortal
            key={currentSchool.code}
            currentUser={currentUser}
            currentSchool={currentSchool}
            schools={schools}
            onSwitchSchool={handleSwitchSchool}
            onOpenDossier={(student) => setSelectedStudentForDossier(student)}
            onOpenClassRoster={(className, sectionName) => {
              setSchoolForClassRoster(currentSchool);
              setRosterSelectedClass(className || '');
              setRosterSelectedSection(sectionName || '');
              setIsClassRosterOpen(true);
            }}
          />
        ) : currentUser.role === 'parent' && currentSchool ? (
          <ParentPortal
            currentUser={currentUser}
            currentSchool={currentSchool}
            onOpenCorrection={(att) => setSelectedAttendanceForCorrection(att)}
          />
        ) : currentUser.role === 'student' && currentSchool ? (
          <StudentPortal
            currentUser={currentUser}
            currentSchool={currentSchool}
            onOpenQrCard={() => setSelectedStudentForQr(currentUser)}
            onOpenCorrection={(att) => setSelectedAttendanceForCorrection(att)}
          />
        ) : currentUser && (currentUser.role as string) !== 'guest' && !currentSchool ? (
          <div className="max-w-2xl mx-auto my-12 p-8 bg-white rounded-3xl border border-slate-200 shadow-xl text-center space-y-4" dir="rtl">
            <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-200 shadow-inner">
              <span className="text-2xl">🏢</span>
            </div>
            <h3 className="text-lg font-black text-slate-900">مرحباً بك {currentUser.name}</h3>
            <p className="text-sm text-slate-600 font-medium leading-relaxed">
              تم تسجيل دخولك بنجاح ({currentUser.staffTitle === 'admin_assistant' ? 'مساعد إداري' : 'كادر المدرسة'}). جاري ربط واستعراض بيانات مدرستك النشطة...
            </p>
            {schools.length > 0 && (
              <div className="pt-2">
                <label className="block text-xs font-bold text-slate-700 mb-2">اختر المدرسة لبدء العمل فوراً:</label>
                <div className="flex flex-wrap gap-2 justify-center">
                  {schools.map((s) => (
                    <button
                      key={s.id || s.code}
                      onClick={() => handleSwitchSchool(s)}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-sm cursor-pointer transition-all"
                    >
                      🏢 {s.name} ({s.code})
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <LandingPage
            schools={schools}
            onOpenLogin={() => setIsLoginOpen(true)}
            onOpenRegisterSchool={() => setIsSchoolWizardOpen(true)}
            onOpenParentRegistration={() => setIsSelfRegOpen(true)}
            onOpenStaffRegistration={() => setIsStaffSelfRegOpen(true)}
            onOpenPaymentModal={openPaymentWithPlan}
            onOpenDirectLinks={() => setIsDirectLinksOpen(true)}
          />
        )}
      </main>

      {/* Footer with Developer Credits & Technical Support */}
      <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-500 mt-auto" dir="rtl">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="space-y-1 text-right sm:text-right">
            <p className="font-bold text-slate-800">
              © 1448هـ - 2026م منظومة حُضُورَكْ الذكية لضبط الانضباط والحضور المدرسي.
            </p>
            <p className="text-emerald-800 font-black text-xs flex items-center gap-1.5">
              <span>💻 التطبيق من برمجة</span>
              <span className="underline decoration-emerald-500 decoration-2">د. أنور الألمعي</span>
              <span>| للتواصل والدعم الفني:</span>
              <a 
                href="https://wa.me/966548171965" 
                target="_blank" 
                rel="noreferrer" 
                className="font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md hover:bg-emerald-100 transition-colors inline-block"
              >
                0548171965
              </a>
            </p>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="https://wa.me/966548171965"
              target="_blank"
              rel="noreferrer"
              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1 shadow-xs transition-colors"
            >
              <span>واتساب الدعم الفني 💬</span>
            </a>
            <button onClick={() => setIsDonationOpen(true)} className="hover:text-rose-600 font-semibold cursor-pointer">
              دعم المنصة ❤️
            </button>
          </div>
        </div>
      </footer>

      {/* MODALS */}

      {/* 1. Login Modal */}
      <LoginModal
        isOpen={isLoginOpen}
        onClose={() => setIsLoginOpen(false)}
        schools={schools}
        users={users}
        initialSchoolCode={currentSchool?.code || urlSchoolCode || selfRegSchoolCode || staffRegSchoolCode || undefined}
        onLoginSuccess={handleLoginSuccess}
        onOpenDirectLinks={() => {
          setIsLoginOpen(false);
          setIsDirectLinksOpen(true);
        }}
        onOpenRegisterSchool={() => {
          setIsLoginOpen(false);
          setIsSchoolWizardOpen(true);
        }}
        onOpenParentRegistration={() => {
          setIsLoginOpen(false);
          setSelfRegSchoolCode(currentSchool?.code || urlSchoolCode || schools[0]?.code || '');
          setIsSelfRegOpen(true);
        }}
      />

      {/* 2. Donation Modal */}
      <DonationModal
        isOpen={isDonationOpen}
        onClose={() => setIsDonationOpen(false)}
      />

      {/* 4. Subscription Expired Modal */}
      {currentSchool && (
        <SubscriptionExpiredModal
          isOpen={isSubscriptionExpiredOpen}
          school={currentSchool}
          onClose={() => setIsSubscriptionExpiredOpen(false)}
          onOpenPaymentModal={() => {
            setIsSubscriptionExpiredOpen(false);
            openPaymentWithPlan('yearly');
          }}
        />
      )}

      {/* 5. Payment Info Modal */}
      {(currentSchool || (schools && schools.length > 0)) && (
        <PaymentInfoModal
          isOpen={isPaymentOpen}
          onClose={() => setIsPaymentOpen(false)}
          school={currentSchool || schools[0]}
          plan={selectedPlanForPayment}
          onSuccess={() => {
            refreshAll();
          }}
        />
      )}

      {/* 6. Parent Registration Link Modal */}
      {currentSchool && (
        <ParentRegistrationLinkModal
          isOpen={isParentRegLinkOpen}
          onClose={() => setIsParentRegLinkOpen(false)}
          school={currentSchool}
          onOpenDirectRegistration={() => {
            setIsParentRegLinkOpen(false);
            setSelfRegSchoolCode(currentSchool.code);
            setIsSelfRegOpen(true);
          }}
        />
      )}

      {/* 7. Parent & Student Self Registration Modal */}
      <ParentStudentSelfRegistrationModal
        isOpen={isSelfRegOpen}
        onClose={() => setIsSelfRegOpen(false)}
        schools={schools}
        initialSchoolCode={selfRegSchoolCode}
        onRegistrationSuccess={(parentUser) => {
          refreshAll();
          handleLoginSuccess(parentUser);
        }}
      />

      {/* 8. Staff Management Modal (Teachers & Staff) */}
      {currentSchool && (
        <StaffManagementModal
          key={`staff-mgr-${currentSchool.code}`}
          isOpen={isStaffManagementOpen}
          onClose={() => setIsStaffManagementOpen(false)}
          school={currentSchool}
          currentUser={currentUser}
          onUpdated={() => refreshAll()}
          onOpenStaffInvitationLink={() => setIsStaffRegLinkOpen(true)}
        />
      )}

      {/* 8.1 Staff Registration Link Modal (WhatsApp / QR) */}
      {currentSchool && (
        <StaffRegistrationLinkModal
          isOpen={isStaffRegLinkOpen}
          onClose={() => setIsStaffRegLinkOpen(false)}
          school={currentSchool}
          onOpenDirectStaffRegistration={() => {
            setIsStaffRegLinkOpen(false);
            setStaffRegSchoolCode(currentSchool.code);
            setIsStaffSelfRegOpen(true);
          }}
        />
      )}

      {/* 8.2 Staff Self Registration Modal (Teachers / Assistants / Staff) */}
      <StaffSelfRegistrationModal
        isOpen={isStaffSelfRegOpen}
        onClose={() => setIsStaffSelfRegOpen(false)}
        schools={schools}
        initialSchoolCode={staffRegSchoolCode}
        onRegistrationSuccess={(staffUser) => {
          refreshAll();
          handleLoginSuccess(staffUser);
        }}
      />

      {/* 9. Student QR Card Modal */}
      {selectedStudentForQr && currentSchool && (
        <StudentQrCardModal
          isOpen={!!selectedStudentForQr}
          onClose={() => setSelectedStudentForQr(null)}
          student={selectedStudentForQr}
          school={currentSchool}
        />
      )}

      {/* 10. Gatekeeper Scanner Modal */}
      {currentSchool && (
        <GatekeeperScannerModal
          isOpen={isGatekeeperScannerOpen}
          onClose={() => {
            setIsGatekeeperScannerOpen(false);
            refreshAll();
          }}
          school={currentSchool}
        />
      )}

      {/* 11. Attendance Correction Request Modal */}
      {selectedAttendanceForCorrection && currentUser && (
        <AttendanceCorrectionModal
          isOpen={!!selectedAttendanceForCorrection}
          onClose={() => setSelectedAttendanceForCorrection(null)}
          attendance={selectedAttendanceForCorrection}
          currentUser={currentUser}
          onSuccess={() => {
            refreshAll();
          }}
        />
      )}

      {/* 12. Student Dossier Modal */}
      {selectedStudentForDossier && currentSchool && (
        <StudentDossierModal
          isOpen={!!selectedStudentForDossier}
          onClose={() => setSelectedStudentForDossier(null)}
          student={selectedStudentForDossier}
          school={currentSchool}
          onOpenQrCard={() => {
            setSelectedStudentForQr(selectedStudentForDossier);
          }}
          onAttendanceUpdated={() => {
            refreshAll();
          }}
        />
      )}

      {/* 13. Daily Principal Report Modal */}
      {currentSchool && (
        <DailyPrincipalReportModal
          isOpen={isDailyReportOpen}
          onClose={() => setIsDailyReportOpen(false)}
          school={currentSchool}
          attendances={attendances.filter((a) => a.schoolCode === currentSchool.code && a.date === getTodayDateString())}
          date={getTodayDateString()}
        />
      )}

      {/* 14. Class & Excel Manager Modal */}
      {(schoolForClassManager || impersonatedSchool || currentSchool) && (
        <ClassExcelManagerModal
          key={`class-mgr-${(schoolForClassManager || impersonatedSchool || currentSchool)?.code}-${classManagerInitialTab}`}
          isOpen={isClassExcelManagerOpen}
          onClose={() => {
            setIsClassExcelManagerOpen(false);
            setSchoolForClassManager(null);
          }}
          school={schoolForClassManager || impersonatedSchool || currentSchool!}
          initialTab={classManagerInitialTab}
          onOpenClassRoster={(className, sectionName) => {
            setSchoolForClassRoster(schoolForClassManager || impersonatedSchool || currentSchool!);
            setRosterSelectedClass(className || '');
            setRosterSelectedSection(sectionName || '');
            setIsClassRosterOpen(true);
          }}
          onUpdated={() => refreshAll()}
        />
      )}

      {/* 14b. Class Roster & Student Transfer & Print Modal */}
      {(schoolForClassRoster || impersonatedSchool || currentSchool) && (
        <ClassRosterManagerModal
          key={`roster-mgr-${(schoolForClassRoster || impersonatedSchool || currentSchool)?.code}-${rosterSelectedClass}-${rosterSelectedSection}`}
          isOpen={isClassRosterOpen}
          onClose={() => {
            setIsClassRosterOpen(false);
            setRosterSelectedClass('');
            setRosterSelectedSection('');
            setSchoolForClassRoster(null);
          }}
          school={schoolForClassRoster || impersonatedSchool || currentSchool!}
          initialClass={rosterSelectedClass}
          initialSection={rosterSelectedSection}
          onOpenClassEditor={() => {
            setClassManagerInitialTab('classes');
            setIsClassExcelManagerOpen(true);
          }}
          onOpenExcelManager={() => {
            setClassManagerInitialTab('excel');
            setIsClassExcelManagerOpen(true);
          }}
          onUpdated={() => refreshAll()}
        />
      )}

      {/* 15. Admin Archive Report Modal */}
      {currentSchool && (
        <AdminArchiveReportModal
          key={`archive-${currentSchool.code}`}
          isOpen={isArchiveReportOpen}
          onClose={() => setIsArchiveReportOpen(false)}
          school={currentSchool}
        />
      )}

      {/* 16. Interactive Map Geofence Picker Modal */}
      {isMapPickerOpen && currentSchool && (
        <InteractiveMapPicker
          key={`map-picker-${currentSchool.code}`}
          initialLat={currentSchool.lat}
          initialLng={currentSchool.lng}
          initialRadius={currentSchool.radiusMeters}
          onClose={() => setIsMapPickerOpen(false)}
          onSave={(lat, lng, radius) => {
            const updated = { ...currentSchool, lat, lng, radiusMeters: radius };
            const allSchools = getSchools().map((s) => (s.code === currentSchool.code ? updated : s));
            saveSchools(allSchools, true);
            setIsMapPickerOpen(false);
            refreshAll();
          }}
        />
      )}

      {/* 17. School Creation Wizard Modal */}
      <SchoolCreationWizard
        isOpen={isSchoolWizardOpen}
        onClose={() => setIsSchoolWizardOpen(false)}
        onSchoolCreated={(newSchool, adminUser) => {
          refreshAll();
          if (currentUser?.role !== 'superadmin') {
            handleLoginSuccess(adminUser);
          }
        }}
        initialPlan={wizardInitialPlan}
      />

      {/* 18. Counselor & External Application API Integration Modal */}
      {selectedSchoolForApi && (
        <CounselorApiIntegrationModal
          isOpen={!!selectedSchoolForApi}
          onClose={() => setSelectedSchoolForApi(null)}
          school={selectedSchoolForApi}
          onSchoolUpdated={() => refreshAll()}
        />
      )}

      {/* 19. Direct Links & Sharing Modal */}
      <DirectLinksModal
        isOpen={isDirectLinksOpen}
        onClose={() => setIsDirectLinksOpen(false)}
        schools={schools}
        currentSchool={currentSchool}
        onSelectSchool={(s) => {
          if (currentUser) handleSwitchSchool(s);
        }}
      />
    </div>
  );
}

export default App;
