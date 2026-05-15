alter table public.app_configs add column app_name text;
alter table public.app_configs add column version text;

-- backfill existing rows from the old slug
update public.app_configs
set app_name = coalesce(app_name, split_part(slug, '/', 1)),
    version  = coalesce(version,  nullif(split_part(slug, '/', 2), ''));

update public.app_configs set app_name = slug where app_name is null or app_name = '';
update public.app_configs set version = 'default' where version is null or version = '';

alter table public.app_configs alter column app_name set not null;
alter table public.app_configs alter column version set not null;

alter table public.app_configs drop constraint if exists app_configs_slug_key;
alter table public.app_configs drop column slug;

alter table public.app_configs
  add constraint app_configs_app_version_unique unique (app_name, version);

create index if not exists app_configs_app_idx on public.app_configs(app_name);