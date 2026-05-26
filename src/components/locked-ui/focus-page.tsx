"use client";

import { Check, ListFilter, Pause, Play, RotateCcw, SkipBack, SkipForward } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  focusBars as defaultFocusBars,
  focusSessions as defaultFocusSessions,
  type LockedFocusSession
} from "./data";
import { LockedPage, LockedPageTitle, SoftPanel } from "./primitives";
import { cn } from "@/lib/utils";

const focusTabs = ["Focus", "Break"] as const;
const focusSeconds = 50 * 60;
const breakSeconds = 10 * 60;
const tracks = [
  { frequency: 196, label: "Lo-Fi Beats" },
  { frequency: 220, label: "Rainy Library" },
  { frequency: 174, label: "Deep Review" }
] as const;

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
  const [secondsLeft, setSecondsLeft] = useState(focusSeconds);
  const [musicPlaying, setMusicPlaying] = useState(false);
  const [trackIndex, setTrackIndex] = useState(0);
  const audioRef = useRef<{
    context: AudioContext;
    gain: GainNode;
    oscillators: OscillatorNode[];
  } | null>(null);
  const totalSeconds = mode === "Focus" ? focusSeconds : breakSeconds;
  const progress = Math.max(0, Math.min(100, ((totalSeconds - secondsLeft) / totalSeconds) * 100));
  const timerLabel = useMemo(() => formatTimer(secondsLeft), [secondsLeft]);

  useEffect(() => {
    const saved = window.localStorage.getItem("chapters_focus_timer");

    if (!saved) {
      return;
    }

    try {
      const parsed = JSON.parse(saved) as { mode?: (typeof focusTabs)[number]; secondsLeft?: number };

      if ((parsed.mode === "Focus" || parsed.mode === "Break") && typeof parsed.secondsLeft === "number") {
        window.queueMicrotask(() => {
          setMode(parsed.mode as (typeof focusTabs)[number]);
          setSecondsLeft(Math.max(0, parsed.secondsLeft as number));
        });
      }
    } catch {
      window.localStorage.removeItem("chapters_focus_timer");
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem("chapters_focus_timer", JSON.stringify({ mode, secondsLeft }));
  }, [mode, secondsLeft]);

  useEffect(() => {
    if (!running) {
      return;
    }

    const interval = window.setInterval(() => {
      setSecondsLeft((value) => {
        if (value <= 1) {
          setRunning(false);
          return 0;
        }

        return value - 1;
      });
    }, 1000);

    return () => window.clearInterval(interval);
  }, [running]);

  useEffect(() => {
    const audio = audioRef.current;

    if (!audio) {
      return;
    }

    audio.oscillators.forEach((oscillator, index) => {
      oscillator.frequency.setTargetAtTime(tracks[trackIndex].frequency * (index === 0 ? 1 : 1.5), audio.context.currentTime, 0.08);
    });
  }, [trackIndex]);

  useEffect(
    () => () => {
      audioRef.current?.oscillators.forEach((oscillator) => oscillator.stop());
      void audioRef.current?.context.close();
      audioRef.current = null;
    },
    []
  );

  function changeMode(nextMode: (typeof focusTabs)[number]) {
    setMode(nextMode);
    setRunning(false);
    setSecondsLeft(nextMode === "Focus" ? focusSeconds : breakSeconds);
  }

  function resetTimer() {
    setRunning(false);
    setSecondsLeft(totalSeconds);
  }

  function toggleMusic() {
    if (musicPlaying) {
      stopMusic();
      setMusicPlaying(false);
      return;
    }

    const AudioContextCtor =
      window.AudioContext ||
      (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

    if (!AudioContextCtor) {
      return;
    }

    const context = new AudioContextCtor();
    const gain = context.createGain();
    gain.gain.value = 0.045;
    gain.connect(context.destination);

    const oscillators = [1, 1.5].map((multiplier) => {
      const oscillator = context.createOscillator();
      oscillator.type = "sine";
      oscillator.frequency.value = tracks[trackIndex].frequency * multiplier;
      oscillator.connect(gain);
      oscillator.start();
      return oscillator;
    });

    audioRef.current = { context, gain, oscillators };
    setMusicPlaying(true);
  }

  function stopMusic() {
    audioRef.current?.oscillators.forEach((oscillator) => oscillator.stop());
    void audioRef.current?.context.close();
    audioRef.current = null;
  }

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
                onClick={() => changeMode(tab)}
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
                background: `conic-gradient(#6d3df2 0 ${progress}%, #d9c8ff ${progress}% 62%, #ededf0 62% 100%)`
              }}
            >
              <div className="flex size-[154px] flex-col items-center justify-center rounded-full bg-white">
                <p className="text-[40px] font-semibold leading-none tracking-normal text-zinc-950">{timerLabel}</p>
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
              onClick={resetTimer}
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
          <p className="mt-2 truncate text-[12px] text-zinc-500">{tracks[trackIndex].label}</p>
        </div>
        <div className="flex items-center gap-4">
          <button
            aria-label="Previous track"
            className="flex size-8 items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
            onClick={() => setTrackIndex((index) => (index === 0 ? tracks.length - 1 : index - 1))}
            type="button"
          >
            <SkipBack className="size-4" />
          </button>
          <button
            aria-label={musicPlaying ? "Pause playlist" : "Play playlist"}
            className="flex size-10 items-center justify-center rounded-full border border-violet-400 text-violet-700 shadow-sm hover:bg-violet-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
            onClick={toggleMusic}
            type="button"
          >
            {musicPlaying ? <Pause className="size-4" /> : <Play className="size-4" />}
          </button>
          <button
            aria-label="Next track"
            className="flex size-8 items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
            onClick={() => setTrackIndex((index) => (index + 1) % tracks.length)}
            type="button"
          >
            <SkipForward className="size-4" />
          </button>
        </div>
        <button
          aria-label="Stop playlist"
          className="flex size-9 items-center justify-center rounded-lg border border-zinc-200 text-zinc-500 hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
          onClick={() => {
            stopMusic();
            setMusicPlaying(false);
          }}
          type="button"
        >
          <ListFilter className="size-4" />
        </button>
      </SoftPanel>
    </LockedPage>
  );
}

function formatTimer(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}
