import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { CompaniesDaoSupabase } from "@/lib/dao/implementations/supabase/CompaniesDaoSupabase";
import { JobsDaoSupabase } from "@/lib/dao/implementations/supabase/JobsDaoSupabase";

const companiesDao = new CompaniesDaoSupabase();
const jobsDao = new JobsDaoSupabase();

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        {
          error: "Not authenticated",
        },
        { status: 401 }
      );
    }

    console.log("Testing job creation for user:", user.id);

    // Get the user's company
    const company = await companiesDao.getCompanyByManagerId(user.id);

    if (!company) {
      return NextResponse.json(
        {
          error: "No company found. Please complete company setup first.",
        },
        { status: 404 }
      );
    }

    console.log("Found company:", company.id, "for user:", user.id);

    const body = await request.json();
    const {
      title = "Test Job",
      location = "Test Location",
      start_date = new Date().toISOString().slice(0, 10),
      job_status = "Upcoming",
    } = body;

    const testJob = {
      title,
      location,
      company_id: company.id,
      associate_id: null,
      start_date,
      end_date: null,
      pay_rate: null,
      incentive_bonus: null,
      num_reminders: null,
      job_status,
    };

    console.log("Creating test job with data:", testJob);

    const result = await jobsDao.insertJobs([testJob]);

    return NextResponse.json({
      success: true,
      result,
      message: "Test job created successfully",
    });
  } catch (error: unknown) {
    console.error("Job creation test error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred";
    return NextResponse.json(
      {
        error: "Job creation test failed",
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}
