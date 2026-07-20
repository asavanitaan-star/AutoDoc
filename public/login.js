document.getElementById('loginLogo').innerHTML = genePlusLogo(40);

document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value;
  const errBox = document.getElementById('loginError');
  errBox.hidden = true;

  try {
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      throw new Error(j.error || 'เข้าสู่ระบบไม่สำเร็จ');
    }
    location.href = '/';
  } catch (err) {
    errBox.textContent = err.message;
    errBox.hidden = false;
  }
});
