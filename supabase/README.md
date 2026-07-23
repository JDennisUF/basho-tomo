# Supabase Setup

This directory contains the database schema and policies for the Supabase-backed Basho Tomo backend.

## Apply Migrations

Use the Supabase dashboard SQL editor or the Supabase CLI to apply files from `supabase/migrations` in timestamp order.

Initial migration:

```text
supabase/migrations/202607180001_initial_backend_schema.sql
```

## Environment Variables

Copy `.env.example` to `.env.local` for local development and configure the same values in the production host.

```text
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SUMO_SYNC_SECRET=
```

`SUPABASE_SERVICE_ROLE_KEY` must stay server-only. Do not expose it through client components or browser bundles.

## Auth Settings

For magic-link auth, configure Supabase Dashboard -> Authentication -> URL Configuration.

Local development:

```text
Site URL: http://localhost:3000
Redirect URLs:
http://localhost:3000/auth/callback
```

Production:

```text
Site URL: https://YOUR-VERCEL-DOMAIN
Redirect URLs:
https://YOUR-VERCEL-DOMAIN/auth/callback
```

If you use Vercel preview deployments, add the preview callback URL pattern that matches your project as an additional redirect URL.

Enable email/password auth in Supabase Dashboard -> Authentication -> Providers -> Email. Keep email OTP/magic-link enabled as the bootstrap path. On the first successful magic-link login, the app now requires the user to set a password before continuing. After that, the normal sign-in path is email plus password, while magic link remains available only as a fallback path unless you add a stricter server-side gate in front of OTP issuance.

## RLS Model

Shared sumo cache tables are publicly readable and writable only by server-side service-role code:

- `bashos`
- `rikishi`
- `banzuke`
- `basho_rikishi`
- `torikumi`
- `head_to_head`

User-owned tables are restricted to the authenticated owner:

- `profiles`
- `user_favorites`
- `user_preferences`

Operational tables are service-role only by default:

- `sync_runs`

## First Backend Milestone

The first milestone is complete when the browser stops calling Sumo API directly and instead reads through Next.js route handlers backed by these Supabase tables.

## Manual Sync Endpoints

Admin sync endpoints force-refresh Supabase from Sumo API. They require `SUMO_SYNC_SECRET` in either a bearer token or `x-sumo-sync-secret` header.

```bash
curl -X POST \
  -H "Authorization: Bearer $SUMO_SYNC_SECRET" \
  http://localhost:3000/api/admin/sync/basho/202607
```

```bash
curl -X POST \
  -H "Authorization: Bearer $SUMO_SYNC_SECRET" \
  http://localhost:3000/api/admin/sync/banzuke/202607
```

```bash
curl -X POST \
  -H "Authorization: Bearer $SUMO_SYNC_SECRET" \
  http://localhost:3000/api/admin/sync/torikumi/202607/Makuuchi/7
```

```bash
curl -X POST \
  -H "Authorization: Bearer $SUMO_SYNC_SECRET" \
  http://localhost:3000/api/admin/sync/rikishi-index
```

```bash
curl -X POST \
  -H "Authorization: Bearer $SUMO_SYNC_SECRET" \
  http://localhost:3000/api/admin/sync/active-basho
```
