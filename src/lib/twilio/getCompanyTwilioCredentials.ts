import { createAdminClient } from "@/lib/supabase/admin";
import { decrypt } from "@/lib/isv/encryption/encrypt";

/**
 * Get Twilio credentials for a company from Supabase
 * Looks up the company's Twilio subaccount credentials
 *
 * @param companyId The company ID
 * @returns Twilio credentials (accountSid and authToken) or null if not found
 */
export async function getCompanyTwilioCredentials(companyId: string): Promise<{
  accountSid: string;
  authToken: string;
} | null> {
  try {
    const supabase = createAdminClient();

    // Step 1: Get customer_id from isv_customers table using company_id
    const { data: customer, error: customerError } = await supabase
      .from("isv_customers")
      .select("id")
      .eq("company_id", companyId)
      .single();

    if (customerError || !customer) {
      console.log(`No ISV customer found for company ${companyId}`);
      return null;
    }

    const customerId = customer.id;

    // Step 2: Get subaccount details from twilio_subaccounts table
    const { data: subaccount, error: subaccountError } = await supabase
      .from("twilio_subaccounts")
      .select("subaccount_sid, auth_token_encrypted, status")
      .eq("customer_id", customerId)
      .eq("status", "active")
      .single();

    if (subaccountError || !subaccount) {
      console.log(
        `No active Twilio subaccount found for customer ${customerId}`
      );
      return null;
    }

    // Step 3: Decrypt the auth token using ISV encryption
    let authToken: string;
    try {
      authToken = decrypt(subaccount.auth_token_encrypted);
    } catch (error) {
      console.error("Error decrypting auth token:", error);
      return null;
    }

    return {
      accountSid: subaccount.subaccount_sid,
      authToken: authToken,
    };
  } catch (error) {
    console.error("Error getting company Twilio credentials:", error);
    return null;
  }
}
