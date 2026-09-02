import React, { useState, useMemo } from 'react';
import { School } from '../types';
import { 
  buildParentRegistrationWhatsAppInvitation 
} from '../utils/magicLink';
import { 
  Share2, Copy, Check, Printer, MessageSquare, 
  X, UserPlus, Sparkles
} from 'lucide-react';

interface ParentRegistrationLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  school: School;
  onOpenDirectRegistration: () => void;
}

export const ParentRegistrationLinkModal: React.FC<ParentRegistrationLinkModalProps> = ({
  isOpen,
  onClose,
  school,
  onOpenDirectRegistration,
}) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedMessage, setCopiedMessage] = useState(false);

  const invitation = useMemo(() => {
    return buildParentRegistrationWhatsAppInvitation(school);
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
          <title>باركود تسجيل الطلاب وأولياء الأمور - ${school.name}</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; text-align: center; padding: 40px; margin: 0; }
            .card { border: 3px solid #059669; border-radius: 24px; padding: 40px 30px; max-width: 480px; margin: 0 auto; }
            h1 { font-size: 22px; color: #064e3b; margin: 0 0 10px 0; }
            h2 { font-size: 16px; color: #374151; font-weight: normal; margin: 0 0 20px 0; }
            .qr-img { width: 240px; height: 240px; border-radius: 16px; border: 1px solid #e5e7eb; padding: 10px; }
            .tag { display: inline-block; background: #ecfdf5; color: #047857; padding: 6px 16px; border-radius: 999px; font-weight: bold; font-size: 14px; margin-bottom: 20px; border: 1px solid #a7f3d0; }
            p { font-size: 14px; color: #4b5563; line-height: 1.6; margin: 20px 0 0 0; }
            .footer { font-size: 12px; color: #9ca3af; margin-top: 30px; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="tag">منظومة حضورك الذكية</div>
            <h1>${school.name}</h1>
            <h2>رابط التسجيل والتسكين الذاتي للطلاب وأولياء الأمور</h2>
            <img src="${qrApiUrl}" class="qr-img" alt="QR Code" />
            <p>امسح الباركود بكاميرا الجوال للانضمام واختيار الصف والفصل مباشرة.</p>
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
            <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center">
              <Share2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-black">
                  توليد رابط الانضمام الذكي 🔗
                </span>
              </div>
              <h3 className="text-base font-black text-slate-900 mt-0.5">
                رابط تسجيل وتسكين أولياء الأمور والطلاب
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
        <div className="bg-emerald-50/80 border border-emerald-200/80 rounded-2xl p-4 text-xs text-emerald-950 leading-relaxed space-y-1.5">
          <p className="font-black text-emerald-900 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-emerald-600" />
            <span>كيف يعمل هذا الرابط؟</span>
          </p>
          <p className="text-slate-700">
            عند إرسال هذا الرابط لولي الأمر، يفتحه ويدخل هويته وجواله ويختار <strong>الصف والفصل</strong> لابنه، فيقوم النظام بتسكين الطالب فوراً في كشوفات المدرسة وإصدار حسابه بدون أي جهد منك!
          </p>
        </div>

        {/* Action 1: Direct Link Input with 1-click copy */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-slate-700">
            الرابط المباشر للمدرسة:
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
                  : 'bg-slate-900 hover:bg-slate-800 text-white'
              }`}
            >
              {copiedLink ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
              <span>{copiedLink ? 'تم النسخ' : 'نسخ الرابط'}</span>
            </button>
          </div>
        </div>

        {/* Action 2: WhatsApp Share Message */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-bold text-slate-700">
              رسالة واتساب جاهزة للنشر في جروبات أولياء الأمور:
            </label>
            <button
              type="button"
              onClick={handleCopyMessage}
              className="text-[11px] font-bold text-emerald-700 hover:text-emerald-900 flex items-center gap-1 cursor-pointer"
            >
              {copiedMessage ? <Check className="w-3.5 h-3.5" /> : <Share2 className="w-3.5 h-3.5" />}
              <span>{copiedMessage ? 'تم نسخ الرسالة' : 'نسخ الرسالة كاملة'}</span>
            </button>
          </div>

          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-xs font-mono leading-relaxed text-slate-800 whitespace-pre-wrap select-all max-h-36 overflow-y-auto">
            {invitation.message}
          </div>
        </div>

        {/* WhatsApp & Print QR Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
          <a
            href={invitation.whatsappUrl}
            target="_blank"
            rel="noreferrer"
            className="py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors text-center shadow-md shadow-emerald-600/20"
          >
            <MessageSquare className="w-4 h-4" />
            <span>نشر في واتساب أولياء الأمور ↵</span>
          </a>

          <button
            type="button"
            onClick={handlePrintQr}
            className="py-3 px-4 rounded-xl bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <Printer className="w-4 h-4 text-slate-600" />
            <span>طباعة بوستر الباركود (QR) 🖨️</span>
          </button>
        </div>

        {/* Direct Open Form Option for Admin */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
          <span className="text-slate-500">
            أو يمكنك تسجيل طالب نيابة عن ولي الأمر الآن:
          </span>
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenDirectRegistration();
            }}
            className="font-bold text-emerald-700 hover:text-emerald-900 flex items-center gap-1 cursor-pointer bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-xl border border-emerald-200 transition-colors"
          >
            <UserPlus className="w-4 h-4" />
            <span>فتح نموذج التسجيل الفوري ↵</span>
          </button>
        </div>

      </div>
    </div>
  );
};
