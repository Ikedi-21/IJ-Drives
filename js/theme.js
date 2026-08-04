/*
   IJDrives — theme.js
   Dark / light theme toggle.

   After applying the new theme it calls Maps.refreshTheme()
   so that Stadia tile layers (dark vs light) update instantly
   on any page that has an active Leaflet map.
   */

const Theme = (() => {
  const STORAGE_KEY   = 'ij_theme';
  const DEFAULT_THEME = 'dark';

  /** Returns the theme saved in localStorage, or the default. */
  function getStored() {
    return localStorage.getItem(STORAGE_KEY) || DEFAULT_THEME;
  }

  /**
   * Applies a theme by:
   * 1. Setting data-theme on <html>
   * 2. Saving the preference to localStorage
   * 3. Updating the toggle button icon
   * 4. Refreshing any active Leaflet map tile layers
   *
   * @param {'dark'|'light'} theme
   */
  function apply(theme) {
    // 1. Update the HTML attribute — CSS picks this up instantly
    document.documentElement.setAttribute('data-theme', theme);

    // 2. Persist preference
    localStorage.setItem(STORAGE_KEY, theme);

    // 3. Update toggle button icon and title
    const btn = document.querySelector('.theme-toggle');
    if (btn) {
      const icon = btn.querySelector('i');
      if (icon) {
        // Sun icon → currently dark, click to go light
        // Moon icon → currently light, click to go dark
        icon.className = theme === 'dark' ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
      }
      btn.setAttribute(
        'title',
        theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'
      );
      btn.setAttribute(
        'aria-label',
        theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'
      );
    }

    // 4. Swap Stadia tile layers on any active Leaflet maps
    //    Maps.refreshTheme() is safe to call even if no maps are active
    if (typeof Maps !== 'undefined') {
      Maps.refreshTheme();
    }
  }

  /** Toggles between dark and light. */
  function toggle() {
    const current = document.documentElement.getAttribute('data-theme') || DEFAULT_THEME;
    apply(current === 'dark' ? 'light' : 'dark');
  }

  /**
   * Initialises the theme system:
   * - Applies the saved preference immediately (prevents FOUC)
   * - Wires the toggle button via event delegation
   */
  function init() {
    // Apply immediately so the page never flashes the wrong theme
    apply(getStored());

    // Wire click using delegation — safe even if the button isn't
    // in the DOM at the exact moment this runs
    document.addEventListener('click', (e) => {
      if (e.target.closest('.theme-toggle')) {
        toggle();
      }
    });

    // ── Mobile hamburger menu ─
    const hamburger  = document.getElementById('hamburger');
    const navLinks   = document.querySelector('.navbar__links');

    if (hamburger && navLinks) {
      hamburger.addEventListener('click', () => {
        const isOpen = navLinks.classList.toggle('mobile-open');
        hamburger.classList.toggle('open', isOpen);
        hamburger.setAttribute('aria-expanded', isOpen);
      });

      // Close menu when a nav link is clicked
      navLinks.querySelectorAll('.navbar__link').forEach(link => {
        link.addEventListener('click', () => {
          navLinks.classList.remove('mobile-open');
          hamburger.classList.remove('open');
          hamburger.setAttribute('aria-expanded', 'false');
        });
      });

      // Close menu when clicking outside
      document.addEventListener('click', (e) => {
        if (!hamburger.contains(e.target) && !navLinks.contains(e.target)) {
          navLinks.classList.remove('mobile-open');
          hamburger.classList.remove('open');
          hamburger.setAttribute('aria-expanded', 'false');
        }
      });
    }

  }

  // Auto-init as soon as the DOM is parsed
  document.addEventListener('DOMContentLoaded', () => Theme.init());

  return { init, apply, toggle, getStored };
})();