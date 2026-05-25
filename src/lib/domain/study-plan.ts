import type { Assignment, ManualEvent, StudyBlock } from "@/types";
import { getPriorityRank } from "@/lib/domain/prioritization";

type BuildStudyBlocksInput = {
  assignments: Assignment[];
  manualEvents: ManualEvent[];
  now?: Date;
};

export function buildStudyBlocks({ assignments, manualEvents, now = new Date() }: BuildStudyBlocksInput): StudyBlock[] {
  const prioritized = getPriorityRank(assignments)
    .filter((assignment) => assignment.status !== "submitted" && assignment.status !== "graded")
    .slice(0, 4);

  let cursor = nextStudyHour(now);
  const protectedEvents = manualEvents
    .map((event) => ({
      start: new Date(event.startTime),
      end: new Date(event.endTime)
    }))
    .filter((event) => Number.isFinite(event.start.getTime()) && Number.isFinite(event.end.getTime()))
    .sort((a, b) => a.start.getTime() - b.start.getTime());

  return prioritized.map((assignment, index) => {
    const durationMinutes = Math.min(Math.max(assignment.estimatedEffortMinutes, 30), 120);
    const start = findOpenStart(cursor, durationMinutes, protectedEvents);
    const end = new Date(start.getTime() + durationMinutes * 60_000);

    cursor = new Date(end.getTime() + 30 * 60_000);

    return {
      id: `planned-${assignment.id}-${index}`,
      assignmentId: assignment.id,
      title: buildBlockTitle(assignment),
      startTime: start.toISOString(),
      endTime: end.toISOString(),
      lockedByUser: false,
      source: "ai"
    };
  });
}

function findOpenStart(
  cursor: Date,
  durationMinutes: number,
  protectedEvents: Array<{ end: Date; start: Date }>
) {
  let start = new Date(cursor);
  let end = new Date(start.getTime() + durationMinutes * 60_000);

  for (const event of protectedEvents) {
    if (start < event.end && end > event.start) {
      start = new Date(event.end.getTime() + 30 * 60_000);
      end = new Date(start.getTime() + durationMinutes * 60_000);
    }
  }

  return start;
}

function nextStudyHour(now: Date) {
  const next = new Date(now);
  next.setMinutes(0, 0, 0);

  if (next.getHours() < 15) {
    next.setHours(15);
    return next;
  }

  next.setHours(next.getHours() + 1);
  return next;
}

function buildBlockTitle(assignment: Assignment) {
  if (assignment.status === "missing") {
    return `Recover missing work: ${assignment.title}`;
  }

  return `Work on ${assignment.title}`;
}
