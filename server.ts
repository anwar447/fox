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
