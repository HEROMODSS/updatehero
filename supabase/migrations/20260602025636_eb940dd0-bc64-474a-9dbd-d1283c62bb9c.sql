-- Username + custom JSON support
ALTER TABLE public.user_defaults
  ADD COLUMN IF NOT EXISTS username TEXT,
  ADD COLUMN IF NOT EXISTS raw_json JSONB,
  ADD COLUMN IF NOT EXISTS enabled_key TEXT NOT NULL DEFAULT 'enabled';

-- Unique, case-insensitive username
CREATE UNIQUE INDEX IF NOT EXISTS user_defaults_username_lower_idx
  ON public.user_defaults (LOWER(username))
  WHERE username IS NOT NULL;

ALTER TABLE public.app_configs
  ADD COLUMN IF NOT EXISTS raw_json JSONB,
  ADD COLUMN IF NOT EXISTS enabled_key TEXT NOT NULL DEFAULT 'enabled';

-- Prevent duplicate app_name+version across the whole system (conflict prevention)
CREATE UNIQUE INDEX IF NOT EXISTS app_configs_app_version_idx
  ON public.app_configs (LOWER(app_name), LOWER(version));
