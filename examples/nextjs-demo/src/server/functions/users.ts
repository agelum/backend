import { defineReactiveFunction } from "@agelum/backend/server";
import { z } from "zod";
import { posts, users } from "../db/schema";
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

/**
 * Update a user's name
 */
export const updateUserName = defineReactiveFunction({
  name: "users.updateName",

  input: z.object({
    id: z.string().uuid(),
    name: z.string().min(1),
  }),

  dependencies: ["users"],

  handler: async ({ input, db }) => {
    const result = await db.db
      .update(users)
      .set({ name: input.name })
      .where(eq(users.id, input.id))
      .returning();
    return result[0];
  },
});

/**
 * Delete a user by id
 */
export const deleteUser = defineReactiveFunction({
  name: "users.delete",

  input: z.object({
    id: z.string().uuid(),
  }),

  dependencies: ["users"],

  handler: async ({ input, db }) => {
    const result = await db.db
      .delete(users)
      .where(eq(users.id, input.id))
      .returning();
    return result[0];
  },
});

/**
 * Create a user and their first post in a transaction
 */
export const createUserWithPost = defineReactiveFunction({
  name: "users.createWithPost",

  input: z.object({
    name: z.string().min(1),
    email: z.string().email(),
    organizationId: z.string(),
    postTitle: z.string().min(1),
    postContent: z.string().min(1),
  }),

  dependencies: ["users", "posts"],

  transaction: {
    enabled: true,
  },

  handler: async ({ input, db }) => {
    const createdUser = await db.db
      .insert(users)
      .values({
        name: input.name,
        email: input.email,
        organizationId: input.organizationId,
      })
      .returning();

    const user = createdUser[0];
    const createdPost = await db.db
      .insert(posts)
      .values({
        title: input.postTitle,
        content: input.postContent,
        authorId: user.id,
        organizationId: input.organizationId,
      })
      .returning();

    return {
      user,
      post: createdPost[0],
    };
  },
});
