create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  role text not null check (role in ('admin', 'reseller')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can view their own profile"
on public.profiles
for select
to authenticated
using (auth.uid() = id);

insert into public.profiles (id, email, role)
select id, email, 'admin'
from auth.users
where email = 'admin@internext.com.au'
on conflict (id) do update
set email = excluded.email,
    role = excluded.role,
    updated_at = now();

insert into public.profiles (id, email, role)
select id, email, 'reseller'
from auth.users
where email = 'reseller@internext.com.au'
on conflict (id) do update
set email = excluded.email,
    role = excluded.role,
    updated_at = now();
