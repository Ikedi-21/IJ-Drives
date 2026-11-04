/* 
   IJDrives — auth.js
   Authentication: signup, login, logout, session management,
   navbar state updates.

   Depends on: config.js, db.js, utils.js (must load first)
   */

/* global IJDRIVES_CONFIG, DB, Utils */

const Auth = (() => {

  // 
  // SIGNUP
  // 
  /**
   * Creates a new user account in IndexedDB.
   * Hashes the password with SHA-256 (Web Crypto API).
   * Credits the ₦500 welcome bonus.
   * Starts a session immediately on success.
   *
   * @throws {Error} with a user-readable message on failure
   * @returns {Object} the created user record
   */
  async function signup({ fullName, email, password }) {
    if (!fullName || !email || !password) {
      throw new Error('All fields are required.');
    }
    if (password.length < 6) {
      throw new Error('Password must be at least 6 characters.');
    }

    try {
      const user = await API.auth.signup({ fullName, email, password });
      Utils.setSession(user.id);
      return {
        id: user.id,
        fullName: user.full_name,
        email: user.email,
        walletBalance: user.wallet_balance,
        role: user.role,
        createdAt: user.created_at,
      };
    } catch (err) {
      throw new Error(err.message || 'Signup failed.');
    }
  }

  // 
  // LOGIN
  // 
  /**
   * Verifies email + password via the FastAPI backend.
   *
   * @throws {Error} with user-readable message
   * @returns {Object} the matched user record
   */
  async function login({ email, password }) {
    if (!email || !password) {
      throw new Error('Email and password are required.');
    }

    try {
      const user = await API.auth.login({ email, password });
      Utils.setSession(user.id);
      return {
        id: user.id,
        fullName: user.full_name,
        email: user.email,
        walletBalance: user.wallet_balance,
        role: user.role,
        createdAt: user.created_at,
      };
    } catch (err) {
      throw new Error(err.message || 'Incorrect email or password.');
    }
  }

  // LOGOUT

  function logout() {
    API.auth.logout();
    Utils.clearSession();
    window.location.href = 'index.html';
  }

 
  // GET CURRENT USER
  
  /**
   * Returns the full user record for the current session,
   * or null if not logged in / session is stale.
   */
  async function getCurrentUser() {
    if (!Utils.isLoggedIn()) return null;
    try {
      const user = await API.auth.getCurrentUser();
      if (!user) {
        Utils.clearSession();
        return null;
      }
      return {
        id: user.id,
        fullName: user.full_name,
        email: user.email,
        walletBalance: user.wallet_balance,
        role: user.role,
        createdAt: user.created_at,
      };
    } catch (_) {
      Utils.clearSession();
      return null;
    }
  }

  
  // UPDATE NAVBAR
  
  /**
   * Reads current auth state and updates the navbar accordingly:
   * - Logged out → show Log In / Sign Up buttons
   * - Logged in  → show wallet chip, user avatar + dropdown
   */
  async function updateNavbar() {
    const authActions = document.querySelector('.navbar__auth');
    const userMenu    = document.querySelector('.user-menu');
    const walletChip  = document.querySelector('.wallet-chip');

    if (!Utils.isLoggedIn()) {
      // Show auth buttons, hide user controls
      if (authActions) authActions.style.display = 'flex';
      if (userMenu)    userMenu.style.display    = 'none';
      if (walletChip)  walletChip.style.display  = 'none';
      return;
    }

    const user = await getCurrentUser();
    if (!user) {
      // Session token exists but user record is gone — clean up
      if (authActions) authActions.style.display = 'flex';
      if (userMenu)    userMenu.style.display    = 'none';
      if (walletChip)  walletChip.style.display  = 'none';
      return;
    }

    // Hide auth buttons, show user controls
    if (authActions) authActions.style.display = 'none';
    if (userMenu)    userMenu.style.display    = 'flex';

    // User avatar — initials
    const avatar = document.querySelector('.user-avatar');
    if (avatar) avatar.textContent = Utils.getInitials(user.fullName);

    // Dropdown header — name + email
    const dropName  = document.querySelector('.user-dropdown__name');
    const dropEmail = document.querySelector('.user-dropdown__email');
    if (dropName)  dropName.textContent  = user.fullName;
    if (dropEmail) dropEmail.textContent = user.email;

    // Wallet chip — balance
    if (walletChip) {
      walletChip.style.display = 'flex';
      const balanceEl = walletChip.querySelector('.wallet-chip__balance');
      if (balanceEl) {
        balanceEl.textContent = Utils.formatCurrency(user.walletBalance);
      }
    }
  }

  
  // WIRE LOGOUT BUTTON
  
  function wireLogout() {
    document.addEventListener('click', (e) => {
      if (e.target.closest('[data-action="logout"]')) {
        e.preventDefault();
        logout();
      }
    });
  }

  
  // WIRE USER AVATAR DROPDOWN
  
  function wireDropdown() {
    document.addEventListener('click', (e) => {
      const dropdown = document.querySelector('.user-dropdown');
      if (!dropdown) return;

      if (e.target.closest('.user-avatar')) {
        dropdown.classList.toggle('open');
      } else if (!e.target.closest('.user-dropdown')) {
        dropdown.classList.remove('open');
      }
    });

    // Close on Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        const dropdown = document.querySelector('.user-dropdown');
        if (dropdown) dropdown.classList.remove('open');
      }
    });
  }

  
  // INIT — called on every page
  
  async function init() {
    await updateNavbar();
    wireLogout();
    wireDropdown();
    Utils.highlightActiveNav();
  }

  // Public surface 
  return {
    signup,
    login,
    logout,
    getCurrentUser,
    updateNavbar,
    init,
  };

})();

// Auto-initialise on every page
document.addEventListener('DOMContentLoaded', () => Auth.init());
