import { NextRequest, NextResponse } from "next/server";
import { AssociatesDaoSupabase } from "@/lib/dao/implementations/supabase/AssociatesDaoSupabase";
import { requireCompanyId } from "@/lib/auth/getCompanyId";
import { createAdminClient } from "@/lib/supabase/admin";

const associatesDao = new AssociatesDaoSupabase();

export async function GET() {
  try {
    const associates = await associatesDao.getAssociates();
    return NextResponse.json(associates);
  } catch (error) {
    console.error("Failed to fetch associates:", error);
    return NextResponse.json(
      { error: "Failed to fetch associates" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Handle single associate or array of associates
    const associatesToInsert = Array.isArray(body) ? body : [body];

    const insertedAssociates = await associatesDao.insertAssociates(
      associatesToInsert
    );

    // Create opt_info records for new associates (opt-out messages will be sent on first contact)
    try {
      const companyId = await requireCompanyId();
      const supabaseAdmin = createAdminClient();

      for (const associate of insertedAssociates) {
        // Only create opt_info if associate has a phone number
        if (associate.phone_number) {
          try {
            // Check if opt_info record already exists
            const { data: existingOptInfo } = await supabaseAdmin
              .from("opt_info")
              .select("associate_id")
              .eq("associate_id", associate.id)
              .single();

            if (!existingOptInfo) {
              // Insert new record with flags set to false (opt-out messages not sent yet)
              const { error: insertError } = await supabaseAdmin
                .from("opt_info")
                .insert({
                  associate_id: associate.id,
                  first_sms_opt_out: false,
                  first_reminder_opt_out: false,
                });

              if (insertError) {
                console.error(
                  `Failed to create opt_info for associate ${associate.id}:`,
                  insertError
                );
              }
            }
          } catch (optInfoError) {
            // Log error but don't fail associate creation
            console.error(
              `Failed to create opt_info for associate ${associate.id}:`,
              optInfoError
            );
          }
        }
      }
    } catch (optInfoError) {
      // Log error but don't fail associate creation
      console.error("Failed to create opt_info records:", optInfoError);
    }

    return NextResponse.json(insertedAssociates, { status: 201 });
  } catch (error) {
    console.error("Failed to create associate:", error);
    return NextResponse.json(
      { error: "Failed to create associate" },
      { status: 500 }
    );
  }
}
