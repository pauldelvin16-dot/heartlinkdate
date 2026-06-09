
-- =========================================================
-- 1) Meetup Escrow table
-- =========================================================
CREATE TABLE IF NOT EXISTS public.meetup_escrows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  payer_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  payee_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount_kes integer NOT NULL CHECK (amount_kes >= 1),
  purpose text,
  status text NOT NULL DEFAULT 'pending', -- pending | funded | released | fulfilled | refunded | cancelled | failed
  mpesa_payment_id uuid,
  funded_at timestamptz,
  released_at timestamptz,
  fulfilled_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.meetup_escrows TO authenticated;
GRANT ALL ON public.meetup_escrows TO service_role;

ALTER TABLE public.meetup_escrows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can view their escrows"
  ON public.meetup_escrows FOR SELECT TO authenticated
  USING (auth.uid() = payer_id OR auth.uid() = payee_id OR public.has_role(auth.uid(),'admin'));

CREATE POLICY "Admins can update escrows"
  ON public.meetup_escrows FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin'));

CREATE TRIGGER trg_meetup_escrows_updated_at
  BEFORE UPDATE ON public.meetup_escrows
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE INDEX IF NOT EXISTS idx_meetup_escrows_payer ON public.meetup_escrows(payer_id, status);
CREATE INDEX IF NOT EXISTS idx_meetup_escrows_payee ON public.meetup_escrows(payee_id, status);
CREATE INDEX IF NOT EXISTS idx_meetup_escrows_match ON public.meetup_escrows(match_id);

-- =========================================================
-- 2) Link M-Pesa payments to escrows
-- =========================================================
ALTER TABLE public.mpesa_payments
  ADD COLUMN IF NOT EXISTS escrow_id uuid REFERENCES public.meetup_escrows(id) ON DELETE SET NULL;

-- =========================================================
-- 3) RPCs (create / release / fulfil / cancel)
-- =========================================================
CREATE OR REPLACE FUNCTION public.create_meetup_escrow(
  _match_id uuid, _amount_kes integer, _purpose text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _m public.matches%ROWTYPE; _payee uuid; _id uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
  IF _amount_kes IS NULL OR _amount_kes < 1 THEN RAISE EXCEPTION 'Invalid amount'; END IF;
  SELECT * INTO _m FROM public.matches WHERE id = _match_id;
  IF _m.id IS NULL THEN RAISE EXCEPTION 'Match not found'; END IF;
  IF auth.uid() NOT IN (_m.user_a, _m.user_b) THEN RAISE EXCEPTION 'Not your match'; END IF;
  _payee := CASE WHEN _m.user_a = auth.uid() THEN _m.user_b ELSE _m.user_a END;
  INSERT INTO public.meetup_escrows(match_id, payer_id, payee_id, amount_kes, purpose)
  VALUES (_match_id, auth.uid(), _payee, _amount_kes, _purpose)
  RETURNING id INTO _id;
  RETURN _id;
END $$;

CREATE OR REPLACE FUNCTION public.release_meetup_escrow(_escrow_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _e public.meetup_escrows%ROWTYPE;
BEGIN
  SELECT * INTO _e FROM public.meetup_escrows WHERE id = _escrow_id FOR UPDATE;
  IF _e.id IS NULL THEN RAISE EXCEPTION 'Escrow not found'; END IF;
  IF auth.uid() <> _e.payer_id THEN RAISE EXCEPTION 'Only payer can release'; END IF;
  IF _e.status <> 'funded' THEN RAISE EXCEPTION 'Escrow not funded yet'; END IF;
  UPDATE public.meetup_escrows
     SET status = 'released', released_at = now()
   WHERE id = _escrow_id;
  INSERT INTO public.notifications(user_id, title, body, kind, link)
  VALUES (_e.payee_id, 'Funds released to you 💸',
          'The payer marked your meetup as satisfactory. You can now mark it as fulfilled.',
          'escrow', '/meetups');
END $$;

CREATE OR REPLACE FUNCTION public.mark_meetup_fulfilled(_escrow_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _e public.meetup_escrows%ROWTYPE;
BEGIN
  SELECT * INTO _e FROM public.meetup_escrows WHERE id = _escrow_id FOR UPDATE;
  IF _e.id IS NULL THEN RAISE EXCEPTION 'Escrow not found'; END IF;
  IF auth.uid() <> _e.payee_id THEN RAISE EXCEPTION 'Only payee can mark fulfilled'; END IF;
  IF _e.status <> 'released' THEN RAISE EXCEPTION 'Escrow not released yet'; END IF;
  UPDATE public.meetup_escrows SET status = 'fulfilled', fulfilled_at = now() WHERE id = _escrow_id;
END $$;

CREATE OR REPLACE FUNCTION public.cancel_meetup_escrow(_escrow_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _e public.meetup_escrows%ROWTYPE;
BEGIN
  SELECT * INTO _e FROM public.meetup_escrows WHERE id = _escrow_id FOR UPDATE;
  IF _e.id IS NULL THEN RAISE EXCEPTION 'Escrow not found'; END IF;
  IF auth.uid() <> _e.payer_id AND NOT public.has_role(auth.uid(),'admin') THEN
    RAISE EXCEPTION 'Only payer or admin can cancel';
  END IF;
  IF _e.status NOT IN ('pending','funded') THEN RAISE EXCEPTION 'Cannot cancel in current state'; END IF;
  UPDATE public.meetup_escrows
     SET status = CASE WHEN _e.status = 'funded' THEN 'refunded' ELSE 'cancelled' END,
         cancelled_at = now()
   WHERE id = _escrow_id;
END $$;

-- =========================================================
-- 4) Update the M-Pesa callback handler to support escrows
-- =========================================================
CREATE OR REPLACE FUNCTION public.mpesa_mark_paid_and_grant(_checkout_id text, _result_code text, _result_desc text, _raw jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _payment public.mpesa_payments%ROWTYPE; _new_status text;
BEGIN
  SELECT * INTO _payment FROM public.mpesa_payments WHERE checkout_request_id = _checkout_id FOR UPDATE;
  IF _payment.id IS NULL THEN RETURN; END IF;
  IF _payment.status = 'paid' THEN RETURN; END IF;
  _new_status := CASE WHEN _result_code = '0' THEN 'paid' ELSE 'failed' END;
  UPDATE public.mpesa_payments
     SET status = _new_status, result_code = _result_code, result_desc = _result_desc, raw_response = _raw, updated_at = now()
   WHERE id = _payment.id;
  IF _new_status = 'paid' THEN
    IF _payment.escrow_id IS NOT NULL THEN
      UPDATE public.meetup_escrows
         SET status = 'funded', funded_at = now(), mpesa_payment_id = _payment.id
       WHERE id = _payment.escrow_id;
    ELSIF _payment.order_id IS NOT NULL THEN
      PERFORM public.mark_order_paid_for_payment(_payment.order_id, _payment.id);
    ELSE
      PERFORM public.grant_premium_for_payment(_payment.user_id, _payment.id);
    END IF;
  ELSE
    IF _payment.escrow_id IS NOT NULL THEN
      UPDATE public.meetup_escrows SET status = 'failed' WHERE id = _payment.escrow_id AND status = 'pending';
    ELSIF _payment.order_id IS NOT NULL THEN
      UPDATE public.orders SET payment_status = 'failed' WHERE id = _payment.order_id;
    END IF;
  END IF;
END $$;

-- =========================================================
-- 5) Strict orientation + location-aware matching
-- =========================================================
CREATE OR REPLACE FUNCTION public.recommend_profiles(_user_id uuid, _limit integer DEFAULT 30)
RETURNS TABLE(id uuid, display_name text, age integer, gender text, orientation text,
              country text, city text, ethnicity text, religion text, bio text,
              photos text[], conditions text[], interests text[],
              score integer, distance_km numeric)
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
      40 -- baseline (already passed compatibility filter)
      + (CASE WHEN me.country IS NOT NULL AND p.country = me.country THEN 10 ELSE 0 END)
      + (CASE WHEN me.county IS NOT NULL AND p.county = me.county THEN 14 ELSE 0 END)
      + (CASE WHEN me.sub_county IS NOT NULL AND p.sub_county = me.sub_county THEN 10 ELSE 0 END)
      + (CASE WHEN me.town IS NOT NULL AND p.town = me.town THEN 8 ELSE 0 END)
      + (CASE WHEN me.city IS NOT NULL AND p.city = me.city THEN 6 ELSE 0 END)
      + (CASE WHEN me.preferred_religions IS NOT NULL AND array_length(me.preferred_religions,1) > 0
              AND p.religion = ANY(me.preferred_religions) THEN 8 ELSE 0 END)
      + (CASE WHEN me.preferred_ethnicities IS NOT NULL AND array_length(me.preferred_ethnicities,1) > 0
              AND p.ethnicity = ANY(me.preferred_ethnicities) THEN 6 ELSE 0 END)
      + (CASE WHEN me.relationship_goals IS NOT NULL AND p.relationship_goals = me.relationship_goals THEN 6 ELSE 0 END)
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
    -- ============ HARD ORIENTATION + GENDER COMPATIBILITY ============
    -- My side: target's gender must be one I am attracted to
    AND (
      me.orientation IS NULL OR p.gender IS NULL OR me.gender IS NULL
      OR (me.orientation = 'straight'  AND p.gender <> me.gender AND p.gender IN ('male','female'))
      OR (me.orientation = 'gay'       AND me.gender = 'male'   AND p.gender = 'male')
      OR (me.orientation = 'lesbian'   AND me.gender = 'female' AND p.gender = 'female')
      OR (me.orientation = 'gay'       AND me.gender <> 'male')  -- non-binary using "gay": same gender
      OR (me.orientation IN ('bisexual','pansexual','queer'))
      OR (me.orientation = 'asexual'   AND TRUE)
    )
    -- Their side: I must match what they are attracted to
    AND (
      p.orientation IS NULL OR p.gender IS NULL OR me.gender IS NULL
      OR (p.orientation = 'straight'  AND me.gender <> p.gender AND me.gender IN ('male','female'))
      OR (p.orientation = 'gay'       AND p.gender = 'male'   AND me.gender = 'male')
      OR (p.orientation = 'lesbian'   AND p.gender = 'female' AND me.gender = 'female')
      OR (p.orientation = 'gay'       AND p.gender <> 'male')
      OR (p.orientation IN ('bisexual','pansexual','queer','asexual'))
    )
    -- "interested_in" hard filter when set explicitly
    AND (me.interested_in IS NULL OR me.interested_in IN ('any','') OR p.gender = me.interested_in)
  ORDER BY score DESC, distance_km NULLS LAST, RANDOM()
  LIMIT _limit;
END $$;
