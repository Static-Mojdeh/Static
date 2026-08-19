import { useState, useEffect, useCallback, useRef } from 'react';
import { RotateCcw, Trophy, Sparkles, Clock, Check, TreePine } from 'lucide-react';

type Card = {
  id: number;
  emoji: string;
  word: string;
  matched: boolean;
};

const WORDS: { emoji: string; word: string }[] = [
  { emoji: '🌳', word: 'Tree' },
  { emoji: '📚', word: 'Book' },
  { emoji: '🦉', word: 'Owl' },
  { emoji: '⭐', word: 'Star' },
  { emoji: '🔑', word: 'Key' },
  { emoji: '🌙', word: 'Moon' },
  { emoji: '🦊', word: 'Fox' },
  { emoji: '🍄', word: 'Mushroom' },
];

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function createDeck(): Card[] {
  const pairs = shuffle(WORDS).slice(0, 6);
  const deck: Card[] = [];
  pairs.forEach((item, idx) => {
    deck.push({ id: idx * 2, emoji: item.emoji, word: item.word, matched: false });
    deck.push({ id: idx * 2 + 1, emoji: item.emoji, word: item.word, matched: false });
  });
  return shuffle(deck);
}

const GRID_SIZE = 12;

export default function StaticGame({ onExit }: { onExit: () => void }) {
  const [cards, setCards] = useState<Card[]>(() => createDeck());
  const [flipped, setFlipped] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [matches, setMatches] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [started, setStarted] = useState(false);
  const [won, setWon] = useState(false);
  const [busy, setBusy] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (started && !won) {
      timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
      return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }
  }, [started, won]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const handleCardClick = useCallback((cardId: number) => {
    if (busy || won) return;
    if (flipped.includes(cardId)) return;
    const card = cards.find((c) => c.id === cardId);
    if (card?.matched) return;

    if (!started) setStarted(true);

    const newFlipped = [...flipped, cardId];
    setFlipped(newFlipped);

    if (newFlipped.length === 2) {
      setBusy(true);
      setMoves((m) => m + 1);
      const [first, second] = newFlipped.map((id) => cards.find((c) => c.id === id)!);

      if (first.word === second.word) {
        setTimeout(() => {
          setCards((prev) => prev.map((c) =>
            c.id === first.id || c.id === second.id ? { ...c, matched: true } : c
          ));
          setMatches((m) => {
            const next = m + 1;
            if (next === GRID_SIZE / 2) setWon(true);
            return next;
          });
          setFlipped([]);
          setBusy(false);
        }, 600);
      } else {
        setTimeout(() => {
          setFlipped([]);
          setBusy(false);
        }, 1000);
      }
    }
  }, [busy, won, flipped, cards, started]);

  const restart = () => {
    setCards(createDeck());
    setFlipped([]);
    setMoves(0);
    setMatches(0);
    setSeconds(0);
    setStarted(false);
    setWon(false);
    setBusy(false);
  };

  const stars = moves <= 8 ? 3 : moves <= 12 ? 2 : 1;

  return (
    <div className="mx-auto max-w-3xl px-5 py-8 lg:px-8">
      <div className="flex items-center justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-[#f6e7bf] px-4 py-2 text-sm font-bold text-[#8a5438]">
            <Sparkles size={16} /> The Static
          </div>
          <h1 className="mt-3 font-serif text-3xl font-bold text-[#294236]">Memory Match</h1>
        </div>
        <button onClick={onExit} className="flex items-center gap-2 font-bold text-[#a2673e] transition hover:text-[#8a5438]">
          Back to games
        </button>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-4 rounded-2xl border border-[#d8c7a8] bg-[#fffaf1] p-4">
        <div className="flex items-center gap-2">
          <Clock size={18} className="text-[#a2673e]" />
          <span className="font-bold text-[#294236]">{formatTime(seconds)}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold uppercase tracking-wide text-[#53685b]">Moves</span>
          <span className="font-bold text-[#294236]">{moves}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold uppercase tracking-wide text-[#53685b]">Matches</span>
          <span className="font-bold text-[#294236]">{matches} / {GRID_SIZE / 2}</span>
        </div>
        <button onClick={restart} className="ml-auto flex items-center gap-1.5 rounded-full bg-[#315b4a] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#294236]">
          <RotateCcw size={15} /> Restart
        </button>
      </div>

      {won && (
        <div className="mt-6 rounded-2xl border-2 border-[#d48b55] bg-[#f6e7bf] p-6 text-center">
          <Trophy className="mx-auto text-[#a2673e]" size={40} />
          <h2 className="mt-3 font-serif text-2xl font-bold text-[#294236]">You won!</h2>
          <p className="mt-1 text-[#53685b]">
            Completed in {formatTime(seconds)} with {moves} moves
          </p>
          <div className="mt-3 flex justify-center gap-1 text-3xl">
            {Array.from({ length: 3 }).map((_, i) => (
              <span key={i} className={i < stars ? '' : 'opacity-20'}>⭐</span>
            ))}
          </div>
          <button onClick={restart} className="mt-4 rounded-full bg-[#d48b55] px-6 py-3 font-bold text-white shadow-[0_4px_0_#a2673e] transition hover:-translate-y-0.5">
            Play again
          </button>
        </div>
      )}

      <div className="mt-6 grid grid-cols-3 gap-3 sm:grid-cols-4 sm:gap-4">
        {cards.map((card) => {
          const isFlipped = flipped.includes(card.id) || card.matched;
          return (
            <button
              key={card.id}
              onClick={() => handleCardClick(card.id)}
              disabled={busy || card.matched}
              className="group relative aspect-[3/4] transition-transform"
              style={{ perspective: '600px' }}
            >
              <div
                className="relative h-full w-full transition-transform duration-500"
                style={{
                  transformStyle: 'preserve-3d',
                  transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
                }}
              >
                <div
                  className="absolute inset-0 flex items-center justify-center rounded-2xl border-2 border-[#d6b879] bg-[#315b4a] shadow-md transition group-hover:border-[#d48b55]"
                  style={{ backfaceVisibility: 'hidden' }}
                >
                  <TreePine size={32} className="text-[#f6d788]" strokeWidth={1.5} />
                </div>
                <div
                  className={`absolute inset-0 flex flex-col items-center justify-center rounded-2xl border-2 shadow-md ${
                    card.matched
                      ? 'border-[#315b4a] bg-[#dbe6d4]'
                      : 'border-[#d6b879] bg-[#fffaf1]'
                  }`}
                  style={{
                    backfaceVisibility: 'hidden',
                    transform: 'rotateY(180deg)',
                  }}
                >
                  <span className="text-4xl sm:text-5xl">{card.emoji}</span>
                  <span className="mt-1 text-xs font-bold text-[#294236] sm:text-sm">{card.word}</span>
                  {card.matched && (
                    <span className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-[#315b4a]">
                      <Check size={12} className="text-white" />
                    </span>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <p className="mt-6 text-center text-sm text-[#53685b]">
        Flip the cards to find matching pairs. Match all {GRID_SIZE / 2} pairs to win!
      </p>
    </div>
  );
}
