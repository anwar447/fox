import React, { useState, useMemo, useEffect } from 'react';
import { School, User, SchoolClassSection } from '../types';
import { 
  getUsers, saveUsers, updateSchool, 
  renameSchoolClassAndCascade, renameSchoolSectionAndCascade, 
  deleteSchoolClassSafely, deleteSchoolSectionSafely, 
  addSchoolClass, addSchoolSection, updateSchoolCustomClasses 
} from '../utils/storage';
import { parseNoorExcelFile, ParsedStudentRow } from '../utils/excelParser';
import { getSchoolClasses, getDefaultClassesForSchoolType } from '../utils/schoolClasses';
import { 
  FileSpreadsheet, Upload, Plus, Trash2, Check, 
  X, AlertCircle, Sparkles, Users, Layers, UserPlus,
  RotateCcw, Building2, Pencil, ShieldCheck, ArrowRightLeft
} from 'lucide-react';

interface ClassExcelManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  school: School;
  onUpdated: () => void;
  initialTab?: 'excel' | 'manual' | 'classes';
}

export const ClassExcelManagerModal: React.FC<ClassExcelManagerModalProps> = ({
  isOpen,
  onClose,
  school,
  onUpdated,
  initialTab = 'excel',
}) => {
  const [activeTab, setActiveTab] = useState<'excel' | 'manual' | 'classes'>(initialTab);
  const [parsedRows, setParsedRows] = useState<ParsedStudentRow[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [msg, setMsg] = useState('');

  // Manual student state
  const [studentName, setStudentName] = useState('');
  const [studentNid, setStudentNid] = useState('');
  const [studentMobile, setStudentMobile] = useState('');
  const [parentMobile, setParentMobile] = useState('');

  // Class / Sections management (strictly scoped to this school)
  const [classesList, setClassesList] = useState<SchoolClassSection[]>(() => getSchoolClasses(school));
  const [newClassName, setNewClassName] = useState('');
  const [newClassSections, setNewClassSections] = useState('1, 2, 3');

  // Inline editing states for Class & Section
  const [editingClassId, setEditingClassId] = useState<string | null>(null);
  const [editingClassNameInput, setEditingClassNameInput] = useState('');
  
  const [addingSectionClassId, setAddingSectionClassId] = useState<string | null>(null);
  const [newSectionInput, setNewSectionInput] = useState('');

  const [editingSectionTarget, setEditingSectionTarget] = useState<{
    classId: string;
    className: string;
    oldSection: string;
  } | null>(null);
  const [editingSectionInput, setEditingSectionInput] = useState('');

  // Safe migration dialogs for deleting classes or sections with active students
  const [classMigrationDialog, setClassMigrationDialog] = useState<{
    isOpen: boolean;
    targetClass: SchoolClassSection;
    enrolledCount: number;
    destinationClass: string;
    destinationSection: string;
  } | null>(null);

  const [sectionMigrationDialog, setSectionMigrationDialog] = useState<{
    isOpen: boolean;
    targetClass: SchoolClassSection;
    targetSection: string;
    enrolledCount: number;
    destinationSection: string;
  } | null>(null);

  const [selectedClass, setSelectedClass] = useState(classesList[0]?.className || '');
  const [selectedSection, setSelectedSection] = useState(classesList[0]?.sections[0] || '1');

  // Count registered students in this specific school by class
  const enrolledStudentsCount = useMemo(() => {
    const schoolStudents = getUsers().filter((u) => u.schoolCode === school.code && u.role === 'student');
    const counts: Record<string, number> = {};
    schoolStudents.forEach((st) => {
      const c = (st.className || '').trim();
      if (c) counts[c] = (counts[c] || 0) + 1;
    });
    return counts;
  }, [school.code, classesList]);

  // Count registered students by class AND section
  const enrolledStudentsBySection = useMemo(() => {
    const schoolStudents = getUsers().filter((u) => u.schoolCode === school.code && u.role === 'student');
    const counts: Record<string, number> = {};
    schoolStudents.forEach((st) => {
      const c = (st.className || '').trim();
      const s = (st.sectionName || '1').trim();
      if (c) {
        const key = `${c}:::${s}`;
        counts[key] = (counts[key] || 0) + 1;
      }
    });
    return counts;
  }, [school.code, classesList]);

  // Synchronize and reset state cleanly whenever modal is opened or school is changed
  useEffect(() => {
    if (isOpen && school) {
      setActiveTab(initialTab || 'excel');
      const freshClasses = getSchoolClasses(school);
      setClassesList(freshClasses);
      if (freshClasses.length > 0) {
        setSelectedClass(freshClasses[0].className);
        setSelectedSection(freshClasses[0].sections[0] || '1');
      }
      setParsedRows([]);
      setMsg('');
      setEditingClassId(null);
      setAddingSectionClassId(null);
      setEditingSectionTarget(null);
      setClassMigrationDialog(null);
      setSectionMigrationDialog(null);
    }
  }, [isOpen, school.code, initialTab]);

  const currentAvailableSections = useMemo(() => {
    const matched = classesList.find((c) => c.className === selectedClass);
    return matched ? matched.sections : ['1', '2', '3'];
  }, [classesList, selectedClass]);

  if (!isOpen) return null;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsProcessing(true);
    setMsg('جاري قراءة ملف الإكسل وتحليل كشوفات نظام نور...');
    try {
      const rows = await parseNoorExcelFile(file);
      setParsedRows(rows);
      setMsg(`تم استخراج (${rows.length}) طالب بنجاح من كشف نور.`);
    } catch (err: unknown) {
      const error = err as Error;
      setMsg(`فشل قراءة الملف: ${error.message || 'تأكد من تنسيق كشف نور'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleImportStudents = () => {
    if (parsedRows.length === 0) return;
    const existingUsers = getUsers();
    const updatedUsers = [...existingUsers];

    let addedCount = 0;
    parsedRows.forEach((row) => {
      const cleanNid = row.nationalId.trim();
      const existingIdx = updatedUsers.findIndex(
        (u) => u.nationalId === cleanNid && u.schoolCode === school.code
      );

      const studentUser: User = {
        id: `usr-s-${cleanNid}`,
        nationalId: cleanNid,
        name: row.name.trim(),
        mobile: row.studentMobile,
        parentMobile: row.parentMobile,
        password: cleanNid.slice(-4) || '123456',
        role: 'student',
        schoolCode: school.code,
        className: row.className,
        sectionName: row.sectionName,
      };

      if (existingIdx >= 0) {
        updatedUsers[existingIdx] = { ...updatedUsers[existingIdx], ...studentUser };
      } else {
        updatedUsers.push(studentUser);
        addedCount++;
      }

      // Auto-provision parent account if parent mobile exists
      if (row.parentMobile && row.parentMobile.trim()) {
        const cleanParentMob = row.parentMobile.trim().replace(/\D/g, '');
        if (cleanParentMob.length >= 9) {
          const pIdx = updatedUsers.findIndex(
            (u) => u.role === 'parent' && (u.mobile === cleanParentMob || u.nationalId === cleanParentMob)
          );
          if (pIdx >= 0) {
            const existingKids = updatedUsers[pIdx].childrenNationalIds || [];
            updatedUsers[pIdx] = {
              ...updatedUsers[pIdx],
              childrenNationalIds: Array.from(new Set([...existingKids, cleanNid])),
            };
          } else {
            updatedUsers.push({
              id: `usr-p-${cleanParentMob}`,
              nationalId: cleanParentMob,
              name: `ولي أمر الطالب (${row.name.trim()})`,
              mobile: cleanParentMob,
              password: cleanParentMob.slice(-4) || '123456',
              role: 'parent',
              schoolCode: school.code,
              childrenNationalIds: [cleanNid],
            });
          }
        }
      }
    });

    saveUsers(updatedUsers);
    setMsg(`✅ تم استيراد وتسكين (${parsedRows.length}) طالب بنجاح! 🔑 كلمات المرور الافتراضية للطلاب وأولياء الأمور هي آخر 4 أرقام أو (123456).`);
    setParsedRows([]);
    onUpdated();
  };

  const handleAddSingleStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentName.trim() || !studentNid.trim()) {
      setMsg('يرجى إدخال اسم الطالب ورقم الهوية');
      return;
    }

    const cleanNid = studentNid.trim().replace(/\D/g, '');
    if (cleanNid.length !== 10) {
      setMsg('رقم الهوية الوطنية / الإقامة يجب أن يتكون من 10 أرقام');
      return;
    }

    const existingUsers = getUsers();
    const existingIdx = existingUsers.findIndex(
      (u) => u.nationalId === cleanNid && u.schoolCode === school.code
    );

    const newStudent: User = {
      id: `usr-s-${cleanNid}`,
      nationalId: cleanNid,
      name: studentName.trim(),
      mobile: studentMobile.trim() || undefined,
      parentMobile: parentMobile.trim() || undefined,
      password: cleanNid.slice(-4) || '123456',
      role: 'student',
      schoolCode: school.code,
      className: selectedClass,
      sectionName: selectedSection,
    };

    let updatedUsers = [...existingUsers];
    if (existingIdx >= 0) {
      updatedUsers[existingIdx] = { ...updatedUsers[existingIdx], ...newStudent };
    } else {
      updatedUsers.push(newStudent);
    }

    // Auto-create / link parent account if parent mobile is provided
    const cleanParentMob = parentMobile.trim().replace(/\D/g, '');
    if (cleanParentMob.length >= 9) {
      const pIdx = updatedUsers.findIndex(
        (u) => u.role === 'parent' && (u.mobile === cleanParentMob || u.nationalId === cleanParentMob)
      );
      if (pIdx >= 0) {
        const existingKids = updatedUsers[pIdx].childrenNationalIds || [];
        updatedUsers[pIdx] = {
          ...updatedUsers[pIdx],
          childrenNationalIds: Array.from(new Set([...existingKids, cleanNid])),
        };
      } else {
        updatedUsers.push({
          id: `usr-p-${cleanParentMob}`,
          nationalId: cleanParentMob,
          name: `ولي أمر الطالب (${studentName.trim()})`,
          mobile: cleanParentMob,
          password: cleanParentMob.slice(-4) || '123456',
          role: 'parent',
          schoolCode: school.code,
          childrenNationalIds: [cleanNid],
        });
      }
    }

    saveUsers(updatedUsers);
    const parentPassInfo = cleanParentMob ? ` | ولي الأمر: بالجوال (${cleanParentMob}) وكلمة المرور (${cleanParentMob.slice(-4)} أو 123456)` : '';
    setMsg(`✅ تم إضافة الطالب (${studentName}) بنجاح! 🔑 دخول الطالب: بالهوية (${cleanNid}) وكلمة المرور (${cleanNid.slice(-4)} أو 123456 أو رقم الهوية)${parentPassInfo}`);
    
    // Reset form
    setStudentName('');
    setStudentNid('');
    setStudentMobile('');
    setParentMobile('');
    onUpdated();
  };

  // --- 1. ADD NEW CLASS (تزويد صفوف) ---
  const handleAddClass = () => {
    const cleanName = newClassName.trim();
    if (!cleanName) {
      setMsg('⚠️ يرجى كتابة اسم الصف أولاً.');
      return;
    }
    if (classesList.some((c) => c.className.trim() === cleanName)) {
      setMsg(`⚠️ الصف (${cleanName}) موجود بالفعل في قائمة المدرسة.`);
      return;
    }

    const sections = newClassSections
      .split(/[,،]/)
      .map((s) => s.trim())
      .filter(Boolean);

    const cleanSections = sections.length > 0 ? sections : ['1', '2', '3'];
    const addRes = addSchoolClass(school.code, cleanName, cleanSections);
    if (addRes.success) {
      const updated = [
        ...classesList,
        {
          id: `c-${Date.now()}`,
          className: cleanName,
          sections: cleanSections,
        },
      ];
      setClassesList(updated);
      setNewClassName('');
      setNewClassSections('1, 2, 3');
      setMsg(`✅ تم تزويد الصف (${cleanName}) بشعب (${cleanSections.join('، ')}) بنجاح.`);
      onUpdated();
    } else {
      setMsg(addRes.message || 'فشلت إضافة الصف.');
    }
  };

  // --- 2. RENAME CLASS (تغيير اسم الصف مع ترحيل كافة السجلات) ---
  const handleStartRenameClass = (c: SchoolClassSection) => {
    setEditingClassId(c.id);
    setEditingClassNameInput(c.className);
  };

  const handleSaveRenameClass = (c: SchoolClassSection) => {
    const cleanNew = editingClassNameInput.trim();
    if (!cleanNew) {
      setMsg('⚠️ لا يمكن ترك اسم الصف فارغاً.');
      return;
    }
    if (cleanNew === c.className.trim()) {
      setEditingClassId(null);
      return;
    }
    if (classesList.some((other) => other.id !== c.id && other.className.trim() === cleanNew)) {
      setMsg(`⚠️ يوجد صف آخر بنفس الاسم (${cleanNew}) في المدرسة.`);
      return;
    }

    const res = renameSchoolClassAndCascade(school.code, c.className, cleanNew);
    const updated = classesList.map((item) =>
      item.id === c.id ? { ...item, className: cleanNew } : item
    );
    setClassesList(updated);
    if (selectedClass === c.className) {
      setSelectedClass(cleanNew);
    }
    setEditingClassId(null);
    setMsg(
      `✅ تم تغيير اسم الصف إلى (${cleanNew}) بنجاح! تم تحديث (${res.updatedStudentsCount}) طالباً و (${res.updatedAttendanceCount}) سجل حضور وغياب تلقائياً دون أي فقدان.`
    );
    onUpdated();
  };

  // --- 3. DELETE CLASS (حذف صف زائد بأمان دون أن تخرب شيء) ---
  const handleRequestDeleteClass = (c: SchoolClassSection) => {
    const enrolled = enrolledStudentsCount[c.className] || 0;
    if (enrolled === 0) {
      const confirmDelete = window.confirm(
        `هل ترغب في حذف الصف الزائد (${c.className}) من المدرسة؟\n(هذا الصف لا يحتوي على طلاب).`
      );
      if (!confirmDelete) return;

      deleteSchoolClassSafely(school.code, c.className);
      const updated = classesList.filter((item) => item.id !== c.id);
      setClassesList(updated);
      if (selectedClass === c.className && updated.length > 0) {
        setSelectedClass(updated[0].className);
        setSelectedSection(updated[0].sections[0] || '1');
      }
      setMsg(`✅ تم حذف الصف الزائد (${c.className}) بنجاح.`);
      onUpdated();
    } else {
      // Students exist: open safe migration dialog
      const otherClasses = classesList.filter((item) => item.id !== c.id);
      setClassMigrationDialog({
        isOpen: true,
        targetClass: c,
        enrolledCount: enrolled,
        destinationClass: otherClasses[0]?.className || '',
        destinationSection: otherClasses[0]?.sections[0] || '1',
      });
    }
  };

  const handleConfirmMigrateAndDeleteClass = () => {
    if (!classMigrationDialog) return;
    const { targetClass, destinationClass, destinationSection } = classMigrationDialog;
    if (!destinationClass) {
      alert('يرجى اختيار الصف البديل لنقل الطلاب إليه أولاً.');
      return;
    }

    const res = deleteSchoolClassSafely(
      school.code,
      targetClass.className,
      destinationClass,
      destinationSection
    );
    const updated = classesList.filter((item) => item.id !== targetClass.id);
    setClassesList(updated);
    if (selectedClass === targetClass.className && updated.length > 0) {
      setSelectedClass(updated[0].className);
      setSelectedSection(updated[0].sections[0] || '1');
    }
    setClassMigrationDialog(null);
    setMsg(
      `✅ تم حذف الصف (${targetClass.className}) ونقل (${res.affectedStudentsCount}) طالباً وسجلاتهم بالكامل إلى (${destinationClass} - شعبة ${destinationSection}) دون فقدان أي بيانات!`
    );
    onUpdated();
  };

  const handleConfirmDeleteWithoutMigrateClass = () => {
    if (!classMigrationDialog) return;
    const { targetClass } = classMigrationDialog;
    const res = deleteSchoolClassSafely(school.code, targetClass.className);
    const updated = classesList.filter((item) => item.id !== targetClass.id);
    setClassesList(updated);
    if (selectedClass === targetClass.className && updated.length > 0) {
      setSelectedClass(updated[0].className);
      setSelectedSection(updated[0].sections[0] || '1');
    }
    setClassMigrationDialog(null);
    setMsg(
      `✅ تم حذف الصف (${targetClass.className}) وإبقاء (${res.affectedStudentsCount}) طالباً في المدرسة كغير مسكنين مؤقتاً لحفظ حساباتهم ودرجاتهم بنجاح.`
    );
    onUpdated();
  };

  // --- 4. SECTIONS MANAGEMENT: ADD, RENAME, DELETE ---
  const handleAddSectionToClass = (c: SchoolClassSection) => {
    const cleanSec = newSectionInput.trim();
    if (!cleanSec) {
      setMsg('⚠️ يرجى إدخال اسم الشعبة أولاً.');
      return;
    }
    if (c.sections.some((s) => s.trim() === cleanSec)) {
      setMsg(`⚠️ الشعبة (${cleanSec}) موجودة بالفعل في صف (${c.className}).`);
      return;
    }

    addSchoolSection(school.code, c.className, cleanSec);
    const updated = classesList.map((item) => {
      if (item.id === c.id) {
        return { ...item, sections: [...item.sections, cleanSec] };
      }
      return item;
    });
    setClassesList(updated);
    setAddingSectionClassId(null);
    setNewSectionInput('');
    setMsg(`✅ تم تزويد الشعبة (${cleanSec}) لصف (${c.className}) بنجاح.`);
    onUpdated();
  };

  const handleStartRenameSection = (c: SchoolClassSection, oldSection: string) => {
    setEditingSectionTarget({
      classId: c.id,
      className: c.className,
      oldSection,
    });
    setEditingSectionInput(oldSection);
  };

  const handleSaveRenameSection = () => {
    if (!editingSectionTarget) return;
    const { className, oldSection } = editingSectionTarget;
    const cleanNew = editingSectionInput.trim();
    if (!cleanNew) {
      setMsg('⚠️ لا يمكن ترك اسم الشعبة فارغاً.');
      return;
    }
    if (cleanNew === oldSection) {
      setEditingSectionTarget(null);
      return;
    }

    const res = renameSchoolSectionAndCascade(school.code, className, oldSection, cleanNew);
    const updated = classesList.map((c) => {
      if (c.className === className) {
        return {
          ...c,
          sections: c.sections.map((s) => (s === oldSection ? cleanNew : s)),
        };
      }
      return c;
    });
    setClassesList(updated);
    setEditingSectionTarget(null);
    setMsg(
      `✅ تم تعديل اسم الشعبة من (${oldSection}) إلى (${cleanNew}) وتحديث (${res.updatedStudentsCount}) طالباً وسجلاتهم بنجاح دون أي خلل!`
    );
    onUpdated();
  };

  const handleRequestDeleteSection = (c: SchoolClassSection, sectionName: string) => {
    const secKey = `${c.className}:::${sectionName}`;
    const secEnrolled = enrolledStudentsBySection[secKey] || 0;

    if (secEnrolled === 0) {
      const confirmDelete = window.confirm(
        `هل ترغب في حذف الشعبة الزائدة (${sectionName}) من صف (${c.className})؟`
      );
      if (!confirmDelete) return;

      deleteSchoolSectionSafely(school.code, c.className, sectionName);
      const updated = classesList.map((item) => {
        if (item.id === c.id) {
          return { ...item, sections: item.sections.filter((s) => s !== sectionName) };
        }
        return item;
      });
      setClassesList(updated);
      setMsg(`✅ تم حذف الشعبة (${sectionName}) الزائدة بنجاح.`);
      onUpdated();
    } else {
      const remainingSections = c.sections.filter((s) => s !== sectionName);
      setSectionMigrationDialog({
        isOpen: true,
        targetClass: c,
        targetSection: sectionName,
        enrolledCount: secEnrolled,
        destinationSection: remainingSections[0] || '',
      });
    }
  };

  const handleConfirmMigrateAndDeleteSection = () => {
    if (!sectionMigrationDialog) return;
    const { targetClass, targetSection, destinationSection } = sectionMigrationDialog;
    if (!destinationSection) {
      alert('يرجى اختيار الشعبة البديلة لنقل الطلاب إليها.');
      return;
    }

    const res = deleteSchoolSectionSafely(
      school.code,
      targetClass.className,
      targetSection,
      destinationSection
    );
    const updated = classesList.map((item) => {
      if (item.id === targetClass.id) {
        return { ...item, sections: item.sections.filter((s) => s !== targetSection) };
      }
      return item;
    });
    setClassesList(updated);
    setSectionMigrationDialog(null);
    setMsg(
      `✅ تم حذف الشعبة (${targetSection}) ونقل (${res.affectedStudentsCount}) طالباً إلى الشعبة (${destinationSection}) بنجاح!`
    );
    onUpdated();
  };

  const handleConfirmDeleteWithoutMigrateSection = () => {
    if (!sectionMigrationDialog) return;
    const { targetClass, targetSection } = sectionMigrationDialog;
    const res = deleteSchoolSectionSafely(school.code, targetClass.className, targetSection);
    const updated = classesList.map((item) => {
      if (item.id === targetClass.id) {
        return { ...item, sections: item.sections.filter((s) => s !== targetSection) };
      }
      return item;
    });
    setClassesList(updated);
    setSectionMigrationDialog(null);
    setMsg(
      `✅ تم حذف الشعبة (${targetSection}) وإبقاء (${res.affectedStudentsCount}) طالباً كغير مسكنين في شعبة لحفظ سجلاتهم بنجاح.`
    );
    onUpdated();
  };

  const handleRestoreDefaults = () => {
    const defaultClasses = getDefaultClassesForSchoolType(school.type, school.isQuranSchool);
    const stageName =
      school.type === 'elementary'
        ? 'المرحلة الابتدائية (من الأول إلى السادس)'
        : school.type === 'secondary'
        ? 'المرحلة الثانوية (من الأول إلى الثالث)'
        : school.type === 'quran' || school.isQuranSchool
        ? 'مدارس وحلقات القرآن الكريم'
        : 'المرحلة المتوسطة (من الأول إلى الثالث)';

    const confirmRestore = window.confirm(
      `هل ترغب في استعادة الصفوف والشعب النموذجية المعتمدة لـ (${stageName}) لمدرسة (${school.name})؟`
    );
    if (!confirmRestore) return;

    setClassesList(defaultClasses);
    updateSchoolCustomClasses(school.code, defaultClasses);
    if (defaultClasses.length > 0) {
      setSelectedClass(defaultClasses[0].className);
      setSelectedSection(defaultClasses[0].sections[0] || '1');
    }
    setMsg(`🔄 تم استعادة وتثبيت الصفوف والشعب المعتمدة لـ (${stageName}) بنجاح.`);
    onUpdated();
  };

  const handleSaveClasses = () => {
    updateSchoolCustomClasses(school.code, classesList);
    setMsg(`✅ تم حفظ وتثبيت كافة الصفوف والشعب بنجاح لمدرسة (${school.name}).`);
    onUpdated();
  };

  const stageLabel =
    school.type === 'elementary'
      ? 'المرحلة الابتدائية'
      : school.type === 'secondary'
      ? 'المرحلة الثانوية'
      : school.type === 'quran' || school.isQuranSchool
      ? 'مدارس وحلقات القرآن'
      : 'المرحلة المتوسطة';

  // Quick suggestion chips for adding classes
  const quickClassSuggestions = useMemo(() => {
    if (school.type === 'elementary') {
      return ['الأول الابتدائي', 'الثاني الابتدائي', 'الثالث الابتدائي', 'الرابع الابتدائي', 'الخامس الابتدائي', 'السادس الابتدائي', 'صعوبات التعلم'];
    }
    if (school.type === 'secondary') {
      return ['الأول الثانوي', 'الثاني الثانوي', 'الثالث الثانوي', 'مسار علمي', 'مسار إنساني'];
    }
    if (school.type === 'quran' || school.isQuranSchool) {
      return ['حلقة التلاوة', 'حلقة الحفظ', 'حلقة الإتقان', 'حلقة الأترجة', 'حلقة المرتل'];
    }
    return ['الأول المتوسط', 'الثاني المتوسط', 'الثالث المتوسط', 'الموهوبين', 'الدمج والتربية الخاصة'];
  }, [school.type, school.isQuranSchool]);

  return (
    <div 
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fadeIn" 
      dir="rtl"
    >
      <div className="bg-white border border-slate-200 rounded-3xl max-w-3xl w-full p-6 text-right space-y-5 shadow-2xl text-slate-800 my-auto">
        
        {/* Header with clear School Stage context */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">إدارة كشوفات الطلاب ونظام نور والفصول</h3>
              <div className="flex flex-wrap items-center gap-2 text-xs pt-0.5">
                <span className="text-emerald-800 font-bold">مدرسة: {school.name}</span>
                <span className="text-slate-300">|</span>
                <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-md font-bold text-[11px] border border-emerald-200">
                  {stageLabel}
                </span>
                <span className="text-slate-300">|</span>
                <span className="text-slate-500 font-mono">كود: {school.code}</span>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex rounded-xl bg-slate-100 p-1 text-xs font-bold">
          <button
            onClick={() => { setActiveTab('excel'); setMsg(''); }}
            className={`flex-1 py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'excel' ? 'bg-white text-emerald-800 shadow-xs' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>استيراد كشف نور (Excel)</span>
          </button>
          
          <button
            onClick={() => { setActiveTab('manual'); setMsg(''); }}
            className={`flex-1 py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'manual' ? 'bg-white text-emerald-800 shadow-xs' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>إضافة طالب فردي ➕</span>
          </button>

          <button
            onClick={() => { setActiveTab('classes'); setMsg(''); }}
            className={`flex-1 py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'classes' ? 'bg-white text-emerald-800 shadow-xs' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>تخصيص الصفوف والشعب</span>
          </button>
        </div>

        {msg && (
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold animate-fadeIn">
            {msg}
          </div>
        )}

        {/* TAB 1: EXCEL IMPORT */}
        {activeTab === 'excel' && (
          <div className="space-y-4 text-xs">
            <div className="border-2 border-dashed border-slate-200 hover:border-emerald-500 rounded-2xl p-6 text-center space-y-3 transition-colors bg-slate-50">
              <Upload className="w-10 h-10 text-emerald-600 mx-auto" />
              <div>
                <p className="font-bold text-slate-900 mb-1">رفع كشف الطلاب المصدر من نظام نور (.xlsx أو .xls)</p>
                <p className="text-[11px] text-slate-500">يقوم النظام باستخراج الأسماء وأرقام الهويات وجوالات أولياء الأمور تلقائياً</p>
              </div>
              <input
                type="file"
                accept=".xlsx, .xls, .csv"
                onChange={handleFileUpload}
                className="hidden"
                id="excel-file-input"
              />
              <label
                htmlFor="excel-file-input"
                className="inline-block px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold cursor-pointer shadow-xs"
              >
                {isProcessing ? 'جاري المعالجة...' : 'اختيار ملف الإكسل'}
              </label>
            </div>

            {parsedRows.length > 0 && (
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-slate-900">معاينة بيانات ({parsedRows.length}) طالب مستخرج:</span>
                  <button
                    onClick={handleImportStudents}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black flex items-center gap-1 cursor-pointer shadow-xs"
                  >
                    <Check className="w-4 h-4" />
                    <span>تأكيد استيراد وتسكين الكل ↵</span>
                  </button>
                </div>

                <div className="border border-slate-200 rounded-2xl overflow-hidden max-h-48 overflow-y-auto">
                  <table className="w-full text-xs text-right">
                    <thead className="bg-slate-50 text-slate-700 sticky top-0 border-b border-slate-200 font-bold">
                      <tr>
                        <th className="p-2.5">الاسم</th>
                        <th className="p-2.5">الهوية</th>
                        <th className="p-2.5">الصف</th>
                        <th className="p-2.5">الفصل</th>
                        <th className="p-2.5">جوال ولي الأمر</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {parsedRows.slice(0, 50).map((r, i) => (
                        <tr key={i} className="hover:bg-slate-50">
                          <td className="p-2.5 font-bold text-slate-900">{r.name}</td>
                          <td className="p-2.5 font-mono text-slate-600">{r.nationalId}</td>
                          <td className="p-2.5">{r.className}</td>
                          <td className="p-2.5">{r.sectionName}</td>
                          <td className="p-2.5 font-mono text-slate-600">{r.parentMobile || '--'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: MANUAL STUDENT ADD */}
        {activeTab === 'manual' && (
          <form onSubmit={handleAddSingleStudent} className="space-y-4 text-xs">
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
              <h4 className="font-bold text-slate-900 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                <span>إدخال وتسكين طالب جديد بالمدرسة:</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">اسم الطالب رباعي *</label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: خالد محمد ناصر الدوسري"
                    value={studentName}
                    onChange={(e) => setStudentName(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2.5 text-slate-900 focus:outline-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">الهوية الوطنية / الإقامة (10 أرقام) *</label>
                  <input
                    type="text"
                    required
                    maxLength={10}
                    placeholder="10xxxxxxxx"
                    value={studentNid}
                    onChange={(e) => setStudentNid(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2.5 text-slate-900 font-mono focus:outline-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">الصف الدراسي *</label>
                  <select
                    value={selectedClass}
                    onChange={(e) => {
                      setSelectedClass(e.target.value);
                      const matched = classesList.find((c) => c.className === e.target.value);
                      if (matched && matched.sections.length > 0) {
                        setSelectedSection(matched.sections[0]);
                      }
                    }}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2.5 text-slate-900 font-bold focus:outline-emerald-500"
                  >
                    {classesList.map((c) => (
                      <option key={c.id} value={c.className}>
                        {c.className}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">الفصل / الشعبة *</label>
                  <select
                    value={selectedSection}
                    onChange={(e) => setSelectedSection(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2.5 text-slate-900 font-bold focus:outline-emerald-500"
                  >
                    {currentAvailableSections.map((sec, idx) => (
                      <option key={idx} value={sec}>
                        فصل ({sec})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">رقم جوال ولي الأمر (اختياري للإشعارات)</label>
                  <input
                    type="tel"
                    placeholder="05xxxxxxxx"
                    value={parentMobile}
                    onChange={(e) => setParentMobile(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2.5 text-slate-900 font-mono focus:outline-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">رقم جوال الطالب (اختياري)</label>
                  <input
                    type="tel"
                    placeholder="05xxxxxxxx"
                    value={studentMobile}
                    onChange={(e) => setStudentMobile(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2.5 text-slate-900 font-mono focus:outline-emerald-500"
                  />
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black flex items-center gap-1.5 shadow-md shadow-emerald-600/20 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>حفظ وتسكين الطالب فوراً ↵</span>
              </button>
            </div>
          </form>
        )}

        {/* TAB 3: CLASSES & SECTIONS MANAGEMENT */}
        {activeTab === 'classes' && (
          <div className="space-y-4 text-xs">

            {/* Quick Informative Safety Card */}
            <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-3.5 flex items-start gap-3 text-emerald-900 shadow-2xs">
              <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <strong className="block font-black text-xs text-emerald-950">نظام الإدارة الآمن للصفوف والشعب:</strong>
                <p className="text-[11px] text-emerald-800 leading-relaxed mt-0.5">
                  يمكنك تعديل أسماء الصفوف والفصول أو تزويد صفوف وشعب جديدة أو حذف الزائد منها بكل مرونة؛
                  حيث يتم تحديث بيانات الطلاب وسجلات حضورهم وغيابهم تلقائياً دون أي فقدان لحساباتهم أو درجاتهم.
                </p>
              </div>
            </div>

            {/* Add class row (تزويد صفوف) */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
              <span className="font-black text-slate-900 block text-xs">تزويد صف دراسي جديد للمدرسة ➕:</span>
              
              {/* Stage Quick Chips */}
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] text-slate-500 font-bold">اقتراحات سريعة:</span>
                {quickClassSuggestions.map((sug) => (
                  <button
                    key={sug}
                    type="button"
                    onClick={() => setNewClassName(sug)}
                    className="px-2.5 py-1 rounded-lg bg-white hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 border border-slate-200 text-[11px] font-bold cursor-pointer transition-colors shadow-2xs"
                  >
                    + {sug}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <input
                  type="text"
                  placeholder="اسم الصف (مثال: الأول المتوسط)"
                  value={newClassName}
                  onChange={(e) => setNewClassName(e.target.value)}
                  className="bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-bold focus:outline-emerald-500"
                />
                <input
                  type="text"
                  placeholder="الشعب (مفصولة بفواصل: 1, 2, 3)"
                  value={newClassSections}
                  onChange={(e) => setNewClassSections(e.target.value)}
                  className="bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-bold focus:outline-emerald-500"
                />
                <button
                  type="button"
                  onClick={handleAddClass}
                  className="py-2 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center justify-center gap-1 cursor-pointer shadow-xs"
                >
                  <Plus className="w-4 h-4" />
                  <span>تزويد الصف</span>
                </button>
              </div>
            </div>

            {/* List of current classes & sections */}
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-black text-slate-900 text-sm">
                    صفوف وشعب مدرسة ({school.name}):
                  </span>
                  <span className="bg-slate-200 text-slate-700 font-mono font-bold text-[11px] px-2 py-0.5 rounded-full">
                    {classesList.length} صف
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleRestoreDefaults}
                  className="px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-[11px] font-bold flex items-center gap-1.5 cursor-pointer transition-colors border border-emerald-200 shadow-2xs"
                  title="استعادة صفوف المرحلة حسب نوع المدرسة المعتمد"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>استعادة صفوف ({stageLabel}) المعتمدة</span>
                </button>
              </div>

              <div className="space-y-3 max-h-80 overflow-y-auto p-0.5">
                {classesList.length === 0 ? (
                  <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-center text-amber-800 space-y-3">
                    <p className="font-black text-sm">لا توجد صفوف محددة حالياً لهذه المدرسة</p>
                    <p className="text-xs text-amber-700">
                      يمكنك النقر على الزر أدناه لتوليد الصفوف والشعب المعتمدة فوراً أو تزويد صف جديد يدوياً.
                    </p>
                    <button
                      type="button"
                      onClick={handleRestoreDefaults}
                      className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs inline-flex items-center gap-1.5 shadow-md shadow-emerald-600/20 cursor-pointer"
                    >
                      <RotateCcw className="w-4 h-4" />
                      <span>توليد صفوف {stageLabel} الآن</span>
                    </button>
                  </div>
                ) : (
                  classesList.map((c) => {
                    const enrolled = enrolledStudentsCount[c.className] || 0;
                    const isEditingClass = editingClassId === c.id;

                    return (
                      <div 
                        key={c.id} 
                        className="bg-white border border-slate-200 rounded-2xl p-3.5 space-y-3 shadow-2xs hover:border-emerald-300 transition-all"
                      >
                        {/* Class Header: Title, Student Count, Rename & Delete buttons */}
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                          {isEditingClass ? (
                            <div className="flex items-center gap-2 flex-1 max-w-md">
                              <input
                                type="text"
                                value={editingClassNameInput}
                                onChange={(e) => setEditingClassNameInput(e.target.value)}
                                className="w-full bg-slate-50 border border-emerald-400 rounded-xl px-3 py-1.5 text-slate-900 font-bold text-xs focus:outline-emerald-600"
                                placeholder="اسم الصف الجديد"
                                autoFocus
                              />
                              <button
                                type="button"
                                onClick={() => handleSaveRenameClass(c)}
                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg shrink-0 flex items-center gap-1 cursor-pointer"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>حفظ الاسم</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingClassId(null)}
                                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg shrink-0 cursor-pointer"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2.5">
                              <strong className="text-slate-900 font-black text-sm">{c.className}</strong>
                              {enrolled > 0 ? (
                                <span className="bg-blue-50 text-blue-700 border border-blue-200 text-[11px] px-2.5 py-0.5 rounded-full font-bold">
                                  {enrolled} طالب مسجل
                                </span>
                              ) : (
                                <span className="bg-slate-100 text-slate-500 text-[11px] px-2 py-0.5 rounded-full font-medium">
                                  بدون طلاب مسجلين
                                </span>
                              )}
                            </div>
                          )}

                          <div className="flex items-center gap-1.5 shrink-0">
                            {!isEditingClass && (
                              <button
                                type="button"
                                onClick={() => handleStartRenameClass(c)}
                                className="px-2.5 py-1 text-indigo-700 hover:bg-indigo-50 border border-indigo-200 rounded-lg font-bold flex items-center gap-1 cursor-pointer transition-colors"
                                title="تغيير اسم هذا الصف وتحديث كافة السجلات تلقائياً"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                                <span>تغيير الاسم</span>
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => handleRequestDeleteClass(c)}
                              className="p-1.5 text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-lg cursor-pointer transition-colors"
                              title="حذف هذا الصف الزائد بأمان"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Sections in this class (تعديل الشعب وحذفها وتزويدها) */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] text-slate-500 font-bold block">
                              الشعب والفصول المسكنة في هذا الصف:
                            </span>

                            {addingSectionClassId !== c.id && (
                              <button
                                type="button"
                                onClick={() => {
                                  setAddingSectionClassId(c.id);
                                  setNewSectionInput('');
                                }}
                                className="text-[11px] text-emerald-700 hover:text-emerald-800 font-bold flex items-center gap-1 cursor-pointer"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                <span>+ تزويد شعبة جديدة</span>
                              </button>
                            )}
                          </div>

                          {/* Section Chips */}
                          <div className="flex flex-wrap items-center gap-2">
                            {c.sections.map((sec) => {
                              const secKey = `${c.className}:::${sec}`;
                              const secCount = enrolledStudentsBySection[secKey] || 0;
                              const isEditingThisSec =
                                editingSectionTarget?.classId === c.id &&
                                editingSectionTarget?.oldSection === sec;

                              if (isEditingThisSec) {
                                return (
                                  <div 
                                    key={sec} 
                                    className="flex items-center gap-1 bg-emerald-50 border border-emerald-300 rounded-xl p-1"
                                  >
                                    <input
                                      type="text"
                                      value={editingSectionInput}
                                      onChange={(e) => setEditingSectionInput(e.target.value)}
                                      className="w-16 bg-white border border-slate-300 rounded-lg px-2 py-0.5 text-center font-bold text-xs focus:outline-emerald-500"
                                      autoFocus
                                    />
                                    <button
                                      type="button"
                                      onClick={handleSaveRenameSection}
                                      className="p-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-md cursor-pointer"
                                      title="حفظ اسم الشعبة"
                                    >
                                      <Check className="w-3 h-3" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setEditingSectionTarget(null)}
                                      className="p-1 text-slate-400 hover:text-slate-600"
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  </div>
                                );
                              }

                              return (
                                <div
                                  key={sec}
                                  className="inline-flex items-center gap-1.5 bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-xl px-2.5 py-1 text-slate-800 shadow-2xs group"
                                >
                                  <span className="font-bold text-xs">شعبة ({sec})</span>
                                  {secCount > 0 ? (
                                    <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-1.5 py-0.2 rounded-full">
                                      {secCount} طالب
                                    </span>
                                  ) : (
                                    <span className="text-slate-400 text-[10px]">0 طالب</span>
                                  )}

                                  {/* Quick edit section name */}
                                  <button
                                    type="button"
                                    onClick={() => handleStartRenameSection(c, sec)}
                                    className="text-slate-400 hover:text-indigo-600 p-0.5 transition-colors cursor-pointer"
                                    title={`تعديل اسم الشعبة (${sec})`}
                                  >
                                    <Pencil className="w-3 h-3" />
                                  </button>

                                  {/* Quick delete section */}
                                  <button
                                    type="button"
                                    onClick={() => handleRequestDeleteSection(c, sec)}
                                    className="text-slate-400 hover:text-rose-600 p-0.5 transition-colors cursor-pointer"
                                    title={`حذف الشعبة (${sec}) بأمان`}
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </div>
                              );
                            })}

                            {/* Inline Add Section Form */}
                            {addingSectionClassId === c.id && (
                              <div className="inline-flex items-center gap-1 bg-emerald-50 border border-emerald-300 rounded-xl p-1 animate-fadeIn">
                                <input
                                  type="text"
                                  placeholder="اسم الشعبة (مثال: 4 أو د)"
                                  value={newSectionInput}
                                  onChange={(e) => setNewSectionInput(e.target.value)}
                                  className="w-36 bg-white border border-slate-300 rounded-lg px-2 py-0.5 text-slate-900 font-bold text-xs focus:outline-emerald-500"
                                  autoFocus
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      e.preventDefault();
                                      handleAddSectionToClass(c);
                                    }
                                  }}
                                />
                                <button
                                  type="button"
                                  onClick={() => handleAddSectionToClass(c)}
                                  className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-md font-bold text-[11px] cursor-pointer"
                                >
                                  إضافة
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setAddingSectionClassId(null)}
                                  className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Bottom Save Action */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleSaveClasses}
                className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/20 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>حفظ وتثبيت تعديلات الصفوف والشعب</span>
              </button>
            </div>
          </div>
        )}

        {/* DIALOG 1: SAFE CLASS DELETION & MIGRATION */}
        {classMigrationDialog && classMigrationDialog.isOpen && (
          <div className="fixed inset-0 z-60 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
            <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-slate-200">
              <div className="flex items-center gap-2.5 text-amber-600">
                <ShieldCheck className="w-6 h-6 text-amber-600 shrink-0" />
                <h4 className="font-black text-slate-900 text-sm">
                  حماية بيانات الطلاب عند حذف الصف ({classMigrationDialog.targetClass.className})
                </h4>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-900 space-y-1">
                <p className="font-black">
                  تنبيه أمان: يوجد ({classMigrationDialog.enrolledCount}) طالب مسجلين في هذا الصف!
                </p>
                <p className="text-[11px] text-amber-800">
                  لحذف هذا الصف الزائد دون أن تخرب درجات الطلاب أو تفقد سجلات حضورهم وغيابهم، اختر أحد الإجراءات الآمنة:
                </p>
              </div>

              {/* Option 1: Migrate to another class */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
                <strong className="block font-black text-slate-900 text-xs">
                  الخيار الأول (المستحسن): نقل الطلاب وسجلاتهم إلى صف آخر:
                </strong>
                
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] text-slate-600 font-bold mb-1">الصف البديل:</label>
                    <select
                      value={classMigrationDialog.destinationClass}
                      onChange={(e) => {
                        const nextClass = e.target.value;
                        const match = classesList.find((c) => c.className === nextClass);
                        setClassMigrationDialog({
                          ...classMigrationDialog,
                          destinationClass: nextClass,
                          destinationSection: match?.sections[0] || '1',
                        });
                      }}
                      className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-900 font-bold text-xs"
                    >
                      {classesList
                        .filter((c) => c.id !== classMigrationDialog.targetClass.id)
                        .map((c) => (
                          <option key={c.id} value={c.className}>
                            {c.className}
                          </option>
                        ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-600 font-bold mb-1">الشعبة البديلة:</label>
                    <select
                      value={classMigrationDialog.destinationSection}
                      onChange={(e) =>
                        setClassMigrationDialog({
                          ...classMigrationDialog,
                          destinationSection: e.target.value,
                        })
                      }
                      className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-900 font-bold text-xs"
                    >
                      {(
                        classesList.find((c) => c.className === classMigrationDialog.destinationClass)
                          ?.sections || ['1', '2', '3']
                      ).map((sec) => (
                        <option key={sec} value={sec}>
                          شعبة ({sec})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleConfirmMigrateAndDeleteClass}
                  className="w-full mt-2 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <ArrowRightLeft className="w-4 h-4" />
                  <span>تأكيد نقل الطلاب وحذف الصف القديم 🔄</span>
                </button>
              </div>

              {/* Option 2: Keep students safe without assigned class */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
                <strong className="block font-black text-slate-900 text-xs">
                  الخيار الثاني: إبقاء الطلاب في المدرسة بدون تعيين صف مؤقتاً:
                </strong>
                <p className="text-[11px] text-slate-600">
                  سيتم الاحتفاظ بحسابات الطلاب ({classMigrationDialog.enrolledCount}) وسجلاتهم كاملة دون ربطهم بصف محدد لحين تسكينهم لاحقاً.
                </p>
                <button
                  type="button"
                  onClick={handleConfirmDeleteWithoutMigrateClass}
                  className="w-full py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <span>حذف الصف وإبقاء الطلاب كغير مسكنين</span>
                </button>
              </div>

              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => setClassMigrationDialog(null)}
                  className="w-full py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs cursor-pointer"
                >
                  إلغاء التراجع ✕
                </button>
              </div>
            </div>
          </div>
        )}

        {/* DIALOG 2: SAFE SECTION DELETION & MIGRATION */}
        {sectionMigrationDialog && sectionMigrationDialog.isOpen && (
          <div className="fixed inset-0 z-60 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200">
              <div className="flex items-center gap-2 text-amber-600">
                <ShieldCheck className="w-6 h-6 text-amber-600 shrink-0" />
                <h4 className="font-black text-slate-900 text-sm">
                  حذف الشعبة ({sectionMigrationDialog.targetSection}) من صف ({sectionMigrationDialog.targetClass.className})
                </h4>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-900 space-y-1">
                <p className="font-black">
                  يوجد ({sectionMigrationDialog.enrolledCount}) طالب مسجلين في هذه الشعبة!
                </p>
                <p className="text-[11px] text-amber-800">
                  اختر الشعبة البديلة لنقل الطلاب وسجلاتهم إليها في نفس الصف:
                </p>
              </div>

              <div className="space-y-2">
                <label className="block text-xs text-slate-700 font-bold">الشعبة البديلة:</label>
                <select
                  value={sectionMigrationDialog.destinationSection}
                  onChange={(e) =>
                    setSectionMigrationDialog({
                      ...sectionMigrationDialog,
                      destinationSection: e.target.value,
                    })
                  }
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-bold text-xs"
                >
                  {sectionMigrationDialog.targetClass.sections
                    .filter((s) => s !== sectionMigrationDialog.targetSection)
                    .map((sec) => (
                      <option key={sec} value={sec}>
                        شعبة ({sec})
                      </option>
                    ))}
                </select>

                <button
                  type="button"
                  onClick={handleConfirmMigrateAndDeleteSection}
                  className="w-full mt-2 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <ArrowRightLeft className="w-4 h-4" />
                  <span>تأكيد نقل الطلاب وحذف الشعبة 🔄</span>
                </button>

                <button
                  type="button"
                  onClick={handleConfirmDeleteWithoutMigrateSection}
                  className="w-full py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center gap-1 cursor-pointer"
                >
                  <span>حذف الشعبة وإبقاء الطلاب كغير مسكنين</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSectionMigrationDialog(null)}
                  className="w-full py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs cursor-pointer"
                >
                  إلغاء التراجع ✕
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="pt-2">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
