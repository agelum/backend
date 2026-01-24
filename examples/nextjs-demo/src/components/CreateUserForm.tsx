"use client";

import { useState } from "react";
import { trpcClient } from "@/client/trpc";

interface CreateUserFormProps {
  organizationId: string;
}

export function CreateUserForm({ organizationId }: CreateUserFormProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name || !email) return;
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      await trpcClient.users.create.mutate({
        name,
        email,
        organizationId,
      });
      
      // Clear form on success
      setName("");
      setEmail("");
    } catch (err: any) {
      setError(err.message || "Failed to create user");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Create User</h3>
      
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
            Name
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="John Doe"
            disabled={isSubmitting}
            required
          />
        </div>
        
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="john@example.com"
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
          {isSubmitting ? "Creating..." : "Create User"}
        </button>
      </form>
    </div>
  );
}
