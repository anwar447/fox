import React, { useState } from 'react';
import { User, StudentBehaviorLog } from '../types';
import { addBehaviorLog, addSystemNotification } from '../utils/storage';
import { getTodayDateString } from '../utils/academic';
import { soundManager } from '../utils/audio';
import { COMPENSATORY_OPPORTUNITY_PRESETS, calculateStudentBehaviorScore } from '../utils/behavior';
import { 
  X, Award, Sparkles, Check, HeartHandshake, 
  TrendingUp, Send, ShieldCheck, Star 
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface CompensatoryPointsModalProps {
  student: User;
  currentUser: User;
  onClose: () => void;
  onSaved: () => void;
}

export const CompensatoryPointsModal: React.FC<CompensatoryPointsModalProps> = ({
  student,
  currentUser,
  onClose,
  onSaved,
}) => {
  const today = getTodayDateString();
  const summary = calculateStudentBehaviorScore(student.id);

  const [selectedPresetIndex, setSelectedPresetIndex] = useState<number>(0);
  const [title, setTitle] = useState(COMPENSATORY_OPPORTUNITY_PRESETS[0].title);
  const [category, setCategory] = useState(COMPENSATORY_OPPORTUNITY_PRESETS[0].category);
  const [points, setPoints] = useState<number>(COMPENSATORY_OPPORTUNITY_PRESETS[0].points);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSelectPreset = (index: number) => {
    setSelectedPresetIndex(index);
    const preset = COMPENSATORY_OPPORTUNITY_PRESETS[index];
    if (preset) {
      setTitle(preset.title);
      setCategory(preset.category);
      setPoints(preset.points);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsSubmitting(true);
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const newLog: StudentBehaviorLog = {
      id: `beh-comp-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      studentId: student.id,
      studentName: student.name,
      nationalId: student.nationalId,
      schoolCode: student.schoolCode,
      className: student.className || 'عام',
      sectionName: student.sectionName || '1',
      date: today,
      time: timeStr,
      type: 'compensatory',
      points: Math.max(1, Math.min(20, points)),
      title: title.trim(),
      category: category.trim(),
      notes: notes.trim() || undefined,
      recordedById: currentUser.id,
      recordedByName: currentUser.name,
      recordedByRole: 'employee',
      createdAt: new Date().toISOString(),
    };

    addBehaviorLog(newLog);

    // Send instant system notification to Student and Parent
    addSystemNotification({
      id: `notif-comp-${Date.now()}`,
      title: `🎉 مبروك! منح فرصة تعويضية واستعادة درجات: ${student.name}`,
      message: `اعتمدت إدارة المدرسة فرصة تعويضية للطالب [${title}] واستعادة (+${points} درجات مواظبة وسلوك).`,
      type: 'success',
      targetRole: 'all',
      schoolCode: student.schoolCode,
      createdAt: new Date().toISOString(),
      read: false,
    });

    soundManager.playSuccess();
    confetti({ particleCount: 90, spread: 70, origin: { y: 0.6 } });

    onSaved();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4" dir="rtl">
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-scaleIn">
        {/* Header */}
        <div className="p-5 flex items-center justify-between border-b bg-gradient-to-l from-indigo-50 to-teal-50 border-indigo-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-slate-900 text-base flex items-center gap-1.5">
                <span>منح فرصة تعويضية وتعديل الدرجات</span>
                <span className="px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-800 text-[10px] font-black border border-indigo-200">
                  صلاحية الإدارة والموجه
                </span>
              </h3>
              <p className="text-xs text-slate-600 font-bold">
                الطالب: {student.name} ({student.className} - {student.sectionName})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-white/60 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Score Pill Info */}
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-3 flex items-center justify-between text-xs">
          <div>
            <span className="text-slate-500 font-bold">درجة السلوك والمواظبة الحالية: </span>
            <span className="font-black text-sm text-slate-900">{summary.currentScore} / 100</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-500">الخصومات السابقة: {summary.unexcusedAbsenceCount + summary.tardinessCount + summary.negativePoints} درجات</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Preset Buttons */}
          <div className="space-y-2">
            <label className="block text-xs font-black text-slate-700">
              اختر نوع الفرصة التعويضية أو النشاط المنجز:
            </label>
            <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto p-1">
              {COMPENSATORY_OPPORTUNITY_PRESETS.map((preset, idx) => {
                const isSelected = selectedPresetIndex === idx;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectPreset(idx)}
                    className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-2 border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-100 text-indigo-950 border-indigo-400 shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <span className="text-base">{preset.icon}</span>
                    <span>{preset.title}</span>
                    <span className="px-1.5 py-0.5 rounded-md bg-indigo-600 text-white text-[10px] font-black">
                      +{preset.points}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Points & Category */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-black text-slate-700 mb-1">
                الدرجات المستعادة / التعويضية (+)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  max="20"
                  required
                  value={points}
                  onChange={(e) => setPoints(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-black text-indigo-900 focus:outline-indigo-500"
                />
                <span className="text-xs font-bold text-slate-500">درجة</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-black text-slate-700 mb-1">المجال / التصنيف</label>
              <input
                type="text"
                required
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-indigo-500"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-black text-slate-700 mb-1">
              مبررات التعويض وملاحظات الإدارة (تظهر فوراً في حساب الطالب وولي أمره)
            </label>
            <textarea
              rows={2}
              placeholder="مثال: تم إنجاز المهمة التطوعية وتحسن التزام الطالب بالحضور الصباحي..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-indigo-500"
            />
          </div>

          <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200 text-[11px] text-emerald-900 flex items-center gap-2">
            <HeartHandshake className="w-4 h-4 text-emerald-700 shrink-0" />
            <span>سيتم تحديث درجة الطالب التراكمية فوراً لتصبح: <strong>{Math.min(100, summary.currentScore + points)} / 100</strong> مع إشعار ولي الأمر.</span>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
            >
              إلغاء
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black flex items-center gap-2 shadow-md shadow-indigo-600/20 cursor-pointer transition-all"
            >
              <Check className="w-4 h-4" />
              <span>{isSubmitting ? 'جاري الاعتماد...' : 'اعتماد الفرصة التعويضية الآن'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
