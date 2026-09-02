export type UserRole = 'student' | 'teacher' | 'employee' | 'parent' | 'superadmin' | 'guest';

export type StaffTitle = 
  | 'principal' 
  | 'vice_principal' 
  | 'teacher' 
  | 'admin_assistant' 
  | 'student_advisor' 
  | 'gatekeeper' 
  | 'lab_technician' 
  | 'other';

export interface SchoolClassSection {
  id: string;
  className: string;
  sections: string[];
}

export interface School {
  id: string;
  code: string;
  name: string;
  city: string;
  type: 'elementary' | 'middle' | 'secondary' | 'quran';
  lat: number;
  lng: number;
  radiusMeters: number;
  subscriptionPlan: 'trial' | 'semester' | 'yearly' | 'free_forever';
  subscriptionStatus: 'active' | 'expired' | 'pending_payment';
  subscriptionStartDate: string;
  subscriptionEndDate: string;
  contactMobile: string;
  isQuranSchool?: boolean;
  customClasses?: SchoolClassSection[];
}

export interface User {
  id: string;
  nationalId: string;
  name: string;
  mobile?: string;
  parentMobile?: string;
  password?: string;
  role: UserRole;
  staffTitle?: StaffTitle;
  schoolCode: string;
  className?: string;
  sectionName?: string;
  avatar?: string; // صورة الطالب / العضو الشخصية
  lastAbsenceResetDate?: string; // تاريخ آخر إجراء وإعادة ضبط عداد الغياب
  childrenNationalIds?: string[];
  assignedClasses?: { className: string; sectionName: string }[];
  managedSchoolCodes?: string[]; // المدارس التابعة للمدير (بحد أقصى مدرستين)
}

export interface AdministrativeAbsenceAction {
  id: string;
  studentId: string;
  studentName: string;
  nationalId: string;
  schoolCode: string;
  className: string;
  sectionName: string;
  absenceCount: number;
  actionType: 'first_warning' | 'parent_pledge' | 'counselor_referral' | 'disciplinary_committee' | 'custom';
  actionTitle: string;
  notes: string;
  recordedById: string;
  recordedByName: string;
  recordedByRole: string;
  resetCycle: boolean;
  date: string;
  createdAt: string;
}

export type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';

export type PermissionReason = 
  | 'restroom' 
  | 'nurse' 
  | 'water' 
  | 'administration' 
  | 'library' 
  | 'prayer' 
  | 'other';

export type BehaviorType = 'positive' | 'negative' | 'compensatory';

export interface StudentBehaviorLog {
  id: string;
  studentId: string;
  studentName: string;
  nationalId: string;
  schoolCode: string;
  className: string;
  sectionName: string;
  date: string; // YYYY-MM-DD
  time?: string;
  type: BehaviorType;
  points: number; // e.g. 1, 2, 3, 5
  title: string;
  category: string;
  notes?: string;
  recordedById: string;
  recordedByName: string;
  recordedByRole: 'teacher' | 'employee' | 'student_advisor' | 'admin';
  createdAt: string;
}

export interface StudentPermission {
  id: string;
  studentId: string;
  studentName: string;
  nationalId: string;
  schoolCode: string;
  className: string;
  sectionName: string;
  date: string; // YYYY-MM-DD
  timeOut: string; // HH:mm
  timeIn?: string | null; // HH:mm if returned
  durationMinutes?: number;
  teacherId: string;
  teacherName: string;
  reason: PermissionReason;
  notes?: string;
  createdAt: string;
}

export interface Attendance {
  id: string;
  studentId: string;
  studentName: string;
  nationalId: string;
  schoolCode: string;
  className: string;
  sectionName: string;
  date: string;
  selfCheckTime?: string | null;
  teacherMark?: AttendanceStatus | null;
  finalStatus: AttendanceStatus;
  isTruant?: boolean; // Detected as truant (self present but teacher absent)
  parentMobile?: string;
  excuseReason?: string;
  excuseType?: 'medical' | 'official' | 'emergency' | 'other';
  excuseStatus?: 'pending' | 'accepted' | 'rejected';
  excuseAttachment?: string;
  excuseSubmittedBy?: 'student' | 'parent';
  excuseSubmittedAt?: string;
  adminDecisionNotes?: string;
  // Gate Checkout & Exit fields
  exitTime?: string | null; // وقت انصراف / خروج الطالب من البوابة
  exitReason?: 'dismissal' | 'early_permission' | 'medical_emergency' | 'other';
  exitConfirmedBy?: string; // اسم أو دور مسجل الخروج
  pickupPersonName?: string; // اسم المستلم أو ولي الأمر عند الخروج المبكر
}

export interface CorrectionRequest {
  id: string;
  attendanceId: string;
  studentId: string;
  studentName: string;
  nationalId?: string;
  schoolCode: string;
  className: string;
  sectionName: string;
  date: string;
  requestedByRole: 'parent' | 'student' | 'teacher';
  requesterName: string;
  previousStatus: AttendanceStatus;
  requestedStatus: AttendanceStatus;
  reason: string;
  excuseType?: 'medical' | 'official' | 'emergency' | 'other';
  attachmentUrl?: string;
  status: 'pending' | 'approved' | 'rejected';
  adminDecisionNotes?: string;
  createdAt: string;
}

export interface SubscriptionPaymentRequest {
  id: string;
  schoolCode: string;
  schoolName: string;
  plan: 'semester' | 'yearly' | 'free_forever';
  amount: number;
  senderName: string;
  senderBank: string;
  referenceNumber: string;
  proofImageUrl?: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

export interface SystemNotification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'alert' | 'success';
  targetRole?: UserRole | 'all';
  schoolCode?: string;
  priority?: 'normal' | 'urgent' | 'emergency';
  broadcastType?: 'early_dismissal' | 'school_suspended' | 'general_announcement';
  senderName?: string;
  createdAt: string;
  read?: boolean;
}
