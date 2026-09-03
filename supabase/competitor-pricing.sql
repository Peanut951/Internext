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
  provider text check (provider is null or provider in ('prisync', 'price2spy', 'dataforseo')),
  provider_seller_id text,
  verification_note text,
  verified_by text,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.competitor_sellers
  add column if not exists provider text,
  add column if not exists provider_seller_id text;

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
  provider text check (provider is null or provider in ('prisync', 'price2spy', 'dataforseo')),
  provider_product_id text,
  provider_listing_id text,
  observed_at timestamptz not null,
  expires_at timestamptz not null check (expires_at > observed_at),
  created_at timestamptz not null default now()
);

alter table public.competitor_price_observations
  add column if not exists provider text,
  add column if not exists provider_product_id text,
  add column if not exists provider_listing_id text;

create unique index if not exists competitor_observations_provider_listing_time_idx
on public.competitor_price_observations (provider, provider_listing_id, observed_at);

create index if not exists competitor_observations_product_idx
on public.competitor_price_observations (lower(product_code), expires_at desc);

create index if not exists competitor_observations_supplier_code_idx
on public.competitor_price_observations (lower(supplier_code), expires_at desc);

create index if not exists competitor_observations_seller_idx
on public.competitor_price_observations (seller_id, observed_at desc);

create table if not exists public.competitor_discovery_candidates (
  id uuid primary key default gen_random_uuid(),
  provider text not null check (provider in ('prisync', 'price2spy', 'dataforseo')),
  provider_product_id text,
  provider_listing_id text not null,
  product_code text not null,
  supplier_code text,
  seller_name text not null,
  seller_domain text not null,
  competitor_product_url text not null check (competitor_product_url ~ '^https://'),
  observed_price_inc_gst numeric(12, 2) not null check (observed_price_inc_gst > 0),
  observed_shipping_inc_gst numeric(12, 2) not null default 0
    check (observed_shipping_inc_gst >= 0),
  currency text not null,
  in_stock boolean not null default false,
  match_method text check (match_method is null or match_method in ('gtin', 'brand_mpn', 'manual_verified')),
  review_reason text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reviewed_by text,
  reviewed_at timestamptz,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists competitor_candidates_provider_listing_product_idx
on public.competitor_discovery_candidates (provider, provider_listing_id, product_code);

create index if not exists competitor_candidates_review_idx
on public.competitor_discovery_candidates (status, review_reason, last_seen_at desc);

create table if not exists public.competitor_provider_sync_runs (
  id uuid primary key,
  provider text not null check (provider in ('prisync', 'price2spy', 'dataforseo')),
  status text not null check (status in ('running', 'completed', 'failed')),
  products_read integer not null default 0,
  listings_read integer not null default 0,
  observations_stored integer not null default 0,
  candidates_stored integer not null default 0,
  ignored_own_listings integer not null default 0,
  requests_made integer not null default 0,
  error_message text,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists competitor_provider_sync_runs_started_idx
on public.competitor_provider_sync_runs (started_at desc);

create table if not exists public.competitor_provider_sync_state (
  provider text primary key check (provider in ('prisync', 'price2spy', 'dataforseo')),
  cursor text,
  last_success_at timestamptz,
  updated_at timestamptz not null default now()
);

-- Re-running this migration upgrades installations created before DataForSEO support.
alter table public.competitor_sellers drop constraint if exists competitor_sellers_provider_check;
alter table public.competitor_sellers add constraint competitor_sellers_provider_check
  check (provider is null or provider in ('prisync', 'price2spy', 'dataforseo'));
alter table public.competitor_price_observations drop constraint if exists competitor_price_observations_provider_check;
alter table public.competitor_price_observations add constraint competitor_price_observations_provider_check
  check (provider is null or provider in ('prisync', 'price2spy', 'dataforseo'));
alter table public.competitor_discovery_candidates drop constraint if exists competitor_discovery_candidates_provider_check;
alter table public.competitor_discovery_candidates add constraint competitor_discovery_candidates_provider_check
  check (provider in ('prisync', 'price2spy', 'dataforseo'));
alter table public.competitor_provider_sync_runs drop constraint if exists competitor_provider_sync_runs_provider_check;
alter table public.competitor_provider_sync_runs add constraint competitor_provider_sync_runs_provider_check
  check (provider in ('prisync', 'price2spy', 'dataforseo'));
alter table public.competitor_provider_sync_state drop constraint if exists competitor_provider_sync_state_provider_check;
alter table public.competitor_provider_sync_state add constraint competitor_provider_sync_state_provider_check
  check (provider in ('prisync', 'price2spy', 'dataforseo'));

create table if not exists public.competitor_product_controls (
  product_code text primary key check (length(trim(product_code)) > 0),
  mode text not null default 'monitor_only'
    check (mode in ('monitor_only', 'automatic', 'excluded')),
  reason text,
  updated_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists competitor_product_controls_mode_idx
on public.competitor_product_controls (mode, lower(product_code));

create table if not exists public.competitor_product_matches (
  id uuid primary key default gen_random_uuid(),
  provider text not null check (provider = 'dataforseo'),
  product_code text not null check (length(trim(product_code)) > 0),
  provider_product_id text not null check (length(trim(provider_product_id)) > 0),
  provider_product_name text,
  match_method text not null check (match_method in ('gtin', 'brand_mpn')),
  verified boolean not null default true,
  verified_at timestamptz not null,
  last_seen_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists competitor_product_matches_provider_product_idx
on public.competitor_product_matches (provider, product_code);

create index if not exists competitor_product_matches_provider_id_idx
on public.competitor_product_matches (provider, provider_product_id);

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
join public.competitor_product_controls control
  on lower(control.product_code) = lower(recommendation.product_code)
where settings.enabled = true
  and control.mode = 'automatic'
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
alter table public.competitor_discovery_candidates enable row level security;
alter table public.competitor_provider_sync_runs enable row level security;
alter table public.competitor_provider_sync_state enable row level security;
alter table public.competitor_product_controls enable row level security;
alter table public.competitor_product_matches enable row level security;
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

drop policy if exists "Admins can read competitor discovery candidates"
on public.competitor_discovery_candidates;
create policy "Admins can read competitor discovery candidates"
on public.competitor_discovery_candidates for select to authenticated
using (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

drop policy if exists "Admins can read competitor provider sync runs"
on public.competitor_provider_sync_runs;
create policy "Admins can read competitor provider sync runs"
on public.competitor_provider_sync_runs for select to authenticated
using (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

drop policy if exists "Admins can read competitor provider sync state"
on public.competitor_provider_sync_state;
create policy "Admins can read competitor provider sync state"
on public.competitor_provider_sync_state for select to authenticated
using (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

drop policy if exists "Admins can read competitor product controls"
on public.competitor_product_controls;
create policy "Admins can read competitor product controls"
on public.competitor_product_controls for select to authenticated
using (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

drop policy if exists "Admins can read competitor product matches"
on public.competitor_product_matches;
create policy "Admins can read competitor product matches"
on public.competitor_product_matches for select to authenticated
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
grant select on public.competitor_discovery_candidates to authenticated;
grant select on public.competitor_provider_sync_runs to authenticated;
grant select on public.competitor_provider_sync_state to authenticated;
grant select on public.competitor_product_controls to authenticated;
grant select on public.competitor_product_matches to authenticated;
grant select on public.competitor_price_recommendations to authenticated;
grant select on public.competitor_price_audit_log to authenticated;
grant all on public.competitor_pricing_settings to service_role;
grant all on public.competitor_sellers to service_role;
grant all on public.competitor_price_observations to service_role;
grant all on public.competitor_discovery_candidates to service_role;
grant all on public.competitor_provider_sync_runs to service_role;
grant all on public.competitor_provider_sync_state to service_role;
grant all on public.competitor_product_controls to service_role;
grant all on public.competitor_product_matches to service_role;
grant all on public.competitor_price_recommendations to service_role;
grant all on public.competitor_price_audit_log to service_role;
grant select on public.active_competitor_price_recommendations to service_role;

notify pgrst, 'reload schema';
