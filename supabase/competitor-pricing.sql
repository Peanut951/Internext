-- Staged competitor-aware pricing. Nothing in this migration enables customer pricing.
-- Runtime activation also requires COMPETITOR_PRICING_MODE=active on the server.

create extension if not exists pgcrypto;

create table if not exists public.competitor_pricing_settings (
  id boolean primary key default true check (id),
  enabled boolean not null default false,
  undercut_amount_inc_gst numeric(12, 2) not null default 1.00
    check (undercut_amount_inc_gst > 0),
  observation_max_age_hours integer not null default 24
    check (observation_max_age_hours between 1 and 168),
  note text,
  updated_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.competitor_pricing_settings (id, enabled)
values (true, false)
on conflict (id) do nothing;

create table if not exists public.competitor_sellers (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) > 0),
  domain text not null check (length(trim(domain)) > 0),
  verified boolean not null default false,
  enabled boolean not null default true,
  verification_note text,
  verified_by text,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists competitor_sellers_domain_unique_idx
on public.competitor_sellers (lower(domain));

create index if not exists competitor_sellers_active_idx
on public.competitor_sellers (verified, enabled);

create table if not exists public.competitor_price_observations (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.competitor_sellers(id) on delete restrict,
  product_code text not null check (length(trim(product_code)) > 0),
  supplier_code text,
  brand text not null check (length(trim(brand)) > 0),
  mpn text,
  gtin text,
  competitor_product_url text not null check (competitor_product_url ~ '^https://'),
  item_price_inc_gst numeric(12, 2) not null check (item_price_inc_gst > 0),
  shipping_price_inc_gst numeric(12, 2) not null default 0
    check (shipping_price_inc_gst >= 0),
  landed_price_inc_gst numeric(12, 2)
    generated always as (item_price_inc_gst + shipping_price_inc_gst) stored,
  price_includes_gst boolean not null default false,
  shipping_verified boolean not null default false,
  in_stock boolean not null default false,
  match_method text not null
    check (match_method in ('gtin', 'brand_mpn', 'manual_verified')),
  match_verified boolean not null default false,
  match_verified_by text,
  source text not null check (length(trim(source)) > 0),
  source_reference text,
  observed_at timestamptz not null,
  expires_at timestamptz not null check (expires_at > observed_at),
  created_at timestamptz not null default now()
);

create index if not exists competitor_observations_product_idx
on public.competitor_price_observations (lower(product_code), expires_at desc);

create index if not exists competitor_observations_supplier_code_idx
on public.competitor_price_observations (lower(supplier_code), expires_at desc);

create index if not exists competitor_observations_seller_idx
on public.competitor_price_observations (seller_id, observed_at desc);

create table if not exists public.competitor_price_recommendations (
  id uuid primary key default gen_random_uuid(),
  product_code text not null check (length(trim(product_code)) > 0),
  supplier_code text,
  observation_id uuid not null
    references public.competitor_price_observations(id) on delete restrict,
  standard_price_inc_gst numeric(12, 2) not null check (standard_price_inc_gst > 0),
  minimum_allowed_price_inc_gst numeric(12, 2) not null
    check (minimum_allowed_price_inc_gst > 0),
  competitor_price_inc_gst numeric(12, 2) not null check (competitor_price_inc_gst > 0),
  recommended_price_inc_gst numeric(12, 2) not null
    check (recommended_price_inc_gst > 0),
  undercut_amount_inc_gst numeric(12, 2) not null default 1.00
    check (undercut_amount_inc_gst > 0),
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected', 'expired')),
  decision_note text,
  decided_by text,
  decided_at timestamptz,
  generated_at timestamptz not null default now(),
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (recommended_price_inc_gst < standard_price_inc_gst),
  check (recommended_price_inc_gst >= minimum_allowed_price_inc_gst),
  check (recommended_price_inc_gst = competitor_price_inc_gst - undercut_amount_inc_gst)
);

create unique index if not exists competitor_recommendations_one_open_product_idx
on public.competitor_price_recommendations (lower(product_code))
where status in ('pending', 'approved');

create index if not exists competitor_recommendations_status_idx
on public.competitor_price_recommendations (status, expires_at);

create table if not exists public.competitor_price_audit_log (
  id bigint generated always as identity primary key,
  product_code text not null,
  recommendation_id uuid references public.competitor_price_recommendations(id) on delete set null,
  event_type text not null
    check (event_type in ('generated', 'approved', 'rejected', 'activated', 'expired', 'reverted')),
  previous_price_inc_gst numeric(12, 2),
  adjusted_price_inc_gst numeric(12, 2),
  metadata jsonb not null default '{}'::jsonb,
  actor text,
  created_at timestamptz not null default now()
);

create index if not exists competitor_price_audit_product_idx
on public.competitor_price_audit_log (lower(product_code), created_at desc);

create or replace view public.active_competitor_price_recommendations
with (security_invoker = true)
as
select
  recommendation.id,
  recommendation.product_code,
  recommendation.supplier_code,
  recommendation.standard_price_inc_gst,
  recommendation.minimum_allowed_price_inc_gst,
  recommendation.competitor_price_inc_gst,
  recommendation.recommended_price_inc_gst,
  recommendation.undercut_amount_inc_gst,
  recommendation.expires_at,
  observation.observed_at,
  observation.competitor_product_url,
  observation.match_method,
  seller.id as seller_id,
  seller.name as seller_name
from public.competitor_price_recommendations recommendation
join public.competitor_price_observations observation
  on observation.id = recommendation.observation_id
join public.competitor_sellers seller
  on seller.id = observation.seller_id
join public.competitor_pricing_settings settings
  on settings.id = true
where settings.enabled = true
  and recommendation.status = 'approved'
  and recommendation.expires_at > now()
  and observation.expires_at > now()
  and observation.observed_at >= now() - make_interval(hours => settings.observation_max_age_hours)
  and observation.in_stock = true
  and observation.price_includes_gst = true
  and observation.shipping_verified = true
  and observation.match_verified = true
  and observation.match_method in ('gtin', 'brand_mpn', 'manual_verified')
  and seller.verified = true
  and seller.enabled = true
  and recommendation.competitor_price_inc_gst = observation.landed_price_inc_gst
  and recommendation.recommended_price_inc_gst =
    observation.landed_price_inc_gst - recommendation.undercut_amount_inc_gst;

alter table public.competitor_pricing_settings enable row level security;
alter table public.competitor_sellers enable row level security;
alter table public.competitor_price_observations enable row level security;
alter table public.competitor_price_recommendations enable row level security;
alter table public.competitor_price_audit_log enable row level security;

drop policy if exists "Admins can read competitor pricing settings"
on public.competitor_pricing_settings;
create policy "Admins can read competitor pricing settings"
on public.competitor_pricing_settings for select to authenticated
using (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

drop policy if exists "Admins can read competitor sellers"
on public.competitor_sellers;
create policy "Admins can read competitor sellers"
on public.competitor_sellers for select to authenticated
using (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

drop policy if exists "Admins can read competitor observations"
on public.competitor_price_observations;
create policy "Admins can read competitor observations"
on public.competitor_price_observations for select to authenticated
using (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

drop policy if exists "Admins can read competitor recommendations"
on public.competitor_price_recommendations;
create policy "Admins can read competitor recommendations"
on public.competitor_price_recommendations for select to authenticated
using (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

drop policy if exists "Admins can read competitor price audit log"
on public.competitor_price_audit_log;
create policy "Admins can read competitor price audit log"
on public.competitor_price_audit_log for select to authenticated
using (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

revoke all on public.active_competitor_price_recommendations from anon, authenticated;
grant select on public.competitor_pricing_settings to authenticated;
grant select on public.competitor_sellers to authenticated;
grant select on public.competitor_price_observations to authenticated;
grant select on public.competitor_price_recommendations to authenticated;
grant select on public.competitor_price_audit_log to authenticated;
grant all on public.competitor_pricing_settings to service_role;
grant all on public.competitor_sellers to service_role;
grant all on public.competitor_price_observations to service_role;
grant all on public.competitor_price_recommendations to service_role;
grant all on public.competitor_price_audit_log to service_role;
grant select on public.active_competitor_price_recommendations to service_role;

notify pgrst, 'reload schema';
