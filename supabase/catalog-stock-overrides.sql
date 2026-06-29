create table if not exists public.catalog_stock_overrides (
  code text primary key,
  supplier_code text,
  stock_quantity integer not null default 0 check (stock_quantity >= 0),
  note text,
  updated_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists catalog_stock_overrides_supplier_code_idx
on public.catalog_stock_overrides (supplier_code);

create index if not exists catalog_stock_overrides_stock_quantity_idx
on public.catalog_stock_overrides (stock_quantity);

alter table public.catalog_stock_overrides enable row level security;

drop policy if exists "Admins can read catalog stock overrides" on public.catalog_stock_overrides;

create policy "Admins can read catalog stock overrides"
on public.catalog_stock_overrides
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'admin'
  )
);
