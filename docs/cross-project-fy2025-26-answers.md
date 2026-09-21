# FY2025-26 Cross-Project Development Answers

## Basis and limitations

I prepared these answers from the locally retained Codex JSONL conversations, the Git histories and current source trees for Jortel, Jortech, and Internext, and the development evidence already identified in the Internext questionnaire.

The local Codex archive confirms the project working directory, timestamp, model provider, and conversation content. Git confirms commit dates and changed files. Neither source proves exact hours worked, so all percentages are evidence-informed estimates and should be reconciled with timesheets, calendars, payroll records, emails, Vercel activity, and other company records before formal use.

The historical conversations contain signed webhook URLs and other credentials. I have deliberately not reproduced those values here. Any credentials disclosed in source or conversation history should be rotated if still active, while the original evidence is preserved under restricted access.

## 1. Jortel.com.au

### Dates and approximate time

The Jortel Git repository contains work from **16 October 2025 to 3 August 2026**. For the requested FY2025-26 period, evidence shows work from **3 December 2025 through 30 June 2026**.

Within 1 December 2025 to 30 June 2026, the repository contains **118 commits across 33 active commit dates**. The retained Codex history includes Jortel sessions commencing on 9 December 2025, 15 February 2026, 31 March 2026, 27 April 2026, and 12 May 2026, containing approximately **340 substantive user requests** before the cutoff.

My evidence-informed estimate is that Jortel represented approximately **24% of my total working time from December 2025 to 30 June 2026**. This is not a timesheet-derived figure.

### What I developed

I developed and repeatedly refined a React/TypeScript telecommunications website covering:

- Home, about, contact, FAQ, plans, newsroom, wholesale, hardware, privacy, terms, and financial-hardship pages.
- Mobile voice/data, NBN, hosted voice, SIP trunking, inbound calls, business fibre, hosted Teams, international roaming, and Keep Up With Technology pages.
- Web design/development and digital marketing service pages.
- Product/plan cards, pricing and rate tables, comparison layouts, channel calculators, accordions, carousels, navigation, footer links, calls to action, responsive layouts, and brand styling.
- A help-article/FAQ interface created by extracting relevant FAQ material from supplied HTML documents rather than embedding the original pages.
- Critical Information Summary links and route aliases for product/service pages.
- Contact, wholesale, and mobile application workflows connected to Microsoft Power Automate.
- Conditional application fields, email/phone/card-format validation, identification-document fields, address autocomplete, and file-attachment payload work.
- NBN predictive address search and service qualification through server-side proxy endpoints, with Geoapify address support and Telcoinabox/TIAB integration.
- Telstra Wholesale mobile coverage compliance content, an embedded coverage map, current and historical outage links, corrected network naming, and removal of unsupported population/geographic claims.
- A detailed Apple Watch and Samsung Watch companion eSIM guide using extracted instructional screenshots, separate platform sections, removal instructions, navigation links, FAQs, and mobile layouts.
- Vercel/CRA build and deployment configuration, analytics/tag placement, SEO-related routes, and responsive/mobile improvements.

The current route map and server code provide direct evidence in `C:\projects\jortel-site\src\App.tsx`, `src\components\NbnSearchBar.tsx`, `api\_tiab.js`, `api\nbn-address-search.js`, `api\nbn-qualification-check.js`, `src\pages\MobileCoverage.tsx`, and `src\pages\WatchEsim.tsx`.

### Normal website development

The following work was normal website development where the outcome and implementation method were generally known in advance:

- Changing colours, typography, spacing, headings, button styling, card dimensions, backgrounds, and content hierarchy.
- Creating and rearranging pages, plan tiles, rate tables, accordions, menus, FAQs, legal-document pages, redirects, and footer links.
- Adding supplied business content, plan prices, critical information links, social links, newsroom items, addresses, and branding.
- Standardising CTA banners, shadows, responsive spacing, and service-page presentation.
- Iterating designs where the first visual version was disliked and then reverting or restyling it.

This work required implementation and testing, but it was not technically uncertain in the R&D sense merely because it took time or several design iterations.

### Technically uncertain work

The areas where I genuinely did not know beforehand whether or exactly how the desired outcome could be achieved were:

#### NBN predictive address and qualification integration

The original address/qualification provider was unreliable. I investigated whether Internext/Jortel could avoid RapidAPI, whether an official NBN endpoint was available, and whether Telcoinabox/TIAB supplied separate predictive-search and qualification APIs. The difficulty was coordinating two endpoints, credentials, Vercel environment variables, location identifiers, response formats, and customer-facing speed/service-class output without exposing supplier credentials.

Approaches included the existing third-party search, Geoapify-style autocomplete, an attempted NBN proxy approach, and finally dedicated serverless proxies to Telcoinabox/TIAB. Failures included exhausted/non-working provider access, confusion between the address and service-qualification endpoints, missing credentials after deployment, credentials being configured on the wrong Vercel project, slow or empty search responses, and irrelevant address suggestions.

Subsequent work normalised responses, separated address search from qualification, hid technical service-class details, sorted available speed tiers, improved suggestion filtering, and retested with actual addresses and deployed environment variables.

#### Power Automate form delivery and attachments

The requirement was for forms to submit without opening the customer's email client and to deliver structured emails through Microsoft Power Automate. The technically uncertain part was carrying browser file data through JSON, the HTTP trigger schema, array variables, and Outlook attachments while preserving the actual image/PDF bytes and file type.

Several attempts only sent the filename, created an attachment Outlook could not open, or produced the wrong binary conversion. I tested base64 content, `ContentBytes`, data URIs, `base64ToBinary`, `dataUriToBinary`, Parse JSON schema changes, array construction, and email attachment configuration. The retained May conversation records repeated failed tests followed by the user's confirmation that the attachment finally worked, after which delivery to two email addresses and conditional ID fields were added.

#### Vercel clean-build behaviour

A February deployment failed because Vercel set `CI=true`, causing CRA warnings to fail the build. The log identified a Unicode BOM, unused variables/imports, and an unsafe `_blank` link. The problem was not the local UI but clean CI behaviour. The source was cleaned and rebuilt rather than disabling all checks. Earlier Vercel configuration commits from October 2025 also show that deployment configuration had already required investigation.

#### Address prediction and dynamic validation

Address suggestions did not consistently prioritise full street addresses and could return broad places. The application form also needed different fields and length/format constraints based on selected ID type and card network. I iterated query timing, result filtering, field mapping, card-brand detection, expiry/date constraints, and conditional form sections, then tested the displayed and emailed values.

#### Embedded coverage-map performance

The mandatory third-party Telstra Wholesale iframe could remain on `Loading` for an extended period. Because Jortel did not control the external map, I added a loader, slow-load message, retry/open-direct actions, and compliant fallback links rather than claiming the iframe itself could be made instant.

#### Large instructional eSIM page

The supplied PDF had to become a usable web guide without embedding the document. I had to extract and organise dozens of screenshots, map them to Apple/Samsung steps, preserve removal warnings, avoid exposing spreadsheet notes, and keep a media-heavy page usable on mobile. The content and layout were tested iteratively against the requested step order and mobile behaviour.

### Failures, partial failures, changes, and results

- An international-roaming bar was tried, refined, then reverted to the original tile after visual testing.
- Background-image experiments failed due to an unresolved absolute asset path, z-index placement that either hid the image or covered content, and poor section continuity. Several were reverted to alternating solid backgrounds.
- Multiple CTA, service-table, carousel, and newsroom designs were rejected and reworked. These were design iterations, not technical uncertainty.
- The Power Automate contact flow initially produced no run, displayed success without email, or used the wrong endpoint. Payload/schema and flow configuration were corrected and retested.
- Attachment tests progressed from filename-only, to unreadable images, to corrected data-URI/binary handling. The history records eventual successful delivery.
- The NBN integration failed with provider errors, endpoint confusion, missing environment variables, and configuration on the wrong site before the proxy/credential arrangement worked.
- The Vercel CRA build failed on BOM, unused symbols, and link-security warnings and was corrected against the deployment log.
- The coverage iframe remained dependent on third-party load performance; the result was graceful slow-load handling, not elimination of external latency.
- Mobile and responsive checks were requested across the full website, followed by smaller mobile cards and page-specific corrections.

### Evidence

- Git repository: `C:\projects\jortel-site\.git`.
- Git evidence: 118 FY commits across 33 dates; early meaningful commits include `f89da80`, `1458562`, `dbb0014`, `b5bda18`, and `5ff7459`; FY snapshots include `85b1db6` on 16 February 2026 and `bf5b889` on 30 June 2026.
- Codex sessions:
  - `C:\Users\Pranit\.codex\sessions\2025\12\09\rollout-2025-12-09T13-07-19-019b00dc-f697-7871-a6f0-b3699f67bab4.jsonl`
  - `C:\Users\Pranit\.codex\sessions\2025\12\10\rollout-2025-12-10T09-09-45-019b0529-d3f5-7862-9b43-c3fe7d023b72.jsonl`
  - `C:\Users\Pranit\.codex\sessions\2026\02\16\rollout-2026-02-16T09-47-36-019c637c-e85a-76b1-9408-e38733d7f376.jsonl`
  - `C:\Users\Pranit\.codex\sessions\2026\03\31\rollout-2026-03-31T12-15-29-019d4175-c059-7023-85a3-ab4f2bc96826.jsonl`
  - `C:\Users\Pranit\.codex\sessions\2026\04\28\rollout-2026-04-28T09-13-12-019dd137-db68-77b0-a1af-807b0664eb24.jsonl`
  - `C:\Users\Pranit\.codex\sessions\2026\05\13\rollout-2026-05-13T09-10-51-019e1e75-1b56-77f2-9e60-0eab1f03fe04.jsonl`
- Vercel deployment history for `Peanut951/Jortel-Site-Clean`.
- Power Automate run history, NBN/TIAB provider logs, and any retained test emails/attachments.

## 2. Jortech.com.au

### Dates and approximate time

The earliest retained Codex work in the Jortech directory is **9 December 2025**. The Git repository begins on **17 December 2025** and contains activity through **25 May 2026**. I found no Jortech repository commits after that date in the local history reviewed.

For FY2025-26, the repository contains **150 commits across 21 active commit dates**. Retained Codex sessions commenced on 9 December 2025, 16 February 2026, 17 February 2026, 22 February 2026, and 31 March 2026, containing approximately **483 substantive user requests**.

My evidence-informed estimate is that Jortech represented approximately **26% of my total working time from December 2025 to 30 June 2026**.

### What I developed

I developed a React, TypeScript, Vite, Tailwind, and shadcn/Radix website for Jortech's telecommunications, electrical, and critical-infrastructure services. Work included:

- Home, services, systems, clients, team, contact, privacy, and true not-found routes.
- A detailed service taxonomy covering emergency response, specialist electrical works, telecommunications infrastructure, Starlink, data centres, critical infrastructure, commercial environments, asset installation, structured cabling/voice networks, backup generators, UPS/battery work, site electrical care, safety testing, facility load testing, test-and-tag, and related services.
- Service navigation, grouped dropdowns, active-route highlighting, related-service mapping, footer structure, route/title alignment, and redirects from old route names.
- Business-specific copy and a differentiation pass so content and navigation did not simply reproduce Titanium Services Group wording.
- Removal of inaccurate ISO/compliance claims and services the business confirmed it did not provide.
- Client/partner presentation, service imagery, local videos, carousels, team/careers content, contact forms, and application forms.
- Power Automate contact and job-application workflows.
- Responsive/mobile design, page metadata, route lazy loading, idle prefetching, loading shells, and Vercel SPA rewrites.

The current architecture is evidenced by `C:\projects\jortech-blueprint-site-main\jortech-blueprint-site-main\src\App.tsx`, `src\components\Header.tsx`, `src\pages\ContactUs.tsx`, the service modules under `src\pages\services\`, and `vercel.json`.

### Normal website development

Normal development included service-page creation, content changes, renaming, route alignment, colours, typography, spacing, cards, navigation, logo replacement, image selection, carousels, client sections, team content, CTA controls, footer layout, and mobile styling. The numerous cases where a visual version was disliked and restyled were ordinary design iteration.

### Technically uncertain work

#### Reusing and adapting Power Automate

The February history explicitly asks whether the working Jortel Microsoft/Power Automate implementation could be reused for Jortech. The Jortech contact form had a different field structure, so I evaluated whether to map it to the existing payload or create a separate flow. A separate endpoint/payload was configured and tested.

#### Career form file attachments

This was the largest uncertain Jortech experiment. The requirement was to accept a CV in the browser, send it through a Vercel-hosted website and Power Automate, and deliver a valid PDF or Word attachment in Outlook.

Attempts included filename-only payloads, JSON schema updates, base64/data URI handling, temporary file creation/deletion in Power Automate, corrected file extensions, binary conversion, and eventually an Outlook SMTP alternative. Results included no attachment, `.pdf___` names, files containing PDF bytes but treated as the wrong type, and PDFs that opened with blank pages. After repeated partial failures and concern about placing mailbox credentials in Vercel, the CV attachment was removed from the public form. That is a valid negative R&D result: the attempted architecture did not meet reliability/security requirements in the available time.

#### SPA refresh/deep-link deployment

Refreshing a non-home route returned a hosting error because Vercel looked for a physical file. The resolution was a catch-all rewrite to `/index.html` in `vercel.json`, preserving client-side routing.

#### Load performance and route architecture

The site showed a white/blank period while large pages, images, and videos loaded. I investigated media weight, eager imports, loading feedback, and navigation clunkiness. The current architecture uses lazy-loaded routes, `Suspense`, a branded loading shell, and idle route prefetching. The remaining real-world improvement depended on image/video compression and production measurement.

#### Runtime and TypeScript failures

The history records a `moduleResolution: bundler`/module configuration error, a blank contact page caused by `formData` being used before declaration, a client page failing because `ArrowRight` was undefined, and an editor conflict where the file changed while being edited. These required source inspection, ordering/import correction, build checks, and care not to overwrite newer changes.

#### Smooth infinite carousel and responsive media

The client-logo carousel visibly glitched when returning to its start. I adjusted duplication/animation structure and responsive sizing to make the loop continuous. This was tested visually on desktop and mobile.

### Failures, partial failures, changes, and results

- Early content closely resembled a reference competitor. A site-wide differentiation pass changed headings, descriptions, navigation, and ordering while preserving the actual service meaning.
- Generated or assumed service content included work Jortech did not provide. Those pages/claims were removed after business review.
- Several homepage, technology, client, and footer redesigns were rejected or reverted. These were visual experiments.
- Contact submission initially failed, full service labels did not appear in email, and one code change caused a blank page through a variable-order error. Mapping and source order were corrected.
- Non-home refreshes failed until the Vercel SPA rewrite was added.
- `ArrowRight` being undefined crashed the client page until the missing import/reference was corrected.
- The career CV attachment remained unreliable after many approaches and was ultimately removed. Email/phone validation remained.
- Performance work produced lazy routes, loading UI, and prefetching, but no formal before/after benchmark was retained.
- Service names, page headings, links, and Australian spelling were audited for consistency.
- Mobile compatibility was checked while preserving desktop presentation.

### Evidence

- Git repository: `C:\projects\jortech-blueprint-site-main\jortech-blueprint-site-main\.git`.
- Git evidence: 150 FY commits across 21 dates, from `69752b1`/`079f224` in December 2025 through `867b7a7` on 25 May 2026.
- Codex sessions:
  - `C:\Users\Pranit\.codex\sessions\2025\12\09\rollout-2025-12-09T14-29-21-019b0128-0f1a-7e01-8ccb-efbf002a4b1c.jsonl`
  - `C:\Users\Pranit\.codex\sessions\2026\02\16\rollout-2026-02-16T14-46-29-019c648e-8dd4-7690-b4b0-783940acc68c.jsonl`
  - `C:\Users\Pranit\.codex\sessions\2026\02\17\rollout-2026-02-17T09-32-22-019c6895-54ba-7393-a9ee-30f07472ebd2.jsonl`
  - `C:\Users\Pranit\.codex\sessions\2026\02\23\rollout-2026-02-23T09-22-03-019c8772-0a89-7ad0-b1ee-4e741b5b8ad3.jsonl`
  - `C:\Users\Pranit\.codex\sessions\2026\04\01\rollout-2026-04-01T10-15-34-019d462e-5405-7652-b317-f9d9abfb71f1.jsonl`
- Vercel deployment history and Power Automate run/email records.

## 3. Relationship between Jortel, Jortech, and Internext

Yes. The projects are separate websites, but architecture, experiments, failures, and practical knowledge moved between them.

### Progression

**October to December 2025: Jortel foundation**  
Jortel was the earliest of the three repositories. It established practical experience with React/TypeScript, client-side routing, responsive plan/service pages, Vercel deployment, production build behaviour, content-heavy layouts, and customer contact flows.

**4 December 2025: Internext foundation**  
Internext's first Git commit predates the first tracked Jortech commit. Internext therefore did not originate entirely from Jortech. It began while Jortel work was already underway.

**December 2025 onward: Jortech service architecture**  
Jortech used the same broad React/Vite/TypeScript/shadcn family later visible in Internext. Its work on grouped navigation, many route modules, service-card patterns, responsive layouts, lazy loading, metadata, and SPA deployment contributed practical patterns, although package similarity alone does not prove direct code copying.

**December 2025 to June 2026: Power Automate progression**  
Jortel first developed the Microsoft email/webhook pattern. The Jortech February 2026 conversation explicitly asked to implement email in the same way as Jortel, then adapted the payload for Jortech. Internext subsequently used environment-driven Power Automate endpoints for reseller applications, internal/customer order emails, contact messages, and shipping notices. Jortel/Jortech failures with wrong endpoints, no run history, malformed bodies, file encoding, and Outlook layout informed the more structured Internext payload and email work.

**March to June 2026: forms, addresses, and validation**  
Jortel's autocomplete, predictive-address, conditional fields, and validation work, together with Jortech contact/application forms, informed Internext's later account, reseller, checkout, address, and contact forms. The main transferred lesson was that field labels, payload values, browser display, and received email must be tested together.

**Vercel and routing knowledge**  
Jortel's clean CI failure and Jortech's deep-link refresh failure informed Internext's attention to clean builds, SPA/static rewrites, environment separation, route fallbacks, and generated files. Internext later extended this substantially with serverless APIs, build-time Google output, static product pages, and audit gates.

**Performance and mobile knowledge**  
Jortech's blank-load/media problems and Jortel's full-site mobile work contributed to Internext's use of lazy routes, loading states, image prioritisation, mobile checks, and later catalogue performance work.

**Accuracy and content controls**  
Jortech had to remove invented services and compliance claims; Jortel had to implement current network wording and policy documents. This carried into Internext's later practice of removing unsupported partner tiers, response promises, service claims, supplier-derived assumptions, intangible Merchant products, and invented price/stock/ETA information.

The progression was therefore mainly **knowledge and patterns**, not a claim that all Jortel/Jortech source code was copied into Internext. Internext added substantially different R&D: two-supplier catalogue normalisation, pricing and stock authority, Stripe transaction verification, freight packing, Google product generation, Supabase order operations, and later competitor-pricing controls.

## 4. Internext work completed or underway by 30 June 2026

The following major Internext areas had already occurred between December 2025 and 30 June 2026.

| Area by cutoff | What had occurred by 30 June 2026 | Evidence |
| --- | --- | --- |
| Foundation | React/Vite/TypeScript application and Vercel deployment existed from 4 December 2025. | Commits `0edd2193`, `68b9ffbf`, `9a2ac749`, `7cc1684c`, `7e9832c5`. |
| Alloys catalogue | From 22 February, work began to import thousands of products, organise categories/brands, create detail pages, cart support, images, descriptions, search, filters, pagination, and supplier-order concepts. | Codex session `rollout-2026-02-23T09-24-59-019c8774-b67c-7682-83d6-7bcb01fd4868.jsonl`; February/March commits. |
| Product data enrichment | March work covered large-batch image galleries, source matching, descriptions, product cards, product-specific highlights, and category filters. June work addressed model-first names and formatted long descriptions. | Codex messages 2-18 March and 28-30 June; scripts and product modules. |
| Authentication and roles | Supabase login, password reset, reseller/user/admin concepts, profile storage, reseller order history, and address autocomplete were being developed by 29-31 March. Admin-role overwrite was reported and addressed by 25 June. | March Codex history; June role conversation; representative commit `af8a821c`. |
| Stripe checkout | Checkout/payment architecture and internal order notification were developed from 13 May; a Stripe environment key was configured by 18 May. Server-side payment/session work was underway. | May Codex history; `api/checkout/` history and Vercel records. |
| Live price, stock, ETA, and dimensions | Alloys live-feed integration began 19 May, with price comparisons, markup rules, location availability, ETA, dimensions, and product-page measurement tabs. Different public/reseller GST rules and out-of-stock checkout blocking followed. | 19-25 May Codex history and commits. |
| Shipping and address quoting | Address validation and Australia Post-style freight quoting began 19 May. Actual product dimensions were required by 20 May. Missing Google shipping weight was visible by 2 June. The unrealistic $234 quote for 22 brackets exposed per-unit packing on 25 June. | May/June Codex history. |
| Customer, guest, and order flows | Guest checkout, customer portal/order history, internal/customer emails, cart clearing, and separate GST/shipping presentation were being built from 1 June. Several email and return-from-Stripe failures were still being debugged through 30 June. | 1-30 June Codex messages; representative commits `8969bc86`, `1275cceb`. |
| Leader integration | Leader products and feed integration began 2 June. Duplicate products, source price selection, images, unsupported formats, and PDF-derived records became issues. By 30 June, the user required removal of products created only from the Leader Q1 PDF. | 2, 8, and 30 June conversations; `api/catalog/live.ts`, Leader feed scripts; commit `8f4980d7`. |
| Google Merchant and SEO | Google feed, physical-product filtering, image processing, GTIN/MPN/title quality, Analytics tag, product indexing, and soft-404 investigation occurred throughout June. | 2-21 June conversations; commits `2640aa41`, `a5e67c06`, `634981d2`, `66d0476a`, `f29c8ade`. |
| Catalogue performance | First-load and product-detail slowness were repeatedly reported. A specific catalogue-load optimisation was committed on 16 June. Price flicker and long product-detail load remained active 22-30 June. | Commit `eae2fff6`; 16, 22, 23, and 30 June conversations. |
| Price consistency | On 22 June a product first showed 1,065 and then 1,443.29. Work aligned initial and refreshed values while preserving live updates. | 22-23 June conversation; commit `7df973da` changed live catalogue/detail/feed files. |
| Admin order operations | By 25 June, work covered cross-device order persistence, admin-wide visibility, filters, collapse controls, carrier/tracking fields, shipment email, serial capture, marketing contacts, and removing unused supplier/processing actions. | 25 June conversation; Supabase/order code and migrations existing by cutoff. |
| Product removal and tangible-only rules | By 29-30 June, warranty/intangible products were being removed from the website and Merchant feed; PDF-only Leader products and unsupported stock claims were challenged. | 29-30 June conversation; static/feed/catalogue scripts; 23 June tool evidence recorded 6,027 feed items and 6,938 sitemap product URLs during that iteration. |
| Similar products and titles | A first similar-products section, four-item row, model-led naming, and category relevance work existed by 29-30 June, but poor matches remained. | 29-30 June conversation; commit `c30d9234` later on 29 June includes `productTitles.ts` and product/feed changes. |
| Legal content | A distribution-specific policy and 15% change-of-mind restocking clause were requested by 25 June. The final detailed ACL/DOA wording in the later questionnaire was completed after the cutoff. | 25 June conversation versus later September history. |
| Xero | Direct Xero API requirements were discussed on 29 June and an email requesting credentials/mappings was drafted. The later Xero-ready schema and integration work should not automatically be treated as completed by 30 June without commit-level proof. | 29 June conversation. |

### Problems only partially solved by the cutoff

By 30 June, product loading, Leader product provenance, stock totals, WA stock, similar-product relevance, shared-mailbox sending, customer invoice delivery, long-description formatting, and some intangible-product removal were still active failures or partial fixes. They should be described as experimental/in-progress for FY2025-26, not as completed outcomes.

### Major later work that must not be attributed to FY2025-26

The following parts of the current questionnaire occurred after 30 June or reached their substantive final form later:

- DataForSEO/Prisync/Price2Spy competitor discovery, seller review, recommendations, and automatic pricing controls.
- The September same-tab admin-login/session-race fix.
- Exact advertised-price spreadsheet overrides and later fixed-price audit rules.
- The mature shipping measurement-source/confidence/admin-correction programme and the current 1,452/1,364 audit figures.
- The comprehensive catalogue-integrity quarantine/audit and current unsupported-output counts.
- Multiple shipments per order and the later one-multiline-box serial-number workflow. By cutoff, basic single carrier/tracking and quantity-based serial capture were being developed.
- The final first-order 10% account/device eligibility controls and Google promotion work.
- The final detailed returns/DOA/ACL wording.
- Later homepage/about redesigns and mobile regression work.
- Final Search Console canonical/noindex/true-404 hardening where implemented after the cutoff, although soft-404/static-page work had already begun in June.

### Internext evidence retained for the cutoff period

- Git: **292 commits across 35 active dates** from 4 December 2025 to 30 June 2026.
- Codex: **556 substantive dated user turns** through 30 June in the locally retained Internext sessions.
- Main pre-cutoff sessions:
  - `C:\Users\Pranit\.codex\sessions\2026\02\23\rollout-2026-02-23T09-24-59-019c8774-b67c-7682-83d6-7bcb01fd4868.jsonl`
  - `C:\Users\Pranit\.codex\sessions\2026\05\18\rollout-2026-05-18T11-13-32-019e38a5-3703-77a2-b3d6-a823b6442f42.jsonl`
  - `C:\Users\Pranit\.codex\sessions\2026\06\23\rollout-2026-06-23T16-06-36-019ef316-658d-76f0-ba71-8ee69e78a7a9.jsonl`
- Vercel deployment records linked to the Git commits.
- Supplier feed snapshots, Google feed/sitemap output, Supabase rows/migrations, Power Automate runs/emails, and Stripe records from the period where retained.

## 5. Overall time allocation, December 2025 to 30 June 2026

### Evidence used

For the three websites, the reviewed period contains:

| Project | Git commits | Active commit dates | Retained Codex user turns |
| --- | ---: | ---: | ---: |
| Internext | 292 | 35 | 556 |
| Jortel.com.au | 118 | 33 | approximately 340 |
| Jortech.com.au | 150 | 21 | approximately 483 |

Commit count, active days, and conversation turns measure different things. I gave each indicator equal weight to estimate the relative share among the three website projects. That produces approximately 44% Internext, 27% Jortel, and 29% Jortech of the **tracked website activity**, not total employment hours.

I found no equivalent local Git/Codex evidence identifying separate AI Inbound Agent, Social Media/AI Avatar, or Copilot/Productivity Assistant project histories for this period. The percentages below therefore reserve a small provisional amount for those named projects and non-development work, but those rows require personal/timesheet confirmation.

### Provisional total-time estimate

| Work area | Estimated share |
| --- | ---: |
| Internext | **40%** |
| Jortel.com.au | **24%** |
| Jortech.com.au | **26%** |
| AI Inbound Agent | **2% - provisional** |
| Social Media/AI Avatar project | **2% - provisional** |
| Copilot/Productivity Assistant | **2% - provisional** |
| Other development | **1% - provisional** |
| Customer/admin/other work | **3% - provisional** |
| **Total** | **100%** |

This is the most defensible estimate I can derive from the records currently accessible, but the final five rows are not independently substantiated. If timesheets or dated records show material work on those projects, the 90% allocated to the three websites should be reduced proportionately rather than leaving unsupported 2% placeholders.

## 6. Development account, conversations, and preservation

### Codex account/workspace

The development history reviewed is stored in the local Codex workspace under:

`C:\Users\Pranit\.codex\sessions`

Session metadata identifies `codex_vscode` as the originator for the early sessions and `openai` as the model provider. The sessions also record project working directories under `C:\projects\...`.

The local files do **not** disclose enough information to confirm the OpenAI account email, legal account owner, or whether the subscription was personal or supplied by Jortel/Jortelligence. That must be confirmed from the logged-in Codex/ChatGPT account settings, OpenAI billing invoices, company subscription records, or IT administration.

### Do the historical conversations still exist?

Yes. Locally retained JSONL conversations exist for December 2025 through June 2026 for all three websites. They include timestamps, user requests, assistant responses, command/tool activity, errors, screenshots/attachment references, and in some cases summaries of long development sequences. Cloud-side ChatGPT/Codex retention is **To be confirmed**, but the local archive is present.

### Preservation actions

The following should be preserved without rewriting history:

1. The complete `.git` directories and remote GitHub repositories for Internext, Jortel, and Jortech.
2. Vercel production and preview deployment histories, build logs, environment-variable names, and commit associations.
3. The local Codex session archive for December 2025 to June 2026, plus an authorised account export if available.
4. Supabase migrations, schema exports, RLS policies, audit rows, and authorised database backups.
5. Stripe test/live event and payment records, without exporting full secrets or card data.
6. Power Automate flow definitions, versions, run histories, error logs, and representative test emails/attachments.
7. Alloys, Leader, Telcoinabox/TIAB, Australia Post, Geoapify, Google Merchant, Search Console, Analytics, and related provider records where retained.
8. Tests, generated reports, supplier spreadsheets, product feeds, sitemaps, policy source documents, screenshots, and uploaded logs.
9. A credential register showing which secrets were rotated after appearing in chats/source. Raw evidence containing old secrets should be access-restricted, not casually circulated.

No Git history, Vercel logs, Codex conversations, Supabase records, or failed experiment evidence were deleted as part of preparing this response.
