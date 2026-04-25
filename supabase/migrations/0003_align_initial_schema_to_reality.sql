-- 0003_align_initial_schema_to_reality.sql
-- Aligns migration history with the actual deployed schema.
--
-- Background: Day 1 used the Supabase Dashboard Table Editor to create
-- tables instead of running 0001_initial_schema.sql. By the time 0001 was
-- written, the deployed schema had already drifted from the file. This
-- migration brings them back into agreement so a fresh clone of this repo
-- can run 0001 + 0002 + 0003 and reproduce production.
--
-- This file is intentionally idempotent and uses guarded ALTERs so it is
-- a no-op against the current production database.

-- 1) `content` exists on prod (created accidentally) but not in 0001.
--    Add it on fresh clones so they match prod.
alter table public.quotes
  add column if not exists content text;

-- 2) Production has already dropped the NOT NULL on `content`.
--    Re-assert it for fresh clones; safe to run repeatedly.
alter table public.quotes
  alter column content drop not null;

-- 3) Three columns from 0001 were never created on prod and are unused by
--    application code (see src/app/inquiries/actions.ts insert payload).
--    Drop them on fresh clones to match prod.
alter table public.quotes drop column if exists quote_number;
alter table public.quotes drop column if exists valid_until;
alter table public.quotes drop column if exists notes;

-- 4) 0001 declares `tax`; prod has it as `gst`. Rename only when the fresh-
--    clone shape is present (tax exists, gst missing). Guarded so prod
--    (which is already gst) is not touched.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name   = 'quotes'
      and column_name  = 'tax'
  )
  and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name   = 'quotes'
      and column_name  = 'gst'
  )
  then
    alter table public.quotes rename column tax to gst;
  end if;
end $$;

-- Note: numeric precision (subtotal/gst/total are numeric(10,2) in 0001
-- but plain numeric on prod) is intentionally NOT reconciled here.
-- numeric(10,2) is the intended design; prod's unbounded numeric is a
-- legacy artifact of the Dashboard click-build. Documented in README.
