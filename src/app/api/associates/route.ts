import { NextRequest, NextResponse } from "next/server";
import { AssociatesDaoSupabase } from "@/lib/dao/implementations/supabase/AssociatesDaoSupabase";
import { isValidPhoneNumber } from "@/utils/phoneUtils";

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

    const sanitizedAssociates = associatesToInsert.map((associate, index) => {
      const firstName =
        typeof associate.first_name === "string"
          ? associate.first_name.trim()
          : "";
      const lastName =
        typeof associate.last_name === "string"
          ? associate.last_name.trim()
          : "";
      // Handle phone_number: keep null if null, convert empty string to null, otherwise trim
      const phoneNumber =
        associate.phone_number === null || associate.phone_number === undefined
          ? null
          : typeof associate.phone_number === "string"
          ? associate.phone_number.trim() || null
          : null;
      const emailAddress =
        typeof associate.email_address === "string"
          ? associate.email_address.trim() || null
          : null;

      return {
        first_name: firstName,
        last_name: lastName,
        phone_number: phoneNumber,
        email_address: emailAddress,
        _originalIndex: index,
      };
    });

    const emailRegex = /\S+@\S+\.\S+/;

    for (const associate of sanitizedAssociates) {
      const rowLabel = `Row ${associate._originalIndex + 1}`;

      if (!associate.first_name || !associate.first_name.trim()) {
        return NextResponse.json(
          { error: `${rowLabel}: First name is required.` },
          { status: 400 }
        );
      }
      if (!associate.last_name || !associate.last_name.trim()) {
        return NextResponse.json(
          { error: `${rowLabel}: Last name is required.` },
          { status: 400 }
        );
      }
      // Phone number is optional - if provided, do basic validation
      if (
        associate.phone_number !== null &&
        associate.phone_number !== undefined &&
        typeof associate.phone_number === "string" &&
        associate.phone_number.trim()
      ) {
        const digitsOnly = associate.phone_number.replace(/\D/g, "");
        // Require at least 10 digits for valid phone numbers (7-digit local numbers are not valid)
        if (digitsOnly.length < 10) {
          return NextResponse.json(
            {
              error: `${rowLabel}: Phone number must have at least 10 digits. Found ${digitsOnly.length} digit(s).`,
            },
            { status: 400 }
          );
        }
        // Validate format for 10+ digit numbers
        if (!isValidPhoneNumber(associate.phone_number)) {
          return NextResponse.json(
            { error: `${rowLabel}: Invalid phone number format.` },
            { status: 400 }
          );
        }
      }
      // Email is optional, but if provided, validate it
      if (
        associate.email_address !== null &&
        associate.email_address !== undefined &&
        typeof associate.email_address === "string" &&
        associate.email_address.trim() &&
        !emailRegex.test(associate.email_address)
      ) {
        return NextResponse.json(
          { error: `${rowLabel}: Invalid email address.` },
          { status: 400 }
        );
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const payload = sanitizedAssociates.map(({ _originalIndex, ...rest }) => ({
      ...rest,
      phone_number: rest.phone_number || null,
      email_address: rest.email_address || null,
    }));

    // Log what we're sending to the DAO
    console.log(
      "[API Route] Payload being sent to DAO:",
      JSON.stringify(
        payload.map((p) => ({
          first_name: p.first_name,
          last_name: p.last_name,
          phone_number: p.phone_number,
          email_address: p.email_address,
        })),
        null,
        2
      )
    );

    const insertedAssociates = await associatesDao.insertAssociates(payload);
    return NextResponse.json(insertedAssociates, { status: 201 });
  } catch (error) {
    console.error("Failed to create associate:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to create associate";
    // Include more details in development
    const errorDetails =
      process.env.NODE_ENV === "development" ? { details: String(error) } : {};
    return NextResponse.json(
      { error: errorMessage, ...errorDetails },
      { status: 500 }
    );
  }
}
