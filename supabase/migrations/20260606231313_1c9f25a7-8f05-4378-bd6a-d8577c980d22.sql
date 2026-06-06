
ALTER TABLE public.ads
  ADD COLUMN IF NOT EXISTS is_skippable boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS skip_after_seconds integer NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS target_countries text[] NOT NULL DEFAULT '{}'::text[];

CREATE TABLE IF NOT EXISTS public.ad_impressions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ad_id uuid NOT NULL,
  user_id uuid,
  country text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.ad_impressions TO authenticated;
GRANT SELECT ON public.ad_impressions TO anon;
GRANT ALL ON public.ad_impressions TO service_role;
ALTER TABLE public.ad_impressions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anyone inserts impressions" ON public.ad_impressions;
CREATE POLICY "anyone inserts impressions" ON public.ad_impressions FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "admins view impressions" ON public.ad_impressions;
CREATE POLICY "admins view impressions" ON public.ad_impressions FOR SELECT USING (public.has_role(auth.uid(),'admin'));

CREATE INDEX IF NOT EXISTS ad_impressions_ad_idx ON public.ad_impressions(ad_id, created_at DESC);
CREATE INDEX IF NOT EXISTS ad_clicks_ad_idx ON public.ad_clicks(ad_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.log_ad_impression(_ad_id uuid, _country text DEFAULT NULL)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  INSERT INTO public.ad_impressions(ad_id, user_id, country) VALUES (_ad_id, auth.uid(), _country);
$$;

CREATE OR REPLACE FUNCTION public.ad_stats()
RETURNS TABLE(ad_id uuid, title text, placement text, impressions bigint, clicks bigint, swipes_granted bigint, ctr numeric)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT a.id, a.title, a.placement,
    COALESCE((SELECT count(*) FROM public.ad_impressions i WHERE i.ad_id = a.id), 0)::bigint,
    COALESCE((SELECT count(*) FROM public.ad_clicks c WHERE c.ad_id = a.id), 0)::bigint,
    COALESCE((SELECT sum(reward_granted) FROM public.ad_clicks c WHERE c.ad_id = a.id), 0)::bigint,
    CASE WHEN (SELECT count(*) FROM public.ad_impressions i WHERE i.ad_id = a.id) > 0
         THEN ROUND(((SELECT count(*) FROM public.ad_clicks c WHERE c.ad_id = a.id)::numeric
              / (SELECT count(*) FROM public.ad_impressions i WHERE i.ad_id = a.id)::numeric) * 100, 2)
         ELSE 0 END
  FROM public.ads a
  ORDER BY a.created_at DESC;
$$;
