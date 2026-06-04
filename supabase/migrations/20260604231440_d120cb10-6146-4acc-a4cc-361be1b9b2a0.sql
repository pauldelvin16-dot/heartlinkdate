
-- Add region/state field to profiles for finer-grained matching
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS region text;

-- Concurrency: unique index on M-Pesa checkout to prevent dup payments
CREATE UNIQUE INDEX IF NOT EXISTS mpesa_payments_checkout_uniq
  ON public.mpesa_payments(checkout_request_id) WHERE checkout_request_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS mpesa_payments_status_idx ON public.mpesa_payments(status);
CREATE INDEX IF NOT EXISTS mpesa_payments_user_idx ON public.mpesa_payments(user_id, created_at DESC);

-- Idempotent grant: only grant if not already paid; uses advisory lock to serialize concurrent callbacks for same payment
CREATE OR REPLACE FUNCTION public.mpesa_mark_paid_and_grant(_checkout_id text, _result_code text, _result_desc text, _raw jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
    PERFORM public.grant_premium_for_payment(_payment.user_id, _payment.id);
  END IF;
END $$;

-- Add updated_at to mpesa_packages trigger-free path; ensure recommend_profiles considers region (slight boost)
-- Add a small region boost: drop+recreate recommend_profiles is heavy; just ensure region column is available.

-- Notify when admin approves connection request (optional notification row)
CREATE OR REPLACE FUNCTION public.notify_connection_approved()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'approved' AND COALESCE(OLD.status,'') <> 'approved' THEN
    INSERT INTO public.notifications(user_id, title, body, kind, link)
    VALUES (NEW.user_id, 'Connection approved 🎉', 'Your admin connection was approved. You can now message your match.', 'connection', '/matches');
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_notify_connection_approved ON public.connection_requests;
CREATE TRIGGER trg_notify_connection_approved AFTER UPDATE ON public.connection_requests
  FOR EACH ROW EXECUTE FUNCTION public.notify_connection_approved();
