
-- 1. Packages
CREATE TABLE public.mpesa_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  amount integer NOT NULL,
  duration_days integer NOT NULL DEFAULT 30,
  daily_swipe_limit integer,
  features text[] DEFAULT '{}',
  is_popular boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.mpesa_packages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone reads active packages" ON public.mpesa_packages FOR SELECT USING (is_active = true OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "admins manage packages" ON public.mpesa_packages FOR ALL USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- 2. Payment columns
ALTER TABLE public.mpesa_payments ADD COLUMN IF NOT EXISTS package_id uuid;
ALTER TABLE public.mpesa_payments ADD COLUMN IF NOT EXISTS duration_days integer NOT NULL DEFAULT 30;

-- 3. Messages
CREATE TABLE public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  recipient_id uuid NOT NULL,
  body text NOT NULL,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_messages_match ON public.messages(match_id, created_at);
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- 4. Connection requests
CREATE TABLE public.connection_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  match_id uuid NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  target_id uuid NOT NULL,
  message text,
  status text NOT NULL DEFAULT 'pending',
  admin_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);
ALTER TABLE public.connection_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users create own requests" ON public.connection_requests FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users view own requests" ON public.connection_requests FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "admins manage requests" ON public.connection_requests FOR ALL USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- 5. Admin-granted messaging connection
CREATE TABLE public.admin_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_a uuid NOT NULL,
  user_b uuid NOT NULL,
  granted_by uuid,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_a, user_b)
);
ALTER TABLE public.admin_connections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users see own connections" ON public.admin_connections FOR SELECT USING (auth.uid() = user_a OR auth.uid() = user_b OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "admins manage connections" ON public.admin_connections FOR ALL USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- 6. can_message helper
CREATE OR REPLACE FUNCTION public.can_message(_a uuid, _b uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.matches m
    WHERE (m.user_a = _a AND m.user_b = _b) OR (m.user_a = _b AND m.user_b = _a)
  ) AND (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = _a AND p.is_premium = true)
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = _b AND p.is_premium = true)
    OR EXISTS (
      SELECT 1 FROM public.admin_connections c
      WHERE ((c.user_a = _a AND c.user_b = _b) OR (c.user_a = _b AND c.user_b = _a))
        AND (c.expires_at IS NULL OR c.expires_at > now())
    )
  );
$$;

-- 7. Messages RLS
CREATE POLICY "view own messages" ON public.messages FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = recipient_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "send if allowed" ON public.messages FOR INSERT WITH CHECK (
  auth.uid() = sender_id AND public.can_message(sender_id, recipient_id)
);
CREATE POLICY "update own read" ON public.messages FOR UPDATE USING (auth.uid() = recipient_id) WITH CHECK (auth.uid() = recipient_id);

-- 8. grant_premium_for_payment (with duration)
CREATE OR REPLACE FUNCTION public.grant_premium_for_payment(_user_id uuid, _payment_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _days int;
BEGIN
  SELECT COALESCE(duration_days, 30) INTO _days FROM public.mpesa_payments WHERE id = _payment_id;
  IF _days IS NULL THEN _days := 30; END IF;
  -- Deactivate older active subs
  UPDATE public.premium_subscriptions SET status = 'expired'
   WHERE user_id = _user_id AND status = 'active' AND (expires_at IS NULL OR expires_at <= now());
  -- Upsert active sub: extend if already active
  IF EXISTS (SELECT 1 FROM public.premium_subscriptions WHERE user_id = _user_id AND status='active' AND (expires_at IS NULL OR expires_at > now())) THEN
    UPDATE public.premium_subscriptions
       SET expires_at = GREATEST(COALESCE(expires_at, now()), now()) + (_days || ' days')::interval,
           notes = COALESCE(notes,'') || ' +payment:' || _payment_id::text
     WHERE user_id = _user_id AND status='active';
  ELSE
    INSERT INTO public.premium_subscriptions(user_id, plan, status, starts_at, expires_at, notes)
    VALUES (_user_id, 'premium', 'active', now(), now() + (_days || ' days')::interval, 'payment:' || _payment_id::text);
  END IF;
  UPDATE public.profiles SET is_premium = true WHERE id = _user_id;
END $$;

-- 9. Manual grant by admin
CREATE OR REPLACE FUNCTION public.grant_premium_manual(_user_id uuid, _days int, _note text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Not allowed'; END IF;
  IF EXISTS (SELECT 1 FROM public.premium_subscriptions WHERE user_id = _user_id AND status='active' AND (expires_at IS NULL OR expires_at > now())) THEN
    UPDATE public.premium_subscriptions
       SET expires_at = GREATEST(COALESCE(expires_at, now()), now()) + (_days || ' days')::interval,
           notes = COALESCE(notes,'') || ' manual:' || COALESCE(_note,'')
     WHERE user_id = _user_id AND status='active';
  ELSE
    INSERT INTO public.premium_subscriptions(user_id, plan, status, starts_at, expires_at, notes)
    VALUES (_user_id, 'premium', 'active', now(), now() + (_days || ' days')::interval, COALESCE(_note,'manual'));
  END IF;
  UPDATE public.profiles SET is_premium = true WHERE id = _user_id;
END $$;

-- 10. Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER TABLE public.messages REPLICA IDENTITY FULL;

-- 11. Seed default packages (only if none exist)
INSERT INTO public.mpesa_packages (name, description, amount, duration_days, daily_swipe_limit, features, is_popular, sort_order)
SELECT * FROM (VALUES
  ('Weekly Spark', 'Unlimited swipes & messaging for 7 days', 99, 7, NULL::int, ARRAY['Unlimited swipes','Direct messaging','Premium filters'], false, 1),
  ('Monthly Romance', 'Most popular — 30 days of premium access', 299, 30, NULL::int, ARRAY['Unlimited swipes','Direct messaging','Premium filters','Distance radius','See who liked you'], true, 2),
  ('Quarterly Love', '90 days at the best value', 699, 90, NULL::int, ARRAY['Everything in Monthly','Priority profile boost','Concierge match support'], false, 3)
) AS v(name,description,amount,duration_days,daily_swipe_limit,features,is_popular,sort_order)
WHERE NOT EXISTS (SELECT 1 FROM public.mpesa_packages);
