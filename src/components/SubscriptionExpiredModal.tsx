import React from 'react';
import { School } from '../types';
import { AlertTriangle, Clock, CreditCard, Phone, MessageSquare, ArrowLeft } from 'lucide-react';

interface SubscriptionExpiredModalProps {
  isOpen: boolean;
  school: School;
  onOpenPaymentModal: (plan: 'semester' | 'yearly') => void;
  onLogout: () => void;
}

export const SubscriptionExpiredModal: React.FC<SubscriptionExpiredModalProps> = ({
  isOpen,
  school,
  onOpenPaymentModal,
  onLogout,
}) => {
  if (!isOpen) return null;

  const isTrial = school.subscriptionPlan === 'free_trial';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn" dir="rtl">
      <div className="bg-white rounded-3xl shadow-2xl border border-rose-200 w-full max-w-lg overflow-hidden text-right">
        
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-rose-700 via-rose-800 to-slate-900 text-white flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-white border border-white/20 shrink-0">
            <AlertTriangle className="w-6 h-6 text-amber-300 animate-pulse" />
          </div>
          <div>
            <span className="px-2.5 py-0.5 rounded-full bg-rose-500/30 text-rose-200 text-[10px] font-bold border border-rose-400/30">
              {isTrial ? 'انتهاء الفترة التجريبية (30 يوماً)' : 'انتهاء ترخيص المنظومة'}
            </span>
            <h2 className="text-lg font-black text-white mt-0.5">
              تنبيه إيقاف خدمة مدرسة ({school.name})
            </h2>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-100 space-y-2 text-xs text-rose-950 leading-relaxed">
            <p className="font-bold">
              {isTrial
                ? `لقد انتهت الفترة التجريبية المجانية المخصصة لمدرستكم (30 يوماً) بتاريخ (${school.subscriptionExpiryDate}). تم إيقاف رصد الحضور الذكي مؤقتاً لحين تجديد الاشتراك.`
                : `لقد انتهت صلاحية ترخيص الاشتراك المدرسي بتاريخ (${school.subscriptionExpiryDate}). يرجى تجديد الترخيص للاستمرار في استخدام المنظومة.`}
            </p>
            <p className="text-slate-600 text-[11px]">
              بيانات طلابكم وكشوفات الحضور وسجلات نور محفوظة بأمان تام في قاعدة البيانات وسيتم استئناف الخدمة فوراً بمجرد سداد رسوم الترخيص.
            </p>
          </div>

          {/* Pricing Options */}
          <div className="space-y-2.5">
            <div className="text-xs font-black text-slate-800">
              اختر باقة التجديد المناسبة لمدرستكم:
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Semester */}
              <button
                type="button"
                onClick={() => onOpenPaymentModal('semester')}
                className="p-4 rounded-2xl border-2 border-emerald-600 bg-emerald-50/50 hover:bg-emerald-50 text-right flex flex-col justify-between space-y-2 transition-all cursor-pointer shadow-xs"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-black text-slate-900 text-sm">اشتراك نصف سنوي</span>
                    <span className="text-xs font-black text-emerald-700 font-mono">450 ريال</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">ترخيص فصلي كامل لجميع الطلاب والمعلمين</p>
                </div>
                <span className="text-xs font-bold text-emerald-800 flex items-center gap-1 pt-2 border-t border-emerald-200">
                  <span>سداد وتفعيل الباقة</span>
                  <ArrowLeft className="w-3.5 h-3.5" />
                </span>
              </button>

              {/* Yearly */}
              <button
                type="button"
                onClick={() => onOpenPaymentModal('yearly')}
                className="p-4 rounded-2xl border-2 border-slate-900 bg-slate-900 text-white text-right flex flex-col justify-between space-y-2 transition-all cursor-pointer shadow-md relative overflow-hidden"
              >
                <span className="absolute top-0 left-0 bg-amber-500 text-slate-950 font-black text-[9px] px-2 py-0.5 rounded-br-lg">
                  الأفضل قيمة
                </span>
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-black text-white text-sm">اشتراك سنوي كامل</span>
                    <span className="text-xs font-black text-amber-300 font-mono">800 ريال</span>
                  </div>
                  <p className="text-[11px] text-slate-300 mt-1">عام دراسي كامل مع دعم فني مستمر</p>
                </div>
                <span className="text-xs font-bold text-amber-300 flex items-center gap-1 pt-2 border-t border-white/10">
                  <span>سداد وتفعيل الباقة</span>
                  <ArrowLeft className="w-3.5 h-3.5" />
                </span>
              </button>
            </div>
          </div>

          {/* Direct Support */}
          <div className="p-3.5 rounded-2xl bg-slate-100 flex items-center justify-between text-xs text-slate-700">
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-emerald-600" />
              <span>للدعم المالي والتحويل المباشر:</span>
            </div>
            <strong className="font-mono font-black text-slate-900 text-sm">0548171965</strong>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onLogout}
              className="text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
            >
              تسجيل الخروج
            </button>
            <a
              href="https://wa.me/966548171965?text=%D8%A7%D9%84%D8%B3%D9%84%D8%A7%D9%85%20%D8%B9%D9%84%D9%8A%D9%83%D9%85%D8%8C%20%D9%86%D8%B1%D8%BA%D8%A8%20%D8%A8%D8%AA%D8%AC%D8%AF%D9%8A%D8%AF%20%D8%AA%D8%B1%D8%AE%D9%8A%D8%B5%20%D9%85%D8%AF%D8%B1%D8%B3%D8%A9%20"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 hover:text-emerald-800"
            >
              <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
              <span>تواصل مع الإدارة عبر الواتساب</span>
            </a>
          </div>

        </div>

      </div>
    </div>
  );
};
