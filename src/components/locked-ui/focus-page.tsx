"use client";

import { Check, ListFilter, Pause, Play, RotateCcw, SkipBack, SkipForward } from "lucide-react";
import { useState } from "react";
import {
  focusBars as defaultFocusBars,
  focusSessions as defaultFocusSessions,
  type LockedFocusSession
} from "./data";
import { LockedPage, LockedPageTitle, SoftPanel } from "./primitives";
import { cn } from "@/lib/utils";

const focusTabs = ["Focus", "Break"] as const;

type LockedFocusPageProps = {
  bars?: readonly number[];
  sessions?: readonly LockedFocusSession[];
  totalFocusTime?: string;
};

export function LockedFocusPage({
  bars = defaultFocusBars,
  sessions = defaultFocusSessions,
  totalFocusTime = "2h 15m"
}: LockedFocusPageProps) {
  const [mode, setMode] = useState<(typeof focusTabs)[number]>("Focus");
  const [running, setRunning] = useState(false);

  return (
    <LockedPage className="max-w-[780px]">
      <LockedPageTitle description="Minimize distractions. Maximize focus." title="Focus Mode" />

      <section className="grid gap-6 lg:grid-cols-[1fr_220px]">
        <SoftPanel className="p-5">
          <div className="grid h-9 grid-cols-2 rounded-lg border border-zinc-200 p-0.5">
            {focusTabs.map((tab) => (
              <button
                aria-pressed={mode === tab}
                className={cn(
                  "rounded-md text-[12px] font-semibold text-zinc-500 transition-colors hover:text-zinc-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400",
                  mode === tab && "bg-violet-50 text-violet-700 shadow-sm"
                )}
                key={tab}
                onClick={() => setMode(tab)}
                type="button"
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="flex min-h-[260px] flex-col items-center justify-center">
            <div
              className="flex size-[190px] items-center justify-center rounded-full"
              style={{
                background: "conic-gradient(#6d3df2 0 38%, #d9c8ff 38% 62%, #ededf0 62% 100%)"
              }}
            >
              <div className="flex size-[154px] flex-col items-center justify-center rounded-full bg-white">
                <p className="text-[40px] font-semibold leading-none tracking-normal text-zinc-950">
                  {mode === "Focus" ? "50:00" : "10:00"}
                </p>
                <p className="mt-3 text-[12px] font-medium text-zinc-500">{mode}</p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-center gap-3">
            <button
              className="inline-flex h-11 min-w-36 items-center justify-center gap-2 rounded-lg bg-violet-600 px-5 text-[13px] font-semibold text-white shadow-[0_14px_28px_rgba(109,61,242,0.28)] transition-colors hover:bg-violet-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
              onClick={() => setRunning((value) => !value)}
              type="button"
            >
              {running ? <Pause className="size-4" /> : <Play className="size-4" />}
              {running ? "Pause Focus" : "Start Focus"}
            </button>
            <button
              aria-label="Reset timer"
              className="flex size-9 items-center justify-center rounded-lg text-zinc-500 transition-colors hover:bg-zinc-50 hover:text-zinc-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
              type="button"
            >
              <RotateCcw className="size-4" />
            </button>
          </div>
        </SoftPanel>

        <div className="flex flex-col gap-4">
          <SoftPanel className="p-5">
            <p className="text-[13px] font-semibold text-zinc-950">Today&apos;s Focus</p>
            <p className="mt-5 text-[26px] font-semibold leading-none text-zinc-950">{totalFocusTime}</p>
            <p className="mt-2 text-[11px] font-medium text-zinc-500">Total Focus Time</p>
            <div className="mt-7 flex h-20 items-end justify-between gap-2">
              {bars.map((height, index) => (
                <div className="flex flex-1 flex-col items-center gap-2" key={`${height}-${index}`}>
                  <span className="w-2 rounded-full bg-violet-600" style={{ height }} />
                  <span className="text-[9px] font-semibold text-zinc-500">{"MTWTFSS"[index]}</span>
                </div>
              ))}
            </div>
          </SoftPanel>

          <SoftPanel className="p-5">
            <p className="text-[13px] font-semibold text-zinc-950">Focus Sessions</p>
            <div className="mt-4 flex flex-col gap-3">
              {sessions.length ? (
                sessions.map((session) => (
                  <div className="grid grid-cols-[18px_1fr_auto] items-center gap-3" key={session.id}>
                    <span
                      className={cn(
                        "flex size-4 items-center justify-center rounded-full border text-[9px]",
                        session.complete ? "border-violet-600 bg-violet-600 text-white" : "border-zinc-300 bg-white"
                      )}
                    >
                      {session.complete ? <Check className="size-2.5" /> : null}
                    </span>
                    <span className="truncate text-[12px] font-medium text-zinc-800">{session.time}</span>
                    <span className="text-[11px] text-zinc-500">{session.minutes}</span>
                  </div>
                ))
              ) : (
                <p className="rounded-lg border border-dashed border-zinc-200 bg-white p-3 text-[12px] font-medium text-zinc-500">
                  No planned focus sessions yet.
                </p>
              )}
            </div>
          </SoftPanel>
        </div>
      </section>

      <SoftPanel className="flex min-h-[80px] items-center justify-between gap-4 p-4">
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-zinc-950">Focus Playlist</p>
          <p className="mt-2 truncate text-[12px] text-zinc-500">Lo-Fi Beats</p>
        </div>
        <div className="flex items-center gap-4">
          <button
            aria-label="Previous track"
            className="flex size-8 items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
            type="button"
          >
            <SkipBack className="size-4" />
          </button>
          <button
            aria-label="Play playlist"
            className="flex size-10 items-center justify-center rounded-full border border-violet-400 text-violet-700 shadow-sm hover:bg-violet-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
            type="button"
          >
            <Play className="size-4" />
          </button>
          <button
            aria-label="Next track"
            className="flex size-8 items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
            type="button"
          >
            <SkipForward className="size-4" />
          </button>
        </div>
        <button
          aria-label="Playlist controls"
          className="flex size-9 items-center justify-center rounded-lg border border-zinc-200 text-zinc-500 hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
          type="button"
        >
          <ListFilter className="size-4" />
        </button>
      </SoftPanel>
    </LockedPage>
  );
}
