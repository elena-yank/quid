create table if not exists kw_games (
  id text primary key,
  code text unique not null,
  version integer not null default 1,
  state jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists kw_games_created_idx on kw_games (created_at desc);
