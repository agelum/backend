import { createTRPCProxyClient, httpBatchLink } from "@trpc/client";
import type { AppRouter } from "@/server/trpc";
import superjson from "superjson";

/**
 * tRPC client for use with reactive hooks
 */
export const trpcClient = createTRPCProxyClient<AppRouter>({
  transformer: superjson,
  links: [
    httpBatchLink({
      url: "/api/trpc",
    }),
  ],
});
