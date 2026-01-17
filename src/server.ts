/**
 * Server-only exports for @drizzle/reactive
 * Import this with: import { ... } from '@drizzle/reactive/server'
 * This avoids importing React Context on the server
 */

// Core database exports
export { createReactiveDb } from './core/driver'
export { defineReactiveFunction } from './core/function'
export type {
  ReactiveConfig,
  ReactiveDb,
  InvalidationEvent,
} from './core/types'

// tRPC integration exports
export { createReactiveRouter, ReactiveRouter } from './trpc/router'
export type { ReactiveRouterInstance, BuiltReactiveRouter } from './trpc/types'

// Server-side providers
export { RedisProvider } from './providers/redis'
export { MemoryProvider } from './providers/memory'

// Server-side utilities
export { analyzeSql } from './core/analyzer'
export {
  createSSEStream,
  broadcastInvalidation,
  acknowledgeEvent,
  getSSEManager,
  SSEManager,
} from './core/sse'

// Configuration types
export type {
  ReactiveFunction,
  ReactiveFunctionConfig,
  InvalidationRule,
  CacheStrategy,
  RealtimeConfig,
} from './config/schema'

// Version
export const version = '0.1.0'
