import React, { useState } from 'react';
import { Attendance, AttendanceStatus, CorrectionRequest, User } from '../types';
import { addCorrectionRequest } from '../utils/storage';
import { ShieldAlert, Check, X, Clock, FileEdit, AlertCircle } from 'lucide-react';

interface AttendanceCorrectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  attendance: Attendance;
  currentUser: User;
  onSuccess: () => void;
}

export const AttendanceCorrectionModal: React.FC<AttendanceCorrectionModalProps> = ({
  isOpen,
  onClose,
  attendance,
  currentUser,
  onSuccess,
}) => {
  const [requestedStatus, setRequestedStatus] = useState<AttendanceStatus>('present');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) return;

    setIsSubmitting(true);
    const req: CorrectionRequest = {
      id: `corr-${Date.now()}`,
      attendanceId: attendance.id,
      studentId: attendance.studentId,
      studentName: attendance.studentName,
      schoolCode: attendance.schoolCode,
      className: attendance.className,
      sectionName: attendance.sectionName,
      date: attendance.date,
      requestedByRole: currentUser.role as 'parent' | 'student' | 'teacher',
      requesterName: currentUser.name,
      previousStatus: attendance.finalStatus,
      requestedStatus,
      reason: reason.trim(),
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    addCorrectionRequest(req);
    setIsSubmitting(false);
    onSuccess();
    onClose();
  };

  return (
    <div 
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fadeIn" 
      dir="rtl"
    >
      <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 text-right space-y-5 shadow-2xl text-slate-800">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center">
              <FileEdit className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">طلب تصحيح أو تبرير رصد الحضور</h3>
              <p className="text-xs text-slate-500 font-medium">رفع طلب مراجعة لإدارة المدرسة</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs space-y-2">
          <div className="flex justify-between">
            <span className="text-slate-500">الطالب:</span>
            <strong className="text-slate-900 font-bold">{attendance.studentName}</strong>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">تاريخ اليوم:</span>
            <span className="font-mono text-slate-700 font-bold">{attendance.date}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">الحالة المرصودة الحالية:</span>
            <span className="px-2 py-0.5 rounded-md bg-rose-50 border border-rose-200 text-rose-800 font-bold">
              {attendance.finalStatus === 'absent' ? 'غائب' : attendance.finalStatus === 'late' ? 'متأخر' : 'حاضر'}
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-700 font-bold mb-1.5">الحالة المراد تصحيحها إليها:</label>
            <select
              value={requestedStatus}
              onChange={(e) => setRequestedStatus(e.target.value as AttendanceStatus)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-900 font-bold focus:outline-emerald-500"
            >
              <option value="present">حاضر (كان متواجداً في المدرسة)</option>
              <option value="excused">غائب بعذر مقبول</option>
              <option value="late">متأخر بعذر</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-700 font-bold mb-1.5">سبب طلب التصحيح والتوضيح *</label>
            <textarea
              required
              rows={3}
              placeholder="اكتب التوضيح أو سبب الخطأ في الرصد..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-900 focus:outline-emerald-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/20 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>إرسال الطلب للإدارة</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
