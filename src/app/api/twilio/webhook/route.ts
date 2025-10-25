import { serviceContainer } from "@/lib/services/ServiceContainer";
import { NextRequest, NextResponse } from "next/server";

const messageService = serviceContainer.getIncomingMessageService();

export async function POST(request: NextRequest) {
  console.log("=== WEBHOOK HIT ===");
  console.log("Timestamp:", new Date().toISOString());
  console.log("Request URL:", request.url);
  console.log("Request method:", request.method);

  // Simple test - if no data, return success to avoid 400 errors
  const url = new URL(request.url);
  if (url.searchParams.get("test") === "true") {
    console.log("Test webhook hit - returning success");
    return new NextResponse(
      '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
      {
        status: 200,
        headers: { "Content-Type": "text/xml" },
      }
    );
  }

  try {
    // Debug: Log request headers and content type
    console.log(
      "Request headers:",
      Object.fromEntries(request.headers.entries())
    );
    console.log("Content-Type:", request.headers.get("content-type"));

    let fromNumber: string | null = null;
    let messageBody: string | null = null;

    const contentType = request.headers.get("content-type");

    if (contentType?.includes("application/x-www-form-urlencoded")) {
      // Handle form data
      const body = await request.formData();
      fromNumber = body.get("From") as string;
      messageBody = body.get("Body") as string;

      console.log("Form data keys:", Array.from(body.keys()));
      console.log("Form data entries:", Array.from(body.entries()));
    } else if (contentType?.includes("application/json")) {
      // Handle JSON data
      const body = await request.json();
      fromNumber = body.From || body.from;
      messageBody = body.Body || body.body;

      console.log("JSON data:", body);
    } else {
      // Try to parse as form data anyway
      try {
        const body = await request.formData();
        fromNumber = body.get("From") as string;
        messageBody = body.get("Body") as string;
        console.log("Fallback form data keys:", Array.from(body.keys()));
      } catch (error) {
        console.error("Failed to parse form data:", error);
      }
    }

    console.log("Parsed values:", { fromNumber, messageBody });

    if (!fromNumber || !messageBody) {
      console.error("Missing required fields:", {
        fromNumber: fromNumber,
        messageBody: messageBody,
        contentType: contentType,
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
