import React, { useState, useMemo } from 'react';
import { User, StudentBehaviorLog } from '../types';
import { addBehaviorLog, addSystemNotification } from '../utils/storage';
import { getTodayDateString } from '../utils/academic';
import { soundManager } from '../utils/audio';
import { POSITIVE_BEHAVIOR_PRESETS, NEGATIVE_BEHAVIOR_PRESETS } from '../utils/behavior';
import { 
  X, ThumbsUp, ThumbsDown, Star, AlertTriangle, 
  Check, Sparkles, Send, ShieldAlert, Award, Search, Users
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface BehaviorRecordModalProps {
  isOpen?: boolean;
  student?: User | null;
  allSchoolStudents?: User[];
  currentUser: User;
  currentSchool?: any;
  onClose: () => void;
  onSaved: () => void;
}

export const BehaviorRecordModal: React.FC<BehaviorRecordModalProps> = ({
  student: initialStudent,
  allSchoolStudents = [],
  currentUser,
  onClose,
  onSaved,
}) => {
  const today = getTodayDateString();
  const [selectedStudentId, setSelectedStudentId] = useState<string>(initialStudent?.id || '');
  const [studentSearch, setStudentSearch] = useState('');

  const targetStudent = useMemo(() => {
    if (initialStudent) return initialStudent;
    return allSchoolStudents.find((s) => s.id === selectedStudentId) || null;
  }, [initialStudent, allSchoolStudents, selectedStudentId]);

  const filteredStudents = useMemo(() => {
    if (!studentSearch.trim()) return allSchoolStudents.slice(0, 8);
    const q = studentSearch.trim().toLowerCase();
    return allSchoolStudents
      .filter(
        (s) =>
          s.name?.toLowerCase().includes(q) ||
          s.nationalId?.includes(q) ||
          s.className?.includes(q)
      )
      .slice(0, 10);
  }, [allSchoolStudents, studentSearch]);

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
    if (!targetStudent || !title.trim()) return;

    setIsSubmitting(true);
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const newLog: StudentBehaviorLog = {
      id: `beh-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      studentId: targetStudent.id,
      studentName: targetStudent.name,
      nationalId: targetStudent.nationalId,
      schoolCode: targetStudent.schoolCode,
      className: targetStudent.className || 'عام',
      sectionName: targetStudent.sectionName || '1',
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
        ? `🌟 إشادة ورصد سلوك إيجابي: ${targetStudent.name}` 
        : `⚠️ إشعار ملاحظة سلوكية: ${targetStudent.name}`,
      message: behaviorType === 'positive'
        ? `قام (${currentUser.name}) برصد سلوك إيجابي [${title}] ومنح الطالب (+${points} نقاط).`
        : `تم رصد ملاحظة سلوكية [${title}] مع حسم (${points} درجات مواظبة).`,
      type: behaviorType === 'positive' ? 'success' : 'alert',
      targetRole: 'all',
      schoolCode: targetStudent.schoolCode,
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
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto" dir="rtl">
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-scaleIn my-auto">
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
              {targetStudent ? (
                <p className="text-xs text-slate-600 font-bold">
                  الطالب: {targetStudent.name} ({targetStudent.className || 'عام'} - {targetStudent.sectionName || '1'})
                </p>
              ) : (
                <p className="text-xs text-amber-700 font-bold">
                  الرجاء تحديد الطالب من القائمة أدناه
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-white/60 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Dynamic Student Selector if initialStudent wasn't provided */}
        {!initialStudent && (
          <div className="p-3.5 bg-slate-50 border-b border-slate-200 space-y-2 text-xs">
            <label className="block font-bold text-slate-700">
              اختر الطالب المراد رصد السلوك له:
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
              <input
                type="text"
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                placeholder="ابحث باسم الطالب أو سجله المدني..."
                className="w-full bg-white border border-slate-200 rounded-xl pr-9 pl-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-emerald-500"
              />
            </div>
            {filteredStudents.length > 0 && !targetStudent && (
              <div className="max-h-32 overflow-y-auto space-y-1 bg-white border border-slate-200 rounded-xl p-1.5 shadow-xs">
                {filteredStudents.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => {
                      setSelectedStudentId(s.id);
                      setStudentSearch('');
                    }}
                    className="w-full text-right p-2 rounded-lg hover:bg-emerald-50 flex items-center justify-between text-xs cursor-pointer transition-colors"
                  >
                    <span className="font-bold text-slate-900">{s.name}</span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {s.className} ({s.nationalId})
                    </span>
                  </button>
                ))}
              </div>
            )}
            {targetStudent && (
              <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-xl p-2 text-xs">
                <span className="font-black text-emerald-900">
                  تم اختيار: {targetStudent.name} ({targetStudent.className || 'عام'})
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedStudentId('')}
                  className="text-[11px] text-rose-600 font-bold hover:underline cursor-pointer"
                >
                  تغيير الطالب ✕
                </button>
              </div>
            )}
          </div>
        )}

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
