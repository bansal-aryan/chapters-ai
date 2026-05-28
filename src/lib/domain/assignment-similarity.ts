import type { Assignment } from "@/types";

export type AssignmentSimilarityScore = {
  relatedAssignmentId: string;
  relatedAssignmentTitle: string;
  score: number;
};

const stopWords = new Set([
  "about",
  "after",
  "again",
  "also",
  "and",
  "are",
  "because",
  "but",
  "can",
  "chapter",
  "class",
  "complete",
  "due",
  "for",
  "from",
  "have",
  "into",
  "make",
  "not",
  "notes",
  "our",
  "pdf",
  "read",
  "review",
  "set",
  "should",
  "study",
  "submit",
  "that",
  "the",
  "this",
  "use",
  "was",
  "with",
  "work",
  "your"
]);

export function getAssignmentSimilarityScores(assignments: Assignment[]) {
  const completedAssignments = assignments.filter(isCompletedAssignment).map((assignment) => ({
    assignment,
    vector: vectorizeAssignment(assignment)
  }));
  const scores = new Map<string, AssignmentSimilarityScore>();

  if (!completedAssignments.length) {
    return scores;
  }

  assignments.forEach((assignment) => {
    if (isCompletedAssignment(assignment)) {
      return;
    }

    const vector = vectorizeAssignment(assignment);
    let bestScore = 0;
    let bestAssignment: Assignment | null = null;

    for (const candidate of completedAssignments) {
      const lexicalScore = cosineSimilarity(vector, candidate.vector);
      const courseBoost = candidate.assignment.courseId === assignment.courseId ? 0.08 : 0;
      const score = Math.min(1, lexicalScore + courseBoost);

      if (score > bestScore) {
        bestScore = score;
        bestAssignment = candidate.assignment;
      }
    }

    if (bestAssignment && bestScore >= 0.08) {
      scores.set(assignment.id, {
        relatedAssignmentId: bestAssignment.id,
        relatedAssignmentTitle: bestAssignment.title,
        score: Math.round(bestScore * 100)
      });
    }
  });

  return scores;
}

function vectorizeAssignment(assignment: Assignment) {
  const vector = new Map<string, number>();

  addText(vector, assignment.title, 3);
  addText(vector, assignment.summary, 2);
  addText(vector, assignment.description, 1);

  return vector;
}

function addText(vector: Map<string, number>, text: string, weight: number) {
  tokenize(text).forEach((token) => {
    vector.set(token, (vector.get(token) ?? 0) + weight);
  });
}

function tokenize(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 2 && !stopWords.has(token));
}

function cosineSimilarity(first: Map<string, number>, second: Map<string, number>) {
  if (!first.size || !second.size) {
    return 0;
  }

  let dot = 0;
  let firstMagnitude = 0;
  let secondMagnitude = 0;

  first.forEach((value, token) => {
    dot += value * (second.get(token) ?? 0);
    firstMagnitude += value * value;
  });

  second.forEach((value) => {
    secondMagnitude += value * value;
  });

  if (!firstMagnitude || !secondMagnitude) {
    return 0;
  }

  return dot / (Math.sqrt(firstMagnitude) * Math.sqrt(secondMagnitude));
}

function isCompletedAssignment(assignment: Assignment) {
  return assignment.status === "submitted" || assignment.status === "graded";
}
