import { NextRequest, NextResponse } from "next/server";
import { AssociatesDaoSupabase } from "@/lib/dao/implementations/supabase/AssociatesDaoSupabase";
import {
  requireCompanyId,
  requireCompanyPhoneNumber,
} from "@/lib/auth/getCompanyId";
import { sendTwoWaySMS, sendReminderSMS, formatPhoneNumber } from "@/lib/twilio/sms";
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

    // Send opt-in messages to each new associate and create/update opt_info
    try {
      const companyId = await requireCompanyId();
      const companyPhoneNumber = await requireCompanyPhoneNumber(companyId);
      const supabaseAdmin = createAdminClient();

      // Fetch company name
      const { data: company, error: companyError } = await supabaseAdmin
        .from("companies")
        .select("company_name")
        .eq("id", companyId)
        .single();

      if (companyError) {
        console.error("Failed to fetch company name:", companyError);
      }

      const companyName = company?.company_name || "our company";

      // Only send if company phone number is configured
      if (companyPhoneNumber) {
        for (const associate of insertedAssociates) {
          // Only send if associate has a phone number
          if (associate.phone_number) {
            try {
              const formattedPhone = formatPhoneNumber(associate.phone_number);

              // Message 1: From company number
              const companyMessage = `This is ${companyName} you have opted in to be contacted by phone number. You may opt out at anytime using STOP keyword.`;
              
              await sendTwoWaySMS(
                {
                  to: formattedPhone,
                  body: companyMessage,
                },
                companyPhoneNumber
              );

              // Message 2: From reminder number
              const reminderMessage = `This is ${companyName} reminder phone number. This number is purely for information and notification about your upcoming job. You have opted in to be contacted by phone number. You may opt out at anytime using STOP keyword.`;
              
              await sendReminderSMS({
                to: formattedPhone,
                body: reminderMessage,
              });

              // Create or update opt_info record
              const { data: existingOptInfo } = await supabaseAdmin
                .from("opt_info")
                .select("associate_id")
                .eq("associate_id", associate.id)
                .single();

              if (existingOptInfo) {
                // Update existing record
                const { error: updateError } = await supabaseAdmin
                  .from("opt_info")
                  .update({
                    first_sms_opt_out: true,
                    first_reminder_opt_out: true,
                  })
                  .eq("associate_id", associate.id);

                if (updateError) {
                  console.error(
                    `Failed to update opt_info for associate ${associate.id}:`,
                    updateError
                  );
                }
              } else {
                // Insert new record
                const { error: insertError } = await supabaseAdmin
                  .from("opt_info")
                  .insert({
                    associate_id: associate.id,
                    first_sms_opt_out: true,
                    first_reminder_opt_out: true,
                  });

                if (insertError) {
                  console.error(
                    `Failed to create opt_info for associate ${associate.id}:`,
                    insertError
                  );
                }
              }
            } catch (smsError) {
              // Log error but don't fail associate creation
              console.error(
                `Failed to send opt-in messages to associate ${associate.id}:`,
                smsError
              );
            }
          }
        }
      }
    } catch (optInError) {
      // Log error but don't fail associate creation
      console.error("Failed to send opt-in messages:", optInError);
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
