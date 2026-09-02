import React, { useState, useMemo } from 'react';
import { School, User, SchoolClassSection } from '../types';
import { getUsers, saveUsers, updateSchool } from '../utils/storage';
import { parseNoorExcelFile, ParsedStudentRow } from '../utils/excelParser';
import { 
  FileSpreadsheet, Upload, Plus, Trash2, Check, 
  X, AlertCircle, Sparkles, Users, Layers, UserPlus 
} from 'lucide-react';

interface ClassExcelManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  school: School;
  onUpdated: () => void;
}

export const ClassExcelManagerModal: React.FC<ClassExcelManagerModalProps> = ({
  isOpen,
  onClose,
  school,
  onUpdated,
}) => {
  const [activeTab, setActiveTab] = useState<'excel' | 'manual' | 'classes'>('excel');
  const [parsedRows, setParsedRows] = useState<ParsedStudentRow[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [msg, setMsg] = useState('');

  // Manual student state
  const [studentName, setStudentName] = useState('');
  const [studentNid, setStudentNid] = useState('');
  const [studentMobile, setStudentMobile] = useState('');
  const [parentMobile, setParentMobile] = useState('');

  // Class / Sections management
  const [classesList, setClassesList] = useState<SchoolClassSection[]>(
    school.customClasses && school.customClasses.length > 0
      ? school.customClasses
      : [
          { id: 'c-1', className: 'الأول المتوسط', sections: ['1', '2', '3'] },
          { id: 'c-2', className: 'الثاني المتوسط', sections: ['1', '2'] },
        ]
  );
  const [newClassName, setNewClassName] = useState('');
  const [newClassSections, setNewClassSections] = useState('1, 2, 3');

  const [selectedClass, setSelectedClass] = useState(classesList[0]?.className || 'الأول المتوسط');
  const [selectedSection, setSelectedSection] = useState(classesList[0]?.sections[0] || '1');

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
        password: cleanNid.slice(-4) || '1234',
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
    });

    saveUsers(updatedUsers);
    setMsg(`✅ تم استيراد وتسكين (${parsedRows.length}) طالب بنجاح في المنظومة.`);
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
      password: cleanNid.slice(-4) || '1234',
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

    saveUsers(updatedUsers);
    setMsg(`✅ تم إضافة وتسكين الطالب (${studentName}) في فصل (${selectedClass} - ${selectedSection}) بنجاح!`);
    
    // Reset form
    setStudentName('');
    setStudentNid('');
    setStudentMobile('');
    setParentMobile('');
    onUpdated();
  };

  const handleAddClass = () => {
    if (!newClassName.trim()) return;
    const sections = newClassSections
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const updated = [
      ...classesList,
      {
        id: `c-${Date.now()}`,
        className: newClassName.trim(),
        sections: sections.length > 0 ? sections : ['1'],
      },
    ];
    setClassesList(updated);
    setNewClassName('');
    setNewClassSections('1, 2, 3');
  };

  const handleRemoveClass = (id: string) => {
    setClassesList(classesList.filter((c) => c.id !== id));
  };

  const handleSaveClasses = () => {
    const updatedSchool: School = {
      ...school,
      customClasses: classesList,
    };
    updateSchool(updatedSchool);
    setMsg('✅ تم حفظ تعديل الصفوف والشعب بنجاح.');
    onUpdated();
  };

  return (
    <div 
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fadeIn" 
      dir="rtl"
    >
      <div className="bg-white border border-slate-200 rounded-3xl max-w-2xl w-full p-6 text-right space-y-5 shadow-2xl text-slate-800 my-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">إدارة كشوفات الطلاب ونظام نور والفصول</h3>
              <p className="text-xs text-slate-500 font-medium">مدرسة: {school.name} (كود: {school.code})</p>
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

        {/* TAB 3: CLASSES & SECTIONS */}
        {activeTab === 'classes' && (
          <div className="space-y-4 text-xs">
            {/* Add class row */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
              <span className="font-bold text-slate-900 block">إضافة صف دراسي جديد:</span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <input
                  type="text"
                  placeholder="اسم الصف (مثال: الأول المتوسط)"
                  value={newClassName}
                  onChange={(e) => setNewClassName(e.target.value)}
                  className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-emerald-500"
                />
                <input
                  type="text"
                  placeholder="الشعب (مفصولة بفواصل: 1, 2, 3)"
                  value={newClassSections}
                  onChange={(e) => setNewClassSections(e.target.value)}
                  className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-emerald-500"
                />
                <button
                  type="button"
                  onClick={handleAddClass}
                  className="py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center justify-center gap-1 cursor-pointer shadow-xs"
                >
                  <Plus className="w-4 h-4" />
                  <span>إضافة الصف</span>
                </button>
              </div>
            </div>

            {/* List of current classes */}
            <div className="space-y-2">
              <span className="font-bold text-slate-900 block">الصفوف والشعب الحالية بالمدرسة:</span>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {classesList.map((c) => (
                  <div key={c.id} className="bg-white border border-slate-200 rounded-xl p-3 flex items-center justify-between shadow-2xs">
                    <div>
                      <strong className="text-slate-900 block font-bold">{c.className}</strong>
                      <span className="text-[11px] text-slate-500">الشعب المتاحة: {c.sections.join(' ، ')}</span>
                    </div>
                    <button
                      onClick={() => handleRemoveClass(c.id)}
                      className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={handleSaveClasses}
                className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/20 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>حفظ التعديلات في المدرسة</span>
              </button>
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
