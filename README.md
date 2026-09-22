# Internext

Internext is a React + Vite ecommerce and reseller portal build for the Internext website.

## Stack

- Vite
- React
- TypeScript
- Tailwind CSS
- shadcn/ui

## Local Development

```sh
npm install
npm run dev
```

## Production Build

```sh
npm run build
```

## Environment Variables

See `.env.example` for the required variables, including:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `AUTH_SESSION_SECRET`
- `POWER_AUTOMATE_RESELLER_WEBHOOK_URL`
- `VITE_GEOAPIFY_API_KEY`

## Deployment

The project is designed to deploy on Vercel.

## 4Cabling Catalogue

The committed `public/data/4c-products.json` is a supplier snapshot, not a live API. Set `FOUR_C_CATALOG_CSV_URL` to a complete, current HTTPS CSV export to refresh it during each production build. If needed, set `FOUR_C_CATALOG_CSV_AUTHORIZATION` to the complete authorization header. A failed, empty, structurally invalid, or unexpectedly partial response stops the build rather than replacing the catalogue. A successful import still requires deployment before Google and static pages change.

Without a feed URL, import a fresh supplier CSV with `node scripts/import-4c-catalog.mjs <path>`, then deploy. 4C products older than seven days from the source file's modification time are excluded from the runtime catalogue and checkout. The Google feed, sitemap, and static pages are regenerated only at deployment. Set `CATALOG_DEPLOY_HOOK_URL` to a production/main Vercel Deploy Hook and `CRON_SECRET` to enable the daily 03:00 UTC rebuild; without these, arrange a new deployment when a snapshot expires or is refreshed. Rebuilding an old CSV does not refresh its timestamp. Do not use this snapshot as proof of live stock beyond that window.

Run `npm run audit:shipping` for the missing-package-measurement audit and `reports/4c-package-measurements-needed.csv`, which can be sent to 4Cabling for package (not bare-product) weight and dimensions. The sheet requires `SKU`, `Package_Weight_Kg`, `Package_Height_Cm`, `Package_Width_Cm`, `Package_Depth_Cm`, and a supplier `Source_Reference`. Once the supplier has completed it, run `node scripts/import-4c-measurements.mjs <completed CSV path>` and rebuild. Import rejects unknown SKUs, duplicates, incomplete values, and missing evidence; it never borrows dimensions from an Alloys or Leader SKU with the same text.

Run `npm run audit:4c-images` to probe supplier image URLs. An HTTP challenge from the supplier is reported as `blocked_by_host`, not a confirmed broken image; images still need browser/Googlebot verification or a supplier-approved image feed. Package dimensions must come from supplier data or verified admin measurements, not descriptions or category estimates.
