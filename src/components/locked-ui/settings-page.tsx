"use client";

import { KeyRound, Link2, RefreshCcw, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { type FormEvent, useMemo, useState } from "react";
import { createCanvasAuthRequest } from "@/lib/canvas/client";
import { LockedPage, LockedPageTitle, SoftPanel } from "./primitives";

const guardrails = [
  "Guide, do not complete homework",
  "Cite course materials when used",
  "Ask for student attempts before direct correction"
] as const;

type LockedSettingsPageProps = {
  canConnectCanvas?: boolean;
  initialCanvasStatus?: CanvasStatus;
  isDemoSession?: boolean;
};

export function LockedSettingsPage({
  canConnectCanvas = true,
  initialCanvasStatus = "idle",
  isDemoSession = false
}: LockedSettingsPageProps) {
  const [domain, setDomain] = useState("school.instructure.com");
  const [canvasStatus] = useState<CanvasStatus>(initialCanvasStatus);
  const [token, setToken] = useState("");
  const [tokenStatus, setTokenStatus] = useState<TokenStatus>("idle");
  const [tokenMessage, setTokenMessage] = useState("");
  const canvasAuth = useMemo(() => createCanvasAuthRequest({ domain }), [domain]);
  const signInHref = isDemoSession ? "/auth/sign-out?next=%2Flogin%3Fnext%3D%252Fsettings" : "/login?next=%2Fsettings";

  async function handleTokenSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canConnectCanvas) {
      setTokenStatus("error");
      setTokenMessage("Sign in with a real account before connecting Canvas. Demo mode cannot save school access tokens.");
      return;
    }

    setTokenStatus("pending");
    setTokenMessage("");

    const response = await fetch("/api/canvas/token", {
      body: JSON.stringify({
        accessToken: token,
        domain
      }),
      headers: {
        "content-type": "application/json"
      },
      method: "POST"
    });
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;

    if (!response.ok) {
      setTokenStatus("error");
      setTokenMessage(payload?.error ?? "Canvas access token connection failed.");
      return;
    }

    setToken("");
    setTokenStatus("success");
    setTokenMessage("Canvas access token connected. The first sync has been queued.");
  }

  return (
    <LockedPage className="max-w-[920px]">
      <LockedPageTitle description="Manage account, integrations, and study preferences." title="Settings" />

      <section className="grid gap-5 lg:grid-cols-[1fr_300px]">
        <SoftPanel className="p-5">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-[14px] font-semibold text-zinc-950">Canvas integration</h2>
              <p className="mt-1 text-[12px] leading-5 text-zinc-500">Connect with OAuth or your own Canvas access token.</p>
            </div>
            <span className="rounded-full bg-violet-50 px-3 py-1 text-[11px] font-semibold text-violet-700">
              {canvasStatus === "connected" ? "Connected" : "Ready"}
            </span>
          </div>
          {!canConnectCanvas ? (
            <div className="mb-5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-[12px] leading-5 text-amber-900">
              <p className="font-semibold">Canvas needs a real account before it can save tokens.</p>
              <p className="mt-1 text-amber-800">
                Demo mode can show the locked UI, but it cannot store your school access token.
              </p>
              <Link
                className="mt-3 inline-flex h-9 items-center justify-center rounded-lg bg-zinc-950 px-3 text-[12px] font-semibold text-white transition-colors hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
                href={signInHref}
              >
                Sign in to connect Canvas
              </Link>
            </div>
          ) : null}
          <form action="/api/canvas/oauth/start" className="flex flex-col gap-3" method="get">
            <label className="text-[12px] font-semibold text-zinc-700" htmlFor="canvas-domain">
              Canvas domain
            </label>
            <input
              className="h-10 rounded-lg border border-zinc-200 bg-white px-3 text-[13px] text-zinc-950 outline-none transition-colors placeholder:text-zinc-400 focus:border-violet-300 focus:ring-2 focus:ring-violet-100"
              id="canvas-domain"
              name="domain"
              onChange={(event) => setDomain(event.target.value)}
              value={domain}
            />
            <button
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-violet-600 px-4 text-[13px] font-semibold text-white shadow-[0_12px_28px_rgba(109,61,242,0.24)] transition-colors hover:bg-violet-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={!canConnectCanvas}
              type="submit"
            >
              <Link2 className="size-4" />
              Connect Canvas
            </button>
          </form>
          {canvasStatus !== "idle" ? (
            <p className="mt-3 rounded-lg border border-violet-100 bg-violet-50 px-3 py-2 text-[12px] font-medium text-violet-800">
              {getCanvasStatusMessage(canvasStatus)}
            </p>
          ) : null}
          <p className="mt-4 truncate rounded-lg bg-zinc-50 px-3 py-2 text-[11px] font-medium text-zinc-500">
            {canvasAuth.authUrl}
          </p>
          <div className="my-5 h-px bg-zinc-100" />
          <form className="flex flex-col gap-3" onSubmit={handleTokenSubmit}>
            <label className="text-[12px] font-semibold text-zinc-700" htmlFor="canvas-token">
              Personal access token
            </label>
            <input
              autoComplete="off"
              className="h-10 rounded-lg border border-zinc-200 bg-white px-3 text-[13px] text-zinc-950 outline-none transition-colors placeholder:text-zinc-400 focus:border-violet-300 focus:ring-2 focus:ring-violet-100"
              disabled={!canConnectCanvas}
              id="canvas-token"
              onChange={(event) => setToken(event.target.value)}
              placeholder="Paste token locally"
              type="password"
              value={token}
            />
            <button
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-zinc-200 bg-white px-4 text-[13px] font-semibold text-zinc-800 shadow-sm transition-colors hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={!canConnectCanvas || tokenStatus === "pending"}
              type="submit"
            >
              <KeyRound className="size-4" />
              {tokenStatus === "pending" ? "Checking token..." : "Connect with token"}
            </button>
          </form>
          {tokenStatus !== "idle" ? (
            <p className="mt-3 rounded-lg border border-violet-100 bg-violet-50 px-3 py-2 text-[12px] font-medium text-violet-800">
              {tokenMessage}
            </p>
          ) : null}
        </SoftPanel>

        <SoftPanel className="p-5">
          <h2 className="text-[14px] font-semibold text-zinc-950">Sync health</h2>
          <div className="mt-5 flex flex-col gap-4">
            {[
              { icon: RefreshCcw, label: "Last sync", value: "Pending OAuth" },
              { icon: KeyRound, label: "Token storage", value: "Server-side" },
              { icon: ShieldCheck, label: "Access", value: canConnectCanvas ? "User-owned rows" : "Sign in required" }
            ].map((item) => {
              const Icon = item.icon;

              return (
                <div className="flex items-start gap-3" key={item.label}>
                  <span className="flex size-8 items-center justify-center rounded-lg bg-violet-50 text-violet-700">
                    <Icon className="size-4" />
                  </span>
                  <div>
                    <p className="text-[12px] font-semibold text-zinc-950">{item.label}</p>
                    <p className="mt-1 text-[11px] text-zinc-500">{item.value}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </SoftPanel>
      </section>

      <SoftPanel className="p-5">
        <h2 className="text-[14px] font-semibold text-zinc-950">AI behavior</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {guardrails.map((guardrail) => (
            <div className="rounded-lg border border-zinc-100 bg-zinc-50 p-4" key={guardrail}>
              <ShieldCheck className="size-4 text-violet-700" />
              <p className="mt-3 text-[12px] font-semibold leading-5 text-zinc-800">{guardrail}</p>
            </div>
          ))}
        </div>
      </SoftPanel>
    </LockedPage>
  );
}

export type CanvasStatus =
  | "idle"
  | "connected"
  | "connection_error"
  | "invalid_domain"
  | "invalid_state"
  | "missing_code"
  | "missing_config"
  | "oauth_denied"
  | "token_exchange_failed";

type TokenStatus = "error" | "idle" | "pending" | "success";

function getCanvasStatusMessage(status: CanvasStatus) {
  switch (status) {
    case "connected":
      return "Canvas is connected. The first sync has been queued.";
    case "missing_config":
      return "Canvas OAuth needs CANVAS_CLIENT_ID, CANVAS_CLIENT_SECRET, and CANVAS_TOKEN_ENCRYPTION_KEY.";
    case "invalid_domain":
      return "Enter your school Canvas domain before connecting.";
    case "invalid_state":
      return "Canvas returned an invalid or expired OAuth state. Please try connecting again.";
    case "oauth_denied":
      return "Canvas authorization was cancelled or denied.";
    case "missing_code":
      return "Canvas did not return an OAuth code. Please try again.";
    case "token_exchange_failed":
      return "Canvas rejected the OAuth code exchange. Check the developer key and redirect URI.";
    case "connection_error":
      return "The Canvas connection could not be saved. Please try again.";
    default:
      return "";
  }
}
