create table if not exists public.xero_inventory_items (
  item_code text primary key,
  item_name text not null,
  purchases_description text,
  purchases_unit_price numeric(12, 2),
  purchases_account text,
  purchases_tax_rate text,
  sales_description text,
  sales_unit_price numeric(12, 2),
  sales_account text,
  sales_tax_rate text,
  inventory_asset_account text,
  cost_of_goods_sold_account text,
  source text,
  product_data jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists xero_inventory_items_item_name_idx
on public.xero_inventory_items (item_name);

create index if not exists xero_inventory_items_updated_at_idx
on public.xero_inventory_items (updated_at desc);

alter table public.xero_inventory_items enable row level security;

drop policy if exists "Admins can read Xero inventory items" on public.xero_inventory_items;

create policy "Admins can read Xero inventory items"
on public.xero_inventory_items
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

create or replace view public.xero_inventory_items_csv as
select
  item_code as "ItemCode",
  item_name as "ItemName",
  purchases_description as "PurchasesDescription",
  purchases_unit_price as "PurchasesUnitPrice",
  purchases_account as "PurchasesAccount",
  purchases_tax_rate as "PurchasesTaxRate",
  sales_description as "SalesDescription",
  sales_unit_price as "SalesUnitPrice",
  sales_account as "SalesAccount",
  sales_tax_rate as "SalesTaxRate",
  inventory_asset_account as "InventoryAssetAccount",
  cost_of_goods_sold_account as "CostOfGoodsSoldAccount"
from public.xero_inventory_items;

create table if not exists public.xero_sales_invoice_lines (
  id bigserial primary key,
  order_id text not null,
  order_number text not null,
  line_index integer not null,
  contact_name text not null,
  email_address text,
  po_address_line1 text,
  po_address_line2 text,
  po_address_line3 text,
  po_address_line4 text,
  po_city text,
  po_region text,
  po_postal_code text,
  po_country text,
  invoice_number text not null,
  reference text,
  invoice_date date not null,
  due_date date not null,
  inventory_item_code text,
  description text not null,
  quantity numeric(12, 4) not null,
  unit_amount numeric(12, 2) not null,
  discount numeric(12, 2),
  account_code text not null,
  tax_type text not null,
  tracking_name1 text,
  tracking_option1 text,
  tracking_name2 text,
  tracking_option2 text,
  currency text not null default 'AUD',
  branding_theme text,
  source_order jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (order_id, line_index)
);

create index if not exists xero_sales_invoice_lines_order_number_idx
on public.xero_sales_invoice_lines (order_number);

create index if not exists xero_sales_invoice_lines_invoice_number_idx
on public.xero_sales_invoice_lines (invoice_number);

create index if not exists xero_sales_invoice_lines_created_at_idx
on public.xero_sales_invoice_lines (created_at desc);

alter table public.xero_sales_invoice_lines enable row level security;

drop policy if exists "Admins can read Xero sales invoice lines" on public.xero_sales_invoice_lines;

create policy "Admins can read Xero sales invoice lines"
on public.xero_sales_invoice_lines
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

create or replace view public.xero_sales_invoice_template_csv as
select
  contact_name as "*ContactName",
  email_address as "EmailAddress",
  po_address_line1 as "POAddressLine1",
  po_address_line2 as "POAddressLine2",
  po_address_line3 as "POAddressLine3",
  po_address_line4 as "POAddressLine4",
  po_city as "POCity",
  po_region as "PORegion",
  po_postal_code as "POPostalCode",
  po_country as "POCountry",
  invoice_number as "*InvoiceNumber",
  reference as "Reference",
  invoice_date as "*InvoiceDate",
  due_date as "*DueDate",
  inventory_item_code as "InventoryItemCode",
  description as "*Description",
  quantity as "*Quantity",
  unit_amount as "*UnitAmount",
  discount as "Discount",
  account_code as "*AccountCode",
  tax_type as "*TaxType",
  tracking_name1 as "TrackingName1",
  tracking_option1 as "TrackingOption1",
  tracking_name2 as "TrackingName2",
  tracking_option2 as "TrackingOption2",
  currency as "Currency",
  branding_theme as "BrandingTheme"
from public.xero_sales_invoice_lines
order by order_number, line_index;
