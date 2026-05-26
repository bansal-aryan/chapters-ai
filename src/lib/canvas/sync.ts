import type { SupabaseClient } from "@supabase/supabase-js";
import { CanvasApiClient, CanvasApiError } from "@/lib/canvas/api";
import {
  type AssignmentInsert,
  type CanvasAssignment,
  type CanvasCourse,
  type CanvasFile,
  type CanvasModule,
  type FileResourceInsert,
  createAssignmentSearchChunk,
  createResourceSearchChunk,
  getCanvasId,
  normalizeAssignmentInsert,
  normalizeCourseInsert,
  normalizeFileResourceInsert,
  normalizeModuleResourceInsert
} from "@/lib/canvas/normalizers";
import { decryptCanvasTokenPayload } from "@/lib/canvas/token-storage";
import type { Database, Json } from "@/lib/supabase/database.types";

type CanvasConnectionRow = Database["public"]["Tables"]["canvas_connections"]["Row"];
type CourseRow = Pick<Database["public"]["Tables"]["courses"]["Row"], "canvas_course_id" | "id">;
type AssignmentRow = Pick<Database["public"]["Tables"]["assignments"]["Row"], "canvas_assignment_id" | "id">;
type FileResourceRow = Pick<Database["public"]["Tables"]["file_resources"]["Row"], "canvas_file_id" | "id">;
type SyncRunRow = Pick<Database["public"]["Tables"]["sync_runs"]["Row"], "id" | "metadata" | "user_id">;

export type CanvasSyncResult =
  | {
      ok: true;
      counts: CanvasSyncCounts;
      syncRunId: string;
    }
  | {
      error: string;
      ok: false;
      status: number;
      syncRunId?: string;
    };

type CanvasSyncCounts = {
  assignments: number;
  courses: number;
  resources: number;
  searchChunks: number;
};

type SyncOptions = {
  connectionId?: string;
  domain?: string;
  syncRunId?: string;
  userId: string;
};

export async function syncCanvasForUser(
  supabase: SupabaseClient<Database>,
  options: SyncOptions
): Promise<CanvasSyncResult> {
  const connectionResult = await findCanvasConnection(supabase, options);

  if (!connectionResult.ok) {
    return connectionResult;
  }

  return syncCanvasConnection(supabase, {
    connection: connectionResult.connection,
    syncRunId: options.syncRunId,
    userId: options.userId
  });
}

export async function syncQueuedCanvasRuns(
  supabase: SupabaseClient<Database>,
  limit = 3
): Promise<CanvasSyncResult[]> {
  const { data, error } = await supabase
    .from("sync_runs")
    .select("id, metadata, user_id")
    .eq("provider", "canvas")
    .eq("status", "queued")
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error || !data?.length) {
    return [];
  }

  const results: CanvasSyncResult[] = [];

  for (const run of data) {
    results.push(await syncRun(supabase, run));
  }

  return results;
}

export async function syncDueCanvasConnections(
  supabase: SupabaseClient<Database>,
  {
    limit = 5,
    staleMinutes = 2
  }: {
    limit?: number;
    staleMinutes?: number;
  } = {}
): Promise<CanvasSyncResult[]> {
  const cutoff = Date.now() - staleMinutes * 60 * 1000;
  const { data, error } = await supabase
    .from("canvas_connections")
    .select("*")
    .eq("status", "connected")
    .not("token_reference", "is", null)
    .order("last_synced_at", { ascending: true, nullsFirst: true })
    .limit(Math.max(limit * 3, limit));

  if (error || !data?.length) {
    return [];
  }

  const dueConnections = data
    .filter((connection) => {
      if (!connection.last_synced_at) {
        return true;
      }

      const lastSyncedAt = new Date(connection.last_synced_at).getTime();
      return !Number.isFinite(lastSyncedAt) || lastSyncedAt <= cutoff;
    })
    .slice(0, limit);
  const results: CanvasSyncResult[] = [];

  for (const connection of dueConnections) {
    results.push(await syncCanvasConnection(supabase, {
      connection,
      userId: connection.user_id
    }));
  }

  return results;
}

async function syncRun(supabase: SupabaseClient<Database>, run: SyncRunRow) {
  const metadata = isRecord(run.metadata) ? run.metadata : {};

  return syncCanvasForUser(supabase, {
    connectionId: typeof metadata.canvas_connection_id === "string" ? metadata.canvas_connection_id : undefined,
    domain: typeof metadata.canvas_domain === "string" ? metadata.canvas_domain : undefined,
    syncRunId: run.id,
    userId: run.user_id
  });
}

async function syncCanvasConnection(
  supabase: SupabaseClient<Database>,
  {
    connection,
    syncRunId,
    userId
  }: {
    connection: CanvasConnectionRow;
    syncRunId?: string;
    userId: string;
  }
): Promise<CanvasSyncResult> {
  const startedAt = new Date().toISOString();
  const run = await startSyncRun(supabase, { connection, startedAt, syncRunId, userId });

  if (!run.ok) {
    return run;
  }

  if (!connection.token_reference) {
    return failSync(supabase, {
      connection,
      error: "Canvas connection does not have a token reference.",
      status: 400,
      syncRunId: run.syncRunId
    });
  }

  try {
    const token = decryptCanvasTokenPayload(connection.token_reference);
    const client = new CanvasApiClient({
      domain: connection.canvas_domain,
      token
    });

    const counts = await syncCanvasData({
      client,
      connection,
      supabase,
      syncedAt: startedAt,
      userId
    });

    const finishedAt = new Date().toISOString();

    await Promise.all([
      supabase
        .from("sync_runs")
        .update({
          finished_at: finishedAt,
          metadata: mergeMetadata(connection.metadata, {
            canvas_connection_id: connection.id,
            canvas_domain: connection.canvas_domain,
            counts
          }),
          status: "succeeded",
          summary: `Synced ${counts.courses} courses, ${counts.assignments} assignments, and ${counts.resources} resources.`
        })
        .eq("id", run.syncRunId)
        .eq("user_id", userId),
      supabase
        .from("canvas_connections")
        .update({
          last_synced_at: finishedAt,
          metadata: mergeMetadata(connection.metadata, {
            last_sync_counts: counts,
            last_sync_finished_at: finishedAt
          }),
          status: "connected"
        })
        .eq("id", connection.id)
        .eq("user_id", userId)
    ]);

    return { counts, ok: true, syncRunId: run.syncRunId };
  } catch (error) {
    const status = error instanceof CanvasApiError ? error.status : 500;
    const message = error instanceof Error ? error.message : "Canvas sync failed.";

    if (status === 401 || status === 403) {
      await supabase
        .from("canvas_connections")
        .update({
          metadata: mergeMetadata(connection.metadata, {
            auth_failed_at: new Date().toISOString(),
            auth_failed_status: status
          }),
          status: status === 401 ? "expired" : "error"
        })
        .eq("id", connection.id)
        .eq("user_id", userId);
    }

    return failSync(supabase, {
      connection,
      error: message,
      status,
      syncRunId: run.syncRunId
    });
  }
}

async function syncCanvasData({
  client,
  connection,
  supabase,
  syncedAt,
  userId
}: {
  client: CanvasApiClient;
  connection: CanvasConnectionRow;
  supabase: SupabaseClient<Database>;
  syncedAt: string;
  userId: string;
}): Promise<CanvasSyncCounts> {
  const canvasCourses = (await client.getPaginated<CanvasCourse>("/api/v1/courses", {
    "include[]": ["term"],
    enrollment_state: "active"
  })).filter((course) => getCanvasId(course.id) && course.workflow_state !== "deleted");

  const courseRows = canvasCourses
    .map((course) => normalizeCourseInsert({ course, syncedAt, userId }))
    .filter((course): course is NonNullable<typeof course> => Boolean(course));
  const syncedCourses = await upsertCourses(supabase, courseRows);
  const courseIdByCanvasId = new Map(syncedCourses.map((course) => [course.canvas_course_id, course.id]));
  const assignmentRows: AssignmentInsert[] = [];
  const resourceRowsByKey = new Map<string, FileResourceInsert>();

  for (const canvasCourse of canvasCourses) {
    const canvasCourseId = getCanvasId(canvasCourse.id);
    const courseId = canvasCourseId ? courseIdByCanvasId.get(canvasCourseId) : null;

    if (!canvasCourseId || !courseId) {
      continue;
    }

    const [assignments, files, modules] = await Promise.all([
      getCourseAssignments(client, canvasCourseId),
      getCourseFiles(client, canvasCourseId),
      getCourseModules(client, canvasCourseId)
    ]);

    assignments
      .map((assignment) =>
        normalizeAssignmentInsert({
          assignment,
          canvasCourseId,
          canvasDomain: connection.canvas_domain,
          courseId,
          syncedAt,
          userId
        })
      )
      .filter((assignment): assignment is AssignmentInsert => Boolean(assignment))
      .forEach((assignment) => assignmentRows.push(assignment));

    files
      .map((file) =>
        normalizeFileResourceInsert({
          canvasCourseId,
          canvasDomain: connection.canvas_domain,
          courseId,
          file,
          userId
        })
      )
      .filter((resource): resource is FileResourceInsert => Boolean(resource))
      .forEach((resource) => resourceRowsByKey.set(resource.canvas_file_id, resource));

    modules.forEach((module) => {
      module.items?.forEach((item) => {
        const resource = normalizeModuleResourceInsert({
          canvasCourseId,
          canvasDomain: connection.canvas_domain,
          courseId,
          item,
          module,
          userId
        });

        if (resource) {
          resourceRowsByKey.set(resource.canvas_file_id, resource);
        }
      });
    });
  }

  const syncedAssignments = await upsertAssignments(supabase, assignmentRows);
  const syncedResources = await upsertResources(supabase, [...resourceRowsByKey.values()]);
  const searchChunks = [
    ...createAssignmentChunks({
      assignmentRows,
      canvasDomain: connection.canvas_domain,
      syncedAssignments,
      userId
    }),
    ...createResourceChunks({
      canvasDomain: connection.canvas_domain,
      resourceRows: [...resourceRowsByKey.values()],
      syncedResources,
      userId
    })
  ];

  await replaceCanvasSearchChunks(supabase, {
    canvasDomain: connection.canvas_domain,
    searchChunks,
    userId
  });

  return {
    assignments: syncedAssignments.length,
    courses: syncedCourses.length,
    resources: syncedResources.length,
    searchChunks: searchChunks.length
  };
}

async function getCourseAssignments(client: CanvasApiClient, canvasCourseId: string) {
  return getOptionalPaginated<CanvasAssignment>(client, `/api/v1/courses/${canvasCourseId}/assignments`, {
    "include[]": ["submission", "all_dates"]
  });
}

async function getCourseFiles(client: CanvasApiClient, canvasCourseId: string) {
  return getOptionalPaginated<CanvasFile>(client, `/api/v1/courses/${canvasCourseId}/files`);
}

async function getCourseModules(client: CanvasApiClient, canvasCourseId: string) {
  return getOptionalPaginated<CanvasModule>(client, `/api/v1/courses/${canvasCourseId}/modules`, {
    "include[]": ["items"]
  });
}

async function getOptionalPaginated<T>(client: CanvasApiClient, path: string, params = {}) {
  try {
    return await client.getPaginated<T>(path, params);
  } catch (error) {
    if (error instanceof CanvasApiError && (error.status === 401 || error.status === 403 || error.status === 404)) {
      return [];
    }

    throw error;
  }
}

async function upsertCourses(supabase: SupabaseClient<Database>, rows: Array<Database["public"]["Tables"]["courses"]["Insert"]>) {
  if (!rows.length) {
    return [] as CourseRow[];
  }

  const { data, error } = await supabase
    .from("courses")
    .upsert(rows, { onConflict: "user_id,source,canvas_course_id" })
    .select("id, canvas_course_id");

  if (error) {
    throw error;
  }

  return (data ?? []).filter((course): course is CourseRow => Boolean(course.canvas_course_id));
}

async function upsertAssignments(
  supabase: SupabaseClient<Database>,
  rows: Array<Database["public"]["Tables"]["assignments"]["Insert"]>
) {
  if (!rows.length) {
    return [] as AssignmentRow[];
  }

  const { data, error } = await supabase
    .from("assignments")
    .upsert(rows, { onConflict: "user_id,source,canvas_assignment_id" })
    .select("id, canvas_assignment_id");

  if (error) {
    throw error;
  }

  return (data ?? []).filter((assignment): assignment is AssignmentRow => Boolean(assignment.canvas_assignment_id));
}

async function upsertResources(
  supabase: SupabaseClient<Database>,
  rows: Array<Database["public"]["Tables"]["file_resources"]["Insert"]>
) {
  if (!rows.length) {
    return [] as FileResourceRow[];
  }

  const { data, error } = await supabase
    .from("file_resources")
    .upsert(rows, { onConflict: "user_id,source,canvas_file_id" })
    .select("id, canvas_file_id");

  if (error) {
    throw error;
  }

  return (data ?? []).filter((resource): resource is FileResourceRow => Boolean(resource.canvas_file_id));
}

async function replaceCanvasSearchChunks(
  supabase: SupabaseClient<Database>,
  {
    canvasDomain,
    searchChunks,
    userId
  }: {
    canvasDomain: string;
    searchChunks: Array<Database["public"]["Tables"]["search_chunks"]["Insert"]>;
    userId: string;
  }
) {
  const { error: deleteError } = await supabase
    .from("search_chunks")
    .delete()
    .eq("user_id", userId)
    .contains("metadata", {
      canvas_domain: canvasDomain,
      source: "canvas"
    });

  if (deleteError) {
    throw deleteError;
  }

  if (!searchChunks.length) {
    return;
  }

  const { error } = await supabase.from("search_chunks").insert(searchChunks);

  if (error) {
    throw error;
  }
}

function createAssignmentChunks({
  assignmentRows,
  canvasDomain,
  syncedAssignments,
  userId
}: {
  assignmentRows: AssignmentInsert[];
  canvasDomain: string;
  syncedAssignments: AssignmentRow[];
  userId: string;
}) {
  const assignmentIdByCanvasId = new Map(syncedAssignments.map((assignment) => [assignment.canvas_assignment_id, assignment.id]));

  return assignmentRows
    .map((assignment) => {
      const assignmentId = assignmentIdByCanvasId.get(assignment.canvas_assignment_id);

      return assignmentId
        ? createAssignmentSearchChunk({
            assignment,
            assignmentId,
            canvasDomain,
            courseId: assignment.course_id,
            userId
          })
        : null;
    })
    .filter((chunk): chunk is NonNullable<typeof chunk> => Boolean(chunk));
}

function createResourceChunks({
  canvasDomain,
  resourceRows,
  syncedResources,
  userId
}: {
  canvasDomain: string;
  resourceRows: FileResourceInsert[];
  syncedResources: FileResourceRow[];
  userId: string;
}) {
  const resourceIdByCanvasId = new Map(syncedResources.map((resource) => [resource.canvas_file_id, resource.id]));

  return resourceRows
    .map((resource) => {
      const resourceId = resourceIdByCanvasId.get(resource.canvas_file_id);

      return resourceId
        ? createResourceSearchChunk({
            canvasDomain,
            courseId: resource.course_id,
            resource,
            resourceId,
            userId
          })
        : null;
    })
    .filter((chunk): chunk is NonNullable<typeof chunk> => Boolean(chunk));
}

async function findCanvasConnection(
  supabase: SupabaseClient<Database>,
  {
    connectionId,
    domain,
    userId
  }: {
    connectionId?: string;
    domain?: string;
    userId: string;
  }
): Promise<
  | {
      connection: CanvasConnectionRow;
      ok: true;
    }
  | {
      error: string;
      ok: false;
      status: number;
    }
> {
  let query = supabase
    .from("canvas_connections")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "connected")
    .not("token_reference", "is", null)
    .order("created_at", { ascending: false })
    .limit(1);

  if (connectionId) {
    query = query.eq("id", connectionId);
  }

  if (domain) {
    query = query.eq("canvas_domain", domain);
  }

  const { data, error } = await query.maybeSingle();

  if (error) {
    return { error: error.message, ok: false, status: 400 };
  }

  if (!data) {
    return { error: "No connected Canvas account with a stored token was found.", ok: false, status: 404 };
  }

  return { connection: data, ok: true };
}

async function startSyncRun(
  supabase: SupabaseClient<Database>,
  {
    connection,
    startedAt,
    syncRunId,
    userId
  }: {
    connection: CanvasConnectionRow;
    startedAt: string;
    syncRunId?: string;
    userId: string;
  }
): Promise<
  | {
      ok: true;
      syncRunId: string;
    }
  | {
      error: string;
      ok: false;
      status: number;
    }
> {
  if (syncRunId) {
    const { error } = await supabase
      .from("sync_runs")
      .update({
        started_at: startedAt,
        status: "running",
        summary: `Syncing Canvas data from ${connection.canvas_domain}.`
      })
      .eq("id", syncRunId)
      .eq("user_id", userId);

    return error
      ? { error: error.message, ok: false, status: 400 }
      : { ok: true, syncRunId };
  }

  const { data, error } = await supabase
    .from("sync_runs")
    .insert({
      metadata: {
        canvas_connection_id: connection.id,
        canvas_domain: connection.canvas_domain,
        queued_from: "manual_refresh"
      },
      provider: "canvas",
      started_at: startedAt,
      status: "running",
      summary: `Syncing Canvas data from ${connection.canvas_domain}.`,
      user_id: userId
    })
    .select("id")
    .single();

  return error || !data
    ? { error: error?.message ?? "Could not create sync run.", ok: false, status: 400 }
    : { ok: true, syncRunId: data.id };
}

async function failSync(
  supabase: SupabaseClient<Database>,
  {
    connection,
    error,
    status,
    syncRunId
  }: {
    connection: CanvasConnectionRow;
    error: string;
    status: number;
    syncRunId: string;
  }
): Promise<CanvasSyncResult> {
  await supabase
    .from("sync_runs")
    .update({
      error_message: error,
      finished_at: new Date().toISOString(),
      metadata: mergeMetadata(connection.metadata, {
        canvas_connection_id: connection.id,
        canvas_domain: connection.canvas_domain
      }),
      status: "failed",
      summary: "Canvas sync failed."
    })
    .eq("id", syncRunId)
    .eq("user_id", connection.user_id);

  return { error, ok: false, status, syncRunId };
}

function mergeMetadata(existing: Json, next: Record<string, Json | undefined>): Json {
  const base = isRecord(existing) ? existing : {};

  return {
    ...base,
    ...Object.fromEntries(Object.entries(next).filter((entry): entry is [string, Json] => entry[1] !== undefined))
  };
}

function isRecord(value: Json): value is Record<string, Json> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
