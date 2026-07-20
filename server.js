import express from 'express';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  getSettings, saveSettings, peekNextCertNo,
  listCertificates, getCertificate, createCertificate, updateCertificate, deleteCertificate,
  countUsers, listUsers, createUser, deleteUser, changePassword, verifyLogin,
  createSession, getSessionUser, destroySession, purgeExpiredSessions
} from './db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;
const COOKIE_NAME = 'autodoc_sid';
const isProd = process.env.NODE_ENV === 'production';

app.use(express.json({ limit: '2mb' }));

// ---- tiny cookie helpers (no extra dependency) -------------------------------
function parseCookies(req) {
  const header = req.headers.cookie;
  const out = {};
  if (!header) return out;
  header.split(';').forEach(part => {
    const idx = part.indexOf('=');
    if (idx === -1) return;
    out[part.slice(0, idx).trim()] = decodeURIComponent(part.slice(idx + 1).trim());
  });
  return out;
}

function setSessionCookie(res, token) {
  const parts = [
    `${COOKIE_NAME}=${encodeURIComponent(token)}`,
    'HttpOnly', 'Path=/', 'SameSite=Lax',
    `Max-Age=${30 * 24 * 60 * 60}`,
  ];
  if (isProd) parts.push('Secure');
  res.setHeader('Set-Cookie', parts.join('; '));
}

function clearSessionCookie(res) {
  res.setHeader('Set-Cookie', `${COOKIE_NAME}=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0`);
}

// ---- bootstrap: create a default admin account on first run -----------------
if (countUsers() === 0) {
  const bootstrapPassword = crypto.randomBytes(9).toString('base64url');
  createUser({ username: 'admin', password: bootstrapPassword, displayName: 'Administrator' });
  console.log('============================================================');
  console.log(' First run — a default account was created:');
  console.log('   username: admin');
  console.log(`   password: ${bootstrapPassword}`);
  console.log(' Log in and add real accounts for each engineer, then you');
  console.log(' can remove or change this admin account from Settings.');
  console.log('============================================================');
}
purgeExpiredSessions();

// ---- auth middleware ----------------------------------------------------------
function attachUser(req, res, next) {
  const token = parseCookies(req)[COOKIE_NAME];
  req.user = token ? getSessionUser(token) : null;
  req.sessionToken = token;
  next();
}
app.use(attachUser);

function requireAuth(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  next();
}

// ---- auth API (public) ---------------------------------------------------------
app.post('/api/login', (req, res) => {
  const { username, password } = req.body || {};
  const user = verifyLogin(username, password);
  if (!user) return res.status(401).json({ error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' });
  const token = createSession(user.id);
  setSessionCookie(res, token);
  res.json(user);
});

app.post('/api/logout', (req, res) => {
  if (req.sessionToken) destroySession(req.sessionToken);
  clearSessionCookie(res);
  res.json({ ok: true });
});

app.get('/api/me', (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  res.json(req.user);
});

// ---- everything below requires a logged-in session -----------------------------
app.use('/api', requireAuth);

// ---- Users (any authenticated engineer can manage the shared account list) ----
app.get('/api/users', (req, res) => res.json(listUsers()));

app.post('/api/users', (req, res) => {
  try {
    res.status(201).json(createUser(req.body || {}));
  } catch (e) {
    res.status(400).json({ error: String(e.message || e) });
  }
});

app.delete('/api/users/:id', (req, res) => {
  const id = Number(req.params.id);
  if (id === req.user.id) return res.status(400).json({ error: 'ลบบัญชีตัวเองไม่ได้' });
  if (listUsers().length <= 1) return res.status(400).json({ error: 'ต้องมีอย่างน้อย 1 บัญชี' });
  const ok = deleteUser(id);
  if (!ok) return res.status(404).json({ error: 'Not found' });
  res.json({ ok: true });
});

app.put('/api/users/:id/password', (req, res) => {
  const id = Number(req.params.id);
  if (id !== req.user.id) return res.status(403).json({ error: 'เปลี่ยนได้เฉพาะรหัสผ่านของตัวเอง' });
  try {
    changePassword(id, (req.body || {}).password);
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: String(e.message || e) });
  }
});

// ---- Settings ---------------------------------------------------------------
app.get('/api/settings', (req, res) => res.json(getSettings()));
app.put('/api/settings', (req, res) => res.json(saveSettings(req.body)));
app.get('/api/next-cert-no', (req, res) => res.json({ certNo: peekNextCertNo() }));

// ---- Certificates -----------------------------------------------------------
app.get('/api/certificates', (req, res) => res.json(listCertificates()));

app.get('/api/certificates/:id', (req, res) => {
  const c = getCertificate(Number(req.params.id));
  if (!c) return res.status(404).json({ error: 'Not found' });
  res.json(c);
});

app.post('/api/certificates', (req, res) => {
  try {
    res.status(201).json(createCertificate(req.body));
  } catch (e) {
    res.status(400).json({ error: String(e.message || e) });
  }
});

app.put('/api/certificates/:id', (req, res) => {
  const c = updateCertificate(Number(req.params.id), req.body);
  if (!c) return res.status(404).json({ error: 'Not found' });
  res.json(c);
});

app.delete('/api/certificates/:id', (req, res) => {
  const ok = deleteCertificate(Number(req.params.id));
  if (!ok) return res.status(404).json({ error: 'Not found' });
  res.json({ ok: true });
});

// ---- static frontend ----------------------------------------------------------
// login.html/js are reachable without a session; index.html itself has no data
// (it only bootstraps via /api calls, which are protected above), but we still
// gate it explicitly so an unauthenticated visitor is bounced straight to /login.html.
app.get(['/', '/index.html'], (req, res) => {
  if (!req.user) return res.redirect('/login.html');
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});
app.use(express.static(path.join(__dirname, 'public')));

app.listen(PORT, () => {
  console.log(`AutoDoc PCR running →  http://localhost:${PORT}`);
});
