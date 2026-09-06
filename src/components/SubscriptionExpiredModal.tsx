import React from 'react';
import { School } from '../types';
import { AlertTriangle, Crown, Sparkles, MessageCircle } from 'lucide-react';

interface SubscriptionExpiredModalProps {
  isOpen: boolean;
  school: School;
  onOpenPaymentModal: (plan: 'yearly') => void;
  onClose: () => void;
}

export const SubscriptionExpiredModal: React.FC<SubscriptionExpiredModalProps> = ({
  isOpen,
  school,
  onOpenPaymentModal,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fadeIn" dir="rtl">
      <div className="bg-white border border-amber-200 rounded-3xl max-w-md w-full p-6 text-right space-y-5 shadow-2xl text-slate-800">
        <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto">
          <AlertTriangle className="w-8 h-8" />
        </div>

        <div className="text-center space-y-1.5">
          <h3 className="text-lg font-black text-slate-900">انتهت فترة اشتراك المدرسة</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            مدرسة ({school.name}) تحتاج إلى تجديد الاشتراك لمتابعة تسجيل الحضور الصباحي والانضباط المدرسي وإشعارات أولياء الأمور.
          </p>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs space-y-2">
          <div className="flex justify-between">
            <span className="text-slate-500">تاريخ انتهاء الاشتراك:</span>
            <span className="font-mono text-amber-700 font-bold">{school.subscriptionEndDate}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">كود المدرسة:</span>
            <span className="font-mono text-slate-900 font-bold">{school.code}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">قيمة التجديد السنوي:</span>
            <span className="font-mono text-emerald-700 font-bold">333 ريال فقط (سنة كاملة 12 شهر)</span>
          </div>
        </div>

        <div className="space-y-2 pt-2">
          <button
            onClick={() => {
              onClose();
              onOpenPaymentModal('yearly');
            }}
            className="w-full py-3.5 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-emerald-600/20 transition-all"
          >
            <Crown className="w-4 h-4" />
            <span>تجديد الاشتراك السنوي (333 ريال فقط / سنة كاملة) 💳</span>
          </button>

          <a
            href="https://wa.me/966548171965?text=%D8%A7%D9%84%D8%B3%D9%84%D8%A7%D9%85%20%D8%B9%D9%84%D9%8A%D9%83%D9%85%20%D9%86%D8%AD%D9%86%20%D9%85%D8%AF%D8%B1%D8%B3%D8%A9%20%D8%AA%D8%AD%D9%81%D9%8A%D8%B8%20%D9%82%D8%B1%D8%A2%D9%86%20%D9%86%D8%B1%D8%BA%D8%A8%20%D8%A8%D8%AA%D9%81%D8%B9%D9%8A%D9%84%20%D8%A7%D9%84%D8%AE%D8%B7%D8%A9%20%D8%A7%D9%84%D9%85%D8%AC%D8%A7%D9%86%D9%8A%D8%A9"
            target="_blank"
            rel="noreferrer"
            className="w-full py-2.5 px-3 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            <span>مدرسة أو حلقة تحفيظ قرآن؟ (تفعيل مجاني مدى الحياة)</span>
          </a>
        </div>
      </div>
    </div>
  );
};
