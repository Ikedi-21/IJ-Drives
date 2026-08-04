/* 
   IJDrives — booking.js
    */

var Booking = (function() {

  var STATE_KEY = 'ij_booking';

  function setState(data) {
    sessionStorage.setItem(STATE_KEY, JSON.stringify(data));
  }

  function getState() {
    var raw = sessionStorage.getItem(STATE_KEY);
    if (!raw) return null;
    try { return JSON.parse(raw); } catch (_) { return null; }
  }

  function clearState() {
    sessionStorage.removeItem(STATE_KEY);
  }

  function selectRoute(route, provider, mode) {
    setState({
      route:     route,
      provider:  provider || {},
      mode:      mode,
      step:      1,
      passenger: null,
      seat:      null,
      class:     null,
    });
    window.location.href = 'booking.html';
  }

  /* Generates a unique booking reference e.g. IJ-A3F2C1D0 */
  function generateRef() {
    var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    var ref   = 'IJ-';
    for (var i = 0; i < 8; i++) {
      ref += chars[Math.floor(Math.random() * chars.length)];
    }
    return ref;
  }

  return {
    selectRoute:  selectRoute,
    setState:     setState,
    getState:     getState,
    clearState:   clearState,
    generateRef:  generateRef,
  };

}());