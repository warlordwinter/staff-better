import { createAdminClient } from "@/lib/supabase/admin";
import {
  sendReminderSMS,
  sendTwoWaySMS,
  formatPhoneNumber,
} from "@/lib/twilio/sms";
import { getCompanyPhoneNumberAdmin } from "@/lib/auth/getCompanyId";

/**
 * Send reminder opt-out message if it hasn't been sent yet
 * @param associateId The associate ID
 * @param phoneNumber The associate's phone number
 * @param companyId The company ID
 * @returns true if message was sent, false if it was already sent or if there was an error
 */
export async function sendReminderOptOutIfNeeded(
  associateId: string,
  phoneNumber: string,
  companyId: string
): Promise<boolean> {
  try {
    const supabaseAdmin = createAdminClient();
    const formattedPhone = formatPhoneNumber(phoneNumber);

    // Get opt_info record
    const { data: optInfo } = await supabaseAdmin
      .from("opt_info")
      .select("first_reminder_opt_out")
      .eq("associate_id", associateId)
      .single();

    // If record doesn't exist or flag is false/null, we need to send the message
    const needsOptOutMessage =
      !optInfo ||
      optInfo.first_reminder_opt_out === false ||
      optInfo.first_reminder_opt_out === null;

    if (!needsOptOutMessage) {
      return false; // Already sent
    }

    // Get company name
    const { data: company, error: companyError } = await supabaseAdmin
      .from("companies")
      .select("company_name")
      .eq("id", companyId)
      .single();

    if (companyError) {
      console.error(
        "Failed to fetch company name for opt-out message:",
        companyError
      );
      return false;
    }

    const companyName = company?.company_name || "our company";

    // Send reminder opt-out message
    const reminderMessage = `This is ${companyName} reminder phone number. This number is purely for information and notification about your upcoming job. You have opted in to be contacted by phone number. You may opt out at anytime using STOP keyword.`;

    const smsResult = await sendReminderSMS({
      to: formattedPhone,
      body: reminderMessage,
    });

    if (!smsResult.success) {
      console.error(
        `Failed to send reminder opt-out message to associate ${associateId}:`,
        "error" in smsResult ? smsResult.error : "Unknown error"
      );
      return false;
    }

    // Update opt_info record
    if (optInfo) {
      // Update existing record
      const { error: updateError } = await supabaseAdmin
        .from("opt_info")
        .update({
          first_reminder_opt_out: true,
        })
        .eq("associate_id", associateId);

      if (updateError) {
        console.error(
          `Failed to update opt_info.first_reminder_opt_out for associate ${associateId}:`,
          updateError
        );
      }
    } else {
      // Create new record
      const { error: insertError } = await supabaseAdmin
        .from("opt_info")
        .insert({
          associate_id: associateId,
          first_reminder_opt_out: true,
          first_sms_opt_out: false,
        });

      if (insertError) {
        console.error(
          `Failed to create opt_info with first_reminder_opt_out for associate ${associateId}:`,
          insertError
        );
      }
    }

    return true;
  } catch (error) {
    console.error(
      `Error sending reminder opt-out message to associate ${associateId}:`,
      error
    );
    return false;
  }
}

/**
 * Send SMS opt-out message if it hasn't been sent yet
 * @param associateId The associate ID
 * @param phoneNumber The associate's phone number
 * @param companyId The company ID
 * @param companyPhoneNumber The company's two-way phone number (optional, will be fetched if not provided)
 * @returns true if message was sent, false if it was already sent or if there was an error
 */
export async function sendSMSOptOutIfNeeded(
  associateId: string,
  phoneNumber: string,
  companyId: string,
  companyPhoneNumber?: string
): Promise<boolean> {
  try {
    const supabaseAdmin = createAdminClient();
    const formattedPhone = formatPhoneNumber(phoneNumber);

    // Get opt_info record
    const { data: optInfo } = await supabaseAdmin
      .from("opt_info")
      .select("first_sms_opt_out")
      .eq("associate_id", associateId)
      .single();

    // If record doesn't exist or flag is false/null, we need to send the message
    const needsOptOutMessage =
      !optInfo ||
      optInfo.first_sms_opt_out === false ||
      optInfo.first_sms_opt_out === null;

    if (!needsOptOutMessage) {
      return false; // Already sent
    }

    // Get company phone number if not provided
    let twoWayPhoneNumber: string | undefined = companyPhoneNumber;
    if (!twoWayPhoneNumber) {
      twoWayPhoneNumber = (await getCompanyPhoneNumberAdmin(companyId)) || "";
      if (!twoWayPhoneNumber) {
        console.error(
          `Company phone number not found for company ${companyId}, cannot send SMS opt-out message`
        );
        return false;
      }
    }

    // Get company name
    const { data: company, error: companyError } = await supabaseAdmin
      .from("companies")
      .select("company_name")
      .eq("id", companyId)
      .single();

    if (companyError) {
      console.error(
        "Failed to fetch company name for opt-out message:",
        companyError
      );
      return false;
    }

    const companyName = company?.company_name || "our company";

    // Send SMS opt-out message
    const companyMessage = `This is ${companyName} you have opted in to be contacted by phone number. You may opt out at anytime using STOP keyword.`;

    const smsResult = await sendTwoWaySMS(
      {
        to: formattedPhone,
        body: companyMessage,
      },
      twoWayPhoneNumber
    );

    if (!smsResult.success) {
      console.error(
        `Failed to send SMS opt-out message to associate ${associateId}:`,
        "error" in smsResult ? smsResult.error : "Unknown error"
      );
      return false;
    }

    // Update opt_info record
    if (optInfo) {
      // Update existing record
      const { error: updateError } = await supabaseAdmin
        .from("opt_info")
        .update({
          first_sms_opt_out: true,
        })
        .eq("associate_id", associateId);

      if (updateError) {
        console.error(
          `Failed to update opt_info.first_sms_opt_out for associate ${associateId}:`,
          updateError
        );
      }
    } else {
      // Create new record
      const { error: insertError } = await supabaseAdmin
        .from("opt_info")
        .insert({
          associate_id: associateId,
          first_sms_opt_out: true,
          first_reminder_opt_out: false,
        });

      if (insertError) {
        console.error(
          `Failed to create opt_info with first_sms_opt_out for associate ${associateId}:`,
          insertError
        );
      }
    }

    return true;
  } catch (error) {
    console.error(
      `Error sending SMS opt-out message to associate ${associateId}:`,
      error
    );
    return false;
  }
}
