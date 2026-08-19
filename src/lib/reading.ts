import { useEffect, useState, useCallback } from 'react';
import { supabase, type ReadingProgress, type Bookmark } from '@/lib/supabase';

// ===== Reading Progress =====

export function useReadingProgress(bookId: string | null, userId: string | null) {
  const [progress, setProgress] = useState<ReadingProgress | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!bookId || !userId) {
      setProgress(null);
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    (async () => {
      const { data } = await supabase
        .from('reading_progress')
        .select('*')
        .eq('user_id', userId)
        .eq('book_id', bookId)
        .maybeSingle();
      if (active) {
        setProgress(data as ReadingProgress | null);
        setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [bookId, userId]);

  const saveProgress = useCallback(async (page: number, totalPages: number) => {
    if (!bookId || !userId) return;
    const percent = totalPages > 0 ? Math.min(100, Math.round((page / totalPages) * 100)) : 0;
    const completed = page >= totalPages;
    const payload = {
      user_id: userId,
      book_id: bookId,
      last_page: page,
      percent_complete: percent,
      is_completed: completed,
      completed_at: completed ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    };
    const { data } = await supabase
      .from('reading_progress')
      .upsert(payload, { onConflict: 'user_id,book_id' })
      .select()
      .maybeSingle();
    if (data) setProgress(data as ReadingProgress);
  }, [bookId, userId]);

  return { progress, loading, saveProgress };
}

// ===== Bookmarks =====

export function useBookmark(bookId: string | null, userId: string | null) {
  const [isBookmarked, setIsBookmarked] = useState(false);

  useEffect(() => {
    if (!bookId || !userId) {
      setIsBookmarked(false);
      return;
    }
    let active = true;
    (async () => {
      const { data } = await supabase
        .from('bookmarks')
        .select('id')
        .eq('user_id', userId)
        .eq('book_id', bookId)
        .maybeSingle();
      if (active) setIsBookmarked(!!data);
    })();
    return () => { active = false; };
  }, [bookId, userId]);

  const toggleBookmark = useCallback(async () => {
    if (!bookId || !userId) return;
    if (isBookmarked) {
      await supabase.from('bookmarks').delete().eq('user_id', userId).eq('book_id', bookId);
      setIsBookmarked(false);
    } else {
      await supabase.from('bookmarks').insert({ user_id: userId, book_id: bookId });
      setIsBookmarked(true);
    }
  }, [bookId, userId, isBookmarked]);

  return { isBookmarked, toggleBookmark };
}

export function useUserBookmarks(userId: string | null) {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setBookmarks([]);
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    (async () => {
      const { data } = await supabase
        .from('bookmarks')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      if (active) {
        setBookmarks((data as Bookmark[]) || []);
        setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [userId]);

  return { bookmarks, loading };
}

// ===== Book Reactions (Likes) =====

export function useBookLike(bookId: string | null, userId: string | null) {
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);

  useEffect(() => {
    if (!bookId) {
      setLiked(false);
      setLikeCount(0);
      return;
    }
    let active = true;
    (async () => {
      const { count } = await supabase
        .from('book_reactions')
        .select('id', { count: 'exact', head: true })
        .eq('book_id', bookId);
      if (active) setLikeCount(count ?? 0);
      if (userId && active) {
        const { data } = await supabase
          .from('book_reactions')
          .select('id')
          .eq('user_id', userId)
          .eq('book_id', bookId)
          .maybeSingle();
        if (active) setLiked(!!data);
      }
    })();
    return () => { active = false; };
  }, [bookId, userId]);

  const toggleLike = useCallback(async () => {
    if (!bookId || !userId) return;
    if (liked) {
      await supabase.from('book_reactions').delete().eq('user_id', userId).eq('book_id', bookId);
      setLiked(false);
      setLikeCount((c) => Math.max(0, c - 1));
    } else {
      await supabase.from('book_reactions').insert({ user_id: userId, book_id: bookId, reaction: 'like' });
      setLiked(true);
      setLikeCount((c) => c + 1);
    }
  }, [bookId, userId, liked]);

  return { liked, likeCount, toggleLike };
}

// ===== Treasure Claims =====

export function useTreasureClaim(bookId: string | null, userId: string | null) {
  const [hasClaimed, setHasClaimed] = useState(false);

  useEffect(() => {
    if (!bookId || !userId) {
      setHasClaimed(false);
      return;
    }
    let active = true;
    (async () => {
      const { data } = await supabase
        .from('treasure_claims')
        .select('id')
        .eq('user_id', userId)
        .eq('book_id', bookId)
        .maybeSingle();
      if (active) setHasClaimed(!!data);
    })();
    return () => { active = false; };
  }, [bookId, userId]);

  const submitClaim = useCallback(async (rewardChoice: string) => {
    if (!bookId || !userId) return { error: 'Sign in required' as string | null, code: null as string | null };
    const code = `TREASURE-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const { error } = await supabase
      .from('treasure_claims')
      .insert({
        user_id: userId,
        book_id: bookId,
        claim_code: code,
        reward_choice: rewardChoice,
      });
    if (!error) {
      setHasClaimed(true);
      return { error: null as string | null, code };
    }
    return { error: error.message, code: null as string | null };
  }, [bookId, userId]);

  return { hasClaimed, submitClaim };
}

// ===== Access Control =====

export type AccessState = {
  allowed: boolean;
  reason: string | null;
  isGuest: boolean;
  daysRemaining: number | null;
};

export function useAccessControl(
  user: { id: string } | null,
  profile: { role: string; access_starts_at: string | null; access_ends_at: string | null } | null,
) {
  const [access, setAccess] = useState<AccessState>({ allowed: true, reason: null, isGuest: true, daysRemaining: null });

  useEffect(() => {
    if (!user || !profile) {
      setAccess({ allowed: true, reason: null, isGuest: true, daysRemaining: null });
      return;
    }

    const now = new Date();
    const startsAt = profile.access_starts_at ? new Date(profile.access_starts_at) : null;
    const endsAt = profile.access_ends_at ? new Date(profile.access_ends_at) : null;

    if (startsAt && now < startsAt) {
      setAccess({ allowed: false, reason: 'Your access has not started yet.', isGuest: false, daysRemaining: null });
      return;
    }

    if (endsAt) {
      const diffMs = endsAt.getTime() - now.getTime();
      const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      if (daysLeft < 0) {
        setAccess({ allowed: false, reason: 'Your access period has ended.', isGuest: false, daysRemaining: 0 });
        return;
      }
      setAccess({ allowed: true, reason: null, isGuest: false, daysRemaining: daysLeft });
      return;
    }

    setAccess({ allowed: true, reason: null, isGuest: false, daysRemaining: null });
  }, [user, profile]);

  return access;
}
