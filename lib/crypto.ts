/**
 * Client-side encryption module. Zero npm dependencies.
 * Uses the browser-native Web Crypto API (AES-256-GCM).
 *
 * IMPORTANT: These functions ONLY work in the browser.
 * They reference `globalThis.crypto.subtle` which is not
 * available during server-side rendering.
 */

const ALGORITHM: AesKeyGenParams = { name: "AES-GCM", length: 256 };
const IV_LENGTH = 12; // 96 bits — recommended for GCM

/** Generate a random 256-bit AES-GCM key in the browser */
export async function generateEncryptionKey(): Promise<CryptoKey> {
  return globalThis.crypto.subtle.generateKey(ALGORITHM, true, [
    "encrypt",
    "decrypt",
  ]);
}

/**
 * Encrypt plaintext with AES-256-GCM.
 * Returns a single base64url string: IV (12 bytes) prepended to
 * the GCM output (ciphertext + 16-byte authentication tag).
 */
export async function encrypt(
  plaintext: string,
  key: CryptoKey
): Promise<string> {
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const encoded = new TextEncoder().encode(plaintext);

  const gcmOutput = await globalThis.crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encoded
  );

  // Prepend IV to GCM output
  const combined = new Uint8Array(IV_LENGTH + gcmOutput.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(gcmOutput), IV_LENGTH);

  return bufferToBase64url(combined);
}

/**
 * Decrypt an encrypted blob (from the server) using raw key bytes
 * (extracted from the URL fragment).
 *
 * The blob format is: base64url(IV || GCM-output)
 * GCM verifies the authentication tag — decryption will fail
 * if the blob was tampered with.
 */
export async function decrypt(
  encryptedBlob: string,
  rawKeyBytes: Uint8Array
): Promise<string> {
  const combined = base64urlToBuffer(encryptedBlob);

  // Split: first 12 bytes = IV, rest = GCM output
  const iv = combined.slice(0, IV_LENGTH);
  const gcmOutput = combined.slice(IV_LENGTH);

  // Normalize to Uint8Array<ArrayBuffer> to satisfy strict TS types
  const keyMaterial = new Uint8Array(rawKeyBytes);

  const key = await globalThis.crypto.subtle.importKey(
    "raw",
    keyMaterial,
    ALGORITHM,
    false,
    ["decrypt"]
  );

  const decrypted = await globalThis.crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    gcmOutput
  );

  return new TextDecoder().decode(decrypted);
}

/** Export a CryptoKey to raw bytes, then encode as base64url (for URL fragment) */
export async function exportKeyToBase64(key: CryptoKey): Promise<string> {
  const raw = await globalThis.crypto.subtle.exportKey("raw", key);
  return bufferToBase64url(new Uint8Array(raw));
}

/** Import a base64url-encoded key from a URL fragment back to raw bytes */
export function keyFragmentToBytes(base64url: string): Uint8Array {
  return base64urlToBuffer(base64url);
}

// --- Internal helpers ---

function bufferToBase64url(buffer: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < buffer.length; i++) {
    binary += String.fromCharCode(buffer[i]);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64urlToBuffer(base64url: string): Uint8Array {
  let base64 = base64url.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4) base64 += "=";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}
