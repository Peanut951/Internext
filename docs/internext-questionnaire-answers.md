# Internext R&D Questionnaire - Comprehensive First-Person Answers

## Evidence and accuracy note

I prepared these answers from the Internext source repository, Git history, application code, database migrations, automated tests, audit scripts and reports, Vercel build logs, supplier data, screenshots, issue discussions, and retained ChatGPT/Codex development history. Where the repository cannot prove a personal, commercial, legal, or external-account fact, I have marked it **To be confirmed** rather than guessing.

Catalogue counts change over time. Standalone audits run on 14 September 2026 reported:

- 7,157 verified supplier products and one controlled quote product.
- 847 raw enrichment records unsupported by the verified supplier snapshot.
- 66 unsupported entries still in generated customer-facing outputs: 27 Google feed entries and 39 sitemap entries, with no unsupported static product pages. These outputs need regeneration and another audit before deployment.
- 6,557 physical products assessed for shipping data; 5,105 had complete supplier dimension fields.
- 1,452 products were missing at least one supplier measurement and 1,364 still needed a low-confidence category fallback.
- 1,372 sourced verified measurement records existed.

These current figures replace older snapshots in which 2,723 products were missing measurements, 2,606 required fallbacks, and catalogue audits exposed different unsupported counts. The older figures remain relevant evidence of the original problem and subsequent progress.

## A. My involvement

**Name:** Pranit Singh.  
**Job title/role:** R&D Engineer.  
**Project:** AI Website Development - Internext.

**Approximately when did I start?**  
I started by at least December 2025. The earliest retained repository commit is dated 4 December 2025. Any work before the first commit should be confirmed from employment records, email, AI history, or timesheets.

**When did I stop, or am I still working on it?**  
I am still working on Internext as at September 2026. Catalogue, checkout, pricing, shipping, SEO, administration, security, competitor pricing, and UI work continue.

**What was my role?**  
I performed an end-to-end R&D role. I translated business and user problems into requirements; researched technologies; designed the frontend, serverless API, database, data pipelines, and integrations; wrote and changed code; integrated supplier and third-party systems; tested deployments and real workflows; investigated data discrepancies; created audits and safeguards; and revised public content so it did not make unsupported claims.

My work included React/TypeScript development, Alloys and Leader catalogue integration, Supabase authentication and persistent data, Stripe checkout, Australia Post freight, Power Automate emails, Xero-ready records, Google Merchant and SEO output, DataForSEO competitor discovery, responsive design, admin tooling, production debugging, and evidence/documentation.

**Approximate percentage of my working time:**  
Approximately 70% over the development period. This is provisional and should be reconciled with timesheets, calendars, Git activity, AI timestamps, and deployment history before formal use.

## B. What I was trying to build

**Describe the product and intended operation.**  
I was building Internext from an initial website into a connected Australian technology distribution and commerce platform. It needed to serve public customers, approved resellers, guest purchasers, and internal administrators while representing thousands of changing products sourced through Alloys and Leader.

Customers needed to discover products through search, categories, brands, product pages, Google Search, and Google Shopping; see defensible titles, images, prices, stock, ETA, specifications, and freight information; create an account or check out; pay securely; and receive order and shipment communications. Staff needed to manage shared orders from any device, create payment requests, manage Internext-held stock, capture serials, record split shipments, produce Xero-ready data, and monitor catalogue and competitor-pricing activity.

Internext therefore became a controlled data pipeline connecting supplier records, enrichment data, caches, generated pages, Google outputs, payment validation, freight calculations, database records, email workflows, and admin decisions, not merely a visual storefront.

**Required technical capabilities:**

- Ingest and normalise different Alloys and Leader catalogue formats.
- Match identity across supplier SKU, Internext code, brand, model/MPN, and GTIN/EAN.
- Require a current supplier source or an explicitly controlled quote-product exception before sale.
- Update supplier price, stock, ETA, and removal status without treating a partial supplier outage as mass deletion.
- Apply equivalent eligibility rules to runtime results, Google feed, sitemap, static pages, recommendations, and checkout.
- Support public, reseller, exact advertised, minimum-floor, RRP, GST, and quote-only price rules.
- Combine supplier stock locations with persistent authorised Internext inventory corrections.
- Calculate freight from sourced measurements, consolidate quantities, respect carrier limits, and route unsafe cases to a quote.
- Support guest/customer/reseller/admin authentication, role-aware navigation, and protected data.
- Persist orders centrally across devices and confirm payments without trusting browser values.
- Support Power Automate HTML communications, multiple shipments, tracking links, arrival dates, and pasted serial-number lists.
- Produce Xero-compatible inventory and invoice rows without duplicate persistence.
- Generate Merchant feeds, sitemap URLs, canonicals, static HTML, noindex responses, and true 404s.
- Remain usable on mobile and desktop.
- Discover Australian competitor listings, retain evidence, verify exact products and sellers, respect exclusions/floors, and stage rather than blindly activate recommendations.
- Provide repeatable tests, diagnostics, audits, and clean-build safeguards.

**What made this difficult?**  
Supplier sources use different structures and often omit or contradict dimensions, images, titles, ETA, stock locations, and pricing. A missing item can mean removal, temporary failure, partial response, stale snapshot, or identity mismatch. Internext also holds several catalogue representations: raw enrichment, verified snapshots, runtime responses, browser state, static pages, sitemap, and Google feed. Fixing one does not automatically fix the others.

Commercial correctness added further difficulty. A plausible price, ETA, measurement, freight quote, recommendation, or competitor listing is not enough. It must belong to the exact product and have a defensible source, because an error can create an unfulfillable order, margin loss, misleading advertising, or incorrect repricing.

**What was initially uncertain?**

- Whether the suppliers could be normalised into one reliable large catalogue.
- How to distinguish removal from temporary supplier failure.
- How to load thousands of products quickly without authorising stale transactions.
- How to align build-time and runtime eligibility.
- How to quote freight when many supplier package measurements were absent.
- How to preserve live supplier stock while adding Internext stock.
- How to keep price and availability consistent from search through payment.
- How to prevent repeat promotion claims using available website signals.
- How to provide secure cross-device administration.
- How to make SPA routes indexable without duplicate shells and soft 404s.
- Whether nationwide competitor discovery could be matched and automated safely.
- How to isolate asynchronous provider failures and still retain valid results.

## C. Existing technology investigated and used

**Software, AI, APIs, frameworks, and products investigated or used:**

- OpenAI ChatGPT and Codex for coding, debugging, architecture, tests, content, and log/screenshot analysis.
- React 18, TypeScript, Vite, React Router, TanStack Query, Tailwind CSS, shadcn/Radix, React Hook Form, Zod, Lucide, and supporting UI libraries.
- Git, GitHub, Vercel hosting, serverless APIs, cron, redirects, rewrites, headers, and environment variables.
- Supabase Auth, PostgreSQL, migrations, triggers, views, row-level security, and service-role operations.
- Stripe Checkout and payment metadata.
- Alloys CSV/XML feeds, Leader data, supplier documents, and manufacturer records.
- Australia Post APIs and Geoapify address autocomplete.
- Microsoft Power Automate, Outlook, and shared-mailbox workflows.
- Xero CSV templates and requirements for a future direct OAuth/API connection.
- Google Merchant Center/free listings, Shopping, Search Console, Ads, Analytics, and Microsoft Clarity.
- DataForSEO, and evaluation of Prisync and Price2Spy.
- Icecat, MyITHub, supplier/manufacturer sources, and controlled PDF extraction for enrichment.
- Australian Consumer Law guidance relevant to returns and consumer guarantees.

**Initial platform:**  
The core was React, TypeScript, Vite, and Tailwind, deployed from GitHub to Vercel. Supabase supplied authentication and shared data, Stripe payments, and supplier feeds the catalogue. Other integrations and generated outputs were added as operational requirements became clear.

**Why existing solutions were insufficient:**  
No single product combined both supplier catalogues with Internext's identity, public/reseller/fixed-price, stock, freight, checkout, admin, Google, email, accounting, and security rules. Commercial price-monitoring tools still required exact product matching, seller approval, floors, exclusions, audit history, and Internext-specific display/activation logic. DataForSEO supplied search data but could not decide whether a listing was the same product or commercially safe.

**Limitations encountered:**

- Incomplete and independently failing supplier feeds.
- External latency, serverless limits, and cache freshness trade-offs.
- Browser and generated artefacts surviving longer than supplier truth.
- SPA duplicate-shell and soft-404 indexing behaviour.
- Clean builds lacking optional local generated files.
- Supabase migration/schema-cache errors such as `PGRST205`.
- Same-tab `storage` events not firing and stale session races.
- Strict parcel measurement/carrier limits.
- Outlook rendering differing from browser HTML.
- Microsoft 365 mailbox/connector configuration outside the website.
- Asynchronous Google recrawling and Merchant review.
- Asynchronous DataForSEO tasks, request costs, and task-level `No Search Results` responses.
- Ambiguous Shopping titles that are unsafe for automatic matching.

**Documentation and evidence researched:**  
I used official or vendor documentation from Vercel, Supabase/PostgreSQL, Stripe, Australia Post, Geoapify, Google, Microsoft Power Automate/365, Xero, DataForSEO, Prisync, Price2Spy, Alloys, Leader, manufacturers, and Australian Consumer Law sources. I also relied on actual feeds, supplier pages and spreadsheets, PDF catalogues, Merchant/Search Console reports, API errors, Vercel logs, Supabase results, Outlook renderings, and customer/admin screenshots.

## D. Significant technical problems and development process

### D1. Supplier catalogue integrity and unsupported products

**Problem:** Products could remain visible after disappearing from both suppliers or reappear from old data. Reported Grandstream and Sony examples showed a customer could discover or potentially buy an item Internext could not source.

**Why non-obvious:** A record could originate from a current feed, old snapshot, enrichment JSON, PDF extraction, static page, Google feed, runtime cache, browser state, or merged fallback. An empty supplier response could also be a temporary outage rather than deletion.

**Approaches:** I progressed from static imports, to live/local merging, to manual removals, to attempted absence-based deletion. Each was incomplete or unsafe. The final direction introduced a verified supplier identity set, quarantine for enrichment-only records, complete-success requirements before removal, transaction-time checks, and one eligibility policy for all customer-facing outputs.

**Testing/result:** `audit-catalog-integrity.mjs` compares source snapshots, raw enrichment, controlled quote products, Google feed, sitemap, and static pages; identity tests cover matching; checkout revalidates before payment. On 14 September the source boundary identified 7,157 verified products, one quote product, and 847 unsupported raw records. The audit also found 66 stale unsupported generated entries, so regeneration and another audit remain required before deployment.

### D2. Product identity, titles, descriptions, images, and recommendations

Supplier titles often buried the model customers search. For example, a Grandstream phone led with generic features while `Grandstream GRP2613W` appeared only as secondary metadata. Descriptions were dense or weak, images were missing/mismatched, and recommendations sometimes crossed unrelated product types.

Displaying supplier titles directly preserved poor merchandising; broad shortening sometimes removed the defining model; manual corrections did not scale. I developed catalogue-wide title normalisation prioritising brand, model/MPN, type, and limited differentiators, and reused it for Google output. I added title/image audits, gallery cleanup and controlled enrichment, structured description rendering, and category/family/model constraints for recommendations. Placeholder text such as `Service Image` was removed when no real asset existed. Quality still needs exception review because no generic rule is perfect across every product category.

### D3. Public, reseller, fixed, and quote-only pricing

Internext needed supplier-driven prices, separate reseller pricing, standard markup, exact advertised-price instructions, minimum floors, RRP, GST, and quote-only products. Early search/detail values could differ or change after load, and a bulky projector screen showed a price even though the supplier required price and freight confirmation.

A uniform markup could not handle all cases. Cached values caused flicker/staleness. The first spreadsheet rule only raised public prices below supplied floors; a later business instruction required those listed products to remain at exactly the table price and not adapt to Alloys. I added explicit public-price precedence and exact overrides while preserving reseller/dealer prices, an automated public-floor audit, server-side checkout validation, and quote-only handling. RRP is not converted into a sell price, and an unverified product cannot proceed through ordinary payment.

### D4. Stock, ETA, and admin inventory overrides

Supplier location totals, duplicate records, caches, and admin stock could disagree. Admin-added stock appeared on the product/cart but postcode shipping later rejected it because the server path did not use the same effective-stock model. Frontend-only overrides also disappeared on refresh, and replacing total stock obscured supplier updates.

I moved to persistent, location-aware Supabase overrides and calculate effective stock from supplier-controlled locations plus authorised Internext adjustments. Product, cart, freight, and checkout should all use that model. A migration addressed the missing-table/schema-cache failure. Supplier ETA is retained only when actually supplied; an operational buffer may be applied to a real date, but no ETA is invented when both suppliers provide none.

### D5. Shipping measurements, packing, and quote accuracy

Shipping was the largest direct financial data risk. The initial audit showed 2,723 of 6,543 physical products missing a supplier measurement and 2,606 using broad category fallback. Missing or incorrect package data could overcharge, undercharge, or create invalid Australia Post requests. Multiplying one-item freight by quantity also ignored consolidated packing.

Supplier dimensions alone were insufficient. Category defaults maintained coverage but had low confidence. I added text parsing, Alloys and Icecat enrichment, sourced measurement records, source/confidence levels, admin correction support, package consolidation, and carrier-limit handling. Unsafe bulky cases can require contact/quote rather than invented precision.

The 14 September audit assessed 6,557 physical products: 5,105 complete supplier records, 1,452 missing at least one field, 88 partly parseable from text, 1,364 low-confidence fallbacks, and 1,372 sourced verified measurements. This is substantial improvement, but the fallback backlog remains unresolved commercial risk.

### D6. Search, loading, caching, and performance

Thousands of products and external calls caused slow first loads and inconsistent states. A specific model could be much slower than broad search; a page could show `Product not found` while still loading; remembered prices could change after refresh.

Direct live loading was fresh but slow; large local snapshots were fast but stale. I introduced controlled server caching, stale tolerance, request coalescing, lazy routes, distinct loading/not-found states, static route/product HTML, image improvements, and fresh transaction checks. The environment supports a 30-minute normal catalogue cache and six-hour stale window, subject to deployed values. Cached content can improve browsing but cannot authorise checkout.

### D7. Checkout, Stripe, address, and transaction integrity

Address suggestions could replace a street with a suburb or omit a postcode. Browser cart values could be stale or manipulated, and catalogue state could change before payment.

I changed checkout creation to rebuild every line server-side and verify identity, current supplier support, effective stock, and current price. Removed products, insufficient stock, or changed price stop checkout with an actionable response. Address mapping preserves street, suburb, state, and postcode and still permits manual completion. Internext order numbers are included in Stripe metadata/description for reconciliation. Internext does not store card details. Final Stripe production mode/webhook state is **To be confirmed** externally.

### D8. Shared orders, Xero-ready records, and source of truth

Orders initially stored in the browser were missing on another computer. Merging local and Supabase data later allowed deleted invoices to reappear. Xero line exports also needed genuine duplicate prevention while retaining the repeated header fields required by a line-based template.

I made Supabase the shared order source, removed silent admin fallback to browser records, added role-based row security, and created Xero-ready inventory and invoice-line tables/views. A unique `(order_id, line_index)` rule supports idempotency, and related Xero lines are removed with deleted orders. Direct Xero OAuth/API posting, account-code mapping, tax mapping, and tenant setup remain **To be confirmed**.

### D9. Authentication, roles, and delayed admin navigation

After admin login, the portal option could take about 30 seconds to appear. The native `storage` event does not fire in the same tab that made the change, and an older `/session` request could finish after login and overwrite the new state. Profile sync could also overwrite an established admin role.

I replaced timer/focus dependence with an immediate same-tab auth event, coalesced duplicate syncs, tracked session mutations to reject stale responses, and preserved established admin roles unless explicitly changed. Desktop/mobile navigation now reacts immediately. A dedicated auth-reactivity regression test, TypeScript check, and build verification cover the fix.

### D10. Administration and fulfilment workflow

The admin interface originally included unclear controls, supported only one shipment record, and generated one serial-number field for every quantity. Five units therefore required five separate paste operations. Labels such as `Operational readout`, raw order payload, and supplier states also appeared more important than the actions staff actually perform.

I refined the workflow around real operations: shared searchable and collapsible orders; action-focused fulfilment states; multiple carrier records with separate carrier, tracking number, link, and expected arrival date; shipment details required before sending the shipped notification; and one multiline serial input per order line that normalises pasted values into a list. Diagnostic payload data remains secondary. Unsupported `Send to Supplier`/processing actions and misleading supplier states were removed or reduced where they did not correspond to a real website action.

### D11. Power Automate and email rendering

Initial order/payment messages were incomplete or plain text and rendered poorly in Outlook. Wide browser-style layouts required horizontal scrolling, pushed totals off-screen, and rendered payment links badly. A move to a shared mailbox also produced `The specified object was not found in the store` despite Send As work.

I expanded webhook payloads and generated complete HTML containing products, quantities, prices, customer, delivery, tax, freight, and totals. I converted the email to constrained table-based markup suitable for Outlook, allowed long URLs to wrap, and included both a proper payment CTA and raw-link fallback. Webhook URLs remain server-side environment variables. The shared-mailbox error was separated from website payload logic because it depends on Microsoft 365 mailbox identity, connector account, and permissions. Final shared-mailbox status is **To be confirmed**.

### D12. Google Merchant, product visibility, and indexing

Search Console reported thousands of duplicate-without-canonical, soft-404, crawled-not-indexed, discovered-not-indexed, and Google-selected-different-canonical URLs. Supplier titles could omit the searched model, invalid images affected Merchant output, and the website's 10% offer did not automatically appear in free listings.

Client-only React metadata was insufficient because crawlers could receive the same successful shell for many routes. I added self-referencing canonicals, route-specific titles/descriptions, explicit noindex treatment for search/cart/checkout/auth/portal/admin routes, static route and product HTML, a true 404 response, and sitemap/Google-feed generation from eligible products. Model-first title, image, price, SEO, and catalogue audits were added. Merchant promotions remain separately configured in Google; an on-site popup alone does not create a Google promotion.

The implementation controls what Internext publishes, but Google controls recrawl and reindex timing. The 14 September catalogue audit also shows that the current generated feed and sitemap need regeneration before claiming all unsupported entries are removed.

### D13. First-order promotion and marketing consent

An account-only 10% first-order check could be reclaimed by logging out or opening a new account. Guest purchasers also needed marketing records without consent being assumed.

I moved eligibility to the server and check prior order identity using account, normalised company, phone, and delivery address signals. A device marker after a completed discounted order adds a practical deterrent against immediate repeat claims. The client can explain the offer but cannot award itself the discount. Marketing contacts can represent users, resellers, and guests, consent defaults to false, and transactional order/shipping messages remain separate from marketing consent. These controls do not claim to stop deliberate fraud using new devices and false identities.

### D14. Competitor discovery and safe repricing

Internext wanted to discover the cheapest verified Australian seller for an identical product, potentially price one dollar below it, display the former price struck through, preserve seller evidence, and exclude selected products. Early scans read 100 products and made many requests but stored no listings, observations, candidates, or matches. A DataForSEO `40102 No Search Results` task could also fail the full scan.

Scanning one product from every product page did not scale, so I centralised it in the admin portal with scan history, observations, recommendations, matches, seller review, and approved-seller views. GTIN-only searches had poor coverage; I changed discovery to brand plus model/MPN while retaining strict identity checks. Per-task no-result/failure handling now preserves successful siblings. Unverified discoveries are retained only for review, not treated as active observations. Cross-product identity locks prevent one external offer being attached to multiple Internext products.

The provider integration, Supabase tables, seller review, matching, product modes (`Monitor`, `Automatic`, `Excluded`), recommendation logic, and audit trail are implemented. Eighteen competitor-pricing/provider tests passed during the latest provider fix, with TypeScript and build verification. Automatic customer repricing remains deliberately off until the database switch, environment mode, approved sellers, verified matches, exclusions, floors, and business approval are all present.

### D15. Deployment and clean-build reliability

Vercel builds exposed assumptions hidden by the local machine. One clean clone failed with `ENOENT` because `public/data/catalog-live-overrides.json` did not exist. Other builds identified TypeScript or API defects after local cache/generated state had masked them.

Manually adding a local file could repair one machine but not future deployments. I made optional generated-file reads tolerant of absence, supplied safe defaults, and ordered required generation before consumption. The production command now generates the Google feed, audits titles and public price floors, generates the sitemap, builds Vite, generates static route/product pages, and runs SEO and catalogue-integrity audits. A high-risk audit is allowed to fail a build when the output is unsafe; that is an intentional release safeguard.

### D16. Mobile, visual, and content accuracy

Desktop layouts, dense admin tables, product pages, service blocks, and reseller content did not always translate to mobile. Some grids were uneven, text wrapped badly, controls overflowed, or state changes appeared late. Several polished sections also contained services or promises the business did not actually offer.

I audited responsive navigation, product pages, cart, checkout, admin views, fixed widgets, touch targets, text fitting, and overflow. I corrected uneven reseller benefit cards, homepage/about typography and metric layout, image framing, and responsive order. A repeatable mobile-layout audit was added and mobile changes were tested/deployed.

I also removed grey `Service Image` placeholders; the one-business-day response promise; fictional registered/silver/gold partner tiers; the claim that every partner receives a personal account manager; and unsupported claims about stock scale, same-day dispatch, delivery timing, technical support, integrations, and service levels. The site now describes a reseller programme rather than an invented partner programme.

### D17. Returns, faulty products, and trust content

Generic return text did not reflect Internext's selected change-of-mind policy or clearly separate voluntary returns from Australian Consumer Law remedies. The business later chose approved change-of-mind returns subject to resale conditions and a 15% restocking fee.

I structured the policy into change-of-mind, ACL, DOA, faulty products, physical damage/misuse, freight, and major/minor problem sections. Change-of-mind approval requires unopened, unused, uninstalled, unregistered, resaleable goods with original packaging, seals, accessories, manuals, and documentation. Internext may request evidence; return freight is trackable and customer-paid; the refund excludes original delivery and applies the 15% fee. Separate wording preserves non-excludable ACL rights, explains that seven-day DOA is an expedited assessment period rather than a statutory limit, and distinguishes remedies for major/minor failures. Formal legal approval remains **To be confirmed**; code/content work is not legal advice.

## E. Experiments and testing

**Experiments/tests conducted:**

- Compared supplier snapshots with enrichment records, customer-reported products, Google output, sitemap, and static pages.
- Tested identity normalisation across Internext codes, supplier SKUs, GTIN, brand, model/MPN, variants, and cross-product collisions.
- Checked supplier pricing, exact public overrides, floors, reseller separation, RRP, quote-only states, GST, invoice edits, and checkout mismatches.
- Compared supplier stock locations, duplicate records, persistent overrides, cart state, postcode freight, and checkout validation.
- Audited shipping field coverage, source/confidence, text parsing, sourced enrichment, fallbacks, package consolidation, and carrier limits.
- Simulated guest/account checkout, address suggestions, removed products, insufficient stock, changed prices, Stripe metadata, and order persistence.
- Reproduced same-tab auth delay and stale-session request races.
- Tested DataForSEO task creation/polling, no-result tasks, sibling preservation, query construction, normalisation, exact identity, seller review, exclusions, and activation locks.
- Audited Google titles, images, prices, product eligibility, sitemap/static pages, canonicals, noindex, 404s, and campaign spreadsheet assets.
- Inspected responsive UI at desktop/mobile widths and actual Outlook email rendering.
- Ran TypeScript, Node tests, lint, production builds, static generation, and clean Vercel deployment checks.

**What I was trying to prove:**  
I tested whether the complete system remained correct across data boundaries, rather than only whether one component rendered. The main questions were whether every offered product was sourceable; whether identity, price, stock, ETA, and availability stayed consistent through payment; whether stale/partial data could bypass verification; whether freight was defensible; whether admin data persisted across devices; whether users could gain the wrong role or discount; whether one provider failure was isolated; whether a recommendation could change the wrong product; and whether Google outputs represented the same catalogue checkout would accept.

**Variables/components changed:**  
Supplier adapters, identity keys, complete-sync/removal rules, cache timing, request coalescing, loading states, price precedence, effective stock, shipping source/confidence/packing, client/server checkout responsibility, Supabase schema/RLS, auth propagation, search terms and thresholds, recommendation filters, static SEO generation, DataForSEO task handling, seller/product activation controls, responsive CSS, email markup, and admin controls.

**How success was measured:**

- Automated pass/fail tests, TypeScript, lint, and build status.
- Verified/raw/unsupported product counts and generated feed/page counts.
- Complete/missing measurement counts and confidence distribution.
- Provider products read, requests, listings, observations, candidates, reviews, and errors.
- API/database responses and rows.
- Direct comparison with supplier source data.
- Refresh, cross-device, browser, mobile, and Outlook behaviour.
- Search Console/Merchant validation after allowing for external processing time.

Formal AI hallucination rates, transcription accuracy, and controlled concurrent-call benchmarks were not recorded and should not be claimed.

**Where results were recorded:**  
Git history/diffs; repository tests and scripts; generated reports; Vercel logs; Supabase schema and rows; DataForSEO scan/observation/candidate/seller/match/recommendation/audit tables; Google Merchant and Search Console; Stripe/Power Automate/provider logs where retained; screenshots; pasted logs; and ChatGPT/Codex history.

**Failed or partial experiments:**

- Static catalogue data became stale; merged fallbacks reintroduced unsupported products.
- Immediate deletion on supplier absence was unsafe during outages.
- Remembered prices caused flicker and stale-value risk.
- Frontend-only stock did not reach shipping validation.
- Broad measurement defaults enabled coverage but retained financial risk.
- Per-unit freight multiplication produced unrealistic quantity quotes.
- Browser-local orders failed across devices; merging restored deleted data.
- Focus/timer auth refresh worked only after a visible delay.
- Client-only SEO produced duplicate shells and soft 404s.
- GTIN-only scans consumed requests with little coverage.
- One no-result provider task incorrectly failed useful sibling work.
- One serial field per unit and one shipment per order did not match operations.
- Browser-designed emails failed in Outlook.
- A manually present generated file did not exist in clean Vercel builds.
- Marketing-style content introduced unsupported claims and had to be removed.

**What I learned and changed:**  
External and cached data need provenance, confidence, and ownership. Partial failures must be isolated. Supplier removal needs complete-success evidence. Runtime and generated outputs need shared rules. Browser state cannot be an operational source of truth. Loading differs from not-found. Exact identity matters more than fuzzy similarity when price is affected. An honest unavailable/contact state is safer than invented precision. High-risk automation needs monitoring, review, exclusions, floors, audit history, and disabled-by-default activation.

## F. AI used during development

**Which AI coding/development platforms did I use?**  
I used OpenAI ChatGPT and Codex extensively as development assistants. Uses included requirements clarification, code generation and editing, architecture analysis, SQL/migration drafting, debugging, test design, log interpretation, UI review, SEO and content review, policy drafting, and preparation of deployment/platform instructions.

**Were the accounts supplied by Jortel/Jortelligence or personal?**  
**To be confirmed.** The repository does not establish the OpenAI account owner or payer. This should be answered from the OpenAI account, invoice, company subscription, or employment records.

**Does the prompt/conversation history still exist?**  
Yes, to the extent it has not been deleted and remains under the account's retention settings. The retained history contains screenshots, pasted logs, uploaded spreadsheets/documents, requests, proposed changes, explanations, and iterative verification discussions across the project.

**Were AI tools used to troubleshoot technical problems?**  
Yes. I supplied concrete symptoms and evidence such as Vercel build errors, Supabase query results, DataForSEO scan results, Search Console screenshots, Merchant issues, checkout behaviour, responsive screenshots, supplier discrepancies, and business requirements. Proposed changes were then inspected in the repository and tested.

**Did I provide errors/test results and experiment with proposed solutions?**  
Yes. The process was iterative: provide the observed failure, inspect code/data, implement a proposed change, and use tests, builds, audits, screenshots, database queries, or live behaviour to decide whether it worked. When it did not, I supplied the new result and changed the approach. Examples include missing Vercel files, zero-result competitor scans, delayed admin login state, postcode stock rejection, Search Console exclusions, freight-data gaps, and UI overflow.

**Where can the historical conversations be accessed?**  
Through the ChatGPT/Codex account and workspace used for development, subject to access and retention settings. Some pasted text and attachments also exist in local Codex attachment history. If required as formal evidence, the company should preserve an authorised export.

**How did I control AI-related risk?**  
I did not treat generated code or prose as proof. Material work was checked against repository files, supplier records, official API behaviour, TypeScript, tests, production builds, database results, and observed UI behaviour. Unknown external states are marked **To be confirmed**. Prices, stock, ETA, dimensions, availability, competitor identity, and legal conclusions were not supposed to be invented from AI output.

## G. Development records

**Repository and source versions:**  
The main repository is `github.com/Peanut951/Internext`, with a local Git working copy and Vercel deployment integration. Git retains source versions from 4 December 2025 onward. The history should not be rewritten or cleaned if it is required as evidence.

**Commit history:**  
Retained meaningful entries include the December 2025 foundation and June 2026 changes for catalogue load speed, Merchant images/feed issues, cart navigation, and crawler handling. Many later snapshots have generic `Clean repo` messages, so file diffs, Vercel deployments, AI history, screenshots, and reports are also needed to reconstruct the work accurately.

**Branches and pull requests:**  
`main` is the primary deployment branch. Any remote branches, pull requests, reviews, and deleted-branch references still available in GitHub should be retained. Completeness of pull-request history is **To be confirmed** in GitHub.

**Deployment records:**  
Vercel retains commit-linked production/preview deployments, build machine information, generated output, errors, and timing. These logs are important evidence of clean-environment failures and successful production builds.

**Database records:**  
`supabase/migrations/` documents schema work for orders, roles/profiles, marketing contacts, stock overrides, shipping measurements, Xero-ready data, and competitor pricing. The deployed database contains operational rows and provider scan history. Migration history, schema-only exports, and authorised backups should be preserved.

**Tests and audits:**

- `tests/verified-product-identity.test.mjs`
- `tests/auth-session-reactivity.test.mjs`
- `tests/competitor-pricing.test.mjs`
- `tests/competitor-provider-normalization.test.mjs`
- `tests/google-ads-campaign.test.mjs`
- `scripts/audit-catalog-integrity.mjs`
- `scripts/count-missing-shipping-dimensions.mjs`
- `scripts/audit-google-product-titles.mjs`
- `scripts/audit-public-price-floors.mjs`
- `scripts/audit-seo-pages.mjs`
- `scripts/audit-mobile-layout.mjs`
- Google feed, sitemap, static-route, and static-product generation scripts.

**AI history:**  
The OpenAI account/workspace holds iterative prompts, responses, screenshots, and attachments, subject to retention. This helps show the problem presented, alternatives considered, implementation requested, and verification result.

**Task/ticket systems:**  
No dedicated ticket platform is established by the repository. If work was also recorded in company email, Microsoft systems, notes, or another tool, it should be identified and retained. Otherwise, Git, AI history, Vercel, screenshots, and reports provide the main chronology.

**Test results:**  
Results exist in terminal output, Vercel logs, generated reports, screenshots, database queries, and AI conversations. Not every historical terminal run was committed. Future material audits should therefore be timestamped and archived rather than only viewed interactively.

**Call logs/recordings:**  
None are confirmed in the repository. Relevant phone, Teams, or meeting recordings in company systems should be preserved and linked by date if they exist.

**Latency/performance records:**  
Vercel logs contain build/serverless timing, and issue records document slow first catalogue/product loads. No single controlled before/after performance benchmark is confirmed, so precise latency improvements should not be claimed without further measurement.

**Error/debug logs:**  
Relevant records exist or may exist in Vercel, Supabase, browser consoles/network traces, Stripe, Power Automate, Microsoft 365, DataForSEO, Google Merchant, Search Console, and supplier systems. Pasted deployment logs and screenshots should be retained with dates.

**Architecture diagrams:**  
No formal current diagram is confirmed. The architecture is represented by `src/App.tsx`, `api/`, `src/lib/`, `shared/`, `supabase/migrations/`, `scripts/`, `.env.example`, `vercel.json`, and technical documentation. A dated architecture/data-flow diagram would strengthen the evidence.

**Meetings and communications:**  
No complete set is in Git. Relevant Teams, Slack, WhatsApp, email, supplier correspondence, meeting notes, and management instructions should be preserved externally.

**Cloud/API logs:**  
Potential records exist in Vercel, Supabase, Stripe, Google Merchant, Search Console, Google Ads, Analytics, Microsoft Clarity, Power Automate, Microsoft 365, DataForSEO, Xero, Alloys, Leader, Australia Post, and Geoapify. Provider retention periods differ, so exports should be taken before records expire.

**Other supporting records:**  
Supplier spreadsheets, exact-price tables, campaign spreadsheets, Xero templates, product PDFs, generated reports, screenshots, uploaded documents, policy drafts, and deployment configuration should be retained. Secrets must not be placed in evidence bundles; retain environment-variable names, purpose, and secure account ownership records instead.

**Recommended preservation actions:**

1. Create read-only Git tags or archived snapshots for significant milestones.
2. Export Vercel deployment/build history and identify each production commit.
3. Preserve Supabase migrations, a schema-only export, and authorised backups.
4. Export relevant ChatGPT/Codex conversations and attachments.
5. Archive dated catalogue, freight, SEO, pricing, and competitor reports.
6. Preserve Search Console, Merchant, and DataForSEO results.
7. Retain supplier instructions, price spreadsheets, Xero templates, and policy approvals.
8. Record who owns each external account and who approved production activation.
9. Do not remove failed experiments; they explain why the final architecture was necessary.

## H. Approximate allocation of my time

The following is a reasoned estimate based on the repository and retained history. It totals 100% but should be reconciled with timesheets and calendars before formal use.

| Work category | Approx. share | Included work |
| --- | ---: | --- |
| Researching technical problems and technology | 12% | Supplier formats, Google, shipping, Supabase, Stripe, Power Automate, Xero, DataForSEO, legal guidance, and product sourcing. |
| Experimental development | 18% | Alternative catalogue, cache, stock, price, freight, SEO, email, and competitor approaches. |
| Testing different approaches | 15% | Tests, audits, builds, comparisons, checkout simulations, cross-device checks, mobile/browser tests, and platform validation. |
| Analysing failed/successful tests | 10% | Logs, unsupported counts, freight gaps, scan failures, auth races, Outlook defects, Search Console states, and deployment errors. |
| Normal coding/product development | 20% | Frontend, APIs, shared libraries, admin, checkout, generators, database code, and content implementation. |
| Routine API/system integration | 10% | Alloys, Leader, Supabase, Stripe, Power Automate, Australia Post, Geoapify, Google, DataForSEO, and Xero-ready data. |
| Bug fixing and regression prevention | 10% | Product, stock, price, build, role, persistence, layout, feed, and workflow defects. |
| Customer/admin configuration and support | 3% | Real user reports, campaign guidance, account/platform setup, and operational instructions. |
| Documentation, deployment, and evidence | 2% | Vercel deployment, technical records, reports, questionnaire/case study, and release verification. |
| **Total** | **100%** | |

## Project chronology

**Foundation, from December 2025:**  
I established the React/TypeScript/Vite application, GitHub/Vercel deployment, public routes, and initial product/business site.

**Supplier and commerce development:**  
I developed Alloys/Leader ingestion, product search/detail/category experiences, pricing and stock, cart, address handling, checkout, Stripe, shipping, and account roles.

**Operational platform:**  
I moved orders/corrections to Supabase and added admin order handling, payment requests, Power Automate communications, multiple shipments, serial capture, marketing contacts, stock overrides, and Xero-ready records.

**Data quality and search hardening, especially through mid-2026:**  
I addressed unsupported products, titles, descriptions, images, exact advertised prices, shipping measurements, Google Merchant, static SEO, canonicals, noindex routes, and true 404s. Retained commits dated 16 and 18 June 2026 specifically show catalogue-load, Merchant image/feed, cart-navigation, and crawler work.

**Current hardening, September 2026:**  
I addressed immediate admin login state, central competitor administration, DataForSEO no-result/query coverage, strict activation locks, and deployment reliability. Current priorities are regenerating/removing the 66 unsupported generated catalogue entries, replacing 1,364 low-confidence shipping fallbacks, verifying external production states, and maintaining regression monitoring.

## Current unresolved or externally unverified items

- Regenerate and re-audit the Google feed and sitemap to remove the 66 currently detected unsupported generated entries.
- Continue replacing 1,364 low-confidence shipping fallbacks with verified package measurements.
- Confirm exact production supplier refresh settings and monitor complete-sync failures.
- Confirm Stripe live-mode/webhook state through the production Stripe account.
- Confirm Power Automate shared-mailbox identity and end-to-end delivery.
- Confirm Xero account/tax mappings and decide whether direct OAuth integration will proceed.
- Confirm Merchant promotion approval and current Search Console recrawl/validation outcomes.
- Review competitor sellers/matches and commercial floors before enabling automatic pricing.
- Obtain formal business/legal approval for public policy wording.
- Confirm OpenAI account ownership and the exact project-time percentage.

## Final summary

I built Internext by converting observed commercial and technical failures into explicit controls. A missing cross-device order led to shared Supabase persistence. Incorrect quantity freight led to package consolidation and measurement confidence. Stale supplier products led to verification/quarantine and full-output audits. Price changes after load led to server authority. A 30-second login delay led to same-tab session events and race protection. Empty competitor searches led to per-task isolation and review-only candidates.

The project is substantial because correctness has to survive every representation of the same transaction. A product is not safely removed until it is absent from the site, checkout, Google feed, sitemap, recommendations, and static pages. A price is not correct until its channel and source are known and it survives checkout validation. A freight quote is not defensible until its package data and confidence are known. The remaining exceptions are recorded rather than hidden, and high-risk automation remains disabled until its prerequisites are deliberately approved.
