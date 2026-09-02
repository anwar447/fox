import React, { useState } from 'react';
import { User, StudentBehaviorLog } from '../types';
import { addBehaviorLog, addSystemNotification } from '../utils/storage';
import { getTodayDateString } from '../utils/academic';
import { soundManager } from '../utils/audio';
import { POSITIVE_BEHAVIOR_PRESETS, NEGATIVE_BEHAVIOR_PRESETS } from '../utils/behavior';
import { 
  X, ThumbsUp, ThumbsDown, Star, AlertTriangle, 
  Check, Sparkles, Send, ShieldAlert, Award 
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface BehaviorRecordModalProps {
  isOpen?: boolean;
  student: User;
  currentUser: User;
  currentSchool?: any;
  onClose: () => void;
  onSaved: () => void;
}

export const BehaviorRecordModal: React.FC<BehaviorRecordModalProps> = ({
  student,
  currentUser,
  onClose,
  onSaved,
}) => {
  const today = getTodayDateString();
  const [behaviorType, setBehaviorType] = useState<'positive' | 'negative'>('positive');
  const [selectedPresetIndex, setSelectedPresetIndex] = useState<number>(0);
  const [title, setTitle] = useState(POSITIVE_BEHAVIOR_PRESETS[0].title);
  const [category, setCategory] = useState(POSITIVE_BEHAVIOR_PRESETS[0].category);
  const [points, setPoints] = useState<number>(POSITIVE_BEHAVIOR_PRESETS[0].points);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleTypeChange = (type: 'positive' | 'negative') => {
    setBehaviorType(type);
    setSelectedPresetIndex(0);
    const presets = type === 'positive' ? POSITIVE_BEHAVIOR_PRESETS : NEGATIVE_BEHAVIOR_PRESETS;
    setTitle(presets[0].title);
    setCategory(presets[0].category);
    setPoints(presets[0].points);
  };

  const handleSelectPreset = (index: number) => {
    setSelectedPresetIndex(index);
    const presets = behaviorType === 'positive' ? POSITIVE_BEHAVIOR_PRESETS : NEGATIVE_BEHAVIOR_PRESETS;
    const preset = presets[index];
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
      id: `beh-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      studentId: student.id,
      studentName: student.name,
      nationalId: student.nationalId,
      schoolCode: student.schoolCode,
      className: student.className || 'عام',
      sectionName: student.sectionName || '1',
      date: today,
      time: timeStr,
      type: behaviorType,
      points: Math.max(1, Math.min(10, points)),
      title: title.trim(),
      category: category.trim(),
      notes: notes.trim() || undefined,
      recordedById: currentUser.id,
      recordedByName: currentUser.name,
      recordedByRole: currentUser.role === 'teacher' ? 'teacher' : 'employee',
      createdAt: new Date().toISOString(),
    };

    addBehaviorLog(newLog);

    // Send instant system notification to Student and Parent
    addSystemNotification({
      id: `notif-beh-${Date.now()}`,
      title: behaviorType === 'positive' 
        ? `🌟 إشادة ورصد سلوك إيجابي: ${student.name}` 
        : `⚠️ إشعار ملاحظة سلوكية: ${student.name}`,
      message: behaviorType === 'positive'
        ? `قام المعلم (${currentUser.name}) برصد سلوك إيجابي [${title}] ومنح الطالب (+${points} نقاط).`
        : `قام المعلم (${currentUser.name}) برصد ملاحظة سلوكية [${title}] مع حسم (${points} درجات مواظبة).`,
      type: behaviorType === 'positive' ? 'success' : 'alert',
      targetRole: 'all',
      schoolCode: student.schoolCode,
      createdAt: new Date().toISOString(),
      read: false,
    });

    if (behaviorType === 'positive') {
      soundManager.playSuccess();
      confetti({ particleCount: 60, spread: 50, origin: { y: 0.6 } });
    } else {
      soundManager.playWarning();
    }

    onSaved();
  };

  const presets = behaviorType === 'positive' ? POSITIVE_BEHAVIOR_PRESETS : NEGATIVE_BEHAVIOR_PRESETS;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4" dir="rtl">
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-scaleIn">
        {/* Header */}
        <div className={`p-5 flex items-center justify-between border-b ${
          behaviorType === 'positive' 
            ? 'bg-emerald-50/80 border-emerald-200' 
            : 'bg-rose-50/80 border-rose-200'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
              behaviorType === 'positive' 
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20' 
                : 'bg-rose-600 text-white shadow-md shadow-rose-600/20'
            }`}>
              {behaviorType === 'positive' ? <Star className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="font-black text-slate-900 text-base">
                رصد السلوك والمواظبة اليومي
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

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Behavior Type Selector (Positive / Negative) */}
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => handleTypeChange('positive')}
              className={`py-3 px-4 rounded-2xl font-black text-xs flex items-center justify-center gap-2 border-2 transition-all cursor-pointer ${
                behaviorType === 'positive'
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-600/20'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <ThumbsUp className="w-4 h-4" />
              <span>سلوك إيجابي / تعزيز (+نقاط)</span>
            </button>

            <button
              type="button"
              onClick={() => handleTypeChange('negative')}
              className={`py-3 px-4 rounded-2xl font-black text-xs flex items-center justify-center gap-2 border-2 transition-all cursor-pointer ${
                behaviorType === 'negative'
                  ? 'bg-rose-600 text-white border-rose-600 shadow-md shadow-rose-600/20'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <ThumbsDown className="w-4 h-4" />
              <span>سلوك سلبي / مخالفة (-خصم)</span>
            </button>
          </div>

          {/* Preset Buttons */}
          <div className="space-y-2">
            <label className="block text-xs font-black text-slate-700">
              اختر السلوك أو الملاحظة من القائمة السريعة:
            </label>
            <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto p-1">
              {presets.map((preset, idx) => {
                const isSelected = selectedPresetIndex === idx;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectPreset(idx)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all cursor-pointer ${
                      isSelected
                        ? behaviorType === 'positive'
                          ? 'bg-emerald-100 text-emerald-950 border-emerald-400 shadow-xs'
                          : 'bg-rose-100 text-rose-950 border-rose-400 shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <span>{preset.icon}</span>
                    <span>{preset.title}</span>
                    <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-black ${
                      behaviorType === 'positive' ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
                    }`}>
                      {behaviorType === 'positive' ? `+${preset.points}` : `-${preset.points}`}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Points and Category Field */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-black text-slate-700 mb-1">
                {behaviorType === 'positive' ? 'نقاط التعزيز الممنوحة (+)' : 'الدرجات المخصومة (-)'}
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  max="10"
                  required
                  value={points}
                  onChange={(e) => setPoints(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-black text-slate-900 focus:outline-emerald-500"
                />
                <span className="text-xs font-bold text-slate-500">درجة</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-black text-slate-700 mb-1">التصنيف</label>
              <input
                type="text"
                required
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-emerald-500"
              />
            </div>
          </div>

          {/* Notes / Details */}
          <div>
            <label className="block text-xs font-black text-slate-700 mb-1">
              تفاصيل إضافية أو ملاحظات المعلم (اختياري - يظهر للطالب وولي الأمر)
            </label>
            <textarea
              rows={2}
              placeholder="مثال: تفاعل الطالب مع زملائه وحل المسألة الرياضية بتميز..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-emerald-500"
            />
          </div>

          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-[11px] text-slate-600 flex items-center gap-2">
            <Send className="w-4 h-4 text-slate-500 shrink-0" />
            <span>سيتم إرسال إشعار فوري لولي الأمر وحساب الطالب بتفاصيل هذا الرصد فور الحفظ.</span>
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
              className={`px-6 py-2.5 rounded-xl text-white text-xs font-black flex items-center gap-2 shadow-md cursor-pointer transition-all ${
                behaviorType === 'positive'
                  ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/20'
                  : 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/20'
              }`}
            >
              <Check className="w-4 h-4" />
              <span>{isSubmitting ? 'جاري الحفظ...' : 'حفظ ورصد السلوك الآن'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
