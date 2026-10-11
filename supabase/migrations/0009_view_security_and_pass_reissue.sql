-- 1. SECURITY FIX: make the balance views obey row-level security.
--    By default a Postgres view runs with its creator's rights, which skips RLS on the
--    tables underneath. That let anyone with the public browser key read every business's
--    package names, balances and expiry dates (no names or emails). security_invoker makes
--    the views run with the reader's rights, so the normal RLS rules apply.
--    The server (service role) and record_visit are unaffected.
alter view purchase_balances set (security_invoker = true);
alter view account_balances  set (security_invoker = true);
revoke all on purchase_balances, account_balances from anon;

-- 2. Lost or shared pass: cancel the client's current wallet pass and issue a new one,
--    in one step (the old QR code stops working immediately).
create or replace function reissue_wallet_pass(p_provider_id uuid, p_visit_account_id uuid, p_user_id uuid)
returns uuid
language plpgsql
as $$
declare
  v_new uuid;
begin
  -- lock the account so a scan can't slip through mid-swap
  perform 1 from visit_accounts
   where id = p_visit_account_id and provider_id = p_provider_id
   for update;
  if not found then
    raise exception 'visit account does not belong to this provider';
  end if;

  update credentials
     set status = 'revoked', revoked_at = now()
   where visit_account_id = p_visit_account_id and kind = 'wallet' and status = 'active';

  insert into credentials (provider_id, visit_account_id, kind, status)
  values (p_provider_id, p_visit_account_id, 'wallet', 'active')
  returning id into v_new;

  insert into audit_log (provider_id, actor_id, action, entity, entity_id)
  values (p_provider_id, p_user_id, 'pass.reissued', 'visit_account', p_visit_account_id::text);

  return v_new;
end;
$$;

revoke execute on function reissue_wallet_pass(uuid, uuid, uuid) from public, anon, authenticated;
grant execute on function reissue_wallet_pass(uuid, uuid, uuid) to service_role;
