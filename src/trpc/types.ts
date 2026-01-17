/**
 * tRPC type definitions for reactive router
 */

import type { Router } from '@trpc/server'
import type { ReactiveRouter } from './router'

/**
 * Type for reactive router instance
 */
export type ReactiveRouterInstance = ReactiveRouter

/**
 * Type for built tRPC router with reactive features
 */
export type BuiltReactiveRouter = Router<any>

/**
 * Configuration for reactive procedures
 */
export interface ReactiveProcedureConfig<TInput = any, TOutput = any> {
  input?: any // Zod schema
  dependencies?: string[] // Table dependencies for queries
  invalidates?: string[] // Tables to invalidate for mutations
  handler: (opts: { input: TInput; ctx: any }) => Promise<TOutput>
}

/**
 * Reactive query procedure configuration
 */
export interface ReactiveQueryConfig<TInput = any, TOutput = any>
  extends ReactiveProcedureConfig<TInput, TOutput> {
  dependencies: string[] // Required for queries
}

/**
 * Reactive mutation procedure configuration
 */
export interface ReactiveMutationConfig<TInput = any, TOutput = any>
  extends ReactiveProcedureConfig<TInput, TOutput> {
  invalidates: string[] // Required for mutations
}

/**
 * Reactive subscription procedure configuration
 */
export interface ReactiveSubscriptionConfig<TInput = any, TOutput = any> {
  input?: any // Zod schema
  dependencies: string[] // Tables to subscribe to
  handler: (opts: { input: TInput; ctx: any }) => AsyncIterable<TOutput>
}

/**
 * Cache entry metadata
 */
export interface CacheEntry<T = any> {
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
  input: any
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
