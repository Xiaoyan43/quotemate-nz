-- QuoteMate NZ initial schema

-- 1) Updated-at helper
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

-- 2) Core tables
create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  phone text,
  email text,
  address text,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.inquiries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete set null,
  title text not null,
  description text,
  budget_min numeric(10,2),
  budget_max numeric(10,2),
  status text not null default 'new'
    check (status in ('new', 'quoted', 'accepted', 'declined', 'archived')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.quotes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  inquiry_id uuid not null references public.inquiries(id) on delete cascade,
  quote_number text,
  line_items jsonb not null default '[]'::jsonb,
  subtotal numeric(10,2),
  tax numeric(10,2),
  total numeric(10,2),
  status text not null default 'draft'
    check (status in ('draft', 'sent', 'accepted', 'declined')),
  valid_until date,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

-- 3) Indexes
create index if not exists idx_customers_user_id on public.customers(user_id);
create index if not exists idx_inquiries_user_id on public.inquiries(user_id);
create index if not exists idx_inquiries_customer_id on public.inquiries(customer_id);
create index if not exists idx_inquiries_status on public.inquiries(status);
create index if not exists idx_quotes_user_id on public.quotes(user_id);
create index if not exists idx_quotes_inquiry_id on public.quotes(inquiry_id);
create index if not exists idx_quotes_status on public.quotes(status);

-- 4) Updated-at triggers
drop trigger if exists trg_customers_set_updated_at on public.customers;
create trigger trg_customers_set_updated_at
before update on public.customers
for each row
execute function public.set_updated_at();

drop trigger if exists trg_inquiries_set_updated_at on public.inquiries;
create trigger trg_inquiries_set_updated_at
before update on public.inquiries
for each row
execute function public.set_updated_at();

drop trigger if exists trg_quotes_set_updated_at on public.quotes;
create trigger trg_quotes_set_updated_at
before update on public.quotes
for each row
execute function public.set_updated_at();

-- 5) RLS
alter table public.customers enable row level security;
alter table public.inquiries enable row level security;
alter table public.quotes enable row level security;

-- customers policies (select / insert / update / delete)
drop policy if exists "customers_select_own" on public.customers;
create policy "customers_select_own"
on public.customers
for select
using (auth.uid() = user_id);

drop policy if exists "customers_insert_own" on public.customers;
create policy "customers_insert_own"
on public.customers
for insert
with check (auth.uid() = user_id);

drop policy if exists "customers_update_own" on public.customers;
create policy "customers_update_own"
on public.customers
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "customers_delete_own" on public.customers;
create policy "customers_delete_own"
on public.customers
for delete
using (auth.uid() = user_id);

-- inquiries policies (select / insert / update / delete)
drop policy if exists "inquiries_select_own" on public.inquiries;
create policy "inquiries_select_own"
on public.inquiries
for select
using (auth.uid() = user_id);

drop policy if exists "inquiries_insert_own" on public.inquiries;
create policy "inquiries_insert_own"
on public.inquiries
for insert
with check (auth.uid() = user_id);

drop policy if exists "inquiries_update_own" on public.inquiries;
create policy "inquiries_update_own"
on public.inquiries
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "inquiries_delete_own" on public.inquiries;
create policy "inquiries_delete_own"
on public.inquiries
for delete
using (auth.uid() = user_id);

-- quotes policies (select / insert / update / delete)
drop policy if exists "quotes_select_own" on public.quotes;
create policy "quotes_select_own"
on public.quotes
for select
using (auth.uid() = user_id);

drop policy if exists "quotes_insert_own" on public.quotes;
create policy "quotes_insert_own"
on public.quotes
for insert
with check (auth.uid() = user_id);

drop policy if exists "quotes_update_own" on public.quotes;
create policy "quotes_update_own"
on public.quotes
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "quotes_delete_own" on public.quotes;
create policy "quotes_delete_own"
on public.quotes
for delete
using (auth.uid() = user_id);
