import React, { useState } from 'react';
import { User, School } from '../types';
import { getUsers, saveUsers, setUserState } from '../utils/storage';
import { TeacherClassPicker, AssignedClassItem } from './TeacherClassPicker';
import { soundManager } from '../utils/audio';
import { BookOpen, Check, X, Sparkles } from 'lucide-react';

interface TeacherEditClassesModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  currentSchool: School;
  onClassesUpdated: (updatedUser: User) => void;
}

export const TeacherEditClassesModal: React.FC<TeacherEditClassesModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  currentSchool,
  onClassesUpdated,
}) => {
  const [selectedClasses, setSelectedClasses] = useState<AssignedClassItem[]>(
    currentUser.assignedClasses || []
  );
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSave = () => {
    const allUsers = getUsers();
    const updatedUser: User = {
      ...currentUser,
      assignedClasses: selectedClasses,
    };

    const updatedList = allUsers.map((u) =>
      u.id === currentUser.id ? updatedUser : u
    );

    saveUsers(updatedList);
    setUserState(updatedUser);
    soundManager.playSuccess();
    setSavedSuccess(true);

    setTimeout(() => {
      onClassesUpdated(updatedUser);
      onClose();
    }, 500);
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fadeIn"
      dir="rtl"
    >
      <div className="relative bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-7 space-y-5 shadow-2xl border border-slate-200 text-right my-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center justify-center">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">
                تعديل وتحديث الفصول والشعب المسندة للمعلم
              </h3>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                {currentUser.name} • {currentSchool.name}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {savedSuccess ? (
          <div className="p-6 text-center space-y-2 bg-emerald-50 rounded-2xl border border-emerald-200 text-emerald-900 animate-fadeIn">
            <div className="w-12 h-12 rounded-full bg-emerald-600 text-white flex items-center justify-center mx-auto shadow-md">
              <Check className="w-6 h-6 stroke-[3]" />
            </div>
            <h4 className="font-black text-base">تم تحديث فصولك المسندة بنجاح!</h4>
            <p className="text-xs">يتم الآن تحديث كشوف الطلاب تلقائياً في بوابتك...</p>
          </div>
        ) : (
          <>
            <TeacherClassPicker
              school={currentSchool}
              selectedClasses={selectedClasses}
              onChange={setSelectedClasses}
              title="اختر الصفوف والشعب المعتمدة لك في هذه المدرسة"
              hint="انقر مباشرة على الشعب التي تدرسها في المرحلة المتوسطة أو المراحل الأخرى لتفعيلها فورا:"
            />

            <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
              >
                إلغاء
              </button>

              <button
                type="button"
                onClick={handleSave}
                className="py-2.5 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs flex items-center gap-2 shadow-md shadow-indigo-600/20 cursor-pointer transition-all hover:scale-[1.02]"
              >
                <Check className="w-4 h-4" />
                <span>حفظ واعتماد الفصول المسندة ({selectedClasses.length})</span>
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
