import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { users, posts } from "../src/server/db/schema";

const DATABASE_URL = process.env.DATABASE_URL || "postgres://postgres:postgres@localhost:5432/reactive_demo";
const DEMO_ORG_ID = process.env.DEMO_ORGANIZATION_ID || "demo-org-123";

async function seed() {
  console.log("🌱 Seeding database...");
  
  const client = postgres(DATABASE_URL);
  const db = drizzle(client);

  try {
    // Create sample users
    console.log("Creating users...");
    const createdUsers = await db.insert(users).values([
      {
        name: "Alice Johnson",
        email: "alice@example.com",
        organizationId: DEMO_ORG_ID,
      },
      {
        name: "Bob Smith",
        email: "bob@example.com",
        organizationId: DEMO_ORG_ID,
      },
      {
        name: "Charlie Davis",
        email: "charlie@example.com",
        organizationId: DEMO_ORG_ID,
      },
    ]).returning();

    console.log(`✅ Created ${createdUsers.length} users`);

    // Create sample posts
    console.log("Creating posts...");
    const createdPosts = await db.insert(posts).values([
      {
        title: "Welcome to @agelum/backend!",
        content: "This is a demo of real-time reactive queries with automatic cache invalidation.",
        authorId: createdUsers[0].id,
        organizationId: DEMO_ORG_ID,
      },
      {
        title: "Getting Started with Reactive Queries",
        content: "Learn how to use useReactive hook for instant data access with background revalidation.",
        authorId: createdUsers[1].id,
        organizationId: DEMO_ORG_ID,
      },
      {
        title: "Real-time Updates with SSE",
        content: "Server-Sent Events enable real-time cache invalidation across all connected clients.",
        authorId: createdUsers[0].id,
        organizationId: DEMO_ORG_ID,
      },
      {
        title: "Multi-tab Synchronization",
        content: "Open multiple tabs and see changes propagate instantly via SSE broadcasts.",
        authorId: createdUsers[2].id,
        organizationId: DEMO_ORG_ID,
      },
    ]).returning();

    console.log(`✅ Created ${createdPosts.length} posts`);
    console.log("🎉 Database seeded successfully!");
  } catch (error) {
    console.error("❌ Error seeding database:", error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

seed();
