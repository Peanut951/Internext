# Internext Google Ads Launch Campaign

This campaign is a paused launch configuration. Do not enable it until the purchase conversion test,
Merchant Center diagnostics, and product selection checks below have passed.

## Campaign

| Setting | Value |
| --- | --- |
| Campaign name | `Internext - PMax - AU - Launch Ready Products` |
| Status | Paused |
| Campaign type | Performance Max with Merchant Center product feed |
| Sales country | Australia |
| Locations | Australia, presence only |
| Languages | English |
| Daily budget | A$40.00 |
| Bid strategy | Maximize conversion value |
| Target ROAS | Not set during launch |
| Primary conversion | Purchase only |
| Final URL | `https://www.internext.com.au/products` |
| Final URL expansion | On, with the exclusions below |
| Text customization | On |
| Call to action | Shop now |
| Business name | Internext |

The budget creates a maximum planning exposure of about A$1,217 over an average month. Google may
spend above or below A$40 on an individual day while observing its campaign budget rules.

## Product Selection

Create one asset group named `In-stock business technology` and configure its listing group as:

1. Include products where `custom_label_3 = launch_ready`.
2. Exclude everything else.
3. Keep `custom_label_2 = in_stock` as a second reporting check.

The product feed assigns:

- `custom_label_3=launch_ready` only when the item is in stock and has complete package measurements.
- `custom_label_3=hold_not_in_stock` for backorders and out-of-stock products.
- `custom_label_3=hold_shipping_data` when package measurements need review.
- `custom_label_4` to price bands for reporting and later campaign subdivision.

Do not select all products. The catch-all `Everything else` listing group must remain excluded.

## New Customer Promotion

Create this separately in Merchant Center under **Marketing > Promotions**:

| Setting | Value |
| --- | --- |
| Promotion ID | `internext_first_order_10` |
| Title | `10% off your first Internext order` |
| Country | Australia |
| Language | English |
| Destination | Shopping ads |
| Product applicability | All products |
| Incentive | 10 percent off |
| Eligibility | First order |
| Audience | New customers |
| Minimum spend | None |
| Maximum discount | None |

The promotion must remain consistent with the website's eligibility controls. Submit it for Google
review before enabling the campaign.

## Conversion Gate

The site emits a GA4 `purchase` event with transaction ID, revenue, shipping, tax, and product items.
Before launch:

1. Complete a real or controlled test transaction.
2. Confirm one `purchase` event appears in the correct GA4 property with the correct AUD value.
3. Mark `purchase` as a GA4 key event.
4. Import it into the correct Google Ads account.
5. Set it as the only Primary purchase conversion used by this campaign.
6. Confirm the same transaction ID is not counted twice.

Do not optimize toward page views, add-to-cart events, account registrations, or contact submissions.

## Customer Acquisition

Enable the new customer acquisition goal so the first-order promotion can be used. Do not use
Google's suggested incremental value without checking it against actual repeat-order gross profit.
Use A$25 as a provisional value for the paused draft only; confirm or replace it before launch.

Add the existing-customer audience only after it contains enough correctly matched customers. The
website's first-order eligibility remains the authority for whether the discount is actually given.

## Asset Group

Import the text from `text-assets.csv`, the themes from `search-themes.csv`, and the category-level
campaign images listed in `image-assets.csv`. Mark the campaign images as AI-generated when Google
asks. Use the real product images supplied by Merchant Center for individual products; campaign
images must never replace SKU imagery or imply that a pictured generic device is a specific product.
Review every uploaded and automatically generated asset in Google Ads before enabling the campaign.

## URL Exclusions

With Final URL expansion enabled, exclude these paths:

```text
/about
/contact
/services
/support
/portal
/admin
/auth
/checkout
/cart
/privacy
/terms
```

Product and category URLs should remain eligible. Review the landing-page report after launch and
exclude any additional non-commercial URL before increasing the budget.

## Audience Signals

Add these first-party audiences when available:

- All website visitors, 180 days
- Product viewers, 90 days
- Cart and checkout abandoners, 30 days
- Previous purchasers, 540 days
- Existing customer list for new-customer recognition

Keep age, gender, household income, and device targeting unrestricted during the initial test.

## Negative Keywords

Apply the campaign-level list in `negative-keywords.csv`. Do not add broad negatives such as
`cheap`, `discount`, `small business`, or `home office`; those may remove genuine buyers.

## Launch Sequence

1. Fix every Merchant Center disapproval affecting `launch_ready` products.
2. Verify the purchase conversion and transaction-value accuracy.
3. Obtain approval for the first-order promotion.
4. Import and review campaign assets.
5. Confirm only `launch_ready` products are included.
6. Keep the campaign paused for a final billing, account, location, and URL review.
7. Enable at A$40 per day and avoid material bidding or budget changes for the first 14 days.
8. Review spend, conversion value, search terms, landing pages, products, and geographic performance.

## Decision Rules

- Never increase budget based only on clicks or impressions.
- Pause a product if price, stock, shipping, or supplier availability becomes unreliable.
- Compare performance using contribution profit after supplier cost, shipping, payment fees, the
  first-order discount, and expected returns.
- Set a target ROAS only after purchase tracking is stable and the campaign has meaningful sales data.
- Use the DataForSEO monitor to identify price gaps; do not lower prices solely to improve ad rank.

## Google References

- [Performance Max specifications](https://support.google.com/google-ads/answer/17091269)
- [Build an asset group with a Merchant Center feed](https://support.google.com/google-ads/answer/15865151)
- [Search themes](https://support.google.com/google-ads/answer/14767319)
- [Final URL expansion](https://support.google.com/google-ads/answer/16672777)
- [First-order promotions](https://support.google.com/merchants/answer/16310477)
