// Database layer using Node's built-in SQLite (node:sqlite, Node >= 22.5).
// No native compilation required.
import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

export const db = new DatabaseSync(path.join(dataDir, 'autodoc.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS certificates (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    cert_no      TEXT UNIQUE,
    data         TEXT NOT NULL,          -- full record as JSON
    created_at   TEXT NOT NULL,
    updated_at   TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS settings (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
`);

// ---- Settings helpers -------------------------------------------------------

const DEFAULT_SETTINGS = {
  company: {
    name: 'GENE PLUS CO., LTD.',
    addressLines: [
      '345/3, 345/4,345/5 Soi Lad Phrao 94 (Panchamit)',
      'Phlappha, Wang Thonglang, Bangkok 10310',
      'TEL. (66) 0 274 1291-5',
      'FAX. (66) 0 2692 9550',
      'www.gene-plus.com',
      'Email: info@gene-plus.com'
    ]
  },
  manufacture: 'Applied Biosystems',
  productTitle: 'Applied Biosystems Veriti™ Thermal Cycler 0.2 mL',
  engineer: {
    name: 'Kittichai Srimanee',
    title: 'Service Engineer',
    signature: ''            // data-URL of signature image (optional)
  },
  certNo: {
    prefix: 'GP',
    counter: 61,             // next number to use
    padding: 4,
    suffixYear: true         // append "/<year>"
  },
  // Table 1.1 : Dedicated Equipment (Reference page)
  dedicatedEquipment: [
    { type: 'Alpha technic 4690', serial: '601501', calibrated: '13/11/2025', due: '13/11/2026', institute: 'TE', certNo: 'T0981811132025' },
    { type: 'Reference probe',    serial: 'T09818', calibrated: '13/11/2025', due: '13/11/2026', institute: 'TE', certNo: 'T0981811132025' }
  ],
  wells: 'A1,A3,A5,A7,A9,A11,C2,C4,C6,C8,C10,C12,E1,E3,E5,E7,E9,E11,H2,H4,H6,H8,H10 and H12',
  // Specification limits (used for auto Pass/Fail)
  specs: {
    rampMin: 1.5,
    cycleMax: 77,
    sdMax: 2,
    heatedCoverTarget: 105,
    heatedCoverTol: 3,
    tempAccTol: 0.25,
    tnuMax: 0.5
  }
};

export function getSettings() {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get('app');
  if (!row) return structuredClone(DEFAULT_SETTINGS);
  try {
    // shallow-merge stored settings over defaults so new keys appear automatically
    const stored = JSON.parse(row.value);
    return { ...structuredClone(DEFAULT_SETTINGS), ...stored };
  } catch {
    return structuredClone(DEFAULT_SETTINGS);
  }
}

export function saveSettings(obj) {
  const now = new Date().toISOString();
  db.prepare(`INSERT INTO settings (key, value) VALUES ('app', ?)
              ON CONFLICT(key) DO UPDATE SET value = excluded.value`).run(JSON.stringify(obj));
  return obj;
}

export function peekNextCertNo() {
  const s = getSettings();
  const c = s.certNo;
  const num = String(c.counter).padStart(c.padding, '0');
  const year = new Date().getFullYear();
  return `${c.prefix}${num}${c.suffixYear ? '/' + year : ''}`;
}

export function consumeCertNo() {
  const s = getSettings();
  const certNo = peekNextCertNo();
  s.certNo.counter = Number(s.certNo.counter) + 1;
  saveSettings(s);
  return certNo;
}

// ---- Certificate CRUD -------------------------------------------------------

export function listCertificates() {
  const rows = db.prepare('SELECT id, cert_no, data, created_at, updated_at FROM certificates ORDER BY id DESC').all();
  return rows.map(r => {
    const d = JSON.parse(r.data);
    return {
      id: r.id,
      certNo: r.cert_no,
      organize: d.organize || '',
      model: d.model || '',
      serialNumber: d.serialNumber || '',
      calibrationDate: d.calibrationDate || '',
      createdAt: r.created_at,
      updatedAt: r.updated_at
    };
  });
}

export function getCertificate(id) {
  const row = db.prepare('SELECT id, cert_no, data, created_at, updated_at FROM certificates WHERE id = ?').get(id);
  if (!row) return null;
  return { id: row.id, certNo: row.cert_no, createdAt: row.created_at, updatedAt: row.updated_at, ...JSON.parse(row.data) };
}

export function createCertificate(data) {
  const now = new Date().toISOString();
  // assign a cert number if the client didn't supply one
  const certNo = (data.certNo && String(data.certNo).trim()) || consumeCertNo();
  const payload = { ...data, certNo };
  const info = db.prepare(
    'INSERT INTO certificates (cert_no, data, created_at, updated_at) VALUES (?, ?, ?, ?)'
  ).run(certNo, JSON.stringify(payload), now, now);
  return getCertificate(info.lastInsertRowid);
}

export function updateCertificate(id, data) {
  const existing = getCertificate(id);
  if (!existing) return null;
  const now = new Date().toISOString();
  const certNo = (data.certNo && String(data.certNo).trim()) || existing.certNo;
  const payload = { ...data, certNo };
  db.prepare('UPDATE certificates SET cert_no = ?, data = ?, updated_at = ? WHERE id = ?')
    .run(certNo, JSON.stringify(payload), now, id);
  return getCertificate(id);
}

export function deleteCertificate(id) {
  return db.prepare('DELETE FROM certificates WHERE id = ?').run(id).changes > 0;
}
