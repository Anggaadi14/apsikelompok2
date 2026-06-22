-- Denormalized copy of the Supabase Auth email on app_user. The admin API
-- (supabase-js v2) has no clean "get auth user by email" lookup, and this
-- table is admin-only (RLS blocks anon/authenticated entirely — see 0002),
-- so keeping email here for server-side lookups (signup dedupe, etc.) does
-- not reintroduce any exposure.
alter table app_user
  add column email varchar(150) null unique;
