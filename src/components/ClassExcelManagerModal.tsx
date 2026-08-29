import React, { useState, useRef, useEffect } from 'react';
import { School, SchoolClassSection, User } from '../types';
import { 
  parseExcelFileBuffer, 
  generateSampleExcelTemplate, 
  ParsedStudentRow 
} from '../utils/excelParser';
import { 
  X, UploadCloud, FileSpreadsheet, Plus, Trash2, CheckCircle2, 
  AlertCircle, Download, Layers, Users, Phone, Hash, BookOpen, 
  GraduationCap, RefreshCw, ArrowRight, ShieldAlert, Edit2, Check 
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

  // Editing state for a class
  const [editingClassId, setEditingClassId] = useState<string | null>(null);
  const [editClassName, setEditClassName] = useState('');
  const [editClassCode, setEditClassCode] = useState('');

  // New Class Form State
  const [newClassName, setNewClassName] = useState('');
  const [newClassCode, setNewClassCode] = useState('');
  const [newClassSectionsStr, setNewClassSectionsStr] = useState('1, 2, 3');

  // Excel Upload State
  const [isDragging, setIsDragging] = useState(false);
  const [isLoadingFile, setIsLoadingFile] = useState(false);
  const [parsedRows, setParsedRows] = useState<ParsedStudentRow[]>([]);
  const [detectedClasses, setDetectedClasses] = useState<{ className: string; sections: string[] }[]>([]);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [importSuccessMessage, setImportSuccessMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Start editing class
  const handleStartEditClass = (cls: SchoolClassSection) => {
    setEditingClassId(cls.id);
    setEditClassName(cls.className);
    setEditClassCode(cls.classCode || '');
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
  };

  // Handle Class Management
  const handleAddClass = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClassName.trim()) return;

    const sections = newClassSectionsStr
      .split(/[,،]/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    const newClass: SchoolClassSection = {
      id: `cls-${Date.now()}`,
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
  };

  const handleDeleteClass = (classId: string) => {
    if (confirm('هل أنت متأكد من حذف هذا الصف الدراسي؟')) {
      const updated = classesList.filter((c) => c.id !== classId);
      setClassesList(updated);
      onSaveClasses(updated);
    }
  };

  const handleAddSectionToClass = (classId: string) => {
    const sectionName = prompt('أدخل رقم أو اسم الفصل الجديد (مثال: 4 أو د):');
    if (!sectionName || !sectionName.trim()) return;

    const updated = classesList.map((c) => {
      if (c.id === classId) {
        const set = new Set([...c.sections, sectionName.trim()]);
        return { ...c, sections: Array.from(set).sort() };
      }
      return c;
    });

    setClassesList(updated);
    onSaveClasses(updated);
  };

  const handleEditSectionName = (classId: string, oldSection: string) => {
    const newSection = prompt(`تعديل اسم أو رقم الفصل "${oldSection}" إلى:`, oldSection);
    if (!newSection || !newSection.trim() || newSection.trim() === oldSection) return;

    const updated = classesList.map((c) => {
      if (c.id === classId) {
        return {
          ...c,
          sections: c.sections.map((s) => (s === oldSection ? newSection.trim() : s)),
        };
      }
      return c;
    });

    setClassesList(updated);
    onSaveClasses(updated);
  };

  const handleRemoveSectionFromClass = (classId: string, section: string) => {
    const updated = classesList.map((c) => {
      if (c.id === classId) {
        return { ...c, sections: c.sections.filter((s) => s !== section) };
      }
      return c;
    });
    setClassesList(updated);
    onSaveClasses(updated);
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
      }
    } catch (err: any) {
      setUploadError(err.message || 'حدث خطأ أثناء قراءة ملف الإكسل. يرجى التأكد من صيغة الملف.');
    } finally {
      setIsLoadingFile(false);
    }
  };

  const handleConfirmImport = () => {
    const validStudents = parsedRows.filter((r) => r.valid);
    if (validStudents.length === 0) {
      alert('لا يوجد طلاب صالحين للاستيراد');
      return;
    }

    onImportStudents(validStudents);
    setImportSuccessMessage(`تم بنجاح استيراد وتحديث ${validStudents.length} طالباً وتوزيعهم تلقائياً على الصفوف والفصول.`);
    setParsedRows([]);
    setDetectedClasses([]);
  };

  const handleDownloadSample = () => {
    const blob = generateSampleExcelTemplate();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `كشف_بيانات_الطلاب_نموذج_معتمد_${school.code}.xlsx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6" dir="rtl">
      <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-800 to-teal-900 text-white p-5 sm:p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-white/15 border border-white/20">
              <FileSpreadsheet className="w-6 h-6 text-emerald-300" />
            </div>
            <div>
              <h2 className="text-xl font-black">إدارة الصفوف واستيراد ملفات الإكسل (Excel)</h2>
              <p className="text-xs text-emerald-200 mt-0.5">
                إنشاء الفصول ورفع كشوفات الطلاب المسجلة في نور تلقائياً • {school.name}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-rose-600 text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="bg-slate-100 p-2 border-b border-slate-200 flex items-center gap-2 px-6">
          <button
            onClick={() => setActiveTab('excel')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'excel'
                ? 'bg-emerald-700 text-white shadow-md'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
            }`}
          >
            <UploadCloud className="w-4 h-4" />
            <span>رفع ملف الإكسل (Student Info Table)</span>
          </button>

          <button
            onClick={() => setActiveTab('classes')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'classes'
                ? 'bg-emerald-700 text-white shadow-md'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>هيكل الصفوف والفصول المدرسية ({classesList.length})</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          
          {importSuccessMessage && (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-bold flex items-center justify-between animate-in fade-in">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                <span>{importSuccessMessage}</span>
              </div>
              <button
                onClick={() => setImportSuccessMessage(null)}
                className="text-emerald-700 hover:text-emerald-900 text-xs font-bold underline"
              >
                إغلاق
              </button>
            </div>
          )}

          {activeTab === 'excel' ? (
            <div className="space-y-6">
              
              {/* Top Banner Guide */}
              <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
                <ShieldAlert className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-amber-900 space-y-1">
                  <strong className="block text-amber-950 font-black">
                    توافق كامل ومباشر مع كشوفات الإكسل المسحوبة من نظام نور:
                  </strong>
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
                  onClick={handleDownloadSample}
                  className="mr-auto flex-shrink-0 text-xs bg-amber-600 hover:bg-amber-700 text-white font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>تحميل نموذج معتمد</span>
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
                  <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                  <span>{uploadError}</span>
                </div>
              )}

              {/* Parsed Preview Table */}
              {parsedRows.length > 0 && (
                <div className="space-y-4 animate-in fade-in">
                  <div className="flex items-center justify-between bg-slate-100 p-3.5 rounded-2xl">
                    <div className="flex items-center gap-2">
                      <Users className="w-5 h-5 text-emerald-700" />
                      <span className="text-xs font-bold text-slate-800">
                        تم استخراج <strong className="text-emerald-700 text-sm font-black">{parsedRows.length}</strong> طالباً جاهزاً للاستيراد
                      </span>
                    </div>

                    <button
                      onClick={handleConfirmImport}
                      className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold px-5 py-2 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer shadow-md"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>اعتماد وحفظ الطلاب في المدرسة</span>
                    </button>
                  </div>

                  {/* Detected Classes Preview Chips */}
                  {detectedClasses.length > 0 && (
                    <div className="p-3 bg-teal-50 border border-teal-200 rounded-2xl text-xs space-y-1.5">
                      <span className="font-bold text-teal-900 block">الصفوف والفصول المكتشفة تلقائياً:</span>
                      <div className="flex flex-wrap gap-1.5">
                        {detectedClasses.map((dc, idx) => (
                          <span key={idx} className="bg-white border border-teal-300 text-teal-800 font-bold px-2.5 py-0.5 rounded-lg text-[11px] shadow-sm">
                            {dc.className} (فصول: {dc.sections.join('، ')})
                          </span>
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
                          <th className="py-2.5 px-3">رقم الصف</th>
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
                            <td className="py-2 px-3">{row.className}</td>
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
                      placeholder="مثال: الأول الثانوي أو 1314"
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
                    className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
                  >
                    <Plus className="w-4 h-4" />
                    <span>حفظ الصف والفصول</span>
                  </button>
                </div>
              </form>

              {/* Current Classes List */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-600">قائمة الصفوف المعتمدة للمدرسة ({classesList.length})</h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {classesList.map((cls) => (
                    <div key={cls.id} className="border border-slate-200 rounded-2xl p-4 bg-white shadow-sm space-y-3 hover:border-emerald-300 transition-colors">
                      {editingClassId === cls.id ? (
                        <div className="space-y-2 bg-slate-50 p-3 rounded-xl border border-teal-200">
                          <span className="text-[11px] font-bold text-teal-800 block">تعديل بيانات الصف:</span>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-[10px] text-slate-500 font-bold block mb-0.5">اسم الصف</label>
                              <input
                                type="text"
                                value={editClassName}
                                onChange={(e) => setEditClassName(e.target.value)}
                                className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-900 focus:outline-none focus:border-teal-600"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] text-slate-500 font-bold block mb-0.5">كود الصف الوزاري</label>
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
                              className="px-2.5 py-1 text-[11px] rounded-lg text-slate-600 hover:bg-slate-200 font-bold"
                            >
                              إلغاء
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSaveEditClass(cls.id)}
                              className="px-3 py-1 text-[11px] rounded-lg bg-teal-700 hover:bg-teal-800 text-white font-bold flex items-center gap-1 shadow-sm"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>حفظ التعديل</span>
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
                              onClick={() => handleStartEditClass(cls)}
                              className="text-teal-600 hover:text-teal-800 p-1.5 rounded-lg hover:bg-teal-50 transition-colors"
                              title="تعديل اسم الصف والكود"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteClass(cls.id)}
                              className="text-rose-500 hover:text-rose-700 p-1.5 rounded-lg hover:bg-rose-50 transition-colors"
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
                          {cls.sections.map((sec) => (
                            <span
                              key={sec}
                              className="bg-emerald-50 border border-emerald-200 text-emerald-900 font-bold px-2.5 py-1 rounded-lg text-xs flex items-center gap-1.5"
                            >
                              <button
                                type="button"
                                onClick={() => handleEditSectionName(cls.id, sec)}
                                className="hover:underline text-emerald-900 cursor-pointer"
                                title="انقر لتعديل اسم أو رقم الفصل"
                              >
                                فصل {sec}
                              </button>
                              <button
                                onClick={() => handleRemoveSectionFromClass(cls.id, sec)}
                                className="text-emerald-700 hover:text-rose-600 transition-colors mr-0.5"
                                title="إزالة الفصل"
                              >
                                ×
                              </button>
                            </span>
                          ))}

                          <button
                            onClick={() => handleAddSectionToClass(cls.id)}
                            className="text-[11px] bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-2 py-1 rounded-lg flex items-center gap-1 transition-colors cursor-pointer border border-dashed border-slate-300"
                          >
                            <Plus className="w-3 h-3" />
                            <span>إضافة فصل</span>
                          </button>
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
            تمت المزامنة اللحظية مع قاعدة البيانات المحلية للمدرسة
          </span>

          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
          >
            إغلاق النافذة
          </button>
        </div>

      </div>
    </div>
  );
}
