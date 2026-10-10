-- Visit Pack :: row-level security (Supabase).
-- Principle: a signed-in user can only see data for providers they belong to.
-- Clients and the public purchase page never touch these tables directly;
-- the server reads and writes them with the service role after its own checks.
-- scan_only staff get NO direct table access. They check people in through the
-- server, which calls record_visit() and returns only name + visits remaining.

create or replace function is_provider_admin(p_provider_id uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from provider_members m
     where m.provider_id = p_provider_id
       and m.user_id = auth.uid()
       and m.role in ('owner','manager')
  );
$$;

alter table providers            enable row level security;
alter table provider_members     enable row level security;
alter table package_templates    enable row level security;
alter table clients              enable row level security;
alter table visit_accounts       enable row level security;
alter table credentials          enable row level security;
alter table purchases            enable row level security;
alter table visit_ledger         enable row level security;
alter table apple_registrations  enable row level security;
alter table stripe_events        enable row level security;
alter table audit_log            enable row level security;

-- providers: admins read; only the owner edits
create policy providers_read on providers for select using (is_provider_admin(id));
create policy providers_update on providers for update using (
  exists (select 1 from provider_members m
           where m.provider_id = providers.id and m.user_id = auth.uid() and m.role = 'owner'));

-- membership: you can see your own memberships
create policy members_read on provider_members for select using (user_id = auth.uid());

-- provider-owned tables: admins read and write
create policy templates_all on package_templates for all
  using (is_provider_admin(provider_id)) with check (is_provider_admin(provider_id));

create policy clients_all on clients for all
  using (is_provider_admin(provider_id)) with check (is_provider_admin(provider_id));

create policy accounts_read on visit_accounts for select using (is_provider_admin(provider_id));
create policy credentials_read on credentials for select using (is_provider_admin(provider_id));
create policy purchases_read on purchases for select using (is_provider_admin(provider_id));
create policy ledger_read on visit_ledger for select using (is_provider_admin(provider_id));
create policy audit_read on audit_log for select using (is_provider_admin(provider_id));

-- No policies on apple_registrations or stripe_events: only the server
-- (service role, which bypasses RLS) can touch them.
-- Ledger, purchases and credentials are written only by the server functions.
