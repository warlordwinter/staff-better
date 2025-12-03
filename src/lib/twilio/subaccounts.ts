import { createCipheriv, randomBytes } from "crypto";
import { twilioClient } from "./client";

const ENCRYPTION_KEY_LENGTH = 32;
const HEX_KEY_LENGTH = ENCRYPTION_KEY_LENGTH * 2;
let cachedEncryptionKey: Buffer | null = null;

type ProvisionedSubaccount = {
  sid: string;
  authToken: string;
  status?: string | null;
  friendlyName: string;
};

function coerceEncryptionKey(): Buffer {
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

  const key = coerceEncryptionKey();
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

function buildFriendlyName(companyName: string | null, companyId: string) {
  const base = companyName?.trim() || companyId;
  const suffix = base.length > 48 ? `${base.slice(0, 45)}...` : base;
  return `StaffBetter - ${suffix}`;
}

export async function provisionTwilioSubaccount(
  companyName: string | null,
  companyId: string
): Promise<ProvisionedSubaccount> {
  const friendlyName = buildFriendlyName(companyName, companyId);
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
    console.error(
      `Failed to close Twilio subaccount ${subaccountSid}:`,
      error
    );
  }
}

