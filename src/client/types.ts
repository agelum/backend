/**
 * Client-side types
 */
export interface UseReactiveResult<T> {
  data: T | undefined
  isLoading: boolean
  isStale: boolean
  error: Error | null
}
