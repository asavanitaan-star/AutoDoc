# AutoDoc PCR — Calibration Certificate Generator

เว็บแอปสำหรับ Service Engineer ใช้สร้างใบ **Certificate of Calibration** ของเครื่อง
Applied Biosystems Veriti™ Thermal Cycler จากค่าที่วัดได้ตามฟอร์ม *Planned Maintenance
Protocol (FM-SP-02-11)* — กรอกฟอร์ม → ระบบเช็ค Pass/Fail อัตโนมัติ → พิมพ์เป็น PDF ได้ทันที

> **สำหรับผู้ใช้งาน (Service Engineer):** อ่าน [USER_GUIDE.md](USER_GUIDE.md) —
> วิธี login/สมัครสมาชิก, กรอกฟอร์ม, mapping ค่า TNU, พิมพ์ PDF
> เอกสารนี้ (README) สำหรับผู้ดูแลระบบ/deploy

## การใช้งาน

```bash
npm install      # ครั้งแรกครั้งเดียว
npm start        # เปิดที่ http://localhost:3000
```

ต้องใช้ **Node.js 22.5 ขึ้นไป** (ใช้ `node:sqlite` ในตัว ไม่ต้องติดตั้ง native module)

## ระบบ Login (สำหรับทีมที่กระจายกันหลายที่)

แอปมีระบบบัญชีผู้ใช้แยกรายคน (username/password) ป้องกันไม่ให้ใครก็เข้าถึงข้อมูล
ลูกค้าได้จาก URL — จำเป็นเมื่อขึ้นบน VPS ที่เปิดสู่อินเทอร์เน็ต

**รันครั้งแรก** ระบบจะสร้าง 2 อย่างพร้อมกัน แล้วพิมพ์ออกทาง console ครั้งเดียว
(ดูใน log ของเทอร์มินัล/`pm2 logs`):
1. บัญชี `admin` พร้อมรหัสผ่านสุ่ม — ใช้ login ครั้งแรก
2. **รหัสเชิญสำหรับสมัครสมาชิก** (invite code) — ใช้กับหน้า `/register.html`

**มี 2 วิธีเพิ่มบัญชีวิศวกร:**
- **แบบให้แต่ละคนสมัครเอง** — ส่งลิงก์ `https://<โดเมน>/register.html` + รหัสเชิญ
  ให้ทีม แต่ละคนกรอก username/password เองได้เลย (auto-login ทันทีหลังสมัคร)
- **แบบ admin เพิ่มให้** — ไปที่ **ตั้งค่า → บัญชีผู้ใช้** แล้วเพิ่มทีละคน

ปิด/เปิดการสมัครสมาชิก และสุ่มรหัสเชิญใหม่ได้ที่ **ตั้งค่า → การสมัครสมาชิก**
(รหัสเชิญป้องกันไม่ให้คนแปลกหน้าที่เจอ URL สมัครบัญชีเองได้ — ควรส่งให้เฉพาะทีม
ของคุณ และเปลี่ยนรหัสใหม่ถ้าสงสัยว่ารั่วไหล)

- ทุกบัญชีที่ login แล้วจะจัดการ certificate, จัดการผู้ใช้อื่น และตั้งค่าระบบสมัคร
  สมาชิกได้ (โมเดล trust แบบทีมภายใน ไม่มีสิทธิ์ admin/engineer แยกกัน) — เหมาะ
  กับทีมเล็กที่ไว้ใจกัน
- แต่ละคนเปลี่ยนรหัสผ่านตัวเองได้ที่ตั้งค่า → "เปลี่ยนรหัสผ่านของฉัน"
- Session อยู่ได้ 30 วันต่อการ login หนึ่งครั้ง (คุกกี้ HttpOnly)

## Deploy ขึ้น VPS

```bash
git clone https://github.com/asavanitaan-star/AutoDoc.git
cd AutoDoc
npm install
NODE_ENV=production PORT=3000 npm start   # หรือรันผ่าน pm2 ให้ค้างตลอด
```

- ตั้ง `NODE_ENV=production` เพื่อให้คุกกี้ session ส่งแบบ `Secure` (ต้องมี HTTPS
  หน้า VPS ผ่าน reverse proxy เช่น Nginx/Caddy — **อย่าเปิดพอร์ตตรงแบบ HTTP ออก
  อินเทอร์เน็ต** เพราะจะส่งรหัสผ่าน/คุกกี้แบบไม่เข้ารหัส)
- แนะนำใช้ `pm2 start server.js --name autodoc` เพื่อให้รันค้างและ restart อัตโนมัติ
- โฟลเดอร์ `data/` คือฐานข้อมูลทั้งหมด (certificate + ผู้ใช้) ควร backup เป็นระยะ

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
  index.html         หน้าเว็บหลัก (ต้อง login ก่อนถึงจะเข้าได้)
  login.html/login.js       หน้าเข้าสู่ระบบ
  register.html/register.js หน้าสมัครสมาชิก (ต้องใช้รหัสเชิญ)
  app.js             UI: dashboard / form / settings (รวมจัดการผู้ใช้) / certificate
  certificate.js     render ใบ Certificate + logic Pass/Fail
  logo.js            โลโก้ GenePlus (SVG)
  styles.css         สไตล์ทั้งแอป + เลย์เอาต์พิมพ์ A4
```

## หมายเหตุ

- ข้อมูลทั้งหมดเก็บในเครื่อง (`data/autodoc.db`) — ทำงาน offline ได้
- ปุ่มพิมพ์ใช้ browser print engine เพื่อให้ได้ PDF ที่ layout ตรง โปรดตั้ง Margin เป็น **None** และขนาด **A4**
