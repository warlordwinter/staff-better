import { Associate } from "@/model/interfaces/Associate";
import { createClient } from "../../../supabase/server";
import { formatPhoneToE164, normalizePhoneForLookup } from "@/utils/phoneUtils";
import { IAssociates } from "../../interfaces/IAssociates";

export class AssociatesDaoSupabase implements IAssociates {
  // Get all associates - returns UTC times from database
  async getAssociates() {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("associates")
      .select(
        "id, first_name, last_name, work_date, start_date, phone_number, email_address"
      )
      .order("last_name", { ascending: true });

    if (error) {
      console.error("Supabase fetch error:", error);
      throw new Error("Failed to fetch associates");
    }

    // Format work_date to return only the date portion (YYYY-MM-DD)
    return data.map((associate) => ({
      ...associate,
      work_date: associate.work_date ? associate.work_date.split("T")[0] : null,
    }));
  }

  // Insert associates - expects UTC times from API layer
  async insertAssociates(
    associates: {
      first_name: string | null;
      last_name: string | null;
      work_date: string | null;
      start_date: string | null; // Date field, not time
      phone_number: string;
      email_address: string | null;
    }[]
  ) {
    const supabase = await createClient();

    // Format phone numbers and validate date fields before insertion
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

      // Validate and format start_date - ensure it's a proper date or null
      let formattedStartDate = associate.start_date;
      if (formattedStartDate && formattedStartDate.trim()) {
        // Check if it's a time value (like "14:00") and convert to null
        if (/^\d{1,2}:\d{2}$/.test(formattedStartDate.trim())) {
          console.warn(
            `start_date contains time value "${formattedStartDate}", setting to null`
          );
          formattedStartDate = null;
        } else {
          // Try to parse as a date
          const date = new Date(formattedStartDate);
          if (isNaN(date.getTime())) {
            console.warn(
              `Invalid start_date value "${formattedStartDate}", setting to null`
            );
            formattedStartDate = null;
          } else {
            // Format as ISO date string
            formattedStartDate = date.toISOString().split("T")[0];
          }
        }
      }

      // Validate and format work_date - ensure it's a proper date or null
      let formattedWorkDate = associate.work_date;
      if (formattedWorkDate && formattedWorkDate.trim()) {
        // Check if it's a time value (like "14:00") and convert to null
        if (/^\d{1,2}:\d{2}$/.test(formattedWorkDate.trim())) {
          console.warn(
            `work_date contains time value "${formattedWorkDate}", setting to null`
          );
          formattedWorkDate = null;
        } else {
          // Try to parse as a date
          const date = new Date(formattedWorkDate);
          if (isNaN(date.getTime())) {
            console.warn(
              `Invalid work_date value "${formattedWorkDate}", setting to null`
            );
            formattedWorkDate = null;
          } else {
            // Format as ISO date string
            formattedWorkDate = date.toISOString().split("T")[0];
          }
        }
      }

      return {
        ...associate,
        phone_number: formattedPhone,
        start_date: formattedStartDate,
        work_date: formattedWorkDate,
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

    // Format work_date to return only the date portion (YYYY-MM-DD)
    return data.map((associate) => ({
      ...associate,
      work_date: associate.work_date ? associate.work_date.split("T")[0] : null,
    }));
  }

  // Update associate - expects UTC times from API layer
  async updateAssociate(
    id: string,
    updates: Partial<{
      first_name: string | null;
      last_name: string | null;
      work_date: string | null;
      start_date: string | null; // Should already be in UTC format from API layer
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

    console.log("Cleaned Updates:", cleanedUpdates);

    const { data, error } = await supabase
      .from("associates")
      .update(cleanedUpdates)
      .eq("id", id)
      .select();

    if (error) {
      console.error("Supabase update error:", error);
      throw new Error("Failed to update associate");
    }

    // Format work_date to return only the date portion (YYYY-MM-DD)
    return data.map((associate) => ({
      ...associate,
      work_date: associate.work_date ? associate.work_date.split("T")[0] : null,
    }));
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
        "id, first_name, last_name, work_date, start_date, phone_number, email_address, sms_opt_out"
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
          "id, first_name, last_name, work_date, start_date, phone_number, email_address, sms_opt_out"
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

    // Format work_date to return only the date portion (YYYY-MM-DD)
    if (!data) {
      return null;
    }

    return {
      ...data,
      work_date: data.work_date ? data.work_date.split("T")[0] : null,
    } as Associate;
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
