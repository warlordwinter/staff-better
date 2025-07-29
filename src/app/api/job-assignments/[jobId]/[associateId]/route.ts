// app/api/job-assignments/[jobId]/[associateId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { updateJobAssignment, deleteJobAssignment } from "@/lib/dao/JobsAssignmentsDao";

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
      return NextResponse.json({ error: 'Invalid job ID or associate ID' }, { status: 400 });
    }

    const data = await updateJobAssignment(jobId, associateId, updates);

    return NextResponse.json(data);
  } catch (error) {
    console.error('Failed to update job assignment:', error);
    return NextResponse.json({ error: 'Failed to update job assignment' }, { status: 500 });
  }
}

// Delete a specific job assignment
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { jobId, associateId } = await params;

    if (!jobId || !associateId) {
      return NextResponse.json({ error: 'Invalid job ID or associate ID' }, { status: 400 });
    }

    const result = await deleteJobAssignment(jobId, associateId);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Failed to delete job assignment:', error);
    return NextResponse.json({ error: 'Failed to delete job assignment' }, { status: 500 });
  }
}