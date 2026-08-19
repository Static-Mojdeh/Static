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
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { PageFlip } from 'page-flip';
import type { PageFlipInstance, PageFlipOptions } from 'page-flip';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

const RENDER_SCALE = 1.5;
const ZOOM_RENDER_SCALE = 2.5;
const MAX_ZOOM = 400;
const MIN_ZOOM = 100;
const ZOOM_STEP = 25;
const CACHE_LIMIT = 40;
const PREFETCH_RANGE = 3;

type RenderedPage = {
  dataUrl: string;
  width: number;
  height: number;
};

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
  const containerRef = useRef<HTMLDivElement | null>(null);
  const flipRef = useRef<PageFlipInstance | null>(null);
  const htmlContainerRef = useRef<HTMLDivElement | null>(null);
  const pdfDocRef = useRef<pdfjsLib.PDFDocumentProxy | null>(null);
  const loadingTaskRef = useRef<pdfjsLib.PDFDocumentLoadingTask | null>(null);
  const pageCacheRef = useRef<Map<number, RenderedPage>>(new Map());
  const renderInFlightRef = useRef<Set<number>>(new Set());
  const totalPagesRef = useRef(0);
  const pageAspectRef = useRef<number>(1);
  const isZoomedRef = useRef(false);
  const pendingPageRef = useRef(startPage);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [zoom, setZoom] = useState(100);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPortrait, setIsPortrait] = useState(false);
  const [panMode, setPanMode] = useState(false);
  const [bookReady, setBookReady] = useState(false);

  const panStateRef = useRef({
    panning: false,
    startX: 0,
    startY: 0,
    offsetX: 0,
    offsetY: 0,
  });
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });

  const computeLayout = useCallback(() => {
    const container = containerRef.current;
    if (!container) return { width: 400, height: 600, portrait: false };
    const rect = container.getBoundingClientRect();
    const portrait = rect.width < 768;
    const padding = 32;
    const availW = rect.width - padding;
    const availH = rect.height - padding;
    const aspect = pageAspectRef.current || 0.707;

    let pageW: number;
    let pageH: number;

    if (portrait) {
      pageH = Math.min(availH, availW / aspect);
      pageW = pageH * aspect;
      if (pageW > availW) {
        pageW = availW;
        pageH = pageW / aspect;
      }
    } else {
      const twoPageW = availW / 2;
      pageH = Math.min(availH, twoPageW / aspect);
      pageW = pageH * aspect;
      if (pageW * 2 > availW) {
        pageW = availW / 2;
        pageH = pageW / aspect;
      }
    }

    return { width: Math.round(pageW), height: Math.round(pageH), portrait };
  }, []);

  const renderPage = useCallback(
    async (pageNum: number, highRes = false): Promise<RenderedPage | null> => {
      const doc = pdfDocRef.current;
      if (!doc) return null;
      const cached = pageCacheRef.current.get(pageNum);
      if (cached && !highRes) return cached;

      if (renderInFlightRef.current.has(pageNum)) {
        return null;
      }

      renderInFlightRef.current.add(pageNum);
      try {
        const page = await doc.getPage(pageNum + 1);
        const viewport = page.getViewport({ scale: highRes ? ZOOM_RENDER_SCALE : RENDER_SCALE });
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return null;

        const dpr = window.devicePixelRatio || 1;
        canvas.width = Math.floor(viewport.width * dpr);
        canvas.height = Math.floor(viewport.height * dpr);
        canvas.style.width = `${viewport.width}px`;
        canvas.style.height = `${viewport.height}px`;

        await page.render({
          canvasContext: ctx,
          viewport,
          transform: dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : undefined,
        } as Parameters<typeof page.render>[0]).promise;

        const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
        const rendered: RenderedPage = {
          dataUrl,
          width: viewport.width,
          height: viewport.height,
        };

        if (!highRes) {
          if (pageCacheRef.current.size >= CACHE_LIMIT) {
            const oldestKey = pageCacheRef.current.keys().next().value;
            if (oldestKey !== undefined) pageCacheRef.current.delete(oldestKey);
          }
          pageCacheRef.current.set(pageNum, rendered);
        }

        canvas.width = 0;
        canvas.height = 0;
        return rendered;
      } catch {
        return null;
      } finally {
        renderInFlightRef.current.delete(pageNum);
      }
    },
    [],
  );

  const prefetchPages = useCallback(
    async (pageNum: number) => {
      const total = totalPagesRef.current;
      const tasks: Promise<unknown>[] = [];
      for (let i = 1; i <= PREFETCH_RANGE; i++) {
        const next = pageNum + i;
        const prev = pageNum - i;
        if (next < total && !pageCacheRef.current.has(next)) {
          tasks.push(renderPage(next));
        }
        if (prev >= 0 && !pageCacheRef.current.has(prev)) {
          tasks.push(renderPage(prev));
        }
      }
      await Promise.all(tasks);
    },
    [renderPage],
  );

  const initFlipbook = useCallback(async () => {
    if (!htmlContainerRef.current) return;
    const { width, height, portrait } = computeLayout();
    setIsPortrait(portrait);

    const options: PageFlipOptions = {
      width,
      height,
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
      const placeholder = document.createElement('div');
      placeholder.className = 'stf__item';
      placeholder.dataset.pageNum = String(i);
      placeholder.style.width = '100%';
      placeholder.style.height = '100%';
      placeholder.style.display = 'flex';
      placeholder.style.alignItems = 'center';
      placeholder.style.justifyContent = 'center';
      placeholder.style.background = '#fffaf1';

      const spinner = document.createElement('div');
      spinner.style.cssText = 'display:flex;align-items:center;justify-content:center;width:100%;height:100%;';
      spinner.innerHTML = '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#a2673e" stroke-width="2" xmlns="http://www.w3.org/2000/svg"><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>';
      placeholder.appendChild(spinner);

      pageElements.push(placeholder);
    }

    (pf as unknown as PageFlipInstance).loadFromHTML(pageElements);
    (pf as unknown as PageFlipInstance).on('flip', (e: unknown) => {
      const ev = e as { data: number };
      setCurrentPage(ev.data);
      onPageChange?.(ev.data + 1, totalPagesRef.current);
      prefetchPages(ev.data);
    });
    (pf as unknown as PageFlipInstance).on('changeOrientation', (e: unknown) => {
      const ev = e as { data: 'portrait' | 'landscape' };
      setIsPortrait(ev.data === 'portrait');
    });

    setBookReady(true);

    const start = pendingPageRef.current;
    for (let i = Math.max(0, start - 1); i <= Math.min(totalPagesRef.current - 1, start + PREFETCH_RANGE); i++) {
      const rendered = await renderPage(i);
      if (rendered) updatePageDOM(i, rendered);
    }

    if (pendingPageRef.current > 0) {
      (pf as unknown as PageFlipInstance).turnToPage(pendingPageRef.current);
      setCurrentPage(pendingPageRef.current);
      onPageChange?.(pendingPageRef.current + 1, totalPagesRef.current);
    }
  }, [computeLayout, renderPage, prefetchPages, onPageChange, updatePageDOM]);

  const updatePageDOM = useCallback((pageNum: number, rendered: RenderedPage) => {
    const container = htmlContainerRef.current;
    if (!container) return;
    const pageEl = container.querySelector(`.stf__item[data-page-num="${pageNum}"]`);
    if (!pageEl) return;
    pageEl.innerHTML = '';
    const img = document.createElement('img');
    img.src = rendered.dataUrl;
    img.alt = `Page ${pageNum + 1}`;
    img.style.width = '100%';
    img.style.height = '100%';
    img.style.objectFit = 'contain';
    img.style.userSelect = 'none';
    img.style.pointerEvents = 'none';
    img.draggable = false;
    pageEl.appendChild(img);
  }, []);

  const loadPdf = useCallback(async () => {
    setLoading(true);
    setError(null);
    setBookReady(false);
    try {
      const loadingTask = pdfjsLib.getDocument({
        url: pdfUrl,
        cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@6.2.108/cmaps/',
        cMapPacked: true,
      });
      loadingTaskRef.current = loadingTask;
      const doc = await loadingTask.promise;
      pdfDocRef.current = doc;
      totalPagesRef.current = doc.numPages;
      setTotalPages(doc.numPages);

      const firstPage = await doc.getPage(1);
      const viewport = firstPage.getViewport({ scale: 1 });
      pageAspectRef.current = viewport.width / viewport.height;
      await firstPage.cleanup();

      await initFlipbook();
      setLoading(false);

      prefetchPages(pendingPageRef.current);
    } catch (err) {
      console.error('PDF load error:', err);
      setError('We couldn\'t open this book. The file may be missing or damaged.');
      setLoading(false);
    }
  }, [pdfUrl, initFlipbook, prefetchPages]);

  useEffect(() => {
    loadPdf();
    return () => {
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
  }, [loadPdf]);

  const handleResize = useCallback(() => {
    if (!flipRef.current || !bookReady) return;
    const { portrait } = computeLayout();
    setIsPortrait(portrait);
    try {
      flipRef.current.update();
    } catch { /* noop */ }
  }, [computeLayout, bookReady]);

  useEffect(() => {
    if (!bookReady) return;
    let resizeTimer: ReturnType<typeof setTimeout>;
    const handler = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(handleResize, 200);
    };
    window.addEventListener('resize', handler);
    return () => {
      window.removeEventListener('resize', handler);
      clearTimeout(resizeTimer);
    };
  }, [handleResize, bookReady]);

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

  const goPrev = useCallback(() => {
    if (isZoomedRef.current) return;
    flipRef.current?.flipPrev();
  }, []);

  const goNext = useCallback(() => {
    if (isZoomedRef.current) return;
    flipRef.current?.flipNext();
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;
      if (e.key === 'ArrowLeft') goPrev();
      else if (e.key === 'ArrowRight') goNext();
      else if (e.key === 'Escape') {
        if (document.fullscreenElement) toggleFullscreen();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [goPrev, goNext, toggleFullscreen]);

  useEffect(() => {
    isZoomedRef.current = panMode;
  }, [panMode]);

  const handleZoomIn = useCallback(async () => {
    setZoom((z) => {
      const next = Math.min(MAX_ZOOM, z + ZOOM_STEP);
      if (next > 100) setPanMode(true);
      return next;
    });
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom((z) => {
      const next = Math.max(MIN_ZOOM, z - ZOOM_STEP);
      if (next <= 100) {
        setPanMode(false);
        setPanOffset({ x: 0, y: 0 });
      }
      return next;
    });
  }, []);

  const handleFit = useCallback(() => {
    setZoom(100);
    setPanMode(false);
    setPanOffset({ x: 0, y: 0 });
  }, []);

  const handleDoubleClick = useCallback(() => {
    if (panMode) {
      handleFit();
    } else {
      handleZoomIn();
    }
  }, [panMode, handleZoomIn, handleFit]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      if (e.deltaY < 0) handleZoomIn();
      else handleZoomOut();
    }
  }, [handleZoomIn, handleZoomOut]);

  const handlePanStart = useCallback((e: React.PointerEvent) => {
    if (!panMode) return;
    const state = panStateRef.current;
    state.panning = true;
    state.startX = e.clientX;
    state.startY = e.clientY;
    state.offsetX = panOffset.x;
    state.offsetY = panOffset.y;
  }, [panMode, panOffset]);

  const handlePanMove = useCallback((e: React.PointerEvent) => {
    const state = panStateRef.current;
    if (!state.panning) return;
    const dx = e.clientX - state.startX;
    const dy = e.clientY - state.startY;
    setPanOffset({ x: state.offsetX + dx, y: state.offsetY + dy });
  }, []);

  const handlePanEnd = useCallback(() => {
    panStateRef.current.panning = false;
  }, []);

  const flipScale = zoom / 100;
  const transform = panMode
    ? `scale(${flipScale}) translate(${panOffset.x / flipScale}px, ${panOffset.y / flipScale}px)`
    : `scale(${flipScale})`;

  return (
    <div
      ref={containerRef}
      className={`flex flex-col bg-[#fffaf1] transition-all ${
        isFullscreen ? 'fixed inset-0 z-50' : ''
      }`}
    >
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#d8c7a8] bg-[#fffaf1] px-4 py-3">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 rounded-full border border-[#c6b18c] px-3 py-2 text-xs font-bold text-[#53685b] transition hover:bg-[#eadfc9]"
            aria-label="Close reader"
          >
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
          <button
            onClick={goPrev}
            disabled={currentPage <= 0}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-[#c6b18c] text-[#53685b] transition hover:bg-[#eadfc9] disabled:opacity-40"
            aria-label="Previous page"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            onClick={goNext}
            disabled={currentPage >= totalPages - 1}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-[#c6b18c] text-[#53685b] transition hover:bg-[#eadfc9] disabled:opacity-40"
            aria-label="Next page"
          >
            <ChevronRight size={18} />
          </button>
          <div className="mx-1 h-6 w-px bg-[#d8c7a8]" />
          <button
            onClick={handleZoomOut}
            disabled={zoom <= MIN_ZOOM}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-[#c6b18c] text-[#53685b] transition hover:bg-[#eadfc9] disabled:opacity-40"
            aria-label="Zoom out"
          >
            <ZoomOut size={16} />
          </button>
          <span className="min-w-[3rem] text-center text-xs font-bold text-[#53685b]">{zoom}%</span>
          <button
            onClick={handleZoomIn}
            disabled={zoom >= MAX_ZOOM}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-[#c6b18c] text-[#53685b] transition hover:bg-[#eadfc9] disabled:opacity-40"
            aria-label="Zoom in"
          >
            <ZoomIn size={16} />
          </button>
          <button
            onClick={handleFit}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-[#c6b18c] text-[#53685b] transition hover:bg-[#eadfc9]"
            aria-label="Fit to screen"
          >
            <Maximize size={15} />
          </button>
          <div className="mx-1 h-6 w-px bg-[#d8c7a8]" />
          <span className="min-w-[3.5rem] text-center text-xs font-bold text-[#53685b]">
            {totalPages > 0 ? `${currentPage + 1} / ${totalPages}` : '— / —'}
          </span>
          <div className="mx-1 h-6 w-px bg-[#d8c7a8]" />
          <button
            onClick={toggleFullscreen}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-[#c6b18c] text-[#53685b] transition hover:bg-[#eadfc9]"
            aria-label="Toggle fullscreen"
          >
            {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
        </div>
      </div>

      {/* Reader area */}
      <div
        className="relative flex-1 overflow-hidden bg-[#e8dfcb]"
        onWheel={handleWheel}
        onDoubleClick={handleDoubleClick}
        onPointerDown={handlePanStart}
        onPointerMove={handlePanMove}
        onPointerUp={handlePanEnd}
        onPointerLeave={handlePanEnd}
        style={{
          cursor: panMode ? (panStateRef.current.panning ? 'grabbing' : 'grab') : 'default',
          touchAction: panMode ? 'none' : 'auto',
        }}
      >
        {loading && (
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center">
            <Loader2 className="animate-spin text-[#a2673e]" size={40} />
            <p className="mt-4 font-serif text-lg font-bold text-[#294236]">Opening the book…</p>
            <p className="mt-1 text-sm text-[#53685b]">Preparing the pages for you.</p>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center p-6 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#f6e7bf]">
              <AlertTriangle className="text-[#a2673e]" size={32} strokeWidth={1.5} />
            </div>
            <p className="mt-5 font-serif text-xl font-bold text-[#294236]">This book couldn't open</p>
            <p className="mt-2 max-w-sm text-sm text-[#53685b]">{error}</p>
            <div className="mt-6 flex gap-3">
              <button
                onClick={loadPdf}
                className="flex items-center gap-2 rounded-full bg-[#d48b55] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#bd7443]"
              >
                <RotateCw size={16} /> Try again
              </button>
              <button
                onClick={onClose}
                className="flex items-center gap-2 rounded-full border border-[#a2673e] px-5 py-2.5 text-sm font-bold text-[#8a5438] transition hover:bg-[#a2673e] hover:text-white"
              >
                <BookOpen size={16} /> Back to library
              </button>
            </div>
          </div>
        )}

        <div
          className="flex h-full w-full items-center justify-center"
          style={{
            transform,
            transformOrigin: 'center center',
            transition: panStateRef.current.panning ? 'none' : 'transform 0.2s ease-out',
          }}
        >
          <div
            ref={htmlContainerRef}
            className="flipbook-container"
            style={{ touchAction: panMode ? 'none' : 'manipulation' }}
          />
        </div>
      </div>

      {/* Mobile bottom hint */}
      {bookReady && !loading && !error && (
        <div className="border-t border-[#d8c7a8] bg-[#fffaf1] px-4 py-2 text-center lg:hidden">
          <p className="text-xs font-semibold text-[#53685b]">
            {isPortrait ? 'Swipe to turn pages · Pinch to zoom' : 'Tap page edges to turn'}
          </p>
        </div>
      )}
    </div>
  );
}
