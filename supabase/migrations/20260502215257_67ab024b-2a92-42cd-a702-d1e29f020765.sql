
alter table public.profiles drop constraint profiles_id_fkey;
-- Re-add as a soft check via trigger only for non-simulated profiles
create or replace function public.profiles_check_real_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.is_simulated = false then
    if not exists (select 1 from auth.users where id = new.id) then
      raise exception 'Profile id must match an auth user when not simulated';
    end if;
  end if;
  return new;
end; $$;
revoke execute on function public.profiles_check_real_user() from anon, authenticated;
create trigger profiles_real_user_check before insert or update on public.profiles
  for each row execute function public.profiles_check_real_user();
