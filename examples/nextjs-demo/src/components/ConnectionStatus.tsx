"use client";

import { useReactiveConnection } from "@agelum/backend/client";

export function ConnectionStatus() {
  const { status, isConnected, reconnect } = useReactiveConnection();
  
  return (
    <div className="flex items-center gap-2 text-sm">
      <div className={`w-2 h-2 rounded-full ${
        isConnected ? "bg-green-500" : "bg-red-500"
      }`} />
      <span className="text-gray-600">
        SSE: {status}
      </span>
      {!isConnected && (
        <button
          onClick={reconnect}
          className="text-blue-500 hover:text-blue-600 underline"
        >
          Reconnect
        </button>
      )}
    </div>
  );
}
