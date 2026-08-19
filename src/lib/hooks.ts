import { useEffect, useState } from 'react';
import { supabase, type Series, type Book, type CinemaVideo, type Game, type SiteSection, type SiteAsset } from '@/lib/supabase';

export function useSiteSections() {
  const [sections, setSections] = useState<SiteSection[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from('site_sections')
        .select('*')
        .order('display_order', { ascending: true });
      if (!error && data) setSections(data as SiteSection[]);
      setLoading(false);
    })();
  }, []);

  return { sections, loading };
}

export function useSiteAssets() {
  const [assets, setAssets] = useState<Record<string, SiteAsset>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.from('site_assets').select('*');
      if (!error && data) {
        const map: Record<string, SiteAsset> = {};
        for (const asset of data as SiteAsset[]) map[asset.slot] = asset;
        setAssets(map);
      }
      setLoading(false);
    })();
  }, []);

  return { assets, loading };
}

export function useSeries(level?: string) {
  const [series, setSeries] = useState<Series[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      let query = supabase.from('series').select('*').order('display_order', { ascending: true });
      if (level) query = query.eq('cefr_level', level);
      const { data, error } = await query;
      if (!error && data) setSeries(data as Series[]);
      setLoading(false);
    })();
  }, [level]);

  return { series, loading };
}

export function useBooks(seriesId?: string) {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      let query = supabase
        .from('books')
        .select('*')
        .eq('is_published', true)
        .order('display_order', { ascending: true });
      if (seriesId) query = query.eq('series_id', seriesId);
      const { data, error } = await query;
      if (!error && data) setBooks(data as Book[]);
      setLoading(false);
    })();
  }, [seriesId]);

  return { books, loading };
}

export function useCinemaVideos(page = 1, perPage = 12, category?: string) {
  const [videos, setVideos] = useState<CinemaVideo[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const from = (page - 1) * perPage;
      const to = from + perPage - 1;
      let query = supabase
        .from('cinema_videos')
        .select('*', { count: 'exact' })
        .eq('is_published', true)
        .order('display_order', { ascending: true })
        .range(from, to);
      if (category) query = query.eq('category', category);
      const { data, error, count } = await query;
      if (!error && data) {
        setVideos(data as CinemaVideo[]);
        setTotal(count ?? 0);
      }
      setLoading(false);
    })();
  }, [page, perPage, category]);

  return { videos, total, loading };
}

export function useGames() {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from('games')
        .select('*')
        .order('display_order', { ascending: true });
      if (!error && data) setGames(data as Game[]);
      setLoading(false);
    })();
  }, []);

  return { games, loading };
}
