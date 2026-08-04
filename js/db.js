/* 
   IJDrives — db.js
   IndexedDB setup, open, and CRUD helpers
   Stores: users
    */

const DB = (() => {
  let _db = null;

  // ─ initialise the database ─
  function open() {
    return new Promise((resolve, reject) => {
      if (_db) return resolve(_db);

      const request = indexedDB.open(IJDRIVES_CONFIG.DB_NAME, IJDRIVES_CONFIG.DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Users store
        if (!db.objectStoreNames.contains('users')) {
          const usersStore = db.createObjectStore('users', { keyPath: 'id' });
          usersStore.createIndex('email', 'email', { unique: true });
        }
      };

      request.onsuccess = (event) => {
        _db = event.target.result;
        resolve(_db);
      };

      request.onerror = (event) => {
        console.error('IndexedDB open error:', event.target.error);
        reject(event.target.error);
      };
    });
  }

  // ── Generic transaction helper ──
  async function transaction(storeName, mode, callback) {
    const db = await open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, mode);
      const store = tx.objectStore(storeName);
      const request = callback(store);

      request.onsuccess = () => resolve(request.result);
      request.onerror  = () => reject(request.error);
    });
  }

  // ── Users CRUD ──

  /**
   * Create a new user record
   * @param {Object} userData - { id, fullName, email, passwordHash, walletBalance, bookings, transactions, createdAt }
   */
  async function createUser(userData) {
    return transaction('users', 'readwrite', (store) => store.add(userData));
  }

  /**
   * Get a user by their unique ID
   * @param {string} id - UUID
   */
  async function getUserById(id) {
    return transaction('users', 'readonly', (store) => store.get(id));
  }

  /**
   * Get a user by email address
   * @param {string} email
   */
  async function getUserByEmail(email) {
    const db = await open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('users', 'readonly');
      const store = tx.objectStore('users');
      const index = store.index('email');
      const request = index.get(email);
      request.onsuccess = () => resolve(request.result);
      request.onerror   = () => reject(request.error);
    });
  }

  /**
   * Update a user record (full replacement)
   * @param {Object} userData - must include id
   */
  async function updateUser(userData) {
    return transaction('users', 'readwrite', (store) => store.put(userData));
  }

  /**
   * Delete a user by ID
   * @param {string} id
   */
  async function deleteUser(id) {
    return transaction('users', 'readwrite', (store) => store.delete(id));
  }

  /**
   * Check if an email is already registered
   * @param {string} email
   */
  async function emailExists(email) {
    const user = await getUserByEmail(email);
    return !!user;
  }

  return {
    open,
    createUser,
    getUserById,
    getUserByEmail,
    updateUser,
    deleteUser,
    emailExists,
  };
})();
