/**
 * Client-only exports for @agelum/backend
 * Import this with: import { ... } from '@agelum/backend/client'
 */

// Essential client-side exports
export {
  ReactiveProvider,
  useReactiveContext,
} from "./client/provider";
export {
  useReactive,
  useReactiveQuery,
  initializeReactiveClient,
} from "./client/hooks";
export { ReactiveClientManager } from "./client/manager";
export {
  TrpcReactiveProvider,
  createTrpcRevalidateFn,
} from "./client/trpc";

// Storage providers for client
export { LocalStorageProvider } from "./providers/localStorage";

// Client types
export type { UseReactiveResult } from "./client/types";

// Version
export const version = "0.1.0";
