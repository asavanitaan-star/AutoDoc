document.getElementById('loginLogo').innerHTML = genePlusLogo(40);

(async () => {
  try {
    const info = await (await fetch('/api/registration-info')).json();
    if (!info.enabled) {
      document.getElementById('registerForm').hidden = true;
      const err = document.getElementById('registerError');
      err.textContent = 'ปิดการสมัครสมาชิกอยู่ในขณะนี้ กรุณาติดต่อผู้ดูแลระบบ';
      err.hidden = false;
    }
  } catch { /* ignore — form still works, server will reject on submit if disabled */ }
})();

document.getElementById('registerForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const username = document.getElementById('username').value.trim();
  const displayName = document.getElementById('displayName').value.trim();
  const password = document.getElementById('password').value;
  const code = document.getElementById('code').value.trim();
  const errBox = document.getElementById('registerError');
  errBox.hidden = true;

  try {
    const res = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, displayName, password, code }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      throw new Error(j.error || 'สมัครสมาชิกไม่สำเร็จ');
    }
    location.href = '/';
  } catch (err) {
    errBox.textContent = err.message;
    errBox.hidden = false;
  }
});
