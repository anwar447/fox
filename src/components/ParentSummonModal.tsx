import React, { useState, useMemo } from 'react';
import { User, School, ParentSummon } from '../types';
import { 
  addParentSummon, getParentSummonsForStudent, 
  updateParentSummon, deleteParentSummon, addSystemNotification 
} from '../utils/storage';
import { getTodayDateString } from '../utils/academic';
import { soundManager } from '../utils/audio';
import { 
  X, Phone, MessageSquare, Printer, CheckCircle2, 
  AlertTriangle, Calendar, Clock, MapPin, Send, 
  Trash2, UserCheck, ShieldAlert, Award, FileText,
  Search, Users, Building2, ExternalLink
} from 'lucide-react';

interface ParentSummonModalProps {
  isOpen: boolean;
  onClose: () => void;
  student?: User | null;
  allSchoolStudents?: User[];
  currentSchool: School;
  currentUser: User;
  onSummonCreated?: (summon: ParentSummon) => void;
}

const SUMMON_PRESETS = [
  {
    category: 'absence' as const,
    title: 'تكرار الغياب بدون عذر مقبول',
    details: 'نظراً لتجاوز نسبة الغياب المسموح بها وبدون تقديم أعذار رسمية معتمدة، يرجى الحضور لمناقشة وضع الطالب وتوقيع تعهد الانضباط وفق لائحة السلوك والمواظبة.',
  },
  {
    category: 'academic' as const,
    title: 'تدني المستوى الدراسي والتحصيلي',
    details: 'يرجى مراجعة إدارة المدرسة والتوجيه الطلابي لمناقشة نتائج الطالب والاطلاع على الخطة العلاجية المقترحة لرفع مستواه الأكاديمي.',
  },
  {
    category: 'behavior' as const,
    title: 'ملاحظة سلوكية وانضباطية تستدعي المتابعة',
    details: 'نظراً لصدور ملاحظات سلوكية متكررة داخل البيئة المدرسية، نأمل الحضور للتعاون مع التوجيه الطلابي في تعديل السلوك وتعزيز الانضباط.',
  },
  {
    category: 'tardiness' as const,
    title: 'تكرار التأخر الصباحي وتفويت الحصص الأولى',
    details: 'لوحظ تكرار تأخر الطالب عن الحضور في الموعد المحدد للطابور الصباحي، مما يؤثر على تحصيله العلمي في الحصص الأولى.',
  },
  {
    category: 'emergency' as const,
    title: 'أمر طارئ وعاجل يخص الطالب',
    details: 'نرجو من ولي الأمر التكرم بالحضور العاجل لإدارة المدرسة لأمر هام وخاص يستوجب المقابلة المباشرة.',
  },
];

export const ParentSummonModal: React.FC<ParentSummonModalProps> = ({
  isOpen,
  onClose,
  student: initialStudent,
  allSchoolStudents = [],
  currentSchool,
  currentUser,
  onSummonCreated,
}) => {
  // If no student is passed, allow selecting one from the school
  const [selectedStudentId, setSelectedStudentId] = useState<string>(initialStudent?.id || '');
  const [studentSearch, setStudentSearch] = useState('');

  // Active student object
  const targetStudent = useMemo(() => {
    if (initialStudent) return initialStudent;
    return allSchoolStudents.find((s) => s.id === selectedStudentId) || null;
  }, [initialStudent, allSchoolStudents, selectedStudentId]);

  // Filtered students list for dropdown search
  const filteredStudents = useMemo(() => {
    if (!studentSearch.trim()) return allSchoolStudents.slice(0, 30);
    const q = studentSearch.trim().toLowerCase();
    return allSchoolStudents.filter((s) => 
      s.name.toLowerCase().includes(q) ||
      (s.nationalId && s.nationalId.includes(q)) ||
      (s.className && s.className.toLowerCase().includes(q))
    ).slice(0, 30);
  }, [allSchoolStudents, studentSearch]);

  const today = getTodayDateString();
  const tomorrow = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  }, []);

  // Form State
  const [category, setCategory] = useState<'absence' | 'academic' | 'behavior' | 'tardiness' | 'emergency' | 'other'>('absence');
  const [reasonTitle, setReasonTitle] = useState(SUMMON_PRESETS[0].title);
  const [details, setDetails] = useState(SUMMON_PRESETS[0].details);
  const [appointmentDate, setAppointmentDate] = useState(tomorrow);
  const [appointmentTime, setAppointmentTime] = useState('09:30 ص');
  const [meetingPlace, setMeetingPlace] = useState('إدارة المدرسة / مكتب وكيل شؤون الطلاب');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'create' | 'history' | 'print'>('create');
  const [lastCreatedSummon, setLastCreatedSummon] = useState<ParentSummon | null>(null);

  // Student's summon history
  const [historyKey, setHistoryKey] = useState(0);
  const studentSummons = useMemo(() => {
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    historyKey;
    if (!targetStudent) return [];
    return getParentSummonsForStudent(targetStudent.id, targetStudent.nationalId);
  }, [targetStudent, historyKey]);

  if (!isOpen) return null;

  const handleSelectPreset = (preset: typeof SUMMON_PRESETS[0]) => {
    setCategory(preset.category);
    setReasonTitle(preset.title);
    setDetails(preset.details);
  };

  const handleCreateSummon = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetStudent) return;
    if (!reasonTitle.trim()) return;

    setIsSubmitting(true);
    try {
      const newSummon: ParentSummon = {
        id: `sum-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        studentId: targetStudent.id,
        studentName: targetStudent.name,
        studentNationalId: targetStudent.nationalId,
        schoolCode: currentSchool.code,
        className: targetStudent.className || 'عام',
        sectionName: targetStudent.sectionName || '1',
        parentPhone: targetStudent.parentPhone,
        reasonCategory: category,
        reasonTitle: reasonTitle.trim(),
        details: details.trim() || undefined,
        appointmentDate,
        appointmentTime,
        meetingPlace: meetingPlace.trim(),
        status: 'pending',
        issuedById: currentUser.id,
        issuedByName: currentUser.name,
        issuedByRole: currentUser.role || 'employee',
        createdAt: new Date().toISOString(),
      };

      addParentSummon(newSummon);

      // Send High-Priority System Notification for Student and Parent
      addSystemNotification({
        id: `notif-sum-${Date.now()}`,
        title: `🚨 إشعار استدعاء ولي أمر رسمي: ${targetStudent.name}`,
        message: `نأمل من المكرم ولي أمر الطالب (${targetStudent.name}) الحضور لإدارة المدرسة يوم (${appointmentDate}) الساعة (${appointmentTime}) لمناقشة موضوع: [${reasonTitle}]. مقر المقابلة: ${meetingPlace}.`,
        type: 'alert',
        priority: 'urgent',
        targetRole: 'all',
        schoolCode: currentSchool.code,
        createdAt: new Date().toISOString(),
        read: false,
      });

      soundManager.playWarning();
      setLastCreatedSummon(newSummon);
      setHistoryKey((k) => k + 1);
      if (onSummonCreated) onSummonCreated(newSummon);
      setActiveTab('print'); // Automatically offer to print or send via WhatsApp
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateStatus = (summon: ParentSummon, newStatus: 'pending' | 'attended' | 'cancelled') => {
    updateParentSummon({
      ...summon,
      status: newStatus,
      attendedAt: newStatus === 'attended' ? new Date().toISOString() : undefined,
    });
    setHistoryKey((k) => k + 1);
    soundManager.playSuccess();
  };

  const handleDelete = (id: string) => {
    if (window.confirm('هل أنت متأكد من حذف هذا الاستدعاء؟')) {
      deleteParentSummon(id);
      setHistoryKey((k) => k + 1);
      soundManager.playDismiss();
    }
  };

  // WhatsApp Message Generator
  const getWhatsAppLink = (summon: ParentSummon) => {
    if (!summon.parentPhone) return null;
    let phone = summon.parentPhone.replace(/[^0-9]/g, '');
    if (phone.startsWith('05')) {
      phone = '966' + phone.substring(1);
    } else if (phone.startsWith('5')) {
      phone = '966' + phone;
    }

    const message = `المكرم ولي أمر الطالب: *${summon.studentName}* المحترم\nالسلام عليكم ورحمة الله وبركاته،\n\nنأمل منكم التكرم بمراجعة إدارة *${currentSchool.name}* (${summon.meetingPlace})\n📅 في يوم: *${summon.appointmentDate}*\n⏰ في تمام الساعة: *${summon.appointmentTime}*\n\nوذلك لمناقشة الموضوع الهام التالي:\n📌 *${summon.reasonTitle}*\n${summon.details ? `📝 تفاصيل: ${summon.details}\n` : ''}\nشاكرين ومقدرين لكم كريم تعاونكم المستمر في مصلحة الطالب ومستقبله.\n\n— *إدارة المدرسة*`;
    return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
  };

  // Robust Printing Function with iframe isolation and fallback
  const handlePrintOfficialSummon = (summon: ParentSummon, forceNewWindow = false) => {
    soundManager.playBeep();

    const printableHtml = `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="utf-8" />
        <title>إشعار استدعاء رسمي - ${summon.studentName}</title>
        <style>
          @page {
            size: A4 portrait;
            margin: 14mm 16mm;
          }
          * { box-sizing: border-box; }
          body {
            font-family: 'Tajawal', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            direction: rtl;
            margin: 0;
            padding: 16px;
            color: #0f172a;
            background: #ffffff;
            line-height: 1.6;
            font-size: 13pt;
          }
          .sheet-frame {
            border: 2.5px solid #0f172a;
            border-radius: 12px;
            padding: 24px 28px;
            background: #ffffff;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 2px solid #0f172a;
            padding-bottom: 16px;
            margin-bottom: 20px;
          }
          .header-col {
            font-size: 11pt;
            font-weight: bold;
            line-height: 1.5;
          }
          .header-right { text-align: right; }
          .header-center { text-align: center; }
          .header-left { text-align: left; font-family: monospace; }
          .emblem { font-size: 26pt; line-height: 1; }
          .title {
            text-align: center;
            font-size: 17pt;
            font-weight: 900;
            margin: 10px 0 18px;
            text-decoration: underline;
            text-underline-offset: 6px;
          }
          .salutation {
            font-size: 13pt;
            font-weight: bold;
            margin-bottom: 12px;
          }
          .student-badge {
            display: inline-block;
            background: #f1f5f9;
            border: 1px solid #cbd5e1;
            padding: 2px 10px;
            border-radius: 6px;
            font-weight: 900;
            font-size: 14pt;
          }
          .greeting { font-size: 12pt; margin-bottom: 12px; }
          .intro {
            text-align: justify;
            font-size: 12pt;
            line-height: 1.8;
            margin-bottom: 16px;
          }
          .table-box {
            background: #f8fafc;
            border: 1px solid #cbd5e1;
            border-radius: 8px;
            padding: 12px 16px;
            margin-bottom: 16px;
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 8px 16px;
            font-size: 11.5pt;
          }
          .table-box div { line-height: 1.6; }
          .full-col { grid-column: span 2; }
          .reason-box {
            background: #fff1f2;
            border: 1px solid #fecdd3;
            border-right: 5px solid #e11d48;
            border-radius: 8px;
            padding: 12px 16px;
            margin-bottom: 18px;
          }
          .reason-title {
            font-weight: 900;
            color: #881337;
            font-size: 12.5pt;
            margin-bottom: 4px;
          }
          .reason-desc {
            color: #4c0519;
            font-size: 11pt;
            line-height: 1.6;
          }
          .pledge-text {
            font-size: 11.5pt;
            text-align: justify;
            margin-bottom: 30px;
            line-height: 1.7;
          }
          .signatures {
            margin-top: 25px;
            display: flex;
            justify-content: space-between;
            text-align: center;
            font-size: 11pt;
            font-weight: bold;
          }
          .sig-item { min-width: 140px; }
          .sig-space { height: 45px; }
          .footer {
            margin-top: 25px;
            border-top: 1px dashed #94a3b8;
            padding-top: 10px;
            display: flex;
            justify-content: space-between;
            font-size: 9.5pt;
            color: #64748b;
          }
        </style>
      </head>
      <body>
        <div class="sheet-frame">
          <div class="header">
            <div class="header-col header-right">
              المملكة العربية السعودية<br/>
              وزارة التعليم<br/>
              إدارة التعليم بالمنطقة<br/>
              مدرسة: <strong>${currentSchool.name}</strong>
            </div>
            <div class="header-col header-center">
              <div class="emblem">🏫</div>
              <div style="font-size: 10pt; color: #334155; margin-top: 4px;">كود المدرسة: ${currentSchool.code}</div>
            </div>
            <div class="header-col header-left">
              الرقم: ${summon.id.substring(4, 12).toUpperCase()}<br/>
              التاريخ: ${today}<br/>
              المرفقات: لا يوجد
            </div>
          </div>

          <div class="title">إشعار استدعاء رسمي لولي أمر طالب</div>

          <div class="salutation">
            المكرم ولي أمر الطالب: <span class="student-badge">${summon.studentName}</span> المحترم
          </div>

          <div class="greeting">السلام عليكم ورحمة الله وبركاته، أما بعد:</div>

          <div class="intro">
            انطلاقاً من حرص إدارة المدرسة على مصلحة ابنكم ومستقبله التعليمي والسلوكي، وتعزيزاً للشراكة المستمرة بين البيت والمدرسة، نأمل منكم التكرم بمراجعة إدارة المدرسة في الموعد والمقر المحددين أدناه:
          </div>

          <div class="table-box">
            <div>📌 <strong>الصف والشعبة:</strong> ${summon.className} (شعبة ${summon.sectionName || '1'})</div>
            <div>🆔 <strong>السجل المدني:</strong> <span style="font-family: monospace; font-weight: bold;">${summon.studentNationalId || '—'}</span></div>
            <div>📅 <strong>موعد الحضور:</strong> يوم <strong style="font-weight: 900;">${summon.appointmentDate}</strong></div>
            <div>⏰ <strong>الساعة:</strong> <strong style="font-weight: 900;">${summon.appointmentTime}</strong></div>
            <div class="full-col">🏢 <strong>مقر المقابلة:</strong> ${summon.meetingPlace}</div>
          </div>

          <div class="reason-box">
            <div class="reason-title">سبب الاستدعاء: ${summon.reasonTitle}</div>
            ${summon.details ? `<div class="reason-desc">${summon.details}</div>` : ''}
          </div>

          <div class="pledge-text">
            نأمل منكم التقيد بالموعد المحدد لما في ذلك من أهمية بالغة تصب في مصلحة الطالب ومسيرته التعليمية وفق لائحة السلوك والمواظبة المعتمدة من وزارة التعليم.
          </div>

          <div class="signatures">
            <div class="sig-item">
              <div>وكيل شؤون الطلاب / الموجه الطلابي</div>
              <div class="sig-space"></div>
              <div>........................................</div>
            </div>
            <div class="sig-item">
              <div>مدير / مديرة المدرسة</div>
              <div class="sig-space"></div>
              <div>${currentUser.staffTitle === 'principal' ? currentUser.name : 'ختم وتوقيع الإدارة'}</div>
            </div>
            <div class="sig-item">
              <div>توقيع ولي الأمر بالعلم والحضور</div>
              <div class="sig-space"></div>
              <div>........................................</div>
            </div>
          </div>

          <div class="footer">
            <span>منظومة حُضُورَكْ الذكية — نظام الإدارة المدرسية الموحد</span>
            <span>تم التحرير بواسطة: ${summon.issuedByName} (${summon.issuedByRole})</span>
          </div>
        </div>
      </body>
      </html>
    `;

    if (forceNewWindow) {
      try {
        const pWin = window.open('', '_blank');
        if (pWin) {
          pWin.document.write(printableHtml);
          pWin.document.close();
          setTimeout(() => {
            pWin.focus();
            pWin.print();
          }, 350);
          return;
        }
      } catch {}
    }

    // Attempt 1: Print via hidden iframe (works everywhere inside iframe & container without popup blocker!)
    try {
      let iframe = document.getElementById('print-summon-iframe') as HTMLIFrameElement;
      if (!iframe) {
        iframe = document.createElement('iframe');
        iframe.id = 'print-summon-iframe';
        iframe.style.position = 'fixed';
        iframe.style.right = '0';
        iframe.style.bottom = '0';
        iframe.style.width = '0';
        iframe.style.height = '0';
        iframe.style.border = 'none';
        document.body.appendChild(iframe);
      }
      const iframeDoc = iframe.contentWindow?.document || iframe.contentDocument;
      if (iframeDoc) {
        iframeDoc.open();
        iframeDoc.write(printableHtml);
        iframeDoc.close();
        setTimeout(() => {
          try {
            iframe.contentWindow?.focus();
            iframe.contentWindow?.print();
          } catch {
            window.print();
          }
        }, 300);
        return;
      }
    } catch (err) {
      console.warn('Iframe print error, falling back to window.open/print', err);
    }

    // Attempt 2: Popup fallback
    try {
      const pWin = window.open('', '_blank');
      if (pWin) {
        pWin.document.write(printableHtml);
        pWin.document.close();
        setTimeout(() => {
          pWin.focus();
          pWin.print();
        }, 350);
        return;
      }
    } catch {}

    // Fallback: direct window.print()
    window.print();
  };

  const summonToPrint = lastCreatedSummon || studentSummons[0] || null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/75 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto animate-fadeIn" dir="rtl">
      <div className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Modal Header */}
        <div className="no-print p-4 sm:p-5 bg-gradient-to-l from-rose-900 via-rose-850 to-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white/10 text-rose-300 border border-white/10 flex items-center justify-center shrink-0 shadow-inner">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-base sm:text-lg">استدعاء ولي أمر رسمي ✉️</h3>
                <span className="px-2.5 py-0.5 rounded-full bg-rose-500/30 text-rose-200 text-xs font-bold border border-rose-400/30">
                  إجراء إداري معتمد
                </span>
              </div>
              <p className="text-xs text-rose-200/80 mt-0.5">
                إصدار خطاب استدعاء رسمي، إشعار فوري لولي الأمر، ورسالة واتساب وطباعة معتمدة
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sub-Navigation Tabs */}
        <div className="no-print bg-slate-100 p-2 border-b border-slate-200 flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-1.5 overflow-x-auto">
            <button
              onClick={() => setActiveTab('create')}
              className={`px-3.5 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'create'
                  ? 'bg-white text-rose-900 shadow-xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <Send className="w-3.5 h-3.5 text-rose-600" />
              <span>تحرير استدعاء جديد</span>
            </button>

            {summonToPrint && (
              <button
                onClick={() => setActiveTab('print')}
                className={`px-3.5 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === 'print'
                    ? 'bg-white text-indigo-900 shadow-xs border border-slate-200'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                }`}
              >
                <Printer className="w-3.5 h-3.5 text-indigo-600" />
                <span>معاينة وطباعة الخطاب المعتمد 🖨️</span>
              </button>
            )}

            <button
              onClick={() => setActiveTab('history')}
              className={`px-3.5 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'history'
                  ? 'bg-white text-amber-900 shadow-xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <FileText className="w-3.5 h-3.5 text-amber-600" />
              <span>سجل الاستدعاءات ({studentSummons.length})</span>
            </button>
          </div>

          {targetStudent && (
            <div className="hidden sm:flex items-center gap-2 text-xs bg-white px-2.5 py-1 rounded-xl border border-slate-200 text-slate-700">
              <span className="font-bold text-slate-900">{targetStudent.name}</span>
              <span className="text-slate-400">|</span>
              <span className="text-slate-500 font-mono text-[11px]">{targetStudent.className}</span>
            </div>
          )}
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-6">
          
          {/* TAB 1: CREATE SUMMON */}
          {activeTab === 'create' && (
            <form onSubmit={handleCreateSummon} className="space-y-5">
              
              {/* If no student was pre-selected, allow picking any student */}
              {!initialStudent && (
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2.5">
                  <label className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-rose-600" />
                    <span>اختر الطالب المراد استدعاء ولي أمره:</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="ابحث باسم الطالب أو سجله المدني أو فصله..."
                      value={studentSearch}
                      onChange={(e) => setStudentSearch(e.target.value)}
                      className="w-full text-xs p-2.5 pl-8 rounded-xl border border-slate-300 bg-white text-slate-800 focus:outline-rose-600"
                    />
                    <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" />
                  </div>

                  <div className="max-h-36 overflow-y-auto border border-slate-200 rounded-xl bg-white divide-y divide-slate-100">
                    {filteredStudents.length === 0 ? (
                      <div className="p-3 text-center text-xs text-slate-400">لا يوجد طلاب مطابقين للبحث</div>
                    ) : (
                      filteredStudents.map((s) => (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => {
                            setSelectedStudentId(s.id);
                            setStudentSearch(s.name);
                          }}
                          className={`w-full p-2.5 text-right text-xs flex items-center justify-between cursor-pointer hover:bg-slate-50 ${
                            selectedStudentId === s.id ? 'bg-rose-50 font-black text-rose-900' : 'text-slate-700'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-bold">{s.name}</span>
                            <span className="text-[11px] text-slate-400">({s.className} - {s.sectionName || '1'})</span>
                          </div>
                          <span className="font-mono text-[11px] text-slate-500">{s.nationalId}</span>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* Selected Student Card */}
              {targetStudent ? (
                <div className="bg-gradient-to-r from-rose-50 via-slate-50 to-amber-50 border border-rose-200 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-rose-600 text-white flex items-center justify-center font-black text-base shadow-sm">
                      {targetStudent.name.charAt(0)}
                    </div>
                    <div>
                      <h4 className="font-black text-sm text-slate-900">{targetStudent.name}</h4>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600 mt-0.5">
                        <span>السجل: <strong className="font-mono text-slate-800">{targetStudent.nationalId || '—'}</strong></span>
                        <span>•</span>
                        <span>الصف: <strong>{targetStudent.className}</strong> (شعبة {targetStudent.sectionName || '1'})</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {targetStudent.parentPhone ? (
                      <div className="flex items-center gap-1 text-xs bg-white px-3 py-1.5 rounded-xl border border-slate-200 font-bold">
                        <Phone className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="font-mono text-slate-800">{targetStudent.parentPhone}</span>
                        <a
                          href={`tel:${targetStudent.parentPhone}`}
                          className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
                          title="اتصال مباشر"
                        >
                          <Phone className="w-3 h-3" />
                        </a>
                      </div>
                    ) : (
                      <span className="text-xs text-rose-600 font-bold bg-rose-100/70 px-2.5 py-1 rounded-lg">
                        ⚠️ رقم ولي الأمر غير مسجل
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900 font-bold text-center">
                  ⚠️ يرجى تحديد الطالب أولاً للمتابعة في إجراء الاستدعاء.
                </div>
              )}

              {/* Reason Presets */}
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-700 flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-indigo-600" />
                  <span>نماذج وأسباب الاستدعاء الشائعة (اختر للتعبئة التلقائية):</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {SUMMON_PRESETS.map((p, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSelectPreset(p)}
                      className={`p-2.5 rounded-xl border text-right text-xs transition-all cursor-pointer ${
                        reasonTitle === p.title
                          ? 'border-rose-500 bg-rose-50/70 text-rose-900 font-bold shadow-xs'
                          : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <div className="font-bold">{p.title}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5 line-clamp-1">{p.details}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Reason Title */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-rose-600" />
                  <span>موضوع وسبب الاستدعاء:</span>
                </label>
                <input
                  type="text"
                  required
                  value={reasonTitle}
                  onChange={(e) => setReasonTitle(e.target.value)}
                  placeholder="مثال: تكرار الغياب بدون عذر وتدني درجات المواظبة..."
                  className="w-full text-xs p-3 rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-rose-600 font-bold"
                />
              </div>

              {/* Details & Directives */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <span>تفاصيل وملاحظات الإدارة لولي الأمر:</span>
                </label>
                <textarea
                  rows={3}
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  placeholder="تفاصيل المخالفة أو الموضوع المراد مناقشته..."
                  className="w-full text-xs p-3 rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-rose-600 leading-relaxed"
                />
              </div>

              {/* Appointment Date, Time & Meeting Place */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                    <span>تاريخ المراجعة المطلوب:</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={appointmentDate}
                    onChange={(e) => setAppointmentDate(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 font-bold focus:outline-rose-600"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-amber-600" />
                    <span>وقت الحضور:</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={appointmentTime}
                    onChange={(e) => setAppointmentTime(e.target.value)}
                    placeholder="مثال: 09:30 ص أو بعد الفسحة"
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 font-bold focus:outline-rose-600"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                    <span>مقر الاستقبال:</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={meetingPlace}
                    onChange={(e) => setMeetingPlace(e.target.value)}
                    placeholder="مكتب الإدارة / وكيل الطلاب"
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 font-bold focus:outline-rose-600"
                  />
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="pt-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
                <p className="text-[11px] text-slate-500 font-medium">
                  سيتم حفظ الاستدعاء في ملف الطالب وإرسال إشعار فوري لولي الأمر عبر المنظومة.
                </p>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || !targetStudent}
                    className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs flex items-center gap-2 shadow-md shadow-rose-600/20 cursor-pointer disabled:opacity-50"
                  >
                    <Send className="w-4 h-4" />
                    <span>إصدار الاستدعاء واعتماده رسمي ✉️</span>
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* TAB 2: PRINT OFFICIAL SUMMONS LETTER */}
          {activeTab === 'print' && summonToPrint && (
            <div className="space-y-5">
              
              {/* Quick Communication Toolbar (WhatsApp, Call, Print) */}
              <div className="no-print bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-700">إجراءات التواصل الفورية:</span>
                  {summonToPrint.parentPhone && (
                    <a
                      href={getWhatsAppLink(summonToPrint) || '#'}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all"
                    >
                      <MessageSquare className="w-4 h-4" />
                      <span>إرسال عبر واتساب (WhatsApp) 💬</span>
                    </a>
                  )}

                  {summonToPrint.parentPhone && (
                    <a
                      href={`tel:${summonToPrint.parentPhone}`}
                      className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 font-bold text-xs flex items-center gap-1.5 shadow-2xs"
                    >
                      <Phone className="w-4 h-4 text-emerald-600" />
                      <span>اتصال هاتفي بولي الأمر</span>
                    </a>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handlePrintOfficialSummon(summonToPrint, false)}
                    className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-black text-xs flex items-center gap-2 shadow-md cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98]"
                    title="بدء طباعة الخطاب الرسمي فوراً بأعلى دقة"
                  >
                    <Printer className="w-4 h-4 text-amber-400" />
                    <span>طباعة الخطاب الرسمي 🖨️</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handlePrintOfficialSummon(summonToPrint, true)}
                    className="px-3 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-bold text-xs flex items-center gap-1.5 shadow-2xs cursor-pointer transition-colors"
                    title="فتح الخطاب في نافذة مستقلة للطباعة أو التنزيل كملف PDF"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-indigo-600" />
                    <span>نافذة مستقلة / PDF ↗</span>
                  </button>
                </div>
              </div>

              {/* Printable Official Ministry Summons Sheet */}
              <div className="print-area bg-white border-2 border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6 text-slate-900 font-serif leading-relaxed shadow-sm">
                
                {/* Official Kingdom Header */}
                <div className="flex items-center justify-between border-b-2 border-slate-800 pb-4 text-center">
                  <div className="text-right text-xs font-bold space-y-1">
                    <div>المملكة العربية السعودية</div>
                    <div>وزارة التعليم</div>
                    <div>إدارة التعليم بالمنطقة</div>
                    <div>مدرسة: <strong>{currentSchool.name}</strong></div>
                  </div>

                  <div className="flex flex-col items-center justify-center">
                    <Building2 className="w-10 h-10 text-slate-800 stroke-[1.5]" />
                    <span className="text-[11px] font-bold mt-1">كود المدرسة: {currentSchool.code}</span>
                  </div>

                  <div className="text-left text-xs font-bold space-y-1 font-mono">
                    <div>الرقم: {summonToPrint.id.substring(4, 12).toUpperCase()}</div>
                    <div>التاريخ: {today}</div>
                    <div>المرفقات: لا يوجد</div>
                  </div>
                </div>

                {/* Title */}
                <div className="text-center space-y-1">
                  <h2 className="text-xl font-black underline underline-offset-8">
                    إشعار استدعاء ولي أمر طالب (رسمي)
                  </h2>
                </div>

                {/* Salutation */}
                <div className="text-sm font-bold pt-2">
                  المكرم ولي أمر الطالب: <span className="font-black text-base px-2 py-0.5 bg-slate-100 rounded border border-slate-300">{summonToPrint.studentName}</span> المحترم
                </div>

                <div className="text-xs text-slate-700">
                  السلام عليكم ورحمة الله وبركاته، أما بعد:
                </div>

                {/* Letter Body */}
                <div className="text-xs sm:text-sm space-y-3 leading-loose text-justify">
                  <p>
                    انطلاقاً من حرص إدارة المدرسة على مصلحة ابنكم ومستقبله التعليمي والسلوكي، وتعزيزاً للتعاون المستمر بين البيت والمدرسة، نود إحاطتكم بضرورة التكرم بمراجعة إدارة المدرسة في الموعد والمقر المحددين أدناه:
                  </p>

                  <div className="bg-slate-50 border border-slate-300 p-4 rounded-xl space-y-2 text-xs">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>📌 <strong>الصف والشعبة:</strong> {summonToPrint.className} (شعبة {summonToPrint.sectionName || '1'})</div>
                      <div>🆔 <strong>السجل المدني:</strong> <span className="font-mono font-bold">{summonToPrint.studentNationalId || '—'}</span></div>
                      <div>📅 <strong>موعد الحضور:</strong> يوم <strong className="font-black">{summonToPrint.appointmentDate}</strong></div>
                      <div>⏰ <strong>الساعة:</strong> <strong className="font-black">{summonToPrint.appointmentTime}</strong></div>
                      <div className="sm:col-span-2">🏢 <strong>مقر المقابلة:</strong> {summonToPrint.meetingPlace}</div>
                    </div>
                  </div>

                  <div className="p-3 bg-rose-50 border border-rose-300 rounded-xl space-y-1">
                    <div className="font-bold text-rose-950 text-xs sm:text-sm">
                      سبب الاستدعاء: {summonToPrint.reasonTitle}
                    </div>
                    {summonToPrint.details && (
                      <p className="text-rose-900 text-xs">
                        {summonToPrint.details}
                      </p>
                    )}
                  </div>

                  <p className="text-xs">
                    نأمل منكم التقيد بالموعد المحدد لما في ذلك من أهمية بالغة تصب في مصلحة الطالب ومسيرته التعليمية وفق لائحة السلوك والمواظبة المعتمدة من وزارة التعليم.
                  </p>
                </div>

                {/* Signatures and Endorsement */}
                <div className="pt-6 grid grid-cols-2 sm:grid-cols-3 gap-6 text-center text-xs font-bold">
                  <div className="space-y-8">
                    <div>وكيل شؤون الطلاب / المرشد الطلابي</div>
                    <div className="text-slate-400 font-serif">............................</div>
                  </div>
                  <div className="space-y-8">
                    <div>مدير / مديرة المدرسة</div>
                    <div className="text-slate-800 font-black">
                      {currentUser.staffTitle === 'principal' ? currentUser.name : 'ختم وتوقيع الإدارة'}
                    </div>
                  </div>
                  <div className="space-y-8 col-span-2 sm:col-span-1 border-t sm:border-t-0 pt-4 sm:pt-0">
                    <div>توقيع ولي الأمر بالعلم والحضور</div>
                    <div className="text-slate-400 font-serif">............................</div>
                  </div>
                </div>

                {/* Footer Stamp Box */}
                <div className="border-t border-slate-300 pt-3 flex items-center justify-between text-[10px] text-slate-500">
                  <span>منظومة حُضُورَكْ الذكية — نظام الإدارة المدرسية الموحد</span>
                  <span>تم التحرير بواسطة: {summonToPrint.issuedByName} ({summonToPrint.issuedByRole})</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: SUMMONS HISTORY FOR STUDENT */}
          {activeTab === 'history' && (
            <div className="space-y-3">
              {studentSummons.length === 0 ? (
                <div className="text-center py-10 text-slate-400 text-xs bg-slate-50 rounded-2xl">
                  لا توجد استدعاءات سابقة مسجلة لهذا الطالب.
                </div>
              ) : (
                studentSummons.map((s) => (
                  <div
                    key={s.id}
                    className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                          s.status === 'attended'
                            ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                            : s.status === 'cancelled'
                            ? 'bg-slate-200 text-slate-700 border-slate-300'
                            : 'bg-rose-100 text-rose-900 border-rose-300 animate-pulse'
                        }`}>
                          {s.status === 'attended' ? '✓ حضر ولي الأمر' : s.status === 'cancelled' ? 'ملغي' : '⏳ قيد الانتظار'}
                        </span>
                        <strong className="text-slate-900 text-sm">{s.reasonTitle}</strong>
                      </div>

                      <div className="flex items-center gap-1.5 text-xs">
                        <button
                          type="button"
                          onClick={() => handlePrintOfficialSummon(s, false)}
                          className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                          title="طباعة الخطاب مباشرة"
                        >
                          <Printer className="w-3.5 h-3.5 text-amber-400" />
                          <span>طباعة 🖨️</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setLastCreatedSummon(s);
                            setActiveTab('print');
                          }}
                          className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>معاينة وتواصل</span>
                        </button>

                        {s.status === 'pending' && (
                          <button
                            type="button"
                            onClick={() => handleUpdateStatus(s, 'attended')}
                            className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center gap-1 cursor-pointer"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>تأكيد الحضور ✓</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleDelete(s.id)}
                          className="p-1.5 text-rose-600 hover:bg-rose-100 rounded-lg cursor-pointer"
                          title="حذف الاستدعاء"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <p className="text-xs text-slate-600 leading-relaxed">
                      {s.details || 'لا توجد تفاصيل إضافية'}
                    </p>

                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 pt-2 border-t border-slate-200 font-mono">
                      <span>📅 الموعد: <strong>{s.appointmentDate}</strong> ({s.appointmentTime})</span>
                      <span>🏢 المقر: {s.meetingPlace}</span>
                      <span>بواسطة: {s.issuedByName}</span>
                      <span>في: {new Date(s.createdAt).toLocaleDateString('ar-SA')}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
