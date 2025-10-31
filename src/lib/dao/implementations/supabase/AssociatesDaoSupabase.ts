import { Associate } from "@/model/interfaces/Associate";
import { createClient } from "../../../supabase/server";
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
    console.log("Updating associate ID:", id);

    const { data, error } = await supabase
      .from("associates")
      .update(cleanedUpdates)
      .eq("id", id)
      .select();

    if (error) {
      console.error("Supabase update error:", error);
      const errorMessage =
        error.message || "Failed to update associate in database";
      throw new Error(errorMessage);
    }

    // Check if any rows were actually updated
    if (!data || data.length === 0) {
      throw new Error(`Associate with ID ${id} not found`);
    }

    return data;
  }

  // Delete associate
  async deleteAssociate(id: string) {
    const supabase = await createClient();

    const { error } = await supabase.from("associates").delete().eq("id", id);

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
