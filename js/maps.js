/*
   IJDrives — maps.js  
   Leaflet.js + Stadia Maps tile provider

   CRITICAL RULES (do not change these):
   ──────────────────────────────────────
   1. NO ES module imports. Leaflet is a CDN global (window.L).
   2. init() does NOT clear el.innerHTML. The caller (transport.js)
      must pass a completely empty container. Clearing inside init()
      corrupts Leaflet's own DOM setup.
   3. detectRetina stays OFF. Stadia tile URLs do not use Leaflet's
      {r} suffix — enabling it causes every tile to 404.
   4. invalidateSize() is called via setTimeout after init so
      Leaflet re-measures the container after the browser paints.

   PUBLIC API
   ──────────
   Maps.init(id, center?, zoom?)   → L.Map | null
   Maps.showRoute(id, originName, destName)
   Maps.showRouteByCoords(id, {lat,lng}, {lat,lng})
   Maps.destroy(id)
   Maps.refreshTheme()
   Maps.getInstance(id)            → L.Map | null
   */

/* global L, IJDRIVES_CONFIG */

var Maps = (function() {

  // Registry: { containerId: { map: L.Map, tileLayer: L.TileLayer } }
  var _instances = {};

  // ── Private ─

  function _theme() {
    return document.documentElement.getAttribute('data-theme') || 'dark';
  }

  function _tileUrl() {
    return _theme() === 'light'
      ? 'https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}.png'
      : 'https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}.png';
  }

  function _buildLayer() {
    var url = _tileUrl();
    var key = IJDRIVES_CONFIG.STADIA_API_KEY;
    if (key && key.length > 0) {
      url += '?api_key=' + encodeURIComponent(key);
    }
    return L.tileLayer(url, {
      minZoom:     2,
      maxZoom:     18,
      attribution: IJDRIVES_CONFIG.STADIA_ATTRIBUTION,
      // detectRetina intentionally omitted (defaults to false)
    });
  }

  function _marker(label, color) {
    color = color || '#E94560';
    var n = 36;
    var html =
      '<svg xmlns="http://www.w3.org/2000/svg" width="' + n + '" height="' + n + '" viewBox="0 0 36 36">' +
      '<circle cx="18" cy="18" r="16" fill="' + color + '" stroke="#fff" stroke-width="2.5"/>' +
      '<text x="18" y="23" text-anchor="middle" font-family="Space Grotesk,sans-serif" ' +
      'font-size="13" font-weight="700" fill="#fff">' + label + '</text>' +
      '</svg>';
    return L.divIcon({
      className: '',
      html: html,
      iconSize:    [n, n],
      iconAnchor:  [n / 2, n / 2],
      popupAnchor: [0, -(n / 2)],
    });
  }

  function _city(name) {
    if (!name) return IJDRIVES_CONFIG.MAP_DEFAULT_CENTER;
    if (IJDRIVES_CONFIG.CITIES[name]) return IJDRIVES_CONFIG.CITIES[name];
    var low = name.toLowerCase();
    var keys = Object.keys(IJDRIVES_CONFIG.CITIES);
    for (var i = 0; i < keys.length; i++) {
      if (keys[i].toLowerCase() === low) return IJDRIVES_CONFIG.CITIES[keys[i]];
    }
    console.warn('[Maps] Unknown city: ' + name);
    return IJDRIVES_CONFIG.MAP_DEFAULT_CENTER;
  }

  // ─ Public ─

  /**
   * Create a Leaflet map inside an empty container element.
   *
   * CONTRACT:
   *   • The container MUST be empty before this is called.
   *     Call el.innerHTML = '' in YOUR code, not here.
   *   • Do NOT add children to the container before calling this.
   *   • After this returns, you may append position:absolute
   *     children (e.g. a placeholder overlay) — they will float
   *     above the tile layer without affecting sizing.
   */
  function init(id, center, zoom) {
    if (typeof L === 'undefined') {
      console.error('[Maps] Leaflet is not loaded. Check the <script> tag order.');
      return null;
    }

    // Return existing instance — never double-init
    if (_instances[id]) return _instances[id].map;

    var el = document.getElementById(id);
    if (!el) {
      console.warn('[Maps] Element #' + id + ' not found.');
      return null;
    }

    // DO NOT clear el.innerHTML here.
    // transport.js already ensures the container is empty before calling init().
    // If we clear it here we break the Leaflet DOM setup mid-flight.

    var c = center || IJDRIVES_CONFIG.MAP_DEFAULT_CENTER;
    var z = zoom   || IJDRIVES_CONFIG.MAP_DEFAULT_ZOOM;

    var map = L.map(el, {
      center:             [c.lat, c.lng],
      zoom:               z,
      zoomControl:        true,
      scrollWheelZoom:    false,
      attributionControl: true,
    });

    var layer = _buildLayer();
    layer.addTo(map);

    _instances[id] = { map: map, tileLayer: layer };

    // Re-measure container after browser paint.
    // This fixes blank/grey tiles when the CSS height wasn't
    // fully resolved at the moment L.map() ran.
    setTimeout(function() { map.invalidateSize(); }, 200);

    return map;
  }

  /** Show a route between two city names from config.js */
  function showRoute(id, originName, destName) {
    return showRouteByCoords(id, _city(originName), _city(destName));
  }

  /** Show a route between two {lat,lng} coordinate objects */
  function showRouteByCoords(id, originCoords, destCoords) {
    if (typeof L === 'undefined') {
      console.error('[Maps] Leaflet not loaded.');
      return null;
    }

    destroy(id);       // clean up any existing instance first
    var map = init(id);
    if (!map) return null;

    var A = L.latLng(originCoords.lat, originCoords.lng);
    var B = L.latLng(destCoords.lat,   destCoords.lng);

    L.marker(A, { icon: _marker('A', '#E94560') })
      .addTo(map)
      .bindPopup('<strong>Origin</strong>');

    L.marker(B, { icon: _marker('B', '#2EC4B6') })
      .addTo(map)
      .bindPopup('<strong>Destination</strong>');

    L.polyline([A, B], {
      color:     '#E94560',
      weight:    2.5,
      opacity:   0.75,
      dashArray: '8, 6',
      lineCap:   'round',
    }).addTo(map);

    map.fitBounds(L.latLngBounds([A, B]), { padding: [50, 50] });

    return map;
  }

  /** Remove and clean up a map instance */
  function destroy(id) {
    var inst = _instances[id];
    if (inst && inst.map) inst.map.remove();
    delete _instances[id];
  }

  /** Swap tile layers on all maps when dark/light theme changes */
  function refreshTheme() {
    if (typeof L === 'undefined') return;
    var ids = Object.keys(_instances);
    for (var i = 0; i < ids.length; i++) {
      var inst = _instances[ids[i]];
      if (!inst || !inst.map) continue;
      inst.map.removeLayer(inst.tileLayer);
      var newLayer = _buildLayer();
      newLayer.addTo(inst.map);
      inst.tileLayer = newLayer;
    }
  }

  /** Get the raw L.Map for a container, or null */
  function getInstance(id) {
    return _instances[id] ? _instances[id].map : null;
  }

  return {
    init:              init,
    showRoute:         showRoute,
    showRouteByCoords: showRouteByCoords,
    destroy:           destroy,
    refreshTheme:      refreshTheme,
    getInstance:       getInstance,
  };

}());