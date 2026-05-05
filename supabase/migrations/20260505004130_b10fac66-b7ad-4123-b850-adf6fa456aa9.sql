ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS email text;

UPDATE public.profiles p
SET email = u.email
FROM auth.users u
WHERE p.id = u.id AND p.email IS NULL;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
begin
  insert into public.profiles (id, display_name, email, phone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email,'@',1)),
    new.email,
    new.raw_user_meta_data->>'phone'
  )
  on conflict (id) do update set
    email = excluded.email,
    phone = coalesce(public.profiles.phone, excluded.phone),
    updated_at = now();
  insert into public.user_roles (user_id, role) values (new.id, 'user') on conflict do nothing;
  return new;
end; $function$;

CREATE OR REPLACE FUNCTION public.handle_swipe_match()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare a uuid; b uuid;
begin
  if new.liked then
    if exists(select 1 from public.swipes s where s.swiper_id = new.target_id and s.target_id = new.swiper_id and s.liked = true) then
      a := least(new.swiper_id, new.target_id);
      b := greatest(new.swiper_id, new.target_id);
      insert into public.matches(user_a, user_b) values (a,b) on conflict do nothing;
    end if;
  end if;
  return new;
end; $function$;

CREATE OR REPLACE FUNCTION public.upsert_swipe(_swiper_id uuid, _target_id uuid, _liked boolean)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  a uuid;
  b uuid;
  did_match boolean := false;
begin
  if auth.uid() <> _swiper_id and not public.has_role(auth.uid(), 'admin') then
    raise exception 'Not allowed';
  end if;

  insert into public.swipes(swiper_id, target_id, liked)
  values (_swiper_id, _target_id, _liked)
  on conflict (swiper_id, target_id) do update
    set liked = excluded.liked,
        created_at = now();

  if _liked and exists(select 1 from public.swipes s where s.swiper_id = _target_id and s.target_id = _swiper_id and s.liked = true) then
    a := least(_swiper_id, _target_id);
    b := greatest(_swiper_id, _target_id);
    insert into public.matches(user_a, user_b) values (a,b) on conflict do nothing;
    did_match := true;
  end if;

  return jsonb_build_object('matched', did_match);
end; $function$;

CREATE TABLE IF NOT EXISTS public.mpesa_settings (
  id integer PRIMARY KEY DEFAULT 1,
  is_active boolean NOT NULL DEFAULT false,
  environment text NOT NULL DEFAULT 'sandbox',
  consumer_key text,
  consumer_secret text,
  pass_key text,
  shortcode text,
  account_reference text NOT NULL DEFAULT 'Premium',
  description text NOT NULL DEFAULT 'Premium unlock',
  amount integer NOT NULL DEFAULT 1,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT mpesa_settings_singleton CHECK (id = 1),
  CONSTRAINT mpesa_settings_environment_check CHECK (environment in ('sandbox','production')),
  CONSTRAINT mpesa_settings_amount_check CHECK (amount > 0)
);

ALTER TABLE public.mpesa_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admins manage mpesa settings" ON public.mpesa_settings;
CREATE POLICY "admins manage mpesa settings"
ON public.mpesa_settings
FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.mpesa_settings (id)
VALUES (1)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.mpesa_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  phone text NOT NULL,
  amount integer NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  checkout_request_id text,
  merchant_request_id text,
  result_code text,
  result_desc text,
  raw_response jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT mpesa_payments_status_check CHECK (status in ('pending','processing','paid','failed','cancelled','expired'))
);

ALTER TABLE public.mpesa_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users view own mpesa payments" ON public.mpesa_payments;
CREATE POLICY "users view own mpesa payments"
ON public.mpesa_payments
FOR SELECT
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "users create own mpesa payments" ON public.mpesa_payments;
CREATE POLICY "users create own mpesa payments"
ON public.mpesa_payments
FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "admins manage mpesa payments" ON public.mpesa_payments;
CREATE POLICY "admins manage mpesa payments"
ON public.mpesa_payments
FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP TRIGGER IF EXISTS update_mpesa_payments_updated_at ON public.mpesa_payments;
CREATE TRIGGER update_mpesa_payments_updated_at
BEFORE UPDATE ON public.mpesa_payments
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_mpesa_payments_user_status ON public.mpesa_payments(user_id, status);
CREATE INDEX IF NOT EXISTS idx_mpesa_payments_checkout ON public.mpesa_payments(checkout_request_id);