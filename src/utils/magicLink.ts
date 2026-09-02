import { User, School } from '../types';

export interface MagicTokenPayload {
  userId: string;
  role: string;
  schoolCode: string;
  exp: number;
}

/**
 * Encodes a magic link token
 */
export function generateMagicToken(user: User): string {
  const payload: MagicTokenPayload = {
    userId: user.id,
    role: user.role,
    schoolCode: user.schoolCode,
    exp: Date.now() + 1000 * 60 * 60 * 24 * 30, // 30 days
  };
  return btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
}

/**
 * Parses and decodes a magic token from URL
 */
export function parseMagicToken(token: string): MagicTokenPayload | null {
  try {
    const jsonStr = decodeURIComponent(escape(atob(token)));
    const data = JSON.parse(jsonStr) as MagicTokenPayload;
    if (data.exp && data.exp < Date.now()) {
      return null; // Expired
    }
    return data;
  } catch {
    return null;
  }
}

/**
 * Builds the magic link URL
 */
export function buildMagicLinkUrl(user: User): string {
  const baseUrl = window.location.origin + window.location.pathname;
  const token = generateMagicToken(user);
  return `${baseUrl}?token=${token}`;
}

export function parseParentRegistrationToken(token: string): { schoolCode: string } | null {
  try {
    const jsonStr = decodeURIComponent(escape(atob(token)));
    const data = JSON.parse(jsonStr);
    if (data && data.schoolCode) {
      return { schoolCode: data.schoolCode };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Builds direct WhatsApp invitation for teacher
 */
export function buildTeacherWhatsAppInvitation(teacher: User, schoolName: string): {
  message: string;
  whatsappUrl: string;
} {
  const magicUrl = buildMagicLinkUrl(teacher);
  const message = `السلام عليكم أ/ ${teacher.name}،
دعوة لانضمامكم إلى نظام "حضورك" الذكي لإدارة حضور وفصول (${schoolName}) 🏫

🔗 رابط الدخول المباشر السريع لفصولكم:
${magicUrl}

📌 بيانات الدخول اليدوي:
- رقم الهوية: ${teacher.nationalId}
- كود المدرسة: ${teacher.schoolCode}

نتمنى لكم يوماً دراسياً موفقاً 🌟`;

  const encodedMsg = encodeURIComponent(message);
  const whatsappUrl = teacher.mobile
    ? `https://wa.me/966${teacher.mobile.replace(/^0/, '')}?text=${encodedMsg}`
    : `https://wa.me/?text=${encodedMsg}`;

  return { message, whatsappUrl };
}

/**
 * Builds direct WhatsApp invitation for parent
 */
export function buildParentWhatsAppInvitation(parent: User, schoolName: string): {
  message: string;
  whatsappUrl: string;
} {
  const magicUrl = buildMagicLinkUrl(parent);
  const message = `السلام عليكم ورحمة الله،
ولي أمر الطالب الكريم (${parent.name}) في (${schoolName}) 🌹

نرحب بكم في بوابة ولي الأمر الذكية لمتابعة الحضور والغياب اليومي والأعذار لأبنائكم:
${magicUrl}

رقم الهوية المسجل: ${parent.nationalId}

شاكرين تعاونكم المستمر معنا 🏫`;

  const encodedMsg = encodeURIComponent(message);
  const whatsappUrl = parent.mobile
    ? `https://wa.me/966${parent.mobile.replace(/^0/, '')}?text=${encodedMsg}`
    : `https://wa.me/?text=${encodedMsg}`;

  return { message, whatsappUrl };
}

/**
 * Builds the direct URL for parents to self-register themselves and their students into a school
 */
export function buildSchoolRegistrationUrl(schoolCode: string): string {
  const baseUrl = window.location.origin + window.location.pathname;
  return `${baseUrl}?joinSchool=${encodeURIComponent(schoolCode)}&action=register`;
}

/**
 * Builds the direct WhatsApp invitation for parents with self-registration link
 */
export function buildParentRegistrationWhatsAppInvitation(school: School): {
  message: string;
  whatsappUrl: string;
  registrationUrl: string;
} {
  const registrationUrl = buildSchoolRegistrationUrl(school.code);
  const message = `السلام عليكم ورحمة الله وبركاته،
أولياء الأمور الكرام في (${school.name}) 🌹

حرصاً منا على تعزيز الانضباط المدرسي ومتابعة الحضور والغياب اليومي والأعذار، ندعوكم للتسجيل وتسكين أبنائكم في فصولهم عبر منصة "حضورك" الذكية.

🔗 رابط تسجيل وانضمام الطلاب وأولياء الأمور المباشر:
${registrationUrl}

📌 خطوات التسجيل السريعة:
1. افتح الرابط أعلاه.
2. أدخل بيانات ولي الأمر (الهوية ورقم الجوال).
3. اختر الصف والفصل الدراسي لابنك/ابنتك ليتم تسكينه في النظام فوراً.

شاكرين لكم حسن تعاونكم الدائم معنا 🏫✨`;

  const encodedMsg = encodeURIComponent(message);
  const whatsappUrl = `https://wa.me/?text=${encodedMsg}`;

  return { message, whatsappUrl, registrationUrl };
}

/**
 * Builds the direct URL for staff and teachers to self-register / join a school
 */
export function buildStaffRegistrationUrl(schoolCode: string): string {
  const baseUrl = window.location.origin + window.location.pathname;
  return `${baseUrl}?joinStaff=${encodeURIComponent(schoolCode)}&action=staffRegister`;
}

/**
 * Builds the direct WhatsApp invitation for teachers and administrative staff
 */
export function buildStaffRegistrationWhatsAppInvitation(school: School): {
  message: string;
  whatsappUrl: string;
  registrationUrl: string;
} {
  const registrationUrl = buildStaffRegistrationUrl(school.code);
  const message = `السلام عليكم ورحمة الله وبركاته،
الزملاء الأعزاء من المعلمين والكادر الإداري في (${school.name}) 🏫

ندعوكم للانضمام وتأكيد بياناتكم وفصولكم المسندة في منصة "حضورك" الذكية لرصد الحضور والانضباط المدرسي.

🔗 رابط انضمام وتسجيل الكادر والمعلمين:
${registrationUrl}

📌 خطوات سريعة:
1. الدخول على الرابط.
2. تسجيل الاسم، رقم الهوية الوطنية، ورقم الجوال.
3. تحديد الصفوف والشعب المسندة إليكم لتسهيل رصد الحصص والطلاب.

شاكرين جهودكم وعطاءكم الدائم 🌟`;

  const encodedMsg = encodeURIComponent(message);
  const whatsappUrl = `https://wa.me/?text=${encodedMsg}`;

  return { message, whatsappUrl, registrationUrl };
}

