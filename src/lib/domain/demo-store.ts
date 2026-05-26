import { assignments, courses, files, manualEvents, studyBlocks } from "@/data/demo-data";
import type { WorkspaceSnapshot } from "@/lib/supabase/workspace";

export function getCourseById(courseId: string) {
  return courses.find((course) => course.id === courseId);
}

export function getAssignmentById(assignmentId: string) {
  return assignments.find((assignment) => assignment.id === assignmentId);
}

export function getAssignmentsForCourse(courseId: string) {
  return assignments.filter((assignment) => assignment.courseId === courseId);
}

export function getFilesForCourse(courseId: string) {
  return files.filter((file) => file.courseId === courseId);
}

export function getFilesForAssignment(assignmentId: string) {
  const assignment = getAssignmentById(assignmentId);

  if (!assignment) {
    return [];
  }

  return files.filter((file) => assignment.relatedFileIds.includes(file.id));
}

export function getRelatedAssignments(assignmentId: string) {
  const assignment = getAssignmentById(assignmentId);

  if (!assignment) {
    return [];
  }

  return assignments.filter((item) => assignment.relatedAssignmentIds.includes(item.id));
}

export function getStudyBlocksForAssignment(assignmentId: string) {
  return studyBlocks.filter((block) => block.assignmentId === assignmentId);
}

export function getDemoWorkspaceSnapshot(): WorkspaceSnapshot {
  return {
    assignments,
    canvasConnections: [
      {
        id: "demo-canvas",
        domain: "demo.instructure.com",
        lastSyncedAt: "2026-05-21T17:00:00-07:00",
        scopes: ["personal_access_token"],
        status: "connected"
      }
    ],
    courses,
    files,
    manualEvents,
    profile: {
      fullName: "Alex Chen",
      id: "demo-user",
      schoolName: "Demo High School",
      studentLevel: "high_school",
      timezone: "America/Los_Angeles"
    },
    studentContext: {
      aiNotes: "Demo learner who prefers structured next steps and short explanations.",
      constraints: "Needs help prioritizing assignments around a busy school schedule.",
      goals: "Stay on top of Canvas assignments and prepare focused study sessions.",
      learningPreferences: {
        format: "step-by-step"
      }
    },
    studyBlocks
  };
}
