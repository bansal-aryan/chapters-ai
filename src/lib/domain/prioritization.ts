import type { Assignment } from "@/types";

export function getPriorityRank(assignments: Assignment[]): Assignment[] {
  return [...assignments].sort((a, b) => getPriorityScore(b) - getPriorityScore(a));
}

export function getPriorityScore(assignment: Assignment, now = new Date()): number {
  if (assignment.status === "submitted" || assignment.status === "graded") {
    return 0;
  }

  const dueAt = new Date(assignment.dueDate).getTime();
  const nowTime = now.getTime();
  const hoursUntilDue = Number.isFinite(dueAt) ? (dueAt - nowTime) / (1000 * 60 * 60) : Number.POSITIVE_INFINITY;
  let score = 10;

  if (assignment.status === "missing") {
    score += 90;
  } else if (hoursUntilDue < 0) {
    score += 75;
  } else if (hoursUntilDue <= 24) {
    score += 65;
  } else if (hoursUntilDue <= 72) {
    score += 48;
  } else if (hoursUntilDue <= 168) {
    score += 32;
  } else if (hoursUntilDue <= 336) {
    score += 16;
  }

  if (assignment.status === "not_started") {
    score += 14;
  }

  if (assignment.status === "in_progress") {
    score += 6;
  }

  score += Math.min(Math.max(assignment.estimatedEffortMinutes, 0) / 30, 18);

  if (assignment.priorityOverride !== undefined) {
    score += Math.max(0, 6 - assignment.priorityOverride) * 12;
  }

  return Math.round(score);
}

export type PriorityBand = "High" | "Medium" | "Low";

export function getPriorityBand(assignment: Assignment, now = new Date()): PriorityBand {
  const score = getPriorityScore(assignment, now);

  if (score >= 70) {
    return "High";
  }

  if (score >= 40) {
    return "Medium";
  }

  return "Low";
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

  const dueAt = new Date(assignment.dueDate).getTime();
  const hoursUntilDue = (dueAt - Date.now()) / (1000 * 60 * 60);

  if (Number.isFinite(hoursUntilDue) && hoursUntilDue < 0) {
    return "Overdue and not complete.";
  }

  if (Number.isFinite(hoursUntilDue) && hoursUntilDue <= 72) {
    return "Due soon with effort weighted in.";
  }

  if (assignment.priorityOverride !== undefined) {
    return "Pinned by student override.";
  }

  return "Ranked by due date, status, estimated effort, and overrides.";
}
