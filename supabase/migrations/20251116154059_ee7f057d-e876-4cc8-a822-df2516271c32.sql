-- Create enum for roles
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'donor', 'ngo');

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Migrate existing roles from profiles to user_roles
INSERT INTO public.user_roles (user_id, role)
SELECT id, role::text::app_role
FROM public.profiles
ON CONFLICT (user_id, role) DO NOTHING;

-- Update handle_new_user trigger to use user_roles and always default to donor
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert profile
  INSERT INTO profiles (id, name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', 'User'),
    'donor'::user_role
  );
  
  -- Always assign donor role by default (admins must be promoted manually)
  INSERT INTO user_roles (user_id, role)
  VALUES (NEW.id, 'donor'::app_role);
  
  RETURN NEW;
END;
$$;

-- Add RLS policies for user_roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
ON public.user_roles
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Add UPDATE policies to donations table
CREATE POLICY "Admins can update donation status"
ON public.donations
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Update claims INSERT policy to verify NGO association
DROP POLICY IF EXISTS "NGOs can insert claims" ON public.claims;

CREATE POLICY "NGOs can insert claims"
ON public.claims
FOR INSERT
WITH CHECK (
  public.has_role(auth.uid(), 'ngo') AND 
  claimed_by = auth.uid() AND
  EXISTS (
    SELECT 1 FROM public.ngos 
    WHERE ngos.id = claims.ngo_id 
    AND ngos.user_id = auth.uid()
  )
);

-- Add constraints for donation validation (excluding expiry date check for existing data)
ALTER TABLE public.donations
ADD CONSTRAINT check_quantity_positive CHECK (quantity > 0);

ALTER TABLE public.donations
ADD CONSTRAINT check_medicine_name_length CHECK (char_length(medicine_name) <= 255 AND char_length(medicine_name) > 0);

ALTER TABLE public.donations
ADD CONSTRAINT check_description_length CHECK (description IS NULL OR char_length(description) <= 2000);

-- Create trigger function to validate new donations
CREATE OR REPLACE FUNCTION public.validate_new_donation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Validate expiry date is in the future for new donations
  IF NEW.expiry_date < CURRENT_DATE THEN
    RAISE EXCEPTION 'Expiry date must be in the future';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for new donation validation
CREATE TRIGGER validate_donation_before_insert
BEFORE INSERT ON public.donations
FOR EACH ROW
EXECUTE FUNCTION public.validate_new_donation();