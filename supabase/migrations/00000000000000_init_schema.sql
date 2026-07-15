-- ============================================================
-- CCV Colli — Schema iniziale completo
-- Ricostruito da DNA/03-supabase-database.md
-- Idempotente: si può rieseguire senza errori.
-- ============================================================

-- ---------- TABELLE ----------

create table if not exists public.sections (
  id text not null primary key,
  name_it text not null,
  name_en text not null,
  "order" integer not null default 0,
  type text,
  subtitle_it text,
  subtitle_en text
);

create table if not exists public.categories (
  id text not null primary key,
  section_id text not null references public.sections(id) on delete cascade,
  name_it text not null,
  name_en text not null,
  "order" integer not null default 0
);

create table if not exists public.dishes (
  id text not null primary key,
  category_id text not null references public.categories(id) on delete cascade,
  name_it text not null,
  name_en text not null,
  description_it text not null default '',
  description_en text not null default '',
  price numeric(10,2),
  vegetarian boolean not null default false,
  gluten_free boolean not null default false,
  allergens text[] not null default '{}',
  extra_info text not null default '',
  "order" integer not null default 0,
  subtitle_it text default '',
  subtitle_en text default ''
);

create table if not exists public.allergens (
  id text not null primary key,
  name_it text not null,
  name_en text not null
);

create table if not exists public.wine_categories (
  id text not null primary key,
  name_it text not null,
  name_en text not null,
  "order" integer not null default 0
);

create table if not exists public.wines (
  id text not null primary key,
  wine_category_id text not null references public.wine_categories(id) on delete cascade,
  name_it text not null,
  name_en text not null,
  producer text not null default '',
  origin text not null default '',
  abv numeric(5,2),
  price_glass numeric(10,2),
  price_bottle numeric(10,2),
  "order" integer not null default 0
);

create table if not exists public.admin_settings (
  key text not null primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

-- ---------- INDICI ----------

create index if not exists idx_categories_section on public.categories(section_id);
create index if not exists idx_dishes_category on public.dishes(category_id);
create index if not exists idx_wines_category on public.wines(wine_category_id);

create index if not exists idx_sections_order_id on public.sections("order", id);
create index if not exists idx_categories_order_id on public.categories("order", id);
create index if not exists idx_categories_section_order_id on public.categories(section_id, "order", id);
create index if not exists idx_dishes_order_id on public.dishes("order", id);
create index if not exists idx_dishes_category_order_id on public.dishes(category_id, "order", id);
create index if not exists idx_dishes_allergens_gin on public.dishes using gin (allergens);
create index if not exists idx_wine_categories_order_id on public.wine_categories("order", id);
create index if not exists idx_wines_order_id on public.wines("order", id);
create index if not exists idx_wines_category_order_id on public.wines(wine_category_id, "order", id);

-- ---------- RLS ----------

alter table public.sections        enable row level security;
alter table public.categories      enable row level security;
alter table public.dishes          enable row level security;
alter table public.allergens       enable row level security;
alter table public.wine_categories enable row level security;
alter table public.wines           enable row level security;
alter table public.admin_settings  enable row level security;

-- ---------- POLICY (solo service_role) ----------
-- Tabelle menu: SELECT/INSERT/UPDATE/DELETE per service_role.
-- Uso (select auth.role()) per evitare il warning auth_rls_initplan.

do $$
declare t text;
begin
  foreach t in array array['sections','categories','dishes','allergens','wine_categories','wines']
  loop
    execute format('drop policy if exists %I on public.%I', t||'_service_select', t);
    execute format('drop policy if exists %I on public.%I', t||'_service_insert', t);
    execute format('drop policy if exists %I on public.%I', t||'_service_update', t);
    execute format('drop policy if exists %I on public.%I', t||'_service_delete', t);

    execute format($f$create policy %I on public.%I for select using ((select auth.role()) = 'service_role')$f$, t||'_service_select', t);
    execute format($f$create policy %I on public.%I for insert with check ((select auth.role()) = 'service_role')$f$, t||'_service_insert', t);
    execute format($f$create policy %I on public.%I for update using ((select auth.role()) = 'service_role') with check ((select auth.role()) = 'service_role')$f$, t||'_service_update', t);
    execute format($f$create policy %I on public.%I for delete using ((select auth.role()) = 'service_role')$f$, t||'_service_delete', t);
  end loop;
end $$;

-- admin_settings: solo SELECT/INSERT/UPDATE per service_role (no DELETE runtime)
drop policy if exists admin_settings_service_select on public.admin_settings;
drop policy if exists admin_settings_service_insert on public.admin_settings;
drop policy if exists admin_settings_service_update on public.admin_settings;

create policy admin_settings_service_select on public.admin_settings for select using ((select auth.role()) = 'service_role');
create policy admin_settings_service_insert on public.admin_settings for insert with check ((select auth.role()) = 'service_role');
create policy admin_settings_service_update on public.admin_settings for update using ((select auth.role()) = 'service_role') with check ((select auth.role()) = 'service_role');

-- ---------- GRANT: revoca accesso diretto ad anon/authenticated ----------

do $$
declare t text;
begin
  foreach t in array array['sections','categories','dishes','allergens','wine_categories','wines','admin_settings']
  loop
    execute format('revoke all on public.%I from anon', t);
    execute format('revoke all on public.%I from authenticated', t);
    execute format('grant all on public.%I to service_role', t);
  end loop;
end $$;
