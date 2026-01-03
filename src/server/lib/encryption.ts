/**
 * Encryption Utility
 *
 * Handles encryption and decryption of sensitive data like certificates and keys.
 * Uses AES-256-GCM for authenticated encryption.
 */

import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16; // 128 bits for GCM
const AUTH_TAG_LENGTH = 16; // 128 bits
const SALT_LENGTH = 32;

/**
 * Get encryption key from environment variable
 */
function getEncryptionKey(): Buffer {
  const keyString = process.env.WALLET_CERT_ENCRYPTION_KEY;

  if (!keyString) {
    throw new Error(
      "WALLET_CERT_ENCRYPTION_KEY environment variable not set. Generate with: openssl rand -base64 32"
    );
  }

  // Ensure key is 32 bytes for AES-256
  const keyBuffer = Buffer.from(keyString, "base64");
  if (keyBuffer.length !== 32) {
    throw new Error(
      "WALLET_CERT_ENCRYPTION_KEY must be 32 bytes (256 bits). Generate with: openssl rand -base64 32"
    );
  }

  return keyBuffer;
}

/**
 * Encrypt sensitive data
 *
 * @param plaintext - The data to encrypt
 * @returns Base64-encoded encrypted data with IV and auth tag
 */
export function encrypt(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const salt = crypto.randomBytes(SALT_LENGTH);

  // Derive key with salt for additional security
  const derivedKey = crypto.pbkdf2Sync(key, salt, 100000, 32, "sha256");

  const cipher = crypto.createCipheriv(ALGORITHM, derivedKey, iv);

  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);

  const authTag = cipher.getAuthTag();

  // Format: [salt][iv][authTag][encryptedData]
  const combined = Buffer.concat([salt, iv, authTag, encrypted]);

  return combined.toString("base64");
}

/**
 * Decrypt sensitive data
 *
 * @param ciphertext - Base64-encoded encrypted data
 * @returns Decrypted plaintext
 */
export function decrypt(ciphertext: string): string {
  const key = getEncryptionKey();
  const combined = Buffer.from(ciphertext, "base64");

  // Extract components
  const salt = combined.subarray(0, SALT_LENGTH);
  const iv = combined.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
  const authTag = combined.subarray(
    SALT_LENGTH + IV_LENGTH,
    SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH
  );
  const encrypted = combined.subarray(SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH);

  // Derive key with salt
  const derivedKey = crypto.pbkdf2Sync(key, salt, 100000, 32, "sha256");

  const decipher = crypto.createDecipheriv(ALGORITHM, derivedKey, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
}

/**
 * Test encryption/decryption (use in setup scripts)
 */
export function testEncryption(): boolean {
  try {
    const testData = "Test certificate data with special chars: 日本語 🔒";
    const encrypted = encrypt(testData);
    const decrypted = decrypt(encrypted);
    return testData === decrypted;
  } catch (error) {
    console.error("Encryption test failed:", error);
    return false;
  }
}
