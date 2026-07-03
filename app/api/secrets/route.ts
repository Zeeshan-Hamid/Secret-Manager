import { nanoid } from "nanoid";
import { createSecretSchema } from "@/lib/validators";
import { redisSet } from "@/lib/redis";

const SECRET_TTL_SECONDS = process.env.SECRET_TTL_SECONDS
  ? parseInt(process.env.SECRET_TTL_SECONDS, 10)
  : 86_400; // default: 24 hours

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Validate input — text or image
    const parsed = createSecretSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const input = parsed.data;
    const id = nanoid(25);

    // Narrow the union type via discriminator check
    if ("type" in input && (input.type === "image" || input.type === "combined")) {
      const img = input as typeof input & {
        type: "image" | "combined";
        blobUrl: string;
        contentType?: string;
        imageContentType?: string;
      };
      const record = {
        type: img.type,
        blobUrl: img.blobUrl,
        ...(img.type === "image"
          ? { contentType: img.contentType }
          : { imageContentType: img.imageContentType }),
      };
      await redisSet(
        `secret:${id}`,
        JSON.stringify(record),
        SECRET_TTL_SECONDS
      );
    } else {
      const txt = input as typeof input & { encryptedBlob: string };
      await redisSet(
        `secret:${id}`,
        txt.encryptedBlob,
        SECRET_TTL_SECONDS
      );
    }

    return Response.json({ id }, { status: 201 });
  } catch (error) {
    console.error("Failed to create secret:", error);
    return Response.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
