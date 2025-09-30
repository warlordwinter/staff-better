import { NextRequest, NextResponse } from "next/server";
import { AssociatesDaoSupabase } from "@/lib/dao/implementations/supabase/AssociatesDaoSupabase";
import { Associate } from "@/model/interfaces/Associate";
import { formatPhoneToE164 } from "@/utils/phoneUtils";

const associatesDao = new AssociatesDaoSupabase();

export async function POST(req: NextRequest) {
  const body = await req.json();
  const rows = body.rows;

  try {
    const associateData = rows.map((r: Associate) => {
      let formattedPhone = r.phone_number;

      // Format phone number to E.164 if provided
      if (r.phone_number && r.phone_number.trim()) {
        try {
          formattedPhone = formatPhoneToE164(r.phone_number);
          console.log(`Phone formatted: ${r.phone_number} → ${formattedPhone}`);
        } catch (error) {
          console.warn(
            `Could not format phone number "${r.phone_number}":`,
            error
          );
          // Keep original if formatting fails - you might want to handle this differently
        }
      }

      return {
        first_name: r.first_name,
        last_name: r.last_name,
        work_date: r.work_date,
        start_time: r.start_time,
        phone_number: formattedPhone,
        email_address: r.email_address,
      };
    });

    console.log("Sending to Supabase:", associateData);

    const inserted = await associatesDao.insertAssociates(associateData);
    return NextResponse.json(inserted);
  } catch (err: unknown) {
    let parsedError = err;

    if (err instanceof Error) {
      try {
        parsedError = JSON.parse(err.message);
      } catch {
        // If JSON parsing fails, use the original error
        parsedError = { message: err.message };
      }
    }

    console.error("Insert failed:", parsedError);

    return NextResponse.json(
      {
        error: "Insert failed",
        ...(typeof parsedError === "object" && parsedError !== null
          ? parsedError
          : { message: String(parsedError) }),
      },
      { status: 500 }
    );
  }
}
