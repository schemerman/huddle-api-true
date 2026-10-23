-- Instant daily bonus: claimed straight in the database instead of through the API server
-- (which sleeps on Render's free plan and took 30-60 s to wake).
-- Same rules as the server (artifacts/api-server/src/routes/users.ts, lib/economy.ts):
-- 100 points, once every 24 hours; the "out of points" flag follows nextBankrupt().
-- Runs as one transaction. Undo: 2026-10-23-instant-daily-bonus-undo.sql
begin;

create or replace function public.claim_daily_bonus()
returns table (claimed boolean, points integer, last_daily_claim timestamptz)
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_column
declare
  me text := auth.uid()::text;
  u record;
  new_points integer;
begin
  if me is null then
    raise exception 'Not signed in' using errcode = '28000';
  end if;

  -- Lock the row so two quick taps can't both claim.
  select users.points, users.is_bankrupt, users.last_daily_claim into u
  from public.users where users.id = me for update;
  if not found then
    raise exception 'Account not found' using errcode = 'P0002';
  end if;

  if u.last_daily_claim is not null and u.last_daily_claim > now() - interval '24 hours' then
    return query select false, u.points, u.last_daily_claim;
    return;
  end if;

  new_points := u.points + 100;
  update public.users
  set points = new_points,
      is_bankrupt = case when new_points <= 0 then true when new_points > 500 then false else u.is_bankrupt end,
      last_daily_claim = now()
  where users.id = me;

  return query select true, new_points, now();
end;
$$;

revoke all on function public.claim_daily_bonus() from public, anon;
grant execute on function public.claim_daily_bonus() to authenticated;

commit;
