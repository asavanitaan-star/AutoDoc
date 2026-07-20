# AutoDoc PCR — Calibration Certificate Generator

เว็บแอปสำหรับ Service Engineer ใช้สร้างใบ **Certificate of Calibration** ของเครื่อง
Applied Biosystems Veriti™ Thermal Cycler จากค่าที่วัดได้ตามฟอร์ม *Planned Maintenance
Protocol (FM-SP-02-11)* — กรอกฟอร์ม → ระบบเช็ค Pass/Fail อัตโนมัติ → พิมพ์เป็น PDF ได้ทันที

## การใช้งาน

```bash
npm install      # ครั้งแรกครั้งเดียว
npm start        # เปิดที่ http://localhost:3000
```

ต้องใช้ **Node.js 22.5 ขึ้นไป** (ใช้ `node:sqlite` ในตัว ไม่ต้องติดตั้ง native module)

## Workflow

1. **สร้างใหม่** — กรอกข้อมูลทั่วไป, Performance, Temperature accuracy (85/45 °C),
   TNU (95/60 °C) พร้อมเห็นผล PASS/FAIL รายช่องแบบ real-time
2. **บันทึก & ดูใบเซอร์** — เปิดใบ Certificate 2 หน้า (หน้าหลัก + Reference)
   หน้าตาตรงตามตัวอย่าง
3. **พิมพ์ / บันทึกเป็น PDF** — กดปุ่มพิมพ์ → เลือก "Save as PDF" (ตั้งขนาด A4, Margin: None)

## การ mapping ค่า (ฟอร์มวัดค่า → ใบ Certificate)

| ฟอร์ม (PM Protocol)        | ใบ Certificate            |
| -------------------------- | ------------------------- |
| Organization Name          | Organize                  |
| Organization Location      | Address                   |
| Instrument Serial Number   | S/N                       |
| TNU: 95 °C (6 zone + Overall) | **DOWNRAMP TNU** (95→60) |
| TNU: 60 °C (6 zone + Overall) | **UPRAMP TNU** (60→95)   |

## เกณฑ์ Pass/Fail (แก้ได้ในหน้า "ตั้งค่า")

Ramp ≥ 1.5 °C/s · Avg cycle ≤ 77 s · Cycle SD ≤ 2 s · Heated cover 105±3 °C ·
Temp accuracy ±0.25 °C · TNU ≤ 0.5 °C

## ค่า default ที่ตั้งไว้ล่วงหน้า (หน้า "ตั้งค่า")

- **บริษัท/หัวเอกสาร** — GENE PLUS CO., LTD. + ที่อยู่ + โลโก้
- **Service Engineer** — ชื่อ, ตำแหน่ง, อัปโหลดรูปลายเซ็นได้
- **Certificate No.** — รันอัตโนมัติ เช่น `GP0061/2026` (แก้ prefix / เลขถัดไป / รูปแบบได้)
- **Reference — Dedicated Equipment (Table 1.1)** — ตาราง Alpha technic / Reference probe
- **Wells** ที่วัด

## โครงสร้างไฟล์

```
server.js            Express API
db.js                node:sqlite — ฐานข้อมูล + ค่า default + cert-number runner
data/autodoc.db      ฐานข้อมูล (สร้างอัตโนมัติ)
public/
  index.html         หน้าเว็บหลัก
  app.js             UI: dashboard / form / settings / certificate
  certificate.js     render ใบ Certificate + logic Pass/Fail
  logo.js            โลโก้ GenePlus (SVG)
  styles.css         สไตล์ทั้งแอป + เลย์เอาต์พิมพ์ A4
```

## หมายเหตุ

- ข้อมูลทั้งหมดเก็บในเครื่อง (`data/autodoc.db`) — ทำงาน offline ได้
- ปุ่มพิมพ์ใช้ browser print engine เพื่อให้ได้ PDF ที่ layout ตรง โปรดตั้ง Margin เป็น **None** และขนาด **A4**
