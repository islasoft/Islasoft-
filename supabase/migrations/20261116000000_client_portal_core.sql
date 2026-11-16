-- =============================================================================
-- IslaSoft client portal — core schema
-- Each client login sees ONLY its own client space. Staff see their firm's clients.
-- Logins are created manually by the firm (Supabase Dashboard → Authentication).
-- This migration sends NO emails and creates NO users.
-- =============================================================================

-- ---------- Tenants (CPA firms) ----------------------------------------------
create table if not exists public.tenants (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  created_at  timestamptz not null default now()
);

-- ---------- Profiles (1:1 with auth.users) -----------------------------------
-- user_type separates firm staff from external clients.
-- team_category mirrors the Base44 User.team_category values.
create table if not exists public.profiles (
  id             uuid primary key references auth.users(id) on delete cascade,
  tenant_id      uuid not null references public.tenants(id),
  user_type      text not null check (user_type in ('staff', 'client')),
  team_category  text check (team_category in ('admin', 'cpa', 'senior_staff', 'staff')),
  display_name   text,
  created_at     timestamptz not null default now(),
  -- Clients never carry a staff role; staff always do.
  constraint profiles_role_matches_type check (
    (user_type = 'client' and team_category is null) or
    (user_type = 'staff'  and team_category is not null)
  )
);

-- ---------- Clients (portal-safe fields only) --------------------------------
create table if not exists public.clients (
  id             uuid primary key default gen_random_uuid(),
  tenant_id      uuid not null references public.tenants(id),
  client_number  text,                       -- I-XXX individuals, E-XXX entities
  account_type   text,                       -- individual | business
  company_name   text,
  first_name     text,
  last_name      text,
  email          text,
  phone          text,
  address        text,
  city           text,
  state          text,
  zip_code       text,
  status         text not null default 'active',
  manager_id     uuid references public.profiles(id),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (tenant_id, client_number)
);
create index if not exists clients_tenant_idx on public.clients(tenant_id);

-- ---------- Client sensitive data (STAFF ONLY — clients never read this) ------
-- Split out so a client reading their own row can never reach credentials/PII.
-- Encrypt credential columns with Supabase Vault before storing real values.
create table if not exists public.client_sensitive (
  client_id       uuid primary key references public.clients(id) on delete cascade,
  ssn             text,
  ein             text,
  dob             date,
  dl_id           text,
  bank_name       text,
  bank_routing    text,
  bank_account    text,
  eftps_number    text,
  eftps_pin       text,
  portal_credentials jsonb,   -- bank / EFTPS / FL e-services logins (encrypt!)
  updated_at      timestamptz not null default now()
);

-- ---------- Client membership: which login can enter which client space -----
-- One login can belong to several clients (e.g. owner of multiple LLCs).
create table if not exists public.client_members (
  user_id     uuid not null references auth.users(id) on delete cascade,
  client_id   uuid not null references public.clients(id) on delete cascade,
  created_at  timestamptz not null default now(),
  created_by  uuid references auth.users(id),
  primary key (user_id, client_id)
);
create index if not exists client_members_client_idx on public.client_members(client_id);

-- ---------- Client-facing records -------------------------------------------
create table if not exists public.shared_documents (
  id                uuid primary key default gen_random_uuid(),
  client_id         uuid not null references public.clients(id) on delete cascade,
  document_name     text not null,
  document_type     text,
  storage_path      text not null,           -- {client_id}/{filename} in bucket client-files
  uploaded_by       uuid references auth.users(id) default auth.uid(),
  notes             text,
  viewed_by_client  boolean not null default false,
  viewed_at         timestamptz,
  created_at        timestamptz not null default now(),
  -- File must live inside this client's own folder.
  constraint shared_documents_path_in_client_folder
    check (split_part(storage_path, '/', 1) = client_id::text)
);
create index if not exists shared_documents_client_idx on public.shared_documents(client_id);

create table if not exists public.client_messages (
  id                  uuid primary key default gen_random_uuid(),
  client_id           uuid not null references public.clients(id) on delete cascade,
  sender_id           uuid not null references auth.users(id) default auth.uid(),
  sender_type         text not null check (sender_type in ('staff', 'client')),
  content             text not null,
  related_project_id  uuid,
  read_by_client      boolean not null default false,
  read_by_staff       boolean not null default false,
  created_at          timestamptz not null default now()
);
create index if not exists client_messages_client_idx on public.client_messages(client_id);

create table if not exists public.projects (
  id                     uuid primary key default gen_random_uuid(),
  client_id              uuid not null references public.clients(id) on delete cascade,
  project_type           text not null,
  project_category       text not null,
  description            text,
  status                 text not null default 'not_started',
  completion_percentage  int  not null default 0 check (completion_percentage between 0 and 100),
  assigned_to_id         uuid references public.profiles(id),
  due_date               date,
  extension_deadline     date,
  created_at             timestamptz not null default now()
);
create index if not exists projects_client_idx on public.projects(client_id);

create table if not exists public.invoices (
  id              uuid primary key default gen_random_uuid(),
  client_id       uuid not null references public.clients(id) on delete cascade,
  invoice_number  text not null,
  issue_date      date not null default current_date,
  due_date        date,
  line_items      jsonb not null default '[]'::jsonb,
  subtotal        numeric(12,2) not null default 0,
  tax_amount      numeric(12,2) not null default 0,
  total           numeric(12,2) not null default 0,
  status          text not null default 'draft',   -- draft | sent | paid | overdue | void
  payment_url     text,
  created_at      timestamptz not null default now()
);
create index if not exists invoices_client_idx on public.invoices(client_id);

-- =============================================================================
-- Helper functions used by RLS.
-- SECURITY DEFINER so policy checks don't recurse through RLS on profiles/members.
-- search_path pinned to block search_path hijacking.
-- =============================================================================

-- Is the caller a member of this client space?
create or replace function public.is_client_member(cid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.client_members
    where user_id = auth.uid() and client_id = cid
  );
$$;

-- Is the caller staff of this tenant, optionally limited to certain roles?
create or replace function public.is_tenant_staff(tid uuid, roles text[] default null)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.user_type = 'staff'
      and p.tenant_id = tid
      and (roles is null or p.team_category = any(roles))
  );
$$;

-- Is the caller staff of the firm that owns this client?
create or replace function public.is_client_staff(cid uuid, roles text[] default null)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.clients c
    where c.id = cid and public.is_tenant_staff(c.tenant_id, roles)
  );
$$;

-- The wall in one call: member of the client OR staff of its firm.
create or replace function public.can_access_client(cid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_client_member(cid) or public.is_client_staff(cid);
$$;

-- Clients may mark a document as viewed without getting general UPDATE rights.
create or replace function public.mark_document_viewed(doc_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.shared_documents
     set viewed_by_client = true, viewed_at = now()
   where id = doc_id
     and public.is_client_member(client_id);
  if not found then
    raise exception 'Document not found or access denied' using errcode = '42501';
  end if;
end;
$$;

-- Lock helper execution to signed-in users.
revoke execute on function public.is_client_member(uuid)              from public, anon;
revoke execute on function public.is_tenant_staff(uuid, text[])       from public, anon;
revoke execute on function public.is_client_staff(uuid, text[])       from public, anon;
revoke execute on function public.can_access_client(uuid)             from public, anon;
revoke execute on function public.mark_document_viewed(uuid)          from public, anon;
grant  execute on function public.is_client_member(uuid)              to authenticated;
grant  execute on function public.is_tenant_staff(uuid, text[])       to authenticated;
grant  execute on function public.is_client_staff(uuid, text[])       to authenticated;
grant  execute on function public.can_access_client(uuid)             to authenticated;
grant  execute on function public.mark_document_viewed(uuid)          to authenticated;
