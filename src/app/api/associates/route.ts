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
      const phoneNumber =
        typeof associate.phone_number === "string"
          ? associate.phone_number.trim()
          : "";
      const emailAddress =
        typeof associate.email_address === "string"
          ? associate.email_address.trim()
          : "";

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
      if (associate.phone_number && associate.phone_number.trim()) {
        // Check if it has at least some digits (7+ digits for local numbers, 10+ for full numbers)
        const digitsOnly = associate.phone_number.replace(/\D/g, "");
        if (digitsOnly.length < 7) {
          return NextResponse.json(
            { error: `${rowLabel}: Phone number appears to be too short.` },
            { status: 400 }
          );
        }
        // If it has 10+ digits, validate format more strictly
        if (
          digitsOnly.length >= 10 &&
          !isValidPhoneNumber(associate.phone_number)
        ) {
          return NextResponse.json(
            { error: `${rowLabel}: Invalid phone number format.` },
            { status: 400 }
          );
        }
      }
      // Email is optional, but if provided, validate it
      if (
        associate.email_address &&
        associate.email_address.trim() &&
        !emailRegex.test(associate.email_address)
      ) {
        return NextResponse.json(
          { error: `${rowLabel}: Invalid email address.` },
          { status: 400 }
        );
      }
    }

    const payload = sanitizedAssociates.map(({ _originalIndex, ...rest }) => ({
      ...rest,
      email_address: rest.email_address || null,
    }));

    const insertedAssociates = await associatesDao.insertAssociates(payload);
    return NextResponse.json(insertedAssociates, { status: 201 });
  } catch (error) {
    console.error("Failed to create associate:", error);
    return NextResponse.json(
      { error: "Failed to create associate" },
      { status: 500 }
    );
  }
}
