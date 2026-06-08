
ALTER TABLE public.mpesa_payments ADD COLUMN IF NOT EXISTS order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_mpesa_payments_order ON public.mpesa_payments(order_id);

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'pending';

CREATE OR REPLACE FUNCTION public.mark_order_paid_for_payment(_order_id uuid, _payment_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.orders
     SET payment_status = 'paid',
         paid_at = COALESCE(paid_at, now()),
         status = CASE WHEN status = 'pending' THEN 'paid' ELSE status END,
         mpesa_payment_id = _payment_id
   WHERE id = _order_id;
END $$;

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
    IF _payment.order_id IS NOT NULL THEN
      PERFORM public.mark_order_paid_for_payment(_payment.order_id, _payment.id);
    ELSE
      PERFORM public.grant_premium_for_payment(_payment.user_id, _payment.id);
    END IF;
  ELSIF _payment.order_id IS NOT NULL THEN
    UPDATE public.orders SET payment_status = 'failed' WHERE id = _payment.order_id;
  END IF;
END $$;
