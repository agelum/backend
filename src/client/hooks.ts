/**
 * React hooks for @drizzle/reactive
 * Provides reactive data access with automatic caching and real-time updates
 */

import { useEffect, useState, useCallback, useRef } from 'react'
import { ReactiveClientManager, createReactiveClientManager } from './manager'
import type { ReactiveConfig, InvalidationEvent } from '../core/types'

// Global client manager instance
let globalClientManager: ReactiveClientManager | null = null

/**
 * Get or create the global client manager
 */
function getClientManager(): ReactiveClientManager {
  if (!globalClientManager) {
    throw new Error(
      'Reactive client not initialized. Call initializeReactiveClient first.'
    )
  }
  return globalClientManager
}

/**
 * Initialize the reactive client
 * Call this once at app startup
 */
export function initializeReactiveClient(
  organizationId: string,
  config: ReactiveConfig,
  revalidateFn: (queryKey: string) => Promise<any>
): void {
  console.log('🚀 Initializing reactive client for org:', organizationId)

  if (globalClientManager) {
    console.log('⚠️ Client already initialized, cleaning up previous instance')
    globalClientManager.cleanup()
  }

  globalClientManager = createReactiveClientManager({
    organizationId,
    config,
    onRevalidate: revalidateFn,
    onInvalidation: (event: InvalidationEvent) => {
      console.log(
        `[ReactiveClient] Received invalidation for table: ${event.table}`
      )
    },
  })

  // Expose client manager to window for testing purposes
  if (typeof window !== 'undefined') {
    ;(window as any).__reactiveClientManager = globalClientManager
    console.log(
      '🔧 [ReactiveClient] Client manager exposed to window for testing'
    )
  }

  console.log(
    '✅ Reactive client initialized successfully for org:',
    organizationId
  )
}

/**
 * Main hook for reactive data access
 * Automatically handles caching, real-time updates, and revalidation
 */
export function useReactive<T = any>(
  queryKey: string,
  input?: any,
  options?: {
    enabled?: boolean
  }
): {
  data: T | undefined
  isLoading: boolean
  isStale: boolean
  error: Error | null
  refetch: () => void
} {
  const [data, setData] = useState<T | undefined>(undefined)
  const [isLoading, setIsLoading] = useState(true)
  const [isStale, setIsStale] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const clientManager = getClientManager()
  const isInitialMount = useRef(true)

  // Handle enabled option
  const enabled = options?.enabled !== false

  // Compose an effective cache key that includes serialized input
  const inputKey =
    typeof input === 'undefined' ? '' : `::${JSON.stringify(input)}`
  const effectiveKey = `${queryKey}${inputKey}`

  // Register this hook as active
  useEffect(() => {
    if (!enabled) {
      return
    }

    const cleanup = clientManager.registerActiveHook(effectiveKey, [])
    return cleanup
  }, [effectiveKey, clientManager, enabled])

  // Load data on mount and when queryKey changes
  useEffect(() => {
    if (!enabled) {
      setIsLoading(false)
      return
    }

    const loadData = async () => {
      try {
        setIsLoading(true)
        setError(null)

        // Check ReactiveStorage cache first (immediate display)
        const cached = clientManager.getCachedData(effectiveKey)
        // Reduced logging - only log cache misses
        if (!cached) {
          console.log(`🔍 [useReactive] Cache miss for ${queryKey}`)
        }

        if (cached) {
          try {
            const now = Date.now()
            const cacheAge = now - cached.lastRevalidated
            const minRevalidationTime = 5 * 60 * 1000 // 5 minutes minimum between revalidations

            // Reduced logging - only log when cache is stale
            if (cached.isStale) {
              console.log(`📊 [useReactive] Cache is stale for ${queryKey}`)
            }

            // Show cached data immediately
            setData(cached.data)
            setIsStale(cached.isStale || false)

            // Only revalidate if cache is old enough (avoid excessive revalidation)
            if (cacheAge > minRevalidationTime) {
              console.log(
                `🔄 [useReactive] Revalidating stale cache for ${queryKey}`
              )

              // Trigger revalidation in background
              clientManager
                .revalidateQuery(effectiveKey)
                .then((result) => {
                  if (result !== undefined) {
                    setData(result)
                    setIsStale(false)

                    // Update ReactiveStorage with fresh data
                    clientManager.registerQuery(effectiveKey, [], result)
                    // Reduced logging - only log significant updates
                  }
                })
                .catch((error) => {
                  console.warn(
                    `[useReactive] Background revalidation failed:`,
                    error
                  )
                  // Keep showing cached data even if revalidation fails
                })
            } else {
              // Reduced logging - only log when cache is stale
            }

            setIsLoading(false)
            isInitialMount.current = false
            return
          } catch (parseError) {
            console.warn('⚠️ Failed to parse cached data:', parseError)
            // Continue with revalidation if cache is corrupted
          }
        }

        // No cache or corrupted cache - trigger immediate fetch
        console.log(`[useReactive] No cache for ${queryKey}, fetching...`)

        const result = await clientManager.revalidateQuery(effectiveKey)
        if (result !== undefined) {
          setData(result)
          setIsStale(false)

          // Store in ReactiveStorage for future use
          clientManager.registerQuery(effectiveKey, [], result)
          // Reduced logging - only log significant updates
        }

        setIsLoading(false)
        isInitialMount.current = false
      } catch (err) {
        // On error, don't register cache; surface error and keep prior cache visible
        setError(err as Error)
        setIsLoading(false)
        isInitialMount.current = false
      }
    }

    loadData()
  }, [effectiveKey, clientManager])

  const refetch = useCallback(async () => {
    if (!enabled) {
      return
    }

    try {
      setIsLoading(true)
      setError(null)

      // Reduced logging - only log when there are issues

      // Trigger manual revalidation
      await clientManager.revalidateQuery(effectiveKey)

      // Update stale state
      setIsStale(false)
      setIsLoading(false)
    } catch (err) {
      setError(err as Error)
      setIsLoading(false)
    }
  }, [effectiveKey, clientManager, enabled])

  return {
    data,
    isLoading,
    isStale,
    error,
    refetch,
  }
}

/**
 * Optional page-level priority hints for better UX
 */
export function useReactivePriorities(priorities: string[]): void {
  useEffect(() => {
    // Reduced logging - only log when there are issues
    // In a full implementation, this would:
    // 1. Pre-warm cache for these queries
    // 2. Subscribe to their invalidation events
    // 3. Set higher revalidation priority

    return () => {
      // Reduced logging - only log when there are issues
    }
  }, [priorities.join(',')])
}

/**
 * Hook to get current session statistics
 */
export function useReactiveStats() {
  const [stats, setStats] = useState<any>(null)
  const clientManager = getClientManager()

  useEffect(() => {
    const updateStats = () => {
      setStats(clientManager.getSessionStats())
    }

    // Update stats immediately
    updateStats()

    // Update stats every 5 seconds
    const interval = setInterval(updateStats, 5000)

    return () => clearInterval(interval)
  }, [clientManager])

  return stats
}

/**
 * Hook to manually trigger cache refresh
 */
export function useReactiveRefresh() {
  const clientManager = getClientManager()

  return useCallback(async () => {
    // Trigger revalidation for all active queries
    const activeHooks = clientManager.getStorageStats()?.queries || {}
    const activeQueryKeys = Object.keys(activeHooks)

    console.log(
      `[useReactiveRefresh] Refreshing ${activeQueryKeys.length} active queries`
    )

    // Revalidate all active queries
    await Promise.allSettled(
      activeQueryKeys.map((queryKey) => clientManager.revalidateQuery(queryKey))
    )
  }, [clientManager])
}

/**
 * Hook to get revalidation statistics and performance metrics
 */
export function useRevalidationStats() {
  const [stats, setStats] = useState<any>(null)
  const clientManager = getClientManager()

  useEffect(() => {
    const updateStats = () => {
      const revalidationStats = clientManager.getRevalidationStats()
      setStats(revalidationStats)
    }

    updateStats()
    const interval = setInterval(updateStats, 2000)

    return () => clearInterval(interval)
  }, [clientManager])

  return stats
}

/**
 * Hook to handle invalidation events
 */
export function useReactiveInvalidation(
  callback: (event: InvalidationEvent) => void
): void {
  const clientManager = getClientManager()

  useEffect(() => {
    // In a full implementation, this would subscribe to invalidation events
    console.log('[useReactiveInvalidation] Setting up invalidation listener')

    return () => {
      console.log('[useReactiveInvalidation] Cleaning up invalidation listener')
    }
  }, [callback, clientManager])
}

/**
 * Hook for manual queries with dynamic parameters
 * Unlike useReactive, this hook doesn't auto-fetch and allows changing parameters on each call
 */
export function useReactiveQuery<TData = unknown, TVariables = unknown>(
  queryKey: string
): {
  data: TData | undefined
  isLoading: boolean
  error: Error | null
  refetch: (variables?: TVariables) => Promise<TData>
  run: (variables: TVariables) => Promise<TData>
} {
  const [data, setData] = useState<TData | undefined>(undefined)
  const [error, setError] = useState<Error | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [lastVariables, setLastVariables] = useState<TVariables | undefined>(
    undefined
  )
  const clientManager = getClientManager()

  const executeQuery = useCallback(
    async (variables: TVariables): Promise<TData> => {
      setIsLoading(true)
      setError(null)

      try {
        console.log(`[useReactiveQuery] Executing ${queryKey}`, variables)

        // Compose cache key with variables
        const inputKey =
          typeof variables === 'undefined'
            ? ''
            : `::${JSON.stringify(variables)}`
        const effectiveKey = `${queryKey}${inputKey}`

        // Execute the query through the client manager
        const result = await clientManager.revalidateQuery(effectiveKey)

        setData(result)
        setLastVariables(variables)
        console.log(`✅ [useReactiveQuery] ${queryKey} completed successfully`)

        return result
      } catch (err) {
        const error = err as Error
        setError(error)
        console.error(`❌ [useReactiveQuery] ${queryKey} failed:`, error)
        throw error
      } finally {
        setIsLoading(false)
      }
    },
    [queryKey, clientManager]
  )

  const refetch = useCallback(
    async (variables?: TVariables): Promise<TData> => {
      const varsToUse = variables || lastVariables
      if (!varsToUse) {
        throw new Error(
          'No variables provided for refetch and no previous variables stored'
        )
      }
      return executeQuery(varsToUse)
    },
    [executeQuery, lastVariables]
  )

  return {
    data,
    isLoading,
    error,
    refetch,
    run: executeQuery,
  }
}

/**
 * Hook to get connection status
 */
export function useReactiveConnection() {
  const [status, setStatus] = useState<
    'connected' | 'connecting' | 'disconnected'
  >('disconnected')
  const clientManager = getClientManager()

  useEffect(() => {
    const updateStatus = () => {
      setStatus(clientManager.getConnectionStatus())
    }

    updateStatus()
    const interval = setInterval(updateStatus, 1000)

    return () => clearInterval(interval)
  }, [clientManager])

  return {
    status,
    isConnected: status === 'connected',
    isConnecting: status === 'connecting',
    isDisconnected: status === 'disconnected',
    reconnect: () => clientManager.reconnectSSE(),
  }
}
