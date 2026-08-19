import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Check .env for VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export type Role = 'student' | 'teacher' | 'admin';

export type Profile = {
  id: string;
  role: Role;
  display_name: string | null;
  email: string | null;
  access_starts_at: string | null;
  access_ends_at: string | null;
};

export type Series = {
  id: string;
  title: string;
  cefr_level: 'Pre-A1' | 'A1' | 'A2' | 'B1' | 'B2' | 'C1';
  age_range: string | null;
  description: string | null;
  cover_url: string | null;
  display_order: number;
  is_active: boolean;
};

export type Book = {
  id: string;
  series_id: string | null;
  title: string;
  subtitle: string | null;
  book_number: number | null;
  cefr_level: 'Pre-A1' | 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | null;
  age_range: string | null;
  description: string | null;
  cover_url: string | null;
  pdf_url: string | null;
  page_count: number | null;
  aspect_ratio: string | null;
  audio_url: string | null;
  is_published: boolean;
  display_order: number;
  tags: string[] | null;
  treasure_page: number | null;
  treasure_active: boolean;
};

export type CinemaVideo = {
  id: string;
  title: string;
  youtube_url: string | null;
  youtube_id: string | null;
  thumbnail_url: string | null;
  description: string | null;
  category: string | null;
  age_range: string | null;
  cefr_level: string | null;
  tags: string[] | null;
  display_order: number;
  is_published: boolean;
  date_added: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export type Game = {
  id: string;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  url: string | null;
  embed_mode: 'embedded' | 'external';
  age_range: string | null;
  cefr_level: string | null;
  subject: string | null;
  status: 'available' | 'coming_soon' | 'hidden';
  display_order: number;
  created_at: string | null;
  updated_at: string | null;
};

export type SiteSection = {
  id: string;
  slug: string;
  label: string;
  status: 'active' | 'under_construction' | 'hidden';
  display_order: number;
  description: string | null;
};

export type SiteAsset = {
  id: string;
  slot: string;
  label: string;
  url: string;
  alt_text: string | null;
};

export type SiteSetting = {
  key: string;
  value: string;
  description: string | null;
};

export type ReadingProgress = {
  id: string;
  user_id: string;
  book_id: string;
  last_page: number;
  percent_complete: number;
  is_completed: boolean;
  started_at: string | null;
  completed_at: string | null;
  updated_at: string | null;
};

export type Bookmark = {
  id: string;
  user_id: string;
  book_id: string;
  created_at: string | null;
};

export type BookReaction = {
  id: string;
  user_id: string;
  book_id: string;
  reaction: string;
  created_at: string | null;
};

export type TreasureClaim = {
  id: string;
  user_id: string | null;
  book_id: string | null;
  claim_code: string | null;
  reward_choice: string | null;
  claimed_at: string | null;
};

export type ProfileRow = Profile & {
  created_at?: string;
  updated_at?: string;
};
