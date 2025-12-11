// app/api/job-assignments/job/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { JobsAssignmentsDaoSupabase } from "@/lib/dao/implementations/supabase/JobsAssignmentsDaoSupabase";

const jobAssignmentsDao = new JobsAssignmentsDaoSupabase();

interface RouteParams {
  params: Promise<{
    jobId: string;
  }>;
}

// Get job assignments for a specific job
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { jobId: jobId } = await params;

    console.log("Job ID received:", jobId);

    if (!jobId || jobId === "undefined") {
      return NextResponse.json({ error: "Invalid job ID" }, { status: 400 });
    }

    const data = await jobAssignmentsDao.getJobAssignmentsByJobId(jobId);

    return NextResponse.json(data);
  } catch (error) {
    console.error("Failed to fetch job assignments:", error);
    return NextResponse.json(
      { error: "Failed to fetch job assignments" },
      { status: 500 }
    );
  }
}

// Create a new job assignment
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { jobId: jobId } = await params;
    const assignmentData = await request.json();

    if (!jobId || jobId === "undefined") {
      return NextResponse.json({ error: "Invalid job ID" }, { status: 400 });
    }

    const data = await jobAssignmentsDao.insertSingleJobAssignment(
      jobId,
      assignmentData
    );

    return NextResponse.json(data);
  } catch (error) {
    console.error("Failed to create job assignment:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to create job assignment";
    const shouldShowValidation =
      typeof errorMessage === "string" &&
      errorMessage.toLowerCase().includes("work date is required");
    return NextResponse.json(
      { error: errorMessage },
      { status: shouldShowValidation ? 400 : 500 }
    );
  }
}
