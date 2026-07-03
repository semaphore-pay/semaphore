/**
 * Pluggable key/value storage interface.
 *
 * Used by semaphore-pay to persist access-tokens, rate-limiter state, or
 * other transient data. Implement this for your backend (Redis, SQLite,
 * in-memory Map, Cloudflare KV, etc.).
 */
export interface SemaphorePayStorage {
  /** Retrieve a stored value by key. Returns `null` if the key does not exist. */
  get: (key: string) => Promise<string | null>;
  /**
   * Store a value under a key.
   * @param ttlSeconds - Optional time-to-live in seconds. The
   *   implementation should evict the key after this duration.
   */
  set: (key: string, value: string, ttlSeconds?: number) => Promise<void>;
  /** Delete a key from storage. */
  delete: (key: string) => Promise<void>;
}
