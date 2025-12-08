import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import type { Database, Tables } from "@/lib/database.types";
import {
  closeTwilioSubaccount,
  createMessagingServiceForCompany,
  encryptTwilioAuthToken,
  provisionTwilioSubaccount,
  provisionBrandForCustomer,
  provisionCampaignForBrand,
} from "@/lib/twilio/provisioning";

type SupabaseServerClient = SupabaseClient<Database>;

export async function POST(request: NextRequest) {
  let supabase: SupabaseServerClient | null = null;
  let companyRecord: Tables<"companies"> | null = null;
  let isvCustomerId: string | null = null;
  let isvCustomerWasCreated = false;
  let twilioSubaccountSid: string | null = null;
  let brandId: string | null = null;
  let campaignId: string | null = null;

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
      phoneNumber,
      zipCode,
      systemReadiness,
      referralSource,
    } = body;

    // Validate required fields
    if (
      !companyName ||
      !email ||
      !phoneNumber ||
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
        phone_number: phoneNumber,
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

    // Store messaging service SID in database for future use
    const { error: subaccountInsertError } = await supabase
      .from("twilio_subaccounts")
      .insert({
        customer_id: isvCustomerId,
        subaccount_sid: twilioSubaccount.sid,
        auth_token_encrypted: encryptedToken,
        friendly_name: twilioSubaccount.friendlyName,
        status: twilioSubaccount.status ?? "active",
        messaging_service_sid: messagingServiceSid,
      });

    if (subaccountInsertError) {
      throw subaccountInsertError;
    }

    // Create brand for the customer
    try {
      const brand = await provisionBrandForCustomer({
        customerId: isvCustomerId,
        companyName: company.company_name,
        subaccountSid: twilioSubaccount.sid,
        authToken: twilioSubaccount.authToken,
        supabase,
      });
      brandId = brand.id;
    } catch (error) {
      // Brand creation may fail if verification is required
      // Log error but continue - brand can be created manually later
      console.warn(
        `Failed to create brand for customer ${isvCustomerId}: ${
          error instanceof Error ? error.message : "unknown error"
        }`
      );
    }

    // Create campaign for the brand (only if brand was created)
    if (brandId) {
      try {
        const campaign = await provisionCampaignForBrand({
          brandId: brandId,
          customerId: isvCustomerId,
          messagingServiceSid: messagingServiceSid,
          subaccountSid: twilioSubaccount.sid,
          authToken: twilioSubaccount.authToken,
          companyName: company.company_name,
          supabase,
        });
        campaignId = campaign.id;
      } catch (error) {
        // Campaign creation may fail if brand is not approved
        // Log error but continue - campaign can be created manually later
        console.warn(
          `Failed to create campaign for brand ${brandId}: ${
            error instanceof Error ? error.message : "unknown error"
          }`
        );
      }
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
          brandId: brandId,
          campaignId: campaignId,
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

  // Estimate monthly volume based on number of employees
  // Rough estimate: 2-5 messages per employee per month
  // Cap at PostgreSQL integer max (2,147,483,647) to avoid overflow
  const MAX_INTEGER = 2147483647;
  const estimatedMonthlyVolume = company.non_temp_employees
    ? Math.min(MAX_INTEGER, Math.max(10, company.non_temp_employees * 3))
    : null;

  // Build use case descriptions from system readiness
  const useCaseDescriptions = company.system_readiness
    ? `StaffBetter messaging system for ${company.company_name}. System readiness: ${company.system_readiness}.`
    : null;

  // Build address from zip code if available
  const address = company.zip_code ? `Zip Code: ${company.zip_code}` : null;

  const { data: customer, error: insertError } = await supabase
    .from("isv_customers")
    .insert({
      company_id: company.id,
      contact_email: company.email,
      contact_phone: company.phone_number || null,
      legal_name: company.company_name,
      name: company.company_name,
      contact_name: company.company_name,
      address: address,
      estimated_monthly_volume: estimatedMonthlyVolume,
      use_case_descriptions: useCaseDescriptions,
      // Set default business type if needed - can be updated later
      business_type: "STAFFING",
      // Phone number preference - default to SMS
      phone_number_preference: "SMS",
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
  brandId,
  campaignId,
}: {
  supabase: SupabaseServerClient;
  companyId: string;
  customerId: string | null;
  removeCustomerRecord: boolean;
  brandId?: string | null;
  campaignId?: string | null;
}) {
  // Clean up campaign first (has foreign key to brand)
  if (campaignId) {
    await supabase.from("campaigns").delete().eq("id", campaignId);
  }

  // Clean up brand (has foreign key to customer)
  if (brandId) {
    await supabase.from("brands").delete().eq("id", brandId);
  }

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
