-- =============================================================================
-- Client isolation test — Sandy Lopez (individual) vs. another client vs. staff
-- Runs entirely inside a transaction and ROLLS BACK: nothing is saved,
-- no users are really created, no emails are sent.
--
-- Run with psql (uses psql \set variables — not the Dashboard SQL Editor):
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/client_isolation_test.sql
-- $DATABASE_URL = Supabase Dashboard → Project Settings → Database → Connection string.
-- Every check raises an exception on failure; success prints "ALL CHECKS PASSED".
-- =============================================================================
begin;

-- ---------- Fixed test IDs ---------------------------------------------------
-- Tenant
\set tenant_id   '''11111111-1111-1111-1111-111111111111'''
-- Logins
\set sandy_uid   '''aaaaaaaa-0000-0000-0000-000000000001'''
\set otheruid    '''bbbbbbbb-0000-0000-0000-000000000002'''
\set staff_uid   '''cccccccc-0000-0000-0000-000000000003'''
-- Clients
\set sandy_cid   '''a0000000-0000-0000-0000-00000000000a'''
\set other_cid   '''b0000000-0000-0000-0000-00000000000b'''

-- ---------- Seed (as superuser / service role) -------------------------------
insert into auth.users (id, email) values
  (:sandy_uid, 'sloliva87@gmail.com'),
  (:otheruid,  'other.client@example.test'),
  (:staff_uid, 'staff.cpa@example.test');

insert into public.tenants (id, name) values (:tenant_id, 'Isla Accompting Corp');

insert into public.profiles (id, tenant_id, user_type, team_category, display_name) values
  (:sandy_uid, :tenant_id, 'client', null,  'Sandy Lopez'),
  (:otheruid,  :tenant_id, 'client', null,  'Other Client'),
  (:staff_uid, :tenant_id, 'staff',  'cpa', 'Test CPA');

insert into public.clients (id, tenant_id, client_number, account_type, first_name, last_name, email) values
  (:sandy_cid, :tenant_id, 'I-TEST-001', 'individual', 'Sandy', 'Lopez', 'sloliva87@gmail.com'),
  (:other_cid, :tenant_id, 'I-TEST-002', 'individual', 'Other', 'Client', 'other.client@example.test');

insert into public.client_sensitive (client_id, ssn) values
  (:sandy_cid, '000-00-0001'),
  (:other_cid, '000-00-0002');

-- The manual link the firm makes: this login → this client space.
insert into public.client_members (user_id, client_id) values
  (:sandy_uid, :sandy_cid),
  (:otheruid,  :other_cid);

insert into public.shared_documents (id, client_id, document_name, storage_path, uploaded_by) values
  ('d0000000-0000-0000-0000-00000000000a', :sandy_cid, 'Sandy 2025 W-2.pdf',  :sandy_cid || '/w2-2025.pdf', :staff_uid),
  ('d0000000-0000-0000-0000-00000000000b', :other_cid, 'Other 2025 W-2.pdf',  :other_cid || '/w2-2025.pdf', :staff_uid);

insert into public.invoices (client_id, invoice_number, status, total) values
  (:sandy_cid, 'INV-TEST-1', 'sent',  350.00),
  (:sandy_cid, 'INV-TEST-2', 'draft', 999.00),   -- draft: hidden from client
  (:other_cid, 'INV-TEST-3', 'sent',  500.00);

insert into storage.objects (bucket_id, name) values
  ('client-files', 'a0000000-0000-0000-0000-00000000000a/w2-2025.pdf'),
  ('client-files', 'b0000000-0000-0000-0000-00000000000b/w2-2025.pdf');

-- ---------- Helper: act as a given login -------------------------------------
create or replace function pg_temp.act_as(uid uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', uid::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
end $$;

create or replace function pg_temp.expect(cond boolean, label text) returns void language plpgsql as $$
begin
  if not cond then raise exception 'FAILED: %', label; end if;
  raise notice 'ok  - %', label;
end $$;

-- =============================================================================
-- 1) SANDY LOPEZ (client login)
-- =============================================================================
select pg_temp.act_as(:sandy_uid);

select pg_temp.expect((select count(*) from public.clients) = 1,
  'Sandy sees exactly 1 client');
select pg_temp.expect((select first_name from public.clients) = 'Sandy',
  'That client is Sandy Lopez');
select pg_temp.expect((select count(*) from public.shared_documents where client_id = :other_cid) = 0,
  'Sandy sees 0 documents of the other client');
select pg_temp.expect((select count(*) from public.shared_documents where client_id = :sandy_cid) = 1,
  'Sandy sees her own document');
select pg_temp.expect((select count(*) from public.client_sensitive) = 0,
  'Sandy sees 0 sensitive rows (not even her own SSN/credentials)');
select pg_temp.expect((select count(*) from public.invoices) = 1,
  'Sandy sees 1 invoice (own, non-draft only)');
select pg_temp.expect((select count(*) from public.profiles) = 1,
  'Sandy sees only her own profile');
select pg_temp.expect((select count(*) from storage.objects where bucket_id = 'client-files') = 1,
  'Sandy sees only her own folder in file storage');

-- Sandy may upload into her own space…
insert into public.shared_documents (client_id, document_name, storage_path)
values (:sandy_cid, 'Sandy 1099.pdf', :sandy_cid || '/1099.pdf');
select pg_temp.expect(true, 'Sandy can upload into her own space');

-- …and message her firm as a client.
insert into public.client_messages (client_id, sender_type, content)
values (:sandy_cid, 'client', 'Test message from Sandy');
select pg_temp.expect(true, 'Sandy can send a message in her own space');

-- Blocked actions (each must raise an RLS / permission error).
do $$
declare blocked int := 0;
begin
  begin  -- upload into another client's space
    insert into public.shared_documents (client_id, document_name, storage_path)
    values ('b0000000-0000-0000-0000-00000000000b', 'x.pdf', 'b0000000-0000-0000-0000-00000000000b/x.pdf');
  exception when insufficient_privilege then blocked := blocked + 1; end;

  begin  -- give herself access to another client
    insert into public.client_members (user_id, client_id)
    values ('aaaaaaaa-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-00000000000b');
  exception when insufficient_privilege then blocked := blocked + 1; end;

  begin  -- pretend to be staff in a message
    insert into public.client_messages (client_id, sender_type, content)
    values ('a0000000-0000-0000-0000-00000000000a', 'staff', 'spoof');
  exception when insufficient_privilege then blocked := blocked + 1; end;

  begin  -- mark the other client's document as viewed
    perform public.mark_document_viewed('d0000000-0000-0000-0000-00000000000b');
  exception when insufficient_privilege then blocked := blocked + 1; end;

  begin  -- upload a file into the other client's folder
    insert into storage.objects (bucket_id, name)
    values ('client-files', 'b0000000-0000-0000-0000-00000000000b/evil.pdf');
  exception when insufficient_privilege then blocked := blocked + 1; end;

  if blocked <> 5 then raise exception 'FAILED: only % of 5 forbidden actions were blocked', blocked; end if;
  raise notice 'ok  - Sandy blocked from 5 forbidden actions';
end $$;

-- Silent no-ops: updates outside her rights touch 0 rows.
update public.profiles set user_type = 'staff', team_category = 'admin'
 where id = 'aaaaaaaa-0000-0000-0000-000000000001';
update public.invoices set total = 0;      -- clients cannot edit invoices
reset role;
select pg_temp.expect((select user_type from public.profiles where id = :sandy_uid) = 'client',
  'Sandy cannot promote herself to staff');
select pg_temp.expect((select count(*) from public.invoices where total = 0) = 0,
  'Sandy cannot change invoice amounts');

-- Sandy can mark her own document viewed.
select pg_temp.act_as(:sandy_uid);
select public.mark_document_viewed('d0000000-0000-0000-0000-00000000000a');
reset role;
select pg_temp.expect((select viewed_by_client from public.shared_documents
                       where id = 'd0000000-0000-0000-0000-00000000000a'),
  'Sandy can mark her own document as viewed');

-- =============================================================================
-- 2) OTHER CLIENT — mirror check
-- =============================================================================
select pg_temp.act_as(:otheruid);
select pg_temp.expect((select count(*) from public.clients where id = :sandy_cid) = 0,
  'Other client cannot see Sandy');
select pg_temp.expect((select count(*) from public.client_messages) = 0,
  'Other client cannot read Sandy''s messages');
reset role;

-- =============================================================================
-- 3) STAFF (CPA)
-- =============================================================================
select pg_temp.act_as(:staff_uid);
select pg_temp.expect((select count(*) from public.clients) = 2,
  'Staff sees both clients');
select pg_temp.expect((select count(*) from public.client_sensitive) = 2,
  'CPA sees sensitive data for both clients');
select pg_temp.expect((select count(*) from public.invoices) = 3,
  'Staff sees all invoices including drafts');
select pg_temp.expect((select count(*) from public.client_messages) = 1,
  'Staff sees Sandy''s message');
reset role;

-- =============================================================================
-- 4) ANONYMOUS (not signed in)
-- =============================================================================
set local role anon;
do $$
begin
  perform 1 from public.clients;
  raise exception 'FAILED: anon could query clients';
exception when insufficient_privilege then
  raise notice 'ok  - Anonymous users are denied';
end $$;
reset role;

select 'ALL CHECKS PASSED' as result;
rollback;
