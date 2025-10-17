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

    if (userError) {
      console.error("Authentication error in jobs API:", userError);
      return NextResponse.json(
        { error: "Authentication failed" },
        { status: 401 }
      );
    }

    if (!user) {
      console.error("No user found in jobs API");
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    console.log("Fetching company for user:", user.id);

    // Get the user's company
    const company = await companiesDao.getCompanyByManagerId(user.id);

    if (!company) {
      console.error("No company found for user:", user.id);
      return NextResponse.json(
        {
          error: "No company found. Please complete company setup first.",
        },
        { status: 404 }
      );
    }

    console.log("Found company:", company.id, "for user:", user.id);

    // Get jobs for this company
    const jobs = await jobsDao.getJobsByCompanyId(company.id);
    console.log("Found jobs:", jobs.length);
    return NextResponse.json(jobs);
  } catch (error: unknown) {
    console.error("Error in jobs API:", error);
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

    if (userError) {
      console.error("Authentication error in jobs POST API:", userError);
      return NextResponse.json(
        { error: "Authentication failed" },
        { status: 401 }
      );
    }

    if (!user) {
      console.error("No user found in jobs POST API");
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    console.log("Creating job for user:", user.id);

    // Get the user's company
    const company = await companiesDao.getCompanyByManagerId(user.id);

    if (!company) {
      console.error("No company found for user:", user.id);
      return NextResponse.json(
        {
          error: "No company found. Please complete company setup first.",
        },
        { status: 404 }
      );
    }

    console.log("Found company:", company.id, "for user:", user.id);

    const body = await request.json();
    console.log("Job creation request body:", body);

    const jobsToInsert = Array.isArray(body) ? body : [body];

    // Clean and validate job data
    const jobsWithCompany = jobsToInsert.map((job) => {
      // Remove any temporary fields that shouldn't be in the database
      const { isNew, ...cleanJob } = job;

      return {
        ...cleanJob,
        company_id: company.id,
        // Ensure required fields have default values
        title: cleanJob.title || "",
        location: cleanJob.location || null,
        associate_id: cleanJob.associate_id || null,
        start_date: cleanJob.start_date || null,
        end_date: cleanJob.end_date || null,
        pay_rate: cleanJob.pay_rate || null,
        incentive_bonus: cleanJob.incentive_bonus || null,
        num_reminders: cleanJob.num_reminders || null,
        job_status: cleanJob.job_status || "Upcoming",
      };
    });

    console.log("Jobs to insert:", jobsWithCompany);

    const insertedJobs = await jobsDao.insertJobs(jobsWithCompany);
    console.log("Successfully inserted jobs:", insertedJobs);

    return NextResponse.json(insertedJobs, { status: 201 });
  } catch (error: unknown) {
    console.error("Failed to create job:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to create job";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
