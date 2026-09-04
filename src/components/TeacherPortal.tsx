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
  UserCheck, UserX, CheckCheck, RefreshCw
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { StudentPermissionModal } from './StudentPermissionModal';
import { BehaviorRecordModal } from './BehaviorRecordModal';
import { LiveClockHeader } from './LiveClockHeader';
import { BroadcastAlertBanner } from './BroadcastAlertBanner';
import { Building2 } from 'lucide-react';

interface TeacherPortalProps {
  currentUser: User;
  currentSchool: School;
  schools?: School[];
  onSwitchSchool?: (school: School) => void;
  onOpenDossier: (student: User) => void;
}

export const TeacherPortal: React.FC<TeacherPortalProps> = ({
  currentUser,
  currentSchool,
  schools = [],
  onSwitchSchool,
  onOpenDossier,
}) => {
  const today = getTodayDateString();
  const allUsers = getUsers();
  const allAttendances = getAttendances();
  const [permissionsVersion, setPermissionsVersion] = useState(0);
  const [behaviorVersion, setBehaviorVersion] = useState(0);

  // Assigned schools for this teacher/user
  const teacherSchools = schools.filter(
    (s) => s.code === currentSchool.code || currentUser.managedSchoolCodes?.includes(s.code) || s.code === currentUser.schoolCode
  );

  // Student Behavior Modal State
  const [selectedStudentForBehavior, setSelectedStudentForBehavior] = useState<User | null>(null);
  const [isBehaviorModalOpen, setIsBehaviorModalOpen] = useState(false);

  // Find classes assigned to teacher or all students in school
  const schoolStudents = allUsers.filter(
    (u) => u.role === 'student' && u.schoolCode === currentSchool.code
  );

  // Group classes
  const classes = Array.from(new Set(schoolStudents.map((s) => s.className || 'الأول المتوسط')));
  const [selectedClass, setSelectedClass] = useState<string>(classes[0] || 'الأول المتوسط');

  const sections = Array.from(
    new Set(
      schoolStudents
        .filter((s) => s.className === selectedClass)
        .map((s) => s.sectionName || '1')
    )
  );
  const [selectedSection, setSelectedSection] = useState<string>(sections[0] || '1');

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
        </div>
      </div>

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
          {currentStudents.map((st, idx) => {
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
          })}
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

    </div>
  );
};
