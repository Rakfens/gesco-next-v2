// @ts-nocheck
// cache.js — FIX #3 : invalidation propre par Realtime, sans console.log
class CacheService {
  constructor() {
    this.cache = new Map();
    this.defaultTTL = 300000; // 5 min pour les produits (changent rarement)
  }

  async get(key, fetchFn, ttl = this.defaultTTL) {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < ttl) {
      return cached.data;
    }
    const data = await fetchFn();
    this.cache.set(key, { data, timestamp: Date.now() });
    return data;
  }

  invalidate(keyPattern) {
    for (const key of this.cache.keys()) {
      if (key.includes(keyPattern)) {
        this.cache.delete(key);
      }
    }
  }

  clear() {
    this.cache.clear();
  }
}

export const cache = new CacheService();

// FIX #3 : écouter le Realtime et invalider le cache immédiatement
// → quand un autre appareil modifie des ventes/achats, le cache local se vide
window.addEventListener('getSupabase()_realtime', (e) => {
  const { table } = e.detail || {};
  if (table) {
    cache.invalidate(table); // ex: invalide toutes les clés contenant "ventes"
  }
});
