import { assignments, courses, files, studyBlocks } from "@/data/demo-data";

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
