-- City Stories game data. Accounts and sessions live in Better Auth's tables ("user", "session", ...).
-- Safe to run repeatedly.
create table if not exists saves (
  user_id     text primary key references "user"(id) on delete cascade,
  data        jsonb not null,
  updated_at  timestamptz not null default now()
);
