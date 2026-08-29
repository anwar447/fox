import React from 'react';
import { User, School } from '../types';
import { 
  Building2, 
  UserCircle2, 
  LogOut, 
  Sparkles, 
  Bell, 
  ShieldCheck, 
  Layers, 
  GraduationCap, 
  BookOpen, 
  Users, 
  UserCheck
} from 'lucide-react';

interface HeaderProps {
  currentUser: User | null;
  schools: School[];
  selectedSchoolCode: string;
  onSelectSchool: (code: string) => void;
  onOpenLogin: () => void;
  onLogout: () => void;
  onOpenDemoSwitcher: () => void;
  activeEmergencyCount: number;
  onOpenEmergencyModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  schools,
  selectedSchoolCode,
  onSelectSchool,
  onOpenLogin,
  onLogout,
  onOpenDemoSwitcher,
  activeEmergencyCount,
  onOpenEmergencyModal,
}) => {
  const currentSchool = schools.find((s) => s.code === selectedSchoolCode) || schools[0];

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'superadmin':
        return { label: 'سوبر أدمن (إشراف عام)', color: 'bg-purple-100 text-purple-800 border-purple-300', icon: ShieldCheck };
      case 'employee':
        return { label: currentUser?.isAssistant ? 'مساعد إداري' : 'موظف مؤسس (مدير نظام)', color: 'bg-emerald-100 text-emerald-800 border-emerald-300', icon: Building2 };
      case 'teacher':
        return { label: 'معلم مادة / فصل', color: 'bg-blue-100 text-blue-800 border-blue-300', icon: BookOpen };
      case 'student':
        return { label: 'طالب', color: 'bg-amber-100 text-amber-800 border-amber-300', icon: GraduationCap };
      case 'parent':
        return { label: 'ولي أمر', color: 'bg-teal-100 text-teal-800 border-teal-300', icon: Users };
      default:
        return { label: 'زائر', color: 'bg-slate-100 text-slate-800 border-slate-300', icon: UserCircle2 };
    }
  };

  const badge = currentUser ? getRoleBadge(currentUser.role) : null;
  const RoleIcon = badge ? badge.icon : UserCircle2;

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-200 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          
          {/* Logo & School Info */}
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="relative flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white font-black text-lg sm:text-xl shadow-sm ring-2 ring-emerald-500/20">
              <span>حـ</span>
              <span className="absolute -bottom-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 flex items-center gap-1.5">
                  <span>نظام حضورك</span>
                  <span className="hidden md:inline-block text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    الذكي
                  </span>
                </h1>
              </div>
              <p className="text-xs text-slate-500 hidden sm:block">
                منظومة الحضور والانصراف المدرسية بالسياج الجغرافي وتقارير نور
              </p>
            </div>
          </div>

          {/* School Selector (for multi-school view) */}
          {schools.length > 1 && (currentUser?.role === 'employee' || currentUser?.role === 'superadmin' || currentUser?.role === 'teacher') && (
            <div className="hidden lg:flex items-center gap-2 bg-slate-50 p-1.5 rounded-xl border border-slate-200">
              <span className="text-xs font-medium text-slate-500 px-2 flex items-center gap-1">
                <Layers className="w-3.5 h-3.5 text-slate-400" />
                المدرسة:
              </span>
              <select
                id="header-school-select"
                value={selectedSchoolCode}
                onChange={(e) => onSelectSchool(e.target.value)}
                className="bg-white text-xs font-semibold text-slate-800 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              >
                {schools.map((sch) => (
                  <option key={sch.id} value={sch.code}>
                    {sch.name} ({sch.code})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Right Actions & User Profile */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Emergency Indicator */}
            {activeEmergencyCount > 0 && (
              <button
                id="header-emergency-btn"
                onClick={onOpenEmergencyModal}
                className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 text-red-700 border border-red-200 text-xs font-bold hover:bg-red-100 transition-colors animate-pulse cursor-pointer"
                title="يوجد تنبيه طوارئ نشط"
              >
                <Bell className="w-4 h-4 text-red-600" />
                <span className="hidden sm:inline">حالة طوارئ نشطة</span>
                <span className="w-2 h-2 rounded-full bg-red-600"></span>
              </button>
            )}

            {/* User Profile / Login */}
            {currentUser ? (
              <div className="flex items-center gap-2">
                <div className="hidden sm:flex flex-col items-end">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-slate-800 max-w-[160px] truncate">
                      {currentUser.name}
                    </span>
                  </div>
                  {badge && (
                    <span className={`text-[10px] font-semibold px-2 py-0.2 rounded-full border ${badge.color}`}>
                      {badge.label}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
                  <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-xs">
                    <RoleIcon className="w-4 h-4" />
                  </div>
                  <button
                    id="header-logout-btn"
                    onClick={onLogout}
                    title="تسجيل الخروج"
                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-white rounded-lg transition-colors cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <button
                id="header-login-btn"
                onClick={onOpenLogin}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors shadow-xs cursor-pointer"
              >
                <UserCheck className="w-4 h-4" />
                <span>دخول النظام</span>
              </button>
            )}

          </div>

        </div>
      </div>
    </header>
  );
};
