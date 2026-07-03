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
const KEY_LENGTH_BYTES = 32; // 256 bits

/** Generate a random 256-bit AES-GCM key in the browser */
export async function generateEncryptionKey(): Promise<CryptoKey> {
  return globalThis.crypto.subtle.generateKey(ALGORITHM, true, [
    "encrypt",
    "decrypt",
  ]);
}

// ─── Text helpers (existing) ────────────────────────────────────

/**
 * Encrypt plaintext string with AES-256-GCM.
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

  const combined = new Uint8Array(IV_LENGTH + gcmOutput.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(gcmOutput), IV_LENGTH);

  return bufferToBase64url(combined);
}

/**
 * Decrypt a text blob (from Redis) using raw key bytes
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

  const iv = combined.slice(0, IV_LENGTH);
  const gcmOutput = combined.slice(IV_LENGTH);

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

// ─── Binary helpers (new — for images) ──────────────────────────

/**
 * Encrypt raw bytes with AES-256-GCM.
 * Returns a new ArrayBuffer: IV (12 bytes) prepended to
 * the GCM output (ciphertext + 16-byte authentication tag).
 *
 * Use this for image files — the output is raw bytes suitable
 * for uploading directly to Vercel Blob.
 */
export async function encryptBytes(
  data: ArrayBuffer,
  key: CryptoKey
): Promise<ArrayBuffer> {
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(IV_LENGTH));

  const gcmOutput = await globalThis.crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    data
  );

  // Prepend IV to GCM output
  const combined = new Uint8Array(IV_LENGTH + gcmOutput.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(gcmOutput), IV_LENGTH);

  return combined.buffer;
}

/**
 * Decrypt raw bytes (fetched from Vercel Blob) using raw key bytes
 * from the URL fragment.
 *
 * Input format: ArrayBuffer of (IV || GCM-output)
 * Returns the original decrypted bytes (e.g., image data).
 */
export async function decryptToBytes(
  encryptedData: ArrayBuffer,
  rawKeyBytes: Uint8Array
): Promise<ArrayBuffer> {
  const combined = new Uint8Array(encryptedData);

  const iv = combined.slice(0, IV_LENGTH);
  const gcmOutput = combined.slice(IV_LENGTH);

  const keyMaterial = new Uint8Array(rawKeyBytes);
  const key = await globalThis.crypto.subtle.importKey(
    "raw",
    keyMaterial,
    ALGORITHM,
    false,
    ["decrypt"]
  );

  return globalThis.crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    gcmOutput
  );
}

// ─── Key serialization (shared) ─────────────────────────────────

/** Export a CryptoKey to raw bytes, then encode as base64url (for URL fragment) */
export async function exportKeyToBase64(key: CryptoKey): Promise<string> {
  const raw = await globalThis.crypto.subtle.exportKey("raw", key);
  return bufferToBase64url(new Uint8Array(raw));
}

/** Import a base64url-encoded key from a URL fragment back to raw bytes */
export function keyFragmentToBytes(base64url: string): Uint8Array {
  return base64urlToBuffer(base64url);
}

// ─── Combined text + image packing ───────────────────────────────

/**
 * Pack text and image bytes into a single binary buffer for encryption.
 * Format: [4 bytes: textByteLength as uint32 big-endian][text bytes][image bytes]
 *
 * This lets us encrypt both with one AES-256-GCM operation.
 */
export function packPayload(text: string, imageBytes: ArrayBuffer): ArrayBuffer {
  const textEncoded = new TextEncoder().encode(text);
  const textLen = textEncoded.byteLength;

  const totalLen = 4 + textLen + imageBytes.byteLength;
  const packed = new Uint8Array(totalLen);
  const view = new DataView(packed.buffer);

  view.setUint32(0, textLen, false);
  packed.set(textEncoded, 4);
  packed.set(new Uint8Array(imageBytes), 4 + textLen);

  // Return a clean ArrayBuffer (not ArrayBufferLike)
  return packed.buffer.slice(0) as ArrayBuffer;
}

/**
 * Unpack a combined payload into text and image bytes.
 * Inverse of packPayload.
 */
export function unpackPayload(
  packed: ArrayBuffer
): { text: string; imageBytes: ArrayBuffer } {
  const view = new DataView(packed);

  // Read text length from first 4 bytes (big-endian)
  const textLen = view.getUint32(0, false);

  // Extract text bytes (offset 4, length textLen)
  const textBytes = new Uint8Array(packed, 4, textLen);
  const text = new TextDecoder().decode(textBytes);

  // Extract image bytes (offset 4 + textLen, rest of buffer)
  const imageBytes = packed.slice(4 + textLen);

  return { text, imageBytes };
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
