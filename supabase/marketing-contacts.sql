create table if not exists public.marketing_contacts (
  email text primary key,
  role text not null check (role in ('user', 'reseller', 'guest')),
  first_name text,
  last_name text,
  company text,
  phone text,
  marketing_consent boolean not null default false,
  source text,
  last_order_number text,
  last_order_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists marketing_contacts_role_idx
on public.marketing_contacts (role);

create index if not exists marketing_contacts_marketing_consent_idx
on public.marketing_contacts (marketing_consent);

create index if not exists marketing_contacts_updated_at_idx
on public.marketing_contacts (updated_at desc);

alter table public.marketing_contacts enable row level security;

drop policy if exists "Admins can read marketing contacts" on public.marketing_contacts;

create policy "Admins can read marketing contacts"
on public.marketing_contacts
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

insert into public.marketing_contacts (email, role, source, marketing_consent, updated_at)
select lower(email), role, 'profile', false, now()
from public.profiles
where role in ('user', 'reseller')
on conflict (email) do update
set role = excluded.role,
    updated_at = now();

create or replace function public.sync_profile_marketing_contact()
returns trigger
language plpgsql
security definer
as $$
begin
  if new.role not in ('user', 'reseller') then
    delete from public.marketing_contacts
    where email = lower(new.email)
      and source = 'profile';

    return new;
  end if;

  insert into public.marketing_contacts (email, role, source, marketing_consent, updated_at)
  values (lower(new.email), new.role, 'profile', false, now())
  on conflict (email) do update
  set role = excluded.role,
      updated_at = now();

  return new;
end;
$$;

drop trigger if exists sync_profile_marketing_contact_trigger on public.profiles;

create trigger sync_profile_marketing_contact_trigger
after insert or update of email, role
on public.profiles
for each row
execute function public.sync_profile_marketing_contact();
