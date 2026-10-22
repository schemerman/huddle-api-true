-- Unique usernames, whatever the capitalisation, and sign-ups that never fail on a username clash.
-- Runs as one transaction. Undo: 2026-10-22-unique-usernames-undo.sql
begin;

-- 1. "CEO" and "ceo" count as the same username.
create unique index if not exists users_username_lower_key on public.users (lower(username));

-- 2. New sign-ups get a placeholder username they change in the profile step.
--    It's the email's name part, plus a short random suffix if that's already taken,
--    so two people called john@... can both sign up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  base text;
  candidate text;
begin
  base := lower(regexp_replace(split_part(coalesce(new.email, ''), '@', 1), '[^a-zA-Z0-9_]', '', 'g'));
  if length(base) < 3 then
    base := 'player';
  end if;
  base := left(base, 15);
  candidate := base;
  while exists (select 1 from public.users where lower(username) = candidate) loop
    candidate := base || '_' || substr(md5(random()::text), 1, 4);
  end loop;

  insert into public.users (id, email, username, display_name, points, "winRate", "previousWagers", "currentStreak", "isBankrupt")
  values (
    new.id::text,
    new.email,
    candidate,
    coalesce(nullif(new.raw_user_meta_data ->> 'full_name', ''), nullif(new.raw_user_meta_data ->> 'name', ''), split_part(new.email, '@', 1)),
    1000,
    0,
    0,
    0,
    false
  );
  return new;
end;
$$;

-- 3. Is this username free? Ignores capitalisation; your own current username counts as free.
create or replace function public.username_available(p_username text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select not exists (
    select 1 from public.users
    where lower(username) = lower(trim(p_username))
      and id <> coalesce(auth.uid()::text, '')
  );
$$;
grant execute on function public.username_available(text) to anon, authenticated;

commit;
