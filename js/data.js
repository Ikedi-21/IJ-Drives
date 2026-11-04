/* 
   IJDrives — data.js
   JSON fetch helpers for routes and providers
    */

const Data = (() => {
  const cache = {};

  async function fetchJSON(path) {
    if (cache[path]) return cache[path];
    const res = await fetch(path);
    if (!res.ok) throw new Error(`Failed to load ${path}`);
    const data = await res.json();
    cache[path] = data;
    return data;
  }

  const load = {
    land:      () => (typeof API !== 'undefined' ? API.transport.getRoutes({ mode: 'land' }).catch(() => fetchJSON('data/land.json')) : fetchJSON('data/land.json')),
    sea:       () => (typeof API !== 'undefined' ? API.transport.getRoutes({ mode: 'sea' }).catch(() => fetchJSON('data/sea.json')) : fetchJSON('data/sea.json')),
    air:       () => (typeof API !== 'undefined' ? API.transport.getRoutes({ mode: 'air' }).catch(() => fetchJSON('data/air.json')) : fetchJSON('data/air.json')),
    rail:      () => (typeof API !== 'undefined' ? API.transport.getRoutes({ mode: 'rail' }).catch(() => fetchJSON('data/rail.json')) : fetchJSON('data/rail.json')),
    providers: () => (typeof API !== 'undefined' ? API.transport.getProviders().catch(() => fetchJSON('data/providers.json')) : fetchJSON('data/providers.json')),
  };

  async function getProviderById(id) {
    if (typeof API !== 'undefined') {
      try {
        return await API.transport.getProvider(id);
      } catch (_) {}
    }
    const providers = await load.providers();
    return providers.find(p => p.id === id) || null;
  }

  return { load, getProviderById };
})();
