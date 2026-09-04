import React, { useState } from 'react';
import { School, User, Attendance, SubscriptionPaymentRequest } from '../types';
import { 
  getSchools, saveSchools, getPaymentRequests, 
  savePaymentRequests, updateSchool, deleteSchool,
  resetAllDataToSeed, getUsers, getAttendances, syncDataFromServer
} from '../utils/storage';
import { 
  Crown, Building2, CreditCard, Check, X, 
  Sparkles, ShieldCheck, Search, Plus, Calendar, AlertCircle,
  PauseCircle, PlayCircle, Trash2, Edit3, ShieldAlert, CheckCircle,
  Clock, RefreshCw, Phone, MapPin, Users, UserCheck, ExternalLink,
  Copy, Share2, Layers, School as SchoolIcon, ArrowRight, Code2
} from 'lucide-react';

interface SuperAdminPortalProps {
  currentUser: User;
  schools: School[];
  users: User[];
  attendances: Attendance[];
  onRefresh: () => void;
  onOpenCreateSchool: () => void;
  onImpersonateSchool?: (school: School) => void;
  onOpenApiIntegration?: (school: School) => void;
}

export const SuperAdminPortal: React.FC<SuperAdminPortalProps> = ({
  currentUser,
  schools,
  users,
  attendances,
  onRefresh,
  onOpenCreateSchool,
  onImpersonateSchool,
  onOpenApiIntegration,
}) => {
  const [payments, setPayments] = useState<SubscriptionPaymentRequest[]>(getPaymentRequests());
  const [search, setSearch] = useState('');
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'warning' | 'info'; text: string } | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  
  // State for delete confirmation modal
  const [schoolToDelete, setSchoolToDelete] = useState<School | null>(null);
  // State for wipe all confirmation modal
  const [isWipeAllOpen, setIsWipeAllOpen] = useState(false);
  // State for editing school basic info
  const [editingSchool, setEditingSchool] = useState<School | null>(null);

  const calculateFutureDate = (months: number): string => {
    const d = new Date();
    d.setMonth(d.getMonth() + months);
    return d.toISOString().split('T')[0];
  };

  const copyToClipboard = (text: string, label: string, code: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(code);
    setStatusMsg({
      type: 'success',
      text: `✅ تم نسخ ${label} إلى الحافظة بنجاح!`
    });
    setTimeout(() => setCopiedCode(null), 3000);
  };

  const handleUpdateSchoolSubscription = (
    school: School,
    plan: 'free_forever' | 'yearly' | 'semester',
    status: 'active' | 'pending_payment' = 'active'
  ) => {
    let endDate = school.subscriptionEndDate;
    if (plan === 'free_forever') {
      endDate = '2099-12-31';
    } else if (plan === 'yearly') {
      endDate = calculateFutureDate(12);
    } else if (plan === 'semester') {
      endDate = calculateFutureDate(6);
    }

    const updated: School = {
      ...school,
      subscriptionPlan: plan,
      subscriptionStatus: status,
      subscriptionEndDate: endDate,
      isQuranSchool: plan === 'free_forever',
    };

    updateSchool(updated);
    onRefresh();

    const planLabel = 
      plan === 'free_forever' ? 'اشتراك مجاني دائم' :
      plan === 'yearly' ? 'اشتراك سنوي (1 سنة)' : 'اشتراك نصف سنوي (فصلي)';

    setStatusMsg({
      type: 'success',
      text: `✅ تم تحديث اشتراك مدرسة (${school.name}) إلى: [${planLabel}] والحالة: [${status === 'active' ? 'نشط' : 'موقوف مؤقتاً حتى السداد'}].`
    });
  };

  const handleTogglePauseSubscription = (school: School) => {
    const newStatus: 'active' | 'pending_payment' = school.subscriptionStatus === 'pending_payment' ? 'active' : 'pending_payment';
    const updated: School = {
      ...school,
      subscriptionStatus: newStatus,
    };
    updateSchool(updated);
    onRefresh();

    if (newStatus === 'pending_payment') {
      setStatusMsg({
        type: 'warning',
        text: `⚠️ تم إيقاف مدرسة (${school.name}) مؤقتاً حتى السداد.`
      });
    } else {
      setStatusMsg({
        type: 'success',
        text: `✅ تم إعادة تنشيط وتفعيل حساب مدرسة (${school.name}) بنجاح.`
      });
    }
  };

  const handleDeleteSchool = (school: School) => {
    deleteSchool(school.id || school.code);
    onRefresh();
    setSchoolToDelete(null);
    setStatusMsg({
      type: 'info',
      text: `🗑️ تم حذف مدرسة (${school.name}) وكودها (${school.code}) من المنظومة بنجاح.`
    });
  };

  const handleSaveSchoolEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSchool) return;
    updateSchool(editingSchool);
    onRefresh();
    setEditingSchool(null);
    setStatusMsg({
      type: 'success',
      text: `✅ تم حفظ وتحديث بيانات مدرسة (${editingSchool.name}) بنجاح.`
    });
  };

  const handleWipeAll = async () => {
    await resetAllDataToSeed();
  };

  const handleApprovePayment = (req: SubscriptionPaymentRequest) => {
    const updatedPayments = payments.map((p) =>
      p.id === req.id ? { ...p, status: 'approved' as const } : p
    );
    setPayments(updatedPayments);
    savePaymentRequests(updatedPayments);

    const school = schools.find((s) => s.code === req.schoolCode);
    if (school) {
      const monthsToAdd = req.plan === 'yearly' ? 12 : 6;
      const updatedSchool: School = {
        ...school,
        subscriptionStatus: 'active',
        subscriptionPlan: req.plan,
        subscriptionEndDate: calculateFutureDate(monthsToAdd),
      };
      updateSchool(updatedSchool);
      onRefresh();
    }

    setStatusMsg({
      type: 'success',
      text: `✅ تم اعتماد الحوالة البنكية وتفعيل اشتراك مدرسة (${req.schoolName}) بنجاح.`
    });
  };

  const handleRejectPayment = (req: SubscriptionPaymentRequest) => {
    const updatedPayments = payments.map((p) =>
      p.id === req.id ? { ...p, status: 'rejected' as const } : p
    );
    setPayments(updatedPayments);
    savePaymentRequests(updatedPayments);
    setStatusMsg({
      type: 'warning',
      text: `❌ تم رفض الحوالة للمدرسة (${req.schoolName}).`
    });
  };

  const filteredSchools = schools.filter(
    (s) => s.name?.includes(search) || s.code?.includes(search) || s.city?.includes(search)
  );

  const totalStudents = users.filter((u) => u.role === 'student').length;
  const totalTeachers = users.filter((u) => u.role === 'teacher').length;
  const totalEmployees = users.filter((u) => u.role === 'employee').length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto py-6 px-4 text-slate-800" dir="rtl">
      {/* Top Banner */}
      <div className="bg-gradient-to-l from-slate-900 via-slate-850 to-slate-900 text-white rounded-3xl p-6 sm:p-7 flex flex-wrap items-center justify-between gap-4 shadow-xl border border-slate-800">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-400/30 flex items-center justify-center shadow-lg shadow-amber-500/10 shrink-0">
            <Crown className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-0.5 rounded-full bg-amber-400/20 text-amber-300 text-[11px] font-black border border-amber-400/30">
                لوحة تحكم المشرف العام (Super Admin)
              </span>
              <span className="text-slate-400 text-xs font-mono">
                {schools.length} مدارس مسجلة
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white mt-1">
              التحكم الشامل بالمدارس والتراخيص والإشراف
            </h2>
            <p className="text-xs text-slate-400 font-medium max-w-2xl">
              يمكنك إدارة أي مدرسة كمدير بنقرة واحدة، تعديل الاشتراكات، إنشاء مدارس جديدة، أو تصفير المنظومة.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => {
              syncDataFromServer().then(() => onRefresh());
              setStatusMsg({ type: 'success', text: '🔄 تم تحديث ومزامنة البيانات من السيرفر بنجاح!' });
            }}
            className="py-2.5 px-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all"
            title="تحديث البيانات من السيرفر"
          >
            <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
            <span>مزامنة فورية</span>
          </button>

          <button
            onClick={onOpenCreateSchool}
            className="py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-600/30 cursor-pointer transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة مدرسة جديدة 🚀</span>
          </button>

          <button
            onClick={() => setIsWipeAllOpen(true)}
            className="py-2.5 px-3 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 font-bold text-xs flex items-center gap-1 cursor-pointer transition-all"
            title="حذف وتصفير جميع المدارس والبيانات الحالية"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>تصفير وحذف جميع المدارس</span>
          </button>
        </div>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold mb-1">
            <span>إجمالي المدارس</span>
            <Building2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono">{schools.length}</div>
          <div className="text-[10px] text-emerald-700 font-medium mt-0.5">
            {schools.filter(s => s.subscriptionStatus === 'active').length} نشطة ومفعلة
          </div>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold mb-1">
            <span>إجمالي الطلاب</span>
            <Users className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono">{totalStudents}</div>
          <div className="text-[10px] text-blue-700 font-medium mt-0.5">في جميع المدارس</div>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold mb-1">
            <span>المعلمون والإداريون</span>
            <UserCheck className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono">{totalTeachers + totalEmployees}</div>
          <div className="text-[10px] text-indigo-700 font-medium mt-0.5">{totalTeachers} معلم / {totalEmployees} مدير</div>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold mb-1">
            <span>طلبات السداد المعلقة</span>
            <CreditCard className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-black text-amber-700 font-mono">
            {payments.filter(p => p.status === 'pending').length}
          </div>
          <div className="text-[10px] text-amber-800 font-medium mt-0.5">حوالات بنكية تنتظر الاعتماد</div>
        </div>
      </div>

      {statusMsg && (
        <div className={`p-4 rounded-2xl text-xs font-bold shadow-xs border flex items-center justify-between animate-fadeIn ${
          statusMsg.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-900' :
          statusMsg.type === 'warning' ? 'bg-amber-50 border-amber-200 text-amber-900' :
          'bg-slate-100 border-slate-200 text-slate-800'
        }`}>
          <span>{statusMsg.text}</span>
          <button onClick={() => setStatusMsg(null)} className="text-slate-400 hover:text-slate-700 font-bold px-2 cursor-pointer">
            ✕
          </button>
        </div>
      )}

      {/* Pending Payment Requests */}
      {payments.some(p => p.status === 'pending') && (
        <div className="bg-white border border-amber-200 rounded-3xl p-6 space-y-4 shadow-sm bg-gradient-to-br from-white to-amber-50/30">
          <div className="flex items-center justify-between border-b border-amber-100 pb-3">
            <div className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-amber-600" />
              <h3 className="font-black text-base text-slate-900">
                طلبات سداد الاشتراكات المعلقة ({payments.filter((p) => p.status === 'pending').length})
              </h3>
            </div>
            <span className="text-xs text-amber-800 font-bold bg-amber-100 px-2.5 py-1 rounded-xl">
              تتطلب اعتماد المشرف
            </span>
          </div>

          <div className="space-y-2.5">
            {payments.filter(p => p.status === 'pending').map((p) => (
              <div
                key={p.id}
                className="bg-white border border-amber-200/90 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 text-xs shadow-2xs"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <strong className="text-slate-900 text-sm">{p.schoolName}</strong>
                    <span className="font-mono text-slate-500 text-[11px]">({p.schoolCode})</span>
                    <span className="text-[10px] bg-amber-100 text-amber-900 px-2 py-0.5 rounded-md font-bold">
                      {p.plan === 'yearly' ? 'اشتراك سنوي (12 شهر)' : 'اشتراك فصلي (6 أشهر)'}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-600 mt-1.5 flex flex-wrap gap-x-4 gap-y-1">
                    <span>المحول: <strong className="text-slate-900">{p.senderName}</strong></span>
                    <span>البنك: <strong className="text-slate-900">{p.senderBank}</strong></span>
                    <span>المرجع: <strong className="font-mono text-slate-900">{p.referenceNumber}</strong></span>
                    <span>المبلغ: <strong className="font-mono text-emerald-700 font-bold">{p.amount} ريال</strong></span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleRejectPayment(p)}
                    className="px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold cursor-pointer transition-colors"
                  >
                    رفض الحوالة
                  </button>
                  <button
                    onClick={() => handleApprovePayment(p)}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center gap-1.5 cursor-pointer shadow-sm transition-colors"
                  >
                    <Check className="w-4 h-4" />
                    <span>اعتماد وتفعيل المدرسة 🚀</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Schools Directory & Super Admin Direct Management */}
      <div className="bg-white border border-slate-200/90 rounded-3xl p-6 space-y-5 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-emerald-600" />
            <h3 className="font-black text-base text-slate-900">
              قائمة المدارس والتحكم المباشر ({schools.length})
            </h3>
          </div>
          <div className="w-full sm:w-80">
            <div className="relative">
              <input
                type="text"
                placeholder="بحث باسم المدرسة، الكود، أو المدينة..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pr-9 pl-3 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-emerald-500 font-medium"
              />
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
            </div>
          </div>
        </div>

        {schools.length === 0 ? (
          <div className="p-8 text-center bg-slate-50 border border-dashed border-slate-300 rounded-3xl space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center mx-auto border border-emerald-200">
              <Building2 className="w-7 h-7" />
            </div>
            <h4 className="font-black text-slate-900 text-sm">لا توجد أي مدارس مسجلة حالياً</h4>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              تم تصفير النظام بنجاح. يمكنك الآن إضافة أول مدرسة بالضغط على زر "إضافة مدرسة جديدة" بالأعلى.
            </p>
            <button
              onClick={onOpenCreateSchool}
              className="py-2.5 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs inline-flex items-center gap-2 shadow-sm cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة مدرسة جديدة الآن</span>
            </button>
          </div>
        ) : filteredSchools.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-400 bg-slate-50 rounded-2xl">
            لا توجد مدارس مطابقة لبحثك "{search}".
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 text-xs">
            {filteredSchools.map((sch) => {
              const isSuspended = sch.subscriptionStatus === 'pending_payment';
              const isFree = sch.subscriptionPlan === 'free_forever';
              const isYearly = sch.subscriptionPlan === 'yearly';
              const isSemester = sch.subscriptionPlan === 'semester';

              const schoolStudents = users.filter((u) => u.schoolCode === sch.code && u.role === 'student');
              const schoolTeachers = users.filter((u) => u.schoolCode === sch.code && u.role === 'teacher');
              const schoolAdmin = users.find((u) => u.schoolCode === sch.code && u.role === 'employee');

              const studentLink = `${window.location.origin}/?joinSchool=${encodeURIComponent(sch.code)}`;
              const staffLink = `${window.location.origin}/?joinStaff=${encodeURIComponent(sch.code)}`;

              return (
                <div 
                  key={sch.id || sch.code} 
                  className={`rounded-3xl p-5 space-y-4 border transition-all ${
                    isSuspended 
                      ? 'bg-rose-50/40 border-rose-300 ring-1 ring-rose-200' 
                      : 'bg-slate-50/80 border-slate-200/90 hover:border-slate-300 shadow-2xs'
                  }`}
                >
                  {/* Header info */}
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-black text-slate-900 text-base">{sch.name}</h4>
                        {isSuspended && (
                          <span className="px-2 py-0.5 rounded-md bg-rose-600 text-white text-[10px] font-black">
                            موقوفة مؤقتاً ⚠️
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-slate-700">📍 {sch.city}</span>
                        <span>•</span>
                        <span>المرحلة: <strong className="text-slate-800 font-bold">
                          {sch.type === 'elementary' ? 'ابتدائية' : sch.type === 'secondary' ? 'ثانوية' : sch.type === 'quran' ? 'تحفيظ قرآن' : 'متوسطة'}
                        </strong></span>
                        <span>•</span>
                        <span>كود المدرسة: <strong className="font-mono text-emerald-700 font-black bg-emerald-50 px-1.5 py-0.5 rounded-md border border-emerald-200">{sch.code}</strong></span>
                      </div>
                    </div>

                    {/* Plan badge */}
                    <span className={`px-3 py-1 rounded-xl text-[11px] font-black shrink-0 ${
                      isFree 
                        ? 'bg-purple-100 text-purple-900 border border-purple-200' 
                        : isYearly 
                        ? 'bg-emerald-100 text-emerald-900 border border-emerald-200' 
                        : 'bg-blue-100 text-blue-900 border border-blue-200'
                    }`}>
                      {isFree ? '🌟 مجاني دائم' : isYearly ? '👑 اشتراك سنوي' : '📅 اشتراك نصف سنوي'}
                    </span>
                  </div>

                  {/* School Metrics */}
                  <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 text-[11px] grid grid-cols-3 gap-2 text-center">
                    <div className="p-1.5 bg-slate-50 rounded-xl">
                      <span className="text-slate-400 block text-[10px] font-bold">الطلاب المسجلون</span>
                      <strong className="text-slate-900 font-black text-sm font-mono">{schoolStudents.length}</strong>
                    </div>
                    <div className="p-1.5 bg-slate-50 rounded-xl">
                      <span className="text-slate-400 block text-[10px] font-bold">الكادر التعليمي</span>
                      <strong className="text-slate-900 font-black text-sm font-mono">{schoolTeachers.length}</strong>
                    </div>
                    <div className="p-1.5 bg-slate-50 rounded-xl">
                      <span className="text-slate-400 block text-[10px] font-bold">السياج الجغرافي</span>
                      <strong className="text-indigo-700 font-black text-sm font-mono">{sch.radiusMeters} م</strong>
                    </div>
                  </div>

                  {/* Direct Impersonation / Quick Management Action */}
                  <div className="bg-emerald-50/60 border border-emerald-200/80 rounded-2xl p-3 flex items-center justify-between gap-3">
                    <div>
                      <span className="text-xs font-black text-emerald-950 block">الإدارة المباشرة للمدرسة</span>
                      <span className="text-[10px] text-emerald-700">
                        {schoolAdmin ? `المدير: ${schoolAdmin.name} (${schoolAdmin.nationalId})` : 'تحكم كمدير للمدرسة'}
                      </span>
                    </div>

                    {onImpersonateSchool && (
                      <button
                        onClick={() => onImpersonateSchool(sch)}
                        className="py-2 px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs flex items-center gap-1.5 shadow-sm cursor-pointer transition-all shrink-0"
                      >
                        <span>دخول وإدارة المدرسة كمدير ⚡</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Quick Share Links */}
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <button
                      onClick={() => copyToClipboard(studentLink, 'رابط تسجيل الطلاب', `${sch.code}-student`)}
                      className={`p-2 rounded-xl border flex items-center justify-center gap-1.5 font-bold cursor-pointer transition-all ${
                        copiedCode === `${sch.code}-student`
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                          : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                      }`}
                      title={studentLink}
                    >
                      <Copy className="w-3.5 h-3.5 text-slate-500" />
                      <span>{copiedCode === `${sch.code}-student` ? 'تم نسخ رابط الطلاب! ✓' : 'نسخ رابط الطلاب'}</span>
                    </button>

                    <button
                      onClick={() => copyToClipboard(staffLink, 'رابط تسجيل المعلمين', `${sch.code}-staff`)}
                      className={`p-2 rounded-xl border flex items-center justify-center gap-1.5 font-bold cursor-pointer transition-all ${
                        copiedCode === `${sch.code}-staff`
                          ? 'bg-indigo-100 text-indigo-800 border-indigo-300'
                          : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                      }`}
                      title={staffLink}
                    >
                      <Share2 className="w-3.5 h-3.5 text-slate-500" />
                      <span>{copiedCode === `${sch.code}-staff` ? 'تم نسخ رابط المعلمين! ✓' : 'نسخ رابط المعلمين'}</span>
                    </button>
                  </div>

                  {/* Super Admin Control Actions Bar */}
                  <div className="pt-2 border-t border-slate-200/80 space-y-2">
                    <div className="flex items-center justify-between text-[11px] font-black text-slate-700">
                      <div className="flex items-center gap-1.5">
                        <Crown className="w-3.5 h-3.5 text-amber-600" />
                        <span>التحكم في اشتراك المدرسة:</span>
                      </div>
                      <button
                        onClick={() => setEditingSchool(sch)}
                        className="text-slate-500 hover:text-slate-800 font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                      >
                        <Edit3 className="w-3 h-3" />
                        <span>تعديل البيانات</span>
                      </button>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                      {/* Free Plan Button */}
                      <button
                        onClick={() => handleUpdateSchoolSubscription(sch, 'free_forever', 'active')}
                        className={`px-2.5 py-1.5 rounded-xl font-bold text-[11px] cursor-pointer transition-colors ${
                          isFree && !isSuspended
                            ? 'bg-purple-700 text-white shadow-xs'
                            : 'bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-200'
                        }`}
                        title="تحويل إلى اشتراك مجاني دائم"
                      >
                        🌟 مجاني
                      </button>

                      {/* 1 Year Plan Button */}
                      <button
                        onClick={() => handleUpdateSchoolSubscription(sch, 'yearly', 'active')}
                        className={`px-2.5 py-1.5 rounded-xl font-bold text-[11px] cursor-pointer transition-colors ${
                          isYearly && !isSuspended
                            ? 'bg-emerald-700 text-white shadow-xs'
                            : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200'
                        }`}
                        title="تفعيل اشتراك لمدة سنة كاملة"
                      >
                        👑 سنة
                      </button>

                      {/* 6 Months Plan Button */}
                      <button
                        onClick={() => handleUpdateSchoolSubscription(sch, 'semester', 'active')}
                        className={`px-2.5 py-1.5 rounded-xl font-bold text-[11px] cursor-pointer transition-colors ${
                          isSemester && !isSuspended
                            ? 'bg-blue-700 text-white shadow-xs'
                            : 'bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-200'
                        }`}
                        title="تفعيل اشتراك لمدة نصف سنة (فصلي)"
                      >
                        📅 نصف سنة
                      </button>

                      {/* Pause / Resume Button */}
                      <button
                        onClick={() => handleTogglePauseSubscription(sch)}
                        className={`px-3 py-1.5 rounded-xl font-bold text-[11px] flex items-center gap-1 cursor-pointer transition-colors ${
                          isSuspended
                            ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs'
                            : 'bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300'
                        }`}
                        title={isSuspended ? 'إلغاء الإيقاف وإعادة التنشيط' : 'إيقاف المدرسة مؤقتاً حتى السداد'}
                      >
                        {isSuspended ? (
                          <>
                            <PlayCircle className="w-3.5 h-3.5" />
                            <span>تنشيط الحساب ▶️</span>
                          </>
                        ) : (
                          <>
                            <PauseCircle className="w-3.5 h-3.5" />
                            <span>إيقاف مؤقت ⏸️</span>
                          </>
                        )}
                      </button>

                      {/* Counselor API Integration Button */}
                      {onOpenApiIntegration && (
                        <button
                          onClick={() => onOpenApiIntegration(sch)}
                          className="px-2.5 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-200 font-bold text-[11px] flex items-center gap-1 cursor-pointer transition-colors"
                          title="توكن وربط API الموجه الطلابي"
                        >
                          <Code2 className="w-3.5 h-3.5 text-indigo-600" />
                          <span>API الموجه 🔌</span>
                        </button>
                      )}

                      {/* Delete School Button */}
                      <button
                        onClick={() => setSchoolToDelete(sch)}
                        className="p-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 mr-auto cursor-pointer transition-colors"
                        title="حذف المدرسة نهائياً"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Edit School Details Modal */}
      {editingSchool && (
        <div 
          onClick={(e) => { if (e.target === e.currentTarget) setEditingSchool(null); }}
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn"
          dir="rtl"
        >
          <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full p-6 text-right space-y-4 shadow-2xl text-slate-800">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-black text-base text-slate-900">تعديل بيانات المدرسة</h3>
              <button onClick={() => setEditingSchool(null)} className="p-1 text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSchoolEdit} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">اسم المدرسة *</label>
                <input
                  type="text"
                  required
                  value={editingSchool.name}
                  onChange={(e) => setEditingSchool({ ...editingSchool, name: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-bold focus:outline-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">كود المدرسة *</label>
                  <input
                    type="text"
                    required
                    value={editingSchool.code}
                    onChange={(e) => setEditingSchool({ ...editingSchool, code: e.target.value.toUpperCase() })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-mono font-bold focus:outline-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">المدينة *</label>
                  <input
                    type="text"
                    required
                    value={editingSchool.city}
                    onChange={(e) => setEditingSchool({ ...editingSchool, city: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">نصف قطر السياج (متر) *</label>
                  <input
                    type="number"
                    min="50"
                    max="2000"
                    required
                    value={editingSchool.radiusMeters}
                    onChange={(e) => setEditingSchool({ ...editingSchool, radiusMeters: parseInt(e.target.value, 10) || 300 })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-mono focus:outline-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">رقم جوال التواصل</label>
                  <input
                    type="text"
                    value={editingSchool.contactMobile || ''}
                    onChange={(e) => setEditingSchool({ ...editingSchool, contactMobile: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-mono focus:outline-emerald-500"
                  />
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingSchool(null)}
                  className="py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="py-2.5 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black cursor-pointer shadow-sm"
                >
                  حفظ التعديلات ✓
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete School Confirmation Modal */}
      {schoolToDelete && (
        <div 
          onClick={(e) => { if (e.target === e.currentTarget) setSchoolToDelete(null); }}
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn"
          dir="rtl"
        >
          <div className="bg-white border border-rose-200 rounded-3xl max-w-md w-full p-6 text-right space-y-4 shadow-2xl text-slate-800">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1.5">
              <h3 className="text-base font-black text-slate-900">
                حذف مدرسة ({schoolToDelete.name}) نهائياً؟
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                هل أنت متأكد من رغبتك في حذف مدرسة ({schoolToDelete.name}) ذات الكود ({schoolToDelete.code}) من النظام؟ هذا الإجراء لا يمكن التراجع عنه.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                onClick={() => setSchoolToDelete(null)}
                className="py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
              >
                إلغاء
              </button>
              <button
                onClick={() => handleDeleteSchool(schoolToDelete)}
                className="py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs cursor-pointer shadow-md shadow-rose-600/20"
              >
                تأكيد حذف المدرسة 🗑️
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Wipe All Schools Confirmation Modal */}
      {isWipeAllOpen && (
        <div 
          onClick={(e) => { if (e.target === e.currentTarget) setIsWipeAllOpen(false); }}
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn"
          dir="rtl"
        >
          <div className="bg-white border border-rose-200 rounded-3xl max-w-md w-full p-6 text-right space-y-4 shadow-2xl text-slate-800">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center mx-auto">
              <ShieldAlert className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1.5">
              <h3 className="text-base font-black text-slate-900">
                تصفير وحذف جميع المدارس والبيانات؟
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                سيتم حذف كافة المدارس المسجلة وحسابات الطلاب والمعلمين وسجلات الحضور والبدء بصفحة جديدة نظيفة تماماً للمشرف العام.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                onClick={() => setIsWipeAllOpen(false)}
                className="py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
              >
                إلغاء التصفير
              </button>
              <button
                onClick={handleWipeAll}
                className="py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs cursor-pointer shadow-md shadow-rose-600/20"
              >
                نعم، تصفير وحذف الكل 🗑️
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
