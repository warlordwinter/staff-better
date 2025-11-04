import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { SupabaseClient } from "@supabase/supabase-js";
import { TWILIO_PHONE_NUMBER_REMINDERS } from "@/lib/twilio/client";

/**
 * Get the company ID for the currently authenticated user
 * @returns The company ID or null if not found or not authenticated
 */
export async function getCompanyId(): Promise<string | null> {
  const supabase = await createClient();

  // Get the current user
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    console.error("User not authenticated:", userError);
    return null;
  }

  // Query the companies table to find the company for this user
  const { data: company, error: companyError } = await supabase
    .from("companies")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (companyError) {
    console.error("Error fetching company:", companyError);
    return null;
  }

  return company?.id || null;
}

/**
 * Get the company ID for the currently authenticated user, throwing an error if not found
 * @throws Error if user is not authenticated or company is not found
 * @returns The company ID
 */
export async function requireCompanyId(): Promise<string> {
  const companyId = await getCompanyId();

  if (!companyId) {
    throw new Error("Company not found for authenticated user");
  }

  return companyId;
}

/**
 * Get the company's two-way phone number from the database (internal helper)
 * @param supabase Supabase client (authenticated or admin)
 * @param companyId The company ID
 * @returns The phone number or null if not found
 */
async function getCompanyPhoneNumberInternal(
  supabase: SupabaseClient,
  companyId: string
): Promise<string | null> {
  console.log("📞 [PHONE DEBUG] getCompanyPhoneNumberInternal called:");
  console.log("📞 [PHONE DEBUG]   Company ID:", companyId);

  const { data: company, error } = await supabase
    .from("companies")
    .select("phone_number")
    .eq("id", companyId)
    .single();

  if (error || !company) {
    console.error(
      "📞 [PHONE DEBUG] Error fetching company phone number:",
      error
    );
    console.error("📞 [PHONE DEBUG] Company data:", company);
    return null;
  }

  console.log(
    "📞 [PHONE DEBUG] Company phone number from database:",
    company.phone_number
  );
  console.log(
    "📞 [PHONE DEBUG] Phone number is null/empty?",
    !company.phone_number
  );

  // For testing: fallback to reminder number if company phone number is not set
  // This allows testing two-way messaging while waiting for A2P registration
  if (!company.phone_number) {
    console.log(
      "📞 [PHONE DEBUG] Company phone number not set, falling back to reminder number for testing"
    );
    return TWILIO_PHONE_NUMBER_REMINDERS;
  }

  // Check if we should force use reminder number for testing (via environment variable)
  // Set USE_REMINDER_NUMBER_FOR_TWO_WAY=true to force use reminder number
  const useReminderForTesting =
    process.env.USE_REMINDER_NUMBER_FOR_TWO_WAY === "true";

  if (useReminderForTesting) {
    console.log(
      "📞 [PHONE DEBUG] USE_REMINDER_NUMBER_FOR_TWO_WAY=true, using reminder number for testing"
    );
    return TWILIO_PHONE_NUMBER_REMINDERS;
  }

  return company.phone_number;
}

/**
 * Get the company's two-way phone number from the database
 * @param companyId The company ID
 * @returns The phone number or null if not found
 */
export async function getCompanyPhoneNumber(
  companyId: string
): Promise<string | null> {
  const supabase = await createClient();
  return getCompanyPhoneNumberInternal(supabase, companyId);
}

/**
 * Get the company's two-way phone number using admin client (for server-side operations)
 * @param companyId The company ID
 * @returns The phone number or null if not found
 */
export async function getCompanyPhoneNumberAdmin(
  companyId: string
): Promise<string | null> {
  const supabase = createAdminClient();
  return getCompanyPhoneNumberInternal(supabase, companyId);
}

/**
 * Get the company's two-way phone number for the currently authenticated user
 * @returns The phone number or null if not found
 */
export async function getCompanyPhoneNumberForUser(): Promise<string | null> {
  const companyId = await getCompanyId();

  if (!companyId) {
    return null;
  }

  return getCompanyPhoneNumber(companyId);
}

/**
 * Get the company's two-way phone number, throwing an error if not found
 * Falls back to reminder number for testing if company phone number is not set
 * @param companyId The company ID
 * @throws Error if company is not found
 * @returns The phone number (company number or reminder number as fallback)
 */
export async function requireCompanyPhoneNumber(
  companyId: string
): Promise<string> {
  const phoneNumber = await getCompanyPhoneNumber(companyId);

  // Fallback is handled in getCompanyPhoneNumberInternal, so this should always return a value
  if (!phoneNumber) {
    // This should rarely happen now since we fallback to reminder number
    console.warn(
      "📞 [PHONE DEBUG] No phone number available, using reminder number as fallback"
    );
    return TWILIO_PHONE_NUMBER_REMINDERS;
  }

  return phoneNumber;
}
