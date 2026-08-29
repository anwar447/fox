export type UserRole = 'employee' | 'teacher' | 'student' | 'parent' | 'superadmin';

export interface SchoolTimings {
  tabour: string; // e.g. "06:45"
  firstPeriod: string; // e.g. "07:00"
  lateAfter: string; // e.g. "07:15"
  absentAfter: string; // e.g. "07:45"
  breakTime: string; // e.g. "09:30"
  dismissal: string; // e.g. "12:45"
}

export interface Geofence {
  lat: number;
  lng: number;
  radius: number; // in meters (100 - 1000m)
  addressName?: string;
}

export type SubscriptionPlan = 'free_forever' | 'free_trial' | 'semester' | 'yearly' | 'bronze' | 'silver' | 'gold';
export type SubscriptionStatus = 'active' | 'expiring_soon' | 'expired' | 'suspended';

export interface SchoolClassSection {
  id: string;
  className: string; // e.g. "الأول الثانوي" or "1314"
  classCode?: string; // e.g. "1314"
  sections: string[]; // e.g. ["1", "2", "3"] or ["أ", "ب", "ج"]
}

export interface School {
  id: string;
  name: string;
  code: string; // e.g. "RAYA-1448" or "SAQR-1448"
  logo?: string;
  city: string;
  educationOffice?: string;
  type: 'elementary' | 'intermediate' | 'secondary' | 'combined';
  contact: string;
  managerName: string;
  timings: SchoolTimings;
  geofence: Geofence;
  createdBy: string;
  isSuspended?: boolean;
  
  // Custom Classes & Sections configured by the school employee
  customClasses?: SchoolClassSection[];

  // Super Admin / Owner License & Subscription properties
  subscriptionPlan: SubscriptionPlan;
  subscriptionStartDate: string; // YYYY-MM-DD
  subscriptionExpiryDate: string; // YYYY-MM-DD
  maxStudents: number;
  notes?: string;
  
  createdAt: string;
}

export interface User {
  id: string;
  nationalId: string; // هوية / رقم الطالب
  name: string;
  mobile?: string; // جوال الطالب أو المستخدم
  parentMobile?: string; // رقم جوال ولي الأمر من الكشوفات
  email?: string;
  password: string; // last 4 digits of ID default
  role: UserRole;
  schoolCode: string;
  photoUrl?: string; // Student & Staff Profile Photo
  className?: string; // e.g. "الأول المتوسط", "الأول الثانوي", "1314"
  classCode?: string; // e.g. "1314"
  sectionName?: string; // e.g. "1", "2", "أ", "ب", "ج", "د", "هـ"
  isAssistant?: boolean;
  assistantPermissions?: {
    canManageAttendance: boolean;
    canApproveExcuses: boolean;
    canBroadcastEmergency: boolean;
    canManageStudents: boolean;
  };
  assignedGrades?: string[]; // for teachers
  assignedSections?: string[]; // for teachers
  childrenNationalIds?: string[]; // for parents
}

export type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';

export interface Attendance {
  id: string;
  studentId: string;
  studentName: string;
  nationalId: string;
  schoolCode: string;
  className: string; // مقروء
  sectionName: string; // أ، ب، ج أو 1، 2
  date: string; // YYYY-MM-DD
  selfCheckTime: string | null; // HH:mm:ss when student registered via mobile inside fence
  teacherMark: AttendanceStatus | null; // marked by teacher
  finalStatus: AttendanceStatus;
  isTruant: boolean; // true if selfCheckTime != null && teacherMark === 'absent' (كشف الهارب)
  overrideLocation?: boolean;
  photoUrl?: string;
  parentMobile?: string;
  excuseReason?: string;
  teacherId?: string; // ID or national ID of the teacher who recorded the absence
  teacherName?: string; // Name of the teacher who recorded the absence
  updatedAt?: string;
}

export interface Excuse {
  id: string;
  studentId: string;
  studentName: string;
  nationalId: string;
  schoolCode: string;
  className: string;
  sectionName: string;
  date: string; // the date of absence
  type: 'medical' | 'family' | 'other';
  description: string;
  file?: string; // base64 / dataUrl (compressed image or pdf)
  fileName?: string;
  fileType?: 'image' | 'pdf';
  parentNote?: string;
  status: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  submittedAt: string;
}

export interface EmergencyResponse {
  userId: string;
  userName: string;
  role: UserRole;
  status: 'safe' | 'needs_help' | 'acknowledged';
  respondedAt: string;
  note?: string;
}

export interface Emergency {
  id: string;
  schoolCode: string;
  message: string;
  type: 'rain' | 'maintenance' | 'early_dismissal' | 'security' | 'other';
  date: string;
  createdAt: string;
  active: boolean;
  responses: EmergencyResponse[];
}

export interface NoorComparison {
  date: string;
  schoolCode: string;
  className: string;
  sectionName: string;
  noorCount: number;
  actualCount: number;
  diff: number;
  lastUpdated: string;
}

export interface InAppNotification {
  id: string;
  title: string;
  body: string;
  type: 'emergency' | 'attendance' | 'truant' | 'subscription' | 'excuse' | 'behavior' | 'general';
  timestamp: string;
  read: boolean;
  schoolCode?: string;
  targetRole?: UserRole | 'all';
  targetUserId?: string;
  linkAction?: string;
}

export interface BehaviorDeduction {
  id: string;
  studentId: string;
  studentNationalId: string;
  studentName: string;
  schoolCode: string;
  className?: string;
  sectionName?: string;
  type: 'tardiness' | 'manual_deduction' | 'teacher_note_approved';
  points: number; // e.g. 1 for morning tardiness, 2 to 15 for administrative infractions
  reason: string;
  notes?: string;
  date: string; // YYYY-MM-DD
  recordedBy: string; // 'نظام الانضباط الآلي' or Admin name
  recordedByName?: string;
  teacherNoteId?: string;
  notifiedParent?: boolean;
  createdAt: string;
}

export interface BehaviorNote {
  id: string;
  studentId: string;
  studentNationalId: string;
  studentName: string;
  schoolCode: string;
  className: string;
  sectionName: string;
  teacherId: string;
  teacherName: string;
  category: 'classroom_disruption' | 'homework_neglect' | 'unauthorized_device' | 'disrespect' | 'uniform_violation' | 'fighting' | 'late_to_class' | 'other';
  categoryLabel: string;
  description: string;
  date: string;
  createdAt: string;
  status: 'pending' | 'resolved_with_deduction' | 'resolved_warning_only' | 'dismissed';
  adminDecisionNote?: string;
  deductedPoints?: number;
  resolvedBy?: string;
  resolvedAt?: string;
}

