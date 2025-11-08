import { NextRequest, NextResponse } from "next/server";
import { AssociatesDaoSupabase } from "@/lib/dao/implementations/supabase/AssociatesDaoSupabase";
import {
  requireCompanyId,
  requireCompanyPhoneNumber,
} from "@/lib/auth/getCompanyId";
import { sendTwoWaySMS, formatPhoneNumber } from "@/lib/twilio/sms";

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

    // Send opt-in message to each new associate
    try {
      const companyId = await requireCompanyId();
      const companyPhoneNumber = await requireCompanyPhoneNumber(companyId);

      // Only send if company phone number is configured
      if (companyPhoneNumber) {
        for (const associate of insertedAssociates) {
          // Only send if associate has a phone number
          if (associate.phone_number) {
            try {
              const formattedPhone = formatPhoneNumber(associate.phone_number);
              const firstName = associate.first_name || "there";
              const optInMessage = `Hi ${firstName}! You've been added to our system. Reply START to receive text reminders about your assignments. Reply STOP to opt out anytime.`;

              await sendTwoWaySMS(
                {
                  to: formattedPhone,
                  body: optInMessage,
                },
                companyPhoneNumber
              );
            } catch (smsError) {
              // Log error but don't fail associate creation
              console.error(
                `Failed to send opt-in message to associate ${associate.id}:`,
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
