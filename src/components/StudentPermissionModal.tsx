import React, { useState } from 'react';
import { User, School, StudentPermission, PermissionReason } from '../types';
import { 
  getPermissions, savePermissions, addPermission, 
  returnStudentPermission, getStudentPermissionsToday, getPermissionsForStudent 
} from '../utils/storage';
import { soundManager } from '../utils/audio';
import { getTodayDateString } from '../utils/academic';
import { 
  X, Clock, UserCheck, AlertTriangle, CheckCircle, 
  Activity, Sparkles, Plus, History, ArrowRight, ShieldAlert 
} from 'lucide-react';

interface StudentPermissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: User | null;
  teacher: User;
  school: School;
  onPermissionAdded?: () => void;
}

export const StudentPermissionModal: React.FC<StudentPermissionModalProps> = ({
  isOpen,
  onClose,
  student,
  teacher,
  school,
  onPermissionAdded,
}) => {
  const [reason, setReason] = useState<PermissionReason>('restroom');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successNotice, setSuccessNotice] = useState('');

  if (!isOpen || !student) return null;

  const today = getTodayDateString();
  const todayPermissions = getStudentPermissionsToday(student.id, today);
  const allStudentPermissions = getPermissionsForStudent(student.id);

  const reasonLabels: Record<PermissionReason, { title: string; icon: string }> = {
    restroom: { title: 'دورة مياه', icon: '🚻' },
    water: { title: 'شرب ماء', icon: '💧' },
    nurse: { title: 'العيادة الصحية / المرشد الصحي', icon: '🩺' },
    administration: { title: 'مراجعة الإدارة / الوكيل', icon: '🏢' },
    library: { title: 'المكتبة / مصادر التعلم', icon: '📚' },
    prayer: { title: 'المصلى / الوضوء', icon: '🕌' },
    medical_appointment: { title: 'موعد طبي / مستشفى', icon: '🏥' },
    family_emergency: { title: 'ظرف عائلي طارئ', icon: '👨‍👩‍👧' },
    parent_request: { title: 'استدعاء ولي الأمر', icon: '📞' },
    official_activity: { title: 'نشاط أو تمثيل رسمي', icon: '🏆' },
    early_dismissal: { title: 'انصراف مبكر معتمد', icon: '🚪' },
    other: { title: 'استئذان آخر', icon: '📝' },
  };

  const handleCreatePermission = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const now = new Date();
    const timeOutStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const newPerm: StudentPermission = {
      id: `perm-${Date.now()}`,
      studentId: student.id,
      studentName: student.name,
      nationalId: student.nationalId,
      schoolCode: school.code,
      className: student.className || 'عام',
      sectionName: student.sectionName || '1',
      date: today,
      timeOut: timeOutStr,
      timeIn: null,
      teacherId: teacher.id,
      teacherName: teacher.name,
      reason: reason,
      notes: notes.trim() || undefined,
      createdAt: new Date().toISOString(),
    };

    addPermission(newPerm);
    soundManager.playBeep();
    setNotes('');
    setSuccessNotice(`✅ تم تسجيل استئذان ${student.name} في تمام الساعة ${timeOutStr}`);
    setIsSubmitting(false);

    if (onPermissionAdded) {
      onPermissionAdded();
    }

    setTimeout(() => setSuccessNotice(''), 3000);
  };

  const handleReturnStudent = (permId: string) => {
    returnStudentPermission(permId);
    soundManager.playSuccess();
    if (onPermissionAdded) {
      onPermissionAdded();
    }
  };

  // ADHD / Hyperactivity & Frequent Out-of-Seat Diagnostic Indicator
  const todayCount = todayPermissions.length;
  let diagnosticLevel: 'normal' | 'moderate' | 'high' = 'normal';
  if (todayCount >= 3) {
    diagnosticLevel = 'high';
  } else if (todayCount === 2) {
    diagnosticLevel = 'moderate';
  }

  return (
    <div 
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fadeIn" 
      dir="rtl"
    >
      <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full p-6 text-right space-y-5 shadow-2xl text-slate-800 my-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-3.5">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center justify-center font-bold">
              <Activity className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-slate-900">{student.name}</h3>
                <span className="text-[11px] font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                  {student.className} - فصل {student.sectionName}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">سجل استئذانات الحصة ومؤشر فرط الحركة والسلوك</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Diagnostic Indicator Banner */}
        <div className={`p-4 rounded-2xl border text-xs space-y-1.5 transition-all ${
          diagnosticLevel === 'high'
            ? 'bg-rose-50 border-rose-200 text-rose-900'
            : diagnosticLevel === 'moderate'
            ? 'bg-amber-50 border-amber-200 text-amber-900'
            : 'bg-slate-50 border-slate-200 text-slate-700'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-black">
              {diagnosticLevel === 'high' ? (
                <>
                  <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>⚠️ مؤشر مرتفع لتكرار الاستئذان وفرط الحركة ({todayCount} استئذانات اليوم)</span>
                </>
              ) : diagnosticLevel === 'moderate' ? (
                <>
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>تنبيه: استأذن مرتين خلال حصص اليوم ({todayCount} استئذانات)</span>
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>معدل الاستئذان اليوم: {todayCount} {todayCount === 1 ? 'استئذان واحد' : 'استئذان'} (ضمن المعدل الطبيعي)</span>
                </>
              )}
            </div>
            <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded-md bg-white border border-slate-200">
              إجمالي الفصل: {allStudentPermissions.length}
            </span>
          </div>

          <p className="text-[11px] opacity-90 leading-relaxed">
            {diagnosticLevel === 'high'
              ? 'تكرار خروج الطالب لأكثر من حصتين في نفس اليوم قد يشير إلى فرط الحركة وتشتت الانتباه (ADHD) أو صعوبة في البقاء داخل البيئة الصفية. يوصى بإشعار الموجه الطلابي.'
              : diagnosticLevel === 'moderate'
              ? 'يرجى من المعلم التالي الانتباه لحاجة الطالب والتأكد من عدم استخدام الاستئذان للتهرب من المهام الصفية.'
              : 'البيانات تُشارك فوريًا وتلقائيًا مع معلّمي الحصص التالية والموجه الطلابي.'}
          </p>
        </div>

        {/* Quick Add Permission Form */}
        <form onSubmit={handleCreatePermission} className="bg-slate-50/80 border border-slate-200 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
            <span className="text-xs font-black text-slate-800 flex items-center gap-1.5">
              <Plus className="w-4 h-4 text-indigo-600" />
              <span>تسجيل استئذان جديد للطالب في حصتك الآن:</span>
            </span>
            <span className="text-[11px] text-slate-500 font-medium">المعلم: {teacher.name}</span>
          </div>

          <div>
            <label className="block text-xs text-slate-700 font-bold mb-1.5">اختر سبب الاستئذان:</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 text-xs">
              {(Object.keys(reasonLabels) as PermissionReason[]).map((key) => {
                const isSelected = reason === key;
                const info = reasonLabels[key];
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setReason(key)}
                    className={`p-2 rounded-xl text-right font-bold transition-all flex items-center gap-1.5 cursor-pointer text-[11px] ${
                      isSelected
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                    }`}
                  >
                    <span>{info.icon}</span>
                    <span>{info.title}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              placeholder="ملاحظة سريعة (اختياري)..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-indigo-500"
            />
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shrink-0 flex items-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50"
            >
              <Clock className="w-3.5 h-3.5" />
              <span>تسجيل الاستئذان</span>
            </button>
          </div>
        </form>

        {successNotice && (
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold text-center animate-fadeIn">
            {successNotice}
          </div>
        )}

        {/* Timeline of Today's Permissions (ما يراه المعلم التالي) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-800">
            <span className="flex items-center gap-1.5">
              <History className="w-4 h-4 text-indigo-600" />
              <span>سجل استئذانات الطالب اليوم (مرصودة لجميع المعلمين):</span>
            </span>
            <span className="text-[11px] text-slate-500 font-mono">تاريخ: {today}</span>
          </div>

          <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
            {todayPermissions.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-3 bg-slate-50 rounded-xl">
                لم يسبق للطالب الاستئذان اليوم
              </p>
            ) : (
              todayPermissions.map((perm, idx) => {
                const info = reasonLabels[perm.reason] || { title: perm.reason, icon: '📝' };
                const isOutNow = !perm.timeIn;

                return (
                  <div 
                    key={perm.id} 
                    className={`border rounded-2xl p-3 text-xs space-y-1.5 transition-all ${
                      isOutNow ? 'bg-amber-50/70 border-amber-300' : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-base">{info.icon}</span>
                        <strong className="text-slate-900 font-bold">{info.title}</strong>
                        {isOutNow ? (
                          <span className="px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 text-[10px] font-black animate-pulse">
                            خارج الصف الآن ⏳
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 text-[10px] font-bold">
                            عـاد ({perm.durationMinutes ? `${perm.durationMinutes} دقيقة` : 'تمت العودة'})
                          </span>
                        )}
                      </div>

                      {isOutNow && (
                        <button
                          type="button"
                          onClick={() => handleReturnStudent(perm.id)}
                          className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] flex items-center gap-1 cursor-pointer shadow-2xs"
                        >
                          <CheckCircle className="w-3 h-3" />
                          <span>تأكيد عودته للصف</span>
                        </button>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500 pt-1 border-t border-slate-200/60">
                      <div>
                        <span>معلم الحصة: </span>
                        <strong className="text-slate-700 font-medium">{perm.teacherName}</strong>
                      </div>
                      <div className="flex items-center gap-2 font-mono">
                        <span>وقت الخروج: <strong className="text-slate-800 font-bold">{perm.timeOut}</strong></span>
                        {perm.timeIn && (
                          <span>| العودة: <strong className="text-emerald-800 font-bold">{perm.timeIn}</strong></span>
                        )}
                      </div>
                    </div>

                    {perm.notes && (
                      <p className="text-[11px] text-slate-600 bg-white/80 p-1.5 rounded-lg border border-slate-200/50">
                        ملاحظة المعلم: {perm.notes}
                      </p>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="pt-2">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
          >
            إغلاق النافذة
          </button>
        </div>

      </div>
    </div>
  );
};
