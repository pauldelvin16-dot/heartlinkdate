CREATE OR REPLACE FUNCTION public.create_simulated_match(_user_id uuid, _target_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  a uuid;
  b uuid;
begin
  if auth.uid() <> _user_id then
    raise exception 'Not allowed';
  end if;

  if not exists(select 1 from public.profiles where id = _target_id and is_simulated = true and is_active = true) then
    raise exception 'Target is not a simulated active profile';
  end if;

  insert into public.swipes(swiper_id, target_id, liked)
  values (_target_id, _user_id, true)
  on conflict (swiper_id, target_id) do update
    set liked = true,
        created_at = now();

  a := least(_user_id, _target_id);
  b := greatest(_user_id, _target_id);
  insert into public.matches(user_a, user_b) values (a,b) on conflict do nothing;

  return jsonb_build_object('matched', true);
end; $function$;

REVOKE EXECUTE ON FUNCTION public.upsert_swipe(uuid, uuid, boolean) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.create_simulated_match(uuid, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.recommend_profiles(uuid, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.upsert_swipe(uuid, uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_simulated_match(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.recommend_profiles(uuid, integer) TO authenticated;