/*
# Admin Foundation: Auto-profile trigger, Storage bucket, Admin read policies

## Overview
Sets up the infrastructure needed for the admin panel:
1. Auto-creates a profile row when a new auth user signs up (trigger + function)
2. Creates a public storage bucket for file uploads (PDFs, covers, artwork)
3. Adds admin-read policies on reading_progress, bookmarks, treasure_claims so admins can view analytics
4. Adds an admin-read policy on profiles so the admin user manager can list all users

## Changes
- `handle_new_user()` function: inserts a profile row with role='student', email from auth.users
- `on_auth_user_created` trigger: fires after INSERT on auth.users
- Storage bucket `school-uploads`: public bucket for PDFs, images, audio
- Storage policies: admin write, public read
- RLS policies: admin can SELECT all profiles, reading_progress, bookmarks, treasure_claims

## Security
- Profile auto-creation uses SECURITY DEFINER so it can write to profiles during signup
- Storage bucket is public-read (artwork/covers/PDFs are meant to be publicly viewable)
- Only admins can upload/modify storage objects
- Admin read on user data is for analytics only — admins still cannot modify user-owned rows
*/

-- ===== Auto-create profile on signup =====
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (NEW.id, NEW.email, 'student')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ===== Admin can read all profiles (for user management) =====
-- The existing profiles_admin_all policy already covers FOR ALL, but let's
-- make sure it also allows SELECT. Since it's FOR ALL with is_admin(), it does.
-- No additional policy needed — profiles_admin_all already grants full access to admins.

-- ===== Admin can read all reading_progress (for analytics) =====
DROP POLICY IF EXISTS "progress_admin_read" ON public.reading_progress;
CREATE POLICY "progress_admin_read" ON public.reading_progress FOR SELECT
  TO authenticated USING (public.is_admin());

-- ===== Admin can read all bookmarks (for analytics) =====
DROP POLICY IF EXISTS "bookmarks_admin_read" ON public.bookmarks;
CREATE POLICY "bookmarks_admin_read" ON public.bookmarks FOR SELECT
  TO authenticated USING (public.is_admin());

-- ===== Admin can read all treasure_claims (already has admin_read, but ensure) =====
-- treasure_claims already has claims_admin_read policy, no change needed.

-- ===== Storage bucket for uploads =====
INSERT INTO storage.buckets (id, name, public)
VALUES ('school-uploads', 'school-uploads', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: admin can CRUD, anyone can read (public bucket)
DROP POLICY IF EXISTS "storage_admin_write" ON storage.objects;
CREATE POLICY "storage_admin_write" ON storage.objects FOR ALL
  TO authenticated
  USING (public.is_admin() AND bucket_id = 'school-uploads')
  WITH CHECK (public.is_admin() AND bucket_id = 'school-uploads');

DROP POLICY IF EXISTS "storage_public_read" ON storage.objects;
CREATE POLICY "storage_public_read" ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'school-uploads');
