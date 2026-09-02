import React from 'react';
import { User, School } from '../types';
import { 
  Building2, LogOut, UserCircle, Shield, 
  Sparkles, Heart, Bell, Smartphone, QrCode, ArrowLeftRight, ChevronDown
} from 'lucide-react';
import { LiveClockHeader } from './LiveClockHeader';

interface HeaderProps {
  currentUser: User | null;
  currentSchool: School | null;
  schools?: School[];
  onSwitchSchool?: (school: School) => void;
  onLogout: () => void;
  onOpenLogin: () => void;
  onOpenDonationModal: () => void;
  onOpenDemoSwitcher?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  currentSchool,
  schools = [],
  onSwitchSchool,
  onLogout,
  onOpenLogin,
  onOpenDonationModal,
  onOpenDemoSwitcher,
}) => {
  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'superadmin':
        return { label: 'سوبر ادمن 👑', color: 'bg-amber-50 text-amber-800 border-amber-200' };
      case 'employee':
        return { label: 'مدير المدرسة / وكيل', color: 'bg-emerald-50 text-emerald-800 border-emerald-200' };
      case 'teacher':
        return { label: 'معلم مادة / رائد فصل', color: 'bg-indigo-50 text-indigo-800 border-indigo-200' };
      case 'parent':
        return { label: 'ولي أمر طالب', color: 'bg-teal-50 text-teal-800 border-teal-200' };
      case 'student':
        return { label: 'طالب', color: 'bg-blue-50 text-blue-800 border-blue-200' };
      default:
        return { label: 'زائر', color: 'bg-slate-100 text-slate-700 border-slate-200' };
    }
  };

  const badge = currentUser ? getRoleBadge(currentUser.role) : null;

  // Managed schools for employee
  const adminManagedSchools = currentUser?.role === 'employee' && schools.length > 0
    ? schools.filter((s) => 
        currentUser.managedSchoolCodes?.includes(s.code) || 
        s.code === currentUser.schoolCode
      )
    : [];

  return (
    <header className="bg-white/95 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-30 px-4 py-2.5 shadow-xs" dir="rtl">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
        {/* Logo & School info */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-md shadow-emerald-600/20 shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-black text-slate-900 tracking-wide">
                حُضُورَكْ <span className="text-emerald-600 text-xs font-semibold">| النظام المدرسي الذكي</span>
              </h1>
              {currentSchool && (
                <span className="hidden sm:inline-block px-2 py-0.5 rounded-full bg-slate-100 text-[11px] font-mono text-slate-700 border border-slate-200 font-bold">
                  كود: {currentSchool.code}
                </span>
              )}
            </div>

            {/* If admin manages multiple schools, show quick switcher */}
            {adminManagedSchools.length > 1 && onSwitchSchool ? (
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[10px] text-slate-500 font-bold">المدرسة الحالية:</span>
                <select
                  value={currentSchool?.code || ''}
                  onChange={(e) => {
                    const target = schools.find((s) => s.code === e.target.value);
                    if (target) onSwitchSchool(target);
                  }}
                  className="bg-emerald-50 border border-emerald-300 text-emerald-950 font-bold text-xs rounded-lg px-2 py-0.5 focus:outline-emerald-500 cursor-pointer"
                >
                  {adminManagedSchools.map((sch) => (
                    <option key={sch.id} value={sch.code}>
                      🏢 {sch.name} ({sch.code})
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <p className="text-[11px] text-slate-500 font-medium">
                {currentSchool ? currentSchool.name : 'المنظومة التعليمية الرقمية'}
              </p>
            )}
          </div>
        </div>

        {/* Live Clock Header Compact in Middle */}
        <div className="hidden md:block">
          <LiveClockHeader variant="compact" />
        </div>

        {/* Right side controls */}
        <div className="flex items-center gap-2.5">
          {onOpenDemoSwitcher && (
            <button
              onClick={onOpenDemoSwitcher}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold transition-colors cursor-pointer shadow-xs"
              title="التبديل بين الأدوار والمدارس"
            >
              <ArrowLeftRight className="w-3.5 h-3.5 text-emerald-600" />
              <span>تجربة الأدوار 🎭</span>
            </button>
          )}

          <button
            onClick={onOpenDonationModal}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold transition-colors cursor-pointer"
          >
            <Heart className="w-3.5 h-3.5 fill-rose-500 text-rose-500" />
            <span>دعم المنصة</span>
          </button>

          {currentUser && currentUser.role !== 'guest' ? (
            <div className="flex items-center gap-2">
              {badge && (
                <span className={`px-2.5 py-1 rounded-xl text-xs font-bold border hidden lg:inline-block ${badge.color}`}>
                  {badge.label}
                </span>
              )}
              <div className="text-right hidden sm:block">
                <span className="text-xs font-bold text-slate-900 block leading-tight">{currentUser.name}</span>
                <span className="text-[10px] font-mono text-slate-500">{currentUser.nationalId}</span>
              </div>
              <button
                onClick={onLogout}
                title="تسجيل الخروج"
                className="p-2 rounded-xl bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-500 transition-colors cursor-pointer border border-slate-200"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenLogin}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md shadow-emerald-600/20 cursor-pointer"
            >
              تسجيل الدخول ↵
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
