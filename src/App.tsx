import { useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  ChevronDown,
  Clapperboard,
  Gamepad2,
  Gift,
  GraduationCap,
  Library,
  Lock,
  Menu,
  Play,
  ScrollText,
  Shield,
  Sparkles,
  TreePine,
  X,
} from 'lucide-react';
import { AuthProvider, useAuth } from '@/lib/auth';
import { useSiteAssets, useSeries, useBooks, useCinemaVideos, useGames } from '@/lib/hooks';
import { useAccessControl } from '@/lib/reading';
import type { Book, CinemaVideo, Game } from '@/lib/supabase';
import AdminPanel from '@/components/AdminPanel';
import BookReader from '@/components/BookReader';
import StaticGame from '@/components/StaticGame';

type Page = 'home' | 'library' | 'cinema' | 'games' | 'about' | 'terms' | 'privacy' | 'auth' | 'future' | 'admin';

const futureSections = [
  { slug: 'animations', label: 'Animations', icon: '✨' },
  { slug: 'main-course', label: 'Main Course', icon: '🎓' },
  { slug: 'the-static', label: 'The Static', icon: '🌟' },
  { slug: 'shop', label: 'Shop', icon: '🛍️' },
  { slug: 'online-teaching', label: 'Online Teaching', icon: '💻' },
  { slug: 'future-projects', label: 'Future Projects', icon: '🚀' },
  { slug: 'maths', label: 'Maths Library', icon: '🔢' },
  { slug: 'science', label: 'Science Library', icon: '🔬' },
];

const levels = [
  { label: 'Pre-A1 & A1', age: 'Ages 4–8', tone: '🌱', text: 'Simple words, short sentences, and beautifully illustrated first adventures.', cefr: 'Pre-A1' },
  { label: 'A2 & B1', age: 'Ages 9–13', tone: '🌿', text: 'Fun stories and daily adventures to grow vocabulary and confidence.', cefr: 'A2' },
  { label: 'B2 & C1', age: 'Ages 14–18', tone: '🌳', text: 'Rich plots, natural phrasing, and stories with more to discover.', cefr: 'B2' },
];

const navItems: { label: string; page: Page }[] = [
  { label: 'Home', page: 'home' },
  { label: 'Library', page: 'library' },
  { label: 'Cinema', page: 'cinema' },
  { label: 'Game Room', page: 'games' },
  { label: 'About Us', page: 'about' },
];

function Shell() {
  const [page, setPage] = useState<Page>('home');
  const [futureSlug, setFutureSlug] = useState<string>('');
  const [menuOpen, setMenuOpen] = useState(false);
  const { user, profile, signOut } = useAuth();
  const access = useAccessControl(user, profile);

  const navigate = (nextPage: Page, slug?: string) => {
    setPage(nextPage);
    if (slug) setFutureSlug(slug);
    setMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const navigateFuture = (slug: string) => navigate('future', slug);

  if (page === 'admin' && profile?.role === 'admin') {
    return <AdminPanel onExit={() => navigate('home')} />;
  }

  // Show access-expired screen for logged-in users whose access has ended
  if (!access.allowed && access.reason) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f8f1e4] px-5">
        <div className="max-w-md rounded-[2rem] border border-[#d8c7a8] bg-[#fffaf1] p-8 text-center shadow-lg">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#f6e7bf]">
            <Lock className="text-[#a2673e]" size={32} strokeWidth={1.5} />
          </div>
          <h1 className="mt-5 font-serif text-2xl font-bold text-[#294236]">Access paused</h1>
          <p className="mt-3 text-[#53685b]">{access.reason}</p>
          <p className="mt-2 text-sm text-[#53685b]">Please contact the school to extend your access.</p>
          <button onClick={signOut} className="mt-6 rounded-full border border-[#a2673e] px-5 py-2.5 text-sm font-bold text-[#8a5438] transition hover:bg-[#a2673e] hover:text-white">
            Sign out
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen overflow-hidden bg-[#f8f1e4] text-[#263b32]">
      <header className="sticky top-0 z-20 border-b border-[#d8c7a8]/70 bg-[#f8f1e4]/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 lg:px-8">
          <button className="flex items-center gap-3 text-left" onClick={() => navigate('home')} aria-label="Go to home">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#315b4a] text-[#f8e3a8] shadow-sm">
              <TreePine size={23} strokeWidth={1.8} />
            </span>
            <span>
              <span className="block font-serif text-lg font-bold leading-none text-[#294236]">The Static</span>
              <span className="mt-1 block text-[10px] font-semibold uppercase tracking-[0.22em] text-[#a2673e]">Online School</span>
            </span>
          </button>

          <nav className="hidden items-center gap-1 lg:flex" aria-label="Main navigation">
            {navItems.map((item) => (
              <button
                key={item.page}
                onClick={() => navigate(item.page)}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  page === item.page ? 'bg-[#315b4a] text-white' : 'text-[#53685b] hover:bg-[#eadfc9] hover:text-[#294236]'
                }`}
              >
                {item.label}
              </button>
            ))}
            <div className="group relative">
              <button className="ml-2 flex items-center gap-1 rounded-full px-4 py-2 text-sm font-semibold text-[#53685b] transition hover:bg-[#eadfc9] hover:text-[#294236]">
                More <ChevronDown size={15} />
              </button>
              <div className="invisible absolute right-0 top-full w-56 rounded-2xl border border-[#d8c7a8] bg-[#fffaf1] p-2 opacity-0 shadow-xl transition-all group-hover:visible group-hover:opacity-100">
                {futureSections.map((s) => (
                  <button
                    key={s.slug}
                    onClick={() => navigateFuture(s.slug)}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-[#53685b] transition hover:bg-[#eadfc9] hover:text-[#294236]"
                  >
                    <span className="text-lg">{s.icon}</span> {s.label}
                  </button>
                ))}
                <div className="my-1 h-px bg-[#e2d3b3]" />
                <button onClick={() => navigate('terms')} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-[#53685b] transition hover:bg-[#eadfc9] hover:text-[#294236]">
                  <ScrollText size={16} /> Terms of Use
                </button>
                <button onClick={() => navigate('privacy')} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-[#53685b] transition hover:bg-[#eadfc9] hover:text-[#294236]">
                  <Shield size={16} /> Privacy Policy
                </button>
              </div>
            </div>
          </nav>

          <div className="flex items-center gap-2">
            {user ? (
              <div className="hidden items-center gap-3 sm:flex">
                <span className="text-sm font-semibold text-[#53685b]">
                  Hi, {profile?.display_name || 'Reader'}
                </span>
                {profile?.role === 'admin' && (
                  <button onClick={() => navigate('admin')} className="rounded-full bg-[#315b4a] px-3 py-1 text-xs font-bold text-white transition hover:bg-[#294236]">Admin Panel</button>
                )}
                <button onClick={signOut} className="rounded-full border border-[#a2673e] px-4 py-2 text-sm font-bold text-[#8a5438] transition hover:bg-[#a2673e] hover:text-white">
                  Sign out
                </button>
              </div>
            ) : (
              <button onClick={() => navigate('auth')} className="hidden rounded-full border border-[#a2673e] px-4 py-2 text-sm font-bold text-[#8a5438] transition hover:bg-[#a2673e] hover:text-white sm:block">
                Register / Login
              </button>
            )}
            <button
              className="rounded-full bg-[#d48b55] p-3 text-white shadow-sm transition hover:bg-[#bd7443] lg:hidden"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label="Toggle menu"
            >
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {menuOpen && (
          <div className="border-t border-[#d8c7a8] px-5 py-3 lg:hidden">
            {navItems.map((item) => (
              <button key={item.page} onClick={() => navigate(item.page)} className="block w-full rounded-lg px-3 py-3 text-left font-semibold text-[#53685b] hover:bg-[#eadfc9]">
                {item.label}
              </button>
            ))}
            <div className="my-2 h-px bg-[#e2d3b3]" />
            {futureSections.map((s) => (
              <button key={s.slug} onClick={() => navigateFuture(s.slug)} className="block w-full rounded-lg px-3 py-3 text-left font-semibold text-[#53685b] hover:bg-[#eadfc9]">
                {s.icon} {s.label}
              </button>
            ))}
            <div className="my-2 h-px bg-[#e2d3b3]" />
            <button onClick={() => navigate('terms')} className="block w-full rounded-lg px-3 py-3 text-left font-semibold text-[#53685b] hover:bg-[#eadfc9]">Terms of Use</button>
            <button onClick={() => navigate('privacy')} className="block w-full rounded-lg px-3 py-3 text-left font-semibold text-[#53685b] hover:bg-[#eadfc9]">Privacy Policy</button>
            {user ? (
              <button onClick={signOut} className="mt-2 block w-full rounded-lg bg-[#a2673e] px-3 py-3 text-left font-bold text-white">Sign out</button>
            ) : (
              <button onClick={() => navigate('auth')} className="mt-2 block w-full rounded-lg bg-[#d48b55] px-3 py-3 text-left font-bold text-white">Register / Login</button>
            )}
          </div>
        )}
      </header>

      <main>
        {page === 'home' && <HomePage onNavigate={navigate} />}
        {page === 'library' && <LibraryPage onNavigate={navigate} />}
        {page === 'cinema' && <CinemaPage />}
        {page === 'games' && <GameRoomPage />}
        {page === 'about' && <AboutPage onNavigate={navigate} />}
        {page === 'terms' && <TermsPage />}
        {page === 'privacy' && <PrivacyPage />}
        {page === 'auth' && <AuthPage onNavigate={navigate} />}
        {page === 'future' && <UnderConstructionPage slug={futureSlug} onNavigate={navigate} />}
      </main>

      <footer className="border-t border-[#d8c7a8] bg-[#294236] px-5 py-10 text-[#f8f1e4] lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-serif text-xl font-bold">The Static Online School</p>
            <p className="mt-1 text-sm text-[#c8d4c7]">A little more wonder in every lesson.</p>
          </div>
          <div className="flex flex-wrap gap-5 text-sm text-[#c8d4c7]">
            <button onClick={() => navigate('terms')} className="transition hover:text-white">Terms</button>
            <button onClick={() => navigate('privacy')} className="transition hover:text-white">Privacy</button>
            <button onClick={() => navigate('about')} className="transition hover:text-white">About</button>
          </div>
        </div>
      </footer>
    </div>
  );
}

function HomePage({ onNavigate }: { onNavigate: (page: Page) => void }) {
  const { assets } = useSiteAssets();
  const heroImg = assets['homepage_hero']?.url || '/assets/images/homepage/hp7.jpg';
  const feature1 = assets['homepage_feature_1']?.url || '/assets/images/homepage/hp5.jpg';
  const feature2 = assets['homepage_feature_2']?.url || '/assets/images/homepage/l0.jpg';
  const feature3 = assets['homepage_feature_3']?.url || '/assets/images/homepage/hp2.jpg';

  return (
    <>
      <section className="relative mx-auto grid max-w-7xl items-center gap-12 px-5 pb-20 pt-14 lg:grid-cols-[1.02fr_.98fr] lg:px-8 lg:pb-28 lg:pt-20">
        <div className="relative z-10">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#d8c7a8] bg-[#fffaf1] px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-[#a2673e]">
            <Sparkles size={15} /> Welcome, curious reader
          </div>
          <h1 className="max-w-2xl font-serif text-5xl font-bold leading-[1.03] text-[#294236] sm:text-6xl lg:text-7xl">
            Exciting illustrated stories <span className="text-[#a2673e]">for everyone.</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-[#53685b]">
            Easy English for learners aged 4 to 18, from beginner Pre-A1 to advanced C1. Read 100% free for 2 months — no cards, no registration. Just pick a book and start reading!
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <button
              onClick={() => onNavigate('library')}
              className="group flex items-center justify-center gap-3 rounded-full bg-[#d48b55] px-6 py-4 font-bold text-white shadow-[0_8px_0_#a2673e] transition hover:-translate-y-0.5 hover:bg-[#bd7443]"
            >
              Start reading now <ArrowRight size={19} className="transition group-hover:translate-x-1" />
            </button>
            <button
              onClick={() => onNavigate('about')}
              className="rounded-full border border-[#c6b18c] px-6 py-4 font-bold text-[#53685b] transition hover:bg-[#fffaf1]"
            >
              Explore the school
            </button>
          </div>
        </div>
        <div className="relative overflow-hidden rounded-[2.5rem] border-[10px] border-[#d6b879] shadow-[0_20px_0_#a2673e]">
          <img src={heroImg} alt="Illustrated enchanted tree library" className="h-full w-full object-cover" loading="eager" />
        </div>
      </section>

      <section className="bg-[#e8dfcb] px-5 py-16 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#a2673e]">Choose your doorway</p>
              <h2 className="mt-2 font-serif text-4xl font-bold text-[#294236]">Find a story that fits you.</h2>
            </div>
            <button onClick={() => onNavigate('library')} className="flex items-center gap-2 font-bold text-[#a2673e]">
              See the library <ArrowRight size={17} />
            </button>
          </div>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {levels.map((level) => (
              <button key={level.label} onClick={() => onNavigate('library')} className="level-card text-left">
                <span className="text-4xl">{level.tone}</span>
                <p className="mt-8 text-sm font-bold uppercase tracking-[0.15em] text-[#a2673e]">{level.age}</p>
                <h3 className="mt-2 font-serif text-2xl font-bold text-[#294236]">{level.label}</h3>
                <p className="mt-3 leading-7 text-[#53685b]">{level.text}</p>
                <span className="mt-6 flex h-10 w-10 items-center justify-center rounded-full bg-white/70 text-[#315b4a]">
                  <ArrowRight size={18} />
                </span>
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-20 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
          <div className="overflow-hidden rounded-[2rem] border-[10px] border-[#d6b879] shadow-[0_12px_0_#a2673e]">
            <img src={feature1} alt="Illustrated reading adventure" className="h-full w-full object-cover" loading="lazy" />
          </div>
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#a2673e]">The Secret Library</p>
            <h2 className="mt-2 font-serif text-4xl font-bold text-[#294236]">A magical world of graded readers.</h2>
            <p className="mt-5 text-lg leading-8 text-[#53685b]">
              Step inside a growing library of illustrated English stories. Twelve series across six levels, from first words to advanced adventures. Every book is chosen to match a reader's comfort and curiosity.
            </p>
            <button
              onClick={() => onNavigate('library')}
              className="mt-7 flex items-center gap-2 rounded-full bg-[#315b4a] px-5 py-3 font-bold text-white transition hover:bg-[#294236]"
            >
              Enter the Library <ArrowRight size={17} />
            </button>
          </div>
        </div>
      </section>

      <section className="bg-[#e8dfcb] px-5 py-16 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <p className="text-4xl">🎁</p>
          <h2 className="mt-4 font-serif text-4xl font-bold text-[#294236]">Read, hunt, and win!</h2>
          <p className="mx-auto mt-4 max-w-xl text-lg leading-8 text-[#53685b]">
            We've hidden a secret clue inside one of our books. Read closely, find the treasure, and unlock a surprise reward.
          </p>
          <div className="mt-10 grid gap-4 text-left sm:grid-cols-3">
            {['Pick any book and read for free.', 'Look closely for the hidden secret.', 'Find it and win a special prize.'].map((step, index) => (
              <div key={step} className="rounded-3xl border border-[#d8c7a8] bg-[#fffaf1] p-6">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#315b4a] font-bold text-white">{index + 1}</span>
                <p className="mt-5 font-semibold leading-7 text-[#53685b]">{step}</p>
              </div>
            ))}
          </div>
          <div className="mt-8 grid gap-4 text-left sm:grid-cols-2">
            <div className="rounded-3xl border border-[#d8c7a8] bg-[#fffaf1] p-6">
              <p className="text-2xl">🎓</p>
              <h3 className="mt-3 font-serif text-xl font-bold text-[#294236]">1-Year Free Scholarship</h3>
              <p className="mt-2 text-sm leading-6 text-[#53685b]">A full year at our English academy.</p>
            </div>
            <div className="rounded-3xl border border-[#d8c7a8] bg-[#fffaf1] p-6">
              <p className="text-2xl">🎡</p>
              <h3 className="mt-3 font-serif text-xl font-bold text-[#294236]">Luna Park Tickets</h3>
              <p className="mt-2 text-sm leading-6 text-[#53685b]">Tickets to an amusement park in Turkey.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-20 lg:px-8">
        <div className="grid gap-8 md:grid-cols-3">
          {[
            { img: feature2, title: 'Cozy reading spaces', text: 'Illustrated worlds that feel like home.' },
            { img: feature3, title: 'Adventures for every age', text: 'From 4 to 18, there is a story waiting.' },
            { img: feature1, title: 'Read at your pace', text: 'Pick up where you left off, any time.' },
          ].map((card) => (
            <div key={card.title} className="overflow-hidden rounded-[1.5rem] border border-[#d8c7a8] bg-[#fffaf1] shadow-sm">
              <div className="h-48 overflow-hidden">
                <img src={card.img} alt={card.title} className="h-full w-full object-cover" loading="lazy" />
              </div>
              <div className="p-6">
                <h3 className="font-serif text-xl font-bold text-[#294236]">{card.title}</h3>
                <p className="mt-2 text-sm leading-6 text-[#53685b]">{card.text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-[#315b4a] px-5 py-16 text-center text-[#f8f1e4] lg:px-8">
        <div className="mx-auto max-w-2xl">
          <BookOpen className="mx-auto text-[#f6d788]" size={40} strokeWidth={1.6} />
          <h2 className="mt-5 font-serif text-4xl font-bold">Hi, I'm Mojde.</h2>
          <p className="mt-4 text-lg leading-8 text-[#c8d4c7]">
            I've spent over 20 years teaching English, and I created these graded books to make reading fun, visual, and accessible to young learners around the world. Enjoy the stories!
          </p>
          <button
            onClick={() => onNavigate('library')}
            className="mt-7 inline-flex items-center gap-2 rounded-full bg-[#f6d788] px-6 py-3 font-bold text-[#294236] transition hover:bg-[#f0c96e]"
          >
            Start reading <ArrowRight size={17} />
          </button>
        </div>
      </section>
    </>
  );
}

function LibraryPage({ onNavigate }: { onNavigate: (page: Page) => void }) {
  const { assets } = useSiteAssets();
  const entranceImg = assets['library_entrance']?.url || '/assets/images/homepage/l0.jpg';
  const [selectedLevel, setSelectedLevel] = useState<string | undefined>(undefined);
  const { series, loading: seriesLoading } = useSeries(selectedLevel);
  const [openSeries, setOpenSeries] = useState<string | null>(null);
  const { books, loading: booksLoading } = useBooks(openSeries ?? undefined);
  const [openBook, setOpenBook] = useState<Book | null>(null);

  return (
    <section className="mx-auto max-w-7xl px-5 py-16 lg:px-8 lg:py-24">
      <div className="grid gap-10 lg:grid-cols-[1fr_1.2fr] lg:items-center">
        <div className="overflow-hidden rounded-[2rem] border-[10px] border-[#d6b879] shadow-[0_12px_0_#a2673e]">
          <img src={entranceImg} alt="The Secret Library entrance" className="h-full w-full object-cover" loading="eager" />
        </div>
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-[#dbe6d4] px-4 py-2 text-sm font-bold text-[#315b4a]">
            <Library size={16} /> The Secret Library
          </div>
          <h1 className="mt-6 font-serif text-5xl font-bold leading-tight text-[#294236]">Choose a shelf and begin your next adventure.</h1>
          <p className="mt-5 text-lg leading-8 text-[#53685b]">A growing collection of graded English stories, arranged by level so every reader can find a comfortable first step.</p>
        </div>
      </div>

      <div className="mt-12 flex flex-wrap gap-3">
        <button
          onClick={() => setSelectedLevel(undefined)}
          className={`rounded-full px-5 py-2.5 text-sm font-bold transition ${!selectedLevel ? 'bg-[#315b4a] text-white' : 'border border-[#c6b18c] text-[#53685b] hover:bg-[#fffaf1]'}`}
        >
          All levels
        </button>
        {levels.map((level) => (
          <button
            key={level.label}
            onClick={() => setSelectedLevel(level.cefr)}
            className={`rounded-full px-5 py-2.5 text-sm font-bold transition ${selectedLevel === level.cefr ? 'bg-[#315b4a] text-white' : 'border border-[#c6b18c] text-[#53685b] hover:bg-[#fffaf1]'}`}
          >
            {level.tone} {level.label}
          </button>
        ))}
      </div>

      {openBook ? (
        <BookReader book={openBook} onClose={() => setOpenBook(null)} />
      ) : openSeries ? (
        <div className="mt-10">
          <button onClick={() => setOpenSeries(null)} className="mb-6 flex items-center gap-2 font-bold text-[#a2673e]">
            <ArrowRight size={17} className="rotate-180" /> Back to shelves
          </button>
          <h2 className="font-serif text-3xl font-bold text-[#294236]">{series.find((s) => s.id === openSeries)?.title}</h2>
          <p className="mt-2 text-[#53685b]">{series.find((s) => s.id === openSeries)?.description}</p>
          {booksLoading ? (
            <p className="mt-8 text-[#53685b]">Loading books...</p>
          ) : books.length === 0 ? (
            <div className="mt-8 rounded-3xl border border-dashed border-[#c6b18c] bg-[#fffaf1] p-10 text-center">
              <BookOpen className="mx-auto text-[#a2673e]" size={36} strokeWidth={1.5} />
              <p className="mt-4 font-serif text-xl font-bold text-[#294236]">Books are on their way!</p>
              <p className="mt-2 text-[#53685b]">This series is being prepared. New stories will appear here soon.</p>
            </div>
          ) : (
            <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {books.map((book) => (
                <button key={book.id} onClick={() => setOpenBook(book)} className="library-shelf text-left">
                  <div className="relative h-44 overflow-hidden rounded-2xl bg-[#e8dfcb]">
                    {book.cover_url ? (
                      <img src={book.cover_url} alt={book.title} className="h-full w-full object-cover" loading="lazy" />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <BookOpen className="text-[#a2673e]" size={32} strokeWidth={1.5} />
                      </div>
                    )}
                    {book.treasure_active && (
                      <span className="absolute right-2 top-2 flex items-center gap-1 rounded-full bg-[#d48b55] px-2 py-1 text-[10px] font-bold text-white shadow-sm">
                        <Gift size={11} /> Treasure
                      </span>
                    )}
                  </div>
                  <h3 className="mt-4 font-serif text-lg font-bold text-[#294236]">{book.title}</h3>
                  {book.subtitle && <p className="mt-1 text-sm text-[#53685b]">{book.subtitle}</p>}
                  <span className="mt-4 inline-flex items-center gap-2 font-bold text-[#a2673e]">Open book <ArrowRight size={15} /></span>
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="mt-10">
          {seriesLoading ? (
            <p className="text-[#53685b]">Loading shelves...</p>
          ) : series.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-[#c6b18c] bg-[#fffaf1] p-10 text-center">
              <Library className="mx-auto text-[#a2673e]" size={36} strokeWidth={1.5} />
              <p className="mt-4 font-serif text-xl font-bold text-[#294236]">Shelves are being arranged!</p>
              <p className="mt-2 text-[#53685b]">New series will appear here as the library grows.</p>
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {series.map((s) => (
                <button key={s.id} onClick={() => setOpenSeries(s.id)} className="library-shelf text-left">
                  <div className="flex items-center justify-between">
                    <span className="rounded-full bg-[#f6e7bf] px-3 py-1 text-xs font-bold text-[#8a5438]">{s.cefr_level}</span>
                    {s.age_range && <span className="text-xs font-semibold text-[#53685b]">{s.age_range}</span>}
                  </div>
                  <h3 className="mt-5 font-serif text-2xl font-bold text-[#294236]">{s.title}</h3>
                  <p className="mt-2 leading-7 text-[#53685b]">{s.description}</p>
                  <span className="mt-6 inline-flex items-center gap-2 font-bold text-[#a2673e]">Open shelf <ArrowRight size={16} /></span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="mt-12 rounded-[2rem] bg-[#315b4a] p-8 text-[#f8f1e4] shadow-[0_8px_0_#a2673e] sm:p-10">
        <div className="flex flex-col justify-between gap-7 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#f6d788]">The collection is growing</p>
            <h2 className="mt-2 font-serif text-3xl font-bold">200+ stories, one magical home.</h2>
            <p className="mt-3 max-w-xl leading-7 text-[#c8d4c7]">New books, series, and reading adventures can be added as the school grows.</p>
          </div>
          <button onClick={() => onNavigate('home')} className="flex shrink-0 items-center justify-center gap-2 rounded-full bg-[#f6d788] px-5 py-3 font-bold text-[#294236]">
            Back to school <ArrowRight size={17} />
          </button>
        </div>
      </div>
    </section>
  );
}



function CinemaPage() {
  const [page, setPage] = useState(1);
  const [category, setCategory] = useState<string | undefined>(undefined);
  const { videos, total, loading } = useCinemaVideos(page, 12, category);
  const totalPages = Math.ceil(total / 12);
  const [openVideo, setOpenVideo] = useState<CinemaVideo | null>(null);

  return (
    <section className="mx-auto max-w-7xl px-5 py-16 lg:px-8 lg:py-24">
      <div className="inline-flex items-center gap-2 rounded-full bg-[#f6e7bf] px-4 py-2 text-sm font-bold text-[#8a5438]">
        <Clapperboard size={16} /> Cinema
      </div>
      <h1 className="mt-6 font-serif text-5xl font-bold leading-tight text-[#294236]">Stories that move.</h1>
      <p className="mt-4 max-w-xl text-lg leading-8 text-[#53685b]">A growing collection of gentle animations, read-alouds, and learning adventures for curious minds.</p>

      {openVideo && (
        <div className="mt-8 overflow-hidden rounded-[2rem] border border-[#d8c7a8] bg-[#fffaf1] shadow-lg">
          <div className="aspect-video w-full bg-black">
            {openVideo.youtube_id && (
              <iframe
                src={`https://www.youtube.com/embed/${openVideo.youtube_id}`}
                title={openVideo.title}
                className="h-full w-full"
                allowFullScreen
              />
            )}
          </div>
          <div className="p-6">
            <h2 className="font-serif text-2xl font-bold text-[#294236]">{openVideo.title}</h2>
            {openVideo.description && <p className="mt-2 leading-7 text-[#53685b]">{openVideo.description}</p>}
            <button onClick={() => setOpenVideo(null)} className="mt-4 flex items-center gap-2 font-bold text-[#a2673e]">
              <ArrowRight size={17} className="rotate-180" /> Back to videos
            </button>
          </div>
        </div>
      )}

      {!openVideo && (
        <>
          <div className="mt-10 flex flex-wrap gap-3">
            <button onClick={() => setCategory(undefined)} className={`rounded-full px-5 py-2.5 text-sm font-bold transition ${!category ? 'bg-[#315b4a] text-white' : 'border border-[#c6b18c] text-[#53685b] hover:bg-[#fffaf1]'}`}>
              All
            </button>
          </div>

          {loading ? (
            <p className="mt-8 text-[#53685b]">Loading videos...</p>
          ) : videos.length === 0 ? (
            <div className="mt-8 rounded-3xl border border-dashed border-[#c6b18c] bg-[#fffaf1] p-10 text-center">
              <Clapperboard className="mx-auto text-[#a2673e]" size={36} strokeWidth={1.5} />
              <p className="mt-4 font-serif text-xl font-bold text-[#294236]">The cinema is being set up!</p>
              <p className="mt-2 text-[#53685b]">Videos will appear here once they are added.</p>
            </div>
          ) : (
            <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {videos.map((video) => (
                <button key={video.id} onClick={() => setOpenVideo(video)} className="library-shelf text-left">
                  <div className="relative h-44 overflow-hidden rounded-2xl bg-[#e8dfcb]">
                    {video.thumbnail_url ? (
                      <img src={video.thumbnail_url} alt={video.title} className="h-full w-full object-cover" loading="lazy" />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <Clapperboard className="text-[#a2673e]" size={32} strokeWidth={1.5} />
                      </div>
                    )}
                    <span className="absolute inset-0 flex items-center justify-center bg-black/20 transition group-hover:bg-black/30">
                      <Play className="text-white" size={32} fill="white" />
                    </span>
                  </div>
                  <h3 className="mt-4 font-serif text-lg font-bold text-[#294236]">{video.title}</h3>
                  {video.category && <span className="mt-1 block text-xs font-bold uppercase tracking-wide text-[#a2673e]">{video.category}</span>}
                </button>
              ))}
            </div>
          )}

          {totalPages > 1 && (
            <div className="mt-10 flex items-center justify-center gap-3">
              <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page <= 1} className="rounded-full bg-[#315b4a] px-4 py-2 font-bold text-white disabled:opacity-40">
                Previous
              </button>
              <span className="font-semibold text-[#53685b]">Page {page} of {totalPages}</span>
              <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page >= totalPages} className="rounded-full bg-[#315b4a] px-4 py-2 font-bold text-white disabled:opacity-40">
                Next
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}

function GameRoomPage() {
  const { games, loading } = useGames();
  const [activeGame, setActiveGame] = useState<Game | null>(null);
  const [playStatic, setPlayStatic] = useState(false);

  if (playStatic) {
    return <StaticGame onExit={() => setPlayStatic(false)} />;
  }

  return (
    <section className="mx-auto max-w-7xl px-5 py-16 lg:px-8 lg:py-24">
      <div className="inline-flex items-center gap-2 rounded-full bg-[#f6e7bf] px-4 py-2 text-sm font-bold text-[#8a5438]">
        <Gamepad2 size={16} /> Game Room
      </div>
      <h1 className="mt-6 font-serif text-5xl font-bold leading-tight text-[#294236]">Play your way into learning.</h1>
      <p className="mt-4 max-w-xl text-lg leading-8 text-[#53685b]">The first world is ready to play. More adventures are coming soon.</p>

      {activeGame && activeGame.url && (
        <div className="mt-8 rounded-[2rem] border border-[#d8c7a8] bg-[#fffaf1] shadow-lg">
          <div className="flex items-center justify-between p-5">
            <h2 className="font-serif text-2xl font-bold text-[#294236]">{activeGame.title}</h2>
            <button onClick={() => setActiveGame(null)} className="flex items-center gap-2 font-bold text-[#a2673e]">
              <ArrowRight size={17} className="rotate-180" /> Back to games
            </button>
          </div>
          <div className="aspect-video w-full bg-black">
            {activeGame.embed_mode === 'embedded' && activeGame.url ? (
              <iframe src={activeGame.url} title={activeGame.title} className="h-full w-full" allowFullScreen />
            ) : (
              <div className="flex h-full min-h-[50vh] flex-col items-center justify-center p-10 text-center text-white">
                <Gamepad2 size={48} strokeWidth={1.4} />
                <p className="mt-5 font-serif text-2xl font-bold">{activeGame.title}</p>
                <p className="mt-2 max-w-md text-[#c8d4c7]">This game opens in its own window. The embedded experience will arrive here soon.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {!activeGame && (
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {/* Built-in: The Static memory game */}
          <button onClick={() => setPlayStatic(true)} className="library-shelf text-left">
            <div className="h-44 overflow-hidden rounded-2xl bg-gradient-to-br from-[#315b4a] to-[#294236]">
              <div className="flex h-full flex-col items-center justify-center gap-2">
                <Sparkles className="text-[#f6d788]" size={40} strokeWidth={1.4} />
                <span className="font-serif text-lg font-bold text-[#f6d788]">The Static</span>
              </div>
            </div>
            <h3 className="mt-4 font-serif text-xl font-bold text-[#294236]">Memory Match</h3>
            <p className="mt-2 text-sm leading-6 text-[#53685b]">Flip the cards and find matching pairs. A fun way to learn new words!</p>
            <span className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#d48b55] px-4 py-2 font-bold text-white">
              <Play size={15} fill="white" /> Play now
            </span>
          </button>

          {loading ? (
            <p className="text-[#53685b]">Loading games...</p>
          ) : (
            <>
              {games.filter((g) => g.status === 'available').map((game) => (
                <button key={game.id} onClick={() => setActiveGame(game)} className="library-shelf text-left">
                  <div className="h-44 overflow-hidden rounded-2xl bg-[#315b4a]">
                    <div className="flex h-full items-center justify-center">
                      <Gamepad2 className="text-[#f6d788]" size={40} strokeWidth={1.4} />
                    </div>
                  </div>
                  <h3 className="mt-4 font-serif text-xl font-bold text-[#294236]">{game.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-[#53685b]">{game.description}</p>
                  <span className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#d48b55] px-4 py-2 font-bold text-white">
                    <Play size={15} fill="white" /> Play now
                  </span>
                </button>
              ))}
              {games.filter((g) => g.status === 'coming_soon').map((game) => (
                <div key={game.id} className="rounded-3xl border border-dashed border-[#c6b18c] bg-[#fffaf1] p-7 text-left opacity-80">
                  <div className="flex h-44 items-center justify-center rounded-2xl bg-[#e8dfcb]">
                    <Lock className="text-[#a2673e]" size={36} strokeWidth={1.4} />
                  </div>
                  <h3 className="mt-4 font-serif text-xl font-bold text-[#294236]">{game.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-[#53685b]">More games are coming soon! The Game Room is still growing.</p>
                </div>
              ))}
              {games.length < 20 &&
                Array.from({ length: Math.max(0, 3 - games.length) }).map((_, i) => (
                  <div key={`placeholder-${i}`} className="rounded-3xl border border-dashed border-[#c6b18c] bg-[#fffaf1] p-7 text-left opacity-60">
                    <div className="flex h-44 items-center justify-center rounded-2xl bg-[#e8dfcb]">
                      <Sparkles className="text-[#a2673e]" size={36} strokeWidth={1.4} />
                    </div>
                    <h3 className="mt-4 font-serif text-xl font-bold text-[#294236]">Coming soon</h3>
                    <p className="mt-2 text-sm leading-6 text-[#53685b]">More worlds, adventures and educational games are being prepared.</p>
                  </div>
                ))}
            </>
          )}
        </div>
      )}
    </section>
  );
}

function AboutPage({ onNavigate }: { onNavigate: (page: Page) => void }) {
  return (
    <section className="mx-auto max-w-4xl px-5 py-16 lg:px-8 lg:py-24">
      <div className="inline-flex items-center gap-2 rounded-full bg-[#dbe6d4] px-4 py-2 text-sm font-bold text-[#315b4a]">
        <GraduationCap size={16} /> About Us
      </div>
      <h1 className="mt-6 font-serif text-5xl font-bold leading-tight text-[#294236]">Reading should feel like opening a secret door.</h1>
      <div className="mt-8 space-y-6 text-lg leading-8 text-[#53685b]">
        <p>The Static Online School is an imaginative online learning environment created by Mojde, an EFL teacher and educational designer with more than 20 years of teaching experience.</p>
        <p>Our first world, The Secret Library, is a growing English graded-reading library with illustrated stories for learners from Pre-A1 to C1. We believe reading should feel warm, visual, and full of wonder — not like a test.</p>
        <p>Hi! I'm Mojde. I've spent over 20 years teaching English, and I created these graded books to make reading fun, visual, and accessible to young learners around the world. Enjoy the stories!</p>
        <p>Over time, the school will grow to include a Cinema, Game Room, Main Course, Shop, Online Teaching, and new subject libraries. Every section is designed to be a welcoming part of a larger, magical school.</p>
      </div>
      <button onClick={() => onNavigate('library')} className="mt-9 flex items-center gap-3 rounded-full bg-[#d48b55] px-6 py-4 font-bold text-white shadow-[0_8px_0_#a2673e] transition hover:-translate-y-0.5">
        Enter the Library <ArrowRight size={18} />
      </button>
    </section>
  );
}

function TermsPage() {
  return (
    <section className="mx-auto max-w-4xl px-5 py-16 lg:px-8 lg:py-24">
      <div className="inline-flex items-center gap-2 rounded-full bg-[#dbe6d4] px-4 py-2 text-sm font-bold text-[#315b4a]">
        <ScrollText size={16} /> Terms of Use
      </div>
      <h1 className="mt-6 font-serif text-5xl font-bold leading-tight text-[#294236]">Terms of Use</h1>
      <div className="mt-8 space-y-6 leading-8 text-[#53685b]">
        <div>
          <h2 className="font-serif text-xl font-bold text-[#294236]">Acceptable Use</h2>
          <p className="mt-2">By using The Static Online School, you agree to use the platform respectfully and for educational purposes. Disruptive, harmful, or unlawful behavior is not permitted.</p>
        </div>
        <div>
          <h2 className="font-serif text-xl font-bold text-[#294236]">Educational Content</h2>
          <p className="mt-2">All books, videos, games, and materials are provided for learning. We strive to keep content age-appropriate and accurate.</p>
        </div>
        <div>
          <h2 className="font-serif text-xl font-bold text-[#294236]">Accounts</h2>
          <p className="mt-2">You are responsible for keeping your account details safe. We collect only the information needed for authentication and reading progress.</p>
        </div>
        <div>
          <h2 className="font-serif text-xl font-bold text-[#294236]">Intellectual Property</h2>
          <p className="mt-2">The stories, illustrations, and materials on this site belong to The Static Online School and its creators. Please do not copy or redistribute them without permission.</p>
        </div>
        <div>
          <h2 className="font-serif text-xl font-bold text-[#294236]">Future Paid Services</h2>
          <p className="mt-2">Some features may become paid in the future. Free access periods and limits are configurable and may change over time.</p>
        </div>
        <div>
          <h2 className="font-serif text-xl font-bold text-[#294236]">Changes to the Service</h2>
          <p className="mt-2">We may update or change parts of the school over time. We will do our best to keep things running smoothly.</p>
        </div>
        <div>
          <h2 className="font-serif text-xl font-bold text-[#294236]">Contact</h2>
          <p className="mt-2">For questions about these terms, please contact the school directly. This text can be edited later through the admin panel.</p>
        </div>
      </div>
    </section>
  );
}

function PrivacyPage() {
  return (
    <section className="mx-auto max-w-4xl px-5 py-16 lg:px-8 lg:py-24">
      <div className="inline-flex items-center gap-2 rounded-full bg-[#dbe6d4] px-4 py-2 text-sm font-bold text-[#315b4a]">
        <Shield size={16} /> Privacy Policy
      </div>
      <h1 className="mt-6 font-serif text-5xl font-bold leading-tight text-[#294236]">Privacy Policy</h1>
      <div className="mt-8 space-y-6 leading-8 text-[#53685b]">
        <p>The Static Online School is designed around privacy by default. This page explains the limited educational data we collect and how we use it.</p>
        <div>
          <h2 className="font-serif text-xl font-bold text-[#294236]">Data We Collect</h2>
          <p className="mt-2">We collect only what is necessary for: account management and authentication, reading progress, book completion, reading preferences and reactions, and educational functionality.</p>
        </div>
        <div>
          <h2 className="font-serif text-xl font-bold text-[#294236]">Children's Privacy</h2>
          <p className="mt-2">This site is used by children and teenagers. We do not collect unnecessary personal data, do not expose children's personal information publicly, do not create public student profiles, and do not make reading progress publicly visible.</p>
        </div>
        <div>
          <h2 className="font-serif text-xl font-bold text-[#294236]">Parental Consent</h2>
          <p className="mt-2">Where legally required, appropriate consent and parental/guardian mechanisms are provided. Please contact us if you have questions about a child's account.</p>
        </div>
        <div>
          <h2 className="font-serif text-xl font-bold text-[#294236]">Data We Do Not Collect</h2>
          <p className="mt-2">We do not collect unnecessary personal information. We do not use invasive tracking. Guest reading limits are based on simple, non-invasive session timing.</p>
        </div>
        <div>
          <h2 className="font-serif text-xl font-bold text-[#294236]">Contact</h2>
          <p className="mt-2">For privacy questions, please contact the school directly. This text can be edited later through the admin panel.</p>
        </div>
      </div>
    </section>
  );
}

function AuthPage({ onNavigate }: { onNavigate: (page: Page) => void }) {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const result = mode === 'signin' ? await signIn(email, password) : await signUp(email, password, name);
    setBusy(false);
    if (result.error) {
      setError(result.error);
    } else {
      onNavigate('home');
    }
  };

  return (
    <section className="mx-auto flex min-h-[70vh] max-w-md items-center px-5 py-16 lg:px-8">
      <div className="w-full rounded-[2rem] border border-[#d8c7a8] bg-[#fffaf1] p-8 shadow-lg">
        <h1 className="font-serif text-3xl font-bold text-[#294236]">{mode === 'signin' ? 'Welcome back!' : 'Join the school'}</h1>
        <p className="mt-2 text-[#53685b]">{mode === 'signin' ? 'Sign in to continue your reading adventure.' : 'Create an account to save your progress and bookmarks.'}</p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {mode === 'signup' && (
            <div>
              <label className="block text-sm font-bold text-[#294236]">Display name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 w-full rounded-xl border border-[#c6b18c] bg-white px-4 py-3 outline-none focus:border-[#315b4a]"
                placeholder="Your name"
              />
            </div>
          )}
          <div>
            <label className="block text-sm font-bold text-[#294236]">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-xl border border-[#c6b18c] bg-white px-4 py-3 outline-none focus:border-[#315b4a]"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-[#294236]">Password</label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-xl border border-[#c6b18c] bg-white px-4 py-3 outline-none focus:border-[#315b4a]"
              placeholder="At least 6 characters"
            />
          </div>
          {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p>}
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-full bg-[#d48b55] px-6 py-4 font-bold text-white shadow-[0_6px_0_#a2673e] transition hover:-translate-y-0.5 disabled:opacity-50"
          >
            {busy ? 'Please wait...' : mode === 'signin' ? 'Sign in' : 'Create account'}
          </button>
        </form>

        <button
          onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
          className="mt-5 block w-full text-center text-sm font-semibold text-[#a2673e]"
        >
          {mode === 'signin' ? "Don't have an account? Register here" : 'Already have an account? Sign in'}
        </button>
      </div>
    </section>
  );
}

function UnderConstructionPage({ slug, onNavigate }: { slug: string; onNavigate: (page: Page) => void }) {
  const section = futureSections.find((s) => s.slug === slug);
  return (
    <section className="mx-auto flex min-h-[70vh] max-w-3xl items-center px-5 py-20 text-center lg:px-8">
      <div className="mx-auto">
        <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-[#dbe6d4] text-[#315b4a]">
          <span className="text-5xl">{section?.icon || '✨'}</span>
        </div>
        <p className="mt-8 text-sm font-bold uppercase tracking-[0.2em] text-[#a2673e]">Something magical is growing here</p>
        <h1 className="mt-4 font-serif text-5xl font-bold leading-tight text-[#294236]">{section?.label || 'This section'} is coming soon.</h1>
        <p className="mx-auto mt-6 max-w-xl text-lg leading-8 text-[#53685b]">
          This part of The Static Online School is still being prepared. Our little builders are working on it! More adventures are coming soon.
        </p>
        <button
          onClick={() => onNavigate('home')}
          className="mt-9 inline-flex items-center gap-3 rounded-full bg-[#d48b55] px-6 py-4 font-bold text-white shadow-[0_8px_0_#a2673e] transition hover:-translate-y-0.5"
        >
          <ArrowRight size={18} className="rotate-180" /> Back to School
        </button>
      </div>
    </section>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Shell />
    </AuthProvider>
  );
}
