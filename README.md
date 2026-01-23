# @agelum/backend

**Zero configuration, maximum intelligence. Reactive everywhere with no boilerplate.**

A reactive database library that transforms any Drizzle + tRPC setup into a reactive, real-time system with minimal configuration and zero boilerplate code changes.

## ✨ Features

- **🚀 Zero Configuration**: Single config file with just table relations
- **⚡ Instant Cache**: Shows cached data immediately, revalidates smartly
- **🔄 Real-time Sync**: Built-in Server-Sent Events for cache invalidation
- **🎯 Smart Invalidation**: Only invalidates relevant queries based on relations
- **📱 Offline Ready**: Handles page refresh and session gaps gracefully
- **🔒 Type Safe**: 100% automatic type safety with tRPC integration
- **☁️ Vercel Compatible**: Works perfectly with serverless deployment
- **🧠 Intelligent**: Prioritizes active hooks for better UX

## 🚀 Quick Start

### Installation

```bash
pnpm add @agelum/backend drizzle-orm @trpc/server @trpc/client zod
```

## 📖 Core Usage Patterns

### 1. Define Reactive Functions

**Key Concept**: Reactive functions work both standalone (server-side) AND via tRPC. The `name` property is crucial for cache keys and tRPC procedures. Use `db.db` to access the underlying Drizzle instance inside handlers.

```typescript
// server/functions/users.ts
import { defineReactiveFunction } from "@agelum/backend/server";
import { z } from "zod";

// 1. Define a reactive function with explicit name
export const getUsers =
  defineReactiveFunction({
    name: "users.getAll", // 🔑 This becomes the cache key and tRPC procedure name

    input: z.object({
      companyId: z.string(), // Generic, not hardcoded organizationId
      limit: z
        .number()
        .optional()
        .default(50),
    }),

    dependencies: ["user"], // What tables this function reads from

    handler: async (input, db) => {
      // Clean signature: (input, db)
      return db.db.query.users.findMany(
        {
          where: (users, { eq }) =>
            eq(
              users.companyId,
              input.companyId,
            ),
          limit: input.limit,
        },
      );
    },
  });

export const createUser =
  defineReactiveFunction({
    name: "users.create",

    input: z.object({
      name: z.string(),
      email: z.string().email(),
      companyId: z.string(),
    }),

    dependencies: ["user"],

    handler: async (input, db) => {
      return db.db
        .insert(users)
        .values(input)
        .returning();
    },
  });

export const getUserProfile =
  defineReactiveFunction({
    name: "users.profile.getDetailed", // 🏷️ Nested names work perfectly

    input: z.object({
      userId: z.string(),
    }),

    dependencies: [
      "user",
      "profile",
      "preferences",
    ],

    handler: async (input, db) => {
      const user =
        await db.db.query.users.findFirst(
          {
            where: (users, { eq }) =>
              eq(
                users.id,
                input.userId,
              ),
            with: {
              profile: true,
              preferences: true,
            },
          },
        );
      return user;
    },
  });
```

### 2. Server-Side Execution (Without tRPC)

**Use Case**: Background jobs, API routes, server actions, webhooks, etc.

```typescript
// server/api/users/route.ts - Next.js API route
import {
  getUsers,
  createUser,
} from "../functions/users";
import { db } from "../db";

export async function GET(
  request: Request,
) {
  const { searchParams } = new URL(
    request.url,
  );
  const companyId = searchParams.get(
    "companyId",
  )!;

  // ✅ Execute reactive function directly on server
  const users = await getUsers.execute(
    { companyId, limit: 20 },
    db, // Your reactive database instance
  );

  return Response.json({ users });
}

export async function POST(
  request: Request,
) {
  const body = await request.json();

  // ✅ Execute reactive function directly on server
  const newUser =
    await createUser.execute(body, db);

  return Response.json({
    user: newUser,
  });
}
```

```typescript
// server/jobs/daily-stats.ts - Background job
import { getUsers } from "../functions/users";
import { db } from "../db";

export async function generateDailyStats() {
  const companies =
    await db.db.query.companies.findMany();

  for (const company of companies) {
    // ✅ Execute reactive function in background job
    const users =
      await getUsers.execute(
        { companyId: company.id },
        db,
      );

    // Process stats...
    console.log(
      `Company ${company.name} has ${users.length} users`,
    );
  }
}
```

### 3. tRPC Integration (Auto-Generated)

**Key Feature**: The tRPC router automatically uses the function `name` as the procedure name. Call `.build()` to get the final tRPC router instance.

```typescript
// server/trpc/router.ts
import { createReactiveRouter } from "@agelum/backend/server";
import {
  getUsers,
  createUser,
  getUserProfile,
} from "../functions/users";
import { db } from "../db";

export const appRouter =
  createReactiveRouter({ db })
    .addQuery(getUsers) // 🔄 Creates procedure: users.getAll
    .addMutation(createUser) // 🔄 Creates procedure: users.create
    .addQuery(getUserProfile) // 🔄 Creates procedure: users.profile.getDetailed
    .build();

// ✅ Auto-generated procedures from function names:
// - users.getAll (query)
// - users.create (mutation)
// - users.profile.getDetailed (query)

export type AppRouter =
  typeof appRouter;
```

### 4. Client-Side Usage (React Hooks)

**Zero Configuration**: Just use the tRPC procedure names (which match function names).

```typescript
// client/components/UserList.tsx
import { useReactive } from '@agelum/backend/client'

function UserList({ companyId }: { companyId: string }) {
  // ✅ Uses the function name automatically: 'users.getAll'
  const {
    data: users,
    isStale,
    isLoading,
  } = useReactive('users.getAll', {
    companyId,
    limit: 20,
  })

  if (isLoading) return <div>Loading...</div>

  return (
    <div>
      {isStale && <div className="text-orange-500">Syncing...</div>}

      {users?.map((user) => (
        <UserCard key={user.id} user={user} />
      ))}
    </div>
  )
}

function UserProfile({ userId }: { userId: string }) {
  // ✅ Nested function names work perfectly
  const { data: profile } = useReactive('users.profile.getDetailed', {
    userId,
  })

  return (
    <div>
      <h1>{profile?.name}</h1>
      <p>{profile?.email}</p>
      {/* Profile details... */}
    </div>
  )
}
```

### 5. Mutations with Real-time Updates

```typescript
// client/components/CreateUserForm.tsx
import { useMutation } from '@trpc/react-query'
import { trpc } from '../trpc'

function CreateUserForm({ companyId }: { companyId: string }) {
  const createUserMutation = trpc.users.create.useMutation({
    onSuccess: () => {
      // ✅ Automatic cache invalidation happens via SSE
      // No manual invalidation needed!
    },
  })

  const handleSubmit = (data: FormData) => {
    createUserMutation.mutate({
      name: data.get('name') as string,
      email: data.get('email') as string,
      companyId,
    })
  }

  return <form onSubmit={handleSubmit}>{/* Form fields... */}</form>
}
```

## 🏗️ Setup

### 1. Database Configuration

```typescript
// server/db.ts
import { createReactiveDb } from "@agelum/backend/server";
import { drizzle } from "drizzle-orm/postgres-js";

const config = {
  relations: {
    // Relations are table names (not column paths)
    // When user table changes, invalidate these queries
    user: ["profile", "preferences"],

    // When profile table changes, invalidate these queries
    profile: ["user"],

    // When preferences table changes, invalidate these queries
    preferences: ["user"],
  },
};

export const db = createReactiveDb(
  drizzle(pool),
  config,
);
```

### 2. SSE Endpoint (Next.js)

```typescript
// app/api/events/route.ts
import { createSSEStream } from "@agelum/backend/server";

export async function GET(
  request: Request,
) {
  const { searchParams } = new URL(
    request.url,
  );
  const organizationId =
    searchParams.get("organizationId")!;

  return createSSEStream(
    organizationId,
  );
}
```

```typescript
// app/api/events/ack/route.ts
// Required for reliable delivery: client acks invalidation events
import { acknowledgeEvent } from "@agelum/backend/server";

export async function POST(
  request: Request,
) {
  const { eventId } =
    await request.json();
  acknowledgeEvent(eventId);
  return Response.json({ ok: true });
}
```

### 3. Client Setup

```typescript
// client/providers/ReactiveProvider.tsx
// Recommended: use the built-in TrpcReactiveProvider to wire revalidation generically
'use client'
import { TrpcReactiveProvider } from '@agelum/backend/client'
import { createTRPCProxyClient, httpBatchLink } from '@trpc/client'
import type { AppRouter } from '../server/trpc'
import { reactiveRelations } from '@your-db-package/reactive-config'

const trpcClient = createTRPCProxyClient<AppRouter>({
  links: [httpBatchLink({ url: '/api/trpc' })],
})

export function AppProviders({ children }: { children: React.ReactNode }) {
  const organizationId = 'your-organization-id'
  return (
    <TrpcReactiveProvider
      organizationId={organizationId}
      relations={reactiveRelations}
      trpcClient={trpcClient}
    >
      {children}
    </TrpcReactiveProvider>
  )
}

// Alternatively, you can create your own revalidateFn with createTrpcRevalidateFn
// and pass it to ReactiveProvider if you need custom behavior.
```

If you use `ReactiveProvider` directly, make sure to pass a `revalidateFn` for production; the default revalidator returns mock data.

### 4.1 Client Storage & Revalidation Details

- The hook composes cache keys as `name::JSON(input)`.
- LocalStorage is sharded per query to avoid large single entries:
  - Index per organization: `reactive_registry_<orgId>` stores metadata (last revalidated, last server change, connection status).
  - Per-query entry key: `@agelum/backend:entry:<orgId>:<hash>` stores `{ name, input, queryKey, data }`.
- On initial render, cached data (if present) is shown immediately; background revalidation respects a minimum time window to avoid thrashing on quick navigations/refreshes.
- Errors during revalidation do not overwrite existing cache (no-write-on-error), keeping previously known-good data.
- Real-time invalidation uses SSE with client acknowledgments and retry; no heartbeats are sent.

### 4.2 Multi-tenant Tips (Optional)

- Resolve tenant databases via a main database lookup (e.g., `organization.databaseName`), not by using IDs directly as database names.
- Read paths should not create databases; handle missing DB (`3D000`) by propagating the error or returning empty based on product policy.
- Provisioning (create DB/schemas) belongs to explicit setup flows.

## 🎯 Key Benefits Over Manual Approach

| Feature                 | Manual tRPC                        | @agelum/backend                 |
| ----------------------- | ---------------------------------- | ------------------------------- |
| **Function Definition** | Separate function + tRPC procedure | Single `defineReactiveFunction` |
| **Cache Keys**          | Manual generation                  | Auto from function name         |
| **Invalidation**        | Manual `invalidateQueries`         | Automatic via relations         |
| **Real-time**           | Manual WebSocket setup             | Built-in SSE                    |
| **Server Execution**    | Separate function needed           | Same function works everywhere  |
| **Type Safety**         | Manual type wiring                 | 100% automatic                  |

## 📈 Advanced Usage

### Custom tRPC Procedure Names

```typescript
// If you need different tRPC names than function names
const router = createReactiveRouter({
  db,
})
  .addQueryWithName(
    getUsers,
    "getAllUsers",
  ) // Custom name
  .addQuery(getUserProfile); // Uses function name: 'users.profile.getDetailed'
```

### Background Revalidation

```typescript
// client/hooks.ts
function MyComponent() {
  useReactivePriorities([
    "users.getAll", // High priority (visible)
    "users.profile.getDetailed", // Medium priority (likely next)
  ]);

  // Component content...
}
```

## 🔧 How It Works

1. **Function Definition**: `defineReactiveFunction` creates functions that work both server-side and via tRPC
2. **Name-Based Mapping**: The `name` property becomes both the cache key and tRPC procedure name
3. **Auto-Generated Router**: `createReactiveRouter` automatically creates tRPC procedures from functions
4. **Smart Caching**: Cache keys are generated from function names and inputs. The React hook composes a key as `name::JSON(input)` internally to uniquely cache and revalidate by input.
5. **Real-time Updates**: SSE automatically invalidates affected queries when data changes. No heartbeats are sent; reliability is ensured via client acknowledgments and retry.
6. **Session Recovery**: Smart revalidation on page load handles offline scenarios and avoids thrashing with a minimum revalidation window.

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](./CONTRIBUTING.md) for details.

## 📄 License

MIT License - see [LICENSE](./LICENSE) for details.

---

**Made with ❤️ by the TeamHub team**
