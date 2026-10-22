-- City Stories game data. Accounts and sessions live in Better Auth's tables ("user", "session", ...).
-- Safe to run repeatedly.
create table if not exists saves (
  user_id     text primary key references "user"(id) on delete cascade,
  data        jsonb not null,
  updated_at  timestamptz not null default now()
);

-- Private messages between players.
create table if not exists messages (
  id          bigserial primary key,
  from_user   text not null references "user"(id) on delete cascade,
  to_user     text not null references "user"(id) on delete cascade,
  body        text not null,
  created_at  timestamptz not null default now(),
  read_at     timestamptz
);
create index if not exists messages_pair on messages (least(from_user, to_user), greatest(from_user, to_user), id desc);
create index if not exists messages_unread on messages (to_user) where read_at is null;

-- MoMo between players. The server debits the sender's save when the row is written;
-- the recipient's save is credited when they claim it.
create table if not exists transfers (
  id          bigserial primary key,
  from_user   text not null references "user"(id) on delete cascade,
  to_user     text not null references "user"(id) on delete cascade,
  amount      integer not null check (amount > 0),
  fee         numeric(12,2) not null default 0,
  created_at  timestamptz not null default now(),
  claimed_at  timestamptz
);
create index if not exists transfers_unclaimed on transfers (to_user) where claimed_at is null;

-- One row per pair (user_a < user_b). requested_by says who asked.
create table if not exists friends (
  user_a        text not null references "user"(id) on delete cascade,
  user_b        text not null references "user"(id) on delete cascade,
  requested_by  text not null,
  status        text not null check (status in ('pending', 'accepted')),
  created_at    timestamptz not null default now(),
  primary key (user_a, user_b),
  check (user_a < user_b)
);
create index if not exists friends_b on friends (user_b);
