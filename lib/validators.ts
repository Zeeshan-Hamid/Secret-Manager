import { z } from "zod";

export const createSecretSchema = z.object({
  encryptedBlob: z
    .string()
    .min(1, "Encrypted blob is required")
    .max(200_000, "Encrypted blob exceeds 200KB limit"),
});

export type CreateSecretInput = z.infer<typeof createSecretSchema>;
