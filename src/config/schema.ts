import { z } from 'zod'

/**
 * Configuration schema validation using Zod
 */

export const cacheConfigSchema = z
  .object({
    server: z
      .object({
        provider: z.enum(['redis', 'memory']).optional().default('memory'),
        redis: z
          .object({
            url: z.string().optional(),
            client: z.any().optional(),
          })
          .optional(),
      })
      .optional(),
    client: z
      .object({
        provider: z
          .enum(['localStorage', 'sessionStorage'])
          .optional()
          .default('localStorage'),
      })
      .optional(),
  })
  .optional()

export const realtimeConfigSchema = z
  .object({
    enabled: z.boolean().optional().default(true),
    transport: z.literal('sse').optional().default('sse'),
    fallback: z.literal('polling').optional().default('polling'),
    reliability: z
      .object({
        acknowledgments: z.boolean().optional().default(true),
        maxRetries: z.number().optional().default(3),
        retryDelays: z
          .array(z.number())
          .optional()
          .default([2000, 5000, 10000]),
        periodicHeartbeat: z.literal(false).optional().default(false),
      })
      .optional(),
  })
  .optional()

export const reactiveConfigSchema = z.object({
  relations: z.record(z.string(), z.array(z.string())),
  cache: cacheConfigSchema,
  realtime: realtimeConfigSchema,
})

export const reactiveFunctionConfigSchema = z.object({
  id: z.string(),
  input: z.any(), // Zod schema
  dependencies: z.array(z.string()),
  invalidateWhen: z.record(z.string(), z.function()).optional(),
  cacheEnabled: z.boolean().optional(),
  handler: z.function(),
})

export const invalidationRuleSchema = z.object({
  table: z.string(),
  condition: z.function().optional(),
  scope: z
    .enum(['global', 'organization', 'user'])
    .optional()
    .default('organization'),
})

export const cacheStrategySchema = z.object({
  ttl: z.number().optional(),
  staleWhileRevalidate: z.boolean().optional().default(true),
  backgroundRevalidation: z.boolean().optional().default(true),
  priority: z.enum(['high', 'medium', 'low']).optional().default('medium'),
})

/**
 * Type exports from schemas
 */
export type ReactiveConfigSchema = z.infer<typeof reactiveConfigSchema>
export type ReactiveFunctionConfigSchema = z.infer<
  typeof reactiveFunctionConfigSchema
>
export type InvalidationRule = z.infer<typeof invalidationRuleSchema>
export type CacheStrategy = z.infer<typeof cacheStrategySchema>
export type RealtimeConfig = z.infer<typeof realtimeConfigSchema>

// Re-export types from core to avoid duplication
// The canonical types are defined in core/function.ts and core/types.ts
export type {
  ReactiveFunction,
  ReactiveFunctionConfig,
} from '../core/function.js'

export type {
  ReactiveConfig,
} from '../core/types.js'
