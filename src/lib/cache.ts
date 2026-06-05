// cache.ts — Service de cache avec invalidation Realtime (adapté TypeScript pour Next.js)
//
// NOTE: Le listener `window.addEventListener('supabase_realtime')` doit être
// appelé dans un composant client (useEffect) côté client uniquement.
// Ajoutez 'use client' en haut du composant qui utilise ce listener.

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

class CacheService {
  private cache: Map<string, CacheEntry<unknown>>;
  private defaultTTL: number;

  constructor() {
    this.cache = new Map();
    this.defaultTTL = 300000; // 5 min pour les produits (changent rarement)
  }

  async get<T>(key: string, fetchFn: () => Promise<T>, ttl: number = this.defaultTTL): Promise<T> {
    const cached = this.cache.get(key) as CacheEntry<T> | undefined;
    if (cached && Date.now() - cached.timestamp < ttl) {
      return cached.data;
    }
    const data = await fetchFn();
    this.cache.set(key, { data, timestamp: Date.now() });
    return data;
  }

  invalidate(keyPattern: string): void {
    for (const key of this.cache.keys()) {
      if (key.includes(keyPattern)) {
        this.cache.delete(key);
      }
    }
  }

  clear(): void {
    this.cache.clear();
  }
}

export const cache = new CacheService();

// ─── Listener Realtime ──────────────────────────────────────────────
// IMPORTANT: Ce code doit être exécuté dans un composant client React.
// Exemple d'utilisation dans un layout ou un provider :
//
//   'use client';
//   import { useEffect } from 'react';
//   import { cache } from '@/lib/cache';
//
//   export function RealtimeCacheProvider({ children }) {
//     useEffect(() => {
//       const handler = (e: Event) => {
//         const { table } = (e as CustomEvent).detail || {};
//         if (table) cache.invalidate(table);
//       };
//       window.addEventListener('supabase_realtime', handler);
//       return () => window.removeEventListener('supabase_realtime', handler);
//     }, []);
//     return children;
//   }
// ─────────────────────────────────────────────────────────────────────
