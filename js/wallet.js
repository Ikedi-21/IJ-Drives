/* 
   IJDrives — wallet.js
   Fake wallet: deposit, debit, balance, transaction history.
   All data stored in IndexedDB via DB module.

   PUBLIC API
   ──────────
   Wallet.deposit(amount)              → credits user wallet
   Wallet.debit(amount, description)   → debits wallet, throws if insufficient
   Wallet.getBalance()                 → current balance (number)
   Wallet.getTransactions()            → array of transaction objects
   Wallet.updateNavbarChip()           → refreshes the wallet chip in navbar
    */

/* global DB, Auth, Utils, IJDRIVES_CONFIG */

var Wallet = (function() {

  /**
   * Credit the user's wallet with the given amount.
   * Creates a transaction record and saves to IndexedDB.
   * @param {number} amount
   */
  async function deposit(amount) {
    amount = Number(amount);
    if (isNaN(amount) || amount <= 0) {
      throw new Error('Invalid deposit amount.');
    }
    if (amount < IJDRIVES_CONFIG.MIN_DEPOSIT) {
      throw new Error('Minimum deposit is ' + Utils.formatCurrency(IJDRIVES_CONFIG.MIN_DEPOSIT) + '.');
    }
    if (amount > IJDRIVES_CONFIG.MAX_DEPOSIT) {
      throw new Error('Maximum deposit is ' + Utils.formatCurrency(IJDRIVES_CONFIG.MAX_DEPOSIT) + '.');
    }

    if (!Utils.isLoggedIn()) throw new Error('You must be logged in to deposit funds.');

    var newBalance = await API.wallet.deposit(amount);
    updateNavbarChip(newBalance);
    return newBalance;
  }

  /**
   * Debit helper (Note: Bookings are debited atomically on the backend).
   * @param {number} amount
   * @param {string} description
   * @returns {number}
   */
  async function debit(amount, description) {
    var balance = await getBalance();
    if (balance < amount) {
      throw new Error(
        'Insufficient wallet balance. You have ' +
        Utils.formatCurrency(balance) +
        ' but need ' +
        Utils.formatCurrency(amount) + '.'
      );
    }
    return balance - amount;
  }

  /**
   * Returns the current user's wallet balance, or 0 if not logged in.
   */
  async function getBalance() {
    return API.wallet.getBalance();
  }

  /**
   * Returns the current user's full transaction history array.
   */
  async function getTransactions() {
    return API.wallet.getTransactions();
  }

  /**
   * Persists booking atomically via FastAPI backend.
   */
  async function saveBooking(bookingRecord) {
    if (typeof API !== 'undefined' && API.auth.isLoggedIn()) {
      var route = bookingRecord.route || {};
      var passenger = bookingRecord.passenger || {};
      var result = await API.bookings.createBooking({
        routeId: route.id,
        passenger: passenger,
        seat: bookingRecord.seat,
        classChoice: bookingRecord.class,
        travelDate: bookingRecord.date,
      });
      if (result && result.ref) {
        bookingRecord.ref = result.ref;
      }
      return result;
    }
    return bookingRecord;
  }

  /**
   * Updates the wallet chip balance in the navbar.
   * Safe to call even if the chip doesn't exist on the page.
   */
  function updateNavbarChip(balance) {
    var chip      = document.querySelector('.wallet-chip');
    var balanceEl = document.querySelector('.wallet-chip__balance');
    if (!chip || !balanceEl) return;
    balanceEl.textContent = Utils.formatCurrency(
      typeof balance === 'number' ? balance : 0
    );
  }

  return {
    deposit:         deposit,
    debit:           debit,
    getBalance:      getBalance,
    getTransactions: getTransactions,
    saveBooking:     saveBooking,
    updateNavbarChip: updateNavbarChip,
  };

}());