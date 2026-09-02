import React, { useState } from 'react';
import { School, User, StudentPermission, PermissionReason } from '../types';
import { 
  getPermissions, savePermissions, addPermission, 
  getExitPermissionsTodayForSchool, getUsers, addSystemNotification 
} from '../utils/storage';
import { soundManager } from '../utils/audio';
import { getTodayDateString } from '../utils/academic';
import { 
  LogOut, ShieldAlert, CheckCircle, Clock, X, Search, 
  User as UserIcon, Phone, FileText, Check, AlertCircle, 
  Printer, Send, Sparkles, Building2, UserCheck, ShieldCheck
} from 'lucide-react';

interface AdminStudentExitModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  school: School;
  initialStudent?: User | null;
  preSelectedStudent?: User | null;
  onIssued?: () => void;
  onExitPermissionCreated?: () => void;
}

export const AdminStudentExitModal: React.FC<AdminStudentExitModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  school,
  initialStudent,
  preSelectedStudent,
  onIssued,
  onExitPermissionCreated,
}) => {
  const [selectedStudent, setSelectedStudent] = useState<User | null>(initialStudent || preSelectedStudent || null);
  const [studentSearch, setStudentSearch] = useState('');
  const [reason, setReason] = useState<PermissionReason>('medical_appointment');
  const [pickupRelation, setPickupRelation] = useState<'parent' | 'driver' | 'relative' | 'alone'>('parent');
  const [pickupPersonName, setPickupPersonName] = useState('');
  const [pickupPhone, setPickupPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [notifyParent, setNotifyParent] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [selectedPassForPrint, setSelectedPassForPrint] = useState<StudentPermission | null>(null);

  if (!isOpen) return null;

  const today = getTodayDateString();
  const allSchoolStudents = getUsers().filter(
    (u) => u.role === 'student' && u.schoolCode === school.code
  );

  const filteredStudents = allSchoolStudents.filter((st) => {
    if (!studentSearch.trim()) return true;
    const q = studentSearch.toLowerCase().trim();
    return (
      st.name.toLowerCase().includes(q) ||
      st.nationalId.includes(q) ||
      (st.className && st.className.toLowerCase().includes(q))
    );
  });

  const todayExitPasses = getExitPermissionsTodayForSchool(school.code, today);

  const reasonLabels: Record<PermissionReason, string> = {
    medical_appointment: 'موعد طبي / مراجعة مستشفى 🏥',
    family_emergency: 'ظرف عائلي طارئ 👨‍👩‍👧',
    parent_request: 'استدعاء وطلب رسمي من ولي الأمر 📞',
    nurse: 'إعياء صحي / تحويل من المرشد الصحي 🩺',
    official_activity: 'مشاركة في مسابقة / تمثيل المدرسة 🏆',
    early_dismissal: 'انصراف مبكر معتمد من الإدارة 🚪',
    restroom: 'استئذان اعتيادي',
    water: 'شرب ماء',
    administration: 'مراجعة الإدارة',
    library: 'المكتبة',
    prayer: 'المصلى',
    other: 'سبب آخر معتمد 📝',
  };

  const handleSelectStudent = (st: User) => {
    setSelectedStudent(st);
    if (st.parentMobile && !pickupPhone) {
      setPickupPhone(st.parentMobile);
    }
  };

  const handleCreateExitPermission = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) return;

    setIsSubmitting(true);
    const now = new Date();
    const timeOutStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const relationLabel = 
      pickupRelation === 'parent' ? 'ولي الأمر' :
      pickupRelation === 'driver' ? 'السائق المعتمد' :
      pickupRelation === 'relative' ? 'أحد الأقارب المفوضين' : 'بمفرده بموافقة ولي الأمر';

    const finalPickupPerson = pickupPersonName.trim() 
      ? `${pickupPersonName.trim()} (${relationLabel})`
      : relationLabel;

    const newPass: StudentPermission = {
      id: `perm-exit-${Date.now()}`,
      studentId: selectedStudent.id,
      studentName: selectedStudent.name,
      nationalId: selectedStudent.nationalId,
      schoolCode: school.code,
      className: selectedStudent.className || 'عام',
      sectionName: selectedStudent.sectionName || '1',
      date: today,
      timeOut: timeOutStr,
      timeIn: null,
      teacherId: currentUser.id,
      teacherName: currentUser.name,
      approvedByRole: currentUser.staffTitle || currentUser.role,
      reason: reason,
      permissionType: 'school_exit',
      exitGateStatus: 'pending_guard_approval',
      pickupPerson: finalPickupPerson,
      pickupRelation: relationLabel,
      pickupPhone: pickupPhone.trim() || selectedStudent.parentMobile || undefined,
      notes: notes.trim() || undefined,
      createdAt: new Date().toISOString(),
    };

    addPermission(newPass);

    // Add alert notification for Gatekeeper and Staff
    addSystemNotification({
      id: `notif-exit-${Date.now()}`,
      schoolCode: school.code,
      title: '🚪 تصريح خروج طالب معتمد',
      message: `تم إصدار تصريح خروج للطالب (${selectedStudent.name}) - في انتظار تأكيد حارس البوابة.`,
      type: 'warning',
      createdAt: new Date().toISOString(),
      read: false,
    });

    soundManager.playSuccess();
    setSuccessMsg(`✅ تم إصدار تصريح الخروج بنجاح للطالب: ${selectedStudent.name}. تم إشعار حارس البوابة فوراً.`);
    setIsSubmitting(false);
    setSelectedPassForPrint(newPass);

    if (onIssued) {
      onIssued();
    }
    if (onExitPermissionCreated) {
      onExitPermissionCreated();
    }

    // Reset inputs
    setNotes('');
    setPickupPersonName('');
    setTimeout(() => {
      setSuccessMsg('');
    }, 4000);
  };

  const handleCancelPermission = (permId: string) => {
    if (!window.confirm('هل أنت متأكد من إلغاء تصريح الخروج؟')) return;
    const list = getPermissions();
    const idx = list.findIndex((p) => p.id === permId);
    if (idx >= 0) {
      list[idx].exitGateStatus = 'cancelled';
      savePermissions(list);
      soundManager.playBeep();
      if (onExitPermissionCreated) {
        onExitPermissionCreated();
      }
    }
  };

  return (
    <div 
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fadeIn" 
      dir="rtl"
    >
      <div className="bg-white border border-slate-200 rounded-3xl max-w-3xl w-full p-6 text-right space-y-5 shadow-2xl text-slate-800 my-auto">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-500 text-white flex items-center justify-center font-bold shadow-md shadow-amber-500/20">
              <LogOut className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-slate-900">
                  إصدار تصريح خروج طالب رسمي (إذن انصراف)
                </h3>
                <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 font-bold text-[11px] border border-amber-200">
                  ربط مباشر مع ماسح البوابة 🚪
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                يصدر من الإدارة ويظهر فوراً على شاشة حارس البوابة ليقوم بتأكيد تسليم وخروج الطالب
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Feedback message */}
        {successMsg && (
          <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center gap-2 animate-fadeIn">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-bold">{successMsg}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          
          {/* Left / Main form: 7 cols */}
          <div className="lg:col-span-7 space-y-4">
            
            {/* 1. Student Picker */}
            <div>
              <label className="block text-xs font-black text-slate-800 mb-1.5">
                1. اختيار الطالب المستأذن *
              </label>

              {selectedStudent ? (
                <div className="p-3 bg-slate-50 border-2 border-emerald-500 rounded-2xl flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs">
                      {selectedStudent.name.charAt(0)}
                    </div>
                    <div>
                      <strong className="text-slate-900 font-bold text-xs block">{selectedStudent.name}</strong>
                      <span className="text-[11px] text-slate-500">
                        {selectedStudent.className} - فصل {selectedStudent.sectionName} | هوية: {selectedStudent.nationalId}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedStudent(null)}
                    className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-rose-600 text-xs font-bold cursor-pointer"
                  >
                    تغيير
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
                    <input
                      type="text"
                      placeholder="ابحث باسم الطالب أو رقم الهوية أو الفصل..."
                      value={studentSearch}
                      onChange={(e) => setStudentSearch(e.target.value)}
                      className="w-full pr-9 pl-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-emerald-500"
                    />
                  </div>
                  <div className="max-h-36 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100 bg-white">
                    {filteredStudents.length === 0 ? (
                      <p className="p-3 text-center text-slate-400 text-xs">لم يتم العثور على طلاب مطابقين</p>
                    ) : (
                      filteredStudents.slice(0, 8).map((st) => (
                        <button
                          key={st.id}
                          type="button"
                          onClick={() => handleSelectStudent(st)}
                          className="w-full p-2.5 text-right hover:bg-emerald-50 flex items-center justify-between text-xs transition-colors cursor-pointer"
                        >
                          <div>
                            <strong className="text-slate-900 font-bold block">{st.name}</strong>
                            <span className="text-[10px] text-slate-500">{st.className} - فصل {st.sectionName}</span>
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono">{st.nationalId}</span>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* 2. Permission Form */}
            <form onSubmit={handleCreateExitPermission} className="space-y-3.5 text-xs">
              
              {/* Reason */}
              <div>
                <label className="block text-slate-700 font-bold mb-1">سبب الاستئذان والخروج *</label>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value as PermissionReason)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 font-bold focus:outline-emerald-500"
                >
                  <option value="medical_appointment">{reasonLabels.medical_appointment}</option>
                  <option value="family_emergency">{reasonLabels.family_emergency}</option>
                  <option value="parent_request">{reasonLabels.parent_request}</option>
                  <option value="nurse">{reasonLabels.nurse}</option>
                  <option value="official_activity">{reasonLabels.official_activity}</option>
                  <option value="early_dismissal">{reasonLabels.early_dismissal}</option>
                  <option value="other">{reasonLabels.other}</option>
                </select>
              </div>

              {/* Pickup Person Relation & Name */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">المستلم / المرافق *</label>
                  <select
                    value={pickupRelation}
                    onChange={(e) => setPickupRelation(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:outline-emerald-500"
                  >
                    <option value="parent">ولي الأمر شخصياً</option>
                    <option value="driver">السائق الخاص المعتمد</option>
                    <option value="relative">أحد الأقارب المفوضين</option>
                    <option value="alone">بمفرده (بموافقة ولي الأمر)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">اسم الشخص المستلم (اختياري)</label>
                  <input
                    type="text"
                    placeholder="مثال: فهد الدوسري..."
                    value={pickupPersonName}
                    onChange={(e) => setPickupPersonName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:outline-emerald-500"
                  />
                </div>
              </div>

              {/* Phone & Parent Notification */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">رقم هاتف التواصل</label>
                  <input
                    type="tel"
                    placeholder="05xxxxxxxx"
                    value={pickupPhone}
                    onChange={(e) => setPickupPhone(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 font-mono focus:outline-emerald-500"
                  />
                </div>

                <div className="flex items-center gap-2 pt-5">
                  <input
                    type="checkbox"
                    id="notifyParentCheck"
                    checked={notifyParent}
                    onChange={(e) => setNotifyParent(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 rounded-md focus:ring-emerald-500 cursor-pointer"
                  />
                  <label htmlFor="notifyParentCheck" className="text-[11px] text-slate-700 font-medium cursor-pointer">
                    إرسال إشعار فوري لولي الأمر عبر WhatsApp / SMS
                  </label>
                </div>
              </div>

              {/* Administrative Notes */}
              <div>
                <label className="block text-slate-700 font-bold mb-1">ملاحظات الإدارة / الموجه الطلابي</label>
                <input
                  type="text"
                  placeholder="مثال: تم التواصل هاتفياً مع ولي الأمر وتأكيد الموعد..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:outline-emerald-500"
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={!selectedStudent || isSubmitting}
                className="w-full py-3 rounded-2xl bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-600/25 cursor-pointer transition-all"
              >
                <LogOut className="w-4 h-4" />
                <span>إصدار تصريح الخروج وإرساله للحارس فوراً 🚪</span>
              </button>
            </form>
          </div>

          {/* Right sidebar: 5 cols (Live Exit Passes issued today) */}
          <div className="lg:col-span-5 bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <div className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-amber-600" />
                  <span className="font-bold text-xs text-slate-900">
                    تصاريح الخروج الصادرة اليوم ({todayExitPasses.length})
                  </span>
                </div>
                <span className="text-[10px] text-slate-500 font-medium">مباشر</span>
              </div>

              <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
                {todayExitPasses.length === 0 ? (
                  <div className="text-center py-8 text-slate-400 space-y-1">
                    <UserCheck className="w-8 h-8 mx-auto text-slate-300" />
                    <p className="text-xs font-medium">لا توجد تصاريح خروج مسجلة اليوم حتى الآن</p>
                  </div>
                ) : (
                  todayExitPasses.map((pass) => {
                    const isConfirmed = pass.exitGateStatus === 'confirmed_exited';
                    const isCancelled = pass.exitGateStatus === 'cancelled';

                    return (
                      <div 
                        key={pass.id} 
                        className={`p-3 rounded-xl border text-xs space-y-2 transition-all ${
                          isConfirmed 
                            ? 'bg-emerald-50/70 border-emerald-200' 
                            : isCancelled
                            ? 'bg-slate-100 border-slate-200 opacity-60'
                            : 'bg-white border-amber-200 shadow-xs'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <strong className="text-slate-900 font-bold text-xs">{pass.studentName}</strong>
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                            isConfirmed 
                              ? 'bg-emerald-200 text-emerald-900' 
                              : isCancelled
                              ? 'bg-slate-200 text-slate-600'
                              : 'bg-amber-100 text-amber-900 animate-pulse'
                          }`}>
                            {isConfirmed ? '✓ غادر البوابة' : isCancelled ? 'ملغي' : '🟡 بانتظار تأكيد الحارس'}
                          </span>
                        </div>

                        <div className="text-[11px] text-slate-600 space-y-0.5">
                          <div>
                            <span className="text-slate-400">السبب: </span>
                            <span className="font-medium text-slate-800">{reasonLabels[pass.reason] || pass.reason}</span>
                          </div>
                          {pass.pickupPerson && (
                            <div>
                              <span className="text-slate-400">المستلم: </span>
                              <span className="font-medium text-slate-800">{pass.pickupPerson}</span>
                            </div>
                          )}
                          <div className="flex justify-between items-center text-[10px] text-slate-400 pt-1 border-t border-slate-200/60">
                            <span>وقت الإذن: {pass.timeOut}</span>
                            <span>المصدر: {pass.teacherName}</span>
                          </div>
                        </div>

                        {/* Actions for pass */}
                        <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-200/60">
                          <button
                            type="button"
                            onClick={() => setSelectedPassForPrint(pass)}
                            className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                          >
                            <Printer className="w-3 h-3" />
                            <span>عرض الإشعار</span>
                          </button>
                          {!isConfirmed && !isCancelled && (
                            <button
                              type="button"
                              onClick={() => handleCancelPermission(pass.id)}
                              className="px-2 py-1 rounded-lg text-rose-600 hover:bg-rose-50 text-[10px] font-bold cursor-pointer"
                            >
                              إلغاء
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Official Pass Print Preview / Voucher */}
            {selectedPassForPrint && (
              <div className="p-3 bg-white border border-amber-300 rounded-xl space-y-2 text-xs">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-amber-950 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
                    بطاقة تصريح الخروج الرقمية
                  </span>
                  <button 
                    onClick={() => setSelectedPassForPrint(null)}
                    className="text-slate-400 hover:text-slate-700 text-[10px]"
                  >
                    ✕
                  </button>
                </div>
                <div className="p-2.5 bg-amber-50/50 rounded-lg text-[11px] space-y-1 font-mono text-slate-800 border border-amber-200/60">
                  <p><strong>الطالب:</strong> {selectedPassForPrint.studentName}</p>
                  <p><strong>المدرسة:</strong> {school.name}</p>
                  <p><strong>وقت الخروج:</strong> {selectedPassForPrint.timeOut} ({selectedPassForPrint.date})</p>
                  <p><strong>المستلم:</strong> {selectedPassForPrint.pickupPerson || 'ولي الأمر'}</p>
                  <p><strong>المعتمد:</strong> {selectedPassForPrint.teacherName}</p>
                </div>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="w-full py-1.5 rounded-lg bg-slate-900 text-white font-bold text-[11px] flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>طباعة التصريح الورقي</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="border-t border-slate-200 pt-3 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
          >
            إغلاق النافذة
          </button>
        </div>

      </div>
    </div>
  );
};
