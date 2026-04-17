-- ============================================================
-- 0002_profiles_email.sql
-- Add email column to profiles + update trigger
-- ============================================================

-- Add email column so we can display emails without service_role reads
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email TEXT;
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);

-- Update trigger to also store email on user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, org_id, full_name, role, email)
  VALUES (
    NEW.id,
    (NEW.raw_user_meta_data->>'org_id')::uuid,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE((NEW.raw_user_meta_data->>'role')::public.profile_role, 'member'),
    NEW.email
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
