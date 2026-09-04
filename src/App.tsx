import React, { useState, useEffect } from 'react';
import { User, School, Attendance } from './types';
import { 
  getCurrentUser, setCurrentUser, getSchools, 
  getUsers, getAttendances, syncDataFromServer 
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
import { StaffManagementModal } from './components/StaffManagementModal';
import { AdminArchiveReportModal } from './components/AdminArchiveReportModal';
import { InteractiveMapPicker } from './components/InteractiveMapPicker';
import { SchoolCreationWizard } from './components/SchoolCreationWizard';
import { CounselorApiIntegrationModal } from './components/CounselorApiIntegrationModal';

export function App() {
  const [currentUser, setUserState] = useState<User | null>(() => getCurrentUser());
  const [schools, setSchools] = useState<School[]>(() => getSchools());
  const [users, setUsers] = useState<User[]>(() => getUsers());
  const [attendances, setAttendances] = useState<Attendance[]>(() => getAttendances());
  const [impersonatedSchool, setImpersonatedSchool] = useState<School | null>(null);

  // Selected School for API integration modal (Counselor app)
  const [selectedSchoolForApi, setSelectedSchoolForApi] = useState<School | null>(null);

  // Current active school (only resolved when a school user is logged in or superadmin is managing a school)
  const currentSchool: School | null = 
    currentUser?.role === 'superadmin' && impersonatedSchool
      ? impersonatedSchool
      : currentUser && currentUser.role !== 'superadmin' && currentUser.schoolCode
      ? schools.find((s) => s.code === currentUser.schoolCode) || schools[0] || null
      : null;

  // Modals state
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isDonationOpen, setIsDonationOpen] = useState(false);
  const [isSubscriptionExpiredOpen, setIsSubscriptionExpiredOpen] = useState(false);
  
  // Payment Modal
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [selectedPlanForPayment, setSelectedPlanForPayment] = useState<'semester' | 'yearly'>('yearly');

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
  const [isStaffManagementOpen, setIsStaffManagementOpen] = useState(false);
  const [isArchiveReportOpen, setIsArchiveReportOpen] = useState(false);
  const [isMapPickerOpen, setIsMapPickerOpen] = useState(false);
  const [isSchoolWizardOpen, setIsSchoolWizardOpen] = useState(false);

  // Student Dossier & QR Card & Correction
  const [selectedStudentForDossier, setSelectedStudentForDossier] = useState<User | null>(null);
  const [selectedStudentForQr, setSelectedStudentForQr] = useState<User | null>(null);
  const [selectedAttendanceForCorrection, setSelectedAttendanceForCorrection] = useState<Attendance | null>(null);

  // Initial & periodic server sync
  useEffect(() => {
    const doSync = () => {
      syncDataFromServer().then((data) => {
        if (data) {
          if (Array.isArray(data.schools)) setSchools(data.schools);
          if (Array.isArray(data.users)) setUsers(data.users);
          if (Array.isArray(data.attendances)) setAttendances(data.attendances);
        }
      });
    };

    doSync();
    const interval = setInterval(doSync, 6000);
    return () => clearInterval(interval);
  }, []);

  // Parse Magic Link / Registration Token / Direct URL on page load
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    
    // Direct Magic Token auto-login
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

    // Direct actions (e.g. ?joinSchool=SCH-7912&action=register)
    const directAction = params.get('action');
    const directSchoolCode = params.get('joinSchool') || params.get('schoolCode') || params.get('code') || params.get('school');
    const directStaffCode = params.get('joinStaff') || params.get('joinTeacher') || params.get('staffToken');

    if (directStaffCode) {
      const parsed = parseParentRegistrationToken(directStaffCode);
      const codeToUse = parsed?.schoolCode || directStaffCode.trim().toUpperCase();
      setStaffRegSchoolCode(codeToUse);
      setIsStaffSelfRegOpen(true);
      return;
    }

    if (directSchoolCode) {
      const parsed = parseParentRegistrationToken(directSchoolCode);
      const codeToUse = parsed?.schoolCode || directSchoolCode.trim().toUpperCase();
      if (directAction === 'staff' || directAction === 'teacher') {
        setStaffRegSchoolCode(codeToUse);
        setIsStaffSelfRegOpen(true);
      } else {
        setSelfRegSchoolCode(codeToUse);
        setIsSelfRegOpen(true);
      }
      return;
    }

    // Parent / Student Self-Registration Token
    const token = params.get('regToken') || params.get('join');
    if (token) {
      const parsed = parseParentRegistrationToken(token);
      if (parsed?.schoolCode) {
        setSelfRegSchoolCode(parsed.schoolCode);
        setIsSelfRegOpen(true);
      } else {
        setSelfRegSchoolCode(token.toUpperCase());
        setIsSelfRegOpen(true);
      }
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
      const updatedUser = { ...currentUser, schoolCode: school.code };
      setCurrentUser(updatedUser);
      setUserState(updatedUser);
    }
    refreshAll();
  };

  const openPaymentWithPlan = (plan: 'semester' | 'yearly' | 'free_forever') => {
    if (plan === 'free_forever') {
      setIsSchoolWizardOpen(true);
    } else {
      setSelectedPlanForPayment(plan);
      setIsPaymentOpen(true);
    }
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
        onSwitchSchool={handleSwitchSchool}
        onLogout={handleLogout}
        onOpenLogin={() => setIsLoginOpen(true)}
        onOpenRegisterSchool={() => setIsSchoolWizardOpen(true)}
        onOpenDonationModal={() => setIsDonationOpen(true)}
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
                onOpenClassExcelManager={() => setIsClassExcelManagerOpen(true)}
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
            />
          )
        ) : currentUser.role === 'employee' && currentSchool ? (
          <EmployeeDashboard
            currentUser={currentUser}
            currentSchool={currentSchool}
            schools={schools}
            onSwitchSchool={handleSwitchSchool}
            onOpenCreateSchool={() => setIsSchoolWizardOpen(true)}
            onOpenDailyReport={() => setIsDailyReportOpen(true)}
            onOpenGatekeeperScanner={() => setIsGatekeeperScannerOpen(true)}
            onOpenMapPicker={() => setIsMapPickerOpen(true)}
            onOpenClassExcelManager={() => setIsClassExcelManagerOpen(true)}
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
          />
        ) : currentUser.role === 'teacher' && currentSchool ? (
          <TeacherPortal
            currentUser={currentUser}
            currentSchool={currentSchool}
            schools={schools}
            onSwitchSchool={handleSwitchSchool}
            onOpenDossier={(student) => setSelectedStudentForDossier(student)}
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
        ) : (
          <LandingPage
            schools={schools}
            onOpenLogin={() => setIsLoginOpen(true)}
            onOpenRegisterSchool={() => setIsSchoolWizardOpen(true)}
            onOpenParentRegistration={() => setIsSelfRegOpen(true)}
            onOpenStaffRegistration={() => setIsStaffSelfRegOpen(true)}
            onOpenPaymentModal={openPaymentWithPlan}
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
        onLoginSuccess={handleLoginSuccess}
        onOpenRegisterSchool={() => {
          setIsLoginOpen(false);
          setIsSchoolWizardOpen(true);
        }}
        onOpenParentRegistration={() => {
          setIsLoginOpen(false);
          setSelfRegSchoolCode(currentSchool?.code || schools[0]?.code || '');
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
          onOpenPaymentModal={(plan) => {
            setIsSubscriptionExpiredOpen(false);
            openPaymentWithPlan(plan);
          }}
        />
      )}

      {/* 5. Payment Info Modal */}
      {currentSchool && (
        <PaymentInfoModal
          isOpen={isPaymentOpen}
          onClose={() => setIsPaymentOpen(false)}
          school={currentSchool}
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
          isOpen={isStaffManagementOpen}
          onClose={() => setIsStaffManagementOpen(false)}
          school={currentSchool}
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
      {currentSchool && (
        <ClassExcelManagerModal
          isOpen={isClassExcelManagerOpen}
          onClose={() => setIsClassExcelManagerOpen(false)}
          school={currentSchool}
          onUpdated={() => refreshAll()}
        />
      )}

      {/* 15. Admin Archive Report Modal */}
      {currentSchool && (
        <AdminArchiveReportModal
          isOpen={isArchiveReportOpen}
          onClose={() => setIsArchiveReportOpen(false)}
          school={currentSchool}
        />
      )}

      {/* 16. Interactive Map Geofence Picker Modal */}
      {isMapPickerOpen && currentSchool && (
        <InteractiveMapPicker
          initialLat={currentSchool.lat}
          initialLng={currentSchool.lng}
          initialRadius={currentSchool.radiusMeters}
          onClose={() => setIsMapPickerOpen(false)}
          onSave={(lat, lng, radius) => {
            const updated = { ...currentSchool, lat, lng, radiusMeters: radius };
            const allSchools = getSchools().map((s) => (s.code === currentSchool.code ? updated : s));
            localStorage.setItem('hodoorak_schools_prod_v1', JSON.stringify(allSchools));
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
        initialPlan="yearly"
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
    </div>
  );
}

export default App;
