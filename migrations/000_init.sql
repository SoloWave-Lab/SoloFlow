-- 000_init.sql - initial auth tables

-- Users table
create table if not exists "user" (
  id text primary key,
  name text null,
  email text unique not null,
  "emailVerified" boolean default false not null,
  image text null,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

-- Sessions table
create table if not exists session (
  id text primary key,
  "expiresAt" timestamptz not null,
  token text unique not null,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now(),
  "ipAddress" text null,
  "userAgent" text null,
  "userId" text not null references "user"(id) on delete cascade
);
create index if not exists idx_session_userId on session("userId");
create index if not exists idx_session_token on session(token);

-- Accounts table
create table if not exists account (
  id text primary key,
  "accountId" text null,
  "providerId" text null,
  "userId" text not null references "user"(id) on delete cascade,
  "accessToken" text null,
  "refreshToken" text null,
  "idToken" text null,
  "accessTokenExpiresAt" timestamptz null,
  "refreshTokenExpiresAt" timestamptz null,
  scope text null,
  password text null,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);
create index if not exists idx_account_userId on account("userId");

-- Verification table
create table if not exists verification (
  id text primary key,
  identifier text not null,
  value text not null,
  "expiresAt" timestamptz not null,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

-- Trigger function to auto-update updatedAt fields
create or replace function set_updated_at() returns trigger as $func$
begin
  new."updatedAt" = now();
  return new;
end;
$func$ language plpgsql;

-- Attach triggers where appropriate
drop trigger if exists trg_user_updated_at on "user";
create trigger trg_user_updated_at before update on "user"
for each row execute function set_updated_at();

drop trigger if exists trg_session_updated_at on session;
create trigger trg_session_updated_at before update on session
for each row execute function set_updated_at();

drop trigger if exists trg_account_updated_at on account;
create trigger trg_account_updated_at before update on account
for each row execute function set_updated_at();

drop trigger if exists trg_verification_updated_at on verification;
create trigger trg_verification_updated_at before update on verification
for each row execute function set_updated_at();


