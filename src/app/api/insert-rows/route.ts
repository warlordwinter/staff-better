import { NextRequest, NextResponse } from "next/server";
import { insertAssociates } from "@/lib/dao/AssociatesDao";
import { insertJobs } from "@/lib/dao/JobsDao";
import { insertJobsAssignments } from "@/lib/dao/JobsAssignmentsDao";
import { formatTime } from "@/utils/dateUtils";
import { Associate } from "@/model/interfaces/Associate";
import { Job } from "@/model/interfaces/Job";
import { JobAssignment } from "@/model/interfaces/JobAssignment";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const rows = body.rows;

  try {
    // Prepare associate data for insertion
    const associateData = rows.map((r: Associate) => ({
      first_name: r.first_name,
      last_name: r.last_name,
      work_date: r.work_date,
      start_time: formatTime(r.start_time),
      phone_number: r.phone_number,
      email_address: r.email_address,
    }));

    // Prepare job data for insertion
    const jobData = rows.map((r: Job) => ({
      job_title: r.job_title,
      customer_name: r.customer_name,
      job_status: "Upcoming",  // or map accordingly if the status needs transformation
      start_date: r.start_date,
    }));

    // Log the data to be inserted for debugging
    console.log("Sending to Supabase (Associates):", associateData);
    console.log("Sending to Supabase (Jobs):", jobData);

    // Insert data into both DAOs
    const insertedAssociates = await insertAssociates(associateData);
    const insertedJobs = await insertJobs(jobData);

    // Create job assignments using the returned IDs
    const jobAssignmentsData = rows.map((r: JobAssignment, index: number) => ({
      job_id: insertedJobs[index].id,
      associate_id: insertedAssociates[index].id,
      confirmation_status: 'Unconfirmed' as const,
      last_confirmation_time: null,
      work_date: r.work_date,
      start_time: formatTime(r.start_time),
    }));

    const jobAssignmentInsertion = await insertJobsAssignments(jobAssignmentsData);

    // Return the results of both insertions
    return NextResponse.json({
      associateInsertion: insertedAssociates,
      jobInsertion: insertedJobs,
      jobAssignmentInsertion,

    });
  } catch (err: unknown) {
    let parsedError = err;

    if (err instanceof Error) {
            try {
                parsedError = JSON.parse(err.message);
            } catch {
                // If JSON parsing fails, use the original error
                parsedError = { message: err.message };
            }
        }

    console.error("Insert failed:", parsedError);

    return NextResponse.json(
      {
        error: "Insert failed",
        ...(typeof parsedError === 'object' && parsedError !== null ? parsedError : { message: String(parsedError) }),
      },
      { status: 500 }
    );
  }
}

