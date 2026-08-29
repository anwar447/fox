import React, { useState, useRef, useEffect } from 'react';
import { School, SchoolClassSection } from '../types';
import { 
  parseExcelFileBuffer, 
  generateSampleExcelTemplate, 
  ParsedStudentRow 
} from '../utils/excelParser';
import { 
  X, UploadCloud, FileSpreadsheet, Plus, Trash2, CheckCircle2, 
  AlertCircle, Download, Users, GraduationCap, RefreshCw, 
  Edit2, Check, ArrowRight, ShieldCheck, HelpCircle
} from 'lucide-react';

interface ClassExcelManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  school: School;
  currentClasses: SchoolClassSection[];
  onSaveClasses: (classes: SchoolClassSection[]) => void;
  onImportStudents: (
    students: Array<{
      nationalId: string;
      name: string;
      className: string;
      sectionName: string;
      parentMobile?: string;
    }>
  ) => void;
}

export function ClassExcelManagerModal({
  isOpen,
  onClose,
  school,
  currentClasses,
  onSaveClasses,
  onImportStudents,
}: ClassExcelManagerModalProps) {
  const [activeTab, setActiveTab] = useState<'excel' | 'classes'>('excel');
  const [classesList, setClassesList] = useState<SchoolClassSection[]>(currentClasses);

  useEffect(() => {
    setClassesList(currentClasses);
  }, [currentClasses]);

  // Toast feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Editing state for a class name & code
  const [editingClassId, setEditingClassId] = useState<string | null>(null);
  const [editClassName, setEditClassName] = useState('');
  const [editClassCode, setEditClassCode] = useState('');

  // Class deletion confirmation state
  const [confirmDeleteClassId, setConfirmDeleteClassId] = useState<string | null>(null);

  // Inline Section Adder state per class
  const [addingSectionClassId, setAddingSectionClassId] = useState<string | null>(null);
  const [newSectionValue, setNewSectionValue] = useState('');

  // Inline Section Editor state
  const [editingSectionState, setEditingSectionState] = useState<{
    classId: string;
    oldSection: string;
    value: string;
  } | null>(null);

  // New Class Form State
  const [newClassName, setNewClassName] = useState('');
  const [newClassCode, setNewClassCode] = useState('');
  const [newClassSectionsStr, setNewClassSectionsStr] = useState('1, 2, 3');

  // Excel Upload State
  const [isDragging, setIsDragging] = useState(false);
  const [isLoadingFile, setIsLoadingFile] = useState(false);
  const [parsedRows, setParsedRows] = useState<ParsedStudentRow[]>([]);
  const [detectedClasses, setDetectedClasses] = useState<{ className: string; sections: string[] }[]>([]);
  
  // Custom class mapping from Excel raw className to school class
  const [classMapping, setClassMapping] = useState<Record<string, string>>({});
  
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [importSuccessMessage, setImportSuccessMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Start editing class
  const handleStartEditClass = (cls: SchoolClassSection) => {
    setEditingClassId(cls.id);
    setEditClassName(cls.className);
    setEditClassCode(cls.classCode || '');
    setConfirmDeleteClassId(null);
  };

  // Save edited class
  const handleSaveEditClass = (classId: string) => {
    if (!editClassName.trim()) return;
    const updated = classesList.map((c) => {
      if (c.id === classId) {
        return {
          ...c,
          className: editClassName.trim(),
          classCode: editClassCode.trim() || undefined,
        };
      }
      return c;
    });
    setClassesList(updated);
    onSaveClasses(updated);
    setEditingClassId(null);
    showToast(`✓ تم تحديث بيانات الصف (${editClassName.trim()}) بنجاح`);
  };

  // Handle Class Creation
  const handleAddClass = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClassName.trim()) return;

    const sections = newClassSectionsStr
      .split(/[,،]/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    const newClass: SchoolClassSection = {
      id: `cls-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      className: newClassName.trim(),
      classCode: newClassCode.trim() || undefined,
      sections: sections.length > 0 ? sections : ['1', '2'],
    };

    const updated = [...classesList, newClass];
    setClassesList(updated);
    onSaveClasses(updated);

    setNewClassName('');
    setNewClassCode('');
    setNewClassSectionsStr('1, 2, 3');
    showToast(`✓ تمت إضافة الصف الدراسي (${newClass.className}) بنجاح`);
  };

  // Delete class with inline confirmation
  const handleConfirmDeleteClass = (classId: string) => {
    const target = classesList.find((c) => c.id === classId);
    const updated = classesList.filter((c) => c.id !== classId);
    setClassesList(updated);
    onSaveClasses(updated);
    setConfirmDeleteClassId(null);
    showToast(`✓ تم حذف الصف (${target?.className || ''}) بنجاح`);
  };

  // Inline Add Section
  const handleSaveNewSection = (classId: string) => {
    const trimmed = newSectionValue.trim();
    if (!trimmed) {
      setAddingSectionClassId(null);
      return;
    }

    const updated = classesList.map((c) => {
      if (c.id === classId) {
        const set = new Set([...c.sections, trimmed]);
        return { ...c, sections: Array.from(set).sort() };
      }
      return c;
    });

    setClassesList(updated);
    onSaveClasses(updated);
    setAddingSectionClassId(null);
    setNewSectionValue('');
    showToast(`✓ تمت إضافة فصل (${trimmed}) بنجاح`);
  };

  // Inline Edit Section
  const handleSaveEditedSection = () => {
    if (!editingSectionState) return;
    const { classId, oldSection, value } = editingSectionState;
    const trimmed = value.trim();

    if (!trimmed || trimmed === oldSection) {
      setEditingSectionState(null);
      return;
    }

    const updated = classesList.map((c) => {
      if (c.id === classId) {
        return {
          ...c,
          sections: c.sections.map((s) => (s === oldSection ? trimmed : s)),
        };
      }
      return c;
    });

    setClassesList(updated);
    onSaveClasses(updated);
    setEditingSectionState(null);
    showToast(`✓ تم تعديل اسم الفصل من (${oldSection}) إلى (${trimmed})`);
  };

  // Remove section
  const handleRemoveSectionFromClass = (classId: string, section: string) => {
    const updated = classesList.map((c) => {
      if (c.id === classId) {
        return { ...c, sections: c.sections.filter((s) => s !== section) };
      }
      return c;
    });
    setClassesList(updated);
    onSaveClasses(updated);
    showToast(`✓ تم حذف فصل (${section})`);
  };

  // Handle Excel File Processing
  const handleFileChange = async (file: File) => {
    setUploadError(null);
    setImportSuccessMessage(null);
    setIsLoadingFile(true);

    try {
      const buffer = await file.arrayBuffer();
      const result = parseExcelFileBuffer(buffer);

      if (result.students.length === 0) {
        setUploadError('لم يتم العثور على أي صفوف طلابية صالحة في الملف المرفوع.');
      } else {
        setParsedRows(result.students);
        setDetectedClasses(result.detectedClasses);

        // Build initial mapping: if detected class matches existing class by code or name, map it
        const initialMap: Record<string, string> = {};
        result.detectedClasses.forEach((dc) => {
          const match = classesList.find(
            (c) =>
              c.className === dc.className ||
              (c.classCode && c.classCode === dc.className) ||
              c.className.includes(dc.className) ||
              dc.className.includes(c.className)
          );
          if (match) {
            initialMap[dc.className] = match.className;
          } else {
            // Default to same name or first available class
            initialMap[dc.className] = dc.className;
          }
        });
        setClassMapping(initialMap);
      }
    } catch (err: any) {
      setUploadError(err.message || 'حدث خطأ أثناء قراءة ملف الإكسل. يرجى التأكد من صيغة الملف.');
    } finally {
      setIsLoadingFile(false);
    }
  };

  // Confirm Import
  const handleConfirmImport = () => {
    const validStudents = parsedRows.filter((r) => r.valid);
    if (validStudents.length === 0) {
      setUploadError('لا يوجد طلاب صالحين للاستيراد في الملف الحالي');
      return;
    }

    // Map student class names using the user-approved class mapping
    const mappedStudents = validStudents.map((s) => {
      const targetClassName = classMapping[s.className] || s.className;
      return {
        nationalId: s.nationalId,
        name: s.name,
        className: targetClassName,
        sectionName: s.sectionName || '1',
        parentMobile: s.parentMobile || undefined,
      };
    });

    // Ensure all target classes and sections exist in schoolClasses
    const existingClassesMap = new Map<string, Set<string>>();
    classesList.forEach((c) => {
      existingClassesMap.set(c.className, new Set(c.sections));
    });

    mappedStudents.forEach((st) => {
      if (!existingClassesMap.has(st.className)) {
        existingClassesMap.set(st.className, new Set([st.sectionName]));
      } else {
        existingClassesMap.get(st.className)?.add(st.sectionName);
      }
    });

    const updatedClasses: SchoolClassSection[] = [];
    existingClassesMap.forEach((sectionsSet, cName) => {
      const existing = classesList.find((c) => c.className === cName);
      updatedClasses.push({
        id: existing ? existing.id : `cls-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
        className: cName,
        classCode: existing?.classCode,
        sections: Array.from(sectionsSet).sort(),
      });
    });

    onSaveClasses(updatedClasses);
    setClassesList(updatedClasses);

    // Call import handler
    onImportStudents(mappedStudents);

    setImportSuccessMessage(
      `✓ تم بنجاح استيراد وتسكين (${mappedStudents.length}) طالباً في فصولهم وتحديث هيكل الصفوف والشعب.`
    );
    setParsedRows([]);
    setDetectedClasses([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDownloadSample = () => {
    const blob = generateSampleExcelTemplate();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `نموذج_كشف_الطلاب_${school.name.replace(/\s+/g, '_')}.xlsx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div 
      className="fixed inset-0 z-[100] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div 
        className="relative bg-white rounded-3xl max-w-4xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] text-right"
        dir="rtl"
      >
        
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-emerald-900 via-slate-900 to-teal-950 p-5 sm:p-6 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-500/20 border border-emerald-400/30 rounded-2xl text-emerald-300">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-black text-white">
                إدارة الصفوف والفصول واستيراد كشوفات الإكسل
              </h3>
              <p className="text-xs text-slate-300 mt-0.5">
                مدرسة <strong className="text-emerald-300 font-bold">{school.name}</strong> ({school.code})
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Global Toast Notification */}
        {toastMessage && (
          <div className="bg-emerald-600 text-white p-3 px-6 text-xs font-black text-center shadow-md animate-fadeIn flex items-center justify-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-6 pt-3 gap-2">
          <button
            onClick={() => setActiveTab('excel')}
            className={`flex items-center gap-2 px-5 py-3 rounded-t-2xl font-black text-xs transition-all cursor-pointer ${
              activeTab === 'excel'
                ? 'bg-white text-emerald-800 border-t-2 border-r border-l border-emerald-600 shadow-sm'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
            }`}
          >
            <UploadCloud className="w-4 h-4" />
            <span>استيراد كشف الطلاب (Excel / CSV)</span>
          </button>

          <button
            onClick={() => setActiveTab('classes')}
            className={`flex items-center gap-2 px-5 py-3 rounded-t-2xl font-black text-xs transition-all cursor-pointer ${
              activeTab === 'classes'
                ? 'bg-white text-emerald-800 border-t-2 border-r border-l border-emerald-600 shadow-sm'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
            }`}
          >
            <GraduationCap className="w-4 h-4" />
            <span>تخصيص وتعديل الصفوف والفصول ({classesList.length})</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          
          {activeTab === 'excel' ? (
            /* Excel Import Tab */
            <div className="space-y-6">
              
              {/* Success Notification */}
              {importSuccessMessage && (
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-bold flex items-center justify-between shadow-sm">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    <span>{importSuccessMessage}</span>
                  </div>
                  <button
                    onClick={() => setImportSuccessMessage(null)}
                    className="p-1 text-emerald-700 hover:bg-emerald-100 rounded-lg"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Instructions Bar */}
              <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="text-xs text-amber-900 leading-relaxed">
                  <span className="font-bold block mb-1">تعليمات استيراد ملف الطلاب:</span>
                  <p>
                    يقوم النظام بقراءة الأعمدة المعتمدة تلقائياً: 
                    <strong className="font-mono text-amber-950 mx-1">الجوال (رقم ولي الأمر)</strong>،
                    <strong className="font-mono text-amber-950 mx-1">الفصل</strong>،
                    <strong className="font-mono text-amber-950 mx-1">رقم الصف</strong>،
                    <strong className="font-mono text-amber-950 mx-1">اسم الطالب</strong>، و
                    <strong className="font-mono text-amber-950 mx-1">رقم الطالب / الهوية</strong>.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadSample}
                  className="mr-auto shrink-0 text-xs bg-amber-600 hover:bg-amber-700 text-white font-bold px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>تحميل نموذج إكسل معتمد</span>
                </button>
              </div>

              {/* Drag & Drop File Zone */}
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                    handleFileChange(e.dataTransfer.files[0]);
                  }
                }}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-3xl p-8 text-center transition-all cursor-pointer ${
                  isDragging
                    ? 'border-emerald-500 bg-emerald-50 scale-[0.99]'
                    : 'border-slate-300 hover:border-emerald-500 hover:bg-slate-50'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleFileChange(e.target.files[0]);
                    }
                  }}
                />

                <div className="w-16 h-16 bg-emerald-100 text-emerald-700 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-inner">
                  {isLoadingFile ? (
                    <RefreshCw className="w-8 h-8 animate-spin" />
                  ) : (
                    <UploadCloud className="w-8 h-8" />
                  )}
                </div>

                <h4 className="text-base font-black text-slate-800 mb-1">
                  اسحب وأفلت ملف الإكسل هنا، أو انقر للاختيار من جهازك
                </h4>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  يدعم صيغ Excel (.xlsx, .xls) وكشوفات CSV. سيتم استخراج الطلاب وملء الصفوف فوراً.
                </p>
              </div>

              {uploadError && (
                <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{uploadError}</span>
                </div>
              )}

              {/* Parsed Preview Table & Class Mapping */}
              {parsedRows.length > 0 && (
                <div className="space-y-4 animate-in fade-in">
                  
                  {/* Master Confirm Import Bar */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-slate-100 p-4 rounded-2xl gap-3">
                    <div className="flex items-center gap-2">
                      <Users className="w-5 h-5 text-emerald-700 shrink-0" />
                      <span className="text-xs font-bold text-slate-800">
                        تم استخراج <strong className="text-emerald-700 text-sm font-black">{parsedRows.length}</strong> طالباً جاهزاً للاستيراد
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={handleConfirmImport}
                      className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-black px-6 py-2.5 rounded-xl flex items-center gap-2 transition-all cursor-pointer shadow-md active:scale-95"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>اعتماد وحفظ الطلاب في المدرسة</span>
                    </button>
                  </div>

                  {/* Class Mapping Selector */}
                  {detectedClasses.length > 0 && (
                    <div className="p-4 bg-teal-50 border border-teal-200 rounded-2xl text-xs space-y-3">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-teal-700" />
                        <span className="font-black text-teal-950">تسكين وتوجيه الصفوف المستخرجة من الإكسل:</span>
                      </div>
                      <p className="text-[11px] text-teal-800">
                        حدد الصف المدرسي الذي ينتمي له كل تصنيف في الملف لضمان تسكين الطلاب بدقة تامة:
                      </p>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {detectedClasses.map((dc, idx) => (
                          <div key={idx} className="bg-white p-2.5 rounded-xl border border-teal-300 flex items-center justify-between gap-2">
                            <div className="text-slate-800 font-bold">
                              <span className="text-[11px] text-slate-500 block">الصف في الإكسل:</span>
                              <strong className="text-teal-900">{dc.className}</strong>
                              <span className="text-[10px] text-slate-400 font-mono block">
                                (فصول: {dc.sections.join('، ')})
                              </span>
                            </div>

                            <div className="flex items-center gap-1">
                              <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                              <select
                                value={classMapping[dc.className] || dc.className}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setClassMapping((prev) => ({ ...prev, [dc.className]: val }));
                                }}
                                className="bg-slate-50 border border-slate-300 text-slate-900 text-xs font-bold rounded-lg px-2.5 py-1.5 focus:border-teal-600 focus:outline-none"
                              >
                                <optgroup label="صفوف المدرسة المعتمدة">
                                  {classesList.map((c) => (
                                    <option key={c.id} value={c.className}>
                                      {c.className} {c.classCode ? `(${c.classCode})` : ''}
                                    </option>
                                  ))}
                                </optgroup>
                                <option value={dc.className}>+ إنشاء صف جديد باسم "{dc.className}"</option>
                              </select>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Rows Table */}
                  <div className="overflow-x-auto rounded-2xl border border-slate-200 max-h-72">
                    <table className="w-full text-right text-xs">
                      <thead className="bg-slate-100 text-slate-700 font-black sticky top-0 border-b border-slate-200">
                        <tr>
                          <th className="py-2.5 px-3">#</th>
                          <th className="py-2.5 px-3">رقم الطالب / الهوية</th>
                          <th className="py-2.5 px-3">اسم الطالب الكامل</th>
                          <th className="py-2.5 px-3">الصف المكتشف</th>
                          <th className="py-2.5 px-3">الصف بعد التسكين</th>
                          <th className="py-2.5 px-3">الفصل</th>
                          <th className="py-2.5 px-3">جوال ولي الأمر</th>
                          <th className="py-2.5 px-3">الحالة</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium">
                        {parsedRows.map((row, idx) => (
                          <tr key={idx} className={row.valid ? 'hover:bg-slate-50' : 'bg-rose-50/50'}>
                            <td className="py-2 px-3 text-slate-400 font-mono">{idx + 1}</td>
                            <td className="py-2 px-3 font-mono font-bold text-slate-900">{row.nationalId}</td>
                            <td className="py-2 px-3 font-bold text-slate-800">{row.name}</td>
                            <td className="py-2 px-3 text-slate-500">{row.className}</td>
                            <td className="py-2 px-3 font-bold text-emerald-800">
                              {classMapping[row.className] || row.className}
                            </td>
                            <td className="py-2 px-3 font-bold text-emerald-700">{row.sectionName}</td>
                            <td className="py-2 px-3 font-mono text-slate-600">
                              {row.parentMobile ? (
                                <span className="text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded font-bold">
                                  {row.parentMobile}
                                </span>
                              ) : (
                                <span className="text-slate-400">-</span>
                              )}
                            </td>
                            <td className="py-2 px-3">
                              {row.valid ? (
                                <span className="text-emerald-700 font-bold text-[11px] bg-emerald-100 px-2 py-0.5 rounded-md">جاهز</span>
                              ) : (
                                <span className="text-rose-700 font-bold text-[10px] bg-rose-100 px-2 py-0.5 rounded-md">{row.error}</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                </div>
              )}

            </div>
          ) : (
            /* Classes & Sections Manager Tab */
            <div className="space-y-6">
              
              {/* Add New Class Form */}
              <form onSubmit={handleAddClass} className="bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-4">
                <h4 className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                  <Plus className="w-4 h-4 text-emerald-600" />
                  إضافة صف دراسي وفصول جديدة
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">اسم الصف الدراسي</label>
                    <input
                      type="text"
                      placeholder="مثال: الأول الثانوي أو الأول المتوسط"
                      value={newClassName}
                      onChange={(e) => setNewClassName(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:border-emerald-500 focus:outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">كود الصف الوزاري (اختياري)</label>
                    <input
                      type="text"
                      placeholder="مثال: 1314"
                      value={newClassCode}
                      onChange={(e) => setNewClassCode(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:border-emerald-500 focus:outline-none font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">الفصول / الشعب (مفصولة بفاصلة)</label>
                    <input
                      type="text"
                      placeholder="مثال: 1, 2, 3 أو أ, ب, ج"
                      value={newClassSectionsStr}
                      onChange={(e) => setNewClassSectionsStr(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:border-emerald-500 focus:outline-none"
                      required
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold px-5 py-2.5 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
                  >
                    <Plus className="w-4 h-4" />
                    <span>حفظ الصف والفصول</span>
                  </button>
                </div>
              </form>

              {/* Current Classes List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black text-slate-700">قائمة الصفوف المعتمدة للمدرسة ({classesList.length})</h4>
                  <span className="text-[11px] text-slate-400">يمكنك تعديل أي صف أو شعبة مباشرة من هنا</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {classesList.map((cls) => (
                    <div key={cls.id} className="border border-slate-200 rounded-2xl p-4 bg-white shadow-sm space-y-3 hover:border-emerald-300 transition-colors">
                      
                      {/* Edit Class Name Mode */}
                      {editingClassId === cls.id ? (
                        <div className="space-y-2.5 bg-slate-50 p-3 rounded-xl border border-teal-300">
                          <span className="text-[11px] font-black text-teal-900 block">تعديل بيانات الصف الدراسي:</span>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-[10px] text-slate-600 font-bold block mb-0.5">اسم الصف</label>
                              <input
                                type="text"
                                value={editClassName}
                                onChange={(e) => setEditClassName(e.target.value)}
                                className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-900 focus:outline-none focus:border-teal-600"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] text-slate-600 font-bold block mb-0.5">كود الصف الوزاري</label>
                              <input
                                type="text"
                                value={editClassCode}
                                onChange={(e) => setEditClassCode(e.target.value)}
                                className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-bold font-mono text-slate-900 focus:outline-none focus:border-teal-600"
                              />
                            </div>
                          </div>
                          <div className="flex items-center justify-end gap-1.5 pt-1">
                            <button
                              type="button"
                              onClick={() => setEditingClassId(null)}
                              className="px-3 py-1.5 text-[11px] rounded-lg text-slate-600 hover:bg-slate-200 font-bold cursor-pointer"
                            >
                              إلغاء
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSaveEditClass(cls.id)}
                              className="px-3.5 py-1.5 text-[11px] rounded-lg bg-teal-700 hover:bg-teal-800 text-white font-bold flex items-center gap-1 shadow-sm cursor-pointer"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>حفظ التعديل</span>
                            </button>
                          </div>
                        </div>
                      ) : confirmDeleteClassId === cls.id ? (
                        /* Inline Delete Confirmation */
                        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl space-y-2">
                          <span className="text-xs font-bold text-rose-800 block">
                            هل أنت متأكد من حذف الصف الدراسي ({cls.className})؟
                          </span>
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteClassId(null)}
                              className="px-3 py-1 text-xs text-slate-600 font-bold rounded-lg hover:bg-slate-200 cursor-pointer"
                            >
                              إلغاء
                            </button>
                            <button
                              type="button"
                              onClick={() => handleConfirmDeleteClass(cls.id)}
                              className="px-3 py-1 text-xs bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg shadow-sm cursor-pointer flex items-center gap-1"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>تأكيد الحذف</span>
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <GraduationCap className="w-5 h-5 text-emerald-700" />
                            <h5 className="font-black text-slate-900 text-sm">{cls.className}</h5>
                            {cls.classCode && (
                              <span className="text-[10px] font-mono bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-bold">
                                كود: {cls.classCode}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleStartEditClass(cls)}
                              className="text-teal-600 hover:text-teal-800 p-1.5 rounded-lg hover:bg-teal-50 transition-colors cursor-pointer"
                              title="تعديل اسم الصف والكود"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteClassId(cls.id)}
                              className="text-rose-500 hover:text-rose-700 p-1.5 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                              title="حذف الصف"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Sections List */}
                      <div>
                        <span className="text-[11px] text-slate-500 font-bold block mb-1.5">الفصول والشعب الدراسية:</span>
                        <div className="flex flex-wrap items-center gap-1.5">
                          {cls.sections.map((sec) => {
                            const isEditingThisSec =
                              editingSectionState?.classId === cls.id &&
                              editingSectionState?.oldSection === sec;

                            if (isEditingThisSec) {
                              return (
                                <div key={sec} className="inline-flex items-center gap-1 bg-amber-50 border border-amber-300 rounded-lg p-1">
                                  <input
                                    type="text"
                                    value={editingSectionState.value}
                                    onChange={(e) =>
                                      setEditingSectionState({
                                        ...editingSectionState,
                                        value: e.target.value,
                                      })
                                    }
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') handleSaveEditedSection();
                                      if (e.key === 'Escape') setEditingSectionState(null);
                                    }}
                                    autoFocus
                                    className="w-16 bg-white border border-amber-400 rounded px-1.5 py-0.5 text-xs font-bold text-slate-900 focus:outline-none"
                                  />
                                  <button
                                    type="button"
                                    onClick={handleSaveEditedSection}
                                    className="p-1 bg-emerald-600 text-white rounded hover:bg-emerald-700 cursor-pointer"
                                    title="حفظ"
                                  >
                                    <Check className="w-3 h-3" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setEditingSectionState(null)}
                                    className="p-1 bg-slate-300 text-slate-700 rounded hover:bg-slate-400 cursor-pointer"
                                    title="إلغاء"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </div>
                              );
                            }

                            return (
                              <span
                                key={sec}
                                className="bg-emerald-50 border border-emerald-200 text-emerald-900 font-bold px-2.5 py-1 rounded-lg text-xs flex items-center gap-1.5 hover:border-emerald-400 transition-colors"
                              >
                                <button
                                  type="button"
                                  onClick={() =>
                                    setEditingSectionState({
                                      classId: cls.id,
                                      oldSection: sec,
                                      value: sec,
                                    })
                                  }
                                  className="hover:underline text-emerald-950 cursor-pointer font-black flex items-center gap-1"
                                  title="انقر لتعديل اسم أو رقم الفصل"
                                >
                                  <span>فصل {sec}</span>
                                  <Edit2 className="w-2.5 h-2.5 text-emerald-600 opacity-60 hover:opacity-100" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveSectionFromClass(cls.id, sec)}
                                  className="text-emerald-700 hover:text-rose-600 transition-colors mr-0.5 cursor-pointer font-black text-sm"
                                  title="إزالة الفصل"
                                >
                                  ×
                                </button>
                              </span>
                            );
                          })}

                          {/* Inline Section Adder */}
                          {addingSectionClassId === cls.id ? (
                            <div className="inline-flex items-center gap-1 bg-teal-50 border border-teal-300 rounded-lg p-1 animate-fadeIn">
                              <input
                                type="text"
                                placeholder="مثال: 4 أو د"
                                value={newSectionValue}
                                onChange={(e) => setNewSectionValue(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleSaveNewSection(cls.id);
                                  if (e.key === 'Escape') setAddingSectionClassId(null);
                                }}
                                autoFocus
                                className="w-20 bg-white border border-teal-400 rounded px-1.5 py-0.5 text-xs font-bold text-slate-900 focus:outline-none"
                              />
                              <button
                                type="button"
                                onClick={() => handleSaveNewSection(cls.id)}
                                className="p-1 bg-teal-700 text-white rounded hover:bg-teal-800 cursor-pointer"
                                title="إضافة"
                              >
                                <Check className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setAddingSectionClassId(null)}
                                className="p-1 bg-slate-300 text-slate-700 rounded hover:bg-slate-400 cursor-pointer"
                                title="إلغاء"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setAddingSectionClassId(cls.id);
                                setNewSectionValue('');
                              }}
                              className="text-[11px] bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-2.5 py-1 rounded-lg flex items-center gap-1 transition-colors cursor-pointer border border-dashed border-slate-300"
                            >
                              <Plus className="w-3 h-3 text-emerald-600" />
                              <span>+ إضافة فصل</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}

        </div>

        {/* Footer */}
        <div className="bg-slate-50 border-t border-slate-200 p-4 px-6 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            تمت المزامنة اللحظية مع قاعدة البيانات لقسم الإدارة المدرسية
          </span>

          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
          >
            إغلاق النافذة
          </button>
        </div>

      </div>
    </div>
  );
}
