/**
 * Client-side reactive database features
 */

// Storage and session management
export { ReactiveStorage, createReactiveStorage } from './storage.js'
export {
  SimpleSessionManager,
  createSimpleSessionManager,
  revalidateOnPageLoad,
  type SessionInfo,
  type QueryRegistry,
  type QueryRegistryEntry,
} from './session.js'

// Client manager
export {
  ReactiveClientManager,
  createReactiveClientManager,
  type ReactiveManagerOptions,
} from './manager.js'

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
} from './hooks.js'

// Smart revalidation
export {
  SmartRevalidationEngine,
  createSmartRevalidationEngine,
  type RevalidationStrategy,
  type RevalidationOptions,
  type RevalidationResult,
} from './revalidation.js'

// Provider and types
export { ReactiveProvider } from './provider.js'
