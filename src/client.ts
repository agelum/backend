/**
 * Client-only exports for @agelum/backend
 * Import this with: import { ... } from '@agelum/backend/client'
 */

// Essential client-side exports
export {
  ReactiveProvider,
  useReactiveContext,
} from "./client/provider.js";
export {
  useReactive,
  useReactiveQuery,
  initializeReactiveClient,
} from "./client/hooks.js";
export { ReactiveClientManager } from "./client/manager.js";
export {
  TrpcReactiveProvider,
  createTrpcRevalidateFn,
} from "./client/trpc.js";

// Storage providers for client
export { LocalStorageProvider } from "./providers/localStorage.js";

// Client types
export type { UseReactiveResult } from "./client/types.js";

// Version
export const version = "0.1.0";
