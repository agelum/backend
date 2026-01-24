import { createReactiveRouter } from "@agelum/backend/server";
import { db } from "./db";
import {
  getUsers,
  createUser,
  updateUserName,
  deleteUser,
  createUserWithPost,
} from "./functions/users";
import {
  getPosts,
  createPost,
  updatePostTitle,
  deletePost,
} from "./functions/posts";

/**
 * Main tRPC router with reactive functions
 */
export const appRouter = createReactiveRouter({ db })
  .addQuery(getUsers)           // Creates: users.getAll (query)
  .addMutation(createUser)      // Creates: users.create (mutation)
  .addMutation(updateUserName)  // Creates: users.updateName (mutation)
  .addMutation(deleteUser)      // Creates: users.delete (mutation)
  .addMutation(createUserWithPost) // Creates: users.createWithPost (mutation)
  .addQuery(getPosts)           // Creates: posts.getAll (query)
  .addMutation(createPost)      // Creates: posts.create (mutation)
  .addMutation(updatePostTitle) // Creates: posts.updateTitle (mutation)
  .addMutation(deletePost)      // Creates: posts.delete (mutation)
  .build();                     // Don't forget .build()!

export type AppRouter = typeof appRouter;
