alter table public.campaigns
  add column if not exists weight double precision not null default 0;
