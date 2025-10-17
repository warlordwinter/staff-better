import { createClient } from "@/lib/supabase/client";

export async function upsertProfile(payload: {
  companyName?: string;
  nonTempEmployees?: number | null;
  email?: string | null;
  phoneNumber?: string;
  zipCode?: string | null;
  systemReadiness?: string | null;
  referralSource?: string | null;
  firstName?: string;
  lastName?: string;
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("No authenticated user");
  }

  const auth_id = user.id;

  // First, ensure user record exists
  let { data: existingUser } = await supabase
    .from("users")
    .select("*")
    .eq("auth_id", auth_id)
    .single();

  if (!existingUser) {
    // Create user record if it doesn't exist
    const firstName =
      payload.firstName ||
      (user.user_metadata?.full_name || user.email || "User").split(" ")[0] ||
      "User";
    const lastName =
      payload.lastName ||
      (user.user_metadata?.full_name || "").split(" ").slice(1).join(" ") ||
      "";

    const userData = {
      first_name: firstName,
      last_name: lastName,
      email: user.email,
      phone_number: payload.phoneNumber,
      auth_id: user.id,
      role: "MANAGER",
    };

    console.log("Creating user with data:", userData);

    const { data: newUser, error: userError } = await supabase
      .from("users")
      .insert(userData)
      .select()
      .single();

    if (userError) {
      console.error("User creation error:", userError);
      throw new Error(`Failed to create user: ${userError.message}`);
    }
    existingUser = newUser;
  } else if (payload.firstName || payload.lastName || payload.phoneNumber) {
    // Update existing user with new information
    const { data: updatedUser, error: updateError } = await supabase
      .from("users")
      .update({
        first_name: payload.firstName || existingUser.first_name,
        last_name: payload.lastName || existingUser.last_name,
        phone_number: payload.phoneNumber,
      })
      .eq("id", existingUser.id)
      .select()
      .single();

    if (updateError) {
      throw new Error(`Failed to update user: ${updateError.message}`);
    }
    existingUser = updatedUser;
  }

  // Create or update company record
  const companyData = {
    name: payload.companyName || "",
    email: payload.email ?? user.email,
    phone_number: payload.phoneNumber,
    zip_code: payload.zipCode ?? null,
    system_readiness: payload.systemReadiness || null, // Use the form value or null
    referral_source: payload.referralSource ?? null,
    setup_completed: true,
  };

  console.log("Creating company with data:", companyData);

  const { data: company, error: companyError } = await supabase
    .from("companies")
    .insert(companyData)
    .select()
    .single();

  if (companyError) {
    console.error("Company creation error:", companyError);
    // handle transient errors (simple retry once)
    if (companyError.message && companyError.message.includes("network")) {
      const retry = await supabase
        .from("companies")
        .insert(companyData)
        .select()
        .single();
      if (retry.error) throw retry.error;
      return { user: existingUser, company: retry.data };
    }
    throw new Error(`Failed to create company: ${companyError.message}`);
  }

  // Create the company-manager relationship
  const { error: relationshipError } = await supabase
    .from("company_managers")
    .insert({
      company_id: company.id,
      user_id: existingUser.id,
    });

  if (relationshipError) {
    throw new Error(
      `Failed to create company-manager relationship: ${relationshipError.message}`
    );
  }

  return { user: existingUser, company };
}
