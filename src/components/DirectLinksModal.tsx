import React, { useState } from 'react';
import { School } from '../types';
import {
  X,
  Copy,
  Check,
  Share2,
  ExternalLink,
  GraduationCap,
  Users,
  Building2,
  UserCheck,
  UserPlus,
  ShieldCheck,
  Layers,
  FileSpreadsheet,
} from 'lucide-react';

interface DirectLinksModalProps {
  isOpen: boolean;
  onClose: () => void;
  schools: School[];
  currentSchool: School | null;
  onSelectSchool?: (school: School) => void;
}

export const DirectLinksModal: React.FC<DirectLinksModalProps> = ({
  isOpen,
  onClose,
  schools,
  currentSchool,
  onSelectSchool,
}) => {
  const [selectedSchoolCode, setSelectedSchoolCode] = useState(
    currentSchool?.code || schools[0]?.code || ''
  );
  const [copiedId, setCopiedId] = useState<string | null>(null);

  if (!isOpen) return null;

  const targetSchool =
    schools.find((s) => s.code?.toUpperCase() === selectedSchoolCode.toUpperCase()) ||
    currentSchool ||
    schools[0];

  const baseUrl = window.location.origin + window.location.pathname;

  const links = [
    {
      id: 'teacher',
      title: 'بوابة المعلمين والتحضير الفصلي 👨‍🏫',
      description: 'رابط مباشر للمعلمين لتسجيل الدخول الفوري، تحضير الحصص، ورصد الطلاب.',
      url: `${baseUrl}?portal=teacher&school=${targetSchool?.code || ''}`,
      icon: GraduationCap,
      color: 'from-indigo-600 to-blue-600',
      badge: 'خاص بالمعلمين',
    },
    {
      id: 'parent',
      title: 'بوابة أولياء الأمور ومتابعة الأبناء 👨‍👧‍👦',
      description: 'رابط مباشر لأولياء الأمور لمتابعة سجل الحضور، الاستئذان، وإشعارات الغياب.',
      url: `${baseUrl}?portal=parent&school=${targetSchool?.code || ''}`,
      icon: Users,
      color: 'from-teal-600 to-emerald-600',
      badge: 'خاص بأولياء الأمور',
    },
    {
      id: 'student',
      title: 'بوابة الطلاب للاستعلام والمتابعة 🎓',
      description: 'رابط مباشر للطلاب للتحقق من كشف الحضور، السجل اليومي، وبيانات الفصل.',
      url: `${baseUrl}?portal=student&school=${targetSchool?.code || ''}`,
      icon: UserCheck,
      color: 'from-cyan-600 to-blue-500',
      badge: 'خاص بالطلاب',
    },
    {
      id: 'admin',
      title: 'لوحة الإدارة المدرسية والإشراف 🏢',
      description: 'رابط مباشر لمدير المدرسة، الوكيل، والمساعدين الإداريين.',
      url: `${baseUrl}?portal=admin&school=${targetSchool?.code || ''}`,
      icon: ShieldCheck,
      color: 'from-emerald-700 to-teal-700',
      badge: 'خاص بالإدارة',
    },
    {
      id: 'reg-staff',
      title: 'رابط التسجيل الذاتي للمعلمين والكوادر ✍️',
      description: 'أرسل هذا الرابط للمعلمين الجدد للانضمام للمدرسة واختيار الفصول المسندة.',
      url: `${baseUrl}?joinStaff=${encodeURIComponent(targetSchool?.code || '')}&action=register-staff&school=${encodeURIComponent(targetSchool?.code || '')}`,
      icon: UserPlus,
      color: 'from-purple-600 to-indigo-600',
      badge: 'تسجيل المعلمين',
    },
    {
      id: 'reg-parent',
      title: 'رابط تسجيل الطلاب وربط أولياء الأمور 📝',
      description: 'أرسل هذا الرابط للطلاب وأولياء الأمور للتسجيل وربط الأبناء تلقائياً.',
      url: `${baseUrl}?joinSchool=${encodeURIComponent(targetSchool?.code || '')}&action=register-parent&school=${encodeURIComponent(targetSchool?.code || '')}`,
      icon: Users,
      color: 'from-amber-600 to-orange-600',
      badge: 'تسجيل الطلاب والأبناء',
    },
    {
      id: 'roster-manager',
      title: 'رابط كشوفات الطلاب ونقلهم والطباعة 📋🖨️',
      description: 'رابط مباشر لكشوفات الطلاب وأسمائهم حسب الفصول والشعب ونقلهم والطباعة الرسمية.',
      url: `${baseUrl}?portal=admin&school=${encodeURIComponent(targetSchool?.code || '')}&action=roster`,
      icon: FileSpreadsheet,
      color: 'from-slate-800 to-slate-900',
      badge: 'كشوفات الطلاب والطباعة',
    },
    {
      id: 'classes-manager',
      title: 'رابط تعديل وهيكلة الصفوف والشعب 🏫',
      description: 'رابط مباشر لتعديل مسميات الصفوف وحذف وإضافة الشعب المدرسية.',
      url: `${baseUrl}?portal=admin&school=${encodeURIComponent(targetSchool?.code || '')}&action=classes`,
      icon: Layers,
      color: 'from-amber-500 to-amber-600',
      badge: 'هيكلة الصفوف والشعب',
    },
  ];

  const handleCopy = (id: string, url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleShareWhatsapp = (title: string, url: string) => {
    const text = `السلام عليكم ورحمة الله وبركاته،\nرابط ${title} في (${targetSchool?.name || 'المنصة'}):\n${url}`;
    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(waUrl, '_blank');
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
      dir="rtl"
    >
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-700 via-teal-700 to-emerald-800 p-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/10 rounded-2xl backdrop-blur-md">
              <Share2 className="w-6 h-6 text-emerald-200" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-wide">روابط الدخول والمشاركة الذكية 🔗</h2>
              <p className="text-xs text-emerald-100 mt-0.5">
                روابط مخصصة لكل فئة تفصل المعلمين عن أولياء الأمور وتمنع تداخل المدارس
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

        {/* School Selector Bar */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-emerald-700" />
            <span className="text-xs font-bold text-slate-700">توليد الروابط للمدرسة:</span>
          </div>
          <select
            value={targetSchool?.code || ''}
            onChange={(e) => {
              setSelectedSchoolCode(e.target.value);
              const found = schools.find((s) => s.code === e.target.value);
              if (found && onSelectSchool) onSelectSchool(found);
            }}
            className="bg-white border border-slate-300 text-slate-800 text-xs font-bold rounded-xl px-3 py-1.5 focus:outline-emerald-600 shadow-2xs cursor-pointer"
          >
            {schools.map((sch) => (
              <option key={sch.id} value={sch.code}>
                {sch.name} ({sch.code}) {sch.type === 'secondary' ? '— ثانوي' : sch.type === 'middle' ? '— متوسط' : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Links List */}
        <div className="p-5 overflow-y-auto space-y-3.5 divide-y divide-slate-100">
          {links.map((item) => {
            const Icon = item.icon;
            const isCopied = copiedId === item.id;
            return (
              <div
                key={item.id}
                className="pt-3.5 first:pt-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl hover:bg-slate-50/80 transition-colors border border-slate-100 hover:border-slate-200"
              >
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div
                    className={`w-10 h-10 rounded-2xl bg-gradient-to-tr ${item.color} flex items-center justify-center text-white shrink-0 shadow-xs mt-0.5`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-bold text-slate-900">{item.title}</h3>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                        {item.badge}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                      {item.description}
                    </p>
                    <div className="mt-1.5 flex items-center gap-1.5 text-[11px] font-mono text-emerald-800 bg-emerald-50/80 px-2 py-1 rounded-lg border border-emerald-100 truncate">
                      <span className="truncate select-all">{item.url}</span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  <button
                    onClick={() => handleCopy(item.id, item.url)}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      isCopied
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                    title="نسخ الرابط إلى الحافظة"
                  >
                    {isCopied ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>تم النسخ!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>نسخ</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => handleShareWhatsapp(item.title, item.url)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 transition-colors cursor-pointer"
                    title="مشاركة عبر واتساب"
                  >
                    <Share2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="hidden sm:inline">واتساب</span>
                  </button>

                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors cursor-pointer"
                    title="فتح الرابط في نافذة جديدة"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>💡 نصيحة: روابط المعلم وولي الأمر تفصل المهام وتمنع تداخل المدارس تلقائياً.</span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold transition-colors cursor-pointer"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
