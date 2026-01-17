import type { z } from 'zod'

/**
 * Core reactive database configuration
 */
export interface ReactiveConfig {
  /** Table relationships for automatic invalidation */
  relations: Record<string, string[]>

  /** Cache configuration (optional - smart defaults used) */
  cache?: {
    server?: { provider?: 'redis' | 'memory' }
    client?: { provider?: 'localStorage' | 'sessionStorage' }
  }

  /** Real-time configuration (optional - SSE enabled by default) */
  realtime?: {
    enabled?: boolean
    transport?: 'sse' // Server-Sent Events for real-time cache invalidation
    fallback?: 'polling' // Graceful degradation when SSE fails
    reliability?: {
      acknowledgments?: boolean // Event ack system for reliable delivery
      maxRetries?: number // Retry attempts for unacknowledged events
      retryDelays?: number[] // Exponential backoff delays
      periodicHeartbeat?: false // No wasteful heartbeats needed
    }
  }
}

/**
 * Reactive database instance
 */
export interface ReactiveDb {
  /** Original Drizzle database instance */
  db: any
  /** Configuration */
  config: ReactiveConfig
  /** Execute query with reactive features */
  query: <T>(sql: string, params?: any[]) => Promise<T>
  /** Get cache provider */
  getCache: () => CacheProvider
  /** Subscribe to invalidation events */
  subscribe: (
    organizationId: string,
    callback: InvalidationCallback
  ) => () => void
}

/**
 * Cache provider interface
 */
export interface CacheProvider {
  get<T>(key: string): Promise<T | null>
  set<T>(key: string, value: T, ttl?: number): Promise<void>
  del(key: string): Promise<void>
  invalidate(pattern: string): Promise<void>
  clear(): Promise<void>
}

/**
 * SQL analysis result
 */
export interface SqlAnalysis {
  /** Table name */
  table: string
  /** Operation type */
  operation: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE'
  /** WHERE condition keys */
  whereKeys: string[]
  /** Affected columns */
  columns: string[]
  /** Organization ID if detected */
  organizationId?: string
}

/**
 * Query metadata for caching
 */
export interface QueryMetadata {
  /** Unique query key */
  key: string
  /** Tables this query depends on */
  dependencies: string[]
  /** Last execution timestamp */
  lastExecuted: number
  /** Cache TTL in seconds */
  ttl?: number
  /** Organization scope */
  organizationId?: string
}

/**
 * Invalidation event
 */
export interface InvalidationEvent {
  /** Event type */
  type: 'invalidation'
  /** Affected table */
  table: string
  /** Organization ID */
  organizationId: string
  /** Affected query keys */
  affectedQueries: string[]
  /** Event ID for acknowledgment */
  eventId: string
  /** Whether this event requires acknowledgment */
  requiresAck: boolean
  /** Timestamp */
  timestamp: number
  /** SQL operation type (INSERT, UPDATE, DELETE) */
  operation?: string
  /** Affected keys from WHERE clause */
  affectedKeys?: string[]
}

/**
 * Invalidation callback
 */
export type InvalidationCallback = (event: InvalidationEvent) => void

/**
 * Client-side query registry
 */
export interface QueryRegistry {
  /** Organization ID */
  organizationId: string
  /** Cached queries */
  queries: {
    [queryKey: string]: {
      lastRevalidated: number
      lastServerChange?: number
      data?: any
    }
  }
  /** Session information */
  session: {
    startTime: number
    lastSync: number
    realtimeConnected: boolean
  }
}

/**
 * Reactive function definition
 */
export interface ReactiveFunctionDefinition<TInput = any, TOutput = any> {
  /** Unique function ID */
  id: string
  /** Input validation schema */
  input: z.ZodSchema<TInput>
  /** Tables this function reads from */
  dependencies: string[]
  /** Optional fine-grained invalidation rules */
  invalidateWhen?: Record<string, (change: TableChange) => boolean>
  /** Function handler */
  handler: (params: { input: TInput; db: any }) => Promise<TOutput>
}

/**
 * Table change information
 */
export interface TableChange {
  /** Table name */
  table: string
  /** Operation type */
  operation: 'INSERT' | 'UPDATE' | 'DELETE'
  /** Affected keys/IDs */
  keys: string[]
  /** Organization ID */
  organizationId?: string
}

/**
 * Hook state
 */
export interface HookState {
  /** Query key */
  queryKey: string
  /** Is currently active */
  isActive: boolean
  /** Last access time */
  lastAccess: number
  /** Dependencies */
  dependencies: string[]
  /** Organization scope */
  organizationId?: string
}
