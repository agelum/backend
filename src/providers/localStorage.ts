import type { CacheProvider } from "../core/types.js";

/**
 * LocalStorage cache provider implementation
 */
export class LocalStorageProvider implements CacheProvider {
  private prefix = "@agelum/backend:";

  async get<T>(
    key: string,
  ): Promise<T | null> {
    try {
      const item = localStorage.getItem(
        this.prefix + key,
      );
      if (!item) return null;

      const parsed = JSON.parse(item);
      if (
        parsed.expires &&
        Date.now() > parsed.expires
      ) {
        localStorage.removeItem(
          this.prefix + key,
        );
        return null;
      }

      return parsed.value;
    } catch {
      return null;
    }
  }

  async set<T>(
    key: string,
    value: T,
    ttl?: number,
  ): Promise<void> {
    try {
      const expires = ttl
        ? Date.now() + ttl * 1000
        : undefined;
      const item = JSON.stringify({
        value,
        expires,
      });
      localStorage.setItem(
        this.prefix + key,
        item,
      );
    } catch {
      // Handle localStorage quota exceeded
    }
  }

  async del(
    key: string,
  ): Promise<void> {
    localStorage.removeItem(
      this.prefix + key,
    );
  }

  async invalidate(
    pattern: string,
  ): Promise<void> {
    const regex = new RegExp(
      pattern.replace("*", ".*"),
    );
    const keysToDelete: string[] = [];

    for (
      let i = 0;
      i < localStorage.length;
      i++
    ) {
      const key = localStorage.key(i);
      if (
        key?.startsWith(this.prefix)
      ) {
        const unprefixedKey = key.slice(
          this.prefix.length,
        );
        if (regex.test(unprefixedKey)) {
          keysToDelete.push(key);
        }
      }
    }

    keysToDelete.forEach((key) =>
      localStorage.removeItem(key),
    );
  }

  async clear(): Promise<void> {
    const keysToDelete: string[] = [];

    for (
      let i = 0;
      i < localStorage.length;
      i++
    ) {
      const key = localStorage.key(i);
      if (
        key?.startsWith(this.prefix)
      ) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach((key) =>
      localStorage.removeItem(key),
    );
  }
}
