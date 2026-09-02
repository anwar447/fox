import { Attendance, StudentBehaviorLog, AdministrativeAbsenceAction } from '../types';
import { getAttendances, getBehaviorLogs, getUsers, getAbsenceActionsForStudent } from './storage';

export interface BehaviorScoreSummary {
  studentId: string;
  baseScore: number;
  currentScore: number;
  unexcusedAbsenceCount: number;
  unexcusedAbsenceDays: Attendance[];
  unexcusedInCurrentCycleCount: number;
  unexcusedInCurrentCycleDays: Attendance[];
  hasFiveDaysAbsenceAlert: boolean;
  absenceActions: AdministrativeAbsenceAction[];
  tardinessCount: number;
  tardinessDays: Attendance[];
  positivePoints: number;
  negativePoints: number;
  compensatoryPoints: number;
  behaviorLogs: StudentBehaviorLog[];
  rating: {
    label: string;
    color: string;
    bg: string;
    badgeColor: string;
  };
}

export const POSITIVE_BEHAVIOR_PRESETS = [
  { title: 'مشاركة وتفاعل صفي متميز', points: 2, category: 'المشاركة الصفية', icon: '🌟' },
  { title: 'تعاون وأخلاق عالية ومساعدة الزملاء', points: 2, category: 'الأخلاق والتعاون', icon: '🤝' },
  { title: 'إنجاز الواجبات والتفوق الدراسي', points: 2, category: 'التفوق والواجبات', icon: '📚' },
  { title: 'المحافظة على النظافة والبيئة المدرسية', points: 1, category: 'النظافة العامة', icon: '🧼' },
  { title: 'انضباط وهدوء مثالي داخل الحصة', points: 1, category: 'الانضباط الصفي', icon: '⏱️' },
  { title: 'إبداع ومبادرة استثنائية في النشاط', points: 3, category: 'المبادرة والإبداع', icon: '💡' },
  { title: 'إتقان التلاوة وحسن الاستماع', points: 2, category: 'القرآن الكريم والأدب', icon: '📖' },
];

export const NEGATIVE_BEHAVIOR_PRESETS = [
  { title: 'تشتيت الحصة وإثارة الفوضى', points: 2, category: 'إثارة الفوضى', icon: '⚠️' },
  { title: 'عدم إحضار الكتب والأدوات المدرسية', points: 1, category: 'إهمال الأدوات', icon: '🚫' },
  { title: 'النوم أو إهمال المشاركة في الصف', points: 1, category: 'قلة التفاعل', icon: '💤' },
  { title: 'مقاطعة المعلم أو سلوك غير لائق', points: 2, category: 'سلوك صفي', icon: '🗣️' },
  { title: 'الخروج من الفصل دون استئذان مسبق', points: 3, category: 'مخالفة النظام', icon: '🏃' },
  { title: 'استخدام الجوال أثناء الدرس', points: 2, category: 'مخالفة الأجهزة', icon: '📱' },
  { title: 'إهمال الواجبات المدرسية المتكرر', points: 1, category: 'إهمال الواجبات', icon: '📝' },
];

export const COMPENSATORY_OPPORTUNITY_PRESETS = [
  { title: 'المشاركة المتميزة في الإذاعة المدرسية', points: 2, category: 'النشاط والإذاعة', icon: '🎙️' },
  { title: 'عمل تطوعي وخدمة البيئة المدرسية', points: 3, category: 'العمل التطوعي', icon: '🤝' },
  { title: 'تحسن ملحوظ وانضباط تام لمدة أسبوع كامل', points: 3, category: 'تحسن الانضباط', icon: '📈' },
  { title: 'التفوق في مسابقة أو نشاط لاصفي', points: 3, category: 'المسابقات والأنشطة', icon: '🏆' },
  { title: 'إنجاز بحث أو مشروع صفي تعويضي معتمد', points: 2, category: 'المهام التعويضية', icon: '📝' },
  { title: 'المساعدة الإيجابية في تنظيم اليوم المدرسي', points: 2, category: 'المبادرات الإدارية', icon: '🌟' },
];

export function calculateStudentBehaviorScore(studentId: string): BehaviorScoreSummary {
  const allAttendances = getAttendances().filter((a) => a.studentId === studentId);
  const allLogs = getBehaviorLogs().filter((b) => b.studentId === studentId);
  const studentUser = getUsers().find((u) => u.id === studentId);
  const absenceActions = getAbsenceActionsForStudent(studentId);

  // 1. All Unexcused Absences: status is 'absent' and excuse is not accepted
  const unexcusedAbsenceDays = allAttendances.filter(
    (a) => a.finalStatus === 'absent' && a.excuseStatus !== 'accepted'
  );
  const unexcusedAbsenceCount = unexcusedAbsenceDays.length;

  // 1.5 Unexcused Absences in current active cycle (since last reset date if set)
  let unexcusedInCurrentCycleDays = unexcusedAbsenceDays;
  if (studentUser?.lastAbsenceResetDate) {
    unexcusedInCurrentCycleDays = unexcusedAbsenceDays.filter(
      (a) => a.date > (studentUser.lastAbsenceResetDate || '')
    );
  }
  const unexcusedInCurrentCycleCount = unexcusedInCurrentCycleDays.length;
  const hasFiveDaysAbsenceAlert = unexcusedInCurrentCycleCount >= 5;

  // 2. Tardiness: status is 'late'
  const tardinessDays = allAttendances.filter((a) => a.finalStatus === 'late');
  const tardinessCount = tardinessDays.length;

  // 3. Behavior Logs Breakdown
  let positivePoints = 0;
  let negativePoints = 0;
  let compensatoryPoints = 0;

  allLogs.forEach((log) => {
    if (log.type === 'positive') {
      positivePoints += log.points;
    } else if (log.type === 'negative') {
      negativePoints += log.points;
    } else if (log.type === 'compensatory') {
      compensatoryPoints += log.points;
    }
  });

  // Base is 100 points
  const baseScore = 100;
  // Penalty deductions (1 point per unexcused absence, 1 point per tardiness, plus negative behavior logs)
  const totalDeductions = unexcusedAbsenceCount * 1 + tardinessCount * 1 + negativePoints;
  const totalBonuses = positivePoints + compensatoryPoints;

  const rawScore = baseScore - totalDeductions + totalBonuses;
  const currentScore = Math.max(0, Math.min(100, rawScore));

  let rating = {
    label: 'ممتاز ⭐',
    color: 'text-emerald-700',
    bg: 'bg-emerald-50 border-emerald-200',
    badgeColor: 'bg-emerald-600 text-white',
  };

  if (currentScore >= 90) {
    rating = {
      label: 'ممتاز ⭐',
      color: 'text-emerald-700',
      bg: 'bg-emerald-50 border-emerald-200',
      badgeColor: 'bg-emerald-600 text-white',
    };
  } else if (currentScore >= 80) {
    rating = {
      label: 'جيد جداً 👍',
      color: 'text-teal-700',
      bg: 'bg-teal-50 border-teal-200',
      badgeColor: 'bg-teal-600 text-white',
    };
  } else if (currentScore >= 70) {
    rating = {
      label: 'جيد ⚖️',
      color: 'text-indigo-700',
      bg: 'bg-indigo-50 border-indigo-200',
      badgeColor: 'bg-indigo-600 text-white',
    };
  } else if (currentScore >= 60) {
    rating = {
      label: 'مقبول ⚠️',
      color: 'text-amber-700',
      bg: 'bg-amber-50 border-amber-200',
      badgeColor: 'bg-amber-600 text-white',
    };
  } else {
    rating = {
      label: 'يحتاج تحسين وفرص تعويضية 🚨',
      color: 'text-rose-700',
      bg: 'bg-rose-50 border-rose-200',
      badgeColor: 'bg-rose-600 text-white',
    };
  }

  return {
    studentId,
    baseScore,
    currentScore,
    unexcusedAbsenceCount,
    unexcusedAbsenceDays,
    unexcusedInCurrentCycleCount,
    unexcusedInCurrentCycleDays,
    hasFiveDaysAbsenceAlert,
    absenceActions,
    tardinessCount,
    tardinessDays,
    positivePoints,
    negativePoints,
    compensatoryPoints,
    behaviorLogs: allLogs,
    rating,
  };
}
