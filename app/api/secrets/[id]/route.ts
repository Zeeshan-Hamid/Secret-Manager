import { redisGetdel } from "@/lib/redis";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id || typeof id !== "string") {
      return Response.json(
        { error: "Invalid secret ID" },
        { status: 400 }
      );
    }

    // GETDEL atomically returns the value AND deletes the key.
    // This enforces one-time view — the second caller gets null.
    const encryptedBlob = await redisGetdel(`secret:${id}`);

    if (encryptedBlob === null) {
      return Response.json(
        { error: "This secret has already been viewed or has expired." },
        { status: 410 }
      );
    }

    return Response.json({ encryptedBlob });
  } catch (error) {
    console.error("Failed to retrieve secret:", error);
    return Response.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
