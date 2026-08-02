-- Finora — deterministic seed for the hardcoded demo account.
-- Run AFTER schema.sql. Safe to re-run (uses fixed ids / on-conflict).
--
-- Produces one real, populated account so every judge sees the same working
-- state — real persisted data, no random values, no login required.

-- account + agents
insert into accounts (id, wallet_address, display_name, email)
values ('00000000-0000-0000-0000-000000000001',
        '0xF1n0ra0000000000000000000000000000000001',
        'Aarav Mehta', 'demo@finora.dev')
on conflict (id) do nothing;

insert into agents (id, owner_account, did, session_key_address) values
  ('agent.procure-01','00000000-0000-0000-0000-000000000001','did:finora:9f21a7c4a8','0xA9e0000000000000000000000000000000000001'),
  ('ring.a','00000000-0000-0000-0000-000000000001','did:finora:aa11','0xAA10000000000000000000000000000000000001'),
  ('ring.b','00000000-0000-0000-0000-000000000001','did:finora:bb22','0xBB20000000000000000000000000000000000001'),
  ('ring.c','00000000-0000-0000-0000-000000000001','did:finora:cc33','0xCC30000000000000000000000000000000000001')
on conflict (id) do nothing;

-- telemetry for the honest agent (drives the derived starting score ≈ 83)
insert into telemetry (agent_id, kind, amount, at) values
  ('agent.procure-01','task_success',null, now() - interval '45 days'),
  ('agent.procure-01','payment',210,    now() - interval '45 days'),
  ('agent.procure-01','task_success',null, now() - interval '39 days'),
  ('agent.procure-01','refund_issued',null, now() - interval '38 days'),
  ('agent.procure-01','policy_violation_attempt',null, now() - interval '37 days'),
  ('agent.procure-01','task_success',null, now() - interval '30 days'),
  ('agent.procure-01','payment',205,    now() - interval '30 days'),
  ('agent.procure-01','task_failure',null, now() - interval '28 days'),
  ('agent.procure-01','task_success',null, now() - interval '16 days'),
  ('agent.procure-01','payment',225,    now() - interval '16 days'),
  ('agent.procure-01','task_success',null, now() - interval '5 days');

-- payment ledger: honest external revenue + a wash-trading ring
insert into payments (from_party, to_party, amount, at) values
  ('customer.acme','agent.procure-01',4200, now() - interval '40 hours'),
  ('customer.globex','agent.procure-01',3100, now() - interval '28 hours'),
  ('customer.initech','agent.procure-01',2600, now() - interval '12 hours'),
  ('agent.procure-01','vendor.data-feed',900, now() - interval '11 hours'),
  ('ring.a','ring.b',5000, now() - interval '30 hours'),
  ('ring.b','ring.c',4800, now() - interval '29 hours'),
  ('ring.c','ring.a',4700, now() - interval '28 hours'),
  ('ring.b','ring.a',3000, now() - interval '20 hours'),
  ('ring.a','ring.b',2900, now() - interval '19 hours'),
  ('customer.smallco','ring.a',400, now() - interval '6 hours');
