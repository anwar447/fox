import React, { useState } from 'react';
import { User, Attendance, School, StudentPermission } from '../types';
import { 
  getAttendancesForStudent, getPermissionsForStudent, getCurrentUser, 
  deleteAttendance, deleteStudentAllAbsences, convertStudentAllAbsencesToPresent,
  addSystemNotification, getStudentExcuseStats, deleteStudentPermanently
} from '../utils/storage';
import { calculateStudentBehaviorScore } from '../utils/behavior';
import { soundManager } from '../utils/audio';
import { CompensatoryPointsModal } from './CompensatoryPointsModal';
import { BehaviorRecordModal } from './BehaviorRecordModal';
import { AbsenceActionModal } from './AbsenceActionModal';
import { AttendanceEditModal } from './AttendanceEditModal';
import { ParentSummonModal } from './ParentSummonModal';
import { 
  GraduationCap, Calendar, CheckCircle, XCircle, 
  AlertTriangle, Phone, X, QrCode, FileText, Activity, 
  LogOut, ShieldAlert, Clock, Star, Sparkles, Award, 
  ThumbsUp, ThumbsDown, HeartHandshake, Plus, User as UserIcon, RefreshCw,
  Edit3, Trash2, Zap, Wrench, ShieldCheck, Mail
} from 'lucide-react';

interface StudentDossierModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: User;
  school: School;
  onOpenQrCard: () => void;
  onAttendanceUpdated?: () => void;
}

export const StudentDossierModal: React.FC<StudentDossierModalProps> = ({
  isOpen,
  onClose,
  student,
  school,
  onOpenQrCard,
  onAttendanceUpdated,
}) => {
  if (!isOpen) return null;

  const currentUser = getCurrentUser() || student;
  const [dataVersion, setDataVersion] = useState(0);

  // Administrative check
  const isAdministrativeStaff = 
    currentUser?.role === 'superadmin' || 
    currentUser?.role === 'employee' ||
    currentUser?.staffTitle === 'principal' ||
    currentUser?.staffTitle === 'vice_principal' ||
    currentUser?.staffTitle === 'admin_assistant' ||
    currentUser?.staffTitle === 'student_advisor';

  // Modals for admin & counselor actions
  const [isCompensatoryModalOpen, setIsCompensatoryModalOpen] = useState(false);
  const [isBehaviorModalOpen, setIsBehaviorModalOpen] = useState(false);
  const [isAbsenceActionModalOpen, setIsAbsenceActionModalOpen] = useState(false);
  const [isParentSummonModalOpen, setIsParentSummonModalOpen] = useState(false);

  // Modals & confirmation for attendance editing & deletion
  const [selectedAttendanceForEdit, setSelectedAttendanceForEdit] = useState<Attendance | null>(null);
  const [attendanceToDelete, setAttendanceToDelete] = useState<Attendance | null>(null);
  const [confirmingBulkAction, setConfirmingBulkAction] = useState<'convert_all' | 'delete_all' | null>(null);

  const history = getAttendancesForStudent(student.id);
  const permissions = getPermissionsForStudent(student.id);
  const behaviorSummary = calculateStudentBehaviorScore(student.id);

  const presentCount = history.filter((a) => a.finalStatus === 'present').length;
  const absentCount = history.filter((a) => a.finalStatus === 'absent').length;
  const lateCount = history.filter((a) => a.finalStatus === 'late').length;
  const truantCount = history.filter((a) => a.isTruant).length;
  const totalPermissionsCount = permissions.length;

  const totalDays = history.length || 1;
  const commitmentRate = Math.round((presentCount / totalDays) * 100);

  // Diagnostic rating for permissions
  const isHighPermissionFrequency = totalPermissionsCount >= 3;

  const handleExecuteBulkAction = () => {
    if (!confirmingBulkAction) return;

    if (confirmingBulkAction === 'convert_all') {
      convertStudentAllAbsencesToPresent(
        student.id,
        'تصحيح إداري بسبب عطل تقني في النظام',
        currentUser.name
      );

      addSystemNotification({
        id: `notif-dossier-bulk-${Date.now()}`,
        schoolCode: school.code,
        title: '✅ تصحيح سجل الغياب بسبب عطل تقني',
        message: `تم تحويل جميع غيابات الطالب (${student.name}) إلى حاضر وإلغاء الحسم من السلوك بواسطة الإدارة المدرسية.`,
        type: 'info',
        createdAt: new Date().toISOString(),
      });
    } else if (confirmingBulkAction === 'delete_all') {
      deleteStudentAllAbsences(student.id);

      addSystemNotification({
        id: `notif-dossier-del-${Date.now()}`,
        schoolCode: school.code,
        title: '🗑️ حذف سجلات الغياب غير الصحيحة للطالب',
        message: `تم حذف جميع سجلات الغياب للطالب (${student.name}) نهائياً من النظام لتدارك عطل في المنظومة.`,
        type: 'info',
        createdAt: new Date().toISOString(),
      });
    }

    soundManager.playSuccess();
    setConfirmingBulkAction(null);
    setDataVersion((v) => v + 1);
    onAttendanceUpdated?.();
  };

  const handleConfirmSingleDelete = () => {
    if (!attendanceToDelete) return;
    deleteAttendance(attendanceToDelete.id);

    addSystemNotification({
      id: `notif-del-single-${Date.now()}`,
      schoolCode: school.code,
      title: '🗑️ حذف سجل غياب للطالب',
      message: `تم حذف غياب يوم (${attendanceToDelete.date}) للطالب (${student.name}) نهائياً بواسطة الإدارة.`,
      type: 'info',
      createdAt: new Date().toISOString(),
    });

    soundManager.playSuccess();
    setAttendanceToDelete(null);
    setDataVersion((v) => v + 1);
    onAttendanceUpdated?.();
  };

  const [isConfirmingDeleteStudent, setIsConfirmingDeleteStudent] = useState(false);
  const [isDeletingStudentInProgress, setIsDeletingStudentInProgress] = useState(false);

  const handlePermanentDeleteStudent = () => {
    setIsDeletingStudentInProgress(true);
    try {
      deleteStudentPermanently(student.id, student.nationalId, school.code);

      addSystemNotification({
        id: `notif-del-std-${Date.now()}`,
        schoolCode: school.code,
        title: '🗑️ حذف طالب نهائياً من المدرسة',
        message: `تم حذف الطالب (${student.name}) نهائياً من المدرسة وإلغاء ارتباطه لتسهيل إعادة تسجيله بالشكل الصحيح.`,
        type: 'info',
        createdAt: new Date().toISOString(),
      });

      soundManager.playSuccess();
      setIsConfirmingDeleteStudent(false);
      onAttendanceUpdated?.();
      onClose();
    } catch {
      setIsDeletingStudentInProgress(false);
    }
  };

  return (
    <div 
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fadeIn" 
      dir="rtl"
    >
      <div className="bg-white border border-slate-200 rounded-3xl max-w-2xl w-full p-6 text-right space-y-4 shadow-2xl text-slate-800 my-auto">
        
        {/* Header with Photo Avatar */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-3.5">
          <div className="flex items-center gap-3.5">
            <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-700 border border-indigo-200 overflow-hidden flex items-center justify-center shadow-xs shrink-0">
              {student.avatar ? (
                <img src={student.avatar} alt={student.name} className="w-full h-full object-cover" />
              ) : (
                <GraduationCap className="w-7 h-7" />
              )}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base font-black text-slate-900">{student.name}</h3>
                <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-mono text-[10px] font-bold">
                  هوية: {student.nationalId}
                </span>

                {/* Excuses count badges */}
                {(() => {
                  const stats = getStudentExcuseStats(student.id, student.nationalId);
                  return (
                    <div className="flex items-center gap-1.5">
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
                            ? 'bg-amber-100 text-amber-900 border-amber-300 font-black ring-1 ring-amber-200'
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
              </div>
              <p className="text-xs text-slate-500 font-medium">
                {student.className} - فصل {student.sectionName} | {school.name}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 5-Day Absence Alert Banner if triggered */}
        {behaviorSummary.hasFiveDaysAbsenceAlert && (
          <div className="bg-rose-50 border border-rose-300 rounded-2xl p-3.5 flex flex-wrap items-center justify-between gap-2.5 text-xs text-rose-950">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0" />
              <div>
                <strong className="font-black text-rose-950 block">
                  تنبيه تكرار الغياب: بلغ الطالب {behaviorSummary.unexcusedInCurrentCycleCount} أيام غياب بدون عذر
                </strong>
                <span className="text-[11px] text-rose-800">
                  يتطلب اتخاذ إجراء إداري وتوثيق التعهد وإعادة ضبط الدورة.
                </span>
              </div>
            </div>
            <button
              onClick={() => setIsAbsenceActionModalOpen(true)}
              className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs shadow-xs cursor-pointer"
            >
              اتخاذ إجراء إداري 📝
            </button>
          </div>
        )}

        {/* 1. Behavior Score & Compensatory Card (100 Base Score) */}
        <div className="bg-gradient-to-l from-slate-900 to-slate-850 text-white rounded-2xl p-4 space-y-3 shadow-md">
          <div className="flex items-center justify-between border-b border-slate-700/60 pb-2.5">
            <div className="flex items-center gap-2">
              <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
              <strong className="text-xs font-black text-slate-100">درجة السلوك والمواظبة الرسمية:</strong>
            </div>
            <div className="flex items-center gap-2">
              <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-black ${behaviorSummary.rating.badgeColor}`}>
                {behaviorSummary.rating.label}
              </span>
              <span className="text-xl font-black text-emerald-400 font-mono">
                {behaviorSummary.currentScore} <span className="text-xs text-slate-400">/ 100</span>
              </span>
            </div>
          </div>

          {/* Breakdown Grid */}
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 text-center text-[10px]">
            <div className="bg-slate-800/80 p-2 rounded-xl border border-slate-700/50">
              <span className="text-slate-400 block font-bold">الأساسية</span>
              <span className="text-xs font-black text-slate-200">100</span>
            </div>
            <div className="bg-slate-800/80 p-2 rounded-xl border border-slate-700/50">
              <span className="text-rose-350 block font-bold">غياب بدون عذر</span>
              <span className="text-xs font-black text-rose-400">
                {behaviorSummary.unexcusedAbsenceCount > 0 ? `-${behaviorSummary.unexcusedAbsenceCount}` : '0'}
              </span>
            </div>
            <div className="bg-slate-800/80 p-2 rounded-xl border border-slate-700/50">
              <span className="text-amber-300 block font-bold">تأخر صباحي</span>
              <span className="text-xs font-black text-amber-400">
                {behaviorSummary.tardinessCount > 0 ? `-${behaviorSummary.tardinessCount}` : '0'}
              </span>
            </div>
            <div className="bg-slate-800/80 p-2 rounded-xl border border-slate-700/50">
              <span className="text-rose-350 block font-bold">ملاحظات سلبية</span>
              <span className="text-xs font-black text-rose-400">
                {behaviorSummary.negativePoints > 0 ? `-${behaviorSummary.negativePoints}` : '0'}
              </span>
            </div>
            <div className="bg-slate-800/80 p-2 rounded-xl border border-slate-700/50">
              <span className="text-emerald-300 block font-bold">تعزيز إيجابي</span>
              <span className="text-xs font-black text-emerald-400">
                {behaviorSummary.positivePoints > 0 ? `+${behaviorSummary.positivePoints}` : '0'}
              </span>
            </div>
            <div className="bg-slate-800/80 p-2 rounded-xl border border-slate-700/50">
              <span className="text-indigo-300 block font-bold">فرص تعويضية</span>
              <span className="text-xs font-black text-indigo-400">
                {behaviorSummary.compensatoryPoints > 0 ? `+${behaviorSummary.compensatoryPoints}` : '0'}
              </span>
            </div>
          </div>

          {/* Action buttons inside score card */}
          <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-700/50">
            <button
              onClick={() => setIsCompensatoryModalOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-black flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>منح فرصة تعويضية وتعديل الدرجات 🌟</span>
            </button>

            <button
              onClick={() => setIsBehaviorModalOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-[11px] font-black flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors"
            >
              <Star className="w-3.5 h-3.5 fill-slate-950" />
              <span>رصد سلوك جديد (إيجابي / سلبي) ⭐</span>
            </button>

            <button
              onClick={() => setIsAbsenceActionModalOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-rose-600/90 hover:bg-rose-600 text-white text-[11px] font-black flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors"
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>إجراء إداري / إنذار غياب 📋</span>
            </button>

            <button
              onClick={() => setIsParentSummonModalOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-rose-700 to-red-600 hover:from-rose-600 hover:to-red-500 text-white text-[11px] font-black flex items-center gap-1.5 shadow-xs cursor-pointer transition-all"
            >
              <Mail className="w-3.5 h-3.5" />
              <span>استدعاء ولي الأمر رسمي ✉️</span>
            </button>
          </div>
        </div>

        {/* 2. Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center">
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-2.5">
            <span className="text-[10px] text-slate-500 font-bold block mb-1">نسبة الحضور</span>
            <span className="text-base font-black text-emerald-700">{commitmentRate}%</span>
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-2.5">
            <span className="text-[10px] text-slate-500 font-bold block mb-1">أيام الحضور</span>
            <span className="text-base font-black text-emerald-700">{presentCount}</span>
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-2.5">
            <span className="text-[10px] text-slate-500 font-bold block mb-1">أيام الغياب</span>
            <span className="text-base font-black text-rose-600">{absentCount}</span>
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-2.5">
            <span className="text-[10px] text-slate-500 font-bold block mb-1">حالات الهروب</span>
            <span className="text-base font-black text-amber-600">{truantCount}</span>
          </div>
          <div className={`border rounded-2xl p-2.5 ${isHighPermissionFrequency ? 'bg-rose-50 border-rose-200 text-rose-900' : 'bg-indigo-50/50 border-indigo-200 text-indigo-900'}`}>
            <span className="text-[10px] font-bold block mb-1">استئذانات الحصة</span>
            <span className="text-base font-black">{totalPermissionsCount}</span>
          </div>
        </div>

        {/* ADHD / Hyperactivity Diagnostic Banner if frequent */}
        {isHighPermissionFrequency && (
          <div className="bg-rose-50 border border-rose-200 rounded-2xl p-3 text-xs text-rose-900 space-y-1">
            <div className="flex items-center gap-1.5 font-black">
              <ShieldAlert className="w-4 h-4 text-rose-600" />
              <span>مؤشر تشخيصي: تكرار ملحوظ للاستئذان من الحصص ({totalPermissionsCount} مرات)</span>
            </div>
            <p className="text-[11px] text-rose-800 leading-relaxed">
              يوصى بمتابعة حالة الطالب من قِبل المرشد الطلابي والموجه الأكاديمي لتقييم صعوبات التركيز أو فرط الحركة.
            </p>
          </div>
        )}

        {/* Quick Contacts & Actions */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 text-slate-700">
            <Phone className="w-3.5 h-3.5 text-slate-500" />
            <span>جوال ولي الأمر: <strong className="font-mono text-emerald-700 font-bold">{student.parentMobile || '--'}</strong></span>
          </div>
          <button
            onClick={() => {
              onClose();
              onOpenQrCard();
            }}
            className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-800 font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <QrCode className="w-3.5 h-3.5 text-emerald-600" />
            <span>عرض بطاقة الباركود</span>
          </button>
        </div>

        {/* Administrative Absence Actions History */}
        {behaviorSummary.absenceActions.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-rose-600" />
              <span>سجل الإجراءات الإدارية وتعهدات الغياب ({behaviorSummary.absenceActions.length}):</span>
            </h4>
            <div className="space-y-1.5 max-h-28 overflow-y-auto pr-1">
              {behaviorSummary.absenceActions.map((act) => (
                <div key={act.id} className="bg-rose-50/50 border border-rose-200 rounded-xl p-2.5 text-xs space-y-1">
                  <div className="flex items-center justify-between font-bold">
                    <span className="text-rose-950 font-black">{act.actionTitle}</span>
                    <span className="text-[10px] text-slate-500 font-mono">{act.date}</span>
                  </div>
                  <p className="text-[11px] text-slate-700">{act.notes}</p>
                  <span className="text-[10px] text-slate-500 block">بواسطة: {act.recordedByName} ({act.recordedByRole})</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Classroom Permissions History */}
        <div className="space-y-2">
          <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
            <Activity className="w-4 h-4 text-indigo-600" />
            <span>سجل استئذانات الحصص الصفية ({permissions.length}):</span>
          </h4>

          <div className="space-y-1.5 max-h-24 overflow-y-auto pr-1">
            {permissions.length === 0 ? (
              <p className="text-[11px] text-slate-400 text-center py-2 bg-slate-50 rounded-xl">لا توجد استئذانات مسجلة</p>
            ) : (
              permissions.map((p) => (
                <div key={p.id} className="bg-slate-50 border border-slate-200 rounded-xl p-2 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-slate-800 ml-1">
                      {p.reason === 'restroom' ? '🚻 دورة مياه' :
                       p.reason === 'water' ? '💧 شرب ماء' :
                       p.reason === 'nurse' ? '🩺 عيادة صحية' :
                       p.reason === 'administration' ? '🏢 إدارة' : '📝 استئذان'}
                    </span>
                    <span className="text-slate-400 text-[10px] font-mono">({p.date} - خرج: {p.timeOut})</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-slate-500 font-medium">المعلم: {p.teacherName}</span>
                    {p.timeIn ? (
                      <span className="text-emerald-800 bg-emerald-100 font-bold text-[10px] px-2 py-0.5 rounded-md">
                        عـاد ({p.durationMinutes || 0} د)
                      </span>
                    ) : (
                      <span className="text-amber-800 bg-amber-100 font-bold text-[10px] px-2 py-0.5 rounded-md">
                        لم يكتمل
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Attendance & Exit Timeline with Administrative Controls */}
        <div className="space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-emerald-600" />
              <span>سجل الأيام والغياب والأعذار ({history.length}):</span>
            </h4>

            {isAdministrativeStaff && absentCount > 0 && (
              <span className="text-[10px] text-amber-800 bg-amber-100 font-bold px-2 py-0.5 rounded-full border border-amber-200">
                لدى الطالب {absentCount} أيام غياب
              </span>
            )}
          </div>

          {/* Administrative Glitch Quick-Action Panel */}
          {isAdministrativeStaff && absentCount > 0 && (
            <div className="bg-gradient-to-l from-amber-50 to-orange-50/50 border border-amber-200 rounded-2xl p-3 text-xs space-y-2 text-amber-950 shadow-xs">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 font-black text-amber-900">
                  <Wrench className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>معالجة غيابات الأعطال التقنية (صلاحية الإدارة):</span>
                </div>
                <span className="text-[10px] font-bold text-slate-500">
                  تصحيح فوري لرفع القلق عن ولي الأمر
                </span>
              </div>
              <p className="text-[11px] text-amber-900/80 leading-relaxed">
                في حال تسجيل الغياب بسبب عطل في قارئ الباركود أو انقطاع الشبكة أو خلل في النظام، يمكنك تصحيح جميع الغيابات أو حذفها نهائياً بضغطة زر واحدة:
              </p>
              
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setConfirmingBulkAction('convert_all')}
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-[11px] flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                  title="تحويل جميع غيابات الطالب إلى حاضر وتصفير الحسم"
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>تحويل جميع الغيابات إلى حاضر (عطل تقني) ⚡</span>
                </button>

                <button
                  type="button"
                  onClick={() => setConfirmingBulkAction('delete_all')}
                  className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black text-[11px] flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                  title="حذف جميع سجلات الغياب نهائياً من قاعدة البيانات"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>حذف جميع الغيابات نهائياً 🗑️</span>
                </button>
              </div>
            </div>
          )}

          {/* Bulk Action Confirmation Box */}
          {confirmingBulkAction && (
            <div className="bg-amber-50 border-2 border-amber-400 rounded-2xl p-3.5 space-y-2 text-xs shadow-md animate-fadeIn">
              <div className="flex items-center gap-2 font-black text-amber-950">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                <span>
                  {confirmingBulkAction === 'convert_all'
                    ? `تأكيد تحويل جميع غيابات الطالب (${student.name}) إلى حاضر؟`
                    : `تأكيد حذف جميع سجلات غياب الطالب (${student.name}) نهائياً؟`}
                </span>
              </div>
              <p className="text-slate-700 text-[11px]">
                {confirmingBulkAction === 'convert_all'
                  ? `سيتم تحويل عدد (${absentCount}) غياب إلى حاضر مسجل، وإلغاء أي حسم من درجات السلوك لتعود إلى 100/100، وإشعار ولي الأمر بأن الرصد كان بسبب عطل وتم تصحيحه.`
                  : `سيتم مسح جميع سجلات الغياب (${absentCount} أيام) تماماً من السيرفر وقاعدة البيانات ولن تظهر لولي الأمر إطلاقاً.`}
              </p>
              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setConfirmingBulkAction(null)}
                  className="px-3 py-1 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs cursor-pointer"
                >
                  تراجع
                </button>
                <button
                  type="button"
                  onClick={handleExecuteBulkAction}
                  className={`px-4 py-1 rounded-xl text-white font-black text-xs cursor-pointer shadow-xs ${
                    confirmingBulkAction === 'convert_all'
                      ? 'bg-emerald-600 hover:bg-emerald-500'
                      : 'bg-rose-600 hover:bg-rose-500'
                  }`}
                >
                  {confirmingBulkAction === 'convert_all' ? 'نعم، تحويل الكل إلى حاضر ⚡' : 'نعم، حذف الكل نهائياً 🗑️'}
                </button>
              </div>
            </div>
          )}

          {/* Single Delete Confirmation Box */}
          {attendanceToDelete && (
            <div className="bg-rose-50 border-2 border-rose-300 rounded-2xl p-3.5 space-y-2 text-xs shadow-md animate-fadeIn">
              <div className="flex items-center gap-2 font-black text-rose-950">
                <Trash2 className="w-5 h-5 text-rose-600 shrink-0" />
                <span>تأكيد حذف غياب يوم ({attendanceToDelete.date}) نهائياً</span>
              </div>
              <p className="text-rose-800 text-[11px]">
                هل تريد بالتأكيد حذف هذا السجل نهائياً؟ سيتم إلغاؤه من سجل الطالب وقاعدة البيانات فوراً.
              </p>
              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setAttendanceToDelete(null)}
                  className="px-3 py-1 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs cursor-pointer"
                >
                  تراجع
                </button>
                <button
                  type="button"
                  onClick={handleConfirmSingleDelete}
                  className="px-4 py-1 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs cursor-pointer shadow-xs"
                >
                  نعم، حذف السجل نهائياً 🗑️
                </button>
              </div>
            </div>
          )}

          {/* Timeline List */}
          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
            {history.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-4 bg-slate-50 rounded-2xl">لا توجد سجلات مسجلة بعد</p>
            ) : (
              history.map((att) => (
                <div key={att.id} className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 flex items-center justify-between text-xs hover:bg-slate-100/60 transition-colors">
                  <div className="flex items-center gap-2">
                    {att.finalStatus === 'present' ? (
                      <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : att.finalStatus === 'absent' ? (
                      <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    )}
                    <span className="font-mono text-slate-700 font-bold">{att.date}</span>
                    {att.selfCheckTime && (
                      <span className="text-[10px] text-slate-500 font-medium">(دخول: {att.selfCheckTime})</span>
                    )}
                    {att.exitTime && (
                      <span className="text-[10px] text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded-md font-bold">
                        (خروج: {att.exitTime})
                      </span>
                    )}
                    {att.adminDecisionNotes && (
                      <span className="hidden sm:inline-block text-[10px] text-indigo-700 bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded-md font-medium truncate max-w-[140px]" title={att.adminDecisionNotes}>
                        {att.adminDecisionNotes}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {att.isTruant && (
                      <span className="px-2 py-0.5 rounded-md bg-rose-50 border border-rose-200 text-rose-700 text-[10px] font-bold">
                        ⚠️ هروب / تباين
                      </span>
                    )}
                    <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${
                      att.finalStatus === 'present' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' :
                      (att.excuseStatus === 'conditional_accepted' || att.excuseDecisionType === 'conditional') ? 'bg-amber-100 text-amber-900 border border-amber-300' :
                      att.excuseStatus === 'accepted' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' :
                      att.finalStatus === 'absent' ? 'bg-rose-50 text-rose-800 border border-rose-200' : 'bg-amber-50 text-amber-800 border border-amber-200'
                    }`}>
                      {att.finalStatus === 'present' ? 'حاضر' : 
                       (att.excuseStatus === 'conditional_accepted' || att.excuseDecisionType === 'conditional') ? 'معذور (قبول مشروط ⚠️)' :
                       att.excuseStatus === 'accepted' ? 'غائب بعذر رسمي مقبول ✓' :
                       att.finalStatus === 'absent' ? 'غائب بدون عذر' : 'متأخر'}
                    </span>

                    {/* Administrative Edit and Delete buttons */}
                    {isAdministrativeStaff && (
                      <div className="flex items-center gap-1 mr-1">
                        <button
                          type="button"
                          onClick={() => setSelectedAttendanceForEdit(att)}
                          className="p-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 cursor-pointer transition-colors"
                          title="تعديل هذا الرصد (حاضر / غائب / عذر)"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setAttendanceToDelete(att)}
                          className="p-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 cursor-pointer transition-colors"
                          title="حذف هذا الغياب نهائياً"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Permanent Student Deletion Section for Administrators */}
        {isAdministrativeStaff && (
          <div className="pt-2 border-t border-slate-200">
            {isConfirmingDeleteStudent ? (
              <div className="bg-rose-50 border-2 border-rose-300 rounded-2xl p-4 space-y-3 animate-fadeIn">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-rose-100 text-rose-700 shrink-0 mt-0.5">
                    <Trash2 className="w-5 h-5 text-rose-600" />
                  </div>
                  <div className="space-y-1 text-xs">
                    <strong className="text-sm font-black text-rose-950 block">
                      تأكيد حذف الطالب نهائياً من المدرسة
                    </strong>
                    <p className="text-rose-900 leading-relaxed font-medium">
                      هل أنت متأكد من رغبتك في حذف الطالب <strong className="font-bold underline">({student.name})</strong> نهائياً من المدرسة؟
                    </p>
                    <p className="text-[11px] text-rose-800">
                      ⚠️ سيتم حذف حسابه وكافة سجلات حضوره وغيابه وأذوناته فوراً وفك ارتباطه بحساب ولي الأمر، ليتمكن من إعادة التسجيل في فصول مدرسته الصحيحة بدون أي تعارض في رقم الهوية.
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    disabled={isDeletingStudentInProgress}
                    onClick={() => setIsConfirmingDeleteStudent(false)}
                    className="px-4 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs cursor-pointer"
                  >
                    تراجع / إلغاء
                  </button>
                  <button
                    type="button"
                    disabled={isDeletingStudentInProgress}
                    onClick={handlePermanentDeleteStudent}
                    className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs flex items-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{isDeletingStudentInProgress ? 'جارِ الحذف...' : 'نعم، احذف الطالب نهائياً الآن'}</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setIsConfirmingDeleteStudent(true)}
                  className="px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 hover:text-rose-800 border border-rose-200 font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-colors"
                  title="حذف الطالب نهائياً من المدرسة ليتسنى له إعادة التسجيل الصحيح"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                  <span>حذف الطالب نهائياً من المدرسة</span>
                </button>
                <button
                  onClick={onClose}
                  className="px-5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
                >
                  إغلاق الملف
                </button>
              </div>
            )}
          </div>
        )}

        {!isAdministrativeStaff && (
          <div className="pt-2">
            <button
              onClick={onClose}
              className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
            >
              إغلاق الملف
            </button>
          </div>
        )}
      </div>

      {/* Attendance Edit Modal */}
      {selectedAttendanceForEdit && (
        <AttendanceEditModal
          isOpen={!!selectedAttendanceForEdit}
          onClose={() => setSelectedAttendanceForEdit(null)}
          attendance={selectedAttendanceForEdit}
          studentName={student.name}
          currentUser={currentUser}
          onSaved={() => {
            setSelectedAttendanceForEdit(null);
            setDataVersion((v) => v + 1);
            onAttendanceUpdated?.();
          }}
        />
      )}

      {/* Compensatory Modal */}
      {isCompensatoryModalOpen && (
        <CompensatoryPointsModal
          student={student}
          currentUser={currentUser}
          onClose={() => setIsCompensatoryModalOpen(false)}
          onSaved={() => {
            setIsCompensatoryModalOpen(false);
            setDataVersion((v) => v + 1);
          }}
        />
      )}

      {/* Behavior Record Modal */}
      {isBehaviorModalOpen && (
        <BehaviorRecordModal
          isOpen={isBehaviorModalOpen}
          onClose={() => setIsBehaviorModalOpen(false)}
          student={student}
          currentUser={currentUser}
          currentSchool={school}
          onSaved={() => {
            setIsBehaviorModalOpen(false);
            setDataVersion((v) => v + 1);
          }}
        />
      )}

      {/* Absence Action Modal */}
      {isAbsenceActionModalOpen && (
        <AbsenceActionModal
          isOpen={isAbsenceActionModalOpen}
          onClose={() => setIsAbsenceActionModalOpen(false)}
          student={student}
          currentUser={currentUser}
          currentSchool={school}
          onSaved={() => {
            setIsAbsenceActionModalOpen(false);
            setDataVersion((v) => v + 1);
          }}
        />
      )}

      {/* Parent Summon Modal */}
      {isParentSummonModalOpen && (
        <ParentSummonModal
          isOpen={isParentSummonModalOpen}
          onClose={() => setIsParentSummonModalOpen(false)}
          student={student}
          currentSchool={school}
          currentUser={currentUser}
          onSummonCreated={() => {
            setDataVersion((v) => v + 1);
          }}
        />
      )}
    </div>
  );
};
