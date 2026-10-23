-- Undo 2026-10-23-lock-points.sql: restores the previous (open) rules and fire functions.
begin;
grant insert, update on public.users to anon, authenticated;

create or replace function public.award_fire(post_id_param uuid, giver_id_param text, author_id_param text, tip_amount integer)
returns void language plpgsql security definer as $function$
declare giver_balance integer; reward integer;
begin
  if tip_amount > 50 then raise exception 'You cannot tip more than 50 points at a time.'; end if;
  if tip_amount < 1 then raise exception 'Tip must be at least 1 point.'; end if;
  select points into giver_balance from public.users where id = giver_id_param;
  if giver_balance < tip_amount then raise exception 'Not enough points to give this award.'; end if;
  reward := round(tip_amount * 0.8);
  update public.users set points = points - tip_amount where id = giver_id_param;
  update public.users set points = points + reward where id = author_id_param;
  update public.posts set fire_count = fire_count + 1 where id = post_id_param;
end; $function$;

create or replace function public.award_comment_fire(comment_id_param uuid, giver_id_param text, author_id_param text, tip_amount integer)
returns void language plpgsql security invoker as $function$
begin
  update users set points = points - tip_amount where id = giver_id_param;
  update users set points = points + (tip_amount * 0.8) where id = author_id_param;
  update comments set fire_count = fire_count + 1 where id = comment_id_param;
end; $function$;

grant execute on function public.award_fire(uuid, text, text, integer) to public;
grant execute on function public.award_comment_fire(uuid, text, text, integer) to public;

create policy "Users can insert their own wagers" on public.wagers for insert with check ((auth.uid())::text = user_id);
commit;
