import type { Assignment, ManualEvent, StudyBlock } from "@/types";
import { getPriorityRank } from "@/lib/domain/prioritization";

type BuildStudyBlocksInput = {
  assignments: Assignment[];
  manualEvents: ManualEvent[];
  now?: Date;
  studyBlocks?: StudyBlock[];
  timezone?: string;
};

type CatchUpStudyWindow = {
  dayEnd: Date;
  dayStart: Date;
  end: Date;
  isSchoolDay: boolean;
  maxFocusMinutes: number;
  start: Date;
  timezone: string;
};

type ProtectedEvent = {
  end: Date;
  start: Date;
};

const defaultTimezone = "America/Los_Angeles";
const breakMinutes = 12;
const minimumUsefulBlockMinutes = 25;

export function buildStudyBlocks({
  assignments,
  manualEvents,
  now = new Date(),
  studyBlocks = [],
  timezone = defaultTimezone
}: BuildStudyBlocksInput): StudyBlock[] {
  const window = getCatchUpStudyWindow(now, timezone);
  const protectedEvents = buildProtectedEvents({ manualEvents, studyBlocks, window });
  const alreadyScheduledAssignmentIds = new Set(
    studyBlocks
      .filter((block) => block.lockedByUser || block.source !== "ai")
      .filter((block) => overlapsWindow(parseDate(block.startTime), parseDate(block.endTime), window))
      .map((block) => block.assignmentId)
  );
  const prioritized = getPriorityRank(assignments)
    .filter((assignment) => isOpenAssignment(assignment))
    .filter((assignment) => !alreadyScheduledAssignmentIds.has(assignment.id))
    .filter((assignment, index) => isCatchUpCandidate(assignment, now) || index < 5);

  const plannedBlocks: StudyBlock[] = [];
  let cursor = new Date(window.start);
  let plannedMinutes = 0;

  for (const assignment of prioritized) {
    const remainingMinutes = window.maxFocusMinutes - plannedMinutes;

    if (remainingMinutes < minimumUsefulBlockMinutes) {
      break;
    }

    const durationMinutes = Math.min(getRealisticDuration(assignment, now), remainingMinutes);
    const roundedDuration = roundToFive(Math.max(minimumUsefulBlockMinutes, durationMinutes));
    const start = findOpenStart(cursor, roundedDuration, protectedEvents, window);

    if (!start) {
      continue;
    }

    const end = new Date(start.getTime() + roundedDuration * 60_000);

    plannedBlocks.push({
      id: `planned-${assignment.id}-${plannedBlocks.length}`,
      assignmentId: assignment.id,
      title: buildBlockTitle(assignment, roundedDuration),
      startTime: start.toISOString(),
      endTime: end.toISOString(),
      lockedByUser: false,
      source: "ai"
    });

    protectedEvents.push({ start, end });
    protectedEvents.sort((first, second) => first.start.getTime() - second.start.getTime());
    plannedMinutes += roundedDuration;
    cursor = new Date(end.getTime() + breakMinutes * 60_000);

    if (plannedBlocks.length >= (window.isSchoolDay ? 3 : 4)) {
      break;
    }
  }

  return plannedBlocks;
}

export function getCatchUpStudyWindow(now = new Date(), timezone = defaultTimezone): CatchUpStudyWindow {
  const safeTimezone = timezone || defaultTimezone;
  const currentLocalDay = getZonedParts(now, safeTimezone);
  const localNow = getPlanLocalDay(currentLocalDay, now, safeTimezone);
  const weekdayIndex = getWeekdayIndex(localNow.year, localNow.month, localNow.day);
  const isSchoolDay = weekdayIndex >= 1 && weekdayIndex <= 5;
  const earliestStart = isSchoolDay
    ? zonedDateTimeToDate({ ...localNow, hour: 16, minute: 15 }, safeTimezone)
    : zonedDateTimeToDate({ ...localNow, hour: 10, minute: 0 }, safeTimezone);
  const end = isSchoolDay
    ? zonedDateTimeToDate({ ...localNow, hour: 21, minute: 30 }, safeTimezone)
    : zonedDateTimeToDate({ ...localNow, hour: 20, minute: 30 }, safeTimezone);
  const dayStart = zonedDateTimeToDate({ ...localNow, hour: 0, minute: 0 }, safeTimezone);
  const dayEnd = zonedDateTimeToDate(getNextLocalDay(localNow), safeTimezone);
  const roundedNow = roundUpToQuarter(new Date(now.getTime() + 10 * 60_000));
  let start = roundedNow > earliestStart ? roundedNow : earliestStart;

  if (start.getTime() + minimumUsefulBlockMinutes * 60_000 > end.getTime()) {
    start = earliestStart;
  }

  return {
    dayEnd,
    dayStart,
    end,
    isSchoolDay,
    maxFocusMinutes: isSchoolDay ? 180 : 240,
    start,
    timezone: safeTimezone
  };
}

function getPlanLocalDay(currentLocalDay: ZonedParts, now: Date, timezone: string) {
  const weekdayIndex = getWeekdayIndex(currentLocalDay.year, currentLocalDay.month, currentLocalDay.day);
  const isSchoolDay = weekdayIndex >= 1 && weekdayIndex <= 5;
  const end = isSchoolDay
    ? zonedDateTimeToDate({ ...currentLocalDay, hour: 21, minute: 30 }, timezone)
    : zonedDateTimeToDate({ ...currentLocalDay, hour: 20, minute: 30 }, timezone);
  const roundedNow = roundUpToQuarter(new Date(now.getTime() + 10 * 60_000));

  return roundedNow.getTime() + minimumUsefulBlockMinutes * 60_000 > end.getTime()
    ? getNextLocalDay(currentLocalDay)
    : currentLocalDay;
}

function buildProtectedEvents({
  manualEvents,
  studyBlocks,
  window
}: {
  manualEvents: ManualEvent[];
  studyBlocks: StudyBlock[];
  window: CatchUpStudyWindow;
}) {
  const dinner = buildDinnerBreak(window);
  const manual = manualEvents.map((event) => ({
    start: parseDate(event.startTime),
    end: parseDate(event.endTime)
  }));
  const existingStudy = studyBlocks
    .filter((block) => block.lockedByUser || block.source !== "ai")
    .map((block) => ({
      start: parseDate(block.startTime),
      end: parseDate(block.endTime)
    }));

  return [...manual, ...existingStudy, dinner]
    .filter((event): event is ProtectedEvent => Boolean(event.start && event.end))
    .filter((event) => overlapsWindow(event.start, event.end, window))
    .sort((first, second) => first.start.getTime() - second.start.getTime());
}

function buildDinnerBreak(window: CatchUpStudyWindow) {
  const localStart = getZonedParts(window.start, window.timezone);
  const start = window.isSchoolDay
    ? zonedDateTimeToDate({ ...localStart, hour: 18, minute: 15 }, window.timezone)
    : zonedDateTimeToDate({ ...localStart, hour: 12, minute: 30 }, window.timezone);
  const duration = window.isSchoolDay ? 45 : 50;

  return {
    start,
    end: new Date(start.getTime() + duration * 60_000)
  };
}

function findOpenStart(
  cursor: Date,
  durationMinutes: number,
  protectedEvents: ProtectedEvent[],
  window: CatchUpStudyWindow
) {
  let start = cursor < window.start ? new Date(window.start) : new Date(cursor);

  while (start.getTime() + durationMinutes * 60_000 <= window.end.getTime()) {
    const end = new Date(start.getTime() + durationMinutes * 60_000);
    const conflict = protectedEvents.find((event) => start < event.end && end > event.start);

    if (!conflict) {
      return start;
    }

    start = new Date(conflict.end.getTime() + breakMinutes * 60_000);
  }

  return null;
}

function getRealisticDuration(assignment: Assignment, now: Date) {
  const effort = Math.max(assignment.estimatedEffortMinutes || 45, minimumUsefulBlockMinutes);
  const dueDate = parseDate(assignment.dueDate);
  const hoursUntilDue = dueDate ? (dueDate.getTime() - now.getTime()) / 3_600_000 : Number.POSITIVE_INFINITY;

  if (assignment.status === "missing" || hoursUntilDue < 0) {
    return clamp(effort, 45, 75);
  }

  if (hoursUntilDue <= 24) {
    return clamp(Math.round(effort * 0.75), 40, 75);
  }

  if (hoursUntilDue <= 72) {
    return clamp(Math.round(effort * 0.6), 35, 65);
  }

  return clamp(Math.round(effort * 0.45), minimumUsefulBlockMinutes, 55);
}

function isCatchUpCandidate(assignment: Assignment, now: Date) {
  if (assignment.status === "missing" || assignment.status === "in_progress") {
    return true;
  }

  const dueDate = parseDate(assignment.dueDate);

  if (!dueDate) {
    return false;
  }

  return dueDate.getTime() - now.getTime() <= 14 * 24 * 60 * 60 * 1000;
}

function isOpenAssignment(assignment: Assignment) {
  return assignment.status !== "submitted" && assignment.status !== "graded";
}

function buildBlockTitle(assignment: Assignment, durationMinutes: number) {
  const prefix = assignment.status === "missing" ? "Recover" : durationMinutes >= assignment.estimatedEffortMinutes ? "Finish" : "Catch up";
  return `${prefix}: ${assignment.title}`;
}

function overlapsWindow(start: Date | null, end: Date | null, window: CatchUpStudyWindow) {
  return Boolean(start && end && start < window.dayEnd && end > window.dayStart);
}

function parseDate(value: string | undefined) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function roundUpToQuarter(date: Date) {
  const rounded = new Date(date);
  const minutes = rounded.getMinutes();
  const nextMinutes = Math.ceil(minutes / 15) * 15;

  if (nextMinutes === 60) {
    rounded.setHours(rounded.getHours() + 1, 0, 0, 0);
  } else {
    rounded.setMinutes(nextMinutes, 0, 0);
  }

  return rounded;
}

function roundToFive(minutes: number) {
  return Math.max(minimumUsefulBlockMinutes, Math.round(minutes / 5) * 5);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function getNextLocalDay(parts: ZonedParts) {
  const next = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + 1));

  return {
    year: next.getUTCFullYear(),
    month: next.getUTCMonth() + 1,
    day: next.getUTCDate(),
    hour: 0,
    minute: 0
  };
}

type ZonedParts = {
  day: number;
  hour: number;
  minute: number;
  month: number;
  year: number;
};

function getZonedParts(date: Date, timezone: string): ZonedParts {
  const parts = new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
    minute: "2-digit",
    month: "2-digit",
    timeZone: timezone,
    year: "numeric"
  }).formatToParts(date);

  return {
    day: getPart(parts, "day"),
    hour: getPart(parts, "hour"),
    minute: getPart(parts, "minute"),
    month: getPart(parts, "month"),
    year: getPart(parts, "year")
  };
}

function getPart(parts: Intl.DateTimeFormatPart[], type: Intl.DateTimeFormatPartTypes) {
  return Number(parts.find((part) => part.type === type)?.value ?? 0);
}

function getWeekdayIndex(year: number, month: number, day: number) {
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

function zonedDateTimeToDate(parts: ZonedParts, timezone: string) {
  const desiredUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute);
  let candidate = new Date(desiredUtc);

  for (let index = 0; index < 3; index += 1) {
    const actualParts = getZonedParts(candidate, timezone);
    const actualUtc = Date.UTC(
      actualParts.year,
      actualParts.month - 1,
      actualParts.day,
      actualParts.hour,
      actualParts.minute
    );
    const diff = desiredUtc - actualUtc;

    if (!diff) {
      break;
    }

    candidate = new Date(candidate.getTime() + diff);
  }

  return candidate;
}
