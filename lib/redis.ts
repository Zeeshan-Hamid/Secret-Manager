import { Redis } from "@upstash/redis";

let client: Redis | null = null;

function getRedis(): Redis {
  if (client) return client;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    throw new Error(
      "Missing Upstash Redis environment variables. " +
        "Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN."
    );
  }

  client = new Redis({ url, token });
  return client;
}

export async function redisSet(
  key: string,
  value: string,
  ttlSeconds: number
): Promise<void> {
  await getRedis().set(key, value, { ex: ttlSeconds });
}

export async function redisGetdel(key: string): Promise<string | null> {
  return getRedis().getdel(key);
}
