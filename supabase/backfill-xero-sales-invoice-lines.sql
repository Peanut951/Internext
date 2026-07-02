-- Run after supabase/xero-accounting.sql.
-- Backfills Xero SalesInvoiceTemplate-compatible rows from existing paid orders.

with order_rows as (
  select
    orders.id as order_id,
    coalesce(nullif(orders.order_number, ''), orders.id) as order_number,
    orders.order_data,
    coalesce(nullif(orders.order_data ->> 'createdAt', ''), orders.created_at::text) as created_at_text,
    coalesce(orders.order_data -> 'customer', '{}'::jsonb) as customer
  from public.orders
  where coalesce(orders.order_data ->> 'paymentStatus', 'paid') = 'paid'
),
item_lines as (
  select
    order_rows.order_id,
    order_rows.order_number,
    (item.ordinality - 1)::integer as line_index,
    coalesce(
      nullif(order_rows.customer ->> 'company', ''),
      nullif(trim(concat_ws(' ', order_rows.customer ->> 'firstName', order_rows.customer ->> 'lastName')), ''),
      nullif(order_rows.customer ->> 'email', ''),
      'Internext Customer'
    ) as contact_name,
    lower(order_rows.customer ->> 'email') as email_address,
    order_rows.customer ->> 'address1' as po_address_line1,
    order_rows.customer ->> 'address2' as po_address_line2,
    ''::text as po_address_line3,
    ''::text as po_address_line4,
    order_rows.customer ->> 'suburb' as po_city,
    order_rows.customer ->> 'state' as po_region,
    order_rows.customer ->> 'postcode' as po_postal_code,
    coalesce(nullif(order_rows.customer ->> 'country', ''), 'Australia') as po_country,
    order_rows.order_number as invoice_number,
    order_rows.order_number as reference,
    coalesce(nullif(order_rows.created_at_text, '')::timestamptz::date, now()::date) as invoice_date,
    coalesce(nullif(order_rows.created_at_text, '')::timestamptz::date, now()::date) as due_date,
    left(coalesce(nullif(item.value ->> 'code', ''), nullif(item.value ->> 'supplierCode', '')), 30) as inventory_item_code,
    left(coalesce(nullif(item.value ->> 'description', ''), nullif(item.value ->> 'code', ''), 'Internext product'), 4000) as description,
    coalesce(nullif(item.value ->> 'qty', '')::numeric, 1) as quantity,
    round(
      case
        when nullif(item.value ->> 'price', '') is null then 0
        when (item.value ->> 'priceText') ~* '\mex\s*gst\M' then nullif(item.value ->> 'price', '')::numeric
        else nullif(item.value ->> 'price', '')::numeric / 1.1
      end,
      2
    ) as unit_amount,
    null::numeric as discount,
    '200'::text as account_code,
    'OUTPUT'::text as tax_type,
    ''::text as tracking_name1,
    ''::text as tracking_option1,
    ''::text as tracking_name2,
    ''::text as tracking_option2,
    'AUD'::text as currency,
    ''::text as branding_theme,
    order_rows.order_data as source_order
  from order_rows
  cross join lateral jsonb_array_elements(coalesce(order_rows.order_data -> 'items', '[]'::jsonb))
    with ordinality as item(value, ordinality)
  where nullif(item.value ->> 'price', '') is not null
    and coalesce(nullif(item.value ->> 'qty', '')::numeric, 0) > 0
),
shipping_lines as (
  select
    order_rows.order_id,
    order_rows.order_number,
    jsonb_array_length(coalesce(order_rows.order_data -> 'items', '[]'::jsonb))::integer as line_index,
    coalesce(
      nullif(order_rows.customer ->> 'company', ''),
      nullif(trim(concat_ws(' ', order_rows.customer ->> 'firstName', order_rows.customer ->> 'lastName')), ''),
      nullif(order_rows.customer ->> 'email', ''),
      'Internext Customer'
    ) as contact_name,
    lower(order_rows.customer ->> 'email') as email_address,
    order_rows.customer ->> 'address1' as po_address_line1,
    order_rows.customer ->> 'address2' as po_address_line2,
    ''::text as po_address_line3,
    ''::text as po_address_line4,
    order_rows.customer ->> 'suburb' as po_city,
    order_rows.customer ->> 'state' as po_region,
    order_rows.customer ->> 'postcode' as po_postal_code,
    coalesce(nullif(order_rows.customer ->> 'country', ''), 'Australia') as po_country,
    order_rows.order_number as invoice_number,
    order_rows.order_number as reference,
    coalesce(nullif(order_rows.created_at_text, '')::timestamptz::date, now()::date) as invoice_date,
    coalesce(nullif(order_rows.created_at_text, '')::timestamptz::date, now()::date) as due_date,
    'SHIPPING'::text as inventory_item_code,
    'Shipping and handling'::text as description,
    1::numeric as quantity,
    round((order_rows.order_data ->> 'shippingTotal')::numeric / 1.1, 2) as unit_amount,
    null::numeric as discount,
    '200'::text as account_code,
    'OUTPUT'::text as tax_type,
    ''::text as tracking_name1,
    ''::text as tracking_option1,
    ''::text as tracking_name2,
    ''::text as tracking_option2,
    'AUD'::text as currency,
    ''::text as branding_theme,
    order_rows.order_data as source_order
  from order_rows
  where coalesce(nullif(order_rows.order_data ->> 'shippingTotal', '')::numeric, 0) > 0
),
all_lines as (
  select * from item_lines
  union all
  select * from shipping_lines
)
insert into public.xero_sales_invoice_lines (
  order_id,
  order_number,
  line_index,
  contact_name,
  email_address,
  po_address_line1,
  po_address_line2,
  po_address_line3,
  po_address_line4,
  po_city,
  po_region,
  po_postal_code,
  po_country,
  invoice_number,
  reference,
  invoice_date,
  due_date,
  inventory_item_code,
  description,
  quantity,
  unit_amount,
  discount,
  account_code,
  tax_type,
  tracking_name1,
  tracking_option1,
  tracking_name2,
  tracking_option2,
  currency,
  branding_theme,
  source_order,
  updated_at
)
select
  order_id,
  order_number,
  line_index,
  contact_name,
  email_address,
  po_address_line1,
  po_address_line2,
  po_address_line3,
  po_address_line4,
  po_city,
  po_region,
  po_postal_code,
  po_country,
  invoice_number,
  reference,
  invoice_date,
  due_date,
  inventory_item_code,
  description,
  quantity,
  unit_amount,
  discount,
  account_code,
  tax_type,
  tracking_name1,
  tracking_option1,
  tracking_name2,
  tracking_option2,
  currency,
  branding_theme,
  source_order,
  now()
from all_lines
on conflict (order_id, line_index) do update
set
  order_number = excluded.order_number,
  contact_name = excluded.contact_name,
  email_address = excluded.email_address,
  po_address_line1 = excluded.po_address_line1,
  po_address_line2 = excluded.po_address_line2,
  po_address_line3 = excluded.po_address_line3,
  po_address_line4 = excluded.po_address_line4,
  po_city = excluded.po_city,
  po_region = excluded.po_region,
  po_postal_code = excluded.po_postal_code,
  po_country = excluded.po_country,
  invoice_number = excluded.invoice_number,
  reference = excluded.reference,
  invoice_date = excluded.invoice_date,
  due_date = excluded.due_date,
  inventory_item_code = excluded.inventory_item_code,
  description = excluded.description,
  quantity = excluded.quantity,
  unit_amount = excluded.unit_amount,
  discount = excluded.discount,
  account_code = excluded.account_code,
  tax_type = excluded.tax_type,
  tracking_name1 = excluded.tracking_name1,
  tracking_option1 = excluded.tracking_option1,
  tracking_name2 = excluded.tracking_name2,
  tracking_option2 = excluded.tracking_option2,
  currency = excluded.currency,
  branding_theme = excluded.branding_theme,
  source_order = excluded.source_order,
  updated_at = now();

select count(*) as xero_invoice_lines
from public.xero_sales_invoice_lines;
