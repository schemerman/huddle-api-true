-- Keep every user's pick counters in step with their settled picks.
-- The database already recalculated total_picks and win_rate whenever a pick changed,
-- but never won_picks, so leaderboards (won_picks / total_picks) disagreed with profiles.
-- Safe to run more than once.

-- 1. Recalculate all three counters whenever a pick changes (for example when it settles).
create or replace function public.update_user_stats()
returns trigger
language plpgsql
as $$
begin
  update public.users u
  set total_picks = s.settled,
      won_picks = s.won,
      win_rate = case when s.settled = 0 then 0 else round((s.won * 100.0) / s.settled) end
  from (
    select count(*) filter (where status in ('won', 'lost')) as settled,
           count(*) filter (where status = 'won') as won
    from public.wagers
    where user_id = new.user_id
  ) s
  where u.id = new.user_id;
  return new;
end;
$$;

-- 2. Correct every user's counters now.
update public.users u
set total_picks = x.settled,
    won_picks = x.won,
    win_rate = case when x.settled = 0 then 0 else round((x.won * 100.0) / x.settled) end
from (
  select u2.id,
         coalesce(count(w.id) filter (where w.status in ('won', 'lost')), 0) as settled,
         coalesce(count(w.id) filter (where w.status = 'won'), 0) as won
  from public.users u2
  left join public.wagers w on w.user_id = u2.id
  group by u2.id
) x
where u.id = x.id;
