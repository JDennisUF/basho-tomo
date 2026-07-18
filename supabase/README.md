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
