/**
 * @agelum/backend - Zero configuration, maximum intelligence
 *
 * A reactive database library that provides automatic caching, real-time synchronization,
 * and intelligent invalidation for Drizzle ORM applications.
 *
 * @example
 * ```typescript
 * // server/db.ts - Minimal setup
 * export const db = createReactiveDb(drizzle, {
 *   relations: {
 *     agent: ['organization', 'message.fromAgentId', 'memory.agentId'],
 *     organization: ['agent.organizationId', 'tool.organizationId'],
 *   },
 * })
 *
 * // client/hooks.ts - Zero configuration usage
 * const { data: agents } = useReactive('agents.findMany', { organizationId })
 * // ✅ Shows cache instantly
 * // ✅ Smart revalidation (only active hooks first)
 * // ✅ Auto real-time mode
 * // ✅ Handles page refresh gracefully
 * // ✅ Recovers missed events
 * // ✅ Type-safe with tRPC
 * ```
 */

// Core exports
export { createReactiveDb } from "./core/driver.js";
export { defineReactiveFunction } from "./core/function.js";
export type {
  ReactiveConfig,
  ReactiveDb,
  DrizzleDatabase,
  ReactiveFunctionContext,
  CacheProvider,
} from "./core/types.js";

// Function types
export type {
  ReactiveFunctionConfig,
  ReactiveFunction,
  ReactiveFunctionMetadata,
  InvalidationChange,
  TrpcHandlerOptions,
} from "./core/function.js";

// tRPC integration exports
export {
  createReactiveRouter,
  ReactiveRouter,
} from "./trpc/router.js";
export type {
  ReactiveRouterInstance,
  BuiltReactiveRouter,
  ReactiveHandlerContext,
} from "./trpc/types.js";

// Client-side exports - commented out to avoid server-side issues
// Use @agelum/backend/client for client-side imports
// export { ReactiveProvider } from './client/provider.js'
// export { useReactive } from './client/hooks.js'

// Configuration exports
export type {
  InvalidationRule,
  CacheStrategy,
  RealtimeConfig,
} from "./config/schema.js";

// Provider exports
export { RedisProvider } from "./providers/redis.js";
export { MemoryProvider } from "./providers/memory.js";
export { LocalStorageProvider } from "./providers/localStorage.js";

// Utility exports
export { analyzeSql } from "./core/analyzer.js";
export {
  createSSEStream,
  broadcastInvalidation,
  acknowledgeEvent,
  getSSEManager,
  SSEManager,
} from "./core/sse.js";

// Version
export const version = "0.1.0";
