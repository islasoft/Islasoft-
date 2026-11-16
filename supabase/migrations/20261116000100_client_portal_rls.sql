-- =============================================================================
-- IslaSoft client portal — Row Level Security (the wall between clients)
-- Rule of thumb:
--   * Client logins: read their own client space; may upload docs & send messages.
--   * Staff (admin / cpa / senior_staff / staff): read all clients in their firm.
--   * Writes to client records, membership and sensitive data: admin/cpa/senior_staff.
-- Anonymous (not signed in) users get nothing.
-- =============================================================================

-- Enable RLS everywhere (deny by default).
alter table public.tenants           enable row level security;
alter table public.profiles          enable row level security;
alter table public.clients           enable row level security;
alter table public.client_sensitive  enable row level security;
alter table public.client_members    enable row level security;
alter table public.shared_documents  enable row level security;
alter table public.client_messages   enable row level security;
alter table public.projects          enable row level security;
alter table public.invoices          enable row level security;

-- No anonymous access to any portal table.
revoke all on public.tenants, public.profiles, public.clients, public.client_sensitive,
              public.client_members, public.shared_documents, public.client_messages,
              public.projects, public.invoices
  from anon;
grant select, insert, update, delete on
              public.tenants, public.profiles, public.clients, public.client_sensitive,
              public.client_members, public.shared_documents, public.client_messages,
              public.projects, public.invoices
  to authenticated;

-- ---------- tenants ----------------------------------------------------------
create policy tenants_read on public.tenants for select to authenticated
  using (id = (select tenant_id from public.profiles where id = auth.uid()));
-- Tenant create/update is done with the service role only (no policy = denied).

-- ---------- profiles ---------------------------------------------------------
create policy profiles_read_self_or_staff on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_tenant_staff(tenant_id));
-- Only firm admins manage profiles. Users can't promote themselves.
create policy profiles_admin_insert on public.profiles for insert to authenticated
  with check (public.is_tenant_staff(tenant_id, array['admin']));
create policy profiles_admin_update on public.profiles for update to authenticated
  using      (public.is_tenant_staff(tenant_id, array['admin']))
  with check (public.is_tenant_staff(tenant_id, array['admin']));
create policy profiles_admin_delete on public.profiles for delete to authenticated
  using (public.is_tenant_staff(tenant_id, array['admin']));

-- ---------- clients ----------------------------------------------------------
create policy clients_read on public.clients for select to authenticated
  using (public.is_client_member(id) or public.is_tenant_staff(tenant_id));
create policy clients_insert on public.clients for insert to authenticated
  with check (public.is_tenant_staff(tenant_id, array['admin','cpa','senior_staff']));
create policy clients_update on public.clients for update to authenticated
  using      (public.is_tenant_staff(tenant_id, array['admin','cpa','senior_staff']))
  with check (public.is_tenant_staff(tenant_id, array['admin','cpa','senior_staff']));
create policy clients_delete on public.clients for delete to authenticated
  using (public.is_tenant_staff(tenant_id, array['admin']));

-- ---------- client_sensitive (staff only; clients get zero rows) -------------
create policy client_sensitive_staff_all on public.client_sensitive for all to authenticated
  using      (public.is_client_staff(client_id, array['admin','cpa','senior_staff']))
  with check (public.is_client_staff(client_id, array['admin','cpa','senior_staff']));

-- ---------- client_members (who can enter which space) ----------------------
create policy client_members_read on public.client_members for select to authenticated
  using (user_id = auth.uid() or public.is_client_staff(client_id));
create policy client_members_insert on public.client_members for insert to authenticated
  with check (public.is_client_staff(client_id, array['admin','cpa','senior_staff']));
create policy client_members_delete on public.client_members for delete to authenticated
  using (public.is_client_staff(client_id, array['admin','cpa','senior_staff']));
-- No UPDATE policy: change membership by delete + insert.

-- ---------- shared_documents -------------------------------------------------
create policy shared_documents_read on public.shared_documents for select to authenticated
  using (public.can_access_client(client_id));
-- Clients upload into their own space only; staff into any client of their firm.
create policy shared_documents_insert on public.shared_documents for insert to authenticated
  with check (public.can_access_client(client_id) and uploaded_by = auth.uid());
create policy shared_documents_update on public.shared_documents for update to authenticated
  using      (public.is_client_staff(client_id))
  with check (public.is_client_staff(client_id));
create policy shared_documents_delete on public.shared_documents for delete to authenticated
  using (public.is_client_staff(client_id, array['admin','cpa','senior_staff']));
-- Clients mark "viewed" through public.mark_document_viewed(doc_id).

-- ---------- client_messages --------------------------------------------------
create policy client_messages_read on public.client_messages for select to authenticated
  using (public.can_access_client(client_id));
create policy client_messages_insert on public.client_messages for insert to authenticated
  with check (
    sender_id = auth.uid() and (
      (sender_type = 'client' and public.is_client_member(client_id)) or
      (sender_type = 'staff'  and public.is_client_staff(client_id))
    )
  );
create policy client_messages_update on public.client_messages for update to authenticated
  using      (public.is_client_staff(client_id))
  with check (public.is_client_staff(client_id));
create policy client_messages_delete on public.client_messages for delete to authenticated
  using (public.is_client_staff(client_id, array['admin']));

-- ---------- projects (clients read status; staff manage) ---------------------
create policy projects_read on public.projects for select to authenticated
  using (public.can_access_client(client_id));
create policy projects_write on public.projects for insert to authenticated
  with check (public.is_client_staff(client_id, array['admin','cpa','senior_staff']));
create policy projects_update on public.projects for update to authenticated
  using      (public.is_client_staff(client_id))
  with check (public.is_client_staff(client_id));
create policy projects_delete on public.projects for delete to authenticated
  using (public.is_client_staff(client_id, array['admin','cpa','senior_staff']));

-- ---------- invoices (clients read; staff manage; drafts hidden from clients) -
create policy invoices_read on public.invoices for select to authenticated
  using (
    public.is_client_staff(client_id) or
    (public.is_client_member(client_id) and status <> 'draft')
  );
create policy invoices_insert on public.invoices for insert to authenticated
  with check (public.is_client_staff(client_id, array['admin','cpa','senior_staff']));
create policy invoices_update on public.invoices for update to authenticated
  using      (public.is_client_staff(client_id, array['admin','cpa','senior_staff']))
  with check (public.is_client_staff(client_id, array['admin','cpa','senior_staff']));
create policy invoices_delete on public.invoices for delete to authenticated
  using (public.is_client_staff(client_id, array['admin']));

-- =============================================================================
-- File storage: private bucket, one folder per client → client-files/{client_id}/...
-- =============================================================================
insert into storage.buckets (id, name, public)
values ('client-files', 'client-files', false)
on conflict (id) do nothing;

-- First path segment must be a valid client_id the caller can access.
create or replace function public.storage_client_id(object_name text)
returns uuid language plpgsql immutable as $$
begin
  return (storage.foldername(object_name))[1]::uuid;
exception when others then
  return null;   -- malformed path → no access
end;
$$;

create policy client_files_read on storage.objects for select to authenticated
  using (bucket_id = 'client-files'
         and public.can_access_client(public.storage_client_id(name)));
create policy client_files_upload on storage.objects for insert to authenticated
  with check (bucket_id = 'client-files'
              and public.can_access_client(public.storage_client_id(name)));
create policy client_files_delete on storage.objects for delete to authenticated
  using (bucket_id = 'client-files'
         and public.is_client_staff(public.storage_client_id(name),
                                    array['admin','cpa','senior_staff']));
