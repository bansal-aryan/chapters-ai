"use client";

import { Filter } from "lucide-react";
import Link from "next/link";
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
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [courseFilter, setCourseFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [dueFilter, setDueFilter] = useState("all");
  const emptyLabel = tab === "All" ? "assignments" : `${tab.toLowerCase()} assignments`;
  const courseOptions = useMemo(() => [...new Set(assignments.map((assignment) => assignment.course))], [assignments]);
  const visibleAssignments = useMemo(() => {
    return assignments.filter((assignment) => {
      if (tab !== "All" && assignment.status !== tab.toLowerCase()) {
        return false;
      }

      if (courseFilter !== "all" && assignment.course !== courseFilter) {
        return false;
      }

      if (priorityFilter !== "all" && assignment.priority !== priorityFilter) {
        return false;
      }

      if (sourceFilter !== "all" && (assignment.source ?? "manual") !== sourceFilter) {
        return false;
      }

      if (dueFilter !== "all" && (assignment.dueBucket ?? "none") !== dueFilter) {
        return false;
      }

      return true;
    });
  }, [assignments, courseFilter, dueFilter, priorityFilter, sourceFilter, tab]);

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
        <ControlButton active={filtersOpen} onClick={() => setFiltersOpen((open) => !open)}>
          <Filter className="size-3.5" />
          Filter
        </ControlButton>
      </div>

      {filtersOpen ? (
        <section className="grid gap-3 rounded-lg border border-zinc-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-4">
          <FilterSelect label="Course" onChange={setCourseFilter} options={courseOptions} value={courseFilter} />
          <FilterSelect
            label="Priority"
            onChange={setPriorityFilter}
            options={["High", "Medium", "Low"]}
            value={priorityFilter}
          />
          <FilterSelect label="Source" onChange={setSourceFilter} options={["canvas", "manual"]} value={sourceFilter} />
          <FilterSelect
            label="Due"
            onChange={setDueFilter}
            options={["overdue", "today", "week", "later", "none"]}
            value={dueFilter}
          />
        </section>
      ) : null}

      <section className="flex flex-col gap-3">
        {visibleAssignments.length ? (
          visibleAssignments.map((assignment) => (
            <Link
              className="grid min-h-[92px] grid-cols-[24px_minmax(0,1fr)] gap-4 rounded-lg border border-zinc-200 bg-white p-5 shadow-[0_10px_30px_rgba(24,24,27,0.035)] md:grid-cols-[24px_minmax(0,1fr)_128px_126px]"
              href={`/assignments/${assignment.id}`}
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
            </Link>
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

function FilterSelect({
  label,
  onChange,
  options,
  value
}: {
  label: string;
  onChange: (value: string) => void;
  options: string[];
  value: string;
}) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">{label}</span>
      <select
        className="h-10 rounded-lg border border-zinc-200 bg-white px-3 text-[13px] font-medium text-zinc-800 outline-none focus:border-violet-300 focus:ring-2 focus:ring-violet-100"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        <option value="all">All</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {formatOption(option)}
          </option>
        ))}
      </select>
    </label>
  );
}

function formatOption(value: string) {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
