import React from 'react';
import { User, School } from '../types';
import { 
  Building2, Users, ShieldCheck, Check, 
  X, Sparkles, BookOpen, GraduationCap, ArrowRight, UserCheck 
} from 'lucide-react';

interface DemoSwitcherProps {
  isOpen: boolean;
  onClose: () => void;
  users: User[];
  schools: School[];
  currentUser: User | null;
  onSelectUser: (user: User) => void;
  onSelectSchool: (school: School) => void;
}

export const DemoSwitcher: React.FC<DemoSwitcherProps> = ({
  isOpen,
  onClose,
  users,
  schools,
  currentUser,
  onSelectUser,
  onSelectSchool,
}) => {
  if (!isOpen) return null;

  const currentSchool = schools.find((s) => s.code === currentUser?.schoolCode) || schools[0];

  const getRoleInfo = (role: string) => {
    switch (role) {
      case 'superadmin':
        return { label: 'سوبر ادمن', bg: 'bg-amber-50 text-amber-800 border-amber-200' };
      case 'employee':
        return { label: 'مدير المدرسة / الوكيل', bg: 'bg-emerald-50 text-emerald-800 border-emerald-200' };
      case 'teacher':
        return { label: 'معلم مادة / رائد فصل', bg: 'bg-indigo-50 text-indigo-800 border-indigo-200' };
      case 'parent':
        return { label: 'ولي أمر طالب', bg: 'bg-teal-50 text-teal-800 border-teal-200' };
      case 'student':
        return { label: 'طالب بالمدرسة', bg: 'bg-blue-50 text-blue-800 border-blue-200' };
      default:
        return { label: 'مستخدم', bg: 'bg-slate-100 text-slate-700 border-slate-200' };
    }
  };

  return (
    <div 
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fadeIn"
      dir="rtl"
    >
      <div className="bg-white border border-slate-200 rounded-3xl max-w-2xl w-full p-6 text-right space-y-5 shadow-2xl text-slate-800 my-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">التبديل الفوري بين أدوار المنظومة (Demo Switcher)</h3>
              <p className="text-xs text-slate-500 font-medium">اختر أي شخصية للتجربة واستعراض كافة الميزات والمؤشرات بضغطة واحدة</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Schools Selector if multiple */}
        {schools.length > 1 && (
          <div className="space-y-2">
            <span className="text-xs font-bold text-slate-700 block">المدرسة النشطة حالياً:</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {schools.map((sch) => (
                <button
                  key={sch.id}
                  onClick={() => onSelectSchool(sch)}
                  className={`p-3 rounded-2xl border text-right transition-all flex items-center justify-between cursor-pointer ${
                    currentSchool?.code === sch.code
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-950 font-bold'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div>
                    <strong className="text-xs font-bold block">{sch.name}</strong>
                    <span className="text-[10px] font-mono text-slate-500">كود: {sch.code} | {sch.city}</span>
                  </div>
                  {currentSchool?.code === sch.code && <Check className="w-4 h-4 text-emerald-600" />}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Roles List */}
        <div className="space-y-2.5">
          <span className="text-xs font-bold text-slate-700 block">اختر الحساب والدور لتسجيل الدخول الفوري:</span>
          <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
            {users.map((u) => {
              const info = getRoleInfo(u.role);
              const isCurrent = currentUser?.id === u.id;
              return (
                <button
                  key={u.id}
                  onClick={() => {
                    onSelectUser(u);
                    onClose();
                  }}
                  className={`w-full p-3.5 rounded-2xl border text-right transition-all flex items-center justify-between cursor-pointer ${
                    isCurrent
                      ? 'bg-emerald-50/80 border-emerald-500 shadow-xs'
                      : 'bg-slate-50 hover:bg-slate-100 border-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-emerald-600">
                      <UserCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <strong className="text-xs font-bold text-slate-900">{u.name}</strong>
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${info.bg}`}>
                          {info.label}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-500 block mt-0.5">
                        هوية: {u.nationalId} {u.schoolCode ? `| مدرسة: ${u.schoolCode}` : ''} {u.className ? `(${u.className})` : ''}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 text-xs text-emerald-700 font-bold">
                    {isCurrent ? (
                      <span className="flex items-center gap-1 text-emerald-700">
                        <Check className="w-4 h-4" />
                        <span>الحالي</span>
                      </span>
                    ) : (
                      <span className="opacity-70 group-hover:opacity-100 flex items-center gap-1">
                        <span>دخول</span>
                        <ArrowRight className="w-3.5 h-3.5 rotate-180" />
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="pt-2">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
          >
            إغلاق
          </button>
        </div>

      </div>
    </div>
  );
};
