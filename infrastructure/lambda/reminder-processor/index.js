const twilio = require("twilio");
const { createClient } = require("@supabase/supabase-js");

/**
 * Lambda handler for processing reminders
 * Receives: { job_id, work_date, start_time, reminder_type }
 * Queries database for all assignments, sends personalized SMS to each associate
 */
exports.handler = async (event) => {
  console.log(
    "Reminder processor Lambda invoked:",
    JSON.stringify(event, null, 2)
  );

  // Validate environment variables
  const requiredEnvVars = [
    "TWILIO_SID",
    "TWILIO_AUTH",
    "TWILIO_DEFAULT_FROM",
    "SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
  ];

  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      const error = `Missing required environment variable: ${envVar}`;
      console.error(error);
      return {
        statusCode: 500,
        body: JSON.stringify({ error }),
      };
    }
  }

  // Parse event payload
  let payload;
  try {
    // EventBridge passes the payload in event.body as a string
    payload =
      typeof event.body === "string" ? JSON.parse(event.body) : event.body;

    // If body is not present, check if event itself is the payload
    if (!payload.job_id && event.job_id) {
      payload = event;
    }
  } catch (error) {
    console.error("Error parsing event payload:", error);
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Invalid event payload format" }),
    };
  }

  const { job_id, work_date, start_time, reminder_type } = payload;

  if (!job_id || !work_date || !start_time || !reminder_type) {
    const error =
      "Missing required fields: job_id, work_date, start_time, reminder_type";
    console.error(error);
    return {
      statusCode: 400,
      body: JSON.stringify({ error }),
    };
  }

  // Validate reminder_type
  if (reminder_type !== "DAY_BEFORE" && reminder_type !== "TWO_HOURS_BEFORE") {
    const error = `Invalid reminder_type: ${reminder_type}. Must be DAY_BEFORE or TWO_HOURS_BEFORE`;
    console.error(error);
    return {
      statusCode: 400,
      body: JSON.stringify({ error }),
    };
  }

  // Initialize clients
  const twilioClient = twilio(process.env.TWILIO_SID, process.env.TWILIO_AUTH);
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const results = {
    processed: 0,
    successful: 0,
    failed: 0,
    assignments: [],
  };

  try {
    // Query database for all assignments matching job_id, work_date, start_time
    console.log(
      `Querying assignments for job_id=${job_id}, work_date=${work_date}, start_time=${start_time}`
    );

    const { data: assignments, error: queryError } = await supabase
      .from("job_assignments")
      .select(
        `
        job_id,
        associate_id,
        work_date,
        start_time,
        num_reminders,
        last_reminder_time,
        confirmation_status,
        associates!inner (
          first_name,
          last_name,
          phone_number
        ),
        jobs!inner (
          job_title,
          customer_name
        )
      `
      )
      .eq("job_id", job_id)
      .eq("work_date", work_date)
      .eq("start_time", start_time);

    if (queryError) {
      throw new Error(`Database query error: ${queryError.message}`);
    }

    if (!assignments || assignments.length === 0) {
      console.log("No assignments found for the given criteria");
      return {
        statusCode: 200,
        body: JSON.stringify({
          message: "No assignments found",
          results,
        }),
      };
    }

    console.log(`Found ${assignments.length} assignments`);

    // Filter assignments
    const now = new Date();
    const filteredAssignments = assignments.filter((assignment) => {
      // Exclude if confirmed or declined
      if (
        assignment.confirmation_status === "CONFIRMED" ||
        assignment.confirmation_status === "DECLINED"
      ) {
        console.log(
          `Skipping assignment ${assignment.associate_id}: status is ${assignment.confirmation_status}`
        );
        return false;
      }

      // Exclude if no reminders left
      if (!assignment.num_reminders || assignment.num_reminders <= 0) {
        console.log(
          `Skipping assignment ${assignment.associate_id}: num_reminders is ${assignment.num_reminders}`
        );
        return false;
      }

      // Check if recently reminded (4 hours for day-of, 24 hours for other days)
      if (assignment.last_reminder_time) {
        const lastReminderTime = new Date(assignment.last_reminder_time);
        const workDate = new Date(assignment.work_date);
        const isJobToday = workDate.toDateString() === now.toDateString();

        const cutoffTime = new Date();
        if (isJobToday) {
          cutoffTime.setHours(cutoffTime.getHours() - 4);
        } else {
          cutoffTime.setHours(cutoffTime.getHours() - 24);
        }

        if (lastReminderTime >= cutoffTime) {
          console.log(
            `Skipping assignment ${assignment.associate_id}: recently reminded`
          );
          return false;
        }
      }

      return true;
    });

    console.log(
      `Filtered to ${filteredAssignments.length} assignments that need reminders`
    );

    // Process each assignment
    for (const assignment of filteredAssignments) {
      results.processed++;

      const associate = Array.isArray(assignment.associates)
        ? assignment.associates[0]
        : assignment.associates;
      const job = Array.isArray(assignment.jobs)
        ? assignment.jobs[0]
        : assignment.jobs;

      if (!associate || !job) {
        console.error(
          `Missing associate or job data for assignment ${assignment.associate_id}`
        );
        results.failed++;
        results.assignments.push({
          associate_id: assignment.associate_id,
          success: false,
          error: "Missing associate or job data",
        });
        continue;
      }

      try {
        // Generate personalized message
        const messageBody = generateReminderMessage(
          associate.first_name,
          job.job_title,
          job.customer_name,
          assignment.work_date,
          assignment.start_time,
          reminder_type
        );

        // Format phone number
        const phoneNumber = formatPhoneNumber(associate.phone_number);

        // Send SMS via Twilio
        console.log(
          `Sending SMS to ${phoneNumber} for associate ${associate.first_name}`
        );
        const twilioMessage = await twilioClient.messages.create({
          to: phoneNumber,
          from: process.env.TWILIO_DEFAULT_FROM,
          body: messageBody,
        });

        console.log(`SMS sent successfully. Message SID: ${twilioMessage.sid}`);

        // Update database: decrement num_reminders, update last_reminder_time
        const currentReminders = assignment.num_reminders || 0;
        const { error: updateError } = await supabase
          .from("job_assignments")
          .update({
            num_reminders: Math.max(0, currentReminders - 1),
            last_reminder_time: now.toISOString(),
          })
          .eq("job_id", job_id)
          .eq("associate_id", assignment.associate_id);

        if (updateError) {
          console.error(
            `Error updating database for ${assignment.associate_id}:`,
            updateError
          );
          // Don't fail the whole operation, but log the error
        }

        results.successful++;
        results.assignments.push({
          associate_id: assignment.associate_id,
          phone_number: phoneNumber,
          success: true,
          message_id: twilioMessage.sid,
        });

        // Small delay to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 200));
      } catch (error) {
        console.error(
          `Error processing assignment ${assignment.associate_id}:`,
          error
        );
        results.failed++;
        results.assignments.push({
          associate_id: assignment.associate_id,
          success: false,
          error: error.message || "Unknown error",
        });
      }
    }

    console.log(
      `Processing complete. Processed: ${results.processed}, Successful: ${results.successful}, Failed: ${results.failed}`
    );

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Reminders processed",
        results,
      }),
    };
  } catch (error) {
    console.error("Fatal error in Lambda handler:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: error.message || "Internal server error",
        results,
      }),
    };
  }
};

/**
 * Generate personalized reminder message
 */
function generateReminderMessage(
  firstName,
  jobTitle,
  customerName,
  workDate,
  startTime,
  reminderType
) {
  const workDateObj = new Date(workDate);
  const workDateStr = workDateObj.toLocaleDateString("en-US", {
    timeZone: "UTC",
  });
  const timeStr = formatTime(startTime);
  const baseInfo = `${jobTitle} for ${customerName} on ${workDateStr} at ${timeStr}`;

  if (reminderType === "DAY_BEFORE") {
    return `Hi ${firstName}!\n\nReminder: You have ${baseInfo} tomorrow.\n\nPlease confirm you'll be there.\n\nReply C to confirm or call us.\n\nReply HELP for help, STOP to opt out.`;
  } else if (reminderType === "TWO_HOURS_BEFORE") {
    return `Hi ${firstName}!\n\nYour ${baseInfo} starts in about 2 hours.\n\nPlease confirm that you will be able to make it, if not please inform us ASAP!\n\nReply C to confirm or call us.\n\nReply HELP for help, STOP to opt out.`;
  } else {
    return `Hi ${firstName}!\n\nReminder about your ${baseInfo}.`;
  }
}

/**
 * Format time string to readable format
 */
function formatTime(timeString) {
  let hours, minutes;

  // Check if timeString is an ISO datetime string
  if (timeString.includes("T")) {
    try {
      const isoDate = new Date(timeString);
      if (!isNaN(isoDate.getTime())) {
        hours = isoDate.getUTCHours();
        minutes = isoDate.getUTCMinutes();
      } else {
        return timeString;
      }
    } catch {
      return timeString;
    }
  } else {
    // Parse time string (e.g., "19:00:00")
    const timeParts = timeString.split(":");
    if (timeParts.length < 2) {
      return timeString;
    }

    hours = parseInt(timeParts[0], 10);
    minutes = parseInt(timeParts[1], 10);

    if (
      isNaN(hours) ||
      isNaN(minutes) ||
      hours < 0 ||
      hours > 23 ||
      minutes < 0 ||
      minutes > 59
    ) {
      return timeString;
    }
  }

  const period = hours >= 12 ? "PM" : "AM";
  const displayHours = hours > 12 ? hours - 12 : hours || 12;
  return `${displayHours}:${minutes.toString().padStart(2, "0")} ${period}`;
}

/**
 * Format phone number to E.164 format
 */
function formatPhoneNumber(phoneNumber) {
  if (!phoneNumber) {
    throw new Error("Phone number is required");
  }

  // Remove all non-digits
  const digitsOnly = phoneNumber.replace(/\D/g, "");

  // If it's 10 digits, assume US number and add +1
  if (digitsOnly.length === 10) {
    return `+1${digitsOnly}`;
  }

  // If it's 11 digits and starts with 1, add +
  if (digitsOnly.length === 11 && digitsOnly.startsWith("1")) {
    return `+${digitsOnly}`;
  }

  // If it already has +, return as is
  if (phoneNumber.startsWith("+")) {
    return phoneNumber;
  }

  // Otherwise, return the original
  return phoneNumber;
}
