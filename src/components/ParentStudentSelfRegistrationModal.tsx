import React, { useState, useMemo } from 'react';
import { 
  User, School, SchoolClassSection, Attendance 
} from '../types';
import { 
  getUsers, saveUsers, getAttendances, saveAttendances 
} from '../utils/storage';
import { getTodayDateString } from '../utils/academic';
import { 
  Building2, UserCheck, X, Check, 
  GraduationCap, Plus, Trash2, AlertCircle
} from 'lucide-react';

interface StudentFormItem {
  id: string;
  name: string;
  nationalId: string;
  mobile: string;
  className: string;
  sectionName: string;
}

interface ParentStudentSelfRegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  schools: School[];
  initialSchoolCode?: string;
  onRegistrationSuccess: (parentUser: User, students: User[]) => void;
}

export const ParentStudentSelfRegistrationModal: React.FC<ParentStudentSelfRegistrationModalProps> = ({
  isOpen,
  onClose,
  schools,
  initialSchoolCode,
  onRegistrationSuccess,
}) => {
  const [selectedSchoolCode, setSelectedSchoolCode] = useState<string>(
    initialSchoolCode || schools[0]?.code || ''
  );

  React.useEffect(() => {
    if (initialSchoolCode) {
      setSelectedSchoolCode(initialSchoolCode);
    } else if (schools.length > 0 && !selectedSchoolCode) {
      setSelectedSchoolCode(schools[0].code);
    }
  }, [initialSchoolCode, schools]);

  const [parentName, setParentName] = useState('');
  const [parentNationalId, setParentNationalId] = useState('');
  const [parentMobile, setParentMobile] = useState('');
  const [relationship, setRelationship] = useState('أب');
  const [parentPassword, setParentPassword] = useState('');

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

  const defaultClass = availableClasses[0]?.className || 'الأول المتوسط';
  const defaultSection = availableClasses[0]?.sections[0] || '1';

  const [students, setStudents] = useState<StudentFormItem[]>([
    {
      id: `s-${Date.now()}-1`,
      name: '',
      nationalId: '',
      mobile: '',
      className: defaultClass,
      sectionName: defaultSection,
    },
  ]);

  const [errorMsg, setErrorMsg] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [createdParent, setCreatedParent] = useState<User | null>(null);
  const [createdStudents, setCreatedStudents] = useState<User[]>([]);

  if (!isOpen) return null;

  const handleAddStudentRow = () => {
    setStudents((prev) => [
      ...prev,
      {
        id: `s-${Date.now()}-${prev.length + 1}`,
        name: '',
        nationalId: '',
        mobile: '',
        className: availableClasses[0]?.className || '',
        sectionName: availableClasses[0]?.sections[0] || '1',
      },
    ]);
  };

  const handleRemoveStudentRow = (id: string) => {
    if (students.length <= 1) return;
    setStudents((prev) => prev.filter((s) => s.id !== id));
  };

  const handleStudentChange = (id: string, field: keyof StudentFormItem, value: string) => {
    setStudents((prev) =>
      prev.map((s) => {
        if (s.id !== id) return s;
        const updated = { ...s, [field]: value };
        if (field === 'className') {
          const matchedCls = availableClasses.find((c) => c.className === value);
          if (matchedCls && matchedCls.sections.length > 0) {
            updated.sectionName = matchedCls.sections[0];
          }
        }
        return updated;
      })
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const cleanParentName = parentName.trim();
    const cleanParentNid = parentNationalId.trim().replace(/\D/g, '');
    const cleanParentMobile = parentMobile.trim().replace(/\D/g, '');

    if (!cleanParentName) {
      setErrorMsg('يرجى إدخال اسم ولي الأمر الكريم');
      return;
    }
    if (cleanParentNid.length !== 10) {
      setErrorMsg('رقم هوية ولي الأمر يجب أن يتكون من 10 أرقام');
      return;
    }
    if (cleanParentMobile.length < 9) {
      setErrorMsg('يرجى إدخال رقم جوال صحيح لولي الأمر');
      return;
    }

    for (let i = 0; i < students.length; i++) {
      const st = students[i];
      const sName = st.name.trim();
      const sNid = st.nationalId.trim().replace(/\D/g, '');
      if (!sName) {
        setErrorMsg(`يرجى إدخال اسم الطالب رقم (${i + 1}) الرباعي`);
        return;
      }
      if (sNid.length !== 10) {
        setErrorMsg(`رقم هوية الطالب (${sName || i + 1}) يجب أن يتكون من 10 أرقام`);
        return;
      }
      if (!st.className) {
        setErrorMsg(`يرجى اختيار الصف الدراسي للطالب (${sName})`);
        return;
      }
    }

    const studentNids = students.map((s) => s.nationalId.trim().replace(/\D/g, ''));
    if (new Set(studentNids).size !== studentNids.length) {
      setErrorMsg('يوجد تكرار في أرقام هويات الطلاب المدخلة');
      return;
    }

    const allExistingUsers = getUsers();

    // 1. Create or Update Parent User
    const finalParentPassword = parentPassword.trim() || cleanParentNid.slice(-4) || '123456';
    const parentUser: User = {
      id: `usr-p-${cleanParentNid}`,
      nationalId: cleanParentNid,
      name: `${cleanParentName} (${relationship})`,
      mobile: cleanParentMobile,
      password: finalParentPassword,
      role: 'parent',
      schoolCode: currentSchool.code,
      childrenNationalIds: studentNids,
    };

    // 2. Create Student Users with auto-placement
    const newStudentUsers: User[] = students.map((st) => {
      const cleanSNid = st.nationalId.trim().replace(/\D/g, '');
      return {
        id: `usr-s-${cleanSNid}`,
        nationalId: cleanSNid,
        name: st.name.trim(),
        mobile: st.mobile.trim() || undefined,
        parentMobile: cleanParentMobile,
        password: cleanSNid.slice(-4) || '123456',
        role: 'student' as const,
        schoolCode: currentSchool.code,
        className: st.className,
        sectionName: st.sectionName || '1',
      };
    });

    const updatedUsersList = [...allExistingUsers];

    // Upsert parent
    const pIdx = updatedUsersList.findIndex((u) => u.nationalId === cleanParentNid);
    if (pIdx >= 0) {
      const existingChildren = updatedUsersList[pIdx].childrenNationalIds || [];
      const mergedChildren = Array.from(new Set([...existingChildren, ...studentNids]));
      updatedUsersList[pIdx] = {
        ...updatedUsersList[pIdx],
        ...parentUser,
        childrenNationalIds: mergedChildren,
      };
    } else {
      updatedUsersList.push(parentUser);
    }

    // Upsert students
    newStudentUsers.forEach((st) => {
      const sIdx = updatedUsersList.findIndex((u) => u.nationalId === st.nationalId);
      if (sIdx >= 0) {
        updatedUsersList[sIdx] = { ...updatedUsersList[sIdx], ...st };
      } else {
        updatedUsersList.push(st);
      }
    });

    saveUsers(updatedUsersList);

    // Auto-create initial today's attendance record
    const today = getTodayDateString();
    const currentAttendances = getAttendances();
    const newRecords: Attendance[] = [];

    newStudentUsers.forEach((st) => {
      const exists = currentAttendances.some((a) => a.studentId === st.id && a.date === today);
      if (!exists) {
        newRecords.push({
          id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          studentId: st.id,
          studentName: st.name,
          nationalId: st.nationalId,
          schoolCode: currentSchool.code,
          className: st.className || 'عام',
          sectionName: st.sectionName || '1',
          date: today,
          selfCheckTime: null,
          teacherMark: null,
          finalStatus: 'absent',
          isTruant: false,
          parentMobile: cleanParentMobile,
        });
      }
    });

    if (newRecords.length > 0) {
      saveAttendances([...currentAttendances, ...newRecords]);
    }

    setCreatedParent(parentUser);
    setCreatedStudents(newStudentUsers);
    setIsSuccess(true);
    onRegistrationSuccess(parentUser, newStudentUsers);
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto animate-fadeIn" 
      dir="rtl"
    >
      <div className="bg-white rounded-3xl shadow-2xl border border-emerald-100 w-full max-w-2xl overflow-hidden text-right my-auto">
        
        {/* Modal Top Banner */}
        <div className="p-6 bg-gradient-to-r from-emerald-800 via-teal-800 to-slate-900 text-white flex items-center justify-between relative overflow-hidden">
          <div className="flex items-center gap-3.5 relative z-10">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white border border-white/30">
              <GraduationCap className="w-7 h-7 text-emerald-200" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/30 text-emerald-200 text-[10px] font-bold border border-emerald-400/30">
                  بوابة التسجيل والتسكين الذاتي الفوري ⚡
                </span>
              </div>
              <h2 className="text-lg font-black text-white mt-1">
                <span>تسجيل طالب وولي أمر في ({currentSchool?.name || 'المدرسة'})</span>
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/25 text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          
          {isSuccess && createdParent ? (
            /* SUCCESS CONFIRMATION */
            <div className="space-y-5 text-center py-3 animate-fadeIn">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto border-4 border-emerald-200 shadow-md">
                <Check className="w-8 h-8" />
              </div>

              <div className="space-y-1.5">
                <h3 className="text-xl font-black text-slate-900">
                  تم تسجيل وتسكين الطالب بنجاح! 🎉
                </h3>
                <p className="text-xs text-slate-600 max-w-md mx-auto">
                  تم ربط حساب ولي الأمر بالأبناء وتسكينهم رسمياً في فصولهم بمدرسة ({currentSchool?.name}).
                </p>
              </div>

              {/* Registration Summary Card */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-right space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200/80 pb-2.5">
                  <div className="flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-emerald-600" />
                    <span className="font-bold text-xs text-slate-700">حساب ولي الأمر:</span>
                  </div>
                  <span className="font-black text-xs text-slate-900">{createdParent.name}</span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600">
                  <div>هوية ولي الأمر: <strong className="font-mono text-slate-900">{createdParent.nationalId}</strong></div>
                  <div>كلمة المرور: <strong className="font-mono text-slate-900">{createdParent.password}</strong></div>
                </div>

                {/* Enrolled Students list */}
                <div className="pt-2 border-t border-slate-200/80 space-y-2">
                  <div className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                    <GraduationCap className="w-3.5 h-3.5 text-indigo-600" />
                    <span>الطلاب الذين تم تسكينهم في الفصول:</span>
                  </div>
                  {createdStudents.map((st, idx) => (
                    <div key={st.id} className="bg-white p-2.5 rounded-xl border border-emerald-200 flex items-center justify-between text-xs">
                      <div>
                        <strong className="text-slate-900 block font-bold">{idx + 1}. {st.name}</strong>
                        <span className="text-[10px] text-slate-500 font-mono">هوية: {st.nationalId}</span>
                      </div>
                      <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 text-[11px] font-black border border-emerald-200">
                        {st.className} - فصل {st.sectionName}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer"
                >
                  <UserCheck className="w-4 h-4" />
                  <span>الدخول لبوابة ولي الأمر الآن ↵</span>
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-black text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>إتمام والخروج</span>
                </button>
              </div>

            </div>
          ) : (
            /* FORM */
            <form onSubmit={handleSubmit} className="space-y-6">
              
              {/* School Selector */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                <label className="block text-xs font-black text-slate-800 flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-emerald-700" />
                  <span>المدرسة المراد الانضمام والتسجيل فيها:</span>
                </label>
                <select
                  value={selectedSchoolCode}
                  onChange={(e) => setSelectedSchoolCode(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900"
                >
                  {schools.map((s) => (
                    <option key={s.code} value={s.code}>
                      {s.name} ({s.city}) - كود: {s.code}
                    </option>
                  ))}
                </select>
              </div>

              {/* Parent Information */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                  <div className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-black text-xs">
                    1
                  </div>
                  <h3 className="text-sm font-black text-slate-900">
                    بيانات ولي الأمر (الأب / الأم / الوكيل)
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">اسم ولي الأمر *</label>
                    <input
                      type="text"
                      required
                      placeholder="مثال: عبدالله محمد الشهري"
                      value={parentName}
                      onChange={(e) => setParentName(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 font-bold text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">صلة القرابة *</label>
                    <select
                      value={relationship}
                      onChange={(e) => setRelationship(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 font-bold text-slate-900"
                    >
                      <option value="أب">الأب</option>
                      <option value="أم">الأم</option>
                      <option value="أخ">الأخ / الأخت</option>
                      <option value="ولي أمر">وكيل / ولي أمر شرعي</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">رقم هوية ولي الأمر (10 أرقام) *</label>
                    <input
                      type="text"
                      required
                      maxLength={10}
                      placeholder="10xxxxxxxx"
                      value={parentNationalId}
                      onChange={(e) => setParentNationalId(e.target.value.replace(/\D/g, ''))}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 font-mono font-bold text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">رقم جوال ولي الأمر (للإشعارات) *</label>
                    <input
                      type="tel"
                      required
                      placeholder="05xxxxxxxx"
                      value={parentMobile}
                      onChange={(e) => setParentMobile(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 font-mono text-slate-900"
                    />
                  </div>
                </div>
              </div>

              {/* Students Placement */}
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-teal-100 text-teal-800 flex items-center justify-center font-black text-xs">
                      2
                    </div>
                    <h3 className="text-sm font-black text-slate-900">
                      بيانات الطالب وتسكينه في الصف والفصل
                    </h3>
                  </div>

                  <button
                    type="button"
                    onClick={handleAddStudentRow}
                    className="text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-xl border border-emerald-200 flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ إضافة ابن آخر</span>
                  </button>
                </div>

                {students.map((st, idx) => {
                  const matchedClass = availableClasses.find((c) => c.className === st.className);
                  const sectionsList = matchedClass?.sections || ['1', '2', '3', 'أ', 'ب', 'ج'];

                  return (
                    <div 
                      key={st.id} 
                      className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200/90 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 text-[11px] font-black">
                          الطالب رقم ({idx + 1})
                        </span>

                        {students.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveStudentRow(st.id)}
                            className="text-rose-600 hover:text-rose-800 p-1 rounded-lg hover:bg-rose-50 cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <div>
                          <label className="block font-bold text-slate-700 mb-1">اسم الطالب الرباعي *</label>
                          <input
                            type="text"
                            required
                            placeholder="مثال: فيصل عبدالله محمد الشهري"
                            value={st.name}
                            onChange={(e) => handleStudentChange(st.id, 'name', e.target.value)}
                            className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 font-bold text-slate-900"
                          />
                        </div>

                        <div>
                          <label className="block font-bold text-slate-700 mb-1">رقم هوية الطالب *</label>
                          <input
                            type="text"
                            required
                            maxLength={10}
                            placeholder="11xxxxxxxx"
                            value={st.nationalId}
                            onChange={(e) => handleStudentChange(st.id, 'nationalId', e.target.value.replace(/\D/g, ''))}
                            className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 font-mono font-bold text-slate-900"
                          />
                        </div>

                        <div>
                          <label className="block font-bold text-slate-700 mb-1">المرحلة / الصف *</label>
                          <select
                            value={st.className}
                            onChange={(e) => handleStudentChange(st.id, 'className', e.target.value)}
                            className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 font-bold text-slate-900"
                          >
                            {availableClasses.map((c) => (
                              <option key={c.id} value={c.className}>
                                {c.className}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block font-bold text-slate-700 mb-1">الفصل / الشعبة *</label>
                          <select
                            value={st.sectionName}
                            onChange={(e) => handleStudentChange(st.id, 'sectionName', e.target.value)}
                            className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 font-bold text-slate-900"
                          >
                            {sectionsList.map((sec) => (
                              <option key={sec} value={sec}>
                                فصل {sec}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {errorMsg && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs font-bold text-rose-800 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-3 rounded-xl text-slate-600 font-bold text-xs hover:bg-slate-100"
                >
                  إلغاء
                </button>

                <button
                  type="submit"
                  className="px-8 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 text-white font-black text-xs sm:text-sm flex items-center gap-2 shadow-lg cursor-pointer"
                >
                  <UserCheck className="w-4 h-4" />
                  <span>تأكيد التسجيل والتسكين الفوري في المدرسة ↵</span>
                </button>
              </div>

            </form>
          )}

        </div>

      </div>
    </div>
  );
};
