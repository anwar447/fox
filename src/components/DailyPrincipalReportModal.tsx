import React, { useRef } from 'react';
import { School, User, Attendance } from '../types';
import { getHijriDateInfo, getTodayDateString } from '../utils/academic';
import { Printer, X, Building2, UserCheck, ShieldCheck, FileSpreadsheet, Archive } from 'lucide-react';

interface DailyPrincipalReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  school: School;
  attendances: Attendance[];
  users: User[];
  noorDailyAbsence: number;
  reportDate?: string;
}

export function DailyPrincipalReportModal({
  isOpen,
  onClose,
  school,
  attendances,
  users,
  noorDailyAbsence,
  reportDate = getTodayDateString(),
}: DailyPrincipalReportModalProps) {
  const printRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  const dateObj = new Date(reportDate);
  const dateInfo = getHijriDateInfo(dateObj);

  // Filter students for this school
  const schoolStudents = users.filter(
    (u) => u.role === 'student' && (u.schoolCode === school.code || u.schoolCode === 'RAYA-1448')
  );

  // Filter attendances for today & school
  const todayAttendances = attendances.filter(
    (a) => a.date === reportDate && (a.schoolCode === school.code || a.schoolCode === 'RAYA-1448')
  );

  const totalStudents = schoolStudents.length || 1;
  const presentCount = todayAttendances.filter((a) => a.finalStatus === 'present').length;
  const selfCheckCount = todayAttendances.filter((a) => a.selfCheckTime !== null).length;
  const absentCount = todayAttendances.filter((a) => a.finalStatus === 'absent').length;
  const excusedCount = todayAttendances.filter((a) => a.finalStatus === 'excused').length;
  const lateCount = todayAttendances.filter((a) => a.finalStatus === 'late').length;

  const attendancePercentage = Math.round(((presentCount + excusedCount) / totalStudents) * 100);

  // Group by Class & Section (General statistical metrics without student names)
  const sectionsMap = new Map<string, { className: string; sectionName: string; students: User[]; attendances: Attendance[] }>();

  schoolStudents.forEach((st) => {
    const key = `${st.className || 'الصف الأول'} - ${st.sectionName || '1'}`;
    if (!sectionsMap.has(key)) {
      sectionsMap.set(key, {
        className: st.className || 'الصف الأول',
        sectionName: st.sectionName || '1',
        students: [],
        attendances: [],
      });
    }
    const group = sectionsMap.get(key)!;
    group.students.push(st);
    const att = todayAttendances.find((a) => a.studentId === st.id || a.nationalId === st.nationalId);
    if (att) group.attendances.push(att);
  });

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-2 sm:p-6" dir="rtl">
      
      {/* Top Floating Control Bar */}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-slate-900/95 text-white px-5 py-2.5 rounded-full shadow-2xl border border-white/20 print:hidden">
        <button
          onClick={handlePrint}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-4 py-1.5 rounded-full transition-colors cursor-pointer shadow-md"
        >
          <Printer className="w-4 h-4" />
          <span>طباعة تقرير المدير (مؤشرات رقمية عامة)</span>
        </button>

        <span className="opacity-30">|</span>

        <button
          onClick={onClose}
          className="flex items-center gap-1.5 text-slate-300 hover:text-white text-xs font-bold transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
          <span>إغلاق</span>
        </button>
      </div>

      {/* Printable Sheet Container */}
      <div 
        ref={printRef}
        className="bg-white text-slate-900 rounded-2xl shadow-2xl max-w-4xl w-full p-8 sm:p-12 overflow-y-auto max-h-[90vh] my-12 border border-slate-300 print:m-0 print:p-6 print:max-h-none print:shadow-none print:rounded-none print:border-none"
      >
        
        {/* Official Header */}
        <div className="border-b-2 border-slate-900 pb-5 mb-6">
          <div className="flex items-center justify-between">
            {/* Right: Ministry Info */}
            <div className="text-right space-y-0.5 text-xs font-bold text-slate-800">
              <p>المملكة العربية السعودية</p>
              <p>وزارة التعليم</p>
              <p>{school.educationOffice || 'الإدارة العامة للتعليم بمنطقة الرياض'}</p>
              <p className="text-emerald-800 font-black text-sm">{school.name}</p>
              <p className="font-mono text-[11px] text-slate-600">الرقم الإحصائي / الوزاري: {school.code}</p>
            </div>

            {/* Center: Emblem & Title */}
            <div className="text-center space-y-1">
              <div className="w-14 h-14 mx-auto rounded-full border-2 border-emerald-800 flex items-center justify-center p-1 bg-emerald-50">
                <Building2 className="w-8 h-8 text-emerald-800" />
              </div>
              <h1 className="text-lg sm:text-xl font-black text-slate-900">
                تقرير الانضباط المدرسي اليومي
              </h1>
              <p className="text-xs font-bold text-emerald-900 bg-emerald-50 border border-emerald-200 px-3 py-0.5 rounded-full inline-block">
                تقرير موجز مرفوع لسعادة مدير المدرسة / {school.managerName}
              </p>
              <p className="text-[11px] text-slate-500 font-bold">
                (مؤشرات إحصائية ورقمية عامة لنسب الحضور والانضباط)
              </p>
            </div>

            {/* Left: Date & Time Info */}
            <div className="text-left space-y-0.5 text-xs font-bold text-slate-800">
              <p>اليوم: <span className="text-emerald-800">{dateInfo.dayName}</span></p>
              <p>التاريخ الهجري: <span className="font-mono">{dateInfo.hijri}</span></p>
              <p>التاريخ الميلادي: <span className="font-mono">{reportDate}</span></p>
              <p className="text-[11px] text-slate-500 font-mono">وقت الإصدار: {new Date().toLocaleTimeString('ar-SA')}</p>
            </div>
          </div>
        </div>

        {/* Statistical KPI Table */}
        <div className="mb-6">
          <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-700 inline-block"></span>
            أولاً: ملخص المؤشرات الإحصائية العامة لليوم
          </h3>

          <div className="grid grid-cols-4 gap-2 text-center text-xs">
            <div className="border border-slate-300 rounded-lg p-2.5 bg-slate-50">
              <span className="text-slate-600 block text-[11px] font-bold">إجمالي طلاب المدرسة</span>
              <strong className="text-base font-black text-slate-900">{totalStudents}</strong>
            </div>

            <div className="border border-emerald-300 rounded-lg p-2.5 bg-emerald-50/70">
              <span className="text-emerald-800 block text-[11px] font-bold">نسبة الحضور الإجمالية</span>
              <strong className="text-base font-black text-emerald-700">{attendancePercentage}%</strong>
            </div>

            <div className="border border-slate-300 rounded-lg p-2.5 bg-slate-50">
              <span className="text-slate-600 block text-[11px] font-bold">الحضور الفعلي (حاضر)</span>
              <strong className="text-base font-black text-emerald-600">{presentCount}</strong>
            </div>

            <div className="border border-rose-300 rounded-lg p-2.5 bg-rose-50/70">
              <span className="text-rose-800 block text-[11px] font-bold">الغياب الكلي في المنظومة</span>
              <strong className="text-base font-black text-rose-700">{absentCount}</strong>
            </div>

            <div className="border-2 border-indigo-400 rounded-lg p-2.5 bg-indigo-50/80">
              <span className="text-indigo-900 block text-[11px] font-black">الغياب المسجل في نظام نور</span>
              <strong className="text-base font-black text-indigo-700">{noorDailyAbsence} طالب</strong>
            </div>

            <div className="border border-slate-300 rounded-lg p-2.5 bg-slate-50">
              <span className="text-slate-600 block text-[11px] font-bold">الحضور بالبصمة الذاتية</span>
              <strong className="text-base font-black text-teal-700">{selfCheckCount}</strong>
            </div>

            <div className="border border-amber-300 rounded-lg p-2.5 bg-amber-50">
              <span className="text-amber-800 block text-[11px] font-bold">المتأخرون صباحاً</span>
              <strong className="text-base font-black text-amber-700">{lateCount}</strong>
            </div>

            <div className="border border-sky-300 rounded-lg p-2.5 bg-sky-50">
              <span className="text-sky-800 block text-[11px] font-bold">الأعذار المعتمدة اليوم</span>
              <strong className="text-base font-black text-sky-700">{excusedCount}</strong>
            </div>
          </div>
        </div>

        {/* Statistical Summary per Class/Section Table - NO STUDENT NAMES */}
        <div className="mb-6">
          <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-700 inline-block"></span>
            ثانياً: المؤشرات الرقمية العامة حسب الصفوف والشعب الدراسية
          </h3>

          <div className="overflow-x-auto rounded-lg border border-slate-300">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-100 text-slate-800 font-black border-b border-slate-300">
                <tr>
                  <th className="py-2.5 px-3 border-l border-slate-300">الصف الدراسي</th>
                  <th className="py-2.5 px-3 border-l border-slate-300 text-center">الفصل / الشعبة</th>
                  <th className="py-2.5 px-3 border-l border-slate-300 text-center">العدد المقيد</th>
                  <th className="py-2.5 px-3 border-l border-slate-300 text-center">حاضر</th>
                  <th className="py-2.5 px-3 border-l border-slate-300 text-center">غائب بدون عذر</th>
                  <th className="py-2.5 px-3 border-l border-slate-300 text-center">غائب بعذر</th>
                  <th className="py-2.5 px-3 border-l border-slate-300 text-center">متأخر</th>
                  <th className="py-2.5 px-3 text-center">نسبة الانضباط</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-medium">
                {Array.from(sectionsMap.entries()).map(([key, data]) => {
                  const cTotal = data.students.length || 1;
                  const cPresent = data.attendances.filter((a) => a.finalStatus === 'present').length;
                  const cAbsent = data.attendances.filter((a) => a.finalStatus === 'absent').length;
                  const cExcused = data.attendances.filter((a) => a.finalStatus === 'excused').length;
                  const cLate = data.attendances.filter((a) => a.finalStatus === 'late').length;
                  const cRate = Math.round(((cPresent + cExcused) / cTotal) * 100);

                  return (
                    <tr key={key} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 border-l border-slate-300 font-bold text-slate-900">{data.className}</td>
                      <td className="py-2.5 px-3 border-l border-slate-300 font-bold text-slate-800 text-center">{data.sectionName}</td>
                      <td className="py-2.5 px-3 border-l border-slate-300 text-center font-mono font-bold">{cTotal}</td>
                      <td className="py-2.5 px-3 border-l border-slate-300 text-center font-mono font-bold text-emerald-700">{cPresent}</td>
                      <td className="py-2.5 px-3 border-l border-slate-300 text-center font-mono font-bold text-rose-700">{cAbsent}</td>
                      <td className="py-2.5 px-3 border-l border-slate-300 text-center font-mono font-bold text-sky-700">{cExcused}</td>
                      <td className="py-2.5 px-3 border-l border-slate-300 text-center font-mono font-bold text-amber-700">{cLate}</td>
                      <td className="py-2.5 px-3 text-center font-bold font-mono">
                        <span className={`px-2.5 py-0.5 rounded text-[11px] font-bold ${cRate >= 90 ? 'text-emerald-800 bg-emerald-50' : 'text-rose-800 bg-rose-50'}`}>
                          {cRate}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Official Endorsement & Signatures */}
        <div className="border-t-2 border-slate-900 pt-6 mt-8">
          <div className="grid grid-cols-3 gap-6 text-center text-xs">
            <div className="space-y-8">
              <p className="font-bold text-slate-800">مسؤول رصد الحضور والانضباط</p>
              <p className="font-mono font-bold text-slate-600">................................................</p>
              <p className="text-[11px] text-slate-500">التوقيع والتاريخ</p>
            </div>

            <div className="space-y-8">
              <p className="font-bold text-slate-800">الموجه الطلابي بالمدرسة</p>
              <p className="font-mono font-bold text-slate-600">................................................</p>
              <p className="text-[11px] text-slate-500">التوقيع والتاريخ</p>
            </div>

            <div className="space-y-8 relative">
              <p className="font-bold text-slate-900">يعتمد / مدير المدرسة</p>
              <p className="font-bold text-emerald-900">{school.managerName}</p>
              
              {/* Stamp Outline */}
              <div className="w-24 h-24 rounded-full border-2 border-dashed border-emerald-700/40 mx-auto flex items-center justify-center text-[10px] text-emerald-800/60 font-bold">
                مكان الختم الرسمي
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
