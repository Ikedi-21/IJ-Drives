/* 
   IJDrives — confirm.js  (Day 9)
   Powers confirm.html — the booking confirmation / receipt page.

   Reads the completed booking state from sessionStorage,
   renders a full receipt, then clears the booking state so
   the user starts fresh on the next booking.
    */

document.addEventListener('DOMContentLoaded', async function() {

  var state = Booking.getState();

  // Guard — no paid booking → show message, no redirect
  if (!state || !state.paid || !state.ref) {
    var det = document.getElementById('confirm-details');
    if (det) {
      det.innerHTML =
        '<div style="text-align:center;padding:40px 20px;">' +
          '<i class="fa-solid fa-receipt" style="font-size:3rem;color:var(--text-muted);opacity:0.35;margin-bottom:16px;display:block;"></i>' +
          '<h3 style="font-family:\'Space Grotesk\',sans-serif;margin-bottom:8px;">No booking found</h3>' +
          '<p style="color:var(--text-muted);margin-bottom:24px;">Complete a booking first to see your receipt.</p>' +
          '<a href="index.html" class="btn btn-primary"><i class="fa-solid fa-house"></i> Go Home</a>' +
        '</div>';
    }
    return;
  }

  var route    = state.route    || {};
  var provider = state.provider || {};
  var pax      = state.passenger || {};
  var mode     = state.mode     || 'land';

  var MODE = {
    land: { icon: 'fa-bus',             label: 'Land',  accent: 'var(--land-accent)' },
    sea:  { icon: 'fa-ship',            label: 'Sea',   accent: 'var(--sea-accent)'  },
    air:  { icon: 'fa-plane-departure', label: 'Air',   accent: 'var(--air-accent)'  },
    rail: { icon: 'fa-train',           label: 'Rail',  accent: 'var(--rail-accent)' },
  };
  var modeInfo = MODE[mode] || MODE.land;
  var fmt      = Utils.formatCurrency;

  // Populate booking reference 
  var refEl = document.getElementById('booking-ref');
  if (refEl) refEl.textContent = state.ref;

  // Populate booking date 
  var dateEl = document.getElementById('booking-date');
  if (dateEl && state.date) {
    var d = new Date(state.date);
    dateEl.textContent = d.toLocaleDateString('en-NG', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    }) + ' at ' + d.toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' });
  }

  // Populate confirm details card 
  var detailsEl = document.getElementById('confirm-details');
  if (detailsEl) {
    detailsEl.innerHTML =

      // Route header
      '<div class="confirm-route">' +
        '<div class="confirm-mode-badge" style="color:' + modeInfo.accent + '; border-color:' + modeInfo.accent + ';">' +
          '<i class="fa-solid ' + modeInfo.icon + '"></i> ' + modeInfo.label + ' Transport' +
        '</div>' +
        '<div class="confirm-cities">' +
          '<div class="confirm-city">' +
            '<div class="confirm-city__label">FROM</div>' +
            '<div class="confirm-city__name">' + (route.origin || '—') + '</div>' +
            '<div class="confirm-city__time">' + (route.departure || '') + '</div>' +
          '</div>' +
          '<div class="confirm-arrow">' +
            '<i class="fa-solid fa-arrow-right"></i>' +
            '<div class="confirm-duration">' + (route.duration_hrs || '') + 'h</div>' +
          '</div>' +
          '<div class="confirm-city">' +
            '<div class="confirm-city__label">TO</div>' +
            '<div class="confirm-city__name">' + (route.destination || '—') + '</div>' +
            '<div class="confirm-city__time">' + (route.arrival || '') + '</div>' +
          '</div>' +
        '</div>' +
      '</div>' +

      '<div class="confirm-divider"></div>' +

      // Details table
      '<div class="confirm-table">' +
        row('Provider',   provider.name || '—') +
        row('Class',      state.class || route.class || '—') +
        (state.seat ? row('Seat', state.seat) : '') +
        row('Passenger',  pax.fullName || '—') +
        row('Email',      pax.email    || '—') +
        row('Phone',      pax.phone    || '—') +
        row('Amount Paid', '<strong style="color:var(--accent);">' + fmt(route.fare_ngn || 0) + '</strong>') +
        row('Booking Ref', '<code style="font-family:\'JetBrains Mono\',monospace; color:var(--accent);">' + state.ref + '</code>') +
      '</div>' +

      '<div class="confirm-divider"></div>' +

      // Actions
      '<div class="confirm-actions">' +
        '<a href="dashboard.html" class="btn btn-primary">' +
          '<i class="fa-solid fa-gauge"></i> View Dashboard' +
        '</a>' +
        '<a href="index.html" class="btn btn-secondary">' +
          '<i class="fa-solid fa-house"></i> Back to Home' +
        '</a>' +
        '<button class="btn btn-ghost" id="print-btn">' +
          '<i class="fa-solid fa-print"></i> Print Receipt' +
        '</button>' +
      '</div>';
  }

  // Print button 
  var printBtn = document.getElementById('print-btn');
  if (printBtn) {
    printBtn.addEventListener('click', function() { window.print(); });
  }

  // Clear booking state now that receipt is shown 
  // Small delay so if user refreshes before reading, it still shows
  setTimeout(function() { Booking.clearState(); }, 5000);

  // Helper: table row 
  function row(label, value) {
    return (
      '<div class="confirm-row">' +
        '<span class="confirm-row__label">' + label + '</span>' +
        '<span class="confirm-row__value">' + value  + '</span>' +
      '</div>'
    );
  }

});