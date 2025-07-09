import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    const { headers } = await req.json();

    const prompt = `
You are an assistant that helps match spreadsheet columns to a staffing agency database.
Here are the possible fields for Jobs: job_title, customer_name, job_status, start_date.
Here are the possible fields for Associates: first_name, last_name, work_date, start_time, phone_number, email_address.

Given these spreadsheet columns:
${headers.map((h: string) => `"${h}"`).join(", ")}

Return a JSON object that maps each spreadsheet column to the most likely target field. If there is no clear match, return "unknown" as the value.
Example format:
{
  "SpreadsheetColumn1": "target_field",
  "SpreadsheetColumn2": "unknown"
}
    `;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.1,
    });

    const content = completion.choices[0]?.message.content || "";
    let jsonString = content;

    // Remove code block markers if present
    const codeBlockMatch = content.match(/```json([\s\S]*?)```/);
    if (codeBlockMatch) {
      jsonString = codeBlockMatch[1].trim();
    }

    let mapping;
    try {
      mapping = JSON.parse(jsonString);
    } catch (error) {
      mapping = { error: "Failed to parse response", raw: content };
      console.log(error);
    }

    return NextResponse.json(mapping);
  } catch (error) {
        // error is 'unknown', so you need to check type before using error.message
        if (error instanceof Error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        } else {
            return NextResponse.json({ error: "Unknown error" }, { status: 500 });
        }
    }
}
