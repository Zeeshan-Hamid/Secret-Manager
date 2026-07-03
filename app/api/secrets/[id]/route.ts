import { redisGetdel } from "@/lib/redis";
import { get, del } from "@/lib/blob";

/**
 * Response types:
 * - Text secrets: JSON { encryptedBlob }
 * - Image secrets: binary, X-Secret-Type: image, Content-Type = image MIME
 * - Combined secrets: binary, X-Secret-Type: combined, Content-Type = octet-stream
 *
 * The viewer detects the type via X-Secret-Type header.
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
    const isCombined = record.type === "combined";

    try {
      const blob = await get(record.blobUrl, { access: "private" });

      if (!blob) {
        return Response.json(
          { error: "Encrypted data not found" },
          { status: 500 }
        );
      }

      // Fire-and-forget delete
      try {
        del(record.blobUrl).catch(() => {});
      } catch {
        // Sync throw — ignore
      }

      const imageType =
        record.contentType || record.imageContentType || "image/png";

      return new Response(blob.stream, {
        headers: {
          "Content-Type": isCombined
            ? "application/octet-stream"
            : imageType,
          "X-Secret-Type": isCombined ? "combined" : "image",
          "X-Image-Content-Type": imageType,
          "Cache-Control": "no-store",
        },
      });
    } catch (err) {
      console.error("Failed to fetch or delete Blob:", err);
      return Response.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }
  }

  return Response.json({ encryptedBlob: value as string });
}
