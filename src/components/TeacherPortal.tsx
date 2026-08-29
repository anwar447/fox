import React, { useState, useMemo } from 'react';
import { User, School, Attendance, AttendanceStatus, BehaviorNote } from '../types';
import { 
  ALL_GRADES_INTERMEDIATE, 
  ALL_GRADES_SECONDARY, 
  ALL_SECTIONS, 
  formatReadableClass,
  getArabicFormattedDate, 
  getTodayDateString 
} from '../utils/academic';
import { getAcademicDayStatus } from '../utils/academicCalendar';
import { addBehaviorNote } from '../utils/storage';
import { triggerNotification } from '../utils/notifications';
import { 
  CheckCheck, 
  XCircle, 
  Clock, 
  UserCheck, 
  Check, 
  X, 
  Building2, 
  Calendar, 
  Search, 
  Filter, 
  Sparkles, 
  Save, 
  AlertCircle,
  MapPinOff,
  Users,
  ShieldAlert,
  MessageSquareWarning,
  Send,
  Moon,
  Info
} from 'lucide-react';

interface TeacherPortalProps {
  currentUser: User;
  schools: School[];
  selectedSchoolCode: string;
  onSelectSchool: (code: string) => void;
  users: User[];
  attendances: Attendance[];
  onUpdateAttendance: (
    studentId: string,
    teacherMark: AttendanceStatus,
    schoolCode: string,
    className: string,
    sectionName: string,
    dateStr?: string
  ) => void;
  onBulkUpdateAttendance: (
    students: { id: string; className: string; sectionName: string }[],
    teacherMark: 'present' | 'absent',
    schoolCode: string,
    dateStr?: string
  ) => void;
}

export const TeacherPortal: React.FC<TeacherPortalProps> = ({
  currentUser,
  schools,
  selectedSchoolCode,
  onSelectSchool,
  users,
  attendances,
  onUpdateAttendance,
  onBulkUpdateAttendance,
}) => {
  const currentSchool = schools.find((s) => s.code === selectedSchoolCode) || schools[0];
  
  // Available Grades depending on school type
  const availableGrades = currentSchool?.type === 'intermediate'
    ? ALL_GRADES_INTERMEDIATE
    : ALL_GRADES_SECONDARY;

  const [selectedGrade, setSelectedGrade] = useState<string>(
    currentUser.assignedGrades?.[0] || availableGrades[0]
  );
  const [selectedSection, setSelectedSection] = useState<string>(
    currentUser.assignedSections?.[0] || 'أ'
  );
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDateString());
  const [searchQuery, setSearchQuery] = useState('');
  const [overrideLocation, setOverrideLocation] = useState(false);
  const [saveToast, setSaveToast] = useState(false);
  const [behaviorNoteStudent, setBehaviorNoteStudent] = useState<User | null>(null);
  const [noteCategory, setNoteCategory] = useState<BehaviorNote['category']>('classroom_disruption');
  const [noteDescription, setNoteDescription] = useState('');
  const [isSubmittingNote, setIsSubmittingNote] = useState(false);
  const [noteToast, setNoteToast] = useState(false);

  const BEHAVIOR_CATEGORIES: { id: BehaviorNote['category']; label: string }[] = [
    { id: 'classroom_disruption', label: 'إثارة الفوضى والحديث الجانبي أثناء الحصة' },
    { id: 'homework_neglect', label: 'إهمال الواجبات والتكاليف المدرسية المتكرر' },
    { id: 'unauthorized_device', label: 'استخدام أجهزة أو هاتف جوال بدون إذن' },
    { id: 'disrespect', label: 'عدم احترام المعلم أو الزملاء بالقول أو الفعل' },
    { id: 'uniform_violation', label: 'مخالفة الزي المدرسي أو المظهر اللائق' },
    { id: 'fighting', label: 'شجار أو سلوك عدواني داخل الفصل أو الممرات' },
    { id: 'late_to_class', label: 'التأخر المتكرر عن دخول الحصة الدراسية' },
    { id: 'other', label: 'سلوك أو مخالفة أخرى' },
  ];

  const handleOpenBehaviorNoteModal = (student: User) => {
    setBehaviorNoteStudent(student);
    setNoteCategory('classroom_disruption');
    setNoteDescription('');
  };

  const handleSubmitBehaviorNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!behaviorNoteStudent || !noteDescription.trim()) return;

    setIsSubmittingNote(true);
    const catObj = BEHAVIOR_CATEGORIES.find((c) => c.id === noteCategory);
    
    addBehaviorNote({
      studentId: behaviorNoteStudent.id,
      studentNationalId: behaviorNoteStudent.nationalId,
      studentName: behaviorNoteStudent.name,
      schoolCode: currentSchool.code,
      className: behaviorNoteStudent.className || selectedGrade,
      sectionName: behaviorNoteStudent.sectionName || selectedSection,
      teacherId: currentUser.id,
      teacherName: currentUser.name,
      category: noteCategory,
      categoryLabel: catObj?.label || 'ملاحظة سلوكية',
      description: noteDescription.trim(),
      date: selectedDate,
    });

    triggerNotification(
      'ملاحظة سلوكية جديدة واردة',
      `سجل المعلم ${currentUser.name} ملاحظة سلوكية على الطالب ${behaviorNoteStudent.name} (${catObj?.label})`,
      'behavior',
      currentSchool.code,
      'employee'
    );

    setIsSubmittingNote(false);
    setBehaviorNoteStudent(null);
    setNoteDescription('');
    setNoteToast(true);
    setTimeout(() => setNoteToast(false), 3000);
  };

  const dateInfo = getArabicFormattedDate(selectedDate);
  const academicDayStatus = getAcademicDayStatus(selectedDate);

  // Filter students for selected school, grade, and section
  const classStudents = useMemo(() => {
    return users.filter(
      (u) =>
        u.role === 'student' &&
        u.schoolCode === currentSchool.code &&
        u.className === selectedGrade &&
        u.sectionName === selectedSection
    );
  }, [users, currentSchool.code, selectedGrade, selectedSection]);

  // Apply search query filter
  const filteredStudents = useMemo(() => {
    if (!searchQuery.trim()) return classStudents;
    const q = searchQuery.trim().toLowerCase();
    return classStudents.filter(
      (std) =>
        std.name.toLowerCase().includes(q) ||
        std.nationalId.includes(q)
    );
  }, [classStudents, searchQuery]);

  // Get current attendance status for a student on selected date
  const getStudentAttendance = (studentId: string, nationalId: string) => {
    return attendances.find(
      (a) =>
        (a.studentId === studentId || a.nationalId === nationalId) &&
        a.date === selectedDate
    );
  };

  // Bulk Actions
  const handleBulkMark = (status: 'present' | 'absent') => {
    const listToUpdate = classStudents.map((s) => ({
      id: s.id,
      className: selectedGrade,
      sectionName: selectedSection,
    }));
    onBulkUpdateAttendance(listToUpdate, status, currentSchool.code, selectedDate);
    triggerSaveToast();
  };

  const handleSingleMark = (student: User, mark: AttendanceStatus) => {
    onUpdateAttendance(
      student.id,
      mark,
      currentSchool.code,
      selectedGrade,
      selectedSection,
      selectedDate
    );
    triggerSaveToast();
  };

  const triggerSaveToast = () => {
    setSaveToast(true);
    setTimeout(() => setSaveToast(false), 2000);
  };

  // Compute live statistics for this class
  const totalClassCount = classStudents.length;
  let presentCount = 0;
  let absentCount = 0;
  let lateCount = 0;
  let excusedCount = 0;

  classStudents.forEach((std) => {
    const att = getStudentAttendance(std.id, std.nationalId);
    const status = att?.teacherMark || 'present'; // default present if untouched
    if (status === 'present') presentCount++;
    else if (status === 'absent') absentCount++;
    else if (status === 'late') lateCount++;
    else if (status === 'excused') excusedCount++;
  });

  const attendancePercent = totalClassCount > 0
    ? Math.round((presentCount / totalClassCount) * 100)
    : 100;

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      
      {/* Top Banner */}
      <div className="bg-gradient-to-br from-blue-900 via-indigo-900 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-lg space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-200 text-xs font-bold">
              <Building2 className="w-3.5 h-3.5" />
              <span>{currentSchool.name}</span>
              <span className="opacity-60">•</span>
              <span className="font-mono">{currentSchool.code}</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black">
              لوحة رصد الحضور للمعلم: {currentUser.name}
            </h1>
            <p className="text-xs text-blue-200">
              تحضير سريع للفصول والطلاب بالاسم المقروء وزري الرصد الجماعي الفوري
            </p>
          </div>

          {/* Quick Date Picker */}
          <div className="flex items-center gap-2 bg-white/10 p-2 rounded-2xl border border-white/15">
            <Calendar className="w-4 h-4 text-blue-300" />
            <input
              id="teacher-date-picker"
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent text-white text-xs font-bold focus:outline-hidden cursor-pointer"
            />
          </div>
        </div>

        {/* School / Grade / Section Selector Filter Bar */}
        <div className="pt-3 border-t border-white/15 grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
          
          {/* School Selector (if multi-school) */}
          {schools.length > 1 && (
            <div>
              <label className="block text-[11px] font-semibold text-blue-200 mb-1">المدرسة</label>
              <select
                id="teacher-school-select"
                value={selectedSchoolCode}
                onChange={(e) => onSelectSchool(e.target.value)}
                className="w-full bg-blue-950/80 text-white border border-blue-400/30 rounded-xl px-3 py-2 font-bold focus:ring-2 focus:ring-blue-400 focus:outline-hidden"
              >
                {schools.map((sch) => (
                  <option key={sch.id} value={sch.code} className="bg-slate-900 text-white">
                    {sch.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Grade Selector (Readable names only!) */}
          <div>
            <label className="block text-[11px] font-semibold text-blue-200 mb-1">الصف الدراسي (مقروء)</label>
            <select
              id="teacher-grade-select"
              value={selectedGrade}
              onChange={(e) => setSelectedGrade(e.target.value)}
              className="w-full bg-blue-950/80 text-white border border-blue-400/30 rounded-xl px-3 py-2 font-bold focus:ring-2 focus:ring-blue-400 focus:outline-hidden"
            >
              {availableGrades.map((gr) => (
                <option key={gr} value={gr} className="bg-slate-900 text-white">
                  {gr}
                </option>
              ))}
            </select>
          </div>

          {/* Section Selector */}
          <div>
            <label className="block text-[11px] font-semibold text-blue-200 mb-1">الشعبة / الفصل</label>
            <div className="flex items-center gap-1">
              {ALL_SECTIONS.map((sec) => (
                <button
                  key={sec}
                  id={`teacher-sec-btn-${sec}`}
                  type="button"
                  onClick={() => setSelectedSection(sec)}
                  className={`flex-1 py-2 rounded-xl font-bold transition-all cursor-pointer ${
                    selectedSection === sec
                      ? 'bg-blue-500 text-white shadow-md'
                      : 'bg-white/10 text-blue-200 hover:bg-white/20'
                  }`}
                >
                  {sec}
                </button>
              ))}
            </div>
          </div>

          {/* Override Location condition toggle */}
          <div>
            <label className="block text-[11px] font-semibold text-blue-200 mb-1">صلاحية تجاوز الموقع</label>
            <button
              type="button"
              onClick={() => setOverrideLocation(!overrideLocation)}
              className={`w-full py-2 px-3 rounded-xl border font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                overrideLocation
                  ? 'bg-amber-500 text-slate-900 border-amber-400 shadow-xs'
                  : 'bg-white/10 text-blue-200 border-blue-400/20'
              }`}
            >
              <MapPinOff className="w-3.5 h-3.5" />
              <span>{overrideLocation ? 'تجاوز الموقع مفعّل' : 'حسب السياج الجغرافي'}</span>
            </button>
          </div>

        </div>
      </div>

      {/* Official Holiday / Weekend Notice */}
      {!academicDayStatus.canTakeAttendance && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 flex items-center justify-between gap-3 text-xs shadow-xs">
          <div className="flex items-center gap-2.5">
            <Moon className="w-5 h-5 text-amber-600 shrink-0" />
            <div>
              <span className="font-black text-amber-950 block">{academicDayStatus.blockReason || 'عطلة رسمية'}</span>
              <span className="text-amber-800 text-[11px]">لا يُسجل أي غياب أو خصم في أيام الإجازات الرسمية وفق التقويم الدراسي لوزارة التعليم.</span>
            </div>
          </div>
          <span className="px-3 py-1 rounded-xl bg-amber-200 text-amber-900 font-black text-[11px] shrink-0">
            إجازة معتمدة
          </span>
        </div>
      )}

      {/* Class Statistics & Fast Bulk Action Bar */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-6">
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black px-2.5 py-1 rounded-full bg-blue-100 text-blue-800">
                {formatReadableClass(selectedGrade, selectedSection)}
              </span>
              <span className="text-xs text-slate-500">
                إجمالي الطلاب في هذا الفصل: <strong>{totalClassCount}</strong> طالب
              </span>
            </div>
            <h2 className="text-lg font-black text-slate-900 mt-1">
              التحضير السريع للفصل
            </h2>
          </div>

          {/* TWO MAIN FAST BULK ACTION BUTTONS (As specified in document) */}
          <div className="flex items-center gap-3">
            <button
              id="bulk-all-present-btn"
              onClick={() => handleBulkMark('present')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black transition-all shadow-sm active:scale-95 cursor-pointer"
            >
              <CheckCheck className="w-4 h-4" />
              <span>الكل حاضر ✓</span>
            </button>

            <button
              id="bulk-all-absent-btn"
              onClick={() => handleBulkMark('absent')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black transition-all shadow-sm active:scale-95 cursor-pointer"
            >
              <XCircle className="w-4 h-4" />
              <span>الكل غائب ✗</span>
            </button>
          </div>
        </div>

        {/* Live Class Stats Pills */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-[11px] text-slate-500 font-semibold block">نسبة الحضور</span>
            <strong className="text-xl font-black text-blue-600">{attendancePercent}%</strong>
          </div>
          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200">
            <span className="text-[11px] text-emerald-700 font-semibold block">الحاضرون</span>
            <strong className="text-xl font-black text-emerald-800">{presentCount}</strong>
          </div>
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200">
            <span className="text-[11px] text-rose-700 font-semibold block">الغائبون</span>
            <strong className="text-xl font-black text-rose-800">{absentCount}</strong>
          </div>
          <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200">
            <span className="text-[11px] text-amber-700 font-semibold block">المتأخرون / المستأذنون</span>
            <strong className="text-xl font-black text-amber-800">{lateCount + excusedCount}</strong>
          </div>
        </div>

        {/* Search within class */}
        <div className="relative">
          <Search className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="بحث عن طالب بالاسم أو رقم الهوية..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 border border-slate-300 rounded-xl pr-10 pl-4 py-2.5 text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden font-semibold"
          />
        </div>

        {/* Students List with Rapid Single-Tap Controls */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 px-2">
            <span>قائمة طلاب الفصل ({filteredStudents.length})</span>
            <span>حالة الرصد</span>
          </div>

          {filteredStudents.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 rounded-2xl text-slate-400 text-xs font-semibold">
              لا يوجد طلاب مسجلين في هذا الفصل حالياً
            </div>
          ) : (
            <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-2xs">
              {filteredStudents.map((student, idx) => {
                const att = getStudentAttendance(student.id, student.nationalId);
                const currentMark: AttendanceStatus = att?.teacherMark || 'present';

                return (
                  <div
                    key={student.id}
                    id={`teacher-student-row-${student.nationalId}`}
                    className="p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/80 transition-colors"
                  >
                    {/* Student Info */}
                    <div className="flex items-center gap-3">
                      <span className="w-6 text-center text-xs font-mono text-slate-400 font-bold">
                        {idx + 1}
                      </span>
                      <div>
                        <h4 className="text-xs sm:text-sm font-bold text-slate-900">
                          {student.name}
                        </h4>
                        <div className="flex items-center gap-2 text-[11px] text-slate-500 font-mono">
                          <span>الهوية: {student.nationalId}</span>
                        </div>
                      </div>
                    </div>

                    {/* Fast Attendance 4-State Buttons */}
                    <div className="flex items-center gap-1.5 self-end sm:self-auto">
                      
                      {/* Present Button */}
                      <button
                        type="button"
                        id={`mark-present-${student.nationalId}`}
                        onClick={() => handleSingleMark(student, 'present')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                          currentMark === 'present'
                            ? 'bg-emerald-600 text-white shadow-xs ring-2 ring-emerald-400/30'
                            : 'bg-slate-100 text-slate-600 hover:bg-emerald-50 hover:text-emerald-700'
                        }`}
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>حاضر</span>
                      </button>

                      {/* Absent Button */}
                      <button
                        type="button"
                        id={`mark-absent-${student.nationalId}`}
                        onClick={() => handleSingleMark(student, 'absent')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                          currentMark === 'absent'
                            ? 'bg-rose-600 text-white shadow-xs ring-2 ring-rose-400/30'
                            : 'bg-slate-100 text-slate-600 hover:bg-rose-50 hover:text-rose-700'
                        }`}
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>غائب</span>
                      </button>

                      {/* Late Button */}
                      <button
                        type="button"
                        id={`mark-late-${student.nationalId}`}
                        onClick={() => handleSingleMark(student, 'late')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                          currentMark === 'late'
                            ? 'bg-amber-600 text-white shadow-xs ring-2 ring-amber-400/30'
                            : 'bg-slate-100 text-slate-600 hover:bg-amber-50 hover:text-amber-700'
                        }`}
                      >
                        <Clock className="w-3.5 h-3.5" />
                        <span>متأخر</span>
                      </button>

                      {/* Excused Button */}
                      <button
                        type="button"
                        id={`mark-excused-${student.nationalId}`}
                        onClick={() => handleSingleMark(student, 'excused')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                          currentMark === 'excused'
                            ? 'bg-teal-600 text-white shadow-xs ring-2 ring-teal-400/30'
                            : 'bg-slate-100 text-slate-600 hover:bg-teal-50 hover:text-teal-700'
                        }`}
                      >
                        <span>مستأذن</span>
                      </button>

                      {/* Behavior Note Trigger */}
                      <button
                        type="button"
                        id={`teacher-note-btn-${student.nationalId}`}
                        onClick={() => handleOpenBehaviorNoteModal(student)}
                        className="p-2 rounded-xl text-amber-600 bg-amber-50 hover:bg-amber-100 hover:text-amber-800 transition-colors border border-amber-200 cursor-pointer"
                        title="تسجيل ملاحظة أو مخالفة سلوكية على الطالب للإدارة"
                      >
                        <MessageSquareWarning className="w-3.5 h-3.5" />
                      </button>

                    </div>
                  </div>
                );
              })}
            </div>
          )}

        </div>

      </div>

      {/* Teacher Behavior Note Modal */}
      {behaviorNoteStudent && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 border border-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 text-amber-700">
                <div className="p-2 rounded-xl bg-amber-50 border border-amber-200">
                  <MessageSquareWarning className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">تسجيل ملاحظة / مخالفة سلوكية</h3>
                  <p className="text-xs text-slate-500">تُرفع مباشرة إلى وكيل شؤون الطلاب والإدارة المدرسية</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setBehaviorNoteStudent(null)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-amber-50/70 border border-amber-200/60 rounded-2xl flex items-center justify-between text-xs">
              <div>
                <span className="text-slate-500 block text-[11px]">الطالب المستهدف:</span>
                <strong className="text-slate-900 font-bold">{behaviorNoteStudent.name}</strong>
              </div>
              <div className="text-left font-mono">
                <span className="text-slate-500 block text-[11px]">الصف والشعبة:</span>
                <span className="font-bold text-amber-900">{behaviorNoteStudent.className} / {behaviorNoteStudent.sectionName}</span>
              </div>
            </div>

            <form onSubmit={handleSubmitBehaviorNote} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  تصنيف المخالفة / الملاحظة:
                </label>
                <select
                  value={noteCategory}
                  onChange={(e) => setNoteCategory(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 font-bold focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                >
                  {BEHAVIOR_CATEGORIES.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  تفاصيل الملاحظة وموقف الطالب داخل الحصة:
                </label>
                <textarea
                  rows={3}
                  required
                  value={noteDescription}
                  onChange={(e) => setNoteDescription(e.target.value)}
                  placeholder="اكتب وصفاً موجزاً للملاحظة وتوقيتها والإجراء المتخذ مبدئياً من قِبل المعلم..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-hidden font-normal"
                />
              </div>

              <div className="pt-2 flex items-center gap-2">
                <button
                  type="submit"
                  disabled={isSubmittingNote}
                  className="flex-1 bg-amber-600 hover:bg-amber-700 active:scale-98 text-white text-xs font-black py-3 rounded-2xl flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  <span>إرسال للإدارة المدرسية ↵</span>
                </button>
                <button
                  type="button"
                  onClick={() => setBehaviorNoteStudent(null)}
                  className="px-4 py-3 rounded-2xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Save feedback indicator */}
      {saveToast && (
        <div className="fixed bottom-6 left-6 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-2xl shadow-xl flex items-center gap-2 text-xs font-bold animate-fadeIn">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>تم حفظ الرصد تلقائياً</span>
        </div>
      )}

      {/* Behavior Note Sent Toast */}
      {noteToast && (
        <div className="fixed bottom-6 left-6 z-50 bg-amber-800 text-white px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2.5 text-xs font-bold animate-in fade-in slide-in-from-bottom-4">
          <Check className="w-4 h-4 text-amber-300" />
          <span>تم إرسال الملاحظة السلوكية للإدارة المدرسية بنجاح ✓</span>
        </div>
      )}

    </div>
  );
};
