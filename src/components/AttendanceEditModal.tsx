import React, { useState } from 'react';
import { Attendance, User, AttendanceStatus } from '../types';
import { adminUpdateAttendance, deleteAttendance, addSystemNotification } from '../utils/storage';
import { soundManager } from '../utils/audio';
import { 
  X, CheckCircle, AlertTriangle, XCircle, Trash2, 
  Save, Clock, Calendar, Wrench, ShieldCheck, FileText, Bell 
} from 'lucide-react';

interface AttendanceEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  attendance: Attendance | null;
  studentName: string;
  currentUser: User;
  onSaved: () => void;
}

const REASON_PRESETS = [
  'تصحيح إداري: عطل تقني في قارئ الباركود عند البوابة',
  'تصحيح إداري: انقطاع شبكة الإنترنت أثناء فترة الاصطفاف',
  'تصحيح إداري: خطأ غير مقصود في الرصد وتم التحقق من حضور الطالب',
  'تصحيح إداري: الطالب كان متواجداً بمكتب الإدارة / النشاط المدرسي',
  'إذن وموافقة مسبقة من إدارة المدرسة',
];

export const AttendanceEditModal: React.FC<AttendanceEditModalProps> = ({
  isOpen,
  onClose,
  attendance,
  studentName,
  currentUser,
  onSaved,
}) => {
  if (!isOpen || !attendance) return null;

  const [status, setStatus] = useState<AttendanceStatus>(attendance.finalStatus);
  const [excuseStatus, setExcuseStatus] = useState<'none' | 'accepted' | 'rejected'>(
    attendance.excuseStatus === 'accepted' ? 'accepted' : 'none'
  );
  const [selfCheckTime, setSelfCheckTime] = useState<string>(attendance.selfCheckTime || '07:15 ص');
  const [notes, setNotes] = useState<string>(
    attendance.adminDecisionNotes || 'تصحيح إداري بسبب عطل تقني في النظام'
  );
  const [notifyParent, setNotifyParent] = useState<boolean>(true);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState<boolean>(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    const updates: Partial<Attendance> = {
      finalStatus: status,
      teacherMark: status,
      selfCheckTime: status === 'present' ? (selfCheckTime || '07:15 ص') : null,
      adminDecisionNotes: notes.trim(),
      excuseStatus: status === 'absent' && excuseStatus === 'accepted' ? 'accepted' : undefined,
      isTruant: false,
    };

    adminUpdateAttendance(attendance.id, updates, currentUser.name);

    if (notifyParent) {
      addSystemNotification({
        id: `notif-att-edit-${Date.now()}`,
        schoolCode: attendance.schoolCode,
        title: '✅ تصحيح سجل الحضور والغياب (إدارة المدرسة)',
        message: `نحيطكم علماً بأنه تم مراجعة وتصحيح رصد يوم (${attendance.date}) للطالب (${studentName}) إلى: (${
          status === 'present' ? 'حاضر' : status === 'late' ? 'متأخر' : 'غياب بعذر'
        }). السبب: ${notes.trim()}`,
        type: 'info',
        createdAt: new Date().toISOString(),
      });
    }

    soundManager.playSuccess();
    onSaved();
    onClose();
  };

  const handleDelete = () => {
    deleteAttendance(attendance.id);

    if (notifyParent) {
      addSystemNotification({
        id: `notif-att-del-${Date.now()}`,
        schoolCode: attendance.schoolCode,
        title: '🗑️ إلغاء وحذف غياب مسجل بالخطأ (إدارة المدرسة)',
        message: `تم إلغاء وحذف سجل الغياب غير الصحيح ليوم (${attendance.date}) للطالب (${studentName}) نهائياً لتدارك عطل في نظام الرصد.`,
        type: 'info',
        createdAt: new Date().toISOString(),
      });
    }

    soundManager.playSuccess();
    onSaved();
    onClose();
  };

  return (
    <div 
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      className="fixed inset-0 z-60 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-fadeIn"
      dir="rtl"
    >
      <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full p-6 text-right space-y-4 shadow-2xl text-slate-800 my-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">تعديل سجل الحضور والغياب</h3>
              <p className="text-xs text-slate-500 font-medium">
                الطالب: <strong className="text-slate-800">{studentName}</strong> | تاريخ: <strong className="font-mono text-slate-800">{attendance.date}</strong>
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSave} className="space-y-4">
          
          {/* Status Options */}
          <div>
            <label className="block text-xs font-black text-slate-700 mb-2">
              الحالة الجديدة المطلوبة:
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setStatus('present')}
                className={`py-2.5 px-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 cursor-pointer transition-all ${
                  status === 'present'
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-800 shadow-xs'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <CheckCircle className={`w-4 h-4 ${status === 'present' ? 'text-emerald-600' : 'text-slate-400'}`} />
                <span>حاضر (تصحيح عطل)</span>
              </button>

              <button
                type="button"
                onClick={() => setStatus('late')}
                className={`py-2.5 px-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 cursor-pointer transition-all ${
                  status === 'late'
                    ? 'bg-amber-50 border-amber-500 text-amber-800 shadow-xs'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Clock className={`w-4 h-4 ${status === 'late' ? 'text-amber-600' : 'text-slate-400'}`} />
                <span>متأخر</span>
              </button>

              <button
                type="button"
                onClick={() => setStatus('absent')}
                className={`py-2.5 px-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 cursor-pointer transition-all ${
                  status === 'absent'
                    ? 'bg-rose-50 border-rose-500 text-rose-800 shadow-xs'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <XCircle className={`w-4 h-4 ${status === 'absent' ? 'text-rose-600' : 'text-slate-400'}`} />
                <span>غائب</span>
              </button>
            </div>
          </div>

          {/* If absent, choose excuse type */}
          {status === 'absent' && (
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 space-y-2 text-xs">
              <label className="font-bold text-slate-700 block">نوع الغياب:</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setExcuseStatus('accepted')}
                  className={`flex-1 py-1.5 px-2 rounded-lg border font-medium ${
                    excuseStatus === 'accepted' ? 'bg-emerald-100 border-emerald-400 text-emerald-800' : 'bg-white border-slate-200'
                  }`}
                >
                  غائب بعذر رسمي مقبول
                </button>
                <button
                  type="button"
                  onClick={() => setExcuseStatus('none')}
                  className={`flex-1 py-1.5 px-2 rounded-lg border font-medium ${
                    excuseStatus === 'none' ? 'bg-rose-100 border-rose-400 text-rose-800' : 'bg-white border-slate-200'
                  }`}
                >
                  غائب بدون عذر
                </button>
              </div>
            </div>
          )}

          {/* Time input if present or late */}
          {(status === 'present' || status === 'late') && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                وقت الحضور المسجل:
              </label>
              <input
                type="text"
                value={selfCheckTime}
                onChange={(e) => setSelfCheckTime(e.target.value)}
                placeholder="مثال: 07:15 ص"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 focus:outline-emerald-500"
              />
            </div>
          )}

          {/* Presets */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              أسباب وتبريرات جاهزة للاختيار السريع:
            </label>
            <div className="flex flex-wrap gap-1.5">
              {REASON_PRESETS.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setNotes(preset)}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-medium transition-colors cursor-pointer text-right"
                >
                  + {preset}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              ملاحظات القرار الإداري وتفاصيل التصحيح:
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="اكتب سبب التعديل أو العطل التقني..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 focus:outline-emerald-500"
            />
          </div>

          {/* Notification Checkbox */}
          <label className="flex items-center gap-2 p-2.5 rounded-xl bg-indigo-50/70 border border-indigo-100 text-indigo-900 text-xs cursor-pointer select-none">
            <input
              type="checkbox"
              checked={notifyParent}
              onChange={(e) => setNotifyParent(e.target.checked)}
              className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
            />
            <Bell className="w-3.5 h-3.5 text-indigo-600" />
            <span className="font-bold">إرسال إشعار فوري لولي الأمر بتصحيح الحالة وإزالة القلق</span>
          </label>

          {/* Actions */}
          <div className="pt-2 flex flex-col gap-2">
            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/20 cursor-pointer transition-colors"
            >
              <Save className="w-4 h-4" />
              <span>حفظ التعديل وتحديث السجل فوراً</span>
            </button>

            {/* Permanent Delete Option */}
            {!isConfirmingDelete ? (
              <button
                type="button"
                onClick={() => setIsConfirmingDelete(true)}
                className="w-full py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                <span>حذف هذا السجل نهائياً من النظام 🗑️</span>
              </button>
            ) : (
              <div className="bg-rose-50 border border-rose-300 rounded-2xl p-3 text-center space-y-2 animate-fadeIn">
                <p className="text-xs font-black text-rose-900">
                  هل أنت متأكد من حذف هذا السجل نهائياً؟
                </p>
                <p className="text-[11px] text-rose-700">
                  سيتم شطب الغياب تماماً وكأنه لم يكن، ولن يظهر في حساب ولي الأمر نهائياً.
                </p>
                <div className="flex items-center justify-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleDelete}
                    className="px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs cursor-pointer shadow-xs"
                  >
                    نعم، حذف نهائي 🗑️
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsConfirmingDelete(false)}
                    className="px-3 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs cursor-pointer"
                  >
                    تراجع
                  </button>
                </div>
              </div>
            )}
          </div>
        </form>

      </div>
    </div>
  );
};
