-- Create user status enum
CREATE TYPE public.user_status AS ENUM ('active', 'blocked', 'suspended');

-- Add status column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN status user_status NOT NULL DEFAULT 'active';

-- Add blocked_reason column for admin notes
ALTER TABLE public.profiles
ADD COLUMN blocked_reason text;

-- Add blocked_at timestamp
ALTER TABLE public.profiles
ADD COLUMN blocked_at timestamp with time zone;

-- Add blocked_by to track which admin blocked the user
ALTER TABLE public.profiles
ADD COLUMN blocked_by uuid REFERENCES auth.users(id);

-- Create index for faster status queries
CREATE INDEX idx_profiles_status ON public.profiles(status);

-- Update donations RLS policy to prevent blocked users from inserting
DROP POLICY IF EXISTS "Donors can insert donations" ON public.donations;

CREATE POLICY "Donors can insert donations"
ON public.donations
FOR INSERT
WITH CHECK (
  (donor_id = auth.uid()) 
  AND (EXISTS (
    SELECT 1 
    FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'donor'::user_role
    AND profiles.status = 'active'::user_status
  ))
);

-- Allow admins to update user status
CREATE POLICY "Admins can update user status"
ON public.profiles
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));