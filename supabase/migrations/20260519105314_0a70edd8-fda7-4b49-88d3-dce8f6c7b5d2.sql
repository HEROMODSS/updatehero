
create table public.user_defaults (
  owner_id uuid primary key,
  title text not null default '🚀 New Update is Live!',
  points jsonb not null default '["🔥 Faster performance and smoother UI","🔒 Improved security and privacy handling"]'::jsonb,
  update_link text not null default 'https://t.me/heromodss',
  cancel_text text not null default 'NOT NOW',
  update_text text not null default 'UPDATE NOW',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_defaults enable row level security;

create policy "Owners can view their defaults"
  on public.user_defaults for select
  to authenticated using (auth.uid() = owner_id);

create policy "Owners can insert their defaults"
  on public.user_defaults for insert
  to authenticated with check (auth.uid() = owner_id);

create policy "Owners can update their defaults"
  on public.user_defaults for update
  to authenticated using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

create trigger user_defaults_set_updated_at
  before update on public.user_defaults
  for each row execute function public.set_updated_at();
