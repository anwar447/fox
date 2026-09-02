import React, { useState, useMemo } from 'react';
import { School } from '../types';
import { buildStaffRegistrationWhatsAppInvitation } from '../utils/magicLink';
import { 
   Share2, Copy, Check, Printer, MessageSquare, 
   X, Users, Sparkles, UserPlus 
} from 'lucide-react';

interface StaffRegistrationLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  school: School;
  onOpenDirectStaffRegistration: () => void;
}

export const StaffRegistrationLinkModal: React.FC<StaffRegistrationLinkModalProps> = ({
  isOpen,
  onClose,
  school,
  onOpenDirectStaffRegistration,
}) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedMessage, setCopiedMessage] = useState(false);

  const invitation = useMemo(() => {
    return buildStaffRegistrationWhatsAppInvitation(school);
  }, [school]);

  if (!isOpen) return null;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(invitation.registrationUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(invitation.message);
    setCopiedMessage(true);
    setTimeout(() => setCopiedMessage(false), 2500);
  };

  const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(
    invitation.registrationUrl
  )}&margin=10`;

  const handlePrintQr = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <html dir="rtl" lang="ar">
        <head>
          <title>باركود انضمام المعلمين والكادر - ${school.name}</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; text-align: center; padding: 40px; margin: 0; background: #fff; }
            .card { border: 3px solid #4f46e5; border-radius: 24px; padding: 40px 30px; max-width: 480px; margin: 0 auto; box-shadow: 0 10px 25px rgba(0,0,0,0.05); }
            h1 { font-size: 22px; color: #312e81; margin: 0 0 10px 0; }
            h2 { font-size: 16px; color: #4b5563; font-weight: normal; margin: 0 0 20px 0; }
            .qr-img { width: 240px; height: 240px; border-radius: 16px; border: 1px solid #e5e7eb; padding: 10px; }
            .tag { display: inline-block; background: #eef2ff; color: #4338ca; padding: 6px 16px; border-radius: 999px; font-weight: bold; font-size: 14px; margin-bottom: 20px; border: 1px solid #c7d2fe; }
            p { font-size: 14px; color: #4b5563; line-height: 1.6; margin: 20px 0 0 0; }
            .footer { font-size: 12px; color: #9ca3af; margin-top: 30px; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="tag">منظومة حضورك الذكية • كادر المدرسة</div>
            <h1>${school.name}</h1>
            <h2>رابط انضمام وتسجيل المعلمين والإداريين</h2>
            <img src="${qrApiUrl}" class="qr-img" alt="QR Code" />
            <p>امسح الباركود بجوالك للانضمام لكادر المدرسة واختيار فصولك وحصصك المسندة مباشرة.</p>
            <div class="footer">كود المدرسة: ${school.code}</div>
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
      className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fadeIn"
      dir="rtl"
    >
      <div className="relative bg-white rounded-3xl max-w-xl w-full p-6 sm:p-7 space-y-5 shadow-2xl border border-slate-200 text-right my-auto">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center justify-center">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-800 text-[10px] font-black">
                  رابط المعلمين والكادر الإداري 👨‍🏫
                </span>
              </div>
              <h3 className="text-base font-black text-slate-900 mt-0.5">
                رابط انضمام وتسجيل كادر المدرسة
              </h3>
              <p className="text-xs text-slate-500">مدرسة: {school.name}</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Explanation */}
        <div className="bg-indigo-50/80 border border-indigo-200/80 rounded-2xl p-4 text-xs text-indigo-950 leading-relaxed space-y-1.5">
          <p className="font-black text-indigo-900 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-indigo-600" />
            <span>كيف يفيدك هذا الرابط؟</span>
          </p>
          <p className="text-slate-700">
            أرسل هذا الرابط إلى مجموعة واتساب المعلمين والمساعدين الإداريين بالمدرسة؛ ليقوم كل معلم بالدخول وإدخال اسمه ورقم هويته واختيار الفصول المسندة إليه فوراً دون الحاجة لإدخالهم يدوياً واحداً تلو الآخر!
          </p>
        </div>

        {/* Action 1: Direct Link Input with 1-click copy */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-slate-700">
            رابط انضمام المعلمين المباشر:
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={invitation.registrationUrl}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 font-mono text-xs text-slate-800 focus:outline-hidden select-all"
            />
            <button
              type="button"
              onClick={handleCopyLink}
              className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-1.5 shrink-0 transition-all cursor-pointer shadow-xs ${
                copiedLink
                  ? 'bg-emerald-600 text-white'
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white'
              }`}
            >
              {copiedLink ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span>{copiedLink ? 'تم النسخ' : 'نسخ الرابط'}</span>
            </button>
          </div>
        </div>

        {/* Action 2: WhatsApp Share Message */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-bold text-slate-700">
              رسالة واتساب الجاهزة للإرسال للمعلمين:
            </label>
            <button
              type="button"
              onClick={handleCopyMessage}
              className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
            >
              {copiedMessage ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedMessage ? 'تم نسخ نص الرسالة' : 'نسخ النص'}</span>
            </button>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 text-xs text-slate-700 whitespace-pre-line font-sans max-h-36 overflow-y-auto leading-relaxed border-r-4 border-r-indigo-500">
            {invitation.message}
          </div>

          <a
            href={invitation.whatsappUrl}
            target="_blank"
            rel="noreferrer"
            className="w-full py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 transition-all cursor-pointer"
          >
            <MessageSquare className="w-4.5 h-4.5" />
            <span>مشاركة الرسالة في قروب واتساب المعلمين 📲</span>
          </a>
        </div>

        {/* Action 3: Print QR Code and Direct Form */}
        <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handlePrintQr}
            className="px-4 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold text-xs flex items-center gap-2 transition-colors cursor-pointer"
          >
            <Printer className="w-4 h-4 text-slate-500" />
            <span>طباعة بوستر الباركود لغرفة المعلمين</span>
          </button>

          <button
            type="button"
            onClick={onOpenDirectStaffRegistration}
            className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-2 transition-colors cursor-pointer"
          >
            <UserPlus className="w-4 h-4 text-emerald-400" />
            <span>تجربة فتح نموذج التسجيل الآن</span>
          </button>
        </div>

      </div>
    </div>
  );
};
