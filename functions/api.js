import { Redis } from "@upstash/redis";

export async function onRequest({ request, env, params, data, next, waitUntil }) {
  const redis = Redis.fromEnv(env);

  if (request.method === "POST") {
    const { key, title, content, updated, expires } = await request.json();
    await redis.hset(env.KV, { [key]: { title, content, updated } });
    if (expires === 0) {
      await redis.hpersist(env.KV, key);
    } else if (expires) {
      await redis.hexpire(env.KV, key, expires);
    }
    return new Response(null, { status: 204 });
  }

  if (request.method === "DELETE") {
    const { key } = await request.json();
    const resp = await redis.hdel(env.KV, key);
    return new Response(null, { status: resp ? 204 : 404 });
  }

  return new Response(null, { status: 404 });
}