"use client";

import { useState, useEffect } from "react";
import { useReactive } from "@agelum/backend/client";
import { trpcClient } from "@/client/trpc";

interface CreatePostFormProps {
  organizationId: string;
}

export function CreatePostForm({ organizationId }: CreatePostFormProps) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [authorId, setAuthorId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get users for the author dropdown
  const { data: users } = useReactive("users.getAll", { organizationId, limit: 50 });

  // Auto-select first user
  useEffect(() => {
    if (users && users.length > 0 && !authorId) {
      setAuthorId(users[0].id);
    }
  }, [users, authorId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title || !content || !authorId) return;
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      await trpcClient.posts.create.mutate({
        title,
        content,
        authorId,
        organizationId,
      });
      
      // Clear form on success
      setTitle("");
      setContent("");
    } catch (err: any) {
      setError(err.message || "Failed to create post");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!users || users.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Create Post</h3>
        <p className="text-sm text-gray-500">
          Create a user first to start posting!
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Create Post</h3>
      
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label htmlFor="author" className="block text-sm font-medium text-gray-700 mb-1">
            Author
          </label>
          <select
            id="author"
            value={authorId}
            onChange={(e) => setAuthorId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isSubmitting}
            required
          >
            {users.map((user: any) => (
              <option key={user.id} value={user.id}>
                {user.name}
              </option>
            ))}
          </select>
        </div>
        
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
            Title
          </label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="My awesome post"
            disabled={isSubmitting}
            required
          />
        </div>
        
        <div>
          <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-1">
            Content
          </label>
          <textarea
            id="content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Write something interesting..."
            rows={4}
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
          className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white py-2 px-4 rounded-md font-medium transition-colors"
        >
          {isSubmitting ? "Creating..." : "Create Post"}
        </button>
      </form>
    </div>
  );
}
