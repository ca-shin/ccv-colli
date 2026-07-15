create table if not exists public.admin_settings (
  key text primary key,
  value text not null,
  updated_at timestamp with time zone not null default now()
);

alter table public.admin_settings enable row level security;

revoke all on table public.admin_settings from anon, authenticated;

comment on table public.admin_settings is
  'Server-only admin settings. Values are accessed through the Express API with the Supabase service role key.';
