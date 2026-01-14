/**
 * Simple TTL-based cache
 */

import type { CacheEntry } from "../types.js";

export class Cache<T = unknown> {
  private store: Map<string, CacheEntry<T>> = new Map();
  private defaultTTL: number;

  constructor(defaultTTLSeconds: number = 3600) {
    this.defaultTTL = defaultTTLSeconds * 1000; // Convert to ms
  }

  /**
   * Get a cached value
   * @returns The cached value or null if not found/expired
   */
  get(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }

    return entry.value;
  }

  /**
   * Set a cached value
   * @param key Cache key
   * @param value Value to cache
   * @param ttlSeconds Optional TTL in seconds (uses default if not specified)
   */
  set(key: string, value: T, ttlSeconds?: number): void {
    const ttl = ttlSeconds !== undefined ? ttlSeconds * 1000 : this.defaultTTL;

    // TTL of 0 means don't cache
    if (ttl === 0) return;

    this.store.set(key, {
      value,
      expiresAt: Date.now() + ttl,
    });
  }

  /**
   * Check if a key exists and is not expired
   */
  has(key: string): boolean {
    return this.get(key) !== null;
  }

  /**
   * Delete a cached value
   */
  delete(key: string): boolean {
    return this.store.delete(key);
  }

  /**
   * Clear all cached values
   */
  clear(): void {
    this.store.clear();
  }

  /**
   * Remove expired entries
   */
  prune(): number {
    const now = Date.now();
    let pruned = 0;

    for (const [key, entry] of this.store.entries()) {
      if (now > entry.expiresAt) {
        this.store.delete(key);
        pruned++;
      }
    }

    return pruned;
  }

  /**
   * Get cache statistics
   */
  stats(): { size: number; defaultTTL: number } {
    return {
      size: this.store.size,
      defaultTTL: this.defaultTTL / 1000,
    };
  }
}

// Singleton cache instance for KB operations
export const kbCache = new Cache(3600); // 1 hour default
