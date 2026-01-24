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
export { createReactiveDb } from "./core/driver";
export { defineReactiveFunction } from "./core/function";
export type {
  ReactiveConfig,
  ReactiveDb,
  DrizzleDatabase,
  ReactiveFunctionContext,
  CacheProvider,
} from "./core/types";

// Function types
export type {
  ReactiveFunctionConfig,
  ReactiveFunction,
  ReactiveFunctionMetadata,
  InvalidationChange,
  TrpcHandlerOptions,
} from "./core/function";

// tRPC integration exports
export {
  createReactiveRouter,
  ReactiveRouter,
} from "./trpc/router";
export type {
  ReactiveRouterInstance,
  BuiltReactiveRouter,
  ReactiveHandlerContext,
} from "./trpc/types";

// Client-side exports - commented out to avoid server-side issues
// Use @agelum/backend/client for client-side imports
// export { ReactiveProvider } from './client/provider'
// export { useReactive } from './client/hooks'

// Configuration exports
export type {
  InvalidationRule,
  CacheStrategy,
  RealtimeConfig,
} from "./config/schema";

// Provider exports
export { RedisProvider } from "./providers/redis";
export { MemoryProvider } from "./providers/memory";
export { LocalStorageProvider } from "./providers/localStorage";

// Utility exports
export { analyzeSql } from "./core/analyzer";
export {
  createSSEStream,
  broadcastInvalidation,
  acknowledgeEvent,
  getSSEManager,
  SSEManager,
} from "./core/sse";

// Version
export const version = "0.1.0";
