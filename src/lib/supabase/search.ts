import type { SupabaseClient } from "@supabase/supabase-js";
import { assignments, courses, files } from "@/data/demo-data";
import type { Database } from "@/lib/supabase/database.types";
import type { SearchResult } from "@/types";

type SearchOptions = {
  courseId?: string | null;
  limit?: number;
};

type SearchWorkspaceTextRow = Database["public"]["Functions"]["search_workspace_text"]["Returns"][number];

function normalizeSourceType(value: string): SearchResult["sourceType"] {
  if (value === "assignment" || value === "file" || value === "module" || value === "note") {
    return value;
  }

  return "note";
}

export async function searchWorkspaceText(
  supabase: SupabaseClient<Database>,
  query: string,
  options: SearchOptions = {}
): Promise<SearchResult[]> {
  const normalizedQuery = query.trim();

  if (!normalizedQuery) {
    return [];
  }

  const { data, error } = await supabase.rpc("search_workspace_text", {
    search_query: normalizedQuery,
    match_count: options.limit ?? 10,
    filter_course_id: options.courseId ?? null
  });

  if (error || !data) {
    return [];
  }

  return data.map(mapSearchRow);
}

export function searchDemoWorkspaceText(query: string, options: SearchOptions = {}): SearchResult[] {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return [];
  }

  const courseNameById = new Map(courses.map((course) => [course.id, course.name]));
  const queryTerms = normalizedQuery.split(/\s+/).filter(Boolean);
  const candidateResults: Array<{ result: SearchResult; score: number }> = [
    ...assignments
      .filter((assignment) => !options.courseId || assignment.courseId === options.courseId)
      .map((assignment) => {
        const courseName = courseNameById.get(assignment.courseId) ?? "Course";
        const searchable = [assignment.title, assignment.summary, assignment.description, courseName]
          .join(" ")
          .toLowerCase();

        return {
          result: {
            assignmentId: assignment.id,
            citation: courseName,
            courseId: assignment.courseId,
            id: assignment.id,
            relevance: 1,
            sourceType: "assignment" as const,
            summary: assignment.summary,
            title: assignment.title
          },
          score: scoreSearchMatch(searchable, queryTerms),
        };
      }),
    ...files
      .filter((file) => !options.courseId || file.courseId === options.courseId)
      .map((file) => {
        const courseName = courseNameById.get(file.courseId) ?? "Course";
        const searchable = [file.title, file.summary, file.citation, courseName].join(" ").toLowerCase();

        return {
          result: {
            citation: file.citation,
            courseId: file.courseId,
            fileResourceId: file.id,
            id: file.id,
            relevance: 1,
            sourceType: "file" as const,
            summary: file.summary,
            title: file.title
          },
          score: scoreSearchMatch(searchable, queryTerms),
        };
      })
  ];

  return candidateResults
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.result.title.localeCompare(b.result.title))
    .slice(0, options.limit ?? 10)
    .map((item) => item.result);
}

function mapSearchRow(row: SearchWorkspaceTextRow): SearchResult {
  return {
    id: row.id,
    assignmentId: row.assignment_id ?? undefined,
    courseId: row.course_id ?? undefined,
    fileResourceId: row.file_resource_id ?? undefined,
    sourceType: normalizeSourceType(row.source_type),
    title: row.title,
    summary: row.summary || row.content.slice(0, 180),
    citation: row.citation,
    relevance: row.relevance
  };
}

function scoreSearchMatch(searchable: string, queryTerms: string[]) {
  return queryTerms.reduce((score, term) => {
    if (searchable.includes(term)) {
      return score + (searchable.startsWith(term) ? 3 : 1);
    }

    return score;
  }, 0);
}
