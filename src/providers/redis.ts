import {
  createClient,
  type RedisClientType,
} from "redis";
import type { CacheProvider } from "../core/types.js";

/**
 * Redis cache provider implementation
 */
export class RedisProvider implements CacheProvider {
  private client: RedisClientType;
  private connecting: Promise<RedisClientType> | null =
    null;

  constructor(options?: {
    client?: RedisClientType;
    url?: string;
  }) {
    this.client =
      options?.client ||
      createClient(
        options?.url
          ? { url: options.url }
          : undefined,
      );
  }

  private async ensureConnected(): Promise<RedisClientType> {
    if (this.client.isOpen) {
      return this.client;
    }

    if (!this.connecting) {
      this.connecting = this.client
        .connect()
        .then(() => this.client)
        .catch((error: unknown) => {
          this.connecting = null;
          throw error;
        });
    }

    return await this.connecting;
  }

  async get<T>(
    key: string,
  ): Promise<T | null> {
    const client =
      await this.ensureConnected();
    const raw = await client.get(key);
    if (raw === null) {
      return null;
    }

    return JSON.parse(raw) as T;
  }

  async set<T>(
    key: string,
    value: T,
    ttl?: number,
  ): Promise<void> {
    const client =
      await this.ensureConnected();
    const payload =
      JSON.stringify(value);
    if (ttl) {
      await client.set(key, payload, {
        EX: ttl,
      });
      return;
    }
    await client.set(key, payload);
  }

  async del(
    key: string,
  ): Promise<void> {
    const client =
      await this.ensureConnected();
    await client.del(key);
  }

  async invalidate(
    pattern: string,
  ): Promise<void> {
    const client =
      await this.ensureConnected();
    const batch: string[] = [];
    for await (const key of client.scanIterator(
      {
        MATCH: pattern,
      },
    )) {
      batch.push(key as string);
      if (batch.length >= 500) {
        await client.del(batch);
        batch.length = 0;
      }
    }

    if (batch.length > 0) {
      await client.del(batch);
    }
  }

  async clear(): Promise<void> {
    const client =
      await this.ensureConnected();
    await client.flushDb();
  }
}
