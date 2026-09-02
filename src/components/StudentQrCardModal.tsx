import React from 'react';
import { User, School } from '../types';
import { QrCode, Printer, X, GraduationCap, ShieldCheck } from 'lucide-react';

interface StudentQrCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: User;
  school: School;
}

export const StudentQrCardModal: React.FC<StudentQrCardModalProps> = ({
  isOpen,
  onClose,
  student,
  school,
}) => {
  if (!isOpen) return null;

  const qrData = JSON.stringify({
    studentId: student.id,
    nationalId: student.nationalId,
    name: student.name,
    schoolCode: student.schoolCode,
    className: student.className,
    sectionName: student.sectionName,
  });

  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(
    qrData
  )}&margin=10`;

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <html dir="rtl" lang="ar">
        <head>
          <title>بطاقة حضور الطالب - ${student.name}</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; text-align: center; padding: 40px; margin: 0; }
            .card { border: 2px solid #059669; border-radius: 20px; padding: 30px; max-width: 380px; margin: 0 auto; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
            h1 { font-size: 18px; color: #064e3b; margin: 0 0 5px 0; }
            h2 { font-size: 16px; color: #1f2937; margin: 10px 0; }
            .qr-img { width: 200px; height: 200px; border-radius: 12px; margin: 15px 0; }
            .meta { font-size: 13px; color: #4b5563; line-height: 1.6; }
            .badge { display: inline-block; background: #ecfdf5; color: #047857; padding: 4px 12px; border-radius: 999px; font-weight: bold; font-size: 12px; margin-bottom: 10px; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="badge">بطاقة حضور الطالب الذكية</div>
            <h1>${school.name}</h1>
            <h2>${student.name}</h2>
            <img src="${qrImageUrl}" class="qr-img" alt="QR" />
            <div class="meta">
              <div><strong>الصف:</strong> ${student.className || '--'} | <strong>الفصل:</strong> ${student.sectionName || '--'}</div>
              <div><strong>رقم الهوية:</strong> ${student.nationalId}</div>
              <div><strong>كود المدرسة:</strong> ${student.schoolCode}</div>
            </div>
          </div>
          <script>
            window.onload = () => { window.print(); };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div 
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fadeIn" 
      dir="rtl"
    >
      <div className="bg-white border border-slate-200 rounded-3xl max-w-sm w-full p-6 text-center space-y-4 shadow-2xl text-slate-800">
        <div className="flex justify-between items-center border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2 text-emerald-700 text-xs font-bold">
            <QrCode className="w-4 h-4 text-emerald-600" />
            <span>بطاقة الحضور الذكية (QR)</span>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-1">
          <h3 className="font-black text-slate-900 text-base">{student.name}</h3>
          <p className="text-xs text-slate-500 font-medium">{student.className} - فصل {student.sectionName}</p>
          <span className="inline-block px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-mono font-bold">
            هوية: {student.nationalId}
          </span>
        </div>

        <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl inline-block shadow-inner">
          <img src={qrImageUrl} alt="QR Code" className="w-48 h-48 mx-auto" />
        </div>

        <p className="text-[11px] text-slate-500 leading-relaxed">
          يمسح الحارس أو المعلم هذا الباركود عند بوابة المدرسة للتحضير الفوري بدون جوال مع الطالب.
        </p>

        <div className="grid grid-cols-2 gap-2 pt-2">
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
            <span>طباعة البطاقة 🖨️</span>
          </button>
        </div>
      </div>
    </div>
  );
};
