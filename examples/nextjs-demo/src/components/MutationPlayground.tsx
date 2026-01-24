"use client";

import { useState } from "react";
import { trpcClient } from "@/client/trpc";

interface MutationPlaygroundProps {
  organizationId: string;
}

export function MutationPlayground({
  organizationId,
}: MutationPlaygroundProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [postTitle, setPostTitle] = useState("");
  const [postContent, setPostContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name || !email || !postTitle || !postContent) return;

    setIsSubmitting(true);
    setError(null);

    try {
      await trpcClient.users.createWithPost.mutate({
        name,
        email,
        organizationId,
        postTitle,
        postContent,
      });

      setName("");
      setEmail("");
      setPostTitle("");
      setPostContent("");
    } catch (err: any) {
      setError(err.message || "Failed to create user + post");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        Transaction Demo
      </h3>
      <p className="text-sm text-gray-500 mb-4">
        Creates a user and their first post in a single transaction.
      </p>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label htmlFor="tx-name" className="block text-sm font-medium text-gray-700 mb-1">
            User name
          </label>
          <input
            id="tx-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Jane Doe"
            disabled={isSubmitting}
            required
          />
        </div>

        <div>
          <label htmlFor="tx-email" className="block text-sm font-medium text-gray-700 mb-1">
            User email
          </label>
          <input
            id="tx-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="jane@example.com"
            disabled={isSubmitting}
            required
          />
        </div>

        <div>
          <label htmlFor="tx-title" className="block text-sm font-medium text-gray-700 mb-1">
            Post title
          </label>
          <input
            id="tx-title"
            type="text"
            value={postTitle}
            onChange={(e) => setPostTitle(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Hello from a transaction"
            disabled={isSubmitting}
            required
          />
        </div>

        <div>
          <label htmlFor="tx-content" className="block text-sm font-medium text-gray-700 mb-1">
            Post content
          </label>
          <textarea
            id="tx-content"
            value={postContent}
            onChange={(e) => setPostContent(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="This tests transactional inserts."
            rows={3}
            disabled={isSubmitting}
            required
          />
        </div>

        {error && (
          <div className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-indigo-500 hover:bg-indigo-600 disabled:bg-indigo-300 text-white py-2 px-4 rounded-md font-medium transition-colors"
        >
          {isSubmitting ? "Creating..." : "Create User + Post"}
        </button>
      </form>
    </div>
  );
}
