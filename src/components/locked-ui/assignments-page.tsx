"use client";

import { Filter } from "lucide-react";
import { useMemo, useState } from "react";
import { assignmentRows as defaultAssignmentRows, type LockedAssignmentRow } from "./data";
import { AccentRing, ControlButton, LockedPage, LockedPageTitle, PriorityPill } from "./primitives";
import { cn } from "@/lib/utils";

const tabs = ["Upcoming", "Completed", "All"] as const;

type LockedAssignmentsPageProps = {
  assignments?: readonly LockedAssignmentRow[];
};

export function LockedAssignmentsPage({
  assignments = defaultAssignmentRows
}: LockedAssignmentsPageProps) {
  const [tab, setTab] = useState<(typeof tabs)[number]>("Upcoming");
  const emptyLabel = tab === "All" ? "assignments" : `${tab.toLowerCase()} assignments`;
  const visibleAssignments = useMemo(() => {
    if (tab === "All") {
      return assignments;
    }

    return assignments.filter((assignment) => assignment.status === tab.toLowerCase());
  }, [assignments, tab]);

  return (
    <LockedPage>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-4">
          <LockedPageTitle title="Assignments" />
          <div className="flex items-center gap-6">
            {tabs.map((item) => (
              <button
                className={cn(
                  "h-8 rounded-lg px-3 text-[13px] font-semibold text-zinc-600 transition-colors hover:bg-zinc-50 hover:text-zinc-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400",
                  tab === item && "bg-violet-50 text-violet-700"
                )}
                key={item}
                onClick={() => setTab(item)}
                type="button"
              >
                {item}
              </button>
            ))}
          </div>
        </div>
        <ControlButton>
          <Filter className="size-3.5" />
          Filter
        </ControlButton>
      </div>

      <section className="flex flex-col gap-3">
        {visibleAssignments.length ? (
          visibleAssignments.map((assignment) => (
            <article
              className="grid min-h-[92px] grid-cols-[24px_minmax(0,1fr)] gap-4 rounded-lg border border-zinc-200 bg-white p-5 shadow-[0_10px_30px_rgba(24,24,27,0.035)] md:grid-cols-[24px_minmax(0,1fr)_128px_126px]"
              key={assignment.id}
            >
              <AccentRing accent={assignment.accent} />
              <div className="min-w-0">
                <h2 className="truncate text-[14px] font-semibold leading-6 text-zinc-950">{assignment.title}</h2>
                <p className="mt-1 flex flex-wrap items-center gap-2 text-[12px] font-medium text-zinc-500">
                  <span>{assignment.course}</span>
                  <span className="size-1 rounded-full bg-zinc-300" />
                  <span>{assignment.owner}</span>
                </p>
              </div>
              <div className="col-start-2 mt-2 flex items-start md:col-auto md:mt-0 md:justify-end">
                <PriorityPill priority={assignment.priority} />
              </div>
              <div className="col-start-2 text-left md:col-auto md:text-right">
                <p className="text-[13px] font-semibold text-zinc-950">{assignment.dueLabel}</p>
                <p className="mt-1 text-[11px] text-zinc-500">{assignment.dueDate}</p>
              </div>
            </article>
          ))
        ) : (
          <div className="flex min-h-[148px] items-center justify-center rounded-lg border border-dashed border-zinc-200 bg-white px-5 text-center text-[13px] font-medium text-zinc-500">
            No {emptyLabel} yet.
          </div>
        )}
      </section>

      {visibleAssignments.length > 4 ? (
        <button
          className="mx-auto rounded-lg px-4 py-2 text-[13px] font-medium text-zinc-500 transition-colors hover:bg-zinc-50 hover:text-zinc-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
          type="button"
        >
          Load more
        </button>
      ) : null}
    </LockedPage>
  );
}
