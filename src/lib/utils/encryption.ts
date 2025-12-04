import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16; // 16 bytes for AES
const SALT_LENGTH = 64; // 64 bytes for salt
const TAG_LENGTH = 16; // 16 bytes for GCM auth tag
const KEY_LENGTH = 32; // 32 bytes for AES-256

/**
 * Get encryption key from environment variable
 * @throws Error if ENCRYPTION_KEY is not set or invalid
 */
function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    throw new Error("ENCRYPTION_KEY environment variable is required");
  }

  // If key is hex string, convert to buffer
  if (key.length === 64) {
    // 32 bytes = 64 hex characters
    return Buffer.from(key, "hex");
  }

  // Otherwise, derive key from string using PBKDF2
  return crypto.pbkdf2Sync(key, "twilio-auth-token-salt", 100000, KEY_LENGTH, "sha256");
}

/**
 * Encrypt a Twilio auth token
 * @param token The plain text auth token to encrypt
 * @returns Encrypted token as hex string (format: salt:iv:tag:encrypted)
 */
export function encryptToken(token: string): string {
  const key = getEncryptionKey();
  const salt = crypto.randomBytes(SALT_LENGTH);
  const iv = crypto.randomBytes(IV_LENGTH);

  // Derive key from master key and salt
  const derivedKey = crypto.pbkdf2Sync(key, salt, 100000, KEY_LENGTH, "sha256");
  const cipher = crypto.createCipheriv(ALGORITHM, derivedKey, iv);

  let encrypted = cipher.update(token, "utf8", "hex");
  encrypted += cipher.final("hex");

  const tag = cipher.getAuthTag();

  // Combine salt:iv:tag:encrypted as hex strings
  return `${salt.toString("hex")}:${iv.toString("hex")}:${tag.toString("hex")}:${encrypted}`;
}

/**
 * Decrypt a Twilio auth token
 * @param encrypted The encrypted token (format: salt:iv:tag:encrypted)
 * @returns Decrypted plain text token
 * @throws Error if decryption fails
 */
export function decryptToken(encrypted: string): string {
  try {
    const parts = encrypted.split(":");
    if (parts.length !== 4) {
      throw new Error("Invalid encrypted token format");
    }

    const [saltHex, ivHex, tagHex, encryptedHex] = parts;
    const salt = Buffer.from(saltHex, "hex");
    const iv = Buffer.from(ivHex, "hex");
    const tag = Buffer.from(tagHex, "hex");
    const encryptedData = Buffer.from(encryptedHex, "hex");

    const key = getEncryptionKey();
    
    // Derive key from master key and salt (same as encryption)
    const derivedKey = crypto.pbkdf2Sync(key, salt, 100000, KEY_LENGTH, "sha256");

    const decipher = crypto.createDecipheriv(ALGORITHM, derivedKey, iv);
    decipher.setAuthTag(tag);

    let decrypted = decipher.update(encryptedData, undefined, "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  } catch (error) {
    throw new Error(`Failed to decrypt token: ${error instanceof Error ? error.message : String(error)}`);
  }
}

