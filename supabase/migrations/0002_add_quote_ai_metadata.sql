-- 0002_add_quote_ai_metadata.sql
-- Add AI generation metadata to quotes table.
-- Tracks model used, token usage (for cost attribution), and assumptions (for audit).
-- All columns are nullable for backwards compatibility with existing rows.

alter table public.quotes
  add column if not exists assumptions text[] not null default '{}',
  add column if not exists model_used text,
  add column if not exists input_tokens integer,
  add column if not exists output_tokens integer;

-- Index for cost analysis queries (e.g. "how many quotes per model").
create index if not exists idx_quotes_model_used
  on public.quotes(model_used);

-- Sanity check on token counts: must be non-negative when present.
alter table public.quotes
  drop constraint if exists quotes_input_tokens_nonneg;
alter table public.quotes
  add constraint quotes_input_tokens_nonneg
  check (input_tokens is null or input_tokens >= 0);

alter table public.quotes
  drop constraint if exists quotes_output_tokens_nonneg;
alter table public.quotes
  add constraint quotes_output_tokens_nonneg
  check (output_tokens is null or output_tokens >= 0);