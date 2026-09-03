# Campaign Launch Audit

Audit date: 3 September 2026

The production feed was regenerated from the current supplier-backed catalogue after adding the
paid-campaign labels.

| Feed state | Products |
| --- | ---: |
| Total Merchant feed products | 4,859 |
| Eligible: `launch_ready` | 2,578 |
| Held: `hold_not_in_stock` | 2,159 |
| Held: `hold_shipping_data` | 122 |

Price-band reporting labels were also verified:

| Price band | Products |
| --- | ---: |
| Under A$250 | 2,583 |
| A$250-A$749 | 1,192 |
| A$750-A$1,999 | 597 |
| A$2,000 and above | 487 |

Validation completed:

- Production build passed.
- 4,859 feed product titles passed the Google title audit.
- All 70 configured public price floors passed; reseller pricing remained unchanged.
- TypeScript completed without errors.
- ESLint completed without errors (10 existing warnings remain).
- Campaign asset validation passed all 4 tests.

These counts are a point-in-time audit. Merchant Center receives fresh labels whenever the normal
deployment feed generator runs, so the campaign selection changes with the current catalogue rather
than relying on this report.
