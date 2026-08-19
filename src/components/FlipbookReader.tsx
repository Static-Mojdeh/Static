import { useState, useEffect, useRef, useCallback } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
  X,
  Loader2,
  AlertTriangle,
  RotateCw,
  BookOpen,
  Maximize,
} from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist/build/pdf.mjs';
import { PageFlip } from 'page-flip';
import type { PageFlipInstance, PageFlipOptions } from 'page-flip';
import 'page-flip/src/Style/stPageFlip.css';

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

const RENDER_SCALE = 1.5;
const MAX_ZOOM = 400;
const MIN_ZOOM = 100;
const ZOOM_STEP = 25;
const CACHE_LIMIT = 40;
const PREFETCH_RANGE = 3;

type RenderedPage = { dataUrl: string; width: number; height: number };

type FlipbookReaderProps = {
  pdfUrl: string;
  title?: string;
  subtitle?: string;
  startPage?: number;
  onPageChange?: (page: number, total: number) => void;
  onClose: () => void;
};

export default function FlipbookReader({
  pdfUrl,
  title,
  subtitle,
  startPage = 0,
  onPageChange,
  onClose,
}: FlipbookReaderProps) {
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const readerAreaRef = useRef<HTMLDivElement | null>(null);
  const flipRef = useRef<PageFlipInstance | null>(null);
  const htmlContainerRef = useRef<HTMLDivElement | null>(null);
  const pdfDocRef = useRef<pdfjsLib.PDFDocumentProxy | null>(null);
  const loadingTaskRef = useRef<pdfjsLib.PDFDocumentLoadingTask | null>(null);
  const pageCacheRef = useRef<Map<number, RenderedPage>>(new Map());
  const renderInFlightRef = useRef<Set<number>>(new Set());
  const totalPagesRef = useRef(0);
  const pageAspectRef = useRef<number>(0.707);
  const isZoomedRef = useRef(false);
  const pendingPageRef = useRef(startPage);
  const onPageChangeRef = useRef(onPageChange);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [zoom, setZoom] = useState(100);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPortrait, setIsPortrait] = useState(false);
  const [panMode, setPanMode] = useState(false);
  const [bookReady, setBookReady] = useState(false);

  const panStateRef = useRef({ panning: false, startX: 0, startY: 0, offsetX: 0, offsetY: 0 });
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });

  useEffect(() => { onPageChangeRef.current = onPageChange; }, [onPageChange]);

  // ── Layout ──
  const computeLayout = useCallback(() => {
    const area = readerAreaRef.current;
    if (!area) return { width: 400, height: 600, portrait: true };
    const rect = area.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return { width: 400, height: 600, portrait: true };
    const portrait = rect.width < 700;
    const padding = 20;
    const verticalPadding = 56;
    const availW = rect.width - padding;
    const availH = rect.height - verticalPadding;
    const aspect = pageAspectRef.current || 0.707;

    let pageW: number, pageH: number;
    if (portrait) {
      pageH = Math.min(availH, availW / aspect);
      pageW = pageH * aspect;
      if (pageW > availW) { pageW = availW; pageH = pageW / aspect; }
    } else {
      const twoPageW = availW / 2;
      pageH = Math.min(availH, twoPageW / aspect);
      pageW = pageH * aspect;
      if (pageW * 2 > availW) { pageW = availW / 2; pageH = pageW / aspect; }
    }
    return { width: Math.round(pageW), height: Math.round(pageH), portrait };
  }, []);

  // ── Render a PDF page to a data URL ──
  const renderPage = useCallback(async (pageNum: number): Promise<RenderedPage | null> => {
    const doc = pdfDocRef.current;
    if (!doc) return null;
    const cached = pageCacheRef.current.get(pageNum);
    if (cached) return cached;
    if (renderInFlightRef.current.has(pageNum)) return null;

    renderInFlightRef.current.add(pageNum);
    try {
      const page = await doc.getPage(pageNum + 1);
      const viewport = page.getViewport({ scale: RENDER_SCALE });
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;

      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.floor(viewport.width * dpr);
      canvas.height = Math.floor(viewport.height * dpr);

      await page.render({
        canvasContext: ctx,
        viewport,
        transform: dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : undefined,
      } as Parameters<typeof page.render>[0]).promise;

      const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
      const rendered: RenderedPage = { dataUrl, width: viewport.width, height: viewport.height };

      if (pageCacheRef.current.size >= CACHE_LIMIT) {
        const oldestKey = pageCacheRef.current.keys().next().value;
        if (oldestKey !== undefined) pageCacheRef.current.delete(oldestKey);
      }
      pageCacheRef.current.set(pageNum, rendered);

      canvas.width = 0;
      canvas.height = 0;
      return rendered;
    } catch {
      return null;
    } finally {
      renderInFlightRef.current.delete(pageNum);
    }
  }, []);

  // ── Put rendered image into a page element ──
  const updatePageDOM = useCallback((pageNum: number, rendered: RenderedPage) => {
    const container = htmlContainerRef.current;
    if (!container) return;
    const pageEl = container.querySelector(`.stf__item[data-page-num="${pageNum}"]`);
    if (!pageEl || pageEl.querySelector('img')) return;
    pageEl.innerHTML = '';
    const img = document.createElement('img');
    img.src = rendered.dataUrl;
    img.alt = `Page ${pageNum + 1}`;
    img.style.cssText = 'width:100%;height:100%;object-fit:contain;pointer-events:none;user-select:none';
    img.draggable = false;
    pageEl.appendChild(img);
  }, []);

  // ── Render + display a page ──
  const ensurePageDisplayed = useCallback(async (pageNum: number) => {
    const rendered = await renderPage(pageNum);
    if (rendered) updatePageDOM(pageNum, rendered);
  }, [renderPage, updatePageDOM]);

  // ── Prefetch neighbors ──
  const prefetchPages = useCallback(async (pageNum: number) => {
    const total = totalPagesRef.current;
    const tasks: Promise<void>[] = [];
    for (let i = 1; i <= PREFETCH_RANGE; i++) {
      if (pageNum + i < total) tasks.push(ensurePageDisplayed(pageNum + i));
      if (pageNum - i >= 0) tasks.push(ensurePageDisplayed(pageNum - i));
    }
    await Promise.all(tasks);
  }, [ensurePageDisplayed]);

  // ── Single mount effect: load PDF, init flipbook ──
  useEffect(() => {
    let cancelled = false;

    async function init() {
      setLoading(true);
      setError(null);
      try {
        const loadingTask = pdfjsLib.getDocument({
          url: pdfUrl,
          cMapUrl: `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version}/cmaps/`,
          cMapPacked: true,
        });
        loadingTaskRef.current = loadingTask;
        const doc = await loadingTask.promise;
        if (cancelled) { try { void doc.cleanup(); } catch { /* noop */ } return; }
        pdfDocRef.current = doc;
        totalPagesRef.current = doc.numPages;
        setTotalPages(doc.numPages);

        const firstPage = await doc.getPage(1);
        const vp = firstPage.getViewport({ scale: 1 });
        pageAspectRef.current = vp.width / vp.height;
        await firstPage.cleanup();

        if (cancelled || !htmlContainerRef.current) return;

        // Clear any leftover DOM from a previous instance
        htmlContainerRef.current.innerHTML = '';

        const { width, height, portrait } = computeLayout();
        setIsPortrait(portrait);

        const options: PageFlipOptions = {
          width, height,
          size: 'stretch',
          maxShadowOpacity: 0.5,
          showCover: true,
          mobileScrollSupport: false,
          usePortrait: true,
          flippingTime: 600,
          useMouseEvents: true,
          swipeDistance: 30,
          display: portrait ? 'single' : 'double',
          startPage: pendingPageRef.current,
        };

        const pf = new PageFlip(htmlContainerRef.current, options);
        flipRef.current = pf as unknown as PageFlipInstance;

        const pageElements: HTMLElement[] = [];
        for (let i = 0; i < totalPagesRef.current; i++) {
          const el = document.createElement('div');
          el.className = 'stf__item';
          el.dataset.pageNum = String(i);
          el.style.cssText = 'width:100%;height:100%;background:#fffaf1';
          el.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;width:100%;height:100%"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#a2673e" stroke-width="2" xmlns="http://www.w3.org/2000/svg"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg></div>';
          pageElements.push(el);
        }

        (pf as unknown as PageFlipInstance).loadFromHTML(pageElements);

        (pf as unknown as PageFlipInstance).on('flip', (e: unknown) => {
          const ev = e as { data: number };
          setCurrentPage(ev.data);
          onPageChangeRef.current?.(ev.data + 1, totalPagesRef.current);
          ensurePageDisplayed(ev.data);
          prefetchPages(ev.data);
        });

        (pf as unknown as PageFlipInstance).on('changeOrientation', (e: unknown) => {
          setIsPortrait((e as { data: 'portrait' | 'landscape' }).data === 'portrait');
        });

        (pf as unknown as PageFlipInstance).on('init', (e: unknown) => {
          const ev = e as { page: number };
          setCurrentPage(ev.page);
          onPageChangeRef.current?.(ev.page + 1, totalPagesRef.current);
          ensurePageDisplayed(ev.page);
          prefetchPages(ev.page);
        });

        setBookReady(true);
        setLoading(false);

        // Render initial pages around the start page
        const start = pendingPageRef.current;
        for (let i = Math.max(0, start - 1); i <= Math.min(totalPagesRef.current - 1, start + PREFETCH_RANGE); i++) {
          if (cancelled) return;
          await ensurePageDisplayed(i);
        }

        prefetchPages(start);
      } catch (err) {
        if (cancelled) return;
        console.error('PDF load error:', err);
        setError(`We couldn't open this book. ${err instanceof Error ? err.message : String(err)}`);
        setLoading(false);
      }
    }

    init();

    return () => {
      cancelled = true;
      if (flipRef.current) {
        try { flipRef.current.destroy(); } catch { /* noop */ }
        flipRef.current = null;
      }
      if (loadingTaskRef.current) {
        try { void loadingTaskRef.current.destroy(); } catch { /* noop */ }
        loadingTaskRef.current = null;
      }
      pdfDocRef.current = null;
      pageCacheRef.current.clear();
      renderInFlightRef.current.clear();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pdfUrl]);

  // ── Resize ──
  useEffect(() => {
    const area = readerAreaRef.current;
    if (!area || !bookReady) return;
    let timer: ReturnType<typeof setTimeout>;
    const observer = new ResizeObserver(() => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        if (!flipRef.current) return;
        const { portrait } = computeLayout();
        setIsPortrait(portrait);
        try { flipRef.current.update(); } catch { /* noop */ }
      }, 200);
    });
    observer.observe(area);
    return () => { observer.disconnect(); clearTimeout(timer); };
  }, [computeLayout, bookReady]);

  // ── Fullscreen ──
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      overlayRef.current?.requestFullscreen?.();
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

  // ── Navigation ──
  const goPrev = useCallback(() => {
    if (panMode) { setPanMode(false); setPanOffset({ x: 0, y: 0 }); setZoom(100); }
    flipRef.current?.flipPrev();
  }, [panMode]);
  const goNext = useCallback(() => {
    if (panMode) { setPanMode(false); setPanOffset({ x: 0, y: 0 }); setZoom(100); }
    flipRef.current?.flipNext();
  }, [panMode]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;
      if (e.key === 'ArrowLeft') goPrev();
      else if (e.key === 'ArrowRight') goNext();
      else if (e.key === 'Escape') {
        if (document.fullscreenElement) toggleFullscreen();
        else onClose();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [goPrev, goNext, toggleFullscreen, onClose]);

  // ── Zoom & Pan ──
  useEffect(() => { isZoomedRef.current = panMode; }, [panMode]);

  const handleZoomIn = useCallback(() => {
    setZoom((z) => {
      const next = Math.min(MAX_ZOOM, z + ZOOM_STEP);
      if (next > 100) setPanMode(true);
      return next;
    });
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom((z) => {
      const next = Math.max(MIN_ZOOM, z - ZOOM_STEP);
      if (next <= 100) { setPanMode(false); setPanOffset({ x: 0, y: 0 }); }
      return next;
    });
  }, []);

  const handleFit = useCallback(() => {
    setZoom(100); setPanMode(false); setPanOffset({ x: 0, y: 0 });
  }, []);

  const handleDoubleClick = useCallback(() => {
    if (panMode) handleFit(); else handleZoomIn();
  }, [panMode, handleZoomIn, handleFit]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      if (e.deltaY < 0) handleZoomIn(); else handleZoomOut();
    }
  }, [handleZoomIn, handleZoomOut]);

  const handlePanStart = useCallback((e: React.PointerEvent) => {
    if (!panMode) return;
    const s = panStateRef.current;
    s.panning = true; s.startX = e.clientX; s.startY = e.clientY;
    s.offsetX = panOffset.x; s.offsetY = panOffset.y;
  }, [panMode, panOffset]);

  const handlePanMove = useCallback((e: React.PointerEvent) => {
    const s = panStateRef.current;
    if (!s.panning) return;
    setPanOffset({ x: s.offsetX + e.clientX - s.startX, y: s.offsetY + e.clientY - s.startY });
  }, []);

  const handlePanEnd = useCallback(() => { panStateRef.current.panning = false; }, []);

  const flipScale = zoom / 100;
  const transform = panMode
    ? `scale(${flipScale}) translate(${panOffset.x / flipScale}px, ${panOffset.y / flipScale}px)`
    : `scale(${flipScale})`;

  return (
    <div ref={overlayRef} className="fixed inset-0 z-[100] flex flex-col bg-[#1a2820]">
      {/* Toolbar */}
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-[#3a4a3e] bg-[#fffaf1] px-3 py-2 sm:px-4">
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="flex items-center gap-1.5 rounded-full border border-[#c6b18c] px-3 py-2 text-xs font-bold text-[#53685b] transition hover:bg-[#eadfc9]" aria-label="Close reader">
            <X size={15} /> Close
          </button>
          {title && (
            <div className="hidden min-w-0 sm:block">
              <p className="truncate font-serif text-sm font-bold text-[#294236]">{title}</p>
              {subtitle && <p className="truncate text-xs text-[#53685b]">{subtitle}</p>}
            </div>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={goPrev} disabled={currentPage <= 0} className="flex h-9 w-9 items-center justify-center rounded-full border border-[#c6b18c] text-[#53685b] transition hover:bg-[#eadfc9] disabled:opacity-40" aria-label="Previous page">
            <ChevronLeft size={18} />
          </button>
          <button onClick={goNext} disabled={currentPage >= totalPages - 1} className="flex h-9 w-9 items-center justify-center rounded-full border border-[#c6b18c] text-[#53685b] transition hover:bg-[#eadfc9] disabled:opacity-40" aria-label="Next page">
            <ChevronRight size={18} />
          </button>
          <div className="mx-1 h-6 w-px bg-[#d8c7a8]" />
          <button onClick={handleZoomOut} disabled={zoom <= MIN_ZOOM} className="flex h-9 w-9 items-center justify-center rounded-full border border-[#c6b18c] text-[#53685b] transition hover:bg-[#eadfc9] disabled:opacity-40" aria-label="Zoom out">
            <ZoomOut size={16} />
          </button>
          <span className="min-w-[3rem] text-center text-xs font-bold text-[#53685b]">{zoom}%</span>
          <button onClick={handleZoomIn} disabled={zoom >= MAX_ZOOM} className="flex h-9 w-9 items-center justify-center rounded-full border border-[#c6b18c] text-[#53685b] transition hover:bg-[#eadfc9] disabled:opacity-40" aria-label="Zoom in">
            <ZoomIn size={16} />
          </button>
          <button onClick={handleFit} className="flex h-9 w-9 items-center justify-center rounded-full border border-[#c6b18c] text-[#53685b] transition hover:bg-[#eadfc9]" aria-label="Fit to screen">
            <Maximize size={15} />
          </button>
          <div className="mx-1 h-6 w-px bg-[#d8c7a8]" />
          <span className="min-w-[3.5rem] text-center text-xs font-bold text-[#53685b]">
            {totalPages > 0 ? `${currentPage + 1} / ${totalPages}` : '— / —'}
          </span>
          <div className="mx-1 h-6 w-px bg-[#d8c7a8]" />
          <button onClick={toggleFullscreen} className="flex h-9 w-9 items-center justify-center rounded-full border border-[#c6b18c] text-[#53685b] transition hover:bg-[#eadfc9]" aria-label="Toggle fullscreen">
            {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
        </div>
      </div>

      {/* Reader area */}
      <div
        ref={readerAreaRef}
        className="relative flex-1 overflow-hidden bg-[#1a2820]"
        onWheel={handleWheel}
        onDoubleClick={handleDoubleClick}
        onPointerDown={handlePanStart}
        onPointerMove={handlePanMove}
        onPointerUp={handlePanEnd}
        onPointerLeave={handlePanEnd}
        style={{ cursor: panMode ? (panStateRef.current.panning ? 'grabbing' : 'grab') : 'default', touchAction: panMode ? 'none' : 'auto' }}
      >
        {/* Loading overlay — pointer-events-none so it never blocks the flipbook */}
        {loading && (
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center" style={{ pointerEvents: 'none' }}>
            <Loader2 className="animate-spin text-[#d48b55]" size={40} />
            <p className="mt-4 font-serif text-lg font-bold text-[#fffaf1]">Opening the book…</p>
            <p className="mt-1 text-sm text-[#c8d4c7]">Preparing the pages for you.</p>
          </div>
        )}

        {/* Error overlay — only blocks when there's a real error, and hides the flipbook */}
        {error && !loading && (
          <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-[#1a2820] p-6 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#f6e7bf]">
              <AlertTriangle className="text-[#a2673e]" size={32} strokeWidth={1.5} />
            </div>
            <p className="mt-5 font-serif text-xl font-bold text-[#fffaf1]">This book couldn't open</p>
            <p className="mt-2 max-w-sm text-sm text-[#c8d4c7]">{error}</p>
            <div className="mt-6 flex gap-3">
              <button onClick={() => window.location.reload()} className="flex items-center gap-2 rounded-full bg-[#d48b55] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#bd7443]">
                <RotateCw size={16} /> Try again
              </button>
              <button onClick={onClose} className="flex items-center gap-2 rounded-full border border-[#d48b55] px-5 py-2.5 text-sm font-bold text-[#d48b55] transition hover:bg-[#d48b55] hover:text-white">
                <BookOpen size={16} /> Back to library
              </button>
            </div>
          </div>
        )}

        {/* Flipbook */}
        <div
          className="flex h-full w-full items-center justify-center"
          style={{ transform: panMode ? transform : 'none', transformOrigin: 'center center', transition: panStateRef.current.panning ? 'none' : 'transform 0.2s ease-out', paddingTop: '28px', paddingBottom: '28px' }}
        >
          <div ref={htmlContainerRef} className="flipbook-container" style={{ touchAction: panMode ? 'none' : 'manipulation', maxHeight: '100%' }} />
        </div>
      </div>

      {/* Mobile hint */}
      {bookReady && !loading && !error && (
        <div className="shrink-0 border-t border-[#3a4a3e] bg-[#fffaf1] px-4 py-2 text-center lg:hidden">
          <p className="text-xs font-semibold text-[#53685b]">
            {isPortrait ? 'Swipe to turn pages · Pinch to zoom' : 'Tap page edges to turn'}
          </p>
        </div>
      )}
    </div>
  );
}
