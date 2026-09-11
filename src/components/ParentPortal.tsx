import React, { useState, useEffect } from 'react';
import { User, School, Attendance, CorrectionRequest, StudentBehaviorLog, ParentSummon } from '../types';
import { 
  getAttendances, getUsers, getCorrectionRequests, saveAttendances, 
  saveUsers, getSystemNotifications, saveCurrentUserSession,
  getBehaviorLogs, getParentSummons
} from '../utils/storage';
import { onRealtimeAttendanceUpdate, onRealtimeCorrectionUpdate, onRealtimeUserUpdate } from '../utils/realtime';
import { calculateStudentBehaviorScore } from '../utils/behavior';
import { isAbsenceSuspendedForSchool } from '../utils/schoolSchedule';
import { SubmitExcuseModal } from './SubmitExcuseModal';
import { LiveClockHeader } from './LiveClockHeader';
import { BroadcastAlertBanner } from './BroadcastAlertBanner';
import { 
  UserCheck, GraduationCap, CheckCircle, XCircle, 
  AlertTriangle, Phone, FileText, Upload, Plus, Check, 
  Clock, Sparkles, Star, Award, HeartHandshake, ThumbsUp, ThumbsDown, 
  Calendar, ShieldAlert, User as UserIcon, RefreshCw, CloudRain, ArrowLeftRight,
  Building2, Users, UserPlus, AlertCircle
} from 'lucide-react';
import { getTodayDateString } from '../utils/academic';

interface ParentPortalProps {
  currentUser: User;
  currentSchool: School;
  schools?: School[];
  onOpenCorrection: (attendance: Attendance) => void;
  isDualRoleTeacher?: boolean;
  onSwitchBackToTeacher?: () => void;
}

export const ParentPortal: React.FC<ParentPortalProps> = ({
  currentUser,
  currentSchool,
  schools = [],
  onOpenCorrection,
  isDualRoleTeacher,
  onSwitchBackToTeacher,
}) => {
  const today = getTodayDateString();
  const [allUsers, setAllUsers] = useState<User[]>(() => getUsers());
  const [attendances, setAttendances] = useState<Attendance[]>(getAttendances());
  const [correctionRequests, setCorrectionRequests] = useState<CorrectionRequest[]>(getCorrectionRequests());
  const [behaviorLogs, setBehaviorLogs] = useState<StudentBehaviorLog[]>(getBehaviorLogs());
  const [parentSummons, setParentSummons] = useState<ParentSummon[]>(getParentSummons());

  // Real-time synchronization subscription (updates immediately when admin/teacher changes status)
  useEffect(() => {
    const unsubAtt = onRealtimeAttendanceUpdate((allAtts) => {
      setAttendances(allAtts);
    });
    const unsubCor = onRealtimeCorrectionUpdate((allCors) => {
      setCorrectionRequests(allCors);
    });
    const unsubUsers = onRealtimeUserUpdate((updatedUsers) => {
      setAllUsers(updatedUsers);
    });
    return () => {
      unsubAtt();
      unsubCor();
      unsubUsers();
    };
  }, []);

  // Find parent's children with robust ID, parent NID, and phone matching across all schools
  const children = allUsers.filter((u) => {
    if (u.role !== 'student') return false;
    const cleanUNid = (u.nationalId || '').trim();
    const isChildNid = currentUser.childrenNationalIds?.some((nid) => nid?.trim() === cleanUNid);
    const cleanParentNid = (currentUser.nationalId || '').trim();
    const isParentNidMatch = Boolean(cleanParentNid && u.parentNationalId && u.parentNationalId.trim() === cleanParentNid);
    const cleanParentMob = (currentUser.mobile || '').trim().replace(/\D/g, '');
    const cleanStudentParentMob = (u.parentMobile || u.parentPhone || '').trim().replace(/\D/g, '');
    const isMobileMatch = Boolean(cleanParentMob && cleanStudentParentMob && (
      cleanParentMob === cleanStudentParentMob ||
      cleanParentMob.endsWith(cleanStudentParentMob) ||
      cleanStudentParentMob.endsWith(cleanParentMob)
    ));
    return isChildNid || isParentNidMatch || isMobileMatch;
  });

  const matchingTeacherUser = allUsers.find(
    (u) =>
      (u.id === currentUser.id ||
        (currentUser.nationalId && u.nationalId === currentUser.nationalId) ||
        (currentUser.mobile && u.mobile === currentUser.mobile)) &&
      (u.role === 'teacher' || u.staffTitle === 'teacher' || (u.assignedClasses && u.assignedClasses.length > 0))
  );

  const isTeacherParent = Boolean(
    isDualRoleTeacher ||
    currentUser.staffTitle === 'teacher' ||
    (currentUser.assignedClasses && currentUser.assignedClasses.length > 0) ||
    matchingTeacherUser
  );

  const [selectedStudentId, setSelectedStudentId] = useState<string>(
    children[0]?.id || ''
  );

  // Link child state if no children found
  const [isAddChildOpen, setIsAddChildOpen] = useState(false);
  const [linkChildNid, setLinkChildNid] = useState('');
  const [linkChildName, setLinkChildName] = useState('');
  const [linkChildSchoolCode, setLinkChildSchoolCode] = useState(currentSchool.code);
  const [linkChildClass, setLinkChildClass] = useState('الأول الثانوي');
  const [linkChildSection, setLinkChildSection] = useState('1');
  const [linkStatusMsg, setLinkStatusMsg] = useState('');

  const handleLinkChild = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanNid = linkChildNid.trim().replace(/\D/g, '');
    if (!cleanNid) {
      alert('يرجى إدخال رقم هوية الابن');
      return;
    }

    const currentUsers = getUsers();
    const existingChild = currentUsers.find((u) => u.nationalId === cleanNid && u.role === 'student');

    let updatedChild: User;
    const targetSchoolCode = linkChildSchoolCode || currentSchool.code;
    if (existingChild) {
      updatedChild = {
        ...existingChild,
        parentMobile: currentUser.mobile || existingChild.parentMobile,
        schoolCode: existingChild.schoolCode || targetSchoolCode,
      };
    } else {
      updatedChild = {
        id: `usr-s-${cleanNid}`,
        nationalId: cleanNid,
        name: linkChildName.trim() || `طالب (${cleanNid})`,
        role: 'student',
        password: cleanNid.slice(-4) || '123456',
        schoolCode: targetSchoolCode,
        className: linkChildClass || 'الأول الثانوي',
        sectionName: linkChildSection || '1',
        parentMobile: currentUser.mobile,
        managedSchoolCodes: [targetSchoolCode],
      };
    }

    const updatedChildrenNids = Array.from(new Set([
      ...(currentUser.childrenNationalIds || []),
      cleanNid,
    ]));

    const existingParentInDb = currentUsers.find(
      (u) => (currentUser.id && u.id === currentUser.id) || (currentUser.nationalId && u.nationalId === currentUser.nationalId)
    );

    // CRITICAL: NEVER downgrade teacher or employee to parent
    const preservedRole = (existingParentInDb?.role === 'teacher' || existingParentInDb?.staffTitle === 'teacher' || currentUser.staffTitle === 'teacher')
      ? 'teacher'
      : (existingParentInDb?.role || currentUser.role);

    const updatedParent: User = {
      ...(existingParentInDb || currentUser),
      role: preservedRole,
      staffTitle: existingParentInDb?.staffTitle || currentUser.staffTitle,
      assignedClasses: existingParentInDb?.assignedClasses || currentUser.assignedClasses,
      teachingSchoolCode: existingParentInDb?.teachingSchoolCode || currentUser.teachingSchoolCode || existingParentInDb?.schoolCode,
      childrenNationalIds: updatedChildrenNids,
    };

    // Update users list
    let nextUsers = currentUsers.map((u) => {
      if (u.id === currentUser.id || (currentUser.nationalId && u.nationalId === currentUser.nationalId)) {
        return updatedParent;
      }
      if (u.id === updatedChild.id || u.nationalId === updatedChild.nationalId) {
        return updatedChild;
      }
      return u;
    });

    if (!nextUsers.some((u) => u.id === updatedChild.id)) {
      nextUsers.push(updatedChild);
    }

    saveUsers(nextUsers);
    if (preservedRole === 'teacher') {
      saveCurrentUserSession(updatedParent);
    }
    setSelectedStudentId(updatedChild.id);
    setLinkStatusMsg(`✅ تم ربط الابن ${updatedChild.name} بنجاح!`);
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  };

  // Excuse Modal
  const [isExcuseModalOpen, setIsExcuseModalOpen] = useState(false);
  const [selectedExcuseDate, setSelectedExcuseDate] = useState<string | undefined>(undefined);

  // Active Tab
  const [activeTab, setActiveTab] = useState<'behavior' | 'excuses' | 'attendance' | 'actions'>('behavior');

  const currentChild = children.find((c) => c.id === selectedStudentId) || children[0];
  const childSchool = schools.find((s) => s.code === currentChild?.schoolCode) || currentSchool;
  const childAttendances = attendances.filter((a) => a.studentId === currentChild?.id);
  const todayAtt = childAttendances.find((a) => a.date === today);
  const childExcuses = correctionRequests.filter((r) => r.studentId === currentChild?.id);

  // Distinct school names of children
  const distinctChildSchools = Array.from(
    new Set(
      children.map((c) => {
        const s = schools.find((sch) => sch.code === c.schoolCode);
        return s ? s.name : currentSchool.name;
      })
    )
  );

  // Calculate dynamic behavior & discipline score
  const behaviorSummary = currentChild 
    ? calculateStudentBehaviorScore(currentChild.id)
    : null;

  const refreshData = () => {
    setAttendances(getAttendances());
    setCorrectionRequests(getCorrectionRequests());
    setBehaviorLogs(getBehaviorLogs());
    setParentSummons(getParentSummons());
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

      {/* Dual Role Teacher-as-Parent Notice Banner */}
      {isTeacherParent && onSwitchBackToTeacher && (
        <div className="bg-gradient-to-r from-amber-500 via-indigo-600 to-indigo-700 text-white p-4 sm:p-5 rounded-3xl shadow-md flex flex-wrap items-center justify-between gap-3 animate-fadeIn">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center text-white font-bold shrink-0 text-2xl shadow-xs">
              👨‍👧‍👦
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs sm:text-sm font-black text-white">
                  وضع ولي الأمر النشط (حسابك الأساسي: كادر تعليمي / معلم 👨‍🏫)
                </span>
                <span className="px-2 py-0.5 rounded-full bg-white/20 text-white text-[10px] font-bold">
                  حساب مزدوج مدمج
                </span>
              </div>
              <p className="text-xs text-indigo-100 mt-1 font-medium">
                تتصفح الآن لمتابعة سجلات حضور وغياب وأعذار أبنائك الطلاب. يمكنك العودة لبوابة رصد الحصص والمعلمين بضغطة زر.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onSwitchBackToTeacher}
            className="px-4 py-2.5 rounded-xl bg-white hover:bg-slate-100 text-indigo-950 font-black text-xs shrink-0 cursor-pointer shadow-sm transition-all hover:scale-105 active:scale-95 flex items-center gap-2"
          >
            <ArrowLeftRight className="w-4 h-4 text-indigo-700" />
            <span>العودة لبوابة المعلم 👨‍🏫 ↵</span>
          </button>
        </div>
      )}

      {/* 1. Parent Welcome Banner */}
      <div className="bg-white border border-slate-200/90 rounded-3xl p-6 flex flex-wrap items-center justify-between gap-4 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="w-14 h-14 rounded-2xl bg-teal-50 text-teal-700 border border-teal-200 flex items-center justify-center shadow-xs">
            <UserCheck className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-teal-50 text-teal-800 text-[10px] font-bold border border-teal-200">
                بوابة ولي الأمر الذكية
              </span>
              {isTeacherParent && (
                <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[10px] font-black border border-amber-300">
                  حساب مزدوج (معلم وولي أمر) 👨‍👧‍👦
                </span>
              )}
            </div>
            <h2 className="text-xl font-black text-slate-900 mt-1">مرحباً بك، {currentUser.name}</h2>
            <p className="text-xs text-slate-500 font-medium">
              {distinctChildSchools.length > 1
                ? `متابعة حضور وانضباط وسلوك الأبناء عبر المدارس (${distinctChildSchools.join(' و ')})`
                : `متابعة حضور وانضباط وسلوك الأبناء في (${childSchool.name})`}
            </p>
          </div>
        </div>

        {/* Child Selector & Quick Excuse button */}
        <div className="flex flex-wrap items-center gap-2">
          {isTeacherParent && onSwitchBackToTeacher && (
            <button
              type="button"
              onClick={onSwitchBackToTeacher}
              className="px-3.5 py-2 rounded-2xl bg-indigo-50 hover:bg-indigo-100 border border-indigo-300 text-indigo-950 text-xs font-black flex items-center gap-1.5 cursor-pointer transition-all shadow-xs"
              title="العودة لبوابة المعلم ورصد الحصص"
            >
              <ArrowLeftRight className="w-4 h-4 text-indigo-700" />
              <span>العودة للمعلم 👨‍🏫</span>
            </button>
          )}
          {children.length > 1 && (
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-2xl px-3 py-1.5">
              <span className="text-xs text-slate-500 font-bold">اختيار الابن:</span>
              <select
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
                className="bg-white border border-slate-200 rounded-xl px-2.5 py-1 text-xs text-slate-800 font-bold focus:outline-teal-500"
              >
                {children.map((c) => {
                  const cSchool = schools.find((s) => s.code === c.schoolCode);
                  return (
                    <option key={c.id} value={c.id}>
                      {c.name} — {cSchool ? `${cSchool.name} (${c.className})` : c.className}
                    </option>
                  );
                })}
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

        {/* Multi-School / Multi-Child Quick Navigation Pills */}
        {children.length > 1 && (
          <div className="w-full pt-4 border-t border-slate-100 flex flex-wrap items-center gap-2">
            <span className="text-xs font-black text-slate-600 flex items-center gap-1.5 ml-1">
              <span>الأبناء المسجلون ({children.length}):</span>
            </span>
            {children.map((c) => {
              const isSelected = c.id === currentChild?.id;
              const cSchool = schools.find((s) => s.code === c.schoolCode);
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelectedStudentId(c.id)}
                  className={`px-3.5 py-2 rounded-2xl text-xs font-black flex items-center gap-2 transition-all cursor-pointer border ${
                    isSelected
                      ? 'bg-teal-600 text-white border-teal-600 shadow-sm scale-105 ring-2 ring-teal-300'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <span>👨‍🎓 {c.name}</span>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                      isSelected
                        ? 'bg-teal-800/60 text-teal-100 border border-teal-500/30'
                        : 'bg-white text-slate-600 border border-slate-200'
                    }`}
                  >
                    {cSchool?.name || c.className}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* 2. Unified Multi-School Family Grid (جميع أبنائي في مختلف المدارس في صفحة واحدة) */}
      {children.length > 0 && (
        <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-white rounded-3xl p-6 shadow-xl border border-slate-700/80 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-700/80 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-teal-500/20 text-teal-300 border border-teal-500/30 flex items-center justify-center shadow-inner">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-teal-500/20 text-teal-300 text-[10px] font-bold border border-teal-500/30">
                    لوحة الأسرة الموحدة
                  </span>
                  <span className="text-xs text-slate-400 font-medium">
                    {children.length} أبناء مسجلين عبر {distinctChildSchools.length} مدارس
                  </span>
                </div>
                <h3 className="text-base sm:text-lg font-black text-white mt-0.5">
                  جميع أبنائي في مختلف المدارس في صفحة واحدة 👨‍👧‍👦
                </h3>
                <p className="text-xs text-slate-300 font-medium">
                  نظرة فورية موحدة على حالة الحضور، الانضباط، والغياب اليومي لجميع الأبناء دون الحاجة للتنقل بين الأنظمة والحسابات.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsAddChildOpen(!isAddChildOpen)}
              className="px-3.5 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-black flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>{isAddChildOpen ? 'إلغاء الربط' : '+ ربط ابن من مدرسة أخرى'}</span>
            </button>
          </div>

          {/* Inline Link Child form if toggled */}
          {isAddChildOpen && (
            <div className="bg-slate-800/90 border border-teal-500/40 rounded-2xl p-5 space-y-4 animate-fadeIn">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-black text-teal-300 flex items-center gap-2">
                  <UserPlus className="w-4 h-4" />
                  <span>ربط ابن جديد من أي مدرسة في المملكة بحسابك الموحد</span>
                </h4>
                <button
                  type="button"
                  onClick={() => setIsAddChildOpen(false)}
                  className="text-slate-400 hover:text-white text-xs cursor-pointer"
                >
                  ✕ إغلاق
                </button>
              </div>
              <form onSubmit={handleLinkChild} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-right">
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">رقم هوية الابن *</label>
                  <input
                    type="text"
                    required
                    maxLength={10}
                    value={linkChildNid}
                    onChange={(e) => setLinkChildNid(e.target.value)}
                    placeholder="10 أرقام"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">اسم الابن</label>
                  <input
                    type="text"
                    value={linkChildName}
                    onChange={(e) => setLinkChildName(e.target.value)}
                    placeholder="اسم الابن كاملاً"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">المدرسة التابع لها *</label>
                  <select
                    value={linkChildSchoolCode}
                    onChange={(e) => setLinkChildSchoolCode(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-bold"
                  >
                    {schools.map((s) => (
                      <option key={s.code} value={s.code}>
                        {s.name} ({s.city})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-end">
                  <button
                    type="submit"
                    className="w-full py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-black text-xs transition-all cursor-pointer shadow-md"
                  >
                    تأكيد الربط الفوري ↵
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* The Multi-School Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {children.map((child) => {
              const isSelected = child.id === currentChild?.id;
              const cSchool = schools.find((s) => s.code === child.schoolCode);
              const cAttendances = attendances.filter((a) => a.studentId === child.id);
              const cTodayAtt = cAttendances.find((a) => a.date === today);
              const cAbsences = cAttendances.filter((a) => a.finalStatus === 'absent').length;
              const cLates = cAttendances.filter((a) => a.finalStatus === 'late').length;
              const cLogs = behaviorLogs.filter((b: StudentBehaviorLog) => b.studentId === child.id);
              const cSummons = parentSummons.filter((s: ParentSummon) => s.studentId === child.id && s.status === 'pending');

              return (
                <div
                  key={child.id}
                  onClick={() => setSelectedStudentId(child.id)}
                  className={`p-5 rounded-2xl transition-all cursor-pointer text-right flex flex-col justify-between relative overflow-hidden border-2 ${
                    isSelected
                      ? 'bg-slate-800/95 border-teal-400 shadow-lg shadow-teal-500/10 ring-2 ring-teal-400/40'
                      : 'bg-slate-800/50 hover:bg-slate-800/80 border-slate-700/80 hover:border-slate-600'
                  }`}
                >
                  {isSelected && (
                    <div className="absolute top-0 left-0 bg-teal-500 text-slate-950 text-[10px] font-black px-3 py-0.5 rounded-br-xl shadow-xs">
                      الابن المعروض تفاصيله حالياً 👁️
                    </div>
                  )}

                  <div className="space-y-3">
                    {/* Header: Child name + Grade */}
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-xl bg-teal-500/20 border border-teal-500/30 text-teal-300 flex items-center justify-center text-lg shrink-0">
                        👨‍🎓
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="text-sm font-black text-white truncate">{child.name}</h4>
                        <p className="text-[11px] text-slate-300 font-medium">
                          {child.className} • شعبة {child.sectionName || '1'}
                        </p>
                      </div>
                    </div>

                    {/* School Badge */}
                    <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-700/60 flex items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <Building2 className="w-4 h-4 text-teal-400 shrink-0" />
                        <span className="font-bold text-slate-200 truncate">{cSchool?.name || child.schoolCode}</span>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-mono shrink-0">
                        {cSchool?.city || 'المملكة'}
                      </span>
                    </div>

                    {/* Live Today Status */}
                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/40 border border-slate-800">
                      <span className="text-[11px] font-medium text-slate-400">حالة حضور اليوم:</span>
                      {cTodayAtt?.finalStatus === 'present' ? (
                        <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[11px] font-bold flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                          حاضر بالمدرسة ✅
                        </span>
                      ) : cTodayAtt?.finalStatus === 'absent' ? (
                        <span className="px-2.5 py-1 rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[11px] font-bold flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-rose-400"></span>
                          غائب اليوم ❌
                        </span>
                      ) : cTodayAtt?.finalStatus === 'late' ? (
                        <span className="px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[11px] font-bold flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                          متأخر صباحاً ⚠️
                        </span>
                      ) : cTodayAtt?.finalStatus === 'excused' ? (
                        <span className="px-2.5 py-1 rounded-lg bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[11px] font-bold flex items-center gap-1">
                          غياب بعذر مقبول 📋
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-lg bg-slate-700/40 text-slate-300 text-[11px] font-medium">
                          قيد التحضير والرصد ⏳
                        </span>
                      )}
                    </div>

                    {/* Quick Metrics */}
                    <div className="grid grid-cols-3 gap-2 text-center text-xs">
                      <div className="p-2 rounded-xl bg-slate-900/50 border border-slate-700/50">
                        <span className="text-[10px] text-slate-400 block">أيام الغياب</span>
                        <span className={`font-black text-sm ${cAbsences > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                          {cAbsences}
                        </span>
                      </div>
                      <div className="p-2 rounded-xl bg-slate-900/50 border border-slate-700/50">
                        <span className="text-[10px] text-slate-400 block">مرات التأخر</span>
                        <span className={`font-black text-sm ${cLates > 0 ? 'text-amber-400' : 'text-slate-300'}`}>
                          {cLates}
                        </span>
                      </div>
                      <div className="p-2 rounded-xl bg-slate-900/50 border border-slate-700/50">
                        <span className="text-[10px] text-slate-400 block">ملاحظات وسلوك</span>
                        <span className="font-black text-sm text-teal-300">
                          {cLogs.length}
                        </span>
                      </div>
                    </div>

                    {cSummons.length > 0 && (
                      <div className="p-2 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-200 text-[11px] font-bold flex items-center gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                        <span>يوجد استدعاء رسمي من إدارة المدرسة معلق</span>
                      </div>
                    )}
                  </div>

                  {/* Card Actions */}
                  <div className="pt-3 mt-3 border-t border-slate-700/70 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedStudentId(child.id);
                        handleOpenExcuse(undefined);
                      }}
                      className="px-2.5 py-1.5 rounded-lg bg-teal-600/30 hover:bg-teal-600/50 text-teal-200 text-[11px] font-bold border border-teal-500/40 transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <FileText className="w-3 h-3" />
                      <span>تقديم عذر 📤</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedStudentId(child.id)}
                      className={`text-xs font-black transition-all flex items-center gap-1 cursor-pointer ${
                        isSelected ? 'text-teal-400' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <span>{isSelected ? 'المعروض بالأسفل' : 'تفصيل السجل ↵'}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {!currentChild ? (
        <div className="bg-white border border-slate-200 rounded-3xl p-8 text-center space-y-5 shadow-sm max-w-lg mx-auto">
          <div className="w-16 h-16 rounded-2xl bg-teal-50 text-teal-600 border border-teal-200 flex items-center justify-center mx-auto shadow-inner">
            <GraduationCap className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-base font-black text-slate-900">ربط بيانات الطالب بحساب ولي الأمر</h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              لم يتم العثور على طالب مسجل تلقائياً تحت رقم هويتك. يرجى إدخال رقم هوية الابن لربطه بحسابك فوراً ومتابعة حضوره وسلوكه.
            </p>
          </div>

          {linkStatusMsg && (
            <div className="p-3 bg-emerald-50 text-emerald-800 text-xs font-bold rounded-xl border border-emerald-200">
              {linkStatusMsg}
            </div>
          )}

          <form onSubmit={handleLinkChild} className="space-y-3 text-right">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">رقم هوية الطالب *</label>
              <input
                type="text"
                required
                maxLength={10}
                value={linkChildNid}
                onChange={(e) => setLinkChildNid(e.target.value)}
                placeholder="10 أرقام (مثال: 1122334455)"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">اسم الطالب (إذا كان تسجيلاً جديداً)</label>
              <input
                type="text"
                value={linkChildName}
                onChange={(e) => setLinkChildName(e.target.value)}
                placeholder="اسم الطالب كاملاً"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold"
              />
            </div>

            {schools.length > 1 && (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">المدرسة التابع لها الابن *</label>
                <select
                  value={linkChildSchoolCode}
                  onChange={(e) => setLinkChildSchoolCode(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold"
                >
                  {schools.map((s) => (
                    <option key={s.code} value={s.code}>
                      {s.name} ({s.code})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">الصف</label>
                <input
                  type="text"
                  value={linkChildClass}
                  onChange={(e) => setLinkChildClass(e.target.value)}
                  placeholder="الأول الثانوي"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">الفصل</label>
                <input
                  type="text"
                  value={linkChildSection}
                  onChange={(e) => setLinkChildSection(e.target.value)}
                  placeholder="1"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 px-4 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-black text-xs shadow-md transition-all cursor-pointer"
            >
              ربط الابن وتفعيل المتابعة ↵
            </button>
          </form>
        </div>
      ) : behaviorSummary ? (
        <>
          {/* Rain Emergency Absence Suspension Banner for Parents */}
          {isAbsenceSuspendedForSchool(currentSchool, today) && (
            <div className="bg-sky-50 border-2 border-sky-300 rounded-3xl p-5 text-sky-950 flex items-start sm:items-center gap-4 shadow-sm animate-fadeIn">
              <div className="w-12 h-12 rounded-2xl bg-sky-500 text-white flex items-center justify-center shrink-0 shadow-md shadow-sky-500/20">
                <CloudRain className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-sky-200 text-sky-900 font-black text-xs">
                    🌧️ إشعار رسمي من المدرسة: إيقاف احتساب الغياب لليوم ({today})
                  </span>
                </div>
                <h4 className="text-sm font-black text-sky-950">
                  أبناؤكم معفون من احتساب الغياب نظراً لـ ({currentSchool.absenceSuspensionReason || 'الظروف المطرية والإنذارات المفاجئة'})
                </h4>
                <p className="text-xs text-sky-800 leading-relaxed font-medium">
                  نطمئنكم بأنه تم إيقاف رصد الغياب على الطالب ({currentChild.name}) ولن تتأثر درجات المواظبة إطلاقاً. لا داعي لتقديم أعذار أو الاتصال بإدارة المدرسة.
                </p>
              </div>
            </div>
          )}

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
                  <p className="text-xs text-slate-400 font-medium flex flex-wrap items-center gap-2 mt-1">
                    <span className="px-2.5 py-0.5 rounded-lg bg-teal-950/80 text-teal-300 font-bold border border-teal-700/60 text-[11px] flex items-center gap-1">
                      <span>🏫</span>
                      <span>{childSchool.name}</span>
                    </span>
                    <span>
                      {currentChild.className} - فصل {currentChild.sectionName} | هوية: {currentChild.nationalId}
                    </span>
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
                  {childExcuses.map((excuse) => {
                    const isCond = excuse.approvalType === 'conditional' || excuse.status === 'conditional_approved';
                    return (
                      <div
                        key={excuse.id}
                        className={`p-4 rounded-2xl space-y-2.5 text-xs border ${
                          isCond ? 'bg-amber-50/70 border-amber-300 shadow-2xs' : 'bg-slate-50 border-slate-200'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-black text-slate-900 text-sm">{excuse.date}</span>
                            <span className="text-[11px] px-2 py-0.5 rounded-md bg-slate-200 text-slate-800 font-bold">
                              {excuse.requestedByRole === 'parent' ? 'مقدم من ولي الأمر' : 'مقدم ذاتياً من الطالب'}
                            </span>
                            {isCond && (
                              <span className="px-2 py-0.5 rounded-md bg-amber-200 text-amber-950 font-black text-[10px] border border-amber-400">
                                ⚠️ قبول مشروط
                              </span>
                            )}
                          </div>

                          <span className={`px-2.5 py-1 rounded-full font-black text-[11px] ${
                            excuse.status === 'rejected' ? 'bg-rose-100 text-rose-800 border border-rose-200' :
                            isCond ? 'bg-amber-200 text-amber-950 border border-amber-400 ring-1 ring-amber-300 font-black' :
                            excuse.status === 'approved' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                            'bg-amber-100 text-amber-900 border border-amber-200'
                          }`}>
                            {excuse.status === 'rejected' ? '✕ تم رفض العذر' :
                             isCond ? '⚠️ تم قبول العذر قبولاً مشروطاً (+1)' :
                             excuse.status === 'approved' ? '✓ تم قبول العذر رسمياً واستعادة الدرجة (+1)' : '⏳ قيد مراجعة الإدارة'}
                          </span>
                        </div>

                        <p className="text-slate-700 bg-white p-2.5 rounded-xl border border-slate-100 font-medium">
                          <strong>المبرر المرفوع للإدارة:</strong> {excuse.reason}
                        </p>

                        {excuse.adminDecisionNotes && (
                          <div className={`p-3 rounded-xl border text-xs space-y-1 ${
                            isCond ? 'bg-amber-100/90 text-amber-950 border-amber-300 shadow-2xs' :
                            excuse.status === 'rejected' ? 'bg-rose-50 text-rose-900 border-rose-200' :
                            'bg-emerald-50 text-emerald-900 border-emerald-200'
                          }`}>
                            <div className="flex items-center gap-1.5 font-black text-[12px]">
                              {isCond ? <AlertTriangle className="w-4 h-4 text-amber-700" /> : <CheckCircle className="w-4 h-4 text-emerald-700" />}
                              <span>{isCond ? '⚠️ رسالة وتوجيه إدارة المدرسة لولي الأمر (قبول مشروط):' : 'قرار وتوجيه الإدارة:'}</span>
                            </div>
                            <p className="font-medium pr-5 text-slate-900 leading-relaxed bg-white/90 p-2.5 rounded-lg border border-amber-200/70">
                              "{excuse.adminDecisionNotes}"
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })}
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
                          (a.excuseStatus === 'conditional_accepted' || a.excuseDecisionType === 'conditional') ? 'bg-amber-100 text-amber-950 border border-amber-300 ring-1 ring-amber-200' :
                          a.excuseStatus === 'accepted' ? 'bg-teal-50 text-teal-800 border border-teal-200' :
                          'bg-rose-50 text-rose-800 border border-rose-200'
                        }`}>
                          {a.finalStatus === 'present' ? 'حاضر' :
                           a.finalStatus === 'late' ? 'متأخر' :
                           (a.excuseStatus === 'conditional_accepted' || a.excuseDecisionType === 'conditional') ? 'معذور (قبول مشروط ⚠️)' :
                           a.excuseStatus === 'accepted' ? 'غائب بعذر رسمي' : 'غائب بدون عذر (-1)'}
                        </span>

                        {a.finalStatus === 'absent' && a.excuseStatus !== 'accepted' && a.excuseStatus !== 'conditional_accepted' && (
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
      ) : null}

      {/* Submit Excuse Modal */}
      {isExcuseModalOpen && currentChild && (
        <SubmitExcuseModal
          student={currentChild}
          currentSchool={childSchool}
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
