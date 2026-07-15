# Supabase Database

## Stato generale

Schema operativo: `public`.

Tabelle rilevate:

- `sections`
- `categories`
- `dishes`
- `allergens`
- `wine_categories`
- `wines`
- `admin_settings`

RLS e attivo su tutte le tabelle. Le policy consentono accesso solo tramite `service_role`, quindi il client pubblico non deve leggere o scrivere direttamente su Supabase. Il progetto deve passare dal server Express, che usa la service key lato server.

Postgres verificato: 17.6.

## Relazioni

```text
sections
  -> categories.section_id

categories
  -> dishes.category_id

wine_categories
  -> wines.wine_category_id
```

Foreign key reali:

- `categories.section_id` -> `sections.id`
- `dishes.category_id` -> `categories.id`
- `wines.wine_category_id` -> `wine_categories.id`

## Tabelle

### sections

Colonne:

- `id text not null primary key`
- `name_it text not null`
- `name_en text not null`
- `order integer not null default 0`
- `type text nullable`
- `subtitle_it text nullable`
- `subtitle_en text nullable`

### categories

Colonne:

- `id text not null primary key`
- `section_id text not null`
- `name_it text not null`
- `name_en text not null`
- `order integer not null default 0`

Relazioni:

- `section_id` -> `sections.id`

### dishes

Colonne:

- `id text not null primary key`
- `category_id text not null`
- `name_it text not null`
- `name_en text not null`
- `description_it text not null default ''`
- `description_en text not null default ''`
- `price numeric(10,2) nullable`
- `vegetarian boolean not null default false`
- `gluten_free boolean not null default false`
- `allergens text[] not null default '{}'`
- `extra_info text not null default ''`
- `order integer not null default 0`
- `subtitle_it text nullable default ''`
- `subtitle_en text nullable default ''`

Relazioni:

- `category_id` -> `categories.id`

Regola operativa:

- `gluten_free` abilita l'icona "senza glutine" lato menu.
- Se `allergens` contiene l'allergene `gluten`, `gluten_free` deve restare `false`.

### allergens

Colonne:

- `id text not null primary key`
- `name_it text not null`
- `name_en text not null`

### wine_categories

Colonne:

- `id text not null primary key`
- `name_it text not null`
- `name_en text not null`
- `order integer not null default 0`

### wines

Colonne:

- `id text not null primary key`
- `wine_category_id text not null`
- `name_it text not null`
- `name_en text not null`
- `producer text not null default ''`
- `origin text not null default ''`
- `abv numeric(5,2) nullable`
- `price_glass numeric(10,2) nullable`
- `price_bottle numeric(10,2) nullable`
- `order integer not null default 0`

Relazioni:

- `wine_category_id` -> `wine_categories.id`

### admin_settings

Colonne:

- `key text not null primary key`
- `value text not null`
- `updated_at timestamp with time zone not null default now()`

Uso operativo:

- contiene impostazioni server-only dell'admin;
- il PIN admin modificato dal pannello `/admina` viene salvato come hash scrypt con key `admin_password_hash`;
- se la key non esiste, il server usa il fallback `ADMIN_PASSWORD`;
- non deve essere letta o scritta dal client pubblico.

## Indici

Indici primary key:

- `allergens_pkey`
- `categories_pkey`
- `dishes_pkey`
- `sections_pkey`
- `wine_categories_pkey`
- `wines_pkey`
- `admin_settings_pkey`

Indici foreign key:

- `idx_categories_section` su `categories(section_id)`
- `idx_dishes_category` su `dishes(category_id)`
- `idx_wines_category` su `wines(wine_category_id)`

Indici operativi per menu mobile e admin:

- `idx_sections_order_id` su `sections(order, id)`
- `idx_categories_order_id` su `categories(order, id)`
- `idx_categories_section_order_id` su `categories(section_id, order, id)`
- `idx_dishes_order_id` su `dishes(order, id)`
- `idx_dishes_category_order_id` su `dishes(category_id, order, id)`
- `idx_dishes_allergens_gin` su `dishes(allergens)`
- `idx_wine_categories_order_id` su `wine_categories(order, id)`
- `idx_wines_order_id` su `wines(order, id)`
- `idx_wines_category_order_id` su `wines(wine_category_id, order, id)`

## RLS e policy

RLS attivo su tutte le tabelle:

- `allergens`
- `categories`
- `dishes`
- `sections`
- `wine_categories`
- `wines`
- `admin_settings`

Per le tabelle menu operative esistono policy `SELECT`, `INSERT`, `UPDATE`, `DELETE` limitate a:

```sql
(select auth.role()) = 'service_role'
```

Le policy sono scritte con `select auth.role()` per evitare il warning Supabase `auth_rls_initplan` e non rivalutare la funzione per ogni riga.

Implicazione operativa:

- il client anon non deve accedere direttamente alle tabelle;
- i grant diretti sulle tabelle operative sono revocati per `anon` e `authenticated`;
- le API Express devono usare `SUPABASE_SERVICE_KEY`;
- esporre la service key lato client sarebbe critico.

Per `admin_settings` esistono solo policy `SELECT`, `INSERT`, `UPDATE` per `service_role`; non serve `DELETE` runtime e non esistono policy client.

## Trigger e funzioni

Trigger rilevati: nessuno.

Funzioni nello schema `public`: nessuna.

## Gap e rischi

- `shared/schema.ts` contiene interfacce TypeScript condivise, non migrazioni o definizioni operative del database.
- Le modifiche schema nuove devono essere versionate in `supabase/migrations/` e applicate con migration Supabase verificata.
