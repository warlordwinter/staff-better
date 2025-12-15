// Encryption utilities for storing sensitive data (Twilio auth tokens)
// In production, use AWS KMS, Google Cloud KMS, or similar
// This is a basic implementation using Node.js crypto

import crypto from 'crypto';
import { ISV_CONFIG } from '../config';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const SALT_LENGTH = 64;

/**
 * Derive encryption key from environment variable
 * In production, use proper key derivation (PBKDF2, Argon2, etc.)
 */
function getEncryptionKey(): Buffer {
  const key = ISV_CONFIG.encryption.encryptionKey;
  if (!key) {
    throw new Error('ENCRYPTION_KEY environment variable is required');
  }
  
  // In production, use proper key derivation
  // For now, hash the key to get 32 bytes (256 bits)
  return crypto.createHash('sha256').update(key).digest();
}

/**
 * Encrypt sensitive data (e.g., Twilio auth tokens)
 */
export function encrypt(text: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const salt = crypto.randomBytes(SALT_LENGTH);
  
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const tag = cipher.getAuthTag();
  
  // Combine salt, iv, tag, and encrypted data
  return `${salt.toString('hex')}:${iv.toString('hex')}:${tag.toString('hex')}:${encrypted}`;
}

/**
 * Decrypt sensitive data
 */
export function decrypt(encryptedData: string): string {
  const key = getEncryptionKey();
  const parts = encryptedData.split(':');
  
  if (parts.length !== 4) {
    throw new Error('Invalid encrypted data format');
  }
  
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_saltHex, ivHex, tagHex, encrypted] = parts;
  const iv = Buffer.from(ivHex, 'hex');
  const tag = Buffer.from(tagHex, 'hex');
  
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

/**
 * Check if encryption is properly configured
 */
export function isEncryptionConfigured(): boolean {
  try {
    return !!ISV_CONFIG.encryption.encryptionKey;
  } catch {
    return false;
  }
}

