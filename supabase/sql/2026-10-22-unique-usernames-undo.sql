-- Undo 2026-10-22-unique-usernames.sql: restores the original sign-up trigger.
begin;
drop function if exists public.username_available(text);
drop index if exists public.users_username_lower_key;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
as $function$
begin
  insert into public.users (id, email, username, display_name, points, "winRate", "previousWagers", "currentStreak", "isBankrupt")
  values (
    new.id::text,
    new.email,
    split_part(new.email, '@', 1),
    split_part(new.email, '@', 1),
    1000,
    0,
    0,
    0,
    false
  );
  return new;
end;
$function$;
commit;
