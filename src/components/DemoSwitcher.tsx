import React from 'react';
import { User, School } from '../types';
import { 
  Building2, 
  BookOpen, 
  GraduationCap, 
  Users, 
  ShieldCheck, 
  Sparkles, 
  RotateCcw, 
  X, 
  CheckCircle2, 
  ArrowRight,
  School as SchoolIcon
} from 'lucide-react';

interface DemoSwitcherProps {
  isOpen: boolean;
  onClose: () => void;
  users: User[];
  schools: School[];
  currentUser: User | null;
  onSelectUser: (user: User) => void;
  onResetData: () => void;
}

export const DemoSwitcher: React.FC<DemoSwitcherProps> = ({
  isOpen,
  onClose,
  users,
  currentUser,
  onSelectUser,
  onResetData,
}) => {
  if (!isOpen) return null;

  const testRoles = [
    {
      roleName: 'موظف مؤسس (مدير النظام)',
      desc: 'إدارة المدارس (3 حد)، لوحة حية، كشف الهارب، إعدادات السياج ونور، إشعارات الطوارئ',
      nationalId: '1000472181',
      pass: '2181',
      badge: 'التحكم الكامل',
      color: 'border-emerald-200 bg-emerald-50/50 hover:border-emerald-500 hover:bg-emerald-50',
      icon: Building2,
      iconBg: 'bg-emerald-600 text-white',
    },
    {
      roleName: 'معلم مادة / فصل',
      desc: 'تحضير سريع للفصول المسندة، زري [الكل حاضر] و [الكل غائب]، تعديل فوري بالحصة',
      nationalId: '1001691367',
      pass: '1367',
      badge: 'رصد الحصص',
      color: 'border-blue-200 bg-blue-50/50 hover:border-blue-500 hover:bg-blue-50',
      icon: BookOpen,
      iconBg: 'bg-blue-600 text-white',
    },
    {
      roleName: 'طالب ثانوي (صقر قريش)',
      desc: 'أولى ثانوي فصل ب، زر حضور بالسياج الجغرافي، رفع أعذار طبية ومتابعة الحضور',
      nationalId: '2497120754',
      pass: '0754',
      badge: '384 طالب',
      color: 'border-amber-200 bg-amber-50/50 hover:border-amber-500 hover:bg-amber-50',
      icon: GraduationCap,
      iconBg: 'bg-amber-600 text-white',
    },
    {
      roleName: 'طالب متوسط (الراية)',
      desc: 'الأول المتوسط فصل أ، تسجيل الحضور الصباحي، مواقيت الدوام والانصراف',
      nationalId: '1169016985',
      pass: '6985',
      badge: '332 طالب',
      color: 'border-cyan-200 bg-cyan-50/50 hover:border-cyan-500 hover:bg-cyan-50',
      icon: GraduationCap,
      iconBg: 'bg-cyan-600 text-white',
    },
    {
      roleName: 'ولي أمر (ربط الأبناء)',
      desc: 'متابعة لحظية للأبناء، تنبيه غياب فوري، كتابة ملاحظات مباشرة لإدارة المدرسة',
      nationalId: '1023456789',
      pass: '6789',
      badge: 'بطاقات الأبناء',
      color: 'border-teal-200 bg-teal-50/50 hover:border-teal-500 hover:bg-teal-50',
      icon: Users,
      iconBg: 'bg-teal-600 text-white',
    },
    {
      roleName: 'سوبر أدمن (إشراف مركزي)',
      desc: 'متابعة جميع المدارس وتراخيصها، تفعيل وإيقاف المدارس، إنشاء اشتراكات واستفتاء',
      nationalId: '9999999999',
      pass: '9999',
      badge: 'رابط ?superadmin',
      color: 'border-purple-200 bg-purple-50/50 hover:border-purple-500 hover:bg-purple-50',
      icon: ShieldCheck,
      iconBg: 'bg-purple-600 text-white',
    },
  ];

  const handleSelectByNationalId = (nid: string) => {
    const found = users.find((u) => u.nationalId === nid);
    if (found) {
      onSelectUser(found);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold flex items-center gap-2">
                <span>لوحة تبديل الحسابات التجريبية</span>
              </h2>
              <p className="text-xs text-slate-300">
                اختر أي دور لتجربة النظام فوراً بالبيانات الحقيقية المعتمدة
              </p>
            </div>
          </div>
          <button
            id="demo-switcher-close-btn"
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content list */}
        <div className="p-5 overflow-y-auto space-y-3 divide-y divide-slate-100">
          <div className="text-xs font-bold text-slate-500 pb-1 flex items-center justify-between">
            <span>الحسابات الرسمية المحددة في الوثيقة:</span>
            <span className="text-[11px] font-normal text-slate-400">كلمة المرور الافتراضية = آخر 4 أرقام من الهوية</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            {testRoles.map((item) => {
              const isCurrent = currentUser?.nationalId === item.nationalId;
              const ItemIcon = item.icon;

              return (
                <button
                  key={item.nationalId}
                  id={`demo-user-btn-${item.nationalId}`}
                  onClick={() => handleSelectByNationalId(item.nationalId)}
                  className={`relative p-3.5 rounded-xl border text-right transition-all flex flex-col justify-between cursor-pointer group ${item.color} ${
                    isCurrent ? 'ring-2 ring-emerald-500 shadow-sm' : ''
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-lg ${item.iconBg} flex items-center justify-center`}>
                          <ItemIcon className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-900 group-hover:text-emerald-800 transition-colors">
                            {item.roleName}
                          </div>
                          <span className="text-[10px] text-slate-500 font-mono">
                            هوية: {item.nationalId}
                          </span>
                        </div>
                      </div>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white border border-slate-200 text-slate-700">
                        {item.badge}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-600 leading-relaxed mb-3">
                      {item.desc}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px]">
                    <span className="text-slate-500 font-mono">
                      الرمز: <strong className="text-slate-800 font-bold">{item.pass}</strong>
                    </span>
                    {isCurrent ? (
                      <span className="flex items-center gap-1 text-emerald-700 font-bold">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        الحالي
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-slate-500 group-hover:text-emerald-700 group-hover:font-bold transition-all">
                        دخول
                        <ArrowRight className="w-3 h-3 transform rotate-180" />
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Quick dataset stats */}
          <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-200">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5 font-medium">
                <SchoolIcon className="w-4 h-4 text-emerald-600" />
                <strong>716</strong> طالب حقيقي (332 متوسطة + 384 ثانوية)
              </span>
              <span className="font-medium text-slate-500">
                <strong>72</strong> منسوب
              </span>
            </div>
            
            <button
              id="demo-reset-data-btn"
              onClick={() => {
                if (window.confirm('هل تريد استعادة البيانات التجريبية الأولية وإعادة ضبط التغييرات؟')) {
                  onResetData();
                  onClose();
                }
              }}
              className="flex items-center gap-1.5 text-slate-500 hover:text-red-600 font-semibold text-[11px] transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              إعادة ضبط البيانات للأصل
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};
