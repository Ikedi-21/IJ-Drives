/*
   IJDrives — utils.js
   Shared utilities: UUID, currency, toast, scroll reveal,
   password hashing, session helpers
   */

const Utils = (() => {

  // ── UUID v4 generator ──
  function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  // ── Booking reference generator ──
  function generateBookingRef() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let ref = 'IJ-';
    for (let i = 0; i < 8; i++) {
      ref += chars[Math.floor(Math.random() * chars.length)];
    }
    return ref;
  }

  // ── Currency formatter ──
  function formatCurrency(amount) {
    return new Intl.NumberFormat(IJDRIVES_CONFIG.CURRENCY_LOCALE, {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 2,
    }).format(amount).replace('NGN', '₦');
  }

  // ── Date formatter ──
  function formatDate(isoString) {
    return new Intl.DateTimeFormat('en-NG', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(new Date(isoString));
  }

  function formatDateTime(isoString) {
    return new Intl.DateTimeFormat('en-NG', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(isoString));
  }

  // ── Password hashing (SHA-256 via Web Crypto API) ──
  async function hashPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  // ── Session helpers ──
  function setSession(userId) {
    sessionStorage.setItem('ij_session', userId);
  }

  function getSession() {
    return sessionStorage.getItem('ij_session');
  }

  function clearSession() {
    sessionStorage.removeItem('ij_session');
  }

  function isLoggedIn() {
    return !!getSession();
  }

  // ── Redirect if not logged in ──
  function requireAuth(redirectTo = 'login.html') {
    if (!isLoggedIn()) {
      window.location.href = redirectTo;
      return false;
    }
    return true;
  }

  // ── Redirect if already logged in ──
  function redirectIfAuthed(redirectTo = 'dashboard.html') {
    if (isLoggedIn()) {
      window.location.href = redirectTo;
    }
  }

  // ── Get initials from name ──
  function getInitials(fullName) {
    if (!fullName) return 'U';
    return fullName
      .split(' ')
      .slice(0, 2)
      .map(n => n[0].toUpperCase())
      .join('');
  }

  // ── Toast notifications ──
  const TOAST_ICONS = {
    success: 'fa-circle-check',
    error:   'fa-circle-xmark',
    warning: 'fa-triangle-exclamation',
    info:    'fa-circle-info',
  };

  function showToast(type = 'info', title = '', message = '', duration = 3500) {
    let container = document.querySelector('.toast-container');
    if (!container) {
      container = document.createElement('div');
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
      <i class="toast__icon fa-solid ${TOAST_ICONS[type] || TOAST_ICONS.info}"></i>
      <div class="toast__body">
        ${title ? `<div class="toast__title">${title}</div>` : ''}
        ${message ? `<div class="toast__msg">${message}</div>` : ''}
      </div>
      <button class="toast__close" aria-label="Dismiss">
        <i class="fa-solid fa-xmark"></i>
      </button>
    `;

    const dismiss = () => {
      toast.classList.add('dismissing');
      toast.addEventListener('animationend', () => toast.remove(), { once: true });
    };

    toast.querySelector('.toast__close').addEventListener('click', dismiss);
    container.appendChild(toast);

    if (duration > 0) setTimeout(dismiss, duration);
    return toast;
  }

  // ── Scroll Reveal (Intersection Observer) ──
  function initScrollReveal() {
    const revealEls = document.querySelectorAll('.reveal, .reveal-left, .reveal-right, .reveal-scale');
    if (!revealEls.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -48px 0px' }
    );

    revealEls.forEach((el) => observer.observe(el));
  }

  // ── Active nav link highlighter ──
  function highlightActiveNav() {
    const current = window.location.pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('.navbar__link').forEach((link) => {
      const href = link.getAttribute('href') || '';
      if (href === current || href.includes(current)) {
        link.classList.add('active');
      }
    });
  }

  // ── Debounce ──
  function debounce(fn, delay = 300) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), delay);
    };
  }

  // ── URL query params helper ──
  function getQueryParam(key) {
    return new URLSearchParams(window.location.search).get(key);
  }

  function setQueryParam(key, value) {
    const url = new URL(window.location.href);
    url.searchParams.set(key, value);
    window.history.replaceState({}, '', url);
  }

  return {
    generateUUID,
    generateBookingRef,
    formatCurrency,
    formatDate,
    formatDateTime,
    hashPassword,
    setSession,
    getSession,
    clearSession,
    isLoggedIn,
    requireAuth,
    redirectIfAuthed,
    getInitials,
    showToast,
    initScrollReveal,
    highlightActiveNav,
    debounce,
    getQueryParam,
    setQueryParam,
  };
})();
