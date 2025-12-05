import { createAdminClient } from "@/lib/supabase/admin";
import type { Tables } from "@/lib/database.types";

/**
 * Ensure an ISV customer record exists for a company
 * This is required by the Lambda message router to send SMS messages
 * @param companyId The company ID
 * @returns The ISV customer ID
 * @throws Error if Twilio subaccount is missing (company needs to complete setup)
 */
export async function ensureIsvCustomerForCompany(
  companyId: string
): Promise<string> {
  const supabase = createAdminClient();

  // Check if ISV customer already exists
  const { data: existingCustomers, error: existingError } = await supabase
    .from("isv_customers")
    .select("id")
    .eq("company_id", companyId)
    .limit(1);

  if (existingError) {
    console.error("Error checking for existing ISV customer:", existingError);
    throw new Error("Failed to check for existing ISV customer");
  }

  let customerId: string;

  if (existingCustomers && existingCustomers.length > 0) {
    customerId = existingCustomers[0].id;
  } else {
    // Get company details to create ISV customer
    const { data: company, error: companyError } = await supabase
      .from("companies")
      .select("id, company_name, email")
      .eq("id", companyId)
      .single();

    if (companyError || !company) {
      throw new Error("Company not found");
    }

    // Create ISV customer record
    const { data: customer, error: insertError } = await supabase
      .from("isv_customers")
      .insert({
        company_id: company.id,
        contact_email: company.email || "",
        legal_name: company.company_name,
        name: company.company_name,
      })
      .select("id")
      .single();

    if (insertError || !customer) {
      console.error("Error creating ISV customer:", insertError);
      throw new Error("Failed to create ISV customer record");
    }

    console.log(
      `Created ISV customer record for company ${companyId}: ${customer.id}`
    );
    customerId = customer.id;
  }

  // Check if Twilio subaccount exists for this ISV customer
  // This is required by the Lambda function to send messages
  const { data: subaccounts, error: subaccountError } = await supabase
    .from("twilio_subaccounts")
    .select("id")
    .eq("customer_id", customerId)
    .limit(1);

  if (subaccountError) {
    console.error("Error checking for Twilio subaccount:", subaccountError);
    throw new Error("Failed to check for Twilio subaccount");
  }

  if (!subaccounts || subaccounts.length === 0) {
    throw new Error(
      "Twilio subaccount not configured. Company must complete setup process to provision Twilio subaccount."
    );
  }

  return customerId;
}
