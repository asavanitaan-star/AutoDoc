// ---- tiny helpers -----------------------------------------------------------
const $ = (sel, root = document) => root.querySelector(sel);
const app = $('#app');
let SETTINGS = null;

async function api(url, opts) {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...opts,
    body: opts?.body ? JSON.stringify(opts.body) : undefined,
  });
  if (res.status === 401) { location.href = '/login.html'; throw new Error('Unauthorized'); }
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || res.statusText);
  return res.status === 204 ? null : res.json();
}

function toast(msg, kind = 'ok') {
  const t = $('#toast');
  t.textContent = msg;
  t.className = `toast ${kind}`;
  t.hidden = false;
  clearTimeout(toast._t);
  toast._t = setTimeout(() => (t.hidden = true), 2600);
}

const ZONES = [0, 1, 2, 3, 4, 5];
const numArr = (prefix) => ZONES.map(i => Number($(`#${prefix}${i}`)?.value || '') || '');

// ---- router -----------------------------------------------------------------
let ME = null;

window.addEventListener('hashchange', route);
window.addEventListener('DOMContentLoaded', async () => {
  $('#navBrand').onclick = () => (location.hash = '#/dashboard');
  ME = await api('/api/me');
  renderUserChip();
  SETTINGS = await api('/api/settings');
  if (!location.hash) location.hash = '#/dashboard';
  else route();
});

function renderUserChip() {
  const nav = $('.topbar nav');
  const chip = document.createElement('span');
  chip.className = 'user-chip';
  const roleBadge = ME.role === 'admin' ? '<span class="role-badge">admin</span>' : '';
  chip.innerHTML = `<span class="who">${esc(ME.displayName || ME.username)}</span>${roleBadge}<button id="logoutBtn" class="btn sm ghost">ออกจากระบบ</button>`;
  nav.appendChild(chip);
  $('#logoutBtn').onclick = async () => {
    await api('/api/logout', { method: 'POST' });
    location.href = '/login.html';
  };
}

function setActiveNav(name) {
  document.querySelectorAll('[data-nav]').forEach(a =>
    a.classList.toggle('active', a.dataset.nav === name));
}

async function route() {
  const h = location.hash.replace(/^#\//, '');
  const [view, arg] = h.split('/');
  try {
    if (view === 'dashboard' || view === '') { setActiveNav('dashboard'); await renderDashboard(); }
    else if (view === 'new') { setActiveNav('new'); await renderForm(null); }
    else if (view === 'edit') { setActiveNav(''); await renderForm(Number(arg)); }
    else if (view === 'cert') { setActiveNav(''); await renderCert(Number(arg)); }
    else if (view === 'settings') { setActiveNav('settings'); await renderSettings(); }
    else location.hash = '#/dashboard';
  } catch (e) {
    app.innerHTML = `<div class="card error">เกิดข้อผิดพลาด: ${e.message}</div>`;
  }
}

// ---- dashboard --------------------------------------------------------------
async function renderDashboard() {
  const list = await api('/api/certificates');
  const rows = list.map(c => `
    <tr>
      <td><b>${c.certNo || '-'}</b></td>
      <td>${c.organize || ''}</td>
      <td>${c.model || ''}</td>
      <td>${c.serialNumber || ''}</td>
      <td>${c.calibrationDate ? formatCalDate(c.calibrationDate) : ''}</td>
      <td class="row-actions">
        <a class="btn sm" href="#/cert/${c.id}">ดูใบเซอร์</a>
        <a class="btn sm ghost" href="#/edit/${c.id}">แก้ไข</a>
        <button class="btn sm danger" data-del="${c.id}">ลบ</button>
      </td>
    </tr>`).join('');

  app.innerHTML = `
    <div class="page-head">
      <h1>รายการ Certificate</h1>
      <a class="btn primary" href="#/new">+ สร้างใบใหม่</a>
    </div>
    <div class="card">
      ${list.length ? `
      <table class="grid">
        <thead><tr><th>Cert No.</th><th>Organize</th><th>Model</th><th>S/N</th><th>Cal. Date</th><th></th></tr></thead>
        <tbody>${rows}</tbody>
      </table>` : `<p class="muted">ยังไม่มีเอกสาร — กด "สร้างใบใหม่" เพื่อเริ่ม</p>`}
    </div>`;

  app.querySelectorAll('[data-del]').forEach(b => b.onclick = async () => {
    if (!confirm('ลบเอกสารนี้?')) return;
    await api(`/api/certificates/${b.dataset.del}`, { method: 'DELETE' });
    toast('ลบแล้ว');
    renderDashboard();
  });
}

// ---- form -------------------------------------------------------------------
function zoneInputs(prefix, values) {
  return ZONES.map(i =>
    `<input type="number" step="0.01" id="${prefix}${i}" value="${values?.[i] ?? ''}" />`).join('');
}

async function renderForm(id) {
  const editing = id != null;
  let rec = {
    manufacture: SETTINGS.manufacture,
    model: 'Veriti',
    calibratedBy: SETTINGS.engineer.name,
    temp85: [], temp45: [], tnu95: [], tnu60: [],
  };
  let certNoDisplay = '';
  if (editing) {
    rec = await api(`/api/certificates/${id}`);
    certNoDisplay = rec.certNo;
  } else {
    certNoDisplay = (await api('/api/next-cert-no')).certNo;
  }

  app.innerHTML = `
    <div class="page-head">
      <h1>${editing ? 'แก้ไขเอกสาร' : 'สร้าง Certificate ใหม่'}</h1>
      <span class="cert-no-tag">Cert No. <b id="certNoTag">${certNoDisplay}</b></span>
    </div>

    <form id="certForm" autocomplete="off">
      <div class="card">
        <h2>ข้อมูลทั่วไป</h2>
        <div class="fgrid">
          <label>Certificate No.<input id="certNo" value="${certNoDisplay}" /></label>
          <label>Calibration Date<input type="date" id="calibrationDate" value="${rec.calibrationDate || ''}" /></label>
          <label class="col2">Organization Name (Organize)<input id="organize" value="${rec.organize || ''}" /></label>
          <label class="col2">Organization Location (Address)<input id="address" value="${rec.address || ''}" /></label>
          <label>Customer Contact<input id="customerContact" value="${rec.customerContact || ''}" /></label>
          <label>Instrument Model<input id="model" value="${rec.model || ''}" /></label>
          <label>Serial Number<input id="serialNumber" value="${rec.serialNumber || ''}" /></label>
          <label>Manufacture<input id="manufacture" value="${rec.manufacture || ''}" /></label>
          <label>Calibration By<input id="calibratedBy" value="${rec.calibratedBy || ''}" /></label>
        </div>
      </div>

      <div class="card">
        <h2>Performance</h2>
        <div class="perf-grid">
          ${perfField('rampRate', 'Ramp rate', '°C/s', rec.rampRate, `≥ ${SETTINGS.specs.rampMin}`)}
          ${perfField('avgCycleTime', 'Average cycle time', 'Sec.', rec.avgCycleTime, `≤ ${SETTINGS.specs.cycleMax}`)}
          ${perfField('cycleTimeSd', 'Cycle time SD', 'Sec.', rec.cycleTimeSd, `≤ ${SETTINGS.specs.sdMax}`)}
          ${perfField('heatedCover', 'Heated cover', '°C', rec.heatedCover, `${SETTINGS.specs.heatedCoverTarget}±${SETTINGS.specs.heatedCoverTol}`)}
        </div>
      </div>

      <div class="card">
        <h2>Temperature accuracy <small>(spec ± ${SETTINGS.specs.tempAccTol} °C)</small></h2>
        <div class="ztable-form">
          <div class="zform-head"><span></span>${ZONES.map(i => `<span>Zone ${i + 1}</span>`).join('')}<span>ผล</span></div>
          <div class="zform-row"><span class="zform-lbl">Set Point 85 °C</span>${zoneInputs('t85_', rec.temp85)}<span class="zbadge" id="badge_t85">–</span></div>
          <div class="zform-row"><span class="zform-lbl">Set Point 45 °C</span>${zoneInputs('t45_', rec.temp45)}<span class="zbadge" id="badge_t45">–</span></div>
        </div>
      </div>

      <div class="card">
        <h2>Temperature Non Uniformity (TNU) <small>(spec ≤ ${SETTINGS.specs.tnuMax} °C)</small></h2>
        <div class="ztable-form">
          <div class="zform-head"><span></span>${ZONES.map(i => `<span>Zone ${i + 1}</span>`).join('')}<span>Overall</span><span>ผล</span></div>
          <div class="zform-row">
            <span class="zform-lbl">TNU 95 °C <small>→ DOWNRAMP</small></span>
            ${zoneInputs('n95_', rec.tnu95)}
            <input type="number" step="0.01" id="n95_ov" value="${rec.tnu95Overall ?? ''}" class="ov" />
            <span class="zbadge" id="badge_n95">–</span>
          </div>
          <div class="zform-row">
            <span class="zform-lbl">TNU 60 °C <small>→ UPRAMP</small></span>
            ${zoneInputs('n60_', rec.tnu60)}
            <input type="number" step="0.01" id="n60_ov" value="${rec.tnu60Overall ?? ''}" class="ov" />
            <span class="zbadge" id="badge_n60">–</span>
          </div>
        </div>
      </div>

      <div class="form-actions no-print">
        <span class="overall-badge" id="overallBadge">–</span>
        <div class="spacer"></div>
        <a class="btn ghost" href="#/dashboard">ยกเลิก</a>
        <button type="button" class="btn" id="saveBtn">บันทึก</button>
        <button type="button" class="btn primary" id="saveViewBtn">บันทึก & ดูใบเซอร์</button>
      </div>
    </form>`;

  // live evaluation
  const form = $('#certForm');
  form.addEventListener('input', updateBadges);
  updateBadges();

  $('#saveBtn').onclick = () => save(id, false);
  $('#saveViewBtn').onclick = () => save(id, true);
}

function perfField(fid, label, unit, val, spec) {
  return `
    <label class="perf-field">
      <span class="pf-label">${label} <small>${spec} ${unit}</small></span>
      <span class="pf-input">
        <input type="number" step="0.01" id="${fid}" value="${val ?? ''}" />
        <span class="zbadge" id="badge_${fid}">–</span>
      </span>
    </label>`;
}

function readForm() {
  return {
    certNo: $('#certNo').value.trim(),
    calibrationDate: $('#calibrationDate').value,
    organize: $('#organize').value.trim(),
    address: $('#address').value.trim(),
    customerContact: $('#customerContact').value.trim(),
    model: $('#model').value.trim(),
    serialNumber: $('#serialNumber').value.trim(),
    manufacture: $('#manufacture').value.trim(),
    calibratedBy: $('#calibratedBy').value.trim(),
    rampRate: $('#rampRate').value,
    avgCycleTime: $('#avgCycleTime').value,
    cycleTimeSd: $('#cycleTimeSd').value,
    heatedCover: $('#heatedCover').value,
    temp85: numArr('t85_'),
    temp45: numArr('t45_'),
    tnu95: numArr('n95_'),
    tnu60: numArr('n60_'),
    tnu95Overall: Number($('#n95_ov').value || '') || '',
    tnu60Overall: Number($('#n60_ov').value || '') || '',
  };
}

function badge(el, ok) {
  if (!el) return;
  el.textContent = ok ? 'PASS' : 'FAIL';
  el.className = `zbadge ${ok ? 'pass' : 'fail'}`;
}

function updateBadges() {
  const rec = readForm();
  const p = evaluateRecord(rec, SETTINGS);
  badge($('#badge_rampRate'), p.rampRate);
  badge($('#badge_avgCycleTime'), p.avgCycleTime);
  badge($('#badge_cycleTimeSd'), p.cycleTimeSd);
  badge($('#badge_heatedCover'), p.heatedCover);
  badge($('#badge_t85'), p.temp85.every(Boolean));
  badge($('#badge_t45'), p.temp45.every(Boolean));
  badge($('#badge_n95'), p.tnu95.every(Boolean) && p.tnu95Overall);
  badge($('#badge_n60'), p.tnu60.every(Boolean) && p.tnu60Overall);

  // per-cell coloring
  const paint = (prefix, res) => res.forEach((ok, i) => {
    const inp = $(`#${prefix}${i}`);
    if (inp && inp.value !== '') inp.classList.toggle('fail', !ok);
    else if (inp) inp.classList.remove('fail');
  });
  paint('t85_', p.temp85); paint('t45_', p.temp45);
  paint('n95_', p.tnu95); paint('n60_', p.tnu60);

  const ob = $('#overallBadge');
  if (ob) { ob.textContent = p.allPass ? 'OVERALL: PASS' : 'OVERALL: FAIL'; ob.className = `overall-badge ${p.allPass ? 'pass' : 'fail'}`; }
}

async function save(id, thenView) {
  const rec = readForm();
  if (!rec.organize || !rec.serialNumber) {
    toast('กรุณากรอก Organization และ Serial Number', 'err');
    return;
  }
  const saved = id != null
    ? await api(`/api/certificates/${id}`, { method: 'PUT', body: rec })
    : await api('/api/certificates', { method: 'POST', body: rec });
  toast('บันทึกแล้ว');
  location.hash = thenView ? `#/cert/${saved.id}` : '#/dashboard';
}

// ---- certificate view -------------------------------------------------------
async function renderCert(id) {
  const rec = await api(`/api/certificates/${id}`);
  const p = evaluateRecord(rec, SETTINGS);
  app.innerHTML = `
    <div class="cert-toolbar no-print">
      <a class="btn ghost" href="#/dashboard">← กลับ</a>
      <span class="overall-badge ${p.allPass ? 'pass' : 'fail'}">${p.allPass ? 'ALL PASS' : 'พบค่าที่ FAIL'}</span>
      <div class="spacer"></div>
      <a class="btn ghost" href="#/edit/${id}">แก้ไข</a>
      <button class="btn primary" id="printBtn">🖨 พิมพ์ / บันทึกเป็น PDF</button>
    </div>
    <div class="cert-viewport">
      <div class="cert-doc" id="certDoc">${renderCertificate(rec, SETTINGS)}</div>
    </div>`;
  $('#printBtn').onclick = () => window.print();
}

// ---- settings ---------------------------------------------------------------
function changePasswordCardHtml() {
  return `
    <div class="card">
      <h2>เปลี่ยนรหัสผ่านของฉัน</h2>
      <div class="fgrid">
        <label>รหัสผ่านใหม่ (≥ 6 ตัวอักษร)<input id="myNewPassword" type="password" /></label>
      </div>
      <button class="btn sm ghost" id="changeMyPassword" type="button" style="margin-top:8px">เปลี่ยนรหัสผ่าน</button>
    </div>`;
}

function wireChangePasswordCard() {
  $('#changeMyPassword').onclick = async () => {
    const password = $('#myNewPassword').value;
    if (!password) return;
    try {
      await api(`/api/users/${ME.id}/password`, { method: 'PUT', body: { password } });
      $('#myNewPassword').value = '';
      toast('เปลี่ยนรหัสผ่านแล้ว');
    } catch (e) { toast(e.message, 'err'); }
  };
}

async function renderSettings() {
  // regular users only manage their own password — everything else
  // (company info, cert numbering, specs, accounts, invite code) is admin-only
  if (ME.role !== 'admin') {
    app.innerHTML = `<div class="page-head"><h1>ตั้งค่า</h1></div>${changePasswordCardHtml()}`;
    wireChangePasswordCard();
    return;
  }

  const s = await api('/api/settings');
  const eq = s.dedicatedEquipment || [];
  const eqRows = eq.map((e, i) => `
    <tr>
      <td><input data-eq="${i}.type" value="${e.type || ''}" /></td>
      <td><input data-eq="${i}.serial" value="${e.serial || ''}" /></td>
      <td><input data-eq="${i}.calibrated" value="${e.calibrated || ''}" /></td>
      <td><input data-eq="${i}.due" value="${e.due || ''}" /></td>
      <td><input data-eq="${i}.institute" value="${e.institute || ''}" /></td>
      <td><input data-eq="${i}.certNo" value="${e.certNo || ''}" /></td>
      <td><button class="btn sm danger" data-eqdel="${i}">×</button></td>
    </tr>`).join('');

  app.innerHTML = `
    <div class="page-head"><h1>ตั้งค่า</h1></div>

    <div class="card">
      <h2>บริษัท / หัวเอกสาร</h2>
      <div class="fgrid">
        <label class="col2">ชื่อบริษัท<input id="s_coname" value="${s.company.name}" /></label>
        <label class="col2">ที่อยู่ (บรรทัดละแถว)<textarea id="s_coaddr" rows="6">${(s.company.addressLines || []).join('\n')}</textarea></label>
        <label class="col2">ชื่อรุ่นสินค้า (หัวใบเซอร์)<input id="s_product" value="${s.productTitle}" /></label>
        <label>Manufacture (default)<input id="s_manufacture" value="${s.manufacture}" /></label>
      </div>
    </div>

    <div class="card">
      <h2>Service Engineer & ลายเซ็น</h2>
      <div class="fgrid">
        <label>ชื่อ<input id="s_engname" value="${s.engineer.name}" /></label>
        <label>ตำแหน่ง<input id="s_engtitle" value="${s.engineer.title}" /></label>
        <label class="col2">ลายเซ็น (รูปภาพ PNG/JPG)
          <input type="file" id="s_sigfile" accept="image/*" />
        </label>
        <div class="col2 sig-preview-wrap">
          <span class="muted">ตัวอย่างลายเซ็น:</span>
          <div id="s_sigpreview" class="sig-preview">${s.engineer.signature ? `<img src="${s.engineer.signature}"/>` : '<span class="muted">ยังไม่มี</span>'}</div>
          <button class="btn sm ghost" id="s_sigclear" type="button">ลบลายเซ็น</button>
        </div>
      </div>
    </div>

    <div class="card">
      <h2>Certificate No. (รันอัตโนมัติ)</h2>
      <div class="fgrid">
        <label>Prefix<input id="s_prefix" value="${s.certNo.prefix}" /></label>
        <label>เลขถัดไป<input type="number" id="s_counter" value="${s.certNo.counter}" /></label>
        <label>จำนวนหลัก (padding)<input type="number" id="s_padding" value="${s.certNo.padding}" /></label>
        <label>ต่อท้ายด้วยปี ค.ศ.
          <select id="s_suffix"><option value="true" ${s.certNo.suffixYear ? 'selected' : ''}>ใช่ (/YYYY)</option><option value="false" ${!s.certNo.suffixYear ? 'selected' : ''}>ไม่</option></select>
        </label>
      </div>
      <p class="muted">ตัวอย่างเลขถัดไป: <b id="s_certpreview"></b></p>
    </div>

    <div class="card">
      <h2>Reference — Dedicated Equipment (Table 1.1)</h2>
      <table class="grid eqtable">
        <thead><tr><th>Type</th><th>Serial</th><th>Calibrated</th><th>Due</th><th>Institute</th><th>Certificate number</th><th></th></tr></thead>
        <tbody id="eqBody">${eqRows}</tbody>
      </table>
      <button class="btn sm ghost" id="eqAdd" type="button">+ เพิ่มแถว</button>
      <label class="col2" style="margin-top:14px;display:block">Wells ที่วัด<textarea id="s_wells" rows="2">${s.wells || ''}</textarea></label>
    </div>

    <div class="card" id="usersCard">
      <h2>บัญชีผู้ใช้</h2>
      <table class="grid" id="usersTable"><thead><tr><th>Username</th><th>ชื่อที่แสดง</th><th></th></tr></thead><tbody id="usersBody"></tbody></table>
      <div class="fgrid" style="margin-top:14px">
        <label>Username ใหม่<input id="u_username" placeholder="เช่น somchai" /></label>
        <label>ชื่อที่แสดง<input id="u_displayname" placeholder="เช่น สมชาย ใจดี" /></label>
        <label>รหัสผ่าน (≥ 6 ตัวอักษร)<input id="u_password" type="password" /></label>
      </div>
      <button class="btn sm ghost" id="userAdd" type="button" style="margin-top:8px">+ เพิ่มผู้ใช้</button>
    </div>

    <div class="card">
      <h2>การสมัครสมาชิก (หน้า /register.html)</h2>
      <p class="muted">คนที่มีรหัสเชิญนี้เท่านั้นจึงจะสมัครบัญชีเองได้ — ส่งรหัสให้เฉพาะทีมของคุณ</p>
      <div class="fgrid">
        <label>เปิดให้สมัครสมาชิก
          <select id="reg_enabled">
            <option value="true" ${s.registration?.enabled ? 'selected' : ''}>เปิด</option>
            <option value="false" ${!s.registration?.enabled ? 'selected' : ''}>ปิด</option>
          </select>
        </label>
        <label>รหัสเชิญ<input id="reg_code" value="${esc(s.registration?.code || '')}" /></label>
      </div>
      <button class="btn sm ghost" id="reg_regen" type="button" style="margin-top:8px">🔄 สุ่มรหัสใหม่</button>
    </div>

    ${changePasswordCardHtml()}

    <div class="card">
      <h2>Specification (เกณฑ์ Pass/Fail)</h2>
      <div class="fgrid">
        <label>Ramp rate ≥<input type="number" step="0.01" id="sp_rampMin" value="${s.specs.rampMin}" /></label>
        <label>Cycle time ≤<input type="number" step="0.01" id="sp_cycleMax" value="${s.specs.cycleMax}" /></label>
        <label>Cycle SD ≤<input type="number" step="0.01" id="sp_sdMax" value="${s.specs.sdMax}" /></label>
        <label>Heated cover target<input type="number" step="0.01" id="sp_hcTarget" value="${s.specs.heatedCoverTarget}" /></label>
        <label>Heated cover ± tol<input type="number" step="0.01" id="sp_hcTol" value="${s.specs.heatedCoverTol}" /></label>
        <label>Temp accuracy ± tol<input type="number" step="0.01" id="sp_accTol" value="${s.specs.tempAccTol}" /></label>
        <label>TNU ≤<input type="number" step="0.01" id="sp_tnuMax" value="${s.specs.tnuMax}" /></label>
      </div>
    </div>

    <div class="form-actions no-print">
      <div class="spacer"></div>
      <button class="btn primary" id="saveSettings" type="button">บันทึกการตั้งค่า</button>
    </div>`;

  // signature upload
  let sigData = s.engineer.signature || '';
  $('#s_sigfile').onchange = (e) => {
    const f = e.target.files[0]; if (!f) return;
    const r = new FileReader();
    r.onload = () => { sigData = r.result; $('#s_sigpreview').innerHTML = `<img src="${sigData}"/>`; };
    r.readAsDataURL(f);
  };
  $('#s_sigclear').onclick = () => { sigData = ''; $('#s_sigpreview').innerHTML = '<span class="muted">ยังไม่มี</span>'; };

  // cert no preview
  const updatePreview = () => {
    const prefix = $('#s_prefix').value;
    const counter = Number($('#s_counter').value || 0);
    const padding = Number($('#s_padding').value || 0);
    const suffix = $('#s_suffix').value === 'true';
    $('#s_certpreview').textContent = `${prefix}${String(counter).padStart(padding, '0')}${suffix ? '/' + new Date().getFullYear() : ''}`;
  };
  ['s_prefix', 's_counter', 's_padding', 's_suffix'].forEach(id => $('#' + id).addEventListener('input', updatePreview));
  updatePreview();

  // equipment add/remove
  const collectEq = () => {
    const map = {};
    app.querySelectorAll('[data-eq]').forEach(inp => {
      const [idx, key] = inp.dataset.eq.split('.');
      (map[idx] ||= {})[key] = inp.value;
    });
    return Object.keys(map).sort((a, b) => a - b).map(k => map[k]);
  };
  $('#eqAdd').onclick = () => {
    const cur = collectEq();
    cur.push({ type: '', serial: '', calibrated: '', due: '', institute: '', certNo: '' });
    s.dedicatedEquipment = cur;
    renderSettingsEqBody(cur);
  };
  app.querySelectorAll('[data-eqdel]').forEach(b => b.onclick = () => {
    const cur = collectEq(); cur.splice(Number(b.dataset.eqdel), 1);
    renderSettingsEqBody(cur);
  });

  // users
  await loadUsers();
  $('#userAdd').onclick = async () => {
    const username = $('#u_username').value.trim();
    const displayName = $('#u_displayname').value.trim();
    const password = $('#u_password').value;
    if (!username || !password) { toast('กรอก username และ password', 'err'); return; }
    try {
      await api('/api/users', { method: 'POST', body: { username, displayName, password } });
      $('#u_username').value = ''; $('#u_displayname').value = ''; $('#u_password').value = '';
      toast('เพิ่มผู้ใช้แล้ว');
      await loadUsers();
    } catch (e) { toast(e.message, 'err'); }
  };

  $('#reg_regen').onclick = () => {
    const bytes = crypto.getRandomValues(new Uint8Array(9));
    const code = btoa(String.fromCharCode(...bytes)).replace(/[+/=]/g, '').slice(0, 10);
    $('#reg_code').value = code;
  };

  wireChangePasswordCard();

  $('#saveSettings').onclick = async () => {
    const payload = {
      ...s,
      company: { name: $('#s_coname').value, addressLines: $('#s_coaddr').value.split('\n').map(x => x.trim()).filter(Boolean) },
      productTitle: $('#s_product').value,
      manufacture: $('#s_manufacture').value,
      engineer: { name: $('#s_engname').value, title: $('#s_engtitle').value, signature: sigData },
      certNo: {
        prefix: $('#s_prefix').value, counter: Number($('#s_counter').value || 0),
        padding: Number($('#s_padding').value || 0), suffixYear: $('#s_suffix').value === 'true',
      },
      dedicatedEquipment: collectEq(),
      wells: $('#s_wells').value.trim(),
      registration: { enabled: $('#reg_enabled').value === 'true', code: $('#reg_code').value.trim() },
      specs: {
        rampMin: Number($('#sp_rampMin').value), cycleMax: Number($('#sp_cycleMax').value),
        sdMax: Number($('#sp_sdMax').value), heatedCoverTarget: Number($('#sp_hcTarget').value),
        heatedCoverTol: Number($('#sp_hcTol').value), tempAccTol: Number($('#sp_accTol').value),
        tnuMax: Number($('#sp_tnuMax').value),
      },
    };
    SETTINGS = await api('/api/settings', { method: 'PUT', body: payload });
    toast('บันทึกการตั้งค่าแล้ว');
  };
}

async function loadUsers() {
  const users = await api('/api/users');
  $('#usersBody').innerHTML = users.map(u => `
    <tr>
      <td>${esc(u.username)}${u.id === ME.id ? ' <small class="muted">(คุณ)</small>' : ''}</td>
      <td>${esc(u.displayName)}</td>
      <td>${u.id === ME.id ? '' : `<button class="btn sm danger" data-userdel="${u.id}">ลบ</button>`}</td>
    </tr>`).join('');
  $('#usersBody').querySelectorAll('[data-userdel]').forEach(b => b.onclick = async () => {
    if (!confirm('ลบบัญชีนี้?')) return;
    try {
      await api(`/api/users/${b.dataset.userdel}`, { method: 'DELETE' });
      toast('ลบผู้ใช้แล้ว');
      await loadUsers();
    } catch (e) { toast(e.message, 'err'); }
  });
}

function renderSettingsEqBody(eq) {
  $('#eqBody').innerHTML = eq.map((e, i) => `
    <tr>
      <td><input data-eq="${i}.type" value="${e.type || ''}" /></td>
      <td><input data-eq="${i}.serial" value="${e.serial || ''}" /></td>
      <td><input data-eq="${i}.calibrated" value="${e.calibrated || ''}" /></td>
      <td><input data-eq="${i}.due" value="${e.due || ''}" /></td>
      <td><input data-eq="${i}.institute" value="${e.institute || ''}" /></td>
      <td><input data-eq="${i}.certNo" value="${e.certNo || ''}" /></td>
      <td><button class="btn sm danger" data-eqdel="${i}">×</button></td>
    </tr>`).join('');
  app.querySelectorAll('[data-eqdel]').forEach(b => b.onclick = () => {
    const map = {};
    app.querySelectorAll('[data-eq]').forEach(inp => { const [idx, key] = inp.dataset.eq.split('.'); (map[idx] ||= {})[key] = inp.value; });
    const cur = Object.keys(map).sort((a, b) => a - b).map(k => map[k]);
    cur.splice(Number(b.dataset.eqdel), 1);
    renderSettingsEqBody(cur);
  });
}
