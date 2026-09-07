import React, { useState, useMemo } from 'react';
import { User, School } from '../types';
import { 
  getUsers, getAttendances, convertStudentAllAbsencesToPresent, 
  deleteStudentAllAbsences, addSystemNotification,
  bulkConvertMultipleStudentsAbsencesToPresent,
  bulkDeleteMultipleStudentsAbsences
} from '../utils/storage';
import { calculateStudentBehaviorScore } from '../utils/behavior';
import { soundManager } from '../utils/audio';
import { 
  Search, X, GraduationCap, AlertTriangle, CheckCircle, 
  Trash2, Zap, FileText, ShieldAlert, Users, 
  CheckSquare, Square, Check, RefreshCw
} from 'lucide-react';

interface StudentAbsenceDirectoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSchool: School;
  currentUser: User;
  onSelectStudentForDossier: (student: User) => void;
  onDataChanged: () => void;
}

export const StudentAbsenceDirectoryModal: React.FC<StudentAbsenceDirectoryModalProps> = ({
  isOpen,
  onClose,
  currentSchool,
  currentUser,
  onSelectStudentForDossier,
  onDataChanged,
}) => {
  if (!isOpen) return null;

  const [search, setSearch] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'has_absences' | 'five_days'>('has_absences');
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());
  
  // Single student confirmation
  const [confirmingAction, setConfirmingAction] = useState<{
    studentId: string;
    studentName: string;
    type: 'convert_all' | 'delete_all';
    count: number;
  } | null>(null);

  // Bulk action confirmation
  const [bulkAction, setBulkAction] = useState<'convert_all' | 'delete_all' | null>(null);
  const [bulkReason, setBulkReason] = useState<string>('تصحيح إداري بسبب عطل تقني في النظام وإعادة بدء الحساب');

  // All students belonging to this school
  const allStudents = useMemo(() => {
    return getUsers().filter(
      (u) => u.role === 'student' && (u.schoolCode === currentSchool.code || !u.schoolCode)
    );
  }, [currentSchool.code]);

  const allAttendances = getAttendances();

  // Compute student stats
  const studentsWithStats = useMemo(() => {
    return allStudents.map((student) => {
      const studentAtts = allAttendances.filter((a) => a.studentId === student.id);
      const absentDays = studentAtts.filter((a) => a.finalStatus === 'absent');
      const unexcusedDays = absentDays.filter((a) => a.excuseStatus !== 'accepted');
      const behavior = calculateStudentBehaviorScore(student.id);

      return {
        student,
        absentCount: absentDays.length,
        unexcusedCount: unexcusedDays.length,
        hasFiveDaysAlert: behavior.hasFiveDaysAbsenceAlert,
        score: behavior.currentScore,
      };
    });
  }, [allStudents, allAttendances]);

  // Filtered list
  const filteredStudents = useMemo(() => {
    const q = search.trim().toLowerCase();
    return studentsWithStats.filter((item) => {
      // Search match
      const matchName = item.student.name.toLowerCase().includes(q);
      const matchNid = (item.student.nationalId || '').includes(q);
      const matchClass = (item.student.className || '').toLowerCase().includes(q);
      const matchSection = (item.student.sectionName || '').toLowerCase().includes(q);
      const matchesSearch = !q || matchName || matchNid || matchClass || matchSection;

      if (!matchesSearch) return false;

      // Filter mode
      if (filterMode === 'has_absences') return item.absentCount > 0;
      if (filterMode === 'five_days') return item.hasFiveDaysAlert || item.unexcusedCount >= 5;
      return true;
    });
  }, [studentsWithStats, search, filterMode]);

  const totalWithAbsences = studentsWithStats.filter((s) => s.absentCount > 0).length;
  const totalWithFiveDays = studentsWithStats.filter((s) => s.hasFiveDaysAlert).length;

  // Selected students details
  const selectedStudentsData = useMemo(() => {
    return studentsWithStats.filter((item) => selectedStudentIds.has(item.student.id));
  }, [studentsWithStats, selectedStudentIds]);

  const selectedTotalAbsences = useMemo(() => {
    return selectedStudentsData.reduce((sum, item) => sum + item.absentCount, 0);
  }, [selectedStudentsData]);

  // Selection toggle handlers
  const toggleSelectStudent = (id: string) => {
    setSelectedStudentIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAllVisible = () => {
    const next = new Set<string>();
    filteredStudents.forEach((item) => next.add(item.student.id));
    setSelectedStudentIds(next);
  };

  const handleSelectAllWithAbsences = () => {
    const next = new Set<string>();
    filteredStudents
      .filter((item) => item.absentCount > 0)
      .forEach((item) => next.add(item.student.id));
    setSelectedStudentIds(next);
  };

  const handleClearSelection = () => {
    setSelectedStudentIds(new Set());
  };

  const isAllVisibleSelected =
    filteredStudents.length > 0 &&
    filteredStudents.every((item) => selectedStudentIds.has(item.student.id));

  // Single action execution
  const handleExecuteAction = () => {
    if (!confirmingAction) return;

    if (confirmingAction.type === 'convert_all') {
      convertStudentAllAbsencesToPresent(
        confirmingAction.studentId,
        'تصحيح إداري بسبب عطل تقني في النظام وإعادة بدء الحساب',
        currentUser.name
      );

      addSystemNotification({
        id: `notif-bulk-conv-${Date.now()}`,
        schoolCode: currentSchool.code,
        title: '✅ تصحيح شامل لغياب الطالب وبدء الحساب من جديد',
        message: `تم تحويل جميع غيابات الطالب (${confirmingAction.studentName}) إلى حاضر وإعادة تصفير الدورة ليبدأ الحساب من جديد.`,
        type: 'info',
        createdAt: new Date().toISOString(),
      });
    } else if (confirmingAction.type === 'delete_all') {
      deleteStudentAllAbsences(confirmingAction.studentId);

      addSystemNotification({
        id: `notif-bulk-del-${Date.now()}`,
        schoolCode: currentSchool.code,
        title: '🗑️ حذف سجلات غياب الطالب وبدء الحساب من جديد',
        message: `تم شطب وحذف جميع سجلات الغياب للطالب (${confirmingAction.studentName}) نهائياً وتصفير الدورة ليبدأ الحساب من جديد.`,
        type: 'info',
        createdAt: new Date().toISOString(),
      });
    }

    soundManager.playSuccess();
    setConfirmingAction(null);
    onDataChanged();
  };

  // Bulk action execution
  const handleExecuteBulkAction = () => {
    if (!bulkAction || selectedStudentIds.size === 0) return;

    const ids = Array.from(selectedStudentIds);

    if (bulkAction === 'convert_all') {
      const result = bulkConvertMultipleStudentsAbsencesToPresent(
        ids,
        bulkReason.trim() || 'تصحيح إداري بسبب عطل تقني في النظام وإعادة بدء الحساب',
        currentUser.name
      );

      addSystemNotification({
        id: `notif-multi-bulk-conv-${Date.now()}`,
        schoolCode: currentSchool.code,
        title: '✅ تحويل جماعي لغيابات الطلاب لحاضر وبدء الحساب من جديد',
        message: `تم تحويل جميع غيابات (${result.affectedStudentsCount}) طالب (إجمالي ${result.affectedAbsencesCount} غياب) إلى حاضر، وتصفير إنذارات الغياب وإعادة بدء الحساب من جديد.`,
        type: 'info',
        createdAt: new Date().toISOString(),
      });
    } else if (bulkAction === 'delete_all') {
      const result = bulkDeleteMultipleStudentsAbsences(ids);

      addSystemNotification({
        id: `notif-multi-bulk-del-${Date.now()}`,
        schoolCode: currentSchool.code,
        title: '🗑️ حذف جماعي لسجلات غياب الطلاب وبدء الحساب من جديد',
        message: `تم شطب وحذف جميع سجلات الغياب لـ (${result.affectedStudentsCount}) طالب (إجمالي ${result.affectedAbsencesCount} سجل) نهائياً وتصفير عداد الغياب ليبدأ الحساب من جديد.`,
        type: 'info',
        createdAt: new Date().toISOString(),
      });
    }

    soundManager.playSuccess();
    setBulkAction(null);
    setSelectedStudentIds(new Set());
    onDataChanged();
  };

  return (
    <div 
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-fadeIn"
      dir="rtl"
    >
      <div className="bg-white border border-slate-200 rounded-3xl max-w-4xl w-full p-6 text-right space-y-4 shadow-2xl text-slate-800 max-h-[90vh] flex flex-col my-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-3.5 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center justify-center shadow-xs">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">
                سجلات الطلاب وإدارة غيابات الأعطال التقنية
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                مدرسة {currentSchool.name} | تحديد جماعي لتصحيح أو حذف الغيابات وبدء الحساب من جديد
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Single Student Confirmation Modal Layer */}
        {confirmingAction && (
          <div className="bg-amber-50 border border-amber-300 rounded-2xl p-4 text-xs space-y-2 animate-fadeIn shrink-0">
            <div className="flex items-center gap-2 text-amber-950 font-black text-sm">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
              <span>
                {confirmingAction.type === 'convert_all'
                  ? `تأكيد تحويل جميع غيابات الطالب (${confirmingAction.studentName}) إلى حاضر ⚡`
                  : `تأكيد حذف جميع غيابات الطالب (${confirmingAction.studentName}) نهائياً 🗑️`}
              </span>
            </div>
            <p className="text-slate-700">
              {confirmingAction.type === 'convert_all'
                ? `سيتم تحويل عدد (${confirmingAction.count}) غياب إلى حاضر، وإضافة توضيح بالتصحيح الإداري بسبب عطل تقني، وتصفير عداد الغياب ليبدأ الحساب من جديد.`
                : `سيتم مسح وشطب عدد (${confirmingAction.count}) سجل غياب نهائياً من قاعدة البيانات، وتصفير الدورة ليبدأ الحساب من جديد.`}
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setConfirmingAction(null)}
                className="px-3.5 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold cursor-pointer"
              >
                إلغاء التراجع
              </button>
              <button
                onClick={handleExecuteAction}
                className={`px-4 py-1.5 rounded-xl text-white font-black cursor-pointer shadow-xs ${
                  confirmingAction.type === 'convert_all'
                    ? 'bg-emerald-600 hover:bg-emerald-500'
                    : 'bg-rose-600 hover:bg-rose-500'
                }`}
              >
                {confirmingAction.type === 'convert_all' ? 'نعم، تحويل لحاضر وبدء الحساب ⚡' : 'نعم، حذف نهائي وبدء الحساب 🗑️'}
              </button>
            </div>
          </div>
        )}

        {/* Bulk Confirmation Modal Layer */}
        {bulkAction && (
          <div className="bg-indigo-50/90 border-2 border-indigo-300 rounded-2xl p-4.5 text-xs space-y-3 animate-fadeIn shrink-0 shadow-sm">
            <div className="flex items-center justify-between gap-2 border-b border-indigo-200 pb-2.5">
              <div className="flex items-center gap-2 text-indigo-950 font-black text-sm">
                {bulkAction === 'convert_all' ? (
                  <Zap className="w-5 h-5 text-emerald-600 shrink-0" />
                ) : (
                  <Trash2 className="w-5 h-5 text-rose-600 shrink-0" />
                )}
                <span>
                  {bulkAction === 'convert_all'
                    ? `تأكيد تحويل غيابات (${selectedStudentIds.size}) طالب إلى حاضر وإعادة بدء الحساب ⚡`
                    : `تأكيد حذف غيابات (${selectedStudentIds.size}) طالب نهائياً وإعادة بدء الحساب 🗑️`}
                </span>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-indigo-200 text-indigo-900 font-black text-[11px]">
                {selectedTotalAbsences} يوم غياب متأثر
              </span>
            </div>

            <div className="space-y-1.5 text-slate-700">
              <p className="font-bold text-slate-800">
                {bulkAction === 'convert_all'
                  ? `سيتم تحويل جميع غيابات (${selectedStudentIds.size}) طالب المحددين إلى "حاضر" مسجل، وتدوين توثيق التصحيح الإداري، وتصفير إنذارات الغياب (5 أيام) ليعود عداد الغياب إلى 0 ويبدأ الحساب من جديد.`
                  : `سيتم شطب وحذف جميع سجلات غياب (${selectedStudentIds.size}) طالب المحددين نهائياً من قاعدة البيانات، وتصفير مؤشرات الغياب وسلوك الطالب ليعود الحساب من جديد ابتداءً من اليوم.`}
              </p>
              
              <div className="pt-1">
                <label className="block text-[11px] font-black text-slate-700 mb-1">
                  سبب وتوثيق الإجراء الإداري:
                </label>
                <input
                  type="text"
                  value={bulkReason}
                  onChange={(e) => setBulkReason(e.target.value)}
                  placeholder="سبب التصحيح..."
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-medium text-slate-800 focus:outline-indigo-500"
                />
              </div>

              <div className="bg-white/80 border border-slate-200 rounded-xl p-2.5 max-h-24 overflow-y-auto space-y-1">
                <span className="text-[10px] text-slate-500 font-bold block">الطلاب المشمولون بالإجراء ({selectedStudentsData.length}):</span>
                <div className="flex flex-wrap gap-1">
                  {selectedStudentsData.map((item) => (
                    <span 
                      key={item.student.id}
                      className="px-2 py-0.5 bg-indigo-50 text-indigo-900 border border-indigo-200 rounded-md text-[10px] font-bold"
                    >
                      {item.student.name} ({item.absentCount} غياب)
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-1 border-t border-indigo-200">
              <button
                onClick={() => setBulkAction(null)}
                className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold cursor-pointer"
              >
                إلغاء
              </button>
              <button
                onClick={handleExecuteBulkAction}
                className={`px-5 py-2 rounded-xl text-white font-black cursor-pointer shadow-xs flex items-center gap-1.5 ${
                  bulkAction === 'convert_all'
                    ? 'bg-emerald-600 hover:bg-emerald-500'
                    : 'bg-rose-600 hover:bg-rose-500'
                }`}
              >
                {bulkAction === 'convert_all' ? (
                  <>
                    <Zap className="w-4 h-4" />
                    <span>تأكيد التحويل لحاضر وبدء الحساب من جديد ⚡</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>تأكيد حذف الغيابات وبدء الحساب من جديد 🗑️</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Search & Filter Bar */}
        <div className="space-y-2.5 shrink-0">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="ابحث باسم الطالب، رقم الهوية، الصف أو الفصل..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pr-9 pl-3 py-2 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-indigo-500"
              />
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1.5 text-xs font-bold">
              <button
                onClick={() => setFilterMode('has_absences')}
                className={`px-3 py-2 rounded-xl cursor-pointer transition-colors ${
                  filterMode === 'has_absences'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                لديهم غيابات ({totalWithAbsences})
              </button>

              <button
                onClick={() => setFilterMode('five_days')}
                className={`px-3 py-2 rounded-xl cursor-pointer transition-colors ${
                  filterMode === 'five_days'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                إنذارات 5 أيام ({totalWithFiveDays})
              </button>

              <button
                onClick={() => setFilterMode('all')}
                className={`px-3 py-2 rounded-xl cursor-pointer transition-colors ${
                  filterMode === 'all'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                جميع الطلاب ({allStudents.length})
              </button>
            </div>
          </div>

          {/* Selection Controls Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100 text-xs">
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={isAllVisibleSelected ? handleClearSelection : handleSelectAllVisible}
                className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                {isAllVisibleSelected ? (
                  <CheckSquare className="w-4 h-4 text-indigo-600" />
                ) : (
                  <Square className="w-4 h-4 text-slate-400" />
                )}
                <span>تحديد الكل في هذه القائمة ({filteredStudents.length})</span>
              </button>

              <button
                type="button"
                onClick={handleSelectAllWithAbsences}
                className="px-2.5 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 font-bold flex items-center gap-1 cursor-pointer transition-colors"
              >
                <span>تحديد من لديهم غياب فقط 📋</span>
              </button>

              {selectedStudentIds.size > 0 && (
                <button
                  type="button"
                  onClick={handleClearSelection}
                  className="px-2.5 py-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 font-bold cursor-pointer transition-colors"
                >
                  إلغاء التحديد ✕
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <span className={`text-xs font-bold px-2.5 py-1 rounded-lg ${
                selectedStudentIds.size > 0 
                  ? 'bg-indigo-100 text-indigo-900 border border-indigo-300' 
                  : 'bg-slate-100 text-slate-500'
              }`}>
                تم تحديد: {selectedStudentIds.size} طالب
              </span>
            </div>
          </div>

          {/* Bulk Actions Bar (Sticky/Prominent when selected) */}
          {selectedStudentIds.size > 0 && (
            <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-2xl p-3 flex flex-wrap items-center justify-between gap-3 shadow-md animate-fadeIn">
              <div className="flex items-center gap-2.5">
                <span className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center font-black text-sm">
                  {selectedStudentIds.size}
                </span>
                <div>
                  <strong className="block text-xs font-black">
                    تم تحديد {selectedStudentIds.size} طالب (إجمالي {selectedTotalAbsences} غياب)
                  </strong>
                  <span className="text-[10px] text-slate-300">
                    اختر الإجراء المطلوب لتنفيذه جماعياً وإعادة بدء الحساب من جديد
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {/* Bulk Convert to Present */}
                <button
                  type="button"
                  onClick={() => setBulkAction('convert_all')}
                  className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-xs cursor-pointer transition-all hover:scale-[1.02]"
                >
                  <Zap className="w-4 h-4 text-emerald-950" />
                  <span>تحويل المحددين إلى حاضر (يبدأ الحساب من جديد) ⚡</span>
                </button>

                {/* Bulk Delete Absences */}
                <button
                  type="button"
                  onClick={() => setBulkAction('delete_all')}
                  className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs flex items-center gap-1.5 shadow-xs cursor-pointer transition-all hover:scale-[1.02]"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>حذف غياب المحددين نهائياً (يبدأ الحساب من جديد) 🗑️</span>
                </button>

                {/* Cancel selection */}
                <button
                  type="button"
                  onClick={handleClearSelection}
                  className="px-2.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 font-bold text-xs cursor-pointer"
                >
                  إلغاء
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Students List */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-[280px]">
          {filteredStudents.length === 0 ? (
            <div className="text-center py-12 space-y-2">
              <GraduationCap className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="text-xs font-bold text-slate-500">لا يوجد طلاب مطابقون لمعايير البحث الحالية</p>
            </div>
          ) : (
            filteredStudents.map(({ student, absentCount, unexcusedCount, hasFiveDaysAlert, score }) => {
              const isSelected = selectedStudentIds.has(student.id);

              return (
                <div
                  key={student.id}
                  onClick={() => toggleSelectStudent(student.id)}
                  className={`border rounded-2xl p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-indigo-50/70 border-indigo-300 ring-2 ring-indigo-400/50 shadow-xs'
                      : 'bg-slate-50/80 hover:bg-slate-50 border-slate-200'
                  }`}
                >
                  {/* Selection Checkbox & Info */}
                  <div className="flex items-center gap-3">
                    <div 
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSelectStudent(student.id);
                      }}
                      className="cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelectStudent(student.id)}
                        className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                      />
                    </div>

                    <div className="w-10 h-10 rounded-xl bg-indigo-100/60 text-indigo-700 border border-indigo-200 flex items-center justify-center shrink-0 font-black">
                      {student.avatar ? (
                        <img src={student.avatar} alt={student.name} className="w-full h-full object-cover rounded-xl" />
                      ) : (
                        <GraduationCap className="w-5 h-5" />
                      )}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-black text-slate-900 text-sm">{student.name}</h4>
                        <span className="text-[10px] font-mono text-slate-500 bg-white border border-slate-200 px-1.5 py-0.5 rounded-md font-bold">
                          {student.nationalId}
                        </span>
                        {hasFiveDaysAlert && (
                          <span className="px-1.5 py-0.5 rounded-md bg-rose-100 text-rose-800 text-[10px] font-black flex items-center gap-0.5">
                            <ShieldAlert className="w-3 h-3" />
                            <span>إنذار 5 أيام</span>
                          </span>
                        )}
                        {student.lastAbsenceResetDate && (
                          <span className="text-[9px] text-emerald-800 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-md font-bold">
                            تصفير سابق: {student.lastAbsenceResetDate}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-slate-500 text-[11px] mt-0.5">
                        <span>{student.className} - فصل {student.sectionName}</span>
                        <span>•</span>
                        <span className={absentCount > 0 ? 'text-rose-700 font-bold' : 'text-emerald-700 font-bold'}>
                          {absentCount > 0 ? `الغياب المسجل: ${absentCount} يوم` : 'لا يوجد غياب (منتظم)'}
                        </span>
                        <span>•</span>
                        <span className="font-bold text-slate-700">السلوك: {score}/100</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div 
                    className="flex items-center gap-1.5 flex-wrap"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {absentCount > 0 && (
                      <>
                        {/* Single convert to present */}
                        <button
                          onClick={() =>
                            setConfirmingAction({
                              studentId: student.id,
                              studentName: student.name,
                              type: 'convert_all',
                              count: absentCount,
                            })
                          }
                          className="px-2.5 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold text-[11px] flex items-center gap-1 cursor-pointer transition-colors"
                          title="تحويل جميع الغيابات لحاضر وبدء الحساب من جديد"
                        >
                          <Zap className="w-3.5 h-3.5 text-emerald-600" />
                          <span>تحويل لحاضر ⚡</span>
                        </button>

                        {/* Single delete all absences */}
                        <button
                          onClick={() =>
                            setConfirmingAction({
                              studentId: student.id,
                              studentName: student.name,
                              type: 'delete_all',
                              count: absentCount,
                            })
                          }
                          className="px-2.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-[11px] flex items-center gap-1 cursor-pointer transition-colors"
                          title="حذف جميع سجلات الغياب نهائياً وبدء الحساب من جديد"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                          <span>حذف نهائي 🗑️</span>
                        </button>
                      </>
                    )}

                    {/* Open Dossier */}
                    <button
                      onClick={() => {
                        onClose();
                        onSelectStudentForDossier(student);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[11px] flex items-center gap-1 cursor-pointer shadow-xs transition-colors"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>الملف الشامل 📋</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <div className="flex items-center gap-2">
            <span>إجمالي الطلاب في المدرسة: {allStudents.length} طالب</span>
            {selectedStudentIds.size > 0 && (
              <span className="text-indigo-700 font-bold">
                • محدد حالياً: {selectedStudentIds.size} طالب
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold cursor-pointer"
          >
            إغلاق
          </button>
        </div>

      </div>
    </div>
  );
};

