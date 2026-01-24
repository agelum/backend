/**
 * Simple tRPC router integration for reactive functions
 *
 * This is just a thin wrapper that:
 * 1. Takes reactive functions
 * 2. Exposes them as tRPC procedures
 * 3. That's it!
 *
 * All the reactive logic (caching, invalidation, etc.) is handled
 * by the reactive functions themselves.
 */

import { initTRPC } from '@trpc/server'
import type { ReactiveDb } from '../core/types.js'
import type { ReactiveFunction } from '../core/function.js'
import type { ReactiveHandlerContext } from './types.js'

export interface ReactiveRouterConfig {
  db: ReactiveDb
}

/**
 * Create typed tRPC instance with ReactiveHandlerContext
 */
const createTypedTRPC = () => initTRPC.context<ReactiveHandlerContext>().create()
type TypedTRPC = ReturnType<typeof createTypedTRPC>

/**
 * Simple reactive tRPC router - just exposes reactive functions as tRPC procedures
 */
export class ReactiveRouter {
  private t: TypedTRPC
  private db: ReactiveDb
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private procedures = new Map<string, any>()

  constructor(config: ReactiveRouterConfig) {
    this.db = config.db
    this.t = initTRPC.context<ReactiveHandlerContext>().create()
  }

  /**
   * Add a reactive function as a tRPC query
   * Uses the function's name automatically
   */
  addQuery<TInput, TOutput>(
    reactiveFunction: ReactiveFunction<TInput, TOutput>
  ) {
    const name = reactiveFunction.config.name
    const handler = reactiveFunction.getTrpcHandler(this.db)
    const procedure = this.t.procedure
      .input(reactiveFunction.config.input)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .query(async (opts: any) => handler(opts))

    this.procedures.set(name, procedure)
    return this
  }

  /**
   * Add a reactive function as a tRPC mutation
   * Uses the function's name automatically
   */
  addMutation<TInput, TOutput>(
    reactiveFunction: ReactiveFunction<TInput, TOutput>
  ) {
    const name = reactiveFunction.config.name
    const handler = reactiveFunction.getTrpcHandler(this.db)
    const procedure = this.t.procedure
      .input(reactiveFunction.config.input)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .mutation(async (opts: any) => handler(opts))

    this.procedures.set(name, procedure)
    return this
  }

  /**
   * Add a reactive function as a tRPC query with custom name (optional override)
   */
  addQueryWithName<TInput, TOutput>(
    name: string,
    reactiveFunction: ReactiveFunction<TInput, TOutput>
  ) {
    const handler = reactiveFunction.getTrpcHandler(this.db)
    const procedure = this.t.procedure
      .input(reactiveFunction.config.input)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .query(async (opts: any) => handler(opts))

    this.procedures.set(name, procedure)
    return this
  }

  /**
   * Add a reactive function as a tRPC mutation with custom name (optional override)
   */
  addMutationWithName<TInput, TOutput>(
    name: string,
    reactiveFunction: ReactiveFunction<TInput, TOutput>
  ) {
    const handler = reactiveFunction.getTrpcHandler(this.db)
    const procedure = this.t.procedure
      .input(reactiveFunction.config.input)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .mutation(async (opts: any) => handler(opts))

    this.procedures.set(name, procedure)
    return this
  }

  /**
   * Build the final tRPC router
   */
  build() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const routerObj: Record<string, any> = {}

    for (const [name, procedure] of this.procedures) {
      // Support nested router structure (e.g., 'users.getAll' -> { users: { getAll: procedure } })
      const parts = name.split('.')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let current: Record<string, any> = routerObj

      for (let i = 0; i < parts.length - 1; i++) {
        if (!current[parts[i]]) {
          current[parts[i]] = {}
        }
        current = current[parts[i]]
      }

      current[parts[parts.length - 1]] = procedure
    }

    // Recursively wrap nested objects into tRPC routers
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const wrapRouters = (node: Record<string, any>): Record<string, any> => {
      const entries = Object.entries(node)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const built: Record<string, any> = {}
      for (const [key, value] of entries) {
        // Heuristic: a procedure in tRPC has a _def property; nested routers won't
        const isProcedure =
          value && typeof value === 'object' && '_def' in value
        if (!isProcedure && value && typeof value === 'object') {
          // Nested group: wrap its children first, then create a router
          built[key] = this.t.router(wrapRouters(value))
        } else {
          built[key] = value
        }
      }
      return built
    }

    const normalized = wrapRouters(routerObj)
    return this.t.router(normalized)
  }

  /**
   * Get registered procedure names
   */
  getProcedureNames(): string[] {
    return Array.from(this.procedures.keys())
  }

  /**
   * Get router statistics
   */
  getStats() {
    return {
      totalProcedures: this.procedures.size,
      procedureNames: this.getProcedureNames(),
    }
  }
}

/**
 * Create a reactive tRPC router (simple factory function)
 */
export function createReactiveRouter(
  config: ReactiveRouterConfig
): ReactiveRouter {
  return new ReactiveRouter(config)
}

/**
 * Helper to create a router from a collection of reactive functions
 */
export function createRouterFromFunctions(
  db: ReactiveDb,
  functions: Record<
    string,
    { type: 'query' | 'mutation'; fn: ReactiveFunction<unknown, unknown> }
  >
): ReactiveRouter {
  const router = createReactiveRouter({ db })

  for (const [name, { type, fn }] of Object.entries(functions)) {
    if (type === 'query') {
      // Use custom name if provided, otherwise use function's name
      if (name !== fn.config.name) {
        router.addQueryWithName(name, fn)
      } else {
        router.addQuery(fn)
      }
    } else {
      // Use custom name if provided, otherwise use function's name
      if (name !== fn.config.name) {
        router.addMutationWithName(name, fn)
      } else {
        router.addMutation(fn)
      }
    }
  }

  return router
}
