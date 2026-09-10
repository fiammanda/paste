import { Redis } from "@upstash/redis";

export async function onRequest({ request, env, params, data, next, waitUntil }) {
  const redis = Redis.fromEnv(env);

  const hash = await redis.hgetall(env.KV) || {};
  const keys = Object.keys(hash);
  if (keys.length) {
    const exps = await redis.httl(env.KV, keys);
    keys.forEach((key, i) => {
      hash[key].key = key;
      if (exps[i] > 0) hash[key].expires = exps[i];
    });
  }

  return new Response(`window.DATA = ${JSON.stringify(hash).replace(/</g, "\\u003c")};`, {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}
