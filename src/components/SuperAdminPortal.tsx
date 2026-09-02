import React, { useState } from 'react';
import { School, User, SubscriptionPaymentRequest } from '../types';
import { 
  getSchools, saveSchools, getPaymentRequests, 
  savePaymentRequests, updateSchool, deleteSchool 
} from '../utils/storage';
import { 
  Crown, Building2, CreditCard, Check, X, 
  Sparkles, ShieldCheck, Search, Plus, Calendar, AlertCircle,
  PauseCircle, PlayCircle, Trash2, Edit3, ShieldAlert, CheckCircle,
  Clock, RefreshCw, Phone, MapPin
} from 'lucide-react';

interface SuperAdminPortalProps {
  currentUser: User;
  onOpenCreateSchool: () => void;
}

export const SuperAdminPortal: React.FC<SuperAdminPortalProps> = ({
  currentUser,
  onOpenCreateSchool,
}) => {
  const [schools, setSchools] = useState<School[]>(getSchools());
  const [payments, setPayments] = useState<SubscriptionPaymentRequest[]>(getPaymentRequests());
  const [search, setSearch] = useState('');
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'warning' | 'info'; text: string } | null>(null);
  
  // State for delete confirmation modal
  const [schoolToDelete, setSchoolToDelete] = useState<School | null>(null);
  // State for quick subscription change modal
  const [editingSchool, setEditingSchool] = useState<School | null>(null);

  const calculateFutureDate = (months: number): string => {
    const d = new Date();
    d.setMonth(d.getMonth() + months);
    return d.toISOString().split('T')[0];
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
    const refreshed = getSchools();
    setSchools(refreshed);

    const planLabel = 
      plan === 'free_forever' ? 'اشتراك مجاني دائم' :
      plan === 'yearly' ? 'اشتراك سنوي (1 سنة)' : 'اشتراك نصف سنوي (فصلي)';

    setStatusMsg({
      type: 'success',
      text: `✅ تم تحديث اشتراك مدرسة (${school.name}) إلى: [${planLabel}] والحالة: [${status === 'active' ? 'نشط' : 'موقوف مؤقتاً حتى السداد'}].`
    });

    if (editingSchool?.id === school.id) {
      setEditingSchool(null);
    }
  };

  const handleTogglePauseSubscription = (school: School) => {
    const newStatus: 'active' | 'pending_payment' = school.subscriptionStatus === 'pending_payment' ? 'active' : 'pending_payment';
    const updated: School = {
      ...school,
      subscriptionStatus: newStatus,
    };
    updateSchool(updated);
    setSchools(getSchools());

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
    deleteSchool(school.id);
    const refreshed = getSchools();
    setSchools(refreshed);
    setSchoolToDelete(null);
    setStatusMsg({
      type: 'info',
      text: `🗑️ تم حذف مدرسة (${school.name}) وكودها (${school.code}) من المنظومة بنجاح.`
    });
  };

  const handleApprovePayment = (req: SubscriptionPaymentRequest) => {
    // 1. Update payment status
    const updatedPayments = payments.map((p) =>
      p.id === req.id ? { ...p, status: 'approved' as const } : p
    );
    setPayments(updatedPayments);
    savePaymentRequests(updatedPayments);

    // 2. Extend school subscription
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
      setSchools(getSchools());
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
    (s) => s.name.includes(search) || s.code.includes(search) || s.city.includes(search)
  );

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
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white mt-1">
              إدارة التراخيص والاشتراكات والتحكم بالمدارس
            </h2>
            <p className="text-xs text-slate-400 font-medium">
              التحكم الكامل: تحويل الاشتراكات لمجاني، سنة، نصف سنة، إيقاف مؤقت حتى السداد، أو حذف المدرسة.
            </p>
          </div>
        </div>

        <button
          onClick={onOpenCreateSchool}
          className="py-3 px-5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs flex items-center gap-2 shadow-lg shadow-emerald-600/30 cursor-pointer transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>إضافة مدرسة جديدة يدوياً</span>
        </button>
      </div>

      {statusMsg && (
        <div className={`p-4 rounded-2xl text-xs font-bold shadow-xs border flex items-center justify-between ${
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
      <div className="bg-white border border-slate-200/90 rounded-3xl p-6 space-y-4 shadow-xs">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-amber-600" />
            <h3 className="font-black text-base text-slate-900">
              طلبات سداد الاشتراكات والتحويلات البنكية ({payments.filter((p) => p.status === 'pending').length})
            </h3>
          </div>
          <span className="text-xs text-slate-400 font-mono font-bold">
            إجمالي الطلبات: {payments.length}
          </span>
        </div>

        {payments.length === 0 ? (
          <p className="text-xs text-slate-400 py-3 text-center bg-slate-50 rounded-2xl">لا توجد طلبات سداد جديدة حالياً.</p>
        ) : (
          <div className="space-y-2.5">
            {payments.map((p) => (
              <div
                key={p.id}
                className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 text-xs"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <strong className="text-slate-900 text-sm">{p.schoolName}</strong>
                    <span className="font-mono text-slate-500 text-[11px]">({p.schoolCode})</span>
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                      p.status === 'approved' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' :
                      p.status === 'rejected' ? 'bg-rose-50 text-rose-800 border border-rose-200' : 'bg-amber-50 text-amber-800 border border-amber-200'
                    }`}>
                      {p.status === 'approved' ? 'معتمد ومفعل' : p.status === 'rejected' ? 'مرفوض' : 'قيد المراجعة'}
                    </span>
                    <span className="text-[10px] bg-slate-200 text-slate-700 px-2 py-0.5 rounded-md font-bold">
                      {p.plan === 'yearly' ? 'اشتراك سنوي' : 'اشتراك فصلي'}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1.5 flex flex-wrap gap-x-4 gap-y-1">
                    <span>المحول: <strong className="text-slate-800">{p.senderName}</strong></span>
                    <span>البنك: <strong className="text-slate-800">{p.senderBank}</strong></span>
                    <span>المرجع: <strong className="font-mono text-slate-800">{p.referenceNumber}</strong></span>
                    <span>المبلغ: <strong className="font-mono text-emerald-700 font-bold">{p.amount} ريال</strong></span>
                  </div>
                </div>

                {p.status === 'pending' && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleRejectPayment(p)}
                      className="px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold cursor-pointer"
                    >
                      رفض الحوالة
                    </button>
                    <button
                      onClick={() => handleApprovePayment(p)}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center gap-1.5 cursor-pointer shadow-sm"
                    >
                      <Check className="w-4 h-4" />
                      <span>اعتماد وتفعيل المدرسة</span>
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Schools Directory & Subscription Management */}
      <div className="bg-white border border-slate-200/90 rounded-3xl p-6 space-y-5 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-emerald-600" />
            <h3 className="font-black text-base text-slate-900">
              قائمة المدارس والتحكم بالاشتراكات ({schools.length})
            </h3>
          </div>
          <div className="w-full sm:w-72">
            <div className="relative">
              <input
                type="text"
                placeholder="بحث بالاسم أو الكود أو المدينة..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pr-9 pl-3 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-emerald-500 font-medium"
              />
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 text-xs">
          {filteredSchools.map((sch) => {
            const isSuspended = sch.subscriptionStatus === 'pending_payment';
            const isFree = sch.subscriptionPlan === 'free_forever';
            const isYearly = sch.subscriptionPlan === 'yearly';
            const isSemester = sch.subscriptionPlan === 'semester';

            return (
              <div 
                key={sch.id} 
                className={`rounded-3xl p-5 space-y-3.5 border transition-all ${
                  isSuspended 
                    ? 'bg-rose-50/50 border-rose-300 ring-1 ring-rose-200' 
                    : 'bg-slate-50/80 border-slate-200/90 hover:border-slate-300'
                }`}
              >
                {/* Header info */}
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-black text-slate-900 text-sm">{sch.name}</h4>
                      {isSuspended && (
                        <span className="px-2 py-0.5 rounded-md bg-rose-600 text-white text-[10px] font-black">
                          موقوفة مؤقتاً ⚠️
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-2">
                      <span>{sch.city}</span>
                      <span>•</span>
                      <span>كود المدرسة: <strong className="font-mono text-emerald-700 font-bold">{sch.code}</strong></span>
                    </p>
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

                {/* Subscription & Geofence Details */}
                <div className="bg-white p-3 rounded-2xl border border-slate-200/80 text-[11px] grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <div>
                    <span className="text-slate-400 block text-[10px]">حالة الاشتراك:</span>
                    <strong className={`font-bold ${isSuspended ? 'text-rose-700' : 'text-emerald-700'}`}>
                      {isSuspended ? 'موقوف مؤقتاً حتى السداد' : 'نشط ومفعل 🟢'}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">نهاية الاشتراك:</span>
                    <strong className="font-mono text-slate-800 font-bold">
                      {isFree ? 'دائم (غير محدد)' : sch.subscriptionEndDate}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">السياج الجغرافي:</span>
                    <strong className="font-mono text-indigo-700 font-bold">{sch.radiusMeters} متر</strong>
                  </div>
                </div>

                {/* Super Admin Control Actions Bar */}
                <div className="pt-2 border-t border-slate-200/80 space-y-2">
                  <div className="text-[11px] font-black text-slate-700 flex items-center gap-1.5">
                    <Crown className="w-3.5 h-3.5 text-amber-600" />
                    <span>التحكم في اشتراك المدرسة:</span>
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
                      👑 اشتراك سنة
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
                          <span>إيقاف مؤقت حتى السداد ⏸️</span>
                        </>
                      )}
                    </button>

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
      </div>

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
    </div>
  );
};

