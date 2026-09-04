import React, { useState } from 'react';
import { School, User, Attendance, CorrectionRequest } from '../types';
import { 
  getAttendances, saveAttendances, getUsers, 
  getCorrectionRequests, saveCorrectionRequests, updateCorrectionRequest,
  getPermissions, addSystemNotification, cleanResetToEmptyProductionData,
  getSystemNotifications
} from '../utils/storage';
import { getTodayDateString } from '../utils/academic';
import { soundManager } from '../utils/audio';
import { calculateStudentBehaviorScore } from '../utils/behavior';
import { AbsenceActionModal } from './AbsenceActionModal';
import { LiveClockHeader } from './LiveClockHeader';
import { BroadcastAlertBanner } from './BroadcastAlertBanner';
import { EmergencyBroadcastModal } from './EmergencyBroadcastModal';
import { StudentPromotionModal } from './StudentPromotionModal';
import { DataBackupAndStorageModal } from './DataBackupAndStorageModal';
import { AdminStudentExitModal } from './AdminStudentExitModal';
import { 
  Building2, Users, FileText, ScanLine, 
  MapPin, Share2, Upload, Archive, AlertTriangle, 
  CheckCircle, XCircle, Clock, Check, X, Search, 
  Sparkles, ShieldCheck, UserPlus, FileSpreadsheet, Plus, GraduationCap,
  Activity, ShieldAlert, LogOut, Trash2, RefreshCw, User as UserIcon,
  Crown, CreditCard, Megaphone, HardDrive, Database, ArrowLeftRight,
  FileCheck, Code2
} from 'lucide-react';

interface EmployeeDashboardProps {
  currentUser: User;
  currentSchool: School;
  schools?: School[];
  onSwitchSchool?: (school: School) => void;
  onOpenCreateSchool?: () => void;
  onOpenDailyReport: () => void;
  onOpenGatekeeperScanner: () => void;
  onOpenMapPicker: () => void;
  onOpenClassExcelManager: () => void;
  onOpenStaffManagement: () => void;
  onOpenStaffRegistrationLink: () => void;
  onOpenArchiveReport: () => void;
  onOpenParentRegistrationLink: () => void;
  onOpenDirectStudentRegistration: () => void;
  onOpenStudentDossier: (student: User) => void;
  onOpenCounselorApi?: () => void;
}

export const EmployeeDashboard: React.FC<EmployeeDashboardProps> = ({
  currentUser,
  currentSchool,
  schools = [],
  onSwitchSchool,
  onOpenCreateSchool,
  onOpenDailyReport,
  onOpenGatekeeperScanner,
  onOpenMapPicker,
  onOpenClassExcelManager,
  onOpenStaffManagement,
  onOpenStaffRegistrationLink,
  onOpenArchiveReport,
  onOpenParentRegistrationLink,
  onOpenDirectStudentRegistration,
  onOpenStudentDossier,
  onOpenCounselorApi,
}) => {
  const today = getTodayDateString();
  const [attendances, setAttendances] = useState<Attendance[]>(() =>
    getAttendances().filter((a) => a.schoolCode === currentSchool.code && a.date === today)
  );
  const [corrections, setCorrections] = useState<CorrectionRequest[]>(() =>
    getCorrectionRequests().filter((c) => c.schoolCode === currentSchool.code && c.status === 'pending')
  );
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'present' | 'absent' | 'late' | 'truant'>('all');
  const [actionModalStudent, setActionModalStudent] = useState<User | null>(null);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [isBroadcastOpen, setIsBroadcastOpen] = useState(false);
  const [isPromotionOpen, setIsPromotionOpen] = useState(false);
  const [isBackupOpen, setIsBackupOpen] = useState(false);
  const [isExitModalOpen, setIsExitModalOpen] = useState(false);
  const [exitModalStudent, setExitModalStudent] = useState<User | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const allSchoolUsers = getUsers().filter((u) => u.schoolCode === currentSchool.code);
  const allSchoolStudents = allSchoolUsers.filter((u) => u.role === 'student');
  const allSchoolTeachers = allSchoolUsers.filter((u) => u.role === 'teacher');

  const isSuspended = currentSchool.subscriptionStatus === 'pending_payment';
  const isFree = currentSchool.subscriptionPlan === 'free_forever';
  const isYearly = currentSchool.subscriptionPlan === 'yearly';
  const isSemester = currentSchool.subscriptionPlan === 'semester';
  const isPrincipal = !currentUser.staffTitle || currentUser.staffTitle === 'principal';

  // Admin and staff assigned schools list
  const adminManagedSchools = schools.filter(
    (s) =>
      currentUser.managedSchoolCodes?.includes(s.code) ||
      s.code === currentUser.schoolCode
  );

  // Sync attendances and corrections whenever currentSchool changes
  React.useEffect(() => {
    setAttendances(
      getAttendances().filter((a) => a.schoolCode === currentSchool.code && a.date === today)
    );
    setCorrections(
      getCorrectionRequests().filter((c) => c.schoolCode === currentSchool.code && c.status === 'pending')
    );
  }, [currentSchool.code, today, refreshKey]);

  // Compute 5-day unexcused absence alerts across the school
  const studentsWithFiveDaysAbsenceAlert = allSchoolStudents.map((st) => {
    const summary = calculateStudentBehaviorScore(st.id);
    return {
      student: st,
      summary,
    };
  }).filter((item) => item.summary.hasFiveDaysAbsenceAlert);

  const totalStudents = allSchoolStudents.length || attendances.length || 0;
  const presentCount = attendances.filter((a) => a.finalStatus === 'present').length;
  const absentCount = attendances.filter((a) => a.finalStatus === 'absent').length;
  const lateCount = attendances.filter((a) => a.finalStatus === 'late').length;
  const truantList = attendances.filter((a) => a.isTruant);
  const exitedList = attendances.filter((a) => !!a.exitTime);

  // Permissions analytics
  const allPermissions = getPermissions().filter((p) => p.schoolCode === currentSchool.code && p.date === today);
  
  // Group permissions by student to detect ADHD / frequent out of seat
  const studentPermCounts: Record<string, { studentName: string; className: string; sectionName: string; count: number; studentId: string }> = {};
  allPermissions.forEach((p) => {
    if (!studentPermCounts[p.studentId]) {
      studentPermCounts[p.studentId] = {
        studentId: p.studentId,
        studentName: p.studentName,
        className: p.className,
        sectionName: p.sectionName,
        count: 0,
      };
    }
    studentPermCounts[p.studentId].count += 1;
  });

  const highPermissionStudents = Object.values(studentPermCounts).filter((s) => s.count >= 3);

  const attendanceRate = totalStudents > 0 ? Math.round((presentCount / totalStudents) * 100) : 0;

  const handleApproveCorrection = (req: CorrectionRequest) => {
    // 1. Update correction req
    const updatedReq: CorrectionRequest = { 
      ...req, 
      status: 'approved',
      adminDecisionNotes: 'تم اعتماد وقبول العذر الرسمي واستعادة درجات المواظبة بنجاح.'
    };
    updateCorrectionRequest(updatedReq);

    // 2. Update attendance
    const allAtt = getAttendances();
    const idx = allAtt.findIndex((a) => a.id === req.attendanceId || (a.studentId === req.studentId && a.date === req.date));
    if (idx >= 0) {
      allAtt[idx].finalStatus = req.requestedStatus;
      allAtt[idx].excuseStatus = 'accepted';
      allAtt[idx].isTruant = false;
      saveAttendances(allAtt);
      setAttendances(allAtt.filter((a) => a.schoolCode === currentSchool.code && a.date === today));
    }

    // 3. Notify student and parent
    addSystemNotification({
      id: `notif-appr-${Date.now()}`,
      title: `✅ تم قبول عذر الغياب: ${req.studentName}`,
      message: `تم اعتماد العذر الطبي/الرسمي ليوم (${req.date}) واستعادة درجة المواظبة المخصومة (+1 درجة) تلقائياً.`,
      type: 'success',
      targetRole: 'all',
      schoolCode: currentSchool.code,
      createdAt: new Date().toISOString(),
      read: false,
    });

    soundManager.playSuccess();
    setCorrections(getCorrectionRequests().filter((c) => c.schoolCode === currentSchool.code && c.status === 'pending'));
  };

  const handleRejectCorrection = (req: CorrectionRequest) => {
    const updatedReq: CorrectionRequest = { 
      ...req, 
      status: 'rejected',
      adminDecisionNotes: 'تم رفض الطلب لعدم كفاية المستند المرفق أو تعارضه مع اللائحة.'
    };
    updateCorrectionRequest(updatedReq);

    addSystemNotification({
      id: `notif-rej-${Date.now()}`,
      title: `✕ لم يتم قبول العذر: ${req.studentName}`,
      message: `نعتذر، لم يتم اعتماد العذر المقدم ليوم (${req.date}). يمكنك مراجعة إدارة المدرسة للمتابعة.`,
      type: 'warning',
      targetRole: 'all',
      schoolCode: currentSchool.code,
      createdAt: new Date().toISOString(),
      read: false,
    });

    soundManager.playWarning();
    setCorrections(getCorrectionRequests().filter((c) => c.schoolCode === currentSchool.code && c.status === 'pending'));
  };

  const filteredAttendances = attendances.filter((a) => {
    const matchSearch = a.studentName.includes(search) || a.nationalId.includes(search);
    if (!matchSearch) return false;
    if (statusFilter === 'all') return true;
    if (statusFilter === 'truant') return a.isTruant;
    return a.finalStatus === statusFilter;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto py-6 px-4 text-slate-800" dir="rtl">
      
      {/* 1. Live Day, Date & Live Clock Header Bar */}
      <LiveClockHeader />

      {/* 2. Urgent School Broadcast / Dismissal / Weather Suspension Banner */}
      <BroadcastAlertBanner
        notifications={getSystemNotifications().filter(
          (n) => n.schoolCode === currentSchool.code || !n.schoolCode
        )}
      />

      {/* 3. Multi-School Management Bar for Administrators and Staff */}
      <div className="bg-gradient-to-l from-slate-900 via-slate-850 to-slate-900 text-white rounded-3xl p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3 shadow-md border border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-white/10 text-emerald-400 flex items-center justify-center font-bold shrink-0 shadow-inner">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-black text-sm text-white">المدارس المسندة لحسابك</h3>
              <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                {adminManagedSchools.length} {adminManagedSchools.length > 1 ? 'مدارس مسندة' : 'مدرسة مسندة'}
              </span>
            </div>
            <p className="text-xs text-slate-300 font-medium mt-0.5">
              {isPrincipal 
                ? 'يمكنك إدارة مدرستين كحد أقصى بحسابك المعتمد والتبديل المباشر بينهما بضغطة زر.'
                : 'يمكنك العمل في المدارس المسندة إليك والتنقل المباشر والعودة بينها دون تسجيل الخروج.'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 mr-auto sm:mr-0">
          {adminManagedSchools.length > 1 && onSwitchSchool ? (
            <div className="flex items-center gap-2 bg-slate-950/80 px-3 py-1.5 rounded-xl border border-slate-700">
              <ArrowLeftRight className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-xs text-slate-400 font-bold">المدرسة الحالية:</span>
              <select
                value={currentSchool.code}
                onChange={(e) => {
                  const target = schools.find((s) => s.code === e.target.value);
                  if (target) onSwitchSchool(target);
                }}
                className="bg-slate-900 text-emerald-300 font-bold text-xs rounded-lg px-2 py-1 border border-slate-700 focus:outline-emerald-500 cursor-pointer"
                title="التبديل بين المدارس المسندة إليك"
              >
                {adminManagedSchools.map((sch) => (
                  <option key={sch.id} value={sch.code} className="bg-slate-900 text-white">
                    🏢 {sch.name} ({sch.code})
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="bg-white/5 border border-white/10 px-3 py-1.5 rounded-xl text-xs text-slate-300 font-bold flex items-center gap-1.5">
              <span>المدرسة النشطة: <strong>{currentSchool.name}</strong></span>
            </div>
          )}

          {isPrincipal && adminManagedSchools.length < 2 && onOpenCreateSchool && (
            <button
              onClick={onOpenCreateSchool}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs flex items-center gap-1.5 shadow-md shadow-emerald-600/20 cursor-pointer transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة مدرسة ثانية (حد أقصى 2) ➕</span>
            </button>
          )}
        </div>
      </div>

      {/* Suspension Alert if paused by Super Admin */}
      {isSuspended && (
        <div className="bg-rose-600 text-white p-4 sm:p-5 rounded-3xl flex flex-wrap items-center justify-between gap-3 text-xs shadow-lg shadow-rose-600/20 animate-fadeIn border border-rose-500">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white text-rose-700 flex items-center justify-center font-black shrink-0 shadow-sm">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <strong className="font-black text-sm block">⚠️ تنبيه إداري: حساب المدرسة موقوف مؤقتاً حتى السداد</strong>
              <span className="text-rose-100 text-[11px] font-medium">
                تم تعليق تفعيل المنظومة للمدرسة لحين استكمال سداد رسوم الاشتراك واعتمادها من المشرف العام.
              </span>
            </div>
          </div>
          <a
            href="https://wa.me/966548171965"
            target="_blank"
            rel="noreferrer"
            className="px-4 py-2.5 rounded-xl bg-white text-rose-800 font-black text-xs hover:bg-rose-50 transition-colors shrink-0 shadow-xs cursor-pointer flex items-center gap-1.5"
          >
            <span>تواصل مع الدعم الفني للتفعيل 💬</span>
          </a>
        </div>
      )}

      {/* Top Action Bar & School Summary */}
      <div className="bg-white border border-slate-200/90 rounded-3xl p-6 space-y-5 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black text-slate-900">{currentSchool.name}</h2>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-xs font-mono font-bold border border-emerald-200">
                  كود: {currentSchool.code}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                لوحة الإدارة المدرسية الموحدة | مرحباً، {currentUser.name}
              </p>
            </div>
          </div>

          {/* Core Feature Buttons in Top Bar */}
          <div className="flex flex-wrap items-center gap-2">
            
            {/* Urgent Broadcast Button */}
            <button
              onClick={() => setIsBroadcastOpen(true)}
              className="py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs flex items-center gap-2 shadow-md shadow-rose-600/20 cursor-pointer transition-all animate-pulse hover:animate-none"
              title="إرسال تعميم فوري أو تنبيه خروج مبكر أو تعليق دراسة"
            >
              <Megaphone className="w-4 h-4" />
              <span>إرسال تعميم / تنبيه طارئ 🚨</span>
            </button>

            {/* Student Progression / Promotion Button */}
            <button
              onClick={() => setIsPromotionOpen(true)}
              className="py-2.5 px-3.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-200 font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
              title="ترحيل الطلاب للصف التالي وحذف المتخرجين"
            >
              <GraduationCap className="w-4 h-4 text-indigo-600" />
              <span>ترحيل الطلاب للأعلى 🎓</span>
            </button>

            {/* Admin Student Exit Pass Modal Button */}
            <button
              onClick={() => {
                setExitModalStudent(null);
                setIsExitModalOpen(true);
              }}
              className="py-2.5 px-3.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 font-black text-xs flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
              title="منح إذن وتصريح خروج رسمي لطالب من المدرسة ليظهر عند الحارس"
            >
              <LogOut className="w-4 h-4 text-amber-600" />
              <span>منح إذن خروج طالب 🚪</span>
            </button>

            {/* Backup and Data Storage Button */}
            <button
              onClick={() => setIsBackupOpen(true)}
              className="py-2.5 px-3.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200 font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
              title="تخزين البيانات والنسخ الاحتياطي الدائم"
            >
              <Database className="w-4 h-4 text-emerald-600" />
              <span>تخزين ونسخ البيانات 💾</span>
            </button>

            {/* Counselor & External App API Integration */}
            {onOpenCounselorApi && (
              <button
                onClick={onOpenCounselorApi}
                className="py-2.5 px-3.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-200 font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                title="الحصول على رمز التوكن وروابط الربط البرمجي لتطبيق الموجه الطلابي والأنظمة الخارجية"
              >
                <Code2 className="w-4 h-4 text-purple-600" />
                <span>ربط الموجه الطلابي (API) 🔌</span>
              </button>
            )}

            <button
              onClick={onOpenStaffManagement}
              className="py-2.5 px-3.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
            >
              <Users className="w-4 h-4 text-indigo-600" />
              <span>إدارة المعلمين ({allSchoolTeachers.length}) 👥</span>
            </button>

            <button
              onClick={onOpenStaffRegistrationLink}
              className="py-2.5 px-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-indigo-600/20 cursor-pointer"
            >
              <Share2 className="w-4 h-4" />
              <span>رابط دعوة الكادر 🔗</span>
            </button>

            <button
              onClick={onOpenParentRegistrationLink}
              className="py-2.5 px-3.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-600/20 cursor-pointer"
            >
              <Share2 className="w-4 h-4" />
              <span>رابط تسجيل الطلاب والأولياء 🔗</span>
            </button>

            <button
              onClick={onOpenGatekeeperScanner}
              className="py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-teal-800 border border-slate-200 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
            >
              <ScanLine className="w-4 h-4 text-teal-600" />
              <span>ماسح البوابة</span>
            </button>

            <button
              onClick={onOpenDailyReport}
              className="py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-amber-800 border border-slate-200 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
            >
              <FileText className="w-4 h-4 text-amber-600" />
              <span>تقرير المدير</span>
            </button>

            <button
              onClick={onOpenClassExcelManager}
              className="py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-indigo-800 border border-slate-200 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4 text-indigo-600" />
              <span>كشوفات نور</span>
            </button>

            <button
              onClick={onOpenMapPicker}
              className="py-2.5 px-3.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
              title="ضبط السياج الجغرافي"
            >
              <MapPin className="w-4 h-4 text-emerald-600" />
              <span>السياج</span>
            </button>

            <button
              onClick={onOpenArchiveReport}
              className="py-2.5 px-3.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
              title="الأرشيف"
            >
              <Archive className="w-4 h-4 text-slate-600" />
            </button>

            <button
              onClick={() => setIsResetConfirmOpen(true)}
              className="py-2.5 px-3.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-colors"
              title="تصفير وتجهيز النظام للإنتاج بدون بيانات تجريبية"
            >
              <Trash2 className="w-4 h-4 text-rose-600" />
              <span>تجهيز الإنتاج 🧹</span>
            </button>
          </div>
        </div>

        {/* Small Subscription Status Box for School Administrator */}
        <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <div className={`p-3 rounded-2xl border flex items-center gap-3 text-xs transition-all ${
            isSuspended 
              ? 'bg-rose-50/80 border-rose-300 text-rose-950 ring-1 ring-rose-200' 
              : isFree
              ? 'bg-purple-50/80 border-purple-200 text-purple-950'
              : isYearly
              ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
              : 'bg-blue-50/80 border-blue-200 text-blue-950'
          }`}>
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 font-bold ${
              isSuspended ? 'bg-rose-600 text-white' : isFree ? 'bg-purple-600 text-white' : isYearly ? 'bg-emerald-600 text-white' : 'bg-blue-600 text-white'
            }`}>
              {isSuspended ? <ShieldAlert className="w-4 h-4" /> : isFree ? <Sparkles className="w-4 h-4" /> : isYearly ? <Crown className="w-4 h-4" /> : <CreditCard className="w-4 h-4" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-slate-500 font-bold">نوع اشتراك المدرسة:</span>
                <strong className="font-black text-xs">
                  {isFree ? '🌟 اشتراك مجاني دائم' : isYearly ? '👑 اشتراك سنوي (سنة كاملة)' : isSemester ? '📅 اشتراك نصف سنوي (فصلي)' : 'اشتراك تجريبي'}
                </strong>
              </div>
              <div className="text-[10px] text-slate-600 flex items-center gap-2 mt-0.5">
                <span>الحالة: <strong className={isSuspended ? 'text-rose-700 font-black' : 'text-emerald-700 font-bold'}>{isSuspended ? 'موقوف مؤقتاً حتى السداد ⚠️' : 'نشط ومفعل 🟢'}</strong></span>
                <span>•</span>
                <span>تاريخ الانتهاء: <strong className="font-mono text-slate-800">{isFree ? 'دائم (غير محدد)' : currentSchool.subscriptionEndDate}</strong></span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium mr-auto">
            <span>نطاق التحضير الذاتي: <strong className="font-mono text-emerald-700 font-bold">{currentSchool.radiusMeters}م</strong></span>
          </div>
        </div>

        {/* Real-time KPI Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 text-center pt-2">
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 space-y-1">
            <span className="text-[11px] text-slate-500 block font-bold">نسبة الحضور</span>
            <span className="text-xl font-black text-emerald-700">{attendanceRate}%</span>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 space-y-1">
            <span className="text-[11px] text-slate-500 block font-bold">الحاضرون</span>
            <span className="text-xl font-black text-slate-900">{presentCount}</span>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 space-y-1">
            <span className="text-[11px] text-slate-500 block font-bold">الغياب</span>
            <span className="text-xl font-black text-rose-600">{absentCount}</span>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 space-y-1">
            <span className="text-[11px] text-slate-500 block font-bold">كشف التباين</span>
            <span className="text-xl font-black text-amber-600">{truantList.length}</span>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 space-y-1">
            <span className="text-[11px] text-slate-500 block font-bold">انصراف وخروج</span>
            <span className="text-xl font-black text-teal-700">{exitedList.length}</span>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 space-y-1">
            <span className="text-[11px] text-slate-500 block font-bold">استئذانات الحصص</span>
            <span className="text-xl font-black text-indigo-700">{allPermissions.length}</span>
          </div>
        </div>
      </div>

      {/* 5-Day Absence Official Administrative Disciplinary Alert */}
      {studentsWithFiveDaysAbsenceAlert.length > 0 && (
        <div className="bg-rose-50 border-2 border-rose-300 rounded-3xl p-6 text-xs text-rose-950 space-y-4 shadow-sm animate-fadeIn">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-rose-200/80 pb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-600 text-white flex items-center justify-center font-black shadow-xs">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <strong className="text-sm text-rose-950 font-black block">
                  🚨 مؤشر تنبيه تكرار الغياب بدون عذر (5 أيام فما فوق) - ({studentsWithFiveDaysAbsenceAlert.length} طلاب):
                </strong>
                <span className="text-[11px] text-rose-800 font-medium">
                  وفق لائحة السلوك والمواظبة، يلزم اتخاذ وتوثيق إجراء إداري رسمي (تعهد/إنذار/اتصال) وإعادة ضبط الدورة.
                </span>
              </div>
            </div>

            <span className="px-3 py-1 rounded-full bg-rose-200 text-rose-900 font-black text-xs border border-rose-300">
              إجراء عاجل مطلوب
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {studentsWithFiveDaysAbsenceAlert.map(({ student, summary }) => (
              <div
                key={student.id}
                className="bg-white border border-rose-200 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 shadow-xs"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center text-slate-400 shrink-0">
                    {student.avatar ? (
                      <img src={student.avatar} alt={student.name} className="w-full h-full object-cover" />
                    ) : (
                      <GraduationCap className="w-6 h-6 text-indigo-700" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <strong className="text-slate-900 font-black text-sm">{student.name}</strong>
                      <span className="px-2 py-0.5 rounded-md bg-rose-100 text-rose-900 text-[10px] font-black">
                        {summary.unexcusedInCurrentCycleCount} أيام غياب
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      {student.className} - فصل {student.sectionName} | هوية: {student.nationalId}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      جوال ولي الأمر: <span className="font-mono font-bold text-emerald-700">{student.parentMobile || '--'}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onOpenStudentDossier(student)}
                    className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
                  >
                    الملف الأكاديمي
                  </button>
                  <button
                    onClick={() => setActionModalStudent(student)}
                    className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs flex items-center gap-1 cursor-pointer shadow-xs"
                  >
                    <ShieldAlert className="w-3.5 h-3.5" />
                    <span>اتخاذ إجراء إداري 📝</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Frequent Permissions / ADHD Diagnostic Alert Banner for Admin & Counselors */}
      {highPermissionStudents.length > 0 && (
        <div className="bg-amber-50 border border-amber-300 rounded-3xl p-5 text-xs text-amber-900 space-y-2 animate-fadeIn shadow-xs">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0" />
            <strong className="text-sm text-amber-950 font-black">
              تنبيه الموجه الطلابي: رصد تكرار الاستئذان المفرط ({highPermissionStudents.length} طلاب - مؤشر فرط حركة/تشتت):
            </strong>
          </div>
          <p className="text-amber-800 leading-relaxed">
            الطلاب التاليون استأذنوا 3 مرات أو أكثر خلال حصص اليوم، ويُنصح بمتابعة حالتهم الصفية والتواصل مع معلمي المواد:
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            {highPermissionStudents.map((st) => {
              const u = allSchoolStudents.find((student) => student.id === st.studentId);
              return (
                <button
                  key={st.studentId}
                  onClick={() => u && onOpenStudentDossier(u)}
                  className="px-3 py-1.5 rounded-xl bg-amber-100/90 hover:bg-amber-200 text-amber-950 border border-amber-300 font-black flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <Activity className="w-3.5 h-3.5 text-amber-700" />
                  <span>{st.studentName} ({st.className} - فصل {st.sectionName}) : {st.count} استئذانات ⚠️</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Truancy Alert Banner */}
      {truantList.length > 0 && (
        <div className="bg-rose-50 border border-rose-200 rounded-3xl p-5 text-xs text-rose-800 space-y-2 animate-fadeIn shadow-xs">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
            <strong className="text-sm text-rose-900 font-black">
              تنبيه كشف التباين والهروب الفوري ({truantList.length} طالب):
            </strong>
          </div>
          <p className="text-slate-600">
            تم رصد حضور هؤلاء الطلاب عند بوابة المدرسة الصباحية، لكن المعلمين رصدوهم غائبين في الحصة:
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            {truantList.map((t) => (
              <span key={t.id} className="px-3 py-1 rounded-xl bg-rose-100 border border-rose-200 text-rose-900 font-bold">
                {t.studentName} ({t.className} - فصل {t.sectionName})
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Pending Correction & Excuse Requests */}
      {corrections.length > 0 && (
        <div className="bg-white border border-amber-200 rounded-3xl p-6 space-y-4 shadow-xs">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-600" />
            <h3 className="font-black text-base text-slate-900">
              طلبات الأعذار والتصحيح المعلقة من أولياء الأمور ({corrections.length})
            </h3>
          </div>

          <div className="space-y-2.5">
            {corrections.map((req) => (
              <div
                key={req.id}
                className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 text-xs"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <strong className="text-slate-900 text-sm">{req.studentName}</strong>
                    <span className="text-slate-500">({req.className} - فصل {req.sectionName})</span>
                    <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 text-[10px] font-bold border border-amber-200">
                      مقدم من: {req.requesterName} ({req.requestedByRole === 'parent' ? 'ولي أمر' : 'طالب'})
                    </span>
                  </div>
                  <p className="text-slate-600 mt-1">السبب: {req.reason}</p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleRejectCorrection(req)}
                    className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold cursor-pointer"
                  >
                    رفض
                  </button>
                  <button
                    onClick={() => handleApproveCorrection(req)}
                    className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center gap-1 cursor-pointer shadow-xs"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>قبول واعتماد العذر</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Today's Live Attendance Table */}
      <div className="bg-white border border-slate-200/90 rounded-3xl p-6 space-y-4 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-emerald-600" />
            <h3 className="font-black text-base text-slate-900">كشف الطلاب وسجل الحضور اليوم ({attendances.length})</h3>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <div className="w-48">
              <input
                type="text"
                placeholder="بحث بالطالب أو الهوية..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-slate-800 placeholder-slate-400 focus:outline-emerald-500"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'all' | 'present' | 'absent' | 'late' | 'truant')}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-slate-800 focus:outline-emerald-500 font-medium"
            >
              <option value="all">الكل</option>
              <option value="present">حاضر</option>
              <option value="absent">غائب</option>
              <option value="late">متأخر</option>
              <option value="truant">حالات التباين ⚠️</option>
            </select>

            <button
              onClick={onOpenDirectStudentRegistration}
              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center gap-1 cursor-pointer shadow-xs"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>تسجيل طالب يدوي</span>
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="border border-slate-200 rounded-2xl overflow-hidden max-h-96 overflow-y-auto text-xs">
          <table className="w-full text-right">
            <thead className="bg-slate-50 text-slate-700 sticky top-0 border-b border-slate-200">
              <tr>
                <th className="p-3 font-bold">الطالب</th>
                <th className="p-3 font-bold">الصف والفصل</th>
                <th className="p-3 font-bold">مسح البوابة</th>
                <th className="p-3 font-bold">رصد الحصة</th>
                <th className="p-3 font-bold">استئذانات الحصة</th>
                <th className="p-3 font-bold">الحالة والخروج</th>
                <th className="p-3 text-center font-bold">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredAttendances.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-slate-400">
                    {attendances.length === 0 
                      ? 'لا توجد سجلات حضور مسجلة لهذا اليوم حتى الآن. يمكنك استيراد كشف نور أو تسجيل الطلاب ذاتياً.'
                      : 'لا توجد سجلات مطابقة للبحث أو التصفية'}
                  </td>
                </tr>
              ) : (
                filteredAttendances.map((a) => {
                  const studentUser = allSchoolStudents.find((u) => u.id === a.studentId || u.nationalId === a.nationalId);
                  const pCount = studentPermCounts[a.studentId]?.count || 0;

                  return (
                    <tr key={a.id} className="hover:bg-slate-50/80">
                      <td className="p-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center text-slate-400 shrink-0">
                            {studentUser?.avatar ? (
                              <img src={studentUser.avatar} alt={a.studentName} className="w-full h-full object-cover" />
                            ) : (
                              <UserIcon className="w-4 h-4 text-slate-400" />
                            )}
                          </div>
                          <div>
                            <strong className="text-slate-900 block font-bold">{a.studentName}</strong>
                            <span className="text-[10px] font-mono text-slate-500">هوية: {a.nationalId}</span>
                          </div>
                        </div>
                      </td>
                      <td className="p-3 text-slate-600">
                        {a.className} - فصل {a.sectionName}
                      </td>
                      <td className="p-3 font-mono">
                        {a.selfCheckTime ? (
                          <span className="text-emerald-700 font-bold">{a.selfCheckTime}</span>
                        ) : (
                          <span className="text-slate-400">لم يسجل</span>
                        )}
                      </td>
                      <td className="p-3">
                        {a.teacherMark === 'present' ? 'حاضر' : a.teacherMark === 'absent' ? 'غائب' : a.teacherMark === 'late' ? 'متأخر' : '--'}
                      </td>
                      <td className="p-3">
                        {pCount >= 3 ? (
                          <span className="px-2 py-0.5 rounded-md bg-rose-100 text-rose-900 font-black text-[10px] border border-rose-200 animate-pulse">
                            ⚠️ {pCount} استئذانات (فرط حركة)
                          </span>
                        ) : pCount > 0 ? (
                          <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-800 font-bold text-[10px] border border-indigo-200">
                            {pCount} استئذان
                          </span>
                        ) : (
                          <span className="text-slate-400">لا يوجد</span>
                        )}
                      </td>
                      <td className="p-3">
                        <div className="flex flex-col gap-1 items-start">
                          <div className="flex items-center gap-1.5">
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                              a.finalStatus === 'present' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' :
                              a.finalStatus === 'absent' ? 'bg-rose-50 text-rose-800 border border-rose-200' : 'bg-amber-50 text-amber-800 border border-amber-200'
                            }`}>
                              {a.finalStatus === 'present' ? 'حاضر' : a.finalStatus === 'absent' ? 'غائب' : 'متأخر'}
                            </span>
                            {a.isTruant && (
                              <span className="px-1.5 py-0.5 rounded-md bg-rose-100 text-rose-900 border border-rose-300 text-[9px] font-black">
                                تباين ⚠️
                              </span>
                            )}
                          </div>
                          {a.exitTime && (
                            <span className="text-[10px] font-mono font-bold text-amber-800 bg-amber-100/80 px-1.5 py-0.5 rounded-md">
                              🚪 غادر: {a.exitTime}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {studentUser && (
                            <button
                              onClick={() => onOpenStudentDossier(studentUser)}
                              className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 font-bold text-[11px] border border-slate-200 cursor-pointer"
                            >
                              الملف الشامل
                            </button>
                          )}
                          {studentUser && (
                            <button
                              onClick={() => {
                                setExitModalStudent(studentUser);
                                setIsExitModalOpen(true);
                              }}
                              className="p-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 cursor-pointer"
                              title="منح تصريح خروج إداري رسمي"
                            >
                              <LogOut className="w-3.5 h-3.5 text-amber-700" />
                            </button>
                          )}
                          {studentUser && (
                            <button
                              onClick={() => setActionModalStudent(studentUser)}
                              className="p-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 cursor-pointer"
                              title="إجراء إداري"
                            >
                              <ShieldAlert className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Absence Action Modal */}
      {actionModalStudent && (
        <AbsenceActionModal
          isOpen={!!actionModalStudent}
          onClose={() => setActionModalStudent(null)}
          student={actionModalStudent}
          currentUser={currentUser}
          currentSchool={currentSchool}
          onSaved={() => {
            setActionModalStudent(null);
            setRefreshKey((k) => k + 1);
          }}
        />
      )}

      {/* Emergency Broadcast / Suspension / Early Dismissal Modal */}
      <EmergencyBroadcastModal
        isOpen={isBroadcastOpen}
        onClose={() => setIsBroadcastOpen(false)}
        school={currentSchool}
        currentUser={currentUser}
        onBroadcastSent={() => {
          setRefreshKey((k) => k + 1);
        }}
      />

      {/* Student Promotion & Progression Modal */}
      <StudentPromotionModal
        isOpen={isPromotionOpen}
        onClose={() => setIsPromotionOpen(false)}
        school={currentSchool}
        onSuccess={() => {
          setRefreshKey((k) => k + 1);
        }}
      />

      {/* Data Backup, Storage Explanation & Export Modal */}
      <DataBackupAndStorageModal
        isOpen={isBackupOpen}
        onClose={() => setIsBackupOpen(false)}
        school={currentSchool}
        currentUser={currentUser}
      />

      {/* Admin Student Exit Permission Modal */}
      <AdminStudentExitModal
        isOpen={isExitModalOpen}
        onClose={() => {
          setIsExitModalOpen(false);
          setExitModalStudent(null);
        }}
        school={currentSchool}
        currentUser={currentUser}
        initialStudent={exitModalStudent || undefined}
        onIssued={() => {
          setRefreshKey((k) => k + 1);
          setAttendances(getAttendances().filter((a) => a.schoolCode === currentSchool.code && a.date === today));
        }}
      />

      {/* Clean Production Reset Confirmation Modal */}
      {isResetConfirmOpen && (
        <div 
          onClick={(e) => { if (e.target === e.currentTarget) setIsResetConfirmOpen(false); }}
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn"
          dir="rtl"
        >
          <div className="bg-white border border-rose-200 rounded-3xl max-w-md w-full p-6 text-right space-y-4 shadow-2xl text-slate-800">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1.5">
              <h3 className="text-base font-black text-slate-900">
                تصفير وتجهيز النظام للإنتاج بدون بيانات تجريبية
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                سيتم مسح سجلات الحضور والانصراف السابقة، وسجلات السلوك والأعذار والاستئذانات لتسليم النظام جاهزاً ونظيفاً للمدرسة، مع الحفاظ على حسابات المدرسة والمدير والطلاب.
              </p>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-[11px] text-amber-900 space-y-1">
              <strong>تنبيه:</strong> هذا الإجراء لا يمكن التراجع عنه ويُستخدم قبل بدء العام الدراسي أو عند إعادة التدشين.
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                onClick={() => setIsResetConfirmOpen(false)}
                className="py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
              >
                إلغاء
              </button>
              <button
                onClick={() => {
                  cleanResetToEmptyProductionData();
                  soundManager.playSuccess();
                  setIsResetConfirmOpen(false);
                  window.location.reload();
                }}
                className="py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs cursor-pointer shadow-md shadow-rose-600/20"
              >
                تأكيد التصفير والتنظيف 🧹
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
