"use client";

import { CalendarCheck2, CalendarPlus, ChevronLeft, ChevronRight, Filter, Loader2, Plus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, type FormEvent } from "react";
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

type CalendarEventResponse = {
  endsAt: string;
  id: string;
  startsAt: string;
  title: string;
};

type StudyPlanResponse = {
  blocks?: Array<{
    id: string;
  }>;
  error?: string;
  window?: {
    isSchoolDay: boolean;
  };
};

export function LockedCalendarPage({
  allDayEvents = defaultAllDayEvents,
  calendarWeekStart,
  calendarEvents = defaultCalendarEvents,
  monthLabel = "May 2025",
  weekDays = defaultWeekDays
}: LockedCalendarPageProps) {
  const router = useRouter();
  const [view, setView] = useState<(typeof viewOptions)[number]>("Week");
  const [weekOffset, setWeekOffset] = useState(0);
  const [addEventOpen, setAddEventOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [calendarFilters, setCalendarFilters] = useState<string[]>([...calendarFilterOptions]);
  const [eventForm, setEventForm] = useState(() => ({
    date: formatDateInput(new Date()),
    endTime: "16:00",
    startTime: "15:00",
    title: ""
  }));
  const [eventNotice, setEventNotice] = useState("");
  const [eventNoticeTone, setEventNoticeTone] = useState<"error" | "success">("success");
  const [savingEvent, setSavingEvent] = useState(false);
  const [planningDay, setPlanningDay] = useState(false);
  const [addedCalendarEvents, setAddedCalendarEvents] = useState<LockedCalendarEvent[]>([]);
  const calendarEventSource = useMemo(() => [...calendarEvents, ...addedCalendarEvents], [addedCalendarEvents, calendarEvents]);
  const baseWeekStart = useMemo(() => parseCalendarDate(calendarWeekStart) ?? startOfWeek(new Date()), [calendarWeekStart]);
  const displayedWeekStart = useMemo(() => addWeeks(baseWeekStart, weekOffset), [baseWeekStart, weekOffset]);
  const displayedWeekDays = useMemo(
    () => (calendarWeekStart ? buildWeekDays(displayedWeekStart) : weekDays),
    [calendarWeekStart, displayedWeekStart, weekDays]
  );
  const visibleAllDayEvents = useMemo(() => {
    const lanesByDay = new Map<number, number>();

    return allDayEvents
      .flatMap((event) => normalizeAllDayEventForWeek(event, displayedWeekStart, weekOffset))
      .filter((event) => shouldShowCalendarKind(event.kind, calendarFilters))
      .sort((first, second) => first.dayIndex - second.dayIndex || first.title.localeCompare(second.title))
      .map((event) => {
        const lane = lanesByDay.get(event.dayIndex) ?? 0;
        lanesByDay.set(event.dayIndex, lane + 1);
        return { ...event, lane };
      });
  }, [allDayEvents, calendarFilters, displayedWeekStart, weekOffset]);
  const visibleCalendarEvents = useMemo(
    () =>
      calendarEventSource
        .flatMap((event) => normalizeTimedEventForWeek(event, displayedWeekStart, weekOffset))
        .filter((event) => shouldShowCalendarKind(event.kind, calendarFilters))
        .sort((first, second) => first.dayIndex - second.dayIndex || first.startHour - second.startHour),
    [calendarEventSource, calendarFilters, displayedWeekStart, weekOffset]
  );
  const dayWidth = 100 / displayedWeekDays.length;
  const displayedMonth = calendarWeekStart ? monthFormatter.format(displayedWeekStart) : monthLabel;
  const allDayLaneCount = Math.max(1, ...visibleAllDayEvents.map((event) => event.lane + 1));
  const allDayHeight = Math.max(36, allDayLaneCount * 30 + 8);

  async function handleAddEvent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const startsAt = buildDateTime(eventForm.date, eventForm.startTime);
    const endsAt = buildDateTime(eventForm.date, eventForm.endTime);

    if (!eventForm.title.trim() || !startsAt || !endsAt) {
      setEventNoticeTone("error");
      setEventNotice("Add a title, start time, and end time.");
      return;
    }

    if (endsAt.getTime() <= startsAt.getTime()) {
      setEventNoticeTone("error");
      setEventNotice("End time must be after the start time.");
      return;
    }

    setSavingEvent(true);
    setEventNotice("");

    const response = await fetch("/api/calendar/events", {
      body: JSON.stringify({
        endsAt: endsAt.toISOString(),
        startsAt: startsAt.toISOString(),
        title: eventForm.title
      }),
      headers: {
        "Content-Type": "application/json"
      },
      method: "POST"
    });
    const result = (await response.json().catch(() => null)) as {
      error?: string;
      event?: CalendarEventResponse;
    } | null;
    setSavingEvent(false);

    if (!response.ok || !result?.event) {
      setEventNoticeTone("error");
      setEventNotice(result?.error ?? "Could not add that event.");
      return;
    }

    const savedEvent = result.event;

    setAddedCalendarEvents((current) => [
      ...current,
      buildManualCalendarEvent(savedEvent, displayedWeekStart)
    ]);
    setEventForm((current) => ({ ...current, title: "" }));
    setAddEventOpen(false);
    setEventNoticeTone("success");
    setEventNotice(`${savedEvent.title} was added to the calendar.`);
  }

  async function handlePlanDay() {
    setPlanningDay(true);
    setEventNotice("");

    const response = await fetch("/api/study-plan", {
      method: "POST"
    });
    const result = (await response.json().catch(() => null)) as StudyPlanResponse | null;
    setPlanningDay(false);

    if (!response.ok) {
      setEventNoticeTone("error");
      setEventNotice(result?.error ?? "Could not build a catch-up plan.");
      return;
    }

    const count = result?.blocks?.length ?? 0;
    setAddedCalendarEvents([]);
    setEventNoticeTone("success");
    setEventNotice(
      count
        ? `Planned ${count} realistic catch-up block${count === 1 ? "" : "s"} for ${result?.window?.isSchoolDay ? "after school" : "today"}.`
        : "No catch-up blocks needed right now."
    );
    router.refresh();
  }

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
            <ControlButton disabled={planningDay} onClick={handlePlanDay}>
              {planningDay ? <Loader2 className="size-3.5 animate-spin" /> : <CalendarCheck2 className="size-3.5" />}
              Plan day
            </ControlButton>
            <ControlButton active={addEventOpen} onClick={() => setAddEventOpen((open) => !open)}>
              <CalendarPlus className="size-3.5" />
              Add event
            </ControlButton>
            <SegmentedControl onChange={setView} options={viewOptions} value={view} />
            <ControlButton active={filterOpen} onClick={() => setFilterOpen((open) => !open)}>
              <Filter className="size-3.5" />
              Filter
            </ControlButton>
          </div>
        </div>
      </div>

      {addEventOpen ? (
        <form
          className="grid gap-3 rounded-lg border border-zinc-200 bg-white p-4 shadow-[0_10px_30px_rgba(24,24,27,0.035)] sm:grid-cols-[minmax(0,1fr)_160px_130px_130px_auto]"
          onSubmit={handleAddEvent}
        >
          <CalendarTextField
            label="Title"
            onChange={(value) => setEventForm((current) => ({ ...current, title: value }))}
            placeholder="Study group, club meeting, office hours"
            value={eventForm.title}
          />
          <CalendarTextField
            label="Date"
            onChange={(value) => setEventForm((current) => ({ ...current, date: value }))}
            type="date"
            value={eventForm.date}
          />
          <CalendarTextField
            label="Start"
            onChange={(value) => setEventForm((current) => ({ ...current, startTime: value }))}
            type="time"
            value={eventForm.startTime}
          />
          <CalendarTextField
            label="End"
            onChange={(value) => setEventForm((current) => ({ ...current, endTime: value }))}
            type="time"
            value={eventForm.endTime}
          />
          <div className="flex items-end gap-2">
            <ControlButton
              aria-label="Cancel event"
              onClick={() => {
                setAddEventOpen(false);
                setEventNotice("");
              }}
            >
              <X className="size-3.5" />
            </ControlButton>
            <ControlButton
              aria-label="Save event"
              className="border-violet-600 bg-violet-600 text-white hover:bg-violet-700"
              disabled={savingEvent}
              type="submit"
            >
              {savingEvent ? <Loader2 className="size-3.5 animate-spin" /> : <Plus className="size-3.5" />}
            </ControlButton>
          </div>
        </form>
      ) : null}

      {eventNotice ? (
        <div
          className={`rounded-lg border px-4 py-3 text-[12px] font-medium ${
            eventNoticeTone === "error"
              ? "border-red-100 bg-red-50 text-red-700"
              : "border-violet-100 bg-violet-50 text-violet-800"
          }`}
        >
          {eventNotice}
        </div>
      ) : null}

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
              <div
                className="flex items-center justify-end pr-3 text-[11px] text-zinc-500"
                style={{ height: `${allDayHeight}px` }}
              >
                All-day
              </div>
              <div className="relative grid grid-cols-7" style={{ height: `${allDayHeight}px` }}>
                {displayedWeekDays.map((day) => (
                  <div className="border-l border-zinc-100 first:border-l-0" key={day.label} />
                ))}
                {visibleAllDayEvents.map((event) => (
                  <div
                    className={`absolute flex h-7 items-center truncate rounded-md border px-2 text-[11px] font-medium ${eventToneClasses(event.tone)}`}
                    key={event.id}
                    style={{
                      left: `calc(${event.dayIndex * dayWidth}% + 8px)`,
                      top: `${4 + event.lane * 30}px`,
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

function CalendarTextField({
  label,
  onChange,
  placeholder,
  type = "text",
  value
}: {
  label: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  value: string;
}) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">{label}</span>
      <input
        className="h-10 rounded-lg border border-zinc-200 bg-white px-3 text-[13px] font-medium text-zinc-800 outline-none placeholder:text-zinc-400 focus:border-violet-300 focus:ring-2 focus:ring-violet-100"
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        required
        type={type}
        value={value}
      />
    </label>
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

function buildDateTime(date: string, time: string) {
  if (!date || !time) {
    return null;
  }

  const value = new Date(`${date}T${time}`);
  return Number.isNaN(value.getTime()) ? null : value;
}

function buildManualCalendarEvent(event: CalendarEventResponse, weekStart: Date): LockedCalendarEvent {
  const start = new Date(event.startsAt);
  const end = new Date(event.endsAt);

  return {
    dayIndex: getDayIndex(start, weekStart),
    endHour: clampCalendarEndHour(toDecimalHour(start), toDecimalHour(end)),
    endsAt: event.endsAt,
    id: `manual-${event.id}`,
    kind: "manual",
    startHour: clampCalendarHour(toDecimalHour(start)),
    startsAt: event.startsAt,
    time: formatTimeRange(start, end),
    title: event.title,
    tone: "neutral"
  };
}

function formatDateInput(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
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
