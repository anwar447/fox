import React from 'react';
import { 
  Building2, 
  MapPin, 
  ShieldAlert, 
  BookOpen, 
  Users, 
  GraduationCap, 
  Sparkles, 
  ArrowLeft, 
  CheckCircle2, 
  Zap, 
  FileText, 
  Smartphone, 
  Clock, 
  ShieldCheck, 
  BellRing, 
  Layers,
  ChevronLeft
} from 'lucide-react';
import { School, User } from '../types';

interface LandingPageProps {
  schools: School[];
  users: User[];
  onOpenLogin: () => void;
  onOpenDemoSwitcher: () => void;
  onOpenRegisterSchool: () => void;
  onOpenPaymentModal?: (plan: 'semester' | 'yearly' | 'free_forever') => void;
  onSelectUser: (user: User) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  schools,
  users,
  onOpenLogin,
  onOpenDemoSwitcher,
  onOpenRegisterSchool,
  onOpenPaymentModal,
  onSelectUser,
}) => {
  const totalStudents = users.filter((u) => u.role === 'student').length;
  const totalStaff = users.filter((u) => u.role === 'teacher' || u.role === 'employee').length;

  return (
    <div className="space-y-16 animate-fadeIn pb-24 text-slate-800">
      
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-950 text-white p-8 sm:p-12 md:p-16 shadow-2xl border border-emerald-500/20">
        
        {/* Ambient background decoration */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl space-y-6">
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-black shadow-inner">
              <Sparkles className="w-4 h-4 text-emerald-400 animate-pulse" />
              <span>نظام حضورك الذكي - الجيل القادم لإدارة المدارس السعودية</span>
            </div>

            {/* Quran Memorization Free Initiative Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 text-xs font-black shadow-inner animate-bounce">
              <BookOpen className="w-4 h-4 text-amber-400" />
              <span>مبادرة خاصة: النظام مجاني بالكامل مدى الحياة لمدارس تحفيظ القرآن الكريم</span>
            </div>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight sm:leading-snug text-white">
            تحضير الطلاب بالسياج الجغرافي، كشف التباين، ومطابقة نظام نور
          </h1>

          <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-2xl font-normal">
            منظومة متكاملة تُمكّن الطلاب من تسجيل الحضور ذاتياً بهواتفهم داخل حرم المدرسة، وتمنح المعلمين تحضيراً سريعاً بضغطة زر، وتكشف حالات الهروب للإدارة المدرسية فورياً مع إشعارات أولياء الأمور.
          </p>

          {/* Action CTAs */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              onClick={onOpenRegisterSchool}
              className="px-6 py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm transition-all shadow-lg hover:shadow-emerald-500/25 cursor-pointer flex items-center gap-2"
            >
              <Building2 className="w-5 h-5" />
              <span>تسجيل وإنشاء مدرسة جديدة مجاناً (30 يوماً)</span>
              <ArrowLeft className="w-4 h-4" />
            </button>

            <button
              onClick={onOpenLogin}
              className="px-6 py-3.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-bold text-sm border border-white/20 transition-all cursor-pointer flex items-center gap-2"
            >
              <Users className="w-5 h-5" />
              <span>تسجيل الدخول للمنسوبين والمدارس</span>
            </button>
          </div>

          {/* Key Quick Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-6 border-t border-white/10 text-xs">
            <div className="bg-white/5 rounded-2xl p-3 border border-white/10">
              <span className="text-[11px] text-slate-400 block">المدارس المعتمدة</span>
              <strong className="text-xl font-black text-white">{schools.length} مدارس</strong>
            </div>
            <div className="bg-white/5 rounded-2xl p-3 border border-white/10">
              <span className="text-[11px] text-slate-400 block">الطلاب المسجلين</span>
              <strong className="text-xl font-black text-emerald-400">+{totalStudents} طالب</strong>
            </div>
            <div className="bg-white/5 rounded-2xl p-3 border border-white/10">
              <span className="text-[11px] text-slate-400 block">دقة السياج الجغرافي</span>
              <strong className="text-xl font-black text-teal-300">100% GPS</strong>
            </div>
            <div className="bg-white/5 rounded-2xl p-3 border border-white/10">
              <span className="text-[11px] text-slate-400 block">مطابقة نظام نور</span>
              <strong className="text-xl font-black text-amber-300">توافق كامل</strong>
            </div>
          </div>

        </div>
      </section>

      {/* Direct School Registration & Trial Section */}
      <section className="space-y-6">
        <div className="text-center space-y-2 max-w-2xl mx-auto">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-black">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            <span>جاهز للإنتاج الفعلي والمدارس المعتمدة</span>
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900">
            ابدأ تجربة مدرستك الذكية لمدة 30 يوماً مجاناً
          </h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            أنشئ مدرستك الخاصة الآن في أقل من دقيقتين، واستفد من فترة تجربة مجانية كاملة لمدة شهر (30 يوماً) تشمل السياج الجغرافي، التحضير الذكي، مطابقة نور، وتقارير المدير.
          </p>
        </div>

        <div className="bg-gradient-to-r from-emerald-900 via-slate-900 to-teal-950 rounded-3xl p-6 sm:p-8 text-white flex flex-col md:flex-row items-center justify-between gap-6 border border-emerald-500/30 shadow-xl">
          <div className="space-y-2 max-w-xl">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-400/30">
                تجربة مجانية 30 يوماً
              </span>
              <span className="text-xs text-amber-300 font-bold">بدون الحاجة لبطاقة ائتمان</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-black text-white">
              أنشئ مدرستك الآن وجرب المنظومة مع طلابك ومعلميك
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              تحصل فوراً على كود مدرسي خاص، حساب إداري معتمد، استيراد بيانات الطلاب من نور عبر الإكسل، وتفعيل السياج الجغرافي بدقة متناهية.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0">
            <button
              onClick={onOpenRegisterSchool}
              className="px-6 py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm transition-all shadow-lg hover:shadow-emerald-500/25 cursor-pointer flex items-center gap-2"
            >
              <Building2 className="w-5 h-5" />
              <span>تسجيل مدرسة جديدة الآن</span>
              <ArrowLeft className="w-4 h-4" />
            </button>
            <button
              onClick={onOpenLogin}
              className="px-5 py-3.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs border border-white/20 transition-all cursor-pointer"
            >
              دخول حساب مدرسة سابقة
            </button>
          </div>
        </div>
      </section>

      {/* Special Grand Quran Memorization Schools Initiative Section (إعلان مدارس تحفيظ القرآن الكريم المجاني) */}
      <section className="rounded-3xl bg-gradient-to-br from-amber-950 via-slate-900 to-emerald-950 text-white p-8 sm:p-12 border-4 border-amber-400/60 shadow-2xl relative overflow-hidden">
        {/* Background ambient lighting */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-8">
          {/* Badge & Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-amber-400/30 pb-6">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-amber-500/20 border-2 border-amber-400 text-amber-300 text-xs sm:text-sm font-black shadow-lg">
                <BookOpen className="w-5 h-5 text-amber-400" />
                <span>مبادرة خدمة القرآن الكريم وأهله • ترخيص مجاني دائم (0 ريال) 100%</span>
              </div>
              <h2 className="text-2xl sm:text-4xl font-black text-white leading-tight">
                نظام «راصد» مجاناً بالكامل لجميع مدارس ومجمعات وحلقات تحفيظ القرآن الكريم
              </h2>
            </div>

            <div className="shrink-0 flex items-center gap-2">
              <span className="px-4 py-2 rounded-2xl bg-amber-400/20 border border-amber-400/40 text-amber-200 font-mono font-black text-sm">
                مدى الحياة • دائم 100%
              </span>
            </div>
          </div>

          {/* Description & Value Props */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4 text-amber-50/90 text-sm sm:text-base leading-relaxed">
              <p>
                امتثالاً لقول النبي ﷺ: <strong className="text-amber-300 font-black">«خيركم من تعلم القرآن وعلمه»</strong>، وتقديراً للجهود المباركة لمدارس ومجمعات وحلقات تحفيظ القرآن الكريم بالمملكة العربية السعودية، يُمنح نظام راصد بكافة إمكانياته المتقدمة <strong className="text-amber-300 underline font-black">مجاناً بالكامل وبلا أي رسوم سنوية أو اشتراكات مدى الحياة</strong>.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-white/5 border border-amber-400/20">
                  <CheckCircle2 className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <strong className="text-white block font-bold text-sm mb-0.5">عدد غير محدود للطلاب والحلقات</strong>
                    <span className="text-amber-200/80">إمكانية إضافة كافة المراحل والشعب وحلقات التحفيظ دون قيود.</span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-white/5 border border-amber-400/20">
                  <CheckCircle2 className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <strong className="text-white block font-bold text-sm mb-0.5">سياج جغرافي وكشف التباين</strong>
                    <span className="text-amber-200/80">تحضير ذكي بالجوال داخل المقر وكشف تلقائي لأي طالب خارج الحلقة.</span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-white/5 border border-amber-400/20">
                  <CheckCircle2 className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <strong className="text-white block font-bold text-sm mb-0.5">تقارير وأرشفة جاهزة للطباعة</strong>
                    <span className="text-amber-200/80">كشوفات يومية وأسبوعية معتمدة بصيغة PDF وتوافق كامل مع نظام نور.</span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-white/5 border border-amber-400/20">
                  <CheckCircle2 className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <strong className="text-white block font-bold text-sm mb-0.5">تفعيل فوري ودعم فني مخصص</strong>
                    <span className="text-amber-200/80">توليد كود المدرسة مباشرة وبدء الاستخدام في دقائق معدودة.</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Box */}
            <div className="p-6 rounded-3xl bg-amber-400/10 border-2 border-amber-400/40 flex flex-col justify-between space-y-6 text-center">
              <div className="space-y-2">
                <span className="text-xs font-black text-amber-400 uppercase tracking-wider block">
                  ترخيص مجاني دائم ومفتوح
                </span>
                <div className="text-4xl sm:text-5xl font-black text-amber-300">
                  0 <span className="text-sm font-bold text-amber-100">ريال مدى الحياة</span>
                </div>
                <p className="text-xs text-amber-200 font-medium">
                  يشمل الصلاحيات المفتوحة والتحديثات المستقبلية مجاناً
                </p>
              </div>

              <button
                onClick={onOpenRegisterSchool}
                className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black text-sm transition-all shadow-xl hover:shadow-amber-400/30 cursor-pointer flex items-center justify-center gap-2 transform active:scale-95"
              >
                <BookOpen className="w-5 h-5 text-slate-950" />
                <span>تسجيل مدرسة / مجمع تحفيظ قرآن الآن ↵</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Core Innovative Features (المميزات الرئيسية) */}
      <section className="bg-white rounded-3xl p-8 sm:p-12 border border-slate-200 shadow-xs space-y-10">
        
        <div className="text-center space-y-2 max-w-xl mx-auto">
          <span className="text-xs font-black text-emerald-700">حلول ابتكارية للميدان التعليمي</span>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900">
            لماذا يختار مدراء المدارس والمعلمون "حضورك"؟
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold">
              <MapPin className="w-5 h-5" />
            </div>
            <h3 className="font-black text-slate-900 text-base">سياج جغرافي دقيق (Geofence)</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              تحديد نطاق المدرسة بدقة من 100م إلى 1000م. الزر يظل معطلاً خارج النطاق ويتحول للأخضر التفاعلي فور وصول الطالب داخل المدرسة.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center font-bold">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <h3 className="font-black text-slate-900 text-base">كشف الهروب والتباين الآلي</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              إذا سجل الطالب بجواله صباحاً ورصده المعلم غائباً في الحصة، يُطلق النظام تنبيهاً أحمر فورياً بصورة الطالب للتعرف عليه ومتابعة ولي أمره.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center font-bold">
              <FileText className="w-5 h-5" />
            </div>
            <h3 className="font-black text-slate-900 text-base">مطابقة نور والتقارير الرسمية</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              حساب الفارق التلقائي مع نظام نور الوزاري وتوليد كشوفات الحضور اليومية المعتمدة بتواقيع الوكيل والمدير جاهزة للطباعة فوراً.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-amber-600 text-white flex items-center justify-center font-bold">
              <Clock className="w-5 h-5" />
            </div>
            <h3 className="font-black text-slate-900 text-base">ضبط أوقات الدوام بدقة</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              تخصيص كامل لمواعيد الطابور، بدء الحصة، وقت احتساب التأخر، احتساب الغياب الكامل، الفسحة، وموعد الانصراف لكل مدرسة.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold">
              <BellRing className="w-5 h-5" />
            </div>
            <h3 className="font-black text-slate-900 text-base">إشعارات ويب فورية وطوارئ</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              إرسال إشعارات وتنبيهات مباشرة لجميع المنسوبين والطلاب وأولياء الأمور حتى لو كان المتصفح مصغراً أو مغلقاً، مع بث رسائل الطوارئ.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center font-bold">
              <Users className="w-5 h-5" />
            </div>
            <h3 className="font-black text-slate-900 text-base">فريق إداري مساعد متكامل</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              الموظف المؤسس يستطيع إضافة مساعدين إداريين وتحديد صلاحياتهم لمساعدته في رصد الحضور، واعتماد الأعذار، وإدارة الطلاب.
            </p>
          </div>

        </div>

      </section>

      {/* Subscription Plans & Pricing (باقات وتراخيص المدارس) */}
      <section className="space-y-8">
        
        <div className="text-center space-y-2 max-w-xl mx-auto">
          <span className="text-xs font-black text-emerald-700 uppercase">باقات التراخيص المعتمدة</span>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900">
            خطط اشتراك مرنة تناسب كافة المدارس
          </h2>
          <p className="text-xs text-slate-500">
            تفعيل فوري مع دعم فني متكامل وتحديثات مستمرة
          </p>
        </div>

        {/* Special Free Quran Memorization School Dedicated Card / Banner */}
        <div className="max-w-5xl mx-auto rounded-3xl bg-gradient-to-r from-amber-900 via-amber-950 to-slate-900 text-white p-6 sm:p-8 border-2 border-amber-400/50 shadow-2xl relative overflow-hidden">
          <div className="absolute -left-12 -bottom-12 w-48 h-48 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-3 text-right">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 text-xs font-black">
                <BookOpen className="w-4 h-4 text-amber-400" />
                <span>مبادرة خدمة القرآن الكريم (مجاني 100% مدى الحياة)</span>
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-white">
                باقة مدارس تحفيظ القرآن الكريم (بنين وبنات)
              </h3>
              <p className="text-xs sm:text-sm text-amber-100/90 max-w-2xl leading-relaxed">
                تقديراً لدور حلقات ومدارس ومجمعات تحفيظ القرآن الكريم في المملكة العربية السعودية، نوفر النظام <strong className="text-amber-300 font-black">مجاناً بالكامل وبلا أي رسوم سنوية أو فصلية وبصلاحيات مفتوحة مدى الحياة</strong> (يشمل السياج الجغرافي، كشف التباين، مطابقة نور، وتقارير الغياب).
              </p>
              <div className="flex flex-wrap gap-4 pt-1 text-xs text-amber-200">
                <span className="flex items-center gap-1.5 font-bold">
                  <CheckCircle2 className="w-4 h-4 text-amber-400" />
                  ترخيص دائم مجاني (0 ريال)
                </span>
                <span className="flex items-center gap-1.5 font-bold">
                  <CheckCircle2 className="w-4 h-4 text-amber-400" />
                  عدد طلاب وحلقات وفصول غير محدود
                </span>
                <span className="flex items-center gap-1.5 font-bold">
                  <CheckCircle2 className="w-4 h-4 text-amber-400" />
                  تفعيل فوري ودعم فني مخصص
                </span>
              </div>
            </div>

            <div className="shrink-0 w-full md:w-auto">
              <button
                onClick={onOpenRegisterSchool}
                className="w-full md:w-auto px-6 py-4 rounded-2xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black text-sm transition-all shadow-xl hover:shadow-amber-500/20 cursor-pointer flex items-center justify-center gap-2"
              >
                <BookOpen className="w-5 h-5 text-slate-950" />
                <span>تسجيل مدرسة تحفيظ قرآن مجاناً ↵</span>
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          
          {/* Free Trial */}
          <div className="bg-white rounded-3xl p-6 border-2 border-slate-200 shadow-xs flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-bold">
                الباقة التجريبية
              </span>
              <div>
                <h3 className="text-xl font-black text-slate-900">تجربة مجانية 30 يوماً</h3>
                <p className="text-xs text-slate-500 mt-1">أنشئ مدرستك وجرب النظام بكامل الصلاحيات، ثم يتوقف النظام تلقائياً بعد 30 يوماً ما لم يتم الترقية</p>
              </div>
              <div className="text-3xl font-black text-slate-900">0 <span className="text-xs font-normal text-slate-500">ريال / 30 يوماً</span></div>
              
              <ul className="space-y-2.5 text-xs text-slate-600 pt-2 border-t border-slate-100">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>تفعيل تلقائي وفوري فور إنشاء المدرسة</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>سياج جغرافي وتطبيق هاتف للطلاب والمعلمين</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>كشف التباين والهروب ومطابقة نور</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0" />
                  <span className="text-amber-800 font-bold">تتوقف الصلاحيات بعد 30 يوماً حتى التجديد</span>
                </li>
              </ul>
            </div>

            <button
              onClick={onOpenRegisterSchool}
              className="w-full py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Building2 className="w-4 h-4" />
              <span>أنشئ مدرستك وابدأ التجربة (30 يوماً) ↵</span>
            </button>
          </div>

          {/* Semester Plan (450 SAR - as in Salla store) */}
          <div className="bg-white rounded-3xl p-6 border-2 border-emerald-500 shadow-xl flex flex-col justify-between space-y-6 relative overflow-hidden">
            <div className="absolute top-0 left-0 bg-emerald-600 text-white text-[10px] font-black px-4 py-1 rounded-br-2xl">
              اشتراك نصف سنوي
            </div>

            <div className="space-y-4">
              <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-black">
                اشتراك نصف سنوي - نظام حضورك الذكي
              </span>
              <div>
                <h3 className="text-xl font-black text-slate-900">منظومة الحضور والانصراف المدرسية</h3>
                <p className="text-xs text-slate-500 mt-1">بالسياج الجغرافي وتقارير نور عبر متجر سلة</p>
              </div>
              <div className="text-3xl font-black text-emerald-700">450 <span className="text-xs font-normal text-slate-500">ريال / نصف سنوي</span></div>
              
              <ul className="space-y-2.5 text-xs text-slate-600 pt-2 border-t border-slate-100">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>استيعاب طلاب ومعلمين غير محدودين</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>إضافة حتى 4 موظفين مساعدين للمؤسس</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>مطابقة نظام نور التلقائية + إشعارات الويب</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>سداد فوري وموثوق عبر متجر سلة</span>
                </li>
              </ul>
            </div>

            <div className="space-y-2">
              <a
                href="https://salla.sa/Misstark"
                target="_blank"
                rel="noreferrer"
                className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs transition-colors cursor-pointer shadow-xs flex items-center justify-center gap-1.5"
              >
                <span>🛒 شراء عبر متجر سلة (450 ريال) ↵</span>
              </a>
              <button
                onClick={() => onOpenPaymentModal ? onOpenPaymentModal('semester') : onOpenRegisterSchool()}
                className="w-full py-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-900 font-bold text-xs border border-emerald-200 transition-colors cursor-pointer flex items-center justify-center gap-1"
              >
                <span>خيارات السداد والتحويل المباشر</span>
              </button>
            </div>
          </div>

          {/* Full Year Plan (800 SAR - as in Salla store) */}
          <div className="bg-white rounded-3xl p-6 border-2 border-amber-400/80 shadow-xl flex flex-col justify-between space-y-6 relative overflow-hidden">
            <div className="absolute top-0 left-0 bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 text-[10px] font-black px-4 py-1 rounded-br-2xl">
              الأفضل قيمة (وفر 100 ريال)
            </div>

            <div className="space-y-4">
              <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-black">
                اشتراك سنوي - نظام حضورك الذكي
              </span>
              <div>
                <h3 className="text-xl font-black text-slate-900">منظومة الحضور والانصراف المدرسية</h3>
                <p className="text-xs text-slate-500 mt-1">بالسياج الجغرافي وتقارير نور عبر متجر سلة</p>
              </div>
              <div className="text-3xl font-black text-emerald-700">800 <span className="text-xs font-normal text-slate-500">ريال / سنة كاملة</span></div>
              
              <ul className="space-y-2.5 text-xs text-slate-600 pt-2 border-t border-slate-100">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>تغطية عام دراسي كامل مع كافة الفصول</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>كشف الهروب الفوري وصور الطلاب الرقمية</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>تقارير Excel مخصصة وأرشفة رسمية معتمدة</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>سداد مباشر وموثوق عبر متجر سلة</span>
                </li>
              </ul>
            </div>

            <div className="space-y-2">
              <a
                href="https://salla.sa/Misstark"
                target="_blank"
                rel="noreferrer"
                className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs transition-colors cursor-pointer shadow-xs flex items-center justify-center gap-1.5"
              >
                <span>🛒 شراء عبر متجر سلة (800 ريال) ↵</span>
              </a>
              <button
                onClick={() => onOpenPaymentModal ? onOpenPaymentModal('yearly') : onOpenRegisterSchool()}
                className="w-full py-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-800 font-bold text-xs border border-slate-200 transition-colors cursor-pointer flex items-center justify-center gap-1"
              >
                <span>خيارات السداد والتحويل المباشر</span>
              </button>
            </div>
          </div>

        </div>

      </section>

      {/* Footer CTA */}
      <div className="bg-emerald-900 text-white rounded-3xl p-8 text-center space-y-4 shadow-lg">
        <h3 className="text-xl font-black">جاهز للبدء في تنظيم حضور مدرستك بذكاء وسرعة؟</h3>
        <p className="text-xs text-emerald-200 max-w-lg mx-auto">
          أنشئ مدرستك الآن، اضبط مواقيت الدوام وسياج الموقع، وابدأ رصد الحضور الذاتي ومطابقة نور في دقائق معدودة.
        </p>
        <button
          onClick={onOpenRegisterSchool}
          className="px-8 py-3 rounded-xl bg-white text-emerald-950 font-black text-xs hover:bg-emerald-50 transition-all cursor-pointer shadow-md"
        >
          إنشاء وتسجيل مدرستي الآن مجاناً ↵
        </button>
      </div>

    </div>
  );
};
