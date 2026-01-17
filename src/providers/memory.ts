import type { CacheProvider } from '../core/types'

/**
 * In-memory cache provider implementation
 */
export class MemoryProvider implements CacheProvider {
  private cache = new Map<string, { value: any; expires?: number }>()

  async get<T>(key: string): Promise<T | null> {
    const item = this.cache.get(key)
    if (!item) return null

    if (item.expires && Date.now() > item.expires) {
      this.cache.delete(key)
      return null
    }

    return item.value
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    const expires = ttl ? Date.now() + ttl * 1000 : undefined
    this.cache.set(key, { value, expires })
  }

  async del(key: string): Promise<void> {
    this.cache.delete(key)
  }

  async invalidate(pattern: string): Promise<void> {
    // Simple pattern matching for now
    const regex = new RegExp(pattern.replace('*', '.*'))
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key)
      }
    }
  }

  async clear(): Promise<void> {
    this.cache.clear()
  }
}
