import React from 'react';
import { School } from '../types';
import { 
  Sparkles, CheckCircle2, ShieldCheck, MapPin, 
  ScanLine, AlertTriangle, Users, BookOpen, 
  ArrowLeft, Heart, Smartphone, Zap, Building2, UserPlus, FileSpreadsheet,
  QrCode, Check, Award, Share2
} from 'lucide-react';
import { LiveClockHeader } from './LiveClockHeader';

interface LandingPageProps {
  schools: School[];
  onOpenLogin: () => void;
  onOpenRegisterSchool: () => void;
  onOpenParentRegistration: () => void;
  onOpenStaffRegistration?: () => void;
  onOpenPaymentModal?: (plan: 'yearly' | 'free_forever') => void;
  onOpenDonationModal?: () => void;
  onOpenDirectLinks?: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  schools,
  onOpenLogin,
  onOpenRegisterSchool,
  onOpenParentRegistration,
  onOpenStaffRegistration,
  onOpenPaymentModal,
  onOpenDonationModal,
  onOpenDirectLinks,
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

          {onOpenDirectLinks && (
            <button
              onClick={onOpenDirectLinks}
              className="px-6 py-3.5 rounded-2xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 font-bold text-sm transition-all cursor-pointer flex items-center gap-2"
            >
              <Share2 className="w-4 h-4 text-amber-700" />
              <span>روابط الدخول الذكية والمشاركة 🔗</span>
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

      {/* Free Platform & Donor Supported Section */}
      <div className="space-y-6 text-center pt-8 border-t border-slate-200 dark:border-slate-800">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-black">
            <Sparkles className="w-4 h-4 text-emerald-600" />
            <span>مبادرة تقنية تعليمية مجانية بالكامل 🌟</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
            المنظومة مجانية بالكامل وقائمة على الداعمين فقط
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed">
            لا توجد أي رسوم سنوية أو تكاليف اشتراك. التطبيق متاح مجاناً لكافة المدارس والمجمعات التعليمية بنين وبنات، ومستمر بفضل الله ثم مساهمات الداعمين وأهل الخير.
          </p>
        </div>

        <div className="max-w-4xl mx-auto bg-gradient-to-b from-white to-emerald-50/40 dark:from-slate-900 dark:to-emerald-950/20 border-2 border-emerald-500/40 dark:border-emerald-600/40 rounded-3xl p-6 sm:p-8 space-y-6 shadow-lg text-right">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
            <div>
              <span className="px-3.5 py-1 rounded-full bg-emerald-600 text-white text-xs font-black inline-flex items-center gap-1 shadow-xs">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>مجاني 100% لجميع المدارس بدون أي رسوم سنوية</span>
              </span>
              <h3 className="text-xl font-black text-slate-900 dark:text-white mt-2">
                ترخيص شامل ومفتوح لكافة المدارس والمجمعات وحلقات التحفيظ
              </h3>
            </div>
            <div className="bg-emerald-100/70 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-700 px-4 py-2 rounded-2xl text-center">
              <span className="text-2xl sm:text-3xl font-black text-emerald-800 dark:text-emerald-300">0 ريال</span>
              <span className="block text-[10px] text-emerald-950 dark:text-emerald-200 font-bold">مجاناً مدى الحياة</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-700 dark:text-slate-300 font-medium">
            <div className="flex items-center gap-2.5 bg-white dark:bg-slate-800/80 p-3 rounded-2xl border border-slate-200 dark:border-slate-700">
              <span className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-bold text-xs shrink-0">✓</span>
              <span>عدد غير محدود من الطلاب والطالبات والصفوف والشعب</span>
            </div>
            <div className="flex items-center gap-2.5 bg-white dark:bg-slate-800/80 p-3 rounded-2xl border border-slate-200 dark:border-slate-700">
              <span className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-bold text-xs shrink-0">✓</span>
              <span>استيراد كشوفات نظام نور (Excel) بنقرة واحدة وتسكينها تلقائياً</span>
            </div>
            <div className="flex items-center gap-2.5 bg-white dark:bg-slate-800/80 p-3 rounded-2xl border border-slate-200 dark:border-slate-700">
              <span className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-bold text-xs shrink-0">✓</span>
              <span>السياج الجغرافي الذكي وكشف التباين والهروب الفوري</span>
            </div>
            <div className="flex items-center gap-2.5 bg-white dark:bg-slate-800/80 p-3 rounded-2xl border border-slate-200 dark:border-slate-700">
              <span className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-bold text-xs shrink-0">✓</span>
              <span>كشوفات الطلاب ونقل الطلاب بين الفصول والشعب والطباعة</span>
            </div>
            <div className="flex items-center gap-2.5 bg-white dark:bg-slate-800/80 p-3 rounded-2xl border border-slate-200 dark:border-slate-700">
              <span className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-bold text-xs shrink-0">✓</span>
              <span>إدارة وقبول الأعذار (قبول مشروط وقبول رسمي) مع إشعار ولي الأمر</span>
            </div>
            <div className="flex items-center gap-2.5 bg-white dark:bg-slate-800/80 p-3 rounded-2xl border border-slate-200 dark:border-slate-700">
              <span className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-bold text-xs shrink-0">✓</span>
              <span>بوابات تفاعلية مستقلة للإدارة والمعلمين والطلاب وأولياء الأمور</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              onClick={onOpenRegisterSchool}
              className="px-8 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm shadow-md shadow-emerald-600/25 transition-all cursor-pointer flex items-center gap-2"
            >
              <Building2 className="w-4 h-4" />
              <span>تسجيل وتفعيل مدرستك مجاناً الآن 🚀</span>
            </button>

            {onOpenDonationModal && (
              <button
                onClick={onOpenDonationModal}
                className="px-6 py-3.5 rounded-2xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-sm transition-all cursor-pointer flex items-center gap-2"
              >
                <Heart className="w-4 h-4 fill-rose-500 text-rose-500" />
                <span>المساهمة في دعم واستمرار المنظومة (كداعم) ☕❤️</span>
              </button>
            )}
          </div>
        </div>

        {/* Informative Note */}
        <div className="bg-emerald-50/60 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/60 rounded-2xl p-3.5 max-w-3xl mx-auto flex items-center justify-center gap-2 text-xs text-emerald-900 dark:text-emerald-200 font-bold">
          <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>منظومة غير ربحية قائمة على التطوع التقني ومساهمات أهل الخير، لخدمة منسوبي التعليم في جميع أنحاء المملكة العربية السعودية.</span>
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
