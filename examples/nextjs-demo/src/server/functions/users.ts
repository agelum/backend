import { defineReactiveFunction } from "@agelum/backend/server";
import { z } from "zod";
import { users } from "../db/schema";
import { eq } from "drizzle-orm";

/**
 * Get all users for an organization
 */
export const getUsers = defineReactiveFunction({
  name: "users.getAll",

  input: z.object({
    organizationId: z.string(),
    limit: z.number().optional().default(50),
  }),

  dependencies: ["users"],

  handler: async ({ input, db }) => {
    return db.db.query.users.findMany({
      where: eq(users.organizationId, input.organizationId),
      limit: input.limit,
      orderBy: (users, { desc }) => [desc(users.createdAt)],
    });
  },
});

/**
 * Create a new user
 */
export const createUser = defineReactiveFunction({
  name: "users.create",

  input: z.object({
    name: z.string().min(1),
    email: z.string().email(),
    organizationId: z.string(),
  }),

  dependencies: ["users"],

  handler: async ({ input, db }) => {
    const result = await db.db.insert(users).values(input).returning();
    return result[0];
  },
});
