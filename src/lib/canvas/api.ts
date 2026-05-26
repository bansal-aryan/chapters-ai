import type { CanvasTokenPayload } from "@/lib/canvas/token-storage";

type CanvasApiClientOptions = {
  domain: string;
  token: CanvasTokenPayload;
};

type CanvasParams = Record<string, string | number | boolean | Array<string | number | boolean> | null | undefined>;

export class CanvasApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly path: string
  ) {
    super(message);
    this.name = "CanvasApiError";
  }
}

export class CanvasApiClient {
  private token: CanvasTokenPayload;

  constructor(private readonly options: CanvasApiClientOptions) {
    this.token = options.token;
  }

  async get<T>(path: string, params: CanvasParams = {}) {
    const response = await this.request(path, params);
    return (await response.json()) as T;
  }

  async getPaginated<T>(path: string, params: CanvasParams = {}) {
    const items: T[] = [];
    let nextUrl: string | null = this.buildUrl(path, { ...params, per_page: params.per_page ?? 100 }).toString();
    let pageCount = 0;

    while (nextUrl) {
      pageCount += 1;

      if (pageCount > 50) {
        throw new CanvasApiError("Canvas pagination exceeded the safety limit.", 400, path);
      }

      const response = await this.requestUrl(nextUrl, path);
      const data = (await response.json()) as unknown;

      if (!Array.isArray(data)) {
        throw new CanvasApiError("Canvas returned an unexpected paginated response.", response.status, path);
      }

      items.push(...(data as T[]));
      nextUrl = getNextLink(response.headers.get("link"));
    }

    return items;
  }

  private async request(path: string, params: CanvasParams) {
    return this.requestUrl(this.buildUrl(path, params).toString(), path);
  }

  private async requestUrl(url: string, path: string, didRefresh = false): Promise<Response> {
    const response = await fetch(url, {
      headers: {
        accept: "application/json",
        authorization: `${this.token.tokenType || "Bearer"} ${this.token.accessToken}`
      }
    });

    if (response.status === 401 && !didRefresh) {
      throw new CanvasApiError("Canvas token was rejected. Reconnect your personal access token.", 401, path);
    }

    if (!response.ok) {
      const message = await response.text().catch(() => "");
      throw new CanvasApiError(message.slice(0, 240) || "Canvas request failed.", response.status, path);
    }

    return response;
  }

  private buildUrl(path: string, params: CanvasParams) {
    const url = new URL(path, `https://${this.options.domain}`);

    Object.entries(params).forEach(([key, value]) => {
      if (value === null || value === undefined) {
        return;
      }

      if (Array.isArray(value)) {
        value.forEach((item) => url.searchParams.append(key, String(item)));
        return;
      }

      url.searchParams.set(key, String(value));
    });

    return url;
  }
}

function getNextLink(header: string | null) {
  if (!header) {
    return null;
  }

  return header
    .split(",")
    .map((part) => part.trim())
    .map((part) => {
      const match = part.match(/^<([^>]+)>;\s*rel="([^"]+)"$/);
      return match ? { rel: match[2], url: match[1] } : null;
    })
    .find((part) => part?.rel === "next")?.url ?? null;
}
