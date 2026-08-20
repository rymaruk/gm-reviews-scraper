create table if not exists public.campaigns (
  id text primary key,
  maps_url text not null,
  title text not null,
  address text,
  rating double precision,
  reviews_count integer,
  type text,
  thumbnail text,
  data_id text,
  place_id text,
  created_at timestamptz not null default now(),
  last_scraped_at timestamptz,
  scrape_status text not null default 'idle',
  scrape_error text,
  next_page_token text
);

create table if not exists public.reviews (
  id text not null,
  campaign_id text not null references public.campaigns (id) on delete cascade,
  rating double precision not null default 0,
  date text,
  iso_date text,
  snippet text not null default '',
  likes integer,
  link text,
  source text,
  images jsonb,
  user_name text not null default 'Google user',
  user_thumbnail text,
  user_link text,
  user_local_guide boolean,
  user_reviews integer,
  created_at timestamptz not null default now(),
  primary key (campaign_id, id)
);

create index if not exists reviews_campaign_id_idx on public.reviews (campaign_id);
create index if not exists reviews_iso_date_idx on public.reviews (iso_date desc);
create index if not exists campaigns_last_scraped_at_idx on public.campaigns (last_scraped_at desc);

alter table public.campaigns enable row level security;
alter table public.reviews enable row level security;

drop policy if exists campaigns_all_access on public.campaigns;
create policy campaigns_all_access
  on public.campaigns
  for all
  using (true)
  with check (true);

drop policy if exists reviews_all_access on public.reviews;
create policy reviews_all_access
  on public.reviews
  for all
  using (true)
  with check (true);

grant usage on schema public to anon, authenticated, service_role;
grant all on table public.campaigns to anon, authenticated, service_role;
grant all on table public.reviews to anon, authenticated, service_role;
