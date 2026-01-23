/**
 * COMPLETE USAGE EXAMPLE - @agelum/backend
 *
 * This example demonstrates the three core usage patterns:
 * 1. Define reactive functions with explicit names
 * 2. Execute functions server-side (without tRPC)
 * 3. Auto-generate tRPC procedures from functions
 */

console.log(
  "🚀 COMPLETE @agelum/backend USAGE EXAMPLE\n",
);

const {
  defineReactiveFunction,
  createReactiveRouter,
} = require("./dist/index.js");
const { z } = require("zod");

// Mock database for demonstration
const mockDb = {
  query: {
    users: {
      findMany: async (options) => [
        {
          id: "1",
          name: "Alice",
          email: "alice@test.com",
          companyId:
            options.where.companyId ||
            "comp1",
        },
        {
          id: "2",
          name: "Bob",
          email: "bob@test.com",
          companyId:
            options.where.companyId ||
            "comp1",
        },
      ],
      findFirst: async (options) => ({
        id: options.where.id,
        name: "Test User",
        email: "test@test.com",
        profile: { bio: "Test bio" },
        preferences: { theme: "dark" },
      }),
    },
  },
  insert: (table) => ({
    values: (data) => ({
      returning: () => [
        { ...data, id: "new-id" },
      ],
    }),
  }),
};

async function demonstrateUsage() {
  // ========================================
  // 1. DEFINE REACTIVE FUNCTIONS
  // ========================================

  console.log(
    "📝 1. DEFINING REACTIVE FUNCTIONS\n",
  );

  // Function 1: Get users with explicit name
  const getUsers =
    defineReactiveFunction({
      name: "users.getAll", // 🔑 This becomes cache key AND tRPC procedure name

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
        console.log(
          `  [getUsers] Fetching users for company: ${input.companyId}`,
        );
        return db.query.users.findMany({
          where: {
            companyId: input.companyId,
          },
          limit: input.limit,
        });
      },
    });

  // Function 2: Create user
  const createUser =
    defineReactiveFunction({
      name: "users.create",

      input: z.object({
        name: z.string(),
        email: z.string().email(),
        companyId: z.string(),
      }),

      dependencies: ["user"],

      handler: async (input, db) => {
        console.log(
          `  [createUser] Creating user: ${input.name}`,
        );
        return db
          .insert("users")
          .values(input)
          .returning();
      },
    });

  // Function 3: Get detailed user profile (nested name)
  const getUserProfile =
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
        console.log(
          `  [getUserProfile] Fetching profile for user: ${input.userId}`,
        );
        return db.query.users.findFirst(
          {
            where: { id: input.userId },
            with: {
              profile: true,
              preferences: true,
            },
          },
        );
      },
    });

  console.log(
    "✅ Defined 3 reactive functions with explicit names\n",
  );

  // ========================================
  // 2. SERVER-SIDE EXECUTION (Without tRPC)
  // ========================================

  console.log(
    "🖥️ 2. SERVER-SIDE EXECUTION (Without tRPC)\n",
  );

  // Use Case: API routes, background jobs, webhooks, etc.

  console.log("   API Route Example:");
  const usersFromAPI =
    await getUsers.execute(
      {
        companyId: "company-123",
        limit: 20,
      },
      mockDb,
    );
  console.log(
    `   ✅ Fetched ${usersFromAPI.length} users via API route\n`,
  );

  console.log(
    "   Background Job Example:",
  );
  const userProfile =
    await getUserProfile.execute(
      { userId: "user-456" },
      mockDb,
    );
  console.log(
    `   ✅ Fetched profile for: ${userProfile.name}\n`,
  );

  console.log("   Webhook Example:");
  const newUser =
    await createUser.execute(
      {
        name: "New User",
        email: "new@test.com",
        companyId: "company-123",
      },
      mockDb,
    );
  console.log(
    `   ✅ Created user: ${newUser[0].name} (ID: ${newUser[0].id})\n`,
  );

  // ========================================
  // 3. tRPC INTEGRATION (Auto-Generated)
  // ========================================

  console.log(
    "🔌 3. tRPC INTEGRATION (Auto-Generated)\n",
  );

  console.log(
    "   Creating tRPC router with automatic procedure naming:",
  );
  const router = createReactiveRouter({
    db: mockDb,
  })
    .addQuery(getUsers) // 🔄 Creates: users.getAll (query)
    .addMutation(createUser) // 🔄 Creates: users.create (mutation)
    .addQuery(getUserProfile); // 🔄 Creates: users.profile.getDetailed (query)

  const procedureNames =
    router.getProcedureNames();
  console.log(
    `   ✅ Auto-generated tRPC procedures: ${procedureNames.join(", ")}\n`,
  );

  // Test tRPC procedure execution
  console.log(
    "   Testing tRPC procedure execution:",
  );
  const trpcHandler =
    getUsers.getTrpcHandler(mockDb);
  const trpcResult = await trpcHandler({
    input: {
      companyId: "company-123",
      limit: 10,
    },
    ctx: {},
  });
  console.log(
    `   ✅ tRPC procedure executed: ${trpcResult.length} users\n`,
  );

  // ========================================
  // 4. DEMONSTRATE CACHE KEYS AND NAMING
  // ========================================

  console.log(
    "🏷️ 4. CACHE KEYS AND NAMING CONSISTENCY\n",
  );

  // Show how function names become cache keys
  const cacheKey1 =
    getUsers.getCacheKey({
      companyId: "test",
      limit: 50,
    });
  const cacheKey2 =
    getUserProfile.getCacheKey({
      userId: "user-123",
    });

  console.log("   Cache key examples:");
  console.log(
    `   • getUsers: "${cacheKey1}"`,
  );
  console.log(
    `   • getUserProfile: "${cacheKey2}"`,
  );

  // Show metadata
  const metadata1 =
    getUsers.getMetadata();
  const metadata2 =
    getUserProfile.getMetadata();

  console.log(
    "\n   Function metadata:",
  );
  console.log(
    `   • ${metadata1.name}: dependencies [${metadata1.dependencies.join(
      ", ",
    )}]`,
  );
  console.log(
    `   • ${metadata2.name}: dependencies [${metadata2.dependencies.join(
      ", ",
    )}]`,
  );

  // ========================================
  // 5. SUMMARY
  // ========================================

  console.log("\n🎯 SUMMARY:\n");
  console.log(
    "✅ Functions work BOTH server-side AND via tRPC",
  );
  console.log(
    "✅ Function names eliminate duplication (cache keys + tRPC procedures)",
  );
  console.log(
    "✅ Zero configuration needed for tRPC integration",
  );
  console.log(
    "✅ Type-safe with automatic procedure generation",
  );
  console.log(
    "✅ Generic design (no hardcoded organizationId)",
  );

  console.log(
    "\n📋 CLIENT USAGE (React):",
  );
  console.log("```typescript");
  console.log(
    "// Just use the function name as the tRPC procedure:",
  );
  console.log(
    "const { data } = useReactive('users.getAll', { companyId: 'test' })",
  );
  console.log(
    "const { data } = useReactive('users.profile.getDetailed', { userId: 'test' })",
  );
  console.log("```");

  console.log(
    "\n🎉 COMPLETE EXAMPLE FINISHED!",
  );
}

// Run the demonstration
demonstrateUsage().catch(console.error);
