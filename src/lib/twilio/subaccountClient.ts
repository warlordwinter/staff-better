import twilio from "twilio";
import { twilioClient } from "@/lib/twilio/client";
// import { createAdminClient } from "@/lib/supabase/admin";
// import { decryptToken } from "@/lib/utils/encryption";

/**
 * Get Twilio client for a specific company's subaccount
 * TEMPORARY: Using main account for testing until subaccounts are set up
 * @param companyId The company ID
 * @returns Twilio client instance
 */
export async function getSubaccountClient(
  companyId: string
): Promise<ReturnType<typeof twilio> | null> {
  // TEMPORARY: Use main Twilio account for all companies
  // TODO: Switch to subaccount lookup when ready for production
  console.log(`[TEMP] Using main Twilio account for company: ${companyId}`);
  return twilioClient;
  
  /* 
  // Original subaccount lookup code - uncomment when ready for production:
  
  try {
    const supabase = createAdminClient();

    // Step 1: Get customer_id from isv_customers table using company_id
    const { data: customer, error: customerError } = await supabase
      .from("isv_customers")
      .select("id")
      .eq("company_id", companyId)
      .single();

    if (customerError || !customer) {
      console.error("Error fetching customer:", customerError);
      return null;
    }

    const customerId = customer.id;

    // Step 2: Get subaccount details from twilio_subaccounts table
    const { data: subaccount, error: subaccountError } = await supabase
      .from("twilio_subaccounts")
      .select("subaccount_sid, auth_token_encrypted")
      .eq("customer_id", customerId)
      .single();

    if (subaccountError || !subaccount) {
      console.error("Error fetching subaccount:", subaccountError);
      return null;
    }

    // Step 3: Decrypt the auth token
    let authToken: string;
    try {
      authToken = decryptToken(subaccount.auth_token_encrypted);
    } catch (error) {
      console.error("Error decrypting auth token:", error);
      return null;
    }

    // Step 4: Create and return Twilio client for this subaccount
    return twilio(subaccount.subaccount_sid, authToken);
  } catch (error) {
    console.error("Error getting subaccount client:", error);
    return null;
  }
  */
}

