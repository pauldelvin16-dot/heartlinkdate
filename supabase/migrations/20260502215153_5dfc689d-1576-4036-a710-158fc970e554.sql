
create or replace function public.handle_updated_at()
returns trigger language plpgsql security definer set search_path = public as $$
begin new.updated_at = now(); return new; end; $$;

revoke execute on function public.has_role(uuid, public.app_role) from anon;
revoke execute on function public.handle_updated_at() from anon, authenticated;
revoke execute on function public.handle_new_user() from anon, authenticated;
revoke execute on function public.handle_swipe_match() from anon, authenticated;

drop policy if exists "public read photos" on storage.objects;
create policy "auth read photos" on storage.objects for select to authenticated using (bucket_id = 'profile-photos');
