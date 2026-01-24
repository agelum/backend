# @agelum/backend Next.js Demo

This is a complete demo application showcasing all features of `@agelum/backend` - a reactive database library that transforms Drizzle + tRPC setups into reactive, real-time systems with minimal configuration.

## Features Demonstrated

- ✨ **Instant Cache Display** - Data shows immediately from cache
- 🔄 **Background Revalidation** - Smart cache updates without blocking UI
- 🚀 **Real-time SSE Updates** - Automatic cache invalidation via Server-Sent Events
- 🔗 **Multi-tab Synchronization** - Changes propagate instantly across all tabs
- 🎯 **Zero Configuration** - Single relations config, automatic everything else
- 🔐 **Type Safety** - 100% end-to-end TypeScript types

## Quick Start

### Prerequisites

- Node.js 18+ 
- Docker and Docker Compose
- pnpm (or npm/yarn)

### 1. Start Services

Start PostgreSQL and Redis with Docker Compose:

```bash
cd examples/nextjs-demo
docker compose up -d
```

Verify services are running:

```bash
docker compose ps
```

### 2. Install Dependencies

```bash
pnpm install
```

### 3. Configure Environment

The demo works out of the box with default values, but you can customize:

```bash
# Optional: Create .env file
cp .env.example .env

# Edit .env if needed (defaults work fine)
```

### 4. Setup Database

Push the database schema:

```bash
pnpm db:push
```

Seed sample data:

```bash
pnpm db:seed
```

### 5. Start Development Server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Try the Demo

1. **Create a User** - Use the form on the left to create a user
2. **Watch Real-time Update** - See it appear instantly in the user list
3. **Create a Post** - Select a user and create a post
4. **Multi-tab Test** - Open another tab at `localhost:3000`
5. **Create in Tab 1** - Add a user or post in the first tab
6. **See Update in Tab 2** - Watch it appear instantly via SSE!

## Project Structure

```
examples/nextjs-demo/
├── docker-compose.yml          # PostgreSQL + Redis
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── trpc/[trpc]/    # tRPC handler
│   │   │   └── events/         # SSE endpoints
│   │   ├── layout.tsx          # Root layout with providers
│   │   └── page.tsx            # Main demo page
│   ├── server/
│   │   ├── db/
│   │   │   ├── schema.ts       # Drizzle schema
│   │   │   └── index.ts        # ReactiveDb setup
│   │   ├── functions/          # Reactive functions
│   │   │   ├── users.ts
│   │   │   └── posts.ts
│   │   └── trpc.ts             # tRPC router
│   ├── client/
│   │   ├── providers.tsx       # TrpcReactiveProvider
│   │   └── trpc.ts             # tRPC client
│   └── components/             # React components
└── scripts/
    └── seed.ts                 # Database seeding
```

## Key Concepts

### 1. Reactive Functions

Define functions with explicit names that work both server-side and via tRPC:

```typescript
export const getUsers = defineReactiveFunction({
  name: "users.getAll",  // Cache key + tRPC procedure name
  input: z.object({
    organizationId: z.string(),
  }),
  dependencies: ["users"],
  handler: async ({ input, db }) => {
    return db.db.query.users.findMany({
      where: eq(users.organizationId, input.organizationId),
    });
  },
});
```

### 2. Reactive Database

Setup once with relations config:

```typescript
export const db = createReactiveDb(drizzleDb, {
  relations: {
    users: ["posts"],
    posts: ["users"],
  },
});
```

### 3. tRPC Router

Auto-generate procedures from reactive functions:

```typescript
export const appRouter = createReactiveRouter({ db })
  .addQuery(getUsers)
  .addMutation(createUser)
  .build();
```

### 4. Client Hooks

Use reactive data with instant cache + background revalidation:

```typescript
const { data, isLoading, isStale } = useReactive(
  "users.getAll",
  { organizationId }
);
```

### 5. Real-time Updates

SSE broadcasts invalidations automatically when mutations happen:

```typescript
// Server: SSE endpoint
export async function GET(request: NextRequest) {
  const organizationId = request.nextUrl.searchParams.get("organizationId");
  return createSSEStream(organizationId);
}

// Client: ConnectionStatus component
const { status, isConnected } = useReactiveConnection();
```

## Database Commands

```bash
# Push schema to database
pnpm db:push

# Seed sample data
pnpm db:seed

# Open Drizzle Studio (database GUI)
pnpm db:studio
```

## Docker Commands

```bash
# Start services
docker compose up -d

# Stop services
docker compose down

# View logs
docker compose logs -f

# Restart services
docker compose restart
```

## Troubleshooting

### Port already in use

If ports 5432 or 6379 are already in use:

```bash
# Stop existing services
docker compose down

# Or modify docker-compose.yml to use different ports
```

### Database connection failed

Make sure PostgreSQL is running and healthy:

```bash
docker compose ps
docker compose logs postgres
```

### SSE not connecting

Check that the SSE endpoint is accessible:

```bash
curl "http://localhost:3000/api/events?organizationId=demo-org-123"
```

## Learn More

- [@agelum/backend Documentation](../../README.md)
- [Next.js Documentation](https://nextjs.org/docs)
- [Drizzle ORM](https://orm.drizzle.team)
- [tRPC](https://trpc.io)

## License

MIT
