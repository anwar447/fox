import React, { useState } from 'react';
import { User, School, Attendance, CorrectionRequest } from '../types';
import { getAttendances, getUsers, getCorrectionRequests, saveAttendances, getSystemNotifications } from '../utils/storage';
import { calculateStudentBehaviorScore } from '../utils/behavior';
import { SubmitExcuseModal } from './SubmitExcuseModal';
import { LiveClockHeader } from './LiveClockHeader';
import { BroadcastAlertBanner } from './BroadcastAlertBanner';
import { 
  UserCheck, GraduationCap, CheckCircle, XCircle, 
  AlertTriangle, Phone, FileText, Upload, Plus, Check, 
  Clock, Sparkles, Star, Award, HeartHandshake, ThumbsUp, ThumbsDown, 
  Calendar, ShieldAlert, User as UserIcon, RefreshCw 
} from 'lucide-react';
import { getTodayDateString } from '../utils/academic';

interface ParentPortalProps {
  currentUser: User;
  currentSchool: School;
  onOpenCorrection: (attendance: Attendance) => void;
}

export const ParentPortal: React.FC<ParentPortalProps> = ({
  currentUser,
  currentSchool,
  onOpenCorrection,
}) => {
  const today = getTodayDateString();
  const allUsers = getUsers();
  const [attendances, setAttendances] = useState<Attendance[]>(getAttendances());
  const [correctionRequests, setCorrectionRequests] = useState<CorrectionRequest[]>(getCorrectionRequests());

  // Find parent's children
  const children = allUsers.filter(
    (u) =>
      u.role === 'student' &&
      (currentUser.childrenNationalIds?.includes(u.nationalId) || u.parentMobile === currentUser.mobile)
  );

  const [selectedStudentId, setSelectedStudentId] = useState<string>(
    children[0]?.id || ''
  );

  // Excuse Modal
  const [isExcuseModalOpen, setIsExcuseModalOpen] = useState(false);
  const [selectedExcuseDate, setSelectedExcuseDate] = useState<string | undefined>(undefined);

  // Active Tab
  const [activeTab, setActiveTab] = useState<'behavior' | 'excuses' | 'attendance' | 'actions'>('behavior');

  const currentChild = children.find((c) => c.id === selectedStudentId) || children[0];
  const childAttendances = attendances.filter((a) => a.studentId === currentChild?.id);
  const todayAtt = childAttendances.find((a) => a.date === today);
  const childExcuses = correctionRequests.filter((r) => r.studentId === currentChild?.id);

  // Calculate dynamic behavior & discipline score
  const behaviorSummary = currentChild 
    ? calculateStudentBehaviorScore(currentChild.id)
    : null;

  const refreshData = () => {
    setAttendances(getAttendances());
    setCorrectionRequests(getCorrectionRequests());
  };

  const handleOpenExcuse = (dateString?: string) => {
    setSelectedExcuseDate(dateString);
    setIsExcuseModalOpen(true);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto py-6 px-4 text-slate-800" dir="rtl">
      
      {/* Live Day, Date & Live Clock Header Bar */}
      <LiveClockHeader />

      {/* Urgent Broadcast Banner */}
      <BroadcastAlertBanner
        notifications={getSystemNotifications().filter(
          (n) => n.schoolCode === currentSchool.code || !n.schoolCode
        )}
      />

      {/* 1. Parent Welcome Banner */}
      <div className="bg-white border border-slate-200/90 rounded-3xl p-6 flex flex-wrap items-center justify-between gap-4 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="w-14 h-14 rounded-2xl bg-teal-50 text-teal-700 border border-teal-200 flex items-center justify-center shadow-xs">
            <UserCheck className="w-7 h-7" />
          </div>
          <div>
            <span className="px-2.5 py-0.5 rounded-full bg-teal-50 text-teal-800 text-[10px] font-bold border border-teal-200">
              بوابة ولي الأمر الذكية
            </span>
            <h2 className="text-xl font-black text-slate-900 mt-1">مرحباً بك، {currentUser.name}</h2>
            <p className="text-xs text-slate-500 font-medium">متابعة حضور وانضباط وسلوك الأبناء في ({currentSchool.name})</p>
          </div>
        </div>

        {/* Child Selector & Quick Excuse button */}
        <div className="flex flex-wrap items-center gap-2">
          {children.length > 1 && (
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-2xl px-3 py-1.5">
              <span className="text-xs text-slate-500 font-bold">اختيار الابن:</span>
              <select
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
                className="bg-white border border-slate-200 rounded-xl px-2.5 py-1 text-xs text-slate-800 font-bold focus:outline-teal-500"
              >
                {children.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.className})
                  </option>
                ))}
              </select>
            </div>
          )}

          {currentChild && (
            <button
              onClick={() => handleOpenExcuse(undefined)}
              className="px-4 py-2 rounded-2xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-black flex items-center gap-1.5 shadow-md shadow-teal-600/20 cursor-pointer transition-colors"
            >
              <FileText className="w-4 h-4" />
              <span>تقديم عذر طبي عن الابن 📤</span>
            </button>
          )}
        </div>
      </div>

      {currentChild && behaviorSummary && (
        <>
          {/* 5-Day Absence Alert Banner if triggered */}
          {behaviorSummary.hasFiveDaysAbsenceAlert && (
            <div className="bg-rose-50 border-2 border-rose-300 rounded-3xl p-5 text-rose-950 flex flex-wrap items-center justify-between gap-4 shadow-sm">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-rose-600 text-white flex items-center justify-center font-black shadow-md shadow-rose-600/30 shrink-0">
                  <ShieldAlert className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-rose-200 text-rose-900 font-black text-xs">
                      ⚠️ تنبيه تكرار غياب رسمي ({behaviorSummary.unexcusedInCurrentCycleCount} أيام)
                    </span>
                  </div>
                  <h4 className="text-sm font-black text-rose-950 mt-1">
                    تجاوز الابن ({currentChild.name}) حاجز الـ 5 أيام غياب بدون عذر
                  </h4>
                  <p className="text-xs text-rose-800 mt-0.5">
                    يرجى التواصل مع إدارة المدرسة أو رفع الأعذار المعتمدة لتفادي تطبيق الإجراءات ولائحة الانضباط المدرسي.
                  </p>
                </div>
              </div>

              <button
                onClick={() => handleOpenExcuse(undefined)}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md cursor-pointer"
              >
                رفع عذر طبي الآن 📤
              </button>
            </div>
          )}

          {/* 2. Child Overall Status & Dynamic Behavior Score (100 Base Points) */}
          <div className="bg-gradient-to-l from-slate-900 via-slate-850 to-slate-900 text-white rounded-3xl p-6 space-y-4 shadow-md">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-700/60 pb-3">
              <div className="flex items-center gap-3.5">
                {/* Child Photo Avatar */}
                <div className="w-14 h-14 rounded-2xl bg-slate-800 border-2 border-slate-600 overflow-hidden flex items-center justify-center text-slate-300 shrink-0">
                  {currentChild.avatar ? (
                    <img src={currentChild.avatar} alt={currentChild.name} className="w-full h-full object-cover" />
                  ) : (
                    <UserIcon className="w-7 h-7 text-amber-400" />
                  )}
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                    <h3 className="font-black text-base text-slate-100">
                      درجة السلوك والمواظبة: {currentChild.name}
                    </h3>
                  </div>
                  <p className="text-xs text-slate-400 font-medium">
                    {currentChild.className} - فصل {currentChild.sectionName} | هوية: {currentChild.nationalId}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className={`px-3 py-1 rounded-full text-xs font-black ${behaviorSummary.rating.badgeColor}`}>
                  {behaviorSummary.rating.label}
                </span>
                <span className="text-3xl font-black text-emerald-400 font-mono">
                  {behaviorSummary.currentScore} <span className="text-xs text-slate-400">/ 100</span>
                </span>
              </div>
            </div>

            {/* Score Breakdown */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-center text-xs">
              <div className="bg-slate-800/80 border border-slate-700/60 rounded-xl p-2.5">
                <span className="text-[10px] text-slate-400 block font-bold">الدرجة الأساسية</span>
                <span className="text-base font-black text-slate-200">100</span>
              </div>

              <div className="bg-slate-800/80 border border-slate-700/60 rounded-xl p-2.5">
                <span className="text-[10px] text-rose-350 block font-bold">غياب بدون عذر</span>
                <span className="text-base font-black text-rose-400">
                  {behaviorSummary.unexcusedAbsenceCount > 0 ? `-${behaviorSummary.unexcusedAbsenceCount}` : '0'}
                </span>
              </div>

              <div className="bg-slate-800/80 border border-slate-700/60 rounded-xl p-2.5">
                <span className="text-[10px] text-amber-300 block font-bold">تأخر صباحي</span>
                <span className="text-base font-black text-amber-400">
                  {behaviorSummary.tardinessCount > 0 ? `-${behaviorSummary.tardinessCount}` : '0'}
                </span>
              </div>

              <div className="bg-slate-800/80 border border-slate-700/60 rounded-xl p-2.5">
                <span className="text-[10px] text-rose-350 block font-bold">ملاحظات سلوكية</span>
                <span className="text-base font-black text-rose-400">
                  {behaviorSummary.negativePoints > 0 ? `-${behaviorSummary.negativePoints}` : '0'}
                </span>
              </div>

              <div className="bg-slate-800/80 border border-slate-700/60 rounded-xl p-2.5">
                <span className="text-[10px] text-emerald-300 block font-bold">تعزيز سلوك إيجابي</span>
                <span className="text-base font-black text-emerald-400">
                  {behaviorSummary.positivePoints > 0 ? `+${behaviorSummary.positivePoints}` : '0'}
                </span>
              </div>

              <div className="bg-slate-800/80 border border-slate-700/60 rounded-xl p-2.5">
                <span className="text-[10px] text-indigo-300 block font-bold">فرص تعويضية مستردة</span>
                <span className="text-base font-black text-indigo-400">
                  {behaviorSummary.compensatoryPoints > 0 ? `+${behaviorSummary.compensatoryPoints}` : '0'}
                </span>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden border border-slate-700">
              <div 
                className={`h-full transition-all duration-500 rounded-full ${
                  behaviorSummary.currentScore >= 90 ? 'bg-emerald-500' :
                  behaviorSummary.currentScore >= 80 ? 'bg-teal-500' :
                  behaviorSummary.currentScore >= 70 ? 'bg-indigo-500' :
                  behaviorSummary.currentScore >= 60 ? 'bg-amber-500' : 'bg-rose-500'
                }`}
                style={{ width: `${behaviorSummary.currentScore}%` }}
              />
            </div>
          </div>

          {/* 3. Today's Live Status and Truancy Warning */}
          <div className="bg-white border border-slate-200/90 rounded-3xl p-5 flex flex-wrap items-center justify-between gap-4 shadow-xs">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black ${
                todayAtt?.finalStatus === 'present' ? 'bg-emerald-100 text-emerald-800' :
                todayAtt?.finalStatus === 'late' ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
              }`}>
                {todayAtt?.finalStatus === 'present' ? <CheckCircle className="w-5 h-5" /> :
                 todayAtt?.finalStatus === 'late' ? <Clock className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
              </div>
              <div>
                <h4 className="font-black text-sm text-slate-900">حالة الابن اليوم ({today}):</h4>
                <p className="text-xs text-slate-500 font-bold">
                  {todayAtt?.selfCheckTime ? `دخول البوابة: ${todayAtt.selfCheckTime}` : 'لم يسجل عند البوابة'} | الحصة: {todayAtt?.teacherMark === 'present' ? 'حاضر' : todayAtt?.teacherMark === 'absent' ? 'غائب' : '--'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className={`px-3 py-1 rounded-xl text-xs font-black ${
                todayAtt?.finalStatus === 'present' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' :
                todayAtt?.finalStatus === 'late' ? 'bg-amber-50 text-amber-800 border border-amber-200' :
                'bg-rose-50 text-rose-800 border border-rose-200'
              }`}>
                {todayAtt?.finalStatus === 'present' ? 'حاضر اليوم' : todayAtt?.finalStatus === 'late' ? 'متأخر' : 'غائب'}
              </span>

              {todayAtt?.exitTime && (
                <span className="px-2.5 py-1 rounded-xl bg-amber-50 text-amber-900 border border-amber-200 text-xs font-mono font-bold">
                  🚪 انصراف: {todayAtt.exitTime}
                </span>
              )}
            </div>
          </div>

          {/* Truancy Warning if detected */}
          {todayAtt?.isTruant && (
            <div className="p-4 rounded-3xl bg-rose-50 border border-rose-300 text-rose-900 text-xs flex items-center gap-3 shadow-xs">
              <AlertTriangle className="w-6 h-6 text-rose-600 shrink-0" />
              <div>
                <strong className="block font-black text-sm text-rose-950">⚠️ تنبيه كشف تباين في الحضور (هروب):</strong>
                <span>سجل الابن حضوره عند بوابة المدرسة صباحاً لكن رصده معلم الحصة غائباً داخل الفصل.</span>
              </div>
            </div>
          )}

          {/* 4. Parent Navigation Tabs */}
          <div className="flex border-b border-slate-200 gap-2 overflow-x-auto pb-1 text-xs font-black">
            <button
              onClick={() => setActiveTab('behavior')}
              className={`pb-3 px-4 border-b-2 transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'behavior'
                  ? 'border-emerald-600 text-emerald-700'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Star className="w-4 h-4" />
              <span>سجل السلوك والملاحظات ({behaviorSummary.behaviorLogs.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('excuses')}
              className={`pb-3 px-4 border-b-2 transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'excuses'
                  ? 'border-teal-600 text-teal-700'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>تفاعل ورفع الأعذار ({childExcuses.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('attendance')}
              className={`pb-3 px-4 border-b-2 transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'attendance'
                  ? 'border-indigo-600 text-indigo-700'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Calendar className="w-4 h-4" />
              <span>سجل الأيام السابقة والغياب ({childAttendances.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('actions')}
              className={`pb-3 px-4 border-b-2 transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'actions'
                  ? 'border-rose-600 text-rose-700'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <ShieldAlert className="w-4 h-4" />
              <span>الإنذارات والإجراءات الإدارية ({behaviorSummary.absenceActions.length})</span>
              {behaviorSummary.absenceActions.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-rose-600 text-white text-[10px]">
                  {behaviorSummary.absenceActions.length}
                </span>
              )}
            </button>
          </div>

          {/* Tab Content 1: Behavior & Compensatory Timeline */}
          {activeTab === 'behavior' && (
            <div className="bg-white border border-slate-200/90 rounded-3xl p-6 space-y-4 shadow-xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h4 className="text-sm font-black text-slate-900">سجل تعزيز السلوك والملاحظات المدرسية:</h4>
                <span className="text-xs text-slate-500">مباشر وموثق من معلمي المدرسة</span>
              </div>

              {behaviorSummary.behaviorLogs.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-6">لا توجد ملاحظات سلوكية مرصودة حتى الآن.</p>
              ) : (
                <div className="space-y-3">
                  {behaviorSummary.behaviorLogs.map((log) => (
                    <div
                      key={log.id}
                      className={`p-4 rounded-2xl border text-xs space-y-2 ${
                        log.type === 'positive' ? 'bg-emerald-50/60 border-emerald-200 text-emerald-950' :
                        log.type === 'compensatory' ? 'bg-indigo-50/60 border-indigo-200 text-indigo-950' :
                        'bg-rose-50/60 border-rose-200 text-rose-950'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`w-7 h-7 rounded-xl flex items-center justify-center font-black ${
                            log.type === 'positive' ? 'bg-emerald-600 text-white' :
                            log.type === 'compensatory' ? 'bg-indigo-600 text-white' : 'bg-rose-600 text-white'
                          }`}>
                            {log.type === 'positive' ? <ThumbsUp className="w-3.5 h-3.5" /> :
                             log.type === 'compensatory' ? <Award className="w-3.5 h-3.5" /> : <ThumbsDown className="w-3.5 h-3.5" />}
                          </div>
                          <div>
                            <strong className="text-xs font-black block">{log.title}</strong>
                            <span className="text-[10px] text-slate-500">
                              {log.date} | بواسطة: {log.recordedByName} ({log.category})
                            </span>
                          </div>
                        </div>

                        <span className={`px-2.5 py-1 rounded-xl font-black text-xs ${
                          log.type === 'positive' ? 'bg-emerald-600 text-white' :
                          log.type === 'compensatory' ? 'bg-indigo-600 text-white' : 'bg-rose-600 text-white'
                        }`}>
                          {log.type === 'positive' ? `+${log.points} نقاط تعزيز` :
                           log.type === 'compensatory' ? `+${log.points} فرصة تعويضية مستردة` : `-${log.points} حسم درجات`}
                        </span>
                      </div>

                      {log.notes && (
                        <p className="bg-white/80 p-2.5 rounded-xl text-[11px] text-slate-700 font-medium border border-slate-100">
                          {log.notes}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tab Content 2: Child Excuses Tracking & Interactions */}
          {activeTab === 'excuses' && (
            <div className="bg-white border border-slate-200/90 rounded-3xl p-6 space-y-4 shadow-xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h4 className="text-sm font-black text-slate-900">متابعة تفاعل الابن برفع الأعذار والتقارير:</h4>
                  <p className="text-xs text-slate-500">تظهر هنا جميع الأعذار المرفوعة من قبل الابن أو من قبلك وحالة اعتمادها.</p>
                </div>
                <button
                  onClick={() => handleOpenExcuse(undefined)}
                  className="px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Plus className="w-4 h-4" />
                  <span>تقديم عذر جديد</span>
                </button>
              </div>

              {childExcuses.length === 0 ? (
                <div className="text-center py-8 bg-slate-50 rounded-2xl border border-slate-200 p-6 space-y-2">
                  <FileText className="w-8 h-8 text-slate-400 mx-auto" />
                  <p className="text-xs text-slate-500 font-bold">لم يتم تقديم أي طلب عذر حتى الآن.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {childExcuses.map((excuse) => (
                    <div
                      key={excuse.id}
                      className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-black text-slate-900 text-sm">{excuse.date}</span>
                          <span className="text-[11px] px-2 py-0.5 rounded-md bg-slate-200 text-slate-800 font-bold">
                            {excuse.requestedByRole === 'parent' ? 'مقدم من ولي الأمر' : 'مقدم ذاتياً من الطالب'}
                          </span>
                        </div>

                        <span className={`px-2.5 py-1 rounded-full font-black text-[11px] ${
                          excuse.status === 'approved' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                          excuse.status === 'rejected' ? 'bg-rose-100 text-rose-800 border border-rose-200' :
                          'bg-amber-100 text-amber-900 border border-amber-200'
                        }`}>
                          {excuse.status === 'approved' ? '✓ تم قبول العذر واستعادة الدرجة (+1)' :
                           excuse.status === 'rejected' ? '✕ تم رفض العذر' : '⏳ قيد مراجعة الإدارة'}
                        </span>
                      </div>

                      <p className="text-slate-700 bg-white p-2.5 rounded-xl border border-slate-100">
                        <strong>تفاصيل العذر:</strong> {excuse.reason}
                      </p>

                      {excuse.adminDecisionNotes && (
                        <p className="text-emerald-800 bg-emerald-50 p-2.5 rounded-xl border border-emerald-200 font-bold">
                          <strong>قرار الإدارة:</strong> {excuse.adminDecisionNotes}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tab Content 3: Attendance History & Unexcused Absences */}
          {activeTab === 'attendance' && (
            <div className="bg-white border border-slate-200/90 rounded-3xl p-6 space-y-4 shadow-xs">
              <h4 className="text-sm font-black text-slate-900">سجل أيام الحضور والغياب للابن:</h4>
              
              {childAttendances.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-6">لا توجد سجلات مسجلة.</p>
              ) : (
                <div className="space-y-2 max-h-72 overflow-y-auto">
                  {childAttendances.map((a) => (
                    <div key={a.id} className="bg-slate-50 border border-slate-200 rounded-2xl p-3 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-slate-800 font-black">{a.date}</span>
                        <span className="text-slate-500">دخول: {a.selfCheckTime || 'لم يسجل'}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className={`px-2.5 py-1 rounded-xl text-[11px] font-black ${
                          a.finalStatus === 'present' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' :
                          a.finalStatus === 'late' ? 'bg-amber-50 text-amber-800 border border-amber-200' :
                          a.excuseStatus === 'accepted' ? 'bg-teal-50 text-teal-800 border border-teal-200' :
                          'bg-rose-50 text-rose-800 border border-rose-200'
                        }`}>
                          {a.finalStatus === 'present' ? 'حاضر' :
                           a.finalStatus === 'late' ? 'متأخر' :
                           a.excuseStatus === 'accepted' ? 'غائب بعذر مقبول' : 'غائب بدون عذر (-1)'}
                        </span>

                        {a.finalStatus === 'absent' && a.excuseStatus !== 'accepted' && (
                          <button
                            onClick={() => handleOpenExcuse(a.date)}
                            className="px-2 py-0.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-[10px] font-bold cursor-pointer"
                          >
                            رفع عذر
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          {/* Tab Content 4: Administrative Absence Actions & Warnings */}
          {activeTab === 'actions' && (
            <div className="bg-white border border-slate-200/90 rounded-3xl p-6 space-y-4 shadow-xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h4 className="text-sm font-black text-slate-900">سجل القرارات والإنذارات الإدارية للابن:</h4>
                <span className="text-xs text-slate-500">إجراءات رسمية موثقة من إدارة المدرسة</span>
              </div>

              {behaviorSummary.absenceActions.length === 0 ? (
                <div className="text-center py-8 bg-slate-50 rounded-2xl border border-slate-100 p-6 space-y-2">
                  <CheckCircle className="w-8 h-8 text-emerald-600 mx-auto" />
                  <h5 className="font-black text-slate-900 text-sm">لا توجد أي إنذارات أو إجراءات مسجلة</h5>
                  <p className="text-xs text-slate-500">سجل ابنكم منتظم ولم يتجاوز حد تنبيه تكرار الغياب.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {behaviorSummary.absenceActions.map((act) => (
                    <div
                      key={act.id}
                      className="p-4 rounded-2xl border border-rose-200 bg-rose-50/40 text-xs space-y-2.5"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-xl bg-rose-600 text-white flex items-center justify-center font-black shadow-xs">
                            <ShieldAlert className="w-4 h-4" />
                          </div>
                          <div>
                            <strong className="text-xs font-black text-rose-950 block">{act.actionTitle}</strong>
                            <span className="text-[10px] text-slate-500 font-medium">
                              التاريخ: {act.date} | بواسطة: {act.recordedByName} ({act.recordedByRole}) | غياب مرصود: {act.absenceCount} أيام
                            </span>
                          </div>
                        </div>

                        <span className="px-2.5 py-1 rounded-full bg-rose-200 text-rose-900 font-black text-[11px] border border-rose-300">
                          إجراء رسمي موثق
                        </span>
                      </div>

                      <div className="bg-white p-3 rounded-xl border border-rose-100 text-slate-800 leading-relaxed">
                        <strong>نص القرار والتوجيه: </strong>
                        {act.notes}
                      </div>

                      {act.resetCycle && (
                        <div className="flex items-center gap-1.5 text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                          <RefreshCw className="w-3 h-3 text-emerald-600" />
                          <span>تم بدء دورة احتساب جديدة للابن بعد التعهد والتواصل مع المدرسة.</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Submit Excuse Modal */}
      {isExcuseModalOpen && currentChild && (
        <SubmitExcuseModal
          student={currentChild}
          currentSchool={currentSchool}
          submittedByRole="parent"
          requesterName={currentUser.name}
          defaultDate={selectedExcuseDate}
          onClose={() => setIsExcuseModalOpen(false)}
          onSubmitted={() => {
            setIsExcuseModalOpen(false);
            refreshData();
          }}
        />
      )}
    </div>
  );
};
