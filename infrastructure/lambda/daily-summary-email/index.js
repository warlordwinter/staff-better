const { SESClient, SendEmailCommand } = require("@aws-sdk/client-ses");
const { generateEmailHTML } = require("./emailTemplate");

/**
 * Lambda handler for sending daily email summaries
 * Calls the API endpoint to get summary data, then sends HTML emails via SES
 */
exports.handler = async (event) => {
  console.log(
    "Daily summary email Lambda invoked:",
    JSON.stringify(event, null, 2)
  );

  // Validate environment variables
  const requiredEnvVars = [
    "API_BASE_URL",
    "CRON_SECRET",
    "SES_FROM_EMAIL",
    "AWS_REGION",
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

  const apiBaseUrl = process.env.API_BASE_URL;
  const cronSecret = process.env.CRON_SECRET;
  const fromEmail = process.env.SES_FROM_EMAIL;
  const awsRegion = process.env.AWS_REGION || "us-east-1";

  // Initialize SES client
  const sesClient = new SESClient({ region: awsRegion });

  try {
    // Call API endpoint to get daily summary data
    console.log(`Calling API endpoint: ${apiBaseUrl}/api/daily-summary`);
    const apiResponse = await fetch(`${apiBaseUrl}/api/daily-summary`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${cronSecret}`,
        "Content-Type": "application/json",
      },
    });

    if (!apiResponse.ok) {
      const errorText = await apiResponse.text();
      throw new Error(
        `API call failed with status ${apiResponse.status}: ${errorText}`
      );
    }

    const data = await apiResponse.json();
    const { companies } = data;

    if (!companies || companies.length === 0) {
      console.log("No companies found with assignments. No emails to send.");
      return {
        statusCode: 200,
        body: JSON.stringify({
          message: "No companies found with assignments",
          emailsSent: 0,
        }),
      };
    }

    console.log(`Found ${companies.length} companies to send emails to`);

    const results = {
      totalCompanies: companies.length,
      emailsSent: 0,
      emailsFailed: 0,
      errors: [],
    };

    // Send email to each company
    for (const companyData of companies) {
      try {
        const { company_name, email, assignments } = companyData;

        if (!email) {
          console.warn(
            `Skipping company ${company_name} - no email address`
          );
          results.errors.push({
            company: company_name,
            error: "No email address",
          });
          continue;
        }

        if (!assignments || assignments.length === 0) {
          console.log(
            `Skipping company ${company_name} - no assignments`
          );
          continue;
        }

        console.log(
          `Sending email to ${email} for company ${company_name} (${assignments.length} assignments)`
        );

        // Generate HTML email
        const htmlContent = generateEmailHTML(companyData);
        const today = new Date().toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        });

        // Send email via SES
        const sendEmailCommand = new SendEmailCommand({
          Source: fromEmail,
          Destination: {
            ToAddresses: [email],
          },
          Message: {
            Subject: {
              Data: `Daily Job Assignment Summary - ${today}`,
              Charset: "UTF-8",
            },
            Body: {
              Html: {
                Data: htmlContent,
                Charset: "UTF-8",
              },
            },
          },
        });

        const sesResponse = await sesClient.send(sendEmailCommand);
        console.log(
          `Email sent successfully to ${email}. MessageId: ${sesResponse.MessageId}`
        );
        results.emailsSent++;
      } catch (error) {
        console.error(
          `Error sending email to company ${companyData.company_name}:`,
          error
        );
        results.emailsFailed++;
        results.errors.push({
          company: companyData.company_name || "Unknown",
          email: companyData.email || "Unknown",
          error: error.message || "Unknown error",
        });
      }
    }

    console.log("Email summary results:", JSON.stringify(results, null, 2));

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Daily summary emails processed",
        ...results,
      }),
    };
  } catch (error) {
    console.error("Error in daily summary email Lambda:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: error.message || "Unknown error",
        stack: error.stack,
      }),
    };
  }
};

