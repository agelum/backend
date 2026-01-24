import type {
  ReactiveConfig,
  ReactiveDb,
  DrizzleDatabase,
  CacheProvider,
  InvalidationCallback,
  SqlAnalysis,
  QueryMetadata,
} from './types.js'
import { analyzeSql } from './analyzer.js'
import { MemoryProvider } from '../providers/memory.js'
import { RedisProvider } from '../providers/redis.js'
import { broadcastInvalidation } from './sse.js'

/**
 * Reactive SQL driver that intercepts all Drizzle operations
 */
class ReactiveSqlDriver<TDrizzle extends DrizzleDatabase> {
  private cache: CacheProvider
  private subscribers = new Map<string, Set<InvalidationCallback>>()
  private queryMetadata = new Map<string, QueryMetadata>()

  constructor(private originalDb: TDrizzle, private config: ReactiveConfig) {
    // Initialize cache provider based on config
    this.cache = this.initializeCacheProvider()

    // Wrap the original database methods
    this.wrapDrizzleMethods()
  }

  private initializeCacheProvider(): CacheProvider {
    const provider = this.config.cache?.server?.provider || 'memory'

    switch (provider) {
      case 'redis':
        return new RedisProvider()
      case 'memory':
      default:
        return new MemoryProvider()
    }
  }

  private wrapDrizzleMethods() {
    // Intercept the execute method which is the core SQL execution point
    if (this.originalDb.execute) {
      const originalExecute = this.originalDb.execute.bind(this.originalDb) as (query: unknown, params?: unknown[]) => Promise<unknown>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(this.originalDb as any).execute = async (query: unknown, params?: unknown[]) => {
        return this.interceptQuery(query, params, () => originalExecute(query, params))
      }
    }

    // Intercept select/insert/update/delete methods
    const methods = ['select', 'insert', 'update', 'delete'] as const
    methods.forEach((method) => {
      const dbMethod = this.originalDb[method]
      if (dbMethod) {
        const originalMethod = (dbMethod as (...args: unknown[]) => unknown).bind(this.originalDb)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(this.originalDb as any)[method] = (...args: unknown[]) => {
          const queryBuilder = originalMethod(...args)
          return this.wrapQueryBuilder(queryBuilder, method.toUpperCase())
        }
      }
    })
  }

  private wrapQueryBuilder(queryBuilder: any, operation: string) {
    // Wrap query execution methods
    if (queryBuilder.execute) {
      const originalExecute = queryBuilder.execute.bind(queryBuilder)
      queryBuilder.execute = async () => {
        const sql = queryBuilder.toSQL?.() || { sql: 'unknown', params: [] }
        return this.interceptQuery(sql, sql.params, originalExecute)
      }
    }

    // Wrap other execution methods like .all(), .get(), etc.
    const execMethods = ['all', 'get', 'run', 'values']
    execMethods.forEach((method) => {
      if (queryBuilder[method]) {
        const originalMethod = queryBuilder[method].bind(queryBuilder)
        queryBuilder[method] = async () => {
          const sql = queryBuilder.toSQL?.() || { sql: 'unknown', params: [] }
          return this.interceptQuery(sql, sql.params, originalMethod)
        }
      }
    })

    return queryBuilder
  }

  private async interceptQuery(
    query: any,
    params: any[] = [],
    originalExecute: () => Promise<any>
  ): Promise<any> {
    // Extract SQL string from query object or use directly
    const sqlString = typeof query === 'string' ? query : query.sql || 'unknown'
    const queryParams = params || query.params || []

    // Analyze the SQL to understand what it does
    const analysis = analyzeSql(sqlString, queryParams)
    const cacheKey = this.generateCacheKey(analysis, queryParams)

    // Handle SELECT queries with caching
    if (analysis.operation === 'SELECT') {
      return this.handleSelectQuery(analysis, cacheKey, originalExecute)
    }

    // Handle mutations (INSERT/UPDATE/DELETE) with invalidation
    return this.handleMutationQuery(analysis, originalExecute)
  }

  private generateCacheKey(analysis: SqlAnalysis, params: any[]): string {
    // Create a deterministic cache key from the query
    const keyParts = [
      analysis.table,
      analysis.operation,
      JSON.stringify(analysis.whereKeys.sort()),
      JSON.stringify(params),
    ]
    return keyParts.join(':')
  }

  private async handleSelectQuery(
    analysis: SqlAnalysis,
    cacheKey: string,
    originalExecute: () => Promise<any>
  ): Promise<any> {
    // Try to get from cache first
    const cached = await this.cache.get(cacheKey)
    if (cached) {
      console.log(`[ReactiveDB] Cache hit for ${analysis.table}`)
      return cached
    }

    // Execute the original query
    console.log(`[ReactiveDB] Cache miss, executing query on ${analysis.table}`)
    const result = await originalExecute()

    // Cache the result
    const ttl = this.getTtlForTable(analysis.table)
    await this.cache.set(cacheKey, result, ttl)

    // Store query metadata for invalidation
    this.queryMetadata.set(cacheKey, {
      key: cacheKey,
      dependencies: [analysis.table],
      lastExecuted: Date.now(),
      ttl,
      organizationId: analysis.organizationId,
    })

    return result
  }

  private async handleMutationQuery(
    analysis: SqlAnalysis,
    originalExecute: () => Promise<any>
  ): Promise<any> {
    console.log(
      `🔥 [ReactiveDB] MUTATION DETECTED: ${analysis.operation} on ${analysis.table} - This WILL trigger SSE broadcast`
    )

    // Execute the mutation
    const result = await originalExecute()

    // Invalidate related queries
    await this.invalidateRelatedQueries(analysis)

    // Broadcast invalidation events
    await this.broadcastInvalidation(analysis)

    return result
  }

  private async invalidateRelatedQueries(analysis: SqlAnalysis): Promise<void> {
    const { table } = analysis
    const relatedTables = this.config.relations[table] || []

    // Find all queries that depend on this table or related tables
    const tablesToInvalidate = [table, ...relatedTables]
    const keysToInvalidate: string[] = []

    for (const [cacheKey, metadata] of this.queryMetadata.entries()) {
      const shouldInvalidate = metadata.dependencies.some((dep) =>
        tablesToInvalidate.includes(dep)
      )

      if (shouldInvalidate) {
        keysToInvalidate.push(cacheKey)
      }
    }

    // Invalidate cache entries
    console.log(
      `[ReactiveDB] Invalidating ${keysToInvalidate.length} cached queries for ${table}`
    )
    await Promise.all(keysToInvalidate.map((key) => this.cache.del(key)))

    // Remove metadata for invalidated queries
    keysToInvalidate.forEach((key) => this.queryMetadata.delete(key))
  }

  private async broadcastInvalidation(analysis: SqlAnalysis): Promise<void> {
    const { table, organizationId } = analysis

    if (!organizationId) return

    const subscribers = this.subscribers.get(organizationId)
    if (!subscribers) return

    // Create invalidation event
    const event = {
      type: 'invalidation' as const,
      table,
      organizationId,
      affectedQueries: Array.from(this.queryMetadata.keys()).filter((key) => {
        const metadata = this.queryMetadata.get(key)
        return metadata?.dependencies.includes(table)
      }),
      eventId: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      requiresAck: true,
      timestamp: Date.now(),
    }

    // Notify all subscribers
    subscribers.forEach((callback) => {
      try {
        callback(event)
      } catch (error) {
        console.error('[ReactiveDB] Error in invalidation callback:', error)
      }
    })

    // Broadcast to SSE subscribers for real-time updates
    try {
      await broadcastInvalidation(organizationId, {
        type: 'invalidation',
        table,
        organizationId,
        affectedQueries: event.affectedQueries,
        timestamp: Date.now(),
        operation: analysis.operation,
        affectedKeys: analysis.whereKeys,
      })
      console.log(
        `[ReactiveDriver] SSE broadcast sent for org: ${organizationId}, table: ${table}`
      )
    } catch (error) {
      console.warn('[ReactiveDriver] SSE broadcast failed:', error)
      // Continue execution - local invalidation still works
    }
  }

  private getTtlForTable(table: string): number {
    // Smart TTL based on table type
    switch (table) {
      case 'agent':
      case 'organization':
        return 300 // 5 minutes for relatively stable data
      case 'message':
        return 60 // 1 minute for frequently changing data
      case 'memory':
        return 180 // 3 minutes for memory data
      default:
        return 120 // 2 minutes default
    }
  }

  // Public methods for the ReactiveDb interface
  async query<T>(sql: string, params?: any[]): Promise<T> {
    return this.interceptQuery(sql, params, async () => {
      return await this.originalDb.execute(sql, params)
    })
  }

  getCache(): CacheProvider {
    return this.cache
  }

  subscribe(
    organizationId: string,
    callback: InvalidationCallback
  ): () => void {
    if (!this.subscribers.has(organizationId)) {
      this.subscribers.set(organizationId, new Set())
    }

    this.subscribers.get(organizationId)!.add(callback)

    // Return unsubscribe function
    return () => {
      const orgSubscribers = this.subscribers.get(organizationId)
      if (orgSubscribers) {
        orgSubscribers.delete(callback)
        if (orgSubscribers.size === 0) {
          this.subscribers.delete(organizationId)
        }
      }
    }
  }

  getOriginalDb(): TDrizzle {
    return this.originalDb
  }
}

/**
 * Create a reactive database instance
 * This is the main entry point for the library
 */
export function createReactiveDb<TDrizzle extends DrizzleDatabase>(
  drizzleDb: TDrizzle,
  config: ReactiveConfig
): ReactiveDb<TDrizzle> {
  console.log('[ReactiveDB] Initializing reactive database with config:', {
    relations: Object.keys(config.relations),
    cacheProvider: config.cache?.server?.provider || 'memory',
    realtimeEnabled: config.realtime?.enabled ?? true,
  })

  const driver = new ReactiveSqlDriver(drizzleDb, config)

  return {
    db: driver.getOriginalDb(),
    config,
    query: driver.query.bind(driver),
    getCache: driver.getCache.bind(driver),
    subscribe: driver.subscribe.bind(driver),
  }
}
