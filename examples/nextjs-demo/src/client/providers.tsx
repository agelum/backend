"use client";

import React from "react";
import { TrpcReactiveProvider } from "@agelum/backend/client";
import { trpcClient } from "./trpc";

interface ProvidersProps {
  children: React.ReactNode;
  organizationId: string;
}

// Relations config for client-side cache invalidation
const reactiveRelations = {
  users: ["posts"],
  posts: ["users"],
};

/**
 * Client-side providers for reactive features
 */
export function Providers({ children, organizationId }: ProvidersProps) {
  return (
    <TrpcReactiveProvider
      organizationId={organizationId}
      relations={reactiveRelations}
      trpcClient={trpcClient}
    >
      {children}
    </TrpcReactiveProvider>
  );
}
