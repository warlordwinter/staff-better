import { createClient } from "@/lib/supabase/server";

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


