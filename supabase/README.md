# IslaSoft client portal — Supabase backend

Each client login sees **only its own client space**. Staff see every client in their firm.
Security lives in Postgres Row Level Security (RLS), not in the UI, so it holds even if
someone calls the API directly.

> This folder **does not create users and does not send emails.** The firm creates each
> login manually and links it with `scripts/link_client_login.sql`.

## Files

| File | Purpose |
|---|---|
| `migrations/20261116000000_client_portal_core.sql` | Tables + RLS helper functions |
| `migrations/20261116000100_client_portal_rls.sql` | RLS policies + private `client-files` bucket |
| `scripts/link_client_login.sql` | Link a login you created to one client |
| `tests/client_isolation_test.sql` | 21 isolation checks (Sandy Lopez test client); rolls back |

## How access works

1. **Supabase Auth** gives each login an ID (`auth.uid()`).
2. **`client_members`** says which client space(s) that login may enter.
3. **RLS** checks `client_members` (clients) or `profiles.user_type = 'staff'` (staff) on every query.

| Who | clients | documents / messages / projects | invoices | client_sensitive (SSN, bank, EFTPS) |
|---|---|---|---|---|
| Client login | own only | own only; can upload & message | own, non-draft, read-only | **none** |
| Staff | firm's | firm's | firm's | — |
| admin / cpa / senior_staff | firm's + edit | firm's + edit | firm's + edit | firm's |
| Anonymous | none | none | none | none |

Files go in bucket `client-files` at `{client_id}/{filename}`; the folder name is the wall.

## Setup

```bash
supabase init            # once; keeps these migrations
supabase link --project-ref <your-project-ref>
supabase db push         # applies both migrations
```

Then create the first tenant + your admin profile (SQL Editor, service role):

```sql
insert into public.tenants (name) values ('Isla Accompting Corp') returning id;
-- create your own login in Authentication → Users, then:
insert into public.profiles (id, tenant_id, user_type, team_category, display_name)
select id, '<tenant-id>', 'staff', 'admin', 'Sandy Lopez Oliva'
from auth.users where email = '<your-staff-email>';
```

## Add a client login (manual, no email sent)

1. Dashboard → **Authentication → Users → Add user → Create new user** (email + password, auto-confirm).
2. Edit and run `scripts/link_client_login.sql`.

## Run the isolation test

```bash
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/client_isolation_test.sql
```

Expect `ALL CHECKS PASSED`. Everything runs in a transaction that is rolled back.

## Before going live

- Encrypt `client_sensitive` credential columns with Supabase Vault.
- The Base44 `Client` entity currently mixes portal fields with SSN/bank/EFTPS passwords in
  one record — migrate those into `client_sensitive`, never into `clients`.
