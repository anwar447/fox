import React, { useState } from 'react';
import { School, User, SystemNotification } from '../types';
import { getUsers, saveUsers, addSystemNotification } from '../utils/storage';
import { soundManager } from '../utils/audio';
import { 
  GraduationCap, ArrowUpRight, Trash2, CheckCircle2, 
  AlertTriangle, Users, Sparkles, X, ChevronLeft, ShieldCheck, Download
} from 'lucide-react';

interface StudentPromotionModalProps {
  isOpen: boolean;
  onClose: () => void;
  school: School;
  onSuccess: () => void;
}

export const StudentPromotionModal: React.FC<StudentPromotionModalProps> = ({
  isOpen,
  onClose,
  school,
  onSuccess,
}) => {
  const [handleGraduatesAction, setHandleGraduatesAction] = useState<'delete' | 'archive'>('delete');
  const [isProcessing, setIsProcessing] = useState(false);
  const [completedSummary, setCompletedSummary] = useState<{
    promotedCount: number;
    graduatedCount: number;
  } | null>(null);

  if (!isOpen) return null;

  const allUsers = getUsers();
  const schoolStudents = allUsers.filter((u) => u.schoolCode === school.code && u.role === 'student');

  // Define grade progression chains based on school type
  const getProgressionChain = () => {
    if (school.type === 'elementary') {
      return [
        { current: 'الأول الابتدائي', next: 'الثاني الابتدائي', isFinal: false },
        { current: 'الثاني الابتدائي', next: 'الثالث الابتدائي', isFinal: false },
        { current: 'الثالث الابتدائي', next: 'الرابع الابتدائي', isFinal: false },
        { current: 'الرابع الابتدائي', next: 'الخامس الابتدائي', isFinal: false },
        { current: 'الخامس الابتدائي', next: 'السادس الابتدائي', isFinal: false },
        { current: 'السادس الابتدائي', next: 'متخرج 🎓', isFinal: true },
      ];
    } else if (school.type === 'middle') {
      return [
        { current: 'الأول المتوسط', next: 'الثاني المتوسط', isFinal: false },
        { current: 'الثاني المتوسط', next: 'الثالث المتوسط', isFinal: false },
        { current: 'الثالث المتوسط', next: 'متخرج 🎓', isFinal: true },
      ];
    } else {
      // Secondary
      return [
        { current: 'الأول الثانوي', next: 'الثاني الثانوي', isFinal: false },
        { current: 'الثاني الثانوي', next: 'الثالث الثانوي', isFinal: false },
        { current: 'الثالث الثانوي', next: 'متخرج 🎓', isFinal: true },
      ];
    }
  };

  const chain = getProgressionChain();

  // Calculate student counts per grade
  const gradeStats = chain.map((step) => {
    const studentsInGrade = schoolStudents.filter((s) => s.className?.includes(step.current));
    return {
      ...step,
      count: studentsInGrade.length,
      students: studentsInGrade,
    };
  });

  const totalPromotable = gradeStats.filter((g) => !g.isFinal).reduce((sum, g) => sum + g.count, 0);
  const totalGraduating = gradeStats.filter((g) => g.isFinal).reduce((sum, g) => sum + g.count, 0);

  // Export graduates to JSON/CSV before deleting if needed
  const exportGraduatesBackup = () => {
    const graduates = gradeStats.filter((g) => g.isFinal).flatMap((g) => g.students);
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(graduates, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `graduates-backup-${school.code}-${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleExecutePromotion = () => {
    setIsProcessing(true);
    let promoted = 0;
    let graduated = 0;

    const updatedUsers: User[] = [];
    const graduatingIds = new Set<string>();

    // Step 1: Identify graduates
    gradeStats.forEach((step) => {
      if (step.isFinal) {
        step.students.forEach((st) => {
          graduatingIds.add(st.id);
          graduated++;
        });
      }
    });

    // Step 2: Iterate over all users and update classes
    allUsers.forEach((user) => {
      if (user.schoolCode === school.code && user.role === 'student') {
        if (graduatingIds.has(user.id)) {
          if (handleGraduatesAction === 'delete') {
            // Drop user from users list
            return;
          } else {
            // Archive with status
            updatedUsers.push({
              ...user,
              className: 'خريج 🎓',
            });
          }
        } else {
          // Find next class in progression
          const matchStep = chain.find((c) => !c.isFinal && user.className?.includes(c.current));
          if (matchStep) {
            promoted++;
            updatedUsers.push({
              ...user,
              className: matchStep.next,
              // sectionName stays the same!
            });
          } else {
            updatedUsers.push(user);
          }
        }
      } else {
        updatedUsers.push(user);
      }
    });

    saveUsers(updatedUsers);

    // Add notification
    const notif: SystemNotification = {
      id: `notif-promo-${Date.now()}`,
      title: '🎉 تم ترحيل الطلاب للعام الدراسي الجديد وتخريج الدفعة السابقة',
      message: `تم بنجاح ترحيل ${promoted} طالباً للصفوف الأعلى بنفس شُعبهم الدراسية، ومعالجة ${graduated} طالباً متخرجاً بنجاح.`,
      type: 'success',
      priority: 'normal',
      targetRole: 'all',
      schoolCode: school.code,
      createdAt: new Date().toISOString(),
      read: false,
    };
    addSystemNotification(notif);

    try {
      soundManager.playSuccess();
    } catch {
      // Audio fallback
    }

    setIsProcessing(false);
    setCompletedSummary({
      promotedCount: promoted,
      graduatedCount: graduated,
    });
  };

  return (
    <div 
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fadeIn"
      dir="rtl"
    >
      <div className="bg-white border border-slate-200 rounded-3xl max-w-2xl w-full p-6 text-right space-y-5 shadow-2xl text-slate-800">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center justify-center font-bold shadow-xs shrink-0">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-slate-900">ترحيل الطلاب للصفوف الأعلى وحذف المتخرجين</h3>
                <span className="px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-900 text-[10px] font-black border border-indigo-200">
                  العام الدراسي الجديد 🎓
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                ترحيل تلقائي للطلاب للصف التالي بنفس الشعبة (مثال: 1/أ ⬅ 2/أ) وحذف أو أرشفة المتخرجين.
              </p>
            </div>
          </div>

          <button 
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {completedSummary ? (
          <div className="py-8 text-center space-y-4 animate-fadeIn">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-md">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <div>
              <h4 className="text-lg font-black text-slate-900">تم الترحيل السنوي بنجاح تام! 🎓</h4>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                تم ترحيل <strong className="text-emerald-700 font-bold">{completedSummary.promotedCount}</strong> طالباً إلى صفوفهم الجديدة مع الحفاظ على نفس الشُعب، ومعالجة <strong className="text-indigo-700 font-bold">{completedSummary.graduatedCount}</strong> خريجاً.
              </p>
            </div>

            <div className="pt-3">
              <button
                onClick={() => {
                  onSuccess();
                  onClose();
                }}
                className="py-3 px-8 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs cursor-pointer shadow-lg shadow-emerald-600/20"
              >
                تم والعودة للوحة المدرسة ↵
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4 text-xs">
            {/* Progression preview table */}
            <div className="space-y-2">
              <label className="block text-slate-700 font-bold">
                خارطة ترحيل الصفوف المدرسية ({schoolStudents.length} طالب مسجل):
              </label>

              <div className="border border-slate-200 rounded-2xl overflow-hidden divide-y divide-slate-200 bg-slate-50">
                {gradeStats.map((item, idx) => (
                  <div key={idx} className="p-3 flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900">{item.current}</span>
                      <ChevronLeft className="w-4 h-4 text-slate-400" />
                      <span className={`font-black ${item.isFinal ? 'text-amber-700' : 'text-emerald-700'}`}>
                        {item.next}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-slate-500 text-[11px]">
                        عدد الطلاب: <strong className="font-mono text-slate-800 font-bold">{item.count}</strong>
                      </span>
                      <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black ${
                        item.isFinal 
                          ? 'bg-amber-100 text-amber-900 border border-amber-200' 
                          : 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                      }`}>
                        {item.isFinal ? 'دفعة التخرج 🎓' : 'ترقية للصف الأعلى ⬆️'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Graduates Action Box */}
            <div className="bg-amber-50/80 border border-amber-300/80 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <GraduationCap className="w-5 h-5 text-amber-700" />
                  <span className="font-black text-amber-950 text-xs">
                    معالجة دفعة المتخرجين ({totalGraduating} طالب):
                  </span>
                </div>

                {totalGraduating > 0 && (
                  <button
                    type="button"
                    onClick={exportGraduatesBackup}
                    className="px-3 py-1.5 rounded-xl bg-white hover:bg-amber-100 text-amber-900 border border-amber-300 font-bold text-[11px] flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>تنزيل نسخة للمتخرجين</span>
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <label className={`p-3 rounded-xl border flex items-start gap-2.5 cursor-pointer transition-all ${
                  handleGraduatesAction === 'delete' ? 'bg-white border-amber-400 ring-2 ring-amber-400/20 text-slate-900 shadow-xs' : 'bg-amber-100/40 border-amber-200 text-slate-600'
                }`}>
                  <input
                    type="radio"
                    name="gradAction"
                    checked={handleGraduatesAction === 'delete'}
                    onChange={() => setHandleGraduatesAction('delete')}
                    className="mt-0.5 text-amber-600"
                  />
                  <div>
                    <strong className="block font-black text-rose-700">حذف المتخرجين نهائياً (الموصى به)</strong>
                    <span className="text-[10px] text-slate-500 leading-tight block mt-0.5">
                      يتم مسح حسابات طلاب الصف النهائي لتفريغ المقاعد للدفعة المستجدة.
                    </span>
                  </div>
                </label>

                <label className={`p-3 rounded-xl border flex items-start gap-2.5 cursor-pointer transition-all ${
                  handleGraduatesAction === 'archive' ? 'bg-white border-amber-400 ring-2 ring-amber-400/20 text-slate-900 shadow-xs' : 'bg-amber-100/40 border-amber-200 text-slate-600'
                }`}>
                  <input
                    type="radio"
                    name="gradAction"
                    checked={handleGraduatesAction === 'archive'}
                    onChange={() => setHandleGraduatesAction('archive')}
                    className="mt-0.5 text-amber-600"
                  />
                  <div>
                    <strong className="block font-black text-indigo-700">أرشفة المتخرجين كـ (خريج)</strong>
                    <span className="text-[10px] text-slate-500 leading-tight block mt-0.5">
                      الإبقاء على الحسابات وتصنيف صفهم إلى "خريج 🎓".
                    </span>
                  </div>
                </label>
              </div>
            </div>

            {/* Warning note */}
            <div className="p-3 bg-slate-100 rounded-xl text-slate-600 text-[11px] flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                سيتم الاحتفاظ بنفس أسماء وأرقام الشعب (مثلاً الشعبة 1 تبقى 1 والشعبة 2 تبقى 2) لجميع الطلاب المنقولين.
              </span>
            </div>

            {/* Action buttons */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                disabled={isProcessing || schoolStudents.length === 0}
                onClick={handleExecutePromotion}
                className="py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 cursor-pointer transition-all"
              >
                <GraduationCap className="w-4 h-4" />
                <span>تنفيذ ترحيل الطلاب للأعلى 🎓</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
