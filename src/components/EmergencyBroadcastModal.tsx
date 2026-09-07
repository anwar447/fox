import React, { useState } from 'react';
import { School, User, SystemNotification } from '../types';
import { 
  addSystemNotification, 
  getSystemNotifications, 
  retractSystemNotification, 
  deleteSystemNotification 
} from '../utils/storage';
import { soundManager } from '../utils/audio';
import { 
  Megaphone, CloudRain, Clock, Send, X, 
  AlertTriangle, Users, CheckCircle, ShieldAlert, Sparkles, MessageSquare,
  Undo2, Trash2, Copy, Check, ListFilter, AlertCircle
} from 'lucide-react';

interface EmergencyBroadcastModalProps {
  isOpen: boolean;
  onClose: () => void;
  school: School;
  currentUser: User;
  onBroadcastSent?: () => void;
}

export const EmergencyBroadcastModal: React.FC<EmergencyBroadcastModalProps> = ({
  isOpen,
  onClose,
  school,
  currentUser,
  onBroadcastSent,
}) => {
  const [activeTab, setActiveTab] = useState<'create' | 'manage'>('create');
  const [broadcastType, setBroadcastType] = useState<'school_suspended' | 'early_dismissal' | 'general_announcement'>('school_suspended');
  const [targetAudience, setTargetAudience] = useState<'all' | 'parents_students' | 'staff_teachers'>('all');
  const [title, setTitle] = useState('تعليق الدراسة الحضورية وتحويلها عن بُعد');
  const [customMessage, setCustomMessage] = useState(
    'نظراً لتقلبات الأحوال الجوية واستمرار الحالة المطرية وحرصاً على سلامة أبنائنا وبناتنا الطلاب، تقرر تعليق الدراسة الحضورية في المدرسة لهذا اليوم، وسيكون التعليم (عن بُعد) عبر منصة مدرستي.'
  );
  const [dismissalTime, setDismissalTime] = useState('11:30');
  const [isSending, setIsSending] = useState(false);
  const [successSent, setSuccessSent] = useState(false);

  // Retraction / Deletion local states
  const [retractingNotif, setRetractingNotif] = useState<SystemNotification | null>(null);
  const [retractionReason, setRetractionReason] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  if (!isOpen) return null;

  // Retrieve current notifications for this school
  const allNotifications = getSystemNotifications();
  const schoolBroadcasts = allNotifications.filter(
    (n) => 
      (n.schoolCode === school.code || !n.schoolCode) &&
      (n.broadcastType || n.priority === 'emergency' || n.priority === 'urgent')
  );

  const activeBroadcastsCount = schoolBroadcasts.filter((b) => !b.retracted).length;

  const handleSelectPreset = (type: 'school_suspended' | 'early_dismissal' | 'general_announcement') => {
    setBroadcastType(type);
    if (type === 'school_suspended') {
      setTitle('تعليق الدراسة الحضورية وتحويلها عن بُعد 🌧️');
      setCustomMessage(
        `نظراً للتقارير الجوية واستمرار هطول الأمطار وحرصاً على سلامة الجميع، تقرر تعليق الدراسة الحضورية في ${school.name} لهذا اليوم وتحويل اليوم الدراسي (عن بُعد) عبر منصة مدرستي.`
      );
      setTargetAudience('all');
    } else if (type === 'early_dismissal') {
      setTitle('تنويه هام: خروج مبكر لجميع الطلاب والطالبات ⏰');
      setCustomMessage(
        `أولياء الأمور الكرام: نود إشعاركم بأنه تقرر صرف وخروج جميع طلاب وطالبات ${school.name} اليوم مبكراً في تمام الساعة ${dismissalTime} ظهراً، نأمل التواجد لاستلام أبنائكم وبناتكم حرصاً على سلامتهم.`
      );
      setTargetAudience('parents_students');
    } else {
      setTitle('تعميم إداري وتنويه هام من إدارة المدرسة 📢');
      setCustomMessage('');
      setTargetAudience('all');
    }
  };

  const handleSendBroadcast = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !customMessage.trim()) return;

    setIsSending(true);

    try {
      soundManager.playAlert();
    } catch {}

    const targetRoleValue = 
      targetAudience === 'parents_students' ? 'parent' :
      targetAudience === 'staff_teachers' ? 'teacher' : 'all';

    const newNotification: SystemNotification = {
      id: `notif-broad-${Date.now()}`,
      title: title.trim(),
      message: customMessage.trim(),
      type: broadcastType === 'school_suspended' ? 'alert' : broadcastType === 'early_dismissal' ? 'warning' : 'info',
      priority: broadcastType === 'school_suspended' ? 'emergency' : 'urgent',
      broadcastType: broadcastType,
      targetRole: targetRoleValue,
      schoolCode: school.code,
      senderName: `${currentUser.name} (${school.name})`,
      createdAt: new Date().toISOString(),
      read: false,
    };

    addSystemNotification(newNotification);

    setIsSending(false);
    setSuccessSent(true);

    setTimeout(() => {
      setSuccessSent(false);
      if (onBroadcastSent) onBroadcastSent();
      setActiveTab('manage'); // Switch to manage tab so they see it
    }, 1200);
  };

  const handleOpenRetract = (notif: SystemNotification) => {
    setRetractingNotif(notif);
    if (notif.broadcastType === 'school_suspended') {
      setRetractionReason(
        'نفي شائعة تعليق الدراسة: تؤكد إدارة المدرسة بأن الدراسة حضورية كالمعتاد ولا صحة لما تم تداوله حول تعليق الدراسة لهذا اليوم.'
      );
    } else if (notif.broadcastType === 'early_dismissal') {
      setRetractionReason(
        'تصحيح توقيت الانصراف: تم إلغاء الخروج المبكر وسينصرف الطلاب في الموعد اليومي الطبيعي كالمعتاد.'
      );
    } else {
      setRetractionReason(
        'تنويه بنفي وتراجع رسمي: تعلن إدارة المدرسة عن التراجع عن التعميم السابق وإلغائه رسمياً نظراً للتوجيهات الجديدة.'
      );
    }
  };

  const handleConfirmRetract = (e: React.FormEvent) => {
    e.preventDefault();
    if (!retractingNotif || !retractionReason.trim()) return;

    try {
      soundManager.playSuccess();
    } catch {}

    retractSystemNotification(
      retractingNotif.id,
      retractionReason.trim(),
      currentUser.name
    );

    setRetractingNotif(null);
    setRetractionReason('');
    if (onBroadcastSent) onBroadcastSent();
  };

  const handleConfirmDelete = (id: string) => {
    try {
      soundManager.playDismiss();
    } catch {}

    deleteSystemNotification(id);
    setDeleteConfirmId(null);
    if (onBroadcastSent) onBroadcastSent();
  };

  const handleCopyWhatsApp = (notif: SystemNotification) => {
    let text = '';
    if (notif.retracted) {
      text = `⚠️ *تنويه رسمي بنفي وتراجع عن تعميم* ⚠️\n` +
        `🏫 *${school.name}*\n` +
        `📌 *بشأن التعميم:* ${notif.title}\n` +
        `━━━━━━━━━━━━━━━━━━━\n` +
        `تعلن إدارة المدرسة عن التراجع عن التعميم السابق وإلغائه رسمياً:\n` +
        `«${notif.retractionReason || 'نفي الشائعة والتأكيد على انتظام الحضور الدراسي'}»\n\n` +
        `نأمل من أولياء الأمور والطلاب الاعتماد فقط على القنوات الرسمية وتجاهل أي شائعات متداولة.\n` +
        `━━━━━━━━━━━━━━━━━━━\n` +
        `🗓️ وقت التراجع: ${new Date(notif.retractedAt || notif.createdAt).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })} - ${new Date().toLocaleDateString('ar-SA')}\n` +
        `✍️ إدارة ${school.name}`;
    } else {
      text = `📢 *تعميم إداري عاجل* 📢\n` +
        `🏫 *${school.name}*\n` +
        `📌 *الموضوع:* ${notif.title}\n` +
        `━━━━━━━━━━━━━━━━━━━\n` +
        `${notif.message}\n\n` +
        `━━━━━━━━━━━━━━━━━━━\n` +
        `🗓️ الوقت: ${new Date(notif.createdAt).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })} - ${new Date().toLocaleDateString('ar-SA')}\n` +
        `✍️ ${notif.senderName || 'إدارة المدرسة'}`;
    }

    navigator.clipboard.writeText(text);
    setCopiedId(notif.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div 
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fadeIn"
      dir="rtl"
    >
      <div className="bg-white border border-slate-200 rounded-3xl max-w-xl w-full p-6 text-right space-y-5 shadow-2xl text-slate-800">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center font-bold shadow-xs shrink-0">
              <Megaphone className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-slate-900">إدارة التعاميم والتنبيهات الطارئة</h3>
                {activeBroadcastsCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[10px] font-black border border-rose-200 animate-pulse">
                    {activeBroadcastsCount} تعميم نشط 🚨
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 font-medium">
                {school.name} (كود: <span className="font-mono font-bold text-slate-700">{school.code}</span>)
              </p>
            </div>
          </div>

          <button 
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex rounded-2xl bg-slate-100 p-1 gap-1 text-xs font-black">
          <button
            type="button"
            onClick={() => setActiveTab('create')}
            className={`flex-1 py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'create'
                ? 'bg-white text-rose-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Megaphone className="w-4 h-4" />
            <span>إرسال تعميم جديد 🚨</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('manage')}
            className={`flex-1 py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer relative ${
              activeTab === 'manage'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ListFilter className="w-4 h-4" />
            <span>التعاميم والتراجع / الحذف</span>
            {schoolBroadcasts.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-slate-200 text-slate-800 text-[10px] font-mono font-black">
                {schoolBroadcasts.length}
              </span>
            )}
          </button>
        </div>

        {/* TAB 1: CREATE BROADCAST */}
        {activeTab === 'create' && (
          <>
            {successSent ? (
              <div className="py-10 text-center space-y-3 animate-fadeIn">
                <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-md">
                  <CheckCircle className="w-10 h-10" />
                </div>
                <h4 className="text-lg font-black text-slate-900">تم إرسال التعميم الفوري بنجاح! 🚀</h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  وصل التنبيه الآن لجميع المعنيين وسيظهر في لوحاتهم فوراً. يمكنك التراجع عنه أو حذفه في أي وقت في حال وجود شائعة أو تعديل.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSendBroadcast} className="space-y-4 text-xs">
                
                {/* Quick Presets Selection */}
                <div>
                  <label className="block text-slate-700 font-bold mb-2">اختر نوع البث السريع أو المخصص:</label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => handleSelectPreset('school_suspended')}
                      className={`p-3 rounded-2xl border text-right transition-all flex flex-col justify-between gap-1.5 cursor-pointer ${
                        broadcastType === 'school_suspended'
                          ? 'bg-rose-50 border-rose-300 ring-2 ring-rose-500/20 text-rose-950 shadow-xs'
                          : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 font-black text-xs">
                        <CloudRain className="w-4 h-4 text-rose-600 shrink-0" />
                        <span>تعليق الدراسة 🌧️</span>
                      </div>
                      <span className="text-[10px] text-slate-500">بسبب الأمطار والأحوال الجوية</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSelectPreset('early_dismissal')}
                      className={`p-3 rounded-2xl border text-right transition-all flex flex-col justify-between gap-1.5 cursor-pointer ${
                        broadcastType === 'early_dismissal'
                          ? 'bg-amber-50 border-amber-300 ring-2 ring-amber-500/20 text-amber-950 shadow-xs'
                          : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 font-black text-xs">
                        <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>خروج مبكر ⏰</span>
                      </div>
                      <span className="text-[10px] text-slate-500">انصراف الطلاب واستلامهم</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSelectPreset('general_announcement')}
                      className={`p-3 rounded-2xl border text-right transition-all flex flex-col justify-between gap-1.5 cursor-pointer ${
                        broadcastType === 'general_announcement'
                          ? 'bg-indigo-50 border-indigo-300 ring-2 ring-indigo-500/20 text-indigo-950 shadow-xs'
                          : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 font-black text-xs">
                        <MessageSquare className="w-4 h-4 text-indigo-600 shrink-0" />
                        <span>رسالة مخصصة ✍️</span>
                      </div>
                      <span className="text-[10px] text-slate-500">تعميم عام لأي شأن مدرسي</span>
                    </button>
                  </div>
                </div>

                {/* Target Audience */}
                <div>
                  <label className="block text-slate-700 font-bold mb-1.5 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-slate-500" />
                    <span>الفئة المستهدفة بالرسالة:</span>
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <label className={`p-2.5 rounded-xl border flex items-center justify-center gap-1.5 cursor-pointer font-bold text-center transition-all ${
                      targetAudience === 'all' ? 'bg-emerald-50 border-emerald-300 text-emerald-900' : 'bg-slate-50 border-slate-200 text-slate-600'
                    }`}>
                      <input
                        type="radio"
                        name="targetAudience"
                        checked={targetAudience === 'all'}
                        onChange={() => setTargetAudience('all')}
                        className="sr-only"
                      />
                      <span>👥 الجميع (شامل)</span>
                    </label>

                    <label className={`p-2.5 rounded-xl border flex items-center justify-center gap-1.5 cursor-pointer font-bold text-center transition-all ${
                      targetAudience === 'parents_students' ? 'bg-emerald-50 border-emerald-300 text-emerald-900' : 'bg-slate-50 border-slate-200 text-slate-600'
                    }`}>
                      <input
                        type="radio"
                        name="targetAudience"
                        checked={targetAudience === 'parents_students'}
                        onChange={() => setTargetAudience('parents_students')}
                        className="sr-only"
                      />
                      <span>👨‍👩‍👦 الطلاب وأولياء الأمور</span>
                    </label>

                    <label className={`p-2.5 rounded-xl border flex items-center justify-center gap-1.5 cursor-pointer font-bold text-center transition-all ${
                      targetAudience === 'staff_teachers' ? 'bg-emerald-50 border-emerald-300 text-emerald-900' : 'bg-slate-50 border-slate-200 text-slate-600'
                    }`}>
                      <input
                        type="radio"
                        name="targetAudience"
                        checked={targetAudience === 'staff_teachers'}
                        onChange={() => setTargetAudience('staff_teachers')}
                        className="sr-only"
                      />
                      <span>👨‍🏫 المعلمون والموظفون</span>
                    </label>
                  </div>
                </div>

                {/* Early Dismissal Time if early_dismissal */}
                {broadcastType === 'early_dismissal' && (
                  <div className="bg-amber-50/80 border border-amber-200 p-3 rounded-2xl flex items-center justify-between gap-3">
                    <div>
                      <span className="font-bold text-amber-950 block">حدد وقت الانصراف المتوقع:</span>
                      <span className="text-[11px] text-amber-800">سيتم إدراج هذا التوقيت في الرسالة الموجهة لأولياء الأمور</span>
                    </div>
                    <input
                      type="time"
                      value={dismissalTime}
                      onChange={(e) => {
                        setDismissalTime(e.target.value);
                        setCustomMessage(
                          `أولياء الأمور الكرام: نود إشعاركم بأنه تقرر صرف وخروج جميع طلاب وطالبات ${school.name} اليوم مبكراً في تمام الساعة ${e.target.value} ظهراً، نأمل التواجد لاستلام أبنائكم وبناتكم حرصاً على سلامتهم.`
                        );
                      }}
                      className="bg-white border border-amber-300 rounded-xl px-3 py-1.5 font-mono text-sm font-black text-amber-900 focus:outline-amber-500"
                    />
                  </div>
                )}

                {/* Broadcast Title */}
                <div>
                  <label className="block text-slate-700 font-bold mb-1">عنوان التعميم / التنبيه *</label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="اكتب عنوان التعميم..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 font-bold focus:outline-rose-500"
                  />
                </div>

                {/* Broadcast Content */}
                <div>
                  <label className="block text-slate-700 font-bold mb-1">نص الرسالة التي ستصل للجميع *</label>
                  <textarea
                    required
                    rows={4}
                    value={customMessage}
                    onChange={(e) => setCustomMessage(e.target.value)}
                    placeholder="اكتب تفاصيل الرسالة والتعليمات الموجهة..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-slate-900 text-xs leading-relaxed focus:outline-rose-500 font-medium"
                  />
                </div>

                {/* Action buttons */}
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    disabled={isSending}
                    className="py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-rose-600/20 cursor-pointer transition-all"
                  >
                    <Send className="w-4 h-4" />
                    <span>إرسال البث للجميع فوراً 🚨</span>
                  </button>
                </div>
              </form>
            )}
          </>
        )}

        {/* TAB 2: MANAGE, RETRACT & DELETE BROADCASTS */}
        {activeTab === 'manage' && (
          <div className="space-y-4">
            <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-3 text-xs text-amber-900 space-y-1">
              <div className="flex items-center gap-1.5 font-black text-amber-950">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>التعامل مع الشائعات والتراجع السريع:</span>
              </div>
              <p className="text-[11px] leading-relaxed text-amber-800">
                في حال وجود شائعة حول تعليق الدراسة أو خطأ في التوقيت، يمكنك الضغط على <strong>«تراجع ونفي الشائعة»</strong> ليتحول التعميم فوراً إلى بيان نفي وتوضيح رسمي لدى الجميع، أو <strong>«حذف نهائي»</strong> لمسح التعميم بالكامل.
              </p>
            </div>

            {schoolBroadcasts.length === 0 ? (
              <div className="py-10 text-center space-y-2 border-2 border-dashed border-slate-200 rounded-3xl">
                <Megaphone className="w-10 h-10 text-slate-300 mx-auto" />
                <p className="font-bold text-slate-700 text-sm">لا توجد أي تعاميم مرسلة حالياً</p>
                <p className="text-xs text-slate-400">يمكنك إرسال تعميم جديد عبر التبويب الأول أعلاه.</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                {schoolBroadcasts.map((b) => {
                  const isRetracted = Boolean(b.retracted);
                  return (
                    <div
                      key={b.id}
                      className={`p-4 rounded-2xl border text-right space-y-2.5 transition-all ${
                        isRetracted
                          ? 'bg-amber-50/60 border-amber-200'
                          : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex flex-wrap items-center gap-1.5 mb-1">
                            {isRetracted ? (
                              <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-black border border-amber-200">
                                ⚠️ تم التراجع عنه ونفي الشائعة
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black border border-emerald-200">
                                🟢 نشط ومعروض للجميع
                              </span>
                            )}
                            <span className="text-[10px] text-slate-400 font-mono">
                              {new Date(b.createdAt).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              • المستهدف: {b.targetRole === 'parent' ? 'أولياء الأمور والطلاب' : b.targetRole === 'teacher' ? 'الكادر التعليمي' : 'الجميع'}
                            </span>
                          </div>

                          <h4 className={`text-xs sm:text-sm font-black text-slate-900 ${isRetracted ? 'line-through opacity-70' : ''}`}>
                            {b.title}
                          </h4>
                        </div>

                        {/* Quick WhatsApp Copy */}
                        <button
                          onClick={() => handleCopyWhatsApp(b)}
                          className="px-2 py-1 rounded-lg bg-white hover:bg-slate-100 text-slate-700 text-[11px] font-bold border border-slate-200 flex items-center gap-1 cursor-pointer shrink-0"
                          title="نسخ للواتساب"
                        >
                          {copiedId === b.id ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-600" />
                              <span className="text-emerald-700 font-black">تم النسخ</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3 text-slate-500" />
                              <span>نسخ للواتساب</span>
                            </>
                          )}
                        </button>
                      </div>

                      <p className="text-xs text-slate-600 leading-relaxed font-medium">
                        {b.message}
                      </p>

                      {/* If Retracted: Show Retraction details */}
                      {isRetracted && b.retractionReason && (
                        <div className="bg-amber-100/70 border border-amber-200 rounded-xl p-2.5 text-xs text-amber-950 font-bold space-y-0.5">
                          <span className="text-[10px] text-amber-700 block">بيان النفي والتراجع الرسمي:</span>
                          <p>{b.retractionReason}</p>
                          {b.retractedByName && (
                            <span className="text-[10px] text-amber-700 block pt-0.5 font-normal">
                              بواسطة: {b.retractedByName}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Action buttons */}
                      <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-200/60">
                        {!isRetracted && (
                          <button
                            type="button"
                            onClick={() => handleOpenRetract(b)}
                            className="py-1.5 px-3 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 font-black text-xs flex items-center gap-1.5 cursor-pointer transition-all shadow-xs"
                          >
                            <Undo2 className="w-3.5 h-3.5 text-amber-700" />
                            <span>تراجع ونفي الشائعة ↩️</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => setDeleteConfirmId(b.id)}
                          className="py-1.5 px-3 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs flex items-center gap-1 cursor-pointer transition-all"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>حذف نهائي</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

      </div>

      {/* Retract / Denial Sub-Modal */}
      {retractingNotif && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setRetractingNotif(null); }}
          className="fixed inset-0 z-60 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fadeIn"
          dir="rtl"
        >
          <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full p-6 text-right space-y-4 shadow-2xl text-slate-800">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
                  <Undo2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">إصدار بيان تراجع ونفي رسمي</h3>
                  <p className="text-xs text-slate-500">سيظهر هذا التوضيح لكافة المعلمين والطلاب وأولياء الأمور فوراً</p>
                </div>
              </div>
              <button
                onClick={() => setRetractingNotif(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 text-xs">
              <span className="font-bold text-slate-500 block mb-1">التعميم المطلوب التراجع عنه:</span>
              <p className="font-black text-slate-800">{retractingNotif.title}</p>
            </div>

            {/* Quick Denial Presets */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">
                اختر صيغة النفي السريعة:
              </label>
              <div className="grid grid-cols-1 gap-1.5">
                <button
                  type="button"
                  onClick={() => setRetractionReason('نفي شائعة تعليق الدراسة: تؤكد إدارة المدرسة أن الدراسة حضورية كالمعتاد ولا صحة لما تم تداوله حول تعليق الدراسة لهذا اليوم.')}
                  className="text-right p-2.5 rounded-xl border border-slate-200 hover:border-amber-300 hover:bg-amber-50/60 text-xs font-medium text-slate-700 cursor-pointer transition-all"
                >
                  🌧️ <strong>نفي شائعة تعليق الدراسة:</strong> التأكيد على استمرار الحضور المدرسي
                </button>
                <button
                  type="button"
                  onClick={() => setRetractionReason('تصحيح توقيت الانصراف: تم إلغاء الخروج المبكر وسينصرف الطلاب في الموعد اليومي الطبيعي كالمعتاد.')}
                  className="text-right p-2.5 rounded-xl border border-slate-200 hover:border-amber-300 hover:bg-amber-50/60 text-xs font-medium text-slate-700 cursor-pointer transition-all"
                >
                  ⏰ <strong>تصحيح خروج الطلاب:</strong> إلغاء الخروج المبكر والانصراف كالمعتاد
                </button>
                <button
                  type="button"
                  onClick={() => setRetractionReason('إلغاء التنبيه: تم إلغاء الإشعار نظراً لتحسن الأحوال الجوية واستقرار الوضع الميداني بالمدرسة.')}
                  className="text-right p-2.5 rounded-xl border border-slate-200 hover:border-amber-300 hover:bg-amber-50/60 text-xs font-medium text-slate-700 cursor-pointer transition-all"
                >
                  ☀️ <strong>تحسن واستقرار الأوضاع:</strong> إلغاء الإشعار لعدم الحاجة
                </button>
                <button
                  type="button"
                  onClick={() => setRetractionReason('تعميم أُرسل عن طريق الخطأ: نعتذر للجميع، تم إرسال هذا التعميم بالخطأ وتم إلغاؤه فوراً.')}
                  className="text-right p-2.5 rounded-xl border border-slate-200 hover:border-amber-300 hover:bg-amber-50/60 text-xs font-medium text-slate-700 cursor-pointer transition-all"
                >
                  ❌ <strong>خطأ غير مقصود:</strong> إشعار بإلغاء تعميم أُرسل بالخطأ
                </button>
              </div>
            </div>

            {/* Custom Textarea */}
            <form onSubmit={handleConfirmRetract} className="space-y-4 pt-1">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  نص بيان النفي والتراجع الذي سيصل للجميع *
                </label>
                <textarea
                  required
                  rows={3}
                  value={retractionReason}
                  onChange={(e) => setRetractionReason(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs text-slate-900 font-bold focus:outline-amber-500 leading-relaxed"
                  placeholder="اكتب توضيح الإدارة المدرسية..."
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setRetractingNotif(null)}
                  className="py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/20 cursor-pointer transition-all"
                >
                  <Undo2 className="w-4 h-4" />
                  <span>تأكيد التراجع ونفي الشائعة 🚨</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setDeleteConfirmId(null); }}
          className="fixed inset-0 z-60 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fadeIn"
          dir="rtl"
        >
          <div className="bg-white border border-slate-200 rounded-3xl max-w-sm w-full p-6 text-right space-y-4 shadow-2xl text-slate-800">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-base font-black text-slate-900">هل تريد بالتأكيد حذف التعميم؟</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                سيتم مسح هذا التعميم نهائياً من قاعدة البيانات ولن يظهر على أي لوحة لأولياء الأمور أو الطلاب أو المعلمين.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2.5 pt-2">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="py-2 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
              >
                إلغاء
              </button>
              <button
                onClick={() => handleConfirmDelete(deleteConfirmId)}
                className="py-2 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-rose-600/20 transition-all"
              >
                <Trash2 className="w-4 h-4" />
                <span>نعم، حذف نهائي</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
