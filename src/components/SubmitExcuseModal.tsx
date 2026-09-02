import React, { useState } from 'react';
import { User, School, Attendance, CorrectionRequest } from '../types';
import { getAttendances, saveAttendances, addCorrectionRequest, addSystemNotification } from '../utils/storage';
import { compressImageFile } from '../utils/fileCompressor';
import { soundManager } from '../utils/audio';
import { getTodayDateString } from '../utils/academic';
import { 
  X, FileText, Upload, Check, AlertCircle, 
  Calendar, CheckCircle, Clock, ShieldCheck 
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface SubmitExcuseModalProps {
  student: User;
  currentSchool: School;
  submittedByRole: 'student' | 'parent';
  requesterName: string;
  defaultDate?: string;
  onClose: () => void;
  onSubmitted: () => void;
}

export const SubmitExcuseModal: React.FC<SubmitExcuseModalProps> = ({
  student,
  currentSchool,
  submittedByRole,
  requesterName,
  defaultDate,
  onClose,
  onSubmitted,
}) => {
  const today = getTodayDateString();
  const allAttendances = getAttendances().filter((a) => a.studentId === student.id);
  
  // Find absent records without accepted excuse
  const absentRecords = allAttendances.filter(
    (a) => a.finalStatus === 'absent' && a.excuseStatus !== 'accepted'
  );

  const [selectedDate, setSelectedDate] = useState<string>(
    defaultDate || (absentRecords[0]?.date || today)
  );
  const [excuseType, setExcuseType] = useState<'medical' | 'official' | 'emergency' | 'other'>('medical');
  const [reasonText, setReasonText] = useState('');
  const [attachmentBase64, setAttachmentBase64] = useState<string | null>(null);
  const [attachmentFileName, setAttachmentFileName] = useState<string>('');
  const [isCompressing, setIsCompressing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsCompressing(true);
    try {
      setAttachmentFileName(file.name);
      const compressed = await compressImageFile(file, 1200, 0.7);
      setAttachmentBase64(compressed);
    } catch {
      // Failed to compress, try basic FileReader
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setAttachmentBase64(reader.result);
        }
      };
      reader.readAsDataURL(file);
    } finally {
      setIsCompressing(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reasonText.trim()) return;

    setIsSubmitting(true);

    const targetAtt = allAttendances.find((a) => a.date === selectedDate);
    const attendanceId = targetAtt?.id || `att-${student.id}-${selectedDate}`;

    // 1. Create formal Correction/Excuse Request
    const newRequest: CorrectionRequest = {
      id: `excuse-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      attendanceId,
      studentId: student.id,
      studentName: student.name,
      nationalId: student.nationalId,
      schoolCode: student.schoolCode,
      className: student.className || 'عام',
      sectionName: student.sectionName || '1',
      date: selectedDate,
      requestedByRole: submittedByRole,
      requesterName,
      previousStatus: targetAtt?.finalStatus || 'absent',
      requestedStatus: 'excused',
      reason: reasonText.trim(),
      excuseType,
      attachmentUrl: attachmentBase64 || undefined,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    addCorrectionRequest(newRequest);

    // 2. Update the attendance record with pending excuse
    const allAtt = getAttendances();
    const idx = allAtt.findIndex((a) => a.studentId === student.id && a.date === selectedDate);
    if (idx >= 0) {
      allAtt[idx].excuseReason = reasonText.trim();
      allAtt[idx].excuseType = excuseType;
      allAtt[idx].excuseStatus = 'pending';
      allAtt[idx].excuseAttachment = attachmentBase64 || undefined;
      allAtt[idx].excuseSubmittedBy = submittedByRole;
      allAtt[idx].excuseSubmittedAt = new Date().toISOString();
      saveAttendances(allAtt);
    }

    // 3. Notify School Administration
    addSystemNotification({
      id: `notif-excuse-${Date.now()}`,
      title: `📄 تقديم عذر غياب جديد: ${student.name}`,
      message: `قام (${requesterName} - ${submittedByRole === 'parent' ? 'ولي الأمر' : 'الطالب'}) بتقديم عذر غياب ليوم (${selectedDate}) بانتظار الاعتماد.`,
      type: 'info',
      targetRole: 'employee',
      schoolCode: student.schoolCode,
      createdAt: new Date().toISOString(),
      read: false,
    });

    soundManager.playSuccess();
    confetti({ particleCount: 60, spread: 50, origin: { y: 0.6 } });

    onSubmitted();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4" dir="rtl">
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-scaleIn">
        {/* Header */}
        <div className="p-5 flex items-center justify-between border-b bg-gradient-to-l from-teal-50 to-emerald-50 border-teal-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-600 text-white flex items-center justify-center shadow-md shadow-teal-600/20">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-slate-900 text-base">
                تقديم عذر غياب / إجازة مرضية
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

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Target Date Selection */}
          <div>
            <label className="block text-xs font-black text-slate-700 mb-1.5 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-teal-600" />
              <span>تاريخ يوم الغياب المراد تقديم العذر عنه:</span>
            </label>
            {absentRecords.length > 0 ? (
              <select
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-teal-500"
              >
                {absentRecords.map((rec) => (
                  <option key={rec.id} value={rec.date}>
                    {rec.date} (غائب بدون عذر معتمد)
                  </option>
                ))}
                {!absentRecords.some((r) => r.date === selectedDate) && (
                  <option value={selectedDate}>{selectedDate}</option>
                )}
              </select>
            ) : (
              <input
                type="date"
                required
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-teal-500"
              />
            )}
          </div>

          {/* Excuse Category */}
          <div>
            <label className="block text-xs font-black text-slate-700 mb-1.5">
              نوع العذر:
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'medical', label: '🩺 إجازة / عذر مرضي', desc: 'تقرير صحي أو كشف طبي' },
                { id: 'official', label: '📋 مراجعة رسمية / مستشفى', desc: 'إشعار موعد أو جهة حكومية' },
                { id: 'emergency', label: '🏠 ظرف عائلي قاهر', desc: 'حالة وفاة أو طارئ أسري' },
                { id: 'other', label: '✍️ عذر مسبب آخر', desc: 'موافقة خاصة من الإدارة' },
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setExcuseType(t.id as any)}
                  className={`p-2.5 rounded-xl text-right border transition-all cursor-pointer ${
                    excuseType === t.id
                      ? 'bg-teal-50 text-teal-950 border-teal-400 ring-2 ring-teal-300/40 shadow-xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <span className="block font-black text-xs">{t.label}</span>
                  <span className="block text-[10px] text-slate-500">{t.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Reason Text */}
          <div>
            <label className="block text-xs font-black text-slate-700 mb-1">
              تفاصيل ومبررات العذر *
            </label>
            <textarea
              required
              rows={3}
              placeholder="اكتب تفاصيل سبب الغياب (مثال: مراجعة المستشفى وإجراء فحوصات طبية وتوصية بالراحة)..."
              value={reasonText}
              onChange={(e) => setReasonText(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-teal-500"
            />
          </div>

          {/* Attachment Upload */}
          <div>
            <label className="block text-xs font-black text-slate-700 mb-1">
              إرفاق التقرير الطبي أو المستند (صورة / PDF)
            </label>
            <div className="border border-dashed border-slate-300 rounded-2xl p-3 text-center bg-slate-50/50 hover:bg-slate-50 transition-colors">
              <input
                type="file"
                id="excuse-file-input"
                accept="image/*,application/pdf"
                onChange={handleFileUpload}
                className="hidden"
              />
              <label htmlFor="excuse-file-input" className="cursor-pointer space-y-1 block">
                <Upload className="w-5 h-5 mx-auto text-teal-600" />
                <span className="text-xs font-bold text-teal-800 block">
                  {isCompressing ? 'جاري معالجة المستند...' : attachmentFileName ? attachmentFileName : 'اضغط لاختيار صورة الإجازة أو التقرير'}
                </span>
                <span className="text-[10px] text-slate-400 block">يدعم الصور والمستندات بضغط تلقائي</span>
              </label>
            </div>
            {attachmentBase64 && (
              <div className="mt-2 flex items-center justify-between p-2 rounded-xl bg-teal-50 border border-teal-200 text-teal-900 text-xs">
                <span className="font-bold flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4 text-teal-600" />
                  <span>تم تجهيز المستند المرفق بنجاح</span>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setAttachmentBase64(null);
                    setAttachmentFileName('');
                  }}
                  className="text-rose-600 text-xs font-bold hover:underline"
                >
                  حذف
                </button>
              </div>
            )}
          </div>

          <div className="p-3 bg-teal-50 rounded-2xl border border-teal-200 text-[11px] text-teal-900 leading-relaxed">
            💡 <strong>ملاحظة هامة:</strong> عند قبول العذر من قبل إدارة المدرسة، سيتم تحويل حالة الغياب إلى <strong>(غائب بعذر)</strong> وتُستعاد درجة المواظبة المخصومة تلقائياً (+1 درجة).
          </div>

          {/* Actions */}
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
              disabled={isSubmitting || isCompressing}
              className="px-6 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-black flex items-center gap-2 shadow-md shadow-teal-600/20 cursor-pointer transition-all"
            >
              <Check className="w-4 h-4" />
              <span>{isSubmitting ? 'جاري الإرسال...' : 'إرسال العذر للمدرسة'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
