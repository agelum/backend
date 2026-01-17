/**
 * Client-side reactive database features
 */

// Storage and session management
export { ReactiveStorage, createReactiveStorage } from './storage'
export {
  SimpleSessionManager,
  createSimpleSessionManager,
  revalidateOnPageLoad,
  type SessionInfo,
  type QueryRegistry,
  type QueryRegistryEntry,
} from './session'

// Client manager
export {
  ReactiveClientManager,
  createReactiveClientManager,
  type ReactiveManagerOptions,
} from './manager'

// React hooks
export {
  useReactive,
  useReactiveQuery,
  useReactivePriorities,
  useReactiveStats,
  useReactiveRefresh,
  useReactiveInvalidation,
  useRevalidationStats,
  useReactiveConnection,
  initializeReactiveClient,
} from './hooks'

// Smart revalidation
export {
  SmartRevalidationEngine,
  createSmartRevalidationEngine,
  type RevalidationStrategy,
  type RevalidationOptions,
  type RevalidationResult,
} from './revalidation'

// Provider and types
export { ReactiveProvider } from './provider'
