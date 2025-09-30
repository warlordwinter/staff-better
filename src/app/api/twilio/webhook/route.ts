import { serviceContainer } from "@/lib/services/ServiceContainer";
import { NextRequest, NextResponse } from "next/server";

const messageService = serviceContainer.getIncomingMessageService();

export async function POST(request: NextRequest) {
  try {
    const body = await request.formData();
    const fromNumber = body.get("From") as string;
    const messageBody = body.get("Body") as string;

    console.log("Received Twilio webhook:", {
      from: fromNumber,
      body: messageBody,
      timestamp: new Date().toISOString(),
    });

    if (!fromNumber || !messageBody) {
      console.error("Missing required fields:", { fromNumber, messageBody });
      return new NextResponse(
        '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
        {
          status: 400,
          headers: { "Content-Type": "text/xml" },
        }
      );
    }

    const result = await messageService.processIncomingMessage(
      fromNumber,
      messageBody
    );

    console.log("Message processing result:", result);

    return new NextResponse(
      '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
      {
        status: 200,
        headers: { "Content-Type": "text/xml" },
      }
    );
  } catch (error) {
    console.error("Error in Twilio webhook handler:", error);

    return new NextResponse(
      '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
      {
        status: 200,
        headers: { "Content-Type": "text/xml" },
      }
    );
  }
}
