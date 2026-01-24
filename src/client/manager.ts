/**
 * Client-side reactive manager
 * Coordinates storage, session recovery, and real-time synchronization
 */

import { ReactiveStorage, createReactiveStorage } from './storage.js'
import {
  SimpleSessionManager,
  createSimpleSessionManager,
  revalidateOnPageLoad,
} from './session.js'
import {
  SmartRevalidationEngine,
  createSmartRevalidationEngine,
  type RevalidationOptions,
} from './revalidation.js'
import { SSEClient, type SSEClientOptions } from './sse-client.js'
import type { ReactiveConfig, InvalidationEvent } from '../core/types.js'

export interface ReactiveManagerOptions {
  organizationId: string
  config: ReactiveConfig
  onInvalidation?: (event: InvalidationEvent) => void
  onRevalidate?: (queryKey: string) => Promise<any>
  sseOptions?: Partial<SSEClientOptions>
}

export class ReactiveClientManager {
  private storage: ReactiveStorage
  private sessionManager: SimpleSessionManager
  private revalidationEngine: SmartRevalidationEngine
  private sseClient: SSEClient | null = null
  private config: ReactiveConfig
  private organizationId: string
  private onInvalidation?: (event: InvalidationEvent) => void
  private onRevalidate?: (queryKey: string) => Promise<any>

  // Event listeners
  private visibilityListener?: () => void
  private beforeUnloadListener?: () => void

  constructor(options: ReactiveManagerOptions) {
    this.organizationId = options.organizationId
    this.config = options.config
    this.onInvalidation = options.onInvalidation
    this.onRevalidate = options.onRevalidate

    // Initialize storage, session management, and smart revalidation
    this.storage = createReactiveStorage(this.organizationId)
    this.sessionManager = createSimpleSessionManager(this.organizationId)
    this.revalidationEngine = createSmartRevalidationEngine(
      this.storage,
      this.config
    )

    // Set up event listeners
    this.setupEventListeners()

    // Initialize SSE connection if real-time is enabled
    if (this.config.realtime?.enabled !== false) {
      this.initializeSSEConnection(options.sseOptions)
    }

    // Initial session gap check (simple revalidation on page load)
    this.checkInitialSession()
  }

  /**
   * Get organization ID
   */
  get currentOrganizationId(): string {
    return this.organizationId
  }

  /**
   * Register a query execution
   */
  registerQuery(
    queryKey: string,
    dependencies: string[],
    data?: any,
    ttl?: number
  ): void {
    this.storage.registerQuery(queryKey, dependencies, data, ttl)
  }

  /**
   * Register an active React hook
   */
  registerActiveHook(queryKey: string, dependencies: string[]): () => void {
    this.storage.registerActiveHook(queryKey, dependencies, this.organizationId)

    // Return cleanup function
    return () => {
      this.storage.unregisterActiveHook(queryKey)
    }
  }

  /**
   * Get cached data for a query
   */
  getCachedData(queryKey: string) {
    return this.storage.getCachedData(queryKey)
  }

  /**
   * Handle invalidation event from server
   */
  private handleInvalidation(event: InvalidationEvent): void {
    console.log(
      `[ReactiveClient] Handling invalidation for table: ${event.table}`
    )

    // Notify external handler if provided
    if (this.onInvalidation) {
      this.onInvalidation(event)
    }

    // Mark affected queries as invalidated in session manager
    const affectedQueries = this.findAffectedQueries(event.table)
    affectedQueries.forEach((queryKey) => {
      this.sessionManager.markQueryInvalidated(queryKey)
    })

    // Trigger revalidation for affected queries
    if (this.onRevalidate) {
      affectedQueries.forEach((queryKey) => {
        this.revalidateQuery(queryKey)
      })
    }
  }

  /**
   * Find queries affected by table changes
   */
  private findAffectedQueries(table: string): string[] {
    const registry = this.storage.getRegistry()
    if (!registry) return []

    const relatedTables = this.config.relations[table] || []
    const tablesToCheck = [table, ...relatedTables]

    return Object.keys(registry.queries).filter((queryKey) => {
      // Simple heuristic: check if query key contains table name
      return tablesToCheck.some((tableName) =>
        queryKey.toLowerCase().includes(tableName.toLowerCase())
      )
    })
  }

  /**
   * Handle connection status changes
   */
  private handleConnectionStatus(connected: boolean): void {
    console.log(`[ReactiveClient] Real-time connection: ${connected}`)

    // Update session manager with connection status
    const registry = this.storage.getRegistry()
    if (registry) {
      registry.session.realtimeConnected = connected
      this.storage['saveRegistry'](registry)
    }
  }

  /**
   * Revalidate a specific query
   */
  async revalidateQuery(queryKey: string): Promise<any> {
    if (this.onRevalidate) {
      try {
        const result = await this.onRevalidate(queryKey)

        // Update cache with fresh data
        if (result !== undefined) {
          this.storage.registerQuery(queryKey, [], result)
        }

        return result
      } catch (error) {
        console.error(
          `[ReactiveClient] Revalidation failed for ${queryKey}:`,
          error
        )
        // Do not overwrite cache on error; keep existing data intact
        throw error
      }
    }

    return undefined
  }

  /**
   * Initialize SSE connection for real-time updates
   */
  private initializeSSEConnection(
    sseOptions?: Partial<SSEClientOptions>
  ): void {
    console.log('[ReactiveClient] Initializing SSE connection')

    // Build SSE URL with organization ID
    const sseUrl = `/api/events?organizationId=${this.organizationId}`

    this.sseClient = new SSEClient({
      url: sseUrl,
      onInvalidation: (event: InvalidationEvent) =>
        this.handleInvalidation(event),
      onError: (error: Error) => {
        console.error('[ReactiveClient] SSE error:', error)
      },
      ...sseOptions,
    })

    // Connect immediately
    this.sseClient.connect()
  }

  /**
   * Get SSE connection statistics
   */
  getSSEStats() {
    return this.sseClient?.getStats() || null
  }

  /**
   * Manually reconnect SSE
   */
  reconnectSSE(): void {
    if (this.sseClient) {
      console.log('[ReactiveClient] Manual SSE reconnection')
      this.sseClient.disconnect()
      setTimeout(() => {
        this.sseClient?.connect()
      }, 1000)
    }
  }

  /**
   * Set up browser event listeners
   */
  private setupEventListeners(): void {
    // Page visibility change (user switches tabs)
    this.visibilityListener = () => {
      if (document.visibilityState === 'visible') {
        this.handleVisibilityChange()
      }
    }
    document.addEventListener('visibilitychange', this.visibilityListener)

    // Before page unload (save state)
    this.beforeUnloadListener = () => {
      // Update last sync time before unload
      const registry = this.storage.getRegistry()
      if (registry) {
        registry.session.lastSync = Date.now()
        this.storage['saveRegistry'](registry)
      }
    }
    window.addEventListener('beforeunload', this.beforeUnloadListener)
  }

  /**
   * Remove event listeners
   */
  private removeEventListeners(): void {
    if (this.visibilityListener) {
      document.removeEventListener('visibilitychange', this.visibilityListener)
    }
    if (this.beforeUnloadListener) {
      window.removeEventListener('beforeunload', this.beforeUnloadListener)
    }
  }

  /**
   * Check for session gap on initial load (simple approach as per spec)
   */
  private async checkInitialSession(): Promise<void> {
    const activeHookQueries = this.storage
      .getActiveHooks()
      .map((hook) => hook.queryKey)

    await revalidateOnPageLoad(
      this.sessionManager,
      activeHookQueries,
      this.revalidateQuery.bind(this)
    )
  }

  /**
   * Handle page visibility change
   */
  private async handleVisibilityChange(): Promise<void> {
    if (document.visibilityState === 'visible') {
      // Check for stale data when page becomes visible
      await this.checkInitialSession()
    }
  }

  /**
   * Get current connection status
   */
  getConnectionStatus(): 'connected' | 'connecting' | 'disconnected' {
    if (!this.sseClient) return 'disconnected'
    const state = this.sseClient.getConnectionState()
    return state === 'open'
      ? 'connected'
      : state === 'connecting'
      ? 'connecting'
      : 'disconnected'
  }

  /**
   * Check if real-time is enabled and connected
   */
  isRealtimeEnabled(): boolean {
    return (
      this.config.realtime?.enabled !== false &&
      this.sseClient?.isConnected() === true
    )
  }

  /**
   * Get storage statistics
   */
  getStorageStats() {
    return this.storage.exportRegistry()
  }

  /**
   * Get session statistics
   */
  getSessionStats() {
    return this.sessionManager.getSessionStats()
  }

  /**
   * Get revalidation statistics
   */
  getRevalidationStats() {
    return this.revalidationEngine.getRevalidationStats()
  }

  /**
   * Mark a query as stale for testing purposes
   */
  markQueryStaleForTesting(queryKey: string): void {
    this.storage.markQueryStaleForTesting(queryKey)
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    // Remove event listeners
    this.removeEventListeners()

    // Disconnect SSE
    if (this.sseClient) {
      this.sseClient.disconnect()
      this.sseClient = null
    }

    // Clear storage
    this.storage.clearRegistry()
  }
}

/**
 * Create reactive client manager
 */
export function createReactiveClientManager(
  options: ReactiveManagerOptions
): ReactiveClientManager {
  return new ReactiveClientManager(options)
}
