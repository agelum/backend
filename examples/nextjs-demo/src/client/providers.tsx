"use client";

import React from "react";
import { TrpcReactiveProvider } from "@agelum/backend/client";
import { trpcClient } from "./trpc";
import { reactiveRelations } from "@/server/db";

interface ProvidersProps {
  children: React.ReactNode;
  organizationId: string;
}

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
