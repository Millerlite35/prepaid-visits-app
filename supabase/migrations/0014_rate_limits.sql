-- Simple fixed-window rate limits, so one person or machine can't hammer checkout,
-- sign-in, password resets or the scanner. Server-only. Buckets are opaque strings
-- built by the server (IP addresses and emails are hashed before they get here).

create table rate_limits (
  bucket       text not null,
  window_start timestamptz not null,
  hits         integer not null default 0,
  primary key (bucket, window_start)
);

alter table rate_limits enable row level security;
revoke all on rate_limits from anon, authenticated;

-- Count one hit. Returns true if it's still within the limit.
create or replace function hit_rate_limit(p_bucket text, p_limit integer, p_window_seconds integer)
returns boolean
language plpgsql
as $$
declare
  v_window timestamptz := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  v_hits   integer;
begin
  insert into rate_limits (bucket, window_start, hits)
  values (p_bucket, v_window, 1)
  on conflict (bucket, window_start) do update set hits = rate_limits.hits + 1
  returning hits into v_hits;

  -- tidy up now and then, so the table stays tiny
  if random() < 0.02 then
    delete from rate_limits where window_start < now() - interval '1 day';
  end if;

  return v_hits <= p_limit;
end;
$$;

revoke execute on function hit_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function hit_rate_limit(text, integer, integer) to service_role;
