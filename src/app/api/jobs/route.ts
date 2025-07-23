import { NextResponse } from "next/server";
import { getJobs } from "@/lib/dao/JobsDao"; // adjust the import path

export async function GET() {
  try {
    const jobs = await getJobs();
    return NextResponse.json(jobs);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
