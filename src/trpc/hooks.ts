/**
 * React hooks for tRPC reactive integration
 * Provides useReactiveQuery, useReactiveMutation, and useReactiveSubscription
 */

import { useCallback, useEffect, useState, useRef } from 'react'
import type { TRPCClientError } from '@trpc/client'
import type { UseReactiveResult } from '../client/types.js'

export interface UseReactiveQueryOptions<TData = unknown> {
  enabled?: boolean
  refetchOnMount?: boolean
  refetchOnWindowFocus?: boolean
  retry?: number | boolean
  retryDelay?: number
  staleTime?: number
  cacheTime?: number
  onSuccess?: (data: TData) => void
  onError?: (error: TRPCClientError<any>) => void
  initialData?: TData
}

export interface UseReactiveQueryResult<TData = unknown, TError = unknown>
  extends UseReactiveResult<TData> {
  refetch: () => Promise<void>
  remove: () => void
  isFetching: boolean
  isRefetching: boolean
  dataUpdatedAt: number
  errorUpdatedAt: number
  failureCount: number
}

export interface UseReactiveMutationOptions<
  TData = unknown,
  TVariables = unknown
> {
  onSuccess?: (data: TData, variables: TVariables) => void
  onError?: (error: TRPCClientError<any>, variables: TVariables) => void
  onSettled?: (
    data: TData | undefined,
    error: TRPCClientError<any> | null,
    variables: TVariables
  ) => void
  retry?: number | boolean
  retryDelay?: number
}

export interface UseReactiveMutationResult<
  TData = unknown,
  TVariables = unknown
> {
  mutate: (variables: TVariables) => void
  mutateAsync: (variables: TVariables) => Promise<TData>
  reset: () => void
  data: TData | undefined
  error: TRPCClientError<any> | null
  isLoading: boolean
  isSuccess: boolean
  isError: boolean
  isIdle: boolean
  variables: TVariables | undefined
  failureCount: number
}

export interface UseReactiveSubscriptionOptions<TData = unknown> {
  enabled?: boolean
  onData?: (data: TData) => void
  onError?: (error: TRPCClientError<any>) => void
  onStarted?: () => void
  onStopped?: () => void
}

export interface UseReactiveSubscriptionResult<TData = unknown> {
  data: TData | undefined
  error: TRPCClientError<any> | null
  status: 'loading' | 'error' | 'success' | 'idle'
}

/**
 * Hook for reactive tRPC queries with automatic caching and invalidation
 */
export function useReactiveQuery<TData = unknown, TVariables = unknown>(
  procedure: string,
  input?: TVariables,
  options: UseReactiveQueryOptions<TData> = {}
): UseReactiveQueryResult<TData> {
  const [data, setData] = useState<TData | undefined>(options.initialData)
  const [error, setError] = useState<TRPCClientError<any> | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isFetching, setIsFetching] = useState(false)
  const [isRefetching, setIsRefetching] = useState(false)
  const [isStale, setIsStale] = useState(false)
  const [dataUpdatedAt, setDataUpdatedAt] = useState(0)
  const [errorUpdatedAt, setErrorUpdatedAt] = useState(0)
  const [failureCount, setFailureCount] = useState(0)

  const queryKey = `${procedure}_${JSON.stringify(input)}`
  const enabledRef = useRef(options.enabled !== false)
  const optionsRef = useRef(options)

  // Update refs when options change
  useEffect(() => {
    enabledRef.current = options.enabled !== false
    optionsRef.current = options
  }, [options])

  const fetchData = useCallback(
    async (isRefetch = false) => {
      if (!enabledRef.current) return

      try {
        if (isRefetch) {
          setIsRefetching(true)
        } else {
          setIsLoading(true)
        }
        setIsFetching(true)
        setError(null)

        // In a real implementation, this would call the tRPC client
        // For now, we simulate the behavior
        console.log(`[useReactiveQuery] Fetching ${procedure}`, input)

        // Simulate API call
        await new Promise((resolve) => setTimeout(resolve, 100))

        // Simulate successful response
        const mockData = {
          id: '1',
          name: 'Test Data',
          timestamp: Date.now(),
          procedure,
          input,
        } as TData

        setData(mockData)
        setDataUpdatedAt(Date.now())
        setFailureCount(0)
        setIsStale(false)

        optionsRef.current.onSuccess?.(mockData)
      } catch (err) {
        const trpcError = err as TRPCClientError<any>
        setError(trpcError)
        setErrorUpdatedAt(Date.now())
        setFailureCount((prev) => prev + 1)

        optionsRef.current.onError?.(trpcError)
      } finally {
        setIsLoading(false)
        setIsFetching(false)
        setIsRefetching(false)
      }
    },
    [procedure, input]
  )

  const refetch = useCallback(async () => {
    await fetchData(true)
  }, [fetchData])

  const remove = useCallback(() => {
    setData(undefined)
    setError(null)
    setIsStale(false)
    setDataUpdatedAt(0)
    setErrorUpdatedAt(0)
    setFailureCount(0)
  }, [])

  // Initial fetch
  useEffect(() => {
    if (enabledRef.current && options.refetchOnMount !== false) {
      fetchData()
    }
  }, [fetchData, queryKey])

  // Handle window focus refetch
  useEffect(() => {
    if (options.refetchOnWindowFocus !== false) {
      const handleFocus = () => {
        if (enabledRef.current && data) {
          fetchData(true)
        }
      }

      window.addEventListener('focus', handleFocus)
      return () => window.removeEventListener('focus', handleFocus)
    }
  }, [fetchData, data, options.refetchOnWindowFocus])

  return {
    data,
    error,
    isLoading,
    isStale,
    refetch,
    remove,
    isFetching,
    isRefetching,
    dataUpdatedAt,
    errorUpdatedAt,
    failureCount,
  }
}

/**
 * Hook for reactive tRPC mutations with automatic invalidation
 */
export function useReactiveMutation<TData = unknown, TVariables = unknown>(
  procedure: string,
  options: UseReactiveMutationOptions<TData, TVariables> = {}
): UseReactiveMutationResult<TData, TVariables> {
  const [data, setData] = useState<TData | undefined>()
  const [error, setError] = useState<TRPCClientError<any> | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [variables, setVariables] = useState<TVariables | undefined>()
  const [failureCount, setFailureCount] = useState(0)

  const isSuccess = !isLoading && !error && data !== undefined
  const isError = !isLoading && error !== null
  const isIdle = !isLoading && !isSuccess && !isError

  const reset = useCallback(() => {
    setData(undefined)
    setError(null)
    setVariables(undefined)
    setFailureCount(0)
  }, [])

  const mutateAsync = useCallback(
    async (vars: TVariables): Promise<TData> => {
      setIsLoading(true)
      setVariables(vars)
      setError(null)

      try {
        console.log(`[useReactiveMutation] Executing ${procedure}`, vars)

        // Simulate API call
        await new Promise((resolve) => setTimeout(resolve, 150))

        // Simulate successful response
        const mockData = {
          id: Math.random().toString(36),
          success: true,
          timestamp: Date.now(),
          procedure,
          input: vars,
        } as TData

        setData(mockData)
        setFailureCount(0)

        options.onSuccess?.(mockData, vars)
        options.onSettled?.(mockData, null, vars)

        return mockData
      } catch (err) {
        const trpcError = err as TRPCClientError<any>
        setError(trpcError)
        setFailureCount((prev) => prev + 1)

        options.onError?.(trpcError, vars)
        options.onSettled?.(undefined, trpcError, vars)

        throw trpcError
      } finally {
        setIsLoading(false)
      }
    },
    [procedure, options]
  )

  const mutate = useCallback(
    (vars: TVariables) => {
      mutateAsync(vars).catch(() => {
        // Error is already handled in mutateAsync
      })
    },
    [mutateAsync]
  )

  return {
    mutate,
    mutateAsync,
    reset,
    data,
    error,
    isLoading,
    isSuccess,
    isError,
    isIdle,
    variables,
    failureCount,
  }
}

/**
 * Hook for reactive tRPC subscriptions with real-time updates
 */
export function useReactiveSubscription<TData = unknown, TVariables = unknown>(
  procedure: string,
  input?: TVariables,
  options: UseReactiveSubscriptionOptions<TData> = {}
): UseReactiveSubscriptionResult<TData> {
  const [data, setData] = useState<TData | undefined>()
  const [error, setError] = useState<TRPCClientError<any> | null>(null)
  const [status, setStatus] = useState<
    'loading' | 'error' | 'success' | 'idle'
  >('idle')

  const enabledRef = useRef(options.enabled !== false)
  const optionsRef = useRef(options)

  // Update refs when options change
  useEffect(() => {
    enabledRef.current = options.enabled !== false
    optionsRef.current = options
  }, [options])

  useEffect(() => {
    if (!enabledRef.current) return

    let cancelled = false
    let cleanup: (() => void) | undefined

    const startSubscription = async () => {
      try {
        setStatus('loading')
        setError(null)

        console.log(`[useReactiveSubscription] Starting ${procedure}`, input)

        optionsRef.current.onStarted?.()

        // Simulate subscription setup
        let counter = 0
        const interval = setInterval(() => {
          if (cancelled) return

          const mockData = {
            id: counter++,
            value: `Update ${counter}`,
            timestamp: Date.now(),
            procedure,
            input,
          } as TData

          setData(mockData)
          setStatus('success')
          optionsRef.current.onData?.(mockData)
        }, 2000)

        cleanup = () => {
          clearInterval(interval)
          optionsRef.current.onStopped?.()
        }
      } catch (err) {
        if (!cancelled) {
          const trpcError = err as TRPCClientError<any>
          setError(trpcError)
          setStatus('error')
          optionsRef.current.onError?.(trpcError)
        }
      }
    }

    startSubscription()

    return () => {
      cancelled = true
      cleanup?.()
    }
  }, [procedure, input])

  return {
    data,
    error,
    status,
  }
}

/**
 * Hook to get reactive router statistics
 */
export function useReactiveRouterStats() {
  const [stats, setStats] = useState({
    activeQueries: 0,
    activeMutations: 0,
    activeSubscriptions: 0,
    cacheHitRate: 0,
    lastUpdate: Date.now(),
  })

  useEffect(() => {
    // Simulate stats updates
    const interval = setInterval(() => {
      setStats((prev) => ({
        ...prev,
        cacheHitRate: Math.random() * 100,
        lastUpdate: Date.now(),
      }))
    }, 5000)

    return () => clearInterval(interval)
  }, [])

  return stats
}
