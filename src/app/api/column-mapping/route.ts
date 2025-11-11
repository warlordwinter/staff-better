import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

// Fallback rule-based column mapping
function fallbackColumnMapping(headers: string[]): Record<string, string> {
  const mapping: Record<string, string> = {};

  // Associate fields
  const nameVariations = [
    "name",
    "full name",
    "fullname",
    "full_name",
    "employee name",
    "employee_name",
  ];
  const firstNameVariations = [
    "first name",
    "firstname",
    "first_name",
    "fname",
    "given name",
    "first",
  ];
  const lastNameVariations = [
    "last name",
    "lastname",
    "last_name",
    "lname",
    "surname",
    "family name",
    "last",
  ];
  const phoneVariations = [
    "phone",
    "phone number",
    "phonenumber",
    "phone_number",
    "mobile",
    "cell",
    "telephone",
    "tel",
  ];
  const emailVariations = [
    "email",
    "email address",
    "emailaddress",
    "email_address",
    "e-mail",
    "mail",
  ];

  // Job fields
  const jobTitleVariations = [
    "job title",
    "jobtitle",
    "job_title",
    "position",
    "role",
    "title",
  ];
  const customerNameVariations = [
    "customer name",
    "customername",
    "customer_name",
    "client",
    "client name",
    "company",
  ];
  const startDateVariations = [
    "start date",
    "startdate",
    "start_date",
    "date",
    "work date",
    "work_date",
  ];
  const startTimeVariations = [
    "start time",
    "starttime",
    "start_time",
    "time",
    "work time",
    "work_time",
  ];

  // Find matches - check for "name" first (single column), then separate first/last
  headers.forEach((header) => {
    const normalized = header.toLowerCase().trim();

    if (
      nameVariations.some((v) => normalized === v || normalized.includes(v))
    ) {
      // Single "name" column maps to both first_name and last_name
      mapping["name"] = header;
    } else if (firstNameVariations.some((v) => normalized.includes(v))) {
      mapping["first_name"] = header;
    } else if (lastNameVariations.some((v) => normalized.includes(v))) {
      mapping["last_name"] = header;
    } else if (phoneVariations.some((v) => normalized.includes(v))) {
      mapping["phone_number"] = header;
    } else if (emailVariations.some((v) => normalized.includes(v))) {
      mapping["email_address"] = header;
    } else if (jobTitleVariations.some((v) => normalized.includes(v))) {
      mapping["job_title"] = header;
    } else if (customerNameVariations.some((v) => normalized.includes(v))) {
      mapping["customer_name"] = header;
    } else if (startDateVariations.some((v) => normalized.includes(v))) {
      mapping["start_date"] = header;
    } else if (startTimeVariations.some((v) => normalized.includes(v))) {
      mapping["start_time"] = header;
    }
  });

  return mapping;
}

export async function POST(req: NextRequest) {
  console.log("=".repeat(50));
  console.log("🚨 COLUMN-MAPPING ROUTE CALLED!");
  console.log("=".repeat(50));

  try {
    const { headers } = await req.json();
    console.log("📦 Request body parsed. Headers:", headers);

    if (!headers || !Array.isArray(headers) || headers.length === 0) {
      console.error("❌ Invalid headers:", headers);
      return NextResponse.json(
        { error: "Headers array is required" },
        { status: 400 }
      );
    }

    // Try AI mapping first
    console.log("🤖 Attempting AI column mapping...");
    console.log("📋 Headers received:", headers);

    // Retry helper function for transient errors
    const retryWithBackoff = async <T>(
      fn: () => Promise<T>,
      maxRetries: number = 3,
      baseDelay: number = 1000
    ): Promise<T> => {
      let lastError: any;
      for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
          return await fn();
        } catch (error: any) {
          lastError = error;
          // Check if it's a retryable error (503, 429, or network errors)
          const isRetryable =
            error?.status === 503 ||
            error?.status === 429 ||
            error?.code === "UNAVAILABLE" ||
            error?.message?.includes("overloaded") ||
            error?.message?.includes("rate limit");

          if (!isRetryable || attempt === maxRetries - 1) {
            throw error;
          }

          const delay = baseDelay * Math.pow(2, attempt);
          console.log(
            `⚠️ Retryable error (attempt ${
              attempt + 1
            }/${maxRetries}), retrying in ${delay}ms...`
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
      throw lastError;
    };

    try {
      const prompt = `You are an assistant that matches spreadsheet columns to database fields.

Database schema (from database.types.ts):
- Associates table: first_name (string | null), last_name (string | null), phone_number (string, required), email_address (string | null), company_id (string | null)
- Jobs table: job_title (string | null), customer_name (string, required), start_date (string | null), start_time (string | null)

IMPORTANT: The system accepts EITHER:
1. A single "name" column (like "Name" or "Full Name") - map this to the "name" field, which will be split into first_name and last_name
2. Separate "First Name" and "Last Name" columns - map these directly to first_name and last_name fields

Mapping rules:
- If you see a single column like "Name" or "Full Name", map it to "name" field (set first_name and last_name to "unknown")
- If you see separate "First Name" and "Last Name" columns, map them to first_name and last_name respectively (set "name" to "unknown")
- phone_number is required in the database, so prioritize matching phone-related columns
- email_address should match email-related columns
- job_title, customer_name, start_date, and start_time are for job assignments

Spreadsheet columns to match:
${headers.map((h: string, i: number) => `${i + 1}. "${h}"`).join("\n")}

Return ONLY a valid JSON object (no markdown, no explanation) where:
- Each key is a database field name (name, first_name, last_name, phone_number, email_address, job_title, customer_name, start_date, start_time)
- Each value is the exact spreadsheet column name that matches it
- Use "unknown" if no match exists
- Always include all fields in your response

Example format (with single name column):
{
  "name": "Name",
  "phone_number": "Phone",
  "email_address": "Email",
  "first_name": "unknown",
  "last_name": "unknown",
  "job_title": "unknown",
  "customer_name": "unknown",
  "start_date": "unknown",
  "start_time": "unknown"
}

Example format (with separate first/last name columns):
{
  "first_name": "First Name",
  "last_name": "Last Name",
  "phone_number": "Phone",
  "email_address": "Email",
  "name": "unknown",
  "job_title": "unknown",
  "customer_name": "unknown",
  "start_date": "unknown",
  "start_time": "unknown"
}

Return the JSON now:`;

      console.log("🔑 GEMINI_API_KEY present:", !!process.env.GEMINI_API_KEY);

      if (!process.env.GEMINI_API_KEY) {
        console.warn("⚠️ GEMINI_API_KEY not found, skipping AI mapping");
        throw new Error("GEMINI_API_KEY not configured");
      }

      const genAI = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
      });

      console.log("📡 Calling Gemini API...");

      const response = await retryWithBackoff(async () => {
        return await genAI.models.generateContent({
          model: "gemini-2.5-flash",
          contents: prompt,
        });
      });

      console.log("✅ AI response received");
      const jsonText = response.text?.trim();
      console.log("📝 AI response text length:", jsonText?.length || 0);

      if (jsonText) {
        // Handle markdown-wrapped JSON
        let cleanJson = jsonText;
        const jsonMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        if (jsonMatch) {
          cleanJson = jsonMatch[1].trim();
        }

        // Try to extract JSON from text if it's embedded
        const jsonObjectMatch = cleanJson.match(/\{[\s\S]*\}/);
        if (jsonObjectMatch) {
          cleanJson = jsonObjectMatch[0];
        }

        try {
          const mapping = JSON.parse(cleanJson);
          // Validate that mapping values are actual headers
          const validatedMapping: Record<string, string> = {};
          for (const [dbField, columnName] of Object.entries(mapping)) {
            if (
              typeof columnName === "string" &&
              (headers.includes(columnName) || columnName === "unknown")
            ) {
              validatedMapping[dbField] = columnName;
            }
          }

          // Quality check: if we have "First Name" and "Last Name" columns but mapping shows name: "unknown",
          // the AI made a poor mapping - fall back to rule-based
          const hasFirstName = headers.some((h) => /first\s*name/i.test(h));
          const hasLastName = headers.some((h) => /last\s*name/i.test(h));
          const hasNameColumn = headers.some((h) =>
            /^(name|full\s*name)$/i.test(h.trim())
          );

          if (
            hasFirstName &&
            hasLastName &&
            validatedMapping.name === "unknown" &&
            (validatedMapping.first_name === "unknown" ||
              validatedMapping.last_name === "unknown")
          ) {
            console.warn(
              "⚠️ AI mapping quality check failed - detected First/Last Name columns but mapping is poor, using fallback"
            );
            throw new Error("Poor mapping quality");
          }

          console.log("✅ AI mapping successful:", validatedMapping);
          return NextResponse.json(validatedMapping);
        } catch (parseError) {
          console.error("❌ AI response parsing failed:", parseError);
          console.error("Raw AI response:", jsonText);
          // Fall through to fallback
        }
      } else {
        console.warn("⚠️ AI returned empty response");
      }
    } catch (aiError: any) {
      console.error("❌ AI mapping failed:", aiError.message);
      if (aiError.status || aiError.code) {
        console.error("Error status/code:", aiError.status || aiError.code);
      }
      // Fall through to fallback
    }

    // Fallback to rule-based mapping
    console.log("🔄 Using fallback rule-based mapping");
    const fallbackMapping = fallbackColumnMapping(headers);
    console.log("📊 Fallback mapping result:", fallbackMapping);
    return NextResponse.json(fallbackMapping);
  } catch (error: any) {
    console.error("Column Mapping Error:", error);
    return NextResponse.json(
      { error: error.message || "Unknown error" },
      { status: 500 }
    );
  }
}
