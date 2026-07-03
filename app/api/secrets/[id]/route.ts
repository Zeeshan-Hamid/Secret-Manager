import { redisGetdel } from "@/lib/redis";

/**
 * Response types:
 * - Text secrets: JSON { encryptedBlob }
 * - Image secrets: JSON { type: "image", blobUrl, contentType }
 * - Combined secrets: JSON { type: "combined", blobUrl, imageContentType }
 *
 * The encrypted blob remains in Vercel Blob after viewing. It is
 * AES-256-GCM ciphertext — useless without the decryption key that
 * was in the URL fragment (now cleared from the viewer's browser).
 * Cleanup of orphaned blobs can be handled by a periodic sweep or
 * Vercel Blob lifecycle policy.
 */

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!id || typeof id !== "string") {
    return Response.json(
      { error: "Invalid secret ID" },
      { status: 400 }
    );
  }

  const value = await redisGetdel(`secret:${id}`);

  if (value === null) {
    return Response.json(
      { error: "This secret has already been viewed or has expired." },
      { status: 410 }
    );
  }

  if (typeof value === "object") {
    const record = value as unknown as {
      type: string;
      blobUrl: string;
      contentType?: string;
      imageContentType?: string;
    };

    if (record.type === "combined") {
      return Response.json({
        type: "combined",
        blobUrl: record.blobUrl,
        imageContentType: record.imageContentType,
      });
    }

    return Response.json({
      type: "image",
      blobUrl: record.blobUrl,
      contentType: record.contentType,
    });
  }

  return Response.json({ encryptedBlob: value as string });
}
