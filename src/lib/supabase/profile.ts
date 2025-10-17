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
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    console.error("Authentication error:", userError);
    throw new Error(`Authentication failed: ${userError.message}`);
  }

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

  // Helper function to create a new company
  const createNewCompany = async () => {
    const companyData = {
      name: payload.companyName || "",
      email: payload.email ?? user.email,
      phone_number: payload.phoneNumber,
      zip_code: payload.zipCode ?? null,
      system_readiness: payload.systemReadiness || null,
      referral_source: payload.referralSource ?? null,
      setup_completed: true,
    };

    console.log("Creating company with data:", companyData);

    const { data: newCompany, error: companyError } = await supabase
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
        return retry.data;
      } else {
        throw new Error(`Failed to create company: ${companyError.message}`);
      }
    }
    return newCompany;
  };

  // Check if company already exists for this user
  const { data: existingCompany } = await supabase
    .from("company_managers")
    .select(`
      companies (
        id,
        name,
        email,
        phone_number,
        zip_code,
        system_readiness,
        referral_source,
        setup_completed,
        created_at,
        updated_at
      )
    `)
    .eq("user_id", existingUser.id)
    .single();

  let company;
  if (existingCompany && existingCompany.companies) {
    // Handle the case where companies might be an array or single object
    const companyData = Array.isArray(existingCompany.companies) 
      ? existingCompany.companies[0] 
      : existingCompany.companies;
    
    if (companyData) {
      // Company already exists, update it
      console.log("Updating existing company:", companyData.id);
      const updateData = {
        name: payload.companyName || companyData.name,
        email: payload.email ?? user.email,
        phone_number: payload.phoneNumber,
        zip_code: payload.zipCode ?? companyData.zip_code,
        system_readiness: payload.systemReadiness || companyData.system_readiness,
        referral_source: payload.referralSource ?? companyData.referral_source,
        setup_completed: true,
      };

      const { data: updatedCompany, error: updateError } = await supabase
        .from("companies")
        .update(updateData)
        .eq("id", companyData.id)
        .select()
        .single();

      if (updateError) {
        console.error("Company update error:", updateError);
        throw new Error(`Failed to update company: ${updateError.message}`);
      }
      company = updatedCompany;
    } else {
      // No company data found, create new one
      company = await createNewCompany();
    }
  } else {
    // Create new company record
    company = await createNewCompany();
  }

  // Create the company-manager relationship (only if it doesn't exist)
  console.log("Creating company-manager relationship:", {
    company_id: company.id,
    user_id: existingUser.id,
  });

  const { error: relationshipError } = await supabase
    .from("company_managers")
    .upsert({
      company_id: company.id,
      user_id: existingUser.id,
    }, {
      onConflict: 'company_id,user_id'
    });

  if (relationshipError) {
    console.error("Company-manager relationship error:", relationshipError);
    throw new Error(
      `Failed to create company-manager relationship: ${relationshipError.message}`
    );
  }

  console.log("Successfully created company and user setup");
  return { user: existingUser, company };
}
