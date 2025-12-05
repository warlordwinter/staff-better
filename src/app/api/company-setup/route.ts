import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import type { Database, Tables } from "@/lib/database.types";
import {
  closeTwilioSubaccount,
  createMessagingServiceForCompany,
  encryptTwilioAuthToken,
  provisionTwilioSubaccount,
} from "@/lib/twilio/provisioning";

type SupabaseServerClient = SupabaseClient<Database>;

export async function POST(request: NextRequest) {
  let supabase: SupabaseServerClient | null = null;
  let companyRecord: Tables<"companies"> | null = null;
  let isvCustomerId: string | null = null;
  let isvCustomerWasCreated = false;
  let twilioSubaccountSid: string | null = null;

  try {
    supabase = await createClient();

    // Get the current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await request.json();
    const {
      companyName,
      nonTempEmployees,
      email,
      zipCode,
      systemReadiness,
      referralSource,
    } = body;

    // Validate required fields
    if (
      !companyName ||
      !email ||
      !zipCode ||
      !systemReadiness ||
      !referralSource
    ) {
      return NextResponse.json(
        { error: "All fields are required" },
        { status: 400 }
      );
    }

    // Create the company with user_id directly
    const { data: company, error: companyError } = await supabase
      .from("companies")
      .insert({
        company_name: companyName,
        email: email,
        non_temp_employees: nonTempEmployees,
        zip_code: zipCode,
        system_readiness: systemReadiness,
        referral_source: referralSource,
        setup_completed: true,
        user_id: user.id, // Direct link to user
      })
      .select()
      .single();

    if (companyError) {
      console.error("Error creating company:", companyError);
      return NextResponse.json(
        { error: "Failed to create company" },
        { status: 500 }
      );
    }

    companyRecord = company;

    // Attempt to create a user profile linked to this company.
    // If one already exists (unique constraint), just log and continue.
    const { error: profileError } = await supabase
      .from("user_profiles")
      .insert({
        user_id: user.id,
        company_id: company.id,
      });

    if (profileError) {
      console.log("user_profiles insert skipped:", profileError);
    }

    const customerResult = await ensureIsvCustomerRecord(supabase, company);
    isvCustomerId = customerResult.id;
    isvCustomerWasCreated = customerResult.created;

    await assertNoExistingSubaccount(supabase, isvCustomerId);

    const twilioSubaccount = await provisionTwilioSubaccount(
      company.company_name,
      company.id
    );
    twilioSubaccountSid = twilioSubaccount.sid;

    const { sid: messagingServiceSid } = await createMessagingServiceForCompany(
      {
        companyId: company.id,
        companyName: company.company_name,
        subaccountSid: twilioSubaccount.sid,
        authToken: twilioSubaccount.authToken,
      }
    );

    const encryptedToken = encryptTwilioAuthToken(twilioSubaccount.authToken);

    // Note: messaging_service_sid column doesn't exist in the actual database schema
    // even though it's in the TypeScript types, so we omit it
    const { error: subaccountInsertError } = await supabase
      .from("twilio_subaccounts")
      .insert({
        customer_id: isvCustomerId,
        subaccount_sid: twilioSubaccount.sid,
        auth_token_encrypted: encryptedToken,
        friendly_name: twilioSubaccount.friendlyName,
        status: twilioSubaccount.status ?? "active",
        // messaging_service_sid: messagingServiceSid, // Column doesn't exist in DB
      });

    if (subaccountInsertError) {
      throw subaccountInsertError;
    }

    companyRecord = company;

    return NextResponse.json(
      { success: true, companyId: company.id },
      { status: 201 }
    );
  } catch (error: unknown) {
    if (twilioSubaccountSid) {
      await closeTwilioSubaccount(twilioSubaccountSid);
    }

    if (supabase && companyRecord) {
      try {
        await cleanupCompanySetupArtifacts({
          supabase,
          companyId: companyRecord.id,
          customerId: isvCustomerId,
          removeCustomerRecord: isvCustomerWasCreated,
        });
      } catch (cleanupError) {
        console.error(
          "Failed to rollback company setup artifacts:",
          cleanupError
        );
      }
    }

    console.error("Company setup error:", error);
    const errorMessage =
      error instanceof Error
        ? error.message
        : "Failed to complete company setup";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

async function ensureIsvCustomerRecord(
  supabase: SupabaseServerClient,
  company: Tables<"companies">
) {
  const { data: existingCustomers, error: existingError } = await supabase
    .from("isv_customers")
    .select("id")
    .eq("company_id", company.id)
    .limit(1);

  if (existingError) {
    throw existingError;
  }

  if (existingCustomers && existingCustomers.length > 0) {
    return { id: existingCustomers[0].id, created: false };
  }

  const { data: customer, error: insertError } = await supabase
    .from("isv_customers")
    .insert({
      company_id: company.id,
      contact_email: company.email,
      legal_name: company.company_name,
      name: company.company_name,
    })
    .select("id")
    .single();

  if (insertError || !customer) {
    throw insertError || new Error("Failed to create ISV customer");
  }

  return { id: customer.id, created: true };
}

async function assertNoExistingSubaccount(
  supabase: SupabaseServerClient,
  customerId: string
) {
  const { data, error } = await supabase
    .from("twilio_subaccounts")
    .select("id")
    .eq("customer_id", customerId)
    .limit(1);

  if (error) {
    throw error;
  }

  if (data && data.length > 0) {
    throw new Error("Twilio subaccount already exists for this customer");
  }
}

async function cleanupCompanySetupArtifacts({
  supabase,
  companyId,
  customerId,
  removeCustomerRecord,
}: {
  supabase: SupabaseServerClient;
  companyId: string;
  customerId: string | null;
  removeCustomerRecord: boolean;
}) {
  if (customerId) {
    await supabase
      .from("twilio_subaccounts")
      .delete()
      .eq("customer_id", customerId);

    if (removeCustomerRecord) {
      await supabase.from("isv_customers").delete().eq("id", customerId);
    }
  }

  await supabase.from("user_profiles").delete().eq("company_id", companyId);
  await supabase.from("companies").delete().eq("id", companyId);
}
