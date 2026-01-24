"use client";

import { useReactive } from "@agelum/backend/client";

interface UserListProps {
  organizationId: string;
}

export function UserList({ organizationId }: UserListProps) {
  const { data: users, isLoading, isStale, error, refetch } = useReactive(
    "users.getAll",
    { organizationId, limit: 50 }
  );

  if (isLoading && !users) {
    return (
      <div className="p-4 bg-white rounded-lg shadow">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-12 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-700">Error loading users: {error.message}</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Users</h2>
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
        {users && users.length > 0 ? (
          users.map((user: any) => (
            <div key={user.id} className="px-4 py-3 hover:bg-gray-50">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">{user.name}</p>
                  <p className="text-sm text-gray-500">{user.email}</p>
                </div>
                <div className="text-xs text-gray-400">
                  {new Date(user.createdAt).toLocaleDateString()}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="px-4 py-8 text-center text-gray-500">
            No users found. Create one to get started!
          </div>
        )}
      </div>
    </div>
  );
}
