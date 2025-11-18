// utils/phoneUtils.ts
// Utility functions for handling phone numbers

/**
 * Placeholder phone number used when a real phone number is not available
 * This is required because the database has a NOT NULL constraint on phone_number
 * Format: E.164 format with all zeros (clearly not a real number)
 */
export const PLACEHOLDER_PHONE_NUMBER = "+10000000000";

/**
 * Check if a phone number is a placeholder (not a real phone number)
 */
export function isPlaceholderPhoneNumber(phoneNumber: string | null): boolean {
  return phoneNumber === PLACEHOLDER_PHONE_NUMBER;
}

/**
 * Format phone number to E.164 format (what Twilio uses)
 * Handles US numbers primarily, but can be extended
 */
export function formatPhoneToE164(
  phoneNumber: string,
  defaultCountryCode: string = "+1"
): string {
  if (!phoneNumber) {
    throw new Error("Phone number is required");
  }

  // Remove all non-digit characters
  const digitsOnly = phoneNumber.replace(/\D/g, "");

  // If already has country code (11+ digits), format appropriately
  if (digitsOnly.length === 11 && digitsOnly.startsWith("1")) {
    return `+${digitsOnly}`;
  }

  // If 10 digits, assume it's US number without country code
  if (digitsOnly.length === 10) {
    return `+1${digitsOnly}`;
  }

  // If it's already in E.164 format, return as is
  if (phoneNumber.startsWith("+") && digitsOnly.length >= 10) {
    return phoneNumber;
  }

  // For other cases, try to add default country code
  if (digitsOnly.length >= 10) {
    return `${defaultCountryCode}${digitsOnly}`;
  }

  // Reject 7-9 digit numbers as they are incomplete (need at least 10 digits)
  if (digitsOnly.length >= 7 && digitsOnly.length < 10) {
    throw new Error(
      `Invalid phone number format: ${phoneNumber}. Phone numbers must have at least 10 digits.`
    );
  }

  throw new Error(`Invalid phone number format: ${phoneNumber}`);
}

/**
 * Validate phone number format without throwing errors
 * Returns true if the phone number is valid, false otherwise
 */
export function isValidPhoneNumber(phoneNumber: string): boolean {
  if (!phoneNumber || phoneNumber.trim() === "") {
    return false;
  }

  try {
    const digitsOnly = phoneNumber.replace(/\D/g, "");

    // Valid if it's 10 digits (US number without country code)
    if (digitsOnly.length === 10) {
      return true;
    }

    // Valid if it's 11 digits starting with 1 (US number with country code)
    if (digitsOnly.length === 11 && digitsOnly.startsWith("1")) {
      return true;
    }

    // Valid if it's already in E.164 format
    if (phoneNumber.startsWith("+") && digitsOnly.length >= 10) {
      return true;
    }

    return false;
  } catch {
    return false;
  }
}

/**
 * Display phone number in a friendly format
 * Converts E.164 back to readable format
 */
export function formatPhoneForDisplay(phoneNumber: string): string {
  if (!phoneNumber) return "";

  // Remove the + and extract parts
  const digitsOnly = phoneNumber.replace(/\D/g, "");

  // US numbers (11 digits starting with 1)
  if (digitsOnly.length === 11 && digitsOnly.startsWith("1")) {
    const number = digitsOnly.substring(1); // Remove country code
    return `(${number.substring(0, 3)}) ${number.substring(
      3,
      6
    )}-${number.substring(6)}`;
  }

  // For non-US or other formats, just return as is
  return phoneNumber;
}

/**
 * Validate if phone number is in correct E.164 format
 */
export function isValidE164(phoneNumber: string): boolean {
  const e164Regex = /^\+[1-9]\d{1,14}$/;
  return e164Regex.test(phoneNumber);
}

/**
 * Normalize phone number for database lookup
 * Handles both E.164 and various input formats
 * Also strips WhatsApp prefix if present
 */
export function normalizePhoneForLookup(phoneNumber: string): string {
  // Strip whatsapp: prefix if present (for WhatsApp webhooks)
  const cleaned = phoneNumber.replace(/^whatsapp:/i, "");

  try {
    return formatPhoneToE164(cleaned);
  } catch {
    // If formatting fails, return cleaned version (for backwards compatibility)
    return cleaned;
  }
}

/**
 * Migration helper: Convert existing phone numbers to E.164
 */
export function migratePhoneToE164(existingPhone: string): string {
  if (!existingPhone) return existingPhone;

  // If already E.164, return as is
  if (existingPhone.startsWith("+")) {
    return existingPhone;
  }

  try {
    return formatPhoneToE164(existingPhone);
  } catch {
    // If can't format, return original (you'll need to handle these manually)
    console.warn(`Could not migrate phone number: ${existingPhone}`);
    return existingPhone;
  }
}
