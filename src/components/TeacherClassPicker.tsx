import React, { useState, useMemo } from 'react';
import { School, SchoolClassSection } from '../types';
import { getSchoolClasses } from '../utils/schoolClasses';
import { Check, Plus, X, BookOpen, CheckCheck, Sparkles } from 'lucide-react';

export interface AssignedClassItem {
  className: string;
  sectionName: string;
}

interface TeacherClassPickerProps {
  school: School;
  selectedClasses: AssignedClassItem[];
  onChange: (classes: AssignedClassItem[]) => void;
  title?: string;
  hint?: string;
}

export const TeacherClassPicker: React.FC<TeacherClassPickerProps> = ({
  school,
  selectedClasses,
  onChange,
  title = 'تحديد الصفوف والفصول المسندة للمعلم',
  hint = 'اختر الفصول والشعب بالنقر المباشر عليها. يمكنك اختيار عدة فصول من مراحل مختلفة:',
}) => {
  // Always retrieve complete, stage-aware classes (Intermediate 1st, 2nd, 3rd guaranteed)
  const availableClasses: SchoolClassSection[] = useMemo(() => {
    return getSchoolClasses(school);
  }, [school]);

  // Standard Saudi sections if none provided
  const defaultSectionsList = ['1', '2', '3', '4', '5', '6', 'أ', 'ب'];

  // Custom section or class state
  const [customClassInput, setCustomClassInput] = useState('');
  const [customSectionInput, setCustomSectionInput] = useState('1');
  const [showCustomInput, setShowCustomInput] = useState(false);

  // Check if a specific class + section is selected
  const isSelected = (className: string, sectionName: string) => {
    return selectedClasses.some(
      (c) =>
        c.className.trim() === className.trim() &&
        c.sectionName.trim() === sectionName.trim()
    );
  };

  // Toggle single section
  const toggleSection = (className: string, sectionName: string) => {
    const trimmedClass = className.trim();
    const trimmedSection = sectionName.trim();
    if (isSelected(trimmedClass, trimmedSection)) {
      onChange(
        selectedClasses.filter(
          (c) =>
            !(
              c.className.trim() === trimmedClass &&
              c.sectionName.trim() === trimmedSection
            )
        )
      );
    } else {
      onChange([
        ...selectedClasses,
        { className: trimmedClass, sectionName: trimmedSection },
      ]);
    }
  };

  // Toggle all sections of a grade
  const toggleAllSectionsOfClass = (classObj: SchoolClassSection) => {
    const sectionsToToggle =
      classObj.sections && classObj.sections.length > 0
        ? classObj.sections
        : defaultSectionsList.slice(0, 4);

    const allAreSelected = sectionsToToggle.every((sec) =>
      isSelected(classObj.className, sec)
    );

    if (allAreSelected) {
      // Unselect all sections of this class
      onChange(
        selectedClasses.filter(
          (c) => c.className.trim() !== classObj.className.trim()
        )
      );
    } else {
      // Add all missing sections
      const newSelections = [...selectedClasses];
      sectionsToToggle.forEach((sec) => {
        if (!isSelected(classObj.className, sec)) {
          newSelections.push({
            className: classObj.className.trim(),
            sectionName: sec.trim(),
          });
        }
      });
      onChange(newSelections);
    }
  };

  // Add custom class and section
  const handleAddCustom = () => {
    const cName = customClassInput.trim();
    const sName = customSectionInput.trim() || '1';
    if (!cName) return;

    if (!isSelected(cName, sName)) {
      onChange([...selectedClasses, { className: cName, sectionName: sName }]);
    }
    setCustomClassInput('');
    setCustomSectionInput('1');
    setShowCustomInput(false);
  };

  return (
    <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-4 space-y-4 text-right">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/80 pb-2.5">
        <div>
          <h4 className="font-black text-slate-900 text-xs flex items-center gap-1.5">
            <BookOpen className="w-4 h-4 text-indigo-600 shrink-0" />
            <span>{title}</span>
            <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-900 text-[10px] font-bold font-mono">
              {selectedClasses.length} مسند
            </span>
          </h4>
          <p className="text-[11px] text-slate-500 font-medium mt-0.5">{hint}</p>
        </div>

        {selectedClasses.length > 0 && (
          <button
            type="button"
            onClick={() => onChange([])}
            className="text-[10px] font-bold text-rose-600 hover:text-rose-800 underline cursor-pointer"
          >
            إلغاء تحديد الكل
          </button>
        )}
      </div>

      {/* Class blocks: Guaranteed to show each grade with its sections */}
      <div className="space-y-3">
        {availableClasses.map((classObj) => {
          const sections =
            classObj.sections && classObj.sections.length > 0
              ? classObj.sections
              : defaultSectionsList.slice(0, 4);

          const selectedInThisGrade = selectedClasses.filter(
            (c) => c.className.trim() === classObj.className.trim()
          );

          const allSelected =
            sections.length > 0 &&
            sections.every((sec) => isSelected(classObj.className, sec));

          return (
            <div
              key={classObj.id || classObj.className}
              className={`p-3 rounded-xl border transition-all ${
                selectedInThisGrade.length > 0
                  ? 'bg-indigo-50/40 border-indigo-200 shadow-2xs'
                  : 'bg-white border-slate-200'
              }`}
            >
              {/* Grade Header with Bulk Select */}
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900 text-xs">
                    🏫 {classObj.className}
                  </span>
                  {selectedInThisGrade.length > 0 && (
                    <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-900 text-[10px] font-bold">
                      تم اختيار ({selectedInThisGrade.length}) شعبة
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => toggleAllSectionsOfClass(classObj)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
                    allSelected
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  <CheckCheck className="w-3 h-3" />
                  <span>
                    {allSelected
                      ? 'إلغاء جميع فصول الصف'
                      : 'تحديد جميع الفصول'}
                  </span>
                </button>
              </div>

              {/* Section Pills */}
              <div className="flex flex-wrap gap-1.5">
                {sections.map((sec) => {
                  const active = isSelected(classObj.className, sec);
                  return (
                    <button
                      key={sec}
                      type="button"
                      onClick={() => toggleSection(classObj.className, sec)}
                      className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs ${
                        active
                          ? 'bg-indigo-600 text-white ring-2 ring-indigo-600 ring-offset-1 scale-[1.02]'
                          : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      {active && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      <span>فصل ({sec})</span>
                    </button>
                  );
                })}

                {/* Extra common sections if not in list */}
                {['4', '5', '6', 'أ', 'ب'].map((extraSec) => {
                  if (sections.includes(extraSec)) return null;
                  const active = isSelected(classObj.className, extraSec);
                  return (
                    <button
                      key={`extra-${extraSec}`}
                      type="button"
                      onClick={() => toggleSection(classObj.className, extraSec)}
                      className={`px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer border ${
                        active
                          ? 'bg-indigo-600 text-white border-indigo-600 font-bold'
                          : 'bg-slate-50 hover:bg-white text-slate-500 border-dashed border-slate-300 hover:text-slate-800'
                      }`}
                      title={`إضافة شعبة (${extraSec}) لهذا الصف`}
                    >
                      {active ? `✓ (${extraSec})` : `+ شعبة (${extraSec})`}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Option to Add Custom Class or Section */}
      <div className="pt-1">
        {!showCustomInput ? (
          <button
            type="button"
            onClick={() => setShowCustomInput(true)}
            className="text-xs font-bold text-indigo-700 hover:text-indigo-900 flex items-center gap-1 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>هل لديك صف أو شعبة خاصة غير موجودة بالقائمة؟ أضفها هنا</span>
          </button>
        ) : (
          <div className="bg-white border border-indigo-200 rounded-xl p-3 space-y-2 animate-fadeIn">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-indigo-950">إضافة صف أو شعبة يدوياً:</span>
              <button
                type="button"
                onClick={() => setShowCustomInput(false)}
                className="text-slate-400 hover:text-slate-600 text-xs"
              >
                ✕ إغلاق
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="text"
                placeholder="اسم الصف (مثال: الثاني المتوسط)"
                value={customClassInput}
                onChange={(e) => setCustomClassInput(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 flex-1 min-w-36 focus:outline-indigo-500"
              />
              <input
                type="text"
                placeholder="رقم أو رمز الشعبة (مثال: 3 أو أ)"
                value={customSectionInput}
                onChange={(e) => setCustomSectionInput(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 w-28 focus:outline-indigo-500 text-center font-bold"
              />
              <button
                type="button"
                onClick={handleAddCustom}
                disabled={!customClassInput.trim()}
                className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold cursor-pointer"
              >
                + إضافة
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Selected Classes Chips Preview */}
      {selectedClasses.length > 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-3 space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>الفصول المعتمدة المسندة إليك ({selectedClasses.length}):</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {selectedClasses.map((item, idx) => (
              <span
                key={`${item.className}-${item.sectionName}-${idx}`}
                className="px-2.5 py-1 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-950 font-bold text-xs flex items-center gap-1.5 shadow-2xs"
              >
                <span>
                  {item.className} - فصل ({item.sectionName})
                </span>
                <button
                  type="button"
                  onClick={() =>
                    onChange(
                      selectedClasses.filter((_, i) => i !== idx)
                    )
                  }
                  className="text-rose-500 hover:text-rose-700 cursor-pointer p-0.5 hover:bg-rose-50 rounded"
                  title="حذف هذا الفصل"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        </div>
      ) : (
        <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[11px] font-medium">
          ⚠️ لم يتم تحديد أي فصول بعد. يرجى النقر على الفصول والشعب التي تدرسها أعلاه ليتمكن النظام من إظهار كشوف طلابك فوراً.
        </div>
      )}
    </div>
  );
};
