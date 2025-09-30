import { serviceContainer } from "@/lib/services/ServiceContainer";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { phoneNumber, message } = await request.json();

    if (!phoneNumber || !message) {
      return NextResponse.json(
        { error: "Phone number and message are required" },
        { status: 400 }
      );
    }
    const messageService = serviceContainer.getIncomingMessageService();
    const result = await messageService.processIncomingMessage(
      phoneNumber,
      message
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error("Test incoming message error:", error);
    return NextResponse.json(
      {
        error: "Failed to process incoming message",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
