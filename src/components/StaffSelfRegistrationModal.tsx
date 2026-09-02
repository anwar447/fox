import React, { useState, useMemo } from 'react';
import { User, School, SchoolClassSection, StaffTitle } from '../types';
import { getUsers, saveUsers } from '../utils/storage';
import { 
  Users, UserCheck, X, Check, BookOpen, 
  ShieldCheck, AlertCircle, Plus, Trash2, Key, Phone
} from 'lucide-react';

interface StaffSelfRegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  schools: School[];
  initialSchoolCode?: string;
  onRegistrationSuccess: (staffUser: User) => void;
}

export const StaffSelfRegistrationModal: React.FC<StaffSelfRegistrationModalProps> = ({
  isOpen,
  onClose,
  schools,
  initialSchoolCode,
  onRegistrationSuccess,
}) => {
  const [selectedSchoolCode, setSelectedSchoolCode] = useState<string>(
    initialSchoolCode || schools[0]?.code || ''
  );

  const [name, setName] = useState('');
  const [nationalId, setNationalId] = useState('');
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('123');
  const [staffTitle, setStaffTitle] = useState<StaffTitle>('teacher');

  const currentSchool = useMemo(() => {
    return schools.find((s) => s.code === selectedSchoolCode) || schools[0];
  }, [schools, selectedSchoolCode]);

  const availableClasses: SchoolClassSection[] = useMemo(() => {
    if (!currentSchool) return [];
    if (currentSchool.customClasses && currentSchool.customClasses.length > 0) {
      return currentSchool.customClasses;
    }
    if (currentSchool.type === 'elementary') {
      return [
        { id: 'c-1', className: 'الأول الابتدائي', sections: ['1', '2', '3', 'أ', 'ب'] },
        { id: 'c-2', className: 'الثاني الابتدائي', sections: ['1', '2', '3', 'أ', 'ب'] },
        { id: 'c-3', className: 'الثالث الابتدائي', sections: ['1', '2', '3', 'أ', 'ب'] },
        { id: 'c-4', className: 'الرابع الابتدائي', sections: ['1', '2', '3', 'أ', 'ب'] },
        { id: 'c-5', className: 'الخامس الابتدائي', sections: ['1', '2', '3', 'أ', 'ب'] },
        { id: 'c-6', className: 'السادس الابتدائي', sections: ['1', '2', '3', 'أ', 'ب'] },
      ];
    }
    if (currentSchool.type === 'secondary') {
      return [
        { id: 'c-1', className: 'الأول الثانوي (مسارات)', sections: ['1', '2', '3', '4', 'أ', 'ب'] },
        { id: 'c-2', className: 'الثاني الثانوي', sections: ['1', '2', '3', '4', 'أ', 'ب'] },
        { id: 'c-3', className: 'الثالث الثانوي', sections: ['1', '2', '3', '4', 'أ', 'ب'] },
      ];
    }
    return [
      { id: 'c-1', className: 'الأول المتوسط', sections: ['1', '2', '3', 'أ', 'ب'] },
      { id: 'c-2', className: 'الثاني المتوسط', sections: ['1', '2', '3', 'أ', 'ب'] },
      { id: 'c-3', className: 'الثالث المتوسط', sections: ['1', '2', '3', 'أ', 'ب'] },
    ];
  }, [currentSchool]);

  // Selected classes for teachers
  const [selectedClasses, setSelectedClasses] = useState<{ className: string; sectionName: string }[]>([]);
  const [tempClassName, setTempClassName] = useState(availableClasses[0]?.className || 'الأول المتوسط');
  const [tempSectionName, setTempSectionName] = useState(availableClasses[0]?.sections[0] || '1');

  const [errorMsg, setErrorMsg] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [createdStaff, setCreatedStaff] = useState<User | null>(null);

  if (!isOpen) return null;

  const handleAddClass = () => {
    if (!tempClassName || !tempSectionName) return;
    const exists = selectedClasses.some(
      (c) => c.className === tempClassName && c.sectionName === tempSectionName
    );
    if (!exists) {
      setSelectedClasses([...selectedClasses, { className: tempClassName, sectionName: tempSectionName }]);
    }
  };

  const handleRemoveClass = (index: number) => {
    setSelectedClasses(selectedClasses.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const cleanName = name.trim();
    const cleanNid = nationalId.trim().replace(/\D/g, '');
    const cleanMobile = mobile.trim().replace(/\D/g, '');

    if (!cleanName) {
      setErrorMsg('يرجى إدخال اسم المعلم أو الموظف');
      return;
    }
    if (cleanNid.length !== 10) {
      setErrorMsg('رقم الهوية الوطنية / الإقامة يجب أن يتكون من 10 أرقام');
      return;
    }

    const existingUsers = getUsers();
    const existingIndex = existingUsers.findIndex(
      (u) => u.nationalId === cleanNid && u.schoolCode === selectedSchoolCode
    );

    const userRole = staffTitle === 'teacher' ? 'teacher' : 'employee';

    const newStaffUser: User = {
      id: `usr-staff-${cleanNid}`,
      nationalId: cleanNid,
      name: cleanName,
      mobile: cleanMobile || undefined,
      password: password || '123',
      role: userRole,
      staffTitle: staffTitle,
      schoolCode: selectedSchoolCode,
      assignedClasses: staffTitle === 'teacher' ? selectedClasses : undefined,
    };

    let updatedUsers = [...existingUsers];
    if (existingIndex >= 0) {
      updatedUsers[existingIndex] = { ...updatedUsers[existingIndex], ...newStaffUser };
    } else {
      updatedUsers.push(newStaffUser);
    }

    saveUsers(updatedUsers);
    setCreatedStaff(newStaffUser);
    setIsSuccess(true);
  };

  const handleEnterDashboard = () => {
    if (createdStaff) {
      onRegistrationSuccess(createdStaff);
    }
    onClose();
  };

  return (
    <div 
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fadeIn"
      dir="rtl"
    >
      <div className="relative bg-white rounded-3xl max-w-xl w-full p-6 sm:p-7 space-y-5 shadow-2xl border border-slate-200 text-right my-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center justify-center">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-800 text-[10px] font-black">
                  انضمام المعلمين والكادر الإداري 👨‍🏫
                </span>
              </div>
              <h3 className="text-base font-black text-slate-900 mt-0.5">
                تسجيل وتأكيد بيانات الكادر التعليمي
              </h3>
              <p className="text-xs text-slate-500">
                مدرسة: {currentSchool?.name || 'اختر المدرسة'}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Success State */}
        {isSuccess && createdStaff ? (
          <div className="space-y-4 text-center py-4 animate-fadeIn">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 border-2 border-emerald-300 flex items-center justify-center mx-auto">
              <Check className="w-8 h-8 stroke-[3]" />
            </div>
            <div className="space-y-1">
              <h4 className="text-lg font-black text-slate-900">
                أهلاً وسهلاً بك أستاذ {createdStaff.name} 🌟
              </h4>
              <p className="text-xs text-slate-600">
                تم تسجيلك بنجاح ضمن كادر ({currentSchool.name}).
              </p>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs text-right space-y-2 max-w-md mx-auto">
              <div className="flex justify-between border-b border-slate-200 pb-2">
                <span className="text-slate-500">الصفة الوظيفية:</span>
                <span className="font-bold text-indigo-700">
                  {createdStaff.staffTitle === 'teacher' ? 'معلم' :
                   createdStaff.staffTitle === 'vice_principal' ? 'وكيل مدرسة' :
                   createdStaff.staffTitle === 'admin_assistant' ? 'مساعد إداري' :
                   createdStaff.staffTitle === 'student_advisor' ? 'موجه طلابي' :
                   createdStaff.staffTitle === 'gatekeeper' ? 'مراقب بوابة / حارس' : 'كادر مدرسي'}
                </span>
              </div>
              <div className="flex justify-between border-b border-slate-200 pb-2">
                <span className="text-slate-500">الهوية الوطنية:</span>
                <span className="font-mono font-bold text-slate-900">{createdStaff.nationalId}</span>
              </div>
              {createdStaff.assignedClasses && createdStaff.assignedClasses.length > 0 && (
                <div className="space-y-1 pt-1">
                  <span className="text-slate-500 block">الفصول المسندة:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {createdStaff.assignedClasses.map((c, i) => (
                      <span key={i} className="px-2 py-0.5 bg-indigo-50 border border-indigo-200 text-indigo-800 rounded-md font-bold text-[11px]">
                        {c.className} ({c.sectionName})
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={handleEnterDashboard}
              className="w-full py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 transition-all cursor-pointer"
            >
              <UserCheck className="w-5 h-5" />
              <span>الدخول إلى البوابة فوراً ↵</span>
            </button>
          </div>
        ) : (
          /* Registration Form */
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* School selection */}
            <div>
              <label className="block text-slate-700 font-bold mb-1">المدرسة التابع لها *</label>
              <select
                value={selectedSchoolCode}
                onChange={(e) => setSelectedSchoolCode(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-900 font-bold focus:outline-emerald-500"
              >
                {schools.map((s) => (
                  <option key={s.id} value={s.code}>
                    {s.name} ({s.code}) - {s.city}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-700 font-bold mb-1">الاسم الثلاثي أو الرباعي *</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: أ. محمد عبدالله الدوسري"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-900 focus:outline-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">رقم الهوية الوطنية / الإقامة (10 أرقام) *</label>
                <input
                  type="text"
                  required
                  maxLength={10}
                  placeholder="10xxxxxxxx"
                  value={nationalId}
                  onChange={(e) => setNationalId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-900 font-mono focus:outline-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">رقم الجوال *</label>
                <input
                  type="tel"
                  placeholder="05xxxxxxxx"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-900 font-mono focus:outline-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">الصفة الوظيفية *</label>
                <select
                  value={staffTitle}
                  onChange={(e) => setStaffTitle(e.target.value as StaffTitle)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-900 font-bold focus:outline-emerald-500"
                >
                  <option value="teacher">معلم (رصد الحصص والطلاب)</option>
                  <option value="vice_principal">وكيل المدرسة / شؤون الطلاب</option>
                  <option value="admin_assistant">مساعد إداري</option>
                  <option value="student_advisor">موجه طلابي / مرشد</option>
                  <option value="gatekeeper">مراقب بوابة / حارس</option>
                  <option value="lab_technician">محضر مختبر / أمين مصادر</option>
                </select>
              </div>
            </div>

            {/* If Teacher: Select classes */}
            {staffTitle === 'teacher' && (
              <div className="bg-indigo-50/70 border border-indigo-200/80 rounded-2xl p-4 space-y-3">
                <span className="font-bold text-indigo-950 block">حدد الفصول والشعب المسندة إليك:</span>
                
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={tempClassName}
                    onChange={(e) => setTempClassName(e.target.value)}
                    className="bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-800 font-medium"
                  >
                    {availableClasses.map((c) => (
                      <option key={c.id} value={c.className}>
                        {c.className}
                      </option>
                    ))}
                  </select>

                  <select
                    value={tempSectionName}
                    onChange={(e) => setTempSectionName(e.target.value)}
                    className="bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-800 font-medium"
                  >
                    <option value="1">فصل (1)</option>
                    <option value="2">فصل (2)</option>
                    <option value="3">فصل (3)</option>
                    <option value="4">فصل (4)</option>
                    <option value="5">فصل (5)</option>
                    <option value="أ">شعبة (أ)</option>
                    <option value="ب">شعبة (ب)</option>
                  </select>

                  <button
                    type="button"
                    onClick={handleAddClass}
                    className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold cursor-pointer"
                  >
                    + إضافة الفصل
                  </button>
                </div>

                {selectedClasses.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {selectedClasses.map((c, idx) => (
                      <span
                        key={idx}
                        className="px-3 py-1 rounded-xl bg-white border border-indigo-200 text-indigo-900 font-bold flex items-center gap-1.5 shadow-2xs"
                      >
                        <span>{c.className} - ({c.sectionName})</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveClass(idx)}
                          className="text-rose-500 hover:text-rose-700 cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] text-indigo-700">
                    * لم تحدد أي فصل بعد. يمكنك إضافة الفصول الآن أو إسنادها لاحقاً من قبل مدير المدرسة.
                  </p>
                )}
              </div>
            )}

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black shadow-md shadow-indigo-600/20 flex items-center gap-1.5 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>إتمام تسجيل الكادر والانضمام ↵</span>
              </button>
            </div>
          </form>
        )}

      </div>
    </div>
  );
};
