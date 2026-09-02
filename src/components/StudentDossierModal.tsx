import React, { useState } from 'react';
import { User, Attendance, School, StudentPermission } from '../types';
import { getAttendancesForStudent, getPermissionsForStudent, getCurrentUser } from '../utils/storage';
import { calculateStudentBehaviorScore } from '../utils/behavior';
import { CompensatoryPointsModal } from './CompensatoryPointsModal';
import { BehaviorRecordModal } from './BehaviorRecordModal';
import { AbsenceActionModal } from './AbsenceActionModal';
import { 
  GraduationCap, Calendar, CheckCircle, XCircle, 
  AlertTriangle, Phone, X, QrCode, FileText, Activity, 
  LogOut, ShieldAlert, Clock, Star, Sparkles, Award, 
  ThumbsUp, ThumbsDown, HeartHandshake, Plus, User as UserIcon, RefreshCw
} from 'lucide-react';

interface StudentDossierModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: User;
  school: School;
  onOpenQrCard: () => void;
}

export const StudentDossierModal: React.FC<StudentDossierModalProps> = ({
  isOpen,
  onClose,
  student,
  school,
  onOpenQrCard,
}) => {
  if (!isOpen) return null;

  const currentUser = getCurrentUser() || student;
  const [dataVersion, setDataVersion] = useState(0);

  // Modals for admin & counselor actions
  const [isCompensatoryModalOpen, setIsCompensatoryModalOpen] = useState(false);
  const [isBehaviorModalOpen, setIsBehaviorModalOpen] = useState(false);
  const [isAbsenceActionModalOpen, setIsAbsenceActionModalOpen] = useState(false);

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
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-slate-900">{student.name}</h3>
                <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-mono text-[10px] font-bold">
                  هوية: {student.nationalId}
                </span>
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

        {/* Attendance & Exit Timeline */}
        <div className="space-y-2">
          <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-emerald-600" />
            <span>سجل الأيام والغياب والأعذار:</span>
          </h4>

          <div className="space-y-1.5 max-h-28 overflow-y-auto pr-1">
            {history.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-2">لا توجد سجلات مسجلة بعد</p>
            ) : (
              history.map((att) => (
                <div key={att.id} className="bg-slate-50 border border-slate-200 rounded-xl p-2 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    {att.finalStatus === 'present' ? (
                      <CheckCircle className="w-4 h-4 text-emerald-600" />
                    ) : att.finalStatus === 'absent' ? (
                      <XCircle className="w-4 h-4 text-rose-600" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-amber-600" />
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
                  </div>

                  <div className="flex items-center gap-2">
                    {att.isTruant && (
                      <span className="px-2 py-0.5 rounded-md bg-rose-50 border border-rose-200 text-rose-700 text-[10px] font-bold">
                        ⚠️ هروب / تباين
                      </span>
                    )}
                    <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${
                      att.finalStatus === 'present' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' :
                      att.finalStatus === 'absent' ? 'bg-rose-50 text-rose-800 border border-rose-200' : 'bg-amber-50 text-amber-800 border border-amber-200'
                    }`}>
                      {att.finalStatus === 'present' ? 'حاضر' : 
                       att.excuseStatus === 'accepted' ? 'غائب بعذر مقبول' :
                       att.finalStatus === 'absent' ? 'غائب بدون عذر' : 'متأخر'}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="pt-2">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
          >
            إغلاق الملف
          </button>
        </div>
      </div>

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
    </div>
  );
};
