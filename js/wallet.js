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

    var user = await Auth.getCurrentUser();
    if (!user) throw new Error('You must be logged in to deposit funds.');

    var newBalance = (user.walletBalance || 0) + amount;

    var tx = {
      id:          Utils.generateUUID(),
      type:        'credit',
      amount:      amount,
      description: 'Wallet Top-up',
      date:        new Date().toISOString(),
      balance:     newBalance,
    };

    user.walletBalance = newBalance;
    user.transactions  = [tx].concat(user.transactions || []);

    await DB.updateUser(user);
    updateNavbarChip(newBalance);

    return newBalance;
  }

  /**
   * Debit the user's wallet by the given amount.
   * Throws if balance is insufficient.
   * @param {number} amount
   * @param {string} description  e.g. "Lagos → Abuja · GUO Transport"
   * @returns {number} new balance
   */
  async function debit(amount, description) {
    amount = Number(amount);
    if (isNaN(amount) || amount <= 0) {
      throw new Error('Invalid payment amount.');
    }

    var user = await Auth.getCurrentUser();
    if (!user) throw new Error('You must be logged in to make a payment.');

    var currentBalance = user.walletBalance || 0;
    if (currentBalance < amount) {
      throw new Error(
        'Insufficient wallet balance. You have ' +
        Utils.formatCurrency(currentBalance) +
        ' but need ' +
        Utils.formatCurrency(amount) + '.'
      );
    }

    var newBalance = currentBalance - amount;

    var tx = {
      id:          Utils.generateUUID(),
      type:        'debit',
      amount:      amount,
      description: description || 'Booking Payment',
      date:        new Date().toISOString(),
      balance:     newBalance,
    };

    user.walletBalance = newBalance;
    user.transactions  = [tx].concat(user.transactions || []);

    await DB.updateUser(user);
    updateNavbarChip(newBalance);

    return newBalance;
  }

  /**
   * Returns the current user's wallet balance, or 0 if not logged in.
   */
  async function getBalance() {
    var user = await Auth.getCurrentUser();
    return user ? (user.walletBalance || 0) : 0;
  }

  /**
   * Returns the current user's full transaction history array.
   */
  async function getTransactions() {
    var user = await Auth.getCurrentUser();
    return user ? (user.transactions || []) : [];
  }

  /**
   * Adds a completed booking to the user's bookings array in IndexedDB.
   * Called by booking-page.js after a successful payment.
   */
  async function saveBooking(bookingRecord) {
    var user = await Auth.getCurrentUser();
    if (!user) return;
    user.bookings = [bookingRecord].concat(user.bookings || []);
    await DB.updateUser(user);
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