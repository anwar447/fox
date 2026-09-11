import React, { useState, useMemo } from 'react';
import { School, User } from '../types';
import { 
  getUsers, deleteUser, transferStudentsToClassSection, 
  updateStudentProfileAndCascade, addSystemNotification,
  getCurrentUser
} from '../utils/storage';
import { getSchoolClasses } from '../utils/schoolClasses';
import { soundManager } from '../utils/audio';
import { StudentDossierModal } from './StudentDossierModal';
import { ParentSummonModal } from './ParentSummonModal';
import { BehaviorRecordModal } from './BehaviorRecordModal';
import { 
  Printer, ArrowRightLeft, Edit3, Trash2, Search, 
  Users, Building2, Check, X, Phone, AlertCircle, 
  Sparkles, CheckCircle2, RefreshCw, Layers, 
  UserCheck, Eye, Download, ShieldCheck, Mail,
  GraduationCap, Star
} from 'lucide-react';

interface ClassRosterManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  school: School;
  initialClass?: string;
  initialSection?: string;
  onOpenClassEditor?: () => void;
  onOpenExcelManager?: () => void;
  onUpdated?: () => void;
  onOpenStudentDossier?: (student: User) => void;
  onOpenParentSummon?: (student: User) => void;
  onOpenBehaviorRecord?: (student: User) => void;
  currentUser?: User;
}

export interface ClassRosterViewProps {
  school: School;
  initialClass?: string;
  initialSection?: string;
  onOpenClassEditor?: () => void;
  onOpenExcelManager?: () => void;
  onUpdated?: () => void;
  isEmbedded?: boolean;
  onClose?: () => void;
  onOpenStudentDossier?: (student: User) => void;
  onOpenParentSummon?: (student: User) => void;
  onOpenBehaviorRecord?: (student: User) => void;
  currentUser?: User;
}

export const ClassRosterView: React.FC<ClassRosterViewProps> = ({
  school,
  initialClass,
  initialSection,
  onOpenClassEditor,
  onOpenExcelManager,
  onUpdated,
  isEmbedded = false,
  onClose,
  onOpenStudentDossier,
  onOpenParentSummon,
  onOpenBehaviorRecord,
  currentUser: passedCurrentUser,
}) => {
  const currentUser = passedCurrentUser || getCurrentUser() || ({} as User);
  const [activeDossierStudent, setActiveDossierStudent] = useState<User | null>(null);
  const [activeSummonStudent, setActiveSummonStudent] = useState<User | null>(null);
  const [activeBehaviorStudent, setActiveBehaviorStudent] = useState<User | null>(null);

  const schoolClasses = useMemo(() => getSchoolClasses(school), [school]);
  
  // State for filtering
  const [selectedClass, setSelectedClass] = useState<string>(() => {
    if (initialClass && schoolClasses.some(c => c.className === initialClass)) {
      return initialClass;
    }
    return schoolClasses.length > 0 ? schoolClasses[0].className : '';
  });

  const [selectedSection, setSelectedSection] = useState<string>(initialSection || 'ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [notificationMsg, setNotificationMsg] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Transfer Dialog State
  const [transferDialog, setTransferDialog] = useState<{
    isOpen: boolean;
    students: User[];
    targetClass: string;
    targetSection: string;
  } | null>(null);

  // Edit Student Dialog State
  const [editingStudent, setEditingStudent] = useState<{
    id: string;
    name: string;
    nationalId: string;
    parentPhone: string;
    className: string;
    sectionName: string;
  } | null>(null);

  // Delete Confirmation State
  const [deletingStudent, setDeletingStudent] = useState<User | null>(null);

  // Refresh trigger
  const [refreshKey, setRefreshKey] = useState(0);

  // Fetch all school students
  const allSchoolStudents = useMemo(() => {
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    refreshKey; // dependency to trigger refresh
    if (!school?.code) return [];
    return getUsers().filter(
      (u) => u.schoolCode?.toUpperCase() === school.code?.toUpperCase() && u.role === 'student'
    );
  }, [school?.code, refreshKey]);

  // Available sections for the currently selected class
  const currentClassSections = useMemo(() => {
    if (selectedClass === 'ALL') {
      const set = new Set<string>();
      schoolClasses.forEach(c => c.sections.forEach(s => set.add(s)));
      return Array.from(set).sort();
    }
    const found = schoolClasses.find(c => c.className === selectedClass);
    return found ? found.sections : ['1', '2', '3'];
  }, [schoolClasses, selectedClass]);

  // Filtered students for current view
  const filteredStudents = useMemo(() => {
    return allSchoolStudents.filter((student) => {
      // Class filter
      if (selectedClass !== 'ALL' && student.className?.trim() !== selectedClass.trim()) {
        return false;
      }
      // Section filter
      if (selectedSection !== 'ALL' && (student.sectionName || '1').trim() !== selectedSection.trim()) {
        return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const matchName = student.name?.toLowerCase().includes(q);
        const matchNid = student.nationalId?.toLowerCase().includes(q);
        const matchPhone = student.parentPhone?.toLowerCase().includes(q);
        return matchName || matchNid || matchPhone;
      }
      return true;
    });
  }, [allSchoolStudents, selectedClass, selectedSection, searchQuery]);

  // Calculate stats
  const totalSchoolStudentsCount = allSchoolStudents.length;
  const currentFilteredCount = filteredStudents.length;

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedStudentIds(filteredStudents.map(s => s.id));
    } else {
      setSelectedStudentIds([]);
    }
  };

  const handleToggleSelectStudent = (id: string) => {
    setSelectedStudentIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  // Open Transfer Dialog for single student
  const openSingleTransfer = (student: User) => {
    const defaultTargetClass = schoolClasses.find(c => c.className !== student.className)?.className || student.className || '';
    const targetSections = schoolClasses.find(c => c.className === defaultTargetClass)?.sections || ['1'];
    setTransferDialog({
      isOpen: true,
      students: [student],
      targetClass: defaultTargetClass,
      targetSection: targetSections[0] || '1',
    });
  };

  // Open Transfer Dialog for selected students (bulk)
  const openBulkTransfer = () => {
    const studentsToTransfer = allSchoolStudents.filter(s => selectedStudentIds.includes(s.id));
    if (studentsToTransfer.length === 0) return;

    const defaultClass = selectedClass !== 'ALL' ? selectedClass : schoolClasses[0]?.className || '';
    const defaultSec = schoolClasses.find(c => c.className === defaultClass)?.sections[0] || '1';

    setTransferDialog({
      isOpen: true,
      students: studentsToTransfer,
      targetClass: defaultClass,
      targetSection: defaultSec,
    });
  };

  // Execute Transfer
  const handleConfirmTransfer = () => {
    if (!transferDialog) return;
    const { students, targetClass, targetSection } = transferDialog;
    if (!targetClass || !targetSection) {
      alert('يرجى تحديد الصف والشعبة المستهدفة لنقل الطلاب إليها.');
      return;
    }

    const studentIds = students.map(s => s.id);
    const result = transferStudentsToClassSection(
      school.code,
      studentIds,
      targetClass,
      targetSection
    );

    soundManager.playSuccess();
    setNotificationMsg({
      text: `✅ تم نقل (${result.transferredCount}) طالب بنجاح إلى (${targetClass} - شعبة ${targetSection})!`,
      type: 'success',
    });

    try {
      addSystemNotification({
        id: `notif-trans-${Date.now()}`,
        title: 'نقل طلاب بين الصفوف 🔄',
        message: `تم نقل ${result.transferredCount} طالب إلى ${targetClass} - شعبة ${targetSection}.`,
        type: 'info',
        schoolCode: school.code,
        createdAt: new Date().toISOString(),
      });
    } catch {}

    setTransferDialog(null);
    setSelectedStudentIds([]);
    setRefreshKey(k => k + 1);
    if (onUpdated) onUpdated();
  };

  // Open Edit Modal
  const openEditModal = (student: User) => {
    setEditingStudent({
      id: student.id,
      name: student.name || '',
      nationalId: student.nationalId || '',
      parentPhone: student.parentPhone || student.parentMobile || student.mobile || '',
      className: student.className || (schoolClasses[0]?.className || ''),
      sectionName: student.sectionName || '1',
    });
  };

  // Save Edit Student
  const handleSaveEditStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent) return;

    const res = updateStudentProfileAndCascade(school.code, editingStudent.id, {
      name: editingStudent.name,
      nationalId: editingStudent.nationalId,
      parentPhone: editingStudent.parentPhone,
      className: editingStudent.className,
      sectionName: editingStudent.sectionName,
    });

    if (!res.success) {
      alert(res.error || 'حدث خطأ أثناء حفظ بيانات الطالب.');
      return;
    }

    soundManager.playSuccess();
    setNotificationMsg({
      text: `✅ تم تحديث بيانات الطالب (${editingStudent.name}) بنجاح!`,
      type: 'success',
    });
    setEditingStudent(null);
    setRefreshKey(k => k + 1);
    if (onUpdated) onUpdated();
  };

  // Delete student
  const handleConfirmDeleteStudent = () => {
    if (!deletingStudent) return;
    deleteUser(deletingStudent.id);
    soundManager.playSuccess();
    setNotificationMsg({
      text: `🗑️ تم حذف الطالب (${deletingStudent.name}) بنجاح.`,
      type: 'info',
    });
    setDeletingStudent(null);
    setSelectedStudentIds(prev => prev.filter(id => id !== deletingStudent.id));
    setRefreshKey(k => k + 1);
    if (onUpdated) onUpdated();
  };

  // Trigger Print View
  const handlePrintRoster = () => {
    soundManager.playBeep();
    window.print();
  };

  const todayArabicDate = new Date().toLocaleDateString('ar-SA', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const content = (
    <div className={`space-y-4 text-slate-800 ${isEmbedded ? 'w-full' : 'bg-white border border-slate-200 rounded-3xl max-w-6xl w-full p-4 sm:p-6 text-right shadow-2xl my-auto max-h-[94vh] flex flex-col'}`}>
      {/* Top Header - Hidden in Print */}
      <div className="no-print flex flex-wrap items-center justify-between border-b border-slate-200 pb-3 gap-3 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center font-black shadow-sm">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-black text-slate-900">
                إدارة شؤون الطلاب وكشوفات نظام نور 👨‍🎓📋
              </h3>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 font-bold text-xs border border-emerald-200">
                {totalSchoolStudentsCount} طالب مسجل بالمدرسة
              </span>
            </div>
            <p className="text-xs text-slate-500">
              مدرسة: <span className="font-bold text-slate-800">{school?.name || ''}</span> | استيراد كشوفات نور (Excel)، نقل وتسكين الطلاب، تعديل البيانات، والطباعة الرسمية
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onOpenExcelManager && (
            <button
              onClick={() => {
                if (onClose && !isEmbedded) onClose();
                onOpenExcelManager();
              }}
              className="py-2 px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm cursor-pointer transition-all hover:scale-105 active:scale-95"
              title="استيراد وتحديث كشوفات الطلاب من ملف نظام نور الرسمي (Excel)"
            >
              <Download className="w-3.5 h-3.5 text-emerald-100" />
              <span>استيراد كشف نور Excel 📥</span>
            </button>
          )}

          <button
            onClick={handlePrintRoster}
            className="py-2 px-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-black text-xs flex items-center gap-1.5 shadow-sm cursor-pointer transition-all hover:scale-105 active:scale-95"
            title="طباعة كشف رسمي لطلاب الصف والشعبة المحددة"
          >
            <Printer className="w-4 h-4 text-amber-400" />
            <span>طباعة كشف الفصل 🖨️</span>
          </button>

          {onOpenClassEditor && (
            <button
              onClick={() => {
                if (onClose && !isEmbedded) onClose();
                onOpenClassEditor();
              }}
              className="py-2 px-3 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 font-bold text-xs flex items-center gap-1 cursor-pointer transition-colors"
              title="تعديل وهيكلة الصفوف والشعب"
            >
              <Layers className="w-3.5 h-3.5 text-amber-600" />
              <span>هيكلة الصفوف 🏫</span>
            </button>
          )}

          {onClose && !isEmbedded && (
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center cursor-pointer transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Alerts / Notifications */}
      {notificationMsg && (
        <div className={`no-print p-3 rounded-xl text-xs font-bold flex items-center justify-between gap-2 shrink-0 ${
          notificationMsg.type === 'success' ? 'bg-emerald-50 text-emerald-900 border border-emerald-200' :
          notificationMsg.type === 'error' ? 'bg-rose-50 text-rose-900 border border-rose-200' :
          'bg-blue-50 text-blue-900 border border-blue-200'
        }`}>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{notificationMsg.text}</span>
          </div>
          <button
            onClick={() => setNotificationMsg(null)}
            className="p-1 hover:bg-black/5 rounded-md cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Filters and Controls - Hidden in Print */}
      <div className="no-print bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-3 shrink-0">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {/* 1. Class Selector */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-600 flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5 text-indigo-600" />
              <span>الصف الدراسي:</span>
            </label>
            <select
              value={selectedClass}
              onChange={(e) => {
                setSelectedClass(e.target.value);
                setSelectedSection('ALL');
                setSelectedStudentIds([]);
              }}
              className="w-full text-xs font-bold p-2.5 rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="ALL">🏫 جميع الصفوف الدراسية</option>
              {schoolClasses.map((c) => {
                const count = allSchoolStudents.filter(s => s.className === c.className).length;
                return (
                  <option key={c.id} value={c.className}>
                    {c.className} ({count} طالب)
                  </option>
                );
              })}
            </select>
          </div>

          {/* 2. Section Selector */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-600 flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-amber-600" />
              <span>الشعبة:</span>
            </label>
            <select
              value={selectedSection}
              onChange={(e) => {
                setSelectedSection(e.target.value);
                setSelectedStudentIds([]);
              }}
              className="w-full text-xs font-bold p-2.5 rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="ALL">📋 جميع الشُعب</option>
              {currentClassSections.map((sec) => {
                const secCount = allSchoolStudents.filter(s => {
                  const matchClass = selectedClass === 'ALL' || s.className === selectedClass;
                  return matchClass && (s.sectionName || '1') === sec;
                }).length;
                return (
                  <option key={sec} value={sec}>
                    شعبة ({sec}) — {secCount} طالب
                  </option>
                );
              })}
            </select>
          </div>

          {/* 3. Search Filter */}
          <div className="space-y-1 sm:col-span-2">
            <label className="text-[11px] font-bold text-slate-600 flex items-center gap-1">
              <Search className="w-3.5 h-3.5 text-slate-500" />
              <span>بحث سريع داخل الكشف (الاسم • الهوية • رقم الجوال):</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ابحث بالاسم أو السجل المدني أو رقم جوال ولي الأمر..."
                className="w-full text-xs p-2.5 pl-8 rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Quick Active Status and Bulk Action Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200/80 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-black text-slate-900 bg-amber-100 text-amber-900 px-2.5 py-1 rounded-lg border border-amber-300 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" />
              <span>
                {selectedClass === 'ALL' ? 'جميع الصفوف' : selectedClass}
                {selectedSection !== 'ALL' && ` - شعبة (${selectedSection})`}
                : ({currentFilteredCount} طالب)
              </span>
            </span>
            {selectedStudentIds.length > 0 && (
              <span className="font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-200">
                تم تحديد ({selectedStudentIds.length}) طالب
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {selectedStudentIds.length > 0 && (
              <button
                type="button"
                onClick={openBulkTransfer}
                className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-black text-xs flex items-center gap-1.5 shadow-sm cursor-pointer transition-all hover:scale-105 active:scale-95"
              >
                <ArrowRightLeft className="w-3.5 h-3.5" />
                <span>نقل الطلاب المحددين ({selectedStudentIds.length}) إلى صف آخر 🔄</span>
              </button>
            )}

            <button
              type="button"
              onClick={handlePrintRoster}
              className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 font-bold text-xs flex items-center gap-1 cursor-pointer transition-all"
            >
              <Printer className="w-3.5 h-3.5 text-slate-600" />
              <span>طباعة هذا الكشف</span>
            </button>
          </div>
        </div>
      </div>

      {/* Printable Official Roster Section */}
      <div className="print-only hidden p-4 mb-3 border-b-2 border-slate-800 text-right">
        <div className="flex items-center justify-between border-b pb-3 mb-2 text-xs">
          <div className="space-y-0.5">
            <p className="font-bold">المملكة العربية السعودية</p>
            <p className="font-bold">وزارة التعليم</p>
            <p className="font-bold">مدرسة: {school?.name}</p>
          </div>
          <div className="text-center space-y-1">
            <h2 className="text-base font-black">كشف أسماء الطلاب الرسمي</h2>
            <p className="text-xs font-bold text-slate-700">
              الصف: {selectedClass === 'ALL' ? 'جميع الصفوف' : selectedClass} | 
              الشعبة: {selectedSection === 'ALL' ? 'جميع الشُعب' : `شعبة (${selectedSection})`}
            </p>
          </div>
          <div className="text-left space-y-0.5 text-[11px]">
            <p>العام الدراسي: 1447-1448هـ</p>
            <p>التاريخ: {todayArabicDate}</p>
            <p>العدد الكلي: {filteredStudents.length} طالباً</p>
          </div>
        </div>
      </div>

      {/* Students Table - Scrollable inside modal, fully visible in print */}
      <div className="flex-1 overflow-y-auto min-h-[250px] border border-slate-200 rounded-2xl bg-white">
        {filteredStudents.length === 0 ? (
          <div className="text-center py-16 space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <Users className="w-7 h-7" />
            </div>
            <p className="text-sm font-bold text-slate-700">
              لا يوجد طلاب مسجلين في هذا الكشف حالياً
            </p>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              يمكنك إضافة وتحديث الطلاب عبر استيراد ملف نور الرسمي (Excel) أو إضافة طالب يدوياً.
            </p>
            {onOpenExcelManager && (
              <button
                type="button"
                onClick={() => {
                  if (onClose && !isEmbedded) onClose();
                  onOpenExcelManager();
                }}
                className="mt-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer shadow-sm transition-transform active:scale-95"
              >
                <Download className="w-4 h-4" />
                <span>استيراد كشف نور Excel الآن 📥</span>
              </button>
            )}
          </div>
        ) : (
          <table className="w-full text-right border-collapse text-xs">
            <thead className="bg-slate-100 sticky top-0 z-10 border-b border-slate-200 font-bold text-slate-700">
              <tr>
                <th className="no-print p-3 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={selectedStudentIds.length === filteredStudents.length && filteredStudents.length > 0}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 cursor-pointer"
                    title="تحديد كل الطلاب الظاهرين"
                  />
                </th>
                <th className="p-3 w-12 text-center">#</th>
                <th className="p-3">اسم الطالب الكامل</th>
                <th className="p-3">رقم الهوية الوطنية / الإقامة</th>
                <th className="p-3">رقم جوال ولي الأمر</th>
                <th className="p-3">الصف</th>
                <th className="p-3">الشعبة</th>
                <th className="print-only hidden p-3 w-28 text-center border-l">التوقيع / الحضور</th>
                <th className="print-only hidden p-3 w-32 text-center">ملاحظات</th>
                <th className="no-print p-3 w-40 text-center">إجراءات الطالب</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStudents.map((student, idx) => {
                const isSelected = selectedStudentIds.includes(student.id);
                return (
                  <tr 
                    key={student.id} 
                    className={`hover:bg-slate-50/80 transition-colors ${
                      isSelected ? 'bg-amber-50/60' : ''
                    }`}
                  >
                    <td className="no-print p-3 text-center">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleSelectStudent(student.id)}
                        className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 cursor-pointer"
                      />
                    </td>
                    <td className="p-3 text-center font-mono text-slate-400 font-bold">
                      {idx + 1}
                    </td>
                    <td className="p-3 font-bold text-slate-900">
                      <div className="flex items-center gap-2">
                        <div className="no-print w-7 h-7 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-xs shrink-0">
                          {student.name.charAt(0)}
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            if (onOpenStudentDossier) onOpenStudentDossier(student);
                            else setActiveDossierStudent(student);
                          }}
                          className="text-right hover:text-indigo-600 hover:underline cursor-pointer transition-colors font-bold"
                          title="اضغط لفتح الملف الأكاديمي الشامل والمواظبة"
                        >
                          {student.name}
                        </button>
                      </div>
                    </td>
                    <td className="p-3 font-mono font-medium text-slate-700">
                      {student.nationalId || '—'}
                    </td>
                    <td className="p-3">
                      {student.parentPhone ? (
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-slate-800">{student.parentPhone}</span>
                          <a
                            href={`tel:${student.parentPhone}`}
                            className="no-print p-1 rounded-md text-emerald-700 hover:bg-emerald-100 transition-colors"
                            title="اتصال هاتفي بولي الأمر"
                          >
                            <Phone className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      ) : (
                        <span className="text-slate-400 font-normal">غير مسجل</span>
                      )}
                    </td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 font-bold text-[11px]">
                        {student.className || 'غير محدد'}
                      </span>
                    </td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-900 border border-amber-200 font-bold text-[11px]">
                        شعبة ({student.sectionName || '1'})
                      </span>
                    </td>

                    {/* Print only signature & notes columns */}
                    <td className="print-only hidden p-3 border-l text-center"></td>
                    <td className="print-only hidden p-3 text-center"></td>

                    {/* Actions column - Hidden in Print */}
                    <td className="no-print p-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {/* 1. Academic Dossier */}
                        <button
                          type="button"
                          onClick={() => {
                            if (onOpenStudentDossier) onOpenStudentDossier(student);
                            else setActiveDossierStudent(student);
                          }}
                          className="p-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-200 cursor-pointer transition-all flex items-center gap-1 font-bold text-[11px]"
                          title="الملف الأكاديمي الشامل وسجل الحضور والمواظبة"
                        >
                          <GraduationCap className="w-3.5 h-3.5 text-indigo-600" />
                          <span>الملف</span>
                        </button>

                        {/* 2. Parent Summons */}
                        <button
                          type="button"
                          onClick={() => {
                            if (onOpenParentSummon) onOpenParentSummon(student);
                            else setActiveSummonStudent(student);
                          }}
                          className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-900 border border-rose-200 cursor-pointer transition-all flex items-center gap-1 font-bold text-[11px]"
                          title="استدعاء ولي الأمر رسمي (إشعار + واتساب + طباعة خطاب)"
                        >
                          <Mail className="w-3.5 h-3.5 text-rose-600" />
                          <span>استدعاء</span>
                        </button>

                        {/* 3. Behavior points (+/-) */}
                        <button
                          type="button"
                          onClick={() => {
                            if (onOpenBehaviorRecord) onOpenBehaviorRecord(student);
                            else setActiveBehaviorStudent(student);
                          }}
                          className="p-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 cursor-pointer transition-all flex items-center gap-1 font-bold text-[11px]"
                          title="منح سلوك إيجابي أو رصد ملاحظة سلوكية"
                        >
                          <Star className="w-3.5 h-3.5 text-amber-600 fill-amber-500/20" />
                          <span>سلوك</span>
                        </button>

                        {/* 4. Transfer */}
                        <button
                          type="button"
                          onClick={() => openSingleTransfer(student)}
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 cursor-pointer transition-all flex items-center gap-1 font-bold text-[11px]"
                          title="نقل الطالب إلى صف أو شعبة أخرى"
                        >
                          <ArrowRightLeft className="w-3.5 h-3.5 text-slate-600" />
                          <span>نقل</span>
                        </button>

                        {/* 5. Edit */}
                        <button
                          type="button"
                          onClick={() => openEditModal(student)}
                          className="p-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 cursor-pointer transition-all flex items-center gap-1 font-bold text-[11px]"
                          title="تعديل بيانات الطالب"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-blue-600" />
                        </button>

                        {/* 6. Delete */}
                        <button
                          type="button"
                          onClick={() => setDeletingStudent(student)}
                          className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 cursor-pointer transition-all"
                          title="حذف الطالب من المدرسة"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Official Signatures Block - Print Only */}
      <div className="print-only hidden pt-8 mt-6 border-t-2 border-slate-800 text-xs text-slate-900">
        <div className="grid grid-cols-3 gap-6 text-center">
          <div className="space-y-8">
            <p className="font-bold">رائد الفصل / المعلم:</p>
            <p className="border-b border-dotted border-slate-500 pb-1">........................................</p>
          </div>
          <div className="space-y-8">
            <p className="font-bold">الموجه الطلابي:</p>
            <p className="border-b border-dotted border-slate-500 pb-1">........................................</p>
          </div>
          <div className="space-y-8">
            <p className="font-bold">مدير المدرسة والختم الرسمي:</p>
            <p className="border-b border-dotted border-slate-500 pb-1">........................................</p>
          </div>
        </div>
      </div>

      {/* Bottom Status Bar - Hidden in Print */}
      <div className="no-print flex flex-wrap items-center justify-between gap-3 pt-2 text-xs border-t border-slate-100 shrink-0">
        <div className="text-slate-500 flex items-center gap-2">
          <span>إجمالي المعروض في الكشف: <strong className="text-slate-900 font-black">{filteredStudents.length}</strong> طالب</span>
          <span className="text-slate-300">•</span>
          <span>إجمالي طلاب المدرسة: <strong className="text-slate-900 font-bold">{totalSchoolStudentsCount}</strong> طالب</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handlePrintRoster}
            className="py-2 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-black text-xs flex items-center gap-1.5 shadow-md cursor-pointer transition-all"
          >
            <Printer className="w-4 h-4 text-amber-400" />
            <span>طباعة كشف الفصل (A4) 🖨️</span>
          </button>

          {onClose && !isEmbedded && (
            <button
              onClick={onClose}
              className="py-2 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
            >
              إغلاق النافذة
            </button>
          )}
        </div>
      </div>

      {/* 1. Modal: Transfer Student(s) Dialog */}
      {transferDialog && (
        <div className="fixed inset-0 z-60 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn text-right">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 text-right space-y-4 shadow-2xl text-slate-800 border border-amber-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold">
                  <ArrowRightLeft className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-base font-black text-slate-900">
                    نقل {transferDialog.students.length > 1 ? `الطلاب (${transferDialog.students.length})` : 'الطالب'} بين الصفوف والشعب
                  </h4>
                  <p className="text-xs text-slate-500">
                    اختر الصف الدراسي والشعبة المستهدفة لنقل الطالب وسجلاته تلقائياً
                  </p>
                </div>
              </div>
              <button
                onClick={() => setTransferDialog(null)}
                className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* List of students being transferred */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 text-xs space-y-1.5 max-h-36 overflow-y-auto">
              <span className="font-bold text-slate-700 block">الطلاب المراد نقلهم:</span>
              <div className="flex flex-wrap gap-1.5">
                {transferDialog.students.map((st) => (
                  <span 
                    key={st.id} 
                    className="inline-flex items-center gap-1 bg-white border border-slate-200 px-2.5 py-1 rounded-lg text-slate-800 font-bold"
                  >
                    <span>{st.name}</span>
                    <span className="text-[10px] text-slate-400">({st.className || 'بدون صف'} - شعبة {st.sectionName || '1'})</span>
                  </span>
                ))}
              </div>
            </div>

            {/* Target Class & Target Section Selection */}
            <div className="space-y-3 bg-amber-50/60 border border-amber-200 rounded-2xl p-4">
              <div className="space-y-1">
                <label className="text-xs font-black text-slate-800 flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5 text-amber-600" />
                  <span>الصف الدراسي الجديد المستهدف:</span>
                </label>
                <select
                  value={transferDialog.targetClass}
                  onChange={(e) => {
                    const newClass = e.target.value;
                    const availableSecs = schoolClasses.find(c => c.className === newClass)?.sections || ['1'];
                    setTransferDialog(prev => prev ? {
                      ...prev,
                      targetClass: newClass,
                      targetSection: availableSecs[0] || '1',
                    } : null);
                  }}
                  className="w-full text-xs font-bold p-3 rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  {schoolClasses.map(c => (
                    <option key={c.id} value={c.className}>
                      {c.className}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-black text-slate-800 flex items-center gap-1">
                  <Layers className="w-3.5 h-3.5 text-amber-600" />
                  <span>الشعبة المستهدفة:</span>
                </label>
                <div className="flex flex-wrap gap-2 pt-1">
                  {(schoolClasses.find(c => c.className === transferDialog.targetClass)?.sections || ['1', '2', '3']).map((sec) => {
                    const isSecSelected = transferDialog.targetSection === sec;
                    return (
                      <button
                        type="button"
                        key={sec}
                        onClick={() => setTransferDialog(prev => prev ? { ...prev, targetSection: sec } : null)}
                        className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer border ${
                          isSecSelected 
                            ? 'bg-amber-500 text-white border-amber-600 shadow-sm' 
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        شعبة ({sec})
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setTransferDialog(null)}
                className="py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleConfirmTransfer}
                className="py-2.5 px-5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-black text-xs flex items-center gap-2 shadow-md shadow-amber-500/20 cursor-pointer transition-all"
              >
                <Check className="w-4 h-4" />
                <span>تأكيد النقل الآن ↵</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Modal: Edit Student Information */}
      {editingStudent && (
        <div className="fixed inset-0 z-60 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn text-right">
          <form 
            onSubmit={handleSaveEditStudent}
            className="bg-white rounded-3xl max-w-lg w-full p-6 text-right space-y-4 shadow-2xl text-slate-800 border border-slate-200"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-base font-black text-slate-900">
                    تعديل بيانات الطالب
                  </h4>
                  <p className="text-xs text-slate-500">
                    تعديل الاسم، رقم الهوية، جوال ولي الأمر، والصف والشعبة
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingStudent(null)}
                className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">اسم الطالب الكامل *</label>
                <input
                  type="text"
                  required
                  value={editingStudent.name}
                  onChange={(e) => setEditingStudent({ ...editingStudent, name: e.target.value })}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">رقم الهوية الوطنية / الإقامة (10 أرقام) *</label>
                <input
                  type="text"
                  required
                  maxLength={10}
                  value={editingStudent.nationalId}
                  onChange={(e) => setEditingStudent({ ...editingStudent, nationalId: e.target.value })}
                  className="w-full text-xs font-mono p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">رقم جوال ولي الأمر (05xxxxxxxx)</label>
                <input
                  type="tel"
                  maxLength={10}
                  value={editingStudent.parentPhone}
                  onChange={(e) => setEditingStudent({ ...editingStudent, parentPhone: e.target.value })}
                  placeholder="0500000000"
                  className="w-full text-xs font-mono p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">الصف الدراسي</label>
                  <select
                    value={editingStudent.className}
                    onChange={(e) => {
                      const newCls = e.target.value;
                      const secs = schoolClasses.find(c => c.className === newCls)?.sections || ['1'];
                      setEditingStudent({ 
                        ...editingStudent, 
                        className: newCls,
                        sectionName: secs[0] || '1'
                      });
                    }}
                    className="w-full text-xs font-bold p-2.5 rounded-xl border border-slate-300 bg-white"
                  >
                    {schoolClasses.map(c => (
                      <option key={c.id} value={c.className}>{c.className}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">الشعبة</label>
                  <select
                    value={editingStudent.sectionName}
                    onChange={(e) => setEditingStudent({ ...editingStudent, sectionName: e.target.value })}
                    className="w-full text-xs font-bold p-2.5 rounded-xl border border-slate-300 bg-white"
                  >
                    {(schoolClasses.find(c => c.className === editingStudent.className)?.sections || ['1', '2', '3']).map(s => (
                      <option key={s} value={s}>شعبة ({s})</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEditingStudent(null)}
                className="py-2 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="submit"
                className="py-2 px-5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs flex items-center gap-1.5 shadow-md shadow-blue-600/20 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>حفظ التعديلات ↵</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 3. Modal: Delete Student Confirmation */}
      {deletingStudent && (
        <div className="fixed inset-0 z-60 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn text-right">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 text-right space-y-4 shadow-2xl text-slate-800 border border-rose-200">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1">
              <h4 className="text-base font-black text-slate-900">
                حذف الطالب ({deletingStudent.name})
              </h4>
              <p className="text-xs text-slate-500">
                هل أنت متأكد من رغبتك في حذف هذا الطالب وسجلاته من المدرسة نهائياً؟
              </p>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs space-y-1 text-slate-700">
              <p>الهوية: <span className="font-mono font-bold text-slate-900">{deletingStudent.nationalId}</span></p>
              <p>الصف: <span className="font-bold text-slate-900">{deletingStudent.className}</span> - شعبة <span className="font-bold text-slate-900">{deletingStudent.sectionName || '1'}</span></p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDeletingStudent(null)}
                className="py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer flex-1"
              >
                تراجع
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteStudent}
                className="py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs cursor-pointer flex-1 shadow-md shadow-rose-600/20"
              >
                تأكيد الحذف 🗑️
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Student Dossier Modal */}
      {activeDossierStudent && (
        <StudentDossierModal
          isOpen={!!activeDossierStudent}
          onClose={() => setActiveDossierStudent(null)}
          student={activeDossierStudent}
          school={school}
          onOpenQrCard={() => setActiveDossierStudent(null)}
          onAttendanceUpdated={() => {
            setRefreshKey((k) => k + 1);
            if (onUpdated) onUpdated();
          }}
        />
      )}

      {/* 5. Parent Summon Modal */}
      {activeSummonStudent && (
        <ParentSummonModal
          isOpen={!!activeSummonStudent}
          onClose={() => setActiveSummonStudent(null)}
          student={activeSummonStudent}
          allSchoolStudents={allSchoolStudents}
          currentSchool={school}
          currentUser={currentUser}
          onSummonCreated={() => {
            setRefreshKey((k) => k + 1);
            if (onUpdated) onUpdated();
          }}
        />
      )}

      {/* 6. Behavior Record Modal */}
      {activeBehaviorStudent && (
        <BehaviorRecordModal
          isOpen={!!activeBehaviorStudent}
          onClose={() => setActiveBehaviorStudent(null)}
          student={activeBehaviorStudent}
          currentUser={currentUser}
          currentSchool={school}
          onSaved={() => {
            setActiveBehaviorStudent(null);
            setRefreshKey((k) => k + 1);
            if (onUpdated) onUpdated();
          }}
        />
      )}
    </div>
  );

  return content;
};

export const ClassRosterManagerModal: React.FC<ClassRosterManagerModalProps> = ({
  isOpen,
  onClose,
  school,
  initialClass,
  initialSection,
  onOpenClassEditor,
  onOpenExcelManager,
  onUpdated,
  onOpenStudentDossier,
  onOpenParentSummon,
  onOpenBehaviorRecord,
  currentUser,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn overflow-y-auto">
      <ClassRosterView
        school={school}
        initialClass={initialClass}
        initialSection={initialSection}
        onOpenClassEditor={onOpenClassEditor}
        onOpenExcelManager={onOpenExcelManager}
        onUpdated={onUpdated}
        isEmbedded={false}
        onClose={onClose}
        onOpenStudentDossier={onOpenStudentDossier}
        onOpenParentSummon={onOpenParentSummon}
        onOpenBehaviorRecord={onOpenBehaviorRecord}
        currentUser={currentUser}
      />
    </div>
  );
};

