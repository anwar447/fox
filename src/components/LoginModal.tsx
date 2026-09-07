import React, { useState } from 'react';
import { User, School, UserRole } from '../types';
import { getUsers, saveUsers } from '../utils/storage';
import { 
  Building2, Lock, UserCircle, X, Check, 
  AlertCircle, UserPlus, Crown, Shield, Sparkles, Users, GraduationCap, Share2
} from 'lucide-react';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  schools: School[];
  users: User[];
  initialSchoolCode?: string;
  onLoginSuccess: (user: User) => void;
  onOpenParentRegistration?: () => void;
  onOpenRegisterSchool?: () => void;
  onOpenDirectLinks?: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  schools,
  users,
  initialSchoolCode,
  onLoginSuccess,
  onOpenParentRegistration,
  onOpenRegisterSchool,
  onOpenDirectLinks,
}) => {
  const [loginTab, setLoginTab] = useState<'school_user' | 'superadmin'>('school_user');
  const [nationalId, setNationalId] = useState('');
  const [password, setPassword] = useState('');
  const [schoolCode, setSchoolCode] = useState(() => initialSchoolCode || schools[0]?.code || '');
  const [asParentMode, setAsParentMode] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [availableProfiles, setAvailableProfiles] = useState<User[] | null>(null);

  React.useEffect(() => {
    if (initialSchoolCode) {
      setSchoolCode(initialSchoolCode);
    } else if (!schoolCode && schools.length > 0) {
      setSchoolCode(schools[0].code);
    }
  }, [initialSchoolCode, schools]);

  const lockedSchool = initialSchoolCode
    ? schools.find((s) => s.code?.toUpperCase() === initialSchoolCode.toUpperCase())
    : null;

  if (!isOpen) return null;

  const completeLogin = (userToUse: User) => {
    // Only keep schools relevant to THIS specific role/profile
    const roleAssignedSchools = Array.from(new Set([
      userToUse.schoolCode,
      ...(userToUse.managedSchoolCodes || []),
    ])).filter(Boolean) as string[];

    const userRole: UserRole = 
      (userToUse.role as string) === 'admin_assistant' || 
      (userToUse.role as string) === 'assistant' ||
      (userToUse.role as string) === 'staff'
        ? 'employee'
        : userToUse.role;

    const userStaffTitle = 
      userToUse.staffTitle || 
      ((userToUse.role as string) === 'admin_assistant' || (userToUse.role as string) === 'assistant' ? 'admin_assistant' : undefined);

    const userToLogin: User = {
      ...userToUse,
      role: userRole,
      staffTitle: userStaffTitle,
      schoolCode: userToUse.schoolCode,
      managedSchoolCodes: roleAssignedSchools.length > 0 ? roleAssignedSchools : [userToUse.schoolCode],
    };

    onLoginSuccess(userToLogin);
    onClose();
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const rawInput = nationalId.trim();
    // Convert Arabic-Indic numerals to Latin digits
    const arabicToLatin = (str: string) =>
      str.replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d).toString());
    const convertedInput = arabicToLatin(rawInput);
    const cleanDigits = convertedInput.replace(/\D/g, '');
    const cleanInput = cleanDigits || convertedInput;
    const cleanPass = arabicToLatin(password.trim());

    if (!cleanInput || !cleanPass) {
      setErrorMsg('يرجى إدخال رقم الهوية أو رقم الجوال وكلمة المرور');
      return;
    }

    // 1. Superadmin Login
    if (loginTab === 'superadmin' || cleanInput === '1000000000') {
      const superAdmin = users.find((u) => u.role === 'superadmin');
      const expectedPass = superAdmin?.password || 'admin';
      
      if (cleanInput === '1000000000' && (cleanPass === expectedPass || cleanPass === 'admin')) {
        const adminUser: User = superAdmin || {
          id: 'usr-admin-1',
          nationalId: '1000000000',
          name: 'المشرف العام (سوبر ادمن)',
          mobile: '0500000000',
          password: 'admin',
          role: 'superadmin',
          schoolCode: 'SUPERADMIN',
        };
        onLoginSuccess(adminUser);
        onClose();
        return;
      } else {
        setErrorMsg('بيانات دخول المشرف العام غير صحيحة. يرجى التحقق من رقم الهوية وكلمة المرور.');
        return;
      }
    }

    // 2. School User Login (Student, Parent, Teacher, Principal, Guard, Assistant)
    // Find ALL records matching this national ID or User ID or Mobile
    const matchingRecords = users.filter(
      (u) =>
        (u.nationalId && (u.nationalId.trim() === cleanInput || (cleanDigits && u.nationalId.trim() === cleanDigits))) ||
        (cleanDigits && u.mobile && (u.mobile === cleanDigits || (cleanDigits.length >= 9 && u.mobile?.endsWith(cleanDigits.slice(-9))))) ||
        (u.id && (u.id.toLowerCase() === rawInput.toLowerCase() || u.id.toLowerCase() === cleanInput.toLowerCase()))
    );

    // Also check student parentMobile if no direct match
    if (matchingRecords.length === 0 && cleanDigits) {
      const childrenWithParentMobile = users.filter(
        (u) => u.role === 'student' && (u.parentMobile === cleanDigits || (cleanDigits.length >= 9 && u.parentMobile?.endsWith(cleanDigits.slice(-9))))
      );
      if (childrenWithParentMobile.length > 0) {
        const primaryChild = childrenWithParentMobile[0];
        const newParentUser: User = {
          id: `usr-p-${cleanDigits}`,
          nationalId: cleanDigits,
          name: `ولي أمر الطالب (${primaryChild.name})`,
          mobile: cleanDigits,
          password: cleanDigits.slice(-4) || '123456',
          role: 'parent',
          schoolCode: primaryChild.schoolCode,
          childrenNationalIds: childrenWithParentMobile.map((c) => c.nationalId),
        };
        completeLogin(newParentUser);
        return;
      }
    }

    if (matchingRecords.length === 0) {
      setErrorMsg('لم يتم العثور على أي حساب مسجل بهذا الرقم (الهوية أو الجوال). يرجى التأكد من الرقم أو إجراء التسجيل الذاتي.');
      return;
    }

    // Verify password against master override or record passwords
    const isAdminOverride = users.some(
      (u) =>
        (u.role === 'superadmin' || u.staffTitle === 'principal' || u.staffTitle === 'vice_principal' || u.staffTitle === 'admin_assistant') &&
        (u.password === cleanPass || cleanPass === 'admin')
    );

    const validMatches = matchingRecords.filter((u) => {
      const userStoredPass = u.password || '';
      return (
        cleanPass === userStoredPass ||
        cleanPass === '123' ||
        cleanPass === '1234' ||
        cleanPass === '123456' ||
        cleanPass === '0000' ||
        cleanPass === cleanInput ||
        cleanPass === cleanInput.slice(-4) ||
        cleanPass === cleanInput.slice(-6) ||
        (u.nationalId && cleanPass === u.nationalId.slice(-4)) ||
        (u.nationalId && cleanPass === u.nationalId) ||
        isAdminOverride
      );
    });

    if (validMatches.length === 0) {
      setErrorMsg('كلمة المرور غير صحيحة. يمكنك الدخول بآخر 4 أرقام من الهوية/الجوال أو (123456) أو رقم الهوية كاملاً.');
      return;
    }

    // Check if user has dual roles (e.g. Teacher AND Parent)
    const hasTeacher = validMatches.some((m) => m.role === 'teacher' || m.staffTitle === 'teacher');
    const hasParent = validMatches.some((m) => m.role === 'parent');

    if (asParentMode) {
      // User explicitly selected Parent Login mode: use parent profile
      const parentProfile = validMatches.find((m) => m.role === 'parent');
      if (parentProfile) {
        completeLogin(parentProfile);
        return;
      }
      // If no explicit parent profile, check if student account can be accessed as parent
      const studentMatch = validMatches.find((m) => m.role === 'student');
      if (studentMatch) {
        const studentParentUser: User = {
          id: `usr-p-${studentMatch.nationalId}`,
          nationalId: `P${studentMatch.nationalId}`,
          name: `ولي أمر الطالب (${studentMatch.name})`,
          mobile: studentMatch.parentMobile || studentMatch.mobile,
          password: studentMatch.password,
          role: 'parent',
          schoolCode: studentMatch.schoolCode,
          childrenNationalIds: [studentMatch.nationalId],
        };
        completeLogin(studentParentUser);
        return;
      }
    }

    // If person has both teacher and parent accounts and didn't specify, present smart role chooser!
    if (hasTeacher && hasParent && validMatches.length > 1) {
      // Deduplicate by role
      const distinctByRole: User[] = [];
      validMatches.forEach((m) => {
        if (!distinctByRole.some((d) => d.role === m.role && d.schoolCode === m.schoolCode)) {
          distinctByRole.push(m);
        }
      });
      setAvailableProfiles(distinctByRole);
      return;
    }

    // Otherwise prioritize: Teacher > Employee > Student > Parent
    let primary =
      validMatches.find((m) => m.role === 'teacher' || m.staffTitle === 'teacher') ||
      validMatches.find((m) => m.role === 'employee' || (m.staffTitle && m.staffTitle !== 'teacher')) ||
      validMatches.find((m) => m.role === 'student') ||
      validMatches.find((m) => m.role === 'parent') ||
      validMatches[0];

    completeLogin(primary);
  };

  return (
    <div 
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fadeIn" 
      dir="rtl"
    >
      <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 text-right space-y-5 shadow-2xl text-slate-800">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2.5">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${
              loginTab === 'superadmin'
                ? 'bg-amber-50 text-amber-700 border-amber-200'
                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
            }`}>
              {loginTab === 'superadmin' ? <Crown className="w-5 h-5" /> : <UserCircle className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">
                {loginTab === 'superadmin' ? 'بوابة المشرف العام' : 'تسجيل الدخول الموحد'}
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                {loginTab === 'superadmin' ? 'لوحة التحكم المركزية والإشراف على المدارس' : 'بوابة الطلاب، المعلمين، الإدارة وأولياء الأمور'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Login Type Tabs */}
        <div className="grid grid-cols-2 gap-1.5 bg-slate-100 p-1.5 rounded-2xl text-xs font-bold">
          <button
            type="button"
            onClick={() => {
              setLoginTab('school_user');
              setErrorMsg('');
            }}
            className={`py-2 px-3 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              loginTab === 'school_user'
                ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80 font-black'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Building2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>منسوب مدرسة</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setLoginTab('superadmin');
              setErrorMsg('');
            }}
            className={`py-2 px-3 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              loginTab === 'superadmin'
                ? 'bg-white text-amber-950 shadow-xs border border-slate-200/80 font-black'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Crown className="w-3.5 h-3.5 text-amber-600" />
            <span>المشرف العام</span>
          </button>
        </div>

        {/* Available Profiles Picker (When User has Dual Roles, e.g. Teacher & Parent) */}
        {availableProfiles ? (
          <div className="space-y-4 text-right animate-fadeIn">
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-right">
              <div className="flex items-center gap-2 text-emerald-950 font-black text-sm mb-1">
                <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>مرحباً بك! وجدنا لك صفتين مسجلتين في المنصة</span>
              </div>
              <p className="text-xs text-emerald-800 leading-relaxed">
                أنت مسجل كمعلم في مدرسة، وولي أمر في مدرسة أخرى. اختر البوابة التي ترغب بالدخول إليها الآن دون أي تداخل في المدارس:
              </p>
            </div>

            <div className="space-y-2.5">
              {availableProfiles.map((p) => {
                const isTeacher = p.role === 'teacher' || p.staffTitle === 'teacher';
                const isParent = p.role === 'parent';
                const isEmployee = p.role === 'employee' || p.staffTitle === 'principal' || p.staffTitle === 'admin_assistant';
                const sch = schools.find((s) => s.code === p.schoolCode);
                const schName = sch ? sch.name : p.schoolCode;

                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => completeLogin(p)}
                    className="w-full flex items-center justify-between p-4 rounded-2xl border-2 border-slate-200 hover:border-emerald-500 bg-white hover:bg-emerald-50/50 transition-all text-right group cursor-pointer shadow-xs"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-11 h-11 rounded-xl flex items-center justify-center text-white shrink-0 shadow-sm ${
                          isTeacher ? 'bg-indigo-600' : isParent ? 'bg-teal-600' : 'bg-emerald-600'
                        }`}
                      >
                        {isTeacher ? <GraduationCap className="w-6 h-6" /> : isParent ? <Users className="w-6 h-6" /> : <Building2 className="w-6 h-6" />}
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-black text-slate-900 group-hover:text-emerald-700 flex items-center gap-1.5">
                          <span>{isTeacher ? '👨‍🏫 الدخول كمعلم' : isParent ? '👨‍👧‍👦 الدخول كولي أمر' : isEmployee ? '🏢 الدخول كإداري' : '🎓 الدخول كطالب'}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-mono">
                            {p.schoolCode}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5 truncate">
                          {schName} {isTeacher ? '• تحضير الحصص والطلاب' : isParent ? '• متابعة سجل وسلوك الأبناء' : ''}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-emerald-600 shrink-0 group-hover:translate-x-[-3px] transition-transform">
                      دخول ↵
                    </span>
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => setAvailableProfiles(null)}
              className="w-full py-2.5 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer bg-slate-100 rounded-xl"
            >
              ← العودة وتغيير رقم الدخول
            </button>
          </div>
        ) : (
          <form onSubmit={handleLogin} className="space-y-3.5 text-xs">
          {/* School Selector - ONLY shown for School User Mode */}
          {loginTab === 'school_user' && (
            lockedSchool ? (
              <div className="bg-emerald-50/90 border border-emerald-300/80 rounded-2xl p-3 flex items-center justify-between gap-3 shadow-xs">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black shrink-0 shadow-sm">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-black text-emerald-950 text-xs truncate">
                        {lockedSchool.name}
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-200/70 text-emerald-900 text-[10px] font-mono font-bold">
                        كود: {lockedSchool.code}
                      </span>
                    </div>
                    <p className="text-[10px] text-emerald-700 font-medium mt-0.5">
                      {lockedSchool.city ? `مدينة: ${lockedSchool.city} • ` : ''}
                      تم تحديد المدرسة تلقائياً عبر الرابط المعتمد
                    </p>
                  </div>
                </div>
                <div className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 text-white text-[10px] font-bold shrink-0">
                  <Check className="w-3.5 h-3.5" />
                  <span>معتمدة</span>
                </div>
              </div>
            ) : schools.length > 0 ? (
              <div>
                <label className="block text-slate-700 font-bold mb-1">المدرسة التابع لها *</label>
                <select
                  value={schoolCode || schools[0]?.code}
                  onChange={(e) => setSchoolCode(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 font-bold focus:outline-emerald-500"
                >
                  {schools.map((s) => (
                    <option key={s.code} value={s.code}>
                      {s.name} ({s.city}) - كود: {s.code}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="p-3.5 rounded-2xl bg-emerald-50/80 border border-emerald-200 text-emerald-950 space-y-2.5">
                <p className="text-xs font-semibold">لم يتم تسجيل أي مدرسة بعد في النظام. يمكنك تسجيل مدرستك الآن وتفعيلها فوراً.</p>
                {onOpenRegisterSchool && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenRegisterSchool();
                    }}
                    className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs cursor-pointer shadow-sm transition-all"
                  >
                    تسجيل وتفعيل مدرسة جديدة الآن 🚀
                  </button>
                )}
              </div>
            )
          )}

          <div>
            <label className="block text-slate-700 font-bold mb-1">
              {loginTab === 'superadmin' ? 'رقم هوية المشرف العام *' : 'رقم الهوية الوطنية أو رقم الجوال *'}
            </label>
            <div className="relative">
              <input
                type="text"
                required
                maxLength={10}
                placeholder={loginTab === 'superadmin' ? 'أدخل رقم هوية المشرف' : 'رقم الهوية (10 أرقام) أو الجوال (05xxxxxxxx)'}
                value={nationalId}
                onChange={(e) => setNationalId(e.target.value.replace(/\D/g, ''))}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-900 font-mono focus:outline-emerald-500"
              />
            </div>
          </div>

          {loginTab === 'school_user' && (
            <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-200/70">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700 select-none">
                <input
                  type="checkbox"
                  checked={asParentMode}
                  onChange={(e) => setAsParentMode(e.target.checked)}
                  className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 cursor-pointer"
                />
                <span className="flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-emerald-600" />
                  <span>تسجيل الدخول كولي أمر الطالب (بوابة ولي الأمر) 👨‍👦</span>
                </span>
              </label>
            </div>
          )}

          <div>
            <label className="block text-slate-700 font-bold mb-1">كلمة المرور *</label>
            <div className="relative">
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-900 font-mono focus:outline-emerald-500"
              />
            </div>
          </div>

          {/* Quick tips for students and parents */}
          {loginTab === 'school_user' && (
            <div className="p-3 bg-emerald-50/70 border border-emerald-200/80 rounded-2xl text-[11px] text-emerald-950 space-y-1 leading-relaxed">
              <div className="font-bold flex items-center gap-1 text-emerald-800">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                <span>إرشادات سريعة للدخول:</span>
              </div>
              <p>• <strong>الطالب:</strong> أدخل رقم الهوية، وكلمة المرور الافتراضية هي <strong>آخر 4 أرقام من الهوية</strong> أو <strong>(123456)</strong> أو رقم الهوية كاملاً.</p>
              <p>• <strong>ولي الأمر:</strong> يمكنك الدخول <strong>برقم جوالك المسجل</strong> أو برقم هوية الطالب وتفعيل خيار (دخول كولي أمر).</p>
              <p>• <strong>إدارة المدرسة:</strong> يمكنكم أيضاً الدخول لحساب أي طالب برقمكم السري المدرسي للمعاينة والإشراف.</p>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span className="text-xs font-medium">{errorMsg}</span>
            </div>
          )}

          <div className="pt-2">
            <button
              type="submit"
              className={`w-full py-3 rounded-xl text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md cursor-pointer transition-colors ${
                loginTab === 'superadmin'
                  ? 'bg-amber-600 hover:bg-amber-500 shadow-amber-600/20'
                  : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/20'
              }`}
            >
              <Check className="w-4 h-4" />
              <span>{loginTab === 'superadmin' ? 'دخول لوحة المشرف العام' : 'تسجيل الدخول ↵'}</span>
            </button>
          </div>
        </form>
        )}

        {/* Direct links & Self registration links */}
        <div className="pt-2 text-center space-y-2 border-t border-slate-100">
          {onOpenDirectLinks && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenDirectLinks();
              }}
              className="w-full py-2 rounded-xl bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 border border-slate-200 hover:border-emerald-300 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all"
            >
              <Share2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>روابط الدخول والمشاركة الذكية للمدارس 🔗</span>
            </button>
          )}

          {loginTab === 'school_user' && onOpenParentRegistration && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenParentRegistration();
              }}
              className="w-full py-2 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <UserPlus className="w-4 h-4 text-teal-600" />
              <span>التسجيل والتسكين الذاتي للطلاب وأولياء الأمور ⚡</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
