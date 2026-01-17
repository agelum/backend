/**
 * Smart revalidation system with active hooks priority
 * Provides intelligent query revalidation based on user interaction patterns
 */

import type { ReactiveStorage } from './storage'
import type { ReactiveConfig, HookState } from '../core/types'

export interface RevalidationStrategy {
  immediate: string[] // Execute immediately
  delayed: string[] // Execute after delay
  background: string[] // Execute in background
  estimatedTime: number // Total estimated time
}

export interface RevalidationOptions {
  maxConcurrent?: number // Max concurrent revalidations
  delayBetweenBatches?: number // Delay between batches (ms)
  priorityFirst?: boolean // Execute priority queries first
  backgroundDelay?: number // Delay before background queries (ms)
}

export interface RevalidationResult {
  immediate: {
    successful: number
    failed: number
    duration: number
  }
  delayed: {
    successful: number
    failed: number
    duration: number
  }
  background: {
    successful: number
    failed: number
    duration: number
  }
  totalDuration: number
  overallSuccess: boolean
}

export class SmartRevalidationEngine {
  private storage: ReactiveStorage
  private config: ReactiveConfig
  private activeRevalidations = new Set<string>()
  private revalidationQueue = new Map<
    string,
    { priority: number; timestamp: number }
  >()

  constructor(storage: ReactiveStorage, config: ReactiveConfig) {
    this.storage = storage
    this.config = config
  }

  /**
   * Create an intelligent revalidation strategy
   */
  createRevalidationStrategy(
    invalidatedQueries: string[],
    options: RevalidationOptions = {}
  ): RevalidationStrategy {
    const {
      maxConcurrent = 3,
      priorityFirst = true,
      backgroundDelay = 2000,
    } = options

    // Get current active hooks for priority
    const activeHooks = this.storage.getActiveHooksByPriority()
    const activeQueryKeys = new Set(activeHooks.map((hook) => hook.queryKey))

    // Categorize queries based on priority and recency
    const immediate: string[] = []
    const delayed: string[] = []
    const background: string[] = []

    invalidatedQueries.forEach((queryKey) => {
      const isActive = activeQueryKeys.has(queryKey)
      const hook = activeHooks.find((h) => h.queryKey === queryKey)
      const lastAccess = hook?.lastAccess || 0
      const accessRecency = Date.now() - lastAccess

      if (isActive && accessRecency < 30000) {
        // Active and accessed within 30 seconds - immediate
        immediate.push(queryKey)
      } else if (isActive && accessRecency < 300000) {
        // Active but accessed within 5 minutes - delayed
        delayed.push(queryKey)
      } else {
        // Not active or old access - background
        background.push(queryKey)
      }
    })

    // Sort by priority and recency
    const sortByPriority = (queries: string[]) => {
      return queries.sort((a, b) => {
        const hookA = activeHooks.find((h) => h.queryKey === a)
        const hookB = activeHooks.find((h) => h.queryKey === b)

        if (!hookA && !hookB) return 0
        if (!hookA) return 1
        if (!hookB) return -1

        return hookB.lastAccess - hookA.lastAccess
      })
    }

    const strategy: RevalidationStrategy = {
      immediate: sortByPriority(immediate),
      delayed: sortByPriority(delayed),
      background: sortByPriority(background),
      estimatedTime: this.estimateRevalidationTime(
        immediate,
        delayed,
        background,
        options
      ),
    }

    console.log(`[SmartRevalidation] Strategy created:`, {
      immediate: strategy.immediate.length,
      delayed: strategy.delayed.length,
      background: strategy.background.length,
      estimatedTime: strategy.estimatedTime,
    })

    return strategy
  }

  /**
   * Execute the revalidation strategy
   */
  async executeRevalidationStrategy(
    strategy: RevalidationStrategy,
    revalidateFn: (queryKey: string) => Promise<any>,
    options: RevalidationOptions = {}
  ): Promise<RevalidationResult> {
    const startTime = Date.now()
    const result: RevalidationResult = {
      immediate: { successful: 0, failed: 0, duration: 0 },
      delayed: { successful: 0, failed: 0, duration: 0 },
      background: { successful: 0, failed: 0, duration: 0 },
      totalDuration: 0,
      overallSuccess: true,
    }

    try {
      // Phase 1: Immediate revalidation (critical queries)
      if (strategy.immediate.length > 0) {
        console.log(
          `[SmartRevalidation] Phase 1: ${strategy.immediate.length} immediate queries`
        )
        const immediateStart = Date.now()

        const immediateResult = await this.executeQueryBatch(
          strategy.immediate,
          revalidateFn,
          { maxConcurrent: options.maxConcurrent || 3 }
        )

        result.immediate = {
          successful: immediateResult.successful,
          failed: immediateResult.failed,
          duration: Date.now() - immediateStart,
        }
      }

      // Phase 2: Delayed revalidation (important but not critical)
      if (strategy.delayed.length > 0) {
        console.log(
          `[SmartRevalidation] Phase 2: ${strategy.delayed.length} delayed queries`
        )

        // Small delay to let immediate queries complete
        await this.wait(500)

        const delayedStart = Date.now()
        const delayedResult = await this.executeQueryBatch(
          strategy.delayed,
          revalidateFn,
          { maxConcurrent: Math.max(1, (options.maxConcurrent || 3) - 1) }
        )

        result.delayed = {
          successful: delayedResult.successful,
          failed: delayedResult.failed,
          duration: Date.now() - delayedStart,
        }
      }

      // Phase 3: Background revalidation (non-critical)
      if (strategy.background.length > 0) {
        console.log(
          `[SmartRevalidation] Phase 3: ${strategy.background.length} background queries`
        )

        // Execute background queries without blocking
        this.executeBackgroundRevalidation(
          strategy.background,
          revalidateFn,
          options.backgroundDelay || 2000
        )
      }

      result.totalDuration = Date.now() - startTime
      result.overallSuccess =
        result.immediate.failed === 0 && result.delayed.failed === 0

      console.log(`[SmartRevalidation] Strategy completed:`, result)
      return result
    } catch (error) {
      console.error('[SmartRevalidation] Strategy execution failed:', error)
      result.overallSuccess = false
      result.totalDuration = Date.now() - startTime
      return result
    }
  }

  /**
   * Add queries to revalidation queue with priority
   */
  queueRevalidation(queryKey: string, priority: number = 0): void {
    this.revalidationQueue.set(queryKey, {
      priority,
      timestamp: Date.now(),
    })
  }

  /**
   * Process revalidation queue
   */
  async processRevalidationQueue(
    revalidateFn: (queryKey: string) => Promise<any>,
    options: RevalidationOptions = {}
  ): Promise<void> {
    if (this.revalidationQueue.size === 0) {
      return
    }

    console.log(
      `[SmartRevalidation] Processing queue: ${this.revalidationQueue.size} queries`
    )

    // Convert queue to sorted array
    const queuedQueries = Array.from(this.revalidationQueue.entries())
      .sort(([, a], [, b]) => {
        // Sort by priority (higher first), then by timestamp (older first)
        if (a.priority !== b.priority) {
          return b.priority - a.priority
        }
        return a.timestamp - b.timestamp
      })
      .map(([queryKey]) => queryKey)

    // Clear the queue
    this.revalidationQueue.clear()

    // Create strategy for queued queries
    const strategy = this.createRevalidationStrategy(queuedQueries, options)
    await this.executeRevalidationStrategy(strategy, revalidateFn, options)
  }

  /**
   * Smart invalidation with automatic revalidation
   */
  async smartInvalidateAndRevalidate(
    table: string,
    revalidateFn: (queryKey: string) => Promise<any>,
    options: RevalidationOptions = {}
  ): Promise<RevalidationResult> {
    console.log(`[SmartRevalidation] Smart invalidation for table: ${table}`)

    // Invalidate affected queries
    this.storage.invalidateByTable(table, this.config.relations)

    // Find queries that need revalidation
    const allQueries = Object.keys(this.storage.getRegistry()?.queries || {})
    const affectedQueries = this.findAffectedQueries(table, allQueries)

    if (affectedQueries.length === 0) {
      console.log(`[SmartRevalidation] No affected queries for table: ${table}`)
      return {
        immediate: { successful: 0, failed: 0, duration: 0 },
        delayed: { successful: 0, failed: 0, duration: 0 },
        background: { successful: 0, failed: 0, duration: 0 },
        totalDuration: 0,
        overallSuccess: true,
      }
    }

    // Create and execute revalidation strategy
    const strategy = this.createRevalidationStrategy(affectedQueries, options)
    return await this.executeRevalidationStrategy(
      strategy,
      revalidateFn,
      options
    )
  }

  /**
   * Execute a batch of queries with concurrency control
   */
  private async executeQueryBatch(
    queries: string[],
    revalidateFn: (queryKey: string) => Promise<any>,
    options: { maxConcurrent: number }
  ): Promise<{ successful: number; failed: number }> {
    let successful = 0
    let failed = 0

    // Process in batches to control concurrency
    for (let i = 0; i < queries.length; i += options.maxConcurrent) {
      const batch = queries.slice(i, i + options.maxConcurrent)

      const batchResults = await Promise.allSettled(
        batch.map(async (queryKey) => {
          if (this.activeRevalidations.has(queryKey)) {
            console.log(
              `[SmartRevalidation] Skipping ${queryKey} (already revalidating)`
            )
            return
          }

          this.activeRevalidations.add(queryKey)

          try {
            await revalidateFn(queryKey)
            console.log(`[SmartRevalidation] ✅ Revalidated: ${queryKey}`)
            return { success: true }
          } catch (error) {
            console.warn(`[SmartRevalidation] ❌ Failed: ${queryKey}`, error)
            throw error
          } finally {
            this.activeRevalidations.delete(queryKey)
          }
        })
      )

      batchResults.forEach((result) => {
        if (result.status === 'fulfilled') {
          successful++
        } else {
          failed++
        }
      })

      // Small delay between batches to avoid overwhelming the server
      if (i + options.maxConcurrent < queries.length) {
        await this.wait(100)
      }
    }

    return { successful, failed }
  }

  /**
   * Execute background revalidation with rate limiting
   */
  private async executeBackgroundRevalidation(
    queries: string[],
    revalidateFn: (queryKey: string) => Promise<any>,
    delay: number
  ): Promise<void> {
    // Delay before starting background revalidation
    setTimeout(async () => {
      console.log(
        `[SmartRevalidation] Starting background revalidation for ${queries.length} queries`
      )

      // Process background queries slowly to avoid interference
      for (const queryKey of queries) {
        try {
          if (!this.activeRevalidations.has(queryKey)) {
            this.activeRevalidations.add(queryKey)
            await revalidateFn(queryKey)
            console.log(
              `[SmartRevalidation] 🔄 Background revalidated: ${queryKey}`
            )
            this.activeRevalidations.delete(queryKey)
          }
        } catch (error) {
          console.warn(
            `[SmartRevalidation] Background revalidation failed: ${queryKey}`,
            error
          )
          this.activeRevalidations.delete(queryKey)
        }

        // Longer delay between background queries
        await this.wait(500)
      }

      console.log('[SmartRevalidation] Background revalidation completed')
    }, delay)
  }

  /**
   * Find queries affected by table changes
   */
  private findAffectedQueries(table: string, allQueries: string[]): string[] {
    const relatedTables = this.config.relations[table] || []
    const tablesToCheck = [table, ...relatedTables]

    return allQueries.filter((queryKey) => {
      // Simple heuristic: check if query key contains table name
      return tablesToCheck.some((tableName) =>
        queryKey.toLowerCase().includes(tableName.toLowerCase())
      )
    })
  }

  /**
   * Estimate total revalidation time
   */
  private estimateRevalidationTime(
    immediate: string[],
    delayed: string[],
    background: string[],
    options: RevalidationOptions
  ): number {
    const avgQueryTime = 150 // ms per query
    const maxConcurrent = options.maxConcurrent || 3

    const immediateTime =
      Math.ceil(immediate.length / maxConcurrent) * avgQueryTime
    const delayedTime = Math.ceil(delayed.length / maxConcurrent) * avgQueryTime
    const backgroundTime = background.length * avgQueryTime // Sequential for background

    return immediateTime + delayedTime + backgroundTime / 4 // Background is parallel
  }

  /**
   * Utility to wait for a specified time
   */
  private wait(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  /**
   * Get current revalidation statistics
   */
  getRevalidationStats(): {
    activeRevalidations: number
    queuedQueries: number
    activeHooks: number
    recentActivity: { queryKey: string; timestamp: number }[]
  } {
    const activeHooks = this.storage.getActiveHooks()

    return {
      activeRevalidations: this.activeRevalidations.size,
      queuedQueries: this.revalidationQueue.size,
      activeHooks: activeHooks.length,
      recentActivity: activeHooks
        .sort((a, b) => b.lastAccess - a.lastAccess)
        .slice(0, 5)
        .map((hook) => ({
          queryKey: hook.queryKey,
          timestamp: hook.lastAccess,
        })),
    }
  }
}

/**
 * Create a smart revalidation engine
 */
export function createSmartRevalidationEngine(
  storage: ReactiveStorage,
  config: ReactiveConfig
): SmartRevalidationEngine {
  return new SmartRevalidationEngine(storage, config)
}
