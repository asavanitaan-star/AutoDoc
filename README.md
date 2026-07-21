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

รันครั้งแรกจะมีใบ certificate ตัวอย่าง `SAMPLE-0001` (ข้อมูลสมมติ ไม่ใช่ลูกค้าจริง)
ให้ดูเป็นตัวอย่างบนหน้ารายการ — ลบทิ้งได้ตามสบาย จะไม่ถูกสร้างขึ้นมาใหม่อีก

## รันแบบถาวรด้วย pm2 (สำหรับให้ทั้งทีมใช้งานร่วมกัน)

`npm start` เหมาะกับใช้คนเดียวบนเครื่องตัวเอง แต่ถ้าจะให้เพื่อนร่วมทีมเข้าใช้ผ่าน
เครื่อง/เซิร์ฟเวอร์เดียวกัน ให้รันด้วย [pm2](https://pm2.keymetrics.io/) แทน เพื่อให้
แอปรันค้างไว้เบื้องหลังและ restart อัตโนมัติถ้า crash หรือเครื่อง reboot

```bash
npm install -g pm2       # ครั้งแรกครั้งเดียว (ทำในเครื่อง/เซิร์ฟเวอร์ที่จะรันแอป)
npm run pm2:start        # เทียบเท่า: pm2 start ecosystem.config.cjs
pm2 save                 # จำ process list ไว้
pm2 startup              # (ครั้งแรกครั้งเดียว) แสดงคำสั่งให้ pm2 auto-start ตอนเครื่องเปิด — copy ไปรันตามที่มันบอก
```

คำสั่งที่ใช้บ่อย:

```bash
npm run pm2:logs         # ดู log แบบ real-time (เช่น เพื่อดูรหัสผ่าน admin/รหัสเชิญตอน first-run)
npm run pm2:restart      # restart แอป (เช่น หลัง pull โค้ดใหม่)
npm run pm2:stop         # หยุดแอป
```

จากนั้นเพื่อนร่วมทีมที่อยู่ใน network เดียวกันเข้าได้ที่ `http://<IP เครื่องที่รัน>:3000`
แล้วสมัครบัญชีผ่านรหัสเชิญ (ดูหัวข้อถัดไป)

> ข้อมูลทั้งหมดเก็บในไฟล์ `data/autodoc.db` ไฟล์เดียวบนเครื่องนั้น ไม่ว่าจะรันด้วยวิธี
> ไหนควร backup ไฟล์นี้เป็นระยะ

## เข้าถึงจากนอก LAN + เข้ารหัสทราฟฟิกด้วย Tailscale (แนะนำ)

ถ้ารันแอปบนเครื่อง/VM ในออฟฟิศ (เช่น VMware Ubuntu) ปกติทีมงานต้องอยู่ Wi-Fi
เดียวกันถึงจะเข้าได้ และทราฟฟิกยังเป็น HTTP ธรรมดา (รหัสผ่าน/คุกกี้วิ่งแบบไม่เข้ารหัส
ในเครือข่าย) — [Tailscale](https://tailscale.com) แก้ทั้งสองปัญหานี้โดยไม่ต้องตั้ง
Nginx/certbot เอง และวิศวกรที่ออกไปหน้างานลูกค้าก็เข้าแอปได้เหมือนอยู่ในออฟฟิศ

**บนเครื่อง/VM ที่รันแอป:**
```bash
curl -fsSL https://tailscale.com/install.sh | sh
sudo tailscale up                          # login ครั้งแรก (ผูกกับ Google/GitHub/Microsoft ก็ได้)
sudo tailscale serve https / http://localhost:3000   # เปิด HTTPS จริงให้อัตโนมัติ
```
`tailscale serve` จะออก URL รูปแบบ `https://<ชื่อเครื่อง>.<tailnet>.ts.net` ที่มี
certificate ใช้งานได้จริง ไม่ต้องตั้ง reverse proxy เอง

**บนเครื่องของทีมงานแต่ละคน** ติดตั้งแอป Tailscale (Windows/Mac/Linux/iOS/Android)
แล้ว login ด้วย tailnet เดียวกัน จากนั้นเข้า URL ข้างต้นได้จากทุกที่ที่มีอินเทอร์เน็ต

> แผนฟรีของ Tailscale รองรับ ~3 users / 100 devices ต่อ tailnet — พอสำหรับทีมขนาดเล็ก

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

- มี 2 สิทธิ์: **admin** (บัญชี `admin` ที่ระบบสร้างให้ตอน first-run) เห็นและจัดการ
  certificate ได้ทุกใบ รวมถึงตั้งค่าระบบ/บัญชีผู้ใช้/รหัสเชิญทั้งหมด ส่วน **user**
  (ทุกบัญชีที่เพิ่มทีหลัง ไม่ว่าจะสมัครเองหรือ admin เพิ่มให้) เห็นเฉพาะ certificate
  ที่ตัวเองสร้าง และเข้าหน้าตั้งค่าได้แค่ "เปลี่ยนรหัสผ่านของฉัน"
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
  อินเทอร์เน็ต** เพราะจะส่งรหัสผ่าน/คุกกี้แบบไม่เข้ารหัส) หรือใช้
  [Tailscale](#เข้าถึงจากนอก-lan--เข้ารหัสทราฟฟิกด้วย-tailscale-แนะนำ) แทนก็ได้ —
  `tailscale serve` ออก HTTPS ให้เลยโดยไม่ต้องตั้ง reverse proxy เอง
- แนะนำรันด้วย pm2 แทน `npm start` เพื่อให้ค้างและ restart อัตโนมัติ (ดูหัวข้อ
  [รันแบบถาวรด้วย pm2](#รันแบบถาวรด้วย-pm2-สำหรับให้ทั้งทีมใช้งานร่วมกัน) ด้านบน) —
  ไฟล์ `ecosystem.config.cjs` ตั้ง `NODE_ENV=production` ให้อยู่แล้ว
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
ecosystem.config.cjs config สำหรับรันด้วย pm2 (ดูหัวข้อด้านบน)
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
