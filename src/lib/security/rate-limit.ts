import { NextResponse, type NextRequest } from "next/server";

type RateLimitConfig = {
  limit: number;
  windowMs: number;
};

type Bucket = {
  count: number;
  resetAt: number;
};

type RateLimitResult =
  | {
      ok: true;
      headers: HeadersInit;
    }
  | {
      ok: false;
      headers: HeadersInit;
      retryAfter: number;
    };

const buckets = new Map<string, Bucket>();

export function checkRateLimit(
  request: NextRequest,
  scope: string,
  { limit, windowMs }: RateLimitConfig
): RateLimitResult {
  const now = Date.now();
  const key = `${scope}:${getClientIdentifier(request)}`;
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return {
      ok: true,
      headers: getHeaders({ limit, remaining: limit - 1, resetAt: now + windowMs })
    };
  }

  if (bucket.count >= limit) {
    const retryAfter = Math.ceil((bucket.resetAt - now) / 1000);

    return {
      ok: false,
      headers: getHeaders({ limit, remaining: 0, resetAt: bucket.resetAt, retryAfter }),
      retryAfter
    };
  }

  bucket.count += 1;
  return {
    ok: true,
    headers: getHeaders({ limit, remaining: Math.max(0, limit - bucket.count), resetAt: bucket.resetAt })
  };
}

export function rateLimitResponse(result: Extract<RateLimitResult, { ok: false }>) {
  return NextResponse.json(
    { error: `Too many requests. Try again in ${result.retryAfter} seconds.` },
    { headers: result.headers, status: 429 }
  );
}

function getClientIdentifier(request: NextRequest) {
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = request.headers.get("x-real-ip")?.trim();

  return forwardedFor || realIp || "unknown";
}

function getHeaders({
  limit,
  remaining,
  resetAt,
  retryAfter
}: {
  limit: number;
  remaining: number;
  resetAt: number;
  retryAfter?: number;
}): HeadersInit {
  return {
    "retry-after": retryAfter ? String(retryAfter) : "",
    "x-ratelimit-limit": String(limit),
    "x-ratelimit-remaining": String(remaining),
    "x-ratelimit-reset": String(Math.ceil(resetAt / 1000))
  };
}
