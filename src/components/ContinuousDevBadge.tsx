import React, { useState } from 'react';
import { Sparkles, MessageCircle, X, Check, Code, ShieldCheck, Heart } from 'lucide-react';

interface ContinuousDevBadgeProps {
  variant?: 'floating' | 'header' | 'inline';
}

export const ContinuousDevBadge: React.FC<ContinuousDevBadgeProps> = ({ variant = 'floating' }) => {
  const [isOpen, setIsOpen] = useState(false);

  const modalContent = (
    <div className="fixed inset-0 z-70 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fadeIn" dir="rtl">
      <div className="bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-600/50 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 text-slate-800 dark:text-slate-100">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-md shadow-emerald-600/20 font-bold">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  منظومة حُضُورَكْ الذكية
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200 text-[10px] font-black border border-amber-300 dark:border-amber-700">
                  نسخة تجريبية 🧪
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                مشروع خيري وتقني تحت التطوير والتحديث المستمر
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 flex items-center justify-center cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3 text-xs leading-relaxed">
          <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-emerald-950 dark:text-emerald-200 space-y-1.5 font-medium">
            <p className="font-bold flex items-center gap-1.5">
              <span>🌟</span>
              <span>نظام مجاني بالكامل لجميع مدارس ومجمعات المملكة</span>
            </p>
            <p className="text-[11px] leading-relaxed text-emerald-800 dark:text-emerald-300">
              هذه المنظومة قائمة بالكامل على جهود المبرمجين ومساهمات الداعمين، وهي خاضعة للمتابعة والتحديث اليومي لتلبية متطلبات الميدان التعليمي (مدراء، وكلاء، موجهين، معلمين، وأولياء أمور).
            </p>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 rounded-2xl p-3.5 space-y-2">
            <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <Code className="w-4 h-4 text-emerald-600" />
              <span>مزايا التطوير الجارية باستمرار:</span>
            </h4>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px] text-slate-700 dark:text-slate-300 font-medium">
              <li className="flex items-center gap-1">✓ قبول الأعذار المشروط والرسمي</li>
              <li className="flex items-center gap-1">✓ نقل الطلاب بين الصفوف والشعب</li>
              <li className="flex items-center gap-1">✓ وضع القراءة الليلي (Dark Mode)</li>
              <li className="flex items-center gap-1">✓ مزامنة ملفات نور Excel بنقرة واحدة</li>
              <li className="flex items-center gap-1">✓ السياج الجغرافي وكشف التباين</li>
              <li className="flex items-center gap-1">✓ طباعة وتصدير الكشوفات المدرسية</li>
            </ul>
          </div>

          <div className="p-3 bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 rounded-2xl text-[11px] text-amber-900 dark:text-amber-200">
            <strong>💡 رأيك يصنع الفرق:</strong> نرحب بمقترحاتكم وأفكاركم التطويرية أو الإبلاغ عن أي ملاحظة مباشرة إلى المطور.
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
          <div className="text-right text-[11px] text-slate-500 dark:text-slate-400">
            برمجة وتطوير: <strong className="text-slate-900 dark:text-white">د. أنور الألمعي</strong>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <a
              href="https://wa.me/966548171965?text=%D8%A7%D9%84%D8%B3%D9%84%D8%A7%D9%85%20%D8%B9%D9%84%D9%8A%D9%83%D9%85%20%D8%AF.%20%D8%A3%D9%86%D9%88%D8%B1%D8%8C%20%D9%84%D8%AF%D9%8A%20%D8%A7%D9%82%D8%AA%D8%B1%D8%A7%D8%AD/%D9%85%D9%84%D8%A7%D8%AD%D8%B8%D8%A9%20%D8%AD%D9%88%D9%84%20%D9%85%D9%86%D8%B5%D8%A9%20%D8%AD%D8%B6%D9%88%D8%B1%D9%83:"
              target="_blank"
              rel="noreferrer"
              className="flex-1 sm:flex-initial px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/20"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span>إرسال مقترح بالواتساب</span>
            </a>
            <button
              onClick={() => setIsOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs cursor-pointer"
            >
              إغلاق
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  if (variant === 'header') {
    return (
      <>
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-100 dark:hover:bg-amber-900/80 text-amber-900 dark:text-amber-200 border border-amber-200 dark:border-amber-700/80 text-[11px] font-black transition-all cursor-pointer shadow-2xs group"
          title="البرنامج تجريبي وتحت التطوير المستمر - انقر لمزيد من التفاصيل"
        >
          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
          <span>نسخة تجريبية تحت التطوير 🧪</span>
        </button>
        {isOpen && modalContent}
      </>
    );
  }

  // Floating variant at the bottom-left of screen, accessible on all pages
  return (
    <>
      <aside 
        aria-label="حالة المنظومة التجريبية"
        className="fixed bottom-4 left-4 z-40 hidden sm:flex items-center gap-2"
      >
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-md text-slate-800 dark:text-slate-200 border border-amber-300 dark:border-amber-700/70 shadow-lg hover:shadow-xl hover:border-amber-400 text-xs font-bold transition-all cursor-pointer transform hover:-translate-y-0.5 group"
          title="البرنامج تجريبي وتحت التطوير المستمر - اضغط للاقتراحات والملاحظات"
        >
          <div className="w-5 h-5 rounded-lg bg-amber-100 dark:bg-amber-900/80 text-amber-700 dark:text-amber-300 flex items-center justify-center text-xs font-black">
            🧪
          </div>
          <div className="text-right">
            <span className="block text-[11px] font-black text-amber-800 dark:text-amber-300 leading-tight">
              نسخة تجريبية وتحت التطوير المستمر
            </span>
            <span className="block text-[9px] text-slate-500 dark:text-slate-400">
              انقر لتقديم ملاحظة أو اقتراح ✨
            </span>
          </div>
        </button>
      </aside>
      {isOpen && modalContent}
    </>
  );
};
