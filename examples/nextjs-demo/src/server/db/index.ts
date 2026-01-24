import { createReactiveDb } from "@agelum/backend/server";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// Create postgres client
const connectionString = process.env.DATABASE_URL || "postgres://postgres:postgres@localhost:5432/reactive_demo";
const client = postgres(connectionString);

// Create Drizzle instance
const drizzleDb = drizzle(client, { schema });

// Create reactive database with relations config
export const db = createReactiveDb(drizzleDb, {
  relations: {
    users: ["posts"],
    posts: ["users"],
  },
});

// Export the relations config for client use
export const reactiveRelations = {
  users: ["posts"],
  posts: ["users"],
};
