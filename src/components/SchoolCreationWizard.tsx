import React, { useState } from 'react';
import { 
  Building2, 
  MapPin, 
  Clock, 
  Users, 
  ShieldCheck, 
  CheckCircle2, 
  Plus, 
  Trash2, 
  X, 
  Sparkles, 
  ChevronRight, 
  ChevronLeft,
  Sliders,
  Compass,
  CreditCard,
  Phone,
  MessageSquare,
  Copy,
  Check,
  BookOpen
} from 'lucide-react';
import { School, User, SchoolTimings, Geofence, SubscriptionPlan } from '../types';
import { triggerNotification } from '../utils/notifications';
import { InteractiveMapPicker } from './InteractiveMapPicker';

interface SchoolCreationWizardProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  onSchoolCreated: (school: School, founderUser: User, assistantUsers: User[]) => void;
}

const SAUDI_CITY_PRESETS = [
  { name: 'الرياض - العليا', lat: 24.7136, lng: 46.6753, city: 'الرياض' },
  { name: 'الرياض - النخيل', lat: 24.7500, lng: 46.6500, city: 'الرياض' },
  { name: 'جدة - الروضة', lat: 21.5433, lng: 39.1728, city: 'جدة' },
  { name: 'مكة المكرمة - العزيزية', lat: 21.4133, lng: 39.8579, city: 'مكة المكرمة' },
  { name: 'الدمام - الشاطئ', lat: 26.4344, lng: 50.1033, city: 'الدمام' },
  { name: 'المدينة المنورة - قباء', lat: 24.4672, lng: 39.6111, city: 'المدينة المنورة' },
  { name: 'القصيم - بريدة', lat: 26.3592, lng: 43.9818, city: 'القصيم' },
  { name: 'أبها - المنسك', lat: 18.2164, lng: 42.5053, city: 'أبها' },
];

export const SchoolCreationWizard: React.FC<SchoolCreationWizardProps> = ({
  isOpen,
  onClose,
  currentUser,
  onSchoolCreated,
}) => {
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);

  // Form State
  // Step 1: Basic Info
  const [schoolName, setSchoolName] = useState('');
  const [schoolCode, setSchoolCode] = useState('');
  const [city, setCity] = useState('الرياض');
  const [educationOffice, setEducationOffice] = useState('مكتب تعليم شمال الرياض');
  const [managerName, setManagerName] = useState('');
  const [schoolType, setSchoolType] = useState<'elementary' | 'intermediate' | 'secondary' | 'combined'>('intermediate');
  const [contactMobile, setContactMobile] = useState('');
  
  // Founder credentials if not logged in
  const [founderName, setFounderName] = useState(currentUser?.name || '');
  const [founderNid, setFounderNid] = useState(currentUser?.nationalId || '');
  const [founderMobile, setFounderMobile] = useState(currentUser?.mobile || '');

  // Step 2: Geofence & Location
  const [latitude, setLatitude] = useState(24.7136);
  const [longitude, setLongitude] = useState(46.6753);
  const [radius, setRadius] = useState(300);
  const [addressName, setAddressName] = useState('طريق الملك فهد، حي العليا');

  // Step 3: Timings
  const [timings, setTimings] = useState<SchoolTimings>({
    tabour: '06:45',
    firstPeriod: '07:00',
    lateAfter: '07:15',
    absentAfter: '07:45',
    breakTime: '09:30',
    dismissal: '12:45',
  });

  // Step 4: Assistant Employees
  const [assistants, setAssistants] = useState<Array<{
    name: string;
    nationalId: string;
    mobile: string;
    roleTitle: string;
  }>>([
    {
      name: 'سعود بن حمد التميمي',
      nationalId: `1022${Math.floor(100000 + Math.random() * 900000)}`,
      mobile: '0551223344',
      roleTitle: 'مساعد إداري لشؤون الطلاب',
    }
  ]);

  const [newAsstName, setNewAsstName] = useState('');
  const [newAsstNid, setNewAsstNid] = useState('');
  const [newAsstMobile, setNewAsstMobile] = useState('');
  const [newAsstRole, setNewAsstRole] = useState('وكيل شؤون الطلاب');

  // Step 5: Subscription Plan & uPay Payment Details
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan>('semester');
  const [copiedPaymentPhone, setCopiedPaymentPhone] = useState(false);
  const [transferRefNumber, setTransferRefNumber] = useState('');
  const [senderTransferName, setSenderTransferName] = useState('');

  if (!isOpen) return null;

  const handleAddAssistant = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAsstName.trim() || !newAsstNid.trim()) return;
    setAssistants([
      ...assistants,
      {
        name: newAsstName.trim(),
        nationalId: newAsstNid.trim(),
        mobile: newAsstMobile.trim() || '0500000000',
        roleTitle: newAsstRole,
      }
    ]);
    setNewAsstName('');
    setNewAsstNid('');
    setNewAsstMobile('');
  };

  const handleRemoveAssistant = (index: number) => {
    setAssistants(assistants.filter((_, idx) => idx !== index));
  };

  const handleSelectPresetLocation = (preset: typeof SAUDI_CITY_PRESETS[0]) => {
    setLatitude(preset.lat);
    setLongitude(preset.lng);
    setCity(preset.city);
    setAddressName(preset.name);
  };

  const handleCompleteCreation = () => {
    const finalCode = schoolCode.trim() || `SCH-${Math.floor(1000 + Math.random() * 9000)}`;
    const finalFounderNid = founderNid.trim() || currentUser?.nationalId || `10${Math.floor(10000000 + Math.random() * 90000000)}`;

    const expiryDays = selectedPlan === 'yearly' ? 365 : selectedPlan === 'semester' ? 120 : selectedPlan === 'free_forever' ? 3650 : 30;
    const maxStudentsLimit = selectedPlan === 'free_forever' || selectedPlan === 'yearly' ? 1000 : selectedPlan === 'semester' ? 600 : 250;

    const newSchool: School = {
      id: `sch-${Date.now()}`,
      name: schoolName.trim() || 'مدرسة جديدة ذكية',
      code: finalCode,
      logo: 'https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=150&auto=format&fit=crop&q=80',
      city: city,
      educationOffice: educationOffice,
      type: schoolType,
      contact: contactMobile || '0112345678',
      managerName: managerName.trim() || 'مدير المدرسة المعتمد',
      timings: timings,
      geofence: {
        lat: latitude,
        lng: longitude,
        radius: radius,
        addressName: addressName,
      },
      createdBy: finalFounderNid,
      subscriptionPlan: selectedPlan,
      subscriptionStartDate: new Date().toISOString().split('T')[0],
      subscriptionExpiryDate: new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      maxStudents: maxStudentsLimit,
      isSuspended: false,
      notes: `تم إنشاء المدرسة بواسطة ${founderName || 'المؤسس'}${transferRefNumber ? ` - سداد uPay مرجع: ${transferRefNumber}` : ''}`,
      createdAt: new Date().toISOString().split('T')[0],
    };

    const founderUser: User = {
      id: `usr-emp-${finalFounderNid}`,
      nationalId: finalFounderNid,
      name: founderName.trim() || currentUser?.name || 'الموظف المؤسس',
      mobile: founderMobile || currentUser?.mobile || '0555000000',
      password: finalFounderNid.slice(-4) || '1234',
      role: 'employee',
      schoolCode: finalCode,
      isAssistant: false,
    };

    const assistantUsers: User[] = assistants.map((asst, i) => ({
      id: `usr-asst-${asst.nationalId}-${i}`,
      nationalId: asst.nationalId,
      name: `${asst.name} (${asst.roleTitle})`,
      mobile: asst.mobile,
      password: asst.nationalId.slice(-4) || '1234',
      role: 'employee',
      schoolCode: finalCode,
      isAssistant: true,
      assistantPermissions: {
        canManageAttendance: true,
        canApproveExcuses: true,
        canBroadcastEmergency: true,
        canManageStudents: true,
      },
    }));

    triggerNotification(
      `تم إنشاء مدرسة (${newSchool.name}) بنجاح`,
      `كود المدرسة: ${newSchool.code} - تم ضبط السياج الجغرافي (${newSchool.geofence.radius}م) والأوقات وفريق العمل بنجاح.`,
      'general',
      newSchool.code,
      'employee'
    );

    onSchoolCreated(newSchool, founderUser, assistantUsers);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-fadeIn overflow-y-auto">
      <div className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col my-8">
        
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 text-white p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center font-bold text-emerald-400">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white">معالج إنشاء وضبط مدرسة جديدة</h2>
              <p className="text-xs text-emerald-200">
                تسجيل بيانات المدرسة، السياج الجغرافي، مواعيد الحصص، والموظفين المساعدين
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Progress Indicators */}
        <div className="bg-slate-50 px-6 py-3 border-b border-slate-200 flex items-center justify-between text-xs font-bold text-slate-500 overflow-x-auto">
          <button
            type="button"
            onClick={() => setStep(1)}
            className={`flex items-center gap-1.5 cursor-pointer hover:text-emerald-700 transition-colors ${step === 1 ? 'text-emerald-700 font-black' : ''}`}
          >
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${step === 1 ? 'bg-emerald-600 text-white' : 'bg-slate-200'}`}>1</span>
            <span>البيانات الأساسية</span>
          </button>
          <ChevronLeft className="w-4 h-4 text-slate-300 shrink-0" />
          
          <button
            type="button"
            onClick={() => setStep(2)}
            className={`flex items-center gap-1.5 cursor-pointer hover:text-emerald-700 transition-colors ${step === 2 ? 'text-emerald-700 font-black' : ''}`}
          >
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${step === 2 ? 'bg-emerald-600 text-white' : 'bg-slate-200'}`}>2</span>
            <span>📍 السياج والخريطة</span>
          </button>
          <ChevronLeft className="w-4 h-4 text-slate-300 shrink-0" />

          <button
            type="button"
            onClick={() => setStep(3)}
            className={`flex items-center gap-1.5 cursor-pointer hover:text-emerald-700 transition-colors ${step === 3 ? 'text-emerald-700 font-black' : ''}`}
          >
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${step === 3 ? 'bg-emerald-600 text-white' : 'bg-slate-200'}`}>3</span>
            <span>مواقيت الدوام</span>
          </button>
          <ChevronLeft className="w-4 h-4 text-slate-300 shrink-0" />

          <button
            type="button"
            onClick={() => setStep(4)}
            className={`flex items-center gap-1.5 cursor-pointer hover:text-emerald-700 transition-colors ${step === 4 ? 'text-emerald-700 font-black' : ''}`}
          >
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${step === 4 ? 'bg-emerald-600 text-white' : 'bg-slate-200'}`}>4</span>
            <span>المساعدين</span>
          </button>
          <ChevronLeft className="w-4 h-4 text-slate-300 shrink-0" />

          <button
            type="button"
            onClick={() => setStep(5)}
            className={`flex items-center gap-1.5 cursor-pointer hover:text-emerald-700 transition-colors ${step === 5 ? 'text-emerald-700 font-black' : ''}`}
          >
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${step === 5 ? 'bg-emerald-600 text-white' : 'bg-slate-200'}`}>5</span>
            <span>الباقة والتأكيد</span>
          </button>
        </div>

        {/* Modal Body: Steps */}
        <div className="p-6 sm:p-8 space-y-6 overflow-y-auto max-h-[60vh] text-xs">
          
          {/* STEP 1: Basic Information */}
          {step === 1 && (
            <div className="space-y-4 animate-fadeIn">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-base font-black text-slate-900">الخطوة 1: البيانات الرسمية للمدرسة والمؤسس</h3>
                <p className="text-slate-500 mt-0.5">أدخل الاسم المعتمد والكود الوزاري ومعلومات مدير المدرسة</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-800 mb-1">اسم المدرسة الرسمي *</label>
                  <input
                    type="text"
                    placeholder="مثال: ثانوية الأندلس للبنين"
                    value={schoolName}
                    onChange={(e) => setSchoolName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-800 font-bold focus:bg-white focus:outline-hidden"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-800 mb-1">الكود الوزاري / المعرف *</label>
                  <input
                    type="text"
                    placeholder="مثال: ANDL-1448"
                    value={schoolCode}
                    onChange={(e) => setSchoolCode(e.target.value.toUpperCase())}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-mono font-bold text-emerald-800 focus:bg-white focus:outline-hidden"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-800 mb-1">المدينة *</label>
                  <select
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-800 font-semibold focus:bg-white focus:outline-hidden"
                  >
                    <option value="الرياض">الرياض</option>
                    <option value="جدة">جدة</option>
                    <option value="مكة المكرمة">مكة المكرمة</option>
                    <option value="المدينة المنورة">المدينة المنورة</option>
                    <option value="الدمام">الدمام</option>
                    <option value="القصيم">القصيم</option>
                    <option value="أبها">أبها</option>
                    <option value="الطائف">الطائف</option>
                    <option value="تبوك">تبوك</option>
                    <option value="حائل">حائل</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-800 mb-1">مكتب / إدارة التعليم</label>
                  <input
                    type="text"
                    placeholder="مثال: مكتب تعليم شمال الرياض"
                    value={educationOffice}
                    onChange={(e) => setEducationOffice(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-800 focus:bg-white focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-800 mb-1">المرحلة الدراسية *</label>
                  <select
                    value={schoolType}
                    onChange={(e) => setSchoolType(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-800 font-semibold focus:bg-white focus:outline-hidden"
                  >
                    <option value="elementary">المرحلة الابتدائية</option>
                    <option value="intermediate">المرحلة المتوسطة</option>
                    <option value="secondary">المرحلة الثانوية (مسارات)</option>
                    <option value="combined">مجمع تعليمي مشترك</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-800 mb-1">اسم مدير المدرسة</label>
                  <input
                    type="text"
                    placeholder="مثال: أ. صالح بن إبراهيم المنصور"
                    value={managerName}
                    onChange={(e) => setManagerName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-800 focus:bg-white focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Founder Section */}
              <div className="bg-emerald-50/60 border border-emerald-200 rounded-2xl p-4 space-y-3 mt-4">
                <div className="font-bold text-emerald-950 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-700" />
                  <span>بيانات الموظف المؤسس (المسؤول الرئيسي)</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">اسم المؤسس</label>
                    <input
                      type="text"
                      placeholder="اسمك الكامل"
                      value={founderName}
                      onChange={(e) => setFounderName(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">رقم الهوية الوطنية</label>
                    <input
                      type="text"
                      placeholder="10XXXXXXXX"
                      value={founderNid}
                      onChange={(e) => setFounderNid(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">رقم الجوال</label>
                    <input
                      type="text"
                      placeholder="05XXXXXXXX"
                      value={founderMobile}
                      onChange={(e) => setFounderMobile(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Step 1 to Step 2 Direct Action */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="w-full py-3 px-4 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-2xl text-emerald-900 font-bold text-xs flex items-center justify-between transition-all cursor-pointer shadow-xs"
                >
                  <span className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-emerald-600 animate-bounce" />
                    <span>الخطوة التالية: فتح خريطة المدرسة وتحديد موقع الدبوس والسياج (Geofence) 📍</span>
                  </span>
                  <ChevronLeft className="w-4 h-4 text-emerald-700" />
                </button>
              </div>

            </div>
          )}

          {/* STEP 2: Geofence & Location */}
          {step === 2 && (
            <div className="space-y-4 animate-fadeIn">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-base font-black text-slate-900">الخطوة 2: خريطة تحديد موقع المدرسة والسياج الجغرافي (Geofence)</h3>
                <p className="text-slate-500 mt-0.5">
                  حدد موقع المدرسة مباشرة بوضع الدبوس على الخريطة أو زر موقعي الحالي (GPS)
                </p>
              </div>

              {/* Interactive Visual Map Picker */}
              <InteractiveMapPicker
                latitude={latitude}
                longitude={longitude}
                radius={radius}
                onChange={({ lat, lng, address }) => {
                  setLatitude(lat);
                  setLongitude(lng);
                  if (address) {
                    setAddressName(address);
                  }
                }}
                height="320px"
              />

              {/* City Presets Quick Jump */}
              <div>
                <label className="block font-bold text-slate-800 mb-1.5 text-xs">أو انتقل سريعاً لمدينة رئيسية:</label>
                <div className="flex flex-wrap gap-1.5">
                  {SAUDI_CITY_PRESETS.map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSelectPresetLocation(preset)}
                      className={`px-2.5 py-1 rounded-lg border text-[11px] font-bold transition-all cursor-pointer ${
                        latitude === preset.lat && longitude === preset.lng
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                          : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                      }`}
                    >
                      {preset.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Radius Slider */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="font-bold text-slate-800 flex items-center gap-1.5">
                    <Sliders className="w-4 h-4 text-emerald-700" />
                    <span>نصف قطر السياج الجغرافي (محيط الحرم المدرسي)</span>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 font-mono font-black text-xs">
                    {radius} متر
                  </span>
                </div>

                <input
                  type="range"
                  min="50"
                  max="1000"
                  step="25"
                  value={radius}
                  onChange={(e) => setRadius(parseInt(e.target.value))}
                  className="w-full accent-emerald-600 cursor-pointer"
                />

                <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                  <span>50 متر (مبنى صغير)</span>
                  <span>300 متر (مبنى متوسط)</span>
                  <span>600 متر (مجمع كبير)</span>
                  <span>1000 متر (حرم واسع)</span>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1 text-xs">العنوان الوصفي / الحي والشارع</label>
                <input
                  type="text"
                  placeholder="مثال: حي الروضة - طريق الملك فهد"
                  value={addressName}
                  onChange={(e) => setAddressName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-800 font-medium text-xs"
                />
              </div>

            </div>
          )}

          {/* STEP 3: School Timings Schedule */}
          {step === 3 && (
            <div className="space-y-4 animate-fadeIn">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-base font-black text-slate-900">الخطوة 3: جدول ومواقيت الدوام المدرسي</h3>
                <p className="text-slate-500 mt-0.5">
                  تحديد أوقات الاصطفاف، بداية الحصص، وقت احتساب التأخر والغياب، والفسحة والانصراف
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-1.5">
                  <label className="block font-bold text-slate-800 flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-emerald-600" />
                    <span>الاصطفاف الصباحي (الطابور)</span>
                  </label>
                  <input
                    type="time"
                    value={timings.tabour}
                    onChange={(e) => setTimings({ ...timings, tabour: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 font-mono font-bold text-slate-800 text-sm"
                  />
                  <span className="text-[10px] text-slate-400 block">بدء فتح تسجيل الجوال للطلاب</span>
                </div>

                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-1.5">
                  <label className="block font-bold text-slate-800 flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-blue-600" />
                    <span>بداية الحصة الأولى</span>
                  </label>
                  <input
                    type="time"
                    value={timings.firstPeriod}
                    onChange={(e) => setTimings({ ...timings, firstPeriod: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 font-mono font-bold text-slate-800 text-sm"
                  />
                  <span className="text-[10px] text-slate-400 block">دخول الفصول وبدء تحضير المعلم</span>
                </div>

                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-1.5">
                  <label className="block font-bold text-slate-800 flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-amber-600" />
                    <span>حد احتساب التأخر الصباحي</span>
                  </label>
                  <input
                    type="time"
                    value={timings.lateAfter}
                    onChange={(e) => setTimings({ ...timings, lateAfter: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 font-mono font-bold text-amber-800 text-sm"
                  />
                  <span className="text-[10px] text-slate-400 block">يُسجل الطالب متأخراً بعد هذا الوقت</span>
                </div>

                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-1.5">
                  <label className="block font-bold text-slate-800 flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-rose-600" />
                    <span>حد احتساب الغياب الكامل</span>
                  </label>
                  <input
                    type="time"
                    value={timings.absentAfter}
                    onChange={(e) => setTimings({ ...timings, absentAfter: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 font-mono font-bold text-rose-800 text-sm"
                  />
                  <span className="text-[10px] text-slate-400 block">يُغلق التسجيل الذاتي ويُعد غائباً</span>
                </div>

                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-1.5">
                  <label className="block font-bold text-slate-800 flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-teal-600" />
                    <span>موعد الفسحة المدرسية</span>
                  </label>
                  <input
                    type="time"
                    value={timings.breakTime}
                    onChange={(e) => setTimings({ ...timings, breakTime: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 font-mono font-bold text-slate-800 text-sm"
                  />
                  <span className="text-[10px] text-slate-400 block">فترة الراحة والوجبة</span>
                </div>

                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-1.5">
                  <label className="block font-bold text-slate-800 flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-purple-600" />
                    <span>موعد الانصراف النهائي</span>
                  </label>
                  <input
                    type="time"
                    value={timings.dismissal}
                    onChange={(e) => setTimings({ ...timings, dismissal: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 font-mono font-bold text-slate-800 text-sm"
                  />
                  <span className="text-[10px] text-slate-400 block">نهاية اليوم الدراسي المعتمد</span>
                </div>

              </div>
            </div>
          )}

          {/* STEP 4: Assistant Employees */}
          {step === 4 && (
            <div className="space-y-4 animate-fadeIn">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-base font-black text-slate-900">الخطوة 4: إضافة وتعيين الموظفين المساعدين</h3>
                <p className="text-slate-500 mt-0.5">
                  يمكنك إضافة حتى 4 موظفين مساعدين بنفس صلاحيات المؤسس لمساعدتك في رصد ومتابعة الحضور
                </p>
              </div>

              {/* Form to add assistant */}
              <form onSubmit={handleAddAssistant} className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                <div className="font-bold text-slate-800">إضافة موظف مساعد جديد:</div>
                
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">الاسم الكامل</label>
                    <input
                      type="text"
                      placeholder="اسم المساعد"
                      value={newAsstName}
                      onChange={(e) => setNewAsstName(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">رقم الهوية الوطنية</label>
                    <input
                      type="text"
                      placeholder="10XXXXXXXX"
                      value={newAsstNid}
                      onChange={(e) => setNewAsstNid(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 font-mono"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">المسمى الوظيفي</label>
                    <select
                      value={newAsstRole}
                      onChange={(e) => setNewAsstRole(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2"
                    >
                      <option value="وكيل شؤون الطلاب">وكيل شؤون الطلاب</option>
                      <option value="مساعد إداري لشؤون الطلاب">مساعد إداري لشؤون الطلاب</option>
                      <option value="موجه طلابي">موجه طلابي</option>
                      <option value="مشرف متابعة الحضور">مشرف متابعة الحضور</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">الجوال</label>
                    <input
                      type="text"
                      placeholder="05XXXXXXXX"
                      value={newAsstMobile}
                      onChange={(e) => setNewAsstMobile(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 font-mono"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" />
                    <span>إضافة المساعد للقائمة</span>
                  </button>
                </div>
              </form>

              {/* Current Assistant List */}
              <div className="space-y-2">
                <div className="font-bold text-slate-800">قائمة المساعدين المعتمدين ({assistants.length}/4):</div>
                {assistants.length === 0 ? (
                  <div className="p-4 rounded-xl border border-dashed border-slate-300 text-center text-slate-400">
                    لم تتم إضافة مساعدين بعد (يمكنك إضافتهم لاحقاً من لوحة الموظف)
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden">
                    {assistants.map((asst, idx) => (
                      <div key={idx} className="p-3 bg-white flex items-center justify-between">
                        <div className="space-y-0.5">
                          <div className="font-bold text-slate-900">{asst.name}</div>
                          <div className="text-[11px] text-slate-500 flex items-center gap-2">
                            <span className="text-emerald-700 font-semibold">{asst.roleTitle}</span>
                            <span>•</span>
                            <span className="font-mono">هوية: {asst.nationalId}</span>
                            <span>•</span>
                            <span className="font-mono">جوال: {asst.mobile}</span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveAssistant(idx)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          )}

          {/* STEP 5: Plan Selection & Summary Confirmation */}
          {step === 5 && (
            <div className="space-y-4 animate-fadeIn">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-base font-black text-slate-900">الخطوة 5: اختيار باقة الترخيص وسداد الرسوم</h3>
                <p className="text-slate-500 mt-0.5">حدد باقة الاشتراك لتفعيل الترخيص الفوري لمدرستك (سداد عبر uPay الراجحي)</p>
              </div>

              {/* Plans Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                
                {/* Semester Plan (450 SAR) */}
                <button
                  type="button"
                  onClick={() => setSelectedPlan('semester')}
                  className={`p-4 rounded-2xl border-2 text-right transition-all cursor-pointer flex flex-col justify-between space-y-2 relative overflow-hidden ${
                    selectedPlan === 'semester'
                      ? 'border-emerald-600 bg-emerald-50/70 shadow-md ring-2 ring-emerald-500/20'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <div className="font-black text-slate-900 text-sm">اشتراك نصف سنوي</div>
                      <span className="text-xs font-black text-emerald-700 font-mono">450 ريال</span>
                    </div>
                    <div className="text-emerald-700 font-bold text-xs mt-0.5">ترخيص فصلي كامل</div>
                    <p className="text-[11px] text-slate-500 mt-1">كافة مميزات السياج ومطابقة نور والتقارير</p>
                  </div>
                  <span className="text-[11px] font-bold text-emerald-800">
                    {selectedPlan === 'semester' ? '✓ الباقة المحددة' : 'اختيار الباقة'}
                  </span>
                </button>

                {/* Yearly Plan (800 SAR) */}
                <button
                  type="button"
                  onClick={() => setSelectedPlan('yearly')}
                  className={`p-4 rounded-2xl border-2 text-right transition-all cursor-pointer flex flex-col justify-between space-y-2 relative overflow-hidden ${
                    selectedPlan === 'yearly'
                      ? 'border-emerald-600 bg-emerald-50/70 shadow-md ring-2 ring-emerald-500/20'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <span className="absolute top-0 left-0 bg-amber-500 text-slate-950 font-black text-[9px] px-2 py-0.5 rounded-br-lg">
                    توفير 100 ريال
                  </span>
                  <div>
                    <div className="flex items-center justify-between">
                      <div className="font-black text-slate-900 text-sm">اشتراك سنوي كامل</div>
                      <span className="text-xs font-black text-emerald-700 font-mono">800 ريال</span>
                    </div>
                    <div className="text-emerald-700 font-bold text-xs mt-0.5">عام دراسي كامل</div>
                    <p className="text-[11px] text-slate-500 mt-1">استيعاب غير محدود ودعم فني VIP</p>
                  </div>
                  <span className="text-[11px] font-bold text-emerald-800">
                    {selectedPlan === 'yearly' ? '✓ الباقة المحددة' : 'اختيار الباقة'}
                  </span>
                </button>

                {/* Quran Memorization School (0 SAR) */}
                <button
                  type="button"
                  onClick={() => setSelectedPlan('free_forever')}
                  className={`p-4 rounded-2xl border-2 text-right transition-all cursor-pointer flex flex-col justify-between space-y-2 ${
                    selectedPlan === 'free_forever'
                      ? 'border-amber-500 bg-amber-50/80 shadow-md ring-2 ring-amber-400/20'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <div className="font-black text-slate-900 text-sm flex items-center gap-1">
                        <BookOpen className="w-3.5 h-3.5 text-amber-600" />
                        <span>تحفيظ القرآن</span>
                      </div>
                      <span className="text-xs font-black text-amber-700">0 ريال</span>
                    </div>
                    <div className="text-amber-700 font-bold text-xs mt-0.5">مجاني 100% مدى الحياة</div>
                    <p className="text-[11px] text-slate-500 mt-1">مبادرة خاصة بمدارس وحلقات القرآن</p>
                  </div>
                  <span className="text-[11px] font-bold text-amber-800">
                    {selectedPlan === 'free_forever' ? '✓ الباقة المحددة' : 'اختيار الباقة'}
                  </span>
                </button>

                {/* Free Trial (0 SAR) */}
                <button
                  type="button"
                  onClick={() => setSelectedPlan('free_trial')}
                  className={`p-4 rounded-2xl border-2 text-right transition-all cursor-pointer flex flex-col justify-between space-y-2 ${
                    selectedPlan === 'free_trial'
                      ? 'border-slate-800 bg-slate-100 shadow-md'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <div className="font-black text-slate-900 text-sm">الباقة التجريبية</div>
                      <span className="text-xs font-bold text-slate-500">مجاناً</span>
                    </div>
                    <div className="text-slate-700 font-bold text-xs mt-0.5">30 يوماً تجربة</div>
                    <p className="text-[11px] text-slate-500 mt-1">لتجربة النظام قبل التحويل والسداد</p>
                  </div>
                  <span className="text-[11px] font-bold text-slate-800">
                    {selectedPlan === 'free_trial' ? '✓ الباقة المحددة' : 'اختيار الباقة'}
                  </span>
                </button>

              </div>

              {/* Payment Box for Paid Plans (uPay Al Rajhi 0548171965) */}
              {(selectedPlan === 'semester' || selectedPlan === 'yearly') && (
                <div className="bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-950 text-white rounded-2xl p-4 sm:p-5 border-2 border-emerald-400/40 shadow-lg space-y-3">
                  
                  <div className="flex items-center justify-between border-b border-white/10 pb-2.5 flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <div className="px-2.5 py-0.5 bg-emerald-500/20 text-emerald-300 rounded-lg text-xs font-black border border-emerald-400/30">
                        uPay الراجحي (Urpay)
                      </div>
                      <span className="text-xs text-slate-300 font-medium">سداد رسوم الترخيص المباشر</span>
                    </div>

                    <div className="text-right">
                      <span className="text-xs text-slate-300">المبلغ المطلوب: </span>
                      <strong className="text-lg font-black text-amber-300 font-mono">
                        {selectedPlan === 'semester' ? '450 ريال (نصف سنوي)' : '800 ريال (سنوي)'}
                      </strong>
                    </div>
                  </div>

                  {/* Transfer Phone Number Card */}
                  <div className="bg-white/10 backdrop-blur-md rounded-xl p-3 border border-white/20 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="text-center sm:text-right">
                      <span className="text-[11px] text-slate-300 block">
                        رقم الجوال للتحويل عبر <strong className="text-white font-bold">uPay الراجحي</strong>:
                      </span>
                      <div className="text-xl sm:text-2xl font-black text-emerald-300 font-mono tracking-wider">
                        0548171965
                      </div>
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard?.writeText('0548171965');
                          setCopiedPaymentPhone(true);
                          setTimeout(() => setCopiedPaymentPhone(false), 2000);
                        }}
                        className="flex-1 sm:flex-none px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs transition-all shadow-sm cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        {copiedPaymentPhone ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedPaymentPhone ? 'تم النسخ ✓' : 'نسخ رقم الجوال'}</span>
                      </button>

                      <a
                        href={`https://wa.me/966548171965?text=${encodeURIComponent(`السلام عليكم، قمت بتحويل رسوم ترخيص مدرسة (${schoolName || 'مدرسة جديدة'}) بمبلغ ${selectedPlan === 'semester' ? '500' : '950'} ريال عبر uPay الراجحي.`)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3.5 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white font-bold text-xs border border-white/20 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <MessageSquare className="w-3.5 h-3.5 text-emerald-300" />
                        <span>تأكيد واتساب</span>
                      </a>
                    </div>
                  </div>

                  {/* Transfer Reference Input */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    <div>
                      <label className="block text-[10px] text-slate-300 mb-1">اسم المحول / صاحب الحساب</label>
                      <input
                        type="text"
                        placeholder="اسم المحول"
                        value={senderTransferName}
                        onChange={(e) => setSenderTransferName(e.target.value)}
                        className="w-full bg-white/10 border border-white/20 rounded-xl px-3 py-1.5 text-xs text-white placeholder:text-slate-400 focus:outline-none focus:border-emerald-400"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] text-slate-300 mb-1">الرقم المرجعي للحوالة (اختياري)</label>
                      <input
                        type="text"
                        placeholder="رقم مرجع الحوالة"
                        value={transferRefNumber}
                        onChange={(e) => setTransferRefNumber(e.target.value)}
                        className="w-full bg-white/10 border border-white/20 rounded-xl px-3 py-1.5 text-xs text-white placeholder:text-slate-400 font-mono focus:outline-none focus:border-emerald-400"
                      />
                    </div>
                  </div>

                </div>
              )}

              {/* Summary Card */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2 text-slate-700">
                <div className="font-black text-slate-900 text-xs">ملخص بيانات المدرسة الجاهزة للإنشاء:</div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                  <div>المدرسة: <strong className="text-slate-900">{schoolName || 'مدرسة جديدة'}</strong></div>
                  <div>الكود: <strong className="font-mono text-emerald-800">{schoolCode || 'تلقائي'}</strong></div>
                  <div>المدينة: <strong>{city}</strong></div>
                  <div>نطاق السياج: <strong>{radius}م</strong></div>
                  <div>الطابور: <strong>{timings.tabour}</strong></div>
                  <div>الحصة 1: <strong>{timings.firstPeriod}</strong></div>
                  <div>الانصراف: <strong>{timings.dismissal}</strong></div>
                  <div>المساعدين: <strong>{assistants.length}</strong></div>
                </div>
              </div>

            </div>
          )}

        </div>

        {/* Modal Footer Controls */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex items-center justify-between">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => setStep((s) => (s - 1) as any)}
              className="px-4 py-2 rounded-xl bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold text-xs transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <ChevronRight className="w-4 h-4" />
              <span>الخطوة السابقة</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-500 hover:text-slate-800 font-bold text-xs transition-colors cursor-pointer"
            >
              إلغاء
            </button>
          )}

          {step < 5 ? (
            <button
              type="button"
              onClick={() => setStep((s) => (s + 1) as any)}
              className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
            >
              <span>متابعة للخطوة التالية</span>
              <ChevronLeft className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleCompleteCreation}
              className="px-8 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs transition-all shadow-md cursor-pointer flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>اعتماد وإنشاء المدرسة وتفعيل الترخيص فوراً</span>
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
