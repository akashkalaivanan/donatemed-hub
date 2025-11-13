import { supabase } from "@/integrations/supabase/client";

export type UserRole = 'donor' | 'ngo' | 'admin';

export interface Profile {
  id: string;
  name: string;
  role: UserRole;
  organization_name?: string;
  phone?: string;
  address?: string;
  created_at: string;
}

export { supabase };
