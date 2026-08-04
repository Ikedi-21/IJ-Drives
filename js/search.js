/* 
   IJDrives — search.js
   Client-side route filtering and sorting.

   filterRoutes(routes, filters) — pure function, no side effects.
   Called by transport.js every time a filter control changes.

   Supported filter fields:
   ─────────────────────────
   origin       {string}  partial match on route.origin (case-insensitive)
   destination  {string}  partial match on route.destination
   maxFare      {number}  include routes where fare_ngn <= maxFare
   sortBy       {string}  'price_asc' | 'price_desc' | 'duration_asc' | 'duration_desc'
   classFilter  {string}  exact match on route.class (e.g. 'Economy', 'Business')
    */

const Search = (() => {

  /**
   * Filter and sort an array of route objects.
   *
   * @param {Array}  routes   - raw route array from JSON
   * @param {Object} filters  - filter criteria (all optional)
   * @returns {Array} filtered + sorted copy (original untouched)
   */
  function filterRoutes(routes, filters) {
    filters = filters || {};

    var origin      = (filters.origin      || '').trim().toLowerCase();
    var destination = (filters.destination || '').trim().toLowerCase();
    var sortBy      = filters.sortBy       || '';
    var classFilter = (filters.classFilter || '').trim().toLowerCase();

    // maxFare: use Infinity if not set so no fare is excluded by default
    var maxFare = (typeof filters.maxFare === 'number' && !isNaN(filters.maxFare))
      ? filters.maxFare
      : Infinity;

    var results = routes.slice(); // shallow copy — never mutate the original

    // ── Filter ──
    if (origin) {
      results = results.filter(function(r) {
        return r.origin && r.origin.toLowerCase().indexOf(origin) !== -1;
      });
    }

    if (destination) {
      results = results.filter(function(r) {
        return r.destination && r.destination.toLowerCase().indexOf(destination) !== -1;
      });
    }

    if (isFinite(maxFare)) {
      results = results.filter(function(r) {
        return (r.fare_ngn || 0) <= maxFare;
      });
    }

    if (classFilter) {
      results = results.filter(function(r) {
        return r.class && r.class.toLowerCase() === classFilter;
      });
    }

    // ── Sort ──
    if (sortBy === 'price_asc') {
      results.sort(function(a, b) { return (a.fare_ngn || 0) - (b.fare_ngn || 0); });
    } else if (sortBy === 'price_desc') {
      results.sort(function(a, b) { return (b.fare_ngn || 0) - (a.fare_ngn || 0); });
    } else if (sortBy === 'duration_asc') {
      results.sort(function(a, b) { return (a.duration_hrs || 0) - (b.duration_hrs || 0); });
    } else if (sortBy === 'duration_desc') {
      results.sort(function(a, b) { return (b.duration_hrs || 0) - (a.duration_hrs || 0); });
    }

    return results;
  }

  return { filterRoutes: filterRoutes };

})();
