import { NextRequest, NextResponse } from "next/server";
import { getJobs, insertJobs } from "@/lib/dao/JobsDao"; // adjust the import path

export async function GET() {
  try {
    const jobs = await getJobs();
    return NextResponse.json(jobs);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const jobsToInsert = Array.isArray(body) ? body : [body];

    const insertedJobs = await insertJobs(jobsToInsert);
    return NextResponse.json(insertedJobs, { status: 201 });
  } catch (error) {
    console.error("Failed to create job:", error);
    return NextResponse.json({ error: "Failed to create job"}, { status: 500 });
  }
}
