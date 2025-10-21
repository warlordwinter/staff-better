import { NextRequest, NextResponse } from "next/server";
import { UsersDaoSupabase } from "@/lib/dao/implementations/supabase/UsersDaoSupabase";
import { JobsDaoSupabase } from "@/lib/dao/implementations/supabase/JobsDaoSupabase";
import { JobsAssignmentsDaoSupabase } from "@/lib/dao/implementations/supabase/JobsAssignmentsDaoSupabase";
import { formatPhoneToE164 } from "@/utils/phoneUtils";
import { User } from "@/model/interfaces/User";
import { Job } from "@/model/interfaces/Job";

const usersDao = new UsersDaoSupabase();
const jobsDao = new JobsDaoSupabase();
const jobAssignmentsDao = new JobsAssignmentsDaoSupabase();

export async function POST(req: NextRequest) {
  const body = await req.json();
  const rows = body.rows;

  try {
    // Prepare user data for insertion with phone formatting
    const userData = rows.map((r: any) => {
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
          // Keep original if formatting fails
        }
      }

      return {
        first_name: r.first_name,
        last_name: r.last_name,
        role: r.role || "ASSOCIATE", // Default to ASSOCIATE if not specified
        email: r.email_address || null,
        phone_number: formattedPhone,
        sms_opt_out: r.sms_opt_out || false,
        whatsapp: r.whatsapp || null,
        auth_id: r.auth_id || null,
      };
    });

    // Prepare job data for insertion
    const jobData = rows.map((r: any) => ({
      title: r.job_title || r.title,
      location: r.location || null,
      company_id: r.company_id, // This should be provided in the request
      associate_id: null, // Will be set after user creation
      start_date: r.start_date,
      end_date: r.end_date || null,
      num_reminders: r.num_reminders || 3,
      job_status: "UPCOMING" as const,
      client_company: r.customer_name || r.client_company,
    }));

    // Log the data to be inserted for debugging
    console.log("Sending to Supabase (Users):", userData);
    console.log("Sending to Supabase (Jobs):", jobData);

    // Insert users first
    const insertedUsers = await usersDao.insertUsers(userData);

    // Update job data with user IDs
    const updatedJobData = jobData.map((job, index) => ({
      ...job,
      associate_id: insertedUsers[index].id,
    }));

    // Insert jobs
    const insertedJobs = await jobsDao.insertJobs(updatedJobData);

    // Return the results of both insertions
    return NextResponse.json({
      userInsertion: insertedUsers,
      jobInsertion: insertedJobs,
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
