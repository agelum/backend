/**
 * tRPC integration exports for @agelum/backend
 * Import with: import { ... } from '@agelum/backend/trpc'
 */

// Router exports
export {
  createReactiveRouter,
  createRouterFromFunctions,
  ReactiveRouter,
} from "./router.js";

// Types
export type {
  ReactiveRouterInstance,
  BuiltReactiveRouter,
  ReactiveProcedureConfig,
  ReactiveQueryConfig,
  ReactiveMutationConfig,
  ReactiveSubscriptionConfig,
  CacheEntry,
  ReactiveProcedureMetadata,
  ReactiveRouterBuilder,
  InvalidationContext,
  RouterStats,
  ReactiveRouterError,
  ReactiveHandlerContext,
} from "./types.js";

// Hooks
export {
  useReactiveQuery,
  useReactiveMutation,
  useReactiveSubscription,
  useReactiveRouterStats,
} from "./hooks.js";

export type {
  UseReactiveQueryOptions,
  UseReactiveQueryResult,
  UseReactiveMutationOptions,
  UseReactiveMutationResult,
  UseReactiveSubscriptionOptions,
  UseReactiveSubscriptionResult,
} from "./hooks.js";
