/* 
   IJDrives — wallet-page.js
   Powers wallet.html

   1. Guard — redirect to login if not logged in
   2. Load and display current balance
   3. Load and render transaction history table
   4. Wire Deposit button → open modal
   5. Wire modal close button + overlay click → close modal
   6. Wire Confirm Deposit → Wallet.deposit() → refresh page
   7. Quick-amount shortcut buttons (₦500, ₦1000, ₦2000, ₦5000)
   8. Update sidebar profile (name, email, avatar initials)
    */

document.addEventListener('DOMContentLoaded', async function() {

  // ── 1. Guard: must be logged in ───────────────────────────
  if (!Utils.isLoggedIn()) {
    window.location.href = 'login.html';
    return;
  }

  var fmt = Utils.formatCurrency;

  // ── 2. Load user + populate page ─────────────────────────
  async function loadPage() {
    var user = await Auth.getCurrentUser();
    if (!user) {
      window.location.href = 'login.html';
      return;
    }

    // Sidebar profile
    var avatarEl = document.getElementById('dash-avatar');
    var nameEl   = document.getElementById('dash-name');
    var emailEl  = document.getElementById('dash-email');
    if (avatarEl) avatarEl.textContent = Utils.getInitials(user.fullName);
    if (nameEl)   nameEl.textContent   = user.fullName;
    if (emailEl)  emailEl.textContent  = user.email;

    // Balance
    var balance    = user.walletBalance || 0;
    var balanceEl  = document.getElementById('wallet-balance');
    if (balanceEl) {
      // Animate count-up from 0
      animateBalance(balanceEl, balance);
    }

    // Transactions
    renderTransactions(user.transactions || []);
  }

  // ── 3. Animate balance count-up ───────────────────────────
  function animateBalance(el, target) {
    var duration = 900;
    var start    = performance.now();
    function tick(now) {
      var progress = Math.min((now - start) / duration, 1);
      var eased    = 1 - Math.pow(1 - progress, 3);
      // Format with commas, 2 decimal places
      el.textContent = (eased * target).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
      if (progress < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  // ── 4. Render transaction history ────────────────────────
  function renderTransactions(transactions) {
    var container = document.getElementById('tx-history-container');
    if (!container) return;

    if (!transactions || transactions.length === 0) {
      container.innerHTML =
        '<div style="text-align:center;padding:40px 20px;color:var(--text-muted);">' +
          '<i class="fa-solid fa-coins" style="font-size:2.5rem;margin-bottom:12px;display:block;opacity:0.35;"></i>' +
          '<p style="font-family:\'Plus Jakarta Sans\',sans-serif;">No transactions yet.</p>' +
          '<p style="font-size:0.82rem;margin-top:4px;">Deposit funds or make a booking to see your history here.</p>' +
        '</div>';
      return;
    }

    var rows = transactions.map(function(tx) {
      var isCredit = tx.type === 'credit';
      var date     = tx.date ? new Date(tx.date) : null;
      var dateStr  = date
        ? date.toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' }) +
          ' &middot; ' +
          date.toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' })
        : '—';

      return (
        '<tr>' +
          '<td>' +
            '<div style="display:flex;align-items:center;gap:10px;">' +
              '<div style="width:34px;height:34px;border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0;background:' +
                (isCredit ? 'rgba(46,196,182,0.15)' : 'rgba(233,69,96,0.12)') + ';">' +
                '<i class="fa-solid ' + (isCredit ? 'fa-arrow-down' : 'fa-arrow-up') + '" style="font-size:0.75rem;color:' +
                  (isCredit ? 'var(--success)' : 'var(--danger)') + ';"></i>' +
              '</div>' +
              '<div>' +
                '<div style="font-family:\'Plus Jakarta Sans\',sans-serif;font-size:0.88rem;font-weight:600;color:var(--text-primary);">' +
                  (tx.description || (isCredit ? 'Credit' : 'Debit')) +
                '</div>' +
                '<div style="font-size:0.75rem;color:var(--text-muted);margin-top:2px;">' + dateStr + '</div>' +
              '</div>' +
            '</div>' +
          '</td>' +
          '<td class="' + (isCredit ? 'tx-amount-credit' : 'tx-amount-debit') + '">' +
            (isCredit ? '+' : '−') + fmt(tx.amount || 0) +
          '</td>' +
          '<td style="color:var(--text-secondary);font-size:0.85rem;text-align:right;">' +
            fmt(tx.balance || 0) +
          '</td>' +
        '</tr>'
      );
    });

    container.innerHTML =
      '<table class="tx-table">' +
        '<thead>' +
          '<tr>' +
            '<th style="text-align:left;">Transaction</th>' +
            '<th style="text-align:left;">Amount</th>' +
            '<th style="text-align:right;">Balance After</th>' +
          '</tr>' +
        '</thead>' +
        '<tbody>' + rows.join('') + '</tbody>' +
      '</table>';
  }

  // ── 5. Modal open/close ───────────────────────────────────
  var modal         = document.getElementById('deposit-modal');
  var depositBtn    = document.getElementById('deposit-btn');
  var closeBtn      = document.getElementById('close-deposit-modal');
  var amountInput   = document.getElementById('deposit-amount');
  var confirmBtn    = document.getElementById('confirm-deposit-btn');

  function openModal() {
    if (!modal) return;
    modal.classList.add('open');
    if (amountInput) {
      amountInput.value = '';
      amountInput.focus();
    }
  }

  function closeModal() {
    if (!modal) return;
    modal.classList.remove('open');
    if (amountInput) amountInput.value = '';
    if (confirmBtn) {
      confirmBtn.disabled  = false;
      confirmBtn.innerHTML = '<i class="fa-solid fa-check"></i> Confirm Deposit';
    }
  }

  if (depositBtn) depositBtn.addEventListener('click', openModal);
  if (closeBtn)   closeBtn.addEventListener('click',   closeModal);

  // Close when clicking outside the modal box
  if (modal) {
    modal.addEventListener('click', function(e) {
      if (e.target === modal) closeModal();
    });
  }

  // Close on Escape key
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') closeModal();
  });

  // ── 6. Quick-amount buttons ────────────────────────────────
  var quickBtns = document.querySelectorAll('.deposit-quick-btn');
  quickBtns.forEach(function(btn) {
    btn.addEventListener('click', function() {
      if (amountInput) amountInput.value = btn.dataset.amount;
      amountInput.focus();
    });
  });

  // ── 7. Confirm deposit ────────────────────────────────────
  if (confirmBtn) {
    confirmBtn.addEventListener('click', async function() {
      var raw    = amountInput ? amountInput.value.trim() : '';
      var amount = parseFloat(raw);

      if (!raw || isNaN(amount) || amount <= 0) {
        Utils.showToast('warning', 'Enter an amount', 'Please type an amount to deposit.');
        if (amountInput) amountInput.focus();
        return;
      }

      confirmBtn.disabled  = true;
      confirmBtn.innerHTML =
        '<span class="spinner" style="width:18px;height:18px;border-width:2px;"></span> Processing...';

      try {
        var newBalance = await Wallet.deposit(amount);

        closeModal();
        Utils.showToast(
          'success',
          'Deposit successful!',
          fmt(amount) + ' added to your wallet.',
          3500
        );

        // Refresh balance display
        var balanceEl = document.getElementById('wallet-balance');
        if (balanceEl) animateBalance(balanceEl, newBalance);

        // Refresh transactions
        var user = await Auth.getCurrentUser();
        if (user) renderTransactions(user.transactions || []);

      } catch (err) {
        confirmBtn.disabled  = false;
        confirmBtn.innerHTML = '<i class="fa-solid fa-check"></i> Confirm Deposit';
        Utils.showToast('error', 'Deposit failed', err.message || 'Please try again.');
      }
    });
  }

  // Also submit on Enter key in amount input
  if (amountInput) {
    amountInput.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' && confirmBtn) confirmBtn.click();
    });
  }

  // ── 8. Initial load ───────────────────────────────────────
  await loadPage();
  Utils.initScrollReveal();

});