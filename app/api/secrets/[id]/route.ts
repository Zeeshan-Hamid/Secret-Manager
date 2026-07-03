import { redisGetdel } from "@/lib/redis";
import { get } from "@/lib/blob";

/**
 * Response types:
 * - Text secrets: JSON { encryptedBlob }, Content-Type: application/json
 * - Image/combined: binary stream, Content-Type: application/octet-stream
 *   + X-Secret-Type: "image" or "combined"
 *   + X-Image-Content-Type: original image MIME type
 *
 * For image/combined, the server fetches the encrypted blob via the SDK's
 * get() which auto-attaches credentials (OIDC or BLOB_READ_WRITE_TOKEN).
 * No CORS issues since it's server-to-server.
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

    try {
      console.log("[GET secret] Fetching blob:", record.blobUrl.substring(0, 80));
      const blob = await get(record.blobUrl, {
        access: (process.env.BLOB_ACCESS as "public" | "private") || "public",
      });

      if (!blob) {
        console.error("[GET secret] Blob not found or no access");
        return Response.json(
          { error: "Failed to retrieve encrypted data" },
          { status: 500 }
        );
      }

      console.log(
        "[GET secret] Blob fetched:",
        blob.blob?.contentType,
        blob.blob?.size,
        "bytes"
      );

      const imageType =
        record.contentType || record.imageContentType || "image/png";

      return new Response(blob.stream, {
        headers: {
          "Content-Type": "application/octet-stream",
          "X-Secret-Type": record.type,
          "X-Image-Content-Type": imageType,
          "Cache-Control": "no-store",
        },
      });
    } catch (err) {
      console.error(
        "[GET secret] Fatal error:",
        err instanceof Error ? err.message : String(err)
      );
      return Response.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }
  }

  return Response.json({ encryptedBlob: value as string });
}
