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
    land:      () => fetchJSON('data/land.json'),
    sea:       () => fetchJSON('data/sea.json'),
    air:       () => fetchJSON('data/air.json'),
    rail:      () => fetchJSON('data/rail.json'),
    providers: () => fetchJSON('data/providers.json'),
  };

  async function getProviderById(id) {
    const providers = await load.providers();
    return providers.find(p => p.id === id) || null;
  }

  return { load, getProviderById };
})();
