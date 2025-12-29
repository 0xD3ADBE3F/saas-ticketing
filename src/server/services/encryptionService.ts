import { createCipheriv, createDecipheriv, randomBytes } from "crypto";
import { env } from "../lib/env";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

/**
 * Get encryption key from environment
 * Key must be 32 bytes (64 hex characters)
 */
function getEncryptionKey(): Buffer {
  return Buffer.from(env.TOKEN_ENCRYPTION_KEY, "hex");
}

/**
 * Encrypt sensitive data (e.g., Mollie access/refresh tokens)
 * Returns base64 encoded string containing: IV + AuthTag + EncryptedData
 */
export function encrypt(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = randomBytes(IV_LENGTH);

  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  // Combine IV + AuthTag + EncryptedData
  const combined = Buffer.concat([iv, authTag, encrypted]);
  return combined.toString("base64");
}

/**
 * Decrypt data encrypted with encrypt()
 * Expects base64 encoded string containing: IV + AuthTag + EncryptedData
 */
export function decrypt(encryptedData: string): string {
  const key = getEncryptionKey();
  const combined = Buffer.from(encryptedData, "base64");

  // Extract IV, AuthTag, and EncryptedData
  const iv = combined.subarray(0, IV_LENGTH);
  const authTag = combined.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const encrypted = combined.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
}

/**
 * Encryption service for managing sensitive tokens
 */
export const encryptionService = {
  encrypt,
  decrypt,

  /**
   * Encrypt Mollie tokens for storage
   */
  encryptToken(token: string): string {
    return encrypt(token);
  },

  /**
   * Decrypt Mollie tokens for use
   */
  decryptToken(encryptedToken: string): string {
    return decrypt(encryptedToken);
  },

  /**
   * Safely encrypt a token that might be null/undefined
   */
  encryptTokenSafe(token: string | null | undefined): string | null {
    if (!token) return null;
    return encrypt(token);
  },

  /**
   * Safely decrypt a token that might be null/undefined
   */
  decryptTokenSafe(encryptedToken: string | null | undefined): string | null {
    if (!encryptedToken) return null;
    return decrypt(encryptedToken);
  },
};
