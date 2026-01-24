/**
 * tRPC type definitions for reactive router
 */

import type { AnyRouter } from '@trpc/server'
import type { ReactiveRouter } from './router.js'
import type { ReactiveDb } from '../core/types.js'
import type { z } from 'zod'

/**
 * Type for reactive router instance
 */
export type ReactiveRouterInstance = ReactiveRouter

/**
 * Type for built tRPC router with reactive features
 * Note: Use `typeof router` from your built router for full type inference
 */
export type BuiltReactiveRouter = AnyRouter

/**
 * Handler context with reactive database
 */
export interface ReactiveHandlerContext {
  db: ReactiveDb
}

/**
 * Configuration for reactive procedures
 */
export interface ReactiveProcedureConfig<TInput = unknown, TOutput = unknown> {
  input?: z.ZodType<TInput>
  dependencies?: string[] // Table dependencies for queries
  invalidates?: string[] // Tables to invalidate for mutations
  handler: (opts: { input: TInput; ctx: ReactiveHandlerContext }) => Promise<TOutput>
}

/**
 * Reactive query procedure configuration
 */
export interface ReactiveQueryConfig<TInput = unknown, TOutput = unknown>
  extends ReactiveProcedureConfig<TInput, TOutput> {
  dependencies: string[] // Required for queries
}

/**
 * Reactive mutation procedure configuration
 */
export interface ReactiveMutationConfig<TInput = unknown, TOutput = unknown>
  extends ReactiveProcedureConfig<TInput, TOutput> {
  invalidates: string[] // Required for mutations
}

/**
 * Reactive subscription procedure configuration
 */
export interface ReactiveSubscriptionConfig<TInput = unknown, TOutput = unknown> {
  input?: z.ZodType<TInput>
  dependencies: string[] // Tables to subscribe to
  handler: (opts: { input: TInput; ctx: ReactiveHandlerContext }) => AsyncIterable<TOutput>
}

/**
 * Cache entry metadata
 */
export interface CacheEntry<T = unknown> {
  data: T
  timestamp: number
  dependencies: string[]
  ttl: number
  organizationId?: string
}

/**
 * Reactive procedure metadata
 */
export interface ReactiveProcedureMetadata {
  name: string
  type: 'query' | 'mutation' | 'subscription'
  dependencies?: string[]
  invalidates?: string[]
  cacheConfig?: {
    ttl?: number
    enabled?: boolean
  }
}

/**
 * Router builder interface
 */
export interface ReactiveRouterBuilder {
  query<TInput, TOutput>(
    name: string,
    config: ReactiveQueryConfig<TInput, TOutput>
  ): ReactiveRouterBuilder

  mutation<TInput, TOutput>(
    name: string,
    config: ReactiveMutationConfig<TInput, TOutput>
  ): ReactiveRouterBuilder

  subscription<TInput, TOutput>(
    name: string,
    config: ReactiveSubscriptionConfig<TInput, TOutput>
  ): ReactiveRouterBuilder

  build(): BuiltReactiveRouter
}

/**
 * Invalidation context for mutations
 */
export interface InvalidationContext {
  mutation: string
  input: unknown
  timestamp: number
  organizationId?: string
}

/**
 * Router statistics
 */
export interface RouterStats {
  totalProcedures: number
  queries: number
  mutations: number
  subscriptions: number
  cacheHitRate: number
  averageResponseTime: number
}

/**
 * Error types for reactive router
 */
export type ReactiveRouterError =
  | 'CACHE_ERROR'
  | 'INVALIDATION_ERROR'
  | 'BROADCAST_ERROR'
  | 'PROCEDURE_ERROR'
  | 'ORGANIZATION_NOT_FOUND'
