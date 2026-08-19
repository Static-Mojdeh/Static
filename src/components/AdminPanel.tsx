import { useState, type ReactNode } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Clapperboard,
  FileText,
  Gamepad2,
  LayoutDashboard,
  Library,
  Plus,
  Save,
  Settings,
  Trash2,
  Users,
  X,
  Image as ImageIcon,
  Eye,
  EyeOff,
  RefreshCw,
  Check,
  Sparkles,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Series, Book, CinemaVideo, Game, SiteSection, SiteAsset, SiteSetting, ProfileRow } from '@/lib/supabase';
import {
  uploadFile,
  extractYouTubeId,
  useAdminSeries,
  useAdminBooks,
  useAdminVideos,
  useAdminGames,
  useAdminSections,
  useAdminAssets,
  useAdminSettings,
  useAdminProfiles,
  useAdminStats,
} from '@/lib/admin';

type AdminTab = 'dashboard' | 'library' | 'cinema' | 'games' | 'site' | 'users';

const CEFR_LEVELS = ['Pre-A1', 'A1', 'A2', 'B1', 'B2', 'C1'] as const;
const BUCKET = 'school-uploads';

const inputClass = 'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600';
const labelClass = 'block text-xs font-bold uppercase tracking-wide text-slate-500 mb-1';
const btnPrimary = 'inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-bold text-white transition hover:bg-emerald-800 disabled:opacity-50';
const btnGhost = 'inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100';
const btnDanger = 'inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-100';

function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 pt-8">
      <div className={`w-full ${wide ? 'max-w-3xl' : 'max-w-lg'} rounded-2xl bg-white shadow-2xl`}>
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h3 className="font-serif text-lg font-bold text-slate-800">{title}</h3>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700">
            <X size={20} />
          </button>
        </div>
        <div className="max-h-[75vh] overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <label className={labelClass}>{label}</label>
      {children}
    </div>
  );
}

function StatCard({ icon, label, value, sub }: { icon: ReactNode; label: string; value: number | string; sub?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">{icon}</div>
        <div>
          <p className="text-2xl font-bold text-slate-800">{value}</p>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
        </div>
      </div>
      {sub && <p className="mt-2 text-xs text-slate-400">{sub}</p>}
    </div>
  );
}

// ===== Dashboard =====
function AdminDashboard() {
  const { stats, loading, refresh } = useAdminStats();

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="font-serif text-2xl font-bold text-slate-800">Dashboard</h2>
          <p className="text-sm text-slate-500">Overview of your school at a glance.</p>
        </div>
        <button onClick={refresh} className={btnGhost}><RefreshCw size={15} /> Refresh</button>
      </div>

      {loading ? (
        <p className="text-slate-500">Loading stats...</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <StatCard icon={<Users size={20} />} label="Registered Users" value={stats.users} />
          <StatCard icon={<Library size={20} />} label="Series" value={stats.series} />
          <StatCard icon={<BookOpen size={20} />} label="Books" value={stats.books} sub={`${stats.publishedBooks} published`} />
          <StatCard icon={<Clapperboard size={20} />} label="Videos" value={stats.videos} sub={`${stats.publishedVideos} published`} />
          <StatCard icon={<Gamepad2 size={20} />} label="Games" value={stats.games} sub={`${stats.availableGames} available`} />
          <StatCard icon={<FileText size={20} />} label="Active Sections" value={stats.activeSections} sub={`${stats.activeSections} visible`} />
          <StatCard icon={<Check size={20} />} label="Books Completed" value={stats.completedBooks} sub={`${stats.progressRows} in progress`} />
          <StatCard icon={<Sparkles size={20} />} label="Treasure Claims" value={stats.treasureClaims} />
        </div>
      )}
    </div>
  );
}

// ===== Library Manager (Series + Books) =====
function LibraryManager() {
  const { series, loading: seriesLoading, refresh: refreshSeries } = useAdminSeries();
  const [selectedSeriesId, setSelectedSeriesId] = useState<string | null>(null);
  const { books, loading: booksLoading, refresh: refreshBooks } = useAdminBooks(selectedSeriesId ?? undefined);
  const [editingSeries, setEditingSeries] = useState<Series | null>(null);
  const [creatingSeries, setCreatingSeries] = useState(false);
  const [editingBook, setEditingBook] = useState<Book | null>(null);
  const [creatingBook, setCreatingBook] = useState(false);

  const selectedSeries = series.find((s) => s.id === selectedSeriesId);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="font-serif text-2xl font-bold text-slate-800">Library Manager</h2>
          <p className="text-sm text-slate-500">Manage series and books. Upload PDFs, covers, and set treasure clues.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setCreatingSeries(true)} className={btnPrimary}><Plus size={16} /> New Series</button>
          {selectedSeriesId && <button onClick={() => setCreatingBook(true)} className={btnPrimary}><Plus size={16} /> New Book</button>}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <div>
          <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-500">Series</h3>
          {seriesLoading ? (
            <p className="text-sm text-slate-400">Loading...</p>
          ) : (
            <div className="space-y-2">
              {series.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSelectedSeriesId(s.id)}
                  className={`flex w-full items-center justify-between rounded-lg border px-3 py-2.5 text-left transition ${
                    selectedSeriesId === s.id ? 'border-emerald-600 bg-emerald-50' : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}
                >
                  <div>
                    <p className="text-sm font-bold text-slate-800">{s.title}</p>
                    <p className="text-xs text-slate-500">{s.cefr_level} {s.age_range ? `· ${s.age_range}` : ''}</p>
                  </div>
                  <span className={`h-2 w-2 rounded-full ${s.is_active ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          {selectedSeries ? (
            <div>
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="font-serif text-xl font-bold text-slate-800">{selectedSeries.title}</h3>
                  <p className="text-sm text-slate-500">{selectedSeries.description || 'No description.'}</p>
                </div>
                <button onClick={() => setEditingSeries(selectedSeries)} className={btnGhost}>Edit Series</button>
              </div>

              <h4 className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-500">Books in this series</h4>
              {booksLoading ? (
                <p className="text-sm text-slate-400">Loading books...</p>
              ) : books.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
                  <BookOpen className="mx-auto text-slate-300" size={32} />
                  <p className="mt-3 text-sm font-semibold text-slate-500">No books yet. Click "New Book" to add one.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {books.map((book) => (
                    <div key={book.id} className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3">
                      <div className="flex items-center gap-3">
                        {book.cover_url ? (
                          <img src={book.cover_url} alt={book.title} className="h-12 w-10 rounded object-cover" />
                        ) : (
                          <div className="flex h-12 w-10 items-center justify-center rounded bg-slate-100"><BookOpen size={16} className="text-slate-400" /></div>
                        )}
                        <div>
                          <p className="text-sm font-bold text-slate-800">{book.title}</p>
                          <p className="text-xs text-slate-500">
                            {book.is_published ? <span className="text-emerald-600 font-semibold">Published</span> : <span className="text-amber-600 font-semibold">Draft</span>}
                            {book.pdf_url ? ' · PDF uploaded' : ' · No PDF'}
                            {book.treasure_active ? ' · Treasure active' : ''}
                          </p>
                        </div>
                      </div>
                      <button onClick={() => setEditingBook(book)} className={btnGhost}>Edit</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="flex h-full min-h-[300px] items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50">
              <p className="text-sm text-slate-400">Select a series to manage its books.</p>
            </div>
          )}
        </div>
      </div>

      {creatingSeries && <SeriesEditor onClose={() => { setCreatingSeries(false); refreshSeries(); }} />}
      {editingSeries && <SeriesEditor series={editingSeries} onClose={() => { setEditingSeries(null); refreshSeries(); }} />}
      {creatingBook && selectedSeriesId && <BookEditor seriesId={selectedSeriesId} onClose={() => { setCreatingBook(false); refreshBooks(); }} />}
      {editingBook && <BookEditor book={editingBook} seriesId={editingBook.series_id ?? undefined} onClose={() => { setEditingBook(null); refreshBooks(); }} />}
    </div>
  );
}

function SeriesEditor({ series, onClose }: { series?: Series; onClose: () => void }) {
  const [title, setTitle] = useState(series?.title || '');
  const [cefr, setCefr] = useState(series?.cefr_level || 'Pre-A1');
  const [ageRange, setAgeRange] = useState(series?.age_range || '');
  const [description, setDescription] = useState(series?.description || '');
  const [coverUrl, setCoverUrl] = useState(series?.cover_url || '');
  const [displayOrder, setDisplayOrder] = useState(series?.display_order ?? 0);
  const [isActive, setIsActive] = useState(series?.is_active ?? true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = await uploadFile(file, `series-covers/${Date.now()}-${file.name}`);
    if (url) setCoverUrl(url);
  };

  const handleSave = async () => {
    setBusy(true);
    setError(null);
    const payload = { title, cefr_level: cefr, age_range: ageRange || null, description: description || null, cover_url: coverUrl || null, display_order: displayOrder, is_active: isActive };
    const { error: upErr } = series
      ? await supabase.from('series').update(payload).eq('id', series.id)
      : await supabase.from('series').insert(payload);
    setBusy(false);
    if (upErr) setError(upErr.message);
    else onClose();
  };

  return (
    <Modal title={series ? 'Edit Series' : 'New Series'} onClose={onClose}>
      <div className="space-y-4">
        <Field label="Title"><input className={inputClass} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Series name" /></Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="CEFR Level">
            <select className={inputClass} value={cefr} onChange={(e) => setCefr(e.target.value as typeof cefr)}>
              {CEFR_LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
          </Field>
          <Field label="Age Range"><input className={inputClass} value={ageRange} onChange={(e) => setAgeRange(e.target.value)} placeholder="e.g. Ages 4-8" /></Field>
        </div>
        <Field label="Description"><textarea className={inputClass} rows={3} value={description} onChange={(e) => setDescription(e.target.value)} /></Field>
        <Field label="Cover Image">
          <div className="flex items-center gap-3">
            {coverUrl && <img src={coverUrl} alt="Cover" className="h-16 w-16 rounded-lg object-cover" />}
            <label className={btnGhost}><ImageIcon size={15} /> Upload<input type="file" accept="image/*" className="hidden" onChange={handleCoverUpload} /></label>
          </div>
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Display Order"><input type="number" className={inputClass} value={displayOrder} onChange={(e) => setDisplayOrder(parseInt(e.target.value) || 0)} /></Field>
          <Field label="Active">
            <label className="flex items-center gap-2 pt-6"><input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="h-4 w-4" /> <span className="text-sm text-slate-700">Visible to readers</span></label>
          </Field>
        </div>
        {error && <p className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600">{error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className={btnGhost}>Cancel</button>
          <button onClick={handleSave} disabled={busy || !title} className={btnPrimary}><Save size={15} /> {busy ? 'Saving...' : 'Save'}</button>
        </div>
      </div>
    </Modal>
  );
}

function BookEditor({ book, seriesId, onClose }: { book?: Book; seriesId?: string; onClose: () => void }) {
  const [title, setTitle] = useState(book?.title || '');
  const [subtitle, setSubtitle] = useState(book?.subtitle || '');
  const [bookNumber, setBookNumber] = useState(book?.book_number ?? 1);
  const [cefr, setCefr] = useState<string>(book?.cefr_level || 'Pre-A1');
  const [ageRange, setAgeRange] = useState(book?.age_range || '');
  const [description, setDescription] = useState(book?.description || '');
  const [coverUrl, setCoverUrl] = useState(book?.cover_url || '');
  const [pdfUrl, setPdfUrl] = useState(book?.pdf_url || '');
  const [audioUrl, setAudioUrl] = useState(book?.audio_url || '');
  const [pageCount, setPageCount] = useState(book?.page_count ?? 1);
  const [displayOrder, setDisplayOrder] = useState(book?.display_order ?? 0);
  const [isPublished, setIsPublished] = useState(book?.is_published ?? false);
  const [treasurePage, setTreasurePage] = useState(book?.treasure_page ?? 1);
  const [treasureActive, setTreasureActive] = useState(book?.treasure_active ?? false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>, setter: (url: string) => void, folder: string) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = await uploadFile(file, `${folder}/${Date.now()}-${file.name}`);
    if (url) setter(url);
  };

  const handleSave = async () => {
    setBusy(true);
    setError(null);
    const payload = {
      series_id: seriesId || null,
      title,
      subtitle: subtitle || null,
      book_number: bookNumber,
      cefr_level: cefr,
      age_range: ageRange || null,
      description: description || null,
      cover_url: coverUrl || null,
      pdf_url: pdfUrl || null,
      audio_url: audioUrl || null,
      page_count: pageCount,
      display_order: displayOrder,
      is_published: isPublished,
      treasure_page: treasureActive ? treasurePage : null,
      treasure_active: treasureActive,
    };
    const { error: upErr } = book
      ? await supabase.from('books').update(payload).eq('id', book.id)
      : await supabase.from('books').insert(payload);
    setBusy(false);
    if (upErr) setError(upErr.message);
    else onClose();
  };

  return (
    <Modal title={book ? 'Edit Book' : 'New Book'} onClose={onClose} wide>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Title"><input className={inputClass} value={title} onChange={(e) => setTitle(e.target.value)} /></Field>
          <Field label="Subtitle"><input className={inputClass} value={subtitle} onChange={(e) => setSubtitle(e.target.value)} /></Field>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <Field label="Book #"><input type="number" className={inputClass} value={bookNumber} onChange={(e) => setBookNumber(parseInt(e.target.value) || 1)} /></Field>
          <Field label="CEFR Level">
            <select className={inputClass} value={cefr} onChange={(e) => setCefr(e.target.value)}>
              {CEFR_LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
          </Field>
          <Field label="Age Range"><input className={inputClass} value={ageRange} onChange={(e) => setAgeRange(e.target.value)} placeholder="Ages 4-8" /></Field>
        </div>
        <Field label="Description"><textarea className={inputClass} rows={2} value={description} onChange={(e) => setDescription(e.target.value)} /></Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Cover Image">
            <div className="flex items-center gap-3">
              {coverUrl && <img src={coverUrl} alt="Cover" className="h-16 w-12 rounded object-cover" />}
              <label className={btnGhost}><ImageIcon size={15} /> Upload<input type="file" accept="image/*" className="hidden" onChange={(e) => handleUpload(e, setCoverUrl, 'book-covers')} /></label>
            </div>
          </Field>
          <Field label="Page Count"><input type="number" className={inputClass} value={pageCount} onChange={(e) => setPageCount(parseInt(e.target.value) || 1)} /></Field>
        </div>

        <Field label="PDF File">
          <div className="flex items-center gap-3">
            {pdfUrl ? <span className="text-xs text-emerald-600 font-semibold">PDF uploaded</span> : <span className="text-xs text-slate-400">No PDF</span>}
            <label className={btnGhost}><FileText size={15} /> Upload PDF<input type="file" accept="application/pdf" className="hidden" onChange={(e) => handleUpload(e, setPdfUrl, 'book-pdfs')} /></label>
          </div>
        </Field>

        <Field label="Audio File (optional)">
          <div className="flex items-center gap-3">
            {audioUrl ? <span className="text-xs text-emerald-600 font-semibold">Audio uploaded</span> : <span className="text-xs text-slate-400">No audio</span>}
            <label className={btnGhost}><FileText size={15} /> Upload<input type="file" accept="audio/*" className="hidden" onChange={(e) => handleUpload(e, setAudioUrl, 'book-audio')} /></label>
          </div>
        </Field>

        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <p className="mb-3 text-xs font-bold uppercase tracking-wide text-amber-700">Treasure Hunt</p>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Treasure Page #"><input type="number" className={inputClass} value={treasurePage} onChange={(e) => setTreasurePage(parseInt(e.target.value) || 1)} disabled={!treasureActive} /></Field>
            <Field label="Treasure Active">
              <label className="flex items-center gap-2 pt-6"><input type="checkbox" checked={treasureActive} onChange={(e) => setTreasureActive(e.target.checked)} className="h-4 w-4" /> <span className="text-sm text-slate-700">Hide a clue on this page</span></label>
            </Field>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Display Order"><input type="number" className={inputClass} value={displayOrder} onChange={(e) => setDisplayOrder(parseInt(e.target.value) || 0)} /></Field>
          <Field label="Published">
            <label className="flex items-center gap-2 pt-6"><input type="checkbox" checked={isPublished} onChange={(e) => setIsPublished(e.target.checked)} className="h-4 w-4" /> <span className="text-sm text-slate-700">Visible to readers</span></label>
          </Field>
        </div>

        {error && <p className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600">{error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className={btnGhost}>Cancel</button>
          <button onClick={handleSave} disabled={busy || !title} className={btnPrimary}><Save size={15} /> {busy ? 'Saving...' : 'Save'}</button>
        </div>
      </div>
    </Modal>
  );
}

// ===== Cinema Manager =====
function CinemaManager() {
  const [page, setPage] = useState(1);
  const { videos, total, loading, refresh } = useAdminVideos(page, 20);
  const [editing, setEditing] = useState<CinemaVideo | null>(null);
  const [creating, setCreating] = useState(false);
  const totalPages = Math.ceil(total / 20);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="font-serif text-2xl font-bold text-slate-800">Cinema Manager</h2>
          <p className="text-sm text-slate-500">{total} videos total. Add YouTube links, set categories, publish.</p>
        </div>
        <button onClick={() => setCreating(true)} className={btnPrimary}><Plus size={16} /> New Video</button>
      </div>

      {loading ? (
        <p className="text-slate-500">Loading...</p>
      ) : videos.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
          <Clapperboard className="mx-auto text-slate-300" size={32} />
          <p className="mt-3 text-sm font-semibold text-slate-500">No videos yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {videos.map((v) => (
            <div key={v.id} className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3">
              <div className="flex items-center gap-3">
                {v.thumbnail_url ? <img src={v.thumbnail_url} alt={v.title} className="h-12 w-20 rounded object-cover" /> : <div className="flex h-12 w-20 items-center justify-center rounded bg-slate-100"><Clapperboard size={16} className="text-slate-400" /></div>}
                <div>
                  <p className="text-sm font-bold text-slate-800">{v.title}</p>
                  <p className="text-xs text-slate-500">
                    {v.category || 'Uncategorized'} · {v.cefr_level || 'Any level'}
                    {v.is_published ? <span className="ml-2 text-emerald-600 font-semibold">Published</span> : <span className="ml-2 text-amber-600 font-semibold">Draft</span>}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setEditing(v)} className={btnGhost}>Edit</button>
                <button onClick={async () => { await supabase.from('cinema_videos').delete().eq('id', v.id); refresh(); }} className={btnDanger}><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-3">
          <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page <= 1} className={btnGhost}>Previous</button>
          <span className="text-sm text-slate-500">Page {page} of {totalPages}</span>
          <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page >= totalPages} className={btnGhost}>Next</button>
        </div>
      )}

      {creating && <VideoEditor onClose={() => { setCreating(false); refresh(); }} />}
      {editing && <VideoEditor video={editing} onClose={() => { setEditing(null); refresh(); }} />}
    </div>
  );
}

function VideoEditor({ video, onClose }: { video?: CinemaVideo; onClose: () => void }) {
  const [title, setTitle] = useState(video?.title || '');
  const [youtubeUrl, setYoutubeUrl] = useState(video?.youtube_url || '');
  const [youtubeId, setYoutubeId] = useState(video?.youtube_id || '');
  const [thumbnailUrl, setThumbnailUrl] = useState(video?.thumbnail_url || '');
  const [category, setCategory] = useState(video?.category || '');
  const [cefr, setCefr] = useState(video?.cefr_level || '');
  const [ageRange, setAgeRange] = useState(video?.age_range || '');
  const [description, setDescription] = useState(video?.description || '');
  const [displayOrder, setDisplayOrder] = useState(video?.display_order ?? 0);
  const [isPublished, setIsPublished] = useState(video?.is_published ?? false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUrlChange = (url: string) => {
    setYoutubeUrl(url);
    const id = extractYouTubeId(url);
    if (id) {
      setYoutubeId(id);
      if (!thumbnailUrl) setThumbnailUrl(`https://img.youtube.com/vi/${id}/hqdefault.jpg`);
    }
  };

  const handleSave = async () => {
    setBusy(true);
    setError(null);
    const payload = {
      title,
      youtube_url: youtubeUrl || null,
      youtube_id: youtubeId || null,
      thumbnail_url: thumbnailUrl || null,
      category: category || null,
      cefr_level: cefr || null,
      age_range: ageRange || null,
      description: description || null,
      display_order: displayOrder,
      is_published: isPublished,
    };
    const { error: upErr } = video
      ? await supabase.from('cinema_videos').update(payload).eq('id', video.id)
      : await supabase.from('cinema_videos').insert(payload);
    setBusy(false);
    if (upErr) setError(upErr.message);
    else onClose();
  };

  return (
    <Modal title={video ? 'Edit Video' : 'New Video'} onClose={onClose}>
      <div className="space-y-4">
        <Field label="Title"><input className={inputClass} value={title} onChange={(e) => setTitle(e.target.value)} /></Field>
        <Field label="YouTube URL or ID"><input className={inputClass} value={youtubeUrl} onChange={(e) => handleUrlChange(e.target.value)} placeholder="https://youtube.com/watch?v=..." /></Field>
        {youtubeId && (
          <div className="rounded-lg bg-slate-100 p-2">
            <img src={`https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`} alt="Preview" className="mx-auto rounded" style={{ maxHeight: 120 }} />
          </div>
        )}
        <div className="grid grid-cols-2 gap-4">
          <Field label="Category"><input className={inputClass} value={category} onChange={(e) => setCategory(e.target.value)} placeholder="e.g. Read-aloud" /></Field>
          <Field label="CEFR Level"><input className={inputClass} value={cefr} onChange={(e) => setCefr(e.target.value)} placeholder="e.g. A2" /></Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Age Range"><input className={inputClass} value={ageRange} onChange={(e) => setAgeRange(e.target.value)} placeholder="Ages 4-8" /></Field>
          <Field label="Display Order"><input type="number" className={inputClass} value={displayOrder} onChange={(e) => setDisplayOrder(parseInt(e.target.value) || 0)} /></Field>
        </div>
        <Field label="Description"><textarea className={inputClass} rows={2} value={description} onChange={(e) => setDescription(e.target.value)} /></Field>
        <Field label="Published">
          <label className="flex items-center gap-2"><input type="checkbox" checked={isPublished} onChange={(e) => setIsPublished(e.target.checked)} className="h-4 w-4" /> <span className="text-sm text-slate-700">Visible to viewers</span></label>
        </Field>
        {error && <p className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600">{error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className={btnGhost}>Cancel</button>
          <button onClick={handleSave} disabled={busy || !title} className={btnPrimary}><Save size={15} /> {busy ? 'Saving...' : 'Save'}</button>
        </div>
      </div>
    </Modal>
  );
}

// ===== Game Manager =====
function GameManager() {
  const { games, loading, refresh } = useAdminGames();
  const [editing, setEditing] = useState<Game | null>(null);
  const [creating, setCreating] = useState(false);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="font-serif text-2xl font-bold text-slate-800">Game Room Manager</h2>
          <p className="text-sm text-slate-500">Add, edit, and manage games.</p>
        </div>
        <button onClick={() => setCreating(true)} className={btnPrimary}><Plus size={16} /> New Game</button>
      </div>

      {loading ? (
        <p className="text-slate-500">Loading...</p>
      ) : (
        <div className="space-y-2">
          {games.map((g) => (
            <div key={g.id} className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700"><Gamepad2 size={18} /></div>
                <div>
                  <p className="text-sm font-bold text-slate-800">{g.title}</p>
                  <p className="text-xs text-slate-500">
                    {g.status === 'available' && <span className="text-emerald-600 font-semibold">Available</span>}
                    {g.status === 'coming_soon' && <span className="text-amber-600 font-semibold">Coming Soon</span>}
                    {g.status === 'hidden' && <span className="text-slate-400 font-semibold">Hidden</span>}
                    {g.embed_mode === 'embedded' ? ' · Embedded' : ' · External'}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setEditing(g)} className={btnGhost}>Edit</button>
                <button onClick={async () => { await supabase.from('games').delete().eq('id', g.id); refresh(); }} className={btnDanger}><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {creating && <GameEditor onClose={() => { setCreating(false); refresh(); }} />}
      {editing && <GameEditor game={editing} onClose={() => { setEditing(null); refresh(); }} />}
    </div>
  );
}

function GameEditor({ game, onClose }: { game?: Game; onClose: () => void }) {
  const [title, setTitle] = useState(game?.title || '');
  const [description, setDescription] = useState(game?.description || '');
  const [url, setUrl] = useState(game?.url || '');
  const [embedMode, setEmbedMode] = useState<'embedded' | 'external'>(game?.embed_mode || 'external');
  const [status, setStatus] = useState<'available' | 'coming_soon' | 'hidden'>(game?.status || 'coming_soon');
  const [ageRange, setAgeRange] = useState(game?.age_range || '');
  const [cefr, setCefr] = useState(game?.cefr_level || '');
  const [subject, setSubject] = useState(game?.subject || '');
  const [displayOrder, setDisplayOrder] = useState(game?.display_order ?? 0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setBusy(true);
    setError(null);
    const payload = {
      title,
      description: description || null,
      url: url || null,
      embed_mode: embedMode,
      status,
      age_range: ageRange || null,
      cefr_level: cefr || null,
      subject: subject || null,
      display_order: displayOrder,
    };
    const { error: upErr } = game
      ? await supabase.from('games').update(payload).eq('id', game.id)
      : await supabase.from('games').insert(payload);
    setBusy(false);
    if (upErr) setError(upErr.message);
    else onClose();
  };

  return (
    <Modal title={game ? 'Edit Game' : 'New Game'} onClose={onClose}>
      <div className="space-y-4">
        <Field label="Title"><input className={inputClass} value={title} onChange={(e) => setTitle(e.target.value)} /></Field>
        <Field label="Description"><textarea className={inputClass} rows={2} value={description} onChange={(e) => setDescription(e.target.value)} /></Field>
        <Field label="Game URL"><input className={inputClass} value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://..." /></Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Embed Mode">
            <select className={inputClass} value={embedMode} onChange={(e) => setEmbedMode(e.target.value as 'embedded' | 'external')}>
              <option value="external">External link</option>
              <option value="embedded">Embedded (iframe)</option>
            </select>
          </Field>
          <Field label="Status">
            <select className={inputClass} value={status} onChange={(e) => setStatus(e.target.value as 'available' | 'coming_soon' | 'hidden')}>
              <option value="available">Available</option>
              <option value="coming_soon">Coming Soon</option>
              <option value="hidden">Hidden</option>
            </select>
          </Field>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <Field label="Age Range"><input className={inputClass} value={ageRange} onChange={(e) => setAgeRange(e.target.value)} /></Field>
          <Field label="CEFR Level"><input className={inputClass} value={cefr} onChange={(e) => setCefr(e.target.value)} /></Field>
          <Field label="Subject"><input className={inputClass} value={subject} onChange={(e) => setSubject(e.target.value)} /></Field>
        </div>
        <Field label="Display Order"><input type="number" className={inputClass} value={displayOrder} onChange={(e) => setDisplayOrder(parseInt(e.target.value) || 0)} /></Field>
        {error && <p className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600">{error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className={btnGhost}>Cancel</button>
          <button onClick={handleSave} disabled={busy || !title} className={btnPrimary}><Save size={15} /> {busy ? 'Saving...' : 'Save'}</button>
        </div>
      </div>
    </Modal>
  );
}

// ===== Site Manager (Sections + Assets + Settings) =====
function SiteManager() {
  const [subTab, setSubTab] = useState<'sections' | 'assets' | 'settings'>('sections');
  const { sections, loading: secLoading, refresh: refreshSections } = useAdminSections();
  const { assets, loading: assetLoading, refresh: refreshAssets } = useAdminAssets();
  const { settings, loading: setLoading, refresh: refreshSettings } = useAdminSettings();

  return (
    <div>
      <div className="mb-6">
        <h2 className="font-serif text-2xl font-bold text-slate-800">Site Manager</h2>
        <p className="text-sm text-slate-500">Control sections, artwork, and site-wide settings.</p>
      </div>

      <div className="mb-6 flex gap-2">
        {(['sections', 'assets', 'settings'] as const).map((t) => (
          <button key={t} onClick={() => setSubTab(t)} className={`rounded-lg px-4 py-2 text-sm font-bold capitalize transition ${subTab === t ? 'bg-emerald-700 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>{t}</button>
        ))}
      </div>

      {subTab === 'sections' && (
        <div className="space-y-2">
          {secLoading ? <p className="text-slate-500">Loading...</p> : sections.map((s: SiteSection) => (
            <div key={s.id} className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3">
              <div>
                <p className="text-sm font-bold text-slate-800">{s.label}</p>
                <p className="text-xs text-slate-500">/{s.slug}</p>
              </div>
              <div className="flex items-center gap-2">
                {(['active', 'under_construction', 'hidden'] as const).map((st) => (
                  <button key={st} onClick={async () => { await supabase.from('site_sections').update({ status: st }).eq('id', s.id); refreshSections(); }}
                    className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${s.status === st ? 'bg-emerald-700 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
                    {st === 'active' ? 'Active' : st === 'under_construction' ? 'Construction' : 'Hidden'}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {subTab === 'assets' && (
        <div className="space-y-3">
          {assetLoading ? <p className="text-slate-500">Loading...</p> : assets.map((a: SiteAsset) => (
            <div key={a.id} className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3">
              <div className="flex items-center gap-3">
                {a.url && <img src={a.url} alt={a.label} className="h-12 w-16 rounded object-cover" />}
                <div>
                  <p className="text-sm font-bold text-slate-800">{a.label}</p>
                  <p className="text-xs text-slate-500">{a.slot}</p>
                </div>
              </div>
              <label className={btnGhost}><ImageIcon size={15} /> Replace
                <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                  const file = e.target.files?.[0]; if (!file) return;
                  const url = await uploadFile(file, `site-assets/${a.slot}-${Date.now()}-${file.name}`);
                  if (url) { await supabase.from('site_assets').update({ url }).eq('id', a.id); refreshAssets(); }
                }} />
              </label>
            </div>
          ))}
        </div>
      )}

      {subTab === 'settings' && (
        <div className="space-y-3">
          {setLoading ? <p className="text-slate-500">Loading...</p> : settings.map((s: SiteSetting) => (
            <div key={s.key} className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3">
              <div>
                <p className="text-sm font-bold text-slate-800">{s.key}</p>
                <p className="text-xs text-slate-500">{s.description || ''}</p>
              </div>
              <input className={`${inputClass} w-40`} defaultValue={s.value} onBlur={async (e) => { await supabase.from('site_settings').update({ value: e.target.value }).eq('key', s.key); }} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ===== Users Manager =====
function UsersManager() {
  const { profiles, loading, refresh } = useAdminProfiles();

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="font-serif text-2xl font-bold text-slate-800">User Manager</h2>
          <p className="text-sm text-slate-500">{profiles.length} registered users.</p>
        </div>
        <button onClick={refresh} className={btnGhost}><RefreshCw size={15} /> Refresh</button>
      </div>

      {loading ? (
        <p className="text-slate-500">Loading...</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3 text-left">Name</th>
                <th className="px-4 py-3 text-left">Email</th>
                <th className="px-4 py-3 text-left">Role</th>
                <th className="px-4 py-3 text-left">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {profiles.map((p: ProfileRow) => (
                <tr key={p.id} className="bg-white hover:bg-slate-50">
                  <td className="px-4 py-3 font-semibold text-slate-800">{p.display_name || '—'}</td>
                  <td className="px-4 py-3 text-slate-600">{p.email || '—'}</td>
                  <td className="px-4 py-3">
                    <select
                      value={p.role}
                      onChange={async (e) => { await supabase.from('profiles').update({ role: e.target.value }).eq('id', p.id); refresh(); }}
                      className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs font-bold text-slate-700"
                    >
                      <option value="student">Student</option>
                      <option value="teacher">Teacher</option>
                      <option value="admin">Admin</option>
                    </select>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">{p.created_at ? new Date(p.created_at).toLocaleDateString() : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ===== Main Admin Panel =====
export default function AdminPanel({ onExit }: { onExit: () => void }) {
  const [tab, setTab] = useState<AdminTab>('dashboard');

  const navItems: { id: AdminTab; label: string; icon: ReactNode }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
    { id: 'library', label: 'Library', icon: <Library size={18} /> },
    { id: 'cinema', label: 'Cinema', icon: <Clapperboard size={18} /> },
    { id: 'games', label: 'Games', icon: <Gamepad2 size={18} /> },
    { id: 'site', label: 'Site', icon: <Settings size={18} /> },
    { id: 'users', label: 'Users', icon: <Users size={18} /> },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="flex">
        <aside className="sticky top-0 h-screen w-60 shrink-0 border-r border-slate-200 bg-white">
          <div className="px-5 py-5">
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-700 text-white"><LayoutDashboard size={18} /></span>
              <div>
                <p className="font-serif text-sm font-bold text-slate-800">Admin Panel</p>
                <p className="text-[10px] uppercase tracking-wide text-slate-400">The Static School</p>
              </div>
            </div>
          </div>
          <nav className="px-3">
            {navItems.map((item) => (
              <button key={item.id} onClick={() => setTab(item.id)}
                className={`mb-1 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition ${tab === item.id ? 'bg-emerald-50 text-emerald-700' : 'text-slate-600 hover:bg-slate-50'}`}>
                {item.icon} {item.label}
              </button>
            ))}
          </nav>
          <div className="absolute bottom-0 left-0 right-0 border-t border-slate-200 p-3">
            <button onClick={onExit} className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50">
              <ArrowLeft size={18} /> Back to Site
            </button>
          </div>
        </aside>

        <main className="flex-1 overflow-y-auto p-6 lg:p-8">
          {tab === 'dashboard' && <AdminDashboard />}
          {tab === 'library' && <LibraryManager />}
          {tab === 'cinema' && <CinemaManager />}
          {tab === 'games' && <GameManager />}
          {tab === 'site' && <SiteManager />}
          {tab === 'users' && <UsersManager />}
        </main>
      </div>
    </div>
  );
}
