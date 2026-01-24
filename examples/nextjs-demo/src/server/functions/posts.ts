import { defineReactiveFunction } from "@agelum/backend/server";
import { z } from "zod";
import { posts } from "../db/schema";
import { eq } from "drizzle-orm";

/**
 * Get all posts for an organization with author info
 */
export const getPosts = defineReactiveFunction({
  name: "posts.getAll",
  
  input: z.object({
    organizationId: z.string(),
    limit: z.number().optional().default(50),
  }),
  
  dependencies: ["posts", "users"],
  
  handler: async ({ input, db }) => {
    return db.db.query.posts.findMany({
      where: eq(posts.organizationId, input.organizationId),
      limit: input.limit,
      orderBy: (posts, { desc }) => [desc(posts.createdAt)],
      with: {
        author: true,
      },
    });
  },
});

/**
 * Create a new post
 */
export const createPost = defineReactiveFunction({
  name: "posts.create",
  
  input: z.object({
    title: z.string().min(1),
    content: z.string().min(1),
    authorId: z.string().uuid(),
    organizationId: z.string(),
  }),
  
  dependencies: ["posts"],
  
  handler: async ({ input, db }) => {
    const result = await db.db.insert(posts).values(input).returning();
    return result[0];
  },
});
