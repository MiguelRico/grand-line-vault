interface CacheEntry<T> {
  expiresAt: number;
  value: T;
}

export interface CacheService<T> {
  get(key: string): T | null;
  set(key: string, value: T): void;
  remove(key: string): void;
}

export class ExpiringLocalCache<T> implements CacheService<T> {
  constructor(
    private readonly namespace: string,
    private readonly ttlMs: number,
  ) {}

  get(key: string): T | null {
    try {
      const raw = localStorage.getItem(`${this.namespace}:${key}`);
      if (!raw) return null;
      const entry = JSON.parse(raw) as CacheEntry<T>;
      if (!entry.expiresAt || entry.expiresAt <= Date.now()) {
        this.remove(key);
        return null;
      }
      return entry.value;
    } catch {
      return null;
    }
  }

  set(key: string, value: T): void {
    try {
      localStorage.setItem(
        `${this.namespace}:${key}`,
        JSON.stringify({ expiresAt: Date.now() + this.ttlMs, value } satisfies CacheEntry<T>),
      );
    } catch {
      // La caché es una optimización: cuotas o privacidad no deben bloquear el detalle.
    }
  }

  remove(key: string): void {
    try {
      localStorage.removeItem(`${this.namespace}:${key}`);
    } catch {
      // Sin efecto funcional.
    }
  }
}

