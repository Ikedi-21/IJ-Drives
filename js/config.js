/* 
   IJDrives — config.js
   App-wide configuration and constants.

   MAP SETUP (Leaflet + Stadia Maps):
   
   No API key is required for the Stadia "Alidade Smooth Dark"
   and "Alidade Smooth" tiles at demo/low traffic volumes.

   If you register a free account at https://client.stadiamaps.com
   you get a free API key that unlocks higher rate limits.
   To use it, set STADIA_API_KEY below — otherwise leave it ''.

   NOTE: config.js is listed in .gitignore — do NOT commit it
   to a public repo if you add a real key.
    */

const IJDRIVES_CONFIG = {

  // ── Map provider ──
  // Leaflet + Stadia Maps (free, no key required for low traffic)
  STADIA_API_KEY: '',   // optional — leave '' for anonymous access

  // Stadia tile URL templates (theme-aware — switched by maps.js)
  // {r} = retina suffix (@2x) injected automatically
  STADIA_TILES: {
    // No {r} suffix — detectRetina must stay OFF for Stadia tiles.
    // {r} causes Leaflet to request URLs ending in "{r}.png" literally → 404 → blank map.
    dark:  'https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}.png',
    light: 'https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}.png',
  },

  // Stadia attribution (required by their terms of service)
  STADIA_ATTRIBUTION:
    '&copy; <a href="https://stadiamaps.com/" target="_blank">Stadia Maps</a> ' +
    '&copy; <a href="https://openmaptiles.org/" target="_blank">OpenMapTiles</a> ' +
    '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a>',

  // ── App Info ──
  APP_NAME:    'IJDrives',
  APP_VERSION: '1.0.0',
  IS_DEMO:     true,

  // ── IndexedDB ──
  DB_NAME:    'ijdrives_db',
  DB_VERSION: 1,

  // ── Wallet ──
  WELCOME_BONUS:   500,      // ₦500 credited on signup
  MIN_DEPOSIT:     500,      // Minimum deposit (₦)
  MAX_DEPOSIT:     500000,   // Maximum deposit (₦)
  CURRENCY_SYMBOL: '₦',
  CURRENCY_LOCALE: 'en-NG',

  // ── Nigerian Cities — lat/lng for map markers ──
  // Keys must match city name strings used in route JSON files
  CITIES: {
    'Lagos':         { lat: 6.5244,  lng: 3.3792  },
    'Abuja':         { lat: 9.0579,  lng: 7.4951  },
    'Port Harcourt': { lat: 4.8156,  lng: 7.0498  },
    'Kano':          { lat: 12.0022, lng: 8.5920  },
    'Ibadan':        { lat: 7.3775,  lng: 3.9470  },
    'Enugu':         { lat: 6.4584,  lng: 7.5464  },
    'Warri':         { lat: 5.5174,  lng: 5.7536  },
    'Calabar':       { lat: 4.9517,  lng: 8.3220  },
    'Benin City':    { lat: 6.3350,  lng: 5.6270  },
    'Kaduna':        { lat: 10.5264, lng: 7.4385  },
    'Owerri':        { lat: 5.4836,  lng: 7.0333  },
    'Uyo':           { lat: 5.0510,  lng: 7.9328  },
    'Maiduguri':     { lat: 11.8311, lng: 13.1510 },
    'Ilorin':        { lat: 8.4966,  lng: 4.5426  },
    'Asaba':         { lat: 6.1997,  lng: 6.7358  },
    'Lokoja':        { lat: 7.7974,  lng: 6.7372  },
    'Akure':         { lat: 7.2526,  lng: 5.1964  },
    'Abeokuta':      { lat: 7.1475,  lng: 3.3619  },
    'Jos':           { lat: 9.8965,  lng: 8.8583  },
    'Sokoto':        { lat: 13.0622, lng: 5.2339  },
    'Makurdi':       { lat: 7.7306,  lng: 8.5391  },
    'Bauchi':        { lat: 10.3158, lng: 9.8442  },
    'Yola':          { lat: 9.2035,  lng: 12.4954 },
    'Apapa':         { lat: 6.4500,  lng: 3.3600  },
    'Badagry':       { lat: 6.4162,  lng: 2.8874  },
  },

  // ── Map defaults ──
  MAP_DEFAULT_CENTER: { lat: 9.0820, lng: 8.6753 }, // geographic centre of Nigeria
  MAP_DEFAULT_ZOOM:   6,   // country-wide view
  MAP_ROUTE_ZOOM:     7,   // zoomed in on a route
  MAP_CITY_ZOOM:      12,  // street-level city view
};

// Freeze to prevent accidental mutation from other JS files
Object.freeze(IJDRIVES_CONFIG);
Object.freeze(IJDRIVES_CONFIG.STADIA_TILES);
Object.freeze(IJDRIVES_CONFIG.CITIES);
