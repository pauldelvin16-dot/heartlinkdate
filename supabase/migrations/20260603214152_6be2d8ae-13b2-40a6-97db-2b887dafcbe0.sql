
CREATE TABLE IF NOT EXISTS public.ads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL, body text,
  cta_text text DEFAULT 'Get 5 extra swipes',
  image_url text, video_url text, link_url text,
  placement text NOT NULL DEFAULT 'banner',
  reward_swipes integer NOT NULL DEFAULT 5,
  is_active boolean NOT NULL DEFAULT true,
  starts_at timestamptz, ends_at timestamptz,
  weight integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.ads TO authenticated, anon;
GRANT ALL ON public.ads TO service_role;
ALTER TABLE public.ads ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anyone reads active ads" ON public.ads;
CREATE POLICY "anyone reads active ads" ON public.ads FOR SELECT USING (is_active = true OR public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "admins manage ads" ON public.ads;
CREATE POLICY "admins manage ads" ON public.ads FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE IF NOT EXISTS public.ad_clicks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ad_id uuid NOT NULL REFERENCES public.ads(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  reward_granted integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ad_clicks_user_idx ON public.ad_clicks(user_id, created_at DESC);
GRANT SELECT, INSERT ON public.ad_clicks TO authenticated;
GRANT ALL ON public.ad_clicks TO service_role;
ALTER TABLE public.ad_clicks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users insert own ad clicks" ON public.ad_clicks;
CREATE POLICY "users insert own ad clicks" ON public.ad_clicks FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "users view own ad clicks" ON public.ad_clicks;
CREATE POLICY "users view own ad clicks" ON public.ad_clicks FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bonus_swipes integer NOT NULL DEFAULT 0;

ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS meta_title text;
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS meta_description text;
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS meta_keywords text;
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS og_image_url text;
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS favicon_url text;
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS google_site_verification text;
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS ads_enabled boolean NOT NULL DEFAULT true;
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS canonical_url text;

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  endpoint text NOT NULL UNIQUE,
  p256dh text NOT NULL, auth text NOT NULL,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS push_user_idx ON public.push_subscriptions(user_id);
GRANT SELECT, INSERT, DELETE ON public.push_subscriptions TO authenticated;
GRANT ALL ON public.push_subscriptions TO service_role;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users manage own push" ON public.push_subscriptions;
CREATE POLICY "users manage own push" ON public.push_subscriptions FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "admins view push" ON public.push_subscriptions;
CREATE POLICY "admins view push" ON public.push_subscriptions FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL, body text, link text,
  kind text DEFAULT 'general',
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS notif_user_idx ON public.notifications(user_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users see own notifications" ON public.notifications;
CREATE POLICY "users see own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "users update own notifications" ON public.notifications;
CREATE POLICY "users update own notifications" ON public.notifications FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "admins insert notifications" ON public.notifications;
CREATE POLICY "admins insert notifications" ON public.notifications FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='notifications') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.click_ad(_ad_id uuid)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE _reward int;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
  SELECT reward_swipes INTO _reward FROM public.ads WHERE id = _ad_id AND is_active = true;
  IF _reward IS NULL THEN RAISE EXCEPTION 'Ad not available'; END IF;
  INSERT INTO public.ad_clicks(ad_id, user_id, reward_granted) VALUES (_ad_id, auth.uid(), _reward);
  UPDATE public.profiles SET bonus_swipes = COALESCE(bonus_swipes,0) + _reward WHERE id = auth.uid();
  RETURN _reward;
END $fn$;

CREATE OR REPLACE FUNCTION public.consume_bonus_swipe()
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
BEGIN
  UPDATE public.profiles SET bonus_swipes = GREATEST(0, COALESCE(bonus_swipes,0) - 1) WHERE id = auth.uid() AND COALESCE(bonus_swipes,0) > 0;
  RETURN FOUND;
END $fn$;

CREATE OR REPLACE FUNCTION public.unread_counts(_user_id uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $fn$
  SELECT jsonb_build_object(
    'messages', (SELECT count(*) FROM public.messages WHERE recipient_id = _user_id AND read_at IS NULL),
    'notifications', (SELECT count(*) FROM public.notifications WHERE user_id = _user_id AND read_at IS NULL)
  );
$fn$;
