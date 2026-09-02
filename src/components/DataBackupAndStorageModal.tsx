import React, { useState } from 'react';
import { School, User } from '../types';
import { 
  getUsers, getAttendances, getPermissions, 
  getBehaviorLogs, getAbsenceActions, getCorrectionRequests,
  saveUsers, saveAttendances, savePermissions, saveBehaviorLogs,
  saveAbsenceActions, saveCorrectionRequests
} from '../utils/storage';
import { soundManager } from '../utils/audio';
import { 
  HardDrive, Download, Upload, ShieldCheck, Database, 
  FileSpreadsheet, CheckCircle, AlertTriangle, X, Lock, Info, Server
} from 'lucide-react';

interface DataBackupAndStorageModalProps {
  isOpen: boolean;
  onClose: () => void;
  school: School;
  currentUser: User;
}

export const DataBackupAndStorageModal: React.FC<DataBackupAndStorageModalProps> = ({
  isOpen,
  onClose,
  school,
  currentUser,
}) => {
  const [copiedStatus, setCopiedStatus] = useState(false);
  const [restoreSuccess, setRestoreSuccess] = useState(false);

  if (!isOpen) return null;

  // Gather current school data
  const schoolUsers = getUsers().filter((u) => u.schoolCode === school.code);
  const schoolAttendances = getAttendances().filter((a) => a.schoolCode === school.code);
  const schoolPermissions = getPermissions().filter((p) => p.schoolCode === school.code);
  const schoolBehavior = getBehaviorLogs().filter((b) => b.schoolCode === school.code);
  const schoolActions = getAbsenceActions().filter((a) => a.schoolCode === school.code);
  const schoolCorrections = getCorrectionRequests().filter((c) => c.schoolCode === school.code);

  const fullSchoolDatabase = {
    exportDate: new Date().toISOString(),
    school: school,
    stats: {
      totalUsers: schoolUsers.length,
      totalStudents: schoolUsers.filter((u) => u.role === 'student').length,
      totalTeachers: schoolUsers.filter((u) => u.role === 'teacher').length,
      totalAttendances: schoolAttendances.length,
      totalPermissions: schoolPermissions.length,
      totalBehaviorLogs: schoolBehavior.length,
      totalAbsenceActions: schoolActions.length,
      totalCorrections: schoolCorrections.length,
    },
    users: schoolUsers,
    attendances: schoolAttendances,
    permissions: schoolPermissions,
    behaviorLogs: schoolBehavior,
    absenceActions: schoolActions,
    correctionRequests: schoolCorrections,
  };

  // 1. Download Full JSON Backup
  const handleDownloadJsonBackup = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(fullSchoolDatabase, null, 2));
    const downloadAnchor = document.createElement('a');
    const timestamp = new Date().toISOString().split('T')[0];
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `hodoorak-backup-${school.code}-${timestamp}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();

    try {
      soundManager.playSuccess();
    } catch {
      // Audio fallback
    }
  };

  // 2. Download CSV / Excel summary of students & attendances
  const handleDownloadCsvExport = () => {
    const students = schoolUsers.filter((u) => u.role === 'student');
    let csvContent = '\uFEFF'; // UTF-8 BOM for Arabic excel compatibility
    csvContent += 'الاسم,السجل المدني,الصف,الشعبة,رقم الجوال,حالة الحساب\n';

    students.forEach((st) => {
      const line = `"${st.name}","${st.nationalId}","${st.className || ''}","${st.sectionName || ''}","${st.parentMobile || st.mobile || ''}","نشط"`;
      csvContent += line + '\n';
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `students-roster-${school.code}-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  return (
    <div 
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fadeIn"
      dir="rtl"
    >
      <div className="bg-white border border-slate-200 rounded-3xl max-w-3xl w-full p-6 text-right space-y-5 shadow-2xl text-slate-800">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center font-bold shadow-xs shrink-0">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-slate-900">تخزين البيانات والنسخ الاحتياطي الدائم</h3>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 text-[10px] font-black border border-emerald-200">
                  حفظ وتصدير 📥
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                شرح آلية حفظ البيانات، الحدود التخزينية، وتنزيل نسخة احتياطية كاملة على جهازك كمرجع مستقل.
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

        {/* Informational Cards about Storage Architecture */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          {/* Where is data stored */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2">
            <div className="flex items-center gap-2 text-slate-900 font-black">
              <Server className="w-4 h-4 text-emerald-600" />
              <span>أين وكيف يتم تخزين بيانات المدرسة؟</span>
            </div>
            <p className="text-slate-600 leading-relaxed text-[11px]">
              تُخزن البيانات في <strong>محرك قواعد بيانات محلي فائق السرعة ومحمي</strong>، مع عزل تام لكل مدرسة بناءً على كود المدرسة (<span className="font-mono text-emerald-700 font-bold">{school.code}</span>). جميع العمليات اليومية من تحضير ورصد وتعهدات تُحفظ لحظياً وبشكل دائم.
            </p>
          </div>

          {/* Storage Limit */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2">
            <div className="flex items-center gap-2 text-slate-900 font-black">
              <ShieldCheck className="w-4 h-4 text-indigo-600" />
              <span>ما هو الحد الأقصى للتخزين والاحتفاظ؟</span>
            </div>
            <p className="text-slate-600 leading-relaxed text-[11px]">
              المنظومة مصممة لاستيعاب <strong>ملايين السجلات والعمليات اليومية</strong> على مدار سنوات دراسية كاملة دون سقف محدد للطلاب أو التحضيرات، مع إمكانية تصدير وأرشفة أي عام دراسي على جهاز الإداري بضغطة زر.
            </p>
          </div>
        </div>

        {/* Real-time stats preview */}
        <div className="bg-emerald-50/80 border border-emerald-200 rounded-2xl p-4 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-black text-emerald-950">إحصائيات البيانات الجاهزة للتصدير حالياً:</span>
            <span className="text-[10px] text-emerald-800 font-bold bg-white px-2.5 py-0.5 rounded-full border border-emerald-200">
              {school.name}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center pt-1">
            <div className="bg-white p-2.5 rounded-xl border border-emerald-100">
              <span className="text-[10px] text-slate-400 block">إجمالي الطلاب</span>
              <strong className="text-sm font-black text-slate-900 font-mono">
                {schoolUsers.filter((u) => u.role === 'student').length}
              </strong>
            </div>
            <div className="bg-white p-2.5 rounded-xl border border-emerald-100">
              <span className="text-[10px] text-slate-400 block">المعلمون والإداريون</span>
              <strong className="text-sm font-black text-slate-900 font-mono">
                {schoolUsers.filter((u) => u.role !== 'student' && u.role !== 'parent').length}
              </strong>
            </div>
            <div className="bg-white p-2.5 rounded-xl border border-emerald-100">
              <span className="text-[10px] text-slate-400 block">سجلات الحضور والغياب</span>
              <strong className="text-sm font-black text-emerald-700 font-mono">
                {schoolAttendances.length}
              </strong>
            </div>
            <div className="bg-white p-2.5 rounded-xl border border-emerald-100">
              <span className="text-[10px] text-slate-400 block">سجلات السلوك والاستئذان</span>
              <strong className="text-sm font-black text-indigo-700 font-mono">
                {schoolBehavior.length + schoolPermissions.length + schoolActions.length}
              </strong>
            </div>
          </div>
        </div>

        {/* Download Action Buttons */}
        <div className="space-y-3 pt-2">
          <h4 className="font-black text-slate-900 text-xs">خيارات تنزيل وحفظ النسخ الاحتياطية على جهازك:</h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* JSON Full Backup Button */}
            <button
              onClick={handleDownloadJsonBackup}
              className="p-4 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-between gap-3 shadow-lg shadow-slate-900/10 cursor-pointer transition-all border border-slate-700 group"
            >
              <div className="flex items-center gap-3 text-right">
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <Download className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <strong className="block font-black text-white text-xs">تنزيل نسخة احتياطية شاملة (JSON)</strong>
                  <span className="text-[10px] text-slate-300 font-medium block">
                    تحفظ كامل الطلاب والحضور والإجراءات كملف بيانات مستقل
                  </span>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 text-[10px] font-mono font-bold shrink-0">
                .JSON
              </span>
            </button>

            {/* CSV Excel Export Button */}
            <button
              onClick={handleDownloadCsvExport}
              className="p-4 rounded-2xl bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs flex items-center justify-between gap-3 shadow-lg shadow-emerald-700/10 cursor-pointer transition-all border border-emerald-600 group"
            >
              <div className="flex items-center gap-3 text-right">
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <FileSpreadsheet className="w-5 h-5 text-white" />
                </div>
                <div>
                  <strong className="block font-black text-white text-xs">تصدير قوائم الطلاب (Excel / CSV)</strong>
                  <span className="text-[10px] text-emerald-100 font-medium block">
                    جدول إكسل متكامل بأسماء وسجلات وهواتف الطلاب وشعبهم
                  </span>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-lg bg-white/20 text-white text-[10px] font-mono font-bold shrink-0">
                .CSV
              </span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-2 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="py-2.5 px-6 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
          >
            إغلاق النافذة
          </button>
        </div>
      </div>
    </div>
  );
};
