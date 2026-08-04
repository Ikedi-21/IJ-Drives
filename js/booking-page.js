/* 
   IJDrives — booking-page.js  (Day 9)
   Powers booking.html — the 4-step booking flow.

   Step 1 — Route Summary
     Shows route details, provider info, map preview.
   Step 2 — Passenger Details
     Name, email, phone. Pre-filled if user is logged in.
   Step 3 — Seat / Class Selection
     Visual seat grid for bus/train, cabin class for air/sea.
   Step 4 — Review & Pay
     Order summary, wallet balance, "Pay from Wallet" button.
     On success → saves booking to IndexedDB → confirm.html.
    */

document.addEventListener('DOMContentLoaded', async function() {

  // ── Element refs 
  var formArea       = document.getElementById('booking-form-area');
  var summaryContent = document.getElementById('booking-summary-content');

  // ── Utility: format currency 
  var fmt = Utils.formatCurrency;

  // ── Guard: no booking state → back to homepage ────────────
  var state = Booking.getState();
  if (!state || !state.route) {
    if (formArea) {
      formArea.innerHTML =
        '<div class="booking-card" style="text-align:center;padding:48px 24px;">' +
          '<i class="fa-solid fa-ticket-slash" style="font-size:3rem;color:var(--text-muted);opacity:0.4;margin-bottom:16px;display:block;"></i>' +
          '<h3 style="font-family:\'Space Grotesk\',sans-serif;margin-bottom:8px;">No booking selected</h3>' +
          '<p style="color:var(--text-muted);margin-bottom:24px;">Please select a route to start a booking.</p>' +
          '<div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap;">' +
            '<a href="land.html" class="btn btn-primary"><i class="fa-solid fa-bus"></i> Browse Land</a>' +
            '<a href="air.html"  class="btn btn-secondary"><i class="fa-solid fa-plane-departure"></i> Browse Air</a>' +
            '<a href="index.html" class="btn btn-ghost"><i class="fa-solid fa-house"></i> Home</a>' +
          '</div>' +
        '</div>';
    }
    return;
  }

  /* If already paid — jump straight to receipt (handles Back button) */
  if (state.paid && state.ref) {
    window.location.href = 'confirm.html';
    return;
  }

  var route    = state.route;
  var provider = state.provider || {};
  var mode     = state.mode     || 'land';
  var step     = state.step     || 1;

  // ── Mode config 
  var MODE = {
    land: { icon: 'fa-bus',            label: 'Land',  accent: 'var(--land-accent)' },
    sea:  { icon: 'fa-ship',           label: 'Sea',   accent: 'var(--sea-accent)'  },
    air:  { icon: 'fa-plane-departure',label: 'Air',   accent: 'var(--air-accent)'  },
    rail: { icon: 'fa-train',          label: 'Rail',  accent: 'var(--rail-accent)' },
  };
  var modeInfo = MODE[mode] || MODE.land;

  // 
  // STEP INDICATOR
  // 
  function updateStepIndicator(currentStep) {
    var circles = document.querySelectorAll('.booking-step');
    circles.forEach(function(el, idx) {
      var n = idx + 1;
      el.classList.remove('active', 'done');
      if (n < currentStep)  el.classList.add('done');
      if (n === currentStep) el.classList.add('active');
    });
  }

  // 
  // BOOKING SUMMARY SIDEBAR (shown on all steps)
  // 
  async function renderSummary() {
    var balance = Utils.isLoggedIn() ? await Wallet.getBalance() : 0;
    var fare    = route.fare_ngn || 0;
    var canPay  = balance >= fare;

    summaryContent.innerHTML =
      '<div class="booking-summary__row">' +
        '<span class="label"><i class="fa-solid ' + modeInfo.icon + '" style="color:' + modeInfo.accent + ';"></i> Mode</span>' +
        '<span class="value">' + modeInfo.label + '</span>' +
      '</div>' +
      '<div class="booking-summary__row">' +
        '<span class="label">From</span>' +
        '<span class="value">' + (route.origin || '—') + '</span>' +
      '</div>' +
      '<div class="booking-summary__row">' +
        '<span class="label">To</span>' +
        '<span class="value">' + (route.destination || '—') + '</span>' +
      '</div>' +
      '<div class="booking-summary__row">' +
        '<span class="label">Departure</span>' +
        '<span class="value">' + (route.departure || '—') + '</span>' +
      '</div>' +
      '<div class="booking-summary__row">' +
        '<span class="label">Duration</span>' +
        '<span class="value">' + (route.duration_hrs || '—') + 'h</span>' +
      '</div>' +
      '<div class="booking-summary__row">' +
        '<span class="label">Class</span>' +
        '<span class="value">' + (state.class || route.class || '—') + '</span>' +
      '</div>' +
      (state.seat ? '<div class="booking-summary__row"><span class="label">Seat</span><span class="value">' + state.seat + '</span></div>' : '') +
      '<div class="booking-summary__row total">' +
        '<span class="label">Total Fare</span>' +
        '<span class="value">' + fmt(fare) + '</span>' +
      '</div>' +
      '<div class="wallet-balance-row">' +
        '<span class="label"><i class="fa-solid fa-wallet"></i> Wallet Balance</span>' +
        '<span class="value">' + fmt(balance) + '</span>' +
      '</div>' +
      (!canPay && Utils.isLoggedIn() ?
        '<div style="background:var(--danger-bg);border:1px solid var(--danger);border-radius:var(--radius-md);padding:10px 12px;font-size:0.8rem;color:var(--danger);margin-top:8px;">' +
          '<i class="fa-solid fa-triangle-exclamation"></i> Insufficient balance — <a href="wallet.html" style="color:var(--danger);font-weight:600;">Top up wallet</a>' +
        '</div>' : '') +
      (!Utils.isLoggedIn() ?
        '<div style="background:var(--warning-bg);border:1px solid var(--warning);border-radius:var(--radius-md);padding:10px 12px;font-size:0.8rem;color:var(--warning);margin-top:8px;">' +
          '<i class="fa-solid fa-lock"></i> <a href="login.html" style="color:var(--warning);font-weight:600;">Log in</a> to pay from wallet' +
        '</div>' : '');
  }

  // 
  // STEP 1 — ROUTE SUMMARY
  // 
  function renderStep1() {
    updateStepIndicator(1);

    formArea.innerHTML =
      '<div class="booking-card">' +
        '<div class="booking-card__title">' +
          '<i class="fa-solid ' + modeInfo.icon + '" style="color:' + modeInfo.accent + ';"></i>' +
          ' Route Summary' +
        '</div>' +

        '<div class="bk-route-summary">' +
          '<div class="bk-route-summary__cities">' +
            '<div class="bk-city">' +
              '<div class="bk-city__label">FROM</div>' +
              '<div class="bk-city__name">' + (route.origin || '—') + '</div>' +
              '<div class="bk-city__time">' + (route.departure || '') + '</div>' +
            '</div>' +
            '<div class="bk-route-summary__arrow">' +
              '<div class="bk-route-summary__line"></div>' +
              '<i class="fa-solid fa-plane" style="color:' + modeInfo.accent + ';font-size:1.2rem;"></i>' +
              '<div class="bk-route-summary__duration">' + (route.duration_hrs || '') + 'h journey</div>' +
            '</div>' +
            '<div class="bk-city">' +
              '<div class="bk-city__label">TO</div>' +
              '<div class="bk-city__name">' + (route.destination || '—') + '</div>' +
              '<div class="bk-city__time">' + (route.arrival || '') + '</div>' +
            '</div>' +
          '</div>' +

          '<div class="bk-provider">' +
            '<div class="bk-provider__icon" style="background:var(--danger-bg);color:' + modeInfo.accent + ';">' +
              '<i class="fa-solid ' + (provider.icon || modeInfo.icon) + '"></i>' +
            '</div>' +
            '<div>' +
              '<div class="bk-provider__name">' + (provider.name || 'Provider') + '</div>' +
              '<div class="bk-provider__meta">' +
                '<span>' + (route.class || '') + '</span>' +
                ' &middot; ' +
                '<span>' + (route.seats_available || 0) + ' seats available</span>' +
              '</div>' +
            '</div>' +
            '<div class="bk-provider__fare">' + fmt(route.fare_ngn || 0) + '</div>' +
          '</div>' +

          // Map preview
          '<div class="bk-map-wrapper">' +
            '<div class="bk-map-label"><i class="fa-solid fa-map-location-dot"></i> Route Map</div>' +
            '<div id="booking-map" style="height:220px; border-radius:var(--radius-md); overflow:hidden; background:var(--bg-secondary);"></div>' +
          '</div>' +
        '</div>' +

        '<div style="display:flex;justify-content:flex-end;margin-top:24px;">' +
          '<button class="btn btn-primary" id="step1-next">' +
            'Continue <i class="fa-solid fa-arrow-right"></i>' +
          '</button>' +
        '</div>' +
      '</div>';

    // Render map
    var mapEl = document.getElementById('booking-map');
    if (mapEl && typeof Maps !== 'undefined') {
      mapEl.innerHTML = '';
      Maps.init('booking-map');
      if (route.origin_coords && route.destination_coords) {
        setTimeout(function() {
          Maps.showRouteByCoords('booking-map', route.origin_coords, route.destination_coords);
        }, 200);
      } else if (route.origin && route.destination) {
        setTimeout(function() {
          Maps.showRoute('booking-map', route.origin, route.destination);
        }, 200);
      }
    }

    document.getElementById('step1-next').addEventListener('click', function() {
      state.step = 2;
      Booking.setState(state);
      renderStep2();
    });
  }

  // 
  // STEP 2 — PASSENGER DETAILS
  // 
  async function renderStep2() {
    updateStepIndicator(2);

    // Pre-fill from logged-in user
    var prefill = { fullName: '', email: '', phone: '' };
    if (Utils.isLoggedIn()) {
      try {
        var user = await Auth.getCurrentUser();
        if (user) {
          prefill.fullName = user.fullName || '';
          prefill.email    = user.email    || '';
        }
      } catch (_) {}
    }
    // Keep already-entered data if going back
    if (state.passenger) {
      prefill.fullName = state.passenger.fullName || prefill.fullName;
      prefill.email    = state.passenger.email    || prefill.email;
      prefill.phone    = state.passenger.phone    || '';
    }

    formArea.innerHTML =
      '<div class="booking-card">' +
        '<div class="booking-card__title">' +
          '<i class="fa-solid fa-user"></i> Passenger Details' +
        '</div>' +

        '<div style="display:flex;flex-direction:column;gap:18px;">' +

          '<div class="form-group">' +
            '<label class="form-label">Full Name <span style="color:var(--danger);">*</span></label>' +
            '<input type="text" id="pax-name" class="form-input" placeholder="e.g. Chidi Okeke" value="' + prefill.fullName + '" autocomplete="name">' +
          '</div>' +

          '<div class="form-group">' +
            '<label class="form-label">Email Address <span style="color:var(--danger);">*</span></label>' +
            '<input type="email" id="pax-email" class="form-input" placeholder="you@example.com" value="' + prefill.email + '" autocomplete="email">' +
          '</div>' +

          '<div class="form-group">' +
            '<label class="form-label">Phone Number <span style="color:var(--danger);">*</span></label>' +
            '<input type="tel" id="pax-phone" class="form-input" placeholder="e.g. 08012345678" value="' + prefill.phone + '" autocomplete="tel">' +
          '</div>' +

        '</div>' +

        '<div style="display:flex;gap:12px;justify-content:space-between;margin-top:28px;">' +
          '<button class="btn btn-secondary" id="step2-back">' +
            '<i class="fa-solid fa-arrow-left"></i> Back' +
          '</button>' +
          '<button class="btn btn-primary" id="step2-next">' +
            'Continue <i class="fa-solid fa-arrow-right"></i>' +
          '</button>' +
        '</div>' +
      '</div>';

    document.getElementById('step2-back').addEventListener('click', function() {
      state.step = 1;
      Booking.setState(state);
      renderStep1();
    });

    document.getElementById('step2-next').addEventListener('click', function() {
      var name  = document.getElementById('pax-name').value.trim();
      var email = document.getElementById('pax-email').value.trim();
      var phone = document.getElementById('pax-phone').value.trim();

      if (!name)  { Utils.showToast('warning', 'Name required',  'Please enter your full name.');     return; }
      if (!email) { Utils.showToast('warning', 'Email required', 'Please enter your email address.'); return; }
      if (!phone) { Utils.showToast('warning', 'Phone required', 'Please enter your phone number.');  return; }

      state.passenger = { fullName: name, email: email, phone: phone };
      state.step      = 3;
      Booking.setState(state);
      renderStep3();
    });
  }

  // 
  // STEP 3 — SEAT / CLASS SELECTION
  // 
  function renderStep3() {
    updateStepIndicator(3);

    var isAirOrSea  = (mode === 'air' || mode === 'sea');
    var currentSeat = state.seat  || '';
    var currentCls  = state.class || route.class || '';

    var seatHTML = '';

    if (isAirOrSea) {
      // Cabin class selector for air and sea
      var classes = mode === 'air'
        ? ['Economy', 'Business']
        : ['Economy', 'Premium'];

      seatHTML =
        '<div class="bk-class-selector">' +
          '<p style="font-size:0.9rem;color:var(--text-secondary);margin-bottom:20px;">Select your cabin class for this journey.</p>' +
          classes.map(function(cls) {
            var isSelected = currentCls === cls || (currentCls === '' && cls === classes[0]);
            return (
              '<div class="bk-class-option ' + (isSelected ? 'selected' : '') + '" data-class="' + cls + '">' +
                '<div class="bk-class-option__icon"><i class="fa-solid ' + (cls === 'Economy' ? 'fa-chair' : 'fa-star') + '"></i></div>' +
                '<div>' +
                  '<div class="bk-class-option__name">' + cls + '</div>' +
                  '<div class="bk-class-option__desc">' +
                    (cls === 'Economy' ? 'Standard seating, comfortable journey' : 'Premium seating, extra legroom') +
                  '</div>' +
                '</div>' +
                (isSelected ? '<i class="fa-solid fa-circle-check" style="color:var(--success);margin-left:auto;"></i>' : '') +
              '</div>'
            );
          }).join('') +
        '</div>';

    } else {
      // Seat grid for land and rail
      var totalSeats = Math.min(route.seats_available || 20, 40);
      var taken      = Math.max(0, 40 - (route.seats_available || 20));

      var seats = '';
      for (var i = 1; i <= 40; i++) {
        var isTaken    = i <= taken;
        var isSelected = String(i) === String(currentSeat);
        seats +=
          '<div class="bk-seat ' +
            (isTaken    ? 'taken'    : '') +
            (isSelected ? ' selected' : '') + '"' +
            (!isTaken ? ' data-seat="' + i + '"' : '') +
            ' title="Seat ' + i + (isTaken ? ' — Taken' : '') + '">' +
            i +
          '</div>';
      }

      seatHTML =
        '<div>' +
          '<p style="font-size:0.9rem;color:var(--text-secondary);margin-bottom:16px;">Select your preferred seat. Grey seats are already taken.</p>' +
          '<div class="bk-seat-legend">' +
            '<span class="bk-seat available"></span> Available' +
            '<span class="bk-seat selected" style="margin-left:16px;"></span> Your selection' +
            '<span class="bk-seat taken"    style="margin-left:16px;"></span> Taken' +
          '</div>' +
          '<div class="bk-seat-grid">' + seats + '</div>' +
        '</div>';
    }

    formArea.innerHTML =
      '<div class="booking-card">' +
        '<div class="booking-card__title">' +
          '<i class="fa-solid fa-chair"></i> ' + (isAirOrSea ? 'Select Class' : 'Select Seat') +
        '</div>' +
        seatHTML +
        '<div style="display:flex;gap:12px;justify-content:space-between;margin-top:28px;">' +
          '<button class="btn btn-secondary" id="step3-back">' +
            '<i class="fa-solid fa-arrow-left"></i> Back' +
          '</button>' +
          '<button class="btn btn-primary" id="step3-next">' +
            'Continue <i class="fa-solid fa-arrow-right"></i>' +
          '</button>' +
        '</div>' +
      '</div>';

    // Wire class selection
    if (isAirOrSea) {
      var classOptions = document.querySelectorAll('.bk-class-option');
      classOptions.forEach(function(opt) {
        opt.addEventListener('click', function() {
          classOptions.forEach(function(o) { o.classList.remove('selected'); });
          opt.classList.add('selected');
          state.class = opt.dataset.class;
        });
      });
      // Default class
      if (!state.class) state.class = classes[0];
    }

    // Wire seat grid
    var seatEls = document.querySelectorAll('.bk-seat[data-seat]');
    seatEls.forEach(function(seat) {
      seat.addEventListener('click', function() {
        seatEls.forEach(function(s) { s.classList.remove('selected'); });
        seat.classList.add('selected');
        state.seat = seat.dataset.seat;
      });
    });

    document.getElementById('step3-back').addEventListener('click', function() {
      state.step = 2;
      Booking.setState(state);
      renderStep2();
    });

    document.getElementById('step3-next').addEventListener('click', function() {
      if (!isAirOrSea && !state.seat) {
        Utils.showToast('warning', 'Select a seat', 'Please choose a seat to continue.');
        return;
      }
      if (isAirOrSea && !state.class) state.class = 'Economy';
      state.step = 4;
      Booking.setState(state);
      renderStep4();
    });
  }

  // 
  // STEP 4 — REVIEW & PAY
  // 
  async function renderStep4() {
    updateStepIndicator(4);

    var fare    = route.fare_ngn || 0;
    var balance = Utils.isLoggedIn() ? await Wallet.getBalance() : 0;
    var canPay  = Utils.isLoggedIn() && balance >= fare;
    var pax     = state.passenger || {};

    formArea.innerHTML =
      '<div class="booking-card">' +
        '<div class="booking-card__title">' +
          '<i class="fa-solid fa-receipt"></i> Review & Pay' +
        '</div>' +

        // Order review table
        '<div class="bk-review-table">' +
          '<div class="bk-review-row"><span>Route</span><strong>' + (route.origin || '') + ' → ' + (route.destination || '') + '</strong></div>' +
          '<div class="bk-review-row"><span>Provider</span><strong>' + (provider.name || '—') + '</strong></div>' +
          '<div class="bk-review-row"><span>Departure</span><strong>' + (route.departure || '—') + '</strong></div>' +
          '<div class="bk-review-row"><span>Passenger</span><strong>' + (pax.fullName || '—') + '</strong></div>' +
          '<div class="bk-review-row"><span>Email</span><strong>' + (pax.email || '—') + '</strong></div>' +
          '<div class="bk-review-row"><span>Phone</span><strong>' + (pax.phone || '—') + '</strong></div>' +
          (state.seat  ? '<div class="bk-review-row"><span>Seat</span><strong>' + state.seat  + '</strong></div>' : '') +
          (state.class ? '<div class="bk-review-row"><span>Class</span><strong>' + state.class + '</strong></div>' : '') +
          '<div class="bk-review-row bk-review-total"><span>Total</span><strong style="color:var(--accent);font-size:1.2rem;">' + fmt(fare) + '</strong></div>' +
        '</div>' +

        // Wallet balance
        '<div class="wallet-balance-row" style="margin-top:20px;">' +
          '<span class="label"><i class="fa-solid fa-wallet"></i> Wallet Balance</span>' +
          '<span class="value">' + fmt(balance) + '</span>' +
        '</div>' +

        // Not logged in warning
        (!Utils.isLoggedIn() ?
          '<div style="background:var(--warning-bg);border:1px solid var(--warning);border-radius:var(--radius-md);padding:12px 14px;font-size:0.85rem;color:var(--warning);margin-top:12px;">' +
            '<i class="fa-solid fa-lock"></i> You need to <a href="login.html" style="color:var(--warning);font-weight:700;">log in</a> to pay from your wallet.' +
          '</div>' : '') +

        // Insufficient balance warning
        (Utils.isLoggedIn() && !canPay ?
          '<div style="background:var(--danger-bg);border:1px solid var(--danger);border-radius:var(--radius-md);padding:12px 14px;font-size:0.85rem;color:var(--danger);margin-top:12px;">' +
            '<i class="fa-solid fa-triangle-exclamation"></i> Insufficient balance. You need ' + fmt(fare - balance) + ' more. ' +
            '<a href="wallet.html" style="color:var(--danger);font-weight:700;">Top up wallet</a>' +
          '</div>' : '') +

        '<div style="display:flex;gap:12px;justify-content:space-between;margin-top:24px;">' +
          '<button class="btn btn-secondary" id="step4-back">' +
            '<i class="fa-solid fa-arrow-left"></i> Back' +
          '</button>' +
          '<button class="btn btn-primary btn-lg" id="pay-btn"' +
            (!canPay ? ' disabled style="opacity:0.5;cursor:not-allowed;"' : '') + '>' +
            '<i class="fa-solid fa-wallet"></i> Pay ' + fmt(fare) + ' from Wallet' +
          '</button>' +
        '</div>' +
      '</div>';

    document.getElementById('step4-back').addEventListener('click', function() {
      state.step = 3;
      Booking.setState(state);
      renderStep3();
    });

    var payBtn = document.getElementById('pay-btn');
    if (payBtn && canPay) {
      payBtn.addEventListener('click', async function() {
        payBtn.disabled    = true;
        payBtn.innerHTML   = '<span class="spinner" style="width:18px;height:18px;border-width:2px;"></span> Processing...';

        try {
          var description = (route.origin || '') + ' → ' + (route.destination || '') + ' · ' + (provider.name || '');
          await Wallet.debit(fare, description);

          // Generate booking reference
          var ref = Booking.generateRef();
          state.ref  = ref;
          state.paid = true;
          state.date = new Date().toISOString();

          // Save booking to user's history
          await Wallet.saveBooking({
            id:          Utils.generateUUID(),
            ref:         ref,
            route:       route,
            provider:    provider,
            mode:        mode,
            passenger:   state.passenger,
            seat:        state.seat  || null,
            class:       state.class || route.class,
            fare:        fare,
            date:        state.date,
          });

          Booking.setState(state);

          Utils.showToast('success', 'Payment successful!', 'Redirecting to your receipt...', 2000);
          setTimeout(function() {
            window.location.href = 'confirm.html';
          }, 1800);

        } catch (err) {
          payBtn.disabled  = false;
          payBtn.innerHTML = '<i class="fa-solid fa-wallet"></i> Pay ' + fmt(fare) + ' from Wallet';
          Utils.showToast('error', 'Payment failed', err.message || 'Please try again.');
        }
      });
    }

    // Update summary with current state
    renderSummary();
  }

  // 
  // INIT
  // 
  await renderSummary();

  // Render the correct step
  if (step === 1) renderStep1();
  else if (step === 2) renderStep2();
  else if (step === 3) renderStep3();
  else if (step === 4) renderStep4();
  else renderStep1();

});