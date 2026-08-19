import { useState, useEffect, useRef, useCallback } from 'react';
import {
  ArrowRight,
  BookOpen,
  Bookmark,
  BookmarkCheck,
  Heart,
  Minimize2,
  Maximize2,
  Pause,
  Play,
  Sparkles,
  Volume2,
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
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showTreasure, setShowTreasure] = useState(false);
  const [showAudio, setShowAudio] = useState(false);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
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

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen?.();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.();
      setIsFullscreen(false);
    }
  }, []);

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  const isTreasurePage = book.treasure_active && book.treasure_page === pageNum;
  const percentRead = Math.round((pageNum / totalPages) * 100);

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

  const handlePageChange = useCallback((page: number, total: number) => {
    setPageNum(page);
    if (total) {
      // total comes from the actual PDF
    }
  }, []);

  return (
    <div
      ref={containerRef}
      className={`mt-8 overflow-hidden rounded-[2rem] border border-[#d8c7a8] bg-[#fffaf1] shadow-lg transition-all ${
        isFullscreen ? 'fixed inset-0 z-50 mt-0 rounded-none border-0' : 'p-4 sm:p-6'
      }`}
    >
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button onClick={onClose} className="flex items-center gap-2 font-bold text-[#a2673e] transition hover:text-[#8a5438]">
          <ArrowRight size={17} className="rotate-180" /> Back to shelf
        </button>
        <div className="flex items-center gap-2">
          {book.audio_url && (
            <button
              onClick={() => setShowAudio(!showAudio)}
              className="flex items-center gap-1.5 rounded-full border border-[#c6b18c] px-3 py-2 text-xs font-bold text-[#53685b] transition hover:bg-[#eadfc9]"
            >
              <Volume2 size={15} /> Audio
            </button>
          )}
          {user && (
            <button
              onClick={toggleBookmark}
              className="flex items-center gap-1.5 rounded-full border border-[#c6b18c] px-3 py-2 text-xs font-bold text-[#53685b] transition hover:bg-[#eadfc9]"
            >
              {isBookmarked ? <BookmarkCheck size={15} className="text-[#315b4a]" /> : <Bookmark size={15} />}
              {isBookmarked ? 'Saved' : 'Save'}
            </button>
          )}
          {user && (
            <button
              onClick={toggleLike}
              className="flex items-center gap-1.5 rounded-full border border-[#c6b18c] px-3 py-2 text-xs font-bold text-[#53685b] transition hover:bg-[#eadfc9]"
            >
              <Heart size={15} className={liked ? 'fill-red-500 text-red-500' : ''} />
              {likeCount > 0 ? likeCount : 'Like'}
            </button>
          )}
          <button
            onClick={toggleFullscreen}
            className="flex items-center gap-1.5 rounded-full border border-[#c6b18c] px-3 py-2 text-xs font-bold text-[#53685b] transition hover:bg-[#eadfc9]"
          >
            {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
          </button>
        </div>
      </div>

      {/* Title bar */}
      <div className="mt-4 flex items-center justify-between">
        <div>
          <h2 className="font-serif text-2xl font-bold text-[#294236]">{book.title}</h2>
          {book.subtitle && <p className="mt-0.5 text-sm text-[#53685b]">{book.subtitle}</p>}
        </div>
        <span className="text-sm font-bold text-[#53685b]">
          Page {pageNum} <span className="text-[#a2673e]">/</span> {totalPages}
        </span>
      </div>

      {/* Audio player */}
      {showAudio && book.audio_url && (
        <div className="mt-4 flex items-center gap-3 rounded-2xl border border-[#d8c7a8] bg-[#f6e7bf]/40 p-3">
          <button
            onClick={toggleAudio}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-[#315b4a] text-white transition hover:bg-[#294236]"
          >
            {audioPlaying ? <Pause size={18} /> : <Play size={18} fill="white" />}
          </button>
          <span className="text-sm font-semibold text-[#53685b]">Listen along as you read</span>
          <audio
            ref={audioRef}
            src={book.audio_url}
            onEnded={() => setAudioPlaying(false)}
            className="hidden"
          />
        </div>
      )}

      {/* Flipbook reader */}
      <div className="mt-4 overflow-hidden rounded-2xl bg-[#e8dfcb]" style={{ height: isFullscreen ? 'calc(100vh - 160px)' : '70vh' }}>
        {book.pdf_url ? (
          <FlipbookReader
            pdfUrl={book.pdf_url}
            title={book.title}
            subtitle={book.subtitle ?? undefined}
            startPage={progress?.last_page ? Math.max(0, progress.last_page - 1) : 0}
            onPageChange={handlePageChange}
            onClose={onClose}
          />
        ) : (
          <div className="flex h-full min-h-[60vh] flex-col items-center justify-center p-10 text-center">
            <BookOpen className="text-[#a2673e]" size={48} strokeWidth={1.4} />
            <p className="mt-5 font-serif text-2xl font-bold text-[#294236]">{book.title}</p>
            <p className="mt-2 max-w-md text-[#53685b]">
              This book's pages are being prepared. The full reader will open here once the PDF is uploaded.
            </p>
          </div>
        )}
      </div>

      {/* Treasure notification */}
      {isTreasurePage && !showTreasure && (
        <div className="mt-4 flex items-center gap-3 rounded-2xl border-2 border-[#d48b55] bg-[#f6e7bf] p-4">
          <Sparkles className="text-[#a2673e]" size={24} />
          <div className="flex-1">
            <p className="font-serif text-lg font-bold text-[#294236]">You found a treasure clue!</p>
            <p className="text-sm text-[#53685b]">Look closely at this page — there's something hidden here.</p>
          </div>
          {user ? (
            <button
              onClick={() => setShowTreasure(true)}
              className="flex items-center gap-2 rounded-full bg-[#d48b55] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#bd7443]"
            >
              <Gift size={16} /> Claim treasure
            </button>
          ) : (
            <span className="text-xs font-semibold text-[#a2673e]">Sign in to claim</span>
          )}
        </div>
      )}

      {/* Bottom controls */}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-[#53685b]">
            {percentRead}% read
          </span>
          <div className="h-2 w-32 overflow-hidden rounded-full bg-[#e8dfcb]">
            <div className="h-full rounded-full bg-[#d48b55] transition-all" style={{ width: `${percentRead}%` }} />
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold text-[#53685b]">
          <Sparkles size={14} className="text-[#a2673e]" />
          Use arrow keys, swipe, or tap page edges to navigate
        </div>
      </div>

      {/* Treasure claim modal */}
      {showTreasure && (
        <TreasureModal
          hasClaimed={hasClaimed}
          onClaim={handleClaim}
          onClose={() => setShowTreasure(false)}
        />
      )}
    </div>
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
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
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
