import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

const retryWithBackoff = async <T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> => {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      const isRetryable =
        error?.status === 503 ||
        error?.status === 429 ||
        error?.code === "UNAVAILABLE" ||
        error?.message?.includes("overloaded") ||
        error?.message?.includes("rate limit");
      if (!isRetryable || attempt === maxRetries - 1) throw error;
      await new Promise((resolve) =>
        setTimeout(resolve, baseDelay * Math.pow(2, attempt))
      );
    }
  }
  throw new Error("Max retries exceeded");
};

export async function POST(req: NextRequest) {
  try {
    const { headers } = await req.json();
    if (!headers || !Array.isArray(headers) || headers.length === 0) {
      return NextResponse.json(
        { error: "Headers array is required" },
        { status: 400 }
      );
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY not configured" },
        { status: 500 }
      );
    }

    const prompt = `You are an assistant that matches spreadsheet columns to database fields.

Database schema:
- Associates: first_name, last_name, phone_number (required), email_address
- Jobs: job_title, customer_name, start_date, start_time

IMPORTANT: The system accepts EITHER:
1. A single "name" column - map to "name" field (set first_name and last_name to "unknown")
2. Separate "First Name" and "Last Name" columns - map to first_name and last_name (set "name" to "unknown")

Spreadsheet columns:
${headers.map((h: string, i: number) => `${i + 1}. "${h}"`).join("\n")}

Return ONLY a valid JSON object (no markdown) where:
- Each key is a database field (name, first_name, last_name, phone_number, email_address, job_title, customer_name, start_date, start_time)
- Each value is the exact spreadsheet column name or "unknown"
- Always include all fields

Example (single name):
{"name": "Name", "phone_number": "Phone", "email_address": "Email", "first_name": "unknown", "last_name": "unknown", "job_title": "unknown", "customer_name": "unknown", "start_date": "unknown", "start_time": "unknown"}

Example (separate names):
{"first_name": "First Name", "last_name": "Last Name", "phone_number": "Phone", "email_address": "Email", "name": "unknown", "job_title": "unknown", "customer_name": "unknown", "start_date": "unknown", "start_time": "unknown"}

Return the JSON now:`;

    const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const response = await retryWithBackoff(async () => {
      return await genAI.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
      });
    });

    const jsonText = response.text?.trim();
    if (!jsonText) {
      return NextResponse.json(
        { error: "AI returned empty response" },
        { status: 500 }
      );
    }

    let cleanJson = jsonText;
    // Handle case where response is a JSON string (with escaped quotes)
    if (cleanJson.startsWith('"') && cleanJson.endsWith('"')) {
      try {
        cleanJson = JSON.parse(cleanJson);
      } catch {
        // If parsing fails, continue with original extraction logic
      }
    }
    // Handle markdown code blocks
    const jsonMatch =
      typeof cleanJson === "string"
        ? cleanJson.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
        : null;
    if (jsonMatch) cleanJson = jsonMatch[1].trim();
    // Extract JSON object from text if still a string
    if (typeof cleanJson === "string") {
      const jsonObjectMatch = cleanJson.match(/\{[\s\S]*\}/);
      if (jsonObjectMatch) cleanJson = jsonObjectMatch[0];
    }

    const mapping =
      typeof cleanJson === "string" ? JSON.parse(cleanJson) : cleanJson;

    const validatedMapping: Record<string, string> = {};
    for (const [dbField, columnName] of Object.entries(mapping)) {
      if (
        typeof columnName === "string" &&
        (headers.includes(columnName) || columnName === "unknown")
      ) {
        validatedMapping[dbField] = columnName;
      }
    }

    return NextResponse.json(validatedMapping);
  } catch (error: any) {
    console.error("Column Mapping Error:", error);
    return NextResponse.json(
      { error: error.message || "Unknown error" },
      { status: 500 }
    );
  }
}
