/* 
   IJDrives — results.js  
   Powers results.html — cross-mode search results page.

   URL params expected:
     ?origin=Lagos&destination=Abuja&mode=land&date=2026-04-01

   If mode is provided, only that mode is searched.
   If mode is omitted, all 4 modes are searched and results
   are combined and sorted by fare.

   Flow:
   1. Read URL params
   2. Set active mode tab + pre-fill search bar
   3. Initialise map (Nigeria centred)
   4. Show route on map if origin + destination known
   5. Fetch relevant JSON data
   6. Filter by origin/destination
   7. Render route cards
   8. Wire search bar, mode tabs, sort, fare range
    */

document.addEventListener('DOMContentLoaded', async function() {

  // ── 1. Read URL params 
  var params = new URLSearchParams(window.location.search);
  var origin      = params.get('origin')      || '';
  var destination = params.get('destination') || '';
  var activeMode  = params.get('mode')        || 'all';
  var date        = params.get('date')        || '';

  // ── Mode config 
  var MODE_INFO = {
    land: { icon: 'fa-bus',            label: 'Land',  accent: 'var(--land-accent)', accentBg: 'var(--land-accent-bg)', loader: function() { return Data.load.land(); } },
    sea:  { icon: 'fa-ship',           label: 'Sea',   accent: 'var(--sea-accent)',  accentBg: 'var(--sea-accent-bg)',  loader: function() { return Data.load.sea();  } },
    air:  { icon: 'fa-plane-departure',label: 'Air',   accent: 'var(--air-accent)',  accentBg: 'var(--air-accent-bg)',  loader: function() { return Data.load.air();  } },
    rail: { icon: 'fa-train',          label: 'Rail',  accent: 'var(--rail-accent)', accentBg: 'var(--rail-accent-bg)', loader: function() { return Data.load.rail(); } },
  };

  // ── 2. Set up UI 
  var originEl      = document.getElementById('rs-origin');
  var destEl        = document.getElementById('rs-destination');
  var titleEl       = document.getElementById('results-title');
  var subtitleEl    = document.getElementById('results-subtitle');
  var countBadgeEl  = document.getElementById('results-count-badge');
  var container     = document.getElementById('results-container');
  var sortEl        = document.getElementById('results-sort');
  var fareRangeEl   = document.getElementById('results-fare-range');
  var fareLabelEl   = document.getElementById('results-fare-label');
  var resetEl       = document.getElementById('results-reset-filters');
  var swapEl        = document.getElementById('rs-swap');
  var searchBtnEl   = document.getElementById('rs-search-btn');

  // Pre-fill search bar from URL
  if (originEl)   originEl.value = origin;
  if (destEl)     destEl.value   = destination;

  // Update page title
  if (titleEl) {
    if (origin && destination) {
      titleEl.textContent = origin + ' → ' + destination;
    } else if (origin) {
      titleEl.textContent = 'Routes from ' + origin;
    } else if (destination) {
      titleEl.textContent = 'Routes to ' + destination;
    } else {
      titleEl.textContent = 'All Routes';
    }
  }

  // ── 3. Mode tabs 
  var modeTabs = document.querySelectorAll('.results-mode-tab');
  function setActiveTab(mode) {
    modeTabs.forEach(function(t) {
      t.classList.toggle('active', t.dataset.mode === mode);
    });
  }
  if (activeMode !== 'all') setActiveTab(activeMode);

  modeTabs.forEach(function(tab) {
    tab.addEventListener('click', function() {
      activeMode = tab.dataset.mode;
      setActiveTab(activeMode);
      runSearch();
    });
  });

  // ── 4. Map ─────
  var mapEl = document.getElementById('results-map');
  if (mapEl) {
    mapEl.innerHTML = '';
    var mapInst = Maps.init('results-map');
    if (mapInst && origin && destination) {
      setTimeout(function() {
        Maps.showRoute('results-map', origin, destination);
      }, 300);
    }
  }

  // ── 5. Swap button ────
  if (swapEl && originEl && destEl) {
    swapEl.addEventListener('click', function() {
      var tmp       = originEl.value;
      originEl.value = destEl.value;
      destEl.value   = tmp;
    });
  }

  // ── 6. Search button ──
  if (searchBtnEl) {
    searchBtnEl.addEventListener('click', function() {
      origin      = originEl      ? originEl.value.trim()  : '';
      destination = destEl        ? destEl.value.trim()    : '';

      // Update URL silently (no page reload)
      var newParams = new URLSearchParams();
      if (origin)      newParams.set('origin',      origin);
      if (destination) newParams.set('destination', destination);
      if (activeMode !== 'all') newParams.set('mode', activeMode);
      if (date)        newParams.set('date',         date);
      window.history.replaceState({}, '', 'results.html?' + newParams.toString());

      // Update title
      if (titleEl) {
        titleEl.textContent = origin && destination
          ? origin + ' → ' + destination
          : origin ? 'Routes from ' + origin
          : destination ? 'Routes to ' + destination
          : 'All Routes';
      }

      // Update map
      if (origin && destination) {
        Maps.showRoute('results-map', origin, destination);
      }

      runSearch();
    });
  }

  // Enter key on search fields
  [originEl, destEl].forEach(function(el) {
    if (!el) return;
    el.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' && searchBtnEl) searchBtnEl.click();
    });
  });

  // ── 7. Filter state ───
  var filters = { sortBy: '', maxFare: Infinity };

  if (sortEl) {
    sortEl.addEventListener('change', function() {
      filters.sortBy = sortEl.value;
      runSearch();
    });
  }

  if (fareRangeEl && fareLabelEl) {
    fareRangeEl.addEventListener('input', function() {
      filters.maxFare = parseInt(fareRangeEl.value, 10);
      fareLabelEl.textContent = Utils.formatCurrency(filters.maxFare);
      runSearch();
    });
  }

  if (resetEl) {
    resetEl.addEventListener('click', function() {
      filters = { sortBy: '', maxFare: Infinity };
      if (sortEl)      sortEl.value      = '';
      if (fareRangeEl) fareRangeEl.value = fareRangeEl.max;
      if (fareLabelEl) fareLabelEl.textContent = '&#8358;' + parseInt(fareRangeEl.max).toLocaleString();
      runSearch();
    });
  }

  // ── 8. Load all data once 
  var allData = {};
  var allProviders = [];

  async function loadData() {
    try {
      var results = await Promise.all([
        Data.load.land().catch(function()      { return []; }),
        Data.load.sea().catch(function()       { return []; }),
        Data.load.air().catch(function()       { return []; }),
        Data.load.rail().catch(function()      { return []; }),
        Data.load.providers().catch(function() { return []; }),
      ]);
      allData = { land: results[0], sea: results[1], air: results[2], rail: results[3] };
      allProviders = results[4];
    } catch (err) {
      console.error('[Results] Data load error:', err);
    }
  }

  await loadData();

  var providerMap = {};
  allProviders.forEach(function(p) { providerMap[p.id] = p; });

  // ── 9. Run search ─────
  function runSearch() {
    var searchFilters = {
      origin:      origin,
      destination: destination,
      maxFare:     filters.maxFare,
      sortBy:      filters.sortBy,
    };

    var tagged = [];

    var modesToSearch = activeMode === 'all'
      ? ['land', 'sea', 'air', 'rail']
      : [activeMode];

    modesToSearch.forEach(function(m) {
      var routes = allData[m] || [];
      var filtered = Search.filterRoutes(routes, searchFilters);
      filtered.forEach(function(r) {
        tagged.push(Object.assign({}, r, { _mode: m }));
      });
    });

    // If searching all modes, sort by fare ascending by default
    if (activeMode === 'all' && !filters.sortBy) {
      tagged.sort(function(a, b) { return (a.fare_ngn || 0) - (b.fare_ngn || 0); });
    }

    renderResults(tagged);
  }

  // ── 10. Render route cards 
  function renderResults(routes) {
    if (!container) return;

    // Update subtitle
    var modeLabel = activeMode === 'all' ? 'all modes' : (MODE_INFO[activeMode] || {}).label || activeMode;
    if (subtitleEl) {
      subtitleEl.textContent = routes.length + ' route' + (routes.length !== 1 ? 's' : '') +
        ' across ' + modeLabel +
        (origin && destination ? ' · ' + origin + ' to ' + destination : '');
    }
    if (countBadgeEl) {
      countBadgeEl.textContent = routes.length + ' result' + (routes.length !== 1 ? 's' : '');
    }

    if (routes.length === 0) {
      container.innerHTML =
        '<div class="empty-state">' +
          '<i class="fa-solid fa-route"></i>' +
          '<h3>No routes found</h3>' +
          '<p>Try a different origin, destination or transport mode.</p>' +
          '<div style="display:flex;gap:12px;justify-content:center;margin-top:20px;flex-wrap:wrap;">' +
            '<a href="land.html" class="btn btn-secondary btn-sm"><i class="fa-solid fa-bus"></i> Browse Land</a>' +
            '<a href="air.html"  class="btn btn-secondary btn-sm"><i class="fa-solid fa-plane-departure"></i> Browse Air</a>' +
          '</div>' +
        '</div>';
      return;
    }

    container.innerHTML = routes.map(function(route) {
      var m        = route._mode;
      var info     = MODE_INFO[m] || MODE_INFO.land;
      var prov     = providerMap[route.provider_id] || {};
      var provName = prov.name   || 'Unknown Provider';
      var provIcon = prov.icon   || info.icon;
      var rating   = prov.rating || 4.0;
      var stars    = '';
      for (var s = 0; s < 5; s++) stars += s < Math.round(rating) ? '★' : '☆';

      var fare      = Utils.formatCurrency(route.fare_ngn || 0);
      var seats     = route.seats_available || 0;
      var seatsCls  = seats === 0 ? 'full' : seats <= 5 ? 'low' : '';
      var seatsText = seats === 0 ? 'Sold out'
                    : seats <= 5  ? seats + ' seat' + (seats > 1 ? 's' : '') + ' left'
                    : seats + ' seats';

      return (
        '<div class="route-card"' +
          ' data-mode="' + m + '"' +
          ' data-origin="'     + (route.origin      || '') + '"' +
          ' data-dest="'       + (route.destination  || '') + '"' +
          ' data-origin-lat="' + (route.origin_coords      ? route.origin_coords.lat      : '') + '"' +
          ' data-origin-lng="' + (route.origin_coords      ? route.origin_coords.lng      : '') + '"' +
          ' data-dest-lat="'   + (route.destination_coords ? route.destination_coords.lat : '') + '"' +
          ' data-dest-lng="'   + (route.destination_coords ? route.destination_coords.lng : '') + '"' +
          ' style="--mode-color:' + info.accent + '; --mode-color-bg:' + info.accentBg + '"' +
          ' role="button" tabindex="0">' +

          '<div class="route-card__left">' +
            '<div class="route-card__provider">' +
              '<div class="route-card__provider-icon"><i class="fa-solid ' + provIcon + '"></i></div>' +
              '<div>' +
                '<div class="route-card__provider-name">' + provName + '</div>' +
                '<div class="route-card__stars">' + stars + '</div>' +
              '</div>' +
            '</div>' +
            '<div class="route-card__route">' +
              '<span class="route-card__city">' + (route.origin || '—') + '</span>' +
              '<span class="route-card__arrow"><i class="fa-solid fa-arrow-right"></i></span>' +
              '<span class="route-card__city">' + (route.destination || '—') + '</span>' +
            '</div>' +
            '<div class="route-card__meta">' +
              '<span class="route-card__meta-item"><i class="fa-regular fa-clock"></i> ' + (route.departure || '') + ' — ' + (route.arrival || '') + '</span>' +
              '<span class="route-card__meta-item"><i class="fa-solid fa-stopwatch"></i> ' + (route.duration_hrs || '') + 'h</span>' +
              '<span class="route-card__class-badge">' + (route.class || '') + '</span>' +
              '<span class="route-card__meta-item" style="color:' + info.accent + ';">' +
                '<i class="fa-solid ' + info.icon + '"></i> ' + info.label +
              '</span>' +
            '</div>' +
          '</div>' +

          '<div class="route-card__right">' +
            '<div>' +
              '<div class="route-card__fare">' + fare + '</div>' +
              '<div class="route-card__fare-label">per person</div>' +
            '</div>' +
            '<div class="route-card__seats ' + seatsCls + '">' + seatsText + '</div>' +
            '<button class="btn btn-primary btn-sm book-btn" data-route-id="' + route.id + '" data-mode="' + m + '">' +
              '<i class="fa-solid fa-ticket"></i> Book' +
            '</button>' +
          '</div>' +

        '</div>'
      );
    }).join('');

    // Wire card clicks → map
    container.querySelectorAll('.route-card').forEach(function(card) {
      card.addEventListener('click', function() { onCardClick(card); });
      card.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onCardClick(card); }
      });
    });

    // Wire book buttons
    container.querySelectorAll('.book-btn').forEach(function(btn) {
      btn.addEventListener('click', function(e) {
        e.stopPropagation();
        var rid   = btn.dataset.routeId;
        var bMode = btn.dataset.mode;
        var src   = allData[bMode] || [];
        var route = src.find(function(r) { return r.id === rid; });
        if (route) Booking.selectRoute(route, providerMap[route.provider_id] || {}, bMode);
      });
    });
  }

  // ── 11. Card click → map update 
  function onCardClick(card) {
    var oLat = parseFloat(card.dataset.originLat);
    var oLng = parseFloat(card.dataset.originLng);
    var dLat = parseFloat(card.dataset.destLat);
    var dLng = parseFloat(card.dataset.destLng);

    if (!isNaN(oLat) && !isNaN(dLat)) {
      Maps.showRouteByCoords('results-map',
        { lat: oLat, lng: oLng },
        { lat: dLat, lng: dLng }
      );
      setTimeout(function() {
        var inst = Maps.getInstance('results-map');
        if (inst) inst.invalidateSize();
      }, 120);
    }

    container.querySelectorAll('.route-card').forEach(function(c) {
      c.classList.remove('route-card--selected');
    });
    card.classList.add('route-card--selected');

    var mapPanel = document.querySelector('.map-panel');
    if (mapPanel) mapPanel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  // ── 12. Initial search 
  runSearch();
  Utils.initScrollReveal();

});