import { useState, useEffect, useRef, useCallback } from 'react';
import {
  BookOpen,
  Bookmark,
  BookmarkCheck,
  Heart,
  Pause,
  Play,
  Sparkles,
  Volume2,
  VolumeX,
  Gift,
  X,
  Check,
} from 'lucide-react';
import type { Book } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { useReadingProgress, useBookmark, useBookLike, useTreasureClaim } from '@/lib/reading';
import FlipbookReader from '@/components/FlipbookReader';

const REWARDS = [
  { id: 'scholarship', label: '1-Year Free Scholarship', icon: '🎓' },
  { id: 'luna_park', label: 'Luna Park Tickets', icon: '🎡' },
];

export default function BookReader({ book, onClose }: { book: Book; onClose: () => void }) {
  const { user } = useAuth();
  const totalPages = book.page_count || 1;
  const [pageNum, setPageNum] = useState(1);
  const [showTreasure, setShowTreasure] = useState(false);
  const [showAudio, setShowAudio] = useState(false);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { progress, saveProgress } = useReadingProgress(book.id, user?.id ?? null);
  const { isBookmarked, toggleBookmark } = useBookmark(book.id, user?.id ?? null);
  const { liked, likeCount, toggleLike } = useBookLike(book.id, user?.id ?? null);
  const { hasClaimed, submitClaim } = useTreasureClaim(book.id, user?.id ?? null);

  // Restore last page from saved progress
  useEffect(() => {
    if (progress?.last_page && progress.last_page > 1) {
      setPageNum(progress.last_page);
    }
  }, [progress?.last_page]);

  // Debounced progress save when page changes
  useEffect(() => {
    if (!user) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      saveProgress(pageNum, totalPages);
    }, 1500);
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [pageNum, user, saveProgress, totalPages]);

  // Save progress on unmount
  useEffect(() => {
    return () => {
      if (user && pageNum > 1) {
        saveProgress(pageNum, totalPages);
      }
    };
  }, []);

  const isTreasurePage = book.treasure_active && book.treasure_page === pageNum;

  const toggleAudio = () => {
    if (!audioRef.current) return;
    if (audioPlaying) {
      audioRef.current.pause();
      setAudioPlaying(false);
    } else {
      audioRef.current.play();
      setAudioPlaying(true);
    }
  };

  const handleClaim = async (rewardId: string) => {
    const result = await submitClaim(rewardId);
    if (!result.error) {
      setShowTreasure(false);
    }
    return result;
  };

  const handlePageChange = useCallback((page: number) => {
    setPageNum(page);
  }, []);

  if (!book.pdf_url) {
    return (
      <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#1a2820] p-10 text-center">
        <BookOpen className="text-[#d48b55]" size={48} strokeWidth={1.4} />
        <p className="mt-5 font-serif text-2xl font-bold text-[#fffaf1]">{book.title}</p>
        <p className="mt-2 max-w-md text-[#c8d4c7]">
          This book's pages are being prepared. The full reader will open here once the PDF is uploaded.
        </p>
        <button
          onClick={onClose}
          className="mt-6 rounded-full bg-[#d48b55] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#bd7443]"
        >
          Back to library
        </button>
      </div>
    );
  }

  return (
    <>
      <FlipbookReader
        pdfUrl={book.pdf_url}
        title={book.title}
        subtitle={book.subtitle ?? undefined}
        startPage={progress?.last_page ? Math.max(0, progress.last_page - 1) : 0}
        onPageChange={handlePageChange}
        onClose={onClose}
      />

      {/* Floating side panel for book features (bookmark, like, audio, treasure) */}
      <div className="fixed right-3 top-16 z-[110] flex flex-col gap-2 sm:right-4">
        {book.audio_url && (
          <button
            onClick={() => setShowAudio(!showAudio)}
            className={`flex h-10 w-10 items-center justify-center rounded-full shadow-lg transition ${
              showAudio ? 'bg-[#315b4a] text-white' : 'bg-[#fffaf1] text-[#53685b] hover:bg-[#eadfc9]'
            }`}
            aria-label="Toggle audio"
            title="Audio"
          >
            {showAudio ? <Volume2 size={18} /> : <VolumeX size={18} />}
          </button>
        )}
        {user && (
          <button
            onClick={toggleBookmark}
            className={`flex h-10 w-10 items-center justify-center rounded-full shadow-lg transition ${
              isBookmarked ? 'bg-[#315b4a] text-white' : 'bg-[#fffaf1] text-[#53685b] hover:bg-[#eadfc9]'
            }`}
            aria-label="Toggle bookmark"
            title={isBookmarked ? 'Bookmarked' : 'Bookmark'}
          >
            {isBookmarked ? <BookmarkCheck size={18} /> : <Bookmark size={18} />}
          </button>
        )}
        {user && (
          <button
            onClick={toggleLike}
            className={`flex h-10 w-10 items-center justify-center rounded-full shadow-lg transition ${
              liked ? 'bg-red-500 text-white' : 'bg-[#fffaf1] text-[#53685b] hover:bg-[#eadfc9]'
            }`}
            aria-label="Toggle like"
            title="Like"
          >
            <Heart size={18} className={liked ? 'fill-white' : ''} />
          </button>
        )}
      </div>

      {/* Audio player bar */}
      {showAudio && book.audio_url && (
        <div className="fixed bottom-3 left-1/2 z-[110] flex -translate-x-1/2 items-center gap-3 rounded-2xl border border-[#d8c7a8] bg-[#fffaf1] p-3 shadow-xl">
          <button
            onClick={toggleAudio}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-[#315b4a] text-white transition hover:bg-[#294236]"
          >
            {audioPlaying ? <Pause size={18} /> : <Play size={18} fill="white" />}
          </button>
          <span className="text-sm font-semibold text-[#53685b]">Listen along as you read</span>
          <audio ref={audioRef} src={book.audio_url} onEnded={() => setAudioPlaying(false)} className="hidden" />
        </div>
      )}

      {/* Treasure notification */}
      {isTreasurePage && !showTreasure && (
        <div className="fixed bottom-3 left-1/2 z-[110] flex max-w-md -translate-x-1/2 items-center gap-3 rounded-2xl border-2 border-[#d48b55] bg-[#f6e7bf] p-4 shadow-xl">
          <Sparkles className="shrink-0 text-[#a2673e]" size={24} />
          <div className="flex-1">
            <p className="font-serif text-base font-bold text-[#294236]">You found a treasure clue!</p>
            <p className="text-xs text-[#53685b]">Look closely at this page.</p>
          </div>
          {user ? (
            <button
              onClick={() => setShowTreasure(true)}
              className="flex shrink-0 items-center gap-1.5 rounded-full bg-[#d48b55] px-3 py-2 text-xs font-bold text-white transition hover:bg-[#bd7443]"
            >
              <Gift size={14} /> Claim
            </button>
          ) : (
            <span className="shrink-0 text-xs font-semibold text-[#a2673e]">Sign in to claim</span>
          )}
        </div>
      )}

      {/* Treasure claim modal */}
      {showTreasure && (
        <TreasureModal
          hasClaimed={hasClaimed}
          onClaim={handleClaim}
          onClose={() => setShowTreasure(false)}
        />
      )}
    </>
  );
}

function TreasureModal({
  hasClaimed,
  onClaim,
  onClose,
}: {
  hasClaimed: boolean;
  onClaim: (rewardId: string) => Promise<{ error: string | null; code: string | null }>;
  onClose: () => void;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const [claimed, setClaimed] = useState(hasClaimed);
  const [claimCode, setClaimCode] = useState<string | null>(null);

  const handleClaim = async () => {
    if (!selected) return;
    const result = await onClaim(selected);
    if (!result?.error && result?.code) {
      setClaimCode(result.code);
      setClaimed(true);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-3xl bg-[#fffaf1] p-8 shadow-2xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Gift className="text-[#a2673e]" size={24} />
            <h3 className="font-serif text-xl font-bold text-[#294236]">Treasure Found!</h3>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-[#53685b] transition hover:bg-[#eadfc9]">
            <X size={20} />
          </button>
        </div>

        {claimed ? (
          <div className="mt-6 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#315b4a]">
              <Check className="text-white" size={32} />
            </div>
            <p className="mt-4 font-serif text-lg font-bold text-[#294236]">Treasure claimed!</p>
            {claimCode && (
              <div className="mt-4 rounded-xl border border-[#d8c7a8] bg-[#f6e7bf] p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-[#a2673e]">Your claim code</p>
                <p className="mt-1 font-mono text-lg font-bold text-[#294236]">{claimCode}</p>
                <p className="mt-2 text-xs text-[#53685b]">Save this code — you'll need it to collect your reward.</p>
              </div>
            )}
          </div>
        ) : (
          <div className="mt-6">
            <p className="text-sm text-[#53685b]">You found the hidden treasure! Choose your reward:</p>
            <div className="mt-4 space-y-3">
              {REWARDS.map((reward) => (
                <button
                  key={reward.id}
                  onClick={() => setSelected(reward.id)}
                  className={`flex w-full items-center gap-3 rounded-2xl border-2 p-4 text-left transition ${
                    selected === reward.id
                      ? 'border-[#d48b55] bg-[#f6e7bf]'
                      : 'border-[#d8c7a8] bg-white hover:border-[#c6b18c]'
                  }`}
                >
                  <span className="text-3xl">{reward.icon}</span>
                  <span className="font-serif text-base font-bold text-[#294236]">{reward.label}</span>
                  {selected === reward.id && <Check size={20} className="ml-auto text-[#d48b55]" />}
                </button>
              ))}
            </div>
            <button
              onClick={handleClaim}
              disabled={!selected}
              className="mt-5 w-full rounded-full bg-[#d48b55] px-6 py-3 font-bold text-white shadow-[0_4px_0_#a2673e] transition hover:-translate-y-0.5 disabled:opacity-50"
            >
              Claim my reward
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
