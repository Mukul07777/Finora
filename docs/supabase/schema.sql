-- Finora — Supabase schema (off-chain source of truth)
-- Run this in the Supabase SQL editor once, then run seed.sql.
--
-- On-chain contracts remain the truth for money (balances, repayment,
-- reputation writes). Supabase holds accounts, telemetry, indexed chain
-- events, and the payment graph the collusion detector runs on.

-- ── accounts ────────────────────────────────────────────────────────────
create table if not exists accounts (
  id           uuid primary key default gen_random_uuid(),
  wallet_address text unique,
  display_name text,
  email        text,
  created_at   timestamptz not null default now()
);

-- ── agents ──────────────────────────────────────────────────────────────
create table if not exists agents (
  id                 text primary key,            -- e.g. 'agent.procure-01'
  owner_account      uuid references accounts(id) on delete cascade,
  did                text,                         -- did:finora:...
  session_key_address text,
  created_at         timestamptz not null default now()
);

-- ── telemetry (feeds behavioral underwriting) ────────────────────────────
create table if not exists telemetry (
  id        bigint generated always as identity primary key,
  agent_id  text references agents(id) on delete cascade,
  kind      text not null check (kind in
             ('task_success','task_failure','refund_issued','payment','policy_violation_attempt')),
  amount    numeric,
  at        timestamptz not null default now()
);
create index if not exists telemetry_agent_idx on telemetry(agent_id, at);

-- ── indexed on-chain events (cache of the chain for fast reads) ───────────
create table if not exists events (
  id          bigint generated always as identity primary key,
  tx_hash     text,
  contract    text not null,
  name        text not null,
  args        jsonb not null default '{}',
  block_time  timestamptz not null default now()
);
create index if not exists events_contract_idx on events(contract, block_time);

-- ── credit lines (mirror of deployed CreditLine contracts) ────────────────
create table if not exists credit_lines (
  id               bigint generated always as identity primary key,
  agent_id         text references agents(id) on delete cascade,
  contract_address text,
  base_limit       numeric,
  apr_bps          integer,
  created_at       timestamptz not null default now()
);

-- ── payments (edges the collusion detector runs on) ───────────────────────
create table if not exists payments (
  id          bigint generated always as identity primary key,
  from_party  text not null,
  to_party    text not null,
  amount      numeric not null,
  tx_hash     text,
  at          timestamptz not null default now()
);
create index if not exists payments_to_idx   on payments(to_party);
create index if not exists payments_from_idx on payments(from_party);

-- ── Row-Level Security ────────────────────────────────────────────────────
alter table accounts     enable row level security;
alter table agents       enable row level security;
alter table telemetry    enable row level security;
alter table credit_lines enable row level security;
alter table payments     enable row level security;
alter table events       enable row level security;

-- Demo policy: allow public READ (so a judge can view without logging in),
-- writes go through server routes using the service_role key. Tighten these
-- to per-account ownership once real auth is enabled.
create policy "public read accounts"     on accounts     for select using (true);
create policy "public read agents"       on agents       for select using (true);
create policy "public read telemetry"    on telemetry    for select using (true);
create policy "public read credit_lines" on credit_lines for select using (true);
create policy "public read payments"     on payments     for select using (true);
create policy "public read events"       on events       for select using (true);
