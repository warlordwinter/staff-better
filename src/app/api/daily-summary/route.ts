import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * GET /api/daily-summary
 * Returns job assignments for the next 3 days, grouped by company
 * Requires Bearer token authentication (CRON_SECRET)
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");

    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createAdminClient();

    // Calculate date range: today to 3 days from now
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const threeDaysFromNow = new Date(today);
    threeDaysFromNow.setDate(today.getDate() + 3);
    threeDaysFromNow.setHours(23, 59, 59, 999);

    const todayString = today.toISOString().split("T")[0]; // YYYY-MM-DD
    const threeDaysString = threeDaysFromNow.toISOString().split("T")[0];

    console.log(
      `[DAILY-SUMMARY] Querying assignments from ${todayString} to ${threeDaysString}`
    );

    // Query job_assignments with joins to associates and jobs
    const { data, error } = await supabase
      .from("job_assignments")
      .select(
        `
        job_id,
        associate_id,
        work_date,
        start_time,
        confirmation_status,
        associates:associate_id (
          first_name,
          last_name,
          phone_number
        ),
        jobs:job_id (
          job_title,
          customer_name,
          company_id
        )
      `
      )
      .gte("work_date", todayString)
      .lte("work_date", threeDaysString)
      .order("work_date", { ascending: true })
      .order("start_time", { ascending: true });

    if (error) {
      console.error("[DAILY-SUMMARY] Database error:", error);
      throw new Error(`Database query error: ${error.message}`);
    }

    if (!data || data.length === 0) {
      console.log("[DAILY-SUMMARY] No assignments found for date range");
      return NextResponse.json({ companies: [] });
    }

    console.log(
      `[DAILY-SUMMARY] Found ${data.length} assignments, grouping by company`
    );

    // Get unique company IDs
    const companyIds = new Set<string>();
    for (const assignment of data) {
      const job = Array.isArray(assignment.jobs) ? assignment.jobs[0] : assignment.jobs;
      if (job?.company_id) {
        companyIds.add(job.company_id);
      }
    }

    // Fetch company details
    const { data: companiesData, error: companiesError } = await supabase
      .from("companies")
      .select("id, company_name, email")
      .in("id", Array.from(companyIds));

    if (companiesError) {
      console.error("[DAILY-SUMMARY] Error fetching companies:", companiesError);
      throw new Error(`Failed to fetch company data: ${companiesError.message}`);
    }

    // Create company lookup map
    const companyMap = new Map<string, { company_name: string; email: string }>();
    if (companiesData) {
      for (const company of companiesData) {
        companyMap.set(company.id, {
          company_name: company.company_name,
          email: company.email,
        });
      }
    }

    // Group assignments by company
    const companiesMap = new Map<
      string,
      {
        company_id: string;
        company_name: string;
        email: string;
        assignments: Array<{
          job_id: string;
          associate_id: string;
          work_date: string;
          start_time: string | null;
          confirmation_status: string | null;
          associate_first_name: string | null;
          associate_last_name: string | null;
          associate_phone: string;
          job_title: string | null;
          customer_name: string;
        }>;
      }
    >();

    // Process each assignment
    for (const assignment of data) {
      const associate = Array.isArray(assignment.associates)
        ? assignment.associates[0]
        : assignment.associates;
      const job = Array.isArray(assignment.jobs) ? assignment.jobs[0] : assignment.jobs;

      if (!associate || !job || !job.company_id) {
        console.warn(
          `[DAILY-SUMMARY] Skipping assignment ${assignment.job_id}-${assignment.associate_id} - missing associate, job, or company_id`
        );
        continue;
      }

      const companyId = job.company_id;
      const companyInfo = companyMap.get(companyId);

      if (!companyInfo) {
        console.warn(
          `[DAILY-SUMMARY] Skipping assignment ${assignment.job_id}-${assignment.associate_id} - company ${companyId} not found`
        );
        continue;
      }

      // Initialize company entry if not exists
      if (!companiesMap.has(companyId)) {
        companiesMap.set(companyId, {
          company_id: companyId,
          company_name: companyInfo.company_name || "Unknown Company",
          email: companyInfo.email,
          assignments: [],
        });
      }

      // Add assignment to company
      const companyData = companiesMap.get(companyId)!;
      companyData.assignments.push({
        job_id: assignment.job_id,
        associate_id: assignment.associate_id,
        work_date: assignment.work_date
          ? assignment.work_date.split("T")[0]
          : "",
        start_time: assignment.start_time,
        confirmation_status: assignment.confirmation_status || "UNCONFIRMED",
        associate_first_name: associate.first_name,
        associate_last_name: associate.last_name,
        associate_phone: associate.phone_number,
        job_title: job.job_title,
        customer_name: job.customer_name,
      });
    }

    // Convert map to array
    const companies = Array.from(companiesMap.values());

    console.log(
      `[DAILY-SUMMARY] Returning data for ${companies.length} companies`
    );

    return NextResponse.json({ companies });
  } catch (error) {
    console.error("[DAILY-SUMMARY] Error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to fetch daily summary",
      },
      { status: 500 }
    );
  }
}

