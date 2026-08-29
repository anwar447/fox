import React, { useState, useMemo, useEffect } from 'react';
import { 
  User, School, Attendance, Excuse, Emergency, 
  NoorComparison, SchoolClassSection, BehaviorDeduction, BehaviorNote 
} from '../types';
import { 
  ALL_GRADES_INTERMEDIATE, 
  ALL_GRADES_SECONDARY, 
  formatReadableClass, 
  getHijriDateInfo, 
  getTodayDateString 
} from '../utils/academic';
import { 
  getNoorDailyManualCount, 
  saveNoorDailyManualCount, 
  getSchoolClasses, 
  saveSchoolClasses,
  getBehaviorDeductions,
  addBehaviorDeduction,
  deleteBehaviorDeduction,
  getBehaviorNotes,
  resolveBehaviorNote,
  calculateStudentBehaviorScore,
  transferStudentClass,
  deleteStudent,
  promoteStudentsAcademicYear,
  deleteAllSchoolStudents,
  GRADE_PROGRESSION_MAP,
  wipeSchoolStudentData,
  wipeAllToPristineProduction
} from '../utils/storage';
import { triggerNotification } from '../utils/notifications';
import { DailyPrincipalReportModal } from './DailyPrincipalReportModal';
import { AdminArchiveReportModal } from './AdminArchiveReportModal';
import { ClassExcelManagerModal } from './ClassExcelManagerModal';
import { StudentDossierModal } from './StudentDossierModal';
import { InteractiveMapPicker } from './InteractiveMapPicker';
import { 
  Building2, Users, AlertTriangle, UserCheck, UserX, Clock, 
  Search, Filter, Download, Upload, Plus, KeyRound, Bell, 
  FileText, Printer, Layers, ShieldAlert, Phone, MessageSquare, 
  CheckCircle2, MapPin, Settings, QrCode, Share2, RefreshCw, 
  ExternalLink, ChevronRight, TrendingUp, X, Check, Eye, 
  FileSpreadsheet, Sparkles, Send, ShieldCheck, GraduationCap, Archive,
  ArrowLeftRight, Trash2, MessageSquareWarning, ArrowUpRight, Scale, CheckSquare
} from 'lucide-react';

interface EmployeeDashboardProps {
  currentUser: User;
  schools: School[];
  selectedSchoolCode: string;
  onSelectSchool: (code: string) => void;
  users: User[];
  attendances: Attendance[];
  excuses: Excuse[];
  emergencies: Emergency[];
  onSaveSchool: (school: School) => void;
  onSaveUser: (user: User) => void;
  onDeleteUser?: (userId: string) => void;
  onResetPassword: (nationalId: string, newPass: string) => void;
  onBroadcastEmergency: (emergency: Omit<Emergency, 'id' | 'createdAt' | 'responses'>) => void;
  onUpdateExcuseStatus: (id: string, status: 'approved' | 'rejected', reason?: string) => void;
  onDeleteSchool?: (schoolId: string) => void;
  onSaveNoorComparison?: (log: NoorComparison) => void;
  onImportStudentsBatch?: (students: Array<{ nationalId: string; name: string; className: string; sectionName: string; parentMobile?: string }>) => void;
  onRefreshData?: () => void;
}

type TabType = 'live' | 'truant' | 'directory' | 'teachers' | 'behavior' | 'excuses' | 'emergency' | 'assistants' | 'schools' | 'reports';

export const EmployeeDashboard: React.FC<EmployeeDashboardProps> = ({
  currentUser,
  schools,
  selectedSchoolCode,
  onSelectSchool,
  users,
  attendances,
  excuses,
  emergencies,
  onSaveSchool,
  onDeleteSchool,
  onSaveUser,
  onDeleteUser,
  onResetPassword,
  onBroadcastEmergency,
  onUpdateExcuseStatus,
  onSaveNoorComparison,
  onImportStudentsBatch,
  onRefreshData,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('live');
  const [searchDirectory, setSearchDirectory] = useState('');
  const [filterGrade, setFilterGrade] = useState('ALL');
  const [filterSection, setFilterSection] = useState('ALL');
  const [filterRole, setFilterRole] = useState<'student' | 'teacher' | 'all'>('student');

  // Modals state
  const [isDailyReportModalOpen, setIsDailyReportModalOpen] = useState(false);
  const [isAdminArchiveModalOpen, setIsAdminArchiveModalOpen] = useState(false);
  const [isClassExcelModalOpen, setIsClassExcelModalOpen] = useState(false);
  const [selectedDossierStudent, setSelectedDossierStudent] = useState<User | null>(null);

  // Student Transfer State (نقل طالب من صف إلى صف)
  const [studentToTransfer, setStudentToTransfer] = useState<User | null>(null);
  const [transferNewGrade, setTransferNewGrade] = useState('');
  const [transferNewSection, setTransferNewSection] = useState('');

  // Student Promotion State (ترحيل الطلاب للعام القادم)
  const [isPromoteModalOpen, setIsPromoteModalOpen] = useState(false);
  const [promoteGradeFilter, setPromoteGradeFilter] = useState('ALL');
  const [promoteSuccessToast, setPromoteSuccessToast] = useState('');

  // Student Delete State (حذف طالب عند النقل)
  const [studentToDelete, setStudentToDelete] = useState<User | null>(null);
  const [isDeleteAllStudentsModalOpen, setIsDeleteAllStudentsModalOpen] = useState(false);

  // Behavior Management State
  const [behaviorToast, setBehaviorToast] = useState('');
  const [selectedNoteForAction, setSelectedNoteForAction] = useState<BehaviorNote | null>(null);
  const [noteResolutionType, setNoteResolutionType] = useState<'approved_deduction' | 'warned_only' | 'dismissed'>('approved_deduction');
  const [noteDeductionPoints, setNoteDeductionPoints] = useState(3);
  const [noteAdminComment, setNoteAdminComment] = useState('');
  const [notifyParentOnNote, setNotifyParentOnNote] = useState(true);

  // Direct Behavior Deduction Form State
  const [directDeductionStudentId, setDirectDeductionStudentId] = useState('');
  const [directDeductionPoints, setDirectDeductionPoints] = useState(2);
  const [directDeductionReason, setDirectDeductionReason] = useState('إثارة الفوضى وعدم الانضباط الصفي');
  const [directDeductionCustomReason, setDirectDeductionCustomReason] = useState('');
  const [directDeductionNotes, setDirectDeductionNotes] = useState('');
  const [directDeductionNotify, setDirectDeductionNotify] = useState(true);

  // Local storage behavior items for real-time reactivity
  const [behaviorVersion, setBehaviorVersion] = useState(0);

  // Branch School Management state
  const [isAddBranchModalOpen, setIsAddBranchModalOpen] = useState(false);
  const [isEditSchoolModalOpen, setIsEditSchoolModalOpen] = useState(false);
  const [schoolToEdit, setSchoolToEdit] = useState<School | null>(null);
  const [schoolToDelete, setSchoolToDelete] = useState<School | null>(null);
  const [schoolToWipe, setSchoolToWipe] = useState<School | null>(null);

  // Clean Production Wipe state (Dell Server Ready)
  const [isWipeProductionModalOpen, setIsWipeProductionModalOpen] = useState(false);
  const [cleanSchoolName, setCleanSchoolName] = useState('ثانوية الراية للبنين');
  const [cleanAdminName, setCleanAdminName] = useState('أ. أنور الشمري');

  // Assistant deletion state
  const [assistantToDelete, setAssistantToDelete] = useState<User | null>(null);

  // Teacher deletion state
  const [teacherToDelete, setTeacherToDelete] = useState<User | null>(null);

  // Form state for new branch school
  const [branchName, setBranchName] = useState('');
  const [branchCode, setBranchCode] = useState('');
  const [branchCity, setBranchCity] = useState('الرياض');
  const [branchOffice, setBranchOffice] = useState('مكتب التعليم بالروضة');
  const [branchManager, setBranchManager] = useState('');
  const [branchIsQuran, setBranchIsQuran] = useState(false);
  const [branchRadius, setBranchRadius] = useState(300);
  const [branchLat, setBranchLat] = useState(24.7136);
  const [branchLng, setBranchLng] = useState(46.6753);
  const [branchAddress, setBranchAddress] = useState('طريق الملك فهد، الرياض');

  // Excuse Rejection Modal state
  const [rejectionModalExcuse, setRejectionModalExcuse] = useState<Excuse | null>(null);
  const [rejectionReasonText, setRejectionReasonText] = useState('');
  const [previewExcuseAttachment, setPreviewExcuseAttachment] = useState<Excuse | null>(null);

  // Password reset modal state
  const [resetModalUser, setResetModalUser] = useState<User | null>(null);
  const [newPasswordVal, setNewPasswordVal] = useState('');
  const [resetFeedback, setResetFeedback] = useState('');

  // Add Student modal state
  const [isAddStudentModalOpen, setIsAddStudentModalOpen] = useState(false);
  const [newStdName, setNewStdName] = useState('');
  const [newStdNid, setNewStdNid] = useState('');
  const [newStdGrade, setNewStdGrade] = useState('الأول الثانوي');
  const [newStdSection, setNewStdSection] = useState('1');
  const [newStdParentMobile, setNewStdParentMobile] = useState('');

  // Add Teacher modal state
  const [isAddTeacherModalOpen, setIsAddTeacherModalOpen] = useState(false);
  const [newTeacherName, setNewTeacherName] = useState('');
  const [newTeacherNid, setNewTeacherNid] = useState('');
  const [newTeacherMobile, setNewTeacherMobile] = useState('');
  const [newTeacherSubject, setNewTeacherSubject] = useState('');
  const [newTeacherPassword, setNewTeacherPassword] = useState('123456');

  // Teacher Invite Modal State
  const [isInviteTeacherModalOpen, setIsInviteTeacherModalOpen] = useState(false);
  const [inviteCopiedToast, setInviteCopiedToast] = useState(false);

  // Add Assistant modal state
  const [isAddAssistantModalOpen, setIsAddAssistantModalOpen] = useState(false);
  const [newAsstName, setNewAsstName] = useState('');
  const [newAsstNid, setNewAsstNid] = useState('');
  const [newAsstPassword, setNewAsstPassword] = useState('123456');

  // Emergency broadcast state
  const [emergencyMsg, setEmergencyMsg] = useState('');
  const [emergencyType, setEmergencyType] = useState<'rain' | 'maintenance' | 'early_dismissal' | 'other'>('rain');

  const today = getTodayDateString();
  const dateInfo = getHijriDateInfo(new Date());

  const currentSchool = schools.find((s) => s.code === selectedSchoolCode) || schools[0];
  
  // Custom Classes & Sections for this school
  const [schoolClasses, setSchoolClasses] = useState<SchoolClassSection[]>(() => {
    return getSchoolClasses(currentSchool.code);
  });

  useEffect(() => {
    setSchoolClasses(getSchoolClasses(currentSchool.code));
  }, [currentSchool.code]);

  // Noor Daily Absence Manual Input (Saved in localStorage & synced with Daily Report)
  const [noorDailyAbsence, setNoorDailyAbsence] = useState<number>(() => {
    return getNoorDailyManualCount(currentSchool.code, today);
  });
  const [noorSaveToast, setNoorSaveToast] = useState(false);

  useEffect(() => {
    setNoorDailyAbsence(getNoorDailyManualCount(currentSchool.code, today));
  }, [currentSchool.code, today]);

  const handleNoorCountChange = (val: number) => {
    const num = Math.max(0, val);
    setNoorDailyAbsence(num);
    saveNoorDailyManualCount(currentSchool.code, today, num);
    setNoorSaveToast(true);
    setTimeout(() => setNoorSaveToast(false), 2000);
  };

  const schoolStudents = users.filter((u) => u.role === 'student' && (u.schoolCode === currentSchool.code || u.schoolCode === 'RAYA-1448'));
  const schoolTeachers = users.filter((u) => u.role === 'teacher' && (u.schoolCode === currentSchool.code || u.schoolCode === 'RAYA-1448'));
  const schoolAssistants = users.filter((u) => u.role === 'employee' && u.schoolCode === currentSchool.code && u.id !== currentUser.id);

  // Filter today attendances for this school
  const todaySchoolAttendances = attendances.filter(
    (a) => (a.schoolCode === currentSchool.code || a.schoolCode === 'RAYA-1448') && a.date === today
  );

  // KPIs
  const totalStudentsCount = schoolStudents.length || 1;
  const presentCount = todaySchoolAttendances.filter((a) => a.finalStatus === 'present' && !a.isTruant).length;
  const absentCount = todaySchoolAttendances.filter((a) => a.finalStatus === 'absent').length;
  const excusedCount = todaySchoolAttendances.filter((a) => a.finalStatus === 'excused').length;
  const lateCount = todaySchoolAttendances.filter((a) => a.finalStatus === 'late').length;
  const attendanceRate = Math.round(((presentCount + excusedCount) / totalStudentsCount) * 100);

  // Truant List (كشف الهارب: selfCheckTime exists + teacherMark == absent)
  const truantList = useMemo(() => {
    return todaySchoolAttendances.filter((a) => a.isTruant || (Boolean(a.selfCheckTime) && a.teacherMark === 'absent'));
  }, [todaySchoolAttendances]);

  // Chronic Absentees (> 2 absences in last records)
  const chronicAbsentees = useMemo(() => {
    const map = new Map<string, number>();
    attendances
      .filter((a) => (a.schoolCode === currentSchool.code || a.schoolCode === 'RAYA-1448') && a.finalStatus === 'absent')
      .forEach((a) => {
        const count = map.get(a.studentId) || 0;
        map.set(a.studentId, count + 1);
      });

    return Array.from(map.entries())
      .filter(([_, count]) => count >= 2)
      .map(([studentId, count]) => ({
        student: users.find((u) => u.id === studentId) || { name: 'طالب', nationalId: studentId, mobile: '', className: '', sectionName: '' },
        absentDays: count,
      }))
      .sort((a, b) => b.absentDays - a.absentDays);
  }, [attendances, currentSchool.code, users]);

  // Excuses for this school
  const schoolExcuses = excuses.filter(
    (e) => e.schoolCode === currentSchool.code || e.schoolCode === 'RAYA-1448'
  );
  const pendingExcusesCount = schoolExcuses.filter((e) => e.status === 'pending').length;

  // Active Emergencies
  const schoolEmergencies = emergencies.filter(
    (e) => (e.schoolCode === currentSchool.code || e.schoolCode === 'RAYA-1448') && e.active
  );

  // Behavior Management Data
  const allBehaviorNotes = useMemo(() => {
    return getBehaviorNotes().filter((n) => !currentSchool.code || currentSchool.code === 'ALL' || n.schoolCode === currentSchool.code);
  }, [currentSchool.code, behaviorVersion]);

  const pendingBehaviorNotes = useMemo(() => {
    return allBehaviorNotes.filter((n) => n.status === 'pending');
  }, [allBehaviorNotes]);

  const allBehaviorDeductions = useMemo(() => {
    return getBehaviorDeductions().filter((d) => !currentSchool.code || currentSchool.code === 'ALL' || d.schoolCode === currentSchool.code);
  }, [currentSchool.code, behaviorVersion]);

  // Handlers for Student Transfer, Promotion, Deletion
  const handleOpenTransferModal = (student: User) => {
    setStudentToTransfer(student);
    setTransferNewGrade(student.className || ALL_GRADES_INTERMEDIATE[0]);
    setTransferNewSection(student.sectionName || 'أ');
  };

  const handleConfirmTransferSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentToTransfer || !transferNewGrade || !transferNewSection) return;
    transferStudentClass(studentToTransfer.id, transferNewGrade, transferNewSection);
    triggerNotification(
      'تم نقل الطالب بنجاح',
      `تم نقل الطالب ${studentToTransfer.name} إلى ${transferNewGrade} - شعبة (${transferNewSection})`,
      'general',
      currentSchool.code,
      'employee'
    );
    setStudentToTransfer(null);
    setBehaviorToast(`تم نقل الطالب (${studentToTransfer.name}) إلى ${transferNewGrade} بنجاح ✓`);
    setTimeout(() => setBehaviorToast(''), 3000);
    if (onRefreshData) onRefreshData();
  };

  const handleConfirmPromoteSubmit = () => {
    const result = promoteStudentsAcademicYear(currentSchool.code, promoteGradeFilter);
    setPromoteSuccessToast(`تم بنجاح ترحيل (${result.promotedCount}) طالباً للعام الدراسي القادم ⟳`);
    setIsPromoteModalOpen(false);
    if (onRefreshData) onRefreshData();
    setTimeout(() => setPromoteSuccessToast(''), 4000);
  };

  const handleConfirmDeleteStudentSubmit = () => {
    if (!studentToDelete) return;
    deleteStudent(studentToDelete.id);
    if (onDeleteUser) onDeleteUser(studentToDelete.id);
    setBehaviorToast(`تم حذف الطالب (${studentToDelete.name}) وسجلاته بنجاح ✓`);
    setStudentToDelete(null);
    setTimeout(() => setBehaviorToast(''), 3000);
    if (onRefreshData) onRefreshData();
  };

  const handleConfirmDeleteAllStudents = () => {
    const res = deleteAllSchoolStudents(currentSchool.code);
    setIsDeleteAllStudentsModalOpen(false);
    setBehaviorToast(`تم حذف جميع سجلات الطلاب (${res.deletedCount} طالب) بنجاح لتمكين إعادة استيرادهم وتوزيعهم ✓`);
    setTimeout(() => setBehaviorToast(''), 4000);
    if (onRefreshData) onRefreshData();
  };

  // Behavior Note Resolution Handler
  const handleResolveBehaviorNote = () => {
    if (!selectedNoteForAction) return;
    const isDeduction = noteResolutionType === 'approved_deduction';
    const pts = isDeduction ? Number(noteDeductionPoints) : 0;
    
    resolveBehaviorNote(
      selectedNoteForAction.id,
      {
        status: noteResolutionType,
        deductedPoints: pts,
        adminDecisionNote: noteAdminComment.trim() || (isDeduction ? 'تم اعتماد حسم درجات السلوك بناءً على تقرير المعلم' : 'تم توجيه الطالب وإنذاره كتابياً'),
        resolvedBy: currentUser.name,
      }
    );

    if (isDeduction && notifyParentOnNote) {
      triggerNotification(
        'إشعار حسم من درجات السلوك والمواظبة',
        `تم حسم (${pts}) درجات من سلوك الطالب ${selectedNoteForAction.studentName} بسبب: ${selectedNoteForAction.categoryLabel}`,
        'behavior',
        currentSchool.code,
        'student'
      );
    }

    setBehaviorVersion((v) => v + 1);
    setSelectedNoteForAction(null);
    setNoteAdminComment('');
    setBehaviorToast('تمت معالجة الملاحظة السلوكية بنجاح ✓');
    setTimeout(() => setBehaviorToast(''), 3000);
    if (onRefreshData) onRefreshData();
  };

  // Direct Behavior Deduction Handler
  const handleDirectDeductionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const targetStd = schoolStudents.find((s) => s.id === directDeductionStudentId || s.nationalId === directDeductionStudentId);
    if (!targetStd) return;

    const finalReason = directDeductionReason === 'أخرى' 
      ? (directDeductionCustomReason.trim() || 'مخالفة سلوكية') 
      : directDeductionReason;

    addBehaviorDeduction({
      studentId: targetStd.id,
      studentNationalId: targetStd.nationalId,
      studentName: targetStd.name,
      schoolCode: currentSchool.code,
      className: targetStd.className || 'الصف',
      sectionName: targetStd.sectionName || 'الشعبة',
      type: 'manual_deduction',
      points: Number(directDeductionPoints),
      reason: finalReason,
      notes: directDeductionNotes.trim() || undefined,
      recordedBy: currentUser.id,
      recordedByName: currentUser.name,
      date: today,
    });

    if (directDeductionNotify) {
      triggerNotification(
        'إشعار حسم من درجات السلوك والمواظبة',
        `تم حسم (${directDeductionPoints}) درجات من سلوك الطالب ${targetStd.name} بسبب: ${finalReason}`,
        'behavior',
        currentSchool.code,
        'student'
      );
    }

    setBehaviorVersion((v) => v + 1);
    setDirectDeductionStudentId('');
    setDirectDeductionNotes('');
    setDirectDeductionCustomReason('');
    setBehaviorToast(`تم حسم (${directDeductionPoints}) درجات من سلوك الطالب (${targetStd.name}) وإشعار ولي الأمر ✓`);
    setTimeout(() => setBehaviorToast(''), 3500);
    if (onRefreshData) onRefreshData();
  };

  const handleDeleteDeduction = (id: string) => {
    deleteBehaviorDeduction(id);
    setBehaviorVersion((v) => v + 1);
    setBehaviorToast('تم حذف حسم السلوك بنجاح وإعادة الرصيد للطالب ✓');
    setTimeout(() => setBehaviorToast(''), 3000);
    if (onRefreshData) onRefreshData();
  };

  // Handlers
  const handleSaveCustomClasses = (classes: SchoolClassSection[]) => {
    setSchoolClasses(classes);
    saveSchoolClasses(currentSchool.code, classes);
    if (onRefreshData) onRefreshData();
  };

  const handleImportStudentsFromExcel = (
    students: Array<{ nationalId: string; name: string; className: string; sectionName: string; parentMobile?: string }>
  ) => {
    if (onImportStudentsBatch) {
      onImportStudentsBatch(students);
    }
  };

  const handleCreateStudentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStdName.trim() || !newStdNid.trim()) return;

    const newStudent: User = {
      id: `std-${Date.now()}`,
      nationalId: newStdNid.trim(),
      password: '123',
      name: newStdName.trim(),
      role: 'student',
      schoolCode: currentSchool.code,
      className: newStdGrade,
      sectionName: newStdSection,
      parentMobile: newStdParentMobile.trim() || undefined,
    };

    onSaveUser(newStudent);
    setIsAddStudentModalOpen(false);
    setNewStdName('');
    setNewStdNid('');
    setNewStdParentMobile('');
    if (onRefreshData) onRefreshData();
  };

  const handleCreateTeacherSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeacherName.trim() || !newTeacherNid.trim()) return;

    const newTeacher: User = {
      id: `tch-${Date.now()}`,
      nationalId: newTeacherNid.trim(),
      password: newTeacherPassword.trim() || '123456',
      name: newTeacherName.trim(),
      mobile: newTeacherMobile.trim() || undefined,
      role: 'teacher',
      schoolCode: currentSchool.code,
    };

    onSaveUser(newTeacher);
    setIsAddTeacherModalOpen(false);
    setNewTeacherName('');
    setNewTeacherNid('');
    setNewTeacherMobile('');
    setNewTeacherSubject('');
    setNewTeacherPassword('123456');
    setBehaviorToast(`تمت إضافة المعلم (${newTeacher.name}) بنجاح ✓`);
    setTimeout(() => setBehaviorToast(''), 3000);
    if (onRefreshData) onRefreshData();
  };

  const handleCreateAssistantSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAsstName.trim() || !newAsstNid.trim()) return;

    const newAssistant: User = {
      id: `emp-${Date.now()}`,
      nationalId: newAsstNid.trim(),
      password: newAsstPassword.trim() || '123456',
      name: newAsstName.trim(),
      role: 'employee',
      schoolCode: currentSchool.code,
    };

    onSaveUser(newAssistant);
    setIsAddAssistantModalOpen(false);
    setNewAsstName('');
    setNewAsstNid('');
    setNewAsstPassword('123456');
    if (onRefreshData) onRefreshData();
  };

  const handleConfirmExcuseRejection = () => {
    if (!rejectionModalExcuse) return;
    onUpdateExcuseStatus(rejectionModalExcuse.id, 'rejected', rejectionReasonText.trim() || 'عذر غير مستوفٍ للشروط');
    setRejectionModalExcuse(null);
    setRejectionReasonText('');
  };

  const handleResetPasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetModalUser || !newPasswordVal.trim()) return;
    onResetPassword(resetModalUser.nationalId, newPasswordVal.trim());
    setResetFeedback(`تم تعيين كلمة مرور جديدة للمستخدم (${resetModalUser.name}) بنجاح ✓`);
    setTimeout(() => {
      setResetModalUser(null);
      setNewPasswordVal('');
      setResetFeedback('');
    }, 1800);
  };

  const handleConfirmDeleteAssistant = () => {
    if (!assistantToDelete) return;
    if (onDeleteUser) {
      onDeleteUser(assistantToDelete.id);
    }
    setAssistantToDelete(null);
    if (onRefreshData) onRefreshData();
  };

  const handleConfirmDeleteTeacher = () => {
    if (!teacherToDelete) return;
    if (onDeleteUser) {
      onDeleteUser(teacherToDelete.id);
    }
    setTeacherToDelete(null);
    if (onRefreshData) onRefreshData();
  };

  const handleCreateBranchSchoolSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!branchName.trim()) return;

    if (schools.length >= 3) {
      alert('عذراً، الحد الأقصى للمدارس المسموح بإضافتها هو 3 مدارس فقط. لحذف مدرسة قائمة، استخدم زر الحذف في تبويب المدارس والفروع.');
      return;
    }

    const generatedCode = branchCode.trim().toUpperCase() || `SCH-${Math.floor(1000 + Math.random() * 9000)}`;

    const newSchool: School = {
      id: `sch-${Date.now()}`,
      name: branchName.trim(),
      code: generatedCode,
      city: branchCity.trim() || 'الرياض',
      educationOffice: branchOffice.trim() || 'مكتب التعليم',
      type: 'combined',
      contact: currentUser.mobile || '0500000000',
      managerName: branchManager.trim() || currentUser.name,
      timings: {
        tabour: '06:45',
        firstPeriod: '07:00',
        lateAfter: '07:15',
        absentAfter: '07:45',
        breakTime: '09:30',
        dismissal: '13:00',
      },
      geofence: {
        lat: branchLat,
        lng: branchLng,
        radius: Number(branchRadius) || 300,
        addressName: branchAddress.trim() || 'طريق الملك فهد، الرياض',
      },
      createdBy: currentUser.nationalId,
      createdAt: getTodayDateString(),
      subscriptionPlan: branchIsQuran ? 'free_forever' : 'silver',
      subscriptionStartDate: getTodayDateString(),
      subscriptionExpiryDate: branchIsQuran ? '2099-12-31' : '2027-06-30',
      maxStudents: branchIsQuran ? 9999 : 600,
      isSuspended: false,
      notes: branchIsQuran ? 'مدرسة تحفيظ قرآن كريم - ترخيص دائم مجاني 100%' : 'مدرسة تابعة للمؤسس',
    };

    onSaveSchool(newSchool);
    onSelectSchool(newSchool.code);
    setIsAddBranchModalOpen(false);
    setBranchName('');
    setBranchCode('');
    setBranchManager('');
    setBranchIsQuran(false);
    if (onRefreshData) onRefreshData();
  };

  const handleSaveEditSchoolSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!schoolToEdit) return;
    onSaveSchool(schoolToEdit);
    setIsEditSchoolModalOpen(false);
    setSchoolToEdit(null);
    if (onRefreshData) onRefreshData();
  };

  const handleConfirmDeleteSchool = () => {
    if (!schoolToDelete) return;
    if (schools.length <= 1) {
      alert('لا يمكن حذف المدرسة الوحيدة في النظام.');
      return;
    }
    if (onDeleteSchool) {
      onDeleteSchool(schoolToDelete.id);
    }
    // Switch to another school if the deleted one was selected
    const remainingSchools = schools.filter((s) => s.id !== schoolToDelete.id);
    if (remainingSchools.length > 0 && selectedSchoolCode === schoolToDelete.code) {
      onSelectSchool(remainingSchools[0].code);
    }
    setSchoolToDelete(null);
    if (onRefreshData) onRefreshData();
  };

  const handleBroadcastSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!emergencyMsg.trim()) return;

    onBroadcastEmergency({
      schoolCode: currentSchool.code,
      message: emergencyMsg.trim(),
      type: emergencyType,
      active: true,
    });

    setEmergencyMsg('');
    alert('تم إرسال بث الطوارئ المدرسي العاجل لجميع الطلاب وأولياء الأمور والكادر بنجاح!');
  };

  // Filtered Directory
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      if (u.schoolCode !== currentSchool.code && u.schoolCode !== 'RAYA-1448') return false;
      if (filterRole !== 'all' && u.role !== filterRole) return false;
      if (filterGrade !== 'ALL' && u.className !== filterGrade) return false;
      if (filterSection !== 'ALL' && u.sectionName !== filterSection) return false;

      if (searchDirectory.trim()) {
        const q = searchDirectory.toLowerCase();
        const matchName = u.name.toLowerCase().includes(q);
        const matchNid = u.nationalId.includes(q);
        const matchMobile = u.parentMobile?.includes(q) || u.mobile?.includes(q);
        return matchName || matchNid || matchMobile;
      }
      return true;
    });
  }, [users, currentSchool.code, filterRole, filterGrade, filterSection, searchDirectory]);

  return (
    <div className="space-y-6 animate-fadeIn pb-16 text-slate-800" dir="rtl">
      
      {/* Top Banner with School Info & Quick Master Controls */}
      <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-teal-950 rounded-3xl p-6 sm:p-8 text-white shadow-xl space-y-5 border border-emerald-500/20">
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          
          {/* School Details */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-bold flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>لوحة الموظف الإداري المعتمد</span>
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-white/10 text-slate-200 text-xs font-mono font-bold">
                كود المدرسة: {currentSchool.code}
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[11px] font-bold border border-amber-400/30">
                {currentSchool.subscriptionPlan === 'free_forever' ? 'ترخيص دائم (تحفيظ قرآن) ★' : 'باقة مفعلة ✓'}
              </span>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-3 pt-1">
              <h1 className="text-2xl sm:text-3xl font-black text-white">{currentSchool.name}</h1>
              
              {/* Quick School Switcher & Branch Creator */}
              <div className="flex items-center gap-2">
                <select
                  value={currentSchool.code}
                  onChange={(e) => onSelectSchool(e.target.value)}
                  className="bg-white/15 hover:bg-white/25 text-white font-bold text-xs px-3 py-1.5 rounded-xl border border-white/20 cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-400 transition-colors"
                  title="التبديل بين المدارس والفروع التابعة لك"
                >
                  {schools.map((s) => (
                    <option key={s.id} value={s.code} className="text-slate-900 font-bold">
                      {s.name} ({s.code}) {s.subscriptionPlan === 'free_forever' ? '📖' : ''}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={() => setIsAddBranchModalOpen(true)}
                  className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-2.5 py-1.5 rounded-xl text-xs font-black flex items-center gap-1 shadow-sm cursor-pointer transition-all hover:scale-105 active:scale-95"
                  title="إضافة فرع أو مدرسة تابعة جديدة"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ فرع / مدرسة تابعة</span>
                </button>
              </div>
            </div>
            
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300">
              <span>المدير: <strong className="text-white">{currentSchool.managerName}</strong></span>
              <span>•</span>
              <span>المدينة: <strong className="text-white">{currentSchool.city}</strong></span>
              <span>•</span>
              <span>النطاق الجغرافي: <strong className="text-emerald-300 font-mono font-bold">{currentSchool.geofence.radius} متر</strong></span>
              <span>•</span>
              <span>إجمالي المدارس التابعة: <strong className="text-amber-300 font-bold">{schools.length} مدارس</strong></span>
            </div>
          </div>

          {/* Master Action Buttons: Daily Report & Excel Importer */}
          <div className="flex flex-wrap items-center gap-2.5">
            
            {/* Direct Daily Principal Report Trigger (General Indicators Only) */}
            <button
              onClick={() => setIsDailyReportModalOpen(true)}
              className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs sm:text-sm font-black px-4 py-3 rounded-2xl flex items-center gap-2 transition-all shadow-lg hover:shadow-emerald-500/25 cursor-pointer transform active:scale-95"
              title="طباعة التقرير العام لمدير المدرسة (مؤشرات رقمية عامة بدون أسماء)"
            >
              <Printer className="w-4 h-4" />
              <span>تقرير المدير (مؤشرات عامة)</span>
            </button>

            {/* Admin Archive Detailed Report Trigger (With Student Names and Recording Teachers) */}
            <button
              onClick={() => setIsAdminArchiveModalOpen(true)}
              className="bg-gradient-to-r from-indigo-700 to-slate-800 hover:from-indigo-600 hover:to-slate-700 text-white text-xs sm:text-sm font-black px-4 py-3 rounded-2xl flex items-center gap-2 transition-all shadow-lg hover:shadow-indigo-500/25 cursor-pointer transform active:scale-95 border border-indigo-400/30"
              title="طباعة تقرير الأرشفة للإداري (كشف مفصل بأسماء الطلاب والمعلم الراصد)"
            >
              <Archive className="w-4 h-4 text-indigo-300" />
              <span>تقرير الأرشفة (أسماء ومعلمين)</span>
            </button>

            {/* Excel & Classes Manager Modal Trigger */}
            <button
              onClick={() => setIsClassExcelModalOpen(true)}
              className="bg-white/15 hover:bg-white/25 border border-white/20 text-white text-xs sm:text-sm font-bold px-3.5 py-3 rounded-2xl flex items-center gap-2 transition-colors cursor-pointer shadow-sm"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-300" />
              <span>الصفوف والإكسل</span>
            </button>

            {/* Add Student Fast */}
            <button
              onClick={() => setIsAddStudentModalOpen(true)}
              className="bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold px-3.5 py-3 rounded-2xl flex items-center gap-1.5 transition-colors cursor-pointer border border-white/10"
            >
              <Plus className="w-4 h-4 text-emerald-400" />
              <span>طالب جديد</span>
            </button>

            {/* Invite Teachers Direct WhatsApp Button */}
            <button
              onClick={() => setIsInviteTeacherModalOpen(true)}
              className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-3.5 py-3 rounded-2xl flex items-center gap-1.5 transition-colors cursor-pointer border border-emerald-400/40 shadow-sm"
              title="دعوة المعلمين عبر رابط واتساب المباشر"
            >
              <Share2 className="w-4 h-4 text-white" />
              <span>دعوة المعلمين</span>
            </button>

          </div>

        </div>

        {/* Inline Noor Manual Sync Bar */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3.5 border border-white/15 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 flex-shrink-0">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-black text-white block">
                رصد إجمالي الغياب في نظام نور لليوم ({dateInfo.hijri}):
              </span>
              <span className="text-[11px] text-slate-300">
                أدخل العدد المسجل في نور وسينعكس تلقائياً على التقرير اليومي المطبوع للمدير
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="number"
              min={0}
              value={noorDailyAbsence}
              onChange={(e) => handleNoorCountChange(parseInt(e.target.value) || 0)}
              className="w-24 bg-white text-slate-900 font-mono font-black text-sm px-3 py-1.5 rounded-xl text-center border-2 border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
            <span className="text-xs text-white font-bold">طالب</span>
            {noorSaveToast && (
              <span className="text-[10px] bg-emerald-500 text-white font-bold px-2 py-0.5 rounded-md animate-in fade-in">
                ✓ تم الحفظ
              </span>
            )}
          </div>
        </div>

      </div>

      {/* Navigation Tabs Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-slate-200">
        {[
          { id: 'live', label: 'الرصد المباشر والانضباط', icon: UserCheck, count: null },
          { id: 'truant', label: 'كشف التباين والهروب', icon: ShieldAlert, count: truantList.length, alert: truantList.length > 0 },
          { id: 'directory', label: 'دليل الطلاب والكادر', icon: Users, count: schoolStudents.length },
          { id: 'teachers', label: 'إدارة ودعوة المعلمين', icon: GraduationCap, count: schoolTeachers.length },
          { id: 'behavior', label: 'السلوك والمواظبة (100 درجة)', icon: Scale, count: pendingBehaviorNotes.length, alert: pendingBehaviorNotes.length > 0 },
          { id: 'excuses', label: 'مراجعة الأعذار المرفوعة', icon: FileText, count: pendingExcusesCount, alert: pendingExcusesCount > 0 },
          { id: 'emergency', label: 'بث وتنبيهات الطوارئ', icon: Bell, count: schoolEmergencies.length },
          { id: 'assistants', label: 'الموظفون المساعدون', icon: Settings, count: schoolAssistants.length },
          { id: 'schools', label: 'المدارس والفروع التابعة', icon: Building2, count: schools.length },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
                isActive
                  ? 'bg-emerald-700 text-white shadow-md'
                  : 'bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {tab.count !== null && (
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                  tab.alert
                    ? 'bg-rose-500 text-white animate-pulse'
                    : isActive
                    ? 'bg-emerald-800 text-emerald-100'
                    : 'bg-slate-100 text-slate-700'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* TAB 1: LIVE ATTENDANCE DASHBOARD */}
      {activeTab === 'live' && (
        <div className="space-y-6">
          
          {/* Real-time KPI Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="bg-emerald-50 border border-emerald-200 rounded-3xl p-4 text-center">
              <span className="text-[11px] text-emerald-800 font-bold block mb-1">نسبة الانضباط</span>
              <div className="text-2xl sm:text-3xl font-black text-emerald-700">{attendanceRate}%</div>
              <span className="text-[10px] text-emerald-600">من إجمالي الطلاب</span>
            </div>

            <div className="bg-teal-50 border border-teal-200 rounded-3xl p-4 text-center">
              <span className="text-[11px] text-teal-800 font-bold block mb-1">حضور فعلي</span>
              <div className="text-2xl sm:text-3xl font-black text-teal-700">{presentCount}</div>
              <span className="text-[10px] text-teal-600">من أصل {totalStudentsCount} طالب</span>
            </div>

            <div className="bg-rose-50 border border-rose-200 rounded-3xl p-4 text-center">
              <span className="text-[11px] text-rose-800 font-bold block mb-1">الغياب بالمنظومة</span>
              <div className="text-2xl sm:text-3xl font-black text-rose-700">{absentCount}</div>
              <span className="text-[10px] text-rose-600">غير مبرر حتى الآن</span>
            </div>

            <div className="bg-indigo-50 border-2 border-indigo-300 rounded-3xl p-4 text-center">
              <span className="text-[11px] text-indigo-900 font-black block mb-1">غياب نظام نور</span>
              <div className="text-2xl sm:text-3xl font-black text-indigo-700">{noorDailyAbsence}</div>
              <span className="text-[10px] text-indigo-600">مرصود يدوياً لليوم</span>
            </div>

            <div className="bg-sky-50 border border-sky-200 rounded-3xl p-4 text-center">
              <span className="text-[11px] text-sky-800 font-bold block mb-1">أعذار معتمدة</span>
              <div className="text-2xl sm:text-3xl font-black text-sky-700">{excusedCount}</div>
              <span className="text-[10px] text-sky-600">طبي / رسمي</span>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-3xl p-4 text-center">
              <span className="text-[11px] text-amber-800 font-bold block mb-1">المتأخرون صباحاً</span>
              <div className="text-2xl sm:text-3xl font-black text-amber-700">{lateCount}</div>
              <span className="text-[10px] text-amber-600">بعد الطابور الصباحي</span>
            </div>
          </div>

          {/* Discrepancy & Truancy Alert Banner */}
          {truantList.length > 0 && (
            <div className="bg-rose-600 text-white rounded-3xl p-5 sm:p-6 shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-pulse">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-white/20 backdrop-blur-md">
                  <ShieldAlert className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-black text-base">
                    تنبيه أمني: تم رصد {truantList.length} طلاب مسجلين بالبصمة بينما رصدهم المعلم غائبين بالحصة!
                  </h3>
                  <p className="text-xs text-rose-100 mt-0.5">
                    التحضير الذاتي بالجوال تم خارج الفصل الدراسي أو هناك تباين بين الرصدين.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setActiveTab('truant')}
                className="bg-white text-rose-700 hover:bg-rose-50 text-xs font-black px-4 py-2.5 rounded-xl transition-colors cursor-pointer whitespace-nowrap shadow-sm"
              >
                معاينة كشف الهاربين فوراً
              </button>
            </div>
          )}

          {/* Quick Classroom Live Monitor */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-emerald-700" />
                <h3 className="font-black text-base text-slate-900">مؤشرات الحضور حسب الفصول والشعب الدراسية</h3>
              </div>

              <button
                onClick={() => setIsDailyReportModalOpen(true)}
                className="text-xs text-emerald-700 hover:text-emerald-800 font-bold flex items-center gap-1 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>طباعة التقرير الشامل للمدير</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {schoolClasses.map((cls) => (
                <div key={cls.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <strong className="text-slate-900 font-bold text-sm">{cls.className}</strong>
                    {cls.classCode && (
                      <span className="text-[10px] font-mono bg-slate-200 text-slate-700 px-2 py-0.5 rounded font-bold">
                        كود: {cls.classCode}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {cls.sections.map((sec) => {
                      const secStudents = schoolStudents.filter(
                        (s) => s.className === cls.className && s.sectionName === sec
                      );
                      const secAttendances = todaySchoolAttendances.filter(
                        (a) => a.className === cls.className && a.sectionName === sec
                      );
                      const secPresent = secAttendances.filter((a) => a.finalStatus === 'present').length;
                      const secAbsent = secAttendances.filter((a) => a.finalStatus === 'absent').length;

                      return (
                        <div
                          key={sec}
                          className="bg-white border border-slate-200 rounded-xl p-2 text-center text-xs flex-1 min-w-[90px]"
                        >
                          <span className="font-bold text-slate-700 block text-[11px]">فصل {sec}</span>
                          <div className="flex items-center justify-center gap-2 mt-1 text-[11px] font-bold">
                            <span className="text-emerald-700">{secPresent} حاضر</span>
                            <span className="text-slate-300">|</span>
                            <span className="text-rose-700">{secAbsent} غائب</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

          </div>

        </div>
      )}

      {/* TAB 2: TRUANT DETECTION */}
      {activeTab === 'truant' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-rose-600" />
                <span>كشف التباين والهروب المدرسي (سجل بالجوال والمعلم رصده غائباً)</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                يطابق بصمة السياج الجغرافي الذاتي مع كشف الحضور الصفي للمعلم لليوم {dateInfo.hijri}
              </p>
            </div>

            <span className="text-xs font-bold bg-rose-100 text-rose-800 px-3 py-1 rounded-full">
              {truantList.length} حالات مرصودة
            </span>
          </div>

          {truantList.length === 0 ? (
            <div className="p-12 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-2">
              <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
              <p className="text-sm font-bold text-slate-700">لا توجد أي حالات تباين أو هروب مرصودة لليوم ✓</p>
              <p className="text-xs text-slate-400">جميع الطلاب الذين حضروا بالسياج الجغرافي متواجدون داخل حصصهم الصفية.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="w-full text-right text-xs">
                <thead className="bg-rose-50 text-rose-900 font-bold border-b border-rose-200">
                  <tr>
                    <th className="py-3 px-4">اسم الطالب</th>
                    <th className="py-3 px-4">الصف والفصل</th>
                    <th className="py-3 px-4">وقت البصمة بالجوال</th>
                    <th className="py-3 px-4">رصد المعلم بالحصة</th>
                    <th className="py-3 px-4">جوال ولي الأمر</th>
                    <th className="py-3 px-4">الإجراء</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {truantList.map((att) => {
                    const studentObj = users.find((u) => u.id === att.studentId);
                    return (
                      <tr key={att.id} className="hover:bg-slate-50">
                        <td className="py-3 px-4">
                          <strong className="text-slate-900 block font-bold">{att.studentName}</strong>
                          <span className="text-[11px] font-mono text-slate-500">هوية: {att.nationalId}</span>
                        </td>
                        <td className="py-3 px-4">{att.className} - فصل {att.sectionName}</td>
                        <td className="py-3 px-4 font-mono text-emerald-700 font-bold">✓ {att.selfCheckTime}</td>
                        <td className="py-3 px-4 font-bold text-rose-700">غائب بالحصة ✗</td>
                        <td className="py-3 px-4 font-mono text-slate-700">
                          {studentObj?.parentMobile || att.parentMobile || '-'}
                        </td>
                        <td className="py-3 px-4">
                          <button
                            onClick={() => setSelectedDossierStudent(studentObj || null)}
                            className="text-xs bg-slate-800 hover:bg-slate-900 text-white font-bold px-3 py-1 rounded-lg transition-colors cursor-pointer"
                          >
                            فتح ملف الطالب
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: STUDENT & STAFF DIRECTORY WITH DOSSIER TRIGGER */}
      {activeTab === 'directory' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
          
          {promoteSuccessToast && (
            <div className="bg-emerald-600 text-white p-4 rounded-2xl flex items-center justify-between text-xs font-black shadow-md animate-fadeIn">
              <div className="flex items-center gap-2">
                <GraduationCap className="w-5 h-5" />
                <span>{promoteSuccessToast}</span>
              </div>
              <button onClick={() => setPromoteSuccessToast('')} className="p-1 hover:bg-emerald-700 rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-emerald-700" />
                <span>دليل الطلاب والكادر وإدارة التنقلات والترحيل</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                إدارة نقل الطلاب بين الصفوف والشعب، ترحيل الدفعات للعام القادم، حذف السجلات، ومتابعة السلوك
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setIsInviteTeacherModalOpen(true)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
                title="توليد رسالة ورابط دخول المعلمين لمشاركتها عبر الواتساب"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>دعوة المعلمين (واتساب)</span>
              </button>

              <button
                onClick={() => setIsAddTeacherModalOpen(true)}
                className="bg-teal-700 hover:bg-teal-800 text-white text-xs font-black px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
                title="إضافة معلم جديد للمدرسة وتعيين بيانات الدخول"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>إضافة معلم</span>
              </button>

              <button
                onClick={() => setIsPromoteModalOpen(true)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
                title="ترحيل الطلاب للسنة الدراسية التالية (أولى متوسط إلى ثاني متوسط بنفس الشعبة، وهكذا)"
              >
                <GraduationCap className="w-3.5 h-3.5" />
                <span>ترحيل الطلاب للسنة القادمة</span>
              </button>

              <button
                onClick={() => setIsClassExcelModalOpen(true)}
                className="bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>استيراد إكسل</span>
              </button>
              
              <button
                onClick={() => setIsAddStudentModalOpen(true)}
                className="bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>إضافة طالب</span>
              </button>

              <button
                onClick={() => setIsDeleteAllStudentsModalOpen(true)}
                className="bg-rose-700 hover:bg-rose-800 text-white text-xs font-bold px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
                title="حذف جميع الطلاب دفعة واحدة لإعادة تسكينهم واستيرادهم"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>حذف جميع الطلاب</span>
              </button>
            </div>
          </div>

          {/* Search & Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="sm:col-span-2 relative">
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
              <input
                type="text"
                placeholder="ابحث بالاسم، الهوية الوطنية، أو جوال ولي الأمر..."
                value={searchDirectory}
                onChange={(e) => setSearchDirectory(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pr-9 pl-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value as any)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800"
            >
              <option value="student">الطلاب فقط</option>
              <option value="teacher">المعلمون فقط</option>
              <option value="all">الكل</option>
            </select>

            <select
              value={filterGrade}
              onChange={(e) => setFilterGrade(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800"
            >
              <option value="ALL">جميع الصفوف الدراسية</option>
              {schoolClasses.map((cls) => (
                <option key={cls.id} value={cls.className}>{cls.className}</option>
              ))}
            </select>
          </div>

          {/* Directory Table */}
          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">الصورة والطالب</th>
                  <th className="py-3 px-4">رقم الهوية / الوزاري</th>
                  <th className="py-3 px-4">الصف والفصل</th>
                  <th className="py-3 px-4">درجة السلوك (100)</th>
                  <th className="py-3 px-4">جوال ولي الأمر</th>
                  <th className="py-3 px-4">حالة اليوم</th>
                  <th className="py-3 px-4">الإجراءات والعمليات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredUsers.map((user) => {
                  const todayAtt = todaySchoolAttendances.find(
                    (a) => a.studentId === user.id || a.nationalId === user.nationalId
                  );

                  const bScore = user.role === 'student'
                    ? calculateStudentBehaviorScore(user.id, user.nationalId, currentSchool.code)
                    : null;

                  return (
                    <tr key={user.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-slate-200 overflow-hidden flex-shrink-0 border border-slate-300">
                            {user.photoUrl ? (
                              <img src={user.photoUrl} alt={user.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-slate-500 font-bold">
                                {user.name.charAt(0)}
                              </div>
                            )}
                          </div>
                          <div>
                            <strong className="font-bold text-slate-900 block">{user.name}</strong>
                            <span className="text-[10px] text-slate-400 font-bold">{user.role === 'student' ? 'طالب' : 'معلم'}</span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4 font-mono font-bold text-slate-800">{user.nationalId}</td>

                      <td className="py-3 px-4">
                        {user.role === 'student' ? (
                          <span>{user.className || 'الصف الأول'} - فصل ({user.sectionName || '1'})</span>
                        ) : (
                          <span className="text-slate-500">معلم صفوف</span>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        {bScore ? (
                          <div className="flex items-center gap-1.5">
                            <span className={`px-2 py-0.5 rounded-md font-mono font-black text-xs ${
                              bScore.currentScore >= 90 ? 'bg-emerald-100 text-emerald-800' :
                              bScore.currentScore >= 80 ? 'bg-amber-100 text-amber-800' :
                              'bg-rose-100 text-rose-800'
                            }`}>
                              {bScore.currentScore}/100
                            </span>
                            {(bScore.tardinessDeductions > 0 || bScore.manualDeductionsTotal > 0) && (
                              <span className="text-[10px] text-slate-400 font-mono">
                                (-{bScore.tardinessDeductions + bScore.manualDeductionsTotal})
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        {user.parentMobile ? (
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-slate-800 font-bold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                              {user.parentMobile}
                            </span>
                            <a
                              href={`https://wa.me/${user.parentMobile.startsWith('0') ? '966' + user.parentMobile.slice(1) : user.parentMobile}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[10px] bg-emerald-600 text-white font-bold px-1.5 py-0.5 rounded"
                            >
                              واتس
                            </a>
                          </div>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        {todayAtt?.finalStatus === 'present' ? (
                          <span className="text-emerald-700 font-bold bg-emerald-100 px-2 py-0.5 rounded-md text-[11px]">حاضر ✓</span>
                        ) : todayAtt?.finalStatus === 'excused' ? (
                          <span className="text-sky-700 font-bold bg-sky-100 px-2 py-0.5 rounded-md text-[11px]">بعذر معتمد</span>
                        ) : todayAtt?.finalStatus === 'late' ? (
                          <span className="text-amber-700 font-bold bg-amber-100 px-2 py-0.5 rounded-md text-[11px]">متأخر</span>
                        ) : (
                          <span className="text-rose-700 font-bold bg-rose-100 px-2 py-0.5 rounded-md text-[11px]">غائب</span>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          {user.role === 'student' && (
                            <>
                              <button
                                onClick={() => setSelectedDossierStudent(user)}
                                className="text-xs bg-emerald-700 hover:bg-emerald-800 text-white font-bold px-2 py-1 rounded-lg transition-colors cursor-pointer"
                                title="فتح السجل التاريخي والملف الشامل للطالب"
                              >
                                الملف
                              </button>

                              <button
                                onClick={() => handleOpenTransferModal(user)}
                                className="p-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 transition-colors cursor-pointer"
                                title="نقل الطالب لصف أو شعبة أخرى"
                              >
                                <ArrowLeftRight className="w-3.5 h-3.5" />
                              </button>

                              <button
                                onClick={() => setStudentToDelete(user)}
                                className="p-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 transition-colors cursor-pointer"
                                title="حذف الطالب وسجلاته (عند الانتقال من المدرسة)"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}

                          <button
                            onClick={() => { setResetModalUser(user); setNewPasswordVal(''); }}
                            className="p-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
                            title="تغيير كلمة المرور"
                          >
                            <KeyRound className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

        </div>
      )}

      {/* TAB: BEHAVIOR & DISCIPLINE (100 Points Base, -1/Late Day, Teacher Notes, Admin Deductions) */}
      {activeTab === 'behavior' && (
        <div className="space-y-6">
          
          {behaviorToast && (
            <div className="bg-emerald-600 text-white p-4 rounded-2xl flex items-center justify-between text-xs font-black shadow-md animate-fadeIn">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5" />
                <span>{behaviorToast}</span>
              </div>
              <button onClick={() => setBehaviorToast('')} className="p-1 hover:bg-emerald-700 rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Behavior KPI Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
            <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs text-center space-y-1">
              <span className="text-xs font-bold text-slate-500 block">إجمالي طلاب المدرسة</span>
              <div className="text-2xl sm:text-3xl font-black text-slate-900">{schoolStudents.length}</div>
              <span className="text-[10px] text-slate-400 font-medium">الرصيد الأساسي 100 لكل طالب</span>
            </div>

            <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs text-center space-y-1">
              <span className="text-xs font-bold text-emerald-700 block">طلاب بسلوك مثالي (100)</span>
              <div className="text-2xl sm:text-3xl font-black text-emerald-600">
                {schoolStudents.filter((s) => {
                  const sc = calculateStudentBehaviorScore(s.id, s.nationalId, currentSchool.code);
                  return sc.currentScore === 100;
                }).length}
              </div>
              <span className="text-[10px] text-emerald-600 font-medium">بدون أي تأخر أو مخالفات</span>
            </div>

            <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs text-center space-y-1">
              <span className="text-xs font-bold text-amber-700 block">ملاحظات معلمين معلقة</span>
              <div className="text-2xl sm:text-3xl font-black text-amber-600">{pendingBehaviorNotes.length}</div>
              <span className="text-[10px] text-amber-600 font-medium">تحتاج اتخاذ قرار إداري</span>
            </div>

            <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs text-center space-y-1">
              <span className="text-xs font-bold text-rose-700 block">إجمالي قرارات الحسم</span>
              <div className="text-2xl sm:text-3xl font-black text-rose-600">{allBehaviorDeductions.length}</div>
              <span className="text-[10px] text-rose-600 font-medium">حسومات إدارية معتمدة</span>
            </div>
          </div>

          {/* Section 1: Teacher Behavior Notes Pending Review */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-600 border border-amber-500/20">
                  <MessageSquareWarning className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    ملاحظات المعلمين السلوكية الواردة من الحصص والفصول ({pendingBehaviorNotes.length})
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    ملاحظات ومخالفات رفعها المعلمون أثناء الحصص وتتطلب معالجة الإدارة أو اعتماد خصم السلوك
                  </p>
                </div>
              </div>

              <span className={`text-xs font-bold px-3 py-1 rounded-full self-start sm:self-auto ${
                pendingBehaviorNotes.length > 0 ? 'bg-amber-100 text-amber-900 font-black' : 'bg-slate-100 text-slate-500'
              }`}>
                {pendingBehaviorNotes.length} ملاحظات جديدة قيد الإجراء
              </span>
            </div>

            {pendingBehaviorNotes.length === 0 ? (
              <div className="text-center py-8 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-60" />
                <p className="text-xs font-bold text-slate-600">لا توجد ملاحظات سلوكية معلقة من المعلمين حالياً</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {pendingBehaviorNotes.map((note) => (
                  <div 
                    key={note.id} 
                    className="bg-slate-50/80 hover:bg-slate-50 rounded-2xl p-4 sm:p-5 border border-slate-200 hover:border-amber-400 transition-all space-y-3 flex flex-col justify-between"
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="text-[10px] bg-indigo-50 text-indigo-700 font-bold px-2.5 py-0.5 rounded-full border border-indigo-200">
                            المعلم الراصد: {note.teacherName}
                          </span>
                          <h4 className="text-sm font-black text-slate-900 mt-1">{note.studentName}</h4>
                          <span className="text-[11px] text-slate-500 font-medium">
                            {note.className} - شعبة ({note.sectionName}) • هوية: {note.studentNationalId}
                          </span>
                        </div>

                        <span className="text-[11px] font-bold bg-rose-50 text-rose-700 px-2.5 py-1 rounded-xl border border-rose-200 whitespace-nowrap">
                          {note.categoryLabel}
                        </span>
                      </div>

                      <div className="bg-white p-3 rounded-xl border border-slate-200 text-xs text-slate-700 leading-relaxed">
                        <strong className="block text-[11px] text-slate-400 font-bold mb-1">تفاصيل الملاحظة:</strong>
                        {note.description}
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                        <span>الحصة: {note.period || 'الرصد العام'}</span>
                        <span>{note.date} {note.createdAt ? `(${new Date(note.createdAt).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })})` : ''}</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setSelectedNoteForAction(note);
                        setNoteResolutionType('approved_deduction');
                        setNoteDeductionPoints(3);
                        setNoteAdminComment('');
                      }}
                      className="w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-sm"
                    >
                      <Scale className="w-4 h-4" />
                      <span>معالجة الملاحظة السلوكية واتخاذ القرار</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section 2: Direct Admin Behavior Deduction */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-950 text-white rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-xl space-y-6">
            <div className="flex items-center gap-3 pb-4 border-b border-white/10">
              <div className="p-3 rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/30">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-black text-white">
                  الحسم الإداري المباشر لدرجات السلوك والمواظبة
                </h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  خصم درجات من رصيد الطالب (100) مع توثيق السبب وإرسال إشعار فوري لولي الأمر والطالب
                </p>
              </div>
            </div>

            <form onSubmit={handleDirectDeductionSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">اختر الطالب المستهدف</label>
                  <select
                    value={directDeductionStudentId}
                    onChange={(e) => setDirectDeductionStudentId(e.target.value)}
                    required
                    className="w-full bg-white/10 border border-white/20 text-white rounded-xl px-3 py-2.5 text-xs font-bold focus:bg-slate-900 focus:outline-hidden focus:border-emerald-500"
                  >
                    <option value="" className="bg-slate-900 text-white">-- اختر طالباً من المدرسة --</option>
                    {schoolStudents.map((s) => (
                      <option key={s.id} value={s.id} className="bg-slate-900 text-white">
                        {s.name} ({s.className} - {s.sectionName}) - هوية: {s.nationalId}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">سبب الحسم والمخالفة</label>
                  <select
                    value={directDeductionReason}
                    onChange={(e) => setDirectDeductionReason(e.target.value)}
                    className="w-full bg-white/10 border border-white/20 text-white rounded-xl px-3 py-2.5 text-xs font-bold focus:bg-slate-900 focus:outline-hidden focus:border-emerald-500"
                  >
                    <option value="إثارة الفوضى وعدم الانضباط الصفي" className="bg-slate-900 text-white">إثارة الفوضى وعدم الانضباط الصفي</option>
                    <option value="مشاجرة أو اعتداء لفظي / جسدي" className="bg-slate-900 text-white">مشاجرة أو اعتداء لفظي / جسدي</option>
                    <option value="استخدام الهاتف الجوال أثناء اليوم الدراسي" className="bg-slate-900 text-white">استخدام الهاتف الجوال أثناء اليوم الدراسي</option>
                    <option value="الهروب من الحصة الدراسية أو المدرسة" className="bg-slate-900 text-white">الهروب من الحصة الدراسية أو المدرسة</option>
                    <option value="إتلاف ممتلكات وأثاث المدرسة" className="bg-slate-900 text-white">إتلاف ممتلكات وأثاث المدرسة</option>
                    <option value="الغش أو محاولة الغش في الاختبارات" className="bg-slate-900 text-white">الغش أو محاولة الغش في الاختبارات</option>
                    <option value="التنمر أو الإساءة لزملائه" className="bg-slate-900 text-white">التنمر أو الإساءة لزملائه</option>
                    <option value="عدم احترام الكادر التعليمي والإداري" className="bg-slate-900 text-white">عدم احترام الكادر التعليمي والإداري</option>
                    <option value="أخرى" className="bg-slate-900 text-white">سبب آخر مخصص...</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">مقدار الدرجات المحسومة</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={1}
                      max={20}
                      value={directDeductionPoints}
                      onChange={(e) => setDirectDeductionPoints(Number(e.target.value) || 1)}
                      className="w-24 bg-white/10 border border-white/20 text-rose-400 font-mono font-black rounded-xl px-3 py-2.5 text-center text-sm focus:bg-slate-900 focus:outline-hidden"
                      required
                    />
                    <span className="text-xs text-slate-400 font-bold">درجات من 100</span>
                  </div>
                </div>
              </div>

              {directDeductionReason === 'أخرى' && (
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">اكتب سبب المخالفة بالتفصيل</label>
                  <input
                    type="text"
                    value={directDeductionCustomReason}
                    onChange={(e) => setDirectDeductionCustomReason(e.target.value)}
                    placeholder="اكتب سبب الحسم..."
                    required
                    className="w-full bg-white/10 border border-white/20 text-white rounded-xl px-3 py-2 text-xs font-bold focus:bg-slate-900 focus:outline-hidden"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">ملاحظات وتوجيهات إضافية (تظهر للطالب وولي الأمر)</label>
                <textarea
                  rows={2}
                  value={directDeductionNotes}
                  onChange={(e) => setDirectDeductionNotes(e.target.value)}
                  placeholder="اكتب ملحوظة أو توجيه المرشد الطلابي..."
                  className="w-full bg-white/10 border border-white/20 text-white rounded-xl px-3 py-2 text-xs focus:bg-slate-900 focus:outline-hidden"
                />
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                <label className="flex items-center gap-2 text-xs font-bold text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={directDeductionNotify}
                    onChange={(e) => setDirectDeductionNotify(e.target.checked)}
                    className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500"
                  />
                  <span>إرسال إشعار وتنبيه فوري للطالب وولي الأمر بسبب ومقدار الخصم</span>
                </label>

                <button
                  type="submit"
                  disabled={!directDeductionStudentId}
                  className="px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-lg cursor-pointer"
                >
                  <ShieldAlert className="w-4 h-4" />
                  <span>اعتماد حسم الدرجات وتسجيل المخالفة</span>
                </button>
              </div>
            </form>
          </div>

          {/* Section 3: School Students Behavior Standing Table */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <Scale className="w-5 h-5 text-emerald-700" />
                  <span>كشف درجات السلوك والمواظبة لجميع طلاب المدرسة</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  رصيد 100 درجة يبدأ به كل فصل - يحسم (1) عن كل يوم تأخر صباحي بالإضافة للحسومات الإدارية
                </p>
              </div>
            </div>

            {/* Students Table with full behavior breakdown */}
            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">اسم الطالب</th>
                    <th className="py-3 px-4">الصف والشعبة</th>
                    <th className="py-3 px-4">الأساس</th>
                    <th className="py-3 px-4">حسم التأخر الصباحي (-1/يوم)</th>
                    <th className="py-3 px-4">حسومات إدارية</th>
                    <th className="py-3 px-4">الدرجة الحالية (من 100)</th>
                    <th className="py-3 px-4">التقييم العام</th>
                    <th className="py-3 px-4">الإجراء</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {schoolStudents.map((std) => {
                    const stats = calculateStudentBehaviorScore(std.id, std.nationalId, currentSchool.code);
                    return (
                      <tr key={std.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4">
                          <strong className="font-bold text-slate-900 block">{std.name}</strong>
                          <span className="text-[10px] text-slate-400 font-mono">هوية: {std.nationalId}</span>
                        </td>

                        <td className="py-3 px-4">
                          <span>{std.className || 'الصف الأول'} - فصل ({std.sectionName || '1'})</span>
                        </td>

                        <td className="py-3 px-4 font-mono font-bold text-slate-600">100</td>

                        <td className="py-3 px-4 font-mono">
                          {stats.tardinessDeductions > 0 ? (
                            <span className="text-amber-700 font-bold bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                              -{stats.tardinessDeductions} ({stats.tardinessDeductions} يوم تأخر)
                            </span>
                          ) : (
                            <span className="text-emerald-600 font-bold">0 (منضبط)</span>
                          )}
                        </td>

                        <td className="py-3 px-4 font-mono">
                          {stats.manualDeductionsTotal > 0 ? (
                            <span className="text-rose-700 font-bold bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-md">
                              -{stats.manualDeductionsTotal} ({stats.manualDeductionsList.length} مخالفة)
                            </span>
                          ) : (
                            <span className="text-slate-400">0</span>
                          )}
                        </td>

                        <td className="py-3 px-4">
                          <span className={`px-2.5 py-1 rounded-xl font-mono font-black text-sm ${
                            stats.currentScore >= 90 ? 'bg-emerald-100 text-emerald-800' :
                            stats.currentScore >= 80 ? 'bg-amber-100 text-amber-800' :
                            'bg-rose-100 text-rose-800'
                          }`}>
                            {stats.currentScore} / 100
                          </span>
                        </td>

                        <td className="py-3 px-4">
                          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                            stats.currentScore >= 95 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                            stats.currentScore >= 90 ? 'bg-teal-50 text-teal-700 border border-teal-200' :
                            stats.currentScore >= 80 ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                            'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}>
                            {stats.currentScore >= 95 ? 'متميز ومثالي' :
                             stats.currentScore >= 90 ? 'ممتاز' :
                             stats.currentScore >= 80 ? 'جيد جداً' :
                             stats.currentScore >= 70 ? 'جيد' : 'يحتاج متابعة'}
                          </span>
                        </td>

                        <td className="py-3 px-4">
                          <button
                            onClick={() => setSelectedDossierStudent(std)}
                            className="text-xs bg-emerald-700 hover:bg-emerald-800 text-white font-bold px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                          >
                            الملف والسجل
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 4: Recent Administrative Deductions Log */}
          {allBehaviorDeductions.length > 0 && (
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <History className="w-5 h-5 text-indigo-600" />
                  <span>سجل القرارات الإدارية وحسومات السلوك السابقة ({allBehaviorDeductions.length})</span>
                </h3>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-slate-200">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">الطالب</th>
                      <th className="py-3 px-4">الصف والشعبة</th>
                      <th className="py-3 px-4">سبب المخالفة</th>
                      <th className="py-3 px-4">النقاط المحسومة</th>
                      <th className="py-3 px-4">المعتمد</th>
                      <th className="py-3 px-4">التاريخ</th>
                      <th className="py-3 px-4">الإجراء</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {allBehaviorDeductions.map((ded) => (
                      <tr key={ded.id} className="hover:bg-slate-50">
                        <td className="py-3 px-4">
                          <strong className="font-bold text-slate-900">{ded.studentName}</strong>
                          <span className="text-[10px] text-slate-400 block font-mono">هوية: {ded.studentNationalId}</span>
                        </td>
                        <td className="py-3 px-4">{ded.className} - {ded.sectionName}</td>
                        <td className="py-3 px-4">
                          <strong className="text-rose-700 block font-bold">{ded.reason}</strong>
                          {ded.notes && <span className="text-[11px] text-slate-500">{ded.notes}</span>}
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-rose-600 text-sm">
                          -{ded.points} درجات
                        </td>
                        <td className="py-3 px-4 text-slate-600">{ded.recordedByName}</td>
                        <td className="py-3 px-4 font-mono text-slate-500">{ded.date}</td>
                        <td className="py-3 px-4">
                          <button
                            onClick={() => handleDeleteDeduction(ded.id)}
                            className="text-xs bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold px-2.5 py-1 rounded-lg border border-rose-200 transition-colors cursor-pointer"
                            title="إلغاء هذا الحسم وإعادة الدرجات للطالب"
                          >
                            إلغاء الحسم
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      )}

      {/* TAB 4: EXCUSES REVIEW WORKFLOW */}
      {activeTab === 'excuses' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-700" />
                <span>مراجعة طلبات تبرير الغياب والأعذار الطبية</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                موافقة أو رفض الأعذار المقدمة من الطلاب مع تدوين أسباب الرفض الرسمية
              </p>
            </div>

            <span className="text-xs font-bold bg-amber-100 text-amber-900 px-3 py-1 rounded-full">
              {pendingExcusesCount} أعذار قيد المراجعة
            </span>
          </div>

          {schoolExcuses.length === 0 ? (
            <div className="p-12 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-2">
              <FileText className="w-10 h-10 text-slate-400 mx-auto opacity-50" />
              <p className="text-sm font-bold text-slate-600">لا توجد طلبات أعذار مرفوعة حتى الآن</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">الطالب والصف</th>
                    <th className="py-3 px-4">تاريخ الغياب</th>
                    <th className="py-3 px-4">النوع والبيان</th>
                    <th className="py-3 px-4">المرفق (PDF / صورة)</th>
                    <th className="py-3 px-4">الحالة</th>
                    <th className="py-3 px-4">القرار الإداري</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {schoolExcuses.map((exc) => (
                    <tr key={exc.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4">
                        <strong className="font-bold text-slate-900 block">{exc.studentName}</strong>
                        <span className="text-[11px] text-slate-500">هوية: {exc.nationalId}</span>
                      </td>

                      <td className="py-3 px-4 font-mono font-bold text-slate-800">{exc.date}</td>

                      <td className="py-3 px-4 max-w-xs">
                        <span className="text-[11px] text-slate-900 font-bold block">{exc.description}</span>
                        {exc.parentNote && (
                          <span className="text-[10px] text-amber-800 block mt-0.5">ملاحظة ولي الأمر: {exc.parentNote}</span>
                        )}
                        {exc.rejectionReason && (
                          <span className="text-[10px] text-rose-700 font-bold block mt-0.5">سبب الرفض: {exc.rejectionReason}</span>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        {exc.file ? (
                          <button
                            onClick={() => setPreviewExcuseAttachment(exc)}
                            className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>معاينة المستند</span>
                          </button>
                        ) : (
                          <span className="text-slate-400 text-[11px]">بدون مرفق</span>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        {exc.status === 'approved' ? (
                          <span className="text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md font-bold text-[11px]">معتمد ✓</span>
                        ) : exc.status === 'rejected' ? (
                          <span className="text-rose-700 bg-rose-100 px-2 py-0.5 rounded-md font-bold text-[11px]">مرفوض ✗</span>
                        ) : (
                          <span className="text-amber-800 bg-amber-100 px-2 py-0.5 rounded-md font-bold text-[11px]">قيد المراجعة</span>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        {exc.status === 'pending' ? (
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => onUpdateExcuseStatus(exc.id, 'approved')}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-2.5 py-1 rounded-lg text-xs transition-colors cursor-pointer"
                            >
                              قبول العذر
                            </button>
                            <button
                              onClick={() => { setRejectionModalExcuse(exc); setRejectionReasonText(''); }}
                              className="bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 font-bold px-2.5 py-1 rounded-lg text-xs transition-colors cursor-pointer"
                            >
                              رفض مع السبب
                            </button>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[11px]">تم البت فيه</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

        </div>
      )}

      {/* TAB 5: EMERGENCY BROADCAST */}
      {activeTab === 'emergency' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
              <Bell className="w-5 h-5 text-rose-600" />
              <span>نظام بث تنبيهات الطوارئ والرسائل العاجلة</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              إرسال إشعارات فورية لجميع الطلاب والكادر مع استلام تأكيد الاستلام الفوري
            </p>
          </div>

          <form onSubmit={handleBroadcastSubmit} className="space-y-4 max-w-xl bg-slate-50 p-5 rounded-2xl border border-slate-200">
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">نوع حالة الطوارئ</label>
              <select
                value={emergencyType}
                onChange={(e) => setEmergencyType(e.target.value as any)}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold"
              >
                <option value="rain">هطول أمطار وتعليق الدراسة الحضورية</option>
                <option value="early_dismissal">انصراف مبكر طارئ</option>
                <option value="maintenance">صيانة طارئة في المبنى</option>
                <option value="other">تنبيه إداري عام</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">نص الرسالة العاجلة</label>
              <textarea
                rows={3}
                value={emergencyMsg}
                onChange={(e) => setEmergencyMsg(e.target.value)}
                placeholder="اكتب تفاصيل التنبيه العاجل..."
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-rose-500"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs py-2.5 rounded-xl transition-colors cursor-pointer shadow-md flex items-center justify-center gap-2"
            >
              <Send className="w-4 h-4" />
              <span>إرسال البث العاجل فوراً لجميع الهواتف</span>
            </button>
          </form>
        </div>
      )}

      {/* TAB: TEACHERS MANAGEMENT & INVITATIONS (إدارة ودعوة المعلمين) */}
      {activeTab === 'teachers' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
            <div>
              <div className="flex items-center gap-2">
                <GraduationCap className="w-6 h-6 text-teal-700" />
                <h3 className="text-lg font-black text-slate-900">
                  إدارة ودعوة المعلمين ({schoolTeachers.length})
                </h3>
                <span className="bg-teal-100 text-teal-800 text-xs font-black px-2.5 py-0.5 rounded-full font-mono">
                  {schoolTeachers.length} معلم مسجل
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                إرسال رابط الدعوة وكلمات المرور للمعلمين، أو إضافة معلم جديد بحسابه الوطني وكلمة المرور
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setIsInviteTeacherModalOpen(true)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black px-4 py-2.5 rounded-xl flex items-center gap-2 transition-colors cursor-pointer shadow-sm"
              >
                <Share2 className="w-4 h-4" />
                <span>إرسال دعوة بالواتساب</span>
              </button>

              <button
                onClick={() => setIsAddTeacherModalOpen(true)}
                className="bg-teal-700 hover:bg-teal-800 text-white text-xs font-black px-4 py-2.5 rounded-xl flex items-center gap-2 transition-colors cursor-pointer shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>إضافة معلم جديد</span>
              </button>
            </div>
          </div>

          {/* WhatsApp Direct Invite Banner Card */}
          <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-slate-50 border border-emerald-200/80 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="flex h-3 w-3 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                </span>
                <h4 className="text-sm font-black text-emerald-950">
                  دعوة سريعة لجميع المعلمين في قروب المدرسة
                </h4>
              </div>
              <p className="text-xs text-emerald-800/90 leading-relaxed">
                اضغط على زر المشاركة لتوليد رسالة مجهزة تشمل رابط المنظومة وبيانات تسجيل الدخول الافتراضية للمعلمين.
              </p>
            </div>

            <button
              onClick={() => setIsInviteTeacherModalOpen(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-5 py-3 rounded-xl flex items-center justify-center gap-2 transition-transform active:scale-95 shadow-md cursor-pointer whitespace-nowrap shrink-0"
            >
              <MessageSquare className="w-4 h-4" />
              <span>مشاركة رابط الدعوة فوراً</span>
            </button>
          </div>

          {/* Teachers Grid */}
          {schoolTeachers.length === 0 ? (
            <div className="p-12 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-3">
              <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <GraduationCap className="w-6 h-6" />
              </div>
              <p className="text-sm font-bold text-slate-700">لا يوجد معلمون مسجلون في هذه المدرسة حالياً</p>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                يمكنك إضافة حساب معلم جديد أو إرسال رابط الدعوة ليدخل برقم الهوية وكلمة المرور الافتراضية.
              </p>
              <div className="flex items-center justify-center gap-2 pt-2">
                <button
                  onClick={() => setIsAddTeacherModalOpen(true)}
                  className="inline-flex items-center gap-1.5 bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold px-4 py-2 rounded-xl cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>إضافة معلم الآن</span>
                </button>
                <button
                  onClick={() => setIsInviteTeacherModalOpen(true)}
                  className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2 rounded-xl cursor-pointer"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>رابط الدعوة</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {schoolTeachers.map((teacher) => (
                <div key={teacher.id} className="p-5 rounded-2xl border border-slate-200 bg-slate-50/70 hover:bg-white hover:border-teal-300 hover:shadow-md transition-all space-y-3 shadow-xs">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center font-black text-sm">
                        {teacher.name.charAt(0)}
                      </div>
                      <div>
                        <strong className="text-slate-900 font-black text-sm block">{teacher.name}</strong>
                        <span className="text-xs font-mono text-slate-500 block mt-0.5">هوية: {teacher.nationalId}</span>
                      </div>
                    </div>
                    <span className="text-[10px] bg-teal-100 text-teal-800 border border-teal-200 px-2 py-0.5 rounded-md font-bold whitespace-nowrap">
                      معلم
                    </span>
                  </div>

                  {teacher.mobile && (
                    <div className="text-xs text-slate-600 flex items-center gap-1.5 bg-white p-2 rounded-xl border border-slate-200/60 font-mono">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      <span>{teacher.mobile}</span>
                      <a
                        href={`https://wa.me/${teacher.mobile.startsWith('0') ? '966' + teacher.mobile.slice(1) : teacher.mobile}`}
                        target="_blank"
                        rel="noreferrer"
                        className="mr-auto text-[10px] bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-2 py-0.5 rounded-md transition-colors"
                      >
                        مراسلة واتساب
                      </a>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-3 border-t border-slate-200/80">
                    <button
                      onClick={() => { setResetModalUser(teacher); setNewPasswordVal(''); }}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                      title="إعادة تعيين كلمة المرور للمعلم"
                    >
                      <KeyRound className="w-3.5 h-3.5" />
                      <span>تغيير المرور</span>
                    </button>

                    <button
                      onClick={() => setTeacherToDelete(teacher)}
                      className="px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors border border-rose-200"
                      title="حذف المعلم نهائياً من المدرسة"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>حذف المعلم</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 6: ASSISTANTS MANAGEMENT */}
      {activeTab === 'assistants' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Settings className="w-5 h-5 text-emerald-700" />
                <span>إدارة الموظفين المساعدين للمدرسة ({schoolAssistants.length})</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                إضافة وتعيين موظفين مساعدين للرصد وإدارة البلاغات ومتابعة الانضباط أو حذفهم
              </p>
            </div>

            <button
              onClick={() => setIsAddAssistantModalOpen(true)}
              className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold px-4 py-2.5 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة موظف مساعد</span>
            </button>
          </div>

          {schoolAssistants.length === 0 ? (
            <div className="p-12 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-3">
              <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <Users className="w-6 h-6" />
              </div>
              <p className="text-sm font-bold text-slate-700">لا يوجد موظفون مساعدون مضافون لهذه المدرسة حالياً</p>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                يمكنك إضافة موظف مساعد وتزويده برقم الهوية وكلمة مرور لتمكينه من الدخول والمساعدة في رصد الحضور.
              </p>
              <button
                onClick={() => setIsAddAssistantModalOpen(true)}
                className="mt-2 inline-flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold px-4 py-2 rounded-xl cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>إضافة أول موظف مساعد</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {schoolAssistants.map((asst) => (
                <div key={asst.id} className="p-5 rounded-2xl border border-slate-200 bg-slate-50/70 hover:bg-white hover:border-slate-300 transition-all space-y-3 shadow-xs">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <strong className="text-slate-900 font-black text-sm block">{asst.name}</strong>
                      <span className="text-xs font-mono text-slate-500 block mt-0.5">هوية: {asst.nationalId}</span>
                    </div>
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-md font-bold whitespace-nowrap">
                      موظف مساعد
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-slate-200/80">
                    <button
                      onClick={() => { setResetModalUser(asst); setNewPasswordVal(''); }}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                      title="إعادة تعيين كلمة المرور"
                    >
                      <KeyRound className="w-3.5 h-3.5" />
                      <span>تغيير المرور</span>
                    </button>

                    <button
                      onClick={() => setAssistantToDelete(asst)}
                      className="px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors border border-rose-200"
                      title="حذف المساعد نهائياً"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>حذف المساعد</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 7: SCHOOLS & BRANCHES MANAGEMENT (إدارة المدارس والفروع التابعة) */}
      {activeTab === 'schools' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
            <div>
              <div className="flex items-center gap-2">
                <Building2 className="w-6 h-6 text-emerald-700" />
                <h3 className="text-lg font-black text-slate-900">
                  إدارة المدارس والفروع التابعة
                </h3>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-black font-mono ${
                  schools.length >= 3 
                    ? 'bg-amber-100 text-amber-900 border border-amber-300' 
                    : 'bg-emerald-100 text-emerald-800'
                }`}>
                  {schools.length} من 3 مدارس (الحد الأقصى)
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                يمكنك كمسؤول إضافة حتى <strong className="text-slate-800">3 مدارس كحد أقصى</strong>، والتبديل الفوري بينها، تعديل بياناتها، أو حذف أي مدرسة لإفساح المجال لغيرها.
              </p>
            </div>

            {schools.length < 3 ? (
              <button
                onClick={() => setIsAddBranchModalOpen(true)}
                className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-black flex items-center gap-2 shadow-md hover:shadow-emerald-600/25 cursor-pointer transition-all active:scale-95 shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>إنشاء مدرسة / فرع تابع جديد</span>
              </button>
            ) : (
              <div className="px-4 py-2 bg-amber-50 border border-amber-300 rounded-2xl text-amber-900 text-xs font-bold text-center shrink-0">
                ⚠️ اكتمل الحد الأقصى (3/3 مدارس)
              </div>
            )}
          </div>

          {/* School Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {schools.map((sch) => {
              const isCurrent = sch.code === currentSchool.code;
              const schStudentsCount = users.filter((u) => u.schoolCode === sch.code && u.role === 'student').length;
              const schTeachersCount = users.filter((u) => u.schoolCode === sch.code && u.role === 'teacher').length;
              const isQuran = sch.subscriptionPlan === 'free_forever' || sch.name.includes('تحفيظ');

              return (
                <div
                  key={sch.id}
                  className={`rounded-3xl p-5 border-2 transition-all flex flex-col justify-between space-y-4 ${
                    isCurrent
                      ? 'border-emerald-600 bg-emerald-50/40 shadow-lg ring-2 ring-emerald-500/20'
                      : 'border-slate-200 bg-white hover:border-slate-300 shadow-xs'
                  }`}
                >
                  <div className="space-y-3">
                    {/* Header Badges */}
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs font-black px-2.5 py-1 rounded-xl bg-slate-100 text-slate-700 border border-slate-200">
                        {sch.code}
                      </span>
                      {isCurrent ? (
                        <span className="px-3 py-1 rounded-full bg-emerald-600 text-white text-[11px] font-black flex items-center gap-1">
                          <Check className="w-3 h-3" />
                          <span>المدرسة النشطة حالياً</span>
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-500 text-[10px] font-bold">
                          فرع تابع
                        </span>
                      )}
                    </div>

                    {/* School Name */}
                    <div>
                      <h4 className="font-black text-slate-900 text-base leading-snug">
                        {sch.name}
                      </h4>
                      {isQuran && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-black text-amber-800 bg-amber-100 border border-amber-200 px-2 py-0.5 rounded-md mt-1">
                          📖 مدرسة تحفيظ قرآن (ترخيص دائم مجاني 100%)
                        </span>
                      )}
                    </div>

                    {/* Details Info */}
                    <div className="space-y-1.5 text-xs text-slate-600 pt-2 border-t border-slate-100 font-medium">
                      <div className="flex justify-between">
                        <span className="text-slate-400">المدير المسؤول:</span>
                        <strong className="text-slate-800">{sch.managerName || 'غير محدد'}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">المدينة / المكتب:</span>
                        <span className="text-slate-800">{sch.city} - {sch.educationOffice}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">نطاق البصمة الجغرافي:</span>
                        <span className="text-emerald-700 font-mono font-bold">{sch.geofence.radius} متر</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">الطلاب المسجلين:</span>
                        <span className="font-mono font-bold text-slate-900">{schStudentsCount} طالب</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">المعلمين:</span>
                        <span className="font-mono font-bold text-slate-900">{schTeachersCount} معلم</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-3 border-t border-slate-100 flex flex-col gap-2">
                    {!isCurrent ? (
                      <button
                        onClick={() => onSelectSchool(sch.code)}
                        className="w-full py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-xs"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>الانتقال والتحكم بهذه المدرسة</span>
                      </button>
                    ) : (
                      <div className="py-2 text-center text-xs font-black text-emerald-800 bg-emerald-100 rounded-xl">
                        ✓ أنت تتحكم حالياً بهذه المدرسة
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setSchoolToEdit(sch);
                          setIsEditSchoolModalOpen(true);
                        }}
                        className="flex-1 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <Settings className="w-3.5 h-3.5" />
                        <span>تعديل المواعيد والإحداثيات</span>
                      </button>

                      {schools.length > 1 && (
                        <button
                          onClick={() => setSchoolToDelete(sch)}
                          className="px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs transition-colors cursor-pointer flex items-center justify-center gap-1"
                          title="حذف المدرسة التابعة"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>حذف</span>
                        </button>
                      )}
                    </div>

                    {/* Clean School Test Records */}
                    <button
                      onClick={() => setSchoolToWipe(sch)}
                      className="w-full py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold text-[11px] border border-amber-200 transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                      title="تنظيف بيانات المدرسة من السجلات التجريبية"
                    >
                      <Trash2 className="w-3 h-3 text-amber-600" />
                      <span>تصفير وتنظيف سجلات المدرسة للبدء النظيف</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Master Clean Reset Box for Dell Server Deployment */}
          <div className="mt-8 p-6 rounded-3xl bg-linear-to-r from-slate-900 via-slate-800 to-emerald-950 text-white shadow-xl border border-slate-700 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-1 text-right">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-emerald-400" />
                <h4 className="text-base font-black text-white">بدء التشغيل النظيف للإنتاج الفعلي (Dell Server Ready)</h4>
              </div>
              <p className="text-xs text-slate-300 max-w-xl leading-relaxed">
                هل ترغب في مسح كافة المدارس والطلاب والبيانات التجريبية نهائياً والبدء بمدرسة رئيسية واحدة نظيفة بحساب مدير النظام فقط لتدخل وتضيف طلابك ومعلميك الحقيقيين؟
              </p>
            </div>

            <button
              onClick={() => setIsWipeProductionModalOpen(true)}
              className="px-6 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs transition-all shadow-lg hover:shadow-emerald-500/20 shrink-0 cursor-pointer flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              <span>تصفير شامل والبدء النظيف للإنتاج ↵</span>
            </button>
          </div>
        </div>
      )}

      {/* Daily Printable Report Modal (For Principal - Indicators Only) */}
      <DailyPrincipalReportModal
        isOpen={isDailyReportModalOpen}
        onClose={() => setIsDailyReportModalOpen(false)}
        school={currentSchool}
        attendances={attendances}
        users={users}
        noorDailyAbsence={noorDailyAbsence}
        reportDate={today}
      />

      {/* Admin Archive Report Modal (With Student Names and Recording Teachers) */}
      <AdminArchiveReportModal
        isOpen={isAdminArchiveModalOpen}
        onClose={() => setIsAdminArchiveModalOpen(false)}
        school={currentSchool}
        attendances={attendances}
        users={users}
        noorDailyAbsence={noorDailyAbsence}
        reportDate={today}
      />

      {/* Class & Excel Importer Modal */}
      <ClassExcelManagerModal
        isOpen={isClassExcelModalOpen}
        onClose={() => setIsClassExcelModalOpen(false)}
        school={currentSchool}
        currentClasses={schoolClasses}
        onSaveClasses={handleSaveCustomClasses}
        onImportStudents={handleImportStudentsFromExcel}
      />

      {/* Student Dossier Modal */}
      {selectedDossierStudent && (
        <StudentDossierModal
          student={selectedDossierStudent}
          isOpen={Boolean(selectedDossierStudent)}
          onClose={() => setSelectedDossierStudent(null)}
          school={currentSchool}
          allAttendances={attendances}
          allExcuses={excuses}
        />
      )}

      {/* Excuse Rejection Reason Modal */}
      {rejectionModalExcuse && (
        <div className="fixed inset-0 z-60 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-black text-rose-700">رفض طلب عذر الغياب</h3>
            <p className="text-xs text-slate-600">
              يرجى كتابة سبب رفض العذر للطالب <strong>{rejectionModalExcuse.studentName}</strong>:
            </p>

            <textarea
              rows={3}
              value={rejectionReasonText}
              onChange={(e) => setRejectionReasonText(e.target.value)}
              placeholder="مثال: التقرير الطبي غير معتمد من منصة صحتي أو التاريخ غير مطابق..."
              className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs text-slate-900 font-bold focus:outline-none focus:border-rose-500"
            />

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setRejectionModalExcuse(null)}
                className="px-4 py-2 rounded-xl text-slate-600 font-bold text-xs hover:bg-slate-100 cursor-pointer"
              >
                إلغاء
              </button>
              <button
                onClick={handleConfirmExcuseRejection}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs cursor-pointer shadow-sm"
              >
                تأكيد الرفض
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Excuse Document Preview Modal */}
      {previewExcuseAttachment && (
        <div className="fixed inset-0 z-60 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-5 overflow-hidden shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h4 className="font-bold text-slate-900 text-base">مستند عذر الغياب المرفق</h4>
                <p className="text-xs text-slate-500">
                  {previewExcuseAttachment.studentName} • تاريخ الغياب: {previewExcuseAttachment.date}
                </p>
              </div>
              <button
                onClick={() => setPreviewExcuseAttachment(null)}
                className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="max-h-[60vh] overflow-y-auto flex items-center justify-center bg-slate-100 rounded-xl p-2">
              {previewExcuseAttachment.fileType === 'pdf' || previewExcuseAttachment.file?.startsWith('data:application/pdf') ? (
                <iframe
                  src={previewExcuseAttachment.file}
                  className="w-full h-96 rounded-lg border-0"
                  title="PDF Preview"
                />
              ) : (
                <img
                  src={previewExcuseAttachment.file}
                  alt="Attachment Preview"
                  className="max-h-96 w-auto object-contain rounded-lg shadow-sm"
                />
              )}
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-slate-600">
                <strong>البيان:</strong> {previewExcuseAttachment.description}
              </span>
              <button
                onClick={() => setPreviewExcuseAttachment(null)}
                className="px-4 py-2 bg-slate-800 text-white text-xs font-bold rounded-lg cursor-pointer"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add New Student Modal */}
      {isAddStudentModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-black text-slate-900">إضافة طالب جديد للمدرسة</h3>
              <button onClick={() => setIsAddStudentModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateStudentSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">اسم الطالب الكامل</label>
                <input
                  type="text"
                  value={newStdName}
                  onChange={(e) => setNewStdName(e.target.value)}
                  placeholder="مثال: فيصل بن عبدالعزيز الدوسري"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-bold"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">رقم الهوية الوطنية / الإقامة</label>
                <input
                  type="text"
                  value={newStdNid}
                  onChange={(e) => setNewStdNid(e.target.value)}
                  placeholder="10 أرقام"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-mono font-bold text-slate-900"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">الصف الدراسي</label>
                  <select
                    value={newStdGrade}
                    onChange={(e) => setNewStdGrade(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-bold text-slate-900"
                  >
                    {schoolClasses.map((cls) => (
                      <option key={cls.id} value={cls.className}>{cls.className}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">الفصل / الشعبة</label>
                  <input
                    type="text"
                    value={newStdSection}
                    onChange={(e) => setNewStdSection(e.target.value)}
                    placeholder="1 أو أ"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-bold text-slate-900"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">جوال ولي الأمر (للتواصل والإشعارات)</label>
                <input
                  type="tel"
                  value={newStdParentMobile}
                  onChange={(e) => setNewStdParentMobile(e.target.value)}
                  placeholder="05XXXXXXXX"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-mono font-bold text-slate-900"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsAddStudentModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 font-bold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl shadow-sm"
                >
                  حفظ الطالب
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Assistant Modal */}
      {isAddAssistantModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-black text-slate-900">إضافة موظف مساعد للمدرسة</h3>
              <button onClick={() => setIsAddAssistantModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateAssistantSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">اسم الموظف المساعد</label>
                <input
                  type="text"
                  value={newAsstName}
                  onChange={(e) => setNewAsstName(e.target.value)}
                  placeholder="مثال: خالد المنصور"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-bold text-slate-900"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">رقم الهوية الوطنية</label>
                <input
                  type="text"
                  value={newAsstNid}
                  onChange={(e) => setNewAsstNid(e.target.value)}
                  placeholder="10 أرقام"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-mono font-bold text-slate-900"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">كلمة المرور المبدئية</label>
                <input
                  type="password"
                  value={newAsstPassword}
                  onChange={(e) => setNewAsstPassword(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-mono font-bold text-slate-900"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsAddAssistantModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 font-bold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl shadow-sm"
                >
                  حفظ المساعد
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Password Reset Modal */}
      {resetModalUser && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-black text-slate-900">
              إعادة تعيين كلمة المرور ({resetModalUser.name})
            </h3>

            {resetFeedback ? (
              <div className="p-3 bg-emerald-50 text-emerald-800 rounded-xl font-bold text-xs text-center">
                {resetFeedback}
              </div>
            ) : (
              <form onSubmit={handleResetPasswordSubmit} className="space-y-3 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">كلمة المرور الجديدة</label>
                  <input
                    type="password"
                    value={newPasswordVal}
                    onChange={(e) => setNewPasswordVal(e.target.value)}
                    placeholder="أدخل كلمة المرور الجديدة..."
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-bold text-slate-900"
                    required
                  />
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t">
                  <button
                    type="button"
                    onClick={() => setResetModalUser(null)}
                    className="px-4 py-2 rounded-xl text-slate-600 font-bold"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl"
                  >
                    تحديث كلمة المرور
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Add Branch / Affiliated School Modal */}
      {isAddBranchModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl my-8">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-emerald-700" />
                <h3 className="text-base font-black text-slate-900">إنشاء مدرسة أو فرع تابع جديد</h3>
              </div>
              <button onClick={() => setIsAddBranchModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateBranchSchoolSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">اسم المدرسة / المجمع / الفرع</label>
                <input
                  type="text"
                  value={branchName}
                  onChange={(e) => setBranchName(e.target.value)}
                  placeholder="مثال: ثانوية صقر قريش - الفرع الثاني / مجمع الصالحين"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-bold"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">كود المدرسة الإحصائي</label>
                  <input
                    type="text"
                    value={branchCode}
                    onChange={(e) => setBranchCode(e.target.value.toUpperCase())}
                    placeholder="مثال: SQER-02 (توليد تلقائي)"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-mono font-bold text-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">المدينة</label>
                  <input
                    type="text"
                    value={branchCity}
                    onChange={(e) => setBranchCity(e.target.value)}
                    placeholder="الرياض، جدة، الدمام..."
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-bold"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">اسم مدير المدرسة</label>
                  <input
                    type="text"
                    value={branchManager}
                    onChange={(e) => setBranchManager(e.target.value)}
                    placeholder="اسم المدير..."
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">مكتب التعليم</label>
                  <input
                    type="text"
                    value={branchOffice}
                    onChange={(e) => setBranchOffice(e.target.value)}
                    placeholder="مكتب التعليم بالروضة"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-bold"
                  />
                </div>
              </div>

              {/* Quran School Checkbox (Free forever) */}
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3">
                <input
                  type="checkbox"
                  id="branchIsQuran"
                  checked={branchIsQuran}
                  onChange={(e) => setBranchIsQuran(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded text-amber-600 focus:ring-amber-500 cursor-pointer"
                />
                <label htmlFor="branchIsQuran" className="cursor-pointer">
                  <strong className="text-amber-900 font-black block">مدرسة تحفيظ قرآن كريم (مبادرة مجانية 100%)</strong>
                  <span className="text-[11px] text-amber-800 block">
                    تفعيل فوري لترخيص دائم مجاني مدى الحياة بدون رسوم مع طلاب غير محدودين
                  </span>
                </label>
              </div>

              {/* Interactive Visual Map Picker for Branch */}
              <div className="space-y-1.5 pt-1">
                <label className="block font-bold text-slate-800 text-xs">
                  تحديد موقع الفرع أو المدرسة بالدبوس على الخريطة:
                </label>
                <InteractiveMapPicker
                  latitude={branchLat}
                  longitude={branchLng}
                  radius={branchRadius}
                  onChange={({ lat, lng, address }) => {
                    setBranchLat(lat);
                    setBranchLng(lng);
                    if (address) setBranchAddress(address);
                  }}
                  height="240px"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">نصف قطر البصمة الجغرافية (بالمتر)</label>
                <input
                  type="number"
                  min={50}
                  max={2000}
                  value={branchRadius}
                  onChange={(e) => setBranchRadius(Number(e.target.value) || 300)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-mono font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">العنوان الجغرافي للمبنى</label>
                <input
                  type="text"
                  value={branchAddress}
                  onChange={(e) => setBranchAddress(e.target.value)}
                  placeholder="الحي، اسم الشارع..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-bold"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsAddBranchModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 font-bold hover:bg-slate-100"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl shadow-sm"
                >
                  إنشاء وحفظ الفرع ↵
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit School Timings & Coordinates Modal */}
      {isEditSchoolModalOpen && schoolToEdit && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl my-8">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-emerald-700" />
                <h3 className="text-base font-black text-slate-900">تعديل بيانات وإعدادات المدرسة ({schoolToEdit.name})</h3>
              </div>
              <button onClick={() => { setIsEditSchoolModalOpen(false); setSchoolToEdit(null); }} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditSchoolSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">اسم المدرسة</label>
                <input
                  type="text"
                  value={schoolToEdit.name}
                  onChange={(e) => setSchoolToEdit({ ...schoolToEdit, name: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-bold"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">اسم المدير</label>
                  <input
                    type="text"
                    value={schoolToEdit.managerName}
                    onChange={(e) => setSchoolToEdit({ ...schoolToEdit, managerName: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">المدينة</label>
                  <input
                    type="text"
                    value={schoolToEdit.city}
                    onChange={(e) => setSchoolToEdit({ ...schoolToEdit, city: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-3 bg-slate-50 rounded-2xl border border-slate-200">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">بداية الطابور</label>
                  <input
                    type="time"
                    value={schoolToEdit.timings.tabour}
                    onChange={(e) => setSchoolToEdit({
                      ...schoolToEdit,
                      timings: { ...schoolToEdit.timings, tabour: e.target.value }
                    })}
                    className="w-full bg-white border border-slate-300 rounded-xl px-2 py-1.5 font-mono font-bold text-slate-900"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">احتساب التأخر بعد</label>
                  <input
                    type="time"
                    value={schoolToEdit.timings.lateAfter}
                    onChange={(e) => setSchoolToEdit({
                      ...schoolToEdit,
                      timings: { ...schoolToEdit.timings, lateAfter: e.target.value }
                    })}
                    className="w-full bg-white border border-slate-300 rounded-xl px-2 py-1.5 font-mono font-bold text-slate-900"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">احتساب الغياب بعد</label>
                  <input
                    type="time"
                    value={schoolToEdit.timings.absentAfter}
                    onChange={(e) => setSchoolToEdit({
                      ...schoolToEdit,
                      timings: { ...schoolToEdit.timings, absentAfter: e.target.value }
                    })}
                    className="w-full bg-white border border-slate-300 rounded-xl px-2 py-1.5 font-mono font-bold text-slate-900"
                  />
                </div>
              </div>

              {/* Interactive Visual Map Picker for Geofence */}
              <div className="space-y-1.5 pt-1">
                <label className="block font-bold text-slate-800 text-xs">
                  تحديد موقع المدرسة الجغرافي بالدبوس على الخريطة:
                </label>
                <InteractiveMapPicker
                  latitude={schoolToEdit.geofence.lat || 24.7136}
                  longitude={schoolToEdit.geofence.lng || 46.6753}
                  radius={schoolToEdit.geofence.radius || 300}
                  onChange={({ lat, lng, address }) => {
                    setSchoolToEdit({
                      ...schoolToEdit,
                      geofence: {
                        ...schoolToEdit.geofence,
                        lat: lat,
                        lng: lng,
                        addressName: address || schoolToEdit.geofence.addressName,
                      },
                    });
                  }}
                  height="260px"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">نصف قطر النطاق (متر)</label>
                  <input
                    type="number"
                    value={schoolToEdit.geofence.radius}
                    onChange={(e) => setSchoolToEdit({
                      ...schoolToEdit,
                      geofence: { ...schoolToEdit.geofence, radius: Number(e.target.value) || 300 }
                    })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-mono font-bold text-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">العنوان الجغرافي</label>
                  <input
                    type="text"
                    value={schoolToEdit.geofence.addressName}
                    onChange={(e) => setSchoolToEdit({
                      ...schoolToEdit,
                      geofence: { ...schoolToEdit.geofence, addressName: e.target.value }
                    })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-bold"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => { setIsEditSchoolModalOpen(false); setSchoolToEdit(null); }}
                  className="px-4 py-2 rounded-xl text-slate-600 font-bold hover:bg-slate-100"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl shadow-sm"
                >
                  حفظ التعديلات
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete School Confirmation Modal */}
      {schoolToDelete && (
        <div className="fixed inset-0 z-60 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            
            <div className="text-center space-y-2">
              <h3 className="text-base font-black text-slate-900">
                هل أنت متأكد من حذف المدرسة؟
              </h3>
              <p className="text-xs text-slate-500">
                سيتم إزالة المدرسة <strong className="text-slate-900 font-black">({schoolToDelete.name})</strong> وكودها <strong className="font-mono text-slate-800 font-black">({schoolToDelete.code})</strong> من قائمة المدارس التابعة لك.
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 pt-3 border-t">
              <button
                type="button"
                onClick={() => setSchoolToDelete(null)}
                className="px-4 py-2 rounded-xl text-slate-600 font-bold text-xs hover:bg-slate-100 cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteSchool}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-sm cursor-pointer"
              >
                تأكيد حذف المدرسة
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Assistant Confirmation Modal */}
      {assistantToDelete && (
        <div className="fixed inset-0 z-60 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            
            <div className="text-center space-y-2">
              <h3 className="text-base font-black text-slate-900">
                هل أنت متأكد من حذف الموظف المساعد؟
              </h3>
              <p className="text-xs text-slate-500">
                سيتم إزالة الموظف المساعد <strong className="text-slate-900 font-black">({assistantToDelete.name})</strong> رقم الهوية <strong className="font-mono text-slate-800 font-black">({assistantToDelete.nationalId})</strong> وإلغاء صلاحية دخوله للنظام فوراً.
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 pt-3 border-t">
              <button
                type="button"
                onClick={() => setAssistantToDelete(null)}
                className="px-4 py-2 rounded-xl text-slate-600 font-bold text-xs hover:bg-slate-100 cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteAssistant}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-sm cursor-pointer"
              >
                تأكيد حذف المساعد
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: Student Transfer Modal (نقل طالب من صف إلى صف) */}
      {studentToTransfer && (
        <div className="fixed inset-0 z-60 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-indigo-50 text-indigo-700">
                  <ArrowLeftRight className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">نقل الطالب لصف أو شعبة أخرى</h3>
                  <p className="text-xs text-slate-500">{studentToTransfer.name}</p>
                </div>
              </div>
              <button onClick={() => setStudentToTransfer(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmTransferSubmit} className="space-y-4 text-xs">
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-1">
                <span className="text-[11px] text-slate-500 font-bold block">الصف والشعبة الحالية:</span>
                <div className="font-black text-slate-800 text-sm">
                  {studentToTransfer.className || 'الصف الأول'} - شعبة ({studentToTransfer.sectionName || '1'})
                </div>
                <span className="text-[10px] text-slate-400 font-mono">هوية: {studentToTransfer.nationalId}</span>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">اختر الصف الدراسي الجديد</label>
                <select
                  value={transferNewGrade}
                  onChange={(e) => setTransferNewGrade(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 font-bold text-slate-900"
                  required
                >
                  <optgroup label="المرحلة المتوسطة">
                    {ALL_GRADES_INTERMEDIATE.map((g) => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </optgroup>
                  <optgroup label="المرحلة الثانوية">
                    {ALL_GRADES_SECONDARY.map((g) => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </optgroup>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">اختر الفصل / الشعبة الجديدة</label>
                <input
                  type="text"
                  value={transferNewSection}
                  onChange={(e) => setTransferNewSection(e.target.value)}
                  placeholder="مثال: أ ، ب ، 1 ، 2..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 font-bold text-slate-900"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setStudentToTransfer(null)}
                  className="px-4 py-2 rounded-xl text-slate-600 font-bold hover:bg-slate-100"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-sm flex items-center gap-1.5"
                >
                  <ArrowLeftRight className="w-4 h-4" />
                  <span>تأكيد نقل الطالب</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Student Promotion to Next Academic Year (ترحيل الطلاب للسنة التي بعدها) */}
      {isPromoteModalOpen && (
        <div className="fixed inset-0 z-60 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 space-y-5 shadow-2xl my-8">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2.5 rounded-2xl bg-indigo-50 text-indigo-700">
                  <GraduationCap className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-slate-900">
                    ترحيل الطلاب للسنة الدراسية القادمة
                  </h3>
                  <p className="text-xs text-slate-500">
                    نقل طلاب كل مرحلة للصف الذي يليه تلقائياً مع الحفاظ على الشعبة ونقل سجلاتهم
                  </p>
                </div>
              </div>
              <button onClick={() => setIsPromoteModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">تحديد نطاق الترحيل</label>
                <select
                  value={promoteGradeFilter}
                  onChange={(e) => setPromoteGradeFilter(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 font-bold text-slate-900 text-sm"
                >
                  <option value="ALL">جميع صفوف وطلاب المدرسة ({schoolStudents.length} طالب)</option>
                  {Array.from(new Set(schoolStudents.map((s) => s.className).filter(Boolean))).map((cls) => (
                    <option key={cls} value={cls}>
                      ترحيل طلاب: {cls} ({schoolStudents.filter((s) => s.className === cls).length} طالب)
                    </option>
                  ))}
                </select>
              </div>

              {/* Progression Preview Matrix */}
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-2.5">
                <h4 className="font-bold text-slate-800 text-xs">خطة الترحيل المعتمدة تلقائياً:</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                  <div className="bg-white p-2.5 rounded-xl border border-slate-200 flex items-center justify-between">
                    <span className="font-bold text-slate-700">الأول المتوسط</span>
                    <span className="text-indigo-600 font-bold">← الثاني المتوسط</span>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-slate-200 flex items-center justify-between">
                    <span className="font-bold text-slate-700">الثاني المتوسط</span>
                    <span className="text-indigo-600 font-bold">← الثالث المتوسط</span>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-slate-200 flex items-center justify-between">
                    <span className="font-bold text-slate-700">الثالث المتوسط</span>
                    <span className="text-indigo-600 font-bold">← الأول الثانوي</span>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-slate-200 flex items-center justify-between">
                    <span className="font-bold text-slate-700">الأول الثانوي</span>
                    <span className="text-indigo-600 font-bold">← الثاني الثانوي</span>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-slate-200 flex items-center justify-between">
                    <span className="font-bold text-slate-700">الثاني الثانوي</span>
                    <span className="text-indigo-600 font-bold">← الثالث الثانوي</span>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-slate-200 flex items-center justify-between">
                    <span className="font-bold text-slate-700">الثالث الثانوي</span>
                    <span className="text-emerald-700 font-bold">← خريج مرحلة</span>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-[11px] text-amber-900 leading-relaxed">
                <strong>تنبيه إداري:</strong> عملية الترحيل تقوم بتحديث صفوف الطلاب وفق الخريطة الأكاديمية أعلاه مع الإبقاء على الشعب وتصفير درجات السلوك للفصل الجديد (بدءاً بـ 100 درجة).
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsPromoteModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-slate-600 font-bold hover:bg-slate-100"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={handleConfirmPromoteSubmit}
                  className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-2 shadow-lg cursor-pointer"
                >
                  <GraduationCap className="w-4 h-4" />
                  <span>تأكيد ترحيل الطلاب للعام القادم</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Student Deletion Confirmation Modal (حذف طالب عند النقل) */}
      {studentToDelete && (
        <div className="fixed inset-0 z-60 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-2">
              <h3 className="text-base font-black text-slate-900">
                تأكيد حذف سجل الطالب نهائياً
              </h3>
              <p className="text-xs text-slate-500">
                سيتم حذف سجلات الطالب <strong className="text-slate-900 font-black">({studentToDelete.name})</strong>، رقم الهوية <strong className="font-mono text-slate-800 font-black">({studentToDelete.nationalId})</strong> نظراً لانتقاله من المدرسة أو طي قيده.
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 pt-3 border-t">
              <button
                type="button"
                onClick={() => setStudentToDelete(null)}
                className="px-4 py-2 rounded-xl text-slate-600 font-bold text-xs hover:bg-slate-100 cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteStudentSubmit}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-sm cursor-pointer"
              >
                تأكيد حذف الطالب
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3.5: Delete All Students Confirmation Modal (حذف جميع الطلاب دفعة واحدة) */}
      {isDeleteAllStudentsModalOpen && (
        <div className="fixed inset-0 z-[100] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl text-right animate-fadeIn">
            <div className="w-14 h-14 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-7 h-7" />
            </div>

            <div className="text-center space-y-2">
              <h3 className="text-lg font-black text-rose-700">
                حذف جميع طلاب المدرسة دفعة واحدة
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                هل أنت متأكد من رغبتك في حذف جميع سجلات الطلاب الحالية في مدرسة <strong className="text-slate-900">({currentSchool.name})</strong> البالغ عددهم <strong className="text-rose-600 font-black">({schoolStudents.length}) طالب</strong>؟
              </p>
              <p className="text-[11px] bg-rose-50 border border-rose-200 text-rose-800 p-2.5 rounded-xl text-right leading-relaxed">
                ⚠️ سيتم مسح سجلات الطلاب وحضورهم وسلوكهم في هذه المدرسة، مما يتيح لك إعادة ضبط وتسكين الفصول واستيراد كشوفات الطلاب الجديدة بصيغة نظيفة ومطابقة 100%.
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 pt-3 border-t">
              <button
                type="button"
                onClick={() => setIsDeleteAllStudentsModalOpen(false)}
                className="px-4 py-2.5 rounded-xl text-slate-600 font-bold text-xs hover:bg-slate-100 cursor-pointer"
              >
                إلغاء التراجع
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteAllStudents}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-lg cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>تأكيد حذف جميع الطلاب ({schoolStudents.length})</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3.6: Wipe Single School Records Confirmation Modal */}
      {schoolToWipe && (
        <div className="fixed inset-0 z-[100] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl text-right animate-fadeIn">
            <div className="w-14 h-14 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
              <RefreshCw className="w-7 h-7" />
            </div>

            <div className="text-center space-y-2">
              <h3 className="text-lg font-black text-amber-900">
                تصفير وتنظيف سجلات المدرسة للبدء النظيف
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                هل ترغب في مسح سجلات الحضور وسلوك الطلاب في مدرسة <strong className="text-slate-900">({schoolToWipe.name})</strong> لبدء العام الدراسي بسجلات نظيفة؟
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 pt-3 border-t">
              <button
                type="button"
                onClick={() => setSchoolToWipe(null)}
                className="px-4 py-2 rounded-xl text-slate-600 font-bold text-xs hover:bg-slate-100 cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={() => {
                  wipeSchoolStudentData(schoolToWipe.code);
                  setSchoolToWipe(null);
                  if (onRefreshData) onRefreshData();
                  setBehaviorToast(`✓ تم تصفير سجلات مدرسة (${schoolToWipe.name}) بنجاح.`);
                  setTimeout(() => setBehaviorToast(''), 4000);
                }}
                className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>تأكيد تنظيف السجلات</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3.7: Pristine Production Clean Reset Modal (Dell Server Ready) */}
      {isWipeProductionModalOpen && (
        <div className="fixed inset-0 z-[100] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 space-y-4 shadow-2xl text-right animate-fadeIn">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-2xl bg-emerald-50 text-emerald-700">
                  <Sparkles className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">بدء التشغيل النظيف للإنتاج الفعلي</h3>
                  <p className="text-xs text-slate-500">تصفير كافة البيانات التجريبية واعتماد مدرستك الحقيقية</p>
                </div>
              </div>
              <button onClick={() => setIsWipeProductionModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-amber-900 leading-relaxed">
                ⚠️ <strong>تنبيه:</strong> سيتم مسح كافة المدارس والطلاب والبيانات التجريبية نهائياً، وإنشاء مدرستك الرسمية بحساب مدير النظام الرئيسي [رقم الهوية: <strong>1000000000</strong> | كلمة المرور: <strong>admin</strong>].
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">اسم مدرستك الرسمية</label>
                <input
                  type="text"
                  value={cleanSchoolName}
                  onChange={(e) => setCleanSchoolName(e.target.value)}
                  placeholder="مثال: ثانوية الراية للبنين"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-slate-900 font-bold"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">اسم مدير المدرسة / المسؤول</label>
                <input
                  type="text"
                  value={cleanAdminName}
                  onChange={(e) => setCleanAdminName(e.target.value)}
                  placeholder="مثال: أ. أنور الشمري"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-slate-900 font-bold"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsWipeProductionModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-slate-600 font-bold hover:bg-slate-100 cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={() => {
                    wipeAllToPristineProduction(cleanAdminName.trim() || 'مدير المدرسة', cleanSchoolName.trim() || 'المدرسة الرئيسية');
                    setIsWipeProductionModalOpen(false);
                    if (onRefreshData) onRefreshData();
                    window.location.reload();
                  }}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md cursor-pointer flex items-center gap-1.5"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>تأكيد والبدء النظيف فوراً ↵</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: Teacher Behavior Note Action Resolution Modal */}
      {selectedNoteForAction && (
        <div className="fixed inset-0 z-60 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-amber-50 text-amber-700">
                  <Scale className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">اتخاذ قرار إداري بشأن الملاحظة السلوكية</h3>
                  <p className="text-xs text-slate-500">الطالب: {selectedNoteForAction.studentName}</p>
                </div>
              </div>
              <button onClick={() => setSelectedNoteForAction(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-indigo-700">المعلم: {selectedNoteForAction.teacherName}</span>
                <span className="text-[10px] text-slate-400 font-mono">{selectedNoteForAction.date}</span>
              </div>
              <div className="text-slate-800">
                <strong className="text-slate-600 font-bold">المخالفة: </strong>
                {selectedNoteForAction.categoryLabel}
              </div>
              <p className="text-slate-700 leading-relaxed bg-white p-2.5 rounded-xl border border-slate-200">
                {selectedNoteForAction.description}
              </p>
            </div>

            <div className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">اختر نوع الإجراء الإداري</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setNoteResolutionType('approved_deduction')}
                    className={`p-2.5 rounded-xl font-bold text-xs border text-center transition-all ${
                      noteResolutionType === 'approved_deduction'
                        ? 'bg-rose-50 border-rose-500 text-rose-700 ring-2 ring-rose-300'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    اعتماد حسم درجات
                  </button>

                  <button
                    type="button"
                    onClick={() => setNoteResolutionType('warned_only')}
                    className={`p-2.5 rounded-xl font-bold text-xs border text-center transition-all ${
                      noteResolutionType === 'warned_only'
                        ? 'bg-amber-50 border-amber-500 text-amber-700 ring-2 ring-amber-300'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    إنذار وتوجيه فقط
                  </button>

                  <button
                    type="button"
                    onClick={() => setNoteResolutionType('dismissed')}
                    className={`p-2.5 rounded-xl font-bold text-xs border text-center transition-all ${
                      noteResolutionType === 'dismissed'
                        ? 'bg-slate-100 border-slate-500 text-slate-800 ring-2 ring-slate-300'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    حفظ دون إجراء
                  </button>
                </div>
              </div>

              {noteResolutionType === 'approved_deduction' && (
                <div>
                  <label className="block font-bold text-slate-700 mb-1">الدرجات المحسومة من رصيد السلوك (100)</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={1}
                      max={15}
                      value={noteDeductionPoints}
                      onChange={(e) => setNoteDeductionPoints(Number(e.target.value) || 1)}
                      className="w-24 bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-rose-600 font-mono font-black text-center text-sm"
                    />
                    <span className="text-slate-500 text-xs font-bold">درجات تحسم فوراً</span>
                  </div>
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-700 mb-1">قرار الإدارة / توجيهات المرشد الطلابي</label>
                <textarea
                  rows={2}
                  value={noteAdminComment}
                  onChange={(e) => setNoteAdminComment(e.target.value)}
                  placeholder="اكتب التوجيه أو نص القرار..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-800"
                />
              </div>

              {noteResolutionType === 'approved_deduction' && (
                <label className="flex items-center gap-2 font-bold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notifyParentOnNote}
                    onChange={(e) => setNotifyParentOnNote(e.target.checked)}
                    className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500"
                  />
                  <span>إرسال إشعار فوري لولي الأمر والطالب بنتيجة الحسم</span>
                </label>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setSelectedNoteForAction(null)}
                  className="px-4 py-2 rounded-xl text-slate-600 font-bold hover:bg-slate-100"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={handleResolveBehaviorNote}
                  className="px-6 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold shadow-sm"
                >
                  اعتماد القرار وحفظ
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: Add Teacher Modal (إضافة معلم جديد) */}
      {isAddTeacherModalOpen && (
        <div 
          onClick={(e) => { if (e.target === e.currentTarget) setIsAddTeacherModalOpen(false); }}
          className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto"
        >
          <div className="relative bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 space-y-4 shadow-2xl border border-slate-200 my-auto text-right">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-teal-50 text-teal-700 border border-teal-200">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">إضافة معلم جديد للمدرسة</h3>
                  <p className="text-xs text-slate-500">مدرسة: {currentSchool.name}</p>
                </div>
              </div>
              <button 
                onClick={() => setIsAddTeacherModalOpen(false)} 
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTeacherSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">اسم المعلم الرباعي *</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: أ. محمد أحمد الشهري"
                  value={newTeacherName}
                  onChange={(e) => setNewTeacherName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 font-bold text-slate-900 focus:bg-white focus:outline-none focus:border-teal-600"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">رقم الهوية الوطنية / الإقامة (اسم المستخدم للدخول) *</label>
                <input
                  type="text"
                  required
                  maxLength={10}
                  placeholder="10 أرقام"
                  value={newTeacherNid}
                  onChange={(e) => setNewTeacherNid(e.target.value.replace(/\D/g, ''))}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 font-mono font-bold text-slate-900 focus:bg-white focus:outline-none focus:border-teal-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">رقم جوال المعلم</label>
                  <input
                    type="tel"
                    placeholder="05xxxxxxxx"
                    value={newTeacherMobile}
                    onChange={(e) => setNewTeacherMobile(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 font-mono text-slate-900 focus:bg-white focus:outline-none focus:border-teal-600"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">كلمة المرور الافتراضية</label>
                  <input
                    type="text"
                    value={newTeacherPassword}
                    onChange={(e) => setNewTeacherPassword(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 font-mono font-bold text-slate-900 focus:bg-white focus:outline-none focus:border-teal-600"
                  />
                </div>
              </div>

              <div className="p-3 bg-teal-50/90 rounded-2xl border border-teal-200 text-teal-900 text-[11px] leading-relaxed">
                💡 <strong>ملاحظة:</strong> سيتمكن المعلم فور حفظه من الدخول للبوابة برقم هويته وكلمة المرور هذه، ورصد الحصص والغياب والملاحظات السلوكية مباشرة من جواله.
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddTeacherModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-slate-600 font-bold hover:bg-slate-100 transition-colors"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold shadow-md transition-colors"
                >
                  حفظ وتفعيل حساب المعلم
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 6: Invite Teachers via WhatsApp (رسالة دعوة ورابط المعلمين) */}
      {isInviteTeacherModalOpen && (
        <div 
          onClick={(e) => { if (e.target === e.currentTarget) setIsInviteTeacherModalOpen(false); }}
          className="fixed inset-0 z-[100] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto"
        >
          <div className="relative bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 space-y-4 shadow-2xl border border-slate-200 text-right animate-fadeIn">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <Share2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">رسالة دعوة ورابط دخول المعلمين</h3>
                  <p className="text-xs text-slate-500">جاهزة للإرسال في جروب واتساب المعلمين</p>
                </div>
              </div>
              <button 
                onClick={() => setIsInviteTeacherModalOpen(false)} 
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div className="text-slate-600">
                يمكنك نسخ هذه الرسالة وإرسالها فوراً لجميع المعلمين في المدرسة للبدء في استخدام المنظومة ورصد الحصص:
              </div>

              {/* Message Box */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs font-mono leading-relaxed text-slate-800 whitespace-pre-wrap select-all">
{`السلام عليكم ورحمة الله وبركاته،
الزملاء المعلمون الأفاضل في (${currentSchool.name}) 🌹

تم تفعيل منظومة "حضورك" الذكية لرصد حضور وغياب الطلاب بالحصة والملاحظات السلوكية.

🔗 رابط الدخول للنظام:
${window.location.origin.includes('localhost') ? 'https://novo-school.duckdns.org:444' : window.location.origin}

📌 طريقة الدخول:
1. افتح الرابط واضغط على "تسجيل الدخول".
2. اسم المستخدم: رقم هويتك الوطنية.
3. كلمة المرور الافتراضية: 123456 (أو آخر 4 أرقام من هويتك).

نتمنى لكم يوماً دراسياً موفقاً ومثمراً ✨`}
              </div>

              {inviteCopiedToast && (
                <div className="bg-emerald-600 text-white p-2.5 rounded-xl text-center text-xs font-bold shadow-sm">
                  ✓ تم نسخ رسالة الدعوة والرابط إلى الحافظة بنجاح!
                </div>
              )}

              <div className="grid grid-cols-2 gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    const text = `السلام عليكم ورحمة الله وبركاته،\nالزملاء المعلمون الأفاضل في (${currentSchool.name}) 🌹\n\nتم تفعيل منظومة "حضورك" الذكية لرصد حضور وغياب الطلاب بالحصة والملاحظات السلوكية.\n\n🔗 رابط الدخول للنظام:\n${window.location.origin.includes('localhost') ? 'https://novo-school.duckdns.org:444' : window.location.origin}\n\n📌 طريقة الدخول:\n1. افتح الرابط واضغط على "تسجيل الدخول".\n2. اسم المستخدم: رقم هويتك الوطنية.\n3. كلمة المرور الافتراضية: 123456 (أو آخر 4 أرقام من هويتك).\n\nنتمنى لكم يوماً دراسياً موفقاً ومثمراً ✨`;
                    navigator.clipboard.writeText(text);
                    setInviteCopiedToast(true);
                    setTimeout(() => setInviteCopiedToast(false), 2500);
                  }}
                  className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <FileText className="w-4 h-4" />
                  <span>نسخ نص الرسالة</span>
                </button>

                <a
                  href={`https://api.whatsapp.com/send?text=${encodeURIComponent(`السلام عليكم ورحمة الله وبركاته،\nالزملاء المعلمون الأفاضل في (${currentSchool.name}) 🌹\n\nتم تفعيل منظومة "حضورك" الذكية لرصد حضور وغياب الطلاب بالحصة والملاحظات السلوكية.\n\n🔗 رابط الدخول للنظام:\n${window.location.origin.includes('localhost') ? 'https://novo-school.duckdns.org:444' : window.location.origin}\n\n📌 طريقة الدخول:\n1. افتح الرابط واضغط على "تسجيل الدخول".\n2. اسم المستخدم: رقم هويتك الوطنية.\n3. كلمة المرور الافتراضية: 123456 (أو آخر 4 أرقام من هويتك).\n\nنتمنى لكم يوماً دراسياً موفقاً ومثمراً ✨`)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors text-center"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>إرسال عبر واتساب</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Teacher Modal Confirmation */}
      {teacherToDelete && (
        <div 
          onClick={(e) => { if (e.target === e.currentTarget) setTeacherToDelete(null); }}
          className="fixed inset-0 z-[100] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto"
        >
          <div className="relative bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200 text-right animate-fadeIn">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-3 bg-rose-50 rounded-2xl border border-rose-200">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">تأكيد حذف المعلم</h3>
                <p className="text-xs text-slate-500">حذف الحساب نهائياً من المدرسة</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-4 rounded-2xl border border-slate-200">
              هل أنت متأكد من رغبتك في حذف المعلم <strong className="text-slate-900 font-bold">({teacherToDelete.name})</strong> رقم الهوية (<span className="font-mono">{teacherToDelete.nationalId}</span>)؟
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setTeacherToDelete(null)}
                className="px-4 py-2.5 rounded-xl text-slate-600 font-bold hover:bg-slate-100 transition-colors text-xs"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteTeacher}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md transition-colors"
              >
                تأكيد الحذف
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
