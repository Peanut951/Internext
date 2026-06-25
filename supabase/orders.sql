create table if not exists public.orders (
  id text primary key,
  order_number text not null,
  reseller_email text,
  reseller_user_id text,
  customer_email text,
  fulfillment_status text,
  supplier_status text,
  order_data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists orders_created_at_idx
on public.orders (created_at desc);

create index if not exists orders_reseller_email_idx
on public.orders (reseller_email);

create index if not exists orders_reseller_user_id_idx
on public.orders (reseller_user_id);

create index if not exists orders_customer_email_idx
on public.orders (customer_email);

alter table public.orders enable row level security;

drop policy if exists "Admins can read all orders" on public.orders;
drop policy if exists "Users can read their own orders" on public.orders;

create policy "Admins can read all orders"
on public.orders
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

create policy "Users can read their own orders"
on public.orders
for select
to authenticated
using (
  reseller_user_id = auth.uid()::text
  or lower(reseller_email) = lower(auth.jwt() ->> 'email')
  or lower(customer_email) = lower(auth.jwt() ->> 'email')
);
