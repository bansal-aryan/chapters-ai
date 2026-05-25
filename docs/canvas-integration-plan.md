# Canvas Integration Plan

This plan connects the locked UI to Canvas without changing the visual model of the app. Canvas becomes the source for courses, assignments, files/modules, calendar events, and submission status; chapters still owns prioritization, focus sessions, AI context, manual edits, and presentation.

## 1. Connection And Auth

The Settings page owns the connection flow.

1. Student enters a Canvas domain such as `school.instructure.com`.
2. `POST /api/canvas/connection` creates or updates `canvas_connections` with `status = pending`, requested scopes, and the normalized domain.
3. OAuth redirects to Canvas and returns through a dedicated callback route, for example `/api/canvas/oauth/callback`.
4. The callback exchanges the code for tokens, stores only an encrypted server-side `token_reference`, records `canvas_user_id`, sets `status = connected`, and queues a `sync_runs` row.
5. Settings shows connection status, last sync, token health, and a manual refresh action.

Existing tables already support most of this: `canvas_connections`, `sync_runs`, user-owned RLS, and `getWorkspaceSnapshotFromSupabase()`.

Implemented now:

- `/api/canvas/oauth/start` creates or updates a pending connection, sets a same-site OAuth state cookie, and redirects to Canvas.
- `/api/canvas/oauth/callback` validates state, exchanges the code, encrypts the token payload into `canvas_connections.token_reference`, marks the connection connected, and queues a `sync_runs` row.
- Settings submits directly into the OAuth start route.
- `/api/canvas/token` accepts a user-provided Canvas personal access token, validates it with Canvas, encrypts it into `canvas_connections.token_reference`, marks the connection connected, and queues a `sync_runs` row.
- `GET /api/canvas/connection` no longer returns `token_reference` to the client.

## 2. Sync Pipeline

Create server-only Canvas modules:

- `src/lib/canvas/oauth.ts`: builds auth URLs, validates state, exchanges code, refreshes tokens.
- `src/lib/canvas/api.ts`: typed Canvas fetcher with pagination, rate-limit backoff, and token refresh.
- `src/lib/canvas/normalizers.ts`: maps Canvas payloads into app domain records.
- `src/lib/canvas/sync.ts`: runs the full and incremental sync jobs.

Sync steps:

1. Fetch active courses.
2. Upsert `courses` by `(user_id, source, canvas_course_id)`.
3. Fetch assignments per course, including due dates, lock dates, points, descriptions, and submission status when available.
4. Upsert `assignments` by `(user_id, source, canvas_assignment_id)`.
5. Fetch modules, module items, files, pages, and assignment attachments.
6. Upsert `file_resources`, `assignment_file_resources`, and `search_chunks` for AI/search.
7. Fetch Canvas calendar events and assignment due events.
8. Upsert Canvas-owned calendar events into a new `external_calendar_events` table or extend `manual_events` with `source`, `provider`, and `provider_event_id`.
9. Run prioritization and study block generation. Persist AI/manual blocks in `study_blocks`.
10. Mark the `sync_runs` row succeeded or failed, then update `canvas_connections.last_synced_at`.

## 3. UI Surface Mapping

Dashboard:

- Summary cards come from `assignments`, `file_resources`, `study_blocks`, and `canvas_connections`.
- Priority Queue uses the same ranked assignment list as Assignments.
- Recent Files reads from `file_resources` sorted by Canvas updated date.
- Canvas sync status reads from `canvas_connections.status` and latest `sync_runs`.

Calendar:

- Canvas due dates become all-day deadline markers.
- Canvas calendar events become all-day or timed events.
- AI focus sessions and user-created blocks come from `study_blocks`.
- Manual commitments remain user-owned events and should not be overwritten by Canvas sync.

Assignments:

- Rows come from Canvas assignments normalized into `assignments`.
- Course/teacher labels come from `courses` plus Canvas enrollment metadata.
- Status uses Canvas submission state first, then app-local overrides.
- Priority pill is app-computed from due date, missing status, estimated effort, and user overrides.
- Tabs filter the normalized assignment set: upcoming, completed, all.

Focus Mode:

- The current focus target is the highest-ranked open assignment.
- Today&apos;s Focus and session history come from `study_blocks`.
- Starting focus creates a local study block or updates an active session, never writes back to Canvas.
- The assistant scope includes the active assignment, linked course files, related resources, and recent search chunks.

AI Assistant:

- Global assistant context is built from `courses`, ranked `assignments`, `manual_events`, `study_blocks`, and `student_contexts`.
- Retrieval uses `search_chunks` generated from Canvas assignments, files, module pages, and notes.
- Responses cite `file_resources.citation` or Canvas module paths.
- The assistant does not submit work or mutate Canvas content.

Resources:

- Folders are derived from Canvas courses and modules.
- Files list reads from `file_resources`, with `type`, `title`, `citation`, `metadata.size`, and Canvas updated date.
- Search queries hit `/api/search`, combining text search and embeddings over `search_chunks`.

Settings:

- Connection form creates the pending Canvas connection.
- Sync health reads from `canvas_connections` and latest `sync_runs`.
- Manual refresh queues a new Canvas sync for the connected domain.

## 4. Data Rules

- Canvas records are upserted, not recreated, using Canvas IDs.
- Manual records keep `source = manual` and are never overwritten by sync.
- App-computed fields such as `summary`, `estimated_effort_minutes`, `priority_override`, and AI relationships can be regenerated but should preserve user overrides.
- Deletes should be soft-handled first: mark Canvas records hidden or archived in `metadata` before hard deletion.
- Every synced record must keep `last_synced_at` for stale-state messaging.

## 5. UX States To Add

- Empty connected state: Canvas connected but no courses found.
- Pending state: domain saved, OAuth not finished.
- Syncing state: latest `sync_runs.status = running`.
- Partial failure: show last successful sync and the failed scope.
- Expired token: Settings action prompts reconnect, while existing synced data remains visible.

## 6. Build Order

1. Add OAuth callback, token reference storage, and server-only Canvas fetcher.
2. Add `external_calendar_events` or extend `manual_events` for provider-owned events.
3. Implement full Canvas sync into courses, assignments, resources, search chunks, and events.
4. Replace locked-demo data with `getWorkspaceSnapshotFromSupabase()` adapters for each page.
5. Add loading, empty, sync-error, and expired-token UI states.
6. Add tests for normalizers, idempotent upserts, and assignment status mapping.
7. Add a manual refresh button and background sync scheduling.
