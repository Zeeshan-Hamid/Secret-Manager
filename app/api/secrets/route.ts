import { nanoid } from "nanoid";
import { createSecretSchema } from "@/lib/validators";
import { redisSet } from "@/lib/redis";

const SECRET_TTL_SECONDS = process.env.SECRET_TTL_SECONDS
  ? parseInt(process.env.SECRET_TTL_SECONDS, 10)
  : 86_400; // default: 24 hours

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Validate input
    const parsed = createSecretSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { encryptedBlob } = parsed.data;

    // Generate random, unguessable ID
    const id = nanoid(25);

    // Store in Redis with 24h TTL
    await redisSet(`secret:${id}`, encryptedBlob, SECRET_TTL_SECONDS);

    return Response.json({ id }, { status: 201 });
  } catch (error) {
    console.error("Failed to create secret:", error);
    return Response.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
