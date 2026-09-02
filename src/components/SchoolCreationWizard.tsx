import React, { useState } from 'react';
import { School, User } from '../types';
import { addSchool, addUser, getUsers, saveUsers } from '../utils/storage';
import { 
  Building2, MapPin, Check, X, Sparkles, 
  ShieldCheck, Phone, Navigation, Layers 
} from 'lucide-react';
import { getCurrentCoordinates } from '../utils/geo';

interface SchoolCreationWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onSchoolCreated: (school: School, adminUser: User) => void;
  initialPlan?: 'trial' | 'semester' | 'yearly' | 'free_forever';
}

export const SchoolCreationWizard: React.FC<SchoolCreationWizardProps> = ({
  isOpen,
  onClose,
  onSchoolCreated,
  initialPlan = 'yearly',
}) => {
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [city, setCity] = useState('الرياض');
  const [type, setType] = useState<'elementary' | 'middle' | 'secondary' | 'quran'>('middle');
  const [contactMobile, setContactMobile] = useState('');
  
  // Geolocation
  const [lat, setLat] = useState(24.7136);
  const [lng, setLng] = useState(46.6753);
  const [radiusMeters, setRadiusMeters] = useState(300);
  const [isLocating, setIsLocating] = useState(false);

  // Admin user
  const [adminName, setAdminName] = useState('');
  const [adminNationalId, setAdminNationalId] = useState('');
  const [adminPassword, setAdminPassword] = useState('123456');

  const [selectedPlan, setSelectedPlan] = useState<'trial' | 'semester' | 'yearly' | 'free_forever'>(
    type === 'quran' ? 'free_forever' : initialPlan
  );

  if (!isOpen) return null;

  const handleAutoLocate = async () => {
    setIsLocating(true);
    try {
      const coords = await getCurrentCoordinates();
      setLat(Number(coords.latitude.toFixed(6)));
      setLng(Number(coords.longitude.toFixed(6)));
    } catch {
      // Failed to get location
    } finally {
      setIsLocating(false);
    }
  };

  const handleFinish = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !adminName.trim() || !adminNationalId.trim()) return;

    const generatedCode = code.trim().toUpperCase() || `SCH-${Math.floor(1000 + Math.random() * 9000)}`;
    const isQuran = type === 'quran' || selectedPlan === 'free_forever';

    const newSchool: School = {
      id: `sch-${Date.now()}`,
      code: generatedCode,
      name: name.trim(),
      city,
      type,
      lat,
      lng,
      radiusMeters,
      subscriptionPlan: isQuran ? 'free_forever' : selectedPlan,
      subscriptionStatus: 'active',
      subscriptionStartDate: new Date().toISOString().split('T')[0],
      subscriptionEndDate: isQuran ? '2099-12-31' : '2027-01-01',
      contactMobile: contactMobile.trim() || '0500000000',
      isQuranSchool: isQuran,
      customClasses: [
        { id: 'c-1', className: type === 'elementary' ? 'الأول الابتدائي' : type === 'secondary' ? 'الأول الثانوي' : 'الأول المتوسط', sections: ['1', '2'] },
        { id: 'c-2', className: type === 'elementary' ? 'الثاني الابتدائي' : type === 'secondary' ? 'الثاني الثانوي' : 'الثاني المتوسط', sections: ['1', '2'] },
      ],
    };

    addSchool(newSchool);

    // Check if current user is an employee creating a 2nd school
    const existingUsers = getUsers();
    const existingAdmin = existingUsers.find(
      (u) => u.nationalId === adminNationalId.trim() && u.role === 'employee'
    );

    let finalAdminUser: User;
    if (existingAdmin) {
      const currentManaged = existingAdmin.managedSchoolCodes || [existingAdmin.schoolCode];
      const updatedManaged = Array.from(new Set([...currentManaged, generatedCode])).slice(0, 2);
      
      finalAdminUser = {
        ...existingAdmin,
        managedSchoolCodes: updatedManaged,
        schoolCode: generatedCode, // Switch to new school immediately
      };
      
      const updatedUsers = existingUsers.map((u) => (u.id === finalAdminUser.id ? finalAdminUser : u));
      saveUsers(updatedUsers);
    } else {
      finalAdminUser = {
        id: `usr-emp-${adminNationalId.trim()}`,
        nationalId: adminNationalId.trim(),
        name: `${adminName.trim()} (مدير المدرسة)`,
        mobile: contactMobile.trim(),
        password: adminPassword.trim() || '123456',
        role: 'employee',
        schoolCode: generatedCode,
        managedSchoolCodes: [generatedCode],
      };
      addUser(finalAdminUser);
    }

    onSchoolCreated(newSchool, finalAdminUser);
    onClose();
  };

  return (
    <div 
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fadeIn" 
      dir="rtl"
    >
      <div className="bg-white border border-slate-200 rounded-3xl max-w-xl w-full p-6 text-right space-y-5 shadow-2xl text-slate-800">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">تسجيل مدرسة جديدة وتفعيل الحساب</h3>
              <p className="text-xs text-slate-500 font-medium">الخطوة {step} من 3</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleFinish} className="space-y-4 text-xs">
          {step === 1 && (
            <div className="space-y-3 animate-fadeIn">
              <h4 className="font-bold text-slate-900">1. البيانات الأساسية للمنشأة التعليمية:</h4>
              <div>
                <label className="block text-slate-700 font-bold mb-1">اسم المدرسة أو المجمع التعليمي *</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: مدارس الرياض الأهلية للبنين"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-900 focus:outline-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">المدينة *</label>
                  <input
                    type="text"
                    required
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">المرحلة / النوع *</label>
                  <select
                    value={type}
                    onChange={(e) => {
                      const val = e.target.value as 'elementary' | 'middle' | 'secondary' | 'quran';
                      setType(val);
                      if (val === 'quran') setSelectedPlan('free_forever');
                    }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-medium focus:outline-emerald-500"
                  >
                    <option value="middle">متوسطة</option>
                    <option value="elementary">ابتدائية</option>
                    <option value="secondary">ثانوية</option>
                    <option value="quran">مدرسة / حلقة تحفيظ قرآن (مجاناً مدى الحياة)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">كود المدرسة المختصر (اختياري، يولد تلقائياً)</label>
                <input
                  type="text"
                  placeholder="مثال: RIYADH-101"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-mono focus:outline-emerald-500"
                />
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  disabled={!name.trim()}
                  onClick={() => setStep(2)}
                  className="py-2.5 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs cursor-pointer shadow-sm"
                >
                  التالي: السياج الجغرافي ↵
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3 animate-fadeIn">
              <h4 className="font-bold text-slate-900">2. ضبط إحداثيات المدرسة والسياج الجغرافي:</h4>
              <button
                type="button"
                onClick={handleAutoLocate}
                className="w-full py-2.5 px-3 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
              >
                <Navigation className={`w-4 h-4 ${isLocating ? 'animate-spin text-emerald-600' : 'text-emerald-600'}`} />
                <span>{isLocating ? 'جاري التحديد...' : 'استخدام موقعي الحالي الآن 📍'}</span>
              </button>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">خط العرض (Lat):</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={lat}
                    onChange={(e) => setLat(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-mono focus:outline-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">خط الطول (Lng):</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={lng}
                    onChange={(e) => setLng(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-mono focus:outline-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">نصف قطر السياج المسموح: ({radiusMeters} متر)</label>
                <input
                  type="range"
                  min="50"
                  max="1000"
                  step="25"
                  value={radiusMeters}
                  onChange={(e) => setRadiusMeters(parseInt(e.target.value, 10))}
                  className="w-full accent-emerald-600 cursor-pointer"
                />
              </div>

              <div className="pt-2 flex justify-between">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="py-2 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold cursor-pointer"
                >
                  السابق
                </button>
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="py-2.5 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold cursor-pointer shadow-sm"
                >
                  التالي: حساب المدير ↵
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-3 animate-fadeIn">
              <h4 className="font-bold text-slate-900">3. حساب مدير المدرسة المشرف:</h4>
              <div>
                <label className="block text-slate-700 font-bold mb-1">اسم مدير المدرسة أو المسؤول *</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: أ. عبدالله ناصر الدوسري"
                  value={adminName}
                  onChange={(e) => setAdminName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-900 font-bold focus:outline-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">رقم الهوية الوطنية *</label>
                  <input
                    type="text"
                    required
                    maxLength={10}
                    placeholder="10xxxxxxxx"
                    value={adminNationalId}
                    onChange={(e) => setAdminNationalId(e.target.value.replace(/\D/g, ''))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-mono focus:outline-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">رقم الجوال *</label>
                  <input
                    type="tel"
                    required
                    placeholder="05xxxxxxxx"
                    value={contactMobile}
                    onChange={(e) => setContactMobile(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-mono focus:outline-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">كلمة المرور *</label>
                <input
                  type="text"
                  required
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-mono focus:outline-emerald-500"
                />
              </div>

              <div className="pt-3 flex justify-between">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="py-2 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold cursor-pointer"
                >
                  السابق
                </button>
                <button
                  type="submit"
                  className="py-3 px-8 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black flex items-center gap-1.5 shadow-md shadow-emerald-600/20 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>تأكيد وإنشاء المدرسة 🚀</span>
                </button>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};
