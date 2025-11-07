import { NextRequest, NextResponse } from "next/server";
import { JobsDaoSupabase } from "@/lib/dao/implementations/supabase/JobsDaoSupabase";

const jobsDao = new JobsDaoSupabase();

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    if (!id || id === "undefined") {
      return NextResponse.json({ error: "Invalid job ID" }, { status: 400 });
    }

    const job = await jobsDao.getJobById(id);

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    return NextResponse.json(job);
  } catch (error) {
    console.error("Failed to fetch job:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to fetch job";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
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
