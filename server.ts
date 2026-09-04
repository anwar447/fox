import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json({ limit: '20mb' }));

// Persistence directory
const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

interface DatabaseSchema {
  schools: any[];
  users: any[];
  attendances: any[];
  permissions: any[];
  behavior_logs: any[];
  absence_actions: any[];
  corrections: any[];
  payments: any[];
  notifications: any[];
}

const DEFAULT_SUPERADMIN = {
  id: 'usr-admin-1',
  nationalId: '1000000000',
  name: 'المشرف العام (سوبر ادمن)',
  mobile: '0500000000',
  password: 'admin',
  role: 'superadmin',
  schoolCode: 'SUPERADMIN',
};

function getInitialDB(): DatabaseSchema {
  return {
    schools: [],
    users: [DEFAULT_SUPERADMIN],
    attendances: [],
    permissions: [],
    behavior_logs: [],
    absence_actions: [],
    corrections: [],
    payments: [],
    notifications: [],
  };
}

function loadDatabase(): DatabaseSchema {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(DB_FILE)) {
      const initial = getInitialDB();
      fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2), 'utf-8');
      return initial;
    }
    const content = fs.readFileSync(DB_FILE, 'utf-8');
    const data = JSON.parse(content);
    // Ensure structure
    return {
      schools: Array.isArray(data.schools) ? data.schools : [],
      users: Array.isArray(data.users) && data.users.length > 0 ? data.users : [DEFAULT_SUPERADMIN],
      attendances: Array.isArray(data.attendances) ? data.attendances : [],
      permissions: Array.isArray(data.permissions) ? data.permissions : [],
      behavior_logs: Array.isArray(data.behavior_logs) ? data.behavior_logs : [],
      absence_actions: Array.isArray(data.absence_actions) ? data.absence_actions : [],
      corrections: Array.isArray(data.corrections) ? data.corrections : [],
      payments: Array.isArray(data.payments) ? data.payments : [],
      notifications: Array.isArray(data.notifications) ? data.notifications : [],
    };
  } catch (err) {
    console.error('Error loading database, resetting to default:', err);
    return getInitialDB();
  }
}

function saveDatabase(data: DatabaseSchema): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving database:', err);
  }
}

let db = loadDatabase();

// ========================
// API ROUTES
// ========================

// 1. Full Data Sync endpoint
app.get('/api/sync', (req, res) => {
  res.json({
    success: true,
    data: db,
  });
});

app.post('/api/sync', (req, res) => {
  const incoming = req.body;
  if (incoming) {
    if (Array.isArray(incoming.schools)) db.schools = incoming.schools;
    if (Array.isArray(incoming.users)) db.users = incoming.users;
    if (Array.isArray(incoming.attendances)) db.attendances = incoming.attendances;
    if (Array.isArray(incoming.permissions)) db.permissions = incoming.permissions;
    if (Array.isArray(incoming.behavior_logs)) db.behavior_logs = incoming.behavior_logs;
    if (Array.isArray(incoming.absence_actions)) db.absence_actions = incoming.absence_actions;
    if (Array.isArray(incoming.corrections)) db.corrections = incoming.corrections;
    if (Array.isArray(incoming.payments)) db.payments = incoming.payments;
    if (Array.isArray(incoming.notifications)) db.notifications = incoming.notifications;
    saveDatabase(db);
  }
  res.json({ success: true, data: db });
});

// 2. Schools endpoints
app.get('/api/schools', (req, res) => {
  res.json({ success: true, schools: db.schools });
});

app.get('/api/schools/:code', (req, res) => {
  const code = req.params.code;
  const school = db.schools.find((s) => s.code?.toUpperCase() === code?.toUpperCase() || s.id === code);
  if (school) {
    res.json({ success: true, school });
  } else {
    res.status(404).json({ success: false, message: 'المدرسة غير موجودة' });
  }
});

app.post('/api/schools', (req, res) => {
  const newSchool = req.body;
  if (!newSchool || !newSchool.code) {
    return res.status(400).json({ success: false, message: 'بيانات المدرسة غير مكتملة' });
  }

  const existingIdx = db.schools.findIndex(
    (s) => s.code?.toUpperCase() === newSchool.code?.toUpperCase() || s.id === newSchool.id
  );

  if (existingIdx >= 0) {
    db.schools[existingIdx] = { ...db.schools[existingIdx], ...newSchool };
  } else {
    db.schools.push(newSchool);
  }

  saveDatabase(db);
  res.json({ success: true, school: newSchool, schools: db.schools });
});

app.delete('/api/schools/:idOrCode', (req, res) => {
  const param = req.params.idOrCode;
  db.schools = db.schools.filter((s) => s.id !== param && s.code !== param);
  saveDatabase(db);
  res.json({ success: true, schools: db.schools });
});

// 3. Users endpoints
app.get('/api/users', (req, res) => {
  res.json({ success: true, users: db.users });
});

app.post('/api/users', (req, res) => {
  const newUser = req.body;
  if (!newUser || !newUser.nationalId) {
    return res.status(400).json({ success: false, message: 'بيانات المستخدم غير مكتملة' });
  }

  const existingIdx = db.users.findIndex(
    (u) => (u.nationalId === newUser.nationalId && u.schoolCode === newUser.schoolCode) || u.id === newUser.id
  );

  if (existingIdx >= 0) {
    db.users[existingIdx] = { ...db.users[existingIdx], ...newUser };
  } else {
    db.users.push(newUser);
  }

  saveDatabase(db);
  res.json({ success: true, user: newUser, users: db.users });
});

app.post('/api/users/bulk', (req, res) => {
  const newUsers = req.body;
  if (Array.isArray(newUsers)) {
    for (const u of newUsers) {
      const idx = db.users.findIndex(
        (existing) => (existing.nationalId === u.nationalId && existing.schoolCode === u.schoolCode) || existing.id === u.id
      );
      if (idx >= 0) {
        db.users[idx] = { ...db.users[idx], ...u };
      } else {
        db.users.push(u);
      }
    }
    saveDatabase(db);
  }
  res.json({ success: true, users: db.users });
});

app.delete('/api/users/:id', (req, res) => {
  const id = req.params.id;
  db.users = db.users.filter((u) => u.id !== id);
  saveDatabase(db);
  res.json({ success: true, users: db.users });
});

// 4. Attendances endpoints
app.get('/api/attendances', (req, res) => {
  res.json({ success: true, attendances: db.attendances });
});

app.post('/api/attendances', (req, res) => {
  const incoming = req.body;
  if (Array.isArray(incoming)) {
    for (const att of incoming) {
      const idx = db.attendances.findIndex((a) => a.id === att.id);
      if (idx >= 0) {
        db.attendances[idx] = att;
      } else {
        db.attendances.push(att);
      }
    }
  } else if (incoming && incoming.id) {
    const idx = db.attendances.findIndex((a) => a.id === incoming.id);
    if (idx >= 0) {
      db.attendances[idx] = incoming;
    } else {
      db.attendances.push(incoming);
    }
  }
  saveDatabase(db);
  res.json({ success: true, attendances: db.attendances });
});

// 5. Permissions endpoints
app.get('/api/permissions', (req, res) => {
  res.json({ success: true, permissions: db.permissions });
});

app.post('/api/permissions', (req, res) => {
  const perm = req.body;
  if (perm && perm.id) {
    const idx = db.permissions.findIndex((p) => p.id === perm.id);
    if (idx >= 0) {
      db.permissions[idx] = perm;
    } else {
      db.permissions.unshift(perm);
    }
    saveDatabase(db);
  }
  res.json({ success: true, permissions: db.permissions });
});

// 6. Reset all data (Complete Clean Wipe)
app.post('/api/reset-all', (req, res) => {
  db = getInitialDB();
  saveDatabase(db);
  res.json({ success: true, message: 'تم تصفير جميع المدارس والبيانات بنجاح', data: db });
});

// =========================================================================
// 7. COUNSELOR & EXTERNAL SYSTEM INTEGRATION API (REST API v1)
// =========================================================================

// Helper to authenticate API Token for Counselor / External Integration
function authenticateCounselorApi(req: express.Request, res: express.Response): { school: any; isSuperAdmin: boolean } | null {
  const authHeader = req.headers['authorization'];
  const apiKeyHeader = (req.headers['x-api-key'] || req.headers['x-token']) as string;
  const tokenQuery = (req.query.apiKey || req.query.token || req.query.api_key) as string;

  let token = '';
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7).trim();
  } else if (apiKeyHeader) {
    token = apiKeyHeader.trim();
  } else if (tokenQuery) {
    token = tokenQuery.trim();
  }

  if (!token) {
    res.status(401).json({
      success: false,
      error: 'Unauthorized',
      code: 'MISSING_API_TOKEN',
      message: 'رمز التوكن مفقود. يرجى تمرير التوكن في الترويسة Authorization: Bearer <TOKEN> أو x-api-key أو كمعلمة ?apiKey=<TOKEN>',
    });
    return null;
  }

  // Master Token for SuperAdmin
  if (token === 'hdrk_master_admin_2026' || token === 'SUPERADMIN_SECRET') {
    const requestedSchoolCode = (req.query.schoolCode as string)?.toUpperCase();
    const school = requestedSchoolCode ? db.schools.find((s: any) => s.code?.toUpperCase() === requestedSchoolCode) : db.schools[0] || null;
    return { school, isSuperAdmin: true };
  }

  // Find school matching the token
  const school = db.schools.find((s: any) => {
    if (s.apiToken && s.apiToken === token) return true;
    if (token === `hdrk_sch_${s.code?.toLowerCase()}`) return true;
    return false;
  });

  if (!school) {
    res.status(403).json({
      success: false,
      error: 'Forbidden',
      code: 'INVALID_API_TOKEN',
      message: 'رمز التوكن غير صحيح أو منتهي الصلاحية أو غير مرتبط بأي مدرسة مسجلة.',
    });
    return null;
  }

  return { school, isSuperAdmin: false };
}

// 7.1 Generate or refresh API Token for a school
app.post('/api/schools/:code/generate-api-token', (req, res) => {
  const code = req.params.code?.toUpperCase();
  const schoolIdx = db.schools.findIndex((s: any) => s.code?.toUpperCase() === code || s.id === code);
  
  if (schoolIdx < 0) {
    return res.status(404).json({ success: false, message: 'المدرسة غير موجودة' });
  }

  const randomStr = Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 10);
  const newToken = `hdrk_${code.toLowerCase()}_${randomStr}`;

  db.schools[schoolIdx].apiToken = newToken;
  saveDatabase(db);

  res.json({
    success: true,
    message: 'تم توليد رمز التوكن البرمجي للمدرسة بنجاح',
    schoolCode: code,
    apiToken: newToken,
    endpoints: {
      summary: `/api/v1/counselor/summary?apiKey=${newToken}`,
      students: `/api/v1/counselor/students?apiKey=${newToken}`,
      attendance: `/api/v1/counselor/attendance?apiKey=${newToken}`,
      behavior: `/api/v1/counselor/behavior?apiKey=${newToken}`,
      absenceActions: `/api/v1/counselor/absence-actions?apiKey=${newToken}`,
      permissions: `/api/v1/counselor/permissions?apiKey=${newToken}`,
    }
  });
});

// 7.2 API Info & School Profile
app.get('/api/v1/counselor/info', (req, res) => {
  const auth = authenticateCounselorApi(req, res);
  if (!auth) return;

  const { school } = auth;
  if (!school) {
    return res.status(404).json({ success: false, message: 'لم يتم العثور على المدرسة المطلوبة' });
  }

  res.json({
    success: true,
    system: 'منظومة حُضُورَكْ الذكية - بوابة الموجه الطلابي والربط البرمجي',
    version: '1.0.0',
    school: {
      id: school.id,
      code: school.code,
      name: school.name,
      city: school.city,
      type: school.type,
      subscriptionStatus: school.subscriptionStatus,
    },
    availableEndpoints: [
      { path: '/api/v1/counselor/summary', method: 'GET', description: 'ملخص إحصائي شامل وحالات الغياب الحرجة للموجه الطلابي' },
      { path: '/api/v1/counselor/students', method: 'GET', description: 'قائمة الطلاب مع إحصائيات الغياب والسلوك لكل طالب' },
      { path: '/api/v1/counselor/attendance', method: 'GET', description: 'سجلات الحضور والغياب والتأخر اليومي والتاريخي' },
      { path: '/api/v1/counselor/behavior', method: 'GET / POST', description: 'سجلات الملاحظات والمخالفات السلوكية والإيجابية' },
      { path: '/api/v1/counselor/absence-actions', method: 'GET / POST', description: 'الإجراءات الإدارية وإحالات التوجيه الطلابي' },
      { path: '/api/v1/counselor/permissions', method: 'GET', description: 'سجلات الاستئذان والخروج المدرسي' },
    ]
  });
});

// 7.3 Students with Attendance & Behavior Stats
app.get('/api/v1/counselor/students', (req, res) => {
  const auth = authenticateCounselorApi(req, res);
  if (!auth) return;

  const { school } = auth;
  const schoolCode = school?.code;

  let students = (db.users || []).filter((u: any) => 
    u.role === 'student' && (!schoolCode || u.schoolCode === schoolCode)
  );

  // Filters
  const className = req.query.className as string;
  const sectionName = req.query.sectionName as string;
  const minAbsences = parseInt(req.query.minAbsences as string, 10);
  const search = (req.query.search as string)?.toLowerCase();

  if (className) {
    students = students.filter((s: any) => s.className === className);
  }
  if (sectionName) {
    students = students.filter((s: any) => s.sectionName === sectionName);
  }
  if (search) {
    students = students.filter((s: any) => 
      s.name?.toLowerCase().includes(search) || 
      s.nationalId?.includes(search)
    );
  }

  // Calculate statistics per student
  const studentStats = students.map((s: any) => {
    const studentAttendances = (db.attendances || []).filter((a: any) => a.studentId === s.id || a.nationalId === s.nationalId);
    const absences = studentAttendances.filter((a: any) => a.finalStatus === 'absent');
    const lates = studentAttendances.filter((a: any) => a.finalStatus === 'late');
    const excused = studentAttendances.filter((a: any) => a.finalStatus === 'excused');
    const presents = studentAttendances.filter((a: any) => a.finalStatus === 'present');

    const behaviors = (db.behavior_logs || []).filter((b: any) => b.studentId === s.id || b.nationalId === s.nationalId);
    const positiveBehaviors = behaviors.filter((b: any) => b.type === 'positive');
    const negativeBehaviors = behaviors.filter((b: any) => b.type === 'negative');

    const absenceActions = (db.absence_actions || []).filter((act: any) => act.studentId === s.id || act.nationalId === s.nationalId);

    // Latest absence date
    const sortedAbsences = [...absences].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    const lastAbsenceDate = sortedAbsences[0]?.date || null;

    return {
      id: s.id,
      nationalId: s.nationalId,
      name: s.name,
      schoolCode: s.schoolCode,
      className: s.className || 'غير محدد',
      sectionName: s.sectionName || 'غير محدد',
      mobile: s.mobile || '',
      parentMobile: s.parentMobile || s.mobile || '',
      avatar: s.avatar || null,
      stats: {
        totalRecords: studentAttendances.length,
        presentCount: presents.length,
        absentCount: absences.length,
        lateCount: lates.length,
        excusedCount: excused.length,
        truantCount: studentAttendances.filter((a: any) => a.isTruant).length,
        lastAbsenceDate,
        positiveBehaviorCount: positiveBehaviors.length,
        negativeBehaviorCount: negativeBehaviors.length,
        netBehaviorPoints: behaviors.reduce((acc: number, b: any) => acc + (b.type === 'positive' ? (b.points || 1) : -(b.points || 1)), 0),
        absenceActionsCount: absenceActions.length,
      }
    };
  });

  let results = studentStats;
  if (!isNaN(minAbsences)) {
    results = results.filter((s: any) => s.stats.absentCount >= minAbsences);
  }

  // Sort by absence count descending by default
  results.sort((a: any, b: any) => b.stats.absentCount - a.stats.absentCount);

  res.json({
    success: true,
    schoolCode: school?.code,
    schoolName: school?.name,
    count: results.length,
    students: results,
  });
});

// 7.4 Attendance Records
app.get('/api/v1/counselor/attendance', (req, res) => {
  const auth = authenticateCounselorApi(req, res);
  if (!auth) return;

  const { school } = auth;
  const schoolCode = school?.code;

  let records = (db.attendances || []).filter((a: any) => 
    !schoolCode || a.schoolCode === schoolCode
  );

  const { date, startDate, endDate, status, nationalId, isTruant, className, sectionName } = req.query as any;

  if (date) {
    records = records.filter((a: any) => a.date === date);
  }
  if (startDate) {
    records = records.filter((a: any) => a.date >= startDate);
  }
  if (endDate) {
    records = records.filter((a: any) => a.date <= endDate);
  }
  if (status) {
    records = records.filter((a: any) => a.finalStatus === status);
  }
  if (nationalId) {
    records = records.filter((a: any) => a.nationalId === nationalId);
  }
  if (className) {
    records = records.filter((a: any) => a.className === className);
  }
  if (sectionName) {
    records = records.filter((a: any) => a.sectionName === sectionName);
  }
  if (isTruant !== undefined) {
    const truantBool = isTruant === 'true' || isTruant === '1';
    records = records.filter((a: any) => Boolean(a.isTruant) === truantBool);
  }

  // Sort newest first
  records.sort((a: any, b: any) => (b.date || '').localeCompare(a.date || ''));

  res.json({
    success: true,
    schoolCode: school?.code,
    count: records.length,
    attendances: records,
  });
});

// 7.5 Behavior Records
app.get('/api/v1/counselor/behavior', (req, res) => {
  const auth = authenticateCounselorApi(req, res);
  if (!auth) return;

  const { school } = auth;
  const schoolCode = school?.code;

  let records = (db.behavior_logs || []).filter((b: any) => 
    !schoolCode || b.schoolCode === schoolCode
  );

  const { type, nationalId, studentId, startDate, endDate, category } = req.query as any;

  if (type) {
    records = records.filter((b: any) => b.type === type);
  }
  if (nationalId) {
    records = records.filter((b: any) => b.nationalId === nationalId);
  }
  if (studentId) {
    records = records.filter((b: any) => b.studentId === studentId);
  }
  if (category) {
    records = records.filter((b: any) => b.category === category);
  }
  if (startDate) {
    records = records.filter((b: any) => b.date >= startDate);
  }
  if (endDate) {
    records = records.filter((b: any) => b.date <= endDate);
  }

  records.sort((a: any, b: any) => (b.date || '').localeCompare(a.date || ''));

  res.json({
    success: true,
    schoolCode: school?.code,
    count: records.length,
    behaviorLogs: records,
  });
});

// 7.6 Record new Behavior log via Counselor App
app.post('/api/v1/counselor/behavior', (req, res) => {
  const auth = authenticateCounselorApi(req, res);
  if (!auth) return;

  const { school } = auth;
  const body = req.body;

  if (!body || !body.nationalId || !body.title) {
    return res.status(400).json({
      success: false,
      message: 'بيانات السلوك غير مكتملة. يلزم تحديد nationalId و title و type (positive/negative)',
    });
  }

  const targetStudent = (db.users || []).find((u: any) => 
    u.nationalId === body.nationalId && (!school?.code || u.schoolCode === school.code)
  );

  const newLog = {
    id: `beh-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    studentId: targetStudent?.id || body.studentId || `std-${body.nationalId}`,
    studentName: targetStudent?.name || body.studentName || 'طالب',
    nationalId: body.nationalId,
    schoolCode: school?.code || body.schoolCode || '',
    className: targetStudent?.className || body.className || 'عام',
    sectionName: targetStudent?.sectionName || body.sectionName || '1',
    date: body.date || new Date().toISOString().split('T')[0],
    time: body.time || new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
    type: body.type || 'negative',
    points: body.points || 1,
    title: body.title,
    category: body.category || 'ملاحظة توجيه طلابي',
    notes: body.notes || 'تم الرصد عبر تطبيق الموجه الطلابي',
    recordedById: 'counselor-api',
    recordedByName: body.recordedByName || 'الموجه الطلابي (عبر API)',
    recordedByRole: 'student_advisor',
    createdAt: new Date().toISOString(),
  };

  if (!Array.isArray(db.behavior_logs)) db.behavior_logs = [];
  db.behavior_logs.unshift(newLog);
  saveDatabase(db);

  res.json({
    success: true,
    message: 'تم تسجيل الملاحظة السلوكية بنجاح في منظومة حُضُورَكْ',
    log: newLog,
  });
});

// 7.7 Absence Actions & Counselor Referrals
app.get('/api/v1/counselor/absence-actions', (req, res) => {
  const auth = authenticateCounselorApi(req, res);
  if (!auth) return;

  const { school } = auth;
  const schoolCode = school?.code;

  let records = (db.absence_actions || []).filter((act: any) => 
    !schoolCode || act.schoolCode === schoolCode
  );

  const { nationalId, studentId, actionType } = req.query as any;

  if (nationalId) {
    records = records.filter((act: any) => act.nationalId === nationalId);
  }
  if (studentId) {
    records = records.filter((act: any) => act.studentId === studentId);
  }
  if (actionType) {
    records = records.filter((act: any) => act.actionType === actionType);
  }

  records.sort((a: any, b: any) => (b.date || '').localeCompare(a.date || ''));

  res.json({
    success: true,
    schoolCode: school?.code,
    count: records.length,
    absenceActions: records,
  });
});

// 7.8 Record new Absence / Counseling Action
app.post('/api/v1/counselor/absence-actions', (req, res) => {
  const auth = authenticateCounselorApi(req, res);
  if (!auth) return;

  const { school } = auth;
  const body = req.body;

  if (!body || !body.nationalId || !body.actionTitle) {
    return res.status(400).json({
      success: false,
      message: 'بيانات الإجراء غير مكتملة. يلزم تحديد nationalId و actionTitle و actionType',
    });
  }

  const targetStudent = (db.users || []).find((u: any) => 
    u.nationalId === body.nationalId && (!school?.code || u.schoolCode === school.code)
  );

  const newAction = {
    id: `act-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    studentId: targetStudent?.id || body.studentId || `std-${body.nationalId}`,
    studentName: targetStudent?.name || body.studentName || 'طالب',
    nationalId: body.nationalId,
    schoolCode: school?.code || body.schoolCode || '',
    className: targetStudent?.className || body.className || 'عام',
    sectionName: targetStudent?.sectionName || body.sectionName || '1',
    absenceCount: body.absenceCount || 3,
    actionType: body.actionType || 'counselor_referral',
    actionTitle: body.actionTitle,
    notes: body.notes || 'إجراء مرصود عبر تطبيق الموجه الطلابي',
    recordedById: 'counselor-api',
    recordedByName: body.recordedByName || 'الموجه الطلابي (عبر API)',
    recordedByRole: 'student_advisor',
    resetCycle: Boolean(body.resetCycle),
    date: body.date || new Date().toISOString().split('T')[0],
    createdAt: new Date().toISOString(),
  };

  if (!Array.isArray(db.absence_actions)) db.absence_actions = [];
  db.absence_actions.unshift(newAction);
  saveDatabase(db);

  res.json({
    success: true,
    message: 'تم تسجيل إجراء التوجيه الطلابي بنجاح',
    action: newAction,
  });
});

// 7.9 Permissions & Passes
app.get('/api/v1/counselor/permissions', (req, res) => {
  const auth = authenticateCounselorApi(req, res);
  if (!auth) return;

  const { school } = auth;
  const schoolCode = school?.code;

  let records = (db.permissions || []).filter((p: any) => 
    !schoolCode || p.schoolCode === schoolCode
  );

  const { date, nationalId } = req.query as any;
  if (date) records = records.filter((p: any) => p.date === date);
  if (nationalId) records = records.filter((p: any) => p.nationalId === nationalId);

  res.json({
    success: true,
    schoolCode: school?.code,
    count: records.length,
    permissions: records,
  });
});

// 7.10 Executive Counselor Summary (Comprehensive intelligence payload)
app.get('/api/v1/counselor/summary', (req, res) => {
  const auth = authenticateCounselorApi(req, res);
  if (!auth) return;

  const { school } = auth;
  const schoolCode = school?.code;

  const todayStr = new Date().toISOString().split('T')[0];

  const students = (db.users || []).filter((u: any) => u.role === 'student' && (!schoolCode || u.schoolCode === schoolCode));
  const teachers = (db.users || []).filter((u: any) => u.role === 'teacher' && (!schoolCode || u.schoolCode === schoolCode));
  const allAttendances = (db.attendances || []).filter((a: any) => !schoolCode || a.schoolCode === schoolCode);
  const todayAttendances = allAttendances.filter((a: any) => a.date === todayStr);

  const allBehaviors = (db.behavior_logs || []).filter((b: any) => !schoolCode || b.schoolCode === schoolCode);
  const negativeBehaviors = allBehaviors.filter((b: any) => b.type === 'negative');
  const positiveBehaviors = allBehaviors.filter((b: any) => b.type === 'positive');

  // Compute student absence ranking
  const atRiskStudents = students.map((s: any) => {
    const sAtt = allAttendances.filter((a: any) => a.studentId === s.id || a.nationalId === s.nationalId);
    const absences = sAtt.filter((a: any) => a.finalStatus === 'absent').length;
    const lates = sAtt.filter((a: any) => a.finalStatus === 'late').length;
    const excused = sAtt.filter((a: any) => a.finalStatus === 'excused').length;
    const truants = sAtt.filter((a: any) => a.isTruant).length;

    const sBeh = allBehaviors.filter((b: any) => b.studentId === s.id || b.nationalId === s.nationalId);
    const negBeh = sBeh.filter((b: any) => b.type === 'negative').length;

    return {
      id: s.id,
      name: s.name,
      nationalId: s.nationalId,
      className: s.className || 'عام',
      sectionName: s.sectionName || '1',
      parentMobile: s.parentMobile || s.mobile || '',
      absenceCount: absences,
      lateCount: lates,
      excusedCount: excused,
      truantCount: truants,
      negativeBehaviorCount: negBeh,
      riskLevel: absences >= 5 ? 'critical' : absences >= 3 ? 'warning' : 'normal',
    };
  })
  .filter((s: any) => s.absenceCount >= 2 || s.negativeBehaviorCount >= 1)
  .sort((a: any, b: any) => b.absenceCount - a.absenceCount);

  res.json({
    success: true,
    timestamp: new Date().toISOString(),
    school: {
      code: school?.code,
      name: school?.name,
      city: school?.city,
      type: school?.type,
    },
    counts: {
      totalStudents: students.length,
      totalTeachers: teachers.length,
      totalAbsencesAllTime: allAttendances.filter((a: any) => a.finalStatus === 'absent').length,
      totalPositiveBehaviors: positiveBehaviors.length,
      totalNegativeBehaviors: negativeBehaviors.length,
    },
    today: {
      date: todayStr,
      totalRecords: todayAttendances.length,
      present: todayAttendances.filter((a: any) => a.finalStatus === 'present').length,
      absent: todayAttendances.filter((a: any) => a.finalStatus === 'absent').length,
      late: todayAttendances.filter((a: any) => a.finalStatus === 'late').length,
      excused: todayAttendances.filter((a: any) => a.finalStatus === 'excused').length,
      truants: todayAttendances.filter((a: any) => a.isTruant).length,
    },
    atRiskStudentsSummary: {
      count: atRiskStudents.length,
      criticalCount: atRiskStudents.filter((s: any) => s.riskLevel === 'critical').length,
      warningCount: atRiskStudents.filter((s: any) => s.riskLevel === 'warning').length,
      list: atRiskStudents.slice(0, 30), // top 30
    },
    recentNegativeBehaviors: negativeBehaviors.slice(0, 15),
  });
});

// ========================
// SERVER START & VITE SPA
// ========================
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
