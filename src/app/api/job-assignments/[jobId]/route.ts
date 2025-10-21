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
    // Get job assignments with associate details
    const assignments = await jobAssignmentsDao.getJobsByAssociate(jobId);

    if (!assignments || assignments.length === 0) {
      return NextResponse.json([]);
    }

    return NextResponse.json(assignments);
  } catch (error) {
    console.error("Failed to fetch job assignment:", error);
    return NextResponse.json(
      { error: "Failed to fetch job assignment" },
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

    if (!assignmentData.associate_id) {
      return NextResponse.json(
        { error: "Associate ID is required" },
        { status: 400 }
      );
    }

    // Assign associate to job
    const data = await jobAssignmentsDao.assignAssociateToJob(
      jobId,
      assignmentData.associate_id
    );

    return NextResponse.json(data);
  } catch (error) {
    console.error("Failed to create job assignment:", error);
    return NextResponse.json(
      { error: "Failed to create job assignment" },
      { status: 500 }
    );
  }
}
