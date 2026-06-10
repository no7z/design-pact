// Naive in-memory per-IP sliding-window rate limiter for the AI routes.
// 进程内存实现：单实例部署足够；serverless 多实例下每个实例各自计数，
// 限流会放宽，仅作为成本兜底而非严格配额。

type Window = { count: number; resetAt: number };

const windows = new Map<string, Window>();
const MAX_ENTRIES = 5000;

function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "local";
}

/**
 * Returns a 429 Response when the caller exceeded `limit` requests per window,
 * otherwise null (request allowed).
 */
export function rateLimit(
  req: Request,
  route: string,
  limit: number,
  windowMs = 60_000,
): Response | null {
  const now = Date.now();
  if (windows.size > MAX_ENTRIES) {
    for (const [k, w] of windows) if (now >= w.resetAt) windows.delete(k);
  }

  const key = `${route}:${clientIp(req)}`;
  const w = windows.get(key);
  if (!w || now >= w.resetAt) {
    windows.set(key, { count: 1, resetAt: now + windowMs });
    return null;
  }
  if (w.count >= limit) {
    return Response.json(
      { error: "请求过于频繁，请稍后再试" },
      { status: 429, headers: { "Retry-After": String(Math.ceil((w.resetAt - now) / 1000)) } },
    );
  }
  w.count += 1;
  return null;
}
