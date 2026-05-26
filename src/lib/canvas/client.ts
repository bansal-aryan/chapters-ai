export type CanvasConnectionRequest = {
  domain: string;
};

export type CanvasConnectionState = {
  domain: string;
  authUrl: string;
  status: "connected" | "not_connected" | "ready_for_token";
};

export function normalizeCanvasDomain(domain: string): string {
  const value = domain.trim();

  if (!value) {
    return "";
  }

  try {
    const url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);
    return `${url.hostname}${url.port ? `:${url.port}` : ""}`.toLowerCase();
  } catch {
    return value
      .replace(/^https?:\/\//i, "")
      .split("/")[0]
      .replace(/\/$/, "")
      .toLowerCase();
  }
}

export function createCanvasAuthRequest({
  domain
}: CanvasConnectionRequest): CanvasConnectionState {
  const normalizedDomain = normalizeCanvasDomain(domain);

  return {
    domain: normalizedDomain,
    authUrl: `https://${normalizedDomain}/profile/settings`,
    status: "ready_for_token"
  };
}
