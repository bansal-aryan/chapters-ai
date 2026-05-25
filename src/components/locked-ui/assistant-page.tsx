"use client";

import { Send, Sparkles } from "lucide-react";
import { FormEvent, useState } from "react";
import { assistantActions } from "./data";
import { LockedPage, LockedPageTitle } from "./primitives";

type LockedAssistantPageProps = {
  userName?: string;
};

export function LockedAssistantPage({ userName = "Alex" }: LockedAssistantPageProps) {
  const [prompt, setPrompt] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPrompt("");
  }

  return (
    <LockedPage className="min-h-[calc(100vh-68px)] max-w-[760px] justify-between">
      <LockedPageTitle description="Your intelligent study companion." title="AI Assistant" />

      <section className="flex flex-1 flex-col items-center justify-center gap-7 py-10">
        <div className="text-center">
          <h2 className="text-[21px] font-semibold leading-7 text-zinc-950">Hi {userName},</h2>
          <p className="mt-2 text-[17px] leading-7 text-zinc-500">How can I help you today?</p>
        </div>

        <div className="grid w-full gap-3 sm:grid-cols-3">
          {assistantActions.map((action) => (
            <button
              className="flex min-h-[64px] flex-col items-start justify-center rounded-lg border border-zinc-200 bg-white px-4 text-left shadow-[0_10px_26px_rgba(24,24,27,0.035)] transition-colors hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
              key={action.id}
              onClick={() => setPrompt(action.title)}
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
      </section>

      <form
        className="mx-auto flex min-h-[76px] w-full max-w-[620px] items-center gap-3 rounded-lg border border-violet-300 bg-white p-3 shadow-[0_14px_40px_rgba(109,61,242,0.08)]"
        onSubmit={handleSubmit}
      >
        <input
          className="min-w-0 flex-1 bg-transparent px-2 text-[13px] text-zinc-950 outline-none placeholder:text-zinc-500"
          onChange={(event) => setPrompt(event.target.value)}
          placeholder="Ask anything..."
          value={prompt}
        />
        <button
          aria-label="Send"
          className="flex size-9 items-center justify-center rounded-lg bg-zinc-50 text-zinc-600 transition-colors hover:bg-violet-50 hover:text-violet-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
          type="submit"
        >
          <Send className="size-4" />
        </button>
      </form>
      <p className="pb-1 text-center text-[11px] text-zinc-400">AI can make mistakes. Please double-check important information.</p>
    </LockedPage>
  );
}
