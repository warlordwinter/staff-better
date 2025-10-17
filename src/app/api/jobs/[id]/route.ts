import { NextRequest, NextResponse } from "next/server";
import { JobsDaoSupabase } from "@/lib/dao/implementations/supabase/JobsDaoSupabase";
import { CompaniesDaoSupabase } from "@/lib/dao/implementations/supabase/CompaniesDaoSupabase";
import { createClient } from "@/lib/supabase/server";

const jobsDao = new JobsDaoSupabase();
const companiesDao = new CompaniesDaoSupabase();

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
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

    const job = await jobsDao.getJobById(id);

    console.log("JobId in API:", job);

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    // Verify the job belongs to the user's company
    if (job.company_id !== company.id) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    return NextResponse.json(job);
  } catch (error) {
    console.error("Failed to fetch job:", error);
    return NextResponse.json({ error: "Failed to fetch job" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
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

    // Verify the job belongs to the user's company
    const existingJob = await jobsDao.getJobById(id);
    if (!existingJob || existingJob.company_id !== company.id) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const updates = await request.json();
    const updatedJob = await jobsDao.updateJob(id, updates);
    return NextResponse.json(updatedJob[0]);
  } catch (error) {
    console.error("Failed to update job:", error);
    return NextResponse.json(
      { error: "Failed to update job" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
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

    // Verify the job belongs to the user's company
    const existingJob = await jobsDao.getJobById(id);
    if (!existingJob || existingJob.company_id !== company.id) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    await jobsDao.deleteJob(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete job:", error);
    return NextResponse.json(
      { error: "Failed to delete job" },
      { status: 500 }
    );
  }
}
