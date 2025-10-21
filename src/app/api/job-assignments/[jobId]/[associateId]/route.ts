// app/api/job-assignments/[jobId]/[associateId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { JobsAssignmentsDaoSupabase } from "@/lib/dao/implementations/supabase/JobsAssignmentsDaoSupabase";

const jobAssignmentsDao = new JobsAssignmentsDaoSupabase();

interface RouteParams {
  params: Promise<{
    jobId: string;
    associateId: string;
  }>;
}

// Update a specific job assignment
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { jobId, associateId } = await params;
    const updates = await request.json();
    console.log("JobAssignment Updates:", updates);
    console.log(jobId);
    console.log(associateId);

    if (!jobId || !associateId) {
      return NextResponse.json(
        { error: "Invalid job ID or associate ID" },
        { status: 400 }
      );
    }

    // Update the job assignment with the new associate_id and other fields
    const data = await jobAssignmentsDao.updateJobAssignment(jobId, {
      associate_id: associateId,
      ...updates,
    });

    return NextResponse.json(data);
  } catch (error) {
    console.error("Failed to update job assignment:", error);
    return NextResponse.json(
      { error: "Failed to update job assignment" },
      { status: 500 }
    );
  }
}

// Delete a specific job assignment (remove associate from job)
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { jobId } = await params;

    if (!jobId) {
      return NextResponse.json({ error: "Invalid job ID" }, { status: 400 });
    }

    // Remove associate from job by setting associate_id to null
    const result = await jobAssignmentsDao.removeAssociateFromJob(jobId);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Failed to delete job assignment:", error);
    return NextResponse.json(
      { error: "Failed to delete job assignment" },
      { status: 500 }
    );
  }
}
