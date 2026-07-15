-- ============================================================
-- Trigger updated_at su admin_settings
-- Aggiorna automaticamente updated_at ad ogni UPDATE.
-- ============================================================

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists trg_admin_settings_updated_at on public.admin_settings;
create trigger trg_admin_settings_updated_at
  before update on public.admin_settings
  for each row execute function public.set_updated_at();
