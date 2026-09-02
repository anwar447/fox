import React, { useState } from 'react';
import { School, User, SystemNotification } from '../types';
import { addSystemNotification } from '../utils/storage';
import { soundManager } from '../utils/audio';
import { 
  Megaphone, CloudRain, Clock, Send, X, 
  AlertTriangle, Users, CheckCircle, ShieldAlert, Sparkles, MessageSquare
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
  const [broadcastType, setBroadcastType] = useState<'school_suspended' | 'early_dismissal' | 'general_announcement'>('school_suspended');
  const [targetAudience, setTargetAudience] = useState<'all' | 'parents_students' | 'staff_teachers'>('all');
  const [title, setTitle] = useState('تعليق الدراسة الحضورية وتحويلها عن بُعد');
  const [customMessage, setCustomMessage] = useState(
    'نظراً لتقلبات الأحوال الجوية واستمرار الحالة المطرية وحرصاً على سلامة أبنائنا وبناتنا الطلاب، تقرر تعليق الدراسة الحضورية في المدرسة لهذا اليوم، وسيكون التعليم (عن بُعد) عبر منصة مدرستي.'
  );
  const [dismissalTime, setDismissalTime] = useState('11:30');
  const [isSending, setIsSending] = useState(false);
  const [successSent, setSuccessSent] = useState(false);

  if (!isOpen) return null;

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
    } catch {
      // Audio fallback
    }

    // Determine target roles
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
      onClose();
    }, 1800);
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
              <Megaphone className="w-6 h-6 animate-bounce" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-slate-900">إرسال تعميم / تنبيه طارئ فوري</h3>
                <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[10px] font-black border border-rose-200">
                  بث مباشر 🚨
                </span>
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

        {successSent ? (
          <div className="py-10 text-center space-y-3 animate-fadeIn">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-md">
              <CheckCircle className="w-10 h-10" />
            </div>
            <h4 className="text-lg font-black text-slate-900">تم إرسال التعميم الفوري بنجاح! 🚀</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              وصل التنبيه الآن إلى كافة أطراف المنظومة ({targetAudience === 'all' ? 'الطلاب، أولياء الأمور، المعلمون والموظفون' : targetAudience === 'parents_students' ? 'أولياء الأمور والطلاب' : 'الكادر التعليمي والإداري'}) وسيظهر في لوحاتهم الرئيسية فوراً.
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
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-slate-900 text-xs leading-relaxed focus:outline-rose-500"
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
      </div>
    </div>
  );
};
