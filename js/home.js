/* ============================================================
   IJDrives — home.js  (Day 5 — complete)
   Powers the homepage:

   1. Welcome toast     — shown once after signup redirect
   2. Search widget     — tab switching, swap cities, validation,
                          form submit → correct transport page
   3. Featured routes   — skeleton → real cards from JSON + provider
   4. Mode route counts — live labels from JSON lengths
   5. Counter animation — eased count-up on hero stats
   6. Scroll reveal     — initialises IntersectionObserver
   ============================================================ */

document.addEventListener('DOMContentLoaded', async () => {

  // ─────────────────────────────────────────────────────────
  // 1. WELCOME TOAST
  //    signup.js sets 'ij_just_signed_up' in sessionStorage.
  //    We check it here and show a toast, then clear the flag.
  // ─────────────────────────────────────────────────────────
  if (sessionStorage.getItem('ij_just_signed_up')) {
    sessionStorage.removeItem('ij_just_signed_up');

    // Get the user's name for a personal greeting
    try {
      const user = await Auth.getCurrentUser();
      const name = user ? user.fullName.split(' ')[0] : 'there';
      Utils.showToast(
        'success',
        'Welcome to IJDrives, ' + name + '! 🎉',
        '₦500 has been credited to your wallet.',
        5000
      );
    } catch (_) {
      Utils.showToast('success', 'Welcome to IJDrives!', '₦500 credited to your wallet.', 5000);
    }
  }

  // ─────────────────────────────────────────────────────────
  // 2. SEARCH WIDGET
  // ─────────────────────────────────────────────────────────

  let activeMode = 'land';

  // ── Tab switching ──
  const tabs = document.querySelectorAll('.search-tab');
  tabs.forEach(function(tab) {
    tab.addEventListener('click', function() {
      tabs.forEach(function(t) {
        t.classList.remove('active');
        t.setAttribute('aria-selected', 'false');
      });
      tab.classList.add('active');
      tab.setAttribute('aria-selected', 'true');
      activeMode = tab.dataset.mode;
    });
  });

  // ── Swap cities ──
  const swapBtn     = document.getElementById('swap-cities');
  const originInput = document.getElementById('search-origin');
  const destInput   = document.getElementById('search-destination');

  if (swapBtn && originInput && destInput) {
    swapBtn.addEventListener('click', function() {
      var temp          = originInput.value;
      originInput.value = destInput.value;
      destInput.value   = temp;
      // Brief rotate animation on the icon
      swapBtn.style.transform = 'rotate(90deg)';
      setTimeout(function() { swapBtn.style.transform = ''; }, 300);
    });
  }

  // ── Set date input to today (minimum + default) ──
  const dateInput = document.getElementById('search-date');
  if (dateInput) {
    var today = new Date().toISOString().split('T')[0];
    dateInput.min   = today;
    dateInput.value = today;
  }

  // ── Form submit ──
  const searchForm = document.getElementById('main-search');
  if (searchForm) {
    searchForm.addEventListener('submit', function(e) {
      e.preventDefault();

      var origin = (originInput ? originInput.value.trim() : '');
      var dest   = (destInput   ? destInput.value.trim()   : '');
      var date   = (dateInput   ? dateInput.value          : '');

      if (!origin) {
        Utils.showToast('warning', 'Origin required', 'Please enter a departure city.');
        if (originInput) originInput.focus();
        return;
      }
      if (!dest) {
        Utils.showToast('warning', 'Destination required', 'Please enter a destination city.');
        if (destInput) destInput.focus();
        return;
      }
      if (origin.toLowerCase() === dest.toLowerCase()) {
        Utils.showToast('error', 'Same city', 'Origin and destination cannot be the same.');
        return;
      }

      var params = new URLSearchParams({ origin: origin, destination: dest, date: date });
      window.location.href = activeMode + '.html?' + params.toString();
    });
  }

  // ─────────────────────────────────────────────────────────
  // 3. FEATURED ROUTES
  //    Fetches all 4 JSON files in parallel, picks a cross-mode
  //    selection, replaces skeleton loaders with real cards.
  //    Each card links to the correct transport page with the
  //    origin/destination pre-filled.
  // ─────────────────────────────────────────────────────────

  const featuredContainer = document.getElementById('featured-routes-container');

  const MODE_ICONS = {
    land: 'fa-bus',
    sea:  'fa-ship',
    air:  'fa-plane-departure',
    rail: 'fa-train',
  };

  async function loadFeaturedRoutes() {
    if (!featuredContainer) return;

    try {
      // Fetch routes + providers in parallel
      var results = await Promise.all([
        Data.load.land().catch(function()      { return []; }),
        Data.load.sea().catch(function()       { return []; }),
        Data.load.air().catch(function()       { return []; }),
        Data.load.rail().catch(function()      { return []; }),
        Data.load.providers().catch(function() { return []; }),
      ]);

      var land      = results[0];
      var sea       = results[1];
      var air       = results[2];
      var rail      = results[3];
      var providers = results[4];

      // Build provider lookup
      var providerMap = {};
      providers.forEach(function(p) { providerMap[p.id] = p; });

      // Tag each route with its mode, take a cross-mode selection
      var tagged = [
        ...land.slice(0, 4).map(function(r) { return Object.assign({}, r, { mode: 'land' }); }),
        ...sea.slice(0,  2).map(function(r) { return Object.assign({}, r, { mode: 'sea'  }); }),
        ...air.slice(0,  3).map(function(r) { return Object.assign({}, r, { mode: 'air'  }); }),
        ...rail.slice(0, 2).map(function(r) { return Object.assign({}, r, { mode: 'rail' }); }),
      ];

      // Shuffle and pick 6
      var shuffled = tagged
        .sort(function() { return Math.random() - 0.5; })
        .slice(0, 6);

      if (shuffled.length === 0) {
        featuredContainer.innerHTML =
          '<div style="grid-column:1/-1; text-align:center; padding:48px; color:var(--text-muted);">' +
          '<i class="fa-solid fa-route" style="font-size:2.5rem; margin-bottom:14px; display:block; opacity:0.35;"></i>' +
          '<p>No routes available yet.</p>' +
          '</div>';
        return;
      }

      // Build card HTML
      var cards = shuffled.map(function(route) {
        var icon     = MODE_ICONS[route.mode] || 'fa-route';
        var fare     = Utils.formatCurrency(route.fare_ngn || 0);
        var duration = route.duration_hrs ? route.duration_hrs + 'h' : '';
        var dep      = route.departure || '';
        var prov     = providerMap[route.provider_id] || {};
        var provName = prov.name || '';

        var params = new URLSearchParams({
          origin:      route.origin      || '',
          destination: route.destination || '',
        });
        var href = route.mode + '.html?' + params.toString();

        return (
          '<a href="' + href + '" class="featured-route-card" data-mode="' + route.mode + '">' +

            '<div class="featured-route-card__icon">' +
              '<i class="fa-solid ' + icon + '"></i>' +
            '</div>' +

            '<div class="featured-route-card__route">' +
              '<div class="featured-route-card__cities">' +
                (route.origin || '—') +
                ' <i class="fa-solid fa-arrow-right"></i> ' +
                (route.destination || '—') +
              '</div>' +
              '<div class="featured-route-card__meta">' +
                (provName ? '<span>' + provName + '</span>' : '') +
                (dep      ? '<span><i class="fa-regular fa-clock"></i> ' + dep + '</span>' : '') +
                (duration ? '<span><i class="fa-solid fa-stopwatch"></i> ' + duration + '</span>' : '') +
              '</div>' +
            '</div>' +

            '<div class="featured-route-card__fare">' + fare + '</div>' +

          '</a>'
        );
      });

      featuredContainer.innerHTML = cards.join('');

    } catch (err) {
      console.warn('[Home] Featured routes error:', err);
      featuredContainer.innerHTML =
        '<div style="grid-column:1/-1; text-align:center; padding:48px; color:var(--text-muted);">' +
        '<p>Could not load routes right now.</p>' +
        '</div>';
    }
  }

  loadFeaturedRoutes();

  // ─────────────────────────────────────────────────────────
  // 4. MODE CARD ROUTE COUNTS
  //    Reads JSON length and updates each mode card label.
  //    Runs in parallel with featured routes so both finish
  //    at roughly the same time.
  // ─────────────────────────────────────────────────────────

  async function loadRouteCounts() {
    try {
      var results = await Promise.all([
        Data.load.land().catch(function()  { return []; }),
        Data.load.sea().catch(function()   { return []; }),
        Data.load.air().catch(function()   { return []; }),
        Data.load.rail().catch(function()  { return []; }),
      ]);

      var counts = { land: results[0].length, sea: results[1].length,
                     air:  results[2].length, rail: results[3].length };

      Object.keys(counts).forEach(function(mode) {
        var el = document.getElementById(mode + '-route-count');
        if (!el) return;
        var n = counts[mode];
        el.textContent = n > 0 ? n + ' route' + (n !== 1 ? 's' : '') : 'Coming soon';
      });

    } catch (_) { /* silently ignore — labels stay as "Loading..." */ }
  }

  loadRouteCounts();

  // ─────────────────────────────────────────────────────────
  // 5. COUNTER ANIMATION
  //    Eased count-up from 0 to data-target value.
  //    Only fires when the element scrolls into view.
  // ─────────────────────────────────────────────────────────

  function animateCounter(el, target) {
    var duration = 1400;
    var start    = performance.now();

    function update(now) {
      var elapsed  = now - start;
      var progress = Math.min(elapsed / duration, 1);
      // Ease-out cubic
      var eased    = 1 - Math.pow(1 - progress, 3);
      var current  = Math.round(eased * target);
      el.textContent = current + (el.dataset.suffix || '');
      if (progress < 1) requestAnimationFrame(update);
    }

    requestAnimationFrame(update);
  }

  var statNums = document.querySelectorAll('.hero__stat-num[data-target]');
  if (statNums.length) {
    var counterObserver = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        if (entry.isIntersecting) {
          var el     = entry.target;
          var target = parseInt(el.dataset.target, 10);
          if (!isNaN(target)) animateCounter(el, target);
          counterObserver.unobserve(el);
        }
      });
    }, { threshold: 0.5 });

    statNums.forEach(function(el) { counterObserver.observe(el); });
  }

  // ─────────────────────────────────────────────────────────
  // 6. SCROLL REVEAL
  // ─────────────────────────────────────────────────────────
  Utils.initScrollReveal();

});
