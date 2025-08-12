import { Associate } from "@/model/interfaces/Associate";
import { createServerSupabaseClient } from "../supabase/server";
import { formatPhoneToE164, normalizePhoneForLookup } from "@/utils/phoneUtils";

// Get all associates
export async function getAssociates() {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("associates")
    .select("id, first_name, last_name, work_date, start_time, phone_number, email_address")
    .order("last_name", { ascending: true });

  if (error) {
    console.error("Supabase fetch error:", error);
    throw new Error("Failed to fetch associates");
  }

  return data;
}

// Insert associates
export async function insertAssociates(
  associates: {
    first_name: string;
    last_name: string;
    work_date: string;
    start_time: string;
    phone_number: string;
    email_address: string;
  }[]
) {
  const supabase = await createServerSupabaseClient();

  // Format phone numbers before insertion
  const formattedAssociates = associates.map(associate => {
    let formattedPhone = associate.phone_number;
    
    if (associate.phone_number && associate.phone_number.trim()) {
      try {
        formattedPhone = formatPhoneToE164(associate.phone_number);
      } catch (error) {
        console.warn(`Could not format phone number during insert: ${associate.phone_number}`, error);
        // Keep original if formatting fails
      }
    }

    return {
      ...associate,
      phone_number: formattedPhone
    };
  });

  const { data, error } = await supabase
    .from("associates")
    .insert(formattedAssociates)
    .select();

  if (error) {
    console.error("Supabase insert error:", error);
    throw new Error("Failed to insert associates");
  }

  return data;
}

// Update associate
export async function updateAssociate(
  id: string,
  updates: Partial<{
    first_name: string;
    last_name: string;
    work_date: string;
    start_time: string;
    phone_number: string;
    email_address: string;
  }>
) {
  const supabase = await createServerSupabaseClient();

  // Change start time to right format
  // const transformedUpdates = {
  //   ...updates,
  //   ...(updates.start_time && {
  //     start_time: formatTime(updates.start_time),
  //   }),
  // };

  const cleanedUpdates = Object.fromEntries(
    Object.entries(updates).filter(([, value]) => value !== "")
  );

  // Format phone number if it's being updated
  if (cleanedUpdates.phone_number) {
    try {
      cleanedUpdates.phone_number = formatPhoneToE164(cleanedUpdates.phone_number);
      console.log(`Phone formatted for update: ${updates.phone_number} → ${cleanedUpdates.phone_number}`);
    } catch (error) {
      console.warn(`Could not format phone number during update: ${updates.phone_number}`, error);
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

  return data;
}

// Delete associate
export async function deleteAssociate(id: string) {
  const supabase = await createServerSupabaseClient();

  const { error } = await supabase
    .from("associates")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Supabase delete error:", error);
    throw new Error("Failed to delete associate");
  }

  return { success: true };
}

/**
 * Find associate by phone number with normalization
 */
export async function getAssociateByPhone(phoneNumber: string): Promise<Associate | null> {
  const supabase = await createServerSupabaseClient();
  
  // Normalize the incoming phone number to E.164 format
  const normalizedPhone = normalizePhoneForLookup(phoneNumber);
  console.log(`Looking up phone: ${phoneNumber} → normalized: ${normalizedPhone}`);

  // First, try exact match with normalized number
  let { data, error } = await supabase
    .from("associates")
    .select("id, first_name, last_name, work_date, start_time, phone_number, email_address, sms_opt_out")
    .eq("phone_number", normalizedPhone)
    .single();

  // If no exact match and the phone numbers are different, try the original
  if (error && error.code === 'PGRST116' && normalizedPhone !== phoneNumber) {
    console.log(`No match for normalized phone, trying original: ${phoneNumber}`);
    
    const result = await supabase
      .from("associates")
      .select("id, first_name, last_name, work_date, start_time, phone_number, email_address, sms_opt_out")
      .eq("phone_number", phoneNumber)
      .single();
    
    data = result.data;
    error = result.error;
  }

  if (error) {
    if (error.code === 'PGRST116') {
      console.log(`No associate found for phone number: ${phoneNumber} (normalized: ${normalizedPhone})`);
      return null;
    }
    
    console.error("Supabase getting associate by phone number error:", error);
    throw new Error("Failed to retrieve Associate by phone number");
  }

  return data as Associate;
}

export async function optOutAssociate(associateId: string): Promise<void> {
  const supabase = await createServerSupabaseClient();

  const { error } = await supabase
    .from("associates")
    .update({ sms_opt_out: true})
    .eq("id", associateId)

  if (error) {
    console.error("Supabase Update Error", error);
    throw new Error("Failed to opt out associate of sms");
  }
}