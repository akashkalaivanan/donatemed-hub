-- Fix search_path for update_donation_timestamp function
CREATE OR REPLACE FUNCTION public.update_donation_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Fix search_path for validate_new_donation function
CREATE OR REPLACE FUNCTION public.validate_new_donation()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- Validate expiry date is in the future for new donations
  IF NEW.expiry_date < CURRENT_DATE THEN
    RAISE EXCEPTION 'Expiry date must be in the future';
  END IF;
  
  RETURN NEW;
END;
$$;