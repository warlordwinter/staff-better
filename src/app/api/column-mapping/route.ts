import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

export async function POST(req: NextRequest) {
  try {
    const { headers } = await req.json();

    const prompt = `
        
          You are an assistant that helps match spreadsheet columns to a staffing agency database.
          Here are the possible fields for Jobs: job_title, customer_name, start_date.
          Here are the possible fields for Associates: first_name, last_name, work_date, start_time, phone_number, email_address.

          Given these spreadsheet columns:
          ${headers.map((h: string) => `"${h}"`).join(", ")}

          Return a JSON object where each key is a database field and each value is the name of the spreadsheet column that most likely maps to it. If there is no clear match, return "unknown" as the value.
          `;

    const genAI = new GoogleGenAI({});
    const response = await genAI.models.generateContent({
      model: "gemini-2.5-flash-lite",
      contents: prompt,
    });

    const jsonText =
      response.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

    if (!jsonText) {
      throw new Error("No AI response text");
    }

    // Handle markdown-wrapped JSON
    const match = jsonText.match(/```json([\s\S]*?)```/);
    const cleanJson = match ? match[1].trim() : jsonText;

    let mapping;
    try {
      mapping = JSON.parse(cleanJson);
    } catch {
      throw new Error("Failed to parse AI JSON output:\n" + cleanJson);
    }

    // The AI should handle the mapping - we just return what it gives us
    // Fallback data generation happens in the data transformation step

    return NextResponse.json(mapping);
  } catch (error: any) {
    console.error("Column Mapping Error:", error);
    return NextResponse.json(
      { error: error.message || "Unknown error" },
      { status: 500 }
    );
  }
}
