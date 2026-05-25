create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create index assignment_file_resources_file_resource_id_idx
  on public.assignment_file_resources(file_resource_id);

create index assignment_file_resources_user_id_idx
  on public.assignment_file_resources(user_id);

create index assignment_relations_related_assignment_id_idx
  on public.assignment_relations(related_assignment_id);

create index assignment_relations_user_id_idx
  on public.assignment_relations(user_id);

create index chat_messages_user_id_idx
  on public.chat_messages(user_id);

create index chat_threads_course_id_idx
  on public.chat_threads(course_id);

create index chat_threads_assignment_id_idx
  on public.chat_threads(assignment_id);

create index search_chunks_course_id_idx
  on public.search_chunks(course_id);

create index search_chunks_assignment_id_idx
  on public.search_chunks(assignment_id);

create index search_chunks_file_resource_id_idx
  on public.search_chunks(file_resource_id);

create index study_blocks_assignment_id_idx
  on public.study_blocks(assignment_id);

drop policy "profiles are owned by user" on public.profiles;
drop policy "courses are owned by user" on public.courses;
drop policy "assignments are owned by user" on public.assignments;
drop policy "file resources are owned by user" on public.file_resources;
drop policy "assignment resources are owned by user" on public.assignment_file_resources;
drop policy "assignment relations are owned by user" on public.assignment_relations;
drop policy "study blocks are owned by user" on public.study_blocks;
drop policy "manual events are owned by user" on public.manual_events;
drop policy "chat threads are owned by user" on public.chat_threads;
drop policy "chat messages are owned by user" on public.chat_messages;
drop policy "search chunks are owned by user" on public.search_chunks;

create policy "profiles are owned by user"
on public.profiles
for all
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

create policy "courses are owned by user"
on public.courses
for all
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "assignments are owned by user"
on public.assignments
for all
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "file resources are owned by user"
on public.file_resources
for all
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "assignment resources are owned by user"
on public.assignment_file_resources
for all
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "assignment relations are owned by user"
on public.assignment_relations
for all
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "study blocks are owned by user"
on public.study_blocks
for all
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "manual events are owned by user"
on public.manual_events
for all
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "chat threads are owned by user"
on public.chat_threads
for all
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "chat messages are owned by user"
on public.chat_messages
for all
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "search chunks are owned by user"
on public.search_chunks
for all
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
