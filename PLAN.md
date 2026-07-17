# Basho Tomo Plan

## Goal

Build a static web app for Grand Sumo fans to track the current basho and follow favorite rikishi.

The app should:

- require no backend servers that we maintain
- deploy as a static site
- read tournament and rikishi data directly from Sumo API
- feel stylized, Japanese, and intentional rather than like a default Tailwind dashboard

## Product Direction

This is a fan product first, not an internal tool. The UI should feel atmospheric and distinct, but still remain fast to scan during a live tournament.

The design target is:

- editorial rather than SaaS
- Japanese-inspired without becoming a parody
- strong typography, spacing, texture, and framing
- restrained motion
- clear hierarchy for match data and rikishi details

We should avoid:

- generic Tailwind card grids everywhere
- purple/blue startup gradients
- oversized dashboard chrome
- fake "Japanese" decoration that hurts readability

## Chosen Stack

### Web / UI

- Next.js with static export
- React
- Tailwind CSS
- custom design tokens, typography, and component styling

### Data

- Sumo API called from the browser
- localStorage for saved favorite rikishi and UI preferences

## Why This Option

This keeps v1 simple:

- no backend to run
- easy deployment
- fast MVP path
- low cost

Tradeoff:

- no user accounts yet
- favorites are device-local
- we depend directly on Sumo API availability and CORS behavior

That is acceptable for v1.

## MVP Feature Set

### 1. Current Basho Home

- show current basho ID and status
- highlight current or latest day
- show featured torikumi/results for selected division
- allow division switching

### 2. Torikumi View

- list bouts for selected day and division
- clearly separate scheduled bouts vs completed results
- show winner when available

### 3. Banzuke View

- show East/West ranking layout
- support these divisions in v1:
  - Makuuchi
  - Juryo

### 4. Rikishi View

- basic profile
- current rank
- stable/heya
- physical details if available
- stats summary
- recent matches

### 5. Favorites

- save favorite rikishi locally
- show quick links to favorites
- surface their latest or next bout where possible
- no search required in v1

## Language Direction

The interface should lean heavily on Japanese text with minimal English.

Guidelines:

- prefer Japanese labels for navigation, views, and common UI text
- use English only where it materially helps comprehension
- preserve readability for users who know sumo terms but do not need full English explanation
- add English hover tips where needed so non-Japanese users can recover context without cluttering the interface

## Visual Direction

We want a distinct look from typical Tailwind apps.

### Style cues

- deep ink, parchment, clay, muted gold, sumi red
- strong serif or editorial display type paired with a clean UI sans
- subtle borders and panel framing inspired by print, posters, or tournament sheets
- textile/paper-like background treatment used sparingly
- iconography and controls kept clean and modern
- overall tone should feel formal, respectful, and composed
- avoid playful or flashy ornamentation

### UX principles

- mobile first, because fans may check bouts on phones
- first screen should be the actual experience, not a landing page
- dense enough for repeat use, but not cramped
- data views must stay readable during a live basho
- match displays should favor concise Japanese presentation over explanatory chrome

### Match presentation

- present rikishi names vertically where it improves authenticity and clarity
- use a restrained visual indicator to mark the winner
- keep result states quiet and clean rather than loud or gamified
- preserve scanability first, especially for Makuuchi and Juryo daily torikumi

## Technical Notes

### Current basho logic

Do not hardcode a basho forever, even though the Bruno collection currently uses `202607`.

We should:

- start with a small current-basho resolver
- allow manual basho selection
- handle Japan time correctly when deciding "today" vs "latest results"
- default the home experience to today's torikumi for the active basho

### Data access

We will likely use these endpoints first:

- `/api/basho/:bashoId`
- `/api/basho/:bashoId/banzuke/:division`
- `/api/basho/:bashoId/torikumi/:division/:day`
- `/api/rikishis`
- `/api/rikishi/:rikishiId`
- `/api/rikishi/:rikishiId/stats`
- `/api/rikishi/:rikishiId/matches`

### Rikishi cache strategy

For the active basho, we should load the basho's rikishi set once and reuse it client-side.

Initial approach:

- fetch banzuke data for Makuuchi and Juryo
- derive the full set of rikishi appearing in the current basho from that data
- cache the normalized rikishi list in browser storage
- persist the cache in browser storage for as long as practical
- refresh only when the selected basho changes, the cache is missing, or the cache version becomes invalid

This is a good fit because the basho participant set is effectively stable for the duration of a tournament.

Cache policy goals:

- minimize calls to Sumo API
- favor reuse of stable basho metadata
- separate stable rikishi/banzuke-derived data from more volatile torikumi/results data
- use long-lived local cache metadata with explicit cache versioning

### State

Local app state only:

- selected basho
- selected division
- selected day
- favorite rikishi IDs
- recent UI preferences

## Delivery Phases

### Phase 1

Set up the static app shell and establish the design system.

### Phase 2

Implement current basho, torikumi, and banzuke flows.

### Phase 3

Implement rikishi detail and favorites.

### Phase 4

Polish visual identity, responsive behavior, loading states, and deployment.

## Checklist

- [x] Initialize Next.js app with static export support
- [x] Add Tailwind and establish custom theme tokens
- [x] Define visual system: colors, type, borders, spacing, textures
- [x] Build base layout and navigation
- [x] Create current basho resolver strategy
- [x] Implement Sumo API client utilities
- [x] Build current basho home page
- [x] Build torikumi day/division browser
- [x] Build banzuke view
- [ ] Build rikishi search/browse flow
- [ ] Build rikishi detail page
- [x] Add favorites with localStorage persistence
- [x] Add loading, empty, and error states
- [x] Tune mobile layout and typography
- [x] Validate direct browser access to Sumo API endpoints
- [ ] Deploy static site
- [ ] Review fit for future paid features without changing v1 architecture

## Open Questions

- Do we want the initial home view to open on Makuuchi by default, or remember the last selected division?
- How much texture is acceptable in the background before it starts competing with match readability?

## Current Build State

As of Friday, July 17, 2026, the app is materially beyond the original scaffold stage.

Implemented:

- static Next.js app with successful production build
- Japanese-first torikumi UI with optional English shikona toggle
- current basho/day handling using Japan time
- all six divisions supported:
  - Makuuchi
  - Juryo
  - Makushita
  - Sandanme
  - Jonidan
  - Jonokuchi
- banzuke loading and caching for all six divisions
- torikumi loading with cache policy:
  - past days immutable
  - current day 10-minute TTL
  - future day longer TTL
- manual torikumi refresh button (`更新`) that bypasses cache
- global rikishi index loaded from `/api/rikishis?limit=...&skip=...`
- torikumi and banzuke name enrichment by rikishi ID from cached rikishi index
- Japanese shikona display cleaned up for compact use:
  - only ring name shown
  - given-name suffix removed
  - parenthetical reading removed
- favorites persisted in localStorage as ID list
- basic favorites panel on the right side

Working assumptions now reflected in code:

- `/api/rikishis` is the authoritative source for Japanese shikona
- torikumi display should not rely on English fallback for primary shikona
- compact shikona display should strip extra name parts for scanability

## Favorite Rikishi Feature Status

This feature is only partially done.

Currently implemented:

- `favoriteIds` stored in localStorage
- favorites can be added/removed from banzuke rows
- favorites appear in the right-side panel

Not yet implemented:

- favorite bout highlighting in torikumi
- searchable favorites management dialog
- direct low-clutter add/remove affordance from torikumi rows
- richer favorite workflow tied to full rikishi index

## Useful Context For Resuming Favorites Work

When resuming the favorite rikishi feature, these facts matter:

1. Current favorite storage model:
   - `favoriteIds` is a local array of rikishi IDs in `app-shell.tsx`
   - persistence uses `readPreference` / `writePreference`

2. Current data sources:
   - full global rikishi index comes from `/api/rikishis`
   - basho-specific rikishi list comes from banzuke extraction
   - torikumi rows already carry `east.rikishiId` / `west.rikishiId`

3. Best next implementation path:
   - highlight torikumi rows when either side ID is in `favoriteIds`
   - add a modal/dialog fed by `rikishiIndex`
   - search should match Japanese shikona and English shikona
   - torikumi add/remove control should be compact, likely an icon/button near row edge or in a hover affordance

4. Constraint from user:
   - do not clutter the torikumi UI
   - favorites management should be easy, but restrained

5. Good files to start from:
   - `src/components/app-shell.tsx`
   - `src/components/torikumi-board.tsx`
   - `src/components/favorites-panel.tsx`
   - `src/lib/sumo-api.ts`

## Recommended Next Steps

When picking this back up, do the favorites feature in this order:

1. Add favorite bout highlighting in torikumi
2. Add a searchable favorites dialog using `rikishiIndex`
3. Add direct torikumi add/remove control with minimal visual weight
4. Optionally expand favorites panel into a better management entry point
