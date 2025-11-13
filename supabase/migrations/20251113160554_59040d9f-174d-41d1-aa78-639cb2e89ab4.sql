-- Create enum for user roles
CREATE TYPE user_role AS ENUM ('donor', 'ngo', 'admin');

-- Create enum for donation status
CREATE TYPE donation_status AS ENUM ('pending', 'approved', 'rejected', 'claimed');

-- Create profiles table
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role user_role NOT NULL,
  organization_name TEXT,
  phone TEXT,
  address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create NGOs table
CREATE TABLE ngos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  organization_name TEXT NOT NULL,
  description TEXT,
  requirements TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create donations table
CREATE TABLE donations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  donor_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  medicine_name TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  expiry_date DATE NOT NULL,
  description TEXT,
  image_url TEXT,
  status donation_status DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create mappings table
CREATE TABLE mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  donation_id UUID REFERENCES donations(id) ON DELETE CASCADE NOT NULL,
  ngo_id UUID REFERENCES ngos(id) ON DELETE CASCADE NOT NULL,
  similarity_score DECIMAL(5,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(donation_id, ngo_id)
);

-- Create claims table
CREATE TABLE claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  donation_id UUID REFERENCES donations(id) ON DELETE CASCADE NOT NULL,
  ngo_id UUID REFERENCES ngos(id) ON DELETE CASCADE NOT NULL,
  claimed_at TIMESTAMPTZ DEFAULT NOW(),
  claimed_by UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  UNIQUE(donation_id)
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE ngos ENABLE ROW LEVEL SECURITY;
ALTER TABLE donations ENABLE ROW LEVEL SECURITY;
ALTER TABLE mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE claims ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view all profiles" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- RLS Policies for NGOs
CREATE POLICY "Anyone can view NGOs" ON ngos FOR SELECT USING (true);
CREATE POLICY "NGO users can insert their NGO" ON ngos FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ngo')
);
CREATE POLICY "NGO users can update their NGO" ON ngos FOR UPDATE USING (
  user_id = auth.uid()
);

-- RLS Policies for donations
CREATE POLICY "Anyone can view approved donations" ON donations FOR SELECT USING (
  status = 'approved' OR donor_id = auth.uid() OR 
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Donors can insert donations" ON donations FOR INSERT WITH CHECK (
  donor_id = auth.uid() AND 
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'donor')
);
CREATE POLICY "Donors can view their donations" ON donations FOR SELECT USING (donor_id = auth.uid());

-- RLS Policies for mappings
CREATE POLICY "NGOs and admins can view mappings" ON mappings FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('ngo', 'admin'))
);
CREATE POLICY "Admins can insert mappings" ON mappings FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- RLS Policies for claims
CREATE POLICY "Anyone can view claims" ON claims FOR SELECT USING (true);
CREATE POLICY "NGOs can insert claims" ON claims FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ngo') AND
  claimed_by = auth.uid()
);

-- Function to automatically create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', 'User'),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'donor')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to create profile on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Function to update donation updated_at
CREATE OR REPLACE FUNCTION update_donation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for donation updates
CREATE TRIGGER update_donations_timestamp
  BEFORE UPDATE ON donations
  FOR EACH ROW EXECUTE FUNCTION update_donation_timestamp();