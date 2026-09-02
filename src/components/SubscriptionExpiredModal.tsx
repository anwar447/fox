import React from 'react';
import { School } from '../types';
import { AlertTriangle, Clock, CreditCard, ShieldAlert, Sparkles } from 'lucide-react';

interface SubscriptionExpiredModalProps {
  isOpen: boolean;
  school: School;
  onOpenPaymentModal: (plan: 'semester' | 'yearly') => void;
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
            مدرسة ({school.name}) تحتاج إلى تجديد الاشتراك لمتابعة تسجيل الحضور والانضباط المدرسي.
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
        </div>

        <div className="grid grid-cols-2 gap-3 pt-2">
          <button
            onClick={() => {
              onClose();
              onOpenPaymentModal('semester');
            }}
            className="py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-emerald-600/20"
          >
            <CreditCard className="w-4 h-4" />
            <span>تجديد فصلي</span>
          </button>
          <button
            onClick={() => {
              onClose();
              onOpenPaymentModal('yearly');
            }}
            className="py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-indigo-600/20"
          >
            <Sparkles className="w-4 h-4" />
            <span>تجديد سنوي</span>
          </button>
        </div>
      </div>
    </div>
  );
};
