/**
 * Simple session gap detection as described in the spec
 *
 * Just tracks basic session info in QueryRegistry and
 * does smart revalidation on page load
 */

export interface SessionInfo {
  startTime: number
  lastSync: number
  realtimeConnected: boolean
}

export interface QueryRegistryEntry {
  lastRevalidated: number
  lastServerChange?: number
  data?: any
}

export interface QueryRegistry {
  organizationId: string
  queries: Record<string, QueryRegistryEntry>
  session: SessionInfo
}

/**
 * Simple session gap detection (as per spec)
 */
export class SimpleSessionManager {
  private organizationId: string
  private storage: Storage

  constructor(organizationId: string, storage: Storage = localStorage) {
    this.organizationId = organizationId
    this.storage = storage
  }

  /**
   * Get current query registry from localStorage
   */
  getQueryRegistry(): QueryRegistry {
    try {
      const stored = this.storage.getItem(
        `reactive_registry_${this.organizationId}`
      )
      if (stored) {
        return JSON.parse(stored)
      }
    } catch (error) {
      console.warn('[SimpleSession] Failed to parse stored registry:', error)
    }

    // Return default registry
    return {
      organizationId: this.organizationId,
      queries: {},
      session: {
        startTime: Date.now(),
        lastSync: Date.now(),
        realtimeConnected: false,
      },
    }
  }

  /**
   * Save query registry to localStorage
   */
  saveQueryRegistry(registry: QueryRegistry): void {
    try {
      this.storage.setItem(
        `reactive_registry_${this.organizationId}`,
        JSON.stringify(registry)
      )
    } catch (error) {
      console.warn('[SimpleSession] Failed to save registry:', error)
    }
  }

  /**
   * Update session sync time
   */
  updateLastSync(): void {
    const registry = this.getQueryRegistry()
    registry.session.lastSync = Date.now()
    this.saveQueryRegistry(registry)
  }

  /**
   * Set realtime connection status
   */
  setRealtimeConnected(connected: boolean): void {
    const registry = this.getQueryRegistry()
    registry.session.realtimeConnected = connected
    this.saveQueryRegistry(registry)
  }

  /**
   * Check if we should revalidate on page load (simple gap detection)
   */
  shouldRevalidateOnLoad(): {
    shouldRevalidate: boolean
    reason: string
    staleCacheAge: number
  } {
    const registry = this.getQueryRegistry()
    const now = Date.now()
    const timeSinceLastSync = now - registry.session.lastSync

    // Simple heuristic: if it's been more than 5 minutes since last sync,
    // or if realtime was disconnected, we should revalidate
    const shouldRevalidate =
      timeSinceLastSync > 5 * 60 * 1000 || // 5 minutes
      !registry.session.realtimeConnected

    let reason = ''
    if (timeSinceLastSync > 5 * 60 * 1000) {
      reason = `Stale cache (${Math.round(
        timeSinceLastSync / 1000 / 60
      )}m since last sync)`
    } else if (!registry.session.realtimeConnected) {
      reason = 'Realtime was disconnected'
    } else {
      reason = 'Cache is fresh'
    }

    return {
      shouldRevalidate,
      reason,
      staleCacheAge: timeSinceLastSync,
    }
  }

  /**
   * Get stale queries that need revalidation
   */
  getStaleQueries(maxAge: number = 5 * 60 * 1000): string[] {
    const registry = this.getQueryRegistry()
    const now = Date.now()
    const staleQueries: string[] = []

    for (const [queryKey, entry] of Object.entries(registry.queries)) {
      const age = now - entry.lastRevalidated
      if (age > maxAge) {
        staleQueries.push(queryKey)
      }
    }

    return staleQueries
  }

  /**
   * Record query execution
   */
  recordQuery(queryKey: string, data?: any): void {
    const registry = this.getQueryRegistry()

    registry.queries[queryKey] = {
      lastRevalidated: Date.now(),
      lastServerChange: Date.now(),
      data,
    }

    this.saveQueryRegistry(registry)
  }

  /**
   * Mark query as invalidated (from server event)
   */
  markQueryInvalidated(queryKey: string): void {
    const registry = this.getQueryRegistry()

    if (registry.queries[queryKey]) {
      registry.queries[queryKey].lastServerChange = Date.now()
      this.saveQueryRegistry(registry)
    }
  }

  /**
   * Get basic session stats
   */
  getSessionStats(): {
    sessionAge: number
    timeSinceLastSync: number
    realtimeConnected: boolean
    totalQueries: number
    staleQueries: number
  } {
    const registry = this.getQueryRegistry()
    const now = Date.now()
    const staleQueries = this.getStaleQueries()

    return {
      sessionAge: now - registry.session.startTime,
      timeSinceLastSync: now - registry.session.lastSync,
      realtimeConnected: registry.session.realtimeConnected,
      totalQueries: Object.keys(registry.queries).length,
      staleQueries: staleQueries.length,
    }
  }
}

/**
 * Smart revalidation on page load (as per spec)
 */
export async function revalidateOnPageLoad(
  sessionManager: SimpleSessionManager,
  activeHookQueries: string[],
  revalidateQuery: (queryKey: string) => Promise<any>
): Promise<void> {
  console.log('[SimpleSession] Checking for session gap on page load')

  const gapCheck = sessionManager.shouldRevalidateOnLoad()
  console.log(`[SimpleSession] Gap check: ${gapCheck.reason}`)

  if (!gapCheck.shouldRevalidate) {
    console.log('[SimpleSession] Cache is fresh, no revalidation needed')
    return
  }

  // 1. Active hooks first (what user sees) - immediate
  console.log(
    `[SimpleSession] Revalidating ${activeHookQueries.length} active queries`
  )
  await Promise.all(
    activeHookQueries.map((queryKey) => revalidateQuery(queryKey))
  )

  // 2. Background revalidation after delay - non-blocking
  setTimeout(async () => {
    const staleQueries = sessionManager.getStaleQueries()
    const backgroundQueries = staleQueries.filter(
      (q) => !activeHookQueries.includes(q)
    )

    if (backgroundQueries.length > 0) {
      console.log(
        `[SimpleSession] Background revalidating ${backgroundQueries.length} stale queries`
      )
      await Promise.allSettled(
        backgroundQueries.map((queryKey) => revalidateQuery(queryKey))
      )
    }
  }, 2000)

  // Update last sync time
  sessionManager.updateLastSync()
}

/**
 * Create simple session manager
 */
export function createSimpleSessionManager(
  organizationId: string,
  storage?: Storage
): SimpleSessionManager {
  return new SimpleSessionManager(organizationId, storage)
}
