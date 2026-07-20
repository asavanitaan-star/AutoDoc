import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  getSettings, saveSettings, peekNextCertNo,
  listCertificates, getCertificate, createCertificate, updateCertificate, deleteCertificate
} from './db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '2mb' }));
app.use(express.static(path.join(__dirname, 'public')));

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

app.listen(PORT, () => {
  console.log(`AutoDoc PCR running →  http://localhost:${PORT}`);
});
