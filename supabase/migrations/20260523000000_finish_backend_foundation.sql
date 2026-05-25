create table if not exists public.student_contexts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  goals text not null default '',
  learning_preferences jsonb not null default '{}'::jsonb,
  constraints text not null default '',
  ai_notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.calendar_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null check (provider in ('google')),
  account_email text,
  status text not null default 'pending' check (status in ('pending', 'connected', 'expired', 'revoked', 'error')),
  token_reference text,
  scopes text[] not null default '{}',
  last_synced_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, provider, account_email)
);

create table if not exists public.sync_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null check (provider in ('canvas', 'google_calendar')),
  status text not null default 'queued' check (status in ('queued', 'running', 'succeeded', 'failed')),
  started_at timestamptz,
  finished_at timestamptz,
  summary text not null default '',
  error_message text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (finished_at is null or started_at is null or finished_at >= started_at)
);

create index if not exists calendar_connections_user_id_idx
  on public.calendar_connections(user_id);

create index if not exists sync_runs_user_provider_created_idx
  on public.sync_runs(user_id, provider, created_at desc);

drop trigger if exists student_contexts_set_updated_at on public.student_contexts;
create trigger student_contexts_set_updated_at
before update on public.student_contexts
for each row execute function public.set_updated_at();

drop trigger if exists calendar_connections_set_updated_at on public.calendar_connections;
create trigger calendar_connections_set_updated_at
before update on public.calendar_connections
for each row execute function public.set_updated_at();

drop trigger if exists sync_runs_set_updated_at on public.sync_runs;
create trigger sync_runs_set_updated_at
before update on public.sync_runs
for each row execute function public.set_updated_at();

alter table public.student_contexts enable row level security;
alter table public.calendar_connections enable row level security;
alter table public.sync_runs enable row level security;

drop policy if exists "profiles are owned by user" on public.profiles;
drop policy if exists "courses are owned by user" on public.courses;
drop policy if exists "assignments are owned by user" on public.assignments;
drop policy if exists "file resources are owned by user" on public.file_resources;
drop policy if exists "assignment resources are owned by user" on public.assignment_file_resources;
drop policy if exists "assignment relations are owned by user" on public.assignment_relations;
drop policy if exists "study blocks are owned by user" on public.study_blocks;
drop policy if exists "manual events are owned by user" on public.manual_events;
drop policy if exists "chat threads are owned by user" on public.chat_threads;
drop policy if exists "chat messages are owned by user" on public.chat_messages;
drop policy if exists "search chunks are owned by user" on public.search_chunks;
drop policy if exists "canvas connections are owned by user" on public.canvas_connections;
drop policy if exists "student contexts are owned by user" on public.student_contexts;
drop policy if exists "calendar connections are owned by user" on public.calendar_connections;
drop policy if exists "sync runs are owned by user" on public.sync_runs;

create policy "profiles are owned by user"
on public.profiles
for all
to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = id)
with check ((select auth.uid()) is not null and (select auth.uid()) = id);

create policy "courses are owned by user"
on public.courses
for all
to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id)
with check ((select auth.uid()) is not null and (select auth.uid()) = user_id);

create policy "assignments are owned by user"
on public.assignments
for all
to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id)
with check ((select auth.uid()) is not null and (select auth.uid()) = user_id);

create policy "file resources are owned by user"
on public.file_resources
for all
to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id)
with check ((select auth.uid()) is not null and (select auth.uid()) = user_id);

create policy "assignment resources are owned by user"
on public.assignment_file_resources
for all
to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id)
with check ((select auth.uid()) is not null and (select auth.uid()) = user_id);

create policy "assignment relations are owned by user"
on public.assignment_relations
for all
to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id)
with check ((select auth.uid()) is not null and (select auth.uid()) = user_id);

create policy "study blocks are owned by user"
on public.study_blocks
for all
to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id)
with check ((select auth.uid()) is not null and (select auth.uid()) = user_id);

create policy "manual events are owned by user"
on public.manual_events
for all
to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id)
with check ((select auth.uid()) is not null and (select auth.uid()) = user_id);

create policy "chat threads are owned by user"
on public.chat_threads
for all
to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id)
with check ((select auth.uid()) is not null and (select auth.uid()) = user_id);

create policy "chat messages are owned by user"
on public.chat_messages
for all
to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id)
with check ((select auth.uid()) is not null and (select auth.uid()) = user_id);

create policy "search chunks are owned by user"
on public.search_chunks
for all
to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id)
with check ((select auth.uid()) is not null and (select auth.uid()) = user_id);

create policy "canvas connections are owned by user"
on public.canvas_connections
for all
to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id)
with check ((select auth.uid()) is not null and (select auth.uid()) = user_id);

create policy "student contexts are owned by user"
on public.student_contexts
for all
to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id)
with check ((select auth.uid()) is not null and (select auth.uid()) = user_id);

create policy "calendar connections are owned by user"
on public.calendar_connections
for all
to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id)
with check ((select auth.uid()) is not null and (select auth.uid()) = user_id);

create policy "sync runs are owned by user"
on public.sync_runs
for all
to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id)
with check ((select auth.uid()) is not null and (select auth.uid()) = user_id);

alter table public.search_chunks
add column if not exists content_tsv tsvector generated always as (
  to_tsvector(
    'english',
    coalesce(title, '') || ' ' || coalesce(summary, '') || ' ' || coalesce(content, '') || ' ' || coalesce(citation, '')
  )
) stored;

create index if not exists search_chunks_content_tsv_idx
  on public.search_chunks using gin(content_tsv);

create or replace function public.search_workspace_text(
  search_query text,
  match_count integer default 10,
  filter_course_id uuid default null
)
returns table (
  id uuid,
  course_id uuid,
  assignment_id uuid,
  file_resource_id uuid,
  source_type text,
  title text,
  summary text,
  citation text,
  content text,
  relevance real
)
language sql
stable
set search_path = public
as $$
  with normalized as (
    select trim(coalesce(search_query, '')) as q
  ),
  parsed as (
    select q, websearch_to_tsquery('english', q) as ts_query
    from normalized
    where q <> ''
  )
  select
    sc.id,
    sc.course_id,
    sc.assignment_id,
    sc.file_resource_id,
    sc.source_type,
    sc.title,
    sc.summary,
    sc.citation,
    sc.content,
    greatest(
      ts_rank(sc.content_tsv, parsed.ts_query),
      case
        when sc.title ilike '%' || parsed.q || '%' then 0.35
        when sc.summary ilike '%' || parsed.q || '%' then 0.2
        else 0
      end
    )::real as relevance
  from public.search_chunks sc
  join parsed on true
  where (select auth.uid()) is not null
    and sc.user_id = (select auth.uid())
    and (filter_course_id is null or sc.course_id = filter_course_id)
    and (
      sc.content_tsv @@ parsed.ts_query
      or sc.title ilike '%' || parsed.q || '%'
      or sc.summary ilike '%' || parsed.q || '%'
      or sc.citation ilike '%' || parsed.q || '%'
    )
  order by relevance desc, sc.created_at desc
  limit least(greatest(match_count, 1), 50);
$$;

create or replace function public.match_search_chunks(
  query_embedding vector(1536),
  match_count integer default 8,
  filter_course_id uuid default null
)
returns table (
  id uuid,
  course_id uuid,
  assignment_id uuid,
  file_resource_id uuid,
  source_type text,
  title text,
  summary text,
  citation text,
  content text,
  relevance real
)
language sql
stable
set search_path = public, extensions
as $$
  select
    sc.id,
    sc.course_id,
    sc.assignment_id,
    sc.file_resource_id,
    sc.source_type,
    sc.title,
    sc.summary,
    sc.citation,
    sc.content,
    (1 - (sc.embedding <=> query_embedding))::real as relevance
  from public.search_chunks sc
  where (select auth.uid()) is not null
    and sc.user_id = (select auth.uid())
    and sc.embedding is not null
    and (filter_course_id is null or sc.course_id = filter_course_id)
  order by sc.embedding <=> query_embedding
  limit least(greatest(match_count, 1), 50);
$$;

grant execute on function public.search_workspace_text(text, integer, uuid) to authenticated;
grant execute on function public.match_search_chunks(vector(1536), integer, uuid) to authenticated;

create or replace function private.sync_assignment_search_chunk()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.search_chunks
  where assignment_id = new.id
    and source_type = 'assignment';

  insert into public.search_chunks (
    user_id,
    course_id,
    assignment_id,
    source_type,
    title,
    content,
    summary,
    citation,
    metadata
  )
  values (
    new.user_id,
    new.course_id,
    new.id,
    'assignment',
    new.title,
    new.description,
    new.summary,
    coalesce(new.metadata ->> 'citation', 'Assignment'),
    jsonb_build_object('status', new.status, 'due_at', new.due_at)
  );

  return new;
end;
$$;

create or replace function private.sync_file_resource_search_chunk()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.search_chunks
  where file_resource_id = new.id
    and source_type = 'file';

  insert into public.search_chunks (
    user_id,
    course_id,
    file_resource_id,
    source_type,
    title,
    content,
    summary,
    citation,
    metadata
  )
  values (
    new.user_id,
    new.course_id,
    new.id,
    'file',
    new.title,
    coalesce(new.metadata ->> 'extracted_text', new.summary),
    new.summary,
    new.citation,
    jsonb_build_object('type', new.type, 'storage_path', new.storage_path)
  );

  return new;
end;
$$;

drop trigger if exists assignments_sync_search_chunk on public.assignments;
create trigger assignments_sync_search_chunk
after insert or update of title, description, summary, due_at, status, metadata
on public.assignments
for each row execute function private.sync_assignment_search_chunk();

drop trigger if exists file_resources_sync_search_chunk on public.file_resources;
create trigger file_resources_sync_search_chunk
after insert or update of title, summary, citation, metadata, storage_path
on public.file_resources
for each row execute function private.sync_file_resource_search_chunk();

revoke execute on function private.sync_assignment_search_chunk() from public;
revoke execute on function private.sync_assignment_search_chunk() from anon;
revoke execute on function private.sync_assignment_search_chunk() from authenticated;
revoke execute on function private.sync_file_resource_search_chunk() from public;
revoke execute on function private.sync_file_resource_search_chunk() from anon;
revoke execute on function private.sync_file_resource_search_chunk() from authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'course-materials',
  'course-materials',
  false,
  52428800,
  array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/jpeg',
    'image/png',
    'image/webp',
    'text/plain'
  ]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "course materials owners can read" on storage.objects;
drop policy if exists "course materials owners can upload" on storage.objects;
drop policy if exists "course materials owners can update" on storage.objects;
drop policy if exists "course materials owners can delete" on storage.objects;

create policy "course materials owners can read"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'course-materials'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy "course materials owners can upload"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'course-materials'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy "course materials owners can update"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'course-materials'
  and (storage.foldername(name))[1] = (select auth.uid())::text
)
with check (
  bucket_id = 'course-materials'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy "course materials owners can delete"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'course-materials'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);
