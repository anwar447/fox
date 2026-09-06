import React from 'react';
import { School } from '../types';
import { 
  Sparkles, CheckCircle2, ShieldCheck, MapPin, 
  ScanLine, AlertTriangle, Users, BookOpen, 
  ArrowLeft, Heart, Smartphone, Zap, Building2, UserPlus, FileSpreadsheet,
  QrCode, Check, Award
} from 'lucide-react';
import { LiveClockHeader } from './LiveClockHeader';

interface LandingPageProps {
  schools: School[];
  onOpenLogin: () => void;
  onOpenRegisterSchool: () => void;
  onOpenParentRegistration: () => void;
  onOpenStaffRegistration?: () => void;
  onOpenPaymentModal: (plan: 'yearly' | 'free_forever') => void;
  onOpenDonationModal?: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  schools,
  onOpenLogin,
  onOpenRegisterSchool,
  onOpenParentRegistration,
  onOpenStaffRegistration,
  onOpenPaymentModal,
  onOpenDonationModal,
}) => {
  return (
    <div className="space-y-12 py-8 px-4 max-w-6xl mx-auto text-slate-800" dir="rtl">
      
      {/* Live Day, Date & Live Clock Header Bar */}
      <LiveClockHeader />

      {/* Hero Section */}
      <div className="text-center space-y-6 pt-2">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold shadow-xs">
          <Sparkles className="w-4 h-4 text-emerald-600" />
          <span>المنظومة السحابية المعتمدة لضبط الحضور والانضباط المدرسي 1448هـ</span>
        </div>

        <h1 className="text-3xl sm:text-5xl font-black text-slate-900 leading-tight tracking-tight max-w-3xl mx-auto">
          حُضُورَكْ الذكي <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-600">سياج جغرافي وكشف هروب فوري</span>
        </h1>

        <p className="text-slate-600 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed">
          نظام متكامل يربط بين البوابة الذكية، حضور الحصص مع المعلمين، كشف التباين والهروب تلقائياً، وبوابة إشعارات وأعذار أولياء الأمور المباشرة.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-3">
          <button
            onClick={onOpenLogin}
            className="px-8 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm shadow-lg shadow-emerald-600/20 transition-all transform hover:-translate-y-0.5 cursor-pointer flex items-center gap-2"
          >
            <span>تسجيل الدخول للمنظومة</span>
            <ArrowLeft className="w-4 h-4" />
          </button>

          <button
            onClick={onOpenRegisterSchool}
            className="px-6 py-3.5 rounded-2xl bg-white hover:bg-slate-50 text-emerald-700 border border-emerald-300 font-bold text-sm transition-all cursor-pointer flex items-center gap-2 shadow-xs"
          >
            <Building2 className="w-4 h-4 text-emerald-600" />
            <span>تسجيل وتفعيل مدرسة جديدة 🚀</span>
          </button>

          <button
            onClick={onOpenParentRegistration}
            className="px-6 py-3.5 rounded-2xl bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 font-bold text-sm transition-all cursor-pointer flex items-center gap-2"
          >
            <UserPlus className="w-4 h-4 text-teal-600" />
            <span>تسجيل طالب وولي أمر ⚡</span>
          </button>

          {onOpenStaffRegistration && (
            <button
              onClick={onOpenStaffRegistration}
              className="px-6 py-3.5 rounded-2xl bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 font-bold text-sm transition-all cursor-pointer flex items-center gap-2"
            >
              <Users className="w-4 h-4 text-indigo-600" />
              <span>تسجيل معلم / كادر مدرسي 👥</span>
            </button>
          )}
        </div>
      </div>

      {/* Feature Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white border border-slate-200/90 rounded-3xl p-6 space-y-3 shadow-xs hover:shadow-md transition-shadow">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center">
            <MapPin className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-black text-slate-900">سياج جغرافي ذكي (Geofence)</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            التحضير الذاتي للطالب لا يتم إلا داخل النطاق الجغرافي الفعلي للمدرسة وبدقة GPS عالية لمنع أي تحضير وهمي.
          </p>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-3xl p-6 space-y-3 shadow-xs hover:shadow-md transition-shadow">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100 text-rose-600 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-black text-slate-900">كشف التباين والهروب الفوري</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            مقارنة فورية بين مسح البوابة ورصد المعلم في الحصة؛ إذا حضر الطالب في الصباح وغاب عن الحصة يتم تنبيه الإدارة فوراً.
          </p>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-3xl p-6 space-y-3 shadow-xs hover:shadow-md transition-shadow">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center">
            <Smartphone className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-black text-slate-900">بوابة ولي الأمر والأعذار</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            تنبيهات فورية على الواتساب، تقارير انضباط دورية، وإمكانية تقديم الأعذار الطبية والمستندات بضغطة زر.
          </p>
        </div>
      </div>

      {/* Pricing & Subscriptions Section */}
      <div className="space-y-6 text-center pt-8 border-t border-slate-200">
        <div className="space-y-2">
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900">خطط الاشتراك والترخيص المدرسي</h2>
          <p className="text-xs sm:text-sm text-slate-500">أسعار رمزية ومناسبة لدعم المدارس، ومجاناً مدى الحياة لمدارس وحلقات تحفيظ القرآن الكريم 🌟</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto text-right">
          {/* Yearly Plan (Single Annual Subscription - 333 SAR for a Full Year) */}
          <div className="bg-white border-2 border-emerald-500 rounded-3xl p-6 sm:p-7 space-y-5 relative flex flex-col justify-between shadow-lg ring-1 ring-emerald-500/20">
            <div className="space-y-3.5">
              <div className="flex items-center justify-between gap-2">
                <span className="px-3.5 py-1 rounded-full bg-emerald-600 text-white text-xs font-black inline-flex items-center gap-1 shadow-xs">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>الخطة السنوية المعتمدة الشاملة 🔥</span>
                </span>
                <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                  سنة كاملة 12 شهر
                </span>
              </div>
              
              <div>
                <h3 className="text-xl font-black text-slate-900">اشتراك سنوي شامل لكامل المدرسة</h3>
                <p className="text-xs text-slate-500 mt-1 font-medium">سنة دراسية كاملة دون أي رسوم إضافية أو قيود على عدد الطلاب</p>
              </div>

              <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-3.5 flex items-baseline gap-2">
                <span className="text-3xl sm:text-4xl font-black text-emerald-700 font-mono">333</span>
                <span className="text-xs font-bold text-slate-700">ريال فقط / سنة كاملة (12 شهراً)</span>
              </div>

              <ul className="text-xs text-slate-700 space-y-2.5 pt-1 font-medium">
                <li className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-[10px]">✓</span>
                  <span>تغطية شاملة للعام الدراسي كاملاً (12 شهراً متواصلة)</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-[10px]">✓</span>
                  <span>استيراد وتسكين كشوفات نظام نور (Excel) لجميع الفصول بنقرة زر</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-[10px]">✓</span>
                  <span>التحضير الذكي الثلاثي: باركود QR + سياج جغرافي + رصد يدوي</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-[10px]">✓</span>
                  <span>بوابات خاصة للمدير، المعلمين، الإداريين، والطلاب وأولياء الأمور</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-[10px]">✓</span>
                  <span>روابط واتساب فورية ودعم فني وتحديثات مستمرة طوال العام</span>
                </li>
              </ul>
            </div>

            <button
              onClick={() => onOpenPaymentModal('yearly')}
              className="w-full py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm shadow-md shadow-emerald-600/25 transition-all cursor-pointer flex items-center justify-center gap-2 mt-2"
            >
              <span>تسجيل المدرسة وبدء الاشتراك السنوي (333 ريال فقط) 🔥</span>
            </button>
          </div>

          {/* Quran School Plan (FREE FOREVER) */}
          <div className="bg-gradient-to-b from-amber-50/70 to-white border-2 border-amber-300 rounded-3xl p-6 sm:p-7 space-y-5 relative flex flex-col justify-between shadow-sm">
            <div className="space-y-3.5">
              <div className="flex items-center justify-between gap-2">
                <span className="px-3.5 py-1 rounded-full bg-amber-100 text-amber-900 text-xs font-black border border-amber-300 inline-block">
                  وقف تعليمي خيري 🌟
                </span>
                <span className="text-[11px] font-bold text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                  دعم الحلقات والمجمعات
                </span>
              </div>

              <div>
                <h3 className="text-xl font-black text-slate-900">مدارس وحلقات تحفيظ القرآن الكريم</h3>
                <p className="text-xs text-slate-500 mt-1 font-medium">مجمعات ومدارس ودور وحلقات القرآن الكريم بنين وبنات</p>
              </div>

              <div className="bg-amber-100/60 border border-amber-300/80 rounded-2xl p-3.5 flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-black text-amber-800">مجاناً مدى الحياة</span>
                <span className="text-xs font-bold text-slate-700">(0 ريال - دعم دائم)</span>
              </div>

              <ul className="text-xs text-slate-700 space-y-2.5 pt-1 font-medium">
                <li className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-[10px]">✓</span>
                  <span>عدد غير محدود من الطلاب والطالبات والحلقات والفصول</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-[10px]">✓</span>
                  <span>تحضير إلكتروني بالباركود الذكي والسياج الجغرافي للمسجد أو المجمع</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-[10px]">✓</span>
                  <span>متابعة الغياب والأعذار وتتبع التسميع والحضور يومياً</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-[10px]">✓</span>
                  <span>دعم فني كامل واحتساب الأجر صدقة جارية</span>
                </li>
              </ul>
            </div>

            <button
              onClick={() => onOpenPaymentModal('free_forever')}
              className="w-full py-3.5 rounded-2xl bg-amber-600 hover:bg-amber-500 text-white font-black text-sm transition-all cursor-pointer shadow-sm flex items-center justify-center gap-2 mt-2"
            >
              <span>تسجيل مجمع تحفيظ قرآن (مجاناً مدى الحياة) 🌟</span>
            </button>
          </div>
        </div>

        {/* Informative Step-by-Step Flow Explanation */}
        <div className="bg-emerald-50/60 border border-emerald-200/80 rounded-2xl p-3.5 max-w-3xl mx-auto flex items-center justify-center gap-2 text-xs text-emerald-900 font-bold">
          <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>خطوة بخطوة: ابدأ بتسجيل مدرستك الآن وتجربة المنظومة، وعند إضافة كشوفات طلابك وكادرك المدرسي يتم استكمال السداد والتفعيل النهائي بسهولة.</span>
        </div>
      </div>

      {/* Support & Coffee Donation Section */}
      <div className="bg-gradient-to-br from-amber-50/70 via-white to-rose-50/50 border border-amber-200/90 rounded-3xl p-6 sm:p-8 text-center space-y-4 shadow-xs">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold">
          <Heart className="w-4 h-4 text-rose-500 fill-rose-500" />
          <span>المساهمة والدعم المجتمعي للمنظومة</span>
        </div>
        
        <h3 className="text-xl sm:text-2xl font-black text-slate-900">
          ادعم استمرار وتطوير منصة "حضورك" ☕
        </h3>
        
        <p className="text-xs sm:text-sm text-slate-600 max-w-2xl mx-auto leading-relaxed">
          سواء كان دعماً رمزياً بكوب قهوة للمبرمجين أو رعاية كداعم فضي أو ذهبي، مساهمتكم الكريمة تسهم في تغطية الخوادم وتطوير مزايا إضافية مجانية للمدارس وحلقات القرآن.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          {onOpenDonationModal && (
            <button
              onClick={onOpenDonationModal}
              className="px-6 py-3 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs sm:text-sm flex items-center gap-2 shadow-md shadow-rose-600/20 cursor-pointer transition-all"
            >
              <Heart className="w-4 h-4 fill-white" />
              <span>دعم التطبيق (كوب قهوة / داعم ذهبي) ☕✨</span>
            </button>
          )}
        </div>
      </div>

      {/* Developer & Technical Support Banner */}
      <div className="bg-white border border-emerald-200 rounded-3xl p-6 sm:p-7 text-center space-y-3 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-4 text-right sm:text-right">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <strong className="text-sm font-black text-slate-900">
                التطبيق من برمجة وتطوير د. أنور الألمعي
              </strong>
            </div>
            <p className="text-xs text-slate-500">
              للتواصل المباشر، الاستشارات التقنية، والدعم الفني لمنظومة حُضُورَكْ الذكية لجميع المدارس بالمملكة.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <a
              href="https://wa.me/966548171965"
              target="_blank"
              rel="noreferrer"
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs flex items-center gap-2 shadow-sm transition-all"
            >
              <span>واتساب الدعم: 0548171965 💬</span>
            </a>
          </div>
        </div>
      </div>

    </div>
  );
};
