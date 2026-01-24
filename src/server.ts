/**
 * Server-only exports for @agelum/backend
 * Import this with: import { ... } from '@agelum/backend/server'
 * This avoids importing React Context on the server
 */

// Core database exports
export { createReactiveDb } from "./core/driver.js";
export { defineReactiveFunction } from "./core/function.js";
export type {
  ReactiveConfig,
  ReactiveDb,
  DrizzleDatabase,
  ReactiveFunctionContext,
  CacheProvider,
  InvalidationEvent,
  TransactionOptions,
  TransactionConfig,
  TransactionReplicationMode,
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

// Server-side providers
export { RedisProvider } from "./providers/redis.js";
export { MemoryProvider } from "./providers/memory.js";

// Server-side utilities
export { analyzeSql } from "./core/analyzer.js";
export {
  createSSEStream,
  broadcastInvalidation,
  acknowledgeEvent,
  getSSEManager,
  SSEManager,
} from "./core/sse.js";

// Configuration types
export type {
  InvalidationRule,
  CacheStrategy,
  RealtimeConfig,
} from "./config/schema.js";

// Version
export const version = "0.1.0";
