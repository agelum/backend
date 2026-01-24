/**
 * Define reactive functions with explicit dependencies
 * Core building block that works both standalone and with tRPC
 */

import { z } from "zod";
import type {
  CacheProvider,
  ReactiveDb,
  ReactiveFunctionContext,
  TransactionConfig,
  TransactionReplicationMode,
} from "./types.js";

/**
 * Options passed to tRPC handler
 */
export interface TrpcHandlerOptions<
  TInput,
> {
  input: TInput;
}

export interface ReactiveFunctionConfig<
  TInput = unknown,
  TOutput = unknown,
> {
  /** Function name (used for cache keys and tRPC procedure names) */
  name: string;

  /** Input validation schema */
  input: z.ZodType<TInput>;

  /** Tables this function depends on (for cache invalidation) */
  dependencies: string[];

  /** Optional: Specific invalidation conditions */
  invalidateWhen?: Record<
    string,
    (
      change: InvalidationChange,
    ) => boolean
  >;

  /** Optional: Enable cache for this function */
  cacheEnabled?: boolean;

  /** Cache configuration */
  cache?: {
    enabled?: boolean;
    ttl?: number;
    key?: (input: TInput) => string;
  };

  /**
   * Optional: Transaction configuration (Option 1 - declarative)
   * When enabled, the handler will be automatically wrapped in a database transaction
   */
  transaction?: TransactionConfig;

  /** The actual function logic - receives context with input and db */
  handler: (
    ctx: ReactiveFunctionContext<TInput>,
  ) => Promise<TOutput>;
}

export interface InvalidationChange {
  table: string;
  operation:
    | "INSERT"
    | "UPDATE"
    | "DELETE";
  keys: string[];
  timestamp: number;
}

export interface ReactiveFunction<
  TInput = unknown,
  TOutput = unknown,
> {
  /** Function configuration */
  config: ReactiveFunctionConfig<
    TInput,
    TOutput
  >;

  /** Execute the function standalone (server-side) */
  execute: (
    input: TInput,
    db: ReactiveDb,
  ) => Promise<TOutput>;

  /** Get cache key for input */
  getCacheKey: (
    input: TInput,
  ) => string;

  /** Check if function should be invalidated by a change */
  shouldInvalidate: (
    change: InvalidationChange,
  ) => boolean;

  /** Get function metadata for tRPC integration */
  getMetadata: () => ReactiveFunctionMetadata;

  /** Get tRPC-compatible handler (for tRPC router integration) */
  getTrpcHandler: (
    db: ReactiveDb,
  ) => (
    opts: TrpcHandlerOptions<TInput>,
  ) => Promise<TOutput>;
}

export interface ReactiveFunctionMetadata {
  name: string;
  dependencies: string[];
  cacheEnabled: boolean;
  cacheTtl: number;
  hasInvalidationRules: boolean;
  /** Whether this function runs in a transaction */
  transactionEnabled: boolean;
  /** Replication mode for transactions */
  transactionReplicationMode?: TransactionReplicationMode;
}

/**
 * Define a reactive function - the core building block
 */
export function defineReactiveFunction<
  TInput,
  TOutput,
>(
  config: ReactiveFunctionConfig<
    TInput,
    TOutput
  >,
): ReactiveFunction<TInput, TOutput> {
  // Validate configuration
  if (!config.name) {
    throw new Error(
      "ReactiveFunction requires name",
    );
  }

  if (!config.input) {
    throw new Error(
      "ReactiveFunction requires input schema",
    );
  }

  if (
    !config.dependencies ||
    config.dependencies.length === 0
  ) {
    throw new Error(
      "ReactiveFunction requires dependencies array",
    );
  }

  if (!config.handler) {
    throw new Error(
      "ReactiveFunction requires handler function",
    );
  }

  const cacheEnabled =
    config.cacheEnabled ??
    config.cache?.enabled ??
    false;

  // Default cache configuration
  const cacheConfig = {
    ttl: 300, // 5 minutes default
    key: (input: TInput) =>
      `${config.name}:${JSON.stringify(input)}`,
    ...config.cache,
    enabled: cacheEnabled,
  };

  /**
   * Execute the function (standalone server-side execution)
   */
  const execute = async (
    input: TInput,
    db: ReactiveDb,
  ): Promise<TOutput> => {
    // Validate input
    const validatedInput =
      config.input.parse(input);

    // Generate cache key
    const cacheKey = getCacheKey(
      validatedInput,
    );

    console.log(
      `[ReactiveFunction] Executing function with cache key: ${cacheKey}`,
    );

    try {
      // Check cache if enabled
      if (cacheConfig.enabled) {
        const cached =
          await getCachedResult<TOutput>(
            db,
            cacheKey,
          );
        if (
          cached &&
          !isCacheStale(
            cached,
            cacheConfig.ttl,
          )
        ) {
          console.log(
            `[ReactiveFunction] Cache hit for ${cacheKey}`,
          );
          return cached.data;
        }
      }

      // Execute function handler - with optional transaction wrapping (Option 1)
      let result: TOutput;

      if (config.transaction?.enabled) {
        // Wrap handler in a transaction
        console.log(
          `[ReactiveFunction] Executing ${config.name} in transaction (replicationMode: ${config.transaction.replicationMode ?? "default"})`,
        );
        result = await db.transaction(
          {
            replicationMode:
              config.transaction
                .replicationMode,
          },
          async () => {
            return await config.handler({
              input: validatedInput,
              db,
            });
          },
        );
      } else {
        // Execute without transaction wrapper
        result = await config.handler({
          input: validatedInput,
          db,
        });
      }

      // Cache result if enabled
      if (cacheConfig.enabled) {
        await cacheResult(
          db,
          cacheKey,
          result,
          cacheConfig.ttl,
          {
            dependencies:
              config.dependencies,
            timestamp: Date.now(),
          },
        );
      }

      return result;
    } catch (error) {
      console.error(
        `[ReactiveFunction] Execution error for ${cacheKey}:`,
        error,
      );
      throw error;
    }
  };

  /**
   * Get cache key for input
   */
  const getCacheKey = (
    input: TInput,
  ): string => {
    return cacheConfig.key(input);
  };

  /**
   * Check if function should be invalidated by a change
   */
  const shouldInvalidate = (
    change: InvalidationChange,
  ): boolean => {
    // Check if the changed table is in our dependencies
    if (
      !config.dependencies.includes(
        change.table,
      )
    ) {
      return false;
    }

    // Check custom invalidation rules
    if (
      config.invalidateWhen &&
      config.invalidateWhen[
        change.table
      ]
    ) {
      try {
        return config.invalidateWhen[
          change.table
        ](change);
      } catch (error) {
        console.warn(
          "[ReactiveFunction] Invalidation rule error:",
          error,
        );
        // Default to invalidate on error for safety
        return true;
      }
    }

    // Default: invalidate if table is in dependencies
    return true;
  };

  /**
   * Get function metadata for tRPC integration
   */
  const getMetadata =
    (): ReactiveFunctionMetadata => {
      return {
        name: config.name,
        dependencies:
          config.dependencies,
        cacheEnabled:
          cacheConfig.enabled,
        cacheTtl: cacheConfig.ttl,
        hasInvalidationRules:
          !!config.invalidateWhen,
        transactionEnabled:
          config.transaction?.enabled ??
          false,
        transactionReplicationMode:
          config.transaction
            ?.replicationMode,
      };
    };

  /**
   * Get tRPC-compatible handler that wraps the reactive function
   */
  const getTrpcHandler = (
    db: ReactiveDb,
  ) => {
    return async (
      opts: TrpcHandlerOptions<TInput>,
    ): Promise<TOutput> => {
      // Simply delegate to the execute method with the reactive database
      return execute(opts.input, db);
    };
  };

  return {
    config,
    execute,
    getCacheKey,
    shouldInvalidate,
    getMetadata,
    getTrpcHandler,
  };
}

/**
 * Registry for managing reactive functions
 */
export class ReactiveFunctionRegistry {
  private functions = new Map<
    string,
    ReactiveFunction<unknown, unknown>
  >();

  /**
   * Register a reactive function
   */
  register<TInput, TOutput>(
    name: string,
    fn: ReactiveFunction<
      TInput,
      TOutput
    >,
  ): void {
    this.functions.set(
      name,
      fn as ReactiveFunction<
        unknown,
        unknown
      >,
    );
    console.log(
      `[ReactiveRegistry] Registered function: ${name}`,
    );
  }

  /**
   * Execute a registered function
   */
  async execute<T>(
    name: string,
    input: unknown,
    db: ReactiveDb,
  ): Promise<T> {
    const fn = this.functions.get(name);
    if (!fn) {
      throw new Error(
        `ReactiveFunction '${name}' not found`,
      );
    }

    return fn.execute(
      input,
      db,
    ) as Promise<T>;
  }

  /**
   * Get function by name
   */
  get(
    name: string,
  ):
    | ReactiveFunction<unknown, unknown>
    | undefined {
    return this.functions.get(name);
  }

  /**
   * Get all registered function names
   */
  getFunctionNames(): string[] {
    return Array.from(
      this.functions.keys(),
    );
  }

  /**
   * Get registry statistics
   */
  getStats(): {
    totalFunctions: number;
    functionsByDependency: Record<
      string,
      string[]
    >;
  } {
    const functionsByDependency: Record<
      string,
      string[]
    > = {};

    for (const [name, fn] of this
      .functions) {
      const metadata = fn.getMetadata();
      for (const dep of metadata.dependencies) {
        if (
          !functionsByDependency[dep]
        ) {
          functionsByDependency[dep] =
            [];
        }
        functionsByDependency[dep].push(
          name,
        );
      }
    }

    return {
      totalFunctions:
        this.functions.size,
      functionsByDependency,
    };
  }

  /**
   * Clear all functions
   */
  clear(): void {
    this.functions.clear();
    console.log(
      "[ReactiveRegistry] Cleared all functions",
    );
  }
}

// Global registry instance
let globalRegistry: ReactiveFunctionRegistry | null =
  null;

/**
 * Get or create global reactive function registry
 */
export function getReactiveFunctionRegistry(): ReactiveFunctionRegistry {
  if (!globalRegistry) {
    globalRegistry =
      new ReactiveFunctionRegistry();
  }
  return globalRegistry;
}

/**
 * Helper to register a reactive function globally
 */
export function registerReactiveFunction<
  TInput,
  TOutput,
>(
  name: string,
  config: ReactiveFunctionConfig<
    TInput,
    TOutput
  >,
): ReactiveFunction<TInput, TOutput> {
  const fn =
    defineReactiveFunction(config);
  const registry =
    getReactiveFunctionRegistry();
  registry.register(name, fn);
  return fn;
}

// Helper functions for caching (simplified for now)

/**
 * Cached result structure
 */
interface CachedResult<T = unknown> {
  data: T;
  timestamp: number;
  metadata: CacheMetadata;
}

/**
 * Get cached result from database
 */
async function getCachedResult<T>(
  db: ReactiveDb,
  cacheKey: string,
): Promise<CachedResult<T> | null> {
  try {
    const cache = db.getCache();
    const cached =
      await cache.get<CachedResult<T>>(
        cacheKey,
      );
    if (!cached) {
      return null;
    }
    return cached;
  } catch (error) {
    console.warn(
      `[ReactiveFunction] Cache get error:`,
      error,
    );
    return null;
  }
}

/**
 * Check if cached result is stale
 */
function isCacheStale(
  cached: { timestamp: number },
  ttl: number,
): boolean {
  const age =
    Date.now() - cached.timestamp;
  return age > ttl * 1000; // Convert TTL to milliseconds
}

/**
 * Cache metadata structure
 */
interface CacheMetadata {
  dependencies: string[];
  timestamp: number;
}

/**
 * Cache function result
 */
async function cacheResult<T>(
  db: ReactiveDb,
  cacheKey: string,
  data: T,
  ttl: number,
  metadata: CacheMetadata,
): Promise<void> {
  try {
    console.log(
      `[ReactiveFunction] Caching result for ${cacheKey} with TTL ${ttl}s`,
    );

    const cacheEntry = {
      data,
      timestamp: Date.now(),
      metadata,
    };

    const cache = db.getCache();
    await cache.set(
      cacheKey,
      cacheEntry,
      ttl,
    );
    await updateDependencyIndex(
      cache,
      metadata.dependencies,
      cacheKey,
    );
  } catch (error) {
    console.warn(
      `[ReactiveFunction] Cache set error:`,
      error,
    );
  }
}

const functionDependencyIndexKey = (
  dependency: string,
): string =>
  `@agelum/backend:function-dependency:${dependency}`;

async function updateDependencyIndex(
  cache: CacheProvider,
  dependencies: string[],
  cacheKey: string,
): Promise<void> {
  await Promise.all(
    dependencies.map(
      async (dependency) => {
        const indexKey =
          functionDependencyIndexKey(
            dependency,
          );
        const existing =
          (await cache.get<string[]>(
            indexKey,
          )) || [];
        if (
          existing.includes(cacheKey)
        ) {
          return;
        }
        const next = [
          ...existing,
          cacheKey,
        ];
        await cache.set(indexKey, next);
      },
    ),
  );
}
