import type {
  Assignment as WorkspaceAssignment,
  Course,
  FileResource,
  ManualEvent,
  StudyBlock
} from "@/types";
import type {
  AssignmentPriority,
  EventTone,
  LockedAllDayEvent,
  LockedAssignmentRow,
  LockedCalendarEvent,
  LockedDashboardCard,
  LockedFocusSession,
  LockedResourceCourseOption,
  LockedResourceFile,
  LockedResourceFolder,
  LockedWeekDay,
  ResourceFileType
} from "@/components/locked-ui/data";
import { getAssignmentSimilarityScores } from "@/lib/domain/assignment-similarity";
import { getPriorityBand, getPriorityScore } from "@/lib/domain/prioritization";
import { getAuthState } from "@/lib/supabase/auth-state";
import { getWorkspaceSnapshotFromSupabase, type WorkspaceSnapshot } from "@/lib/supabase/workspace";

const dayMs = 24 * 60 * 60 * 1000;
const weekMs = 7 * dayMs;
const visibleStartHour = 8;
const visibleEndHour = 17;

const dateTimeFormatter = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
  month: "short"
});

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  month: "short"
});

const monthFormatter = new Intl.DateTimeFormat("en-US", {
  month: "long",
  year: "numeric"
});

const timeFormatter = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit"
});

export type LockedDashboardFocus = {
  course: string;
  progress: number;
  summary: string;
};

export type LockedUiViewModel = {
  allDayEvents: LockedAllDayEvent[];
  assistantSuggestion: string;
  calendarWeekStart: string;
  calendarEvents: LockedCalendarEvent[];
  dashboardCards: LockedDashboardCard[];
  dashboardFocus: LockedDashboardFocus | null;
  firstName: string;
  focusBars: number[];
  focusSessions: LockedFocusSession[];
  monthLabel: string;
  resourceCourseOptions: LockedResourceCourseOption[];
  resourceFiles: LockedResourceFile[];
  resourceFolders: LockedResourceFolder[];
  totalFocusTime: string;
  assignmentRows: LockedAssignmentRow[];
  weekDays: LockedWeekDay[];
};

export async function getLockedUiViewForCurrentUser(): Promise<LockedUiViewModel | null> {
  const authState = await getAuthState();

  if (!authState.hasRealUser) {
    return null;
  }

  const snapshot = await getWorkspaceSnapshotFromSupabase({ allowEmpty: true });
  return createLockedUiViewModel(snapshot);
}

export function createLockedUiViewModel(
  snapshot: WorkspaceSnapshot | null,
  now = new Date()
): LockedUiViewModel {
  const courses = snapshot?.courses ?? [];
  const assignments = snapshot?.assignments ?? [];
  const files = snapshot?.files ?? [];
  const studyBlocks = snapshot?.studyBlocks ?? [];
  const manualEvents = snapshot?.manualEvents ?? [];
  const coursesById = new Map(courses.map((course) => [course.id, course]));
  const assignmentRows = buildAssignmentRows(assignments, coursesById, now);
  const weekStart = startOfWeek(now);
  const weekDays = buildWeekDays(weekStart, now);
  const allDayEvents = buildAllDayEvents(assignments, manualEvents, weekStart, now);
  const calendarEvents = buildCalendarEvents(studyBlocks, manualEvents, assignments, coursesById, weekStart);
  const focusSessions = buildFocusSessions(studyBlocks);
  const focusBars = buildFocusBars(studyBlocks, weekStart);
  const totalFocusMinutes = getTotalMinutes(studyBlocks);
  const dashboardFocus = buildDashboardFocus(assignmentRows);

  return {
    allDayEvents,
    assistantSuggestion: buildAssistantSuggestion(assignmentRows),
    calendarWeekStart: weekStart.toISOString(),
    calendarEvents,
    dashboardCards: buildDashboardCards({
      assignmentRows,
      canvasLastSyncedAt: getLatestCanvasSync(snapshot),
      canvasStatus: getCanvasStatus(snapshot),
      files,
      focusMinutes: totalFocusMinutes
    }),
    dashboardFocus,
    firstName: getFirstName(snapshot),
    focusBars,
    focusSessions,
    monthLabel: monthFormatter.format(weekStart),
    resourceCourseOptions: buildResourceCourseOptions(courses),
    resourceFiles: buildResourceFiles(files, coursesById),
    resourceFolders: buildResourceFolders(files, courses),
    totalFocusTime: formatDuration(totalFocusMinutes),
    assignmentRows,
    weekDays
  };
}

function buildAssignmentRows(
  assignments: WorkspaceAssignment[],
  coursesById: Map<string, Course>,
  now: Date
): LockedAssignmentRow[] {
  const similarityScores = getAssignmentSimilarityScores(assignments);

  return assignments
    .map((assignment) => {
      const course = coursesById.get(assignment.courseId);
      const dueDate = parseDate(assignment.dueDate);
      const priority = getPriorityBand(assignment, now);
      const priorityScore = getPriorityScore(assignment, now);
      const similarity = similarityScores.get(assignment.id);

      return {
        id: assignment.id,
        title: assignment.title,
        course: getCourseShortName(course),
        owner: getCourseOwner(course, assignment.source),
        priority,
        dueBucket: getDueBucket(dueDate, now),
        dueLabel: getDueLabel(assignment, dueDate, now),
        dueDate: dueDate ? dateTimeFormatter.format(dueDate) : "No due date",
        priorityScore,
        similarityScore: similarity?.score,
        similarAssignmentTitle: similarity?.relatedAssignmentTitle,
        source: assignment.source,
        status: isCompleted(assignment) ? ("completed" as const) : ("upcoming" as const),
        accent: getAccent(course)
      };
    })
    .sort((first, second) => {
      if (first.status !== second.status) {
        return first.status === "upcoming" ? -1 : 1;
      }

      return (second.priorityScore ?? 0) - (first.priorityScore ?? 0);
    });
}

function buildAllDayEvents(
  assignments: WorkspaceAssignment[],
  manualEvents: ManualEvent[],
  weekStart: Date,
  now: Date
): LockedAllDayEvent[] {
  const assignmentEvents = assignments
    .filter((assignment) => !isCompleted(assignment))
    .flatMap((assignment) => {
      const dueDate = parseDate(assignment.dueDate);

      if (!dueDate) {
        return [];
      }

      return [
        {
          id: `assignment-${assignment.id}`,
          dayIndex: getDayIndex(dueDate, weekStart),
          kind: "assignment" as const,
          startsAt: dueDate.toISOString(),
          title: `Due: ${assignment.title}`,
          tone: getToneForPriority(getPriorityBand(assignment, now))
        }
      ];
    });
  const canvasAllDayEvents = manualEvents.flatMap((event) => {
    const start = parseDate(event.startTime);

    if (!start || !isCanvasAllDayManualEvent(event)) {
      return [];
    }

    return [
      {
        id: `canvas-all-day-${event.id}`,
        dayIndex: getDayIndex(start, weekStart),
        kind: "canvas" as const,
        startsAt: start.toISOString(),
        title: event.title,
        tone: "blue" as EventTone
      }
    ];
  });

  return [...assignmentEvents, ...canvasAllDayEvents];
}

function buildCalendarEvents(
  studyBlocks: StudyBlock[],
  manualEvents: ManualEvent[],
  assignments: WorkspaceAssignment[],
  coursesById: Map<string, Course>,
  weekStart: Date
): LockedCalendarEvent[] {
  const assignmentsById = new Map(assignments.map((assignment) => [assignment.id, assignment]));

  const studyEvents = studyBlocks.flatMap((block) => {
    const start = parseDate(block.startTime);
    const end = parseDate(block.endTime);

    if (!start || !end) {
      return [];
    }

    const assignment = assignmentsById.get(block.assignmentId);
    const course = assignment ? coursesById.get(assignment.courseId) : undefined;

    return [
      {
        id: `study-${block.id}`,
        dayIndex: getDayIndex(start, weekStart),
        endsAt: end.toISOString(),
        kind: "study" as const,
        startsAt: start.toISOString(),
        title: block.title || assignment?.title || "Study session",
        time: formatTimeRange(start, end),
        startHour: clampCalendarHour(toDecimalHour(start)),
        endHour: clampCalendarEndHour(toDecimalHour(start), toDecimalHour(end)),
        tone: getToneForCourse(course)
      }
    ];
  });

  const manualCalendarEvents = manualEvents.flatMap((event) => {
    const start = parseDate(event.startTime);
    const end = parseDate(event.endTime);

    if (!start || !end || isCanvasAllDayManualEvent(event)) {
      return [];
    }

    return [
      {
        id: `manual-${event.id}`,
        dayIndex: getDayIndex(start, weekStart),
        endsAt: end.toISOString(),
        kind: isCanvasManualEvent(event) ? ("canvas" as const) : ("manual" as const),
        startsAt: start.toISOString(),
        title: event.title,
        time: formatTimeRange(start, end),
        startHour: clampCalendarHour(toDecimalHour(start)),
        endHour: clampCalendarEndHour(toDecimalHour(start), toDecimalHour(end)),
        tone: isCanvasManualEvent(event) ? ("blue" as EventTone) : ("neutral" as EventTone)
      }
    ];
  });

  return [...studyEvents, ...manualCalendarEvents].sort((first, second) => {
    if (first.dayIndex !== second.dayIndex) {
      return first.dayIndex - second.dayIndex;
    }

    return first.startHour - second.startHour;
  });
}

function buildDashboardCards({
  assignmentRows,
  canvasLastSyncedAt,
  canvasStatus,
  files,
  focusMinutes
}: {
  assignmentRows: LockedAssignmentRow[];
  canvasLastSyncedAt: string | null;
  canvasStatus: string;
  files: FileResource[];
  focusMinutes: number;
}): LockedDashboardCard[] {
  const upcomingRows = assignmentRows.filter((assignment) => assignment.status === "upcoming");
  const highPriority = upcomingRows.filter((assignment) => assignment.priority === "High").length;
  const folders = new Set(files.map((file) => file.courseId)).size;

  return [
    {
      label: "Due soon",
      value: String(upcomingRows.length),
      helper: highPriority ? `${highPriority} high priority` : "No high priority"
    },
    {
      label: "Focus time",
      value: formatDuration(focusMinutes),
      helper: "Planned blocks"
    },
    {
      label: "Resources",
      value: String(files.length),
      helper: folders === 1 ? "Across 1 folder" : `Across ${folders} folders`
    },
    {
      label: "Canvas sync",
      value: canvasStatus,
      helper: canvasLastSyncedAt ? `Synced ${dateFormatter.format(new Date(canvasLastSyncedAt))}` : "No sync yet"
    }
  ];
}

function buildDashboardFocus(assignmentRows: LockedAssignmentRow[]): LockedDashboardFocus | null {
  const nextAssignment = assignmentRows.find((assignment) => assignment.status === "upcoming");

  if (!nextAssignment) {
    return null;
  }

  return {
    course: nextAssignment.course,
    progress: nextAssignment.priority === "High" ? 72 : nextAssignment.priority === "Medium" ? 52 : 36,
    summary: nextAssignment.dueLabel
  };
}

function buildAssistantSuggestion(assignmentRows: LockedAssignmentRow[]) {
  const nextAssignment = assignmentRows.find((assignment) => assignment.status === "upcoming");

  if (!nextAssignment) {
    return "Your synced workspace is clear for now. Ask for a review plan, resource summary, or next-week study outline.";
  }

  return `Your next best move is to start ${nextAssignment.title}, then review supporting resources for ${nextAssignment.course}.`;
}

function buildResourceFolders(files: FileResource[], courses: Course[]): LockedResourceFolder[] {
  const fileCounts = files.reduce<Map<string, number>>((counts, file) => {
    counts.set(file.courseId, (counts.get(file.courseId) ?? 0) + 1);
    return counts;
  }, new Map());

  return courses
    .filter((course) => fileCounts.has(course.id))
    .map((course) => {
      const count = fileCounts.get(course.id) ?? 0;

      return {
        id: course.id,
        title: course.name,
        items: count === 1 ? "1 item" : `${count} items`
      };
    });
}

function buildResourceCourseOptions(courses: Course[]): LockedResourceCourseOption[] {
  return courses.map((course) => ({
    id: course.id,
    label: course.name || course.code || "Untitled course"
  }));
}

function buildResourceFiles(files: FileResource[], coursesById: Map<string, Course>): LockedResourceFile[] {
  return files.map((file) => {
    const course = coursesById.get(file.courseId);
    const fileType = getResourceType(file.type);

    return {
      courseId: file.courseId,
      href: file.url,
      id: file.id,
      title: file.title,
      type: fileType,
      meta: `${getResourceTypeLabel(fileType)} - ${file.source === "canvas" ? "Canvas" : "Manual"}`,
      source: file.source,
      date: getCourseShortName(course)
    };
  });
}

function buildFocusSessions(studyBlocks: StudyBlock[]): LockedFocusSession[] {
  return studyBlocks.flatMap((block) => {
    const start = parseDate(block.startTime);
    const end = parseDate(block.endTime);

    if (!start || !end) {
      return [];
    }

    return [
      {
        id: block.id,
        time: formatTimeRange(start, end),
        minutes: formatDuration(Math.max(0, Math.round((end.getTime() - start.getTime()) / 60000))),
        complete: end.getTime() < Date.now()
      }
    ];
  });
}

function buildFocusBars(studyBlocks: StudyBlock[], weekStart: Date): number[] {
  const minutesByDay = Array.from({ length: 7 }, () => 0);

  studyBlocks.forEach((block) => {
    const start = parseDate(block.startTime);
    const end = parseDate(block.endTime);
    const dayIndex = start ? getDayIndex(start, weekStart) : -1;

    if (!start || !end || dayIndex < 0 || dayIndex > 6) {
      return;
    }

    minutesByDay[dayIndex] += Math.max(0, Math.round((end.getTime() - start.getTime()) / 60000));
  });

  const maxMinutes = Math.max(...minutesByDay, 1);
  return minutesByDay.map((minutes) => Math.max(8, Math.round((minutes / maxMinutes) * 72)));
}

function buildWeekDays(weekStart: Date, now: Date): LockedWeekDay[] {
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + index);

    return {
      label: `${date.toLocaleDateString("en-US", { weekday: "short" })} ${date.getDate()}`,
      active: isSameDate(date, now),
      badge: String(date.getDate())
    };
  });
}

function startOfWeek(date: Date) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const day = start.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  start.setDate(start.getDate() + diff);
  return start;
}

function getDayIndex(date: Date, weekStart: Date) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  return Math.floor((start.getTime() - weekStart.getTime()) / dayMs);
}

function parseDate(value: string | undefined) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function getDueLabel(assignment: WorkspaceAssignment, dueDate: Date | null, now: Date) {
  if (assignment.status === "submitted") {
    return "Submitted";
  }

  if (assignment.status === "graded") {
    return "Graded";
  }

  if (assignment.status === "missing") {
    return "Missing";
  }

  if (!dueDate) {
    return "No due date";
  }

  const diffMs = dueDate.getTime() - now.getTime();

  if (diffMs < -60 * 60 * 1000) {
    return "Overdue";
  }

  if (isSameDate(dueDate, now)) {
    return "Due today";
  }

  const days = Math.ceil(diffMs / dayMs);

  if (days <= 1) {
    return "Due tomorrow";
  }

  if (days < 7) {
    return `Due in ${days} days`;
  }

  if (days < 14) {
    return "Due in 1 week";
  }

  if (days < 35) {
    return `Due in ${Math.round(days / 7)} weeks`;
  }

  return `Due ${dateFormatter.format(dueDate)}`;
}

function getDueBucket(dueDate: Date | null, now: Date): LockedAssignmentRow["dueBucket"] {
  if (!dueDate) {
    return "none";
  }

  const diffMs = dueDate.getTime() - now.getTime();

  if (diffMs < 0) {
    return "overdue";
  }

  if (isSameDate(dueDate, now)) {
    return "today";
  }

  if (diffMs <= weekMs) {
    return "week";
  }

  return "later";
}

function getToneForPriority(priority: AssignmentPriority): EventTone {
  if (priority === "Medium") {
    return "orange";
  }

  if (priority === "Low") {
    return "neutral";
  }

  return "purple";
}

function getToneForCourse(course: Course | undefined): EventTone {
  const accent = getAccent(course);

  if (accent === "orange") {
    return "orange";
  }

  if (accent === "blue") {
    return "blue";
  }

  if (accent === "slate") {
    return "neutral";
  }

  return "purple";
}

function isCompleted(assignment: WorkspaceAssignment) {
  return assignment.status === "submitted" || assignment.status === "graded";
}

function isCanvasManualEvent(event: ManualEvent) {
  return event.cadence?.startsWith("Canvas:") ?? false;
}

function isCanvasAllDayManualEvent(event: ManualEvent) {
  return isCanvasManualEvent(event) && (event.cadence?.endsWith(":all-day") ?? false);
}

function getCourseShortName(course: Course | undefined) {
  return course?.code || course?.name || "Canvas";
}

function getCourseOwner(course: Course | undefined, source: WorkspaceAssignment["source"]) {
  if (course?.term) {
    return course.term;
  }

  return source === "canvas" ? "Canvas" : "Manual";
}

function getAccent(course: Course | undefined) {
  const color = course?.color.toLowerCase();

  if (!color) {
    return "slate";
  }

  const rgb = parseHexColor(color);

  if (!rgb) {
    return "purple";
  }

  const [red, green, blue] = rgb;

  if (red > blue && red > green) {
    return "orange";
  }

  if (green > red && green > blue) {
    return "slate";
  }

  if (blue > red && blue > green && red < 80) {
    return "blue";
  }

  return "purple";
}

function parseHexColor(color: string): [number, number, number] | null {
  const match = /^#?([a-f0-9]{6})$/i.exec(color);

  if (!match) {
    return null;
  }

  const value = match[1];
  return [
    Number.parseInt(value.slice(0, 2), 16),
    Number.parseInt(value.slice(2, 4), 16),
    Number.parseInt(value.slice(4, 6), 16)
  ];
}

function getResourceType(type: FileResource["type"]): ResourceFileType {
  if (type === "doc") {
    return "docx";
  }

  return type;
}

function getResourceTypeLabel(type: ResourceFileType) {
  switch (type) {
    case "docx":
      return "DOC";
    case "image":
      return "IMAGE";
    case "link":
      return "LINK";
    case "pdf":
      return "PDF";
  }
}

function getFirstName(snapshot: WorkspaceSnapshot | null) {
  const rawName = snapshot?.profile?.fullName?.trim() || "Student";
  const firstToken = rawName.split(/\s+/)[0];
  return firstToken.includes("@") ? firstToken.split("@")[0] : firstToken;
}

function getCanvasStatus(snapshot: WorkspaceSnapshot | null) {
  const hasConnectedCanvas = snapshot?.canvasConnections.some((connection) => connection.status === "connected");

  if (hasConnectedCanvas) {
    return "Live";
  }

  return snapshot?.canvasConnections.length ? "Needs auth" : "Not set";
}

function getLatestCanvasSync(snapshot: WorkspaceSnapshot | null) {
  const times = snapshot?.canvasConnections
    .map((connection) => connection.lastSyncedAt)
    .filter((value): value is string => Boolean(value))
    .sort((first, second) => new Date(second).getTime() - new Date(first).getTime());

  return times?.[0] ?? null;
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
  return Math.min(Math.max(hour, visibleStartHour), visibleEndHour - 0.5);
}

function clampCalendarEndHour(startHour: number, endHour: number) {
  const clampedStart = clampCalendarHour(startHour);
  return Math.min(Math.max(endHour, clampedStart + 0.5), visibleEndHour);
}

function formatTimeRange(start: Date, end: Date) {
  return `${timeFormatter.format(start)} - ${timeFormatter.format(end)}`;
}

function formatDuration(minutes: number) {
  if (minutes < 60) {
    return `${minutes}m`;
  }

  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;

  return remainder ? `${hours}h ${remainder}m` : `${hours}h`;
}

function getTotalMinutes(studyBlocks: StudyBlock[]) {
  return studyBlocks.reduce((total, block) => {
    const start = parseDate(block.startTime);
    const end = parseDate(block.endTime);

    if (!start || !end) {
      return total;
    }

    return total + Math.max(0, Math.round((end.getTime() - start.getTime()) / 60000));
  }, 0);
}
