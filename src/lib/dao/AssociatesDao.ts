import { createServerSupabaseClient } from "../supabase/server";

export async function insertAssociate(
  associate: {
    first_name: string;
    last_name: string;
    work_date: string;
    start_time: string;
    phone_number: string;
    email_address: string;
  }[]
) {
  const supabase = await createServerSupabaseClient();
  console.log("Associate: ", associate);

  const { data, error } = await supabase
    .from("associates")
    .insert(associate)
    .select();

  if (error) {
    console.error("Error in AssociateDao");
    throw new Error(JSON.stringify(error));
  }

  return data;
}

export async function getAssociates() {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("associates")
    .select(
      "id, first_name, last_name, work_date, start_time, phone_number, email_address"
    )
    .order("work_date", { ascending: false });

  if (error) {
    console.error("Supabase fetch error:", error);
    throw new Error("Failed to fetch associates");
  }

  return data;
}
