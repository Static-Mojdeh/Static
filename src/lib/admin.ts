import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type {
  Series,
  Book,
  CinemaVideo,
  Game,
  SiteSection,
  SiteAsset,
  SiteSetting,
  ProfileRow,
  ReadingProgress,
  Bookmark,
  TreasureClaim,
} from '@/lib/supabase';

const BUCKET = 'school-uploads';

export async function uploadFile(file: File, path: string): Promise<string | null> {
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: '3600',
    upsert: true,
  });
  if (error) {
    console.error('Upload error:', error.message);
    return null;
  }
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

export function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  if (/^[a-zA-Z0-9_-]{11}$/.test(url.trim())) return url.trim();
  return null;
}

// ===== Admin data hooks =====

export function useAdminSeries() {
  const [series, setSeries] = useState<Series[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('series')
        .select('*')
        .order('display_order', { ascending: true });
      if (!error && data) setSeries(data as Series[]);
      setLoading(false);
    })();
  }, [refreshKey]);

  const refresh = () => setRefreshKey((k) => k + 1);
  return { series, loading, refresh };
}

export function useAdminBooks(seriesId?: string) {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    (async () => {
      setLoading(true);
      let query = supabase.from('books').select('*').order('display_order', { ascending: true });
      if (seriesId) query = query.eq('series_id', seriesId);
      const { data, error } = await query;
      if (!error && data) setBooks(data as Book[]);
      setLoading(false);
    })();
  }, [seriesId, refreshKey]);

  const refresh = () => setRefreshKey((k) => k + 1);
  return { books, loading, refresh };
}

export function useAdminVideos(page = 1, perPage = 20) {
  const [videos, setVideos] = useState<CinemaVideo[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const from = (page - 1) * perPage;
      const to = from + perPage - 1;
      const { data, error, count } = await supabase
        .from('cinema_videos')
        .select('*', { count: 'exact' })
        .order('display_order', { ascending: true })
        .range(from, to);
      if (!error && data) {
        setVideos(data as CinemaVideo[]);
        setTotal(count ?? 0);
      }
      setLoading(false);
    })();
  }, [page, perPage, refreshKey]);

  const refresh = () => setRefreshKey((k) => k + 1);
  return { videos, total, loading, refresh };
}

export function useAdminGames() {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('games')
        .select('*')
        .order('display_order', { ascending: true });
      if (!error && data) setGames(data as Game[]);
      setLoading(false);
    })();
  }, [refreshKey]);

  const refresh = () => setRefreshKey((k) => k + 1);
  return { games, loading, refresh };
}

export function useAdminSections() {
  const [sections, setSections] = useState<SiteSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('site_sections')
        .select('*')
        .order('display_order', { ascending: true });
      if (!error && data) setSections(data as SiteSection[]);
      setLoading(false);
    })();
  }, [refreshKey]);

  const refresh = () => setRefreshKey((k) => k + 1);
  return { sections, loading, refresh };
}

export function useAdminAssets() {
  const [assets, setAssets] = useState<SiteAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data, error } = await supabase.from('site_assets').select('*').order('label', { ascending: true });
      if (!error && data) setAssets(data as SiteAsset[]);
      setLoading(false);
    })();
  }, [refreshKey]);

  const refresh = () => setRefreshKey((k) => k + 1);
  return { assets, loading, refresh };
}

export function useAdminSettings() {
  const [settings, setSettings] = useState<SiteSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data, error } = await supabase.from('site_settings').select('*').order('key', { ascending: true });
      if (!error && data) setSettings(data as SiteSetting[]);
      setLoading(false);
    })();
  }, [refreshKey]);

  const refresh = () => setRefreshKey((k) => k + 1);
  return { settings, loading, refresh };
}

export function useAdminProfiles() {
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('id, role, display_name, email, access_starts_at, access_ends_at, created_at, updated_at')
        .order('created_at', { ascending: false });
      if (!error && data) setProfiles(data as ProfileRow[]);
      setLoading(false);
    })();
  }, [refreshKey]);

  const refresh = () => setRefreshKey((k) => k + 1);
  return { profiles, loading, refresh };
}

export function useAdminStats() {
  const [stats, setStats] = useState({
    users: 0,
    series: 0,
    books: 0,
    publishedBooks: 0,
    videos: 0,
    publishedVideos: 0,
    games: 0,
    availableGames: 0,
    activeSections: 0,
    progressRows: 0,
    completedBooks: 0,
    bookmarks: 0,
    treasureClaims: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [users, series, books, videos, games, sections, progress, bookmarks, claims] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('series').select('id', { count: 'exact', head: true }),
        supabase.from('books').select('id, is_published', { count: 'exact' }),
        supabase.from('cinema_videos').select('id, is_published', { count: 'exact' }),
        supabase.from('games').select('id, status', { count: 'exact' }),
        supabase.from('site_sections').select('id, status', { count: 'exact' }),
        supabase.from('reading_progress').select('id, is_completed', { count: 'exact' }),
        supabase.from('bookmarks').select('id', { count: 'exact', head: true }),
        supabase.from('treasure_claims').select('id', { count: 'exact', head: true }),
      ]);

      setStats({
        users: users.count ?? 0,
        series: series.count ?? 0,
        books: books.data?.length ?? 0,
        publishedBooks: books.data?.filter((b: { is_published: boolean }) => b.is_published).length ?? 0,
        videos: videos.data?.length ?? 0,
        publishedVideos: videos.data?.filter((v: { is_published: boolean }) => v.is_published).length ?? 0,
        games: games.data?.length ?? 0,
        availableGames: games.data?.filter((g: { status: string }) => g.status === 'available').length ?? 0,
        activeSections: sections.data?.filter((s: { status: string }) => s.status === 'active').length ?? 0,
        progressRows: progress.data?.length ?? 0,
        completedBooks: progress.data?.filter((p: { is_completed: boolean }) => p.is_completed).length ?? 0,
        bookmarks: bookmarks.count ?? 0,
        treasureClaims: claims.count ?? 0,
      });
      setLoading(false);
    })();
  }, [refreshKey]);

  const refresh = () => setRefreshKey((k) => k + 1);
  return { stats, loading, refresh };
}
