CREATE OR REPLACE FUNCTION public.get_mpesa_public_settings()
RETURNS TABLE(is_active boolean, amount integer, account_reference text, description text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT m.is_active, m.amount, m.account_reference, m.description
  FROM public.mpesa_settings m
  WHERE m.id = 1;
$$;
REVOKE EXECUTE ON FUNCTION public.get_mpesa_public_settings() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_mpesa_public_settings() TO authenticated;