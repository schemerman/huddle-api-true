-- Stop point cheating. Runs as one transaction. Undo: 2026-10-23-lock-points-undo.sql
--
-- Before this:
--  * any signed-in user could set their own points / bonus time / win counts from the browser console
--    (the "update their own profile" rule allowed every column);
--  * award_fire trusted the giver id it was given, so anyone could move someone else's points;
--  * award_comment_fire had no checks at all (any amount, even negative);
--  * people could insert their own pick rows with any status or amount.
-- Database functions (bonus, settlement, sign-up) and the API server use the owner connection, so they keep working.
begin;

-- 1. Signed-in users may only edit their own profile details, not points or stats.
revoke insert, update on public.users from anon, authenticated;
grant update (display_name, username, avatar_color, dob, birth_date, profile_complete) on public.users to authenticated;
-- (Rows are created by the sign-up trigger handle_new_user, so the app never inserts users itself.)

-- 2. Fire tips: the giver is always the signed-in user.
create or replace function public.award_fire(post_id_param uuid, giver_id_param text, author_id_param text, tip_amount integer)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  me text := auth.uid()::text;
  giver_balance integer;
  real_author text;
begin
  if me is null then raise exception 'Please sign in to give an award.'; end if;
  if tip_amount is null or tip_amount < 1 then raise exception 'Tip must be at least 1 point.'; end if;
  if tip_amount > 50 then raise exception 'You cannot tip more than 50 points at a time.'; end if;

  select user_id into real_author from public.posts where id = post_id_param;
  if real_author is null then raise exception 'That post no longer exists.'; end if;
  if real_author = me then raise exception 'You cannot award fire to your own post.'; end if;

  select points into giver_balance from public.users where id = me for update;
  if giver_balance is null or giver_balance < tip_amount then raise exception 'Not enough points to give this award.'; end if;

  update public.users set points = points - tip_amount where id = me;
  update public.users set points = points + round(tip_amount * 0.8)::integer where id = real_author;
  update public.posts set fire_count = coalesce(fire_count, 0) + 1 where id = post_id_param;
end;
$$;

create or replace function public.award_comment_fire(comment_id_param uuid, giver_id_param text, author_id_param text, tip_amount integer)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  me text := auth.uid()::text;
  giver_balance integer;
  real_author text;
begin
  if me is null then raise exception 'Please sign in to give an award.'; end if;
  if tip_amount is null or tip_amount < 1 then raise exception 'Tip must be at least 1 point.'; end if;
  if tip_amount > 50 then raise exception 'You cannot tip more than 50 points at a time.'; end if;

  select user_id into real_author from public.comments where id = comment_id_param;
  if real_author is null then raise exception 'That reply no longer exists.'; end if;
  if real_author = me then raise exception 'You cannot award fire to your own reply.'; end if;

  select points into giver_balance from public.users where id = me for update;
  if giver_balance is null or giver_balance < tip_amount then raise exception 'Not enough points to give this award.'; end if;

  update public.users set points = points - tip_amount where id = me;
  update public.users set points = points + round(tip_amount * 0.8)::integer where id = real_author;
  update public.comments set fire_count = coalesce(fire_count, 0) + 1 where id = comment_id_param;
end;
$$;

revoke all on function public.award_fire(uuid, text, text, integer) from public, anon;
revoke all on function public.award_comment_fire(uuid, text, text, integer) from public, anon;
grant execute on function public.award_fire(uuid, text, text, integer) to authenticated;
grant execute on function public.award_comment_fire(uuid, text, text, integer) to authenticated;

-- 3. Picks are only placed through the API server (which checks points), never inserted directly.
drop policy if exists "Users can insert their own wagers" on public.wagers;

commit;
