create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.bashos (
  id text primary key,
  basho_date text not null,
  start_date date,
  end_date date,
  yusho text,
  special_prizes jsonb,
  raw jsonb,
  fetched_at timestamptz not null default now(),
  source_updated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.rikishi (
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
  fetched_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.banzuke (
  basho_id text not null references public.bashos(id) on delete cascade,
  division text not null,
  records jsonb not null,
  fetched_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (basho_id, division),
  constraint banzuke_division_check check (
    division in ('Makuuchi', 'Juryo', 'Makushita', 'Sandanme', 'Jonidan', 'Jonokuchi')
  )
);

create table public.basho_rikishi (
  basho_id text not null references public.bashos(id) on delete cascade,
  division text not null,
  rikishi_id integer not null references public.rikishi(id) on delete cascade,
  rank text,
  rank_value integer,
  side text,
  fetched_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (basho_id, division, rikishi_id),
  constraint basho_rikishi_division_check check (
    division in ('Makuuchi', 'Juryo', 'Makushita', 'Sandanme', 'Jonidan', 'Jonokuchi')
  ),
  constraint basho_rikishi_side_check check (side is null or side in ('east', 'west'))
);

create table public.torikumi (
  basho_id text not null references public.bashos(id) on delete cascade,
  division text not null,
  day integer not null,
  matches jsonb not null,
  immutable boolean not null default false,
  fetched_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (basho_id, division, day),
  constraint torikumi_day_check check (day between 1 and 15),
  constraint torikumi_division_check check (
    division in ('Makuuchi', 'Juryo', 'Makushita', 'Sandanme', 'Jonidan', 'Jonokuchi')
  )
);

create table public.head_to_head (
  rikishi_id integer not null,
  opponent_id integer not null,
  payload jsonb not null,
  fetched_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (rikishi_id, opponent_id),
  constraint head_to_head_distinct_rikishi_check check (rikishi_id <> opponent_id)
);

create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.user_favorites (
  user_id uuid not null references auth.users(id) on delete cascade,
  rikishi_id integer not null references public.rikishi(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, rikishi_id)
);

create table public.user_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  theme text,
  division text,
  name_mode text,
  show_results boolean,
  show_leaders boolean,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_preferences_division_check check (
    division is null or division in ('Makuuchi', 'Juryo', 'Makushita', 'Sandanme', 'Jonidan', 'Jonokuchi')
  ),
  constraint user_preferences_name_mode_check check (name_mode is null or name_mode in ('jp', 'en'))
);

create table public.sync_runs (
  id bigint generated always as identity primary key,
  job_name text not null,
  status text not null,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  details jsonb,
  constraint sync_runs_status_check check (status in ('running', 'succeeded', 'failed'))
);

create index banzuke_fetched_at_idx on public.banzuke (fetched_at);
create index basho_rikishi_rikishi_id_idx on public.basho_rikishi (rikishi_id);
create index basho_rikishi_basho_division_idx on public.basho_rikishi (basho_id, division);
create index torikumi_fetched_at_idx on public.torikumi (fetched_at);
create index torikumi_immutable_idx on public.torikumi (immutable);
create index rikishi_current_division_idx on public.rikishi (current_division);
create index rikishi_fetched_at_idx on public.rikishi (fetched_at);
create index head_to_head_fetched_at_idx on public.head_to_head (fetched_at);
create index sync_runs_job_started_idx on public.sync_runs (job_name, started_at desc);

create trigger set_bashos_updated_at
before update on public.bashos
for each row execute function public.set_updated_at();

create trigger set_rikishi_updated_at
before update on public.rikishi
for each row execute function public.set_updated_at();

create trigger set_banzuke_updated_at
before update on public.banzuke
for each row execute function public.set_updated_at();

create trigger set_basho_rikishi_updated_at
before update on public.basho_rikishi
for each row execute function public.set_updated_at();

create trigger set_torikumi_updated_at
before update on public.torikumi
for each row execute function public.set_updated_at();

create trigger set_head_to_head_updated_at
before update on public.head_to_head
for each row execute function public.set_updated_at();

create trigger set_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger set_user_preferences_updated_at
before update on public.user_preferences
for each row execute function public.set_updated_at();

alter table public.bashos enable row level security;
alter table public.rikishi enable row level security;
alter table public.banzuke enable row level security;
alter table public.basho_rikishi enable row level security;
alter table public.torikumi enable row level security;
alter table public.head_to_head enable row level security;
alter table public.profiles enable row level security;
alter table public.user_favorites enable row level security;
alter table public.user_preferences enable row level security;
alter table public.sync_runs enable row level security;

create policy "Public can read bashos"
on public.bashos for select
to anon, authenticated
using (true);

create policy "Public can read rikishi"
on public.rikishi for select
to anon, authenticated
using (true);

create policy "Public can read banzuke"
on public.banzuke for select
to anon, authenticated
using (true);

create policy "Public can read basho rikishi"
on public.basho_rikishi for select
to anon, authenticated
using (true);

create policy "Public can read torikumi"
on public.torikumi for select
to anon, authenticated
using (true);

create policy "Public can read head to head"
on public.head_to_head for select
to anon, authenticated
using (true);

create policy "Users can read own profile"
on public.profiles for select
to authenticated
using (user_id = auth.uid());

create policy "Users can insert own profile"
on public.profiles for insert
to authenticated
with check (user_id = auth.uid());

create policy "Users can update own profile"
on public.profiles for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "Users can read own favorites"
on public.user_favorites for select
to authenticated
using (user_id = auth.uid());

create policy "Users can insert own favorites"
on public.user_favorites for insert
to authenticated
with check (user_id = auth.uid());

create policy "Users can delete own favorites"
on public.user_favorites for delete
to authenticated
using (user_id = auth.uid());

create policy "Users can read own preferences"
on public.user_preferences for select
to authenticated
using (user_id = auth.uid());

create policy "Users can insert own preferences"
on public.user_preferences for insert
to authenticated
with check (user_id = auth.uid());

create policy "Users can update own preferences"
on public.user_preferences for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());
