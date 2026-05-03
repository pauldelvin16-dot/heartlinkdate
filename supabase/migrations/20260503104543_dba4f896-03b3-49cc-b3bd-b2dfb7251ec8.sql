
-- 1. Fix age check
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_age_check;

-- 2. Add new profile fields
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS religion text,
  ADD COLUMN IF NOT EXISTS height_cm int,
  ADD COLUMN IF NOT EXISTS education text,
  ADD COLUMN IF NOT EXISTS relationship_goals text,
  ADD COLUMN IF NOT EXISTS smoking text,
  ADD COLUMN IF NOT EXISTS drinking text,
  ADD COLUMN IF NOT EXISTS has_children text,
  ADD COLUMN IF NOT EXISTS languages text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS financial_status text,
  ADD COLUMN IF NOT EXISTS preferred_age_min int,
  ADD COLUMN IF NOT EXISTS preferred_age_max int,
  ADD COLUMN IF NOT EXISTS preferred_genders text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS preferred_orientations text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS preferred_ethnicities text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS preferred_religions text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS preferred_countries text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS preferred_relationship_goals text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS is_premium boolean NOT NULL DEFAULT false;

-- 3. Add moderator role
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'moderator';

-- 4. premium_contacts: add moderator assignment
ALTER TABLE public.premium_contacts
  ADD COLUMN IF NOT EXISTS moderator_user_id uuid;

-- 5. site_settings: add toggles + smtp activation
ALTER TABLE public.site_settings
  ADD COLUMN IF NOT EXISTS enable_otp_login boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS enable_2fa_email boolean NOT NULL DEFAULT false;

-- 6. premium_subscriptions
CREATE TABLE IF NOT EXISTS public.premium_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  plan text NOT NULL DEFAULT 'premium',
  status text NOT NULL DEFAULT 'active',
  starts_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.premium_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users view own subs" ON public.premium_subscriptions FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "admins manage subs" ON public.premium_subscriptions FOR ALL USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- helper: keep profiles.is_premium synced
CREATE OR REPLACE FUNCTION public.sync_premium_flag() RETURNS trigger
  LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.profiles SET is_premium = EXISTS(
    SELECT 1 FROM public.premium_subscriptions
     WHERE user_id = COALESCE(NEW.user_id, OLD.user_id)
       AND status = 'active'
       AND (expires_at IS NULL OR expires_at > now())
  ) WHERE id = COALESCE(NEW.user_id, OLD.user_id);
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_sync_premium ON public.premium_subscriptions;
CREATE TRIGGER trg_sync_premium AFTER INSERT OR UPDATE OR DELETE ON public.premium_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.sync_premium_flag();

-- 7. smtp_settings (single row)
CREATE TABLE IF NOT EXISTS public.smtp_settings (
  id int PRIMARY KEY DEFAULT 1,
  host text,
  port int DEFAULT 587,
  secure boolean DEFAULT false,
  username text,
  password text,
  from_email text,
  from_name text,
  reply_to text,
  is_active boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT smtp_singleton CHECK (id = 1)
);
INSERT INTO public.smtp_settings (id) VALUES (1) ON CONFLICT DO NOTHING;
ALTER TABLE public.smtp_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins manage smtp" ON public.smtp_settings FOR ALL USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- 8. email_templates
CREATE TABLE IF NOT EXISTS public.email_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  subject text NOT NULL,
  html text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins manage templates" ON public.email_templates FOR ALL USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "anyone reads active templates" ON public.email_templates FOR SELECT USING (is_active = true);

INSERT INTO public.email_templates (key, subject, html) VALUES
('signup_welcome', 'Welcome to {{site_name}} 💖',
 '<div style="font-family:Inter,Arial,sans-serif;max-width:560px;margin:auto;padding:32px;background:#fff"><div style="text-align:center;padding:20px 0"><h1 style="background:linear-gradient(90deg,#e91e63,#9333ea);-webkit-background-clip:text;color:transparent;font-size:32px;margin:0">{{site_name}}</h1></div><h2 style="color:#111">Hi {{name}}, welcome 💕</h2><p style="color:#444;font-size:15px;line-height:1.6">Your journey to find love starts now. Complete your profile and start meeting amazing people near you.</p><a href="{{site_url}}" style="display:inline-block;background:linear-gradient(135deg,#e91e63,#9333ea);color:#fff;padding:14px 28px;border-radius:999px;text-decoration:none;font-weight:600">Open {{site_name}}</a></div>'),
('password_reset', 'Reset your {{site_name}} password',
 '<div style="font-family:Inter,Arial,sans-serif;max-width:560px;margin:auto;padding:32px;background:#fff"><h1 style="background:linear-gradient(90deg,#e91e63,#9333ea);-webkit-background-clip:text;color:transparent">{{site_name}}</h1><h2>Reset your password</h2><p>Hi {{name}}, click the button below to choose a new password. This link expires in 1 hour.</p><a href="{{reset_url}}" style="display:inline-block;background:linear-gradient(135deg,#e91e63,#9333ea);color:#fff;padding:14px 28px;border-radius:999px;text-decoration:none;font-weight:600">Reset password</a><p style="color:#888;font-size:12px;margin-top:24px">If you did not request this, you can safely ignore this email.</p></div>'),
('otp_login', 'Your {{site_name}} login code',
 '<div style="font-family:Inter,Arial,sans-serif;max-width:560px;margin:auto;padding:32px;background:#fff;text-align:center"><h1 style="background:linear-gradient(90deg,#e91e63,#9333ea);-webkit-background-clip:text;color:transparent">{{site_name}}</h1><p>Your one-time login code:</p><div style="font-size:42px;letter-spacing:12px;font-weight:700;color:#111;margin:24px 0">{{code}}</div><p style="color:#888;font-size:13px">Expires in 10 minutes.</p></div>'),
('two_factor', '{{site_name}} 2FA verification code',
 '<div style="font-family:Inter,Arial,sans-serif;max-width:560px;margin:auto;padding:32px;background:#fff;text-align:center"><h1 style="background:linear-gradient(90deg,#e91e63,#9333ea);-webkit-background-clip:text;color:transparent">{{site_name}}</h1><h2>Two-factor verification</h2><div style="font-size:42px;letter-spacing:12px;font-weight:700;color:#111;margin:24px 0">{{code}}</div><p style="color:#888;font-size:13px">Enter this code to finish signing in. Expires in 10 minutes.</p></div>')
ON CONFLICT (key) DO NOTHING;

-- 9. OTP codes
CREATE TABLE IF NOT EXISTS public.otp_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  code_hash text NOT NULL,
  purpose text NOT NULL DEFAULT 'login',
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_otp_email ON public.otp_codes(email);
ALTER TABLE public.otp_codes ENABLE ROW LEVEL SECURITY;
-- no public policies; only edge functions (service role) access

-- 10. password_reset_tokens
CREATE TABLE IF NOT EXISTS public.password_reset_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.password_reset_tokens ENABLE ROW LEVEL SECURITY;
-- no public policies; service role only

-- 11. Recommendation/score function (algorithm)
CREATE OR REPLACE FUNCTION public.recommend_profiles(_user_id uuid, _limit int DEFAULT 30)
RETURNS TABLE (
  id uuid, display_name text, age int, gender text, orientation text,
  country text, city text, ethnicity text, religion text, bio text,
  photos text[], conditions text[], interests text[], score int
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE me public.profiles%ROWTYPE;
BEGIN
  SELECT * INTO me FROM public.profiles WHERE id = _user_id;
  IF me.id IS NULL THEN RETURN; END IF;

  RETURN QUERY
  SELECT p.id, p.display_name, p.age, p.gender, p.orientation,
         p.country, p.city, p.ethnicity, p.religion, p.bio,
         p.photos, p.conditions, p.interests,
    (
      -- gender / interest match
      (CASE WHEN me.interested_in IS NULL OR me.interested_in IN ('any','') OR p.gender = me.interested_in THEN 25 ELSE 0 END)
      -- orientation reciprocity
      + (CASE WHEN me.orientation IS NULL OR p.orientation IS NULL OR p.orientation = me.orientation THEN 10 ELSE 5 END)
      -- country / city
      + (CASE WHEN me.country IS NOT NULL AND p.country = me.country THEN 12 ELSE 0 END)
      + (CASE WHEN me.city IS NOT NULL AND p.city = me.city THEN 8 ELSE 0 END)
      -- religion preference
      + (CASE WHEN me.preferred_religions IS NOT NULL AND array_length(me.preferred_religions,1) > 0 AND p.religion = ANY(me.preferred_religions) THEN 10 ELSE 0 END)
      -- ethnicity preference
      + (CASE WHEN me.preferred_ethnicities IS NOT NULL AND array_length(me.preferred_ethnicities,1) > 0 AND p.ethnicity = ANY(me.preferred_ethnicities) THEN 8 ELSE 0 END)
      -- relationship goal
      + (CASE WHEN me.relationship_goals IS NOT NULL AND p.relationship_goals = me.relationship_goals THEN 8 ELSE 0 END)
      -- shared interests
      + (CASE WHEN me.interests IS NOT NULL AND p.interests IS NOT NULL
              THEN LEAST(20, COALESCE(array_length(ARRAY(SELECT UNNEST(p.interests) INTERSECT SELECT UNNEST(me.interests)),1),0) * 4)
              ELSE 0 END)
      -- shared conditions (community)
      + (CASE WHEN me.conditions IS NOT NULL AND p.conditions IS NOT NULL
              THEN LEAST(15, COALESCE(array_length(ARRAY(SELECT UNNEST(p.conditions) INTERSECT SELECT UNNEST(me.conditions)),1),0) * 6)
              ELSE 0 END)
      -- age window
      + (CASE WHEN me.preferred_age_min IS NOT NULL AND me.preferred_age_max IS NOT NULL
                   AND p.age BETWEEN me.preferred_age_min AND me.preferred_age_max THEN 10 ELSE 0 END)
    )::int AS score
  FROM public.profiles p
  WHERE p.id <> _user_id
    AND p.is_active = true
    AND NOT EXISTS (SELECT 1 FROM public.swipes s WHERE s.swiper_id = _user_id AND s.target_id = p.id)
  ORDER BY score DESC, RANDOM()
  LIMIT _limit;
END $$;

GRANT EXECUTE ON FUNCTION public.recommend_profiles(uuid, int) TO authenticated;
