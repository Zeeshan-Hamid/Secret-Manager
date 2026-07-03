import { z } from "zod";

const ALLOWED_IMAGE_TYPES = [
  "image/png",
  "image/jpg",
  "image/jpeg",
  "image/webp",
  "image/gif",
] as const;

const textPayloadSchema = z.object({
  encryptedBlob: z
    .string()
    .min(1, "Encrypted blob is required")
    .max(200_000, "Encrypted blob exceeds 200KB limit"),
});

const imagePayloadSchema = z.object({
  type: z.literal("image"),
  blobUrl: z.string().url("Invalid blob URL"),
  contentType: z.enum(ALLOWED_IMAGE_TYPES, {
    message: "Unsupported image type",
  }),
});

const combinedPayloadSchema = z.object({
  type: z.literal("combined"),
  blobUrl: z.string().url("Invalid blob URL"),
  imageContentType: z.enum(ALLOWED_IMAGE_TYPES, {
    message: "Unsupported image type",
  }),
});

export const createSecretSchema = z.union([
  imagePayloadSchema,
  combinedPayloadSchema,
  textPayloadSchema,
]);

export type CreateSecretInput = z.infer<typeof createSecretSchema>;
