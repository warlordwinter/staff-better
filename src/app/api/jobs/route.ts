import { NextRequest, NextResponse } from "next/server";
import { JobsDaoSupabase } from "@/lib/dao/implementations/supabase/JobsDaoSupabase";
import { requireCompanyId } from "@/lib/auth/getCompanyId";

const jobsDao = new JobsDaoSupabase();

export async function GET() {
  try {
    const jobs = await jobsDao.getJobs();
    return NextResponse.json(jobs);
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const companyId = await requireCompanyId();
    const body = await request.json();

    console.log(
      "POST /api/jobs - Received body:",
      JSON.stringify(body, null, 2)
    );

    const jobsToInsert = Array.isArray(body) ? body : [body];

    // Add company_id to each job
    const jobsWithCompanyId = jobsToInsert.map((job) => ({
      ...job,
      company_id: companyId,
    }));

    console.log(
      "POST /api/jobs - Jobs with company_id:",
      JSON.stringify(jobsWithCompanyId, null, 2)
    );

    const insertedJobs = await jobsDao.insertJobs(jobsWithCompanyId);

    console.log(
      "POST /api/jobs - Successfully inserted jobs:",
      JSON.stringify(insertedJobs, null, 2)
    );

    return NextResponse.json(insertedJobs, { status: 201 });
  } catch (error: unknown) {
    console.error("POST /api/jobs - Failed to create job:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to create job";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
