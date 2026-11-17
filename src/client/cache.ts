export interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

export class MemoryCache {
  private readonly store = new Map<string, CacheEntry<unknown>>();
  private readonly defaultTtlMs: number;
  private readonly maxEntries: number;

  constructor(defaultTtlSeconds = 3600, maxEntries = 500) {
    this.defaultTtlMs = Math.max(0, defaultTtlSeconds) * 1000;
    this.maxEntries = Math.max(1, Math.floor(maxEntries));
  }

  get<T>(key: string): T | undefined {
    if (this.defaultTtlMs === 0) {
      return undefined;
    }

    const entry = this.store.get(key);
    if (!entry) {
      return undefined;
    }

    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }

    return entry.value as T;
  }

  set<T>(key: string, value: T, ttlSeconds?: number): void {
    const ttlMs =
      ttlSeconds !== undefined
        ? Math.max(0, ttlSeconds) * 1000
        : this.defaultTtlMs;

    if (ttlMs === 0) {
      return;
    }

    // Reinsertar mantiene el orden de recencia: la entrada pasa al final.
    this.store.delete(key);
    this.store.set(key, {
      value,
      expiresAt: Date.now() + ttlMs,
    });

    while (this.store.size > this.maxEntries) {
      const oldestKey = this.store.keys().next().value;
      if (oldestKey === undefined) {
        break;
      }
      this.store.delete(oldestKey);
    }
  }

  clear(): void {
    this.store.clear();
  }

  size(): number {
    return this.store.size;
  }
}
