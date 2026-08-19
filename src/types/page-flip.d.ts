declare module 'page-flip' {
  export interface PageFlipOptions {
    width: number;
    height: number;
    size?: 'fixed' | 'stretch';
    minWidth?: number;
    maxWidth?: number;
    minHeight?: number;
    maxHeight?: number;
    drawShadow?: boolean;
    flippingTime?: number;
    usePortrait?: boolean;
    startZIndex?: number;
    autoSize?: boolean;
    maxShadowOpacity?: number;
    showCover?: boolean;
    mobileScrollSupport?: boolean;
    useMouseEvents?: boolean;
    swipeDistance?: number;
    clickEventForward?: boolean;
    disableFlipByClick?: boolean;
    startPage?: number;
    display?: 'single' | 'double';
    useKeyboardEvents?: boolean;
    disableFlipByClickLeavingPage?: boolean;
  }

  export interface FlipEvent {
    data: number;
  }

  export interface ChangeOrientationEvent {
    data: 'portrait' | 'landscape';
  }

  export interface PageFlipData {
    page: number;
    mode: 'portrait' | 'landscape';
  }

  export interface PageFlipInstance {
    loadFromImages(images: string[]): void;
    loadFromHTML(items: HTMLElement[]): void;
    update(): void;
    destroy(): void;
    flipNext(corner?: string): void;
    flipPrev(corner?: string): void;
    flip(pageNum: number, corner?: string): void;
    turnToPage(pageNum: number): void;
    next(): void;
    prev(): void;
    getCurrentPageIndex(): number;
    getPageCount(): number;
    getOrientation(): 'portrait' | 'landscape';
    getBoundsRect(): { left: number; top: number; right: number; bottom: number; width: number; height: number };
    getFlipObj(): unknown;
    getState(): 'user_fold' | 'flipping' | 'read';
    on(event: 'flip', callback: (e: FlipEvent) => void): void;
    on(event: 'changeOrientation', callback: (e: ChangeOrientationEvent) => void): void;
    on(event: 'changeState', callback: (e: { data: string }) => void): void;
    on(event: 'init', callback: () => void): void;
    on(event: 'update', callback: () => void): void;
    on(event: string, callback: (e: unknown) => void): void;
    off(event: string, callback: (e: unknown) => void): void;
  }

  export class PageFlip {
    constructor(htmlRef: HTMLElement, options: PageFlipOptions);
    loadFromImages(images: string[]): void;
    loadFromHTML(items: HTMLElement[]): void;
    update(): void;
    destroy(): void;
    flipNext(corner?: string): void;
    flipPrev(corner?: string): void;
    flip(pageNum: number, corner?: string): void;
    turnToPage(pageNum: number): void;
    next(): void;
    prev(): void;
    getCurrentPageIndex(): number;
    getPageCount(): number;
    getOrientation(): 'portrait' | 'landscape';
    getBoundsRect(): { left: number; top: number; right: number; bottom: number; width: number; height: number };
    getFlipObj(): unknown;
    getState(): 'user_fold' | 'flipping' | 'read';
    on(event: string, callback: (e: unknown) => void): void;
    off(event: string, callback: (e: unknown) => void): void;
  }
}
