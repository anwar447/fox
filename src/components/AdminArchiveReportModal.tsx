import React, { useState } from 'react';
import { School, Attendance } from '../types';
import { getAttendances } from '../utils/storage';
import { exportAttendanceToExcel } from '../utils/excelParser';
import { Archive, Download, Calendar, X, Filter, Users, FileSpreadsheet } from 'lucide-react';

interface AdminArchiveReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  school: School;
}

export const AdminArchiveReportModal: React.FC<AdminArchiveReportModalProps> = ({
  isOpen,
  onClose,
  school,
}) => {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [statusFilter, setStatusFilter] = useState<'all' | 'present' | 'absent' | 'late' | 'truant'>('all');

  if (!isOpen) return null;

  const allAttendances = getAttendances().filter((a) => a.schoolCode === school.code);
  const dateAttendances = allAttendances.filter((a) => a.date === selectedDate);

  const filtered = dateAttendances.filter((a) => {
    if (statusFilter === 'all') return true;
    if (statusFilter === 'truant') return a.isTruant;
    return a.finalStatus === statusFilter;
  });

  const handleExport = () => {
    exportAttendanceToExcel(filtered, school.name, selectedDate);
  };

  return (
    <div 
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fadeIn" 
      dir="rtl"
    >
      <div className="bg-white border border-slate-200 rounded-3xl max-w-2xl w-full p-6 text-right space-y-5 shadow-2xl text-slate-800">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center">
              <Archive className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">أرشيف وتقارير الحضور التاريخية</h3>
              <p className="text-xs text-slate-500 font-medium">تصدير إكسل والبحث في الأيام السابقة</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter controls */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div>
            <label className="block text-slate-700 font-bold mb-1">تاريخ اليوم:</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-mono focus:outline-emerald-500"
            />
          </div>

          <div>
            <label className="block text-slate-700 font-bold mb-1">تصفية حسب الحالة:</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'all' | 'present' | 'absent' | 'late' | 'truant')}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-medium focus:outline-emerald-500"
            >
              <option value="all">جميع الحالات ({dateAttendances.length})</option>
              <option value="present">الحاضرون فقط</option>
              <option value="absent">الغائبون فقط</option>
              <option value="late">المتأخرون فقط</option>
              <option value="truant">حالات التباين والهروب</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={handleExport}
              className="w-full py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center justify-center gap-1.5 shadow-sm shadow-emerald-600/20 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>تصدير Excel 📊</span>
            </button>
          </div>
        </div>

        {/* Table preview */}
        <div className="border border-slate-200 rounded-2xl overflow-hidden max-h-56 overflow-y-auto text-xs">
          <table className="w-full text-right">
            <thead className="bg-slate-50 text-slate-700 font-bold sticky top-0 border-b border-slate-200">
              <tr>
                <th className="p-2.5">الطالب</th>
                <th className="p-2.5">الصف والفصل</th>
                <th className="p-2.5">وقت البوابة</th>
                <th className="p-2.5">الحالة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-4 text-center text-slate-400">
                    لا توجد سجلات مطابقة لهذا التاريخ أو التصفية
                  </td>
                </tr>
              ) : (
                filtered.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50">
                    <td className="p-2.5 font-bold text-slate-900">{a.studentName}</td>
                    <td className="p-2.5 text-slate-500">{a.className} - {a.sectionName}</td>
                    <td className="p-2.5 font-mono text-slate-600">{a.selfCheckTime || '--'}</td>
                    <td className="p-2.5">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                        a.finalStatus === 'present' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' :
                        a.finalStatus === 'absent' ? 'bg-rose-50 text-rose-800 border border-rose-200' : 'bg-amber-50 text-amber-800 border border-amber-200'
                      }`}>
                        {a.finalStatus === 'present' ? 'حاضر' : a.finalStatus === 'absent' ? 'غائب' : 'متأخر'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="pt-2">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
