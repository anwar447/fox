import React, { useState } from 'react';
import { 
  Heart, Copy, Check, X, Coffee, Sparkles, 
  Award, Crown, ShieldCheck, Gift, Star 
} from 'lucide-react';

interface DonationModalProps {
  isOpen: boolean;
  onClose: () => void;
  schoolName?: string;
}

type SupportTier = 'coffee' | 'silver' | 'gold' | 'diamond' | 'custom';

export const DonationModal: React.FC<DonationModalProps> = ({ isOpen, onClose }) => {
  const [selectedTier, setSelectedTier] = useState<SupportTier>('coffee');
  const [copiedIban, setCopiedIban] = useState(false);
  const [donorName, setDonorName] = useState('');
  const [isThanked, setIsThanked] = useState(false);

  const iban = 'SA0380000000608010167519';
  const bankName = 'مصرف الراجحي (Al Rajhi Bank)';
  const beneficiary = 'فريق تطوير وبرمجة منظومة حضورك الذكية';

  if (!isOpen) return null;

  const tiers: { id: SupportTier; title: string; price: string; icon: React.ReactNode; desc: string; badge: string; color: string }[] = [
    {
      id: 'coffee',
      title: 'كوب قهوة للمبرمجين ☕',
      price: '15 ريال',
      icon: <Coffee className="w-5 h-5 text-amber-700" />,
      desc: 'دعم رمزي يعبر عن تقديرك لجهد البرمجة والتطوير المستمر',
      badge: 'مشروب طاقة ☕',
      color: 'border-amber-300 bg-amber-50/50 hover:bg-amber-50 text-amber-900',
    },
    {
      id: 'silver',
      title: 'داعم فضي للمنظومة 🥈',
      price: '50 ريال',
      icon: <Star className="w-5 h-5 text-slate-500 fill-slate-400" />,
      desc: 'المساهمة في تغطية تكاليف الخوادم السحابية السريعة',
      badge: 'داعم متميز',
      color: 'border-slate-300 bg-slate-50/60 hover:bg-slate-100 text-slate-800',
    },
    {
      id: 'gold',
      title: 'داعم ذهبي متميز 🥇',
      price: '100 ريال',
      icon: <Award className="w-5 h-5 text-amber-600 fill-amber-500" />,
      desc: 'دعم كبير يساعد في برمجة وتطوير ميزات ذكية جديدة',
      badge: 'الأكثر شعبية 🌟',
      color: 'border-amber-400 bg-amber-50 hover:bg-amber-100 text-amber-950 shadow-xs',
    },
    {
      id: 'diamond',
      title: 'داعم بلاتيني وشريك نجاح 💎',
      price: '250+ ريال',
      icon: <Crown className="w-5 h-5 text-emerald-600 fill-emerald-500" />,
      desc: 'رعاية وقفية لتطوير خدمات المدارس القرآنية والتعليمية بالمجان',
      badge: 'شريك استراتيجي 👑',
      color: 'border-emerald-400 bg-emerald-50 hover:bg-emerald-100 text-emerald-950 shadow-xs',
    },
  ];

  const handleCopyIban = () => {
    navigator.clipboard.writeText(iban);
    setCopiedIban(true);
    setTimeout(() => setCopiedIban(false), 2500);
  };

  const handleSendThanks = (e: React.FormEvent) => {
    e.preventDefault();
    setIsThanked(true);
    setTimeout(() => {
      setIsThanked(false);
      onClose();
    }, 2500);
  };

  const activeTierObj = tiers.find((t) => t.id === selectedTier) || tiers[0];

  return (
    <div 
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fadeIn"
      dir="rtl"
    >
      <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full p-6 text-right space-y-5 shadow-2xl relative text-slate-800 my-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-3.5">
          <div className="flex items-center gap-2.5 text-rose-600">
            <div className="w-10 h-10 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600">
              <Heart className="w-5 h-5 fill-rose-500 text-rose-500" />
            </div>
            <div>
              <h3 className="font-black text-slate-900 text-base">دعم المنظومة وكوب قهوة للمبرمجين ☕</h3>
              <p className="text-xs text-slate-500 font-medium">مساهمتكم تصنع الفرق في استدامة وتطوير "حضورك"</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Message */}
        <p className="text-xs sm:text-sm text-slate-600 leading-relaxed bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
          تُقدَّم منظومة <strong>"حضورك"</strong> لخدمة الميدان التعليمي والمدارس القرآنية بأعلى كفاءة. دعمك الكريم يساهم مباشرة في سداد استضافات السيرفرات السحابية وتشجيع المبرمجين على الاستمرار في تقديم التحديثات والميزات الذكية 🚀
        </p>

        {/* Tiers Grid */}
        <div className="space-y-2">
          <span className="text-xs font-bold text-slate-700 block">اختر مستوى الدعم والمساهمة:</span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {tiers.map((t) => {
              const isSelected = selectedTier === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setSelectedTier(t.id)}
                  className={`p-3.5 rounded-2xl border text-right transition-all flex flex-col justify-between gap-2 cursor-pointer ${
                    isSelected
                      ? 'border-emerald-600 ring-2 ring-emerald-500/20 bg-emerald-50/70 shadow-xs'
                      : t.color
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 font-bold text-xs">
                      {t.icon}
                      <span>{t.title}</span>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-emerald-600" />}
                  </div>

                  <div className="flex items-baseline justify-between pt-1 border-t border-slate-200/60">
                    <span className="text-sm font-black text-slate-900">{t.price}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white/80 border border-slate-200 text-slate-700">
                      {t.badge}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Bank Card Info */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2.5 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-slate-500 font-medium">البنك:</span>
            <strong className="text-slate-900 font-bold">{bankName}</strong>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500 font-medium">المستفيد:</span>
            <strong className="text-slate-900 font-bold">{beneficiary}</strong>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500 font-medium">قيمة الدعم المختار ({activeTierObj.title}):</span>
            <strong className="text-emerald-700 font-black text-sm">{activeTierObj.price}</strong>
          </div>

          <div className="pt-2 border-t border-slate-200 space-y-1">
            <span className="text-slate-600 font-medium block">رقم الآيبان البنكي (IBAN):</span>
            <div className="flex items-center gap-2">
              <input 
                type="text" 
                readOnly 
                value={iban} 
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 font-mono text-xs text-emerald-800 font-bold text-left select-all" 
              />
              <button
                type="button"
                onClick={handleCopyIban}
                className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shrink-0 flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
              >
                {copiedIban ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedIban ? 'تم النسخ' : 'نسخ الآيبان'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Donor acknowledgement form */}
        <form onSubmit={handleSendThanks} className="space-y-2.5">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="اكتب اسمك الكريم أو اسم المدرسة للتشرف بشكرك..."
              value={donorName}
              onChange={(e) => setDonorName(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-emerald-500"
            />
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shrink-0 cursor-pointer"
            >
              تسجيل الدعم ❤️
            </button>
          </div>
          {isThanked && (
            <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold text-center">
              🎉 جزاك الله خيراً وبارك فيك! تم تسجيل مبادرتك الكريمة بنجاح.
            </div>
          )}
        </form>

        {/* Close button */}
        <div className="text-center pt-1">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
          >
            إغلاق النافذة
          </button>
        </div>

      </div>
    </div>
  );
};
