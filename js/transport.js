/*
   IJDrives — transport.js  
   Shared logic for land.html, sea.html, air.html, rail.html

   What it does:
   1. Reads mode from <body data-mode="">
   2. Initialises Leaflet map on page load (Nigeria centred)
   3. Fetches routes + providers from JSON
   4. Renders route cards with full provider info
   5. Wires the inline search bar (origin + destination inputs)
   6. Wires filter sidebar (sort + fare range)
   7. Route card click → updates map with A/B markers
   8. Book button → Booking.selectRoute() → booking.html
   9. URL ?origin= ?destination= pre-fill on arrival from homepage
   */

document.addEventListener('DOMContentLoaded', async function() {

  // ── 1. Mode detection ────────────────────────────────────
  var mode = document.body.dataset.mode;
  if (!mode) {
    console.error('[Transport] data-mode missing on <body>.');
    return;
  }

  // ── Mode config map ───────────────────────────────────────
  var MODE_CFG = {
    land: {
      mapId: 'land-map', routesId: 'land-routes', countId: 'land-count',
      sortId: 'sort-land', fareRangeId: 'fare-range-land',
      fareLabelId: 'fare-label-land', resetId: 'reset-filters-land',
      originSearchId: 'land-origin-search', destSearchId: 'land-dest-search',
      clearSearchId: 'land-clear-search',
      icon: 'fa-bus',
      accentVar: 'var(--land-accent)', accentBgVar: 'var(--land-accent-bg)',
      maxFare: 30000,
      loader: function() { return Data.load.land(); },
    },
    sea: {
      mapId: 'sea-map', routesId: 'sea-routes', countId: 'sea-count',
      sortId: 'sort-sea', fareRangeId: 'fare-range-sea',
      fareLabelId: 'fare-label-sea', resetId: 'reset-filters-sea',
      originSearchId: 'sea-origin-search', destSearchId: 'sea-dest-search',
      clearSearchId: 'sea-clear-search',
      icon: 'fa-ship',
      accentVar: 'var(--sea-accent)', accentBgVar: 'var(--sea-accent-bg)',
      maxFare: 20000,
      loader: function() { return Data.load.sea(); },
    },
    air: {
      mapId: 'air-map', routesId: 'air-routes', countId: 'air-count',
      sortId: 'sort-air', fareRangeId: 'fare-range-air',
      fareLabelId: 'fare-label-air', resetId: 'reset-filters-air',
      originSearchId: 'air-origin-search', destSearchId: 'air-dest-search',
      clearSearchId: 'air-clear-search',
      icon: 'fa-plane-departure',
      accentVar: 'var(--air-accent)', accentBgVar: 'var(--air-accent-bg)',
      maxFare: 300000,
      loader: function() { return Data.load.air(); },
    },
    rail: {
      mapId: 'rail-map', routesId: 'rail-routes', countId: 'rail-count',
      sortId: 'sort-rail', fareRangeId: 'fare-range-rail',
      fareLabelId: 'fare-label-rail', resetId: 'reset-filters-rail',
      originSearchId: 'rail-origin-search', destSearchId: 'rail-dest-search',
      clearSearchId: 'rail-clear-search',
      icon: 'fa-train',
      accentVar: 'var(--rail-accent)', accentBgVar: 'var(--rail-accent-bg)',
      maxFare: 15000,
      loader: function() { return Data.load.rail(); },
    },
  };

  var cfg = MODE_CFG[mode];
  if (!cfg) return;

  // ── 2. Initialise Leaflet map ─────────────────────────────
  var mapEl = document.getElementById(cfg.mapId);
  if (mapEl) {
    mapEl.innerHTML = '';
    var mapInstance = Maps.init(cfg.mapId);

    if (mapInstance) {
      // Placeholder floats above tiles — added AFTER init
      var placeholder = document.createElement('div');
      placeholder.className = 'map-placeholder';
      placeholder.id        = cfg.mapId + '-placeholder';
      placeholder.innerHTML =
        '<i class="fa-solid fa-map-location-dot"></i>' +
        '<span>Click any route card to preview it here</span>';
      mapEl.appendChild(placeholder);

      setTimeout(function() { mapInstance.invalidateSize(); }, 150);
    }
  }

  // ── 3. Load data ──────────────────────────────────────────
  var allRoutes    = [];
  var allProviders = [];

  try {
    var loaded = await Promise.all([
      cfg.loader().catch(function() { return []; }),
      Data.load.providers().catch(function() { return []; }),
    ]);
    allRoutes    = loaded[0];
    allProviders = loaded[1];
  } catch (err) {
    console.error('[Transport] Data load failed:', err);
  }

  // Provider lookup
  var providerMap = {};
  allProviders.forEach(function(p) { providerMap[p.id] = p; });

  // ── 4. Filter state ───────────────────────────────────────
  var filters = {
    sortBy:      '',
    maxFare:     cfg.maxFare,
    origin:      '',
    destination: '',
  };

  // ── 5. Render route cards ─────────────────────────────────
  var routesContainer = document.getElementById(cfg.routesId);
  var countEl         = document.getElementById(cfg.countId);

  function renderRoutes(routes) {
    if (!routesContainer) return;

    if (routes.length === 0) {
      routesContainer.innerHTML =
        '<div class="empty-state">' +
          '<i class="fa-solid fa-route"></i>' +
          '<h3>No routes found</h3>' +
          '<p>Try adjusting your search or filters.</p>' +
          '<button class="btn btn-secondary btn-sm" id="empty-reset" style="margin-top:16px;">' +
            '<i class="fa-solid fa-rotate-left"></i> Clear all filters' +
          '</button>' +
        '</div>';

      var emptyReset = document.getElementById('empty-reset');
      if (emptyReset) emptyReset.addEventListener('click', resetAllFilters);

      if (countEl) countEl.textContent = '0';
      return;
    }

    if (countEl) countEl.textContent = routes.length;

    routesContainer.innerHTML = routes.map(function(route) {
      var prov      = providerMap[route.provider_id] || {};
      var provName  = prov.name   || 'Unknown Provider';
      var provIcon  = prov.icon   || cfg.icon;
      var rating    = prov.rating || 4.0;
      var fullStars = Math.round(rating);
      var stars     = '';
      for (var s = 0; s < 5; s++) {
        stars += s < fullStars ? '★' : '☆';
      }

      var fare      = Utils.formatCurrency(route.fare_ngn || 0);
      var seats     = route.seats_available || 0;
      var seatsCls  = seats === 0 ? 'full' : seats <= 5 ? 'low' : '';
      var seatsText = seats === 0 ? 'Sold out'
                    : seats <= 5 ? seats + ' seat' + (seats > 1 ? 's' : '') + ' left'
                    : seats + ' seats';

      return (
        '<div class="route-card" role="button" tabindex="0"' +
          ' data-mode="'       + mode + '"' +
          ' data-origin="'     + (route.origin || '') + '"' +
          ' data-dest="'       + (route.destination || '') + '"' +
          ' data-origin-lat="' + (route.origin_coords      ? route.origin_coords.lat      : '') + '"' +
          ' data-origin-lng="' + (route.origin_coords      ? route.origin_coords.lng      : '') + '"' +
          ' data-dest-lat="'   + (route.destination_coords ? route.destination_coords.lat : '') + '"' +
          ' data-dest-lng="'   + (route.destination_coords ? route.destination_coords.lng : '') + '"' +
          ' style="--mode-color:' + cfg.accentVar + '; --mode-color-bg:' + cfg.accentBgVar + '"' +
          ' aria-label="' + route.origin + ' to ' + route.destination + ' — ' + fare + '">' +

          '<div class="route-card__left">' +

            '<div class="route-card__provider">' +
              '<div class="route-card__provider-icon">' +
                '<i class="fa-solid ' + provIcon + '"></i>' +
              '</div>' +
              '<div>' +
                '<div class="route-card__provider-name">' + provName + '</div>' +
                '<div class="route-card__stars" title="' + rating + '/5">' + stars + '</div>' +
              '</div>' +
            '</div>' +

            '<div class="route-card__route">' +
              '<span class="route-card__city">' + (route.origin || '—') + '</span>' +
              '<span class="route-card__arrow"><i class="fa-solid fa-arrow-right"></i></span>' +
              '<span class="route-card__city">' + (route.destination || '—') + '</span>' +
            '</div>' +

            '<div class="route-card__meta">' +
              '<span class="route-card__meta-item">' +
                '<i class="fa-regular fa-clock"></i> ' + (route.departure || '') + ' — ' + (route.arrival || '') +
              '</span>' +
              '<span class="route-card__meta-item">' +
                '<i class="fa-solid fa-stopwatch"></i> ' + (route.duration_hrs || '') + 'h' +
              '</span>' +
              '<span class="route-card__class-badge">' + (route.class || '') + '</span>' +
            '</div>' +

          '</div>' +

          '<div class="route-card__right">' +
            '<div>' +
              '<div class="route-card__fare">' + fare + '</div>' +
              '<div class="route-card__fare-label">per person</div>' +
            '</div>' +
            '<div class="route-card__seats ' + seatsCls + '">' + seatsText + '</div>' +
            '<button class="btn btn-primary btn-sm book-btn"' +
              ' data-route-id="' + route.id + '">' +
              '<i class="fa-solid fa-ticket"></i> Book' +
            '</button>' +
          '</div>' +

        '</div>'
      );
    }).join('');

    // Wire card click → map
    routesContainer.querySelectorAll('.route-card').forEach(function(card) {
      card.addEventListener('click',   function() { onCardClick(card); });
      card.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onCardClick(card);
        }
      });
    });

    // Wire book buttons
    routesContainer.querySelectorAll('.book-btn').forEach(function(btn) {
      btn.addEventListener('click', function(e) {
        e.stopPropagation(); // don't trigger card click
        var routeId = btn.dataset.routeId;
        var route   = allRoutes.find(function(r) { return r.id === routeId; });
        if (route) {
          Booking.selectRoute(route, providerMap[route.provider_id] || {}, mode);
        }
      });
    });
  }

  // ── 6. Card click → map update ────────────────────────────
  function onCardClick(card) {
    var oLat = parseFloat(card.dataset.originLat);
    var oLng = parseFloat(card.dataset.originLng);
    var dLat = parseFloat(card.dataset.destLat);
    var dLng = parseFloat(card.dataset.destLng);

    if (!isNaN(oLat) && !isNaN(dLat)) {
      // Hide placeholder
      var ph = document.getElementById(cfg.mapId + '-placeholder');
      if (ph) ph.style.display = 'none';

      // Draw route on map
      Maps.showRouteByCoords(
        cfg.mapId,
        { lat: oLat, lng: oLng },
        { lat: dLat, lng: dLng }
      );

      // Recalculate size after redraw
      setTimeout(function() {
        var inst = Maps.getInstance(cfg.mapId);
        if (inst) inst.invalidateSize();
      }, 120);
    }

    // Highlight the selected card, deselect others
    routesContainer.querySelectorAll('.route-card').forEach(function(c) {
      c.classList.remove('route-card--selected');
      c.setAttribute('aria-pressed', 'false');
    });
    card.classList.add('route-card--selected');
    card.setAttribute('aria-pressed', 'true');

    // Scroll map panel into view
    var panel = document.querySelector('.map-panel');
    if (panel) panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  // ── 7. Filter application ─────────────────────────────────
  function applyFilters() {
    renderRoutes(Search.filterRoutes(allRoutes, filters));
    updateClearButton();
  }

  // Show/hide the X button on the search bar
  function updateClearButton() {
    var clearBtn = document.getElementById(cfg.clearSearchId);
    if (!clearBtn) return;
    var hasSearch = filters.origin || filters.destination;
    clearBtn.style.display = hasSearch ? 'flex' : 'none';
  }

  // ── 8. Wire search bar ────────────────────────────────────
  var originSearchEl = document.getElementById(cfg.originSearchId);
  var destSearchEl   = document.getElementById(cfg.destSearchId);
  var clearSearchEl  = document.getElementById(cfg.clearSearchId);

  var searchDebounce;
  function onSearchInput() {
    clearTimeout(searchDebounce);
    searchDebounce = setTimeout(function() {
      filters.origin      = originSearchEl ? originSearchEl.value.trim() : '';
      filters.destination = destSearchEl   ? destSearchEl.value.trim()   : '';
      applyFilters();
    }, 280); // slight debounce so we don't filter on every keystroke
  }

  if (originSearchEl) originSearchEl.addEventListener('input', onSearchInput);
  if (destSearchEl)   destSearchEl.addEventListener('input',   onSearchInput);

  if (clearSearchEl) {
    clearSearchEl.addEventListener('click', function() {
      if (originSearchEl) originSearchEl.value = '';
      if (destSearchEl)   destSearchEl.value   = '';
      filters.origin      = '';
      filters.destination = '';
      applyFilters();
    });
  }

  // ── 9. Wire filter sidebar controls ──────────────────────
  var sortEl      = document.getElementById(cfg.sortId);
  var fareRangeEl = document.getElementById(cfg.fareRangeId);
  var fareLabelEl = document.getElementById(cfg.fareLabelId);
  var resetEl     = document.getElementById(cfg.resetId);

  if (sortEl) {
    sortEl.addEventListener('change', function() {
      filters.sortBy = sortEl.value;
      applyFilters();
    });
  }

  if (fareRangeEl && fareLabelEl) {
    fareRangeEl.addEventListener('input', function() {
      filters.maxFare = parseInt(fareRangeEl.value, 10);
      fareLabelEl.textContent = Utils.formatCurrency(filters.maxFare);
      applyFilters();
    });
  }

  // Rail class filter (radio buttons — only present on rail.html)
  var classRadios = document.querySelectorAll('input[name="rail-class"]');
  if (classRadios.length) {
    classRadios.forEach(function(radio) {
      radio.addEventListener('change', function() {
        filters.classFilter = radio.value;
        applyFilters();
      });
    });
  }

  // Air cabin class filter (checkboxes — only present on air.html)
  var cabinCheckboxes = document.querySelectorAll('input[name="air-class"]');
  if (cabinCheckboxes.length) {
    cabinCheckboxes.forEach(function(cb) {
      cb.addEventListener('change', function() {
        var checked = Array.from(cabinCheckboxes)
          .filter(function(c) { return c.checked; })
          .map(function(c)    { return c.value; });
        filters.classFilter = checked.length === 1 ? checked[0] : '';
        applyFilters();
      });
    });
  }

  // Reset all filters
  function resetAllFilters() {
    filters = { sortBy: '', maxFare: cfg.maxFare, origin: '', destination: '', classFilter: '' };
    if (sortEl)         sortEl.value          = '';
    if (fareRangeEl)    fareRangeEl.value      = cfg.maxFare;
    if (fareLabelEl)    fareLabelEl.textContent = Utils.formatCurrency(cfg.maxFare);
    if (originSearchEl) originSearchEl.value   = '';
    if (destSearchEl)   destSearchEl.value     = '';
    // Reset radio buttons
    var firstRadio = document.querySelector('input[name="rail-class"]');
    if (firstRadio) firstRadio.checked = true;
    // Reset checkboxes
    document.querySelectorAll('input[name="air-class"]').forEach(function(cb) {
      cb.checked = true;
    });
    applyFilters();
  }

  if (resetEl) resetEl.addEventListener('click', resetAllFilters);

  // ── 10. URL params → pre-fill search ─────────────────────
  var params  = new URLSearchParams(window.location.search);
  var pOrigin = params.get('origin')      || '';
  var pDest   = params.get('destination') || '';

  if (pOrigin || pDest) {
    filters.origin      = pOrigin;
    filters.destination = pDest;

    if (originSearchEl) originSearchEl.value = pOrigin;
    if (destSearchEl)   destSearchEl.value   = pDest;

    // Show the map route if both cities are known
    if (pOrigin && pDest) {
      setTimeout(function() {
        var ph = document.getElementById(cfg.mapId + '-placeholder');
        if (ph) ph.style.display = 'none';
        Maps.showRoute(cfg.mapId, pOrigin, pDest);
        setTimeout(function() {
          var inst = Maps.getInstance(cfg.mapId);
          if (inst) inst.invalidateSize();
        }, 120);
      }, 400);
    }
  }

  // ── 11. Initial render ────────────────────────────────────
  applyFilters();

  // ── 12. Scroll reveal ─────────────────────────────────────
  Utils.initScrollReveal();

});