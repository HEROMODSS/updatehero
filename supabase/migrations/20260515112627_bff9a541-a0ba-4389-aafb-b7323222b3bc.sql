
create table public.app_configs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  slug text not null unique,
  credit text not null default 'MR. NoOB',
  enabled boolean not null default true,
  title text not null default '🔔 Update Available!',
  points jsonb not null default '[]'::jsonb,
  update_link text not null default '',
  cancel_text text not null default 'NOT NOW',
  update_text text not null default 'UPDATE NOW',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.app_configs enable row level security;

create policy "Owners can view their configs"
  on public.app_configs for select
  to authenticated
  using (auth.uid() = owner_id);

create policy "Owners can insert their configs"
  on public.app_configs for insert
  to authenticated
  with check (auth.uid() = owner_id);

create policy "Owners can update their configs"
  on public.app_configs for update
  to authenticated
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

create policy "Owners can delete their configs"
  on public.app_configs for delete
  to authenticated
  using (auth.uid() = owner_id);

create index app_configs_owner_idx on public.app_configs(owner_id);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger app_configs_set_updated_at
before update on public.app_configs
for each row execute function public.set_updated_at();
