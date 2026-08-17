create table if not exists public.catalog_shipping_measurements (
  code text primary key,
  supplier_code text,
  weight_kg numeric(12, 3) not null check (weight_kg > 0),
  height_cm numeric(12, 2) not null check (height_cm > 0),
  width_cm numeric(12, 2) not null check (width_cm > 0),
  depth_cm numeric(12, 2) not null check (depth_cm > 0),
  source text not null check (length(trim(source)) > 0),
  source_reference text,
  confidence text not null check (confidence in ('verified', 'high', 'medium', 'low')),
  note text,
  updated_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists catalog_shipping_measurements_supplier_code_idx
on public.catalog_shipping_measurements (supplier_code);

create index if not exists catalog_shipping_measurements_confidence_idx
on public.catalog_shipping_measurements (confidence);

create index if not exists catalog_shipping_measurements_updated_at_idx
on public.catalog_shipping_measurements (updated_at desc);

alter table public.catalog_shipping_measurements enable row level security;

drop policy if exists "Admins can read catalog shipping measurements"
on public.catalog_shipping_measurements;

create policy "Admins can read catalog shipping measurements"
on public.catalog_shipping_measurements
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

grant select on public.catalog_shipping_measurements to authenticated;
grant all on public.catalog_shipping_measurements to service_role;
