"use client";

import {
  BookOpen,
  CircleHelp,
  ListChecks,
  Loader2,
  MessageSquareText,
  RotateCcw,
  Send,
  Sparkles,
  Target,
  Trash2
} from "lucide-react";
import Link from "next/link";
import { FormEvent, KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";
import { LockedPage, LockedPageTitle } from "./primitives";
import { cn } from "@/lib/utils";
import type { TutorResponse } from "@/lib/ai/tutor";
import type { SearchResult } from "@/types";

type AssistantContext = {
  assignmentId?: string;
  courseId?: string;
  sourceTitles: string[];
  starterPrompts: string[];
  subtitle: string;
  title: string;
  type: "assignment" | "class" | "global";
};

type LockedAssistantPageProps = {
  context: AssistantContext;
  userName?: string;
};

type ChatMessage = {
  citations?: SearchResult[];
  content: string;
  id: string;
  provider?: "fallback" | "openai";
  role: "assistant" | "user";
  tutorResponse?: TutorResponse;
};

export function LockedAssistantPage({ context, userName = "Alex" }: LockedAssistantPageProps) {
  const nextMessageId = useRef(0);
  const scrollAnchorRef = useRef<HTMLDivElement | null>(null);
  const [prompt, setPrompt] = useState("");
  const [threadId, setThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [retryMessage, setRetryMessage] = useState("");
  const scope = context.type === "assignment" ? "assignment" : context.type === "class" ? "class" : "global";
  const greeting = useMemo(() => {
    if (context.type === "assignment") {
      return `I am focused on ${context.title}.`;
    }

    if (context.type === "class") {
      return `I am focused on ${context.title}.`;
    }

    return `Hi ${userName}, what should we untangle first?`;
  }, [context.title, context.type, userName]);

  useEffect(() => {
    scrollAnchorRef.current?.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [messages, loading]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await sendMessage(prompt);
  }

  async function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      await sendMessage(prompt);
    }
  }

  async function sendMessage(value: string, { appendUser = true }: { appendUser?: boolean } = {}) {
    const message = value.trim();

    if (!message || loading) {
      return;
    }

    const recentMessages = messages.slice(-8).map((item) => ({
      content: item.content,
      role: item.role
    }));

    if (appendUser) {
      setMessages((current) => [
        ...current,
        {
          content: message,
          id: createMessageId("user"),
          role: "user"
        }
      ]);
    }

    setPrompt("");
    setError("");
    setRetryMessage("");
    setLoading(true);

    const response = await fetch("/api/assistant", {
      body: JSON.stringify({
        assignmentId: context.assignmentId,
        courseId: context.courseId,
        message,
        recentMessages,
        scope,
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
          provider?: "fallback" | "openai";
          threadId?: string;
          tutorResponse?: TutorResponse;
        }
      | null;

    if (!response.ok) {
      setError(payload?.error ?? "Assistant request failed.");
      setRetryMessage(message);
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
        id: payload?.message?.id ?? createMessageId("assistant"),
        provider: payload?.provider,
        role: "assistant",
        tutorResponse: payload?.tutorResponse
      }
    ]);
    setLoading(false);
  }

  function createMessageId(prefix: "assistant" | "user") {
    nextMessageId.current += 1;
    return `${prefix}-${nextMessageId.current}`;
  }

  function clearChat() {
    setMessages([]);
    setThreadId(null);
    setError("");
    setRetryMessage("");
    setPrompt("");
  }

  return (
    <LockedPage className="min-h-[calc(100vh-68px)] max-w-[900px] justify-between">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <LockedPageTitle description="Context-aware tutoring from assignments, files, and recent chat." title="AI Assistant" />
        {messages.length ? (
          <button
            className="inline-flex h-9 items-center gap-2 self-start rounded-lg border border-zinc-200 bg-white px-3 text-[12px] font-semibold text-zinc-700 transition-colors hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
            onClick={clearChat}
            type="button"
          >
            <Trash2 className="size-3.5" />
            New chat
          </button>
        ) : null}
      </div>

      <section className="mt-5 rounded-lg border border-zinc-200 bg-white p-4 shadow-[0_14px_36px_rgba(24,24,27,0.04)]">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-violet-50 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-violet-700">
                {context.type === "assignment" ? "Assignment" : context.type === "class" ? "Class" : "Workspace"}
              </span>
              <h2 className="truncate text-[15px] font-semibold text-zinc-950">{context.title}</h2>
            </div>
            <p className="mt-2 text-[12px] leading-5 text-zinc-500">{context.subtitle}</p>
          </div>
          {context.sourceTitles.length ? (
            <div className="flex max-w-full flex-wrap gap-2 sm:max-w-[360px] sm:justify-end">
              {context.sourceTitles.map((title) => (
                <span className="rounded-full border border-zinc-200 px-2 py-1 text-[10px] font-semibold text-zinc-500" key={title}>
                  {title}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      </section>

      <section className="flex min-h-[420px] flex-1 flex-col gap-5 py-6">
        {!messages.length ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-7 py-8">
            <div className="text-center">
              <div className="mx-auto mb-4 flex size-11 items-center justify-center rounded-full bg-violet-50 text-violet-700">
                <MessageSquareText className="size-5" />
              </div>
              <h2 className="text-[22px] font-semibold leading-7 text-zinc-950">{greeting}</h2>
              <p className="mt-2 text-[14px] leading-6 text-zinc-500">
                Ask for a plan, a quiz, an explanation, or feedback on your attempt.
              </p>
            </div>

            <div className="grid w-full gap-3 sm:grid-cols-3">
              {context.starterPrompts.map((starterPrompt) => (
                <button
                  className="flex min-h-[76px] flex-col items-start justify-center rounded-lg border border-zinc-200 bg-white px-4 text-left shadow-[0_10px_26px_rgba(24,24,27,0.035)] transition-colors hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={loading}
                  key={starterPrompt}
                  onClick={() => sendMessage(starterPrompt)}
                  type="button"
                >
                  <span className="flex items-center gap-2 text-[12px] font-semibold text-violet-700">
                    <Sparkles className="size-3.5" />
                    Try this
                  </span>
                  <span className="mt-1 text-[12px] font-medium leading-5 text-zinc-600">{starterPrompt}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {messages.map((message) => (
              <ChatBubble key={message.id} message={message} />
            ))}
            {loading ? (
              <div className="mr-auto flex max-w-[86%] items-center gap-3 rounded-lg border border-zinc-200 bg-white px-4 py-3 text-[13px] text-zinc-500">
                <Loader2 className="size-4 animate-spin text-violet-600" />
                Thinking through your coursework...
              </div>
            ) : null}
            <div ref={scrollAnchorRef} />
          </div>
        )}
      </section>

      {error ? (
        <div className="mx-auto mb-3 flex w-full max-w-[700px] flex-col gap-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-3 text-[12px] font-medium text-amber-900 sm:flex-row sm:items-center sm:justify-between">
          <span>{error}</span>
          {retryMessage ? (
            <button
              className="inline-flex h-8 items-center justify-center gap-2 rounded-md bg-amber-100 px-3 text-[12px] font-bold text-amber-950 transition-colors hover:bg-amber-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
              onClick={() => sendMessage(retryMessage, { appendUser: false })}
              type="button"
            >
              <RotateCcw className="size-3.5" />
              Retry
            </button>
          ) : null}
        </div>
      ) : null}
      <form
        className="mx-auto flex min-h-[88px] w-full max-w-[700px] items-end gap-3 rounded-lg border border-violet-300 bg-white p-3 shadow-[0_14px_40px_rgba(109,61,242,0.08)]"
        onSubmit={handleSubmit}
      >
        <textarea
          className="min-h-12 min-w-0 flex-1 resize-none bg-transparent px-2 py-2 text-[13px] leading-5 text-zinc-950 outline-none placeholder:text-zinc-500"
          disabled={loading}
          onChange={(event) => setPrompt(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={context.type === "assignment" ? "Ask about this assignment..." : "Ask anything..."}
          rows={2}
          value={prompt}
        />
        <button
          aria-label="Send"
          className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-violet-600 text-white shadow-[0_10px_24px_rgba(109,61,242,0.22)] transition-colors hover:bg-violet-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={loading || !prompt.trim()}
          type="submit"
        >
          {loading ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
        </button>
      </form>
      <p className="pb-1 pt-3 text-center text-[11px] text-zinc-400">
        AI can make mistakes. Use it to think, check, and plan; verify important work against your course materials.
      </p>
    </LockedPage>
  );
}

function ChatBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";

  return (
    <article
      className={cn(
        "max-w-[88%] rounded-lg border px-4 py-3 text-[13px] leading-6",
        isUser
          ? "ml-auto border-violet-100 bg-violet-600 text-white"
          : "mr-auto border-zinc-200 bg-white text-zinc-800 shadow-[0_10px_26px_rgba(24,24,27,0.035)]"
      )}
    >
      {isUser ? (
        <p className="whitespace-pre-wrap">{message.content}</p>
      ) : message.tutorResponse ? (
        <TutorAnswer response={message.tutorResponse} />
      ) : (
        <p className="whitespace-pre-wrap">{message.content}</p>
      )}
      {!isUser && message.citations?.length ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {message.citations.slice(0, 4).map((citation) => (
            <Link
              className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2 py-1 text-[10px] font-semibold text-violet-700 transition-colors hover:bg-violet-100"
              href={getCitationHref(citation)}
              key={`${citation.sourceType}-${citation.id}`}
            >
              <BookOpen className="size-3" />
              {citation.title}
            </Link>
          ))}
        </div>
      ) : null}
      {!isUser && message.provider ? (
        <p className="mt-3 text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
          {message.provider === "openai" ? "OpenAI response" : "Local fallback"}
        </p>
      ) : null}
    </article>
  );
}

function TutorAnswer({ response }: { response: TutorResponse }) {
  return (
    <div className="space-y-3">
      <div>
        <p className="text-[13px] font-medium leading-6 text-zinc-900">{response.directAnswer}</p>
        <p className="mt-2 border-l-2 border-violet-200 pl-3 text-[12px] leading-5 text-zinc-600">
          {response.assignmentConnection}
        </p>
      </div>

      {response.nextSteps.length ? (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-zinc-500">
            <ListChecks className="size-3.5 text-violet-600" />
            Next steps
          </div>
          <ol className="space-y-2">
            {response.nextSteps.map((step, index) => (
              <li className="grid grid-cols-[20px_1fr] gap-2 text-[12px] leading-5 text-zinc-700" key={`${step.label}-${index}`}>
                <span className="flex size-5 items-center justify-center rounded-full bg-violet-50 text-[10px] font-bold text-violet-700">
                  {index + 1}
                </span>
                <span>
                  <strong className="font-semibold text-zinc-900">{step.label}:</strong> {step.detail}
                </span>
              </li>
            ))}
          </ol>
        </div>
      ) : null}

      {response.tutorQuestion ? (
        <div className="border-l-2 border-zinc-200 pl-3">
          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-zinc-500">
            <CircleHelp className="size-3.5 text-violet-600" />
            Tutor question
          </div>
          <p className="mt-1 text-[12px] font-medium leading-5 text-zinc-800">{response.tutorQuestion}</p>
        </div>
      ) : null}

      {response.needsMoreContext && response.missingContext.length ? (
        <div className="flex items-start gap-2 text-[12px] leading-5 text-amber-800">
          <Target className="mt-0.5 size-3.5 shrink-0" />
          <span>Needed to go deeper: {response.missingContext.join(", ")}.</span>
        </div>
      ) : null}
    </div>
  );
}

function getCitationHref(result: SearchResult) {
  if (result.assignmentId) {
    return `/assignments/${result.assignmentId}`;
  }

  if (result.courseId) {
    return `/classes/${result.courseId}`;
  }

  return "/resources";
}
