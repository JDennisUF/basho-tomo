# Supabase Transition Plan

## Goal

Move Basho Tomo from browser-only caching and direct Sumo API calls to a published Next.js app backed by Supabase for shared data caching, user accounts, favorites, and preferences.

The first milestone should focus on shared cached sumo data. Auth and user-specific persistence can layer on after the API traffic problem is solved.

## Target Architecture

```text
Browser
  -> Next.js UI
  -> Next.js route handlers
  -> Supabase Postgres cache
  -> Sumo API fallback/sync source
```

The browser should stop calling `https://sumo-api.com/api` directly. Sumo API access should happen only from server-side code, either in route handlers or scheduled sync jobs.

Recommended split:

- `sumo-normalizers.ts`: maps raw Sumo API payloads into app types.
- `sumo-upstream.ts`: server-only calls to Sumo API.
- `sumo-repository.ts`: Supabase reads/writes and cache policies.
- `sumo-client.ts`: browser-facing calls to this app's own `/api/...` routes.

Existing UI components should keep consuming the current app types where possible.

## App API Surface

Keep the app-facing API close to the existing Sumo API shape:

```text
GET /api/basho/:bashoId
GET /api/basho/:bashoId/banzuke/:division
GET /api/basho/:bashoId/torikumi/:division/:day
GET /api/rikishis
GET /api/rikishi/:rikishiId
GET /api/head-to-head/:rikishiId/:opponentId
```

Each route should:

1. Validate params.
2. Check Supabase for fresh cached data.
3. Return cached data when available.
4. Fetch Sumo API on cache miss or stale cache.
5. Normalize and upsert the result.
6. Return the normalized app payload.

## Data Buckets

### Shared Mostly Immutable Data

- `bashos`: basho id, dates, yusho, special prizes.
- `banzuke`: basho, division, normalized records.
- `basho_rikishi`: derived rikishi set for a basho/division.
- `rikishi`: global rikishi profile/index data.
- Past `torikumi`: immutable once the day/tournament is complete.
- `head_to_head`: long-lived cached rivalry/history payloads.

### Shared Active Tournament Data

- Current basho summary.
- Current banzuke records, because wins/losses/absences update.
- Current day torikumi/results.
- Future torikumi once published.

### User-Owned Data

- `profiles`: app profile tied to Supabase Auth user id.
- `user_favorites`: favorite rikishi for each user.
- `user_preferences`: theme, division, name mode, spoiler settings.
- Later: notes, followed basho, notification preferences.

Anonymous users can continue using `localStorage`; signed-in users should sync preferences and favorites to Supabase.

## Proposed Schema

```sql
create table bashos (
  id text primary key,
  basho_date text not null,
  start_date date,
  end_date date,
  yusho text,
  special_prizes jsonb,
  raw jsonb,
  fetched_at timestamptz not null default now(),
  source_updated_at timestamptz
);

create table rikishi (
  id integer primary key,
  nsk_id integer,
  sumodb_id integer,
  shikona_jp text,
  shikona_en text,
  heya text,
  current_rank text,
  current_division text,
  birth_date date,
  shusshin text,
  height numeric,
  weight numeric,
  debut text,
  raw jsonb,
  fetched_at timestamptz not null default now()
);

create table banzuke (
  basho_id text references bashos(id),
  division text not null,
  records jsonb not null,
  fetched_at timestamptz not null default now(),
  primary key (basho_id, division)
);

create table basho_rikishi (
  basho_id text references bashos(id),
  division text not null,
  rikishi_id integer references rikishi(id),
  rank text,
  rank_value integer,
  side text,
  fetched_at timestamptz not null default now(),
  primary key (basho_id, division, rikishi_id)
);

create table torikumi (
  basho_id text references bashos(id),
  division text not null,
  day integer not null,
  matches jsonb not null,
  immutable boolean not null default false,
  fetched_at timestamptz not null default now(),
  primary key (basho_id, division, day)
);

create table head_to_head (
  rikishi_id integer not null,
  opponent_id integer not null,
  payload jsonb not null,
  fetched_at timestamptz not null default now(),
  primary key (rikishi_id, opponent_id)
);

create table profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table user_favorites (
  user_id uuid references auth.users(id) on delete cascade,
  rikishi_id integer references rikishi(id),
  created_at timestamptz not null default now(),
  primary key (user_id, rikishi_id)
);

create table user_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  theme text,
  division text,
  name_mode text,
  show_results boolean,
  show_leaders boolean,
  updated_at timestamptz not null default now()
);
```

Keep raw payloads for debugging and migration safety, but serve normalized payloads to the app.

## Row-Level Security

Enable RLS on all tables.

Public sumo data:

- Anyone can read.
- Only service-role backend code can write.

User data:

- Users can read and write only rows where `user_id = auth.uid()`.
- Service-role backend code can perform maintenance as needed.

Never expose `SUPABASE_SERVICE_ROLE_KEY` to browser code.

## Cache Policies

Initial policy:

| Data | Policy |
| --- | --- |
| Past basho summary | Immutable |
| Current basho summary | 6-12 hour TTL |
| Past banzuke | Immutable |
| Current banzuke | 10-60 minute TTL |
| Past torikumi day | Immutable |
| Current torikumi day | 5-15 minute TTL |
| Future torikumi day | 15-60 minute TTL |
| Rikishi profile | 7-30 day TTL |
| Rikishi index | 1-7 day TTL |
| Head-to-head | 7-30 day TTL |

The current browser `localStorage` cache can remain as a second-level cache. Supabase becomes the shared first-level cache across all users and devices.

## Sync Jobs

Add protected admin routes:

```text
POST /api/admin/sync/basho/:bashoId
POST /api/admin/sync/banzuke/:bashoId
POST /api/admin/sync/torikumi/:bashoId/:division/:day
POST /api/admin/sync/rikishi-index
POST /api/admin/sync/active-basho
```

Protect these routes with `SUMO_SYNC_SECRET` or equivalent server-only auth.

Manual example:

```bash
curl -X POST \
  -H "Authorization: Bearer $SUMO_SYNC_SECRET" \
  http://localhost:3000/api/admin/sync/active-basho
```

Scheduled jobs should refresh:

- Active basho summary.
- All six active banzuke divisions.
- Current day torikumi for all six divisions.
- Nearby future torikumi days during tournament windows.
- Rikishi index on a slower cadence.

Add a `sync_runs` table later if needed:

```sql
create table sync_runs (
  id bigint generated always as identity primary key,
  job_name text not null,
  status text not null,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  details jsonb
);
```

## Auth Plan

Use Supabase Auth with Next.js server-side auth helpers.

Minimum auth features:

- Sign in/sign out.
- Create profile row after first login.
- Store favorites in `user_favorites`.
- Store preferences in `user_preferences`.
- Keep anonymous local preferences working.
- On first login, offer or automatically perform a one-time migration from `localStorage` favorites/preferences to Supabase.

Implementation preference:

- Use a server Supabase client for route handlers and server components.
- Use a browser Supabase client only for auth state and user-owned reads/writes.
- Do not allow browser clients to write shared sumo cache tables.

Initial magic-link setup:

- Browser client: `src/lib/supabase/browser.ts`
- Server client: `src/lib/supabase/server.ts`
- Callback route: `/auth/callback`
- Supabase redirect URL: `https://YOUR-DOMAIN/auth/callback`

## Publishing Checklist

Recommended hosting:

- Next.js app on Vercel.
- Supabase for Postgres, Auth, and scheduled jobs.

Required env vars:

```text
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SUMO_SYNC_SECRET=
```

Repo additions:

- `supabase/migrations/*`
- Supabase client helpers.
- Server route handlers under `src/app/api/...`
- Optional local sync script for warming cache.
- Deployment notes in README or this plan.

Deploy flow:

1. Create Supabase project.
2. Apply migrations.
3. Configure Auth providers and redirect URLs.
4. Add Vercel env vars for Preview and Production.
5. Deploy Next.js app.
6. Run initial cache warmup.
7. Enable scheduled active-basho sync.
8. Verify public pages load without direct Sumo API calls from the browser.

## Implementation Phases

### Phase 1: Shared Cache Foundation

- Add Supabase dependency and client setup.
- Add migrations for shared cache tables.
- Extract normalizers from `src/lib/sumo-api.ts`.
- Add server-only Sumo API adapter.
- Add route handlers for basho, banzuke, torikumi, rikishi, and head-to-head.
- Update UI data fetches to call app routes.
- Keep localStorage as second-level browser cache.

### Phase 2: Cache Warmup and Sync

- Add protected admin sync routes.
- Add active basho sync route.
- Add local/manual warmup command.
- Add scheduled Supabase/Vercel cron job for active basho refresh.
- Add basic sync logging.

### Phase 3: User Accounts

- Add Supabase Auth.
- Add profiles, favorites, and preferences tables.
- Add login/logout UI.
- Move signed-in favorites/preferences to Supabase.
- Add one-time migration from anonymous localStorage data.

### Phase 4: Production Hardening

- Add rate limits or basic abuse protection for API routes.
- Add better stale-while-revalidate behavior.
- Add error monitoring/logging.
- Add tests for cache policy and route handlers.
- Add deployment documentation.

## First Milestone Definition

The first useful milestone is complete when:

- The browser no longer calls Sumo API directly.
- Shared basho/banzuke/torikumi/rikishi/head-to-head responses are served from app API routes.
- App API routes use Supabase cache first and Sumo API fallback.
- Existing UI behavior remains functionally unchanged.
- The app can be deployed with Supabase env vars configured.

Auth is intentionally not required for this milestone.
