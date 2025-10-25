import { serviceContainer } from "@/lib/services/ServiceContainer";
import { NextRequest, NextResponse } from "next/server";

const messageService = serviceContainer.getIncomingMessageService();

export async function POST(request: NextRequest) {
  try {
    const body = await request.formData();
    const fromNumber = body.get("From") as string;
    const messageBody = body.get("Body") as string;

    // Try alternative field names if the standard ones are missing
    const altFromNumber =
      fromNumber ||
      (body.get("from") as string) ||
      (body.get("FROM") as string);
    const altMessageBody =
      messageBody ||
      (body.get("body") as string) ||
      (body.get("BODY") as string);

    // Debug: Log all form data keys and values
    console.log("All form data keys:", Array.from(body.keys()));
    console.log("All form data entries:", Array.from(body.entries()));
    console.log("Received Twilio webhook:", {
      from: fromNumber,
      body: messageBody,
      timestamp: new Date().toISOString(),
    });

    // Use alternative field names if standard ones are missing
    const finalFromNumber = fromNumber || altFromNumber;
    const finalMessageBody = messageBody || altMessageBody;

    if (!finalFromNumber || !finalMessageBody) {
      console.error("Missing required fields:", {
        fromNumber: finalFromNumber,
        messageBody: finalMessageBody,
        allKeys: Array.from(body.keys()),
        allEntries: Array.from(body.entries()),
      });
      return new NextResponse(
        '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
        {
          status: 400,
          headers: { "Content-Type": "text/xml" },
        }
      );
    }

    const result = await messageService.processIncomingMessage(
      finalFromNumber,
      finalMessageBody
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
