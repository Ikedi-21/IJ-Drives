/* 
   IJDrives — api.js
   Unified Frontend API Client bridge connecting the UI to the FastAPI backend.
   Enforces the One Flow Path request/response lifecycle.
*/

/* global IJDRIVES_CONFIG */

const API = (() => {
  const TOKEN_KEY = 'ij_access_token';
  const USER_KEY  = 'ij_current_user';

  const getBaseUrl = () => {
    return (typeof IJDRIVES_CONFIG !== 'undefined' && IJDRIVES_CONFIG.API_BASE_URL)
      ? IJDRIVES_CONFIG.API_BASE_URL
      : 'http://127.0.0.1:8000/api/v1';
  };

  function getToken() {
    return localStorage.getItem(TOKEN_KEY);
  }

  function setToken(token) {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
  }

  function getCachedUser() {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    try { return JSON.parse(raw); } catch (_) { return null; }
  }

  function setCachedUser(user) {
    if (user) {
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(USER_KEY);
    }
  }

  function clearAuth() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem('ij_session'); // legacy clean-up
  }

  /**
   * Universal fetch handler enforcing standard response unpacking.
   */
  async function request(endpoint, options = {}) {
    const baseUrl = getBaseUrl();
    const url = `${baseUrl}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;

    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...(options.headers || {}),
    };

    const token = getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const config = {
      ...options,
      headers,
    };

    try {
      const response = await fetch(url, config);
      const result = await response.json().catch(() => ({}));

      if (!response.ok || result.success === false) {
        const errorMsg = (result.error && result.error.message)
          ? result.error.message
          : `HTTP error! Status: ${response.status}`;
        
        // Stale or invalid token
        if (response.status === 401 && token) {
          clearAuth();
        }

        const err = new Error(errorMsg);
        err.code = result.error ? result.error.code : 'API_ERROR';
        err.details = result.error ? result.error.details : [];
        throw err;
      }

      return result.data;
    } catch (err) {
      console.error(`[API Client Error] ${options.method || 'GET'} ${endpoint}:`, err);
      throw err;
    }
  }

  // ── Authentication Domain ──
  const auth = {
    async signup({ fullName, email, password }) {
      const data = await request('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ full_name: fullName, email, password }),
      });
      setToken(data.access_token);
      setCachedUser(data.user);
      return data.user;
    },

    async login({ email, password }) {
      const data = await request('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      setToken(data.access_token);
      setCachedUser(data.user);
      return data.user;
    },

    async getCurrentUser() {
      const token = getToken();
      if (!token) return null;
      try {
        const user = await request('/auth/me', { method: 'GET' });
        setCachedUser(user);
        return user;
      } catch (err) {
        clearAuth();
        return null;
      }
    },

    logout() {
      clearAuth();
    },

    isLoggedIn() {
      return !!getToken();
    },
  };

  // ── Wallet Domain ──
  const wallet = {
    async getSummary() {
      return request('/wallet', { method: 'GET' });
    },

    async getBalance() {
      const user = await auth.getCurrentUser();
      return user ? (user.wallet_balance || 0) : 0;
    },

    async getTransactions() {
      const summary = await request('/wallet', { method: 'GET' });
      return (summary && summary.transactions) ? summary.transactions : [];
    },

    async deposit(amount) {
      const summary = await request('/wallet/deposit', {
        method: 'POST',
        body: JSON.stringify({ amount: Number(amount) }),
      });
      // Update cached user wallet balance
      const cached = getCachedUser();
      if (cached) {
        cached.wallet_balance = summary.balance;
        setCachedUser(cached);
      }
      return summary.balance;
    },
  };

  // ── Transport Discovery Domain ──
  const transport = {
    async getRoutes(filters = {}) {
      const params = new URLSearchParams();
      if (filters.origin) params.append('origin', filters.origin);
      if (filters.destination) params.append('destination', filters.destination);
      if (filters.mode) params.append('mode', filters.mode);
      if (filters.maxFare) params.append('max_fare', filters.maxFare);
      if (filters.classFilter) params.append('class_filter', filters.classFilter);
      if (filters.sortBy) params.append('sort_by', filters.sortBy);

      const qs = params.toString();
      const endpoint = qs ? `/transport/routes?${qs}` : '/transport/routes';
      return request(endpoint, { method: 'GET' });
    },

    async getRoute(routeId) {
      return request(`/transport/routes/${routeId}`, { method: 'GET' });
    },

    async getProviders(mode = null) {
      const endpoint = mode ? `/transport/providers?mode=${encodeURIComponent(mode)}` : '/transport/providers';
      return request(endpoint, { method: 'GET' });
    },

    async getProvider(providerId) {
      return request(`/transport/providers/${providerId}`, { method: 'GET' });
    },
  };

  // ── Bookings & Reservations Domain ──
  const bookings = {
    async createBooking({ routeId, passenger, seat, classChoice, travelDate }) {
      return request('/bookings', {
        method: 'POST',
        body: JSON.stringify({
          route_id: routeId,
          passenger: {
            fullName: passenger.fullName || passenger.name,
            email: passenger.email,
            phone: passenger.phone,
          },
          seat: seat || null,
          class: classChoice || null,
          travel_date: travelDate || null,
        }),
      });
    },

    async getMyBookings() {
      return request('/bookings/my', { method: 'GET' });
    },

    async getBooking(ref) {
      return request(`/bookings/${ref}`, { method: 'GET' });
    },
  };

  return {
    auth,
    wallet,
    transport,
    bookings,
    getToken,
    setToken,
    clearAuth,
    request,
    getBaseUrl,
  };
})();

