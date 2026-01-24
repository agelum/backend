import { createSSEStream } from "@agelum/backend/server";
import { NextRequest } from "next/server";

/**
 * Server-Sent Events (SSE) endpoint for real-time cache invalidation
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const organizationId = searchParams.get("organizationId");
  
  if (!organizationId) {
    return new Response("Missing organizationId parameter", { status: 400 });
  }
  
  return createSSEStream(organizationId);
}
