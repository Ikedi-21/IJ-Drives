/*
   IJDrives — signup.js
   Wires the signup page form:
   - Redirect to dashboard if already logged in
   - Password show/hide toggles
   - Live password strength meter
   - Form validation with inline error messages
   - Calls Auth.signup() on submit
   - Shows loading state on button
   - Redirects to dashboard on success with welcome toast
   */

document.addEventListener('DOMContentLoaded', () => {

  // ── Redirect if already logged in 
  // No point showing signup to someone with an active session
  if (Utils.isLoggedIn()) {
    window.location.href = 'dashboard.html';
    return;
  }

  // ── Element refs 
  const fullNameInput  = document.getElementById('fullName');
  const emailInput     = document.getElementById('email');
  const passwordInput  = document.getElementById('password');
  const confirmInput   = document.getElementById('confirmPassword');
  const signupBtn      = document.getElementById('signup-btn');
  const strengthBar    = document.getElementById('pw-strength-bar');
  const togglePw       = document.getElementById('toggle-pw');
  const toggleCpw      = document.getElementById('toggle-cpw');

  // ── Password show/hide 
  function wirePasswordToggle(btnEl, inputEl) {
    if (!btnEl || !inputEl) return;
    btnEl.addEventListener('click', () => {
      const isHidden = inputEl.type === 'password';
      inputEl.type   = isHidden ? 'text' : 'password';
      const icon = btnEl.querySelector('i');
      if (icon) {
        icon.className = isHidden ? 'fa-solid fa-eye-slash' : 'fa-solid fa-eye';
      }
      // Return focus to input so keyboard users aren't lost
      inputEl.focus();
    });
  }

  wirePasswordToggle(togglePw,  passwordInput);
  wirePasswordToggle(toggleCpw, confirmInput);

  // ── Password strength meter ────────────
  // Scores the password on 4 criteria and colours the bar
  function getStrength(pw) {
    let score = 0;
    if (pw.length >= 6)                      score++;  // minimum length
    if (pw.length >= 10)                     score++;  // good length
    if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++; // mixed case
    if (/[0-9]/.test(pw))                    score++;  // has number
    if (/[^A-Za-z0-9]/.test(pw))            score++;  // has symbol
    return Math.min(score, 4); // cap at 4
  }

  const STRENGTH_COLORS = ['', '#E94560', '#F5A623', '#2EC4B6', '#2EC4B6'];
  const STRENGTH_WIDTHS = ['0%', '25%',    '50%',    '75%',    '100%'];

  if (passwordInput && strengthBar) {
    passwordInput.addEventListener('input', () => {
      const score = getStrength(passwordInput.value);
      strengthBar.style.width      = STRENGTH_WIDTHS[score];
      strengthBar.style.background = STRENGTH_COLORS[score];
    });
  }

  // ── Inline field error helper ──────────
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

  function clearAllErrors() {
    [fullNameInput, emailInput, passwordInput, confirmInput].forEach(el => {
      if (el) clearError(el);
    });
  }

  // ── Validate form fields ───────────────
  function validate() {
    clearAllErrors();
    let valid = true;

    const name  = fullNameInput?.value.trim()  || '';
    const email = emailInput?.value.trim()     || '';
    const pw    = passwordInput?.value         || '';
    const cpw   = confirmInput?.value          || '';

    if (!name) {
      setError(fullNameInput, 'Full name is required.');
      valid = false;
    } else if (name.length < 2) {
      setError(fullNameInput, 'Name must be at least 2 characters.');
      valid = false;
    }

    if (!email) {
      setError(emailInput, 'Email address is required.');
      valid = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError(emailInput, 'Please enter a valid email address.');
      valid = false;
    }

    if (!pw) {
      setError(passwordInput, 'Password is required.');
      valid = false;
    } else if (pw.length < 6) {
      setError(passwordInput, 'Password must be at least 6 characters.');
      valid = false;
    }

    if (!cpw) {
      setError(confirmInput, 'Please confirm your password.');
      valid = false;
    } else if (pw && cpw !== pw) {
      setError(confirmInput, 'Passwords do not match.');
      valid = false;
    }

    return valid;
  }

  // ── Button loading state ───────────────
  function setLoading(isLoading) {
    if (!signupBtn) return;
    signupBtn.disabled = isLoading;
    signupBtn.innerHTML = isLoading
      ? '<span class="spinner" style="width:18px;height:18px;border-width:2px;"></span> Creating account...'
      : '<i class="fa-solid fa-user-plus"></i> Create Account';
  }

  // ── Main signup handler ────────────────
  async function handleSignup() {
    if (!validate()) return;

    setLoading(true);

    try {
      await Auth.signup({
        fullName: fullNameInput.value.trim(),
        email:    emailInput.value.trim(),
        password: passwordInput.value,
      });

      // Store a flag so dashboard can show the welcome toast
      sessionStorage.setItem('ij_just_signed_up', '1');

      // Redirect to dashboard
      window.location.href = 'dashboard.html';

    } catch (err) {
      setLoading(false);

      // Surface specific errors to the right field
      const msg = err.message || 'Something went wrong. Please try again.';

      if (msg.toLowerCase().includes('email')) {
        setError(emailInput, msg);
      } else {
        Utils.showToast('error', 'Sign up failed', msg);
      }
    }
  }

  // ── Wire submit button 
  if (signupBtn) {
    signupBtn.addEventListener('click', handleSignup);
  }

  // ── Allow Enter key to submit ──────────
  [fullNameInput, emailInput, passwordInput, confirmInput].forEach(el => {
    if (!el) return;
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') handleSignup();
    });
  });

  // ── Clear error on input ───────────────
  [fullNameInput, emailInput, confirmInput].forEach(el => {
    if (!el) return;
    el.addEventListener('input', () => clearError(el));
  });

});
