import { Associate } from "@/model/interfaces/Associate";
import { createClient } from "../../../supabase/server";
import { createServiceClient } from "../../../supabase/service";
import { formatPhoneToE164, normalizePhoneForLookup } from "@/utils/phoneUtils";
import { IAssociates } from "../../interfaces/IAssociates";

export class AssociatesDaoSupabase implements IAssociates {
  // Get all associates for a specific company
  async getAssociates(companyId?: string) {
    // Use service client to bypass RLS policies
    const supabase = createServiceClient();

    if (!companyId) {
      // If no company ID provided, return empty array
      return [];
    }

    // Use INNER JOIN approach to only get company_associates with valid users
    // This prevents orphaned records from being returned
    const { data, error } = await supabase
      .from("company_associates")
      .select(
        `
        user_id,
        users!inner (
          id, 
          first_name, 
          last_name, 
          phone_number, 
          email, 
          whatsapp, 
          sms_opt_out
        )
      `
      )
      .eq("company_id", companyId);

    console.log("Company associates query result:", { data, error, companyId });

    if (error) {
      console.error("Supabase fetch error:", error);
      throw new Error("Failed to fetch associates");
    }

    // Transform users data to match Associate interface
    const associates: Associate[] =
      (data?.map((item: any) => {
        const user = item.users;
        return {
          id: user.id,
          first_name: user.first_name,
          last_name: user.last_name,
          work_date: "", // Not stored in users table
          start_time: "", // Not stored in users table
          phone_number: user.phone_number,
          email_address: user.email || undefined,
          whatsapp: user.whatsapp || undefined,
        };
      }) as Associate[]) || [];

    // Sort by last name
    associates.sort((a, b) => a.last_name.localeCompare(b.last_name));

    return associates;
  }

  // Insert associates - creates users with ASSOCIATE role and links them to company
  async insertAssociates(
    associates: {
      first_name: string;
      last_name: string;
      work_date: string;
      start_time: string; // Not stored in users table, but kept for interface compatibility
      phone_number: string;
      email_address?: string;
      whatsapp?: string;
    }[],
    companyId: string
  ) {
    // Use service client to bypass RLS for associate creation
    const supabase = createServiceClient();

    // Step 1: Validate company exists
    const { data: company, error: companyError } = await supabase
      .from("companies")
      .select("id")
      .eq("id", companyId)
      .single();

    if (companyError || !company) {
      throw new Error(`Company not found: ${companyId}`);
    }

    // Step 2: Check for duplicate phone numbers
    const phoneNumbers = associates
      .map((a) => a.phone_number)
      .filter((phone) => phone && phone.trim());

    if (phoneNumbers.length > 0) {
      const { data: existingUsers } = await supabase
        .from("users")
        .select("phone_number, role, first_name, last_name")
        .in("phone_number", phoneNumbers);

      if (existingUsers && existingUsers.length > 0) {
        const conflictDetails = existingUsers
          .map(
            (u) =>
              `${u.phone_number} (${u.first_name} ${u.last_name}, ${u.role})`
          )
          .join(", ");

        throw new Error(
          `Phone numbers already exist: ${conflictDetails}. Please use different phone numbers or contact support if this is an error.`
        );
      }
    }

    // Step 3: Use database transaction (if supported) or manual rollback
    try {
      // Format and prepare users
      const formattedUsers = associates.map((associate) => {
        let formattedPhone = associate.phone_number;
        if (associate.phone_number && associate.phone_number.trim()) {
          try {
            formattedPhone = formatPhoneToE164(associate.phone_number);
          } catch (error) {
            throw new Error(`Invalid phone number: ${associate.phone_number}`);
          }
        }

        return {
          first_name: associate.first_name,
          last_name: associate.last_name,
          role: "ASSOCIATE" as const,
          phone_number: formattedPhone,
          email: associate.email_address || null,
          whatsapp: associate.whatsapp || null,
          sms_opt_out: false,
        };
      });

      // Step 4: Insert users
      const { data: insertedUsers, error: userError } = await supabase
        .from("users")
        .insert(formattedUsers)
        .select();

      if (userError) {
        throw new Error(`Failed to create users: ${userError.message}`);
      }

      if (!insertedUsers || insertedUsers.length === 0) {
        throw new Error("No users were created");
      }

      // Step 5: Create company relationships
      const companyAssociates = insertedUsers.map((user) => ({
        company_id: companyId,
        user_id: user.id,
      }));

      const { error: relationshipError } = await supabase
        .from("company_associates")
        .insert(companyAssociates);

      if (relationshipError) {
        // Rollback: Delete the users we just created
        const userIds = insertedUsers.map((u) => u.id);
        await supabase.from("users").delete().in("id", userIds);

        throw new Error(
          `Failed to link associates to company: ${relationshipError.message}`
        );
      }

      // Step 6: Verify the relationships were created
      const { data: verifyRelationships, error: verifyError } = await supabase
        .from("company_associates")
        .select("user_id")
        .eq("company_id", companyId)
        .in(
          "user_id",
          insertedUsers.map((u) => u.id)
        );

      if (
        verifyError ||
        !verifyRelationships ||
        verifyRelationships.length !== insertedUsers.length
      ) {
        // Rollback if verification fails
        const userIds = insertedUsers.map((u) => u.id);
        await supabase.from("users").delete().in("id", userIds);
        await supabase
          .from("company_associates")
          .delete()
          .in("user_id", userIds);

        throw new Error("Failed to verify company-associate relationships");
      }

      // Step 7: Return transformed data
      return insertedUsers.map((user) => ({
        id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        work_date: "", // Not stored in users table
        start_time: "", // Not stored in users table
        phone_number: user.phone_number,
        email_address: user.email || undefined,
        whatsapp: user.whatsapp || undefined,
      }));
    } catch (error) {
      console.error("Associate creation failed:", error);
      throw error;
    }
  }

  // Update associate - updates user with ASSOCIATE role (validates company ownership)
  async updateAssociate(
    id: string,
    updates: Partial<{
      first_name: string;
      last_name: string;
      work_date: string; // Not stored in users table
      start_time: string; // Not stored in users table
      phone_number: string;
      email_address?: string;
      whatsapp?: string;
    }>,
    companyId: string
  ) {
    const supabase = await createClient();

    // First, verify the associate belongs to the company
    const { data: companyAssociate, error: verifyError } = await supabase
      .from("company_associates")
      .select("user_id")
      .eq("company_id", companyId)
      .eq("user_id", id)
      .single();

    if (verifyError || !companyAssociate) {
      throw new Error("Associate not found in company or access denied");
    }

    // Filter out work_date and start_time as they're not stored in users table
    const { work_date, start_time, ...userUpdates } = updates;

    const cleanedUpdates = Object.fromEntries(
      Object.entries(userUpdates).filter(([, value]) => value !== "")
    );

    // Transform email_address to email for users table
    if (cleanedUpdates.email_address !== undefined) {
      cleanedUpdates.email = cleanedUpdates.email_address;
      delete cleanedUpdates.email_address;
    }

    // Format phone number if it's being updated
    if (cleanedUpdates.phone_number) {
      try {
        cleanedUpdates.phone_number = formatPhoneToE164(
          cleanedUpdates.phone_number
        );
        console.log(
          `Phone formatted for update: ${updates.phone_number} → ${cleanedUpdates.phone_number}`
        );
      } catch (error) {
        console.warn(
          `Could not format phone number during update: ${updates.phone_number}`,
          error
        );
        // Keep original if formatting fails
      }
    }

    console.log("Cleaned Updates:", cleanedUpdates);

    const { data, error } = await supabase
      .from("users")
      .update(cleanedUpdates)
      .eq("id", id)
      .eq("role", "ASSOCIATE")
      .select();

    if (error) {
      console.error("Supabase update error:", error);
      throw new Error("Failed to update associate");
    }

    // Transform back to Associate interface format
    const transformedData =
      data?.map((user) => ({
        id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        work_date: "", // Not stored in users table
        start_time: "", // Not stored in users table
        phone_number: user.phone_number,
        email_address: user.email || undefined,
        whatsapp: user.whatsapp || undefined,
      })) || [];

    return transformedData;
  }

  // Delete associate
  async deleteAssociate(id: string) {
    // Use service client to bypass RLS for associate deletion
    const supabase = createServiceClient();

    const { error } = await supabase
      .from("users")
      .delete()
      .eq("id", id)
      .eq("role", "ASSOCIATE");

    if (error) {
      console.error("Supabase delete error:", error);
      throw new Error("Failed to delete associate");
    }

    return { success: true };
  }

  /**
   * Find associate by phone number with normalization
   * Returns UTC times from database
   */
  async getAssociateByPhone(phoneNumber: string): Promise<Associate | null> {
    const supabase = await createClient();

    // Normalize the incoming phone number to E.164 format
    const normalizedPhone = normalizePhoneForLookup(phoneNumber);
    console.log(
      `Looking up phone: ${phoneNumber} → normalized: ${normalizedPhone}`
    );

    // First, try exact match with normalized number
    let { data, error } = await supabase
      .from("users")
      .select(
        "id, first_name, last_name, phone_number, email, whatsapp, sms_opt_out"
      )
      .eq("phone_number", normalizedPhone)
      .eq("role", "ASSOCIATE")
      .single();

    // If no exact match and the phone numbers are different, try the original
    if (error && error.code === "PGRST116" && normalizedPhone !== phoneNumber) {
      console.log(
        `No match for normalized phone, trying original: ${phoneNumber}`
      );

      const result = await supabase
        .from("users")
        .select(
          "id, first_name, last_name, phone_number, email, whatsapp, sms_opt_out"
        )
        .eq("phone_number", phoneNumber)
        .eq("role", "ASSOCIATE")
        .single();

      data = result.data;
      error = result.error;
    }

    if (error) {
      if (error.code === "PGRST116") {
        console.log(
          `No associate found for phone number: ${phoneNumber} (normalized: ${normalizedPhone})`
        );
        return null;
      }

      console.error("Supabase getting associate by phone number error:", error);
      throw new Error("Failed to retrieve Associate by phone number");
    }

    // Transform to Associate interface format
    const associate: Associate = {
      id: data!.id,
      first_name: data!.first_name,
      last_name: data!.last_name,
      work_date: "", // Not stored in users table
      start_time: "", // Not stored in users table
      phone_number: data!.phone_number,
      email_address: data!.email || undefined,
      whatsapp: data!.whatsapp || undefined,
    };

    return associate;
  }

  async optOutAssociate(associateId: string): Promise<void> {
    const supabase = await createClient();

    const { error } = await supabase
      .from("users")
      .update({ sms_opt_out: true })
      .eq("id", associateId)
      .eq("role", "ASSOCIATE");

    if (error) {
      console.error("Supabase Update Error", error);
      throw new Error("Failed to opt out associate of sms");
    }
  }
}
