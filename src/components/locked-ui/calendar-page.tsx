"use client";

import { ChevronLeft, ChevronRight, Filter } from "lucide-react";
import { useMemo, useState } from "react";
import {
  allDayEvents as defaultAllDayEvents,
  calendarEvents as defaultCalendarEvents,
  weekDays as defaultWeekDays,
  type LockedAllDayEvent,
  type LockedCalendarEvent,
  type LockedWeekDay
} from "./data";
import { ControlButton, eventToneClasses, LockedPage, LockedPageTitle, SegmentedControl, SoftPanel } from "./primitives";

const viewOptions = ["Month", "Week", "Day"] as const;
const calendarFilterOptions = ["Assignments", "Study blocks", "Manual events", "Canvas events"] as const;
const hours = ["8 AM", "9 AM", "10 AM", "11 AM", "12 PM", "1 PM", "2 PM", "3 PM", "4 PM", "5 PM"] as const;
const startHour = 8;
const visibleHours = 9;
const dayMs = 24 * 60 * 60 * 1000;
const monthFormatter = new Intl.DateTimeFormat("en-US", {
  month: "long",
  year: "numeric"
});
const timeFormatter = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit"
});

type LockedCalendarPageProps = {
  allDayEvents?: readonly LockedAllDayEvent[];
  calendarWeekStart?: string;
  calendarEvents?: readonly LockedCalendarEvent[];
  monthLabel?: string;
  weekDays?: readonly LockedWeekDay[];
};

export function LockedCalendarPage({
  allDayEvents = defaultAllDayEvents,
  calendarWeekStart,
  calendarEvents = defaultCalendarEvents,
  monthLabel = "May 2025",
  weekDays = defaultWeekDays
}: LockedCalendarPageProps) {
  const [view, setView] = useState<(typeof viewOptions)[number]>("Week");
  const [weekOffset, setWeekOffset] = useState(0);
  const [filterOpen, setFilterOpen] = useState(false);
  const [calendarFilters, setCalendarFilters] = useState<string[]>([...calendarFilterOptions]);
  const baseWeekStart = useMemo(() => parseCalendarDate(calendarWeekStart) ?? startOfWeek(new Date()), [calendarWeekStart]);
  const displayedWeekStart = useMemo(() => addWeeks(baseWeekStart, weekOffset), [baseWeekStart, weekOffset]);
  const displayedWeekDays = useMemo(
    () => (calendarWeekStart ? buildWeekDays(displayedWeekStart) : weekDays),
    [calendarWeekStart, displayedWeekStart, weekDays]
  );
  const visibleAllDayEvents = useMemo(
    () =>
      allDayEvents
        .flatMap((event) => normalizeAllDayEventForWeek(event, displayedWeekStart, weekOffset))
        .filter((event) => shouldShowCalendarKind(event.kind, calendarFilters)),
    [allDayEvents, calendarFilters, displayedWeekStart, weekOffset]
  );
  const visibleCalendarEvents = useMemo(
    () =>
      calendarEvents
        .flatMap((event) => normalizeTimedEventForWeek(event, displayedWeekStart, weekOffset))
        .filter((event) => shouldShowCalendarKind(event.kind, calendarFilters)),
    [calendarEvents, calendarFilters, displayedWeekStart, weekOffset]
  );
  const dayWidth = 100 / displayedWeekDays.length;
  const displayedMonth = calendarWeekStart ? monthFormatter.format(displayedWeekStart) : monthLabel;

  return (
    <LockedPage className="max-w-[1160px]">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <LockedPageTitle title="Calendar" />
        <div className="flex flex-wrap items-center gap-3">
          <ControlButton onClick={() => setWeekOffset(0)}>Today</ControlButton>
          <div className="flex items-center gap-1">
            <button
              aria-label="Previous week"
              className="flex size-8 items-center justify-center rounded-lg text-zinc-600 hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
              onClick={() => setWeekOffset((offset) => offset - 1)}
              type="button"
            >
              <ChevronLeft className="size-4" />
            </button>
            <button
              aria-label="Next week"
              className="flex size-8 items-center justify-center rounded-lg text-zinc-600 hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
              onClick={() => setWeekOffset((offset) => offset + 1)}
              type="button"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
          <button
            className="flex h-9 items-center rounded-lg px-2 text-[13px] font-semibold text-zinc-950 hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
            type="button"
          >
            {displayedMonth}
            <ChevronRight className="ml-1 size-3 rotate-90 text-zinc-500" />
          </button>
          <div className="ml-auto flex items-center gap-3">
            <SegmentedControl onChange={setView} options={viewOptions} value={view} />
            <ControlButton active={filterOpen} onClick={() => setFilterOpen((open) => !open)}>
              <Filter className="size-3.5" />
              Filter
            </ControlButton>
          </div>
        </div>
      </div>

      {filterOpen ? (
        <div className="flex flex-wrap gap-2 rounded-lg border border-zinc-200 bg-white p-3">
          {calendarFilterOptions.map((item) => (
            <button
              aria-pressed={calendarFilters.includes(item)}
              className={`h-8 rounded-lg px-3 text-[12px] font-semibold ${
                calendarFilters.includes(item) ? "bg-violet-50 text-violet-700" : "bg-zinc-50 text-zinc-500"
              }`}
              key={item}
              onClick={() =>
                setCalendarFilters((current) =>
                  current.includes(item) ? current.filter((filter) => filter !== item) : [...current, item]
                )
              }
              type="button"
            >
              {item}
            </button>
          ))}
        </div>
      ) : null}

      <SoftPanel className="border-0 shadow-none">
        <div className="overflow-x-auto">
          <div className="min-w-[900px]">
            <div className="grid grid-cols-[60px_1fr] border-b border-zinc-100">
              <div />
              <div className="grid grid-cols-7">
                {displayedWeekDays.map((day) => (
                  <div
                    className="flex h-10 items-center justify-center gap-1 text-[11px] font-semibold text-zinc-600"
                    key={day.label}
                  >
                    <span className={day.active ? "text-violet-700" : undefined}>{day.label}</span>
                    {day.active ? (
                      <span className="flex size-4 items-center justify-center rounded-full bg-violet-600 text-[9px] text-white">
                        {day.badge ?? day.label.split(" ").at(-1)}
                      </span>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-[60px_1fr] border-b border-zinc-100">
              <div className="flex h-9 items-center justify-end pr-3 text-[11px] text-zinc-500">All-day</div>
              <div className="relative grid h-9 grid-cols-7">
                {displayedWeekDays.map((day) => (
                  <div className="border-l border-zinc-100 first:border-l-0" key={day.label} />
                ))}
                {visibleAllDayEvents.map((event) => (
                  <div
                    className={`absolute top-1 flex h-7 items-center truncate rounded-md border px-2 text-[11px] font-medium ${eventToneClasses(event.tone)}`}
                    key={event.id}
                    style={{
                      left: `calc(${event.dayIndex * dayWidth}% + 8px)`,
                      width: `calc(${dayWidth}% - 16px)`
                    }}
                  >
                    {event.title}
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-[60px_1fr]">
              <div className="relative h-[522px]">
                {hours.map((hour, index) => (
                  <div
                    className="absolute right-3 -translate-y-1/2 text-[11px] font-medium text-zinc-500"
                    key={hour}
                    style={{ top: `${(index / (hours.length - 1)) * 100}%` }}
                  >
                    {hour}
                  </div>
                ))}
              </div>

              <div className="relative h-[522px] overflow-hidden">
                <div className="absolute inset-0 grid grid-cols-7">
                  {displayedWeekDays.map((day) => (
                    <div className="border-l border-zinc-100 first:border-l-0" key={day.label} />
                  ))}
                </div>
                {hours.map((hour, index) => (
                  <div
                    className="absolute left-0 right-0 border-t border-zinc-100"
                    key={hour}
                    style={{ top: `${(index / (hours.length - 1)) * 100}%` }}
                  />
                ))}
                <div className="absolute left-0 right-0 z-10 border-t border-violet-400" style={{ top: `${((9 - startHour) / visibleHours) * 100}%` }}>
                  <span className="absolute -left-1.5 -top-1.5 size-3 rounded-full bg-violet-600" />
                </div>
                {visibleCalendarEvents.map((event) => (
                  <article
                    className={`absolute z-20 overflow-hidden rounded-md border px-2 py-2 text-[11px] shadow-sm ${eventToneClasses(event.tone)}`}
                    key={event.id}
                    style={{
                      left: `calc(${event.dayIndex * dayWidth}% + 8px)`,
                      top: `${((event.startHour - startHour) / visibleHours) * 100}%`,
                      height: `${((event.endHour - event.startHour) / visibleHours) * 100}%`,
                      width: `calc(${dayWidth}% - 16px)`
                    }}
                  >
                    <p className="truncate font-semibold">{event.title}</p>
                    <p className="mt-0.5 truncate text-[10px] text-zinc-500">{event.time}</p>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </div>
      </SoftPanel>
    </LockedPage>
  );
}

function parseCalendarDate(value: string | undefined) {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  date.setHours(0, 0, 0, 0);
  return date;
}

function addWeeks(date: Date, weekOffset: number) {
  const nextDate = new Date(date);
  nextDate.setDate(date.getDate() + weekOffset * 7);
  return nextDate;
}

function startOfWeek(date: Date) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const day = start.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  start.setDate(start.getDate() + diff);
  return start;
}

function buildWeekDays(weekStart: Date): LockedWeekDay[] {
  const today = new Date();

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + index);

    return {
      active: isSameDate(date, today),
      badge: String(date.getDate()),
      label: `${date.toLocaleDateString("en-US", { weekday: "short" })} ${date.getDate()}`
    };
  });
}

function normalizeAllDayEventForWeek(event: LockedAllDayEvent, weekStart: Date, weekOffset: number) {
  if (!event.startsAt) {
    return weekOffset === 0 ? [event] : [];
  }

  const start = parseCalendarDate(event.startsAt);
  const dayIndex = start ? getDayIndex(start, weekStart) : -1;

  if (!start || dayIndex < 0 || dayIndex > 6) {
    return [];
  }

  return [{ ...event, dayIndex }];
}

function normalizeTimedEventForWeek(event: LockedCalendarEvent, weekStart: Date, weekOffset: number) {
  if (!event.startsAt || !event.endsAt) {
    return weekOffset === 0 ? [event] : [];
  }

  const start = new Date(event.startsAt);
  const end = new Date(event.endsAt);
  const dayIndex = Number.isNaN(start.getTime()) ? -1 : getDayIndex(start, weekStart);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || dayIndex < 0 || dayIndex > 6) {
    return [];
  }

  return [
    {
      ...event,
      dayIndex,
      endHour: clampCalendarEndHour(toDecimalHour(start), toDecimalHour(end)),
      startHour: clampCalendarHour(toDecimalHour(start)),
      time: formatTimeRange(start, end)
    }
  ];
}

function shouldShowCalendarKind(kind: LockedCalendarEvent["kind"], filters: string[]) {
  const label = getFilterLabel(kind);
  return !label || filters.includes(label);
}

function getFilterLabel(kind: LockedCalendarEvent["kind"]) {
  if (kind === "assignment") {
    return "Assignments";
  }

  if (kind === "canvas") {
    return "Canvas events";
  }

  if (kind === "manual") {
    return "Manual events";
  }

  if (kind === "study") {
    return "Study blocks";
  }

  return null;
}

function getDayIndex(date: Date, weekStart: Date) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  return Math.floor((start.getTime() - weekStart.getTime()) / dayMs);
}

function isSameDate(first: Date, second: Date) {
  return (
    first.getFullYear() === second.getFullYear() &&
    first.getMonth() === second.getMonth() &&
    first.getDate() === second.getDate()
  );
}

function toDecimalHour(date: Date) {
  return date.getHours() + date.getMinutes() / 60;
}

function clampCalendarHour(hour: number) {
  return Math.min(Math.max(hour, startHour), startHour + visibleHours - 0.5);
}

function clampCalendarEndHour(start: number, end: number) {
  const clampedStart = clampCalendarHour(start);
  return Math.min(Math.max(end, clampedStart + 0.5), startHour + visibleHours);
}

function formatTimeRange(start: Date, end: Date) {
  return `${timeFormatter.format(start)} - ${timeFormatter.format(end)}`;
}
