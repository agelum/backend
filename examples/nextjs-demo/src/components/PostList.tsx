"use client";

import { useReactive } from "@agelum/backend/client";

interface PostListProps {
  organizationId: string;
}

export function PostList({ organizationId }: PostListProps) {
  const { data: posts, isLoading, isStale, error, refetch } = useReactive(
    "posts.getAll",
    { organizationId, limit: 50 }
  );

  if (isLoading && !posts) {
    return (
      <div className="p-4 bg-white rounded-lg shadow">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-700">Error loading posts: {error.message}</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Posts</h2>
        <div className="flex items-center gap-2">
          {isStale && (
            <span className="text-xs text-orange-500 font-medium">
              Syncing...
            </span>
          )}
          <button
            onClick={refetch}
            className="text-sm text-blue-500 hover:text-blue-600"
          >
            Refresh
          </button>
        </div>
      </div>
      
      <div className="divide-y divide-gray-200">
        {posts && posts.length > 0 ? (
          posts.map((post: any) => (
            <div key={post.id} className="px-4 py-4 hover:bg-gray-50">
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-semibold text-gray-900">{post.title}</h3>
                <div className="text-xs text-gray-400">
                  {new Date(post.createdAt).toLocaleDateString()}
                </div>
              </div>
              <p className="text-sm text-gray-600 mb-2">{post.content}</p>
              <p className="text-xs text-gray-500">
                by {post.author?.name || "Unknown"}
              </p>
            </div>
          ))
        ) : (
          <div className="px-4 py-8 text-center text-gray-500">
            No posts found. Create one to get started!
          </div>
        )}
      </div>
    </div>
  );
}
