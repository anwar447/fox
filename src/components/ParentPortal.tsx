import React, { useState } from 'react';
import { User, School, Attendance, Excuse } from '../types';
import { formatReadableClass, getArabicFormattedDate, getTodayDateString } from '../utils/academic';
import { calculateStudentBehaviorScore } from '../utils/storage';
import { StudentDossierModal } from './StudentDossierModal';
import { 
  Users, 
  UserPlus, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  AlertTriangle, 
  MessageSquare, 
  Building2, 
  Send, 
  Calendar, 
  Check, 
  Sparkles, 
  Search, 
  Bell, 
  FileText, 
  Eye, 
  GraduationCap,
  ShieldAlert
} from 'lucide-react';

interface ParentPortalProps {
  currentUser: User;
  schools: School[];
  users: User[];
  attendances: Attendance[];
  excuses: Excuse[];
  onLinkChild: (childNationalId: string) => boolean;
  onSendParentNote: (studentId: string, studentName: string, nationalId: string, schoolCode: string, note: string) => void;
}

export const ParentPortal: React.FC<ParentPortalProps> = ({
  currentUser,
  schools,
  users,
  attendances,
  excuses,
  onLinkChild,
  onSendParentNote,
}) => {
  const [newChildId, setNewChildId] = useState('');
  const [linkError, setLinkError] = useState('');
  const [linkSuccess, setLinkSuccess] = useState('');
  const [parentNotes, setParentNotes] = useState<Record<string, string>>({});
  const [sentNoteSuccess, setSentNoteSuccess] = useState<string | null>(null);
  const [selectedDossierChild, setSelectedDossierChild] = useState<User | null>(null);

  const today = getTodayDateString();
  const dateInfo = getArabicFormattedDate(today);

  // Get all linked children
  const linkedIds = currentUser.childrenNationalIds || ['2497120754', '1169016985'];
  const childrenUsers = users.filter((u) => u.role === 'student' && linkedIds.includes(u.nationalId));

  const handleAddChild = (e: React.FormEvent) => {
    e.preventDefault();
    setLinkError('');
    setLinkSuccess('');

    const cleanId = newChildId.trim();
    if (!cleanId) return;

    if (linkedIds.includes(cleanId)) {
      setLinkError('هذا الطالب مضاف مسبقاً في حسابك');
      return;
    }

    const found = users.find((u) => u.role === 'student' && u.nationalId === cleanId);
    if (!found) {
      setLinkError('لم يتم العثور على طالب برقم الهوية المدخل في قاعدة بيانات المدارس');
      return;
    }

    const success = onLinkChild(cleanId);
    if (success) {
      setLinkSuccess(`تم ربط الابن (${found.name}) بنجاح.`);
      setNewChildId('');
    }
  };

  const handleSendNote = (child: User) => {
    const note = parentNotes[child.id]?.trim();
    if (!note) return;

    onSendParentNote(child.id, child.name, child.nationalId, child.schoolCode, note);
    setSentNoteSuccess(child.id);
    setParentNotes((prev) => ({ ...prev, [child.id]: '' }));

    setTimeout(() => {
      setSentNoteSuccess(null);
    }, 3000);
  };

  // Check if any son is absent today for pop-up alert
  const absentChildren = childrenUsers.filter((child) => {
    const att = attendances.find((a) => a.studentId === child.id && a.date === today);
    return att?.finalStatus === 'absent';
  });

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      
      {/* Top Banner */}
      <div className="bg-gradient-to-br from-teal-800 via-emerald-900 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-lg space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/20 border border-teal-400/30 text-teal-200 text-xs font-bold">
              <Users className="w-3.5 h-3.5" />
              <span>بوابة أولياء الأمور الذكية</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black">
              أهلاً بك، {currentUser.name}
            </h1>
            <p className="text-xs text-teal-200">
              متابعة لحظية ومباشرة لحضور وغياب الأبناء وإشعارات فورية
            </p>
          </div>

          <div className="bg-white/10 px-4 py-2 rounded-2xl border border-white/15 text-xs text-teal-100 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-teal-300" />
            <span>{dateInfo.dayName}، {dateInfo.gregorian}</span>
          </div>
        </div>
      </div>

      {/* Pop-up Absence Alert Notification (As specified in document) */}
      {absentChildren.length > 0 && (
        <div className="p-5 rounded-2xl bg-rose-50 border border-rose-300 shadow-md text-rose-900 flex items-start gap-4 animate-shake">
          <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0">
            <Bell className="w-5 h-5 animate-pulse" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-black text-rose-900">
              تنبيه فوري: تم تسجيل غياب أحد الأبناء اليوم ({dateInfo.dayName})
            </h3>
            <p className="text-xs text-rose-800 leading-relaxed">
              يرجى العلم بأنه تم رصد غياب الطالب: <strong>{absentChildren.map((c) => c.name).join('، ')}</strong>. يمكنك رفع عذر طبي أو كتابة ملاحظة للمدرسة بالأسفل.
            </p>
          </div>
        </div>
      )}

      {/* Link New Son Card */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-teal-600" />
            <span>ربط ابن جديد بالحساب</span>
          </h2>
          <span className="text-xs text-slate-500 font-medium">
            (ربط فوري ومباشر برقم الهوية)
          </span>
        </div>

        <form onSubmit={handleAddChild} className="flex flex-col sm:flex-row gap-3 text-xs">
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="أدخل رقم هوية الابن (مثال: 2497120754 أو 1169016985)"
              value={newChildId}
              onChange={(e) => setNewChildId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-slate-800 font-mono font-bold focus:bg-white focus:ring-2 focus:ring-teal-500 focus:outline-hidden"
            />
          </div>
          <button
            type="submit"
            id="link-child-submit-btn"
            className="px-6 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold transition-all shadow-xs cursor-pointer flex items-center justify-center gap-2"
          >
            <UserPlus className="w-4 h-4" />
            <span>إضافة الابن فوراً</span>
          </button>
        </form>

        {linkError && (
          <p className="text-xs text-rose-600 font-semibold">{linkError}</p>
        )}
        {linkSuccess && (
          <p className="text-xs text-emerald-600 font-semibold">{linkSuccess}</p>
        )}
      </div>

      {/* Children Cards List */}
      <div className="space-y-4">
        <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <Users className="w-5 h-5 text-teal-600" />
          <span>كروت متابعة الأبناء ({childrenUsers.length})</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {childrenUsers.map((child) => {
            const school = schools.find((s) => s.code === child.schoolCode);
            const att = attendances.find(
              (a) => (a.studentId === child.id || a.nationalId === child.nationalId) && a.date === today
            );
            const isPresent = att?.finalStatus === 'present' || att?.selfCheckTime;
            const isAbsent = att?.finalStatus === 'absent';
            const isLate = att?.finalStatus === 'late';

            // Child stats
            const childAllAtt = attendances.filter(
              (a) => a.studentId === child.id || a.nationalId === child.nationalId
            );
            const total = childAllAtt.length || 1;
            const pres = childAllAtt.filter((a) => a.finalStatus === 'present' || a.selfCheckTime).length;
            const rate = Math.round((pres / total) * 100);

            return (
              <div
                key={child.id}
                id={`parent-child-card-${child.nationalId}`}
                className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs flex flex-col justify-between space-y-5 hover:border-teal-300 transition-all"
              >
                {/* Top Child Info */}
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="text-[11px] font-bold text-teal-700 bg-teal-50 px-2.5 py-0.5 rounded-full border border-teal-200">
                        {school?.name || child.schoolCode}
                      </span>
                      <h3 className="text-base font-black text-slate-900 mt-1.5">
                        {child.name}
                      </h3>
                      <p className="text-xs text-slate-500 font-medium">
                        الفصل: {formatReadableClass(child.className || 'الأول المتوسط', child.sectionName || 'أ')}
                      </p>
                    </div>

                    <div className="text-left font-mono text-xs text-slate-400">
                      <span>الهوية: {child.nationalId}</span>
                    </div>
                  </div>

                  {/* Real-time Presence Badge (As specified in document) */}
                  <div className="p-4 rounded-2xl border text-xs flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      {isPresent ? (
                        <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                          <CheckCircle2 className="w-5 h-5" />
                        </div>
                      ) : isAbsent ? (
                        <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                          <XCircle className="w-5 h-5" />
                        </div>
                      ) : (
                        <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                          <Clock className="w-5 h-5" />
                        </div>
                      )}

                      <div>
                        <div className="font-bold text-slate-900">
                          حالة اليوم ({dateInfo.dayName}):
                        </div>
                        <div className="text-slate-600 font-medium mt-0.5">
                          {att?.selfCheckTime ? (
                            <span className="text-emerald-700 font-bold">
                              حاضر في المدرسة (سجل بالجوال {att.selfCheckTime})
                            </span>
                          ) : isPresent ? (
                            <span className="text-emerald-700 font-bold">حاضر في الحصة</span>
                          ) : isAbsent ? (
                            <span className="text-rose-700 font-bold">غائب اليوم عن المدرسة</span>
                          ) : isLate ? (
                            <span className="text-amber-700 font-bold">متأخر عن الطابور الصباحي</span>
                          ) : (
                            <span className="text-slate-500">في انتظار الرصد</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-left font-mono">
                        <span className="text-[10px] text-slate-400 block">نسبة الانضباط</span>
                        <strong className="text-sm font-black text-teal-700">{rate}%</strong>
                      </div>

                      <button
                        type="button"
                        onClick={() => setSelectedDossierChild(child)}
                        className="p-2.5 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-700 border border-teal-200 transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-bold shrink-0"
                        title="عرض الملف الأكاديمي الشامل لجميع الأيام والأعذار المرفوعة"
                      >
                        <FileText className="w-4 h-4" />
                        <span className="hidden sm:inline">الملف الشامل</span>
                      </button>
                    </div>
                  </div>

                  {/* Behavior Score Mini Banner */}
                  {(() => {
                    const bStats = calculateStudentBehaviorScore(child.id, child.nationalId, child.schoolCode);
                    return (
                      <div className="bg-slate-900 text-white p-3 rounded-2xl flex items-center justify-between text-xs border border-slate-800">
                        <div className="flex items-center gap-2">
                          <ShieldAlert className={`w-4 h-4 ${
                            bStats.currentScore >= 90 ? 'text-emerald-400' :
                            bStats.currentScore >= 80 ? 'text-amber-400' :
                            'text-rose-400'
                          }`} />
                          <div>
                            <span className="font-bold block text-slate-200">درجة السلوك للفصل:</span>
                            <span className="text-[10px] text-slate-400">
                              (تأخر صباحي: -{bStats.tardinessDeductions} | حسومات إدارية: -{bStats.manualDeductionsTotal})
                            </span>
                          </div>
                        </div>
                        <div className="text-left">
                          <span className={`text-base font-black ${
                            bStats.currentScore >= 90 ? 'text-emerald-400' :
                            bStats.currentScore >= 80 ? 'text-amber-400' :
                            'text-rose-400'
                          }`}>
                            {bStats.currentScore} <span className="text-[10px] text-slate-400 font-normal">/ 100</span>
                          </span>
                        </div>
                      </div>
                    );
                  })()}

                </div>

                {/* Parent Note writing section directly to school */}
                <div className="pt-3 border-t border-slate-100 space-y-2">
                  <label className="block text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5 text-teal-600" />
                    <span>كتابة ملاحظة لإدارة المدرسة / المرشد الطلابي</span>
                  </label>
                  
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="اكتب ملاحظة أو استفسار بخصوص ابنك..."
                      value={parentNotes[child.id] || ''}
                      onChange={(e) => setParentNotes({ ...parentNotes, [child.id]: e.target.value })}
                      className="flex-1 bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-teal-500 focus:outline-hidden"
                    />
                    <button
                      type="button"
                      id={`send-note-btn-${child.nationalId}`}
                      onClick={() => handleSendNote(child)}
                      className="px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold transition-all shadow-2xs cursor-pointer flex items-center gap-1 shrink-0"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>إرسال</span>
                    </button>
                  </div>

                  {sentNoteSuccess === child.id && (
                    <p className="text-[11px] text-emerald-600 font-bold animate-fadeIn">
                      ✓ تم إرسال ملاحظتك لإدارة المدرسة بنجاح.
                    </p>
                  )}
                </div>

              </div>
            );
          })}
        </div>

      </div>

      {/* Student Dossier Modal for Parent */}
      {selectedDossierChild && (
        <StudentDossierModal
          student={selectedDossierChild}
          isOpen={Boolean(selectedDossierChild)}
          onClose={() => setSelectedDossierChild(null)}
          school={schools.find((s) => s.code === selectedDossierChild.schoolCode) || schools[0]}
          allAttendances={attendances}
          allExcuses={excuses}
        />
      )}

    </div>
  );
};
