"use client";

import { useEffect, useState } from "react";

export function ConnectionStatus() {
  const [status, setStatus] = useState<string>("connecting");
  const [isConnected, setIsConnected] = useState(false);
  
  useEffect(() => {
    // Access the reactive client manager exposed by the library
    const checkConnection = () => {
      const manager = (window as any).__reactiveClient__;
      if (manager?.sseClient) {
        const connected = manager.sseClient.isConnected();
        setIsConnected(connected);
        setStatus(connected ? "connected" : "disconnected");
      }
    };
    
    checkConnection();
    const interval = setInterval(checkConnection, 1000);
    return () => clearInterval(interval);
  }, []);
  
  return (
    <div className="flex items-center gap-2 text-sm">
      <div className={`w-2 h-2 rounded-full ${
        isConnected ? "bg-green-500" : "bg-red-500"
      }`} />
      <span className="text-gray-600">
        SSE: {status}
      </span>
    </div>
  );
}
