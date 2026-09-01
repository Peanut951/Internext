# Competitor Pricing Staging

Competitor pricing is fail-closed and disabled by default. Deploying the code or applying the
database migration does not change customer prices.

## Activation locks

Both of these must be enabled before a recommendation can affect a public price:

1. `COMPETITOR_PRICING_MODE=active` in the server environment.
2. `competitor_pricing_settings.enabled=true` in Supabase.

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

## Data-source boundary

No web scraper is enabled in this stage. A permitted competitor feed, API, or collector must write
observations with evidence for GST, shipping, stock, seller identity, and exact product identity.
Google benchmark prices alone are not accepted as seller observations because they do not establish
a specific verified seller and delivered price.

## Public presentation

When a recommendation is eventually active, catalogue responses preserve the former public price in
`originalPrice`, set the approved price in `price`, and mark `competitorAdjusted=true`. Product price
components then show the former price struck through above the adjusted price. Reseller accounts see
only reseller pricing.

