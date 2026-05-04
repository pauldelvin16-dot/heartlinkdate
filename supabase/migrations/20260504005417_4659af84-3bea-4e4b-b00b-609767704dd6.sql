
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS latitude double precision,
  ADD COLUMN IF NOT EXISTS longitude double precision,
  ADD COLUMN IF NOT EXISTS location_city text,
  ADD COLUMN IF NOT EXISTS location_country text,
  ADD COLUMN IF NOT EXISTS location_updated_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_profiles_geo ON public.profiles (latitude, longitude);

DROP FUNCTION IF EXISTS public.recommend_profiles(uuid, integer);

CREATE OR REPLACE FUNCTION public.recommend_profiles(_user_id uuid, _limit integer DEFAULT 30)
 RETURNS TABLE(id uuid, display_name text, age integer, gender text, orientation text, country text, city text, ethnicity text, religion text, bio text, photos text[], conditions text[], interests text[], score integer, distance_km numeric)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE me public.profiles%ROWTYPE;
BEGIN
  SELECT * INTO me FROM public.profiles WHERE id = _user_id;
  IF me.id IS NULL THEN RETURN; END IF;

  RETURN QUERY
  SELECT p.id, p.display_name, p.age, p.gender, p.orientation,
         p.country, p.city, p.ethnicity, p.religion, p.bio,
         p.photos, p.conditions, p.interests,
    (
      (CASE WHEN me.interested_in IS NULL OR me.interested_in IN ('any','') OR p.gender = me.interested_in THEN 25 ELSE 0 END)
      + (CASE WHEN me.orientation IS NULL OR p.orientation IS NULL OR p.orientation = me.orientation THEN 10 ELSE 5 END)
      + (CASE WHEN me.country IS NOT NULL AND p.country = me.country THEN 12 ELSE 0 END)
      + (CASE WHEN me.city IS NOT NULL AND p.city = me.city THEN 8 ELSE 0 END)
      + (CASE WHEN me.preferred_religions IS NOT NULL AND array_length(me.preferred_religions,1) > 0 AND p.religion = ANY(me.preferred_religions) THEN 10 ELSE 0 END)
      + (CASE WHEN me.preferred_ethnicities IS NOT NULL AND array_length(me.preferred_ethnicities,1) > 0 AND p.ethnicity = ANY(me.preferred_ethnicities) THEN 8 ELSE 0 END)
      + (CASE WHEN me.relationship_goals IS NOT NULL AND p.relationship_goals = me.relationship_goals THEN 8 ELSE 0 END)
      + (CASE WHEN me.interests IS NOT NULL AND p.interests IS NOT NULL
              THEN LEAST(20, COALESCE(array_length(ARRAY(SELECT UNNEST(p.interests) INTERSECT SELECT UNNEST(me.interests)),1),0) * 4)
              ELSE 0 END)
      + (CASE WHEN me.conditions IS NOT NULL AND p.conditions IS NOT NULL
              THEN LEAST(15, COALESCE(array_length(ARRAY(SELECT UNNEST(p.conditions) INTERSECT SELECT UNNEST(me.conditions)),1),0) * 6)
              ELSE 0 END)
      + (CASE WHEN me.preferred_age_min IS NOT NULL AND me.preferred_age_max IS NOT NULL
                   AND p.age BETWEEN me.preferred_age_min AND me.preferred_age_max THEN 10 ELSE 0 END)
      + (CASE WHEN me.latitude IS NOT NULL AND me.longitude IS NOT NULL AND p.latitude IS NOT NULL AND p.longitude IS NOT NULL
              THEN GREATEST(0, 25 - LEAST(25, (
                6371 * acos(LEAST(1, GREATEST(-1,
                  cos(radians(me.latitude)) * cos(radians(p.latitude)) *
                  cos(radians(p.longitude) - radians(me.longitude)) +
                  sin(radians(me.latitude)) * sin(radians(p.latitude))
                )))
              )::int / 20))
              ELSE 0 END)
    )::int AS score,
    (CASE WHEN me.latitude IS NOT NULL AND me.longitude IS NOT NULL AND p.latitude IS NOT NULL AND p.longitude IS NOT NULL
          THEN ROUND((6371 * acos(LEAST(1, GREATEST(-1,
                cos(radians(me.latitude)) * cos(radians(p.latitude)) *
                cos(radians(p.longitude) - radians(me.longitude)) +
                sin(radians(me.latitude)) * sin(radians(p.latitude))
              ))))::numeric, 1)
          ELSE NULL END) AS distance_km
  FROM public.profiles p
  WHERE p.id <> _user_id
    AND p.is_active = true
    AND NOT EXISTS (SELECT 1 FROM public.swipes s WHERE s.swiper_id = _user_id AND s.target_id = p.id)
  ORDER BY score DESC, distance_km NULLS LAST, RANDOM()
  LIMIT _limit;
END $function$;

CREATE TABLE IF NOT EXISTS public.user_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  accuracy double precision,
  city text,
  country text,
  source text DEFAULT 'browser',
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_user_locations_user ON public.user_locations(user_id, created_at DESC);

ALTER TABLE public.user_locations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users insert own location" ON public.user_locations;
CREATE POLICY "users insert own location" ON public.user_locations
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "users view own locations" ON public.user_locations;
CREATE POLICY "users view own locations" ON public.user_locations
  FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
