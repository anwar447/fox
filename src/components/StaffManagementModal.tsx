import React, { useState } from 'react';
import { School, User, StaffTitle, UserRole } from '../types';
import { getUsers, saveUsers, getSchools } from '../utils/storage';
import { buildTeacherWhatsAppInvitation, buildMagicLinkUrl } from '../utils/magicLink';
import { 
  Users, UserPlus, Trash2, Edit2, Check, X, 
  MessageSquare, Share2, Sparkles, BookOpen, Key, Phone, 
  Copy, ShieldCheck, Filter, Building2
} from 'lucide-react';

interface StaffManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  school: School;
  onUpdated: () => void;
  onOpenStaffInvitationLink?: () => void;
}

export const StaffManagementModal: React.FC<StaffManagementModalProps> = ({
  isOpen,
  onClose,
  school,
  onUpdated,
  onOpenStaffInvitationLink,
}) => {
  const [activeTab, setActiveTab] = useState<'list' | 'form'>('list');
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'teacher' | 'employee'>('all');
  const [msg, setMsg] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // All schools in platform for multi-school assignment
  const allSystemSchools = getSchools();
  const otherSchools = allSystemSchools.filter((s) => s.code !== school.code);

  // Editing state
  const [editingUserId, setEditingUserId] = useState<string | null>(null);

  // Form states for new/edit staff
  const [name, setName] = useState('');
  const [nationalId, setNationalId] = useState('');
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('123');
  const [staffTitle, setStaffTitle] = useState<StaffTitle>('teacher');
  const [managedSchoolCodes, setManagedSchoolCodes] = useState<string[]>([]);
  
  // Assigned classes for teacher
  const [selectedClasses, setSelectedClasses] = useState<{ className: string; sectionName: string }[]>([]);
  const [tempClassName, setTempClassName] = useState(school.customClasses?.[0]?.className || 'الأول المتوسط');
  const [tempSectionName, setTempSectionName] = useState(school.customClasses?.[0]?.sections?.[0] || '1');

  if (!isOpen) return null;

  const allSchoolStaff = getUsers().filter(
    (u) => (u.role === 'teacher' || u.role === 'employee') && 
           (u.schoolCode === school.code || u.managedSchoolCodes?.includes(school.code))
  );

  const filteredStaff = allSchoolStaff.filter((u) => {
    const matchQuery = 
      u.name.includes(search) || 
      u.nationalId.includes(search) || 
      (u.mobile && u.mobile.includes(search));
    
    if (!matchQuery) return false;
    if (roleFilter === 'teacher') return u.role === 'teacher';
    if (roleFilter === 'employee') return u.role === 'employee';
    return true;
  });

  const handleStartAdd = () => {
    setEditingUserId(null);
    setName('');
    setNationalId('');
    setMobile('');
    setPassword('123');
    setStaffTitle('teacher');
    setManagedSchoolCodes([]);
    setSelectedClasses([]);
    setActiveTab('form');
    setMsg('');
  };

  const handleStartEdit = (staff: User) => {
    setEditingUserId(staff.id);
    setName(staff.name);
    setNationalId(staff.nationalId);
    setMobile(staff.mobile || '');
    setPassword(staff.password || '123');
    setStaffTitle(staff.staffTitle || (staff.role === 'teacher' ? 'teacher' : 'admin_assistant'));
    setManagedSchoolCodes(staff.managedSchoolCodes || []);
    setSelectedClasses(staff.assignedClasses || []);
    setActiveTab('form');
    setMsg('');
  };

  const toggleSchoolAssignment = (code: string) => {
    if (managedSchoolCodes.includes(code)) {
      setManagedSchoolCodes(managedSchoolCodes.filter((c) => c !== code));
    } else {
      setManagedSchoolCodes([...managedSchoolCodes, code]);
    }
  };

  const handleAddClassToTeacher = () => {
    if (!tempClassName || !tempSectionName) return;
    const exists = selectedClasses.some(
      (c) => c.className === tempClassName && c.sectionName === tempSectionName
    );
    if (!exists) {
      setSelectedClasses([...selectedClasses, { className: tempClassName, sectionName: tempSectionName }]);
    }
  };

  const handleRemoveClassFromTeacher = (index: number) => {
    setSelectedClasses(selectedClasses.filter((_, i) => i !== index));
  };

  const handleSaveStaff = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !nationalId.trim()) {
      setMsg('يرجى كتابة الاسم ورقم الهوية');
      return;
    }

    const cleanNid = nationalId.trim();
    const existingUsers = getUsers();

    // Check duplicate ID in current school
    const duplicate = existingUsers.find(
      (u) => u.nationalId === cleanNid && u.schoolCode === school.code && u.id !== editingUserId
    );
    if (duplicate) {
      setMsg('رقم الهوية مسجل مسبقاً لموظف أو مستخدم آخر في هذه المدرسة');
      return;
    }

    const userRole: UserRole = staffTitle === 'teacher' ? 'teacher' : 'employee';

    if (editingUserId) {
      // Update existing
      const updated = existingUsers.map((u) => {
        if (u.id === editingUserId) {
          return {
            ...u,
            name: name.trim(),
            nationalId: cleanNid,
            mobile: mobile.trim() || undefined,
            password: password || '123',
            role: userRole,
            staffTitle: staffTitle,
            managedSchoolCodes: managedSchoolCodes.length > 0 ? managedSchoolCodes : undefined,
            assignedClasses: userRole === 'teacher' ? selectedClasses : undefined,
          };
        }
        return u;
      });
      saveUsers(updated);
      setMsg('✅ تم تحديث بيانات المعلم/الموظف والمدارس المسندة بنجاح!');
    } else {
      // Create new
      const newStaff: User = {
        id: `usr-staff-${cleanNid}`,
        nationalId: cleanNid,
        name: name.trim(),
        mobile: mobile.trim() || undefined,
        password: password || '123',
        role: userRole,
        staffTitle: staffTitle,
        schoolCode: school.code,
        managedSchoolCodes: managedSchoolCodes.length > 0 ? managedSchoolCodes : undefined,
        assignedClasses: userRole === 'teacher' ? selectedClasses : undefined,
      };
      saveUsers([...existingUsers, newStaff]);
      setMsg('✅ تم إضافة الكادر والمدارس المسندة بنجاح!');
    }

    setActiveTab('list');
    onUpdated();
  };

  const handleDeleteStaff = (userId: string) => {
    if (window.confirm('هل أنت متأكد من رغبتك في حذف هذا المعلم/الموظف من كادر المدرسة؟')) {
      const remaining = getUsers().filter((u) => u.id !== userId);
      saveUsers(remaining);
      onUpdated();
    }
  };

  const handleCopyDirectLink = (user: User) => {
    const link = buildMagicLinkUrl(user);
    navigator.clipboard.writeText(link);
    setCopiedId(user.id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const getRoleBadge = (user: User) => {
    const title = user.staffTitle;
    if (title === 'vice_principal') {
      return <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">وكيل مدرسة</span>;
    }
    if (title === 'admin_assistant') {
      return <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-200">مساعد إداري</span>;
    }
    if (title === 'student_advisor') {
      return <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-50 text-purple-800 border border-purple-200">موجه طلابي</span>;
    }
    if (title === 'gatekeeper') {
      return <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-50 text-rose-800 border border-rose-200">مراقب بوابة</span>;
    }
    if (user.role === 'teacher' || title === 'teacher') {
      return <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-50 text-indigo-800 border border-indigo-200">معلم</span>;
    }
    return <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">إداري</span>;
  };

  return (
    <div 
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fadeIn"
      dir="rtl"
    >
      <div className="bg-white border border-slate-200 rounded-3xl max-w-4xl w-full p-6 text-right space-y-5 shadow-2xl text-slate-800 my-auto">
        
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center justify-center">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">إدارة المعلمين والكادر الإداري والمساعدين</h3>
              <p className="text-xs text-slate-500 font-medium">مدرسة: {school.name} (كود: {school.code})</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onOpenStaffInvitationLink && (
              <button
                onClick={() => {
                  onClose();
                  onOpenStaffInvitationLink();
                }}
                className="px-3.5 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Share2 className="w-4 h-4 text-indigo-600" />
                <span>رابط دعوة الكادر 🔗</span>
              </button>
            )}
            <button onClick={onClose} className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tabs & Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex rounded-xl bg-slate-100 p-1 text-xs font-bold w-full sm:w-auto">
            <button
              onClick={() => { setActiveTab('list'); setMsg(''); }}
              className={`px-4 py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'list' ? 'bg-white text-indigo-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>قائمة الكادر ({allSchoolStaff.length})</span>
            </button>
            <button
              onClick={handleStartAdd}
              className={`px-4 py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'form' && !editingUserId ? 'bg-white text-indigo-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>إضافة معلم / مساعد جديد ➕</span>
            </button>
          </div>

          {activeTab === 'list' && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500 flex items-center gap-1">
                <Filter className="w-3 h-3" />
                <span>تصفية:</span>
              </span>
              <button
                onClick={() => setRoleFilter('all')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                  roleFilter === 'all' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                الكل ({allSchoolStaff.length})
              </button>
              <button
                onClick={() => setRoleFilter('teacher')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                  roleFilter === 'teacher' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                المعلمون ({allSchoolStaff.filter((s) => s.role === 'teacher').length})
              </button>
              <button
                onClick={() => setRoleFilter('employee')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                  roleFilter === 'employee' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                الإداريون والمساعدون ({allSchoolStaff.filter((s) => s.role === 'employee').length})
              </button>
            </div>
          )}
        </div>

        {msg && (
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold animate-fadeIn">
            {msg}
          </div>
        )}

        {/* TAB 1: LIST */}
        {activeTab === 'list' && (
          <div className="space-y-4 text-xs">
            <div className="flex items-center justify-between gap-3">
              <input
                type="text"
                placeholder="بحث باسم المعلم أو الهوية أو الجوال..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full sm:w-80 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 placeholder-slate-400 focus:outline-indigo-500"
              />
              <button
                onClick={handleStartAdd}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold flex items-center gap-1.5 shrink-0 shadow-xs cursor-pointer"
              >
                <UserPlus className="w-4 h-4" />
                <span>إضافة كادر جديد</span>
              </button>
            </div>

            <div className="border border-slate-200 rounded-2xl overflow-hidden max-h-96 overflow-y-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 text-slate-700 sticky top-0 border-b border-slate-200">
                  <tr>
                    <th className="p-3 font-bold">الاسم</th>
                    <th className="p-3 font-bold">الهوية الوطنية</th>
                    <th className="p-3 font-bold">الصفة الوظيفية</th>
                    <th className="p-3 font-bold">الجوال</th>
                    <th className="p-3 font-bold">الفصول المسندة</th>
                    <th className="p-3 text-center font-bold">رابط الدخول / الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredStaff.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-6 text-center text-slate-400">
                        لا يوجد موظفين أو معلمين مطابقين للبحث. يمكنك إضافة كادر بالضغط على "إضافة معلم / مساعد جديد".
                      </td>
                    </tr>
                  ) : (
                    filteredStaff.map((staff) => {
                      const inv = buildTeacherWhatsAppInvitation(staff, school.name);
                      return (
                        <tr key={staff.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="p-3">
                            <strong className="text-slate-900 block font-bold">{staff.name}</strong>
                            {staff.managedSchoolCodes && staff.managedSchoolCodes.length > 0 && (
                              <div className="mt-1 flex items-center gap-1">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 border border-amber-200 text-amber-900 text-[10px] font-bold">
                                  <Building2 className="w-3 h-3 text-amber-600" />
                                  <span>مسند لـ {staff.managedSchoolCodes.length + 1} مدارس</span>
                                </span>
                              </div>
                            )}
                          </td>
                          <td className="p-3 font-mono text-slate-600">{staff.nationalId}</td>
                          <td className="p-3">
                            {getRoleBadge(staff)}
                          </td>
                          <td className="p-3 font-mono text-slate-600">{staff.mobile || '--'}</td>
                          <td className="p-3">
                            {staff.assignedClasses && staff.assignedClasses.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {staff.assignedClasses.map((c, i) => (
                                  <span key={i} className="px-1.5 py-0.5 rounded-md bg-indigo-50 border border-indigo-200 text-indigo-800 text-[10px] font-medium">
                                    {c.className} ({c.sectionName})
                                  </span>
                                ))}
                              </div>
                            ) : staff.role === 'teacher' ? (
                              <span className="text-amber-600 text-[11px]">جميع الفصول</span>
                            ) : (
                              <span className="text-slate-400 text-[11px]">إدارة عامة</span>
                            )}
                          </td>
                          <td className="p-3 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              {/* Direct WhatsApp Share */}
                              <a
                                href={inv.whatsappUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold text-[11px] flex items-center gap-1"
                                title="إرسال رابط الدخول السريع في واتساب"
                              >
                                <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                                <span>واتساب</span>
                              </a>

                              {/* Copy Direct Magic Link */}
                              <button
                                onClick={() => handleCopyDirectLink(staff)}
                                className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                                  copiedId === staff.id 
                                    ? 'bg-emerald-600 text-white border-emerald-600' 
                                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                                }`}
                                title="نسخ رابط الدخول المباشر السريع"
                              >
                                {copiedId === staff.id ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                              </button>

                              {/* Edit Staff */}
                              <button
                                onClick={() => handleStartEdit(staff)}
                                className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg cursor-pointer"
                                title="تعديل بيانات المعلم والفصول"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>

                              {/* Delete Staff */}
                              <button
                                onClick={() => handleDeleteStaff(staff.id)}
                                className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                                title="حذف"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: FORM (ADD / EDIT) */}
        {activeTab === 'form' && (
          <form onSubmit={handleSaveStaff} className="space-y-4 text-xs animate-fadeIn">
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
              <h4 className="font-bold text-slate-900 mb-3 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                <span>{editingUserId ? 'تعديل بيانات المعلم / الموظف' : 'إضافة معلم أو كادر إداري جديد'}</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">الاسم الثلاثي أو الرباعي *</label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: أ. فيصل خالد العتيبي"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2.5 text-slate-900 focus:outline-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">الهوية الوطنية / الإقامة (10 أرقام) *</label>
                  <input
                    type="text"
                    required
                    maxLength={10}
                    placeholder="10xxxxxxxx"
                    value={nationalId}
                    onChange={(e) => setNationalId(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2.5 text-slate-900 font-mono focus:outline-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">رقم الجوال (لإرسال رابط الدخول والواتساب)</label>
                  <input
                    type="tel"
                    placeholder="05xxxxxxxx"
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2.5 text-slate-900 font-mono focus:outline-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">الصفة الوظيفية *</label>
                  <select
                    value={staffTitle}
                    onChange={(e) => setStaffTitle(e.target.value as StaffTitle)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2.5 text-slate-900 font-bold focus:outline-indigo-500"
                  >
                    <option value="teacher">معلم (رصد الحصص والطلاب)</option>
                    <option value="vice_principal">وكيل المدرسة / شؤون الطلاب</option>
                    <option value="admin_assistant">مساعد إداري</option>
                    <option value="student_advisor">موجه طلابي / مرشد</option>
                    <option value="gatekeeper">مراقب بوابة / حارس أمن</option>
                    <option value="lab_technician">محضر مختبر / أمين مصادر</option>
                  </select>
                </div>
              </div>
            </div>

            {/* If Teacher: Assign Classes */}
            {staffTitle === 'teacher' && (
              <div className="bg-indigo-50/70 border border-indigo-200/80 rounded-2xl p-4 space-y-3">
                <span className="font-bold text-indigo-950 block">إسناد الصفوف والشعب للمعلم (لتسهيل الرصد اليومي):</span>
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={tempClassName}
                    onChange={(e) => setTempClassName(e.target.value)}
                    className="bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-800 font-medium"
                  >
                    {school.customClasses && school.customClasses.length > 0 ? (
                      school.customClasses.map((c) => (
                        <option key={c.id} value={c.className}>
                          {c.className}
                        </option>
                      ))
                    ) : (
                      <>
                        <option value="الأول المتوسط">الأول المتوسط</option>
                        <option value="الثاني المتوسط">الثاني المتوسط</option>
                        <option value="الثالث المتوسط">الثالث المتوسط</option>
                        <option value="الأول الابتدائي">الأول الابتدائي</option>
                        <option value="الأول الثانوي">الأول الثانوي</option>
                      </>
                    )}
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
                    onClick={handleAddClassToTeacher}
                    className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold cursor-pointer shadow-2xs"
                  >
                    + إضافة الفصل للقائمة
                  </button>
                </div>

                {selectedClasses.length > 0 ? (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {selectedClasses.map((c, idx) => (
                      <span
                        key={idx}
                        className="px-3 py-1 rounded-xl bg-white border border-indigo-200 text-indigo-900 font-bold flex items-center gap-1.5 shadow-2xs"
                      >
                        <span>{c.className} - فصل ({c.sectionName})</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveClassFromTeacher(idx)}
                          className="text-rose-500 hover:text-rose-700 cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] text-indigo-700">
                    * إذا لم تحدد فصولاً معينة، سيتاح للمعلم الوصول لجميع فصول المدرسة.
                  </p>
                )}
              </div>
            )}

            {/* Multi-School Assignment Section */}
            {otherSchools.length > 0 && (
              <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-4 space-y-2.5">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-amber-700" />
                  <span className="font-bold text-amber-950 text-xs">
                    إسناد مدارس إضافية للموظف / المعلم (العمل في أكثر من مدرسة بنفس الحساب):
                  </span>
                </div>
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  يمكن للمعلم أو المساعد الإداري الدخول بحسابه الموحد والتبديل السريع بين هذه المدارس مباشرة دون الحاجة لإنشاء حسابات أو كلمات مرور متعددة.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  {otherSchools.map((s) => {
                    const isChecked = managedSchoolCodes.includes(s.code);
                    return (
                      <div
                        key={s.id}
                        onClick={() => toggleSchoolAssignment(s.code)}
                        className={`p-3 rounded-xl border flex items-center gap-3 cursor-pointer select-none transition-all ${
                          isChecked
                            ? 'bg-amber-100/90 border-amber-400 text-amber-950 shadow-xs'
                            : 'bg-white border-slate-200 text-slate-700 hover:border-amber-300'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}} // Controlled by container click
                          className="w-4 h-4 accent-amber-600 rounded cursor-pointer"
                        />
                        <div className="min-w-0 flex-1">
                          <span className="block text-xs font-bold truncate">{s.name}</span>
                          <span className="text-[10px] text-slate-500 font-mono">كود: {s.code}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setActiveTab('list')}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black shadow-md shadow-indigo-600/20 flex items-center gap-1.5 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>{editingUserId ? 'حفظ التعديلات ↵' : 'حفظ وإضافة الكادر ↵'}</span>
              </button>
            </div>
          </form>
        )}

      </div>
    </div>
  );
};
