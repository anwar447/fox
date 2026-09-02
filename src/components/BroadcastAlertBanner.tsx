import React from 'react';
import { SystemNotification } from '../types';
import { Megaphone, CloudRain, Clock, AlertTriangle, Info, X } from 'lucide-react';

interface BroadcastAlertBannerProps {
  notifications: SystemNotification[];
  onDismiss?: (notificationId: string) => void;
  className?: string;
}

export const BroadcastAlertBanner: React.FC<BroadcastAlertBannerProps> = ({
  notifications,
  onDismiss,
  className = '',
}) => {
  // Filter notifications that are broadcasts or high priority
  const broadcastList = notifications.filter(
    (n) => n.broadcastType || n.priority === 'emergency' || n.priority === 'urgent'
  );

  if (broadcastList.length === 0) return null;

  return (
    <div className={`space-y-2.5 ${className}`} dir="rtl">
      {broadcastList.map((notif) => {
        const isSuspension = notif.broadcastType === 'school_suspended';
        const isDismissal = notif.broadcastType === 'early_dismissal';

        return (
          <div
            key={notif.id}
            className={`p-4 sm:p-5 rounded-3xl border shadow-lg flex items-start justify-between gap-3 text-right animate-fadeIn ${
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

            {onDismiss && (
              <button
                onClick={() => onDismiss(notif.id)}
                className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white/80 hover:text-white cursor-pointer shrink-0 transition-colors"
                title="إغلاق التنبيه"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
};
