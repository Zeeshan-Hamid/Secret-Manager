import { put } from "@vercel/blob";

const BLOB_ACCESS = (process.env.BLOB_ACCESS as "public" | "private") || "public";
const MAX_IMAGE_SIZE_MB = process.env.MAX_IMAGE_SIZE_MB
  ? parseInt(process.env.MAX_IMAGE_SIZE_MB, 10)
  : 8;

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get("content-type") ?? "";
    if (!contentType.includes("multipart/form-data")) {
      return Response.json(
        { error: "Expected multipart/form-data" },
        { status: 400 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return Response.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    // Note: We do NOT validate content type here because the file is
    // already encrypted client-side (AES-256-GCM ciphertext →
    // application/octet-stream). Content type validation happens at:
    // 1. Client: accept attribute on the file input
    // 2. POST /api/secrets: Zod schema validates the original contentType

    // Validate size
    const maxBytes = MAX_IMAGE_SIZE_MB * 1024 * 1024;
    if (file.size > maxBytes) {
      return Response.json(
        { error: `File exceeds maximum size of ${MAX_IMAGE_SIZE_MB}MB` },
        { status: 400 }
      );
    }

    // Upload to Vercel Blob — SDK auto-detects credentials:
    // On Vercel: uses OIDC (VERCEL_OIDC_TOKEN + BLOB_STORE_ID)
    // Local dev: falls back to BLOB_READ_WRITE_TOKEN
    const blob = await put(file.name, file, {
      access: BLOB_ACCESS,
      addRandomSuffix: true,
    });

    return Response.json({ url: blob.url }, { status: 201 });
  } catch (error) {
    console.error("Upload failed:", error);
    return Response.json(
      { error: "Upload failed" },
      { status: 500 }
    );
  }
}
