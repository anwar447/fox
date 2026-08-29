import React, { useState } from 'react';
import { School, User, SubscriptionPlan } from '../types';
import { 
  ShieldCheck, 
  Building2, 
  Search, 
  Power, 
  Calendar, 
  RefreshCw, 
  CreditCard, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Layers, 
  Sparkles,
  ArrowUpRight,
  Filter,
  Check
} from 'lucide-react';
import { triggerNotification } from '../utils/notifications';

interface SuperAdminPortalProps {
  schools: School[];
  users: User[];
  onSaveSchool: (school: School) => void;
  onDeleteSchool: (schoolId: string) => void;
  onToggleSuspendSchool: (schoolId: string) => void;
}

export const SuperAdminPortal: React.FC<SuperAdminPortalProps> = ({
  schools,
  users,
  onSaveSchool,
  onDeleteSchool,
  onToggleSuspendSchool,
}) => {
  const [searchSchool, setSearchSchool] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'expiring' | 'suspended'>('all');
  const [renewalSuccessToast, setRenewalSuccessToast] = useState<string | null>(null);

  const today = new Date();

  // Helper to calculate days remaining
  const getDaysRemaining = (expiryDateStr?: string) => {
    if (!expiryDateStr) return 0;
    const expiry = new Date(expiryDateStr);
    const diffTime = expiry.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  // Stats calculation
  const totalStudents = users.filter((u) => u.role === 'student').length;
  const activeSchoolsCount = schools.filter((s) => !s.isSuspended && getDaysRemaining(s.subscriptionExpiryDate) > 0).length;
  const suspendedSchoolsCount = schools.filter((s) => s.isSuspended).length;
  const expiringSoonCount = schools.filter((s) => {
    const days = getDaysRemaining(s.subscriptionExpiryDate);
    return !s.isSuspended && days > 0 && days <= 30;
  }).length;

  const handleRenewSubscription = (school: School, daysToAdd: number, planLabel: string) => {
    const currentExpiry = new Date(school.subscriptionExpiryDate || new Date());
    const baseDate = currentExpiry > today ? currentExpiry : today;
    const newExpiry = new Date(baseDate.getTime() + daysToAdd * 24 * 60 * 60 * 1000);
    const newExpiryStr = newExpiry.toISOString().split('T')[0];

    const updatedSchool: School = {
      ...school,
      subscriptionExpiryDate: newExpiryStr,
      isSuspended: false,
    };

    onSaveSchool(updatedSchool);
    
    triggerNotification(
      `تم تجديد اشتراك مدرسة (${school.name})`,
      `تم تمديد الترخيص بمقدار ${planLabel} حتى تاريخ ${newExpiryStr} بنجاح.`,
      'subscription',
      school.code,
      'all'
    );

    setRenewalSuccessToast(`تم تمديد ترخيص (${school.name}) حتى ${newExpiryStr} بنجاح ✓`);
    setTimeout(() => setRenewalSuccessToast(null), 4000);
  };

  const handleChangePlan = (school: School, newPlan: SubscriptionPlan) => {
    const maxStudents = newPlan === 'gold' ? 1000 : newPlan === 'silver' ? 600 : 250;
    const updated: School = {
      ...school,
      subscriptionPlan: newPlan,
      maxStudents: maxStudents,
    };
    onSaveSchool(updated);
    setRenewalSuccessToast(`تم تحديث باقة (${school.name}) إلى الباقة ${newPlan.toUpperCase()} ✓`);
    setTimeout(() => setRenewalSuccessToast(null), 3000);
  };

  const filteredSchools = schools.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(searchSchool.toLowerCase()) ||
      s.code.toLowerCase().includes(searchSchool.toLowerCase()) ||
      s.city.toLowerCase().includes(searchSchool.toLowerCase()) ||
      s.managerName.toLowerCase().includes(searchSchool.toLowerCase());

    const days = getDaysRemaining(s.subscriptionExpiryDate);
    if (!matchesSearch) return false;

    if (filterStatus === 'active') return !s.isSuspended && days > 0;
    if (filterStatus === 'suspended') return s.isSuspended;
    if (filterStatus === 'expiring') return !s.isSuspended && days > 0 && days <= 30;
    return true;
  });

  return (
    <div className="space-y-6 animate-fadeIn pb-16 text-slate-800">
      
      {/* Top Banner (Owner License Dashboard) */}
      <div className="bg-gradient-to-br from-purple-950 via-slate-900 to-slate-950 rounded-3xl p-6 sm:p-8 text-white shadow-2xl space-y-4 border border-purple-500/30">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/20 border border-purple-400/30 text-purple-300 text-xs font-black">
              <ShieldCheck className="w-4 h-4" />
              <span>لوحة تحكم المالك - إدارة التراخيص والاشتراكات المدرسية</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black">
              المتابعة المركزية لاشتراكات وتراخيص المدارس
            </h1>
            <p className="text-xs text-purple-200">
              تجديد الاشتراكات، ترقية الباقات، تفعيل وإيقاف التراخيص فورياً لكافة المدارس المشتركة
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => {
                localStorage.clear();
                window.location.href = window.location.pathname;
              }}
              className="p-2.5 rounded-2xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-400/30 text-rose-200 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
              title="تفريغ ذاكرة المتصفح وبدء المنظومة نظيفة للمدارس الحقيقية فقط"
            >
              <RefreshCw className="w-3.5 h-3.5 text-rose-400" />
              <span>تفريغ الذاكرة القديمة 🗑️</span>
            </button>
            <div className="p-3 rounded-2xl bg-white/10 border border-white/15 text-center min-w-[90px]">
              <span className="text-[10px] text-purple-300 block">إجمالي المدارس</span>
              <strong className="text-lg font-black text-white">{schools.length}</strong>
            </div>
            <div className="p-3 rounded-2xl bg-white/10 border border-white/15 text-center min-w-[90px]">
              <span className="text-[10px] text-emerald-300 block">التراخيص النشطة</span>
              <strong className="text-lg font-black text-emerald-400">{activeSchoolsCount}</strong>
            </div>
            <div className="p-3 rounded-2xl bg-white/10 border border-white/15 text-center min-w-[90px]">
              <span className="text-[10px] text-amber-300 block">تنتهي قريباً</span>
              <strong className="text-lg font-black text-amber-400">{expiringSoonCount}</strong>
            </div>
            <div className="p-3 rounded-2xl bg-white/10 border border-white/15 text-center min-w-[90px]">
              <span className="text-[10px] text-rose-300 block">الموقوفة</span>
              <strong className="text-lg font-black text-rose-400">{suspendedSchoolsCount}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Toast Alert */}
      {renewalSuccessToast && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-black flex items-center gap-2 shadow-md animate-fadeIn">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{renewalSuccessToast}</span>
        </div>
      )}

      {/* Main License Manager Container */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-6">
        
        {/* Search & Filters Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-purple-600" />
              <span>قائمة المدارس وتفاصيل التراخيص ({filteredSchools.length})</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              إدارة تواريخ الانتهاء، التجديد بضغطة زر، وإيقاف أو إعادة تفعيل الخدمة
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            
            {/* Filter Tabs */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-bold">
              <button
                onClick={() => setFilterStatus('all')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  filterStatus === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                الكل ({schools.length})
              </button>
              <button
                onClick={() => setFilterStatus('active')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  filterStatus === 'active' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-600 hover:text-emerald-700'
                }`}
              >
                النشطة ({activeSchoolsCount})
              </button>
              <button
                onClick={() => setFilterStatus('expiring')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  filterStatus === 'expiring' ? 'bg-white text-amber-700 shadow-xs' : 'text-slate-600 hover:text-amber-700'
                }`}
              >
                تنتهي قريباً ({expiringSoonCount})
              </button>
              <button
                onClick={() => setFilterStatus('suspended')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  filterStatus === 'suspended' ? 'bg-white text-rose-700 shadow-xs' : 'text-slate-600 hover:text-rose-700'
                }`}
              >
                الموقوفة ({suspendedSchoolsCount})
              </button>
            </div>

            {/* Search Box */}
            <div className="relative w-full sm:w-60">
              <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="بحث بالمدرسة، الكود، المدينة..."
                value={searchSchool}
                onChange={(e) => setSearchSchool(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl pr-9 pl-3 py-2 text-xs font-semibold focus:bg-white focus:outline-hidden"
              />
            </div>

          </div>
        </div>

        {/* Schools Cards List */}
        <div className="space-y-4">
          {filteredSchools.length === 0 ? (
            <div className="text-center py-16 px-6 bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl space-y-3">
              <Building2 className="w-12 h-12 text-slate-400 mx-auto" />
              <h3 className="text-base font-black text-slate-800">لا توجد مدارس مسجلة حتى الآن</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                المنظومة في وضع الإنتاج الفعلي النظيف. ستظهر المدارس الجديدة فور قيام مديري المدارس بالتسجيل أو إنشائها.
              </p>
            </div>
          ) : (
            filteredSchools.map((school) => {
            const schStudents = users.filter((u) => u.role === 'student' && u.schoolCode === school.code).length;
            const schTeachers = users.filter((u) => u.role === 'teacher' && u.schoolCode === school.code).length;
            const daysRemaining = getDaysRemaining(school.subscriptionExpiryDate);
            const isExpired = daysRemaining <= 0;

            const planBadge = 
              school.subscriptionPlan === 'gold' ? { label: 'الباقة الذهبية', color: 'bg-amber-100 text-amber-900 border-amber-300' } :
              school.subscriptionPlan === 'silver' ? { label: 'الباقة الفضية', color: 'bg-slate-200 text-slate-800 border-slate-300' } :
              { label: 'الباقة التجريبية', color: 'bg-blue-100 text-blue-900 border-blue-300' };

            return (
              <div
                key={school.id}
                className={`p-5 rounded-2xl border transition-all ${
                  school.isSuspended
                    ? 'bg-rose-50/40 border-rose-200'
                    : isExpired
                    ? 'bg-amber-50/40 border-amber-200'
                    : 'bg-white border-slate-200 hover:border-purple-300 shadow-2xs'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 text-xs">
                  
                  {/* School Main Details */}
                  <div className="space-y-2 max-w-xl">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-black text-slate-900 text-sm sm:text-base">{school.name}</span>
                      <span className="px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-900 font-mono font-bold text-xs">
                        {school.code}
                      </span>
                      
                      {/* Subscription Status Badge */}
                      {school.isSuspended ? (
                        <span className="px-2.5 py-0.5 rounded-full bg-rose-600 text-white font-bold text-[10px]">
                          الترخيص موقوف ✗
                        </span>
                      ) : isExpired ? (
                        <span className="px-2.5 py-0.5 rounded-full bg-amber-600 text-white font-bold text-[10px]">
                          الاشتراك منتهي !
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                          الترخيص ساري ومفعّل ✓
                        </span>
                      )}

                      {/* Plan Badge */}
                      <span className={`px-2.5 py-0.5 rounded-full border font-bold text-[10px] ${planBadge.color}`}>
                        {planBadge.label}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-slate-500 text-[11px]">
                      <span>المدينة: <strong className="text-slate-800">{school.city}</strong></span>
                      <span>المدير: <strong className="text-slate-800">{school.managerName}</strong></span>
                      <span>الطلاب: <strong className="text-slate-800">{schStudents} / {school.maxStudents || 500}</strong></span>
                      <span>المعلمون: <strong className="text-slate-800">{schTeachers}</strong></span>
                      <span>الهاتف: <strong className="font-mono text-slate-800">{school.contact}</strong></span>
                    </div>

                    {/* Subscription Expiry Timeline Info */}
                    <div className="flex items-center gap-2 text-[11px] pt-1">
                      <span className="text-slate-500 flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-purple-600" />
                        <span>تاريخ انتهاء الترخيص:</span>
                        <strong className="font-mono font-bold text-slate-900">
                          {school.subscriptionExpiryDate || '2026-12-31'}
                        </strong>
                      </span>

                      {!school.isSuspended && (
                        <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                          daysRemaining <= 0
                            ? 'bg-rose-100 text-rose-800'
                            : daysRemaining <= 30
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}>
                          {daysRemaining <= 0 ? 'منتهي الصلاحية' : `متبقي ${daysRemaining} يوماً`}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions: Quick Renewals & Suspend Toggle */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100">
                    
                    {/* Quick Plan Selector */}
                    <select
                      value={school.subscriptionPlan || 'silver'}
                      onChange={(e) => handleChangePlan(school, e.target.value as SubscriptionPlan)}
                      className="bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-1.5 text-[11px] font-bold text-slate-800 cursor-pointer"
                      title="تغيير باقة الاشتراك"
                    >
                      <option value="free_trial">باقة تجريبية</option>
                      <option value="silver">باقة فضية</option>
                      <option value="gold">باقة ذهبية</option>
                      <option value="free_forever">مجاني مدى الحياة ★</option>
                    </select>

                    {/* Quick Renewal Buttons */}
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleRenewSubscription(school, 30, '+شهر واحد')}
                        className="px-2.5 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-800 font-bold text-[11px] border border-purple-200 transition-colors cursor-pointer"
                        title="تمديد الاشتراك شهراً إضافياً"
                      >
                        + شهر
                      </button>

                      <button
                        onClick={() => handleRenewSubscription(school, 120, '+فصل دراسي')}
                        className="px-2.5 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-800 font-bold text-[11px] border border-purple-200 transition-colors cursor-pointer"
                        title="تمديد الاشتراك فصلاً كاملاً"
                      >
                        + فصل
                      </button>

                      <button
                        onClick={() => handleRenewSubscription(school, 365, '+سنة كاملة')}
                        className="px-3 py-1.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-[11px] transition-all shadow-2xs cursor-pointer flex items-center gap-1"
                        title="تمديد الاشتراك سنة كاملة"
                      >
                        <RefreshCw className="w-3 h-3" />
                        <span>+ سنة</span>
                      </button>

                      <button
                        onClick={() => {
                          const updated: School = {
                            ...school,
                            subscriptionPlan: 'free_forever',
                            subscriptionExpiryDate: '2099-12-31',
                            isSuspended: false,
                          };
                          onSaveSchool(updated);
                          setRenewalSuccessToast(`تم اعتماد باقة (مجاني مدى الحياة ★) لمدرسة ${school.name}`);
                          setTimeout(() => setRenewalSuccessToast(null), 4000);
                        }}
                        className="px-2.5 py-1.5 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold text-[11px] border border-amber-300 transition-colors cursor-pointer"
                        title="منح ترخيص مجاني دائم مدى الحياة"
                      >
                        ★ مجاني دائم
                      </button>
                    </div>

                    {/* Suspend / Resume Button */}
                    <button
                      onClick={() => onToggleSuspendSchool(school.id)}
                      className={`px-3 py-1.5 rounded-xl font-bold text-[11px] transition-all cursor-pointer flex items-center gap-1.5 ${
                        school.isSuspended
                          ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                          : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200'
                      }`}
                    >
                      <Power className="w-3.5 h-3.5" />
                      <span>{school.isSuspended ? 'إعادة تفعيل الترخيص' : 'إيقاف مؤقت'}</span>
                    </button>

                  </div>

                </div>
              </div>
            );
          }))}
        </div>

      </div>

    </div>
  );
};
