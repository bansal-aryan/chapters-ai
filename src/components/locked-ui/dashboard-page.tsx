import { ArrowRight, CalendarDays, Clock3, FileCheck2, FolderOpen, Sparkles, Target } from "lucide-react";
import Link from "next/link";
import { assignmentRows, calendarEvents, dashboardCards, resourceFiles } from "./data";
import { AccentRing, LockedPage, PriorityPill, SoftPanel } from "./primitives";

export function LockedDashboardPage() {
  return (
    <LockedPage className="max-w-[1080px]">
      <section className="grid gap-5 lg:grid-cols-[1fr_300px]">
        <SoftPanel className="p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-[24px] font-semibold leading-8 text-zinc-950">Good morning, Alex</h1>
              <p className="mt-2 text-[13px] leading-5 text-zinc-500">Here is what needs attention today.</p>
            </div>
            <Link
              className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-violet-600 px-4 text-[12px] font-semibold text-white shadow-[0_12px_28px_rgba(109,61,242,0.25)] hover:bg-violet-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
              href="/focus"
            >
              Start Focus
              <ArrowRight className="size-3.5" />
            </Link>
          </div>

          <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {dashboardCards.map((card) => (
              <div className="rounded-lg border border-zinc-100 bg-zinc-50 p-4" key={card.label}>
                <p className="text-[11px] font-semibold text-zinc-500">{card.label}</p>
                <p className="mt-2 text-[22px] font-semibold leading-none text-zinc-950">{card.value}</p>
                <p className="mt-2 text-[11px] text-zinc-500">{card.helper}</p>
              </div>
            ))}
          </div>
        </SoftPanel>

        <SoftPanel className="p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-[13px] font-semibold text-zinc-950">Today&apos;s Focus</h2>
            <Target className="size-4 text-violet-600" />
          </div>
          <div className="mt-5 flex items-center gap-4">
            <div className="flex size-20 items-center justify-center rounded-full bg-[conic-gradient(#6d3df2_0_70%,#ece6ff_70%_100%)]">
              <div className="flex size-16 items-center justify-center rounded-full bg-white text-[18px] font-semibold text-zinc-950">70%</div>
            </div>
            <div className="min-w-0">
              <p className="text-[13px] font-semibold text-zinc-950">AP Calculus BC</p>
              <p className="mt-1 text-[12px] leading-5 text-zinc-500">Problem set due in 2 days</p>
            </div>
          </div>
          <Link
            className="mt-5 inline-flex h-9 w-full items-center justify-center rounded-lg border border-zinc-200 text-[12px] font-semibold text-zinc-700 hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
            href="/assignments"
          >
            View assignments
          </Link>
        </SoftPanel>
      </section>

      <section className="grid gap-5 lg:grid-cols-[1fr_300px]">
        <SoftPanel className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-[13px] font-semibold text-zinc-950">
              <FileCheck2 className="size-4 text-violet-600" />
              Priority Queue
            </h2>
            <Link className="text-[12px] font-semibold text-violet-700 hover:text-violet-800" href="/assignments">
              View all
            </Link>
          </div>
          <div className="flex flex-col gap-3">
            {assignmentRows.slice(0, 3).map((assignment) => (
              <article className="grid grid-cols-[22px_1fr_auto] items-start gap-3 rounded-lg border border-zinc-100 bg-white p-4" key={assignment.id}>
                <AccentRing accent={assignment.accent} />
                <div className="min-w-0">
                  <h3 className="truncate text-[13px] font-semibold text-zinc-950">{assignment.title}</h3>
                  <p className="mt-1 text-[11px] font-medium text-zinc-500">{assignment.dueLabel}</p>
                </div>
                <PriorityPill priority={assignment.priority} />
              </article>
            ))}
          </div>
        </SoftPanel>

        <SoftPanel className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-[13px] font-semibold text-zinc-950">
              <CalendarDays className="size-4 text-violet-600" />
              Calendar
            </h2>
            <Link className="text-[12px] font-semibold text-violet-700 hover:text-violet-800" href="/calendar">
              Week
            </Link>
          </div>
          <div className="flex flex-col gap-3">
            {calendarEvents.slice(0, 3).map((event) => (
              <div className="flex items-start gap-3" key={event.id}>
                <span className="mt-1 flex size-7 items-center justify-center rounded-lg bg-violet-50 text-violet-700">
                  <Clock3 className="size-3.5" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-[12px] font-semibold text-zinc-950">{event.title}</p>
                  <p className="mt-1 text-[11px] text-zinc-500">{event.time}</p>
                </div>
              </div>
            ))}
          </div>
        </SoftPanel>
      </section>

      <section className="grid gap-5 lg:grid-cols-[1fr_300px]">
        <SoftPanel className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-[13px] font-semibold text-zinc-950">
              <Sparkles className="size-4 text-violet-600" />
              AI Assistant
            </h2>
            <Link className="text-[12px] font-semibold text-violet-700 hover:text-violet-800" href="/assistant">
              Ask
            </Link>
          </div>
          <p className="text-[13px] leading-6 text-zinc-500">
            Your next best move is to finish the calculus problem set, then block physics lab review after lunch.
          </p>
        </SoftPanel>

        <SoftPanel className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-[13px] font-semibold text-zinc-950">
              <FolderOpen className="size-4 text-violet-600" />
              Recent Files
            </h2>
            <Link className="text-[12px] font-semibold text-violet-700 hover:text-violet-800" href="/resources">
              Open
            </Link>
          </div>
          <div className="flex flex-col gap-3">
            {resourceFiles.slice(0, 3).map((file) => (
              <p className="truncate text-[12px] font-medium text-zinc-700" key={file.id}>{file.title}</p>
            ))}
          </div>
        </SoftPanel>
      </section>
    </LockedPage>
  );
}
