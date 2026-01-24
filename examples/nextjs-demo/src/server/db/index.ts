import { createReactiveDb } from "@agelum/backend/server";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// Create postgres client
const connectionString = process.env.DATABASE_URL || "postgres://postgres:postgres@localhost:5432/reactive_demo";
const client = postgres(connectionString);

// Create Drizzle instance
const drizzleDb = drizzle(client, { schema });

// Redis URL for server-side caching
const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

// Create reactive database with relations config and Redis caching
export const db = createReactiveDb(drizzleDb, {
  relations: {
    users: ["posts"],
    posts: ["users"],
  },
  cache: {
    server: {
      provider: "redis",
      redis: {
        url: redisUrl,
      },
    },
  },
});

// Export the relations config for client use
export const reactiveRelations = {
  users: ["posts"],
  posts: ["users"],
};
