export interface CreateSecretResponse {
  id: string;
}

export interface ViewSecretResponse {
  encryptedBlob: string;
}

export interface ApiError {
  error: string;
}

export type ViewState = "loading" | "decrypted" | "expired" | "error";

export interface SecretData {
  id: string;
  encryptedBlob: string;
}
