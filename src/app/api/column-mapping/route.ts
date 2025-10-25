import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(req: NextRequest) {
  try {
    const { headers } = await req.json();

    const prompt = `
You are an assistant that helps match spreadsheet columns to a staffing agency database.
Here are the possible fields for Jobs: job_title, customer_name, start_date.
Here are the possible fields for Associates: first_name, last_name, work_date, start_time, phone_number, email_address.

Given these spreadsheet columns:
${headers.map((h: string) => `"${h}"`).join(", ")}

Return a JSON object where each key is a database field and each value is the name of the spreadsheet column that most likely maps to it. 
If there is no clear match, return "unknown" as the value.
`;

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" }); // this is broken fix it soon
    const result = await model.generateContent(prompt);
    const response = await result.response;
    let jsonString = response.text();

    // Handle markdown code blocks if the AI wraps the JSON
    const codeBlockMatch = jsonString.match(/```json([\s\S]*?)```/);
    if (codeBlockMatch) {
      jsonString = codeBlockMatch[1].trim();
    }

    let mapping;
    try {
      mapping = JSON.parse(jsonString);
    } catch (error) {
      mapping = { error: "Failed to parse response", raw: jsonString };
      console.error(error);
    }

    return NextResponse.json(mapping);
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    } else {
      return NextResponse.json({ error: "Unknown error" }, { status: 500 });
    }
  }
}
