import React, { useState } from 'react';
import { 
  X, CreditCard, Phone, MessageSquare, Copy, Check, 
  ShieldCheck, Sparkles, CheckCircle2, BookOpen, Clock, Building2
} from 'lucide-react';
import { SubscriptionPlan } from '../types';

interface PaymentInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialPlan?: 'semester' | 'yearly' | 'free_trial' | 'free_forever';
  onProceedToRegister?: () => void;
}

export const PaymentInfoModal: React.FC<PaymentInfoModalProps> = ({
  isOpen,
  onClose,
  initialPlan = 'semester',
  onProceedToRegister,
}) => {
  const [selectedPlan, setSelectedPlan] = useState<'semester' | 'yearly' | 'free_forever' | 'free_trial'>(initialPlan);
  const [copiedPhone, setCopiedPhone] = useState(false);
  const [transferRef, setTransferRef] = useState('');
  const [senderName, setSenderName] = useState('');
  const [isSuccessSubmitted, setIsSuccessSubmitted] = useState(false);

  if (!isOpen) return null;

  const paymentPhone = '0548171965';
  const whatsappPhone = '966548171965';

  const handleCopyPhone = () => {
    navigator.clipboard?.writeText(paymentPhone);
    setCopiedPhone(true);
    setTimeout(() => setCopiedPhone(false), 2500);
  };

  const getAmount = () => {
    if (selectedPlan === 'semester') return '450';
    if (selectedPlan === 'yearly') return '800';
    return '0';
  };

  const getPlanTitle = () => {
    if (selectedPlan === 'semester') return 'باقة الفصل الدراسي الواحد';
    if (selectedPlan === 'yearly') return 'باقة السنة الدراسية الكاملة';
    if (selectedPlan === 'free_forever') return 'باقة مدارس تحفيظ القرآن الكريم (مجاني مدى الحياة)';
    return 'الباقة التجريبية (30 يوماً)';
  };

  const handleSubmitTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSuccessSubmitted(true);
    setTimeout(() => {
      if (onProceedToRegister) {
        onProceedToRegister();
      }
      onClose();
    }, 2000);
  };

  return (
    <div 
      className="fixed inset-0 z-[120] overflow-y-auto bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6" 
      dir="rtl"
      role="dialog"
      aria-modal="true"
    >
      <div className="fixed inset-0 bg-transparent -z-10" onClick={onClose} />

      <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-200 z-10 my-auto animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-emerald-950 to-teal-900 text-white p-5 sm:p-6 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-400 via-amber-300 to-teal-400" />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-300">
                <CreditCard className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg sm:text-xl font-black">باقات الاشتراك وسداد التراخيص</h3>
                <p className="text-xs text-slate-300">التحويل المباشر وتفعيل التراخيص الرسمية للمدارس</p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/10 hover:bg-rose-600 text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-5 sm:p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          
          {/* Plan Selector Buttons */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700">اختر باقة الترخيص المطلوبة:</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              
              {/* Semester Plan */}
              <button
                type="button"
                onClick={() => { setSelectedPlan('semester'); setIsSuccessSubmitted(false); }}
                className={`p-4 rounded-2xl border-2 text-right transition-all cursor-pointer flex flex-col justify-between space-y-2 ${
                  selectedPlan === 'semester'
                    ? 'border-emerald-600 bg-emerald-50/70 shadow-md ring-2 ring-emerald-500/20'
                    : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <strong className="text-sm font-black text-slate-900 block">اشتراك نصف سنوي</strong>
                    <span className="text-[11px] text-slate-500">فصل دراسي كامل بكافة الصلاحيات</span>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-black text-emerald-700">450</span>
                    <span className="text-[10px] text-slate-500 mr-1">ريال</span>
                  </div>
                </div>
                <div className="text-[10px] text-emerald-800 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  <span>تفعيل فوري + عدد غير محدود من الطلاب</span>
                </div>
              </button>

              {/* Full Year Plan */}
              <button
                type="button"
                onClick={() => { setSelectedPlan('yearly'); setIsSuccessSubmitted(false); }}
                className={`p-4 rounded-2xl border-2 text-right transition-all cursor-pointer flex flex-col justify-between space-y-2 relative overflow-hidden ${
                  selectedPlan === 'yearly'
                    ? 'border-emerald-600 bg-emerald-50/70 shadow-md ring-2 ring-emerald-500/20'
                    : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                }`}
              >
                <span className="absolute top-0 left-0 bg-amber-500 text-slate-950 font-black text-[9px] px-2.5 py-0.5 rounded-br-lg">
                  الأفضل قيمة (توفير 100 ريال)
                </span>
                <div className="flex items-start justify-between">
                  <div>
                    <strong className="text-sm font-black text-slate-900 block">اشتراك سنوي كامل</strong>
                    <span className="text-[11px] text-slate-500">عام دراسي كامل متواصل</span>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-black text-emerald-700">800</span>
                    <span className="text-[10px] text-slate-500 mr-1">ريال</span>
                  </div>
                </div>
                <div className="text-[10px] text-emerald-800 font-bold flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-500" />
                  <span>توفير 100 ريال + دعم فني VIP وتحديثات</span>
                </div>
              </button>

              {/* Quran School Initiative */}
              <button
                type="button"
                onClick={() => { setSelectedPlan('free_forever'); setIsSuccessSubmitted(false); }}
                className={`p-3.5 rounded-2xl border-2 text-right transition-all cursor-pointer flex items-center justify-between ${
                  selectedPlan === 'free_forever'
                    ? 'border-amber-500 bg-amber-50 shadow-md'
                    : 'border-slate-200 bg-white hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-amber-600" />
                  <div>
                    <strong className="text-xs font-black text-slate-900 block">مدارس تحفيظ القرآن الكريم</strong>
                    <span className="text-[10px] text-amber-800">مبادرة مجانية 100% مدى الحياة</span>
                  </div>
                </div>
                <span className="text-sm font-black text-amber-600">0 ريال</span>
              </button>

              {/* Free Trial */}
              <button
                type="button"
                onClick={() => { setSelectedPlan('free_trial'); setIsSuccessSubmitted(false); }}
                className={`p-3.5 rounded-2xl border-2 text-right transition-all cursor-pointer flex items-center justify-between ${
                  selectedPlan === 'free_trial'
                    ? 'border-slate-800 bg-slate-100 shadow-md'
                    : 'border-slate-200 bg-white hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-slate-600" />
                  <div>
                    <strong className="text-xs font-black text-slate-900 block">الباقة التجريبية المجانية</strong>
                    <span className="text-[10px] text-slate-500">تجربة النظام لمدة 30 يوماً</span>
                  </div>
                </div>
                <span className="text-sm font-black text-slate-700">0 ريال</span>
              </button>

            </div>
          </div>

          {/* Dedicated Payment Info Card (Urpay / Al Rajhi uPay) */}
          {(selectedPlan === 'semester' || selectedPlan === 'yearly') ? (
            <div className="bg-gradient-to-br from-emerald-900 via-teal-950 to-slate-900 text-white rounded-3xl p-5 sm:p-6 border-2 border-emerald-400/40 shadow-xl space-y-4 relative overflow-hidden">
              
              <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <div className="px-3 py-1 bg-emerald-500/20 text-emerald-300 rounded-lg text-xs font-black border border-emerald-400/30">
                    uPay الراجحي (Urpay)
                  </div>
                  <span className="text-xs text-slate-300">التحويل المباشر السريع</span>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-300">المبلغ المستحق: </span>
                  <strong className="text-xl font-black text-amber-300 font-mono">{getAmount()} ريال</strong>
                </div>
              </div>

              {/* Salla Store Direct Payment Button */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-lg">
                <div className="text-center sm:text-right">
                  <div className="font-black text-sm text-slate-950 flex items-center gap-1.5 justify-center sm:justify-start">
                    <span>🛒 السداد الفوري عبر متجر سلة الإلكتروني</span>
                    <span className="px-2 py-0.5 rounded-full bg-slate-950 text-white text-[10px] font-bold">موصى به</span>
                  </div>
                  <p className="text-[11px] text-slate-900 font-medium">سداد بمدى، فيزا، ماستركارد، Apple Pay، أو STC Pay بأمان وسرعة</p>
                </div>
                <a
                  href="https://salla.sa/Misstark"
                  target="_blank"
                  rel="noreferrer"
                  className="shrink-0 px-5 py-2.5 rounded-xl bg-slate-950 hover:bg-slate-900 text-white font-black text-xs transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
                >
                  <span>الدفع الآن عبر متجر سلة ↵</span>
                </a>
              </div>

              {/* Mobile Number Box for Transfer */}
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="space-y-1 text-center sm:text-right">
                  <span className="text-xs text-slate-300 font-medium block">
                    رقم الجوال للتحويل عبر <strong className="text-white font-black">uPay الراجحي</strong>:
                  </span>
                  <div className="text-2xl sm:text-3xl font-black text-emerald-300 font-mono tracking-wider">
                    {paymentPhone}
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={handleCopyPhone}
                    className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs transition-all shadow-md cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    {copiedPhone ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    <span>{copiedPhone ? 'تم النسخ بنجاح ✓' : 'نسخ رقم الجوال'}</span>
                  </button>

                  <a
                    href={`https://wa.me/${whatsappPhone}?text=${encodeURIComponent(`السلام عليكم، أرغب في سداد وتفعيل اشتراك نظام حضورك الذكي (${getPlanTitle()}) بمبلغ ${getAmount()} ريال.`)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-4 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 text-white font-bold text-xs border border-white/20 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <MessageSquare className="w-4 h-4 text-emerald-300" />
                    <span>تأكيد بالواتساب</span>
                  </a>
                </div>
              </div>

              {/* Instructions */}
              <div className="text-[11px] text-slate-300 space-y-1 leading-relaxed bg-black/20 p-3 rounded-xl border border-white/10">
                <div className="font-bold text-white mb-1">خطوات السداد والتفعيل:</div>
                <p>1. افتح تطبيق <strong className="text-emerald-300 font-bold">uPay الراجحي (Urpay)</strong> على هاتفك.</p>
                <p>2. اختر تحويل إلى محفظة / رقم جوال وأدخل الرقم: <strong className="text-white font-mono font-black">{paymentPhone}</strong>.</p>
                <p>3. حوّل المبلغ المحدد (<strong className="text-amber-300 font-bold">{getAmount()} ريال</strong>) واكتب اسم مدرستك في الملاحظات.</p>
                <p>4. أدخل اسم المحول أو الرقم المرجعي بالأسفل لتفعيل الترخيص فوراً.</p>
              </div>

              {/* Confirmation / Reference Form */}
              <form onSubmit={handleSubmitTransfer} className="space-y-3 pt-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="اسم المحول / اسم المدرسة"
                    value={senderName}
                    onChange={(e) => setSenderName(e.target.value)}
                    className="bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-400 focus:outline-none focus:border-emerald-400"
                    required
                  />
                  <input
                    type="text"
                    placeholder="الرقم المرجعي للحوالة (اختياري)"
                    value={transferRef}
                    onChange={(e) => setTransferRef(e.target.value)}
                    className="bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-400 font-mono focus:outline-none focus:border-emerald-400"
                  />
                </div>

                {isSuccessSubmitted ? (
                  <div className="p-3 bg-emerald-500/30 border border-emerald-400 text-emerald-200 rounded-xl text-xs font-bold text-center flex items-center justify-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                    <span>تم استلام بيانات التحويل بنجاح! جاري تفعيل الترخيص...</span>
                  </div>
                ) : (
                  <button
                    type="submit"
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black text-xs transition-all shadow-md cursor-pointer flex items-center justify-center gap-2"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>تأكيد التحويل والمتابعة لإنشاء المدرسة</span>
                  </button>
                )}
              </form>

            </div>
          ) : selectedPlan === 'free_forever' ? (
            <div className="bg-amber-50 border-2 border-amber-300 rounded-3xl p-5 space-y-3 text-amber-950">
              <div className="flex items-center gap-2 font-black text-sm text-amber-900">
                <BookOpen className="w-5 h-5 text-amber-600" />
                <span>مبادرة تحفيظ القرآن الكريم (مجاني 100% مدى الحياة)</span>
              </div>
              <p className="text-xs text-amber-900/80 leading-relaxed">
                لا يلزم أي دفع أو تحويل مالي. النظام متاح مجاناً بصلاحيات مفتوحة ومستمرة لخدمة كتاب الله وأهل القرآن الكريم.
              </p>
              <button
                type="button"
                onClick={() => {
                  if (onProceedToRegister) onProceedToRegister();
                  onClose();
                }}
                className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition-colors cursor-pointer shadow-sm"
              >
                المتابعة لإنشاء مدرسة التحفيظ مجاناً ↵
              </button>
            </div>
          ) : (
            <div className="bg-slate-100 border border-slate-200 rounded-3xl p-5 space-y-3 text-slate-800">
              <div className="flex items-center gap-2 font-black text-sm text-slate-900">
                <Clock className="w-5 h-5 text-emerald-700" />
                <span>الباقة التجريبية المجانية (30 يوماً)</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                استمتع بتجربة كامل مميزات المنظومة مجاناً وبدون أي بطاقة دفع لمدة شهر كامل.
              </p>
              <button
                type="button"
                onClick={() => {
                  if (onProceedToRegister) onProceedToRegister();
                  onClose();
                }}
                className="w-full py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-black text-xs transition-colors cursor-pointer shadow-sm"
              >
                بدء التجربة المجانية لمدرستي ↵
              </button>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="bg-slate-50 p-4 px-6 border-t border-slate-200 flex items-center justify-between text-xs">
          <span className="text-slate-500 font-medium">
            دعم فني مباشر وسداد موثوق عبر uPay الراجحي
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl transition-colors cursor-pointer"
          >
            إغلاق
          </button>
        </div>

      </div>
    </div>
  );
};
