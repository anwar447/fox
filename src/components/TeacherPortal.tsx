import React, { useState, useEffect } from 'react';
import { User, School, Attendance, AttendanceStatus, StudentPermission } from '../types';
import { getAttendances, saveAttendances, getUsers, getPermissions, getBehaviorLogs, getSystemNotifications } from '../utils/storage';
import { calculateStudentBehaviorScore } from '../utils/behavior';
import { soundManager } from '../utils/audio';
import { getTodayDateString } from '../utils/academic';
import { 
  Shield, CheckCircle, XCircle, Clock, 
  AlertTriangle, Save, Users, Sparkles, Filter, 
  Activity, ArrowUpRight, ShieldAlert, LogOut, Check, Star, ThumbsUp, ThumbsDown,
  UserCheck, UserX, CheckCheck, RefreshCw, UserPlus, X, BookOpen
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { StudentPermissionModal } from './StudentPermissionModal';
import { BehaviorRecordModal } from './BehaviorRecordModal';
import { LiveClockHeader } from './LiveClockHeader';
import { BroadcastAlertBanner } from './BroadcastAlertBanner';
import { TeacherEditClassesModal } from './TeacherEditClassesModal';
import { getSchoolClasses } from '../utils/schoolClasses';
import { Building2 } from 'lucide-react';
import { saveUsers } from '../utils/storage';

interface TeacherPortalProps {
  currentUser: User;
  currentSchool: School;
  schools?: School[];
  onSwitchSchool?: (school: School) => void;
  onOpenDossier: (student: User) => void;
  onOpenClassRoster?: (className?: string, sectionName?: string) => void;
  onSwitchToParentView?: () => void;
}

export const TeacherPortal: React.FC<TeacherPortalProps> = ({
  currentUser,
  currentSchool,
  schools = [],
  onSwitchSchool,
  onOpenDossier,
  onOpenClassRoster,
  onSwitchToParentView,
}) => {
  const today = getTodayDateString();
  const allUsers = getUsers();
  const allAttendances = getAttendances();

  // Find linked or matching children for this teacher if they are also a parent
  const userChildren = allUsers.filter((u) => {
    if (u.role !== 'student') return false;
    const cleanUNid = (u.nationalId || '').trim();
    const isChildNid = currentUser.childrenNationalIds?.some((nid) => nid?.trim() === cleanUNid);
    const cleanParentMob = (currentUser.mobile || '').trim().replace(/\D/g, '');
    const cleanStudentParentMob = (u.parentMobile || '').trim().replace(/\D/g, '');
    const isMobileMatch = Boolean(cleanParentMob && cleanStudentParentMob && (
      cleanParentMob === cleanStudentParentMob ||
      cleanParentMob.endsWith(cleanStudentParentMob) ||
      cleanStudentParentMob.endsWith(cleanParentMob)
    ));
    return isChildNid || isMobileMatch;
  });
  const [permissionsVersion, setPermissionsVersion] = useState(0);
  const [behaviorVersion, setBehaviorVersion] = useState(0);

  // Assigned schools for this teacher/user (including teachingSchoolCode and any school where they have assigned classes or account)
  const allTeacherSchoolCodes = new Set<string>([
    currentSchool.code,
    currentUser.schoolCode,
    currentUser.teachingSchoolCode || '',
    ...(currentUser.managedSchoolCodes || []),
  ].filter(Boolean));

  // Also scan allUsers to find any schools where this teacher is registered
  allUsers.forEach((u) => {
    const isSamePerson = 
      (u.id === currentUser.id) || 
      (currentUser.nationalId && u.nationalId && u.nationalId.trim() === currentUser.nationalId.trim()) ||
      (currentUser.mobile && u.mobile && u.mobile.trim() === currentUser.mobile.trim());
    if (isSamePerson && (u.role === 'teacher' || u.staffTitle === 'teacher' || (u.assignedClasses && u.assignedClasses.length > 0))) {
      if (u.schoolCode) allTeacherSchoolCodes.add(u.schoolCode);
      if (u.teachingSchoolCode) allTeacherSchoolCodes.add(u.teachingSchoolCode);
      if (Array.isArray(u.managedSchoolCodes)) u.managedSchoolCodes.forEach((c) => c && allTeacherSchoolCodes.add(c));
    }
  });

  const teacherSchools = schools.filter((s) => allTeacherSchoolCodes.has(s.code));

  // Primary teaching school resolution
  const primaryTeachingSchool = schools.find((s) => s.code === (currentUser.teachingSchoolCode || currentUser.schoolCode));
  const isViewingDifferentSchool = Boolean(
    primaryTeachingSchool &&
    primaryTeachingSchool.code !== currentSchool.code &&
    (currentUser.assignedClasses && currentUser.assignedClasses.length > 0)
  );

  // Student Behavior Modal State
  const [selectedStudentForBehavior, setSelectedStudentForBehavior] = useState<User | null>(null);
  const [isBehaviorModalOpen, setIsBehaviorModalOpen] = useState(false);

  // Find students in current school (case-insensitive and tolerant of code/id/name)
  const schoolStudents = allUsers.filter(
    (u) =>
      u.role === 'student' &&
      (
        u.schoolCode?.toUpperCase() === currentSchool.code?.toUpperCase() ||
        u.schoolCode === currentSchool.id ||
        u.schoolCode === currentSchool.name ||
        (currentUser.managedSchoolCodes?.includes(u.schoolCode))
      )
  );

  const [activeUser, setActiveUser] = useState<User>(currentUser);
  const [isEditClassesOpen, setIsEditClassesOpen] = useState(false);

  useEffect(() => {
    setActiveUser(currentUser);
  }, [currentUser]);

  // Collect classes from:
  // 1. Teacher assignedClasses
  const teacherClasses = activeUser.assignedClasses?.map((c) => c.className).filter(Boolean) as string[] || [];
  // 2. School standard stage classes (e.g. all 3 middle school grades)
  const stageClasses = getSchoolClasses(currentSchool).map((c) => c.className).filter(Boolean);
  // 3. School configured custom classes
  const schoolConfigClasses = currentSchool.customClasses?.map((c) => c.className).filter(Boolean) as string[] || [];
  // 4. Enrolled students
  const studentClasses = schoolStudents.map((s) => s.className).filter(Boolean) as string[];

  const classes = Array.from(
    new Set([
      ...teacherClasses,
      ...stageClasses,
      ...schoolConfigClasses,
      ...studentClasses,
    ])
  ).filter(Boolean);

  if (classes.length === 0) {
    classes.push(currentSchool.type === 'secondary' ? 'الأول الثانوي' : currentSchool.type === 'middle' ? 'الأول المتوسط' : 'الأول الابتدائي');
  }

  const initialClass = teacherClasses[0] || classes[0] || 'الأول المتوسط';
  const [selectedClass, setSelectedClass] = useState<string>(initialClass);

  // Sync selectedClass whenever school or classes list changes
  useEffect(() => {
    if (classes.length > 0 && !classes.includes(selectedClass)) {
      setSelectedClass(teacherClasses[0] || classes[0]);
    }
  }, [currentSchool.code, classes, selectedClass, teacherClasses]);

  // Group sections for selectedClass
  const teacherSections = activeUser.assignedClasses
    ?.filter((c) => c.className === selectedClass)
    .map((c) => c.sectionName)
    .filter(Boolean) as string[] || [];

  const stageSections = getSchoolClasses(currentSchool).find((c) => c.className === selectedClass)?.sections || ['1', '2', '3', '4'];

  const schoolConfigSections = currentSchool.customClasses
    ?.find((c) => c.className === selectedClass)
    ?.sections || [];

  const studentSections = schoolStudents
    .filter((s) => s.className === selectedClass)
    .map((s) => s.sectionName || '1')
    .filter(Boolean) as string[];

  const sections = Array.from(
    new Set([
      ...teacherSections,
      ...stageSections,
      ...schoolConfigSections,
      ...studentSections,
    ])
  ).filter(Boolean);

  if (sections.length === 0) {
    sections.push('1');
  }

  const initialSection = teacherSections[0] || sections[0] || '1';
  const [selectedSection, setSelectedSection] = useState<string>(initialSection);

  // Sync selectedSection whenever class or sections list changes
  useEffect(() => {
    if (sections.length > 0 && !sections.includes(selectedSection)) {
      setSelectedSection(teacherSections[0] || sections[0]);
    }
  }, [selectedClass, sections, selectedSection]);

  const handleTeacherClassesUpdated = (updatedUser: User) => {
    setActiveUser(updatedUser);
    if (updatedUser.assignedClasses && updatedUser.assignedClasses.length > 0) {
      setSelectedClass(updatedUser.assignedClasses[0].className);
      setSelectedSection(updatedUser.assignedClasses[0].sectionName);
    }
  };

  // Quick Student Add State for teacher
  const [isQuickAddStudentOpen, setIsQuickAddStudentOpen] = useState(false);
  const [quickStudentName, setQuickStudentName] = useState('');
  const [quickStudentNid, setQuickStudentNid] = useState('');
  const [quickStudentMobile, setQuickStudentMobile] = useState('');

  // Filter students for chosen class & section
  const currentStudents = schoolStudents.filter(
    (s) => s.className === selectedClass && (s.sectionName || '1') === selectedSection
  );

  // Local state for teacher marking
  const [marks, setMarks] = useState<Record<string, AttendanceStatus>>(() => {
    const initial: Record<string, AttendanceStatus> = {};
    currentStudents.forEach((st) => {
      const rec = allAttendances.find((a) => a.studentId === st.id && a.date === today);
      initial[st.id] = rec?.teacherMark || (rec?.selfCheckTime ? 'present' : 'absent');
    });
    return initial;
  });

  // Sync marks when changing class or section
  useEffect(() => {
    setMarks((prev) => {
      const updated = { ...prev };
      currentStudents.forEach((st) => {
        if (!updated[st.id]) {
          const rec = allAttendances.find((a) => a.studentId === st.id && a.date === today);
          updated[st.id] = rec?.teacherMark || (rec?.selfCheckTime ? 'present' : 'absent');
        }
      });
      return updated;
    });
  }, [selectedClass, selectedSection, currentStudents.length]);

  const [savedMsg, setSavedMsg] = useState('');
  
  // Student Permission Modal State
  const [selectedStudentForPerm, setSelectedStudentForPerm] = useState<User | null>(null);
  const [isPermModalOpen, setIsPermModalOpen] = useState(false);

  const handleMarkChange = (studentId: string, status: AttendanceStatus) => {
    soundManager.playBeep();
    setMarks((prev) => ({ ...prev, [studentId]: status }));
  };

  // Option 1: Mark all students as PRESENT (Teacher can then just pick the absent ones)
  const handleMarkAllPresent = () => {
    soundManager.playSuccess();
    const newMarks: Record<string, AttendanceStatus> = { ...marks };
    currentStudents.forEach((st) => {
      newMarks[st.id] = 'present';
    });
    setMarks(newMarks);
    setSavedMsg('🟢 تم تحديد جميع طلاب الفصل كـ "حاضر". يمكنك الآن النقر على "غائب" للطلاب المتغيبين فقط.');
    setTimeout(() => setSavedMsg(''), 4000);
  };

  // Option 2: Mark all students as ABSENT (Teacher can then just pick the present ones)
  const handleMarkAllAbsent = () => {
    soundManager.playBeep();
    const newMarks: Record<string, AttendanceStatus> = { ...marks };
    currentStudents.forEach((st) => {
      newMarks[st.id] = 'absent';
    });
    setMarks(newMarks);
    setSavedMsg('🔴 تم تحديد جميع طلاب الفصل كـ "غائب". يمكنك الآن النقر على "حاضر" للطلاب الحاضرين فقط.');
    setTimeout(() => setSavedMsg(''), 4000);
  };

  // Option 3: Reset to Gatekeeper records
  const handleResetToGateRecords = () => {
    soundManager.playBeep();
    const newMarks: Record<string, AttendanceStatus> = { ...marks };
    currentStudents.forEach((st) => {
      const rec = allAttendances.find((a) => a.studentId === st.id && a.date === today);
      newMarks[st.id] = rec?.selfCheckTime ? 'present' : 'absent';
    });
    setMarks(newMarks);
    setSavedMsg('🔄 تم استعادة حالة الحضور بناءً على تسجيل الطلاب عند البوابة الصباحية.');
    setTimeout(() => setSavedMsg(''), 3500);
  };

  // Real-time counts for current class
  const presentCount = currentStudents.filter((st) => (marks[st.id] || 'absent') === 'present').length;
  const absentCount = currentStudents.filter((st) => (marks[st.id] || 'absent') === 'absent').length;
  const lateCount = currentStudents.filter((st) => (marks[st.id] || 'absent') === 'late').length;

  const handleSaveAllMarks = () => {
    const updatedAttendances = [...getAttendances()];

    currentStudents.forEach((st) => {
      const mark = marks[st.id] || 'absent';
      const existingIdx = updatedAttendances.findIndex(
        (a) => a.studentId === st.id && a.date === today
      );

      // Truancy detection rule: self checked present at gate, but teacher marked absent in classroom!
      const selfPresent = existingIdx >= 0 && !!updatedAttendances[existingIdx].selfCheckTime;
      const isTruant = selfPresent && mark === 'absent';

      if (existingIdx >= 0) {
        updatedAttendances[existingIdx].teacherMark = mark;
        updatedAttendances[existingIdx].finalStatus = mark;
        updatedAttendances[existingIdx].isTruant = isTruant;
      } else {
        updatedAttendances.push({
          id: `att-${st.id}-${today}`,
          studentId: st.id,
          studentName: st.name,
          nationalId: st.nationalId,
          schoolCode: currentSchool.code,
          className: st.className || selectedClass,
          sectionName: st.sectionName || selectedSection,
          date: today,
          selfCheckTime: null,
          teacherMark: mark,
          finalStatus: mark,
          isTruant: false,
          parentMobile: st.parentMobile,
        });
      }
    });

    saveAttendances(updatedAttendances);
    soundManager.playSuccess();
    confetti({ particleCount: 50, spread: 50 });
    setSavedMsg('✅ تم حفظ ورصد حضور الحصة بنجاح.');
    setTimeout(() => setSavedMsg(''), 3500);
  };

  const allPermissions = getPermissions();
  const todayPermissions = allPermissions.filter((p) => p.schoolCode === currentSchool.code && p.date === today);

  const openPermissionModal = (student: User) => {
    setSelectedStudentForPerm(student);
    setIsPermModalOpen(true);
  };

  const handleQuickAddStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickStudentName.trim() || !quickStudentNid.trim()) {
      alert('يرجى كتابة اسم الطالب ورقم الهوية');
      return;
    }

    const cleanNid = quickStudentNid.trim().replace(/\D/g, '');
    const cleanName = quickStudentName.trim();
    const cleanMobile = quickStudentMobile.trim();

    const existingUsers = getUsers();
    const newStudent: User = {
      id: `usr-s-${cleanNid}`,
      nationalId: cleanNid,
      name: cleanName,
      mobile: cleanMobile || undefined,
      password: cleanNid.slice(-4) || '123',
      role: 'student',
      schoolCode: currentSchool.code,
      className: selectedClass,
      sectionName: selectedSection,
      managedSchoolCodes: [currentSchool.code],
    };

    const sIdx = existingUsers.findIndex((u) => u.nationalId === cleanNid);
    let updatedUsers = [...existingUsers];
    if (sIdx >= 0) {
      updatedUsers[sIdx] = { ...updatedUsers[sIdx], ...newStudent };
    } else {
      updatedUsers.push(newStudent);
    }

    saveUsers(updatedUsers);

    // Add initial attendance for today
    const currentAtts = getAttendances();
    if (!currentAtts.some((a) => a.studentId === newStudent.id && a.date === today)) {
      currentAtts.push({
        id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        studentId: newStudent.id,
        studentName: newStudent.name,
        nationalId: newStudent.nationalId,
        schoolCode: currentSchool.code,
        className: selectedClass,
        sectionName: selectedSection,
        date: today,
        selfCheckTime: null,
        teacherMark: 'present',
        finalStatus: 'present',
        isTruant: false,
      });
      saveAttendances(currentAtts);
    }

    setQuickStudentName('');
    setQuickStudentNid('');
    setQuickStudentMobile('');
    setIsQuickAddStudentOpen(false);
    soundManager.playSuccess();
    setSavedMsg(`✅ تم إضافة الطالب ${cleanName} لفصل (${selectedClass} - فصل ${selectedSection}) ورصده كحاضر.`);
    setTimeout(() => setSavedMsg(''), 4000);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto py-6 px-4 text-slate-800" dir="rtl">
      
      {/* Live Day, Date & Live Clock Header Bar */}
      <LiveClockHeader />

      {/* Urgent Broadcast Banner */}
      <BroadcastAlertBanner
        notifications={getSystemNotifications().filter(
          (n) => n.schoolCode === currentSchool.code || !n.schoolCode
        )}
      />

      {/* Primary Teaching School Notice & Quick Switcher */}
      {isViewingDifferentSchool && primaryTeachingSchool && onSwitchSchool && (
        <div className="bg-amber-50 border-2 border-amber-300 rounded-3xl p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3 text-amber-950 animate-fadeIn shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-500 text-white flex items-center justify-center font-bold text-xl shadow-xs shrink-0">
              🏢
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-xs sm:text-sm text-amber-950">
                  تنبيه المدرسة النشطة: أنت تتصفح حالياً ({currentSchool.name})
                </span>
                <span className="px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 text-[10px] font-black">
                  مدرستك الأساسية: {primaryTeachingSchool.name}
                </span>
              </div>
              <p className="text-xs text-amber-800 mt-1 font-medium">
                فصولك وطلابك المسندين مسجلين في مدرسة ({primaryTeachingSchool.name}). يمكنك التبديل إليها فوراً لبدء التحضير.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onSwitchSchool(primaryTeachingSchool)}
            className="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-black text-xs shrink-0 cursor-pointer shadow-sm transition-all hover:scale-105 active:scale-95 flex items-center gap-1.5"
          >
            <span>التبديل إلى ({primaryTeachingSchool.name}) ↵</span>
          </button>
        </div>
      )}

      {/* Teacher Header */}
      <div className="bg-white border border-slate-200/90 rounded-3xl p-6 flex flex-wrap items-center justify-between gap-4 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center justify-center">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-800 text-[10px] font-bold border border-indigo-200">
              بوابة المعلم ورصد الحصص والاستئذان
            </span>
            <h2 className="text-lg font-black text-slate-900 mt-1">أهلاً بك، {currentUser.name}</h2>
            <p className="text-xs text-slate-500 font-medium">
              المدرسة الحالية: <strong className="text-indigo-900">{currentSchool.name}</strong> (كود: {currentSchool.code})
            </p>
          </div>
        </div>

        {/* Multi-School Switcher for Teacher + Class & Section pickers */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {teacherSchools.length > 1 && onSwitchSchool && (
            <div className="flex items-center gap-1 bg-amber-50 border border-amber-200 rounded-xl px-2.5 py-1.5 shadow-2xs">
              <Building2 className="w-3.5 h-3.5 text-amber-700" />
              <span className="text-[11px] font-bold text-amber-950">المدرسة:</span>
              <select
                value={currentSchool.code}
                onChange={(e) => {
                  const target = schools.find((s) => s.code === e.target.value);
                  if (target) onSwitchSchool(target);
                }}
                className="bg-white border border-amber-300 text-amber-950 font-bold text-xs rounded-lg px-2 py-1 focus:outline-amber-500 cursor-pointer"
              >
                {teacherSchools.map((sch) => (
                  <option key={sch.id} value={sch.code}>
                    {sch.name} ({sch.code})
                  </option>
                ))}
              </select>
            </div>
          )}

          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-bold focus:outline-emerald-500"
          >
            {classes.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <select
            value={selectedSection}
            onChange={(e) => setSelectedSection(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-bold focus:outline-emerald-500"
          >
            {sections.map((s) => (
              <option key={s} value={s}>
                فصل {s}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => setIsEditClassesOpen(true)}
            className="py-2 px-3 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-200 font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-all shadow-2xs"
            title="تعديل أو إضافة الفصول والشعب المسندة لك"
          >
            <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
            <span>تعديل فصولي المسندة ({activeUser.assignedClasses?.length || 0})</span>
          </button>

          {onOpenClassRoster && (
            <button
              type="button"
              onClick={() => onOpenClassRoster(selectedClass, selectedSection)}
              className="py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-all shadow-2xs"
              title="عرض كشف طلاب الفصل والطباعة"
            >
              <Users className="w-3.5 h-3.5 text-amber-400" />
              <span>كشف طلاب الفصل والطباعة 📋🖨️</span>
            </button>
          )}

          {/* Dual Role Parent Switcher Button for Teacher */}
          {onSwitchToParentView && (
            <button
              type="button"
              onClick={onSwitchToParentView}
              className={`py-2 px-3.5 rounded-xl font-black text-xs flex items-center gap-1.5 cursor-pointer transition-all shadow-xs ${
                userChildren.length > 0
                  ? 'bg-amber-50 hover:bg-amber-100 text-amber-950 border border-amber-300 ring-1 ring-amber-200 hover:scale-[1.02]'
                  : 'bg-slate-100 hover:bg-amber-50 text-slate-700 hover:text-amber-900 border border-slate-200 hover:border-amber-300'
              }`}
              title="أنت معلم وأيضاً ولي أمر؟ انقر للتبديل الفوري لبوابة ولي الأمر ومتابعة أبنائك الطلاب"
            >
              <Users className="w-4 h-4 text-amber-700 shrink-0" />
              <span>
                {userChildren.length > 0
                  ? `بوابة ولي الأمر (أبنائي: ${userChildren.length}) 👨‍👧‍👦`
                  : 'التبديل لولي أمر (أبنائي) 👨‍👧‍👦'}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Quick Access Bar for Teacher's Assigned Classes */}
      {activeUser.assignedClasses && activeUser.assignedClasses.length > 0 && (
        <div className="bg-white border border-slate-200/90 rounded-2xl p-3 flex flex-wrap items-center justify-between gap-2 shadow-2xs">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-bold text-slate-600 flex items-center gap-1 pl-1">
              <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
              <span>فصولي المسندة:</span>
            </span>
            {activeUser.assignedClasses.map((ac, idx) => {
              const isActive = selectedClass === ac.className && selectedSection === ac.sectionName;
              return (
                <button
                  key={`${ac.className}-${ac.sectionName}-${idx}`}
                  type="button"
                  onClick={() => {
                    setSelectedClass(ac.className);
                    setSelectedSection(ac.sectionName);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs ${
                    isActive
                      ? 'bg-indigo-600 text-white ring-2 ring-indigo-500 ring-offset-1 font-black scale-[1.02]'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200'
                  }`}
                >
                  {ac.className} - فصل ({ac.sectionName})
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => setIsEditClassesOpen(true)}
            className="text-xs font-bold text-indigo-600 hover:text-indigo-800 hover:underline flex items-center gap-1 cursor-pointer py-1 px-2 rounded-lg hover:bg-indigo-50 transition-colors"
          >
            <span>+ إضافة أو تعديل الفصول</span>
          </button>
        </div>
      )}

      {savedMsg && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold shadow-xs">
          {savedMsg}
        </div>
      )}

      {/* Student List for Roster */}
      <div className="bg-white border border-slate-200/90 rounded-3xl p-6 space-y-5 shadow-xs">
        <div className="flex flex-wrap justify-between items-center gap-3 border-b border-slate-200 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-600" />
              <h3 className="text-base font-black text-slate-900">
                كشف طلاب ({selectedClass} - فصل {selectedSection})
              </h3>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              رصد الحضور الفعلي للحصة وربطه ببوابة المدرسة الصباحية
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleSaveAllMarks}
              className="py-2.5 px-5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 shadow-md shadow-emerald-600/20 cursor-pointer transition-all hover:scale-[1.02]"
            >
              <Save className="w-4 h-4" />
              <span>حفظ واعتماد الرصد ↵</span>
            </button>
          </div>
        </div>

        {/* Quick Bulk Action Buttons & Real-Time Statistics */}
        <div className="bg-slate-50/90 border border-slate-200 rounded-2xl p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-black text-slate-700 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>التحضير السريع (حرية الاختيار للمعلم):</span>
            </span>

            {/* Real-time counts summary chips */}
            <div className="flex flex-wrap items-center gap-1.5 text-xs font-bold">
              <span className="px-2.5 py-1 rounded-xl bg-emerald-100/80 text-emerald-900 border border-emerald-300">
                🟢 حاضر: {presentCount}
              </span>
              <span className="px-2.5 py-1 rounded-xl bg-rose-100/80 text-rose-900 border border-rose-300">
                🔴 غائب: {absentCount}
              </span>
              {lateCount > 0 && (
                <span className="px-2.5 py-1 rounded-xl bg-amber-100/80 text-amber-900 border border-amber-300">
                  🟡 متأخر: {lateCount}
                </span>
              )}
              <span className="px-2.5 py-1 rounded-xl bg-slate-200 text-slate-700 font-medium">
                الإجمالي: {currentStudents.length}
              </span>
            </div>
          </div>

          {/* Big Action Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
            {/* 1. All Present Button */}
            <button
              type="button"
              onClick={handleMarkAllPresent}
              className="p-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex flex-col sm:flex-row items-center justify-center gap-2 shadow-sm transition-all cursor-pointer hover:shadow-md"
            >
              <UserCheck className="w-5 h-5 text-emerald-100 shrink-0" />
              <div className="text-center sm:text-right">
                <span className="block font-black text-[13px]">الكل حاضر (تحضير الجميع) ✅</span>
                <span className="block text-[10px] text-emerald-100 font-normal">تحديد الجميع حاضرين ثم اختيار الغائبين فقط</span>
              </div>
            </button>

            {/* 2. All Absent Button */}
            <button
              type="button"
              onClick={handleMarkAllAbsent}
              className="p-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex flex-col sm:flex-row items-center justify-center gap-2 shadow-sm transition-all cursor-pointer hover:shadow-md"
            >
              <UserX className="w-5 h-5 text-rose-100 shrink-0" />
              <div className="text-center sm:text-right">
                <span className="block font-black text-[13px]">الكل غائب (تصفير الكشف) ⛔</span>
                <span className="block text-[10px] text-rose-100 font-normal">تحديد الجميع غائبين ثم اختيار الحاضرين فقط</span>
              </div>
            </button>

            {/* 3. Reset to Gate Records */}
            <button
              type="button"
              onClick={handleResetToGateRecords}
              className="p-3 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-bold text-xs flex flex-col sm:flex-row items-center justify-center gap-2 shadow-xs transition-all cursor-pointer"
            >
              <RefreshCw className="w-4 h-4 text-indigo-600 shrink-0" />
              <div className="text-center sm:text-right">
                <span className="block font-black text-[12px] text-slate-900">مطابقة مسح البوابة 🔄</span>
                <span className="block text-[10px] text-slate-500 font-normal">استرجاع الحضور المسجل عند بوابة الصباح</span>
              </div>
            </button>
          </div>
        </div>

        <div className="space-y-2.5">
          {currentStudents.length === 0 ? (
            <div className="text-center py-10 px-4 bg-slate-50 border border-dashed border-slate-300 rounded-3xl space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-200 flex items-center justify-center mx-auto">
                <Users className="w-7 h-7" />
              </div>
              <div className="max-w-md mx-auto space-y-1">
                <h4 className="text-sm font-black text-slate-800">
                  لا يوجد طلاب مسجلين حالياً في ({selectedClass} - فصل {selectedSection})
                </h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  يمكن للطلاب أو أولياء الأمور التسجيل عبر رابط الانضمام للمدرسة، أو يمكنك كمعلم إضافة طلاب هذا الفصل سريعاً وتفعيل التحضير فوراً.
                </p>
                {isViewingDifferentSchool && primaryTeachingSchool && onSwitchSchool && (
                  <div className="pt-2">
                    <p className="text-xs text-amber-900 font-bold mb-2">
                      💡 ملاحظة: فصولك وموادك مسندة في مدرسة ({primaryTeachingSchool.name}).
                    </p>
                    <button
                      type="button"
                      onClick={() => onSwitchSchool(primaryTeachingSchool)}
                      className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-black text-xs inline-flex items-center gap-1.5 cursor-pointer shadow-sm transition-all"
                    >
                      <span>الانتقال إلى ({primaryTeachingSchool.name}) ورصد الطلاب ↵</span>
                    </button>
                  </div>
                )}
              </div>
              <div>
                <button
                  type="button"
                  onClick={() => setIsQuickAddStudentOpen(true)}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs inline-flex items-center gap-2 cursor-pointer shadow-md transition-all hover:scale-105"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>إضافة طالب سريع لهذا الفصل الآن ↵</span>
                </button>
              </div>
            </div>
          ) : (
            currentStudents.map((st, idx) => {
            const att = allAttendances.find((a) => a.studentId === st.id && a.date === today);
            const currentMark = marks[st.id] || (att?.selfCheckTime ? 'present' : 'absent');
            const hasGateCheck = !!att?.selfCheckTime;

            // Student today permissions
            const studentTodayPerms = todayPermissions.filter((p) => p.studentId === st.id);
            const permCount = studentTodayPerms.length;
            const isCurrentlyOut = studentTodayPerms.some((p) => !p.timeIn);

            return (
              <div
                key={st.id}
                className={`border rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 text-xs transition-colors ${
                  isCurrentlyOut 
                    ? 'bg-amber-50/70 border-amber-300' 
                    : 'bg-slate-50 border-slate-200'
                }`}
              >
                {/* Student Info & Permission Badges */}
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-[11px]">
                    {idx + 1}
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onOpenDossier(st)}
                        className="text-slate-900 font-bold hover:text-indigo-600 text-right block cursor-pointer"
                      >
                        {st.name}
                      </button>

                      {/* ADHD & Frequent Permission Badges for the Next Teacher */}
                      {permCount >= 3 ? (
                        <span className="px-2 py-0.5 rounded-md bg-rose-100 text-rose-900 border border-rose-200 text-[10px] font-black flex items-center gap-1 animate-pulse">
                          <ShieldAlert className="w-3 h-3 text-rose-600" />
                          <span>⚠️ استأذن {permCount} مرات اليوم (فرط حركة/تشتت)</span>
                        </span>
                      ) : permCount === 2 ? (
                        <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-200 text-[10px] font-bold flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3 text-amber-600" />
                          <span>استأذن مرتين اليوم</span>
                        </span>
                      ) : permCount === 1 ? (
                        <span className="px-2 py-0.5 rounded-md bg-slate-200/80 text-slate-700 text-[10px] font-medium">
                          استأذن مرة واحدة
                        </span>
                      ) : null}

                      {isCurrentlyOut && (
                        <span className="px-2 py-0.5 rounded-full bg-amber-200 text-amber-950 font-black text-[10px] border border-amber-300">
                          خارج الصف الآن ⏳
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      <span className="text-[10px] text-slate-500 font-mono">هوية: {st.nationalId}</span>
                      
                      {hasGateCheck ? (
                        <span className="text-[10px] text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md font-bold">
                          ✓ حضر عند البوابة ({att?.selfCheckTime})
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-500 bg-slate-200/70 px-2 py-0.5 rounded-md">
                          لم يسجل عند البوابة
                        </span>
                      )}

                      {/* Teacher quick pass button */}
                      <button
                        type="button"
                        onClick={() => openPermissionModal(st)}
                        className={`text-[11px] font-bold px-2.5 py-0.5 rounded-lg border transition-colors flex items-center gap-1 cursor-pointer ${
                          permCount > 0 
                            ? 'bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border-indigo-200' 
                            : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                      >
                        <Activity className="w-3 h-3 text-indigo-600" />
                        <span>{permCount > 0 ? `سجل الاستئذان (${permCount}) 🚶‍♂️` : 'تسجيل استئذان 🚶‍♂️'}</span>
                      </button>

                      {/* Teacher Behavior Record button */}
                      {(() => {
                        const behScore = calculateStudentBehaviorScore(st.id);
                        return (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedStudentForBehavior(st);
                              setIsBehaviorModalOpen(true);
                            }}
                            className="text-[11px] font-black px-2.5 py-0.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 transition-colors flex items-center gap-1 cursor-pointer"
                          >
                            <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                            <span>رصد سلوك ({behScore.currentScore}/100) ⭐</span>
                          </button>
                        );
                      })()}
                    </div>
                  </div>
                </div>

                {/* Mark Toggle Buttons */}
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleMarkChange(st.id, 'present')}
                    className={`px-3.5 py-1.5 rounded-xl font-bold transition-colors cursor-pointer text-xs ${
                      currentMark === 'present'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                    }`}
                  >
                    حاضر
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMarkChange(st.id, 'absent')}
                    className={`px-3.5 py-1.5 rounded-xl font-bold transition-colors cursor-pointer text-xs ${
                      currentMark === 'absent'
                        ? 'bg-rose-600 text-white shadow-xs'
                        : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                    }`}
                  >
                    غائب
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMarkChange(st.id, 'late')}
                    className={`px-3.5 py-1.5 rounded-xl font-bold transition-colors cursor-pointer text-xs ${
                      currentMark === 'late'
                        ? 'bg-amber-600 text-white shadow-xs'
                        : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                    }`}
                  >
                    متأخر
                  </button>
                </div>
              </div>
            );
          }))}
        </div>
      </div>

      {/* Permission Modal */}
      {selectedStudentForPerm && (
        <StudentPermissionModal
          isOpen={isPermModalOpen}
          onClose={() => {
            setIsPermModalOpen(false);
            setSelectedStudentForPerm(null);
          }}
          student={selectedStudentForPerm}
          teacher={currentUser}
          school={currentSchool}
          onPermissionAdded={() => {
            setPermissionsVersion((v) => v + 1);
          }}
        />
      )}

      {/* Behavior Record Modal */}
      {selectedStudentForBehavior && isBehaviorModalOpen && (
        <BehaviorRecordModal
          isOpen={isBehaviorModalOpen}
          onClose={() => {
            setIsBehaviorModalOpen(false);
            setSelectedStudentForBehavior(null);
          }}
          student={selectedStudentForBehavior}
          currentUser={currentUser}
          currentSchool={currentSchool}
          onSaved={() => {
            setIsBehaviorModalOpen(false);
            setSelectedStudentForBehavior(null);
            setBehaviorVersion((v) => v + 1);
          }}
        />
      )}

      {/* Quick Add Student Modal */}
      {isQuickAddStudentOpen && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setIsQuickAddStudentOpen(false); }}
          className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn"
          dir="rtl"
        >
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200 text-right">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">إضافة طالب لهذا الفصل</h3>
                  <p className="text-[11px] text-slate-500">{selectedClass} - فصل {selectedSection}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsQuickAddStudentOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleQuickAddStudent} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">اسم الطالب ثلاثي / رباعي *</label>
                <input
                  type="text"
                  required
                  value={quickStudentName}
                  onChange={(e) => setQuickStudentName(e.target.value)}
                  placeholder="مثال: خالد سعد الدوسري"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-bold focus:outline-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">رقم الهوية الوطنية أو الإقامة *</label>
                <input
                  type="text"
                  required
                  maxLength={10}
                  value={quickStudentNid}
                  onChange={(e) => setQuickStudentNid(e.target.value)}
                  placeholder="10 أرقام (مثال: 1122334455)"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-mono text-slate-900 font-bold focus:outline-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">رقم جوال ولي الأمر (اختياري)</label>
                <input
                  type="tel"
                  maxLength={10}
                  value={quickStudentMobile}
                  onChange={(e) => setQuickStudentMobile(e.target.value)}
                  placeholder="05xxxxxxxx"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-mono text-slate-900 focus:outline-indigo-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsQuickAddStudentOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md cursor-pointer transition-all hover:scale-105"
                >
                  حفظ وتسجيل الطالب ↵
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Teacher Edit Assigned Classes Modal */}
      <TeacherEditClassesModal
        isOpen={isEditClassesOpen}
        onClose={() => setIsEditClassesOpen(false)}
        currentUser={activeUser}
        currentSchool={currentSchool}
        onClassesUpdated={handleTeacherClassesUpdated}
      />

    </div>
  );
};
