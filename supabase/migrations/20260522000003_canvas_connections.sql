create table public.canvas_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  canvas_domain text not null,
  canvas_user_id text,
  status text not null default 'pending' check (status in ('pending', 'connected', 'expired', 'revoked', 'error')),
  token_reference text,
  scopes text[] not null default '{}',
  last_synced_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, canvas_domain)
);

create index canvas_connections_user_id_idx on public.canvas_connections(user_id);

create trigger canvas_connections_set_updated_at
before update on public.canvas_connections
for each row execute function public.set_updated_at();

alter table public.canvas_connections enable row level security;

create policy "canvas connections are owned by user"
on public.canvas_connections
for all
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
