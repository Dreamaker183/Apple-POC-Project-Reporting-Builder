/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ZoomIn, ZoomOut, X } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
  initialZoom?: number;
  size?: number;
}

const MIN_ZOOM = 1.5;
const MAX_ZOOM = 4;

function copyFormValues(source: Element, clone: Element) {
  const srcFields = source.querySelectorAll('input, textarea, select');
  const cloneFields = clone.querySelectorAll('input, textarea, select');
  srcFields.forEach((s, i) => {
    const c = cloneFields[i] as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | undefined;
    if (!c) return;
    if (s instanceof HTMLInputElement) {
      if (s.type === 'checkbox' || s.type === 'radio') {
        (c as HTMLInputElement).checked = s.checked;
      } else {
        (c as HTMLInputElement).value = s.value;
      }
    } else if (s instanceof HTMLTextAreaElement) {
      (c as HTMLTextAreaElement).value = s.value;
    } else if (s instanceof HTMLSelectElement) {
      (c as HTMLSelectElement).value = s.value;
    }
  });
}

function copyScrollPositions(source: Element, clone: Element) {
  const srcScrollable = source.querySelectorAll('*');
  const cloneScrollable = clone.querySelectorAll('*');
  srcScrollable.forEach((s, i) => {
    const el = s as HTMLElement;
    const c = cloneScrollable[i] as HTMLElement | undefined;
    if (!c) return;
    if (el.scrollTop !== 0 || el.scrollLeft !== 0) {
      try {
        c.scrollTop = el.scrollTop;
        c.scrollLeft = el.scrollLeft;
      } catch {
        /* ignore */
      }
    }
  });
}

/**
 * A real screen magnifier: a circular loupe that follows the cursor and shows
 * a live zoomed clone of the app underneath.
 */
export const ScreenMagnifier: React.FC<Props> = ({ open, onClose, initialZoom = 2, size = 220 }) => {
  const [zoom, setZoom] = useState(initialZoom);
  const lensRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const posRef = useRef({ x: typeof window !== 'undefined' ? window.innerWidth / 2 : 400, y: 200 });
  const zoomRef = useRef(initialZoom);
  const sizeRef = useRef(size);
  zoomRef.current = zoom;
  sizeRef.current = size;

  const buildClone = useCallback(() => {
    const host = contentRef.current;
    const source = document.getElementById('root');
    if (!host || !source) return;
    host.innerHTML = '';
    const clone = source.cloneNode(true) as HTMLElement;
    clone.removeAttribute('id');
    // Avoid duplicate ids / interactive clones / recursive loupe content.
    clone.querySelectorAll('[id]').forEach((el) => el.removeAttribute('id'));
    clone.querySelectorAll('.branded-cursor-layer, .magnifier-ui').forEach((el) => el.remove());
    clone.setAttribute('aria-hidden', 'true');
    clone.setAttribute('inert', '');
    (clone as HTMLElement).style.pointerEvents = 'none';
    const width = source.offsetWidth || document.documentElement.clientWidth;
    clone.style.width = `${width}px`;
    clone.style.maxWidth = 'none';
    clone.style.margin = '0';
    clone.style.pointerEvents = 'none';
    clone.querySelectorAll('input, textarea, select, button, a').forEach((el) => {
      ((el as HTMLElement).style as CSSStyleDeclaration).pointerEvents = 'none';
      (el as HTMLElement).tabIndex = -1;
    });
    try {
      copyFormValues(source, clone);
      copyScrollPositions(source, clone);
    } catch {
      /* best effort */
    }
    host.appendChild(clone);
    // Size the host to the document so doc-coordinate math lines up.
    host.style.width = `${document.documentElement.scrollWidth}px`;
    host.style.height = `${document.documentElement.scrollHeight}px`;
  }, []);

  // (Re)build the clone while open so the loupe stays live.
  useEffect(() => {
    if (!open) return;
    buildClone();
    const refresh = () => buildClone();
    const interval = window.setInterval(refresh, 2000);
    window.addEventListener('resize', refresh);
    window.addEventListener('scroll', refresh, { passive: true, capture: true });
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('resize', refresh);
      window.removeEventListener('scroll', refresh, { capture: true });
    };
  }, [open, buildClone]);

  // Follow the pointer with rAF (no React re-render per move).
  useEffect(() => {
    if (!open) return;
    let raf = 0;
    const render = () => {
      const lens = lensRef.current;
      const content = contentRef.current;
      if (lens && content) {
        const { x, y } = posRef.current;
        const z = zoomRef.current;
        const s = sizeRef.current;
        const half = s / 2;
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const lx = Math.min(Math.max(x, half + 4), vw - half - 4);
        const ly = Math.min(Math.max(y, half + 4), vh - half - 4);
        lens.style.transform = `translate3d(${lx - half}px, ${ly - half}px, 0)`;
        const docX = x + window.scrollX;
        const docY = y + window.scrollY;
        content.style.transform =
          `translate3d(${-(docX * z - half)}px, ${-(docY * z - half)}px, 0) scale(${z})`;
        content.style.transformOrigin = '0 0';
      }
      raf = requestAnimationFrame(render);
    };
    raf = requestAnimationFrame(render);

    const onMove = (e: MouseEvent) => {
      posRef.current.x = e.clientX;
      posRef.current.y = e.clientY;
    };
    const onTouch = (e: TouchEvent) => {
      const t = e.touches[0];
      if (t) {
        posRef.current.x = t.clientX;
        posRef.current.y = t.clientY;
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === '+' || e.key === '=') setZoom((z) => Math.min(MAX_ZOOM, +(z + 0.25).toFixed(2)));
      if (e.key === '-' || e.key === '_') setZoom((z) => Math.max(MIN_ZOOM, +(z - 0.25).toFixed(2)));
    };
    window.addEventListener('mousemove', onMove, { passive: true });
    window.addEventListener('touchmove', onTouch, { passive: true });
    window.addEventListener('keydown', onKey);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('touchmove', onTouch);
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  const half = size / 2;

  return (
    <div className="magnifier-ui fixed inset-0 z-[10000] pointer-events-none" aria-hidden={false}>
      {/* Dim + grid backdrop so the loupe reads as separate from the page */}
      <div className="absolute inset-0 bg-[#1D1D1F]/10" />

      {/* Loupe */}
      <div
        ref={lensRef}
        className="magnifier-pop absolute top-0 left-0 rounded-full overflow-hidden bg-white shadow-[0_18px_60px_rgba(0,0,0,0.35)] ring-4 ring-[#0071E3]/80"
        style={{ width: size, height: size }}
        role="dialog"
        aria-label={`Screen magnifier at ${zoom}x. Press Escape to close.`}
      >
        <div ref={contentRef} className="absolute top-0 left-0 will-change-transform" />
        {/* Crosshair */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute left-1/2 top-2 bottom-2 w-px bg-[#0071E3]/30" />
          <div className="absolute top-1/2 left-2 right-2 h-px bg-[#0071E3]/30" />
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full border-2 border-[#0071E3] bg-white/70" />
        </div>
      </div>

      {/* Controls (interactive) */}
      <div className="magnifier-ui pointer-events-auto absolute left-1/2 -translate-x-1/2 bottom-6 flex items-center gap-1.5 bg-white/95 backdrop-blur-xl rounded-full border border-black/10 shadow-[0_8px_30px_rgba(0,0,0,0.18)] px-2 py-1.5">
        <span className="text-[11px] font-semibold text-[#1D1D1F] px-2 min-w-[52px] text-center tabular-nums">
          {zoom.toFixed(2).replace(/\.?0+$/, '')}x
        </span>
        <button
          type="button"
          onClick={() => setZoom((z) => Math.max(MIN_ZOOM, +(z - 0.25).toFixed(2)))}
          className="p-1.5 rounded-full hover:bg-black/[0.05] text-[#1D1D1F] transition-colors"
          aria-label="Zoom out"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => setZoom((z) => Math.min(MAX_ZOOM, +(z + 0.25).toFixed(2)))}
          className="p-1.5 rounded-full hover:bg-black/[0.05] text-[#1D1D1F] transition-colors"
          aria-label="Zoom in"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <div className="w-px h-4 bg-black/10" />
        <button
          type="button"
          onClick={onClose}
          className="p-1.5 rounded-full hover:bg-black/[0.05] text-[#1D1D1F] transition-colors"
          aria-label="Close magnifier"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      <span hidden data-half={half} />
    </div>
  );
};
