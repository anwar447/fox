import React, { useState } from 'react';
import { User, School } from '../types';
import { 
  Building2, Lock, UserCircle, X, Check, 
  Sparkles, AlertCircle, UserPlus, ArrowLeft
} from 'lucide-react';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  schools: School[];
  users: User[];
  onLoginSuccess: (user: User) => void;
  onOpenParentRegistration?: () => void;
  onOpenRegisterSchool?: () => void;
  onOpenDemoSwitcher?: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  schools,
  users,
  onLoginSuccess,
  onOpenParentRegistration,
  onOpenRegisterSchool,
  onOpenDemoSwitcher,
}) => {
  const [nationalId, setNationalId] = useState('');
  const [password, setPassword] = useState('');
  const [schoolCode, setSchoolCode] = useState(schools[0]?.code || '');
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const cleanNid = nationalId.trim().replace(/\D/g, '');
    const cleanPass = password.trim();

    // Check superadmin first
    const superAdmin = users.find((u) => u.role === 'superadmin' && u.nationalId === cleanNid);
    if (superAdmin) {
      if (cleanPass === (superAdmin.password || 'admin') || cleanPass === '123' || cleanPass === '123456') {
        onLoginSuccess(superAdmin);
        onClose();
        return;
      }
    }

    // Match regular user
    const matchedUser = users.find(
      (u) =>
        u.nationalId === cleanNid &&
        (u.schoolCode === schoolCode || u.role === 'superadmin')
    );

    if (!matchedUser) {
      setErrorMsg('رقم الهوية غير مسجل في هذه المدرسة. تأكد من كود المدرسة ورقم الهوية أو قم بالتسجيل الذاتي.');
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
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center">
              <UserCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">تسجيل الدخول الموحد</h3>
              <p className="text-xs text-slate-500 font-medium">بوابة الطلاب، المعلمين، الإدارة وأولياء الأمور</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleLogin} className="space-y-3.5 text-xs">
          {schools.length > 0 ? (
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
          )}

          <div>
            <label className="block text-slate-700 font-bold mb-1">رقم الهوية الوطنية / الإقامة (10 أرقام) *</label>
            <input
              type="text"
              required
              maxLength={10}
              placeholder="10xxxxxxxx أو 11xxxxxxxx"
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
              className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>دخول للمنظومة ↵</span>
            </button>
          </div>
        </form>

        {/* Quick Demo Switcher trigger in login modal */}
        {onOpenDemoSwitcher && (
          <div className="pt-3 border-t border-slate-200 text-center">
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenDemoSwitcher();
              }}
              className="w-full py-2.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-amber-600" />
              <span>تجربة أدوار المنظومة بضغطة زر (Demo Accounts) 🎭</span>
            </button>
          </div>
        )}

        {/* Self registration link */}
        {onOpenParentRegistration && (
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
