import React, { useState } from 'react';
import { School, User, Attendance, CorrectionRequest } from '../types';
import { 
  getAttendances, saveAttendances, getUsers, saveUsers,
  getCorrectionRequests, saveCorrectionRequests, updateCorrectionRequest,
  getPermissions, addSystemNotification, cleanResetToEmptyProductionData,
  getSystemNotifications, getPaymentRequests, getUserAssignedSchools,
  deleteAttendance, deleteAttendances, bulkConvertAttendanceRecordsToPresent,
  getStudentExcuseStats
} from '../utils/storage';
import { getSchoolClasses } from '../utils/schoolClasses';
import { getTodayDateString } from '../utils/academic';
import { soundManager } from '../utils/audio';
import { calculateStudentBehaviorScore } from '../utils/behavior';
import { isAbsenceSuspendedForSchool, setSchoolAbsenceSuspension } from '../utils/schoolSchedule';
import { AbsenceActionModal } from './AbsenceActionModal';
import { LiveClockHeader } from './LiveClockHeader';
import { BroadcastAlertBanner } from './BroadcastAlertBanner';
import { EmergencyBroadcastModal } from './EmergencyBroadcastModal';
import { StudentPromotionModal } from './StudentPromotionModal';
import { DataBackupAndStorageModal } from './DataBackupAndStorageModal';
import { AdminStudentExitModal } from './AdminStudentExitModal';
import { StudentAbsenceDirectoryModal } from './StudentAbsenceDirectoryModal';
import { AttendanceEditModal } from './AttendanceEditModal';
import { ParentSummonModal } from './ParentSummonModal';
import { BehaviorRecordModal } from './BehaviorRecordModal';
import { 
  Building2, Users, FileText, ScanLine, 
  MapPin, Share2, Upload, Archive, AlertTriangle, 
  CheckCircle, XCircle, Clock, Check, X, Search, 
  Sparkles, ShieldCheck, UserPlus, FileSpreadsheet, Plus, GraduationCap,
  Activity, ShieldAlert, LogOut, Trash2, RefreshCw, User as UserIcon,
  Crown, CreditCard, Megaphone, HardDrive, Database, ArrowLeftRight,
  FileCheck, Code2, Paperclip, Eye, ExternalLink, FileCheck2, HelpCircle, CheckCircle2,
  Wrench, Edit3, Zap, CheckSquare, Square, Layers, CloudRain, Mail, Star
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
  onOpenClassManagerTab?: (tab: 'excel' | 'manual' | 'classes') => void;
  onOpenStaffManagement: () => void;
  onOpenStaffRegistrationLink: () => void;
  onOpenArchiveReport: () => void;
  onOpenParentRegistrationLink: () => void;
  onOpenDirectStudentRegistration: () => void;
  onOpenStudentDossier: (student: User) => void;
  onOpenCounselorApi?: () => void;
  onOpenPaymentModal?: (plan?: 'yearly') => void;
  onOpenClassRoster?: (className?: string, sectionName?: string) => void;
  onSwitchToParentView?: () => void;
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
  onOpenClassManagerTab,
  onOpenStaffManagement,
  onOpenStaffRegistrationLink,
  onOpenArchiveReport,
  onOpenParentRegistrationLink,
  onOpenDirectStudentRegistration,
  onOpenStudentDossier,
  onOpenCounselorApi,
  onOpenPaymentModal,
  onOpenClassRoster,
  onSwitchToParentView,
}) => {
  const today = getTodayDateString();

  // Helper to reliably match school code or school id (case-insensitive & trimmed)
  const isSchoolMatch = (codeOrId?: string) => {
    if (!codeOrId) return true;
    const clean = String(codeOrId).trim().toUpperCase();
    const sCode = String(currentSchool.code || '').trim().toUpperCase();
    const sId = String(currentSchool.id || '').trim().toUpperCase();
    if (clean === sCode || clean === sId) return true;
    // If only one school exists in the app, map all records to it
    if (schools && schools.length === 1) return true;
    // If the current user manages this school code
    if (currentUser.managedSchoolCodes?.some((mc) => mc && mc.trim().toUpperCase() === clean)) {
      return true;
    }
    return false;
  };

  const [attendances, setAttendances] = useState<Attendance[]>(() =>
    getAttendances().filter((a) => isSchoolMatch(a.schoolCode) && a.date === today)
  );
  const [corrections, setCorrections] = useState<CorrectionRequest[]>(() =>
    getCorrectionRequests().filter((c) => isSchoolMatch(c.schoolCode) && c.status === 'pending')
  );
  const [allSchoolCorrections, setAllSchoolCorrections] = useState<CorrectionRequest[]>(() =>
    getCorrectionRequests().filter((c) => isSchoolMatch(c.schoolCode))
  );
  const [excuseFilterTab, setExcuseFilterTab] = useState<'pending' | 'resolved'>('pending');
  const [rejectingRequest, setRejectingRequest] = useState<CorrectionRequest | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [conditionalRequest, setConditionalRequest] = useState<CorrectionRequest | null>(null);
  const [conditionalMessage, setConditionalMessage] = useState('تم قبول عذره لهذه المرة فقط، ويرجى إحضار عذر رسمي في المرة القادمة.');
  const [previewAttachment, setPreviewAttachment] = useState<{ url: string; title: string } | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'present' | 'absent' | 'late' | 'truant'>('all');
  const [actionModalStudent, setActionModalStudent] = useState<User | null>(null);
  const [isAbsenceDirectoryOpen, setIsAbsenceDirectoryOpen] = useState(false);
  const [editAttendanceItem, setEditAttendanceItem] = useState<{ attendance: Attendance; studentName: string } | null>(null);
  const [attendanceItemToDelete, setAttendanceItemToDelete] = useState<Attendance | null>(null);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [isBroadcastOpen, setIsBroadcastOpen] = useState(false);
  const [isPromotionOpen, setIsPromotionOpen] = useState(false);
  const [isBackupOpen, setIsBackupOpen] = useState(false);
  const [isExitModalOpen, setIsExitModalOpen] = useState(false);
  const [exitModalStudent, setExitModalStudent] = useState<User | null>(null);
  const [isParentSummonModalOpen, setIsParentSummonModalOpen] = useState(false);
  const [summonModalStudent, setSummonModalStudent] = useState<User | null>(null);
  const [isBehaviorModalOpen, setIsBehaviorModalOpen] = useState(false);
  const [behaviorModalStudent, setBehaviorModalStudent] = useState<User | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Weather / Rain Emergency Absence Suspension State
  const [isRainModalOpen, setIsRainModalOpen] = useState(false);
  const [rainSuspensionReason, setRainSuspensionReason] = useState(
    currentSchool.absenceSuspensionReason || 'حالة مطرية مفاجئة وتحذيرات دفاع مدني / تعليق الدراسة'
  );
  const isRainAbsenceSuspended = isAbsenceSuspendedForSchool(currentSchool, today);

  const handleToggleAbsenceSuspension = (suspend: boolean, customReason?: string) => {
    setSchoolAbsenceSuspension(
      currentSchool.code,
      today,
      suspend,
      customReason || rainSuspensionReason
    );
    soundManager.playSuccess();
    setIsRainModalOpen(false);
    setAttendances(getAttendances().filter((a) => isSchoolMatch(a.schoolCode) && a.date === today));
    setRefreshKey((k) => k + 1);
    window.dispatchEvent(new Event('storage'));
  };

  const allSchoolUsers = getUsers().filter((u) => isSchoolMatch(u.schoolCode));
  const allSchoolStudents = allSchoolUsers.filter((u) => u.role === 'student');
  const allSchoolTeachers = allSchoolUsers.filter((u) => u.role === 'teacher');

  const schoolClasses = getSchoolClasses(currentSchool);
  const totalSectionsCount = schoolClasses.reduce((acc, c) => acc + c.sections.length, 0);

  const isSuspended = currentSchool.subscriptionStatus === 'pending_payment';
  const isFree = currentSchool.subscriptionPlan === 'free_forever';
  const isYearly = currentSchool.subscriptionPlan === 'yearly';
  const isSemester = currentSchool.subscriptionPlan === 'semester';
  const isPrincipal = !currentUser.staffTitle || currentUser.staffTitle === 'principal';

  // Subscription payment requests status
  const schoolPayments = getPaymentRequests().filter((p) => isSchoolMatch(p.schoolCode));
  const pendingPayment = schoolPayments.find((p) => p.status === 'pending');
  const approvedPayment = schoolPayments.find((p) => p.status === 'approved');

  // Admin and staff assigned schools list (robust matching across codes, ids, and current active school)
  const userAssignedList = getUserAssignedSchools(currentUser, schools);
  const adminManagedSchools = schools.filter(
    (s) =>
      s.code === currentSchool.code ||
      s.id === currentSchool.id ||
      userAssignedList.some((us) => us.code === s.code || us.id === s.id)
  );

  // Sync attendances and corrections whenever currentSchool changes
  React.useEffect(() => {
    setAttendances(
      getAttendances().filter((a) => isSchoolMatch(a.schoolCode) && a.date === today)
    );
    const schoolReqs = getCorrectionRequests().filter((c) => isSchoolMatch(c.schoolCode));
    setAllSchoolCorrections(schoolReqs);
    setCorrections(schoolReqs.filter((c) => c.status === 'pending'));
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
  const absentCount = isRainAbsenceSuspended
    ? 0
    : attendances.filter((a) => a.finalStatus === 'absent').length;
  const lateCount = attendances.filter((a) => a.finalStatus === 'late').length;
  const truantList = attendances.filter((a) => a.isTruant);
  const exitedList = attendances.filter((a) => !!a.exitTime);

  // Permissions analytics
  const allPermissions = getPermissions().filter((p) => isSchoolMatch(p.schoolCode) && p.date === today);
  
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

  const attendanceRate = totalStudents > 0 
    ? (isRainAbsenceSuspended ? 100 : Math.round((presentCount / totalStudents) * 100)) 
    : 0;

  const handleApproveCorrection = (req: CorrectionRequest) => {
    // 1. Update correction req with decision audit trail
    const updatedReq: CorrectionRequest = { 
      ...req, 
      status: 'approved',
      adminDecisionNotes: 'تم اعتماد وقبول العذر الرسمي واستعادة درجات المواظبة بنجاح.',
      decidedByName: currentUser.name || 'إدارة المدرسة',
      decidedByRole: currentUser.role || 'employee',
      decidedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    updateCorrectionRequest(updatedReq);

    // 2. Update attendance record or create one if not yet recorded
    const allAtt = getAttendances();
    const idx = allAtt.findIndex((a) => a.id === req.attendanceId || (a.studentId === req.studentId && a.date === req.date));
    if (idx >= 0) {
      allAtt[idx].finalStatus = req.requestedStatus || 'excused';
      allAtt[idx].excuseStatus = 'accepted';
      allAtt[idx].isTruant = false;
      allAtt[idx].excuseReason = req.reason || allAtt[idx].excuseReason;
      saveAttendances(allAtt);
      setAttendances(allAtt.filter((a) => isSchoolMatch(a.schoolCode) && a.date === today));
    } else {
      const newAtt: Attendance = {
        id: req.attendanceId || `att-${req.studentId}-${req.date}`,
        studentId: req.studentId,
        studentName: req.studentName,
        nationalId: req.nationalId || '',
        schoolCode: req.schoolCode || currentSchool.code,
        className: req.className,
        sectionName: req.sectionName,
        date: req.date,
        finalStatus: req.requestedStatus || 'excused',
        excuseStatus: 'accepted',
        excuseReason: req.reason,
        isTruant: false,
      };
      allAtt.push(newAtt);
      saveAttendances(allAtt);
      setAttendances(allAtt.filter((a) => isSchoolMatch(a.schoolCode) && a.date === today));
    }

    // 3. Notify student and parent
    addSystemNotification({
      id: `notif-appr-${Date.now()}`,
      title: `✅ تم قبول عذر الغياب: ${req.studentName}`,
      message: `تم اعتماد العذر الطبي/الرسمي ليوم (${req.date}) واستعادة درجة المواظبة المخصومة (+1 درجة) تلقائياً. ملاحظة الإدارة: ${updatedReq.adminDecisionNotes}`,
      type: 'success',
      targetRole: 'all',
      schoolCode: currentSchool.code,
      createdAt: new Date().toISOString(),
      read: false,
    });

    soundManager.playSuccess();
    const updatedAll = getCorrectionRequests().filter((c) => isSchoolMatch(c.schoolCode));
    setAllSchoolCorrections(updatedAll);
    setCorrections(updatedAll.filter((c) => c.status === 'pending'));
    setRefreshKey((k) => k + 1);
  };

  const handleOpenRejectModal = (req: CorrectionRequest) => {
    setRejectingRequest(req);
    setRejectReason('التقرير الطبي غير مختوم أو غير صادر من جهة معتمدة (منصة صحتي).');
  };

  const handleConfirmReject = () => {
    if (!rejectingRequest) return;
    const finalReason = rejectReason.trim() || 'تم رفض العذر لعدم كفاية المستند المرفق أو تعارضه مع لائحة المواظبة.';
    
    const updatedReq: CorrectionRequest = { 
      ...rejectingRequest, 
      status: 'rejected',
      adminDecisionNotes: finalReason,
      decidedByName: currentUser.name || 'إدارة المدرسة',
      decidedByRole: currentUser.role || 'employee',
      decidedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    updateCorrectionRequest(updatedReq);

    // Update attendance excuseStatus to rejected
    const allAtt = getAttendances();
    const idx = allAtt.findIndex((a) => a.id === rejectingRequest.attendanceId || (a.studentId === rejectingRequest.studentId && a.date === rejectingRequest.date));
    if (idx >= 0) {
      allAtt[idx].excuseStatus = 'rejected';
      saveAttendances(allAtt);
    }

    addSystemNotification({
      id: `notif-rej-${Date.now()}`,
      title: `✕ تم رفض عذر الغياب: ${rejectingRequest.studentName}`,
      message: `نعتذر، لم يتم اعتماد العذر المقدم ليوم (${rejectingRequest.date}). سبب الرفض المدون من الإدارة: "${finalReason}".`,
      type: 'warning',
      targetRole: 'all',
      schoolCode: currentSchool.code,
      createdAt: new Date().toISOString(),
      read: false,
    });

    soundManager.playWarning();
    setRejectingRequest(null);
    setRejectReason('');
    const updatedAll = getCorrectionRequests().filter((c) => isSchoolMatch(c.schoolCode));
    setAllSchoolCorrections(updatedAll);
    setCorrections(updatedAll.filter((c) => c.status === 'pending'));
    setRefreshKey((k) => k + 1);
  };

  const handleOpenConditionalModal = (req: CorrectionRequest) => {
    setConditionalRequest(req);
    setConditionalMessage('تم قبول عذره لهذه المرة فقط، ويرجى إحضار عذر رسمي في المرة القادمة.');
  };

  const handleConfirmConditionalApprove = () => {
    if (!conditionalRequest) return;
    const finalNotes = conditionalMessage.trim() || 'تم قبول عذره لهذه المرة فقط، ويرجى إحضار عذر رسمي في المرة القادمة.';

    // 1. Update correction request
    const updatedReq: CorrectionRequest = {
      ...conditionalRequest,
      status: 'approved',
      approvalType: 'conditional',
      adminDecisionNotes: finalNotes,
      decidedByName: currentUser.name || 'إدارة المدرسة',
      decidedByRole: currentUser.role || 'employee',
      decidedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    updateCorrectionRequest(updatedReq);

    // 2. Update attendance record or create one if not yet recorded
    const allAtt = getAttendances();
    const idx = allAtt.findIndex(
      (a) => a.id === conditionalRequest.attendanceId || (a.studentId === conditionalRequest.studentId && a.date === conditionalRequest.date)
    );
    if (idx >= 0) {
      allAtt[idx].finalStatus = conditionalRequest.requestedStatus || 'excused';
      allAtt[idx].excuseStatus = 'conditional_accepted';
      allAtt[idx].excuseDecisionType = 'conditional';
      allAtt[idx].isTruant = false;
      allAtt[idx].adminDecisionNotes = finalNotes;
      allAtt[idx].excuseReason = conditionalRequest.reason || allAtt[idx].excuseReason;
      saveAttendances(allAtt);
      setAttendances(allAtt.filter((a) => isSchoolMatch(a.schoolCode) && a.date === today));
    } else {
      const newAtt: Attendance = {
        id: conditionalRequest.attendanceId || `att-${conditionalRequest.studentId}-${conditionalRequest.date}`,
        studentId: conditionalRequest.studentId,
        studentName: conditionalRequest.studentName,
        nationalId: conditionalRequest.nationalId || '',
        schoolCode: conditionalRequest.schoolCode || currentSchool.code,
        className: conditionalRequest.className,
        sectionName: conditionalRequest.sectionName,
        date: conditionalRequest.date,
        finalStatus: conditionalRequest.requestedStatus || 'excused',
        excuseStatus: 'conditional_accepted',
        excuseDecisionType: 'conditional',
        adminDecisionNotes: finalNotes,
        excuseReason: conditionalRequest.reason,
        isTruant: false,
      };
      allAtt.push(newAtt);
      saveAttendances(allAtt);
      setAttendances(allAtt.filter((a) => isSchoolMatch(a.schoolCode) && a.date === today));
    }

    // 3. Notify student and parent
    addSystemNotification({
      id: `notif-cond-${Date.now()}`,
      title: `⚠️ تم القبول المشروط لعذر الغياب: ${conditionalRequest.studentName}`,
      message: `أحاطتكم إدارة المدرسة علماً بأنه تم قبول عذر الغياب ليوم (${conditionalRequest.date}) قبولاً مشروطاً. توجيه ورسالة الإدارة لولي الأمر: "${finalNotes}". يرجى الالتزام بالتعليمات الموضحة والتقارير المعتمدة.`,
      type: 'warning',
      targetRole: 'all',
      schoolCode: currentSchool.code,
      createdAt: new Date().toISOString(),
      read: false,
    });

    soundManager.playWarning();
    setConditionalRequest(null);
    setConditionalMessage('');
    const updatedAll = getCorrectionRequests().filter((c) => isSchoolMatch(c.schoolCode));
    setAllSchoolCorrections(updatedAll);
    setCorrections(updatedAll.filter((c) => c.status === 'pending'));
    setRefreshKey((k) => k + 1);
  };

  const filteredAttendances = attendances.filter((a) => {
    const matchSearch = a.studentName.includes(search) || a.nationalId.includes(search);
    if (!matchSearch) return false;
    if (statusFilter === 'all') return true;
    if (statusFilter === 'truant') return a.isTruant;
    return a.finalStatus === statusFilter;
  });

  // Multi-student selection state for Today's Live Attendance Table
  const [selectedLiveAttendanceIds, setSelectedLiveAttendanceIds] = useState<Set<string>>(new Set());
  const [liveBulkAction, setLiveBulkAction] = useState<'convert_to_present' | 'delete_absences' | null>(null);
  const [liveBulkReason, setLiveBulkReason] = useState<string>('تصحيح إداري بسبب عطل تقني في النظام وإعادة بدء الحساب');

  const toggleSelectLiveAttendance = (id: string) => {
    setSelectedLiveAttendanceIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAllLiveVisible = () => {
    const next = new Set<string>();
    filteredAttendances.forEach((a) => next.add(a.id));
    setSelectedLiveAttendanceIds(next);
  };

  const handleSelectAllLiveAbsents = () => {
    const next = new Set<string>();
    filteredAttendances
      .filter((a) => a.finalStatus === 'absent')
      .forEach((a) => next.add(a.id));
    setSelectedLiveAttendanceIds(next);
  };

  const handleClearLiveSelection = () => {
    setSelectedLiveAttendanceIds(new Set());
  };

  const isAllLiveVisibleSelected =
    filteredAttendances.length > 0 &&
    filteredAttendances.every((a) => selectedLiveAttendanceIds.has(a.id));

  const selectedLiveAttsList = attendances.filter((a) => selectedLiveAttendanceIds.has(a.id));
  const selectedLiveAbsentsCount = selectedLiveAttsList.filter((a) => a.finalStatus === 'absent').length;

  const handleExecuteLiveBulkAction = () => {
    if (!liveBulkAction || selectedLiveAttendanceIds.size === 0) return;

    const attIds = Array.from(selectedLiveAttendanceIds);
    const studentIds = Array.from(new Set(selectedLiveAttsList.map((a) => a.studentId)));

    if (liveBulkAction === 'convert_to_present') {
      const result = bulkConvertAttendanceRecordsToPresent(
        attIds,
        liveBulkReason.trim() || 'تصحيح إداري بسبب عطل تقني في النظام وإعادة بدء الحساب',
        currentUser.name
      );

      addSystemNotification({
        id: `notif-live-bulk-conv-${Date.now()}`,
        schoolCode: currentSchool.code,
        title: '✅ تحويل جماعي لحاضر وبدء الحساب من جديد',
        message: `تم تحويل (${result.affectedRecordsCount}) سجل حضور لـ (${result.affectedStudentsCount}) طالب إلى "حاضر"، وتصفير عدادات الغياب والانضباط لتبدأ الدورة من جديد.`,
        type: 'info',
        createdAt: new Date().toISOString(),
      });
    } else if (liveBulkAction === 'delete_absences') {
      deleteAttendances(attIds);

      // Restart calculation & cycle for these students
      const todayStr = getTodayDateString();
      const users = getUsers();
      let usersChanged = false;
      users.forEach((u) => {
        if (studentIds.includes(u.id)) {
          u.lastAbsenceResetDate = todayStr;
          usersChanged = true;
        }
      });
      if (usersChanged) {
        saveUsers(users, true);
      }

      addSystemNotification({
        id: `notif-live-bulk-del-${Date.now()}`,
        schoolCode: currentSchool.code,
        title: '🗑️ حذف جماعي لسجلات الغياب وبدء الحساب من جديد',
        message: `تم شطب وحذف (${attIds.length}) سجل غياب نهائياً من قاعدة البيانات، وتصفير عداد الغياب للطلاب المشمولين ليبدأ الحساب من جديد.`,
        type: 'info',
        createdAt: new Date().toISOString(),
      });
    }

    soundManager.playSuccess();
    setLiveBulkAction(null);
    setSelectedLiveAttendanceIds(new Set());
    setRefreshKey((k) => k + 1);
    setAttendances(getAttendances().filter((a) => a.schoolCode === currentSchool.code && a.date === today));
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto py-6 px-4 text-slate-800" dir="rtl">
      
      {/* 1. Live Day, Date & Live Clock Header Bar */}
      <LiveClockHeader />

      {/* 2. Urgent School Broadcast / Dismissal / Weather Suspension Banner */}
      <BroadcastAlertBanner
        notifications={getSystemNotifications().filter(
          (n) => n.schoolCode === currentSchool.code || !n.schoolCode
        )}
        canManage={true}
        currentUserName={currentUser.name}
        onNotificationsChanged={() => setRefreshKey((k) => k + 1)}
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

      {/* Rain Emergency Absence Suspension Alert Banner */}
      {isRainAbsenceSuspended && (
        <div className="bg-sky-50 border-2 border-sky-300 text-sky-950 rounded-3xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm animate-fadeIn">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-sky-500 text-white flex items-center justify-center shrink-0 shadow-md shadow-sky-500/20">
              <CloudRain className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-black text-sky-900">
                  🌧️ تنبيه نشط: تم تفعيل إيقاف احتساب الغياب لليوم ({today})
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-sky-200 text-sky-900 text-[10px] font-black">
                  معفى رسمياً
                </span>
              </div>
              <p className="text-xs text-sky-800 mt-1 leading-relaxed font-medium">
                السبب: <strong>{currentSchool.absenceSuspensionReason || 'حالة مطرية مفاجئة وتحذيرات دفاع مدني / تعليق الدراسة'}</strong> — جميع الطلاب معفون من الغياب اليوم ولن تتأثر درجات المواظبة، وتم نشر إشعار طمأنة لأولياء الأمور والطلاب في بواباتهم لمنع الاتصالات والاستفسارات المزعجة.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => handleToggleAbsenceSuspension(false)}
            className="px-4 py-2 rounded-xl bg-white hover:bg-sky-100 border border-sky-300 text-sky-900 font-bold text-xs shrink-0 cursor-pointer shadow-xs transition-colors"
          >
            ☀️ استئناف رصد الغياب الاعتيادي
          </button>
        </div>
      )}

      {/* Suspension Alert if paused by Super Admin */}
      {isSuspended && (
        <div className="bg-rose-600 text-white p-4 sm:p-5 rounded-3xl flex flex-wrap items-center justify-between gap-3 text-xs shadow-lg shadow-rose-600/20 animate-fadeIn border border-rose-500">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white text-rose-700 flex items-center justify-center font-black shrink-0 shadow-sm">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <strong className="font-black text-sm block">⚠️ تنبيه إداري: حساب المدرسة موقوف مؤقتاً</strong>
              <span className="text-rose-100 text-[11px] font-medium">
                تم إيقاف تفعيل حساب المدرسة مؤقتاً من قبل المشرف العام، يرجى التواصل مع الإدارة لإعادة التفعيل.
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

      {/* Onboarding Guidance for newly registered schools without students */}
      {isPrincipal && !isSuspended && (allSchoolStudents.length === 0 && allSchoolTeachers.length === 0) && (
        <div className="bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-3xl p-4 sm:p-5 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-fadeIn">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                  📋 مرحباً بك في منظومة حُضُورَكْ الذكية (المجانية بالكامل)
                </h3>
                <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 font-bold border border-emerald-200 dark:border-emerald-800">
                  ترخيص مفتوح ومفعل
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                الخطوة الأولى: ابدأ برفع كشوفات طلابك (عبر إكسل نظام نور) ودعوة كادرك التعليمي لإطلاق التحضير الذكي والانضباط فوراً.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              onClick={onOpenClassExcelManager}
              className="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>رفع كشوفات نور (Excel)</span>
            </button>
            <button
              onClick={onOpenStaffRegistrationLink}
              className="px-3 py-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Users className="w-3.5 h-3.5" />
              <span>دعوة الكادر</span>
            </button>
          </div>
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

            {/* Direct Classes & Sections Management Button */}
            <button
              onClick={() => (onOpenClassManagerTab ? onOpenClassManagerTab('classes') : onOpenClassExcelManager())}
              className="py-2.5 px-3.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-black text-xs flex items-center gap-1.5 cursor-pointer shadow-md shadow-amber-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
              title="تعديل وتخصيص أسماء الفصول والشعب، وحذف الصفوف الزائدة أو تزويد صفوف جديدة بأمان دون فقدان أي بيانات"
            >
              <Layers className="w-4 h-4" />
              <span>هيكلة الصفوف 🏫</span>
            </button>

            {onOpenClassRoster && (
              <button
                onClick={() => onOpenClassRoster()}
                className="py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-black text-xs flex items-center gap-1.5 cursor-pointer shadow-md transition-all hover:scale-[1.02] active:scale-[0.98]"
                title="عرض كشوفات الطلاب ونقلهم بين الصفوف والطباعة"
              >
                <Users className="w-4 h-4 text-amber-400" />
                <span>كشوفات الطلاب والنقل والطباعة 📋🖨️</span>
              </button>
            )}

            <button
              onClick={onOpenMapPicker}
              className="py-2.5 px-3.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-black text-xs flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
              title="تحديد وضبط أوقات الدوام والتأخير والغياب والسياج الجغرافي للمدرسة"
            >
              <Clock className="w-4 h-4 text-emerald-600" />
              <span>الدوام والسياج ⏱️📍</span>
            </button>

            <button
              onClick={() => {
                if (isRainAbsenceSuspended) {
                  handleToggleAbsenceSuspension(false);
                } else {
                  setIsRainModalOpen(true);
                }
              }}
              className={`py-2.5 px-3.5 rounded-xl font-black text-xs flex items-center gap-1.5 cursor-pointer transition-all ${
                isRainAbsenceSuspended
                  ? 'bg-sky-600 hover:bg-sky-700 text-white shadow-md shadow-sky-600/30 ring-2 ring-sky-300'
                  : 'bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-300'
              }`}
              title="إيقاف احتساب الغياب لليوم نظراً لحالة مطرية أو إنذارات طارئة لمنع اتصالات الأهالي"
            >
              <CloudRain className="w-4 h-4 text-sky-600 group-hover:text-sky-700" />
              <span>{isRainAbsenceSuspended ? '🌧️ الغياب موقوف اليوم (نشط)' : 'إيقاف الغياب اليوم (مطر/إنذار) 🌧️'}</span>
            </button>

            {onSwitchToParentView && (
              <button
                type="button"
                onClick={onSwitchToParentView}
                className="py-2.5 px-3.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-950 border border-amber-300 font-black text-xs flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                title="أنت إداري ولديك أبناء في المدرسة؟ التبديل الفوري لحساب ولي الأمر لمتابعة حضور وغياب أبنائك"
              >
                <Users className="w-4 h-4 text-amber-700" />
                <span>وضع ولي الأمر (أبنائي) 👨‍👧‍👦</span>
              </button>
            )}

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

        {/* School Status & Geofence Box */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className={`p-3 rounded-2xl border flex items-center gap-3 text-xs transition-all ${
            isSuspended 
              ? 'bg-rose-50/80 border-rose-300 text-rose-950 ring-1 ring-rose-200' 
              : 'bg-emerald-50/80 border-emerald-200 text-emerald-950 dark:bg-emerald-950/40 dark:border-emerald-800/60 dark:text-emerald-200'
          }`}>
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 font-bold ${
              isSuspended ? 'bg-rose-600 text-white' : 'bg-emerald-600 text-white shadow-xs'
            }`}>
              {isSuspended ? <ShieldAlert className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold">ترخيص المنظومة:</span>
                <strong className="font-black text-xs text-emerald-800 dark:text-emerald-300">
                  {isSuspended ? '⚠️ الحساب موقوف مؤقتاً' : '🌟 ترخيص مجاني دائم ومفتوح (0 ريال)'}
                </strong>
              </div>
              <div className="text-[10px] text-slate-600 dark:text-slate-400 flex items-center gap-2 mt-0.5">
                <span>الحالة: <strong className={isSuspended ? 'text-rose-700 font-black' : 'text-emerald-700 dark:text-emerald-300 font-bold'}>{isSuspended ? 'موقوف مؤقتاً ⚠️' : 'نشط ومفعل 🟢'}</strong></span>
                <span>•</span>
                <span>الصلاحية: <strong className="font-bold text-emerald-800 dark:text-emerald-300">مستمر مدى الحياة</strong></span>
              </div>
            </div>
          </div>

          <div 
            onClick={onOpenMapPicker}
            className="flex flex-wrap items-center gap-2 text-xs text-slate-600 dark:text-slate-300 font-medium mr-auto bg-slate-50 dark:bg-slate-850 p-2 rounded-xl border border-slate-200 dark:border-slate-800 cursor-pointer hover:border-emerald-400 hover:bg-emerald-50/50 transition-all"
            title="انقر لضبط أوقات الدوام وبداية التأخير وحد الغياب ونطاق السياج"
          >
            <span>نطاق التحضير: <strong className="font-mono text-emerald-700 dark:text-emerald-300 font-bold">{currentSchool.radiusMeters}م</strong></span>
            <span>•</span>
            <span>بدء التحضير: <strong className="font-mono text-slate-800 dark:text-slate-100 font-bold">{currentSchool.workStartTime || '06:45'}</strong></span>
            <span>•</span>
            <span>حد التأخير: <strong className="font-mono text-amber-700 dark:text-amber-400 font-bold">{currentSchool.lateCutoffTime || '07:15'}</strong></span>
            <span>•</span>
            <span>حد الغياب: <strong className="font-mono text-rose-700 dark:text-rose-400 font-bold">{currentSchool.absenceCutoffTime || '08:30'}</strong></span>
            <span>•</span>
            <span>الانصراف: <strong className="font-mono text-slate-800 dark:text-slate-100 font-bold">{currentSchool.workEndTime || '13:30'}</strong></span>
            <span className="text-[10px] text-emerald-800 bg-emerald-100 font-black px-1.5 py-0.5 rounded mr-1">تعديل ⚙️</span>
          </div>
        </div>

        {/* Real-time KPI Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2.5 text-center pt-2">
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 space-y-1">
            <span className="text-[11px] text-slate-500 block font-bold">نسبة الحضور</span>
            <span className="text-xl font-black text-emerald-700">{attendanceRate}%</span>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 space-y-1">
            <span className="text-[11px] text-slate-500 block font-bold">الحاضرون</span>
            <span className="text-xl font-black text-slate-900">{presentCount}</span>
          </div>

          <div className={`border rounded-2xl p-3 space-y-1 ${isRainAbsenceSuspended ? 'bg-sky-50 border-sky-300 text-sky-950' : 'bg-slate-50 border-slate-200'}`}>
            <span className="text-[11px] text-slate-500 block font-bold">الغياب</span>
            {isRainAbsenceSuspended ? (
              <div className="flex flex-col items-center">
                <span className="text-xl font-black text-sky-700">0</span>
                <span className="text-[10px] text-sky-800 font-black">معفى مطرياً 🌧️</span>
              </div>
            ) : (
              <span className="text-xl font-black text-rose-600">{absentCount}</span>
            )}
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

          <button
            type="button"
            onClick={() => {
              const el = document.getElementById('school-excuses-section');
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            }}
            className={`border rounded-2xl p-3 space-y-1 cursor-pointer transition-all text-center ${
              corrections.length > 0
                ? 'bg-amber-50 border-amber-300 text-amber-950 shadow-xs hover:bg-amber-100 ring-1 ring-amber-300/60'
                : 'bg-slate-50 border border-slate-200 text-slate-800 hover:bg-slate-100/70'
            }`}
          >
            <span className={`text-[11px] font-bold flex items-center justify-center gap-1 ${
              corrections.length > 0 ? 'text-amber-800' : 'text-slate-500'
            }`}>
              <FileText className={`w-3.5 h-3.5 ${corrections.length > 0 ? 'text-amber-600 animate-pulse' : 'text-slate-400'}`} />
              <span>الأعذار المعلقة</span>
            </span>
            <span className={`text-xl font-black block ${corrections.length > 0 ? 'text-amber-700 font-mono' : 'text-slate-400'}`}>
              {corrections.length}
            </span>
          </button>
        </div>
      </div>

      {/* School Classes & Sections Management Interactive Card */}
      <div className="bg-white border border-slate-200/90 rounded-3xl p-5 space-y-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center font-black shadow-sm">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-slate-900 text-sm sm:text-base">
                  هيكلة وإدارة الصفوف والشعب المدرسية 🏫
                </h3>
                <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[11px] font-black border border-amber-200">
                  {schoolClasses.length} صفوف • {totalSectionsCount} شعبة
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                تعديل أسماء الصفوف والفصول، تزويد شعب جديدة، وحذف الصفوف الزائدة بأمان دون فقدان بيانات الطلاب
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {onOpenClassRoster && (
              <button
                type="button"
                onClick={() => onOpenClassRoster()}
                className="py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-black text-xs flex items-center gap-2 shadow-md cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <Users className="w-4 h-4 text-amber-400" />
                <span>كشوفات الطلاب والنقل والطباعة 📋🖨️</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => (onOpenClassManagerTab ? onOpenClassManagerTab('classes') : onOpenClassExcelManager())}
              className="py-2.5 px-3.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 font-black text-xs flex items-center gap-1.5 cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Edit3 className="w-4 h-4 text-amber-600" />
              <span>تعديل الصفوف والشعب ✏️</span>
            </button>
          </div>
        </div>

        {/* Classes and their sections preview grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {schoolClasses.map((c) => {
            const classStudents = allSchoolStudents.filter((s) => s.className === c.className);
            return (
              <div 
                key={c.id} 
                className="bg-slate-50 border border-slate-200 hover:border-amber-300 rounded-2xl p-3.5 space-y-2.5 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-black text-slate-900 text-xs flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                      {c.className}
                    </span>
                    <span className="text-[10px] font-bold text-slate-600 bg-white px-2 py-0.5 rounded-lg border border-slate-200">
                      {classStudents.length} طالب
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 pt-2">
                    <span className="text-[10px] text-slate-400 font-bold">الشعب:</span>
                    {c.sections.map((sec) => {
                      const secCount = classStudents.filter((s) => (s.sectionName || '1') === sec).length;
                      return (
                        <button 
                          key={sec} 
                          type="button"
                          onClick={() => onOpenClassRoster && onOpenClassRoster(c.className, sec)}
                          title={`عرض كشف طلاب ${c.className} شعبة ${sec}`}
                          className="inline-flex items-center gap-1 bg-white hover:bg-amber-50 hover:border-amber-300 border border-slate-200 text-slate-800 text-[10px] font-bold px-2 py-0.5 rounded-md shadow-2xs transition-colors cursor-pointer"
                        >
                          <span>شعبة ({sec})</span>
                          <span className="text-amber-700 font-bold">({secCount})</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {onOpenClassRoster && (
                  <button
                    type="button"
                    onClick={() => onOpenClassRoster(c.className)}
                    className="w-full mt-2 py-1.5 px-2.5 rounded-xl bg-white hover:bg-amber-100 text-slate-800 hover:text-amber-950 border border-slate-200 hover:border-amber-300 font-bold text-[11px] flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                    title={`عرض كشف طلاب ${c.className} بالكامل ونقلهم والطباعة`}
                  >
                    <Users className="w-3.5 h-3.5 text-amber-600" />
                    <span>عرض طلاب الفصل ({classStudents.length}) والطباعة 📋</span>
                  </button>
                )}
              </div>
            );
          })}
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

      {/* Pending Correction & Excuse Requests Section */}
      <div id="school-excuses-section" className="bg-white border border-slate-200/90 rounded-3xl p-6 space-y-4 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black ${
              corrections.length > 0 ? 'bg-amber-100 text-amber-800 border border-amber-200' : 'bg-slate-100 text-slate-600'
            }`}>
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-base text-slate-900">
                  طلبات الأعذار والتبرير من الطلاب وأولياء الأمور
                </h3>
                {corrections.length > 0 && (
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-500 text-white text-[11px] font-black animate-pulse">
                    {corrections.length} بانتظار القرار
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500">
                مراجعة التقارير الطبية والمستندات، واعتماد أو رفض الأعذار مع توثيق السبب وإشعار الطالب وولي أمره آلياً
              </p>
            </div>
          </div>

          {/* Filter Tabs: Pending vs Resolved */}
          <div className="flex items-center p-1 bg-slate-100 rounded-xl text-xs font-bold">
            <button
              type="button"
              onClick={() => setExcuseFilterTab('pending')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                excuseFilterTab === 'pending'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>المعلقة</span>
              <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-mono ${
                corrections.length > 0 ? 'bg-amber-100 text-amber-800 font-bold' : 'bg-slate-200 text-slate-600'
              }`}>
                {corrections.length}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setExcuseFilterTab('resolved')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                excuseFilterTab === 'resolved'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>سجل المعالجة والأرشيف</span>
              <span className="px-1.5 py-0.2 rounded-md bg-slate-200 text-slate-600 text-[10px] font-mono">
                {allSchoolCorrections.filter((c) => c.status !== 'pending').length}
              </span>
            </button>
          </div>
        </div>

        {/* Tab Content: Pending */}
        {excuseFilterTab === 'pending' && (
          <div>
            {corrections.length === 0 ? (
              <div className="text-center py-8 text-slate-400 space-y-2 bg-slate-50/60 rounded-2xl border border-dashed border-slate-200">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
                <p className="text-xs font-bold text-slate-700">لا توجد طلبات أعذار معلقة حالياً</p>
                <p className="text-[11px] text-slate-500">
                  جميع الأعذار المرفوعة من الطلاب وأولياء الأمور تمت مراجعتها واعتمادها أو رفضها.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {corrections.map((req) => (
                  <div
                    key={req.id}
                    className="bg-slate-50/80 border border-slate-200 hover:border-amber-300 rounded-2xl p-4 transition-all space-y-3"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <strong className="text-slate-900 text-sm font-black">{req.studentName}</strong>
                          
                          {/* Stats badge: official vs conditional count */}
                          {(() => {
                            const stats = getStudentExcuseStats(req.studentId, req.nationalId);
                            return (
                              <div className="inline-flex items-center gap-1 mr-1">
                                <span
                                  className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1 shadow-2xs"
                                  title="عدد مرات قبول العذر الرسمي لهذا الطالب"
                                >
                                  <ShieldCheck className="w-3 h-3 text-emerald-600" />
                                  <span>عذر رسمي: {stats.officialCount}</span>
                                </span>
                                <span
                                  className={`px-2 py-0.5 rounded-md text-[11px] font-bold flex items-center gap-1 border shadow-2xs ${
                                    stats.conditionalCount > 0
                                      ? 'bg-amber-100 text-amber-900 border-amber-300 ring-1 ring-amber-200 font-black'
                                      : 'bg-slate-100 text-slate-600 border-slate-200'
                                  }`}
                                  title="عدد مرات قبول العذر المشروط لهذا الطالب"
                                >
                                  <AlertTriangle className={`w-3 h-3 ${stats.conditionalCount > 0 ? 'text-amber-600' : 'text-slate-400'}`} />
                                  <span>قبول مشروط: {stats.conditionalCount}</span>
                                </span>
                              </div>
                            );
                          })()}

                          <span className="text-slate-500 text-xs">({req.className} - فصل {req.sectionName})</span>
                          <span className="px-2 py-0.5 rounded-md bg-indigo-50 border border-indigo-200 text-indigo-800 text-[10px] font-bold">
                            📅 تاريخ الغياب: {req.date}
                          </span>
                          <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 text-[10px] font-bold border border-amber-200">
                            مقدم من: {req.requesterName} ({req.requestedByRole === 'parent' ? 'ولي أمر 👨‍👦' : 'الطالب 🎓'})
                          </span>
                          <span className="px-2 py-0.5 rounded-md bg-purple-50 border border-purple-200 text-purple-800 text-[10px] font-bold">
                            نوع العذر: {req.excuseType === 'medical' ? 'طبي 🩺' : req.excuseType === 'official' ? 'رسمي 🏛️' : req.excuseType === 'emergency' ? 'طارئ 🚨' : 'عائلي / آخر'}
                          </span>
                        </div>

                        <div className="mt-2 text-xs text-slate-700 bg-white border border-slate-200/70 rounded-xl p-3 space-y-1">
                          <div className="font-bold text-slate-800 flex items-center gap-1.5">
                            <FileText className="w-3.5 h-3.5 text-slate-500" />
                            <span>نص ومبرر العذر المكتوب:</span>
                          </div>
                          <p className="text-slate-600 leading-relaxed pr-5 font-medium">{req.reason}</p>
                        </div>
                      </div>

                      {/* Right Action buttons */}
                      <div className="flex flex-wrap items-center gap-2 self-center sm:self-start">
                        {req.attachmentUrl && (
                          <button
                            type="button"
                            onClick={() => setPreviewAttachment({ url: req.attachmentUrl!, title: `مرفق عذر الطالب: ${req.studentName} ليوم ${req.date}` })}
                            className="px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-bold text-xs flex items-center gap-1 cursor-pointer transition-all"
                          >
                            <Paperclip className="w-3.5 h-3.5 text-indigo-600" />
                            <span>معاينة المستند / التقرير 📎</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleOpenRejectModal(req)}
                          className="px-3.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs flex items-center gap-1 cursor-pointer transition-all"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>رفض مع ذكر السبب ✕</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleOpenConditionalModal(req)}
                          className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-black text-xs flex items-center gap-1.5 shadow-xs cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98]"
                          title="قبول العذر مشروطاً لمرة واحدة مع كتابة رسالة توجيهية تظهر لولي الأمر"
                        >
                          <AlertTriangle className="w-3.5 h-3.5" />
                          <span>قبول مشروط ⚠️</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleApproveCorrection(req)}
                          className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs flex items-center gap-1.5 shadow-xs cursor-pointer transition-all"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>قبول واعتماد رسمي ✓</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab Content: Resolved History */}
        {excuseFilterTab === 'resolved' && (
          <div className="space-y-3">
            {allSchoolCorrections.filter((c) => c.status !== 'pending').length === 0 ? (
              <div className="text-center py-6 text-slate-400 text-xs bg-slate-50/50 rounded-2xl">
                لا توجد أعذار مؤرشفة بعد.
              </div>
            ) : (
              allSchoolCorrections
                .filter((c) => c.status !== 'pending')
                .map((req) => {
                  const isCond = req.approvalType === 'conditional' || req.status === 'conditional_approved';
                  return (
                    <div
                      key={req.id}
                      className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 text-xs flex flex-wrap items-center justify-between gap-3"
                    >
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <strong className="text-slate-900 text-sm font-bold">{req.studentName}</strong>
                          
                          {/* Stats badge */}
                          {(() => {
                            const stats = getStudentExcuseStats(req.studentId, req.nationalId);
                            return (
                              <div className="inline-flex items-center gap-1">
                                <span
                                  className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-0.5"
                                  title="مرات قبول العذر الرسمي"
                                >
                                  <ShieldCheck className="w-2.5 h-2.5 text-emerald-600" />
                                  <span>رسمي: {stats.officialCount}</span>
                                </span>
                                <span
                                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold flex items-center gap-0.5 border ${
                                    stats.conditionalCount > 0
                                      ? 'bg-amber-100 text-amber-900 border-amber-300 font-black'
                                      : 'bg-slate-100 text-slate-600 border-slate-200'
                                  }`}
                                  title="مرات قبول العذر المشروط"
                                >
                                  <AlertTriangle className={`w-2.5 h-2.5 ${stats.conditionalCount > 0 ? 'text-amber-600' : 'text-slate-400'}`} />
                                  <span>مشروط: {stats.conditionalCount}</span>
                                </span>
                              </div>
                            );
                          })()}

                          <span className="text-slate-500">({req.className} - فصل {req.sectionName})</span>
                          <span className="text-slate-400 font-mono">📅 {req.date}</span>
                          <span
                            className={`px-2 py-0.5 rounded-md font-bold text-[10px] border ${
                              req.status === 'rejected'
                                ? 'bg-rose-50 text-rose-800 border-rose-200'
                                : isCond
                                ? 'bg-amber-100 text-amber-900 border-amber-300'
                                : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            }`}
                          >
                            {req.status === 'rejected'
                              ? '✕ تم الرفض'
                              : isCond
                              ? '⚠️ قبول مشروط'
                              : '✓ تم القبول والاعتماد (رسمي)'}
                          </span>
                        </div>
                        <p className="text-slate-600">
                          <strong>المبرر المرفوع:</strong> {req.reason}
                        </p>
                        {req.adminDecisionNotes && (
                          <p
                            className={`text-[11px] font-semibold ${
                              req.status === 'rejected'
                                ? 'text-rose-800'
                                : isCond
                                ? 'text-amber-950 bg-amber-50 p-2 rounded-lg border border-amber-200'
                                : 'text-emerald-800'
                            }`}
                          >
                            <strong>
                              {isCond ? '⚠️ توجيه ورسالة الإدارة لولي الأمر (قبول مشروط): ' : 'قرار وملاحظة الإدارة: '}
                            </strong>{' '}
                            {req.adminDecisionNotes}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {req.attachmentUrl && (
                          <button
                            type="button"
                            onClick={() => setPreviewAttachment({ url: req.attachmentUrl!, title: `مرفق عذر الطالب: ${req.studentName} ليوم ${req.date}` })}
                            className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                          >
                            <Paperclip className="w-3 h-3" />
                            <span>المرفق</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
            )}
          </div>
        )}
      </div>

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
              onClick={() => setIsAbsenceDirectoryOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
              title="إدارة وتعديل وحذف غيابات الطلاب والأعطال التقنية"
            >
              <Wrench className="w-3.5 h-3.5" />
              <span>إدارة غيابات الأعطال 🛠️</span>
            </button>

            <button
              onClick={() => {
                setSummonModalStudent(null);
                setIsParentSummonModalOpen(true);
              }}
              className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black flex items-center gap-1.5 cursor-pointer shadow-xs transition-all"
              title="إصدار استدعاء رسمي لولي أمر أي طالب في المدرسة عبر واتساب وإشعار النظام وطباعة الخطاب"
            >
              <Mail className="w-3.5 h-3.5" />
              <span>استدعاء ولي أمر ✉️</span>
            </button>

            <button
              onClick={() => {
                setBehaviorModalStudent(null);
                setIsBehaviorModalOpen(true);
              }}
              className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-black flex items-center gap-1.5 cursor-pointer shadow-xs transition-all"
              title="رصد سلوك إيجابي أو سلبي وتعديل نقاط المواظبة لأي طالب في المدرسة"
            >
              <Star className="w-3.5 h-3.5 fill-white/20" />
              <span>رصد سلوك ومواظبة ⭐</span>
            </button>

            <button
              onClick={() => (onOpenClassManagerTab ? onOpenClassManagerTab('classes') : onOpenClassExcelManager())}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-black flex items-center gap-1.5 cursor-pointer shadow-xs transition-all"
              title="تعديل وتخصيص أسماء الفصول والشعب وتزويد صفوف جديدة أو حذف الزائد بأمان دون فقدان أي بيانات"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>تعديل الصفوف والشعب 🏫</span>
            </button>

            <button
              onClick={onOpenDirectStudentRegistration}
              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center gap-1 cursor-pointer shadow-xs"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>تسجيل طالب يدوي</span>
            </button>
          </div>
        </div>

        {/* Live Multi-Selection Controls Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={isAllLiveVisibleSelected ? handleClearLiveSelection : handleSelectAllLiveVisible}
              className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              {isAllLiveVisibleSelected ? (
                <CheckSquare className="w-4 h-4 text-indigo-600" />
              ) : (
                <Square className="w-4 h-4 text-slate-400" />
              )}
              <span>تحديد كل المعروضين ({filteredAttendances.length})</span>
            </button>

            <button
              type="button"
              onClick={handleSelectAllLiveAbsents}
              className="px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 font-bold flex items-center gap-1 cursor-pointer transition-colors"
            >
              <span>تحديد الغائبين فقط 🚫</span>
            </button>

            {selectedLiveAttendanceIds.size > 0 && (
              <button
                type="button"
                onClick={handleClearLiveSelection}
                className="px-2.5 py-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 font-bold cursor-pointer transition-colors"
              >
                إلغاء التحديد ✕
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className={`text-xs font-bold px-2.5 py-1 rounded-lg ${
              selectedLiveAttendanceIds.size > 0 
                ? 'bg-indigo-100 text-indigo-900 border border-indigo-300' 
                : 'bg-slate-100 text-slate-500'
            }`}>
              تم تحديد: {selectedLiveAttendanceIds.size} سجل
            </span>
          </div>
        </div>

        {/* Live Attendance Sticky Bulk Action Bar */}
        {selectedLiveAttendanceIds.size > 0 && (
          <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-2xl p-3 flex flex-wrap items-center justify-between gap-3 shadow-md animate-fadeIn">
            <div className="flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center font-black text-sm">
                {selectedLiveAttendanceIds.size}
              </span>
              <div>
                <strong className="block text-xs font-black">
                  تم تحديد {selectedLiveAttendanceIds.size} طالب (منهم {selectedLiveAbsentsCount} غياب)
                </strong>
                <span className="text-[10px] text-slate-300">
                  اختر الإجراء لتطبيقه وإعادة بدء الحساب من جديد
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setLiveBulkAction('convert_to_present')}
                className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-xs cursor-pointer transition-all hover:scale-[1.02]"
              >
                <Zap className="w-4 h-4 text-emerald-950" />
                <span>تحويل المحددين إلى حاضر (يبدأ الحساب من جديد) ⚡</span>
              </button>

              <button
                type="button"
                onClick={() => setLiveBulkAction('delete_absences')}
                className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs flex items-center gap-1.5 shadow-xs cursor-pointer transition-all hover:scale-[1.02]"
              >
                <Trash2 className="w-4 h-4" />
                <span>حذف غياب المحددين نهائياً (يبدأ الحساب من جديد) 🗑️</span>
              </button>

              <button
                type="button"
                onClick={handleClearLiveSelection}
                className="px-2.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 font-bold text-xs cursor-pointer"
              >
                إلغاء
              </button>
            </div>
          </div>
        )}

        {/* Table */}
        <div className="border border-slate-200 rounded-2xl overflow-hidden max-h-96 overflow-y-auto text-xs">
          <table className="w-full text-right">
            <thead className="bg-slate-50 text-slate-700 sticky top-0 border-b border-slate-200">
              <tr>
                <th className="p-3 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={isAllLiveVisibleSelected}
                    onChange={isAllLiveVisibleSelected ? handleClearLiveSelection : handleSelectAllLiveVisible}
                    className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    title="تحديد الكل"
                  />
                </th>
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
                  <td colSpan={8} className="p-6 text-center text-slate-400">
                    {attendances.length === 0 
                      ? 'لا توجد سجلات حضور مسجلة لهذا اليوم حتى الآن. يمكنك استيراد كشف نور أو تسجيل الطلاب ذاتياً.'
                      : 'لا توجد سجلات مطابقة للبحث أو التصفية'}
                  </td>
                </tr>
              ) : (
                filteredAttendances.map((a) => {
                  const studentUser = allSchoolStudents.find((u) => u.id === a.studentId || u.nationalId === a.nationalId);
                  const pCount = studentPermCounts[a.studentId]?.count || 0;
                  const isSelected = selectedLiveAttendanceIds.has(a.id);

                  return (
                    <tr 
                      key={a.id} 
                      className={`transition-colors ${
                        isSelected 
                          ? 'bg-indigo-50/70 border-y border-indigo-200' 
                          : 'hover:bg-slate-50/80'
                      }`}
                    >
                      <td className="p-3 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectLiveAttendance(a.id)}
                          className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        />
                      </td>
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

                          {/* Quick Edit and Delete for absent records */}
                          {a.finalStatus === 'absent' && (
                            <>
                              <button
                                onClick={() =>
                                  setEditAttendanceItem({
                                    attendance: a,
                                    studentName: studentUser?.name || a.studentName || 'الطالب',
                                  })
                                }
                                className="p-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 cursor-pointer"
                                title="تعديل هذا الرصد (تصحيح عطل تقني)"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setAttendanceItemToDelete(a)}
                                className="p-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 cursor-pointer"
                                title="حذف هذا الغياب نهائياً"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
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
                              onClick={() => {
                                setSummonModalStudent(studentUser);
                                setIsParentSummonModalOpen(true);
                              }}
                              className="p-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 cursor-pointer"
                              title="استدعاء ولي أمر الطالب (خطاب، واتساب، موعد رسمي)"
                            >
                              <Mail className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {studentUser && (
                            <button
                              onClick={() => {
                                setBehaviorModalStudent(studentUser);
                                setIsBehaviorModalOpen(true);
                              }}
                              className="p-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 cursor-pointer"
                              title="رصد سلوك ومواظبة (إيجابي / سلبي)"
                            >
                              <Star className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {studentUser && (
                            <button
                              onClick={() => setActionModalStudent(studentUser)}
                              className="p-1 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 cursor-pointer"
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

      {/* Reject Excuse Reason Modal */}
      {rejectingRequest && (
        <div 
          onClick={(e) => { if (e.target === e.currentTarget) setRejectingRequest(null); }}
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn"
          dir="rtl"
        >
          <div className="bg-white border border-rose-200 rounded-3xl max-w-lg w-full p-6 text-right space-y-4 shadow-2xl text-slate-800">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center font-bold">
                  <X className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">رفض عذر الغياب مع ذكر السبب</h3>
                  <p className="text-xs text-slate-500">
                    الطالب: <span className="font-bold text-slate-800">{rejectingRequest.studentName}</span> | تاريخ الغياب: <span className="font-mono text-slate-800">{rejectingRequest.date}</span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setRejectingRequest(null)}
                className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center cursor-pointer transition-all"
              >
                ✕
              </button>
            </div>

            <div className="bg-rose-50/70 border border-rose-100 rounded-xl p-3 text-xs text-rose-950 space-y-1">
              <p className="font-bold">نص العذر المرفوع من الطالب / ولي أمره:</p>
              <p className="text-slate-700 bg-white/80 p-2 rounded-lg border border-rose-100/60 font-medium">
                "{rejectingRequest.reason}"
              </p>
            </div>

            {/* Quick Reason Presets */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 block">
                اختر سبباً سريعاً أو اكتب سبباً مخصصاً:
              </label>
              <div className="grid grid-cols-1 gap-1.5 max-h-40 overflow-y-auto pr-1">
                {[
                  'التقرير الطبي غير مختوم أو غير صادر من جهة معتمدة (منصة صحتي).',
                  'تجاوز المهلة النظامية لتقديم العذر (أكثر من 5 أيام من تاريخ الغياب).',
                  'المستند المرفق غير واضح أو غير مقروء ويتعذر التحقق منه.',
                  'الغياب تزامن مع اختبارات تحريرية أو تقييمات فصلية دون عذر قهري مسوّغ.',
                  'عدم تطابق تاريخ التقرير الطبي مع تاريخ يوم الغياب الفعلي للطالب.'
                ].map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setRejectReason(preset)}
                    className={`text-right p-2 rounded-xl text-xs transition-all cursor-pointer border ${
                      rejectReason === preset
                        ? 'bg-rose-100 border-rose-300 text-rose-950 font-bold'
                        : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                    }`}
                  >
                    • {preset}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 block">
                سبب الرفض الموجه للطالب وولي أمره:
              </label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={3}
                placeholder="اكتب سبب الرفض بالتفصيل هنا..."
                className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500 bg-slate-50/50"
              />
              <p className="text-[11px] text-slate-400">
                💡 سيصل هذا السبب فوراً إلى حساب الطالب وحساب ولي أمره في قائمة الإشعارات وسجل الأعذار.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setRejectingRequest(null)}
                className="py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
              >
                تراجع وإلغاء
              </button>
              <button
                type="button"
                onClick={handleConfirmReject}
                className="py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs cursor-pointer shadow-md shadow-rose-600/20 flex items-center justify-center gap-1.5"
              >
                <X className="w-4 h-4" />
                <span>تأكيد الرفض وإشعار ولي الأمر</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Conditional Acceptance Modal with Custom Parent Message */}
      {conditionalRequest && (
        <div 
          onClick={(e) => { if (e.target === e.currentTarget) setConditionalRequest(null); }}
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn"
          dir="rtl"
        >
          <div className="bg-white border border-amber-300 rounded-3xl max-w-lg w-full p-6 text-right space-y-4 shadow-2xl text-slate-800">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold shadow-xs">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                    <span>قبول مشروط لعذر الغياب</span>
                    <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[11px] font-bold">
                      لهذه المرة فقط
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    الطالب: <span className="font-black text-slate-900">{conditionalRequest.studentName}</span> | تاريخ الغياب: <span className="font-mono text-slate-800">{conditionalRequest.date}</span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setConditionalRequest(null)}
                className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center cursor-pointer transition-all"
              >
                ✕
              </button>
            </div>

            {/* Historical stats banner for this student */}
            {(() => {
              const stats = getStudentExcuseStats(conditionalRequest.studentId, conditionalRequest.nationalId);
              return (
                <div className="bg-gradient-to-r from-amber-50 to-orange-50/50 border border-amber-200 rounded-2xl p-3 text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-black text-amber-950 flex items-center gap-1.5">
                      <span>سجل أعذار الطالب السابقة:</span>
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-900 font-black text-[11px] border border-emerald-300">
                        عذر رسمي: {stats.officialCount}
                      </span>
                      <span className={`px-2 py-0.5 rounded-md font-black text-[11px] border ${
                        stats.conditionalCount > 0 
                          ? 'bg-amber-200 text-amber-950 border-amber-400 ring-1 ring-amber-300' 
                          : 'bg-slate-100 text-slate-700 border-slate-300'
                      }`}>
                        قبول مشروط: {stats.conditionalCount}
                      </span>
                    </div>
                  </div>
                  {stats.conditionalCount > 0 && (
                    <p className="text-[11px] text-amber-900 font-semibold bg-white/70 p-2 rounded-lg border border-amber-200/60">
                      ⚠️ تنبيه للإداري: لقد تم قبول عذر هذا الطالب قبولاً مشروطاً مسبقاً ({stats.conditionalCount} مرة). يُنصح بالتأكيد على ولي الأمر لإحضار التقارير الرسمية مستقبلاً.
                    </p>
                  )}
                </div>
              );
            })()}

            {/* Original student justification */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-700 space-y-1">
              <p className="font-bold text-slate-800">نص ومبرر العذر المرفوع من ولي الأمر:</p>
              <p className="text-slate-600 bg-white p-2.5 rounded-lg border border-slate-200 font-medium leading-relaxed">
                "{conditionalRequest.reason}"
              </p>
            </div>

            {/* Quick response templates */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 block">
                اختر صيغة توجيه جاهزة أو اكتب رسالتك لولي الأمر:
              </label>
              <div className="grid grid-cols-1 gap-1.5 max-h-36 overflow-y-auto pr-1">
                {[
                  'تم قبول عذره لهذه المرة فقط، ويرجى إحضار عذر رسمي في المرة القادمة.',
                  'قبول مشروط بشرط تسليم التقرير الطبي المعتمد غداً لإدارة المدرسة.',
                  'تم قبول العذر استثنائياً تقديراً لظرفكم، ونؤكد على ضرورة عدم تكرار الغياب بدون تقرير صحتي.',
                  'تم قبول العذر مشروطاً لمرة واحدة تجنباً لحسم درجات المواظبة، ويلزم توفير العذر المعتمد مستقبلاً.'
                ].map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setConditionalMessage(preset)}
                    className={`text-right p-2 rounded-xl text-xs transition-all cursor-pointer border ${
                      conditionalMessage === preset
                        ? 'bg-amber-100 border-amber-300 text-amber-950 font-bold shadow-2xs'
                        : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                    }`}
                  >
                    • {preset}
                  </button>
                ))}
              </div>
            </div>

            {/* Live custom message textarea */}
            <div className="space-y-1.5">
              <label className="text-xs font-black text-amber-950 flex items-center justify-between">
                <span>الرسالة والتوجيه الموجه لولي الأمر (حقل قابل للتعديل):</span>
                <span className="text-[11px] text-amber-700 font-normal">سيطلع عليها ولي الأمر مباشرة</span>
              </label>
              <textarea
                value={conditionalMessage}
                onChange={(e) => setConditionalMessage(e.target.value)}
                rows={3}
                placeholder="اكتب التوجيه أو الشرط الموجه لولي الأمر هنا..."
                className="w-full text-xs p-3 rounded-xl border border-amber-200 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-amber-50/20 text-slate-900 font-medium"
              />
              <p className="text-[11px] text-slate-500">
                💡 عند تأكيد القبول المشروط، يتم تحويل حالة الغياب إلى معذور واسترجاع درجات المواظبة، وإرسال هذه الرسالة إلى ولي الأمر ليطلع عليها فوراً.
              </p>
            </div>

            {/* Actions */}
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setConditionalRequest(null)}
                className="py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer transition-all"
              >
                تراجع وإلغاء
              </button>
              <button
                type="button"
                onClick={handleConfirmConditionalApprove}
                className="py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-black text-xs cursor-pointer shadow-md shadow-amber-500/20 flex items-center justify-center gap-1.5 transition-all hover:scale-[1.01] active:scale-[0.99]"
              >
                <AlertTriangle className="w-4 h-4" />
                <span>تأكيد القبول المشروط وإشعار ولي الأمر ⚠️</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Attachment Preview Modal */}
      {previewAttachment && (
        <div 
          onClick={(e) => { if (e.target === e.currentTarget) setPreviewAttachment(null); }}
          className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn"
          dir="rtl"
        >
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 text-right space-y-4 shadow-2xl text-slate-800">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Paperclip className="w-5 h-5 text-indigo-600" />
                <h3 className="text-base font-black text-slate-900">{previewAttachment.title}</h3>
              </div>
              <button
                type="button"
                onClick={() => setPreviewAttachment(null)}
                className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="max-h-[65vh] overflow-auto flex items-center justify-center bg-slate-50 rounded-2xl p-3 border border-slate-200">
              <img
                src={previewAttachment.url}
                alt="مرفق العذر الطبي"
                className="max-h-[60vh] max-w-full rounded-xl object-contain shadow-sm"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setPreviewAttachment(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Student Absence Directory Modal for Admin */}
      {isAbsenceDirectoryOpen && (
        <StudentAbsenceDirectoryModal
          isOpen={isAbsenceDirectoryOpen}
          onClose={() => setIsAbsenceDirectoryOpen(false)}
          currentSchool={currentSchool}
          currentUser={currentUser}
          onSelectStudentForDossier={(student) => {
            setIsAbsenceDirectoryOpen(false);
            onOpenStudentDossier(student);
          }}
          onDataChanged={() => {
            setRefreshKey((k) => k + 1);
            setAttendances(getAttendances().filter((a) => a.schoolCode === currentSchool.code && a.date === today));
          }}
        />
      )}

      {/* Attendance Edit Modal */}
      {editAttendanceItem && (
        <AttendanceEditModal
          isOpen={!!editAttendanceItem}
          onClose={() => setEditAttendanceItem(null)}
          attendance={editAttendanceItem.attendance}
          studentName={editAttendanceItem.studentName}
          currentUser={currentUser}
          onSaved={() => {
            setEditAttendanceItem(null);
            setRefreshKey((k) => k + 1);
            setAttendances(getAttendances().filter((a) => a.schoolCode === currentSchool.code && a.date === today));
          }}
        />
      )}

      {/* Single Attendance Delete Confirmation Modal */}
      {attendanceItemToDelete && (
        <div 
          onClick={(e) => { if (e.target === e.currentTarget) setAttendanceItemToDelete(null); }}
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn"
          dir="rtl"
        >
          <div className="bg-white border border-rose-200 rounded-3xl max-w-md w-full p-6 text-right space-y-4 shadow-2xl text-slate-800">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1.5">
              <h3 className="text-base font-black text-slate-900">
                حذف سجل الغياب نهائياً
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                هل أنت متأكد من حذف غياب يوم ({attendanceItemToDelete.date}) للطالب ({attendanceItemToDelete.studentName || 'الطالب'}) نهائياً؟
              </p>
            </div>

            <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-[11px] text-rose-900 space-y-1">
              <strong>تنبيه الإدارة:</strong> سيتم شطب هذا الغياب تماماً من السيرفر وقاعدة البيانات لإصلاح العطل، ولن يُحتسب في سجل الطالب أو يظهر لولي الأمر.
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                onClick={() => setAttendanceItemToDelete(null)}
                className="py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
              >
                إلغاء
              </button>
              <button
                onClick={() => {
                  deleteAttendance(attendanceItemToDelete.id);
                  addSystemNotification({
                    id: `notif-att-del-admin-${Date.now()}`,
                    schoolCode: currentSchool.code,
                    title: '🗑️ حذف غياب مسجل بالخطأ (إدارة المدرسة)',
                    message: `تم إلغاء وحذف غياب يوم (${attendanceItemToDelete.date}) للطالب (${attendanceItemToDelete.studentName || 'الطالب'}) نهائياً لتدارك عطل في المنظومة.`,
                    type: 'info',
                    createdAt: new Date().toISOString(),
                  });
                  soundManager.playSuccess();
                  setAttendanceItemToDelete(null);
                  setRefreshKey((k) => k + 1);
                  setAttendances(getAttendances().filter((a) => a.schoolCode === currentSchool.code && a.date === today));
                }}
                className="py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs cursor-pointer shadow-md shadow-rose-600/20"
              >
                تأكيد الحذف النهائي 🗑️
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Live Table Bulk Action Confirmation Modal */}
      {liveBulkAction && (
        <div 
          onClick={(e) => { if (e.target === e.currentTarget) setLiveBulkAction(null); }}
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn"
          dir="rtl"
        >
          <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full p-6 text-right space-y-4 shadow-2xl text-slate-800">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mx-auto shadow-xs ${
              liveBulkAction === 'convert_to_present' 
                ? 'bg-emerald-100 text-emerald-700' 
                : 'bg-rose-100 text-rose-700'
            }`}>
              {liveBulkAction === 'convert_to_present' ? (
                <Zap className="w-6 h-6" />
              ) : (
                <Trash2 className="w-6 h-6" />
              )}
            </div>

            <div className="text-center space-y-1.5">
              <h3 className="text-base font-black text-slate-900">
                {liveBulkAction === 'convert_to_present'
                  ? `تحويل (${selectedLiveAttendanceIds.size}) طالب إلى حاضر وبدء الحساب من جديد ⚡`
                  : `حذف غياب (${selectedLiveAttendanceIds.size}) طالب نهائياً وبدء الحساب من جديد 🗑️`}
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                {liveBulkAction === 'convert_to_present'
                  ? `سيتم تحويل حالة الطلاب المحددين اليوم إلى "حاضر"، وتصفير عداد إنذارات الغياب ليعود إلى الصفر ويبدأ الحساب من جديد ابتداءً من تاريخ اليوم.`
                  : `سيتم شطب وحذف سجلات الغياب المحددة نهائياً من قاعدة البيانات، وتصفير عداد الغياب ليبدأ الحساب من جديد.`}
              </p>
            </div>

            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-slate-700">
                سبب التعديل والتوثيق الإداري:
              </label>
              <input
                type="text"
                value={liveBulkReason}
                onChange={(e) => setLiveBulkReason(e.target.value)}
                placeholder="سبب التصحيح الإداري..."
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 focus:outline-indigo-500"
              />
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-[11px] text-slate-700 space-y-1 max-h-28 overflow-y-auto">
              <strong className="block text-slate-900 font-bold">الطلاب المشمولون بالإجراء ({selectedLiveAttsList.length}):</strong>
              <div className="flex flex-wrap gap-1 pt-1">
                {selectedLiveAttsList.map((a) => (
                  <span 
                    key={a.id}
                    className="px-2 py-0.5 rounded-md bg-white border border-slate-200 font-bold text-[10px]"
                  >
                    {a.studentName} ({a.finalStatus === 'absent' ? 'غائب' : a.finalStatus === 'present' ? 'حاضر' : a.finalStatus})
                  </span>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                onClick={() => setLiveBulkAction(null)}
                className="py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
              >
                إلغاء
              </button>
              <button
                onClick={handleExecuteLiveBulkAction}
                className={`py-2.5 rounded-xl text-white font-black text-xs cursor-pointer shadow-md flex items-center justify-center gap-1.5 ${
                  liveBulkAction === 'convert_to_present'
                    ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'
                    : 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20'
                }`}
              >
                {liveBulkAction === 'convert_to_present' ? (
                  <>
                    <Zap className="w-4 h-4" />
                    <span>تأكيد التحويل وبدء الحساب ⚡</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>تأكيد الحذف وبدء الحساب 🗑️</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

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

      {/* Rain Emergency Absence Suspension Modal */}
      {isRainModalOpen && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setIsRainModalOpen(false); }}
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn"
          dir="rtl"
        >
          <div className="bg-white border border-sky-300 rounded-3xl max-w-lg w-full p-6 text-right space-y-4 shadow-2xl text-slate-800">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-sky-100 text-sky-700 flex items-center justify-center">
                  <CloudRain className="w-6 h-6 text-sky-600" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    إيقاف احتساب الغياب لليوم (حالة مطرية / إنذارات طارئة)
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">تاريخ اليوم: {today}</p>
                </div>
              </div>
              <button 
                onClick={() => setIsRainModalOpen(false)} 
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-sky-50 border border-sky-200 rounded-2xl p-4 space-y-2 text-sky-950">
                <strong className="text-sm font-black block text-sky-900">
                  ماذا يحدث عند تفعيل إيقاف الغياب؟
                </strong>
                <ul className="space-y-1.5 text-sky-900 list-disc list-inside leading-relaxed font-medium">
                  <li>إيقاف فوري لاحتساب أي غياب على جميع طلاب المدرسة لليوم ({today}).</li>
                  <li>تحويل أي غيابات مسجلة اليوم تلقائياً إلى (غياب معفى للدواعي المطرية والطارئة) دون خصم درجات المواظبة وبدون إنذارات.</li>
                  <li>ظهور شارة وبنر طمأنة بارز في بوابة ولي الأمر وبوابة الطالب تفيد بأن اليوم معفى رسمياً، مما يمنع قلق أولياء الأمور ويوقف كثرة الاتصالات والاستفسارات لإدارة المدرسة.</li>
                </ul>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  سبب التعليق الرسمي (يظهر للطلاب وأولياء الأمور في البوابة):
                </label>
                <input
                  type="text"
                  value={rainSuspensionReason}
                  onChange={(e) => setRainSuspensionReason(e.target.value)}
                  placeholder="مثال: حالة مطرية مفاجئة وتحذيرات دفاع مدني / تعليق الدراسة"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-slate-900 font-medium text-xs focus:outline-sky-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsRainModalOpen(false)}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
              >
                تراجع / إلغاء
              </button>
              <button
                type="button"
                onClick={() => handleToggleAbsenceSuspension(true)}
                className="px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-black text-xs flex items-center gap-1.5 shadow-md shadow-sky-600/20 cursor-pointer"
              >
                <CloudRain className="w-4 h-4" />
                <span>تأكيد إيقاف الغياب لليوم 🌧️</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Parent Summon Modal */}
      {isParentSummonModalOpen && (
        <ParentSummonModal
          isOpen={isParentSummonModalOpen}
          onClose={() => {
            setIsParentSummonModalOpen(false);
            setSummonModalStudent(null);
          }}
          student={summonModalStudent || undefined}
          allSchoolStudents={allSchoolStudents}
          currentSchool={currentSchool}
          currentUser={currentUser}
          onSummonCreated={() => {
            setRefreshKey((k) => k + 1);
          }}
        />
      )}

      {/* Behavior Record Modal */}
      {isBehaviorModalOpen && (
        <BehaviorRecordModal
          isOpen={isBehaviorModalOpen}
          onClose={() => {
            setIsBehaviorModalOpen(false);
            setBehaviorModalStudent(null);
          }}
          student={behaviorModalStudent || undefined}
          allSchoolStudents={allSchoolStudents}
          currentUser={currentUser}
          currentSchool={currentSchool}
          onSaved={() => {
            setIsBehaviorModalOpen(false);
            setBehaviorModalStudent(null);
            setRefreshKey((k) => k + 1);
          }}
        />
      )}
    </div>
  );
};
