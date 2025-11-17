-- Drop existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Create improved function that handles all roles properly
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  user_role text;
  org_name text;
BEGIN
  -- Get role from metadata, default to 'donor'
  user_role := COALESCE(NEW.raw_user_meta_data->>'role', 'donor');
  
  -- Insert profile with correct role
  INSERT INTO profiles (id, name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', 'User'),
    user_role::user_role
  );
  
  -- Insert into user_roles with correct role
  INSERT INTO user_roles (user_id, role)
  VALUES (NEW.id, user_role::app_role);
  
  -- If NGO role, create NGO entry
  IF user_role = 'ngo' THEN
    org_name := COALESCE(NEW.raw_user_meta_data->>'organization_name', 'NGO Organization');
    
    INSERT INTO ngos (user_id, organization_name, contact_email)
    VALUES (
      NEW.id,
      org_name,
      NEW.email
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Recreate trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();