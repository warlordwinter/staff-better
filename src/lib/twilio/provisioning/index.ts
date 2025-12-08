import { createCipheriv, createDecipheriv, randomBytes } from "crypto";
import type { ServiceInstance } from "twilio/lib/rest/messaging/v1/service";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { twilioClient, createTwilioClient } from "../client";

const ENCRYPTION_KEY_LENGTH = 32;
const HEX_KEY_LENGTH = ENCRYPTION_KEY_LENGTH * 2;
const TWILIO_INCOMING_WEBHOOK =
  "https://www.staff-better.com/api/twilio/incoming/";

let cachedEncryptionKey: Buffer | null = null;

export type ProvisionedSubaccount = {
  sid: string;
  authToken: string;
  status?: string | null;
  friendlyName: string;
};

export type CreateMessagingServiceInput = {
  companyId: string;
  companyName: string | null;
  subaccountSid: string;
  authToken: string;
};

export type MessagingServiceProvisionResult = {
  sid: string;
  friendlyName: string;
};

export type ProvisionedBrand = {
  id: string;
  twilioBrandSid: string | null;
  status: string | null;
};

export type ProvisionedCampaign = {
  id: string;
  campaignSid: string | null;
  status: string | null;
};

function buildFriendlyName(
  prefix: string,
  companyName: string | null,
  companyId: string
) {
  const base = companyName?.trim() || companyId;
  const suffix = base.length > 48 ? `${base.slice(0, 45)}...` : base;
  return `${prefix} - ${suffix}`;
}

function ensureEncryptionKey(): Buffer {
  if (cachedEncryptionKey) {
    return cachedEncryptionKey;
  }

  const rawKey = process.env.TWILIO_SUBACCOUNT_ENCRYPTION_KEY;
  if (!rawKey) {
    throw new Error("TWILIO_SUBACCOUNT_ENCRYPTION_KEY is required");
  }

  let keyBuffer: Buffer;
  if (/^[0-9a-fA-F]+$/.test(rawKey) && rawKey.length === HEX_KEY_LENGTH) {
    keyBuffer = Buffer.from(rawKey, "hex");
  } else {
    keyBuffer = Buffer.from(rawKey, "base64");
  }

  if (keyBuffer.length !== ENCRYPTION_KEY_LENGTH) {
    throw new Error(
      "TWILIO_SUBACCOUNT_ENCRYPTION_KEY must be 32 bytes (provide 64-char hex or base64-encoded value)"
    );
  }

  cachedEncryptionKey = keyBuffer;
  return keyBuffer;
}

export function encryptTwilioAuthToken(authToken: string): string {
  if (!authToken) {
    throw new Error("auth token is required for encryption");
  }

  const key = ensureEncryptionKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([
    cipher.update(authToken, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return [
    iv.toString("base64"),
    authTag.toString("base64"),
    ciphertext.toString("base64"),
  ].join(":");
}

export function decryptTwilioAuthToken(encryptedToken: string): string {
  if (!encryptedToken) {
    throw new Error("encrypted token is required for decryption");
  }

  const key = ensureEncryptionKey();
  const parts = encryptedToken.split(":");
  if (parts.length !== 3) {
    throw new Error("Invalid encrypted token format");
  }

  const [ivBase64, authTagBase64, ciphertextBase64] = parts;
  const iv = Buffer.from(ivBase64, "base64");
  const authTag = Buffer.from(authTagBase64, "base64");
  const ciphertext = Buffer.from(ciphertextBase64, "base64");

  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
}

export async function provisionTwilioSubaccount(
  companyName: string | null,
  companyId: string
): Promise<ProvisionedSubaccount> {
  const friendlyName = buildFriendlyName("StaffBetter", companyName, companyId);
  const account = await twilioClient.api.accounts.create({
    friendlyName,
  });

  if (!account?.sid) {
    throw new Error("Failed to create Twilio subaccount (missing SID)");
  }

  if (!account?.authToken) {
    throw new Error("Failed to create Twilio subaccount (missing auth token)");
  }

  return {
    sid: account.sid,
    authToken: account.authToken,
    status: account.status,
    friendlyName,
  };
}

export async function closeTwilioSubaccount(subaccountSid: string) {
  if (!subaccountSid) {
    return;
  }

  try {
    await twilioClient.api.accounts(subaccountSid).update({ status: "closed" });
  } catch (error) {
    console.error(`Failed to close Twilio subaccount ${subaccountSid}:`, error);
  }
}

export async function createMessagingServiceForCompany({
  companyId,
  companyName,
  subaccountSid,
  authToken,
}: CreateMessagingServiceInput): Promise<MessagingServiceProvisionResult> {
  if (!companyId || !subaccountSid || !authToken) {
    throw new Error("companyId, subaccountSid, and authToken are required");
  }

  const friendlyName = buildFriendlyName(
    "StaffBetter MS",
    companyName,
    companyId
  );
  const subaccountClient = createTwilioClient(subaccountSid, authToken);

  let service: ServiceInstance | undefined;
  try {
    service = await subaccountClient.messaging.v1.services.create({
      friendlyName,
      inboundRequestUrl: TWILIO_INCOMING_WEBHOOK,
      inboundMethod: "POST",
    });
  } catch (error) {
    throw new Error(
      `Failed to create messaging service for company ${companyId}: ${
        error instanceof Error ? error.message : "unknown error"
      }`
    );
  }

  if (!service?.sid) {
    throw new Error("Twilio did not return a messaging service SID");
  }

  return {
    sid: service.sid,
    friendlyName,
  };
}

export type ProvisionBrandInput = {
  customerId: string;
  companyName: string;
  subaccountSid: string;
  authToken: string;
  supabase: SupabaseClient<Database>;
};

export async function provisionBrandForCustomer({
  customerId,
  companyName,
  subaccountSid,
  authToken,
  supabase,
}: ProvisionBrandInput): Promise<ProvisionedBrand> {
  if (!customerId || !subaccountSid || !authToken || !supabase) {
    throw new Error(
      "customerId, subaccountSid, authToken, and supabase are required"
    );
  }

  const subaccountClient = createTwilioClient(subaccountSid, authToken);
  const brandName = companyName || `Brand ${customerId}`;

  let twilioBrandSid: string | null = null;
  let brandStatus: string | null = null;

  // Attempt to create brand via Twilio API
  // Note: Brand registration may require a customer profile bundle to be created first
  // If this fails, the brand record will still be created in the database for manual completion
  try {
    const brandRegistration =
      await subaccountClient.messaging.v1.brandRegistrations.create({
        brandType: "STANDARD",
        mock: false,
      });

    if (brandRegistration?.sid) {
      twilioBrandSid = brandRegistration.sid;
      brandStatus = brandRegistration.status || "PENDING";
    }
  } catch (error) {
    // Brand registration may fail if customer profile bundle is required
    // Log error but continue - brand can be created manually later
    console.warn(
      `Failed to create Twilio brand for customer ${customerId}: ${
        error instanceof Error ? error.message : "unknown error"
      }`
    );
  }

  // Create brand record in database
  const { data: brand, error: insertError } = await supabase
    .from("brands")
    .insert({
      customer_id: customerId,
      brand_name: brandName,
      brand_type: "STANDARD",
      twilio_brand_sid: twilioBrandSid,
      status: brandStatus || "PENDING",
    })
    .select("id")
    .single();

  if (insertError || !brand) {
    throw insertError || new Error("Failed to create brand record in database");
  }

  return {
    id: brand.id,
    twilioBrandSid,
    status: brandStatus,
  };
}

export type ProvisionCampaignInput = {
  brandId: string;
  customerId: string;
  messagingServiceSid: string;
  subaccountSid: string;
  authToken: string;
  companyName: string;
  supabase: SupabaseClient<Database>;
};

export async function provisionCampaignForBrand({
  brandId,
  customerId,
  messagingServiceSid,
  subaccountSid,
  authToken,
  companyName,
  supabase,
}: ProvisionCampaignInput): Promise<ProvisionedCampaign> {
  if (
    !brandId ||
    !customerId ||
    !messagingServiceSid ||
    !subaccountSid ||
    !authToken ||
    !supabase
  ) {
    throw new Error(
      "brandId, customerId, messagingServiceSid, subaccountSid, authToken, and supabase are required"
    );
  }

  // Get brand to retrieve Twilio brand SID
  const { data: brand, error: brandError } = await supabase
    .from("brands")
    .select("twilio_brand_sid")
    .eq("id", brandId)
    .single();

  if (brandError || !brand) {
    throw new Error("Brand not found");
  }

  if (!brand.twilio_brand_sid) {
    throw new Error(
      "Brand does not have a Twilio brand SID. Brand registration may be pending."
    );
  }

  const subaccountClient = createTwilioClient(subaccountSid, authToken);

  // Default use case and sample message
  const useCase = "STAFF_NOTIFICATIONS";
  const sampleMessage =
    `Hello! This is ${companyName || "your staffing company"}. ` +
    `You have a shift scheduled. Please confirm your availability.`;

  let campaignSid: string | null = null;
  let campaignStatus: string | null = null;

  // Attempt to create campaign via Twilio API
  try {
    const campaign = await subaccountClient.messaging.v1.campaigns.create({
      brandRegistrationSid: brand.twilio_brand_sid,
      messagingServiceSid: messagingServiceSid,
      useCase: useCase,
      sampleMessage: sampleMessage,
    });

    if (campaign?.sid) {
      campaignSid = campaign.sid;
      campaignStatus = campaign.status || "PENDING";
    }
  } catch (error) {
    // Campaign creation may fail if brand is not approved
    // Log error but continue - campaign can be created manually later
    console.warn(
      `Failed to create Twilio campaign for brand ${brandId}: ${
        error instanceof Error ? error.message : "unknown error"
      }`
    );
  }

  // Estimate volume based on customer (if available)
  const { data: customer } = await supabase
    .from("isv_customers")
    .select("estimated_monthly_volume")
    .eq("id", customerId)
    .single();

  const estimatedVolume = customer?.estimated_monthly_volume || null;

  // Create campaign record in database
  const { data: campaign, error: insertError } = await supabase
    .from("campaigns")
    .insert({
      brand_id: brandId,
      customer_id: customerId,
      messaging_service_sid: messagingServiceSid,
      campaign_sid: campaignSid,
      use_case: useCase,
      sample_message: sampleMessage,
      estimated_volume: estimatedVolume,
      status: campaignStatus || "PENDING",
    })
    .select("id")
    .single();

  if (insertError || !campaign) {
    throw (
      insertError || new Error("Failed to create campaign record in database")
    );
  }

  return {
    id: campaign.id,
    campaignSid,
    status: campaignStatus,
  };
}
