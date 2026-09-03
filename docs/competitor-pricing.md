# Competitor Pricing Staging

Competitor pricing is fail-closed and disabled by default. Deploying the code or applying the
database migration does not change customer prices.

## Activation locks

All three of these must be enabled before a recommendation can affect a public price:

1. `COMPETITOR_PRICING_MODE=active` in the server environment.
2. `competitor_pricing_settings.enabled=true` in Supabase.
3. The individual product is set to `Automatic` in its admin pricing panel.

Keep the environment value set to `disabled` during data-source development. `observe` is reserved
for collecting and reviewing recommendations without applying them.

## Eligible observations

An observation must meet every requirement:

- The seller is enabled and has been verified by an Internext administrator.
- The listing is in stock.
- Item and shipping prices are GST-inclusive and shipping has been verified.
- Product matching is exact by GTIN, exact brand plus MPN, or explicit manual verification.
- The observation has not expired.
- The competitor's landed price is below the current Internext standard public price.

The proposed public price is the cheapest eligible landed price minus `$1.00`. It is rejected when
that result is below the explicitly supplied minimum allowed price. Reseller pricing is not read or
changed by this rule.

## Product modes

- `Monitor` is the default. Offers are recorded, but the public price cannot change.
- `Automatic` permits an otherwise eligible approved recommendation to reach the public catalogue.
- `Excluded` prevents the product from being submitted for competitor discovery.

Changing a mode never edits supplier or reseller prices.

## Automated discovery providers

The staged integration supports one provider at a time:

- DataForSEO Google Shopping Merchant API, using Products for discovery and Product Info for exact
  identity verification and seller offers.
- Prisync Channel or Hybrid monitoring, using its API to read discovered listings.
- Price2Spy Automatch or Multi-Automatch, using its REST API to read approved Automatch listings.

DataForSEO is the direct Google Shopping data source. Internext does not scrape Google result pages.
Products are searched nationally with `DATAFORSEO_LOCATION_NAME=Australia`; the city values in
`DATAFORSEO_LOCATIONS` are reserved for later landed-price verification and do not multiply every
catalogue lookup. Prisync and Price2Spy remain supported alternatives.

Set `COMPETITOR_DISCOVERY_ENABLED=true` only after applying the migration and configuring one of
the provider credential sets in `.env.example`. The Vercel cron runs the import daily at 04:15 UTC.
Prisync imports resume from a stored product cursor, so repeated runs eventually cover the full
provider catalogue without restarting at page one. Price2Spy returns its current pricing data in a
bulk request.

DataForSEO uses asynchronous standard-priority tasks. Each cron run imports completed tasks and then
submits the next bounded catalogue batch. Verified Google product IDs are cached so later scans can
request current Product Info directly. Only tasks tagged for Internext are read from the account.

Provider discovery and public repricing are separate controls. Enabling discovery only imports
review data; it does not enable recommendations or alter customer prices.

## Seller approval

Discovered domains are quarantined in `competitor_discovery_candidates`. An administrator can
approve or reject a seller from the competitor-pricing section on an admin product page. Approval
adds the normalized domain to `competitor_sellers`; eligible exact matches are imported as verified
observations on the next provider sync. Subdomains are allowed only under that approved parent
domain. Unknown domains, Internext's own domain, title-only matches, non-AUD listings, and listings
without verified GST or shipping treatment cannot influence pricing.

Before enabling observation imports, confirm whether the selected provider returns prices inclusive
of Australian GST and whether its price includes delivery. Record those verified facts with
`COMPETITOR_PROVIDER_PRICES_INCLUDE_GST` and
`COMPETITOR_PROVIDER_PRICES_INCLUDE_SHIPPING`. Leave either value false when uncertain.

Official setup references:

- Prisync API: https://helpcenter.prisync.com/hc/en-us/articles/213516485-Prisync-API
- Prisync monitoring models: https://helpcenter.prisync.com/hc/en-us/articles/23670383315740-URL-Channel-or-Hybrid-What-s-the-Difference
- Price2Spy REST API: https://www.price2spy.com/api/documentation/api-reference-guide.html
- Price2Spy Automatch: https://www.price2spy.com/automatch.html
- DataForSEO Merchant API: https://docs.dataforseo.com/v3/merchant-api-overview/

## Public presentation

When a recommendation is eventually active, catalogue responses preserve the former public price in
`originalPrice`, set the approved price in `price`, and mark `competitorAdjusted=true`. Product price
components then show the former price struck through above the adjusted price. Reseller accounts see
only reseller pricing.
