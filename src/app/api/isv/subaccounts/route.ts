// API route for Twilio subaccount management
import { NextRequest, NextResponse } from "next/server";
import { SubaccountService } from "@/lib/isv/services/SubaccountService";
import { requireAuthWithSetup } from "@/lib/auth/utils";

/**
 * POST /api/isv/subaccounts
 * Create a subaccount for a customer
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuthWithSetup();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { customer_id } = body;

    if (!customer_id) {
      return NextResponse.json(
        { error: "customer_id is required" },
        { status: 400 }
      );
    }

    const subaccountService = new SubaccountService();
    const subaccount = await subaccountService.createSubaccountForCustomer(
      customer_id
    );

    return NextResponse.json(subaccount, { status: 201 });
  } catch (error) {
    console.error("Error creating subaccount:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to create subaccount",
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/isv/subaccounts?customer_id=xxx
 * Delete a subaccount for a customer
 */
export async function DELETE(request: NextRequest) {
  try {
    const user = await requireAuthWithSetup();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get("customer_id");

    if (!customerId) {
      return NextResponse.json(
        { error: "customer_id query parameter is required" },
        { status: 400 }
      );
    }

    const subaccountService = new SubaccountService();
    await subaccountService.deleteSubaccountForCustomer(customerId);

    return NextResponse.json(
      { message: "Subaccount deleted successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error deleting subaccount:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to delete subaccount",
      },
      { status: 500 }
    );
  }
}
