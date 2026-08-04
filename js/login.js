/* ============================================================
   IJDrives — login.js
   Wires the login page form:
   - Redirect to dashboard if already logged in
   - Password show/hide toggle
   - Form validation with inline errors
   - Calls Auth.login() on submit
   - Shows loading state on button
   - Redirects to dashboard on success
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {

  // ── Redirect if already logged in ───────────────────────
  if (Utils.isLoggedIn()) {
    window.location.href = 'dashboard.html';
    return;
  }

  // ── Element refs ─────────────────────────────────────────
  const emailInput = document.getElementById('email');
  const pwInput    = document.getElementById('password');
  const loginBtn   = document.getElementById('login-btn');
  const togglePw   = document.getElementById('toggle-pw');

  // ── Password show/hide ───────────────────────────────────
  if (togglePw && pwInput) {
    togglePw.addEventListener('click', () => {
      const isHidden  = pwInput.type === 'password';
      pwInput.type    = isHidden ? 'text' : 'password';
      const icon = togglePw.querySelector('i');
      if (icon) icon.className = isHidden ? 'fa-solid fa-eye-slash' : 'fa-solid fa-eye';
      pwInput.focus();
    });
  }

  // ── Inline error helpers ─────────────────────────────────
  function setError(inputEl, message) {
    clearError(inputEl);
    inputEl.style.borderColor = 'var(--danger)';
    const err = document.createElement('span');
    err.className   = 'field-error';
    err.textContent = message;
    err.style.cssText = 'display:block; font-size:0.76rem; color:var(--danger); margin-top:4px;';
    inputEl.parentElement.appendChild(err);
  }

  function clearError(inputEl) {
    inputEl.style.borderColor = '';
    const existing = inputEl.parentElement.querySelector('.field-error');
    if (existing) existing.remove();
  }

  // ── Validate ─────────────────────────────────────────────
  function validate() {
    let valid = true;
    clearError(emailInput);
    clearError(pwInput);

    if (!emailInput?.value.trim()) {
      setError(emailInput, 'Email address is required.');
      valid = false;
    }
    if (!pwInput?.value) {
      setError(pwInput, 'Password is required.');
      valid = false;
    }
    return valid;
  }

  // ── Loading state ─────────────────────────────────────────
  function setLoading(isLoading) {
    if (!loginBtn) return;
    loginBtn.disabled = isLoading;
    loginBtn.innerHTML = isLoading
      ? '<span class="spinner" style="width:18px;height:18px;border-width:2px;"></span> Logging in...'
      : '<i class="fa-solid fa-right-to-bracket"></i> Log In';
  }

  // ── Main login handler ───────────────────────────────────
  async function handleLogin() {
    if (!validate()) return;

    setLoading(true);

    try {
      await Auth.login({
        email:    emailInput.value.trim(),
        password: pwInput.value,
      });

      // Successful — go to dashboard
      window.location.href = 'dashboard.html';

    } catch (err) {
      setLoading(false);
      const msg = err.message || 'Login failed. Please try again.';

      // Show error on the email field (same generic message for
      // both wrong email and wrong password — security best practice)
      setError(emailInput, msg);
      setError(pwInput, ' '); // red border only, no duplicate text
      pwInput.value = '';     // clear password on failure
      pwInput.focus();
    }
  }

  // ── Wire button + Enter key ──────────────────────────────
  if (loginBtn) {
    loginBtn.addEventListener('click', handleLogin);
  }

  [emailInput, pwInput].forEach(el => {
    if (!el) return;
    el.addEventListener('keydown', e => {
      if (e.key === 'Enter') handleLogin();
    });
    el.addEventListener('input', () => clearError(el));
  });

});
