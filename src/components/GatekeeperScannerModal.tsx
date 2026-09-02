import React, { useState } from 'react';
import { School, User, Attendance } from '../types';
import { getAttendances, saveAttendances, getUsers } from '../utils/storage';
import { soundManager } from '../utils/audio';
import { getTodayDateString } from '../utils/academic';
import { 
  ScanLine, UserCheck, X, Check, LogOut, 
  LogIn, ShieldCheck, AlertCircle, Clock, User as UserIcon 
} from 'lucide-react';

interface GatekeeperScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  school: School;
}

type ScanMode = 'entry' | 'exit';

export const GatekeeperScannerModal: React.FC<GatekeeperScannerModalProps> = ({
  isOpen,
  onClose,
  school,
}) => {
  const [mode, setMode] = useState<ScanMode>('exit'); // default to exit or entry
  const [nationalIdInput, setNationalIdInput] = useState('');
  const [exitReason, setExitReason] = useState<'dismissal' | 'early_permission' | 'medical_emergency' | 'other'>('dismissal');
  const [pickupPersonName, setPickupPersonName] = useState('');
  
  const [lastScannedEntry, setLastScannedEntry] = useState<{
    student: User;
    time: string;
    isLate: boolean;
  } | null>(null);

  const [lastScannedExit, setLastScannedExit] = useState<{
    student: User;
    time: string;
    reason: string;
    pickupPerson?: string;
  } | null>(null);

  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  if (!isOpen) return null;

  const handleProcessScan = (nid: string) => {
    setErrorMsg('');
    setSuccessMsg('');
    const cleanNid = nid.trim().replace(/\D/g, '');
    if (!cleanNid) return;

    const allUsers = getUsers();
    const student = allUsers.find(
      (u) => u.role === 'student' && u.nationalId === cleanNid && u.schoolCode === school.code
    );

    if (!student) {
      soundManager.playWarning();
      setErrorMsg(`لم يتم العثور على طالب برقم الهوية (${cleanNid}) في كشوفات هذه المدرسة.`);
      return;
    }

    const today = getTodayDateString();
    const now = new Date();
    const currentTimeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const attendances = getAttendances();
    const existingIdx = attendances.findIndex((a) => a.studentId === student.id && a.date === today);

    if (mode === 'entry') {
      // 1. ENTRY (دخول صباحي)
      const isLate = now.getHours() > 7 || (now.getHours() === 7 && now.getMinutes() > 15);

      if (existingIdx >= 0) {
        attendances[existingIdx].selfCheckTime = currentTimeStr;
        attendances[existingIdx].finalStatus = isLate ? 'late' : 'present';
      } else {
        attendances.push({
          id: `att-${student.id}-${today}`,
          studentId: student.id,
          studentName: student.name,
          nationalId: student.nationalId,
          schoolCode: school.code,
          className: student.className || 'عام',
          sectionName: student.sectionName || '1',
          date: today,
          selfCheckTime: currentTimeStr,
          teacherMark: null,
          finalStatus: isLate ? 'late' : 'present',
          isTruant: false,
          parentMobile: student.parentMobile,
        });
      }

      saveAttendances(attendances);
      soundManager.playSuccess();
      setLastScannedEntry({
        student,
        time: currentTimeStr,
        isLate,
      });
      setLastScannedExit(null);
      setSuccessMsg(`✅ تم تسجيل حضور الطالب: ${student.name}`);
    } else {
      // 2. EXIT (تأكيد خروج وانصراف من المدرسة)
      const reasonLabel = 
        exitReason === 'dismissal' ? 'انصراف نهاية الدوام' :
        exitReason === 'early_permission' ? 'خروج مبكر بإذن ولي الأمر' :
        exitReason === 'medical_emergency' ? 'خروج للعيادة / طارئ صحي' : 'استئذان رسمي';

      if (existingIdx >= 0) {
        attendances[existingIdx].exitTime = currentTimeStr;
        attendances[existingIdx].exitReason = exitReason;
        attendances[existingIdx].exitConfirmedBy = 'مراقب البوابة / الحارس';
        if (pickupPersonName.trim()) {
          attendances[existingIdx].pickupPersonName = pickupPersonName.trim();
        }
      } else {
        attendances.push({
          id: `att-${student.id}-${today}`,
          studentId: student.id,
          studentName: student.name,
          nationalId: student.nationalId,
          schoolCode: school.code,
          className: student.className || 'عام',
          sectionName: student.sectionName || '1',
          date: today,
          selfCheckTime: null,
          teacherMark: null,
          finalStatus: 'present',
          isTruant: false,
          parentMobile: student.parentMobile,
          exitTime: currentTimeStr,
          exitReason: exitReason,
          exitConfirmedBy: 'مراقب البوابة / الحارس',
          pickupPersonName: pickupPersonName.trim() || undefined,
        });
      }

      saveAttendances(attendances);
      soundManager.playSuccess();
      setLastScannedExit({
        student,
        time: currentTimeStr,
        reason: reasonLabel,
        pickupPerson: pickupPersonName.trim() || undefined,
      });
      setLastScannedEntry(null);
      setSuccessMsg(`🚪 تم تأكيد خروج وانصراف الطالب: ${student.name} في تمام الساعة ${currentTimeStr}`);
    }

    setNationalIdInput('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleProcessScan(nationalIdInput);
  };

  // List of students checked out today
  const todayAttendances = getAttendances().filter((a) => a.schoolCode === school.code && a.date === getTodayDateString());
  const checkedOutList = todayAttendances.filter((a) => !!a.exitTime);

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
            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center border ${
              mode === 'exit' 
                ? 'bg-amber-50 text-amber-700 border-amber-200' 
                : 'bg-teal-50 text-teal-700 border-teal-200'
            }`}>
              {mode === 'exit' ? <LogOut className="w-5 h-5" /> : <LogIn className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">ماسح البوابة الإلكتروني ومراقبة الانصراف</h3>
              <p className="text-xs text-slate-500 font-medium">مسح الباركود أو إدخال الهوية لتسجيل الدخول أو تأكيد الخروج</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Selector Tabs (دخول vs خروج) */}
        <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1.5 rounded-2xl">
          <button
            type="button"
            onClick={() => {
              setMode('exit');
              setErrorMsg('');
              setSuccessMsg('');
            }}
            className={`py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
              mode === 'exit'
                ? 'bg-white text-amber-900 shadow-xs border border-slate-200/80 font-black'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <LogOut className="w-4 h-4 text-amber-600" />
            <span>تأكيد خروج وانصراف الطالب 🚪</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setMode('entry');
              setErrorMsg('');
              setSuccessMsg('');
            }}
            className={`py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
              mode === 'entry'
                ? 'bg-white text-teal-900 shadow-xs border border-slate-200/80 font-black'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <LogIn className="w-4 h-4 text-teal-600" />
            <span>تسجيل دخول الصباح ☀️</span>
          </button>
        </div>

        {/* Additional Exit Settings if Exit Mode */}
        {mode === 'exit' && (
          <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-3.5 space-y-2.5 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-bold text-amber-950">سبب الخروج من المدرسة:</span>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => setExitReason('dismissal')}
                  className={`px-2.5 py-1 rounded-lg font-bold text-[11px] cursor-pointer transition-colors ${
                    exitReason === 'dismissal' 
                      ? 'bg-amber-700 text-white shadow-xs' 
                      : 'bg-white text-slate-700 border border-amber-200 hover:bg-amber-100/50'
                  }`}
                >
                  انصراف نهاية الدوام
                </button>
                <button
                  type="button"
                  onClick={() => setExitReason('early_permission')}
                  className={`px-2.5 py-1 rounded-lg font-bold text-[11px] cursor-pointer transition-colors ${
                    exitReason === 'early_permission' 
                      ? 'bg-amber-700 text-white shadow-xs' 
                      : 'bg-white text-slate-700 border border-amber-200 hover:bg-amber-100/50'
                  }`}
                >
                  خروج مبكر بإذن
                </button>
                <button
                  type="button"
                  onClick={() => setExitReason('medical_emergency')}
                  className={`px-2.5 py-1 rounded-lg font-bold text-[11px] cursor-pointer transition-colors ${
                    exitReason === 'medical_emergency' 
                      ? 'bg-amber-700 text-white shadow-xs' 
                      : 'bg-white text-slate-700 border border-amber-200 hover:bg-amber-100/50'
                  }`}
                >
                  عيادة / طارئ
                </button>
              </div>
            </div>

            {exitReason === 'early_permission' && (
              <div className="pt-1.5 border-t border-amber-200/60 flex items-center gap-2">
                <span className="text-amber-900 font-medium shrink-0">اسم المستلم / المرافق:</span>
                <input
                  type="text"
                  placeholder="مثال: ولي الأمر / السائق المعتمد..."
                  value={pickupPersonName}
                  onChange={(e) => setPickupPersonName(e.target.value)}
                  className="w-full bg-white border border-amber-200 rounded-lg px-2.5 py-1 text-xs text-slate-900 focus:outline-amber-600"
                />
              </div>
            )}
          </div>
        )}

        {/* Input for Barcode Gun or Manual NID */}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs text-slate-700 font-bold mb-1.5">
              امسح بطاقة الطالب بجهاز قارئ الباركود أو أدخل رقم الهوية:
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                autoFocus
                placeholder="امسح الرمز أو اكتب رقم هوية الطالب (10 أرقام)..."
                value={nationalIdInput}
                onChange={(e) => setNationalIdInput(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-900 font-mono text-xs focus:outline-emerald-500"
              />
              <button
                type="submit"
                className={`px-5 py-2.5 rounded-xl text-white font-bold text-xs shrink-0 flex items-center gap-1.5 cursor-pointer shadow-sm transition-colors ${
                  mode === 'exit' ? 'bg-amber-700 hover:bg-amber-600' : 'bg-emerald-600 hover:bg-emerald-500'
                }`}
              >
                {mode === 'exit' ? <LogOut className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                <span>{mode === 'exit' ? 'تأكيد الخروج' : 'تسجيل الدخول'}</span>
              </button>
            </div>
          </div>
        </form>

        {/* Alerts & Feedback */}
        {errorMsg && (
          <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2 animate-fadeIn">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Exit Scan Result Card */}
        {lastScannedExit && (
          <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-4 space-y-2 animate-fadeIn">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-amber-600 text-white flex items-center justify-center font-bold">
                  <LogOut className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-slate-900">{lastScannedExit.student.name}</h4>
                  <span className="text-[11px] text-slate-500 font-medium">
                    {lastScannedExit.student.className} - فصل {lastScannedExit.student.sectionName} | هوية: {lastScannedExit.student.nationalId}
                  </span>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-lg text-xs font-black bg-amber-200/80 text-amber-950 border border-amber-300">
                🚪 تم تأكيد الخروج
              </span>
            </div>

            <div className="text-[11px] text-slate-600 grid grid-cols-2 gap-2 pt-2 border-t border-amber-200/60">
              <div>
                <span className="text-slate-400">وقت الخروج: </span>
                <strong className="font-mono text-amber-900 font-bold">{lastScannedExit.time}</strong>
              </div>
              <div>
                <span className="text-slate-400">السبب: </span>
                <strong className="text-slate-800 font-bold">{lastScannedExit.reason}</strong>
              </div>
              {lastScannedExit.pickupPerson && (
                <div className="col-span-2 text-slate-700">
                  <span className="text-slate-400">المستلم: </span>
                  <strong className="text-slate-900 font-bold">{lastScannedExit.pickupPerson}</strong>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Entry Scan Result Card */}
        {lastScannedEntry && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 space-y-2 animate-fadeIn">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                  ✓
                </div>
                <div>
                  <h4 className="text-sm font-black text-slate-900">{lastScannedEntry.student.name}</h4>
                  <span className="text-[11px] text-slate-500 font-medium">
                    {lastScannedEntry.student.className} - فصل {lastScannedEntry.student.sectionName} | هوية: {lastScannedEntry.student.nationalId}
                  </span>
                </div>
              </div>
              <span className={`px-2.5 py-1 rounded-lg text-xs font-black ${
                lastScannedEntry.isLate 
                  ? 'bg-amber-100 text-amber-900 border border-amber-200' 
                  : 'bg-emerald-100 text-emerald-900 border border-emerald-200'
              }`}>
                {lastScannedEntry.isLate ? 'متأخر ⏰' : 'حاضر في الموعد ✓'}
              </span>
            </div>
            <div className="text-[11px] text-slate-600 flex justify-between pt-1 border-t border-emerald-200/60">
              <span>وقت تسجيل الدخول:</span>
              <span className="font-mono text-emerald-800 font-bold">{lastScannedEntry.time}</span>
            </div>
          </div>
        )}

        {/* Live List of Dismissed / Exited Students Today */}
        <div className="space-y-2 pt-1 border-t border-slate-200">
          <div className="flex items-center justify-between text-xs font-bold text-slate-700">
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-600" />
              <span>الطلاب الذين تم تأكيد خروجهم اليوم ({checkedOutList.length}):</span>
            </span>
          </div>

          <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
            {checkedOutList.length === 0 ? (
              <p className="text-[11px] text-slate-400 text-center py-2 bg-slate-50 rounded-xl">
                لم يتم تسجيل خروج أي طالب حتى الآن
              </p>
            ) : (
              checkedOutList.map((st) => (
                <div 
                  key={st.id} 
                  className="bg-slate-50 border border-slate-200/80 rounded-xl px-3 py-2 flex items-center justify-between text-[11px]"
                >
                  <div>
                    <strong className="text-slate-900 font-bold">{st.studentName}</strong>
                    <span className="text-slate-500 mx-1.5">({st.className} - فصل {st.sectionName})</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-amber-800 bg-amber-100/80 font-mono px-2 py-0.5 rounded-md font-bold">
                      {st.exitTime}
                    </span>
                    <span className="text-slate-500 text-[10px]">
                      {st.exitReason === 'dismissal' ? 'انصراف' : 'إذن خروج'}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="pt-2">
          <button
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
