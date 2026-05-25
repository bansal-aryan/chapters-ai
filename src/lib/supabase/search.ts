import type { SupabaseClient } from "@supabase/supabase-js";
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
