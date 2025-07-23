// src/app/api/insert-rows/route.ts
import { NextRequest, NextResponse } from "next/server";
import { insertJobs } from "@/lib/dao/JobsDao";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const rows = body.rows;

  try {
    const jobData = rows.map((r: any) => ({
      job_title: r.job_title,
      customer_name: r.customer_name,
      job_status: "Upcoming",
      start_date: r.start_date,
    }));

    console.log("Sending to Supabase:", jobData);

    const inserted = await insertJobs(jobData);
    return NextResponse.json(inserted);
  } catch (err: any) {
    let parsedError = err;

    try {
      parsedError = JSON.parse(err.message);
    } catch {}

    console.error("Insert failed:", parsedError);

    return NextResponse.json(
      {
        error: "Insert failed",
        ...parsedError,
      },
      { status: 500 }
    );
  }
}


