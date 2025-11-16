-- Create rate limiting table for edge functions
CREATE TABLE IF NOT EXISTS public.edge_function_rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  function_name text NOT NULL,
  request_count integer DEFAULT 1,
  window_start timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, function_name)
);

-- Enable RLS
ALTER TABLE public.edge_function_rate_limits ENABLE ROW LEVEL SECURITY;

-- Admins can view all rate limits
CREATE POLICY "Admins can view rate limits"
ON public.edge_function_rate_limits
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Function to check and update rate limit
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  _user_id uuid,
  _function_name text,
  _max_requests integer,
  _window_minutes integer
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_count integer;
  window_start_time timestamptz;
BEGIN
  -- Get current rate limit data
  SELECT request_count, window_start
  INTO current_count, window_start_time
  FROM edge_function_rate_limits
  WHERE user_id = _user_id AND function_name = _function_name;

  -- If no record exists or window expired, create/reset
  IF NOT FOUND OR window_start_time < (now() - (_window_minutes || ' minutes')::interval) THEN
    INSERT INTO edge_function_rate_limits (user_id, function_name, request_count, window_start)
    VALUES (_user_id, _function_name, 1, now())
    ON CONFLICT (user_id, function_name)
    DO UPDATE SET request_count = 1, window_start = now();
    RETURN true;
  END IF;

  -- Check if limit exceeded
  IF current_count >= _max_requests THEN
    RETURN false;
  END IF;

  -- Increment counter
  UPDATE edge_function_rate_limits
  SET request_count = request_count + 1
  WHERE user_id = _user_id AND function_name = _function_name;

  RETURN true;
END;
$$;

-- Add admin promotion function
CREATE OR REPLACE FUNCTION public.promote_user_to_admin(
  _user_id uuid,
  _requesting_admin_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if requesting user is admin
  IF NOT has_role(_requesting_admin_id, 'admin'::app_role) THEN
    RAISE EXCEPTION 'Only admins can promote users';
  END IF;

  -- Check if target user already has admin role
  IF has_role(_user_id, 'admin'::app_role) THEN
    RETURN false; -- Already an admin
  END IF;

  -- Add admin role to user_roles table
  INSERT INTO user_roles (user_id, role)
  VALUES (_user_id, 'admin'::app_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  -- Update profile role
  UPDATE profiles
  SET role = 'admin'::user_role
  WHERE id = _user_id;

  RETURN true;
END;
$$;