"use client";

import { ChevronLeft, ChevronRight, Filter } from "lucide-react";
import { useState } from "react";
import { allDayEvents, calendarEvents, weekDays } from "./data";
import { ControlButton, eventToneClasses, LockedPage, LockedPageTitle, SegmentedControl, SoftPanel } from "./primitives";

const viewOptions = ["Month", "Week", "Day"] as const;
const hours = ["8 AM", "9 AM", "10 AM", "11 AM", "12 PM", "1 PM", "2 PM", "3 PM", "4 PM", "5 PM"] as const;
const dayWidth = 100 / weekDays.length;
const startHour = 8;
const visibleHours = 9;

export function LockedCalendarPage() {
  const [view, setView] = useState<(typeof viewOptions)[number]>("Week");

  return (
    <LockedPage className="max-w-[1160px]">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <LockedPageTitle title="Calendar" />
        <div className="flex flex-wrap items-center gap-3">
          <ControlButton>Today</ControlButton>
          <div className="flex items-center gap-1">
            <button
              aria-label="Previous week"
              className="flex size-8 items-center justify-center rounded-lg text-zinc-600 hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
              type="button"
            >
              <ChevronLeft className="size-4" />
            </button>
            <button
              aria-label="Next week"
              className="flex size-8 items-center justify-center rounded-lg text-zinc-600 hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
              type="button"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
          <button
            className="flex h-9 items-center rounded-lg px-2 text-[13px] font-semibold text-zinc-950 hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
            type="button"
          >
            May 2025
            <ChevronRight className="ml-1 size-3 rotate-90 text-zinc-500" />
          </button>
          <div className="ml-auto flex items-center gap-3">
            <SegmentedControl onChange={setView} options={viewOptions} value={view} />
            <ControlButton>
              <Filter className="size-3.5" />
              Filter
            </ControlButton>
          </div>
        </div>
      </div>

      <SoftPanel className="border-0 shadow-none">
        <div className="overflow-x-auto">
          <div className="min-w-[900px]">
            <div className="grid grid-cols-[60px_1fr] border-b border-zinc-100">
              <div />
              <div className="grid grid-cols-7">
                {weekDays.map((day) => (
                  <div
                    className="flex h-10 items-center justify-center gap-1 text-[11px] font-semibold text-zinc-600"
                    key={day.label}
                  >
                    <span className={day.active ? "text-violet-700" : undefined}>{day.label}</span>
                    {day.active ? (
                      <span className="flex size-4 items-center justify-center rounded-full bg-violet-600 text-[9px] text-white">3</span>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-[60px_1fr] border-b border-zinc-100">
              <div className="flex h-9 items-center justify-end pr-3 text-[11px] text-zinc-500">All-day</div>
              <div className="relative grid h-9 grid-cols-7">
                {weekDays.map((day) => (
                  <div className="border-l border-zinc-100 first:border-l-0" key={day.label} />
                ))}
                {allDayEvents.map((event) => (
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
                  {weekDays.map((day) => (
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
                {calendarEvents.map((event) => (
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
