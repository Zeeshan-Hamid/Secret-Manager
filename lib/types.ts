// --- Shared ---

export interface CreateSecretResponse {
  id: string;
}

export interface ApiError {
  error: string;
}

export type ViewState = "loading" | "decrypted" | "expired" | "error";

export type SecretType = "text" | "image" | "combined";

// --- Text secrets ---

export interface TextSecretResponse {
  encryptedBlob: string;
}

// --- Image secrets ---

export interface ImageSecretResponse {
  type: "image";
  blobUrl: string;
  contentType: string;
}

// --- Combined text + image ---

export interface CombinedSecretResponse {
  type: "combined";
  blobUrl: string;
  imageContentType: string;
}

/** Discriminated union: the GET endpoint returns one of these */
export type ViewSecretResponse =
  | TextSecretResponse
  | ImageSecretResponse
  | CombinedSecretResponse;

/** Discriminated union for POST payload */
export type CreateSecretInput =
  | { encryptedBlob: string }
  | { type: "image"; blobUrl: string; contentType: string }
  | { type: "combined"; blobUrl: string; imageContentType: string };

/** What gets stored in Redis for binary-backed secrets (JSON-serialized) */
export interface BinaryRecord {
  type: "image" | "combined";
  blobUrl: string;
  contentType?: string;
  imageContentType?: string;
}
