import React, { useState } from 'react';
import { SystemNotification } from '../types';
import { 
  Megaphone, CloudRain, Clock, AlertTriangle, X, 
  Undo2, Trash2, Copy, Check, ShieldAlert, Sparkles, Share2
} from 'lucide-react';
import { retractSystemNotification, deleteSystemNotification } from '../utils/storage';
import { soundManager } from '../utils/audio';

interface BroadcastAlertBannerProps {
  notifications: SystemNotification[];
  onDismiss?: (notificationId: string) => void;
  canManage?: boolean;
  currentUserName?: string;
  onNotificationsChanged?: () => void;
  className?: string;
}

export const BroadcastAlertBanner: React.FC<BroadcastAlertBannerProps> = ({
  notifications,
  onDismiss,
  canManage = false,
  currentUserName = 'إدارة المدرسة',
  onNotificationsChanged,
  className = '',
}) => {
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);
  const [retractingNotif, setRetractingNotif] = useState<SystemNotification | null>(null);
  const [retractionReason, setRetractionReason] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Filter notifications that are broadcasts or high priority, excluding locally dismissed
  const broadcastList = notifications.filter(
    (n) => 
      (n.broadcastType || n.priority === 'emergency' || n.priority === 'urgent') &&
      !dismissedIds.includes(n.id)
  );

  if (broadcastList.length === 0) return null;

  const handleDismiss = (id: string) => {
    setDismissedIds((prev) => [...prev, id]);
    if (onDismiss) onDismiss(id);
  };

  const handleOpenRetractModal = (notif: SystemNotification) => {
    setRetractingNotif(notif);
    // Preset reason based on type
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
        'تنويه بنفي وتراجع رسمي: تعلن إدارة المدرسة عن التراجع عن التعميم السابق وإلغائه رسمياً لعدم صحته أو صدور توجيهات جديدة.'
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
      currentUserName
    );

    setRetractingNotif(null);
    setRetractionReason('');
    if (onNotificationsChanged) onNotificationsChanged();
  };

  const handleConfirmDelete = (id: string) => {
    try {
      soundManager.playDismiss();
    } catch {}

    deleteSystemNotification(id);
    setDeleteConfirmId(null);
    if (onNotificationsChanged) onNotificationsChanged();
  };

  const handleCopyWhatsApp = (notif: SystemNotification) => {
    let text = '';
    if (notif.retracted) {
      text = `⚠️ *تنويه رسمي بنفي وتراجع عن تعميم* ⚠️\n` +
        `📌 *بشأن التعميم:* ${notif.title}\n` +
        `━━━━━━━━━━━━━━━━━━━\n` +
        `تعلن إدارة المدرسة عن التراجع عن التعميم السابق وإلغائه رسمياً نظراً للتوجيهات التالية:\n` +
        `«${notif.retractionReason || 'نفي الشائعة والتأكيد على انتظام اليوم الدراسي كالمعتاد'}»\n\n` +
        `نأمل من أولياء الأمور والطلاب الاعتماد فقط على القنوات الرسمية وتجاهل أي شائعات متداولة.\n` +
        `━━━━━━━━━━━━━━━━━━━\n` +
        `🗓️ وقت التراجع: ${new Date(notif.retractedAt || notif.createdAt).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })} - ${new Date().toLocaleDateString('ar-SA')}\n` +
        `✍️ الإدارة المدرسية`;
    } else {
      text = `📢 *تعميم إداري عاجل* 📢\n` +
        `📌 *الموضوع:* ${notif.title}\n` +
        `━━━━━━━━━━━━━━━━━━━\n` +
        `${notif.message}\n\n` +
        `━━━━━━━━━━━━━━━━━━━\n` +
        `🗓️ الوقت: ${new Date(notif.createdAt).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })} - ${new Date().toLocaleDateString('ar-SA')}\n` +
        `✍️ ${notif.senderName || 'إدارة المدرسة'}`;
    }

    navigator.clipboard.writeText(text);
    setCopiedId(notif.id);
    setTimeout(() => setCopiedId(null), 2200);
  };

  return (
    <>
      <div className={`space-y-3 ${className}`} dir="rtl">
        {broadcastList.map((notif) => {
          const isSuspension = notif.broadcastType === 'school_suspended';
          const isDismissal = notif.broadcastType === 'early_dismissal';
          const isRetracted = Boolean(notif.retracted);

          // Retracted Style: Distinct amber/gold denial banner
          if (isRetracted) {
            return (
              <div
                key={notif.id}
                className="p-4 sm:p-5 rounded-3xl border border-amber-300 bg-gradient-to-l from-amber-500 via-amber-600 to-amber-700 text-white shadow-lg shadow-amber-500/20 text-right animate-fadeIn"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="flex items-start gap-3.5">
                    <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center shrink-0 font-black shadow-inner">
                      <Undo2 className="w-6 h-6 animate-pulse text-white" />
                    </div>

                    <div className="space-y-1.5 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-full bg-white/25 backdrop-blur-xs text-[10px] sm:text-[11px] font-black tracking-wide border border-white/30">
                          ⚠️ تنويه نفي رسمي / تم التراجع عن التعميم
                        </span>
                        <span className="text-[10px] text-white/80 font-mono">
                          {new Date(notif.retractedAt || notif.createdAt).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      <h4 className="text-sm sm:text-base font-black text-white leading-snug line-through opacity-85">
                        {notif.title}
                      </h4>

                      {/* Official Denial / Retraction Box */}
                      <div className="bg-white/15 border border-white/25 rounded-2xl p-3 text-white text-xs sm:text-sm font-bold leading-relaxed shadow-inner">
                        <div className="flex items-center gap-1.5 text-amber-100 text-[11px] font-black mb-1">
                          <ShieldAlert className="w-4 h-4 text-amber-200" />
                          <span>بيان وتوضيح إدارة المدرسة بنفي الشائعة:</span>
                        </div>
                        <p className="text-white">
                          {notif.retractionReason || 'تم التراجع عن التعميم بناءً على التوجيهات ونفي الشائعة.'}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-[11px] text-white/80 pt-1 font-medium">
                        {notif.retractedByName && (
                          <span>صدر التراجع بواسطة: <strong>{notif.retractedByName}</strong></span>
                        )}
                        <span>•</span>
                        <span>تاريخ الإرسال الأصلي: {new Date(notif.createdAt).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions for Retracted Item */}
                  <div className="flex items-center gap-1.5 self-end sm:self-start shrink-0 pt-1">
                    <button
                      onClick={() => handleCopyWhatsApp(notif)}
                      className="px-2.5 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all border border-white/20"
                      title="نسخ بيان النفي للواتساب"
                    >
                      {copiedId === notif.id ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-300" />
                          <span className="text-[11px] text-emerald-100">تم النسخ!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span className="text-[11px]">نسخ بيان النفي</span>
                        </>
                      )}
                    </button>

                    {canManage && (
                      <button
                        onClick={() => setDeleteConfirmId(notif.id)}
                        className="p-1.5 rounded-xl bg-white/15 hover:bg-rose-500 text-white/90 hover:text-white cursor-pointer transition-colors border border-white/20"
                        title="حذف هذا التنبيه نهائياً من الشاشة"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}

                    <button
                      onClick={() => handleDismiss(notif.id)}
                      className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white/80 hover:text-white cursor-pointer transition-colors"
                      title="إغلاق التنبيه"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          }

          // Active Broadcast Card
          return (
            <div
              key={notif.id}
              className={`p-4 sm:p-5 rounded-3xl border shadow-lg flex flex-col sm:flex-row sm:items-start justify-between gap-3 text-right animate-fadeIn ${
                isSuspension
                  ? 'bg-gradient-to-l from-rose-600 to-rose-700 text-white border-rose-500 shadow-rose-600/20'
                  : isDismissal
                  ? 'bg-gradient-to-l from-amber-500 to-amber-600 text-white border-amber-400 shadow-amber-500/20'
                  : 'bg-gradient-to-l from-slate-900 to-slate-850 text-white border-slate-700 shadow-slate-900/20'
              }`}
            >
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center shrink-0 font-black shadow-inner">
                  {isSuspension ? (
                    <CloudRain className="w-6 h-6 animate-pulse text-white" />
                  ) : isDismissal ? (
                    <Clock className="w-6 h-6 animate-pulse text-white" />
                  ) : (
                    <Megaphone className="w-6 h-6 animate-pulse text-white" />
                  )}
                </div>

                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-white/20 backdrop-blur-xs text-[10px] sm:text-[11px] font-black tracking-wide">
                      {isSuspension ? '🚨 تعليق دراسة حضورية' : isDismissal ? '⏰ خروج مبكر للطلاب' : '📢 تعميم إداري عاجل'}
                    </span>
                    <span className="text-[10px] text-white/80 font-mono">
                      {new Date(notif.createdAt).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <h4 className="text-sm sm:text-base font-black text-white leading-snug">
                    {notif.title}
                  </h4>

                  <p className="text-xs sm:text-sm text-white/95 leading-relaxed font-medium max-w-3xl">
                    {notif.message}
                  </p>

                  {notif.senderName && (
                    <span className="text-[11px] text-white/80 font-bold block pt-1">
                      مرسل التعميم: {notif.senderName}
                    </span>
                  )}
                </div>
              </div>

              {/* Action Controls */}
              <div className="flex flex-wrap items-center gap-1.5 self-end sm:self-start shrink-0 pt-1">
                {/* WhatsApp Share Button */}
                <button
                  onClick={() => handleCopyWhatsApp(notif)}
                  className="px-2.5 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all border border-white/20"
                  title="نسخ التعميم للواتساب"
                >
                  {copiedId === notif.id ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-300" />
                      <span className="text-[11px] text-emerald-100">تم النسخ!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span className="text-[11px]">نسخ للواتساب</span>
                    </>
                  )}
                </button>

                {/* Management Action: Retract / Delete if admin */}
                {canManage && (
                  <>
                    <button
                      onClick={() => handleOpenRetractModal(notif)}
                      className="px-2.5 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-amber-950 text-xs font-black flex items-center gap-1.5 cursor-pointer transition-all shadow-sm"
                      title="التراجع عن التعميم ونفي أي شائعة مع توضيح رسمي"
                    >
                      <Undo2 className="w-3.5 h-3.5" />
                      <span>تراجع ونفي الشائعة ↩️</span>
                    </button>

                    <button
                      onClick={() => setDeleteConfirmId(notif.id)}
                      className="p-1.5 rounded-xl bg-white/15 hover:bg-rose-500 text-white cursor-pointer transition-colors border border-white/20"
                      title="حذف التعميم نهائياً من كافة اللوحات"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </>
                )}

                {/* Dismiss Button */}
                <button
                  onClick={() => handleDismiss(notif.id)}
                  className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white/80 hover:text-white cursor-pointer shrink-0 transition-colors"
                  title="إغلاق التنبيه"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Retract Modal Dialog */}
      {retractingNotif && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setRetractingNotif(null); }}
          className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fadeIn"
          dir="rtl"
        >
          <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full p-6 text-right space-y-4 shadow-2xl text-slate-800">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
                  <Undo2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">التراجع عن التعميم ونفي الشائعة</h3>
                  <p className="text-xs text-slate-500">سيتم استبدال التعميم ببيان نفي وتوضيح رسمي لدى الجميع</p>
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
              <span className="font-bold text-slate-500 block mb-1">التعميم المراد التراجع عنه:</span>
              <p className="font-black text-slate-800">{retractingNotif.title}</p>
            </div>

            {/* Quick Reason Presets */}
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

            {/* Custom Reason Textarea */}
            <form onSubmit={handleConfirmRetract} className="space-y-4 pt-1">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  نص بيان النفي والتراجع الذي سيظهر للجميع *
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

      {/* Delete Confirmation Dialog */}
      {deleteConfirmId && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setDeleteConfirmId(null); }}
          className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fadeIn"
          dir="rtl"
        >
          <div className="bg-white border border-slate-200 rounded-3xl max-w-sm w-full p-6 text-right space-y-4 shadow-2xl text-slate-800">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-base font-black text-slate-900">هل أنت متأكد من حذف التعميم؟</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                سيتم حذف هذا التعميم نهائياً من قاعدة البيانات وسيختفي من شاشات أولياء الأمور والطلاب والمعلمين فوراً.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2.5 pt-2">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="py-2 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
              >
                تراجع
              </button>
              <button
                onClick={() => handleConfirmDelete(deleteConfirmId)}
                className="py-2 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-rose-600/20 transition-all"
              >
                <Trash2 className="w-4 h-4" />
                <span>نعم، احذف نهائياً</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
