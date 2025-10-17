import { NextRequest, NextResponse } from "next/server";
import { JobsDaoSupabase } from "@/lib/dao/implementations/supabase/JobsDaoSupabase";
import { CompaniesDaoSupabase } from "@/lib/dao/implementations/supabase/CompaniesDaoSupabase";
import { createClient } from "@/lib/supabase/server";

const jobsDao = new JobsDaoSupabase();
const companiesDao = new CompaniesDaoSupabase();

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Get the user's company
    const company = await companiesDao.getCompanyByManagerId(user.id);

    if (!company) {
      return NextResponse.json({ error: "No company found" }, { status: 404 });
    }

    // Get jobs for this company
    const jobs = await jobsDao.getJobsByCompanyId(company.id);
    return NextResponse.json(jobs);
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Get the user's company
    const company = await companiesDao.getCompanyByManagerId(user.id);

    if (!company) {
      return NextResponse.json({ error: "No company found" }, { status: 404 });
    }

    const body = await request.json();
    const jobsToInsert = Array.isArray(body) ? body : [body];

    // Add company_id to all jobs
    const jobsWithCompany = jobsToInsert.map((job) => ({
      ...job,
      company_id: company.id,
    }));

    const insertedJobs = await jobsDao.insertJobs(jobsWithCompany);
    return NextResponse.json(insertedJobs, { status: 201 });
  } catch (error: unknown) {
    console.error("Failed to create job:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to create job";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
