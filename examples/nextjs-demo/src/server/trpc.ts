import { createReactiveRouter } from "@agelum/backend/server";
import { db } from "./db";
import { getUsers, createUser } from "./functions/users";
import { getPosts, createPost } from "./functions/posts";

/**
 * Main tRPC router with reactive functions
 */
export const appRouter = createReactiveRouter({ db })
  .addQuery(getUsers)           // Creates: users.getAll (query)
  .addMutation(createUser)      // Creates: users.create (mutation)
  .addQuery(getPosts)           // Creates: posts.getAll (query)
  .addMutation(createPost)      // Creates: posts.create (mutation)
  .build();                     // Don't forget .build()!

export type AppRouter = typeof appRouter;
