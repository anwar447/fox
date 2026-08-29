import React, { useState } from 'react';
import { User, Attendance, Excuse, School } from '../types';
import { getHijriDateInfo } from '../utils/academic';
import { calculateStudentBehaviorScore } from '../utils/storage';
import { 
  X, User as UserIcon, Calendar, CheckCircle2, XCircle, Clock, 
  FileText, Phone, MessageSquare, ShieldCheck, Printer, AlertTriangle, 
  Eye, Building, GraduationCap, Award, Copy, Check, ShieldAlert, HeartHandshake
} from 'lucide-react';

interface StudentDossierModalProps {
  student: User | null;
  isOpen: boolean;
  onClose: () => void;
  school?: School | null;
  allAttendances?: Attendance[];
  allExcuses?: Excuse[];
  onOpenExcusePreview?: (excuse: Excuse) => void;
}

export function StudentDossierModal({
  student,
  isOpen,
  onClose,
  school,
  allAttendances = [],
  allExcuses = [],
  onOpenExcusePreview,
}: StudentDossierModalProps) {
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selectedExcuseDoc, setSelectedExcuseDoc] = useState<Excuse | null>(null);
  const [copiedPhone, setCopiedPhone] = useState(false);

  if (!isOpen || !student) return null;

  const studentNationalId = String(student.nationalId || '');
  const studentId = String(student.id || '');

  // Safely filter attendances for this student
  const studentAttendances = (allAttendances || [])
    .filter((a) => {
      if (!a) return false;
      const attStudentId = String(a.studentId || '');
      const attNid = String(a.nationalId || '');
      return (attStudentId && attStudentId === studentId) || (attNid && attNid === studentNationalId);
    })
    .sort((a, b) => {
      const dateA = String(a.date || '');
      const dateB = String(b.date || '');
      return dateB.localeCompare(dateA);
    });

  // Safely filter excuses for this student
  const studentExcuses = (allExcuses || []).filter((e) => {
    if (!e) return false;
    const excStudentId = String(e.studentId || '');
    const excNid = String(e.nationalId || '');
    return (excStudentId && excStudentId === studentId) || (excNid && excNid === studentNationalId);
  });

  // Stats calculation
  const totalRecords = studentAttendances.length;
  const presentDays = studentAttendances.filter((a) => a.finalStatus === 'present').length;
  const unexcusedAbsences = studentAttendances.filter((a) => a.finalStatus === 'absent').length;
  const excusedAbsences = studentAttendances.filter((a) => a.finalStatus === 'excused').length;
  const lateDays = studentAttendances.filter((a) => a.finalStatus === 'late').length;
  
  const attendanceRate = totalRecords > 0 
    ? Math.min(100, Math.round(((presentDays + excusedAbsences) / totalRecords) * 100))
    : 100;

  // Calculate Behavior Score (100 base, -1 for late, manual deductions)
  const behaviorStats = calculateStudentBehaviorScore(
    studentId,
    studentNationalId,
    student.schoolCode || 'ALL'
  );

  const filteredHistory = studentAttendances.filter((att) => {
    if (filterStatus === 'all') return true;
    if (filterStatus === 'present') return att.finalStatus === 'present';
    if (filterStatus === 'absent') return att.finalStatus === 'absent';
    if (filterStatus === 'excused') return att.finalStatus === 'excused';
    if (filterStatus === 'late') return att.finalStatus === 'late';
    return true;
  });

  const handlePrint = () => {
    window.print();
  };

  const rawPhone = student.parentMobile ? String(student.parentMobile) : '';
  const cleanPhoneForWa = rawPhone.startsWith('0') 
    ? '966' + rawPhone.slice(1) 
    : rawPhone.startsWith('966') 
    ? rawPhone 
    : `966${rawPhone}`;

  const handleCopyPhone = () => {
    if (!rawPhone) return;
    navigator.clipboard?.writeText(rawPhone);
    setCopiedPhone(true);
    setTimeout(() => setCopiedPhone(false), 2000);
  };

  const todayInfo = getHijriDateInfo(new Date());
  const schoolName = school?.name || 'مدرسة الراية';

  return (
    <div 
      className="fixed inset-0 z-[100] overflow-y-auto bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6" 
      dir="rtl"
      role="dialog"
      aria-modal="true"
    >
      {/* Clickable Backdrop */}
      <div 
        className="fixed inset-0 bg-transparent -z-10" 
        onClick={onClose}
      />

      {/* Main Modal Card */}
      <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-slate-200 z-10 my-auto">
        
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-emerald-800 via-teal-800 to-slate-900 text-white p-5 sm:p-6 flex items-start justify-between relative overflow-hidden shrink-0">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-400 via-amber-300 to-teal-400" />
          
          <div className="flex items-center gap-4 z-10">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white/15 backdrop-blur-md p-1 border-2 border-white/30 flex-shrink-0 shadow-lg relative overflow-hidden">
              {student.photoUrl ? (
                <img
                  src={student.photoUrl}
                  alt={student.name || 'طالب'}
                  className="w-full h-full object-cover rounded-xl"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-full h-full bg-emerald-700/50 rounded-xl flex items-center justify-center text-white font-black text-2xl">
                  {student.name ? student.name.charAt(0) : <UserIcon className="w-9 h-9 opacity-80" />}
                </div>
              )}
              <span className={`absolute bottom-1 left-1 w-3.5 h-3.5 rounded-full border-2 border-slate-900 ${
                attendanceRate >= 90 ? 'bg-emerald-400' : attendanceRate >= 75 ? 'bg-amber-400' : 'bg-rose-500'
              }`} />
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl sm:text-2xl font-black tracking-tight">{student.name}</h2>
                <span className="bg-white/20 text-white text-[11px] font-bold px-2.5 py-0.5 rounded-full backdrop-blur-md border border-white/20">
                  طالب منتظم
                </span>
              </div>

              <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-200 flex-wrap">
                <span className="flex items-center gap-1 font-mono">
                  <strong className="text-emerald-300">رقم الطالب / الهوية:</strong> {student.nationalId}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <GraduationCap className="w-3.5 h-3.5 text-emerald-300" />
                  <span>{student.className || 'الصف الأول'} - فصل ({student.sectionName || '1'})</span>
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Building className="w-3.5 h-3.5 text-emerald-300" />
                  <span>{schoolName}</span>
                </span>
              </div>

              {rawPhone && (
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <span className="text-[11px] text-amber-200 font-bold bg-amber-500/20 px-2.5 py-1 rounded-lg border border-amber-400/30 flex items-center gap-1.5">
                    <Phone className="w-3 h-3 text-amber-300" />
                    <span>جوال ولي الأمر:</span>
                    <span className="font-mono text-white font-bold">{rawPhone}</span>
                    <button
                      onClick={handleCopyPhone}
                      className="text-amber-200 hover:text-white mr-1 cursor-pointer"
                      title="نسخ رقم الجوال"
                    >
                      {copiedPhone ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </span>

                  <a
                    href={`https://wa.me/${cleanPhoneForWa}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[10px] bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-2.5 py-1 rounded-lg flex items-center gap-1 transition-colors shadow-xs"
                  >
                    <MessageSquare className="w-3 h-3" />
                    <span>مراسلة واتساب</span>
                  </a>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 z-10">
            <button
              onClick={handlePrint}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
              title="طباعة التقرير الفردي للطالب"
            >
              <Printer className="w-5 h-5" />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/10 hover:bg-rose-600 text-white transition-colors cursor-pointer"
              title="إغلاق"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          
          {/* Quick KPI Stat Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3.5 text-center">
              <span className="text-xs text-emerald-800 font-bold block mb-1">نسبة الانضباط</span>
              <div className="text-2xl font-black text-emerald-700 flex items-center justify-center gap-1">
                <span>{attendanceRate}%</span>
                <Award className="w-4 h-4 text-emerald-600" />
              </div>
              <span className="text-[10px] text-emerald-600">من إجمالي أيام الرصد ({totalRecords})</span>
            </div>

            <div className="bg-teal-50 border border-teal-200 rounded-2xl p-3.5 text-center">
              <span className="text-xs text-teal-800 font-bold block mb-1">حضور فعلي</span>
              <div className="text-2xl font-black text-teal-700">{presentDays}</div>
              <span className="text-[10px] text-teal-600">يوم دراسي</span>
            </div>

            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-3.5 text-center">
              <span className="text-xs text-rose-800 font-bold block mb-1">غياب بدون عذر</span>
              <div className="text-2xl font-black text-rose-700">{unexcusedAbsences}</div>
              <span className="text-[10px] text-rose-600">يوم غياب غير مبرر</span>
            </div>

            <div className="bg-sky-50 border border-sky-200 rounded-2xl p-3.5 text-center">
              <span className="text-xs text-sky-800 font-bold block mb-1">غياب بعذر معتمد</span>
              <div className="text-2xl font-black text-sky-700">{excusedAbsences}</div>
              <span className="text-[10px] text-sky-600">عذر طبي / رسمي</span>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 text-center col-span-2 sm:col-span-1">
              <span className="text-xs text-amber-800 font-bold block mb-1">مرات التأخر</span>
              <div className="text-2xl font-black text-amber-700">{lateDays}</div>
              <span className="text-[10px] text-amber-600">بعد الطابور الصباحي</span>
            </div>
          </div>

          {/* Behavior & Discipline 100-Point System Block */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-950 text-white rounded-3xl p-5 border border-slate-800 shadow-md space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-2xl ${
                  behaviorStats.currentScore >= 90 ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                  behaviorStats.currentScore >= 80 ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                  'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                }`}>
                  <ShieldAlert className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-black text-white">درجة السلوك والمواظبة للفصل الدراسي</h3>
                    <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full ${
                      behaviorStats.currentScore >= 90 ? 'bg-emerald-500/20 text-emerald-300' :
                      behaviorStats.currentScore >= 80 ? 'bg-amber-500/20 text-amber-300' :
                      'bg-rose-500/20 text-rose-300'
                    }`}>
                      {behaviorStats.currentScore >= 95 ? 'سلوك متميز ومثالي' :
                       behaviorStats.currentScore >= 90 ? 'سلوك ممتاز' :
                       behaviorStats.currentScore >= 80 ? 'سلوك جيد جداً' :
                       behaviorStats.currentScore >= 70 ? 'سلوك جيد' : 'يحتاج متابعة وتعديل سلوك'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">أساس التقييم 100 درجة مع حسم درجة واحدة عن كل يوم تأخر صباحي، وحسومات المخالفات المعتمدة</p>
                </div>
              </div>

              <div className="flex items-center gap-3 bg-white/10 px-4 py-2 rounded-2xl border border-white/10 self-start sm:self-auto">
                <span className="text-xs text-slate-300">الرصيد المتبقي:</span>
                <span className={`text-2xl font-black ${
                  behaviorStats.currentScore >= 90 ? 'text-emerald-400' :
                  behaviorStats.currentScore >= 80 ? 'text-amber-400' :
                  'text-rose-400'
                }`}>
                  {behaviorStats.currentScore} <span className="text-xs text-slate-400 font-normal">/ 100</span>
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="bg-white/5 p-3 rounded-2xl border border-white/5 space-y-1">
                <span className="text-slate-400 block text-[11px]">الدرجة الأساسية:</span>
                <span className="font-bold text-white text-base">100 درجة</span>
              </div>
              <div className="bg-white/5 p-3 rounded-2xl border border-white/5 space-y-1">
                <span className="text-slate-400 block text-[11px]">حسم التأخر الصباحي ({behaviorStats.tardinessDeductions} مرات):</span>
                <span className="font-bold text-amber-400 text-base">-{behaviorStats.tardinessDeductions} درجة</span>
              </div>
              <div className="bg-white/5 p-3 rounded-2xl border border-white/5 space-y-1">
                <span className="text-slate-400 block text-[11px]">حسومات المخالفات الإدارية ({behaviorStats.manualDeductionsList.length} مخالفات):</span>
                <span className="font-bold text-rose-400 text-base">-{behaviorStats.manualDeductionsTotal} درجة</span>
              </div>
            </div>

            {/* List of Manual Deductions if any */}
            {behaviorStats.manualDeductionsList.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <span className="text-xs font-bold text-slate-300 block">سجل المخالفات والحسومات الإدارية المسجلة:</span>
                <div className="space-y-1.5 max-h-36 overflow-y-auto">
                  {behaviorStats.manualDeductionsList.map((ded) => (
                    <div key={ded.id} className="bg-rose-950/40 border border-rose-500/20 rounded-xl p-2.5 flex items-center justify-between text-xs">
                      <div>
                        <div className="flex items-center gap-2">
                          <strong className="text-rose-300 font-bold">{ded.reason}</strong>
                          <span className="text-[10px] text-slate-400 font-mono">({ded.date})</span>
                        </div>
                        {ded.notes && <p className="text-[11px] text-slate-300 mt-0.5">{ded.notes}</p>}
                      </div>
                      <span className="bg-rose-600 text-white font-mono font-bold px-2 py-0.5 rounded-lg text-xs shrink-0">
                        -{ded.points} درجات
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Filter Bar */}
          <div className="flex items-center justify-between flex-wrap gap-2 border-b border-slate-200 pb-3">
            <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-emerald-600" />
              <span>سجل الحضور والغياب التاريخي المفصل</span>
            </h3>

            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-bold text-slate-600 flex-wrap">
              <button
                onClick={() => setFilterStatus('all')}
                className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                  filterStatus === 'all' ? 'bg-white text-slate-900 shadow-sm' : 'hover:text-slate-900'
                }`}
              >
                الكل ({studentAttendances.length})
              </button>
              <button
                onClick={() => setFilterStatus('present')}
                className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                  filterStatus === 'present' ? 'bg-emerald-600 text-white shadow-sm' : 'hover:text-emerald-700'
                }`}
              >
                حاضر ({presentDays})
              </button>
              <button
                onClick={() => setFilterStatus('absent')}
                className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                  filterStatus === 'absent' ? 'bg-rose-600 text-white shadow-sm' : 'hover:text-rose-700'
                }`}
              >
                غائب بدون عذر ({unexcusedAbsences})
              </button>
              <button
                onClick={() => setFilterStatus('excused')}
                className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                  filterStatus === 'excused' ? 'bg-sky-600 text-white shadow-sm' : 'hover:text-sky-700'
                }`}
              >
                بعذر ({excusedAbsences})
              </button>
              <button
                onClick={() => setFilterStatus('late')}
                className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                  filterStatus === 'late' ? 'bg-amber-600 text-white shadow-sm' : 'hover:text-amber-700'
                }`}
              >
                متأخر ({lateDays})
              </button>
            </div>
          </div>

          {/* Chronological Attendance Records Table */}
          {filteredHistory.length === 0 ? (
            <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-300">
              <Calendar className="w-10 h-10 text-slate-400 mx-auto mb-2 opacity-50" />
              <p className="text-sm font-bold text-slate-600">لا توجد سجلات تطابق الفلتر المحدد لهذا الطالب</p>
              <p className="text-xs text-slate-400 mt-1">يتم تحديث السجلات تلقائياً فور رصد الحضور الذاتي أو رصد المعلمين</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-100/90 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-3.5">اليوم والتاريخ</th>
                    <th className="py-3 px-3.5">حالة الحضور</th>
                    <th className="py-3 px-3.5">التحضير الذاتي (البصمة)</th>
                    <th className="py-3 px-3.5">تحضير المعلم</th>
                    <th className="py-3 px-3.5">تفاصيل العذر والمرفقات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredHistory.map((att) => {
                    const hijri = getHijriDateInfo(att.date);
                    const matchedExcuse = studentExcuses.find((e) => e.date === att.date);

                    return (
                      <tr key={att.id || att.date} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-3.5 whitespace-nowrap">
                          <div className="font-bold text-slate-900">{hijri.dayName}</div>
                          <div className="text-[11px] text-slate-500 font-mono">{att.date} ({hijri.hijri})</div>
                        </td>

                        <td className="py-3 px-3.5 whitespace-nowrap">
                          {att.finalStatus === 'present' ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              حاضر ومنتظم
                            </span>
                          ) : att.finalStatus === 'late' ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                              <Clock className="w-3.5 h-3.5 text-amber-600" />
                              متأخر صباحاً
                            </span>
                          ) : att.finalStatus === 'excused' ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-sky-100 text-sky-800 border border-sky-200">
                              <FileText className="w-3.5 h-3.5 text-sky-600" />
                              غياب بعذر معتمد
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                              <XCircle className="w-3.5 h-3.5 text-rose-600" />
                              غائب بدون عذر
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-3.5 whitespace-nowrap">
                          {att.selfCheckTime ? (
                            <span className="text-emerald-700 font-bold font-mono text-[11px] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                              ✓ {att.selfCheckTime} (داخل المدرسة)
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[11px]">لم يسجل بالبصمة</span>
                          )}
                        </td>

                        <td className="py-3 px-3.5 whitespace-nowrap">
                          {att.teacherMark === 'present' ? (
                            <span className="text-emerald-700 font-bold text-[11px]">حاضر بالحصة</span>
                          ) : att.teacherMark === 'absent' ? (
                            <span className="text-rose-700 font-bold text-[11px]">غائب بالحصة</span>
                          ) : att.teacherMark === 'late' ? (
                            <span className="text-amber-700 font-bold text-[11px]">متأخر بالحصة</span>
                          ) : (
                            <span className="text-slate-400 text-[11px]">قيد المتابعة</span>
                          )}
                        </td>

                        <td className="py-3 px-3.5">
                          {matchedExcuse ? (
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                                matchedExcuse.status === 'approved'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : matchedExcuse.status === 'rejected'
                                  ? 'bg-rose-100 text-rose-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}>
                                {matchedExcuse.status === 'approved' ? 'عذر معتمد' : matchedExcuse.status === 'rejected' ? 'عذر مرفوض' : 'عذر قيد المراجعة'}
                              </span>

                              <span className="text-[11px] text-slate-700 font-medium truncate max-w-[160px]" title={matchedExcuse.description}>
                                {matchedExcuse.description}
                              </span>

                              {matchedExcuse.rejectionReason && (
                                <span className="text-[10px] text-rose-600 block w-full mt-0.5">
                                  سبب الرفض: {matchedExcuse.rejectionReason}
                                </span>
                              )}

                              {matchedExcuse.file && (
                                <button
                                  onClick={() => setSelectedExcuseDoc(matchedExcuse)}
                                  className="text-[10px] bg-slate-200 hover:bg-slate-300 text-slate-800 px-2 py-0.5 rounded flex items-center gap-1 font-bold cursor-pointer transition-colors"
                                >
                                  <Eye className="w-3 h-3 text-slate-600" />
                                  معاينة المرفق
                                </button>
                              )}
                            </div>
                          ) : att.finalStatus === 'absent' ? (
                            <span className="text-rose-500 text-[11px] italic">لم يُرفع عذر حتى الآن</span>
                          ) : (
                            <span className="text-slate-400 text-[11px]">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 border-t border-slate-200 p-4 px-6 flex items-center justify-between shrink-0">
          <span className="text-xs text-slate-500 font-medium">
            سجل الطالب الأكاديمي الرقمي المعتمد • تاريخ اليوم: {todayInfo.hijri}
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
            >
              <Printer className="w-4 h-4" />
              <span>طباعة كشف الطالب</span>
            </button>
            <button
              onClick={onClose}
              className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer shadow-sm"
            >
              إغلاق الملف
            </button>
          </div>
        </div>

      </div>

      {/* Embedded Document Preview Modal */}
      {selectedExcuseDoc && (
        <div className="fixed inset-0 z-[110] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-5 overflow-hidden shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h4 className="font-bold text-slate-900 text-base">مستند عذر الغياب المرفق</h4>
                <p className="text-xs text-slate-500">تاريخ الغياب: {selectedExcuseDoc.date} - {selectedExcuseDoc.studentName}</p>
              </div>
              <button
                onClick={() => setSelectedExcuseDoc(null)}
                className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="max-h-[60vh] overflow-y-auto flex items-center justify-center bg-slate-100 rounded-xl p-2">
              {selectedExcuseDoc.fileType === 'pdf' || selectedExcuseDoc.file?.startsWith('data:application/pdf') ? (
                <iframe
                  src={selectedExcuseDoc.file}
                  className="w-full h-96 rounded-lg border-0"
                  title="PDF Excuse Preview"
                />
              ) : (
                <img
                  src={selectedExcuseDoc.file}
                  alt="Excuse Attachment"
                  className="max-h-96 w-auto object-contain rounded-lg shadow-sm"
                />
              )}
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-slate-600">
                <strong>البيان:</strong> {selectedExcuseDoc.description}
              </span>
              <button
                onClick={() => setSelectedExcuseDoc(null)}
                className="px-4 py-2 bg-slate-800 text-white text-xs font-bold rounded-lg cursor-pointer"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
