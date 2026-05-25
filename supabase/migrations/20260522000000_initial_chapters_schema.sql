create extension if not exists pgcrypto;
create extension if not exists vector with schema extensions;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  school_name text,
  student_level text check (student_level in ('high_school', 'college', 'other')),
  timezone text not null default 'America/Los_Angeles',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.courses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source text not null check (source in ('canvas', 'manual')),
  name text not null,
  code text,
  term text,
  color text not null default '#64748b',
  canvas_course_id text,
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, source, canvas_course_id)
);

create table public.assignments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  source text not null check (source in ('canvas', 'manual')),
  canvas_assignment_id text,
  title text not null,
  description text not null default '',
  summary text not null default '',
  due_at timestamptz,
  status text not null default 'not_started' check (status in ('not_started', 'in_progress', 'submitted', 'graded', 'missing')),
  estimated_effort_minutes integer not null default 45 check (estimated_effort_minutes >= 0),
  priority_override integer,
  metadata jsonb not null default '{}'::jsonb,
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, source, canvas_assignment_id)
);

create table public.file_resources (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  source text not null check (source in ('canvas', 'manual')),
  canvas_file_id text,
  title text not null,
  type text not null check (type in ('pdf', 'doc', 'image', 'link')),
  summary text not null default '',
  citation text not null default '',
  storage_path text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, source, canvas_file_id)
);

create table public.assignment_file_resources (
  assignment_id uuid not null references public.assignments(id) on delete cascade,
  file_resource_id uuid not null references public.file_resources(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (assignment_id, file_resource_id)
);

create table public.assignment_relations (
  assignment_id uuid not null references public.assignments(id) on delete cascade,
  related_assignment_id uuid not null references public.assignments(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  relation_type text not null default 'similar_topic',
  score numeric(5, 4) not null default 0,
  created_at timestamptz not null default now(),
  primary key (assignment_id, related_assignment_id),
  check (assignment_id <> related_assignment_id)
);

create table public.study_blocks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  assignment_id uuid references public.assignments(id) on delete cascade,
  title text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  locked_by_user boolean not null default false,
  source text not null default 'ai' check (source in ('ai', 'manual')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

create table public.manual_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  cadence text,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

create table public.chat_threads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  scope text not null check (scope in ('global', 'class', 'assignment')),
  course_id uuid references public.courses(id) on delete cascade,
  assignment_id uuid references public.assignments(id) on delete cascade,
  title text not null default 'New chat',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  thread_id uuid not null references public.chat_threads(id) on delete cascade,
  role text not null check (role in ('assistant', 'user', 'system')),
  content text not null,
  citation_resource_ids uuid[] not null default '{}',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.search_chunks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid references public.courses(id) on delete cascade,
  assignment_id uuid references public.assignments(id) on delete cascade,
  file_resource_id uuid references public.file_resources(id) on delete cascade,
  source_type text not null check (source_type in ('assignment', 'file', 'module', 'note')),
  title text not null,
  content text not null,
  summary text not null default '',
  citation text not null default '',
  embedding vector(1536),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index courses_user_id_idx on public.courses(user_id);
create index assignments_user_due_idx on public.assignments(user_id, due_at);
create index assignments_course_id_idx on public.assignments(course_id);
create index file_resources_course_id_idx on public.file_resources(course_id);
create index study_blocks_user_starts_idx on public.study_blocks(user_id, starts_at);
create index manual_events_user_starts_idx on public.manual_events(user_id, starts_at);
create index chat_threads_user_scope_idx on public.chat_threads(user_id, scope);
create index chat_messages_thread_created_idx on public.chat_messages(thread_id, created_at);
create index search_chunks_user_course_idx on public.search_chunks(user_id, course_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger courses_set_updated_at
before update on public.courses
for each row execute function public.set_updated_at();

create trigger assignments_set_updated_at
before update on public.assignments
for each row execute function public.set_updated_at();

create trigger file_resources_set_updated_at
before update on public.file_resources
for each row execute function public.set_updated_at();

create trigger study_blocks_set_updated_at
before update on public.study_blocks
for each row execute function public.set_updated_at();

create trigger manual_events_set_updated_at
before update on public.manual_events
for each row execute function public.set_updated_at();

create trigger chat_threads_set_updated_at
before update on public.chat_threads
for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.courses enable row level security;
alter table public.assignments enable row level security;
alter table public.file_resources enable row level security;
alter table public.assignment_file_resources enable row level security;
alter table public.assignment_relations enable row level security;
alter table public.study_blocks enable row level security;
alter table public.manual_events enable row level security;
alter table public.chat_threads enable row level security;
alter table public.chat_messages enable row level security;
alter table public.search_chunks enable row level security;

create policy "profiles are owned by user"
on public.profiles
for all
using (auth.uid() = id)
with check (auth.uid() = id);

create policy "courses are owned by user"
on public.courses
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "assignments are owned by user"
on public.assignments
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "file resources are owned by user"
on public.file_resources
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "assignment resources are owned by user"
on public.assignment_file_resources
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "assignment relations are owned by user"
on public.assignment_relations
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "study blocks are owned by user"
on public.study_blocks
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "manual events are owned by user"
on public.manual_events
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "chat threads are owned by user"
on public.chat_threads
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "chat messages are owned by user"
on public.chat_messages
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "search chunks are owned by user"
on public.search_chunks
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
