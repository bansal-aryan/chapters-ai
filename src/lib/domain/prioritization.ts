import type { Assignment } from "@/types";

export function getPriorityRank(assignments: Assignment[]): Assignment[] {
  return [...assignments].sort((a, b) => {
    if (a.status === "missing" || b.status === "missing") {
      return Number(b.status === "missing") - Number(a.status === "missing");
    }

    if (a.priorityOverride !== undefined || b.priorityOverride !== undefined) {
      return (a.priorityOverride ?? Number.MAX_SAFE_INTEGER) - (b.priorityOverride ?? Number.MAX_SAFE_INTEGER);
    }

    const aDue = new Date(a.dueDate).getTime();
    const bDue = new Date(b.dueDate).getTime();

    if (aDue !== bDue) {
      return aDue - bDue;
    }

    return b.estimatedEffortMinutes - a.estimatedEffortMinutes;
  });
}

export function formatEffort(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}m`;
  }

  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;

  return remainder ? `${hours}h ${remainder}m` : `${hours}h`;
}

export function getPriorityReason(assignment: Assignment): string {
  if (assignment.status === "missing") {
    return "Pinned because Canvas marks it missing.";
  }

  if (assignment.priorityOverride !== undefined) {
    return "Pinned by student override.";
  }

  return "Ranked by due date, then estimated effort.";
}
