import React, { useState } from 'react';
import { User, School, AdministrativeAbsenceAction } from '../types';
import { 
  addAbsenceAction, addSystemNotification, addBehaviorLog 
} from '../utils/storage';
import { getTodayDateString } from '../utils/academic';
import { calculateStudentBehaviorScore } from '../utils/behavior';
import { soundManager } from '../utils/audio';
import { 
  AlertTriangle, ShieldAlert, CheckCircle, FileText, 
  UserCheck, Send, X, Phone, Calendar, Star, RefreshCw, 
  Sparkles, Award, User as UserIcon
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface AbsenceActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: User;
  currentUser: User;
  currentSchool: School;
  onSaved: () => void;
}

export const AbsenceActionModal: React.FC<AbsenceActionModalProps> = ({
  isOpen,
  onClose,
  student,
  currentUser,
  currentSchool,
  onSaved,
}) => {
  if (!isOpen) return null;

  const today = getTodayDateString();
  const behaviorSummary = calculateStudentBehaviorScore(student.id);
  const cycleDays = behaviorSummary.unexcusedInCurrentCycleDays;
  const cycleCount = behaviorSummary.unexcusedInCurrentCycleCount;

  const [actionType, setActionType] = useState<AdministrativeAbsenceAction['actionType']>('first_warning');
  const [actionTitle, setActionTitle] = useState('إصدار إنذار غياب رسمي أول واستدعاء ولي الأمر');
  const [notes, setNotes] = useState(
    `نظراً لتكرار غياب الطالب (${student.name}) لمدة (${cycleCount}) أيام بدون عذر رسمي مقبول، تقرر توجيه إنذار رسمي واستدعاء ولي الأمر لتوقيع التعهد اللازم وفق لائحة الانضباط والسلوك والمواظبة المدرسية.`
  );
  const [resetCycle, setResetCycle] = useState(true);
  const [grantCounselorIncentive, setGrantCounselorIncentive] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSelectPreset = (
    type: AdministrativeAbsenceAction['actionType'], 
    title: string, 
    defaultNote: string
  ) => {
    setActionType(type);
    setActionTitle(title);
    setNotes(defaultNote);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!notes.trim()) return;

    setIsSubmitting(true);

    // 1. Create and save Administrative Action
    const actionRecord: AdministrativeAbsenceAction = {
      id: `act-abs-${Date.now()}`,
      studentId: student.id,
      studentName: student.name,
      nationalId: student.nationalId,
      schoolCode: currentSchool.code,
      className: student.className || 'عام',
      sectionName: student.sectionName || '1',
      absenceCount: cycleCount,
      actionType,
      actionTitle,
      notes: notes.trim(),
      recordedById: currentUser.id,
      recordedByName: currentUser.name,
      recordedByRole: currentUser.staffTitle || currentUser.role,
      resetCycle,
      date: today,
      createdAt: new Date().toISOString(),
    };

    addAbsenceAction(actionRecord);

    // 2. Optional incentive log if guidance committee intervened
    if (grantCounselorIncentive) {
      addBehaviorLog({
        id: `log-guidance-${Date.now()}`,
        studentId: student.id,
        studentName: student.name,
        nationalId: student.nationalId,
        schoolCode: currentSchool.code,
        className: student.className || 'عام',
        sectionName: student.sectionName || '1',
        date: today,
        type: 'compensatory',
        points: 2,
        title: 'تجاوب إيجابي وجلسة إرشادية وتعهد بالانضباط',
        category: 'التوجيه والإرشاد',
        notes: 'تم منح الطالب فرصة تعويضية (+2) بعد الالتزام والتجاوب مع الموجه الطلابي.',
        recordedById: currentUser.id,
        recordedByName: currentUser.name,
        recordedByRole: 'admin',
        createdAt: new Date().toISOString(),
      });
    }

    // 3. System Notification for Student & Parent
    addSystemNotification({
      id: `notif-abs-action-${Date.now()}`,
      title: `📋 إجراء إداري رسمي: ${actionTitle}`,
      message: `تم اتخاذ وتوثيق إجراء إداري بحق الطالب (${student.name}) لتكرار الغياب (${cycleCount} أيام). ${notes.trim()}`,
      type: 'warning',
      targetRole: 'all',
      schoolCode: currentSchool.code,
      createdAt: new Date().toISOString(),
      read: false,
    });

    soundManager.playSuccess();
    confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });

    setIsSubmitting(false);
    onSaved();
  };

  return (
    <div 
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fadeIn" 
      dir="rtl"
    >
      <div className="bg-white border border-slate-200 rounded-3xl max-w-xl w-full p-6 text-right space-y-4 shadow-2xl text-slate-800 my-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-rose-100 text-rose-700 border border-rose-200 flex items-center justify-center shadow-xs">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-slate-900">اتخاذ وحفظ إجراء إداري (تكرار الغياب)</h3>
                <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 font-bold text-[10px] border border-rose-200">
                  {cycleCount} أيام غياب
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                توثيق رسمي وإشعار ولي الأمر وفق لائحة السلوك والمواظبة المدرسية
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Student Profile Snapshot */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-slate-200 border border-slate-300 overflow-hidden flex items-center justify-center text-slate-600 shrink-0">
              {student.avatar ? (
                <img src={student.avatar} alt={student.name} className="w-full h-full object-cover" />
              ) : (
                <UserIcon className="w-6 h-6" />
              )}
            </div>
            <div>
              <h4 className="text-xs font-black text-slate-900">{student.name}</h4>
              <p className="text-[11px] text-slate-500">
                {student.className} - فصل {student.sectionName} | هوية: <span className="font-mono font-bold text-slate-700">{student.nationalId}</span>
              </p>
              <p className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                <Phone className="w-3 h-3 text-emerald-600" />
                <span>جوال ولي الأمر: <strong className="font-mono text-emerald-700">{student.parentMobile || '--'}</strong></span>
              </p>
            </div>
          </div>

          <div className="text-left">
            <span className="text-[10px] text-slate-400 font-bold block">درجة المواظبة</span>
            <span className="text-sm font-black text-rose-600 font-mono">
              {behaviorSummary.currentScore} / 100
            </span>
          </div>
        </div>

        {/* Unexcused Absences Days Pill List */}
        <div className="bg-rose-50/70 border border-rose-200/80 rounded-2xl p-3 space-y-1.5 text-xs">
          <div className="flex items-center justify-between text-[11px] font-bold text-rose-900">
            <span className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-rose-600" />
              أيام الغياب بدون عذر في الدورة الحالية ({cycleDays.length}):
            </span>
            <span className="text-[10px] bg-rose-200/60 text-rose-900 px-2 py-0.5 rounded-md font-bold">
              تجاوز حد 5 أيام ⚠️
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5 pt-1">
            {cycleDays.length === 0 ? (
              <span className="text-slate-500 text-[11px]">لا توجد أيام غياب مسجلة</span>
            ) : (
              cycleDays.map((d) => (
                <span key={d.id || d.date} className="px-2 py-0.5 rounded-lg bg-white border border-rose-200 text-rose-800 font-mono text-[11px] font-bold shadow-2xs">
                  {d.date}
                </span>
              ))
            )}
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          {/* Action Presets */}
          <div className="space-y-1.5">
            <label className="font-black text-slate-800 block text-[11px]">اختر الإجراء الإداري المعتمد:</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => handleSelectPreset(
                  'first_warning',
                  'إصدار إنذار غياب رسمي أول واستدعاء ولي الأمر',
                  `نظراً لتكرار غياب الطالب (${student.name}) لمدة (${cycleCount}) أيام بدون عذر رسمي، تقرر توجيه إنذار رسمي واستدعاء ولي الأمر لتوقيع التعهد اللازم وفق لائحة السلوك والمواظبة.`
                )}
                className={`p-2 rounded-xl text-right border transition-all cursor-pointer flex items-center justify-between ${
                  actionType === 'first_warning' ? 'bg-rose-50 border-rose-300 text-rose-900 font-bold shadow-xs' : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <span>📜 إنذار غياب رسمي أول واستدعاء ولي الأمر</span>
              </button>

              <button
                type="button"
                onClick={() => handleSelectPreset(
                  'counselor_referral',
                  'إحالة للموجه الطلابي لدراسة الحالة ووضع خطة علاجية',
                  `تمت إحالة الطالب (${student.name}) للموجه الطلابي لعقد جلسة إرشادية فردية لبحث دوافع الغياب المتكرر وتطبيق برنامج الدعم والرعاية السلوكية.`
                )}
                className={`p-2 rounded-xl text-right border transition-all cursor-pointer flex items-center justify-between ${
                  actionType === 'counselor_referral' ? 'bg-indigo-50 border-indigo-300 text-indigo-900 font-bold shadow-xs' : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <span>🤝 إحالة للموجه الطلابي وخطة علاجية</span>
              </button>

              <button
                type="button"
                onClick={() => handleSelectPreset(
                  'parent_pledge',
                  'توقيع تعهد خطي على ولي الأمر والطالب بالانتظام',
                  `حضر ولي أمر الطالب وتم توقيع التعهد الخطي بالالتزام بالحضور الصباحي وعدم تكرار الغياب دون تقرير طبي معتمد.`
                )}
                className={`p-2 rounded-xl text-right border transition-all cursor-pointer flex items-center justify-between ${
                  actionType === 'parent_pledge' ? 'bg-amber-50 border-amber-300 text-amber-900 font-bold shadow-xs' : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <span>📋 توقيع تعهد خطي مع ولي الأمر</span>
              </button>

              <button
                type="button"
                onClick={() => handleSelectPreset(
                  'disciplinary_committee',
                  'إحالة إلى لجنة التوجيه والانضباط المدرسي',
                  `تم عرض حالة الطالب على لجنة الانضباط المدرسي لاتخاذ الإجراءات التربوية المعتمدة وتكليف رائد الفصل بالمتابعة اليومية.`
                )}
                className={`p-2 rounded-xl text-right border transition-all cursor-pointer flex items-center justify-between ${
                  actionType === 'disciplinary_committee' ? 'bg-teal-50 border-teal-300 text-teal-900 font-bold shadow-xs' : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <span>⚖️ إحالة إلى لجنة الانضباط المدرسي</span>
              </button>
            </div>
          </div>

          {/* Action Title Input */}
          <div className="space-y-1">
            <label className="font-bold text-slate-700 block text-[11px]">مسمى الإجراء:</label>
            <input
              type="text"
              value={actionTitle}
              onChange={(e) => setActionTitle(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs focus:bg-white focus:border-indigo-500 outline-none"
              required
            />
          </div>

          {/* Notes Textarea */}
          <div className="space-y-1">
            <label className="font-bold text-slate-700 block text-[11px]">
              تفاصيل وتوصيات الإجراء المتخذ (يسمح بالتعديل والكتابة):
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="اكتب التوصيات والملاحظات الإدارية وتفاصيل مقابلة ولي الأمر..."
              className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs focus:bg-white focus:border-indigo-500 outline-none resize-none leading-relaxed"
              required
            />
          </div>

          {/* Checkboxes for Reset Cycle & Guidance Incentive */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 space-y-2.5">
            <label className="flex items-center gap-2.5 cursor-pointer text-slate-800 font-bold select-none">
              <input
                type="checkbox"
                checked={resetCycle}
                onChange={(e) => setResetCycle(e.target.checked)}
                className="w-4 h-4 rounded text-emerald-600 accent-emerald-600 cursor-pointer"
              />
              <span className="flex items-center gap-1.5 text-xs text-emerald-850">
                <RefreshCw className="w-3.5 h-3.5 text-emerald-600" />
                بدء دورة حساب جديدة للطالب (إعادة ضبط عداد الـ 5 أيام للدورة التالية) 🔄
              </span>
            </label>
            <p className="text-[10px] text-slate-500 pr-6 leading-normal">
              عند التفعيل، يتم توثيق هذا الإجراء رسميًا وبدء احتساب أيام الغياب القادمة من جديد للتنبيه التالي، مع بقاء السجل التاريخي محفوظاً.
            </p>

            <label className="flex items-center gap-2.5 cursor-pointer text-slate-800 font-bold select-none pt-1 border-t border-slate-200">
              <input
                type="checkbox"
                checked={grantCounselorIncentive}
                onChange={(e) => setGrantCounselorIncentive(e.target.checked)}
                className="w-4 h-4 rounded text-indigo-600 accent-indigo-600 cursor-pointer"
              />
              <span className="flex items-center gap-1.5 text-xs text-indigo-850">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                منح نقطتين تعزيزيتين (+2) تقديراً لتجاوب الطالب وولي الأمر في الجلسة 🌟
              </span>
            </label>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-2 shadow-md shadow-rose-600/20 cursor-pointer transition-all"
            >
              <Send className="w-3.5 h-3.5" />
              <span>حفظ وتوثيق الإجراء الإداري</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
