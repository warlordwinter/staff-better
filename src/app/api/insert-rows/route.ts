import { NextRequest, NextResponse } from "next/server";
import { AssociatesDaoSupabase } from "@/lib/dao/implementations/supabase/AssociatesDaoSupabase";
import { JobsDaoSupabase } from "@/lib/dao/implementations/supabase/JobsDaoSupabase";
import { JobsAssignmentsDaoSupabase } from "@/lib/dao/implementations/supabase/JobsAssignmentsDaoSupabase";
import { CompaniesDaoSupabase } from "@/lib/dao/implementations/supabase/CompaniesDaoSupabase";
import { formatPhoneToE164 } from "@/utils/phoneUtils";
import { Associate } from "@/model/interfaces/Associate";
import { JobAssignment } from "@/model/interfaces/JobAssignment";
import { createClient } from "@/lib/supabase/server";

const associatesDao = new AssociatesDaoSupabase();
const jobsDao = new JobsDaoSupabase();
const jobAssignmentsDao = new JobsAssignmentsDaoSupabase();
const companiesDao = new CompaniesDaoSupabase();

export async function POST(req: NextRequest) {
  const body = await req.json();
  const rows = body.rows;

  try {
    // Get the authenticated user and their company
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
    // Prepare associate data for insertion with phone formatting
    const associateData = rows.map((r: Associate) => {
      let formattedPhone = r.phone_number;

      // Format phone number to E.164 if provided
      if (r.phone_number && r.phone_number.trim()) {
        try {
          formattedPhone = formatPhoneToE164(r.phone_number);
          console.log(`Phone formatted: ${r.phone_number} → ${formattedPhone}`);
        } catch (error) {
          console.warn(
            `Could not format phone number "${r.phone_number}":`,
            error
          );
          // Keep original if formatting fails - you might want to handle this differently
        }
      }

      return {
        first_name: r.first_name,
        last_name: r.last_name,
        work_date: r.work_date,
        start_time: r.start_time,
        phone_number: formattedPhone,
        email_address: r.email_address,
      };
    });

    // Prepare job data for insertion
    const jobData = rows.map((r: any) => ({
      title: r.job_title || r.title,
      location: r.customer_name || r.location,
      job_status: "Upcoming", // or map accordingly if the status needs transformation
      start_date: r.start_date,
      company_id: company.id, // Set the company ID from the authenticated user's company
    }));

    // Log the data to be inserted for debugging
    console.log("Sending to Supabase (Associates):", associateData);
    console.log("Sending to Supabase (Jobs):", jobData);

    // Insert data into both DAOs
    const insertedAssociates = await associatesDao.insertAssociates(
      associateData
    );
    const insertedJobs = await jobsDao.insertJobs(jobData);

    // Create job assignments using the returned IDs
    const jobAssignmentsData = rows.map((r: JobAssignment, index: number) => ({
      job_id: insertedJobs[index].id,
      associate_id: insertedAssociates[index].id,
      confirmation_status: "Unconfirmed" as const,
      last_confirmation_time: null,
      work_date: r.work_date,
      start_time: r.start_time,
    }));

    const jobAssignmentInsertion =
      await jobAssignmentsDao.insertJobsAssignments(jobAssignmentsData);

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
        ...(typeof parsedError === "object" && parsedError !== null
          ? parsedError
          : { message: String(parsedError) }),
      },
      { status: 500 }
    );
  }
}
