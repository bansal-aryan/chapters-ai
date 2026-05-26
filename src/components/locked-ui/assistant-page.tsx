"use client";

import { Send, Sparkles } from "lucide-react";
import { FormEvent, useState } from "react";
import { assistantActions } from "./data";
import { LockedPage, LockedPageTitle } from "./primitives";
import { cn } from "@/lib/utils";
import type { SearchResult } from "@/types";

type LockedAssistantPageProps = {
  userName?: string;
};

type ChatMessage = {
  citations?: SearchResult[];
  content: string;
  id: string;
  role: "assistant" | "user";
};

export function LockedAssistantPage({ userName = "Alex" }: LockedAssistantPageProps) {
  const [localMessageId, setLocalMessageId] = useState(0);
  const [prompt, setPrompt] = useState("");
  const [threadId, setThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await sendMessage(prompt);
  }

  async function sendMessage(value: string) {
    const message = value.trim();

    if (!message || loading) {
      return;
    }

    const userMessage: ChatMessage = {
      content: message,
      id: `local-${localMessageId}`,
      role: "user"
    };

    setLocalMessageId((id) => id + 1);
    setPrompt("");
    setError("");
    setLoading(true);
    setMessages((current) => [...current, userMessage]);

    const response = await fetch("/api/assistant", {
      body: JSON.stringify({
        message,
        scope: "global",
        threadId
      }),
      headers: {
        "content-type": "application/json"
      },
      method: "POST"
    });
    const payload = (await response.json().catch(() => null)) as
      | {
          citations?: SearchResult[];
          error?: string;
          message?: {
            content?: string;
            id?: string;
          };
          threadId?: string;
        }
      | null;

    if (!response.ok) {
      setError(payload?.error ?? "Assistant request failed.");
      setLoading(false);
      return;
    }

    if (payload?.threadId) {
      setThreadId(payload.threadId);
    }

    setMessages((current) => [
      ...current,
      {
        citations: payload?.citations ?? [],
        content: payload?.message?.content ?? "I could not generate a response.",
        id: payload?.message?.id ?? `assistant-${Date.now()}`,
        role: "assistant"
      }
    ]);
    setLoading(false);
  }

  return (
    <LockedPage className="min-h-[calc(100vh-68px)] max-w-[760px] justify-between">
      <LockedPageTitle description="Your intelligent study companion." title="AI Assistant" />

      <section className="flex flex-1 flex-col gap-7 py-8">
        {!messages.length ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-7 py-10">
            <div className="text-center">
              <h2 className="text-[21px] font-semibold leading-7 text-zinc-950">Hi {userName},</h2>
              <p className="mt-2 text-[17px] leading-7 text-zinc-500">How can I help you today?</p>
            </div>

            <div className="grid w-full gap-3 sm:grid-cols-3">
              {assistantActions.map((action) => (
                <button
                  className="flex min-h-[64px] flex-col items-start justify-center rounded-lg border border-zinc-200 bg-white px-4 text-left shadow-[0_10px_26px_rgba(24,24,27,0.035)] transition-colors hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
                  key={action.id}
                  onClick={() => sendMessage(action.title)}
                  type="button"
                >
                  <span className="flex items-center gap-2 text-[12px] font-semibold text-violet-700">
                    <Sparkles className="size-3.5" />
                    {action.title}
                  </span>
                  <span className="mt-1 text-[11px] font-medium text-zinc-500">{action.description}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {messages.map((message) => (
              <article
                className={cn(
                  "max-w-[86%] rounded-lg border px-4 py-3 text-[13px] leading-6",
                  message.role === "user"
                    ? "ml-auto border-violet-100 bg-violet-600 text-white"
                    : "mr-auto border-zinc-200 bg-white text-zinc-800"
                )}
                key={message.id}
              >
                <p className="whitespace-pre-wrap">{message.content}</p>
                {message.citations?.length ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {message.citations.slice(0, 3).map((citation) => (
                      <span className="rounded-full bg-violet-50 px-2 py-1 text-[10px] font-semibold text-violet-700" key={citation.id}>
                        {citation.title}
                      </span>
                    ))}
                  </div>
                ) : null}
              </article>
            ))}
            {loading ? (
              <div className="mr-auto rounded-lg border border-zinc-200 bg-white px-4 py-3 text-[13px] text-zinc-500">
                Thinking with your assignments...
              </div>
            ) : null}
          </div>
        )}
      </section>

      {error ? (
        <p className="mx-auto mb-3 w-full max-w-[620px] rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] font-medium text-amber-900">
          {error}
        </p>
      ) : null}
      <form
        className="mx-auto flex min-h-[76px] w-full max-w-[620px] items-center gap-3 rounded-lg border border-violet-300 bg-white p-3 shadow-[0_14px_40px_rgba(109,61,242,0.08)]"
        onSubmit={handleSubmit}
      >
        <input
          className="min-w-0 flex-1 bg-transparent px-2 text-[13px] text-zinc-950 outline-none placeholder:text-zinc-500"
          disabled={loading}
          onChange={(event) => setPrompt(event.target.value)}
          placeholder="Ask anything..."
          value={prompt}
        />
        <button
          aria-label="Send"
          className="flex size-9 items-center justify-center rounded-lg bg-zinc-50 text-zinc-600 transition-colors hover:bg-violet-50 hover:text-violet-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={loading || !prompt.trim()}
          type="submit"
        >
          <Send className="size-4" />
        </button>
      </form>
      <p className="pb-1 text-center text-[11px] text-zinc-400">AI can make mistakes. Please double-check important information.</p>
    </LockedPage>
  );
}
