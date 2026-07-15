drop policy if exists "admin_settings_service_role_select" on public.admin_settings;
drop policy if exists "admin_settings_service_role_insert" on public.admin_settings;
drop policy if exists "admin_settings_service_role_update" on public.admin_settings;

create policy "admin_settings_service_role_select"
on public.admin_settings
for select
to service_role
using ((select auth.role()) = 'service_role');

create policy "admin_settings_service_role_insert"
on public.admin_settings
for insert
to service_role
with check ((select auth.role()) = 'service_role');

create policy "admin_settings_service_role_update"
on public.admin_settings
for update
to service_role
using ((select auth.role()) = 'service_role')
with check ((select auth.role()) = 'service_role');
