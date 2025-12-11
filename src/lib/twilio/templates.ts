import { TwilioTemplate, TwilioTemplateListResult } from "./types";
import { getCompanyTwilioCredentials } from "./getCompanyTwilioCredentials";

/**
 * Fetch all approved WhatsApp templates from Twilio Content API
 * Uses REST API calls since Content API may not be directly available in SDK
 *
 * @param options - Optional filters for template fetching
 * @param companyId - Optional company ID to fetch templates for a specific company's Twilio account
 * @returns Promise resolving to list of approved templates
 *
 * @example
 * ```typescript
 * const templates = await fetchApprovedTemplates();
 * console.log(`Found ${templates.templates.length} approved templates`);
 * ```
 */
export async function fetchApprovedTemplates(
  options?: {
    includePending?: boolean;
    contentType?: string;
  },
  companyId?: string
): Promise<TwilioTemplateListResult> {
  try {
    console.log(
      "📋 [TEMPLATE DEBUG] Fetching templates from Twilio Content API..."
    );

    // Get Twilio credentials - try company-specific first, fall back to env vars
    let accountSid: string | undefined;
    let authToken: string | undefined;

    if (companyId) {
      const credentials = await getCompanyTwilioCredentials(companyId);
      if (credentials) {
        accountSid = credentials.accountSid;
        authToken = credentials.authToken;
        console.log(
          `📋 [TEMPLATE DEBUG] Using company-specific Twilio account for company ${companyId}`
        );
      }
    }

    // Fall back to environment variables if no company-specific credentials found
    if (!accountSid || !authToken) {
      accountSid = process.env.TWILIO_ACCOUNT_SID;
      authToken = process.env.TWILIO_AUTH_TOKEN;
      if (companyId) {
        console.log(
          `📋 [TEMPLATE DEBUG] Falling back to environment variables for company ${companyId}`
        );
      }
    }

    if (!accountSid || !authToken) {
      throw new Error("TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN are required");
    }

    // Fetch all content templates using REST API
    const response = await fetch("https://content.twilio.com/v1/Content", {
      method: "GET",
      headers: {
        Authorization: `Basic ${Buffer.from(
          `${accountSid}:${authToken}`
        ).toString("base64")}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Failed to fetch templates: ${response.status} ${errorText}`
      );
    }

    const data = await response.json();
    // Try different possible field names for the contents array
    const contents = data.contents || data.data || [];

    console.log(
      `📋 [TEMPLATE DEBUG] Found ${contents.length} total content templates`
    );
    console.log(
      `📋 [TEMPLATE DEBUG] Response structure:`,
      JSON.stringify(Object.keys(data), null, 2)
    );

    const approvedTemplates: TwilioTemplate[] = [];
    const errors: string[] = [];

    // Process each template to check approval status
    for (const content of contents) {
      try {
        // Skip if content type filter is specified and doesn't match
        if (
          options?.contentType &&
          content.types &&
          !content.types[options.contentType]
        ) {
          continue;
        }

        // Fetch approval requests for this content using REST API
        const approvalResponse = await fetch(
          `https://content.twilio.com/v1/Content/${content.sid}/ApprovalRequests`,
          {
            method: "GET",
            headers: {
              Authorization: `Basic ${Buffer.from(
                `${accountSid}:${authToken}`
              ).toString("base64")}`,
            },
          }
        );

        let approvalRequests: any[] = [];
        let approvedRequest: any = null;

        if (approvalResponse.ok) {
          const approvalData = await approvalResponse.json();
          // Try different possible field names
          approvalRequests =
            approvalData.approval_requests ||
            approvalData.approvalRequests ||
            approvalData.data ||
            [];

          // Check if any approval request is approved
          approvedRequest = approvalRequests.find(
            (req) =>
              req.status === "approved" || req.approval_status === "approved"
          );
        }

        // Also check if content has WhatsApp eligibility directly
        // Some templates might be approved but not have approval requests
        const hasWhatsAppEligibility =
          content.whatsapp_eligible ||
          content.whatsappEligible ||
          (content.types &&
            (content.types["twilio/text"] || content.types["twilio/media"]));

        // Include template if:
        // 1. It has an approved request, OR
        // 2. It has WhatsApp eligibility (which means it's approved for WhatsApp), OR
        // 3. includePending is true
        const shouldInclude =
          approvedRequest || hasWhatsAppEligibility || options?.includePending;

        if (shouldInclude) {
          // Fetch detailed content information using REST API
          const contentResponse = await fetch(
            `https://content.twilio.com/v1/Content/${content.sid}`,
            {
              method: "GET",
              headers: {
                Authorization: `Basic ${Buffer.from(
                  `${accountSid}:${authToken}`
                ).toString("base64")}`,
              },
            }
          );

          if (!contentResponse.ok) {
            throw new Error(
              `Failed to fetch content details: ${contentResponse.status}`
            );
          }

          const contentDetails = await contentResponse.json();

          // Extract template variables from content
          const variables: string[] = [];
          if (contentDetails.types) {
            // Parse variables from template content
            // WhatsApp templates use {{1}}, {{2}}, etc. for variables
            const variableRegex = /\{\{(\d+)\}\}/g;
            const contentStr = JSON.stringify(contentDetails.types);
            let match;
            while ((match = variableRegex.exec(contentStr)) !== null) {
              if (!variables.includes(match[1])) {
                variables.push(match[1]);
              }
            }
          }

          // Determine status: if approved request exists, use "approved",
          // otherwise if WhatsApp eligible, also consider it approved
          const templateStatus = approvedRequest
            ? "approved"
            : hasWhatsAppEligibility
            ? "approved"
            : "pending";

          const template: TwilioTemplate = {
            sid: content.sid,
            friendlyName:
              content.friendlyName || content.friendly_name || content.sid,
            accountSid: content.accountSid || content.account_sid,
            dateCreated: content.dateCreated || content.date_created,
            dateUpdated: content.dateUpdated || content.date_updated,
            url: content.url,
            status: templateStatus,
            approvalRequestSid: approvedRequest?.sid || null,
            contentType: contentDetails.types
              ? Object.keys(contentDetails.types)[0]
              : null,
            variables: variables.sort((a, b) => parseInt(a) - parseInt(b)),
            // Extract the actual message content from types
            content: extractContentFromTypes(contentDetails.types),
          };

          approvedTemplates.push(template);
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        errors.push(
          `Error processing template ${content.sid}: ${errorMessage}`
        );
        console.error(
          `📋 [TEMPLATE DEBUG] Error processing template ${content.sid}:`,
          errorMessage
        );
      }
    }

    console.log(
      `📋 [TEMPLATE DEBUG] Found ${approvedTemplates.length} approved templates`
    );

    return {
      success: true,
      templates: approvedTemplates,
      total: approvedTemplates.length,
      errors: errors.length > 0 ? errors : undefined,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    console.error(
      "📋 [TEMPLATE DEBUG] Error fetching templates:",
      errorMessage
    );

    return {
      success: false,
      templates: [],
      total: 0,
      error: errorMessage,
    };
  }
}

/**
 * Fetch a specific template by SID
 *
 * @param templateSid - The SID of the template to fetch
 * @returns Promise resolving to template details or null if not found
 */
export async function fetchTemplateBySid(
  templateSid: string,
  companyId?: string
): Promise<TwilioTemplate | null> {
  try {
    // Get Twilio credentials - try company-specific first, fall back to env vars
    let accountSid: string | undefined;
    let authToken: string | undefined;

    if (companyId) {
      const credentials = await getCompanyTwilioCredentials(companyId);
      if (credentials) {
        accountSid = credentials.accountSid;
        authToken = credentials.authToken;
      }
    }

    // Fall back to environment variables if no company-specific credentials found
    if (!accountSid || !authToken) {
      accountSid = process.env.TWILIO_ACCOUNT_SID;
      authToken = process.env.TWILIO_AUTH_TOKEN;
    }

    if (!accountSid || !authToken) {
      throw new Error("TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN are required");
    }

    // Fetch content details using REST API
    const contentResponse = await fetch(
      `https://content.twilio.com/v1/Content/${templateSid}`,
      {
        method: "GET",
        headers: {
          Authorization: `Basic ${Buffer.from(
            `${accountSid}:${authToken}`
          ).toString("base64")}`,
        },
      }
    );

    if (!contentResponse.ok) {
      return null;
    }

    const content = await contentResponse.json();

    // Fetch approval requests using REST API
    const approvalResponse = await fetch(
      `https://content.twilio.com/v1/Content/${templateSid}/ApprovalRequests`,
      {
        method: "GET",
        headers: {
          Authorization: `Basic ${Buffer.from(
            `${accountSid}:${authToken}`
          ).toString("base64")}`,
        },
      }
    );

    let approvalRequests: any[] = [];
    let approvedRequest: any = null;

    if (approvalResponse.ok) {
      const approvalData = await approvalResponse.json();
      // Try different possible field names
      approvalRequests =
        approvalData.approval_requests ||
        approvalData.approvalRequests ||
        approvalData.data ||
        [];

      // Check if any approval request is approved
      approvedRequest = approvalRequests.find(
        (req) => req.status === "approved" || req.approval_status === "approved"
      );
    }

    // Also check if content has WhatsApp eligibility directly
    const hasWhatsAppEligibility =
      content.whatsapp_eligible ||
      content.whatsappEligible ||
      (content.types &&
        (content.types["twilio/text"] || content.types["twilio/media"]));

    // Determine status
    const templateStatus = approvedRequest
      ? "approved"
      : hasWhatsAppEligibility
      ? "approved"
      : "pending";

    // Extract variables
    const variables: string[] = [];
    if (content.types) {
      const variableRegex = /\{\{(\d+)\}\}/g;
      const contentStr = JSON.stringify(content.types);
      let match;
      while ((match = variableRegex.exec(contentStr)) !== null) {
        if (!variables.includes(match[1])) {
          variables.push(match[1]);
        }
      }
    }

    return {
      sid: content.sid,
      friendlyName:
        content.friendlyName || content.friendly_name || content.sid,
      accountSid: content.accountSid || content.account_sid,
      dateCreated: content.dateCreated || content.date_created,
      dateUpdated: content.dateUpdated || content.date_updated,
      url: content.url,
      status: templateStatus,
      approvalRequestSid: approvedRequest?.sid || null,
      contentType: content.types ? Object.keys(content.types)[0] : null,
      variables: variables.sort((a, b) => parseInt(a) - parseInt(b)),
      content: extractContentFromTypes(content.types),
    };
  } catch (error) {
    console.error(
      `📋 [TEMPLATE DEBUG] Error fetching template ${templateSid}:`,
      error
    );
    return null;
  }
}

/**
 * Extract readable content from Twilio content types object
 *
 * @param types - Twilio content types object
 * @returns Extracted content string
 */
function extractContentFromTypes(types: any): string | null {
  if (!types) return null;

  // Try to extract from twilio/text type (WhatsApp)
  if (types["twilio/text"]) {
    return types["twilio/text"].body || null;
  }

  // Try to extract from other common types
  if (types["twilio/media"]) {
    return types["twilio/media"].body || null;
  }

  // Fallback: return stringified version
  return JSON.stringify(types);
}

/**
 * Create a new WhatsApp template in Twilio Content API
 *
 * @param templateData - Template creation data
 * @returns Promise resolving to created template SID
 */
export async function createTemplate(
  templateData: {
    friendlyName: string;
    body: string;
    language?: string;
  },
  companyId?: string
): Promise<{ sid: string; status: string }> {
  try {
    // Get Twilio credentials - try company-specific first, fall back to env vars
    let accountSid: string | undefined;
    let authToken: string | undefined;

    if (companyId) {
      const credentials = await getCompanyTwilioCredentials(companyId);
      if (credentials) {
        accountSid = credentials.accountSid;
        authToken = credentials.authToken;
      }
    }

    // Fall back to environment variables if no company-specific credentials found
    if (!accountSid || !authToken) {
      accountSid = process.env.TWILIO_ACCOUNT_SID;
      authToken = process.env.TWILIO_AUTH_TOKEN;
    }

    if (!accountSid || !authToken) {
      throw new Error("TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN are required");
    }

    console.log("📋 [TEMPLATE DEBUG] Creating template in Twilio:", {
      friendlyName: templateData.friendlyName,
      language: templateData.language || "en",
    });

    // Create content template using REST API
    const response = await fetch("https://content.twilio.com/v1/Content", {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(
          `${accountSid}:${authToken}`
        ).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        FriendlyName: templateData.friendlyName,
        Language: templateData.language || "en",
        Types: JSON.stringify({
          "twilio/text": {
            body: templateData.body,
          },
        }),
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("📋 [TEMPLATE DEBUG] Twilio API error:", errorText);
      throw new Error(
        `Failed to create template: ${response.status} ${errorText}`
      );
    }

    const data = await response.json();
    console.log("📋 [TEMPLATE DEBUG] Template created successfully:", data.sid);

    return {
      sid: data.sid,
      status: data.status || "draft",
    };
  } catch (error) {
    console.error("📋 [TEMPLATE DEBUG] Error creating template:", error);
    throw error;
  }
}

/**
 * Submit a template for WhatsApp approval
 *
 * @param contentSid - The Twilio Content SID
 * @param category - Template category (MARKETING, UTILITY, AUTHENTICATION)
 * @returns Promise resolving to approval request SID
 */
export async function submitTemplateForApproval(
  contentSid: string,
  category: "MARKETING" | "UTILITY" | "AUTHENTICATION",
  companyId?: string
): Promise<{ approvalRequestSid: string }> {
  try {
    // Get Twilio credentials - try company-specific first, fall back to env vars
    let accountSid: string | undefined;
    let authToken: string | undefined;

    if (companyId) {
      const credentials = await getCompanyTwilioCredentials(companyId);
      if (credentials) {
        accountSid = credentials.accountSid;
        authToken = credentials.authToken;
      }
    }

    // Fall back to environment variables if no company-specific credentials found
    if (!accountSid || !authToken) {
      accountSid = process.env.TWILIO_ACCOUNT_SID;
      authToken = process.env.TWILIO_AUTH_TOKEN;
    }

    if (!accountSid || !authToken) {
      throw new Error("TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN are required");
    }

    console.log("📋 [TEMPLATE DEBUG] Submitting template for approval:", {
      contentSid,
      category,
    });

    // Create approval request using REST API
    const response = await fetch(
      `https://content.twilio.com/v1/Content/${contentSid}/ApprovalRequests`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${Buffer.from(
            `${accountSid}:${authToken}`
          ).toString("base64")}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          Name: contentSid, // Use content SID as name
          Category: category,
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("📋 [TEMPLATE DEBUG] Approval request error:", errorText);
      throw new Error(
        `Failed to submit template for approval: ${response.status} ${errorText}`
      );
    }

    const data = await response.json();
    console.log(
      "📋 [TEMPLATE DEBUG] Approval request created:",
      data.sid || data.approval_request_sid
    );

    return {
      approvalRequestSid: data.sid || data.approval_request_sid || "",
    };
  } catch (error) {
    console.error(
      "📋 [TEMPLATE DEBUG] Error submitting template for approval:",
      error
    );
    throw error;
  }
}
