import { Associate } from "@/model/interfaces/Associate";
import { createClient } from "../../../supabase/server";
import { createAdminClient } from "../../../supabase/admin";
import { formatPhoneToE164, normalizePhoneForLookup } from "@/utils/phoneUtils";
import { IAssociates } from "../../interfaces/IAssociates";

export class AssociatesDaoSupabase implements IAssociates {
  // Get all associates
  async getAssociates() {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("associates")
      .select("id, first_name, last_name, phone_number, email_address")
      .order("last_name", { ascending: true });

    if (error) {
      console.error("Supabase fetch error:", error);
      throw new Error("Failed to fetch associates");
    }

    return data;
  }

  // Insert associates
  async insertAssociates(
    associates: {
      first_name: string | null;
      last_name: string | null;
      phone_number: string;
      email_address: string | null;
    }[]
  ) {
    const supabase = await createClient();

    // Format phone numbers before insertion
    const formattedAssociates = associates.map((associate) => {
      let formattedPhone = associate.phone_number;

      if (associate.phone_number && associate.phone_number.trim()) {
        try {
          formattedPhone = formatPhoneToE164(associate.phone_number);
        } catch (error) {
          console.warn(
            `Could not format phone number during insert: ${associate.phone_number}`,
            error
          );
          // Keep original if formatting fails
        }
      }

      return {
        ...associate,
        phone_number: formattedPhone,
      };
    });

    // Log the data being inserted for debugging
    console.log(
      "Inserting associates data:",
      JSON.stringify(formattedAssociates, null, 2)
    );

    const { data, error } = await supabase
      .from("associates")
      .insert(formattedAssociates)
      .select();

    if (error) {
      console.error("Supabase insert error:", error);
      console.error(
        "Data that caused the error:",
        JSON.stringify(formattedAssociates, null, 2)
      );
      throw new Error("Failed to insert associates");
    }

    return data;
  }

  // Update associate
  async updateAssociate(
    id: string,
    updates: Partial<{
      first_name: string | null;
      last_name: string | null;
      phone_number: string;
      email_address: string | null;
    }>
  ) {
    const supabase = await createClient();

    const cleanedUpdates = Object.fromEntries(
      Object.entries(updates).filter(([, value]) => value !== "")
    );

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

    // Check if we have any updates after cleaning
    if (Object.keys(cleanedUpdates).length === 0) {
      throw new Error("No valid fields to update (all values were empty)");
    }

    console.log("Cleaned Updates:", cleanedUpdates);
    console.log("🔍 [DEBUG] updateAssociate - Updating associate with ID:", id);

    // First check if the associate exists
    const { error: checkError } = await supabase
      .from("associates")
      .select("id")
      .eq("id", id)
      .single();

    if (checkError) {
      console.error(
        "🔍 [DEBUG] Associate not found with ID:",
        id,
        "Error:",
        checkError
      );
      throw new Error("Associate not found");
    }

    console.log("🔍 [DEBUG] Associate found, proceeding with update");

    const { data, error } = await supabase
      .from("associates")
      .update(cleanedUpdates)
      .eq("id", id)
      .select();

    if (error) {
      console.error("Supabase update error:", error);
      throw new Error("Failed to update associate");
    }

    console.log("🔍 [DEBUG] updateAssociate - Supabase returned data:", data);
    console.log(
      "🔍 [DEBUG] updateAssociate - Data type:",
      typeof data,
      "Is array:",
      Array.isArray(data)
    );

    return data;
  }

  // Delete associate
  async deleteAssociate(id: string) {
    // Use regular client to check existence (respects RLS for read)
    const supabase = await createClient();

    // Use admin client for deletion operations (bypasses RLS)
    const adminSupabase = createAdminClient();

    // First, check if the associate exists
    const { data: existingAssociate, error: checkError } = await supabase
      .from("associates")
      .select("id")
      .eq("id", id)
      .single();

    if (checkError) {
      // If associate doesn't exist, that's fine - idempotent delete
      if (checkError.code === "PGRST116") {
        console.log(`Associate ${id} not found, treating as already deleted`);
        return { success: true };
      }
      console.error("Error checking associate existence:", checkError);
      throw new Error(`Failed to check associate: ${checkError.message}`);
    }

    if (!existingAssociate) {
      // Associate doesn't exist, treat as success (idempotent)
      console.log(`Associate ${id} not found, treating as already deleted`);
      return { success: true };
    }

    // Use admin client to delete related records that reference this associate
    // Delete from group_associates
    const { error: groupAssociatesError } = await adminSupabase
      .from("group_associates")
      .delete()
      .eq("associate_id", id);

    if (groupAssociatesError) {
      console.error(
        "Error deleting from group_associates:",
        groupAssociatesError
      );
      // Continue anyway - might not have any group associations
    }

    // Delete from job_assignments
    const { error: jobAssignmentsError } = await adminSupabase
      .from("job_assignments")
      .delete()
      .eq("associate_id", id);

    if (jobAssignmentsError) {
      console.error(
        "Error deleting from job_assignments:",
        jobAssignmentsError
      );
      // Continue anyway - might not have any job assignments
    }

    // Delete from conversations
    const { error: conversationsError } = await adminSupabase
      .from("conversations")
      .delete()
      .eq("associate_id", id);

    if (conversationsError) {
      console.error("Error deleting from conversations:", conversationsError);
      // Continue anyway - might not have any conversations
    }

    // Now delete the associate itself using admin client (bypasses RLS)
    const { data, error } = await adminSupabase
      .from("associates")
      .delete()
      .eq("id", id)
      .select();

    if (error) {
      console.error("Supabase delete error:", error);

      // Check for foreign key constraint violation
      if (error.code === "23503") {
        throw new Error(
          "Cannot delete associate: still referenced by other records. Please remove all group memberships, job assignments, and conversations first."
        );
      }

      throw new Error(`Failed to delete associate: ${error.message}`);
    }

    // Check if any rows were actually deleted
    if (!data || data.length === 0) {
      // With admin client, if no rows were deleted, the associate likely doesn't exist
      // This shouldn't happen if we checked existence first, but handle it gracefully
      console.warn(
        `Associate ${id} deletion returned no rows. This might indicate the associate was already deleted.`
      );
      return { success: true };
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
      .from("associates")
      .select(
        "id, first_name, last_name, phone_number, email_address, sms_opt_out"
      )
      .eq("phone_number", normalizedPhone)
      .single();

    // If no exact match and the phone numbers are different, try the original
    if (error && error.code === "PGRST116" && normalizedPhone !== phoneNumber) {
      console.log(
        `No match for normalized phone, trying original: ${phoneNumber}`
      );

      const result = await supabase
        .from("associates")
        .select(
          "id, first_name, last_name, phone_number, email_address, sms_opt_out"
        )
        .eq("phone_number", phoneNumber)
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

    if (!data) {
      return null;
    }

    return data as Associate;
  }

  async optOutAssociate(associateId: string): Promise<void> {
    const supabase = await createClient();

    const { error } = await supabase
      .from("associates")
      .update({ sms_opt_out: true })
      .eq("id", associateId);

    if (error) {
      console.error("Supabase Update Error", error);
      throw new Error("Failed to opt out associate of sms");
    }
  }
}
