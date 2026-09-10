import React from 'react';
import { User, School } from '../types';
import { 
  Building2, LogOut, UserCircle, Shield, 
  Sparkles, Heart, Bell, Smartphone, QrCode, ChevronDown,
  Share2, ArrowLeftRight, GraduationCap, Users
} from 'lucide-react';
import { LiveClockHeader } from './LiveClockHeader';
import { getUserAssignedSchools, getUserAlternativeProfiles } from '../utils/storage';
import { ContinuousDevBadge } from './ContinuousDevBadge';
import { ThemeToggle } from './ThemeToggle';

interface HeaderProps {
  currentUser: User | null;
  currentSchool: School | null;
  schools?: School[];
  allUsers?: User[];
  onSwitchSchool?: (school: School) => void;
  onSwitchUser?: (user: User) => void;
  onLogout: () => void;
  onOpenLogin: () => void;
  onOpenRegisterSchool?: () => void;
  onOpenDonationModal: () => void;
  onOpenDirectLinks?: () => void;
  isParentViewOverride?: boolean;
  onToggleParentView?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  currentSchool,
  schools = [],
  allUsers = [],
  onSwitchSchool,
  onSwitchUser,
  onLogout,
  onOpenLogin,
  onOpenRegisterSchool,
  onOpenDonationModal,
  onOpenDirectLinks,
  isParentViewOverride = false,
  onToggleParentView,
}) => {
  const getRoleBadge = (role: string, staffTitle?: string) => {
    switch (role) {
      case 'superadmin':
        return { label: 'سوبر ادمن 👑', color: 'bg-amber-50 text-amber-800 border-amber-200' };
      case 'employee':
        if (staffTitle === 'admin_assistant') {
          return { label: 'مساعد إداري 📋', color: 'bg-blue-50 text-blue-800 border-blue-200' };
        }
        if (staffTitle === 'vice_principal') {
          return { label: 'وكيل المدرسة 👔', color: 'bg-indigo-50 text-indigo-800 border-indigo-200' };
        }
        if (staffTitle === 'student_advisor') {
          return { label: 'موجه طلابي 🎓', color: 'bg-purple-50 text-purple-800 border-purple-200' };
        }
        if (staffTitle === 'gatekeeper') {
          return { label: 'حارس أمن 🛡️', color: 'bg-amber-50 text-amber-800 border-amber-200' };
        }
        if (staffTitle === 'lab_technician') {
          return { label: 'محضر مختبر 🔬', color: 'bg-cyan-50 text-cyan-800 border-cyan-200' };
        }
        return { label: 'إداري مدرسة 🏢', color: 'bg-emerald-50 text-emerald-800 border-emerald-200' };
      case 'teacher':
        return { label: 'معلم 👨‍🏫', color: 'bg-indigo-50 text-indigo-800 border-indigo-200' };
      case 'student':
        return { label: 'طالب 🎓', color: 'bg-teal-50 text-teal-800 border-teal-200' };
      case 'parent':
        return { label: 'ولي أمر 👨‍👦', color: 'bg-amber-50 text-amber-800 border-amber-200' };
      default:
        return { label: 'زائر', color: 'bg-slate-50 text-slate-800 border-slate-200' };
    }
  };

  const badge = currentUser 
    ? (isParentViewOverride 
        ? { label: 'وضع ولي الأمر (حساب مدمج) 👨‍👧‍👦', color: 'bg-amber-100 text-amber-900 border-amber-300 ring-1 ring-amber-200' }
        : getRoleBadge(currentUser.role, currentUser.staffTitle))
    : null;

  // Find children associated with this user if they are also a parent
  const userChildren = currentUser && allUsers.length > 0
    ? allUsers.filter((u) => {
        if (u.role !== 'student') return false;
        const cleanUNid = (u.nationalId || '').trim();
        const isChildNid = currentUser.childrenNationalIds?.some((nid) => nid?.trim() === cleanUNid);
        const cleanParentMob = (currentUser.mobile || '').trim().replace(/\D/g, '');
        const cleanStudentParentMob = (u.parentMobile || '').trim().replace(/\D/g, '');
        const isMobileMatch = Boolean(cleanParentMob && cleanStudentParentMob && (
          cleanParentMob === cleanStudentParentMob ||
          cleanParentMob.endsWith(cleanStudentParentMob) ||
          cleanStudentParentMob.endsWith(cleanParentMob)
        ));
        return isChildNid || isMobileMatch;
      })
    : [];

  // Managed schools for any user (Principal, Vice Principal, Teacher, Administrative Assistant, etc.)
  const userAssignedSchools = getUserAssignedSchools(currentUser, schools);

  // Alternative profiles for this user (e.g. Teacher who also has a Parent profile for his son in another school)
  const alternativeProfiles = currentUser && allUsers.length > 0
    ? getUserAlternativeProfiles(currentUser, allUsers)
    : [];

  const isTeacherParent = Boolean(
    currentUser?.staffTitle === 'teacher' ||
    (currentUser?.assignedClasses && currentUser.assignedClasses.length > 0) ||
    currentUser?.teachingSchoolCode ||
    allUsers.some((u) => 
      ((u.id === currentUser?.id) || (currentUser?.nationalId && u.nationalId && u.nationalId.trim() === currentUser.nationalId.trim())) &&
      (u.role === 'teacher' || u.staffTitle === 'teacher' || (u.assignedClasses && u.assignedClasses.length > 0))
    )
  );

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
                حُضُورَكْ <span className="text-emerald-600 text-xs font-semibold">
                  {currentUser?.role === 'superadmin' ? '| لوحة المشرف العام' : '| النظام المدرسي الذكي'}
                </span>
              </h1>
              {currentUser && currentUser.role !== 'superadmin' && currentSchool && (
                <span className="hidden sm:inline-block px-2 py-0.5 rounded-full bg-slate-100 text-[11px] font-mono text-slate-700 border border-slate-200 font-bold">
                  كود: {currentSchool.code}
                </span>
              )}
              <ContinuousDevBadge variant="header" />
            </div>

            {/* If user has multiple assigned schools (Teacher, Assistant, Principal), show quick switcher */}
            {currentUser && userAssignedSchools.length > 1 && onSwitchSchool ? (
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[10px] text-slate-500 font-bold">المدرسة الحالية:</span>
                <select
                  value={currentSchool?.code || ''}
                  onChange={(e) => {
                    const target = schools.find((s) => s.code === e.target.value);
                    if (target) onSwitchSchool(target);
                  }}
                  className="bg-emerald-50 border border-emerald-300 text-emerald-950 font-bold text-xs rounded-lg px-2 py-0.5 focus:outline-emerald-500 cursor-pointer shadow-2xs"
                  title="التبديل بين المدارس المسندة إليك"
                >
                  {userAssignedSchools.map((sch) => (
                    <option key={sch.id} value={sch.code}>
                      🏢 {sch.name} ({sch.code})
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <p className="text-[11px] text-slate-500 font-medium">
                {currentUser?.role === 'superadmin' 
                  ? 'الإشراف وإدارة جميع المدارس والتراخيص بالمملكة'
                  : currentUser && currentSchool 
                    ? currentSchool.name 
                    : 'المنصة السحابية لضبط الحضور والانضباط المدرسي 1448هـ'}
              </p>
            )}
          </div>
        </div>

        {/* Live Clock Header Compact in Middle */}
        <div className="hidden md:block">
          <LiveClockHeader variant="compact" />
        </div>

        {/* Right side controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Theme Toggle for Dark Mode / Eye Comfort */}
          <ThemeToggle />

          {/* Direct links button */}
          {onOpenDirectLinks && (
            <button
              onClick={onOpenDirectLinks}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 border border-slate-200 hover:border-emerald-300 text-xs font-bold transition-all cursor-pointer"
              title="روابط الدخول المباشرة والمشاركة للمعلمين والطلاب وأولياء الأمور"
            >
              <Share2 className="w-3.5 h-3.5 text-emerald-600" />
              <span className="hidden sm:inline">روابط الدخول الذكية 🔗</span>
            </button>
          )}

          {/* Dedicated Dual Role Switcher (Teacher/Staff <-> Parent) */}
          {currentUser && (currentUser.role === 'teacher' || currentUser.role === 'employee' || isParentViewOverride || isTeacherParent) && onToggleParentView && (
            <button
              onClick={onToggleParentView}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition-all shadow-xs cursor-pointer ${
                isParentViewOverride || currentUser.role === 'parent'
                  ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white border border-indigo-500 shadow-indigo-600/20 animate-pulse'
                  : 'bg-amber-50 hover:bg-amber-100 text-amber-950 border border-amber-300 hover:border-amber-400'
              }`}
              title={
                isParentViewOverride || currentUser.role === 'parent'
                  ? 'العودة إلى بوابة المعلم ورصد الحصص'
                  : 'أنت معلم ولديك أبناء؟ انقر للتبديل الفوري لحساب ولي الأمر لمتابعة حضور وغياب وأعذار أبنائك الطلاب'
              }
            >
              <ArrowLeftRight className="w-3.5 h-3.5 shrink-0" />
              <span>
                {isParentViewOverride || currentUser.role === 'parent'
                  ? 'العودة لبوابة المعلم 👨‍🏫'
                  : userChildren.length > 0
                    ? `وضع ولي الأمر (${userChildren.length} أبناء) 👨‍👧‍👦`
                    : 'التبديل لولي أمر (أبنائي) 👨‍👧‍👦'}
              </span>
            </button>
          )}

          {/* Quick Dual Role Switcher (e.g. Teacher <-> Parent) */}
          {currentUser && !isParentViewOverride && alternativeProfiles.length > 0 && onSwitchUser && (
            alternativeProfiles.map((alt) => {
              const isAltParent = alt.role === 'parent';
              const altSchool = schools.find((s) => s.code === alt.schoolCode);
              const altSchoolName = altSchool ? altSchool.name : alt.schoolCode;
              return (
                <button
                  key={alt.id}
                  onClick={() => onSwitchUser(alt)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold transition-all shadow-xs cursor-pointer animate-pulse"
                  title={`التبديل الفوري إلى: ${isAltParent ? 'بوابة ولي الأمر' : 'بوابة المعلم'} (${altSchoolName})`}
                >
                  <ArrowLeftRight className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                  <span className="hidden md:inline">
                    {isAltParent
                      ? `تبديل إلى: ولي أمر (${altSchoolName})`
                      : `تبديل إلى: معلم (${altSchoolName})`}
                  </span>
                  <span className="md:hidden">
                    {isAltParent ? 'ولي أمر' : 'معلم'}
                  </span>
                </button>
              );
            })
          )}

          <button
            onClick={onOpenDonationModal}
            className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold transition-colors cursor-pointer"
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
            <div className="flex items-center gap-2">
              {onOpenRegisterSchool && (
                <button
                  onClick={onOpenRegisterSchool}
                  className="hidden sm:flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-bold transition-all cursor-pointer"
                >
                  <Building2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>تسجيل مدرسة جديدة 🚀</span>
                </button>
              )}
              <button
                onClick={onOpenLogin}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md shadow-emerald-600/20 cursor-pointer"
              >
                تسجيل الدخول ↵
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
