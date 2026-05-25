import type { Assignment, Course, FileResource, ManualEvent, StudyBlock } from "@/types";

export type AnalyticsRiskLevel = "Low" | "Moderate" | "Elevated" | "Critical";

export type AnalyticsInput = {
  assignments: Assignment[];
  courses: Course[];
  files: FileResource[];
  manualEvents: ManualEvent[];
  studyBlocks: StudyBlock[];
};

export type AnalyticsAssignmentSignal = {
  assignment: Assignment;
  courseName: string;
  reason: string;
  score: number;
};

export type AnalyticsCourseHealth = {
  id: string;
  name: string;
  code: string;
  color: string;
  assignmentCount: number;
  completedCount: number;
  missingCount: number;
  dueSoonCount: number;
  effortMinutes: number;
  fileCount: number;
  completionRate: number;
  riskScore: number;
  riskLevel: AnalyticsRiskLevel;
};

export type AnalyticsWorkloadDay = {
  isoDate: string;
  label: string;
  minutes: number;
  assignmentCount: number;
  titles: string[];
};

export type AnalyticsMaterialCoverage = {
  courseId: string;
  courseName: string;
  fileCount: number;
  assignmentCount: number;
  coverageScore: number;
  label: "Strong" | "Developing" | "Limited";
};

export type AnalyticsRecommendation = {
  id: string;
  title: string;
  body: string;
  href: string;
  tone: "default" | "warning" | "success";
};

export type AnalyticsSnapshot = {
  generatedAt: string;
  totals: {
    assignments: number;
    openAssignments: number;
    completedAssignments: number;
    missingAssignments: number;
    dueSoonAssignments: number;
    overdueAssignments: number;
    effortMinutes: number;
    courses: number;
    files: number;
  };
  risk: {
    score: number;
    level: AnalyticsRiskLevel;
    summary: string;
  };
  topRiskAssignment?: AnalyticsAssignmentSignal;
  courseHealth: AnalyticsCourseHealth[];
  workload: AnalyticsWorkloadDay[];
  materialCoverage: AnalyticsMaterialCoverage[];
  focus: {
    scheduledMinutes: number;
    aiScheduledMinutes: number;
    lockedBlocks: number;
    protectedEvents: number;
    scheduleCoverage: number;
  };
  recommendations: AnalyticsRecommendation[];
  partial: {
    missingCourses: boolean;
    missingFiles: boolean;
    missingStudyBlocks: boolean;
  };
};

const DAY_MS = 24 * 60 * 60 * 1000;

export function buildAnalyticsSnapshot(input: AnalyticsInput, now = new Date()): AnalyticsSnapshot {
  const courses = normalizeCourses(input.courses, input.assignments);
  const courseById = new Map(courses.map((course) => [course.id, course]));
  const filesByCourse = groupBy(input.files, (file) => file.courseId);
  const assignmentsByCourse = groupBy(input.assignments, (assignment) => assignment.courseId);
  const openAssignments = input.assignments.filter((assignment) => !isCompleted(assignment));
  const completedAssignments = input.assignments.filter(isCompleted);
  const missingAssignments = input.assignments.filter((assignment) => assignment.status === "missing");
  const dueSoonAssignments = openAssignments.filter((assignment) => isDueSoon(assignment.dueDate, now));
  const overdueAssignments = openAssignments.filter((assignment) => isOverdue(assignment.dueDate, now));
  const effortMinutes = openAssignments.reduce((sum, assignment) => sum + assignment.estimatedEffortMinutes, 0);
  const topRiskAssignment = getTopRiskAssignment(openAssignments, courseById, now);
  const workload = buildWorkload(openAssignments, now);
  const courseHealth = courses
    .map((course) => {
      const courseAssignments = assignmentsByCourse.get(course.id) ?? [];
      const courseFiles = filesByCourse.get(course.id) ?? [];
      const completedCount = courseAssignments.filter(isCompleted).length;
      const missingCount = courseAssignments.filter((assignment) => assignment.status === "missing").length;
      const dueSoonCount = courseAssignments.filter((assignment) => !isCompleted(assignment) && isDueSoon(assignment.dueDate, now)).length;
      const effort = courseAssignments
        .filter((assignment) => !isCompleted(assignment))
        .reduce((sum, assignment) => sum + assignment.estimatedEffortMinutes, 0);
      const completionRate = courseAssignments.length ? Math.round((completedCount / courseAssignments.length) * 100) : 0;
      const riskScore = clamp(
        missingCount * 28 +
          dueSoonCount * 12 +
          Math.min(effort / 45, 12) * 4 +
          Math.max(0, courseAssignments.length - completedCount) * 2 -
          completedCount * 4
      );

      return {
        id: course.id,
        name: course.name,
        code: course.code,
        color: course.color,
        assignmentCount: courseAssignments.length,
        completedCount,
        missingCount,
        dueSoonCount,
        effortMinutes: effort,
        fileCount: courseFiles.length,
        completionRate,
        riskScore,
        riskLevel: getRiskLevel(riskScore)
      };
    })
    .sort((a, b) => b.riskScore - a.riskScore);

  const scheduledMinutes = input.studyBlocks.reduce((sum, block) => sum + getDurationMinutes(block.startTime, block.endTime), 0);
  const aiScheduledMinutes = input.studyBlocks
    .filter((block) => block.source === "ai")
    .reduce((sum, block) => sum + getDurationMinutes(block.startTime, block.endTime), 0);
  const riskScore = input.assignments.length
    ? clamp(
        missingAssignments.length * 18 +
          overdueAssignments.length * 14 +
          dueSoonAssignments.length * 8 +
          Math.min(effortMinutes / 60, 14) * 3 -
          completedAssignments.length * 4
      )
    : 0;

  const materialCoverage = courses.map((course) => {
    const courseFiles = filesByCourse.get(course.id) ?? [];
    const courseAssignments = assignmentsByCourse.get(course.id) ?? [];
    const linkedAssignments = courseAssignments.filter((assignment) => assignment.relatedFileIds.length > 0).length;
    const coverageScore = clamp(courseFiles.length * 22 + linkedAssignments * 12);
    const label: AnalyticsMaterialCoverage["label"] =
      coverageScore >= 70 ? "Strong" : coverageScore >= 35 ? "Developing" : "Limited";

    return {
      courseId: course.id,
      courseName: course.name,
      fileCount: courseFiles.length,
      assignmentCount: courseAssignments.length,
      coverageScore,
      label
    };
  });

  const snapshot: AnalyticsSnapshot = {
    generatedAt: now.toISOString(),
    totals: {
      assignments: input.assignments.length,
      openAssignments: openAssignments.length,
      completedAssignments: completedAssignments.length,
      missingAssignments: missingAssignments.length,
      dueSoonAssignments: dueSoonAssignments.length,
      overdueAssignments: overdueAssignments.length,
      effortMinutes,
      courses: courses.length,
      files: input.files.length
    },
    risk: {
      score: riskScore,
      level: getRiskLevel(riskScore),
      summary: getRiskSummary(riskScore, missingAssignments.length, dueSoonAssignments.length)
    },
    topRiskAssignment,
    courseHealth,
    workload,
    materialCoverage,
    focus: {
      scheduledMinutes,
      aiScheduledMinutes,
      lockedBlocks: input.studyBlocks.filter((block) => block.lockedByUser).length,
      protectedEvents: input.manualEvents.length,
      scheduleCoverage: effortMinutes ? Math.min(100, Math.round((scheduledMinutes / effortMinutes) * 100)) : 100
    },
    recommendations: [],
    partial: {
      missingCourses: input.courses.length === 0 && input.assignments.length > 0,
      missingFiles: input.files.length === 0,
      missingStudyBlocks: input.studyBlocks.length === 0
    }
  };

  snapshot.recommendations = buildRecommendations(snapshot, topRiskAssignment, workload);

  return snapshot;
}

function normalizeCourses(courses: Course[], assignments: Assignment[]): Course[] {
  if (courses.length) {
    return courses;
  }

  return [...new Set(assignments.map((assignment) => assignment.courseId))].map((courseId) => ({
    id: courseId,
    source: "manual",
    name: "Course",
    code: courseId,
    term: "",
    color: "#64748b"
  }));
}

function buildWorkload(assignments: Assignment[], now: Date): AnalyticsWorkloadDay[] {
  const today = startOfDay(now);

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today.getTime() + index * DAY_MS);
    const dueToday = assignments.filter((assignment) => isSameLocalDay(new Date(assignment.dueDate), date));
    const minutes = dueToday.reduce((sum, assignment) => sum + assignment.estimatedEffortMinutes, 0);

    return {
      isoDate: date.toISOString(),
      label: getDayLabel(date, index),
      minutes,
      assignmentCount: dueToday.length,
      titles: dueToday.map((assignment) => assignment.title)
    };
  });
}

function getTopRiskAssignment(
  assignments: Assignment[],
  courseById: Map<string, Pick<Course, "id" | "name">>,
  now: Date
): AnalyticsAssignmentSignal | undefined {
  const [top] = assignments
    .map((assignment) => {
      const score = getAssignmentRiskScore(assignment, now);
      const reason = getAssignmentRiskReason(assignment, now);

      return {
        assignment,
        courseName: courseById.get(assignment.courseId)?.name ?? "Course",
        reason,
        score
      };
    })
    .sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }

      return new Date(a.assignment.dueDate).getTime() - new Date(b.assignment.dueDate).getTime();
    });

  return top;
}

function buildRecommendations(
  snapshot: AnalyticsSnapshot,
  topRiskAssignment: AnalyticsAssignmentSignal | undefined,
  workload: AnalyticsWorkloadDay[]
): AnalyticsRecommendation[] {
  const recommendations: AnalyticsRecommendation[] = [];
  const peakDay = [...workload].sort((a, b) => b.minutes - a.minutes)[0];

  if (snapshot.totals.missingAssignments > 0 && topRiskAssignment) {
    recommendations.push({
      id: "recover-missing",
      title: "Recover the missing work first",
      body: `${topRiskAssignment.assignment.title} is the fastest way to reduce risk today.`,
      href: `/assignments/${topRiskAssignment.assignment.id}`,
      tone: "warning"
    });
  }

  if (topRiskAssignment && !recommendations.some((item) => item.href === `/assignments/${topRiskAssignment.assignment.id}`)) {
    recommendations.push({
      id: "start-highest-risk",
      title: "Start the highest-risk task",
      body: `${topRiskAssignment.assignment.title} carries the most time and deadline pressure.`,
      href: `/assignments/${topRiskAssignment.assignment.id}`,
      tone: "default"
    });
  }

  if (peakDay && peakDay.minutes >= 180) {
    recommendations.push({
      id: "smooth-workload",
      title: `Split the ${peakDay.label.toLowerCase()} workload`,
      body: `${peakDay.label} has ${peakDay.assignmentCount} task${peakDay.assignmentCount === 1 ? "" : "s"} and ${peakDay.minutes} minutes estimated.`,
      href: "/calendar",
      tone: "default"
    });
  }

  if (snapshot.partial.missingStudyBlocks) {
    recommendations.push({
      id: "schedule-study-blocks",
      title: "Create study blocks",
      body: "No study time is scheduled yet, so the plan confidence is limited.",
      href: "/calendar",
      tone: "default"
    });
  }

  if (snapshot.partial.missingFiles) {
    recommendations.push({
      id: "connect-materials",
      title: "Index course materials",
      body: "Add PDFs, docs, images, or Canvas files so AI can cite the right sources.",
      href: "/settings",
      tone: "default"
    });
  }

  if (!recommendations.length) {
    recommendations.push({
      id: "keep-plan",
      title: "Keep the plan steady",
      body: "Your workload is balanced. Use focus mode to protect momentum.",
      href: "/focus",
      tone: "success"
    });
  }

  return recommendations.slice(0, 3);
}

function getAssignmentRiskScore(assignment: Assignment, now: Date): number {
  return clamp(
    Number(assignment.status === "missing") * 40 +
      Number(isOverdue(assignment.dueDate, now)) * 24 +
      Number(isDueSoon(assignment.dueDate, now)) * 16 +
      Math.min(assignment.estimatedEffortMinutes / 15, 18) +
      Number(assignment.priorityOverride !== undefined) * 8
  );
}

function getAssignmentRiskReason(assignment: Assignment, now: Date): string {
  if (assignment.status === "missing") {
    return "Canvas marks this assignment missing.";
  }

  if (isOverdue(assignment.dueDate, now)) {
    return "Past due and still open.";
  }

  if (isDueSoon(assignment.dueDate, now)) {
    return "Due within the next week.";
  }

  return "Ranked by estimated effort and open status.";
}

function getRiskSummary(score: number, missingCount: number, dueSoonCount: number): string {
  if (score >= 75) {
    return "Critical workload risk. One recovery action should happen now.";
  }

  if (score >= 52) {
    return "Elevated risk. The week is manageable if the next task starts soon.";
  }

  if (score >= 28) {
    return `${dueSoonCount} open task${dueSoonCount === 1 ? "" : "s"} due soon. Keep the plan moving.`;
  }

  if (missingCount > 0) {
    return "Low workload pressure, but missing work still needs recovery.";
  }

  return "Low risk. Your current plan is stable.";
}

function getRiskLevel(score: number): AnalyticsRiskLevel {
  if (score >= 75) {
    return "Critical";
  }

  if (score >= 52) {
    return "Elevated";
  }

  if (score >= 28) {
    return "Moderate";
  }

  return "Low";
}

function isCompleted(assignment: Assignment): boolean {
  return assignment.status === "submitted" || assignment.status === "graded";
}

function isDueSoon(value: string, now: Date): boolean {
  const days = getDaysUntil(value, now);
  return days >= 0 && days <= 7;
}

function isOverdue(value: string, now: Date): boolean {
  return new Date(value).getTime() < now.getTime();
}

function getDaysUntil(value: string, now: Date): number {
  return Math.floor((startOfDay(new Date(value)).getTime() - startOfDay(now).getTime()) / DAY_MS);
}

function getDurationMinutes(start: string, end: string): number {
  return Math.max(0, Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000));
}

function getDayLabel(date: Date, index: number): string {
  if (index === 0) {
    return "Today";
  }

  if (index === 1) {
    return "Tomorrow";
  }

  return new Intl.DateTimeFormat("en", { weekday: "short" }).format(date);
}

function isSameLocalDay(a: Date, b: Date): boolean {
  return startOfDay(a).getTime() === startOfDay(b).getTime();
}

function startOfDay(date: Date): Date {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function groupBy<T>(items: T[], getKey: (item: T) => string): Map<string, T[]> {
  return items.reduce((map, item) => {
    const key = getKey(item);
    const existing = map.get(key) ?? [];
    existing.push(item);
    map.set(key, existing);
    return map;
  }, new Map<string, T[]>());
}

function clamp(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}
