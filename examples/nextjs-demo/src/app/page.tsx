import { UserList } from "@/components/UserList";
import { PostList } from "@/components/PostList";
import { CreateUserForm } from "@/components/CreateUserForm";
import { CreatePostForm } from "@/components/CreatePostForm";
import { ConnectionStatus } from "@/components/ConnectionStatus";

const ORGANIZATION_ID = process.env.DEMO_ORGANIZATION_ID || "demo-org-123";

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                @agelum/backend Demo
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                Real-time reactive database with Next.js, Drizzle, and tRPC
              </p>
            </div>
            <ConnectionStatus />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Feature Highlights */}
        <div className="mb-8 bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Demo Features
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="text-blue-500 mb-2">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">Instant Cache</h3>
              <p className="text-sm text-gray-600">
                Data appears immediately from cache, revalidates in background
              </p>
            </div>
            
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="text-green-500 mb-2">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">Real-time Sync</h3>
              <p className="text-sm text-gray-600">
                SSE broadcasts invalidations when mutations happen
              </p>
            </div>
            
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="text-purple-500 mb-2">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
                </svg>
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">Multi-tab Sync</h3>
              <p className="text-sm text-gray-600">
                Open multiple tabs and see updates in real-time
              </p>
            </div>
          </div>
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Create Forms */}
          <div className="lg:col-span-1 space-y-6">
            <CreateUserForm organizationId={ORGANIZATION_ID} />
            <CreatePostForm organizationId={ORGANIZATION_ID} />
          </div>

          {/* Right Column - Data Lists */}
          <div className="lg:col-span-2 space-y-6">
            <UserList organizationId={ORGANIZATION_ID} />
            <PostList organizationId={ORGANIZATION_ID} />
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="font-semibold text-blue-900 mb-2">
            Try it out!
          </h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>1. Create a user using the form on the left</li>
            <li>2. Watch it appear instantly in the user list (cache + SSE)</li>
            <li>3. Create a post with that user as the author</li>
            <li>4. Open this page in another tab and create a user/post there</li>
            <li>5. Watch both tabs update in real-time via SSE!</li>
          </ul>
        </div>
      </div>
    </main>
  );
}
