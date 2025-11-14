// Twilio Master Account Client
// This client uses the ISV's master Twilio account credentials

import twilio from "twilio";
import { ISV_CONFIG, validateISVConfig } from "../config";

// Validate config on module load
validateISVConfig();

export const masterTwilioClient = twilio(
  ISV_CONFIG.twilio.masterAccountSid,
  ISV_CONFIG.twilio.masterAuthToken
);

/**
 * Create a Twilio subaccount for a customer
 */
export async function createSubaccount(friendlyName: string) {
  try {
    const subaccount = await masterTwilioClient.api.accounts.create({
      friendlyName,
    });

    return {
      sid: subaccount.sid,
      friendlyName: subaccount.friendlyName,
      status: subaccount.status,
    };
  } catch (error) {
    console.error("Error creating Twilio subaccount:", error);
    throw error;
  }
}

/**
 * Get subaccount details
 */
export async function getSubaccount(subaccountSid: string) {
  try {
    const subaccount = await masterTwilioClient.api
      .accounts(subaccountSid)
      .fetch();
    return subaccount;
  } catch (error) {
    console.error("Error fetching Twilio subaccount:", error);
    throw error;
  }
}

/**
 * Create an API key for a subaccount
 * The API key secret can be used as an auth token
 *
 * Note: This uses the master account credentials but creates the key for the subaccount
 * by making a direct REST API call to the subaccount's keys endpoint
 */
export async function createSubaccountApiKey(
  subaccountSid: string,
  friendlyName?: string
) {
  try {
    // To create an API key for a subaccount, we need to use the master account's
    // credentials but target the subaccount's keys endpoint
    // The Twilio SDK doesn't directly support this, so we use the REST API

    // Use the Twilio REST API to create an API key for the subaccount
    // The endpoint format is: /2010-04-01/Accounts/{AccountSid}/Keys.json
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${subaccountSid}/Keys.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${Buffer.from(
            `${ISV_CONFIG.twilio.masterAccountSid}:${ISV_CONFIG.twilio.masterAuthToken}`
          ).toString("base64")}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          FriendlyName: friendlyName || `Subaccount-${subaccountSid}-Key`,
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Failed to create API key for subaccount: ${response.status} ${errorText}`
      );
    }

    const apiKeyData = await response.json();

    // Note: The secret is only returned once when the key is created
    // We need to store it immediately
    return {
      sid: apiKeyData.sid,
      secret: apiKeyData.secret, // This is the auth token equivalent
      friendlyName: apiKeyData.friendly_name,
    };
  } catch (error) {
    console.error("Error creating subaccount API key:", error);
    throw error;
  }
}

/**
 * Create auth token for a subaccount
 * @deprecated Use createSubaccountApiKey instead
 */
export async function createSubaccountToken(subaccountSid: string) {
  try {
    // Note: Twilio doesn't have a direct API to create tokens for subaccounts
    // You need to use the subaccount's own credentials
    // This function is a placeholder - actual implementation depends on your approach
    throw new Error(
      "Subaccount token creation requires subaccount credentials"
    );
  } catch (error) {
    console.error("Error creating subaccount token:", error);
    throw error;
  }
}

/**
 * Delete (close) a Twilio subaccount
 * Note: This is irreversible - the subaccount cannot be reopened
 * All associated phone numbers will be released
 */
export async function deleteSubaccount(subaccountSid: string) {
  try {
    // Close the subaccount by updating its status to 'closed'
    // This uses the master account credentials to manage the subaccount
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${subaccountSid}.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${Buffer.from(
            `${ISV_CONFIG.twilio.masterAccountSid}:${ISV_CONFIG.twilio.masterAuthToken}`
          ).toString("base64")}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          Status: "closed",
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Failed to delete subaccount: ${response.status} ${errorText}`
      );
    }

    const accountData = await response.json();
    return {
      sid: accountData.sid,
      status: accountData.status,
      friendlyName: accountData.friendly_name,
    };
  } catch (error) {
    console.error("Error deleting Twilio subaccount:", error);
    throw error;
  }
}

/**
 * Get a Twilio client for a specific subaccount
 */
export function getSubaccountClient(subaccountSid: string, authToken: string) {
  return twilio(subaccountSid, authToken);
}
