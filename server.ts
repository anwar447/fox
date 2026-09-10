import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';

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
  deleted_schools: string[];
  deleted_attendance_ids: string[];
  deleted_notification_ids?: string[];
  deleted_user_ids?: string[];
}

const KNOWN_PURGED_SCHOOLS: string[] = [];
const PROTECTED_CORE_SCHOOLS = ['RAYA-1448', 'SCH-RAYA-1', 'SAQR-1448', 'SCH-SAQR-1', 'QURAN-100', 'SCH-QURAN-1'];

const DEFAULT_SUPERADMIN = {
  id: 'usr-admin-1',
  nationalId: '1000000000',
  name: 'المهندس أنور (المالك والمطور)',
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
    deleted_schools: [],
    deleted_attendance_ids: [],
    deleted_notification_ids: [],
    deleted_user_ids: [],
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

    // Explicitly deleted schools only (never hardcode real schools)
    const rawDeleted: string[] = Array.isArray(data.deleted_schools) ? data.deleted_schools : [];
    const deletedSet = new Set<string>(
      rawDeleted
        .map((k: string) => String(k).toUpperCase())
        .filter((k) => !PROTECTED_CORE_SCHOOLS.includes(k) && !k.includes('SAQR') && !k.includes('صقر') && !k.includes('RAYA') && !k.includes('الراية'))
    );
    const deleted_schools = Array.from(deletedSet);

    // Track deleted attendances
    const rawDeletedAtt: string[] = Array.isArray(data.deleted_attendance_ids) ? data.deleted_attendance_ids : [];
    const deletedAttSet = new Set<string>(rawDeletedAtt.map(String));
    const deleted_attendance_ids = Array.from(deletedAttSet);

    // Track deleted notifications
    const rawDeletedNotifs: string[] = Array.isArray(data.deleted_notification_ids) ? data.deleted_notification_ids : [];
    const deletedNotifSet = new Set<string>(rawDeletedNotifs.map(String));
    const deleted_notification_ids = Array.from(deletedNotifSet);

    // Track deleted users (permanently deleted students/users)
    const rawDeletedUsers: string[] = Array.isArray(data.deleted_user_ids) ? data.deleted_user_ids : [];
    const deletedUserSet = new Set<string>(rawDeletedUsers.map((x) => String(x).trim()).filter(Boolean));
    const deleted_user_ids = Array.from(deletedUserSet);

    // Filter out any schools that match deleted registry
    const rawSchools: any[] = Array.isArray(data.schools) ? data.schools : [];
    const schools = rawSchools.filter((s) => {
      const sId = String(s?.id || '').toUpperCase();
      const sCode = String(s?.code || '').toUpperCase();
      return !deletedSet.has(sId) && !deletedSet.has(sCode);
    });

    // Ensure core school RAYA-1448 (متوسطة الراية) is always present and properly configured
    const hasRaya = schools.some((s) => String(s?.code || s?.id).toUpperCase() === 'RAYA-1448');
    if (!hasRaya) {
      schools.push({
        id: 'sch-raya-1',
        code: 'RAYA-1448',
        name: 'متوسطة الراية',
        city: 'الرياض',
        type: 'middle',
        subscriptionPlan: 'free_forever',
        subscriptionEndDate: '2099-12-31',
        customClasses: [
          { id: 'c-ry-1', className: 'الأول المتوسط', sections: ['1', '2', '3', '4'] },
          { id: 'c-ry-2', className: 'الثاني المتوسط', sections: ['1', '2', '3', '4'] },
          { id: 'c-ry-3', className: 'الثالث المتوسط', sections: ['1', '2', '3', '4'] },
        ],
      });
    }

    // Filter out users belonging to purged/deleted schools or in deleted_user_ids (except superadmin)
    const rawUsers: any[] = Array.isArray(data.users) && data.users.length > 0 ? data.users : [DEFAULT_SUPERADMIN];
    const users = rawUsers.filter((u) => {
      if (u.role === 'superadmin' || u.schoolCode === 'SUPERADMIN') return true;
      const sCode = String(u.schoolCode || '').toUpperCase();
      if (deletedSet.has(sCode)) return false;
      const uid = String(u.id || '').trim();
      const unid = String(u.nationalId || '').trim();
      if (deletedUserSet.has(uid) || (unid && deletedUserSet.has(unid))) return false;
      return true;
    });

    // Filter attendances belonging to deleted schools, deleted attendance IDs, or deleted users
    const rawAtt: any[] = Array.isArray(data.attendances) ? data.attendances : [];
    const attendances = rawAtt.filter((a) => {
      const sCode = String(a.schoolCode || '').toUpperCase();
      if (deletedSet.has(sCode)) return false;
      const aId = String(a.id || '');
      const compositeKey = `${a.studentId}_${a.date}`;
      if (deletedAttSet.has(aId) || deletedAttSet.has(compositeKey)) return false;
      const sid = String(a.studentId || '').trim();
      const snid = String(a.nationalId || '').trim();
      if (deletedUserSet.has(sid) || (snid && deletedUserSet.has(snid))) return false;
      return true;
    });

    // Filter notifications belonging to deleted notifications registry
    const rawNotifs: any[] = Array.isArray(data.notifications) ? data.notifications : [];
    const notifications = rawNotifs.filter((n) => {
      const nId = String(n?.id || '');
      return !deletedNotifSet.has(nId);
    });

    const sanitized: DatabaseSchema = {
      schools,
      users: users.length > 0 ? users : [DEFAULT_SUPERADMIN],
      attendances,
      permissions: Array.isArray(data.permissions) ? data.permissions : [],
      behavior_logs: Array.isArray(data.behavior_logs) ? data.behavior_logs : [],
      absence_actions: Array.isArray(data.absence_actions) ? data.absence_actions : [],
      corrections: Array.isArray(data.corrections) ? data.corrections : [],
      payments: Array.isArray(data.payments) ? data.payments : [],
      notifications,
      deleted_schools,
      deleted_attendance_ids,
      deleted_notification_ids,
      deleted_user_ids,
    };

    // Save back sanitized database immediately
    fs.writeFileSync(DB_FILE, JSON.stringify(sanitized, null, 2), 'utf-8');
    return sanitized;
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
  if (!Array.isArray(db.deleted_schools)) db.deleted_schools = [];
  res.json({
    success: true,
    data: db,
  });
});

app.post('/api/sync', (req, res) => {
  const incoming = req.body;
  if (incoming) {
    if (!Array.isArray(db.deleted_schools)) db.deleted_schools = [];

    // Track explicitly deleted schools (prevent deleting protected core schools)
    if (Array.isArray(incoming.deleted_schools) && incoming.deleted_schools.length > 0) {
      incoming.deleted_schools.forEach((del: string) => {
        const u = String(del || '').toUpperCase();
        if (
          u &&
          !PROTECTED_CORE_SCHOOLS.includes(u) &&
          !u.includes('SAQR') &&
          !u.includes('صقر') &&
          !u.includes('RAYA') &&
          !u.includes('الراية') &&
          !db.deleted_schools.includes(u)
        ) {
          db.deleted_schools.push(u);
        }
      });
      // Purge deleted schools from memory
      db.schools = db.schools.filter((s) => {
        const sId = String(s.id || '').toUpperCase();
        const sCode = String(s.code || '').toUpperCase();
        return !db.deleted_schools.includes(sId) && !db.deleted_schools.includes(sCode);
      });
    }

    // Track explicitly deleted user IDs (permanently purged students)
    if (!Array.isArray(db.deleted_user_ids)) db.deleted_user_ids = [];
    if (Array.isArray(incoming.deleted_user_ids) && incoming.deleted_user_ids.length > 0) {
      incoming.deleted_user_ids.forEach((id: string) => {
        const str = String(id || '').trim();
        if (str && !db.deleted_user_ids!.includes(str)) {
          db.deleted_user_ids!.push(str);
        }
      });
    }
    const currentDeletedUserSet = new Set((db.deleted_user_ids || []).map((x) => String(x).trim()));

    // Track explicitly deleted attendance IDs
    if (!Array.isArray(db.deleted_attendance_ids)) db.deleted_attendance_ids = [];
    if (Array.isArray(incoming.deleted_attendance_ids) && incoming.deleted_attendance_ids.length > 0) {
      incoming.deleted_attendance_ids.forEach((id: string) => {
        const str = String(id || '');
        if (str && !db.deleted_attendance_ids.includes(str)) {
          db.deleted_attendance_ids.push(str);
        }
      });
    }
    const deletedAttSet = new Set(db.deleted_attendance_ids.map(String));
    db.attendances = (db.attendances || []).filter(
      (a) =>
        !deletedAttSet.has(String(a.id)) &&
        !deletedAttSet.has(`${a.studentId}_${a.date}`) &&
        !currentDeletedUserSet.has(String(a.studentId || '').trim()) &&
        !(a.nationalId && currentDeletedUserSet.has(String(a.nationalId).trim()))
    );

    // 1. Schools: Union merge by code or ID (ignoring any deleted school)
    if (Array.isArray(incoming.schools) && incoming.schools.length > 0) {
      const deletedSet = new Set((db.deleted_schools || []).map((x: string) => String(x).toUpperCase()));
      const schoolMap = new Map<string, any>();
      db.schools.forEach((s) => {
        if (s && (s.code || s.id)) {
          const key = String(s.code || s.id).toUpperCase();
          const idKey = String(s.id || '').toUpperCase();
          if (!deletedSet.has(key) && !deletedSet.has(idKey)) {
            schoolMap.set(key, s);
          }
        }
      });
      incoming.schools.forEach((s) => {
        if (s && (s.code || s.id)) {
          const key = String(s.code || s.id).toUpperCase();
          const idKey = String(s.id || '').toUpperCase();
          if (!deletedSet.has(key) && !deletedSet.has(idKey)) {
            if (schoolMap.has(key)) {
              schoolMap.set(key, { ...schoolMap.get(key), ...s });
            } else {
              schoolMap.set(key, s);
            }
          }
        }
      });
      db.schools = Array.from(schoolMap.values());
    }

    // 2. Users: Smart role-aware unification by ID or (nationalId + role)
    if (Array.isArray(incoming.users) && incoming.users.length > 0) {
      const userMap = new Map<string, any>();

      const mergeOneUser = (u: any) => {
        if (!u) return;
        const cleanNid = u.nationalId ? String(u.nationalId).trim() : '';
        const roleKey = (u.staffTitle === 'teacher' || u.role === 'teacher') ? 'teacher' : (u.role || 'user');
        // Distinct key by ID or (nationalId + role): Keeps teacher account and parent account separate!
        const key = u.id || (cleanNid ? `nid_${cleanNid}_${roleKey}` : `${cleanNid}_${u.schoolCode || ''}`);

        if (userMap.has(key)) {
          const prev = userMap.get(key);
          const unifiedSchools = Array.from(new Set([
            ...(Array.isArray(prev.managedSchoolCodes) ? prev.managedSchoolCodes : []),
            prev.schoolCode,
            ...(Array.isArray(u.managedSchoolCodes) ? u.managedSchoolCodes : []),
            u.schoolCode,
          ])).filter(Boolean);

          userMap.set(key, {
            ...prev,
            ...u,
            id: prev.id || u.id,
            nationalId: cleanNid || prev.nationalId,
            managedSchoolCodes: unifiedSchools,
            schoolCode: u.schoolCode || prev.schoolCode,
            role: u.role || prev.role,
            staffTitle: u.staffTitle || prev.staffTitle,
            assignedClasses: u.assignedClasses || prev.assignedClasses,
            className: u.className || prev.className,
            sectionName: u.sectionName || prev.sectionName,
            childrenNationalIds: Array.from(new Set([
              ...(Array.isArray(prev.childrenNationalIds) ? prev.childrenNationalIds : []),
              ...(Array.isArray(u.childrenNationalIds) ? u.childrenNationalIds : []),
            ])).filter(Boolean),
          });
        } else {
          const initialSchools = Array.from(new Set([
            ...(Array.isArray(u.managedSchoolCodes) ? u.managedSchoolCodes : []),
            u.schoolCode,
          ])).filter(Boolean);
          userMap.set(key, {
            ...u,
            managedSchoolCodes: initialSchools.length > 0 ? initialSchools : [u.schoolCode].filter(Boolean),
          });
        }
      };

      db.users.forEach(mergeOneUser);
      incoming.users.forEach(mergeOneUser);

      db.users = Array.from(userMap.values())
        .filter((u) => {
          if (u.role === 'superadmin' || u.schoolCode === 'SUPERADMIN') return true;
          const uid = String(u.id || '').trim();
          const unid = String(u.nationalId || '').trim();
          if (currentDeletedUserSet.has(uid) || (unid && currentDeletedUserSet.has(unid))) return false;
          return true;
        })
        .map((u) => {
          if (u && (u.role === 'admin_assistant' || u.role === 'assistant' || u.role === 'staff')) {
            return { ...u, role: 'employee', staffTitle: u.staffTitle || 'admin_assistant' };
          }
          return u;
        });
    }

    // 3. Attendances: Union merge by ID or composite key (respecting deleted attendances)
    if (Array.isArray(incoming.attendances) && incoming.attendances.length > 0) {
      const attMap = new Map<string, any>();
      db.attendances.forEach((a) => {
        if (a) {
          const key = a.id || `${a.studentId}_${a.date}`;
          if (!deletedAttSet.has(String(a.id)) && !deletedAttSet.has(`${a.studentId}_${a.date}`)) {
            attMap.set(key, a);
          }
        }
      });
      incoming.attendances.forEach((a) => {
        const key = a?.id || (a ? `${a.studentId}_${a.date}` : null);
        if (key && !deletedAttSet.has(String(a.id)) && !deletedAttSet.has(`${a.studentId}_${a.date}`)) {
          if (attMap.has(key)) {
            const prev = attMap.get(key);
            // If previous attendance already had an accepted excuse, never allow stale pending/unexcused state to revert it
            const preserveAccepted = prev.excuseStatus === 'accepted' && a.excuseStatus !== 'accepted';
            attMap.set(key, {
              ...prev,
              ...a,
              ...(preserveAccepted ? { excuseStatus: 'accepted', finalStatus: prev.finalStatus || 'excused', isTruant: false } : {}),
            });
          } else {
            attMap.set(key, a);
          }
        }
      });
      db.attendances = Array.from(attMap.values());
    }

    // 4. Permissions
    if (Array.isArray(incoming.permissions) && incoming.permissions.length > 0) {
      const permMap = new Map<string, any>();
      db.permissions.forEach((p) => p?.id && permMap.set(p.id, p));
      incoming.permissions.forEach((p) => p?.id && permMap.set(p.id, { ...permMap.get(p.id), ...p }));
      db.permissions = Array.from(permMap.values());
    }

    // 5. Behavior logs
    if (Array.isArray(incoming.behavior_logs) && incoming.behavior_logs.length > 0) {
      const bMap = new Map<string, any>();
      db.behavior_logs.forEach((b) => b?.id && bMap.set(b.id, b));
      incoming.behavior_logs.forEach((b) => b?.id && bMap.set(b.id, { ...bMap.get(b.id), ...b }));
      db.behavior_logs = Array.from(bMap.values());
    }

    // 6. Absence actions
    if (Array.isArray(incoming.absence_actions) && incoming.absence_actions.length > 0) {
      const actMap = new Map<string, any>();
      db.absence_actions.forEach((act) => act?.id && actMap.set(act.id, act));
      incoming.absence_actions.forEach((act) => act?.id && actMap.set(act.id, { ...actMap.get(act.id), ...act }));
      db.absence_actions = Array.from(actMap.values());
    }

    // 7. Corrections: Smart decision-aware unification (Approved/Rejected decisions CANNOT be reverted to pending)
    if (Array.isArray(incoming.corrections) && incoming.corrections.length > 0) {
      const corMap = new Map<string, any>();
      db.corrections.forEach((c) => c?.id && corMap.set(c.id, c));

      const statusWeight = (s?: string) => {
        if (s === 'approved' || s === 'rejected') return 2;
        if (s === 'pending') return 1;
        return 0;
      };

      incoming.corrections.forEach((c) => {
        if (!c?.id) return;
        if (corMap.has(c.id)) {
          const prev = corMap.get(c.id);
          const prevWeight = statusWeight(prev.status);
          const newWeight = statusWeight(c.status);

          // If incoming status has lower weight (e.g. stale client sending 'pending' for an already approved/rejected excuse), keep the approved/rejected decision
          if (newWeight < prevWeight) {
            corMap.set(c.id, {
              ...c,
              status: prev.status,
              adminDecisionNotes: prev.adminDecisionNotes || c.adminDecisionNotes,
              decidedByName: prev.decidedByName || c.decidedByName,
              decidedByRole: prev.decidedByRole || c.decidedByRole,
              decidedAt: prev.decidedAt || c.decidedAt,
              updatedAt: prev.updatedAt || c.updatedAt,
            });
          } else {
            corMap.set(c.id, { ...prev, ...c });
          }
        } else {
          corMap.set(c.id, c);
        }
      });
      db.corrections = Array.from(corMap.values());
    }

    // 8. Payments
    if (Array.isArray(incoming.payments) && incoming.payments.length > 0) {
      const payMap = new Map<string, any>();
      db.payments.forEach((p) => p?.id && payMap.set(p.id, p));
      incoming.payments.forEach((p) => p?.id && payMap.set(p.id, { ...payMap.get(p.id), ...p }));
      db.payments = Array.from(payMap.values());
    }

    // 9. Deleted Notifications Registry Sync
    if (Array.isArray(incoming.deleted_notification_ids) && incoming.deleted_notification_ids.length > 0) {
      if (!db.deleted_notification_ids) db.deleted_notification_ids = [];
      const notifDelSet = new Set([...db.deleted_notification_ids, ...incoming.deleted_notification_ids.map(String)]);
      db.deleted_notification_ids = Array.from(notifDelSet);
    }
    const currentDeletedNotifSet = new Set((db.deleted_notification_ids || []).map(String));

    // 10. Notifications
    if (Array.isArray(incoming.notifications)) {
      const notifMap = new Map<string, any>();
      db.notifications.forEach((n) => n?.id && !currentDeletedNotifSet.has(String(n.id)) && notifMap.set(n.id, n));
      incoming.notifications.forEach((n) => n?.id && !currentDeletedNotifSet.has(String(n.id)) && notifMap.set(n.id, { ...notifMap.get(n.id), ...n }));
      db.notifications = Array.from(notifMap.values());
    } else {
      db.notifications = (db.notifications || []).filter((n) => !currentDeletedNotifSet.has(String(n?.id || '')));
    }

    saveDatabase(db);
  }
  res.json({ success: true, data: db });
});

// Notifications Endpoints (Retraction & Deletion)
app.get('/api/notifications', (req, res) => {
  const deletedSet = new Set<string>((db.deleted_notification_ids || []).map(String));
  const active = (db.notifications || []).filter((n) => !deletedSet.has(String(n?.id || '')));
  res.json({ success: true, notifications: active, deleted_notification_ids: db.deleted_notification_ids || [] });
});

app.delete('/api/notifications/:id', (req, res) => {
  const notifId = req.params.id;
  if (!db.deleted_notification_ids) db.deleted_notification_ids = [];
  if (!db.deleted_notification_ids.includes(notifId)) {
    db.deleted_notification_ids.push(notifId);
  }
  db.notifications = (db.notifications || []).filter((n) => String(n?.id) !== String(notifId));
  saveDatabase(db);
  res.json({ success: true, message: 'Notification deleted successfully' });
});

app.post('/api/notifications/:id/retract', (req, res) => {
  const notifId = req.params.id;
  const { reason, retractedByName } = req.body || {};
  const notif = (db.notifications || []).find((n) => String(n?.id) === String(notifId));
  if (!notif) {
    return res.status(404).json({ success: false, error: 'Notification not found' });
  }
  notif.retracted = true;
  notif.retractedAt = new Date().toISOString();
  notif.retractionReason = reason || 'تم التراجع عن التعميم بناءً على التوجيهات الرسمية ونفي الشائعة';
  if (retractedByName) notif.retractedByName = retractedByName;
  saveDatabase(db);
  res.json({ success: true, notification: notif });
});

// 2. Schools endpoints
app.get('/api/schools', (req, res) => {
  const deletedSet = new Set<string>((db.deleted_schools || []).map((x) => String(x).toUpperCase()));
  const activeSchools = (db.schools || []).filter(
    (s) => !deletedSet.has(String(s.id || '').toUpperCase()) && !deletedSet.has(String(s.code || '').toUpperCase())
  );
  res.json({ success: true, schools: activeSchools, deleted_schools: db.deleted_schools });
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
  const paramUpper = String(param || '').toUpperCase();
  if (!Array.isArray(db.deleted_schools)) db.deleted_schools = [];
  if (paramUpper && !db.deleted_schools.includes(paramUpper)) {
    db.deleted_schools.push(paramUpper);
  }

  // Find matching school to also record both its ID and its CODE in deleted_schools
  const matched = db.schools.filter(
    (s) => String(s.id || '').toUpperCase() === paramUpper || String(s.code || '').toUpperCase() === paramUpper
  );
  matched.forEach((m) => {
    if (m.id && !db.deleted_schools.includes(m.id.toUpperCase())) db.deleted_schools.push(m.id.toUpperCase());
    if (m.code && !db.deleted_schools.includes(m.code.toUpperCase())) db.deleted_schools.push(m.code.toUpperCase());
  });

  // Purge school
  db.schools = db.schools.filter((s) => {
    const sId = String(s.id || '').toUpperCase();
    const sCode = String(s.code || '').toUpperCase();
    return sId !== paramUpper && sCode !== paramUpper;
  });

  saveDatabase(db);
  res.json({ success: true, schools: db.schools, deleted_schools: db.deleted_schools });
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

  const cleanNid = String(newUser.nationalId).trim();
  const newRole = newUser.role || (newUser.staffTitle === 'teacher' ? 'teacher' : 'employee');
  const existingIdx = db.users.findIndex(
    (u) =>
      u.id === newUser.id ||
      (cleanNid &&
        u.nationalId &&
        String(u.nationalId).trim() === cleanNid &&
        u.role === newRole &&
        (newRole !== 'teacher' || u.schoolCode === newUser.schoolCode))
  );

  if (existingIdx >= 0) {
    const prev = db.users[existingIdx];
    const unifiedSchools = Array.from(new Set([
      ...(Array.isArray(prev.managedSchoolCodes) ? prev.managedSchoolCodes : []),
      prev.schoolCode,
      ...(Array.isArray(newUser.managedSchoolCodes) ? newUser.managedSchoolCodes : []),
      newUser.schoolCode,
    ])).filter(Boolean);

    db.users[existingIdx] = {
      ...prev,
      ...newUser,
      managedSchoolCodes: unifiedSchools,
    };
  } else {
    db.users.push(newUser);
  }

  // Clear any tombstone in deleted_user_ids so user can re-register cleanly
  if (Array.isArray(db.deleted_user_ids)) {
    const uid = String(newUser.id || '').trim();
    const unid = String(newUser.nationalId || '').trim();
    db.deleted_user_ids = db.deleted_user_ids.filter((d) => d !== uid && d !== unid);
  }

  saveDatabase(db);
  res.json({ success: true, user: newUser, users: db.users });
});

app.post('/api/users/bulk', (req, res) => {
  const newUsers = req.body;
  if (Array.isArray(newUsers)) {
    for (const u of newUsers) {
      if (!u) continue;
      const cleanNid = u.nationalId ? String(u.nationalId).trim() : '';
      const uRole = u.role || (u.staffTitle === 'teacher' ? 'teacher' : 'employee');
      const idx = db.users.findIndex(
        (existing) =>
          existing.id === u.id ||
          (cleanNid &&
            existing.nationalId &&
            String(existing.nationalId).trim() === cleanNid &&
            existing.role === uRole &&
            (uRole !== 'teacher' || existing.schoolCode === u.schoolCode))
      );
      if (idx >= 0) {
        const prev = db.users[idx];
        const unifiedSchools = Array.from(new Set([
          ...(Array.isArray(prev.managedSchoolCodes) ? prev.managedSchoolCodes : []),
          prev.schoolCode,
          ...(Array.isArray(u.managedSchoolCodes) ? u.managedSchoolCodes : []),
          u.schoolCode,
        ])).filter(Boolean);
        db.users[idx] = {
          ...prev,
          ...u,
          managedSchoolCodes: unifiedSchools,
        };
      } else {
        db.users.push(u);
      }

      // Un-delete this user from deleted_user_ids
      if (Array.isArray(db.deleted_user_ids)) {
        const uid = String(u.id || '').trim();
        db.deleted_user_ids = db.deleted_user_ids.filter((d) => d !== uid && d !== cleanNid);
      }
    }
    saveDatabase(db);
  }
  res.json({ success: true, users: db.users });
});

// Permanent student purge endpoint
app.post('/api/users/purge-student', (req, res) => {
  const { studentId, studentNationalId, schoolCode } = req.body || {};
  const cleanId = String(studentId || '').trim();
  const cleanNid = String(studentNationalId || '').trim();

  if (!Array.isArray(db.deleted_user_ids)) db.deleted_user_ids = [];
  if (cleanId && !db.deleted_user_ids.includes(cleanId)) db.deleted_user_ids.push(cleanId);
  if (cleanNid && !db.deleted_user_ids.includes(cleanNid)) db.deleted_user_ids.push(cleanNid);

  // Remove from db.users
  db.users = (db.users || []).filter((u) => {
    const uid = String(u.id || '').trim();
    const unid = String(u.nationalId || '').trim();
    return uid !== cleanId && (!cleanNid || unid !== cleanNid);
  });

  // Remove from parent childrenNationalIds
  if (cleanNid) {
    db.users = db.users.map((u) => {
      if (u.role === 'parent' && Array.isArray(u.childrenNationalIds)) {
        return {
          ...u,
          childrenNationalIds: u.childrenNationalIds.filter((cid: string) => String(cid).trim() !== cleanNid),
        };
      }
      return u;
    });
  }

  // Delete attendances for this student
  db.attendances = (db.attendances || []).filter((a) => {
    const sid = String(a.studentId || '').trim();
    const snid = String(a.nationalId || '').trim();
    return sid !== cleanId && (!cleanNid || snid !== cleanNid);
  });

  // Delete permissions for this student
  if (Array.isArray(db.permissions)) {
    db.permissions = db.permissions.filter((p) => {
      const sid = String(p.studentId || '').trim();
      return sid !== cleanId;
    });
  }

  // Delete behavior logs for this student
  if (Array.isArray(db.behavior_logs)) {
    db.behavior_logs = db.behavior_logs.filter((b) => {
      const sid = String(b.studentId || '').trim();
      return sid !== cleanId;
    });
  }

  saveDatabase(db);
  res.json({ success: true, message: 'Student purged permanently' });
});

// Clear deleted user tombstone endpoint (when re-registering)
app.post('/api/users/unrecord-deleted', (req, res) => {
  const { id } = req.body || {};
  const cleanId = String(id || '').trim();
  if (cleanId && Array.isArray(db.deleted_user_ids)) {
    db.deleted_user_ids = db.deleted_user_ids.filter((x) => x !== cleanId);
    saveDatabase(db);
  }
  res.json({ success: true, deleted_user_ids: db.deleted_user_ids || [] });
});

app.delete('/api/users/:id', (req, res) => {
  const id = req.params.id;
  const targetUser = (db.users || []).find((u) => u.id === id);
  const cleanNid = targetUser?.nationalId ? String(targetUser.nationalId).trim() : '';

  if (!Array.isArray(db.deleted_user_ids)) db.deleted_user_ids = [];
  if (id && !db.deleted_user_ids.includes(id)) db.deleted_user_ids.push(id);
  if (cleanNid && !db.deleted_user_ids.includes(cleanNid)) db.deleted_user_ids.push(cleanNid);

  db.users = (db.users || []).filter((u) => u.id !== id && (!cleanNid || String(u.nationalId).trim() !== cleanNid));

  if (cleanNid) {
    db.users = db.users.map((u) => {
      if (u.role === 'parent' && Array.isArray(u.childrenNationalIds)) {
        return {
          ...u,
          childrenNationalIds: u.childrenNationalIds.filter((cid: string) => String(cid).trim() !== cleanNid),
        };
      }
      return u;
    });
  }

  db.attendances = (db.attendances || []).filter(
    (a) => a.studentId !== id && (!cleanNid || String(a.nationalId).trim() !== cleanNid)
  );

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

app.put('/api/attendances/:id', (req, res) => {
  const id = req.params.id;
  const updates = req.body;
  const idx = db.attendances.findIndex((a) => a.id === id);
  if (idx >= 0) {
    db.attendances[idx] = { ...db.attendances[idx], ...updates };
    saveDatabase(db);
    res.json({ success: true, attendance: db.attendances[idx], attendances: db.attendances });
  } else {
    res.status(404).json({ success: false, message: 'Attendance record not found' });
  }
});

app.delete('/api/attendances/:id', (req, res) => {
  const id = req.params.id;
  if (!Array.isArray(db.deleted_attendance_ids)) db.deleted_attendance_ids = [];
  if (id && !db.deleted_attendance_ids.includes(id)) {
    db.deleted_attendance_ids.push(id);
  }
  db.attendances = db.attendances.filter((a) => a.id !== id);
  saveDatabase(db);
  res.json({ success: true, attendances: db.attendances, deleted_attendance_ids: db.deleted_attendance_ids });
});

app.post('/api/attendances/delete-batch', (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(db.deleted_attendance_ids)) db.deleted_attendance_ids = [];
  if (Array.isArray(ids) && ids.length > 0) {
    ids.forEach((id: string) => {
      const str = String(id || '');
      if (str && !db.deleted_attendance_ids.includes(str)) {
        db.deleted_attendance_ids.push(str);
      }
    });
    const set = new Set(db.deleted_attendance_ids);
    db.attendances = db.attendances.filter((a) => !set.has(String(a.id)) && !set.has(`${a.studentId}_${a.date}`));
    saveDatabase(db);
  }
  res.json({ success: true, attendances: db.attendances, deleted_attendance_ids: db.deleted_attendance_ids });
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

// 6. Corrections endpoints (Excuses Management)
app.get('/api/corrections', (req, res) => {
  res.json({ success: true, corrections: db.corrections });
});

app.post('/api/corrections', (req, res) => {
  const incoming = req.body;
  if (incoming && incoming.id) {
    if (!Array.isArray(db.corrections)) db.corrections = [];
    const idx = db.corrections.findIndex((c) => c.id === incoming.id);
    if (idx >= 0) {
      const prev = db.corrections[idx];
      // Never let stale pending overwrite already approved/rejected
      if ((prev.status === 'approved' || prev.status === 'rejected') && incoming.status === 'pending') {
        db.corrections[idx] = {
          ...incoming,
          status: prev.status,
          adminDecisionNotes: prev.adminDecisionNotes,
          decidedByName: prev.decidedByName,
          decidedByRole: prev.decidedByRole,
          decidedAt: prev.decidedAt,
          updatedAt: prev.updatedAt || incoming.updatedAt,
        };
      } else {
        db.corrections[idx] = { ...prev, ...incoming };
      }
    } else {
      db.corrections.unshift(incoming);
    }
    saveDatabase(db);
  }
  res.json({ success: true, corrections: db.corrections });
});

app.post('/api/corrections/:id/approve', (req, res) => {
  const id = req.params.id;
  const { adminDecisionNotes, decidedByName, decidedByRole, approvalType } = req.body || {};
  if (!Array.isArray(db.corrections)) db.corrections = [];
  const idx = db.corrections.findIndex((c) => c.id === id);
  const isConditional = approvalType === 'conditional';

  if (idx >= 0) {
    const cor = db.corrections[idx];
    cor.status = 'approved';
    cor.approvalType = isConditional ? 'conditional' : 'official';
    cor.adminDecisionNotes = adminDecisionNotes || (isConditional ? 'تم قبول عذره لهذه المرة فقط، ويرجى إحضار عذر رسمي في المرة القادمة.' : 'تم اعتماد وقبول العذر الرسمي واستعادة درجات المواظبة بنجاح.');
    cor.decidedByName = decidedByName || 'إدارة المدرسة';
    cor.decidedByRole = decidedByRole || 'employee';
    cor.decidedAt = new Date().toISOString();
    cor.updatedAt = new Date().toISOString();

    // Auto-update or create attendance record on the server
    if (!Array.isArray(db.attendances)) db.attendances = [];
    const attIdx = db.attendances.findIndex(
      (a) => a.id === cor.attendanceId || (a.studentId === cor.studentId && a.date === cor.date)
    );
    if (attIdx >= 0) {
      db.attendances[attIdx].finalStatus = cor.requestedStatus || 'excused';
      db.attendances[attIdx].excuseStatus = isConditional ? 'conditional_accepted' : 'accepted';
      db.attendances[attIdx].excuseDecisionType = isConditional ? 'conditional' : 'official';
      db.attendances[attIdx].adminDecisionNotes = cor.adminDecisionNotes;
      db.attendances[attIdx].isTruant = false;
      db.attendances[attIdx].excuseReason = cor.reason || db.attendances[attIdx].excuseReason;
    } else {
      db.attendances.push({
        id: cor.attendanceId || `att-${cor.studentId}-${cor.date}`,
        studentId: cor.studentId,
        studentName: cor.studentName,
        schoolCode: cor.schoolCode,
        className: cor.className,
        sectionName: cor.sectionName,
        date: cor.date,
        period: 1,
        finalStatus: cor.requestedStatus || 'excused',
        excuseStatus: isConditional ? 'conditional_accepted' : 'accepted',
        excuseDecisionType: isConditional ? 'conditional' : 'official',
        adminDecisionNotes: cor.adminDecisionNotes,
        excuseReason: cor.reason,
        isTruant: false,
        timestamp: new Date().toISOString(),
      });
    }

    saveDatabase(db);
    res.json({ success: true, correction: cor, attendances: db.attendances });
  } else {
    // If not found by ID, attempt to locate by body if provided
    const incoming = req.body;
    if (incoming && (incoming.studentId || incoming.attendanceId)) {
      const altIdx = db.corrections.findIndex(
        (c) => (c.attendanceId && c.attendanceId === incoming.attendanceId) || (c.studentId === incoming.studentId && c.date === incoming.date)
      );
      if (altIdx >= 0) {
        db.corrections[altIdx].status = 'approved';
        db.corrections[altIdx].approvalType = isConditional ? 'conditional' : 'official';
        db.corrections[altIdx].adminDecisionNotes = adminDecisionNotes || (isConditional ? 'تم قبول عذره لهذه المرة فقط، ويرجى إحضار عذر رسمي في المرة القادمة.' : 'تم اعتماد وقبول العذر الرسمي واستعادة درجات المواظبة بنجاح.');
        saveDatabase(db);
        return res.json({ success: true, correction: db.corrections[altIdx] });
      }
    }
    res.status(404).json({ success: false, message: 'Correction request not found' });
  }
});

app.post('/api/corrections/:id/reject', (req, res) => {
  const id = req.params.id;
  const { reason, decidedByName, decidedByRole } = req.body || {};
  if (!Array.isArray(db.corrections)) db.corrections = [];
  const idx = db.corrections.findIndex((c) => c.id === id);
  if (idx >= 0) {
    const cor = db.corrections[idx];
    cor.status = 'rejected';
    cor.adminDecisionNotes = reason || 'تم رفض العذر لعدم كفاية المستند المرفق أو تعارضه مع لائحة المواظبة.';
    cor.decidedByName = decidedByName || 'إدارة المدرسة';
    cor.decidedByRole = decidedByRole || 'employee';
    cor.decidedAt = new Date().toISOString();
    cor.updatedAt = new Date().toISOString();

    if (!Array.isArray(db.attendances)) db.attendances = [];
    const attIdx = db.attendances.findIndex(
      (a) => a.id === cor.attendanceId || (a.studentId === cor.studentId && a.date === cor.date)
    );
    if (attIdx >= 0) {
      db.attendances[attIdx].excuseStatus = 'rejected';
    }

    saveDatabase(db);
    res.json({ success: true, correction: cor, attendances: db.attendances });
  } else {
    res.status(404).json({ success: false, message: 'Correction request not found' });
  }
});

// 7. Reset all data (Complete Clean Wipe)
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
    const { createServer: createViteServer } = await import('vite');
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
