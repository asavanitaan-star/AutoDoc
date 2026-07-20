// Certificate rendering + shared spec-evaluation helpers.
// Exposed globally: fmt, evaluateRecord, renderCertificate

function fmt(v, dp = 2) {
  if (v === '' || v === null || v === undefined) return '';
  const n = Number(v);
  return Number.isFinite(n) ? n.toFixed(dp) : String(v);
}

function esc(s) {
  return String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

// Evaluate a record against spec limits. Returns { fields..., allPass }
function evaluateRecord(rec, settings) {
  const sp = settings.specs;
  const num = v => (v === '' || v == null ? NaN : Number(v));
  const p = {};

  p.rampRate = num(rec.rampRate) >= sp.rampMin;
  p.avgCycleTime = num(rec.avgCycleTime) <= sp.cycleMax;
  p.cycleTimeSd = num(rec.cycleTimeSd) <= sp.sdMax;
  p.heatedCover = Math.abs(num(rec.heatedCover) - sp.heatedCoverTarget) <= sp.heatedCoverTol;

  const accCheck = (arr, target) => (arr || []).map(v => Math.abs(num(v) - target) <= sp.tempAccTol);
  p.temp85 = accCheck(rec.temp85, 85);
  p.temp45 = accCheck(rec.temp45, 45);

  const tnuCheck = arr => (arr || []).map(v => num(v) <= sp.tnuMax);
  p.tnu95 = tnuCheck(rec.tnu95);
  p.tnu60 = tnuCheck(rec.tnu60);
  p.tnu95Overall = num(rec.tnu95Overall) <= sp.tnuMax;
  p.tnu60Overall = num(rec.tnu60Overall) <= sp.tnuMax;

  const flat = [
    p.rampRate, p.avgCycleTime, p.cycleTimeSd, p.heatedCover,
    ...p.temp85, ...p.temp45, ...p.tnu95, ...p.tnu60, p.tnu95Overall, p.tnu60Overall
  ];
  p.allPass = flat.every(Boolean);
  return p;
}

function formatCalDate(iso) {
  if (!iso) return '';
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return iso;
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${Number(m[3])} ${months[Number(m[2]) - 1]} ${m[1]}`;
}

// Build the two-page certificate markup.
function renderCertificate(rec, settings) {
  const co = settings.company;
  const sp = settings.specs;
  const box = v => `<span class="cbox">${esc(fmt(v))}</span>`;
  const zoneHead = extra =>
    `<div class="zhead"><span class="zlead"></span>${[1, 2, 3, 4, 5, 6].map(z => `<span>Zone ${z}</span>`).join('')}${extra || ''}</div>`;

  const tempRow = (label, arr, target) => `
    <div class="zrow">
      <span class="zlead">${esc(label)}</span>
      ${(arr || Array(6).fill('')).map(box).join('')}
      <span class="zspec">Spec. : ± ${sp.tempAccTol} °C</span>
    </div>`;

  const tnuRow = (label, sub, arr, overall) => `
    <div class="zrow tnu">
      <span class="zlead"><b>${esc(label)}</b><small>${esc(sub)}</small></span>
      ${(arr || Array(6).fill('')).map(box).join('')}
      ${box(overall)}
    </div>`;

  const perfRow = (label, val, unit, spec) => `
    <div class="perf-row">
      <span class="perf-lbl">${esc(label)}</span>
      <span class="perf-val">${esc(fmt(val))}</span>
      <span class="perf-unit">${unit}</span>
      <span class="perf-spec">${esc(spec)}</span>
    </div>`;

  const equipRows = (settings.dedicatedEquipment || []).map(e => `
    <tr><td>${esc(e.type)}</td><td>${esc(e.serial)}</td><td>${esc(e.calibrated)}</td>
        <td>${esc(e.due)}</td><td>${esc(e.institute)}</td><td>${esc(e.certNo)}</td></tr>`).join('');

  const sigImg = settings.engineer.signature
    ? `<img class="sig-img" src="${settings.engineer.signature}" alt="signature"/>`
    : `<div class="sig-line"></div>`;

  // ---------- PAGE 1 ----------
  const page1 = `
  <section class="cert-page">
    <div class="cert-header">
      <div class="cert-header-left">
        <div class="co-name">${esc(co.name)}</div>
        <div class="co-addr">${(co.addressLines || []).map(esc).join('<br>')}</div>
      </div>
      <div class="cert-header-right">${genePlusLogo(56)}</div>
    </div>

    <h1 class="cert-title">CERTIFICATE OF CALIBRATION</h1>
    <div class="cert-subtitle">${esc(settings.productTitle)}</div>

    <div class="cert-fields">
      <div><span class="lbl">Certificate:No.</span><span class="val">${esc(rec.certNo)}</span></div>
      <div><span class="lbl">Organize:</span><span class="val">${esc(rec.organize)}</span></div>
      <div><span class="lbl">Address:</span><span class="val">${esc(rec.address)}</span></div>
      <div><span class="lbl">Model:</span><span class="val tab">${esc(rec.model)}</span></div>
      <div><span class="lbl">S/N :</span><span class="val tab">${esc(rec.serialNumber)}</span></div>
      <div><span class="lbl">Manufacture:</span><span class="val">${esc(rec.manufacture || settings.manufacture)}</span></div>
      <div><span class="lbl">Calibration Date:</span><span class="val tab">${esc(formatCalDate(rec.calibrationDate))}</span></div>
    </div>

    <h2 class="sec">Performance</h2>
    ${perfRow('Ramp rate', rec.rampRate, '°C/s', `Spec ≥ ${sp.rampMin} °C/s`)}
    ${perfRow('Averate cycle time', rec.avgCycleTime, 'Sec.', `Spec ≤ ${sp.cycleMax} Sec.`)}
    ${perfRow('Cycle time SD', rec.cycleTimeSd, 'Sec.', `Spec ≤ ${sp.sdMax} Sec.`)}
    ${perfRow('Heated cover Verification', rec.heatedCover, '°C', `Spec ${sp.heatedCoverTarget}±${sp.heatedCoverTol} °C`)}

    <h2 class="sec">Temperature accuracy</h2>
    <div class="ztable">
      <div class="zhead"><span class="zlead">Set Point °C</span>${[1, 2, 3, 4, 5, 6].map(z => `<span>Zone ${z}</span>`).join('')}<span class="zspec"></span></div>
      ${tempRow('85 °C', rec.temp85, 85)}
      ${tempRow('45 °C', rec.temp45, 45)}
    </div>

    <h2 class="sec">Temperature Non Uniformity ( TNU )</h2>
    <div class="ztable">
      ${zoneHead('<span class="zovh">Overall</span>')}
      ${tnuRow('DOWNRAMP TNU', '(95°C - 60°C) @ 30 sec.', rec.tnu95, rec.tnu95Overall)}
      ${zoneHead('<span class="zovh">Overall</span>')}
      ${tnuRow('UPRAMP TNU', '(60°C - 95°C) @ 30 sec.', rec.tnu60, rec.tnu60Overall)}
    </div>
    <p class="tnu-note">Temperature Non Unifomity across all zones, ≤ ${sp.tnuMax} °C, 30 second after clock start</p>
    <p class="cert-foot">This instrument has been calibrated and tested with dedicated calibration equipment, listed on the Reference sheet</p>
  </section>`;

  // ---------- PAGE 2 (Reference) ----------
  const page2 = `
  <section class="cert-page">
    <h1 class="ref-title">Reference</h1>
    <div class="ref-subtitle">${esc(settings.productTitle)}</div>

    <h3 class="ref-h">Performance</h3>
    <p class="ref-u">Heat and Cooling rate :</p>
    <p>&nbsp;&nbsp;&nbsp;The heat rate is determined with a standard diagnostic test of the instrument itself.
       meassure the increase or decrease of temperature per second at maximum power.</p>

    <p class="ref-u">Average cycle time and cycle time SD :</p>
    <p>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;The average cycle time is the average time that is needed to complete one cycle.
       The instrument will run a six cycles program. During this "Cycle test" the standard Deviation
       (SD) of the time between the cycles is measure.</p>

    <h3 class="ref-h">Calibration and calibration-verification</h3>
    <p>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;actual temperature in the wells during calibration and calibration and calibration-
       verification is measured with RTD probes on dedicated calibration equipment. For
       calibration of the dedicated equipment, a reference probe, and digital Thermometer are use.</p>

    <p class="ref-cap">Table 1.1 : Dedicated Equipment</p>
    <table class="ref-table">
      <thead><tr><th>Type</th><th>Serial number</th><th>Calibrated</th><th>Due</th><th>Institute</th><th>Certificate number</th></tr></thead>
      <tbody>${equipRows}</tbody>
    </table>

    <p class="ref-wells">The temperature is constantly measured in the following wells:<br>
       ${esc(settings.wells)}. Please note that the A1 position is at the top left-hand cornner of the block.</p>

    <h3 class="ref-h">Temperature Non Uniformity ( TNU )</h3>
    <p>During TNU measurement the difference in temperature is measured between the wells.
       At downramp and upramp the TNU is measured after 30 seconds of stabilization at 60°C and 95°C.
       The specification of TNU is measured as ≤ ${sp.tnuMax}°C, 30 seconds after the clock started.</p>

    <div class="sig-block">
      <div class="sig-title">Calibration By</div>
      ${sigImg}
      <div class="sig-name">${esc(settings.engineer.name)}</div>
      <div class="sig-role">${esc(settings.engineer.title)}</div>
    </div>
  </section>`;

  return page1 + page2;
}
