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
