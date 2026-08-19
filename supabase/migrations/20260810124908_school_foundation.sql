/*
# The Static Online School — Foundation Schema

## Overview
Creates the core content and access schema for The Static Online School,
an online English learning platform for learners aged 4–18.

## New Tables
- `profiles` — extends auth.users with role (student/teacher/admin), display name, and access window dates
- `site_sections` — controls whether each major site area is active, under construction, or hidden
- `site_assets` — replaceable artwork references keyed by slot name (homepage hero, library entrance, etc.)
- `site_settings` — key/value store for configurable limits (guest minutes, free days, etc.)
- `series` — library series (e.g. 12 series across 6 CEFR levels), each with artwork, level, age range
- `books` — books belonging to a series, with cover, PDF, audio, page count, format, treasure clue
- `reading_progress` — per-user reading state: last page, percent, completed, dates
- `bookmarks` — per-user saved books
- `book_reactions` — per-user like/heart feedback on books
- `cinema_videos` — YouTube video catalog (400+ capacity), with category, level, publish state
- `games` — game room entries (20+ capacity) with status: available / coming_soon / hidden
- `treasure_claims` — records when a user finds and claims the hidden treasure clue

## Security
- RLS enabled on every table.
- Public read on all content tables (sections, assets, settings, series, books, cinema, games) via anon + authenticated.
- User-scoped write on reading_progress, bookmarks, book_reactions (owner = auth.uid()).
- Admin-only writes on content management tables (series, books, cinema, games, sections, assets, settings).
- Admin role resolved via a SECURITY DEFINER function `is_admin()` to avoid exposing role column directly.
*/

-- ===== profiles (must exist before is_admin function) =====
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'student' CHECK (role IN ('student','teacher','admin')),
  display_name text,
  email text,
  access_starts_at timestamptz DEFAULT now(),
  access_ends_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_self_read" ON public.profiles;
CREATE POLICY "profiles_self_read" ON public.profiles FOR SELECT
  TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_self_update" ON public.profiles;
CREATE POLICY "profiles_self_update" ON public.profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- ===== Helper: is_admin() (after profiles table exists, before any admin policies) =====
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- Now the admin policy can safely reference is_admin()
DROP POLICY IF EXISTS "profiles_admin_all" ON public.profiles;
CREATE POLICY "profiles_admin_all" ON public.profiles FOR ALL
  TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ===== site_sections =====
CREATE TABLE IF NOT EXISTS public.site_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  label text NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','under_construction','hidden')),
  display_order int NOT NULL DEFAULT 0,
  description text,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.site_sections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sections_public_read" ON public.site_sections;
CREATE POLICY "sections_public_read" ON public.site_sections FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "sections_admin_write" ON public.site_sections;
CREATE POLICY "sections_admin_write" ON public.site_sections FOR ALL
  TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ===== site_assets =====
CREATE TABLE IF NOT EXISTS public.site_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slot text UNIQUE NOT NULL,
  label text NOT NULL,
  url text NOT NULL,
  alt_text text,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.site_assets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "assets_public_read" ON public.site_assets;
CREATE POLICY "assets_public_read" ON public.site_assets FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "assets_admin_write" ON public.site_assets;
CREATE POLICY "assets_admin_write" ON public.site_assets FOR ALL
  TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ===== site_settings =====
CREATE TABLE IF NOT EXISTS public.site_settings (
  key text PRIMARY KEY,
  value text NOT NULL,
  description text,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "settings_public_read" ON public.site_settings;
CREATE POLICY "settings_public_read" ON public.site_settings FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "settings_admin_write" ON public.site_settings;
CREATE POLICY "settings_admin_write" ON public.site_settings FOR ALL
  TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ===== series =====
CREATE TABLE IF NOT EXISTS public.series (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  cefr_level text NOT NULL CHECK (cefr_level IN ('Pre-A1','A1','A2','B1','B2','C1')),
  age_range text,
  description text,
  cover_url text,
  display_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_series_level ON public.series(cefr_level);
CREATE INDEX IF NOT EXISTS idx_series_order ON public.series(display_order);

ALTER TABLE public.series ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "series_public_read" ON public.series;
CREATE POLICY "series_public_read" ON public.series FOR SELECT
  TO anon, authenticated USING (is_active = true);

DROP POLICY IF EXISTS "series_admin_write" ON public.series;
CREATE POLICY "series_admin_write" ON public.series FOR ALL
  TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ===== books =====
CREATE TABLE IF NOT EXISTS public.books (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  series_id uuid REFERENCES public.series(id) ON DELETE SET NULL,
  title text NOT NULL,
  subtitle text,
  book_number int,
  cefr_level text CHECK (cefr_level IN ('Pre-A1','A1','A2','B1','B2','C1')),
  age_range text,
  description text,
  cover_url text,
  pdf_url text,
  page_count int,
  aspect_ratio text DEFAULT 'portrait',
  audio_url text,
  is_published boolean NOT NULL DEFAULT false,
  is_completed boolean NOT NULL DEFAULT false,
  display_order int NOT NULL DEFAULT 0,
  tags text[],
  treasure_page int,
  treasure_active boolean NOT NULL DEFAULT false,
  date_added timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_books_series ON public.books(series_id);
CREATE INDEX IF NOT EXISTS idx_books_level ON public.books(cefr_level);
CREATE INDEX IF NOT EXISTS idx_books_published ON public.books(is_published);
CREATE INDEX IF NOT EXISTS idx_books_order ON public.books(display_order);

ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "books_public_read" ON public.books;
CREATE POLICY "books_public_read" ON public.books FOR SELECT
  TO anon, authenticated USING (is_published = true);

DROP POLICY IF EXISTS "books_admin_write" ON public.books;
CREATE POLICY "books_admin_write" ON public.books FOR ALL
  TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ===== reading_progress =====
CREATE TABLE IF NOT EXISTS public.reading_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  book_id uuid NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  last_page int NOT NULL DEFAULT 1,
  percent_complete numeric NOT NULL DEFAULT 0,
  is_completed boolean NOT NULL DEFAULT false,
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  updated_at timestamptz DEFAULT now(),
  UNIQUE (user_id, book_id)
);

CREATE INDEX IF NOT EXISTS idx_progress_user ON public.reading_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_progress_book ON public.reading_progress(book_id);

ALTER TABLE public.reading_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "progress_owner_read" ON public.reading_progress;
CREATE POLICY "progress_owner_read" ON public.reading_progress FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "progress_owner_insert" ON public.reading_progress;
CREATE POLICY "progress_owner_insert" ON public.reading_progress FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "progress_owner_update" ON public.reading_progress;
CREATE POLICY "progress_owner_update" ON public.reading_progress FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "progress_owner_delete" ON public.reading_progress;
CREATE POLICY "progress_owner_delete" ON public.reading_progress FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ===== bookmarks =====
CREATE TABLE IF NOT EXISTS public.bookmarks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  book_id uuid NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, book_id)
);

ALTER TABLE public.bookmarks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "bookmarks_owner_read" ON public.bookmarks;
CREATE POLICY "bookmarks_owner_read" ON public.bookmarks FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "bookmarks_owner_insert" ON public.bookmarks;
CREATE POLICY "bookmarks_owner_insert" ON public.bookmarks FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "bookmarks_owner_delete" ON public.bookmarks;
CREATE POLICY "bookmarks_owner_delete" ON public.bookmarks FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ===== book_reactions =====
CREATE TABLE IF NOT EXISTS public.book_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  book_id uuid NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  reaction text NOT NULL DEFAULT 'like' CHECK (reaction IN ('like')),
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, book_id)
);

ALTER TABLE public.book_reactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "reactions_public_read" ON public.book_reactions;
CREATE POLICY "reactions_public_read" ON public.book_reactions FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "reactions_owner_insert" ON public.book_reactions;
CREATE POLICY "reactions_owner_insert" ON public.book_reactions FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "reactions_owner_delete" ON public.book_reactions;
CREATE POLICY "reactions_owner_delete" ON public.book_reactions FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ===== cinema_videos =====
CREATE TABLE IF NOT EXISTS public.cinema_videos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  youtube_url text,
  youtube_id text,
  thumbnail_url text,
  description text,
  category text,
  age_range text,
  cefr_level text,
  tags text[],
  display_order int NOT NULL DEFAULT 0,
  is_published boolean NOT NULL DEFAULT false,
  date_added timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cinema_published ON public.cinema_videos(is_published);
CREATE INDEX IF NOT EXISTS idx_cinema_category ON public.cinema_videos(category);
CREATE INDEX IF NOT EXISTS idx_cinema_order ON public.cinema_videos(display_order);

ALTER TABLE public.cinema_videos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cinema_public_read" ON public.cinema_videos;
CREATE POLICY "cinema_public_read" ON public.cinema_videos FOR SELECT
  TO anon, authenticated USING (is_published = true);

DROP POLICY IF EXISTS "cinema_admin_write" ON public.cinema_videos;
CREATE POLICY "cinema_admin_write" ON public.cinema_videos FOR ALL
  TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ===== games =====
CREATE TABLE IF NOT EXISTS public.games (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  thumbnail_url text,
  url text,
  embed_mode text NOT NULL DEFAULT 'external' CHECK (embed_mode IN ('embedded','external')),
  age_range text,
  cefr_level text,
  subject text,
  status text NOT NULL DEFAULT 'coming_soon' CHECK (status IN ('available','coming_soon','hidden')),
  display_order int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_games_status ON public.games(status);
CREATE INDEX IF NOT EXISTS idx_games_order ON public.games(display_order);

ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "games_public_read" ON public.games;
CREATE POLICY "games_public_read" ON public.games FOR SELECT
  TO anon, authenticated USING (status IN ('available','coming_soon'));

DROP POLICY IF EXISTS "games_admin_write" ON public.games;
CREATE POLICY "games_admin_write" ON public.games FOR ALL
  TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ===== treasure_claims =====
CREATE TABLE IF NOT EXISTS public.treasure_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  book_id uuid REFERENCES public.books(id) ON DELETE CASCADE,
  claim_code text UNIQUE,
  reward_choice text,
  claimed_at timestamptz DEFAULT now()
);

ALTER TABLE public.treasure_claims ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "claims_owner_read" ON public.treasure_claims;
CREATE POLICY "claims_owner_read" ON public.treasure_claims FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "claims_owner_insert" ON public.treasure_claims;
CREATE POLICY "claims_owner_insert" ON public.treasure_claims FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "claims_admin_read" ON public.treasure_claims;
CREATE POLICY "claims_admin_read" ON public.treasure_claims FOR SELECT
  TO authenticated USING (public.is_admin());
