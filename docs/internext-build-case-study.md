# Building Internext from Nothing: A First-Person Technical and Commercial Case Study

## Executive Summary

I built Internext from nothing into an Australian technology distribution website with a public catalogue, accounts, checkout, shipping, shared orders, invoices, marketing consent, Google listings, and accounting-ready exports. It became a connected commerce system spanning supplier data, pricing, stock, freight, payments, administration, search, and customer trust.

The most important lesson was that a distribution website is only as reliable as its data and controls. A polished page is useless if both suppliers removed the product. Checkout is dangerous if prices change, freight is untrustworthy with invented dimensions, and an admin dashboard fails if orders exist only in one browser. I replaced these shortcuts with defensible source-of-truth processes.

Internext now has supplier-backed catalogue checks, price validation, Stripe confirmation, Supabase orders, multi-shipment tracking, Xero-ready lines, responsive emails, Google Merchant output, static SEO pages, promotion controls, and shipping confidence tracking. Audits cover catalogue integrity, shipping, SEO, TypeScript, and production builds.

The system is not finished. The latest catalogue audit identifies 11 unsupported customer-facing entries. The shipping audit finds 1,359 of 6,551 physical products missing at least one supplier measurement, with 1,284 using a category fallback. Google recovery depends on recrawling. Direct Xero API integration, Microsoft shared-mailbox status, Stripe live mode, commercial results, and exact dates are `To be confirmed` where the repository cannot prove them.

## 1. The Starting Point

I started Internext with an ambitious but straightforward business objective: create a professional online channel for an Australian IP product technology distributor. The site needed to serve ordinary customers, resellers, guest purchasers, and internal administrators. It also had to represent a large and changing product range supplied through Alloys and Leader rather than a small catalogue maintained manually.

At the beginning, there was no complete operating platform. I needed to establish how products would enter the catalogue, how prices and stock would remain current, how customers would check out, how orders would reach staff, how shipping would be priced, and how an administrator could work from another computer.

The frontend uses React, TypeScript, and Vite. Vercel hosts the site and serverless APIs. Supabase provides authentication and persistent data. Stripe handles payments. Power Automate connects order events to Microsoft email. Alloys and Leader provide catalogue inputs, Australia Post quotes eligible parcels, Google Merchant receives product data, and Xero-compatible formats support accounting hand-off.

I first treated product data as content to import and display. In practice, every field carried business meaning: price affected margin, stock affected the promise to supply, dimensions affected freight, titles affected discovery, and supplier status determined whether Internext should sell the item. The project became a controlled data pipeline, not merely a storefront.

## 2. Foundation and Architecture

I structured Internext as a React single-page application backed by serverless endpoints. This gave me a responsive customer interface while keeping sensitive payment, supplier, and database operations on the server. TypeScript became important because the same order and product concepts pass through many boundaries: browser state, API payloads, Supabase rows, Stripe metadata, Power Automate requests, and generated files.

The public application includes home, product, category, brand, search, legal, support, reseller, authentication, cart, and checkout routes. Protected areas include the customer or reseller portal and administration. Serverless endpoints handle live catalogue operations, checkout session creation and confirmation, order notifications, reseller applications, stock overrides, shipping measurements, and other integration responsibilities.

I used Supabase as the shared source for information that must survive browsers and devices. It stores profiles, orders, marketing contacts, stock overrides, shipping measurement corrections, and Xero-ready data. Row-level security is used so ordinary authenticated users can see only their own orders while an authenticated profile with the `admin` role can see all orders. Administrative tables are not exposed as public write surfaces.

Vercel is more than hosting in this architecture. Its build process generates the Google product feed, sitemap, static route pages, the Vite application, and static product pages. This makes build-time data quality a production concern. If a required generated file is missing, or build and runtime filtering disagree, a deployment can fail or stale products can remain discoverable. I therefore added defensive file handling and audit scripts instead of assuming every generated artefact would always exist.

The architecture separates display state from transaction checks. Before creating a Stripe session, the server confirms that each product is still supplied, has a verified price, has sufficient stock, and matches the submitted price. A stale page or manipulated request cannot become an incorrect charge.

## 3. Catalogue and Supplier Integration

The catalogue became the largest technical and operational area of the project. Internext combines products from Alloys and Leader, then normalises fields that arrive with different structures and levels of completeness. I built supplier adapters and a merged catalogue model covering identifiers, supplier source, manufacturer, title, description, images, cost and sell pricing, RRP, stock by location, ETA, dimensions, weight, and category information.

The first difficult issue was distinguishing a currently supplied product from an old product record. Historical enrichment files, cached snapshots, generated files, browser caches, PDF-derived records, and runtime responses could all make a product appear legitimate after its source had disappeared. One example was a Grandstream GWN7802P record that appeared, disappeared, and then returned even though it could not be found in either current supplier catalogue. Another customer found a Sony display that raised the same concern. These were not cosmetic defects. If a customer could pay for an unsupported product, Internext might be unable to fulfil the order.

I introduced catalogue-integrity rules across customer-facing outputs. Products should be eligible only when backed by a current verifiable Alloys or Leader record, or by an explicitly controlled quote-product path. Unsupported entries must be excluded from search, categories, brand pages, product pages, recommendations, Google Merchant, sitemap generation, static pages, and checkout. A temporary supplier failure must not be interpreted as proof that thousands of products were deleted, so removal decisions require a complete successful supplier response rather than an empty or partial call.

I also removed known bad sources. Products created only from the Leader Q1 Catalogue 2026 PDF were removed because a catalogue document did not prove current stock or ongoing availability. Intangible items such as warranties, subscriptions, phone-service terms, renewals, licences, and other non-physical service records were excluded from the public and Google catalogues. This work reinforced a principle I now use throughout Internext: a plausible record is not the same as a verified product.

The current audit tooling checks raw enrichment data, verified supplier data, Google feed entries, sitemap products, and generated static pages. At the latest run it reported 7,589 raw enrichment products, 27 Leader enrichment products, 7,247 verified supplier products, one verified quote product, 4,943 Google feed products, and 5,905 sitemap and static product pages. It also identified 11 unsupported customer-facing entries. Those 11 remain an active integrity issue, not a completed result. The safeguards and audit now make the problem measurable and prevent me from claiming the catalogue is clean when it is not.

## 4. Product Data Quality

Supplier titles were often written for internal catalogue systems rather than customers. They could contain long strings of specifications, inconsistent capitalisation, unexplained numbers, and model codes buried in the middle. For search and buying, the model is often the most important part. A Grandstream GRP2670, for example, must clearly say `Grandstream GRP2670` rather than leading with a generic phrase such as "High End GRP Series IP Phone". An Akuvox product was shown with a long numeric identifier when the clearer market name was `Akuvox IT88 10-inch Smart Indoor Monitor`.

I developed title normalisation that prioritises manufacturer, model, product type, and a limited set of differentiating specifications. The same improved title logic feeds the website and generated Google product listings so customers do not see one good name on Google and a confusing name after clicking through. The work is rules-based and catalogue-wide rather than a one-off rename for each screenshot.

Many supplier descriptions arrived as one dense paragraph containing prose, specifications, bullets, and disclaimers. Others were so short that early generated text became repetitive. I changed the presentation to parse recognisable sections, split feature lists, preserve paragraphs, and render scannable headings and bullets.

Images required their own pipeline. Some products appeared in listings but had no image on the detail page. Others loaded late because the browser waited for runtime data. I audited image references, cleaned galleries, enriched valid image sets from supplier or product sources, and made product pages use consistent image information. Missing service-page placeholders were removed rather than showing a grey block labelled "Service Image". Where real assets are used, they must show the actual product or service context rather than a decorative substitute.

I also improved feature extraction and similar-product matching. Recommendations now consider product family, category, manufacturer, model signals, and use case. This stopped examples such as phones being compared with televisions and base stations with unrelated handsets, although recommendation quality still needs ongoing review.

## 5. Pricing and Margin Logic

Pricing required a clear distinction between supplier cost, public sell price, reseller or administrative views, RRP, GST treatment, and products that genuinely require a quote. Early problems showed how dangerous it was to display a value before its source was verified. Some product pages briefly showed `POA` and `RRP not listed`, then changed after runtime data arrived. In other cases a search result showed a price but the detail page said "Checking price". This looked unreliable and could cause a customer to make a decision using the wrong value.

I changed the flow so a payable price is not treated as authoritative merely because it was remembered by a browser or present in an old generated record. Search and product detail must use consistent supplier-backed pricing rules. Checkout then validates the current price again on the server. If the price changed, the customer is asked to refresh rather than being silently charged a different amount. If no verified online price exists, the product cannot proceed through ordinary card checkout.

The standard supplier markup was changed from 10% to 20% across Alloys and Leader products. This is a markup on cost, not the same as a 20% gross margin. For example, a cost of $100 ex GST with a 20% markup produces a sell price of $120 ex GST and a gross margin of 16.67% of sales. RRP is a separate reference and must not be invented merely to create a comparison. Public prices and admin-created invoice product suggestions use the public customer price, preventing an administrator's privileged view from accidentally producing a lower invoice.

GST presentation also needed correction. Australian customers may see prices including GST in some contexts, while accounting and invoice lines require clear ex-GST amounts. For a GST-inclusive amount, the ex-GST component is the inclusive amount divided by 1.1; it is not the same number. The invoice calculation now separates item subtotal ex GST, any discount, shipping ex GST, GST on both items and taxable shipping, and the total due. GST is shown last among the cost components because it represents the tax across the taxable charges.

Bulky or supplier-quote products are handled cautiously. A projector screen displayed at $2,015 including GST even though Alloys said "Call for Pricing" and also required a freight quote. That exposed the risk of using an old or inferred price for a current quote-only product. The correct behaviour is to mark genuinely unpriced large products as requiring contact or quote information and explain that obtaining price and freight confirmation may take time. Internext should never turn an RRP, stale price, or unrelated product value into a payable sell price.

## 6. Stock and Availability

Stock sounds simple until multiple suppliers, warehouses, overrides, and cache layers are involved. I needed the total available stock to equal the sum of valid location values, including Western Australia where provided. I also needed to avoid combining duplicate supplier records or mismatching models. Problems such as a DP755 showing 55 units when Alloys had 26, or a GRP2650 first appearing in stock and then changing to out of stock, showed that the first rendered value and the refreshed value were not following the same rules.

I changed product availability to use supplier-backed location data and removed invented ETA behaviour. When a supplier supplies an ETA, Internext can retain the requested five-day operational buffer. When neither supplier supplies an ETA, the site must not create one. The distinction is important: adding a known business buffer to a real supplier date is a policy; fabricating a date from no source is false data.

I added an admin stock override for Internext-held inventory. The initial implementation treated the input as a total website stock value and caused confusing behaviour: changing Adelaide from one unit to two changed the overall total, removed the Adelaide row, and reverted after refresh. Another failure returned `PGRST205` because the expected Supabase table was not present in the schema cache. I added a database migration, location-aware storage, and delta-based logic so an administrator can set stock for a selected location while supplier feed changes continue to adjust their own component.

The intended model is now explicit. Supplier locations remain supplier-controlled. Internext warehouse or approved location corrections are persisted in Supabase. The displayed total is calculated from the effective location values. An override survives refresh because it is not only React state. Removing a test override restores the supplier-backed stock rather than leaving a fabricated total. This supports real operational stock without freezing the supplier feed.

Stock refresh frequency depends on the catalogue cache and successful supplier retrieval. The exact production refresh interval and supplier rate limits are `To be confirmed` from the deployed environment configuration. What is implemented is a distinction between cache use, forced transaction-time verification, and complete successful syncs. Checkout performs a fresh validation before payment, while catalogue pages can use controlled caching for speed.

## 7. Search and Navigation

Search went through several iterations because product discovery must be both fast and correct. Broad terms such as `Grandstream` returned quickly, while specific models such as `T53W` or `T54W` could take many seconds. Clicking a result sometimes produced a temporary "Product not found" message before the live record appeared. That behaviour made a valid product look broken.

I improved matching across title, manufacturer, model, code, and relevant description fields. Product search, header search, and the admin invoice product field now provide type-ahead suggestions. Customer copy no longer exposes internal phrases such as "live catalogue" or "finding live price".

I also separated loading from not-found states. A page that is still retrieving data should not claim the product does not exist. At the same time, I rejected the idea of rendering an old payable price immediately and changing it in front of the customer. The detail page can show a controlled loading state until the current product is ready, but once the price is displayed it should be the same verified value used for purchase.

Navigation was refined around customer expectations. The back control on a product page now uses browser history so it returns to the actual previous search, category, brand, or listing state. It no longer acts as a disguised link to the main products page. Document titles are reset when navigating home so the browser tab does not keep the previous product name.

Quantity controls support plus and minus buttons as well as direct numeric entry. Cart removal was redesigned so the action no longer wraps awkwardly in a narrow column. Product recommendations were reduced to one row of four and made more context-aware. These are small changes individually, but together they reduce friction during repeated catalogue use.

## 8. Cart and Checkout

The cart supports guests, standard users, and reseller contexts. It persists long enough for a customer to move through the site, but successful checkout clears it even when the customer is not logged in. Checkout captures customer details, delivery address, notes, marketing consent, and the products being purchased.

Address entry initially caused serious usability problems. Typing a street and suburb could result in an autocomplete suggestion for only the suburb. Selecting it could remove the street from Address Line 1, place information into Address Line 2 unexpectedly, or omit the postcode. I changed the address handling so the street remains intact, suburb, state, and postcode fill their intended fields, and customers can complete fields manually when the suggestion provider does not return a complete street address.

Before Stripe checkout is created, the server rebuilds the order from authoritative product data. It does not trust browser-submitted names, prices, or stock. Removed products, unverified prices, insufficient stock, and changed prices stop checkout with an actionable response. This is one of the most important safeguards in the system because the catalogue can change between browsing and payment.

The checkout summary separates subtotal, GST, shipping, and total. Stripe receives the Internext order number in metadata and the payment description. Card details are entered into Stripe and are not stored by Internext. Production live-mode status is `To be confirmed`.

The first-order discount is applied only through server-side eligibility rules. The browser may explain the offer, but it cannot award itself a discount. Eligibility requires an authenticated standard customer account and checks prior orders using account identity plus matching company, phone, and delivery-address signals. A device marker is also used to stop the same browser from receiving the promotion again after a completed first order. These controls discourage casual repeat sign-ups while recognising that device storage is not a complete fraud-prevention identity system.

## 9. Shipping and Freight

Shipping became one of the clearest examples of a technical bug creating direct financial risk. A customer wanted 22 wall brackets and the site produced approximately $234 shipping, apparently by adding a parcel charge for each unit. In reality, many small products can be packed together, and a reasonable consolidated shipment might be closer to $20. I changed the packing approach so quantities are considered as a combined shipment rather than automatically multiplying independent postage.

The opposite problem also occurred. Two Leader tablets produced a $10.20 quote when a realistic manual quote was around $24. A small Yealink desk stand also attracted an unexpectedly high quote. An Akubela PG71N control panel was treated as a parcel over 22 kg even though the physical device is clearly much lighter. The Australia Post API then rejected it because one parcel exceeded its weight limit. These examples showed that shipping accuracy depends on both packing and measurement quality.

I built a measurement pipeline that records dimensions, weight, source, and confidence. Supplier-provided package measurements are preferred. Where measurements can be parsed reliably from product data, that source is retained. An administrator can provide a verified correction with a source reference. If none of those exists, the system can use a conservative category fallback so checkout does not invent a product-specific fact. The fallback is a defined operational assumption for quoting, labelled internally as such, rather than research fabricated at request time.

The latest shipping audit covers 6,551 physical products. It reports 5,192 with complete supplier dimension fields, 1,359 missing at least one supplier field, 75 where text can partly supply measurements, and 1,284 requiring category fallback. Confidence is currently classified as 1,375 verified, 3,817 high, 75 medium, and 1,284 low. There are currently zero admin measurement overrides recorded in the audited data. This is a major improvement from the earlier figure of 2,723 products missing supplier measurements, but it is not complete.

Checkout uses an authoritative shipping quote and applies a $15 minimum where an eligible Australia Post quote is lower. If a valid quote cannot be produced, the payment session is not created. Bulky and fragile freight is presented as `Contact for info` rather than showing unsupported delivery promises. General delivery timeframe sections and express-delivery claims were removed because Internext did not have a defensible universal service commitment.

## 10. Stripe Payments

Stripe is the payment authority for online card orders and admin-created payment requests. The browser requests a Checkout Session from the server, the customer pays on Stripe, and Internext confirms the session with Stripe before marking the associated order paid. Merely creating a payment link does not make an invoice paid.

For ordinary checkout, the session contains validated line items, shipping, discounts where eligible, customer information, and Internext metadata. For an admin-created invoice, the workflow creates an unpaid Internext order and a Stripe payment link. The customer receives that link by email. When Stripe reports a paid session, the confirmation endpoint updates the corresponding Internext record. This prevents an unpaid manually created invoice from appearing as revenue.

I also added the Internext invoice number to Stripe metadata and to the PaymentIntent description. This helps reconcile a Stripe transaction with the order shown in Internext. The customer does not need to understand or manually enter the invoice number; it exists for internal tracking.

Pricing is validated before Stripe receives it. A manually edited unit price on an admin invoice must be carried through to the email, stored order, and Stripe line item. An earlier bug ignored an edit from $673.36 to $750 and used the original selected catalogue value. I corrected the form and creation path so the administrator's explicit ex-GST invoice price is authoritative for that manual invoice, while the initial suggestion still uses the public customer price.

The Stripe integration was developed with a clear boundary: Internext stores order and payment references, not card details. Moving from test to live Stripe requires production secret keys, webhook or confirmation configuration, account verification, and a live end-to-end payment test. The final production activation state is `To be confirmed`.

## 11. Orders and Admin Operations

The first order-management implementation relied heavily on browser storage. It worked on the computer where orders had been created, but the same admin account on another computer could not see them. That exposed the difference between interface state and an operational database. I moved shared order persistence to Supabase so all authorised administrators can see all orders regardless of device.

The `orders` table stores order identifiers, customer and reseller associations, fulfilment status, supplier status where retained for compatibility, the complete order payload, and timestamps. Row-level security gives admins access to all orders and users access to their own. The admin interface deliberately requests shared orders without silently merging a local fallback. This also fixed a later problem where deleted invoices reappeared after deployment because old local data was being merged back into the Supabase view.

I simplified the workflow around what staff actually do. Buttons for "Send to Supplier" and "Mark as Processing" were removed because those actions were handled elsewhere and added no value. Shipment details are entered before `Mark as shipped & email` can be used. Orders can be collapsed into a compact summary for scanning, searched and filtered, and expanded only when work is required.

Some orders produce more than one shipment. I extended fulfilment records to support multiple carrier entries, each with carrier name, tracking number, tracking link, and expected arrival date. Customer shipping emails can present all shipments rather than forcing two carriers into one field. The old shipped-at information box was replaced with expected-arrival information where provided.

Serial-number capture was also refined. Initially, quantity five produced five separate boxes. Administrators preferred one field per order line so they could paste multiple serial numbers in one operation. The interface now presents a single multiline serial-number input for each product line and stores the normalised values as a list.

The operational readout and raw order payload controls exist for diagnosis, but customer-facing terminology such as a permanently visible "Supplier: queued" state was confusing when no corresponding action existed. I removed or reduced meaningless supplier workflow presentation and kept fulfilment states focused on actions staff can actually perform.

## 12. Invoicing and Email Workflows

Internext has two related invoice paths. A customer who pays during checkout receives the standard paid-order confirmation and invoice information. An administrator can also create a payment request from the reseller/admin portal by entering customer details, delivery address, one or more products, quantities, editable ex-GST prices, manual postage, and an optional 10% discount. This creates an unpaid order, generates a Stripe payment link, and sends the customer a professional payment-request email.

The admin form sits below the order filters and above the order list, where staff expected it. Product entry uses autocomplete and supports multiple lines. The customer does not have to provide an invoice number. Internext generates the operational identifier and includes it in Stripe and stored data. Manual postage is entered explicitly because staff may have obtained a freight quote outside the automated checkout path.

Email rendering required significant work. Power Automate initially sent plain text with customer and order details but did not clearly show the purchased products. I expanded the webhook payload and generated an HTML body with order lines, quantities, unit values, delivery details, and totals. I also made the customer invoice resemble the normal Internext order email while retaining a secure Stripe payment button.

Outlook exposed layout defects that were not obvious in browser previews. The email was too wide, required horizontal scrolling, placed totals off-screen, and rendered the payment link as tiny text inside a large dark block. I changed the email to a constrained, table-based layout compatible with email clients, used responsive widths, allowed long links to wrap, and created a properly sized CTA button. The raw payment URL remains as a fallback for clients that block buttons.

Power Automate originally sent from a personal work mailbox. I attempted to move sending to an Internext shared mailbox using `Send an email from a shared mailbox (V2)`. The flow returned "The specified object was not found in the store" even after Send As permission was granted. That error relates to the Microsoft 365 mailbox identity, connector account, or shared-mailbox configuration rather than the website payload. The final shared-mailbox operational state is `To be confirmed`.

## 13. Power Automate Integration

Power Automate is used as an email and workflow bridge rather than as the application's database. Internext posts structured JSON to configured webhook endpoints for customer orders, internal order notifications, shipment emails, and reseller applications. The payload can include a ready-to-send subject and HTML body as well as structured order fields.

The reseller application originally failed with a generic message that Power Automate had rejected the submission. I connected the supplied Power Platform workflow URL and improved validation and response handling. The ABN field accepts only 11 digits, matching the structural length of an Australian Business Number, while server-side validation still handles the submission defensively.

For order emails, the schema evolved as the payload grew. Duplicate `subject` fields appeared in Power Automate's dynamic content after schema changes. The safe resolution is to keep one top-level `subject` property in the trigger schema and reference that field in the email action. The order object contains customer, reseller, items, totals, status, and address details; the top-level HTML is used directly when the action body is set to HTML.

Webhook configuration remains environment-driven. This avoids placing workflow URLs in public frontend code. The website treats a failed notification as an operational error to report and retry where appropriate, but payment confirmation and order persistence should not depend solely on an email action succeeding. Exact production flow ownership, mailbox permissions, and final connector health are `To be confirmed` externally.

## 14. Supabase Data Model and Security

Supabase became the persistent operational foundation for Internext. Profiles connect authenticated identities with roles. Orders hold cross-device order history. Marketing contacts store consent-aware customer records. Stock overrides and shipping measurements store controlled corrections. Xero-ready tables provide structured accounting output.

Role handling needed care. Changing a profile row to `admin` was initially undone on login because profile synchronisation treated ordinary authentication metadata as authoritative. I changed the flow so an existing administrator role is not overwritten by a routine user login. Administrative access is then enforced through profile role checks and row-level security rather than a browser-only flag.

Marketing contacts use an email primary key and one of `user`, `reseller`, or `guest`. An early backfill failed because an admin profile violated that role constraint. I corrected the migration so only user and reseller profiles are inserted and the sync trigger removes or ignores unsupported profile roles. Guest purchasers are added through the order path. Marketing consent defaults to false and is captured explicitly at account registration or checkout.

Order deletion exposed a source-of-truth problem. Deleting rows in Supabase appeared to work, but old orders returned when the application was redeployed or reloaded because local browser records were merged into the admin view. I stopped the shared admin order load from falling back to local storage. Removing an order now removes its related Xero invoice lines and the website record rather than allowing stale browser data to recreate it.

Security policies restrict sensitive reads to authenticated admins. Users can read orders linked to their user ID or email. Server-side functions use protected credentials for privileged writes. Secrets such as supplier credentials, Stripe keys, Supabase service keys, and Power Automate URLs belong in deployment environment variables, not tracked source or client bundles.

## 15. Xero-Ready Accounting

The accounting requirement began with two Xero CSV templates: Inventory Items and Sales Invoices. I created a Supabase schema that preserves the required column names and provides views suitable for CSV export. `xero_inventory_items` stores item codes, names, purchase and sale descriptions, unit values, account codes, tax rates, inventory asset accounts, cost-of-goods-sold accounts, source data, and product JSON. `xero_sales_invoice_lines` stores one row per invoice line in the Xero sales-invoice shape.

The inventory import initially produced only 100 visible records and many empty purchase account and tax fields. Part of that was a user-interface page limit, while the missing accounting fields reflected data that the supplier catalogue did not provide. I did not invent Xero chart-of-account codes or tax classifications. Those values must be confirmed from the organisation's Xero configuration and applied consistently.

Sales invoice rows appeared duplicated because Xero's template repeats contact and invoice fields for every product line. That is how a line-based import represents a multi-item invoice, but genuine duplicate writes still needed prevention. I added a unique constraint on `(order_id, line_index)` and deduplication during persistence. A separate summary view was removed because the requirement was to maintain only tables and views that follow Xero's templates, not an additional reporting model.

Existing orders can be backfilled into Xero-ready lines for review. New orders persist line data as part of the order workflow. Deleting an invoice removes the related Xero rows as well. This creates proper exportable documentation without claiming that the records have already been posted into Xero.

Direct Xero API integration is a planned extension, not a completed capability. It will require a Xero app, client credentials, OAuth 2.0 consent, tenant selection, account-code mapping, tax-type confirmation, branding theme decisions, token storage, refresh handling, idempotency, and error reconciliation. The final account configuration and connection are `To be confirmed`.

## 16. Marketing and Customer Data

I added a marketing contact system because Supabase authentication alone did not cover guest purchasers and did not clearly record consent. Every eligible contact can be labelled as a user, reseller, or guest, with name, company, phone, source, last order, and marketing-consent status. Administrative access is protected by row-level security.

Consent is optional and explicit. The registration and checkout forms include a single concise checkbox: `Email me Internext product updates and offers`. I removed unnecessary explanatory copy beneath it while keeping transactional order and shipping emails separate from marketing consent. A customer can decline marketing and still receive the communications required to complete and fulfil an order.

I built a first-order promotion offering 10% off to an eligible new customer account. The original narrow top bar was replaced with a dismissible popup because it was too small and sent customers directly to checkout. The popup now directs visitors to a sign-up page that explains the account requirement. When closed, it can remain as a small launcher at the bottom-right. The user requested that it appear on each website visit, subject to eligibility controls.

Promotion abuse controls use more than an email address. The server checks previous orders for the authenticated account and also compares normalised company, mobile or landline number, and delivery address. After a completed discounted order, a device marker suppresses the offer even if the user logs out or creates another account on the same browser. This is a practical deterrent, not a guarantee against deliberate fraud using new devices and identities. Stronger enforcement would require an explicit risk policy and possibly payment, address, or third-party fraud signals.

Google's free product listings do not automatically display an on-site popup promotion. A Merchant Center promotion must be configured through Google's promotions programme and associated with eligible products and destinations. That external Merchant Center promotion state is `To be confirmed`.

## 17. Reseller Experience

Internext supports a reseller application and portal, but it does not claim a tiered partner programme. Earlier content described registered, silver, and gold partner tiers and promised benefits such as a personal account manager. Those statements did not reflect the real business and were removed. The website now describes the reseller relationship without fictional programmes or unsupported service commitments.

The reseller application captures business name, 11-digit ABN, contact details, industry, estimated monthly volume, website, and additional information. It sends the submission through a dedicated Power Automate workflow. The public account-registration page clearly creates a standard customer account; reseller pricing is enabled separately after approval.

The portal gives authorised users access to relevant orders, while admins have a broader operational view. Reseller and customer identities are retained on orders so ownership and communication are clear. Account roles also flow into marketing-contact labels without treating administrators as marketing customers.

Content throughout the reseller area was reviewed for accuracy. Unsupported claims about same-day dispatch, warehouse scale, guaranteed technical support, delivery timeframes, integrations, and dedicated account management were removed or made factual. This mattered because a business website should not create contractual expectations merely to fill a design section.

The remaining work is commercial rather than purely technical: define the actual reseller approval process, pricing policy, support boundaries, and service-level expectations. Those details are `To be confirmed` with the business before they should appear publicly.

## 18. Legal, Trust, and Business Content

I rewrote return and legal content for an Australian IP product technology distribution company rather than leaving generic retail text. The return policy includes a 15% restocking fee for eligible change-of-mind returns. Warranty, damaged-goods, business-customer, software, licence, special-order, and freight considerations need to be described consistently with Australian Consumer Law and actual supplier terms. Formal legal review remains `To be confirmed`.

Business contact details were standardised. Internext's address is shown in full as `Unit 7, 7B/256 New Line Rd, Dural NSW 2158`. The phone presentation retains `1300 U R NEXT` with the numeric form `1300 876 398`. Earlier incomplete addresses and inconsistent phone formats were corrected across relevant content and email templates.

I removed unsupported delivery claims and response-time promises. A contact page said Internext aimed to respond within one business day even though that was not a committed service level. Delivery pages described metro and regional timeframes and express options without enough evidence. Those sections were removed. Bulky freight now says `Contact for info` rather than presenting a checkout quote or timing that might not apply.

Payment and invoice communications explain that Stripe processes card details and that Internext records GST, item totals, and shipping separately. Order and shipping emails contain only the information needed for the transaction. Marketing consent is not bundled into purchase conditions.

The broader lesson was that trust content must be operationally true. Removing an impressive but unsupported claim makes the website stronger, because the remaining statements can be defended when a customer relies on them.

## 19. SEO and Google Merchant

Internext's large catalogue created an SEO challenge. Google Search Console reported 6,799 duplicate pages without a user-selected canonical, 4,829 soft 404s, 3,303 crawled but not indexed pages, 1,052 pages where Google selected a different canonical, and 1,266 discovered but not indexed pages. The core problem was that many routes returned the same generic single-page application shell with a successful HTTP status, weak fallback content, or inconsistent canonical signals.

I introduced route-specific static generation and metadata. Indexable routes receive self-referencing canonicals, titles, descriptions, and meaningful fallback content. Search, cart, checkout, login, portal, and admin pages are explicitly noindexed. Invalid URLs use a real 404 template and HTTP behaviour rather than returning a successful application shell. The sitemap excludes noindex and unsupported routes and no longer publishes invented modification dates, priorities, or change frequencies.

The production build now generates the Google product feed, static sitemap, application bundle, static route pages, and static product pages in a defined sequence. A deployment once failed because `public/data/catalog-live-overrides.json` did not exist. I made generated-file reads tolerant where an optional override file is absent so a clean Vercel checkout can still build.

The latest verification produced 69 indexable routes, 10 noindex pages, 5,905 static product pages, and 5,974 sitemap URLs. A separate audit reports 4,943 Google feed products. The 11 unsupported customer-facing entries must be resolved before the output is fully clean.

Google recovery is not immediate after a code fix. The corrected deployment must be crawled, old duplicates and soft 404s must be reassessed, and validation must be restarted in Search Console. Current post-deployment index coverage is therefore `To be confirmed`. Paid Google advertising should be expanded only after conversion tracking, product eligibility, promotion configuration, and margin-aware bidding are verified.

## 20. Testing, Deployment, and Debugging

I treated production build logs and real customer examples as important test inputs. Vercel failures exposed missing generated files. Outlook screenshots exposed email-client layout problems. Supabase screenshots exposed row constraints, missing tables, duplicate invoice lines, and device-local order history. Supplier comparisons exposed stock, ETA, price, and catalogue-integrity defects. Australia Post errors exposed invalid parcel measurements.

The repeatable technical checks now include TypeScript compilation, Vite production build, static route generation, static product generation, Google feed generation, sitemap generation, SEO audits, catalogue-integrity audits, shipping-measurement audits, and targeted source checks. The latest full build completed successfully. TypeScript passed. Lint produced zero errors and 10 pre-existing warnings. SEO output passed its current audit.

Not every audit currently passes. The catalogue-integrity audit deliberately exits unsuccessfully while 11 unsupported customer-facing products remain. The shipping audit passes its structural checks but still identifies 1,359 products missing at least one supplier measurement and 1,284 low-confidence category fallbacks. These results are valuable because they prevent a green build from hiding commercial data risk.

I learned to avoid regressions caused by well-intentioned fixes. A cached search result is unsafe if it displays a stale price. Blocking every incomplete measurement can make much of the catalogue unusable. Treating an empty supplier response as deletion can remove the store during an outage. The solution uses transaction-time checks, confidence levels, conservative fallbacks, complete-sync removal rules, and audits.

Deployment itself does not explain sustained slowness, although a cold serverless function or a fresh cache can affect the first request. Performance work must measure supplier latency, API waterfalls, generated data size, image behaviour, and cache headers. The current site has improved loading states, static product pages, search indexing, and controlled caching, but production performance monitoring remains an ongoing requirement.

## 21. Current State, Lessons, and Next Steps

Internext has moved from an idea and supplier records to a connected commerce platform. Customers can discover products, create accounts, receive an eligible first-order offer, obtain shipping, pay through Stripe, and receive email. Staff can manage shared orders, payment requests, shipments, serial details, stock locations, and Xero-ready exports.

The strongest engineering lesson is that correctness must cover the whole path. A product can be correct in search while a stale static page remains indexed. Checkout can calculate GST while an email omits tax on shipping. Supabase can delete an order while local storage restores it. Every source of truth needs ownership and consistent eligibility rules.

The strongest commercial lesson is that unsupported certainty is worse than an honest limitation. `Contact for info` is better than invented bulky freight. No ETA is better than a fabricated date. A loading state is better than a price that changes in front of a customer. Removing partner promises is better than advertising services the business does not provide.

My immediate priorities are to resolve the 11 unsupported catalogue entries, continue replacing the 1,284 low-confidence shipping fallbacks with verified package measurements, confirm production Stripe and Power Automate states, complete Google recrawl validation, and establish analytics around search, checkout, conversion, margin, and failed quotes. Direct Xero API integration should follow only after account and tax mappings are approved.

Longer term, Internext needs operational ownership as much as further code. Supplier sync failures need alerts. Catalogue audits need scheduled execution. Measurement corrections need an accountable review process. Promotions need profitability monitoring. Advertising needs conversion values that reflect gross profit rather than revenue alone. A platform can support growth only when someone owns the quality of the decisions it automates.

## Milestone Timeline

Exact dates are `To be confirmed`; the sequence below reflects the implementation history.

| Phase | Milestone | Problem addressed | Result |
|---|---|---|---|
| 1 | React, TypeScript, Vite and Vercel foundation | No operating web platform | Public application and serverless deployment structure created |
| 2 | Alloys and Leader catalogue ingestion | No scalable product catalogue | Supplier records normalised into a shared product model |
| 3 | Product search, categories and detail pages | Customers could not reliably discover products | Searchable catalogue with product routing and merchandising |
| 4 | Pricing, stock and ETA rules | Values changed or were inferred inconsistently | Supplier-backed display rules and transaction-time verification |
| 5 | Cart, address and Stripe checkout | No complete purchasing path | Guest and account checkout with server-validated Stripe sessions |
| 6 | Shipping and measurement pipeline | Per-unit freight and invalid parcel weights | Consolidated packing, source tracking, confidence and fallbacks |
| 7 | Supabase order persistence | Orders existed only on one computer | Shared cross-device order history with RLS |
| 8 | Admin fulfilment workflow | Manual and confusing order operations | Filters, collapsible orders, shipments, tracking and serial capture |
| 9 | Power Automate HTML emails | Plain or incomplete order notifications | Structured customer and internal email payloads |
| 10 | Marketing contacts and promotion | Guests and consent were not centrally tracked | Consent-aware contacts and controlled first-order discount |
| 11 | Xero-ready database views | Accounting data lacked a standard format | Inventory and invoice-line exports matching supplied templates |
| 12 | Catalogue integrity safeguards | Stale, PDF and unsupported products remained visible | Supplier verification, exclusions and repeatable audit tooling |
| 13 | SEO static generation | Duplicate shells and soft 404s harmed indexing | Canonicals, noindex routes, true 404s and static fallback pages |
| 14 | Mobile and email layout refinement | Narrow screens and Outlook exposed overflow | Responsive public UI and constrained email templates |
| 15 | Current hardening phase | Residual unsupported products and missing measurements | Audits quantify remaining work and block false completion claims |

## Current Status by Area

| Area | What was built | Main issue resolved | Current status | Next action |
|---|---|---|---|---|
| Architecture | React, TypeScript, Vite, Vercel APIs | Established one deployable platform | Implemented | Add production observability and ownership |
| Supplier catalogue | Alloys and Leader adapters and merge | Scalable catalogue ingestion | Implemented with residual audit failures | Resolve 11 unsupported customer-facing entries |
| Product quality | Title, description, image and similarity rules | Poor supplier merchandising | Implemented and iterative | Continue exception review and quality scoring |
| Pricing | 20% supplier markup and server validation | Price flicker and stale checkout values | Implemented | Confirm quote-only policy and monitor margin |
| Stock | Location totals and admin location overrides | Cross-device persistence and incorrect totals | Implemented | Verify production migration and alert on sync drift |
| Shipping | Australia Post quoting, packing and measurement confidence | Per-unit freight and invalid parcel weights | Partially complete | Replace 1,284 low-confidence fallbacks |
| Checkout | Guest/account checkout with address correction | Incomplete addresses and untrusted browser totals | Implemented | Add end-to-end production monitoring |
| Stripe | Checkout Sessions and paid confirmation | Prevented unpaid invoices showing as paid | Implemented; live state To be confirmed | Complete live-mode verification |
| Orders | Supabase-backed shared order operations | Orders visible only on one computer | Implemented | Add audit logging and operational alerts |
| Fulfilment | Multiple shipments, tracking and serials | One-shipment and multi-box limitations | Implemented | Test complex partial-shipment cases |
| Invoices | Admin payment requests and customer emails | Manual invoice creation and payment collection | Implemented | Add revision history and approval controls |
| Power Automate | Structured webhooks and HTML content | Incomplete plain-text notifications | Implemented; mailbox state To be confirmed | Verify shared mailbox end to end |
| Supabase security | Profiles, RLS and protected admin data | Browser-only role and data assumptions | Implemented | Schedule policy and privilege review |
| Xero readiness | Inventory and invoice CSV views | No accounting-template output | Implemented for export | Confirm accounts, taxes and API roadmap |
| Marketing | Consent-aware users, resellers and guests | Missing guest and consent records | Implemented | Add compliant suppression and campaign export process |
| First-order offer | 10% account promotion and abuse checks | Repeat claims through simple new accounts | Implemented with practical limits | Monitor abuse and profitability |
| Reseller experience | Application and role-aware portal | Generic partner claims and unclear access | Implemented | Confirm real commercial service model |
| Legal and trust | Distribution-specific policies and accurate contact content | Generic or unsupported claims | Implemented; legal review To be confirmed | Obtain formal legal review |
| Google Merchant | Generated product feed | Manual product publication | Implemented with catalogue audit caveat | Remove unsupported feed entries and configure promotion |
| SEO | Static pages, canonicals, noindex and true 404s | Duplicates and soft 404s | Deployed solution; recovery To be confirmed | Request validation and monitor recrawl |
| Mobile and email UX | Responsive UI and Outlook-safe templates | Overflow and unusable narrow layouts | Implemented and tested | Maintain screenshot regression coverage |

## Executive Conclusion

I built Internext by repeatedly turning real commercial failures into explicit system rules. A missing order on another computer became shared Supabase persistence. A $234 quote for 22 brackets became consolidated packing logic. A control panel incorrectly treated as heavier than 22 kg became measurement sourcing and confidence tracking. A stale supplier product became a catalogue-integrity audit. A price that changed after page load became authoritative server validation. A wide Outlook email became a constrained transactional template.

The project records uncertainty instead of hiding it. The remaining 11 unsupported catalogue entries and 1,284 low-confidence shipping fallbacks are visible and prioritised. External states not proven by source code are marked `To be confirmed`. Customer claims must be supported, transaction values verified, and records consistent across systems.

Internext is ready for controlled commercial growth, but growth should follow data reliability. The next stage is not simply adding more products or spending more on advertising. It is closing the remaining catalogue and freight gaps, validating production integrations, monitoring conversion and margin, and establishing repeatable ownership of supplier syncs, order operations, accounting exports, and customer communications. With those controls in place, the platform can grow without losing the accuracy and trust on which a technology distribution business depends.
