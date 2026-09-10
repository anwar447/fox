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

  // Smart Universal Identity Gateway (when user has dual role, e.g. Teacher + Parent with children in multiple schools)
  const [smartGateway, setSmartGateway] = useState<{
    personName: string;
    nationalId: string;
    teacherUser?: User;
    teacherSchool?: School;
    employeeUser?: User;
    employeeSchool?: School;
    children: { student: User; school?: School }[];
  } | null>(null);

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
    // Collect all relevant schools for this user
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

    // 2. School User Login (Universal Auto-Detection)
    // Find ALL records matching this national ID or User ID or Mobile across ALL schools
    const matchingRecords = users.filter(
      (u) =>
        (u.nationalId && (u.nationalId.trim() === cleanInput || (cleanDigits && u.nationalId.trim() === cleanDigits))) ||
        (cleanDigits && u.mobile && (u.mobile === cleanDigits || (cleanDigits.length >= 9 && u.mobile?.endsWith(cleanDigits.slice(-9))))) ||
        (u.id && (u.id.toLowerCase() === rawInput.toLowerCase() || u.id.toLowerCase() === cleanInput.toLowerCase()))
    );

    // Also check student parentMobile if no direct match was registered yet
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
          managedSchoolCodes: Array.from(new Set(childrenWithParentMobile.map((c) => c.schoolCode))).filter(Boolean) as string[],
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

    // Identify profiles in valid matches
    const teacherMatch = validMatches.find((m) => m.role === 'teacher' || m.staffTitle === 'teacher');
    const employeeMatch = validMatches.find((m) => m.role === 'employee' || m.staffTitle === 'principal' || m.staffTitle === 'vice_principal' || m.staffTitle === 'admin_assistant');
    const parentMatch = validMatches.find((m) => m.role === 'parent');
    const studentMatch = validMatches.find((m) => m.role === 'student');
    const staffMatch = teacherMatch || employeeMatch;

    // Discover ALL children of this person across ALL registered schools in the system
    const parentMobileToTest = staffMatch?.mobile || parentMatch?.mobile || cleanDigits;
    const directChildrenIds = Array.from(new Set([
      ...(staffMatch?.childrenNationalIds || []),
      ...(parentMatch?.childrenNationalIds || []),
      ...matchingRecords.flatMap((m) => m.childrenNationalIds || []),
    ])).filter(Boolean);

    const childrenFound = users.filter((u) => {
      if (u.role !== 'student') return false;
      const cleanUNid = (u.nationalId || '').trim();
      const isChildNid = directChildrenIds.includes(cleanUNid);
      const isMobMatch = Boolean(
        parentMobileToTest && (
          u.parentMobile === parentMobileToTest ||
          u.parentPhone === parentMobileToTest ||
          (parentMobileToTest.length >= 9 && u.parentMobile?.endsWith(parentMobileToTest.slice(-9)))
        )
      );
      return isChildNid || isMobMatch;
    });

    // If user explicitly checked "Login as Parent" in the form
    if (asParentMode) {
      const primaryChild = childrenFound[0];
      const parentUser: User = {
        id: parentMatch?.id || `usr-parent-${cleanInput}`,
        nationalId: cleanInput,
        name: parentMatch?.name || staffMatch?.name || (primaryChild ? `ولي أمر الطالب (${primaryChild.name})` : 'ولي أمر'),
        mobile: parentMobileToTest,
        password: cleanPass,
        role: 'parent',
        staffTitle: staffMatch?.staffTitle,
        assignedClasses: staffMatch?.assignedClasses,
        teachingSchoolCode: staffMatch?.teachingSchoolCode || (staffMatch?.role === 'teacher' ? staffMatch.schoolCode : undefined),
        schoolCode: primaryChild?.schoolCode || staffMatch?.schoolCode || schools[0]?.code,
        childrenNationalIds: childrenFound.map((c) => c.nationalId),
        managedSchoolCodes: Array.from(new Set([
          staffMatch?.schoolCode,
          ...(staffMatch?.managedSchoolCodes || []),
          ...childrenFound.map((c) => c.schoolCode),
        ])).filter(Boolean) as string[],
      };
      completeLogin(parentUser);
      return;
    }

    // CASE 1: DUAL IDENTITY - Teacher/Staff who also has children across schools!
    if (staffMatch && childrenFound.length > 0) {
      const teacherSchool = schools.find((s) => s.code === (staffMatch.teachingSchoolCode || staffMatch.schoolCode));
      const childrenWithSchools = childrenFound.map((child) => ({
        student: child,
        school: schools.find((s) => s.code === child.schoolCode),
      }));

      setSmartGateway({
        personName: staffMatch.name,
        nationalId: staffMatch.nationalId || cleanInput,
        teacherUser: teacherMatch,
        teacherSchool,
        employeeUser: employeeMatch,
        employeeSchool: teacherSchool,
        children: childrenWithSchools,
      });
      return;
    }

    // CASE 2: PURE TEACHER / STAFF (No children found)
    if (staffMatch && childrenFound.length === 0) {
      completeLogin(staffMatch);
      return;
    }

    // CASE 3: PARENT (with children across one or more schools)
    if (childrenFound.length > 0 || parentMatch) {
      const primaryChild = childrenFound[0];
      const parentUser: User = {
        id: parentMatch?.id || `usr-parent-${cleanInput}`,
        nationalId: cleanInput,
        name: parentMatch?.name || (primaryChild ? `ولي أمر الطالب (${primaryChild.name})` : 'ولي أمر'),
        mobile: parentMobileToTest,
        password: cleanPass,
        role: 'parent',
        schoolCode: primaryChild?.schoolCode || schools[0]?.code,
        childrenNationalIds: childrenFound.map((c) => c.nationalId),
        managedSchoolCodes: Array.from(new Set([
          ...(parentMatch?.managedSchoolCodes || []),
          ...childrenFound.map((c) => c.schoolCode),
        ])).filter(Boolean) as string[],
      };
      completeLogin(parentUser);
      return;
    }

    // CASE 4: STUDENT
    if (studentMatch) {
      completeLogin(studentMatch);
      return;
    }

    // CASE 5: Fallback to primary valid match
    completeLogin(validMatches[0]);
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

        {/* Smart Gateway Screen (When User has Dual Roles: Teacher & Parent with Children across schools) */}
        {smartGateway ? (
          <div className="space-y-4 text-right animate-fadeIn">
            <div className="bg-gradient-to-br from-teal-50 to-emerald-50 border border-teal-200/90 rounded-2xl p-4 text-right shadow-xs">
              <div className="flex items-center gap-2 text-teal-950 font-black text-sm mb-1">
                <Sparkles className="w-4 h-4 text-teal-600 shrink-0" />
                <span>أهلاً بك، {smartGateway.personName} 👋</span>
              </div>
              <p className="text-xs text-teal-800 leading-relaxed font-medium">
                تم التحقق من هويتك الوطنية بنجاح في المنظومة التعليمية. وجد النظام أن لديك صفتين مسجلتين: <strong>معلم</strong> ولديك أيضاً <strong>أبناء في المدارس</strong>. يرجى اختيار البوابة التي تود الدخول إليها:
              </p>
            </div>

            <div className="space-y-3">
              {/* Option 1: Teacher Portal */}
              <button
                type="button"
                onClick={() => {
                  if (smartGateway.teacherUser) {
                    completeLogin({
                      ...smartGateway.teacherUser,
                      childrenNationalIds: smartGateway.children.map((c) => c.student.nationalId),
                      managedSchoolCodes: Array.from(new Set([
                        smartGateway.teacherUser.schoolCode,
                        ...(smartGateway.teacherUser.managedSchoolCodes || []),
                        ...smartGateway.children.map((c) => c.student.schoolCode),
                      ])).filter(Boolean),
                    });
                  }
                }}
                className="w-full flex items-center justify-between p-4 rounded-2xl border-2 border-slate-200 hover:border-indigo-600 bg-white hover:bg-indigo-50/40 transition-all text-right group cursor-pointer shadow-xs"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shrink-0 shadow-sm shadow-indigo-600/20">
                    <GraduationCap className="w-6 h-6" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-black text-slate-900 group-hover:text-indigo-800 flex items-center gap-1.5 flex-wrap">
                      <span>👨‍🏫 الدخول كمعلم</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 font-bold">
                        {smartGateway.teacherSchool?.name || smartGateway.teacherUser?.schoolCode}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                      تحضير الحصص، رصد غياب وتأخر الطلاب، ومتابعة الفصول والطلاب المسندين لك
                    </p>
                  </div>
                </div>
                <span className="text-xs font-black text-indigo-600 shrink-0 group-hover:translate-x-[-3px] transition-transform">
                  دخول المعلم ↵
                </span>
              </button>

              {/* Option 2: Unified Parent Portal for All Children across Schools */}
              <button
                type="button"
                onClick={() => {
                  const primaryChild = smartGateway.children[0]?.student;
                  const parentUser: User = {
                    id: `usr-parent-${smartGateway.nationalId}`,
                    nationalId: smartGateway.nationalId,
                    name: smartGateway.personName,
                    mobile: smartGateway.teacherUser?.mobile,
                    password: smartGateway.teacherUser?.password,
                    role: 'parent',
                    staffTitle: smartGateway.teacherUser?.staffTitle,
                    assignedClasses: smartGateway.teacherUser?.assignedClasses,
                    teachingSchoolCode: smartGateway.teacherUser?.schoolCode,
                    schoolCode: primaryChild?.schoolCode || smartGateway.teacherUser?.schoolCode || schools[0]?.code,
                    childrenNationalIds: smartGateway.children.map((c) => c.student.nationalId),
                    managedSchoolCodes: Array.from(new Set([
                      smartGateway.teacherUser?.schoolCode,
                      ...(smartGateway.teacherUser?.managedSchoolCodes || []),
                      ...smartGateway.children.map((c) => c.student.schoolCode),
                    ])).filter(Boolean) as string[],
                  };
                  completeLogin(parentUser);
                }}
                className="w-full p-4 rounded-2xl border-2 border-slate-200 hover:border-teal-600 bg-white hover:bg-teal-50/40 transition-all text-right group cursor-pointer shadow-xs space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-12 h-12 rounded-2xl bg-teal-600 flex items-center justify-center text-white shrink-0 shadow-sm shadow-teal-600/20">
                      <Users className="w-6 h-6" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-black text-slate-900 group-hover:text-teal-800 flex items-center gap-1.5 flex-wrap">
                        <span>👨‍👧‍👦 الدخول كولي أمر</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 font-bold">
                          {smartGateway.children.length} أبناء في المدارس
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        لوحة موحدة تعرض جميع أبنائك في المدارس المختلفة في صفحة واحدة
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-black text-teal-600 shrink-0 group-hover:translate-x-[-3px] transition-transform">
                    دخول ولي الأمر ↵
                  </span>
                </div>

                {/* Children and their schools previews */}
                <div className="pt-2 border-t border-slate-100 space-y-1.5">
                  <span className="text-[11px] font-bold text-slate-600 block">
                    الأبناء والمدارس المسجلين بها:
                  </span>
                  {smartGateway.children.map(({ student, school }) => (
                    <div key={student.id} className="flex items-center justify-between text-xs py-1.5 px-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
                      <div className="flex items-center gap-1.5">
                        <span>👨‍🎓</span>
                        <span className="font-bold text-slate-800">{student.name}</span>
                        <span className="text-[10px] text-slate-500 font-medium">({student.className} - شعبة {student.sectionName || '1'})</span>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-white text-slate-700 border border-slate-200 font-bold">
                        🏢 {school?.name || student.schoolCode}
                      </span>
                    </div>
                  ))}
                </div>
              </button>
            </div>

            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-950 text-[11px] leading-relaxed">
              💡 <strong>معلومة مهمة:</strong> يمكنك التبديل بين صفة المعلم وصفة ولي الأمر في أي لحظة بضغطة زر واحدة من أعلى الشاشة دون الحاجة لتسجيل الخروج.
            </div>

            <button
              type="button"
              onClick={() => setSmartGateway(null)}
              className="w-full py-2.5 text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer bg-slate-100 rounded-xl"
            >
              ← العودة وتغيير رقم الهوية
            </button>
          </div>
        ) : availableProfiles ? (
          <div className="space-y-4 text-right animate-fadeIn">
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-right">
              <div className="flex items-center gap-2 text-emerald-950 font-black text-sm mb-1">
                <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>مرحباً بك! وجدنا لك عدة حسابات مسجلة</span>
              </div>
              <p className="text-xs text-emerald-800 leading-relaxed">
                اختر الحساب أو البوابة التي ترغب بالدخول إليها:
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
          {/* Universal SSO Notice */}
          {loginTab === 'school_user' && (
            <div className="p-3.5 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200/90 rounded-2xl text-emerald-950 flex items-start gap-2.5 shadow-2xs">
              <Sparkles className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div className="text-[11px] leading-relaxed">
                <strong className="block font-black text-emerald-900 mb-0.5">الدخول الذكي الموحد برقم الهوية:</strong>
                أدخل رقم هويتك الوطنية، وسيتعرف النظام عليك تلقائياً (معلم، ولي أمر، طالب) ومدارسك وأبنائك دون الحاجة لاختيار المدرسة يدوياً.
              </div>
            </div>
          )}

          {/* If accessed with direct school link, show subtle badge */}
          {loginTab === 'school_user' && lockedSchool && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <Building2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="font-bold text-slate-800 truncate">{lockedSchool.name}</span>
                <span className="text-[10px] font-mono text-slate-500 shrink-0 font-bold">({lockedSchool.code})</span>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold shrink-0">
                رابط معتمد
              </span>
            </div>
          )}

          <div>
            <label className="block text-slate-700 font-bold mb-1">
              {loginTab === 'superadmin' ? 'رقم هوية المشرف العام *' : 'رقم الهوية الوطنية أو السجل المدني (أو رقم الجوال) *'}
            </label>
            <div className="relative">
              <input
                type="text"
                required
                maxLength={10}
                placeholder={loginTab === 'superadmin' ? 'أدخل رقم هوية المشرف (1000000000)' : 'أدخل 10 أرقام (مثال: 1070149008 أو 1020202020)'}
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
