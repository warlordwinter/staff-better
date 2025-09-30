import { NextRequest, NextResponse } from "next/server";

import { serviceContainer } from "@/lib/services/ServiceContainer";

export async function POST(request: NextRequest) {
  try {
    const { jobId, associateId } = await request.json();

    const reminderService = serviceContainer.getReminderService();
    const result = await reminderService.sendTestReminder(jobId, associateId);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Reminder test error:", error);
    return NextResponse.json(
      { error: "Failed to send test reminder" },
      { status: 500 }
    );
  }
}
