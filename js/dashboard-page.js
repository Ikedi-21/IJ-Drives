/* 
   IJDrives — dashboard-page.js
   Powers dashboard.html

   1. Guard — redirect to login if not logged in
   2. Load user from IndexedDB
   3. Populate sidebar (avatar initials, name, email)
   4. Populate greeting (time-aware: Good morning/afternoon/evening)
   5. Populate stat cards (balance, total bookings, total spent)
   6. Render bookings table
   7. Render recent transactions (last 5)
   */

document.addEventListener('DOMContentLoaded', async function() {

  //  Guard 
  if (!Utils.isLoggedIn()) {
    window.location.href = 'login.html';
    return;
  }

  var fmt = Utils.formatCurrency;

  //  Load user 
  var user = await Auth.getCurrentUser();
  if (!user) {
    window.location.href = 'login.html';
    return;
  }

  var bookings     = user.bookings     || [];
  var transactions = user.transactions || [];
  var balance      = user.walletBalance || 0;
  var firstName    = (user.fullName || '').split(' ')[0];

  // Sidebar 
  var avatarEl = document.getElementById('dash-avatar');
  var nameEl   = document.getElementById('dash-name');
  var emailEl  = document.getElementById('dash-email');
  if (avatarEl) avatarEl.textContent = Utils.getInitials(user.fullName);
  if (nameEl)   nameEl.textContent   = user.fullName;
  if (emailEl)  emailEl.textContent  = user.email;

  //  Greeting 
  var greetingEl = document.getElementById('dash-greeting-name');
  var hiEl       = document.querySelector('.dash-greeting__hi');
  if (greetingEl) greetingEl.textContent = firstName + '!';
  if (hiEl) {
    var hour = new Date().getHours();
    var timeGreeting = hour < 12 ? 'Good morning ☀️'
                     : hour < 17 ? 'Good afternoon 👋'
                     : 'Good evening 🌙';
    hiEl.textContent = timeGreeting;
  }

  //  Stat cards 
  var balanceEl   = document.getElementById('dash-balance');
  var tripCountEl = document.getElementById('dash-trip-count');
  var spentEl     = document.getElementById('dash-spent');

  if (balanceEl)   balanceEl.textContent   = fmt(balance);
  if (tripCountEl) tripCountEl.textContent = bookings.length;

  // Total spent = sum of all debit transactions
  var totalSpent = transactions
    .filter(function(tx) { return tx.type === 'debit'; })
    .reduce(function(sum, tx) { return sum + (tx.amount || 0); }, 0);
  if (spentEl) spentEl.textContent = fmt(totalSpent);

  // Bookings table 
  var bookingsContainer = document.getElementById('bookings-table-container');
  var countLabel        = document.getElementById('booking-count-label');

  if (countLabel) {
    countLabel.textContent = bookings.length + ' booking' + (bookings.length !== 1 ? 's' : '');
  }

  if (bookingsContainer) {
    if (bookings.length === 0) {
      bookingsContainer.innerHTML =
        '<div style="text-align:center;padding:32px 20px;color:var(--text-muted);">' +
          '<i class="fa-solid fa-ticket" style="font-size:2rem;margin-bottom:12px;display:block;opacity:0.35;"></i>' +
          '<p style="font-family:\'Plus Jakarta Sans\',sans-serif;margin-bottom:12px;">No bookings yet.</p>' +
          '<a href="index.html" class="btn btn-primary btn-sm">' +
            '<i class="fa-solid fa-magnifying-glass"></i> Book your first trip' +
          '</a>' +
        '</div>';
    } else {
      var MODE_ICONS = {
        land: 'fa-bus', sea: 'fa-ship',
        air: 'fa-plane-departure', rail: 'fa-train',
      };
      var MODE_COLORS = {
        land: 'var(--land-accent)', sea: 'var(--sea-accent)',
        air:  'var(--air-accent)',  rail: 'var(--rail-accent)',
      };

      var rows = bookings.slice(0, 10).map(function(b) {
        var mode    = b.mode     || 'land';
        var route   = b.route    || {};
        var icon    = MODE_ICONS[mode]  || 'fa-route';
        var color   = MODE_COLORS[mode] || 'var(--accent)';
        var date    = b.date ? new Date(b.date) : null;
        var dateStr = date
          ? date.toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })
          : '—';

        return (
          '<tr>' +
            '<td>' +
              '<div style="display:flex;align-items:center;gap:10px;">' +
                '<div style="width:34px;height:34px;border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0;' +
                  'background:rgba(255,255,255,0.05);">' +
                  '<i class="fa-solid ' + icon + '" style="font-size:0.8rem;color:' + color + ';"></i>' +
                '</div>' +
                '<div>' +
                  '<div style="font-family:\'Plus Jakarta Sans\',sans-serif;font-size:0.88rem;font-weight:600;color:var(--text-primary);">' +
                    (route.origin || '—') + ' → ' + (route.destination || '—') +
                  '</div>' +
                  '<div style="font-size:0.75rem;color:var(--text-muted);margin-top:1px;">' +
                    (b.provider ? b.provider.name || '' : '') +
                    (b.class ? ' · ' + b.class : '') +
                    (b.seat  ? ' · Seat ' + b.seat : '') +
                  '</div>' +
                '</div>' +
              '</div>' +
            '</td>' +
            '<td style="color:var(--text-muted);font-size:0.82rem;">' + dateStr + '</td>' +
            '<td style="font-family:\'Space Grotesk\',sans-serif;font-weight:700;color:var(--text-primary);">' +
              fmt(b.fare || 0) +
            '</td>' +
            '<td>' +
              '<span style="display:inline-flex;align-items:center;gap:4px;padding:3px 10px;border-radius:var(--radius-full);' +
                'background:rgba(46,196,182,0.12);color:var(--success);font-size:0.72rem;font-weight:700;letter-spacing:0.04em;">' +
                '<i class="fa-solid fa-circle-check" style="font-size:0.65rem;"></i> Confirmed' +
              '</span>' +
            '</td>' +
            '<td style="font-family:\'JetBrains Mono\',monospace;font-size:0.78rem;color:var(--accent);">' +
              (b.ref || '—') +
            '</td>' +
          '</tr>'
        );
      });

      bookingsContainer.innerHTML =
        '<div style="overflow-x:auto;">' +
          '<table class="tx-table">' +
            '<thead><tr>' +
              '<th style="text-align:left;">Route</th>' +
              '<th style="text-align:left;">Date</th>' +
              '<th style="text-align:left;">Fare</th>' +
              '<th style="text-align:left;">Status</th>' +
              '<th style="text-align:left;">Ref</th>' +
            '</tr></thead>' +
            '<tbody>' + rows.join('') + '</tbody>' +
          '</table>' +
        '</div>';
    }
  }

  //  Recent transactions 
  var txContainer = document.getElementById('recent-tx-container');
  if (txContainer) {
    var recent = transactions.slice(0, 5);

    if (recent.length === 0) {
      txContainer.innerHTML =
        '<div style="text-align:center;padding:24px;color:var(--text-muted);font-size:0.88rem;">' +
          'No transactions yet. <a href="wallet.html">Top up your wallet</a> to get started.' +
        '</div>';
    } else {
      var txRows = recent.map(function(tx) {
        var isCredit = tx.type === 'credit';
        var date     = tx.date ? new Date(tx.date) : null;
        var dateStr  = date
          ? date.toLocaleDateString('en-NG', { day: 'numeric', month: 'short' }) +
            ' · ' + date.toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' })
          : '—';

        return (
          '<tr>' +
            '<td>' +
              '<div style="display:flex;align-items:center;gap:10px;">' +
                '<div style="width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0;' +
                  'background:' + (isCredit ? 'rgba(46,196,182,0.15)' : 'rgba(233,69,96,0.12)') + ';">' +
                  '<i class="fa-solid ' + (isCredit ? 'fa-arrow-down' : 'fa-arrow-up') + '" ' +
                    'style="font-size:0.7rem;color:' + (isCredit ? 'var(--success)' : 'var(--danger)') + ';"></i>' +
                '</div>' +
                '<div>' +
                  '<div style="font-size:0.85rem;font-weight:600;color:var(--text-primary);">' +
                    (tx.description || (isCredit ? 'Credit' : 'Debit')) +
                  '</div>' +
                  '<div style="font-size:0.73rem;color:var(--text-muted);">' + dateStr + '</div>' +
                '</div>' +
              '</div>' +
            '</td>' +
            '<td class="' + (isCredit ? 'tx-amount-credit' : 'tx-amount-debit') + '">' +
              (isCredit ? '+' : '−') + fmt(tx.amount || 0) +
            '</td>' +
          '</tr>'
        );
      });

      txContainer.innerHTML =
        '<table class="tx-table">' +
          '<thead><tr>' +
            '<th style="text-align:left;">Description</th>' +
            '<th style="text-align:left;">Amount</th>' +
          '</tr></thead>' +
          '<tbody>' + txRows.join('') + '</tbody>' +
        '</table>';
    }
  }

  //  Scroll reveal 
  Utils.initScrollReveal();

});