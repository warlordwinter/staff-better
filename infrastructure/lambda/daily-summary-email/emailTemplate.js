/**
 * Generates HTML email template for daily job assignment summary
 */

function formatDate(dateString) {
  if (!dateString) return "N/A";
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return dateString;
  }
}

function formatTime(timeString) {
  if (!timeString) return "N/A";
  try {
    // Handle various time formats
    if (timeString.includes("T")) {
      const date = new Date(timeString);
      return date.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
    }
    // Handle HH:MM:SS or HH:MM format
    const parts = timeString.split(":");
    if (parts.length >= 2) {
      const hour = parseInt(parts[0], 10);
      const minute = parts[1];
      const period = hour >= 12 ? "PM" : "AM";
      const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
      return `${displayHour}:${minute} ${period}`;
    }
    return timeString;
  } catch {
    return timeString;
  }
}

function generateEmailHTML(companyData) {
  const { company_name, assignments } = companyData;
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // Group assignments by status
  const confirmed = assignments.filter(
    (a) => a.confirmation_status === "CONFIRMED"
  );
  const pending = assignments.filter(
    (a) => a.confirmation_status === "UNCONFIRMED" || !a.confirmation_status
  );
  const declined = assignments.filter(
    (a) => a.confirmation_status === "DECLINED"
  );

  // Generate table rows for a status group
  function generateTableRows(statusAssignments) {
    if (statusAssignments.length === 0) {
      return `
        <tr>
          <td colspan="5" style="text-align: center; color: #666; padding: 20px;">
            No assignments in this category
          </td>
        </tr>
      `;
    }

    return statusAssignments
      .map((assignment) => {
        const associateName = `${assignment.associate_first_name || ""} ${
          assignment.associate_last_name || ""
        }`.trim() || "Unknown";
        return `
        <tr>
          <td style="padding: 10px; border-bottom: 1px solid #e0e0e0;">
            ${escapeHtml(associateName)}
          </td>
          <td style="padding: 10px; border-bottom: 1px solid #e0e0e0;">
            ${escapeHtml(assignment.job_title || "N/A")}
          </td>
          <td style="padding: 10px; border-bottom: 1px solid #e0e0e0;">
            ${escapeHtml(assignment.customer_name || "N/A")}
          </td>
          <td style="padding: 10px; border-bottom: 1px solid #e0e0e0;">
            ${formatDate(assignment.work_date)}
          </td>
          <td style="padding: 10px; border-bottom: 1px solid #e0e0e0;">
            ${formatTime(assignment.start_time)}
          </td>
        </tr>
      `;
      })
      .join("");
  }

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Daily Job Assignment Summary</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f5f5f5;">
    <tr>
      <td style="padding: 20px;">
        <table role="presentation" style="width: 100%; max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 30px 20px; background-color: #FF6B35; border-radius: 8px 8px 0 0; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px;">
                Daily Job Assignment Summary
              </h1>
              <p style="margin: 10px 0 0 0; color: #ffffff; font-size: 14px;">
                ${today}
              </p>
            </td>
          </tr>
          
          <!-- Company Name -->
          <tr>
            <td style="padding: 20px 20px 10px 20px;">
              <h2 style="margin: 0; color: #333333; font-size: 20px;">
                ${escapeHtml(company_name)}
              </h2>
            </td>
          </tr>
          
          <!-- Summary Statistics -->
          <tr>
            <td style="padding: 10px 20px 20px 20px;">
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 10px; background-color: #4CAF50; color: white; text-align: center; border-radius: 4px; margin-right: 10px; width: 33.33%;">
                    <div style="font-size: 28px; font-weight: bold;">${confirmed.length}</div>
                    <div style="font-size: 12px;">Confirmed</div>
                  </td>
                  <td style="padding: 10px; background-color: #FF9800; color: white; text-align: center; border-radius: 4px; margin: 0 5px; width: 33.33%;">
                    <div style="font-size: 28px; font-weight: bold;">${pending.length}</div>
                    <div style="font-size: 12px;">Pending</div>
                  </td>
                  <td style="padding: 10px; background-color: #F44336; color: white; text-align: center; border-radius: 4px; margin-left: 10px; width: 33.33%;">
                    <div style="font-size: 28px; font-weight: bold;">${declined.length}</div>
                    <div style="font-size: 12px;">Declined</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Confirmed Assignments Section -->
          <tr>
            <td style="padding: 20px;">
              <h3 style="margin: 0 0 15px 0; color: #4CAF50; font-size: 18px; border-bottom: 2px solid #4CAF50; padding-bottom: 5px;">
                ✓ Confirmed Assignments (${confirmed.length})
              </h3>
              <table role="presentation" style="width: 100%; border-collapse: collapse; border: 1px solid #e0e0e0;">
                <thead>
                  <tr style="background-color: #f9f9f9;">
                    <th style="padding: 12px; text-align: left; border-bottom: 2px solid #4CAF50; font-weight: bold; color: #333;">Associate</th>
                    <th style="padding: 12px; text-align: left; border-bottom: 2px solid #4CAF50; font-weight: bold; color: #333;">Job Title</th>
                    <th style="padding: 12px; text-align: left; border-bottom: 2px solid #4CAF50; font-weight: bold; color: #333;">Customer</th>
                    <th style="padding: 12px; text-align: left; border-bottom: 2px solid #4CAF50; font-weight: bold; color: #333;">Work Date</th>
                    <th style="padding: 12px; text-align: left; border-bottom: 2px solid #4CAF50; font-weight: bold; color: #333;">Start Time</th>
                  </tr>
                </thead>
                <tbody>
                  ${generateTableRows(confirmed)}
                </tbody>
              </table>
            </td>
          </tr>
          
          <!-- Pending Assignments Section -->
          <tr>
            <td style="padding: 20px;">
              <h3 style="margin: 0 0 15px 0; color: #FF9800; font-size: 18px; border-bottom: 2px solid #FF9800; padding-bottom: 5px;">
                ⏳ Pending Assignments (${pending.length})
              </h3>
              <table role="presentation" style="width: 100%; border-collapse: collapse; border: 1px solid #e0e0e0;">
                <thead>
                  <tr style="background-color: #f9f9f9;">
                    <th style="padding: 12px; text-align: left; border-bottom: 2px solid #FF9800; font-weight: bold; color: #333;">Associate</th>
                    <th style="padding: 12px; text-align: left; border-bottom: 2px solid #FF9800; font-weight: bold; color: #333;">Job Title</th>
                    <th style="padding: 12px; text-align: left; border-bottom: 2px solid #FF9800; font-weight: bold; color: #333;">Customer</th>
                    <th style="padding: 12px; text-align: left; border-bottom: 2px solid #FF9800; font-weight: bold; color: #333;">Work Date</th>
                    <th style="padding: 12px; text-align: left; border-bottom: 2px solid #FF9800; font-weight: bold; color: #333;">Start Time</th>
                  </tr>
                </thead>
                <tbody>
                  ${generateTableRows(pending)}
                </tbody>
              </table>
            </td>
          </tr>
          
          <!-- Declined Assignments Section -->
          <tr>
            <td style="padding: 20px;">
              <h3 style="margin: 0 0 15px 0; color: #F44336; font-size: 18px; border-bottom: 2px solid #F44336; padding-bottom: 5px;">
                ✗ Declined Assignments (${declined.length})
              </h3>
              <table role="presentation" style="width: 100%; border-collapse: collapse; border: 1px solid #e0e0e0;">
                <thead>
                  <tr style="background-color: #f9f9f9;">
                    <th style="padding: 12px; text-align: left; border-bottom: 2px solid #F44336; font-weight: bold; color: #333;">Associate</th>
                    <th style="padding: 12px; text-align: left; border-bottom: 2px solid #F44336; font-weight: bold; color: #333;">Job Title</th>
                    <th style="padding: 12px; text-align: left; border-bottom: 2px solid #F44336; font-weight: bold; color: #333;">Customer</th>
                    <th style="padding: 12px; text-align: left; border-bottom: 2px solid #F44336; font-weight: bold; color: #333;">Work Date</th>
                    <th style="padding: 12px; text-align: left; border-bottom: 2px solid #F44336; font-weight: bold; color: #333;">Start Time</th>
                  </tr>
                </thead>
                <tbody>
                  ${generateTableRows(declined)}
                </tbody>
              </table>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 20px; text-align: center; color: #666666; font-size: 12px; border-top: 1px solid #e0e0e0;">
              <p style="margin: 0;">
                This is an automated daily summary of job assignments for the next 3 days.
              </p>
              <p style="margin: 10px 0 0 0;">
                Total assignments: ${assignments.length}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

function escapeHtml(text) {
  if (!text) return "";
  const map = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };
  return String(text).replace(/[&<>"']/g, (m) => map[m]);
}

module.exports = { generateEmailHTML };

