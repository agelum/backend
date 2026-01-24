import { acknowledgeEvent } from "@agelum/backend/server";
import { NextRequest, NextResponse } from "next/server";

/**
 * Event acknowledgment endpoint for reliable SSE delivery
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { eventId } = body;
    
    if (!eventId) {
      return NextResponse.json(
        { error: "Missing eventId" },
        { status: 400 }
      );
    }
    
    acknowledgeEvent(eventId);
    
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error acknowledging event:", error);
    return NextResponse.json(
      { error: "Failed to acknowledge event" },
      { status: 500 }
    );
  }
}
