-- =============================================================================
-- Link a login YOU created to a client space.  (Sends nothing to anyone.)
--
-- Step 1: Supabase Dashboard → Authentication → Users → "Add user" → "Create new user"
--         Enter the client's email + a password. Leave "Auto Confirm User" ON.
--         (Use "Send invitation" instead ONLY if you want Supabase to email them.)
-- Step 2: Edit the two values below and run this in Dashboard → SQL Editor.
-- =============================================================================
do $$
declare
  v_login_email   text := 'sloliva87@gmail.com';   -- ← the login you created
  v_client_number text := 'I-001';                 -- ← clients.client_number to link
  v_user_id   uuid;
  v_client_id uuid;
  v_tenant_id uuid;
begin
  select id into v_user_id from auth.users where lower(email) = lower(v_login_email);
  if v_user_id is null then
    raise exception 'No login found for %. Create it first in Authentication → Users.', v_login_email;
  end if;

  select id, tenant_id into v_client_id, v_tenant_id
    from public.clients where client_number = v_client_number;
  if v_client_id is null then
    raise exception 'No client with client_number %', v_client_number;
  end if;

  -- Mark the login as an external client of this firm (never staff).
  insert into public.profiles (id, tenant_id, user_type, team_category)
  values (v_user_id, v_tenant_id, 'client', null)
  on conflict (id) do nothing;

  if exists (select 1 from public.profiles where id = v_user_id and user_type = 'staff') then
    raise exception 'That login is a STAFF account — refusing to link it as a client.';
  end if;

  -- Open the door to this one client space.
  insert into public.client_members (user_id, client_id)
  values (v_user_id, v_client_id)
  on conflict do nothing;

  raise notice 'Linked % → client % (%)', v_login_email, v_client_number, v_client_id;
end $$;

-- To REMOVE access later:
-- delete from public.client_members
--  where user_id = (select id from auth.users where email = 'sloliva87@gmail.com')
--    and client_id = (select id from public.clients where client_number = 'I-001');
