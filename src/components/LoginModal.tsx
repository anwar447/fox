import React, { useState } from 'react';
import { User, School } from '../types';
import { 
  Building2, Lock, UserCircle, X, Check, 
  Sparkles, AlertCircle, UserPlus, ArrowLeft, Crown, ShieldCheck
} from 'lucide-react';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  schools: School[];
  users: User[];
  onLoginSuccess: (user: User) => void;
  onOpenParentRegistration?: () => void;
  onOpenRegisterSchool?: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  schools,
  users,
  onLoginSuccess,
  onOpenParentRegistration,
  onOpenRegisterSchool,
}) => {
  const [loginTab, setLoginTab] = useState<'school_user' | 'superadmin'>('school_user');
  const [nationalId, setNationalId] = useState('');
  const [password, setPassword] = useState('');
  const [schoolCode, setSchoolCode] = useState(schools[0]?.code || '');
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const isSuperAdminId = nationalId.trim() === '1000000000' || loginTab === 'superadmin';

  const handleFillSuperAdmin = () => {
    setLoginTab('superadmin');
    setNationalId('1000000000');
    setPassword('admin');
    setErrorMsg('');
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const cleanNid = nationalId.trim().replace(/\D/g, '');
    const cleanPass = password.trim();

    // 1. Check superadmin first (No school code required!)
    if (loginTab === 'superadmin' || cleanNid === '1000000000') {
      const superAdmin = users.find((u) => u.role === 'superadmin');
      if (superAdmin) {
        if (cleanPass === (superAdmin.password || 'admin') || cleanPass === '123' || cleanPass === '123456' || cleanPass === 'admin') {
          onLoginSuccess(superAdmin);
          onClose();
          return;
        } else {
          setErrorMsg('كلمة مرور المشرف العام غير صحيحة (الافتراضية: admin أو 123)');
          return;
        }
      } else {
        // Fallback super admin user if not in state
        const fallbackSuperAdmin: User = {
          id: 'usr-admin-1',
          nationalId: '1000000000',
          name: 'سوبر ادمن (المشرف العام)',
          mobile: '0500000000',
          password: 'admin',
          role: 'superadmin',
          schoolCode: 'SUPERADMIN',
        };
        onLoginSuccess(fallbackSuperAdmin);
        onClose();
        return;
      }
    }

    // 2. Match regular user by school
    const matchedUser = users.find(
      (u) =>
        u.nationalId === cleanNid &&
        (u.schoolCode === schoolCode || u.role === 'superadmin')
    );

    if (!matchedUser) {
      // Check if this national ID exists in another school to give a helpful message
      const existsInOtherSchool = users.find((u) => u.nationalId === cleanNid);
      if (existsInOtherSchool) {
        setErrorMsg(`رقم الهوية مسجل في مدرسة أخرى (كود: ${existsInOtherSchool.schoolCode}). يرجى اختيار المدرسة الصحيحة من القائمة.`);
      } else {
        setErrorMsg('رقم الهوية غير مسجل في هذه المدرسة. تأكد من كود المدرسة ورقم الهوية أو قم بالتسجيل الذاتي.');
      }
      return;
    }

    // Pass verification (allow 123 / 1234 / 123456 as easy demo bypass)
    const validPass = matchedUser.password || '123';
    if (cleanPass && cleanPass !== validPass && cleanPass !== '123' && cleanPass !== '123456') {
      setErrorMsg('كلمة المرور غير صحيحة');
      return;
    }

    onLoginSuccess(matchedUser);
    onClose();
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
                {loginTab === 'superadmin' ? 'بوابة المشرف العام (سوبر ادمن)' : 'تسجيل الدخول الموحد'}
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                {loginTab === 'superadmin' ? 'صلاحية عامة لإدارة جميع المدارس والاشتراكات' : 'بوابة الطلاب، المعلمين، الإدارة وأولياء الأمور'}
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
              if (!nationalId) setNationalId('1000000000');
              if (!password) setPassword('admin');
            }}
            className={`py-2 px-3 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              loginTab === 'superadmin'
                ? 'bg-white text-amber-950 shadow-xs border border-slate-200/80 font-black'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Crown className="w-3.5 h-3.5 text-amber-600" />
            <span>سوبر أدمن 👑</span>
          </button>
        </div>

        {/* Superadmin Quick Info Card if in Superadmin Mode */}
        {loginTab === 'superadmin' && (
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/90 rounded-2xl p-3.5 text-xs text-amber-950 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-black text-amber-900">
                <ShieldCheck className="w-4 h-4 text-amber-600" />
                <span>دخول عام مباشر (بدون اختيار مدرسة)</span>
              </div>
              <button
                type="button"
                onClick={handleFillSuperAdmin}
                className="px-2.5 py-1 rounded-lg bg-amber-200 hover:bg-amber-300 text-amber-950 font-bold text-[11px] cursor-pointer transition-colors shadow-xs"
              >
                تعبئة تلقائية ⚡
              </button>
            </div>
            <div className="text-[11px] text-amber-800 space-y-0.5 font-mono">
              <p>الهوية: <strong>1000000000</strong></p>
              <p>كلمة المرور: <strong>admin</strong></p>
            </div>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-3.5 text-xs">
          {/* School Selector - ONLY shown for School User Mode */}
          {loginTab === 'school_user' && !isSuperAdminId && (
            schools.length > 0 ? (
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
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 space-y-2">
                <p className="text-xs">لم يتم تسجيل أي مدرسة بعد. يمكنك تسجيل مدرسة جديدة أو الدخول بحساب المشرف العام.</p>
                {onOpenRegisterSchool && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenRegisterSchool();
                    }}
                    className="w-full py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs cursor-pointer"
                  >
                    تسجيل وتفعيل مدرسة جديدة الآن 🚀
                  </button>
                )}
              </div>
            )
          )}

          <div>
            <label className="block text-slate-700 font-bold mb-1">
              {loginTab === 'superadmin' ? 'رقم هوية المشرف العام (10 أرقام) *' : 'رقم الهوية الوطنية / الإقامة (10 أرقام) *'}
            </label>
            <input
              type="text"
              required
              maxLength={10}
              placeholder={loginTab === 'superadmin' ? '1000000000' : '10xxxxxxxx أو 11xxxxxxxx'}
              value={nationalId}
              onChange={(e) => setNationalId(e.target.value.replace(/\D/g, ''))}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-900 font-mono focus:outline-emerald-500"
            />
          </div>

          <div>
            <label className="block text-slate-700 font-bold mb-1">كلمة المرور *</label>
            <input
              type="password"
              required
              placeholder="أدخل كلمة المرور"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-900 font-mono focus:outline-emerald-500"
            />
          </div>

          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
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
              <span>{loginTab === 'superadmin' ? 'دخول لوحة المشرف العام 👑' : 'دخول للمنظومة ↵'}</span>
            </button>
          </div>
        </form>

        {/* Self registration link */}
        {loginTab === 'school_user' && onOpenParentRegistration && (
          <div className="pt-2 text-center space-y-1.5">
            <p className="text-xs text-slate-500">طالب أو ولي أمر جديد؟</p>
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenParentRegistration();
              }}
              className="w-full py-2.5 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <UserPlus className="w-4 h-4 text-teal-600" />
              <span>التسجيل والتسكين الذاتي للطلاب وأولياء الأمور ⚡</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

