// High-performance in-memory cache for ultra-fast page reloads (<20ms)
export interface CacheEntry {
  timestamp: number;
  stats: any;
  uniqueColumnValues: any;
  transporterOptions: any;
  statusOptions: any;
  total: number;
}

let globalCache: CacheEntry | null = null;

export function getDeliveryCache(): CacheEntry | null {
  if (globalCache && Date.now() - globalCache.timestamp < 60000) {
    return globalCache;
  }
  return null;
}

export function setDeliveryCache(entry: Omit<CacheEntry, 'timestamp'>) {
  globalCache = {
    ...entry,
    timestamp: Date.now(),
  };
}

export function invalidateDeliveryCache() {
  globalCache = null;
}
