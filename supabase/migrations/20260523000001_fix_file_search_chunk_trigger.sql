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

revoke execute on function private.sync_file_resource_search_chunk() from public;
revoke execute on function private.sync_file_resource_search_chunk() from anon;
revoke execute on function private.sync_file_resource_search_chunk() from authenticated;
