import React from 'react';
import { School, Attendance } from '../types';
import { Printer, FileText, X, CheckCircle, XCircle, AlertTriangle, Users } from 'lucide-react';
import { getHijriDateInfo } from '../utils/academic';

interface DailyPrincipalReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  school: School;
  attendances: Attendance[];
  date: string;
}

export const DailyPrincipalReportModal: React.FC<DailyPrincipalReportModalProps> = ({
  isOpen,
  onClose,
  school,
  attendances,
  date,
}) => {
  if (!isOpen) return null;

  const total = attendances.length || 1;
  const present = attendances.filter((a) => a.finalStatus === 'present').length;
  const absent = attendances.filter((a) => a.finalStatus === 'absent').length;
  const late = attendances.filter((a) => a.finalStatus === 'late').length;
  const truants = attendances.filter((a) => a.isTruant);

  const rate = Math.round((present / total) * 100);
  const dateInfo = getHijriDateInfo();

  const handlePrint = () => {
    const printWin = window.open('', '_blank');
    if (!printWin) return;
    printWin.document.write(`
      <html dir="rtl" lang="ar">
        <head>
          <title>التقرير الصباحي اليومي لمدير المدرسة - ${school.name}</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 30px; margin: 0; }
            .header { text-align: center; border-bottom: 2px solid #059669; padding-bottom: 15px; margin-bottom: 20px; }
            .school-name { font-size: 20px; font-weight: bold; color: #064e3b; margin: 0; }
            .sub { font-size: 14px; color: #4b5563; margin-top: 5px; }
            .stats { display: flex; justify-content: space-around; margin: 20px 0; border: 1px solid #e5e7eb; border-radius: 12px; padding: 15px; background: #f9fafb; }
            .stat-box { text-align: center; }
            .stat-val { font-size: 22px; font-weight: bold; color: #111827; }
            .stat-lbl { font-size: 12px; color: #6b7280; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 12px; }
            th, td { border: 1px solid #d1d5db; padding: 8px 10px; text-align: right; }
            th { background: #f3f4f6; }
            .status-p { color: #047857; font-weight: bold; }
            .status-a { color: #b91c1c; font-weight: bold; }
            .truant-tag { background: #fee2e2; color: #991b1b; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: bold; }
            .footer { margin-top: 40px; display: flex; justify-content: space-between; font-size: 13px; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="school-name">${school.name}</div>
            <div class="sub">تقرير الانضباط والحضور المدرسي اليومي - تاريخ: ${date} (${dateInfo.hijriFormatted})</div>
          </div>

          <div class="stats">
            <div class="stat-box"><div class="stat-val">${rate}%</div><div class="stat-lbl">نسبة الحضور</div></div>
            <div class="stat-box"><div class="stat-val">${total}</div><div class="stat-lbl">إجمالي الطلاب</div></div>
            <div class="stat-box"><div class="stat-val" style="color:#047857">${present}</div><div class="stat-lbl">حاضر</div></div>
            <div class="stat-box"><div class="stat-val" style="color:#b91c1c">${absent}</div><div class="stat-lbl">غائب</div></div>
            <div class="stat-box"><div class="stat-val" style="color:#d97706">${late}</div><div class="stat-lbl">متأخر</div></div>
          </div>

          ${truants.length > 0 ? `
            <div style="background:#fef2f2; border:1px solid #f87171; border-radius:8px; padding:10px; margin:15px 0;">
              <strong style="color:#991b1b">⚠️ تنبيه كشف التباين والهروب (${truants.length} طالب):</strong>
              <div style="font-size:12px; margin-top:5px;">${truants.map(t => `${t.studentName} (${t.className} - ${t.sectionName})`).join(' ، ')}</div>
            </div>
          ` : ''}

          <table>
            <thead>
              <tr>
                <th>م</th>
                <th>اسم الطالب</th>
                <th>الصف والفصل</th>
                <th>وقت البوابة</th>
                <th>رصد المعلم</th>
                <th>الحالة النهائية</th>
                <th>ملاحظات الانضباط</th>
              </tr>
            </thead>
            <tbody>
              ${attendances.map((a, i) => `
                <tr>
                  <td>${i + 1}</td>
                  <td>${a.studentName}</td>
                  <td>${a.className} - ${a.sectionName}</td>
                  <td>${a.selfCheckTime || '--'}</td>
                  <td>${a.teacherMark === 'present' ? 'حاضر' : a.teacherMark === 'absent' ? 'غائب' : '--'}</td>
                  <td class="${a.finalStatus === 'present' ? 'status-p' : 'status-a'}">${a.finalStatus === 'present' ? 'حاضر' : a.finalStatus === 'absent' ? 'غائب' : 'متأخر'}</td>
                  <td>${a.isTruant ? '<span class="truant-tag">كشف تباين</span>' : 'سليم'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="footer">
            <div>وكيل شؤون الطلاب: ....................</div>
            <div>مدير المدرسة: ....................</div>
            <div>ختم المدرسة: ....................</div>
          </div>

          <script>
            window.onload = () => { window.print(); };
          </script>
        </body>
      </html>
    `);
    printWin.document.close();
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
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">التقرير الصباحي الشامل لمدير المدرسة</h3>
              <p className="text-xs text-slate-500 font-medium">ملخص إحصائي يومي لمطابقة نور والانضباط المدرسي</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center">
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3">
            <span className="text-[11px] text-slate-500 font-bold block mb-1">نسبة الحضور</span>
            <span className="text-xl font-black text-emerald-700">{rate}%</span>
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3">
            <span className="text-[11px] text-slate-500 font-bold block mb-1">إجمالي الطلاب</span>
            <span className="text-xl font-black text-slate-900">{total}</span>
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3">
            <span className="text-[11px] text-slate-500 font-bold block mb-1">الغياب</span>
            <span className="text-xl font-black text-rose-600">{absent}</span>
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3">
            <span className="text-[11px] text-slate-500 font-bold block mb-1">التأخر</span>
            <span className="text-xl font-black text-amber-600">{late}</span>
          </div>
        </div>

        {truants.length > 0 && (
          <div className="bg-rose-50 border border-rose-200 rounded-2xl p-3.5 space-y-1 text-xs">
            <strong className="text-rose-900 font-bold flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-rose-600" />
              <span>تم كشف ({truants.length}) حالة تباين / اشتباه هروب اليوم:</span>
            </strong>
            <p className="text-slate-600">
              {truants.map((t) => t.studentName).join(' ، ')}
            </p>
          </div>
        )}

        {/* Scrollable table preview */}
        <div className="border border-slate-200 rounded-2xl overflow-hidden max-h-56 overflow-y-auto">
          <table className="w-full text-xs text-right">
            <thead className="bg-slate-50 text-slate-700 sticky top-0 border-b border-slate-200">
              <tr>
                <th className="p-2.5 font-bold">الطالب</th>
                <th className="p-2.5 font-bold">الصف</th>
                <th className="p-2.5 font-bold">البوابة</th>
                <th className="p-2.5 font-bold">المعلم</th>
                <th className="p-2.5 font-bold">الحالة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {attendances.map((a) => (
                <tr key={a.id} className="hover:bg-slate-50">
                  <td className="p-2.5 font-bold text-slate-900">{a.studentName}</td>
                  <td className="p-2.5 text-slate-500">{a.className} - {a.sectionName}</td>
                  <td className="p-2.5 font-mono text-slate-700">{a.selfCheckTime || '--'}</td>
                  <td className="p-2.5">{a.teacherMark === 'present' ? 'حاضر' : a.teacherMark === 'absent' ? 'غائب' : '--'}</td>
                  <td className="p-2.5">
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-black ${
                      a.finalStatus === 'present' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
                    }`}>
                      {a.finalStatus === 'present' ? 'حاضر' : 'غائب'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-2">
          <button
            onClick={onClose}
            className="py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
          >
            إغلاق
          </button>
          <button
            onClick={handlePrint}
            className="py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/20 cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>طباعة التقرير الرسمي 🖨️</span>
          </button>
        </div>
      </div>
    </div>
  );
};
