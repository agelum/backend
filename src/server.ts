/**
 * Server-only exports for @agelum/backend
 * Import this with: import { ... } from '@agelum/backend/server'
 * This avoids importing React Context on the server
 */

// Core database exports
export { createReactiveDb } from "./core/driver";
export { defineReactiveFunction } from "./core/function";
export type {
  ReactiveConfig,
  ReactiveDb,
  DrizzleDatabase,
  ReactiveFunctionContext,
  CacheProvider,
  InvalidationEvent,
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

// Server-side providers
export { RedisProvider } from "./providers/redis";
export { MemoryProvider } from "./providers/memory";

// Server-side utilities
export { analyzeSql } from "./core/analyzer";
export {
  createSSEStream,
  broadcastInvalidation,
  acknowledgeEvent,
  getSSEManager,
  SSEManager,
} from "./core/sse";

// Configuration types
export type {
  InvalidationRule,
  CacheStrategy,
  RealtimeConfig,
} from "./config/schema";

// Version
export const version = "0.1.0";
