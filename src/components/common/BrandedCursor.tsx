/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef, useState } from 'react';

type Variant = 'default' | 'hover' | 'text';

const HOVER_SELECTOR =
  'a, button, [role="button"], [role="tab"], input[type="checkbox"], input[type="radio"], input[type="range"], select, summary, .editable-text';
const TEXT_SELECTOR =
  'input:not([type="checkbox"]):not([type="radio"]):not([type="range"]):not([type="button"]):not([type="submit"]), textarea, [contenteditable="true"]';

function variantForElement(el: Element | null): Variant {
  if (!el) return 'default';
  if (el.closest(TEXT_SELECTOR)) return 'text';
  if (el.closest(HOVER_SELECTOR)) return 'hover';
  return 'default';
}

function variantForPoint(x: number, y: number): Variant {
  if (typeof document.elementFromPoint !== 'function') return 'default';
  return variantForElement(document.elementFromPoint(x, y));
}

function canEnableBrandedCursor(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  const fine = window.matchMedia('(pointer: fine)').matches;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const forcedColors =
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(forced-colors: active)').matches;
  return fine && !reduced && !forcedColors;
}

export function BrandedCursor() {
  const ringRef = useRef<HTMLDivElement>(null);
  const [enabled, setEnabled] = useState(false);
  const [variant, setVariant] = useState<Variant>('default');
  const [visible, setVisible] = useState(false);

  const stateRef = useRef({ variant: 'default' as Variant, pressed: false, visible: false });
  const posRef = useRef({
    mx: -100,
    my: -100,
    rx: -100,
    ry: -100,
    ringScale: 1,
  });

  useEffect(() => {
    if (!canEnableBrandedCursor()) return;
    setEnabled(true);
    document.body.classList.add('branded-cursor');

    // Re-evaluate if the environment changes (e.g. mouse plugged in, reduced-motion toggled).
    const fineMq = window.matchMedia('(pointer: fine)');
    const reducedMq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onCapabilityChange = () => {
      if (!canEnableBrandedCursor()) {
        setEnabled(false);
        document.body.classList.remove('branded-cursor', 'branded-cursor-text');
      }
    };
    fineMq.addEventListener?.('change', onCapabilityChange);
    reducedMq.addEventListener?.('change', onCapabilityChange);

    const syncVariant = (next: Variant) => {
      if (stateRef.current.variant === next) return;
      stateRef.current.variant = next;
      setVariant(next);
      document.body.classList.toggle('branded-cursor-text', next === 'text');
    };
    const syncPressed = (next: boolean) => {
      if (stateRef.current.pressed === next) return;
      stateRef.current.pressed = next;
    };
    const syncVisible = (next: boolean) => {
      if (stateRef.current.visible === next) return;
      stateRef.current.visible = next;
      setVisible(next);
    };

    let raf = 0;
    let last = performance.now();

    const apply = (now: number) => {
      const dt = Math.min(64, now - last);
      last = now;
      const p = posRef.current;
      const s = stateRef.current;

      // Frame-rate independent damping so the trailing ring feels identical on 60Hz/120Hz.
      // Slightly tighter than before since the ring is now the sole indicator (no center dot).
      const ringLambda = 22;
      const scaleLambda = 20;
      const ringT = 1 - Math.exp((-ringLambda * dt) / 1000);
      const scaleT = 1 - Math.exp((-scaleLambda * dt) / 1000);

      p.rx += (p.mx - p.rx) * ringT;
      p.ry += (p.my - p.ry) * ringT;

      const ringTarget = s.pressed ? 0.85 : 1;
      p.ringScale += (ringTarget - p.ringScale) * scaleT;

      // Snap when extremely close to avoid endless sub-pixel drift.
      if (Math.abs(p.mx - p.rx) < 0.05) p.rx = p.mx;
      if (Math.abs(p.my - p.ry) < 0.05) p.ry = p.my;

      const ringEl = ringRef.current;
      if (ringEl) {
        ringEl.style.transform =
          `translate3d(${p.rx}px, ${p.ry}px, 0) translate(-50%, -50%) scale(${p.ringScale.toFixed(4)})`;
      }
      raf = requestAnimationFrame(apply);
    };
    raf = requestAnimationFrame(apply);

    // Position updates only touch refs — no React re-render per mousemove.
    const onMove = (e: MouseEvent) => {
      // Snap the ring on re-entry so the sole indicator never slides in from off-screen.
      if (!stateRef.current.visible) {
        posRef.current.rx = e.clientX;
        posRef.current.ry = e.clientY;
      }
      posRef.current.mx = e.clientX;
      posRef.current.my = e.clientY;
      syncVisible(true);
    };
    // Variant only changes on element entry / focus / scroll — not on every pixel moved.
    const onOver = (e: MouseEvent) => {
      syncVariant(variantForElement(e.target instanceof Element ? e.target : null));
    };
    const onFocusIn = (e: FocusEvent) => {
      syncVariant(variantForElement(e.target instanceof Element ? e.target : null));
    };
    const onDown = (e: MouseEvent) => {
      // Touch-emulated mouse events must not resurrect the cursor.
      if (e.detail === 0 && e.clientX === 0 && e.clientY === 0) return;
      syncPressed(true);
    };
    const onUp = () => syncPressed(false);
    const onOut = (e: MouseEvent) => {
      // Leaving the window entirely (no element to enter).
      if (!e.relatedTarget) syncVisible(false);
    };
    const onBlur = () => {
      syncVisible(false);
      syncPressed(false);
    };
    const onVisibility = () => {
      if (document.hidden) {
        syncVisible(false);
        syncPressed(false);
      }
    };
    const onTouchStart = () => {
      syncVisible(false);
      syncPressed(false);
    };
    const onPointerDown = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') {
        syncVisible(false);
        syncPressed(false);
      }
    };
    // Scrolling moves content under a stationary cursor — refresh the variant.
    let scrollT = 0;
    const onScroll = () => {
      cancelAnimationFrame(scrollT);
      scrollT = requestAnimationFrame(() => {
        const { mx, my } = posRef.current;
        if (mx < 0) return;
        syncVariant(variantForPoint(mx, my));
      });
    };

    window.addEventListener('mousemove', onMove, { passive: true });
    window.addEventListener('mouseover', onOver, { passive: true });
    window.addEventListener('focusin', onFocusIn, { passive: true });
    window.addEventListener('mousedown', onDown);
    window.addEventListener('mouseup', onUp);
    window.addEventListener('mouseout', onOut, { passive: true });
    window.addEventListener('blur', onBlur);
    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('pointerdown', onPointerDown, { passive: true });
    document.addEventListener('visibilitychange', onVisibility);
    document.addEventListener('scroll', onScroll, { passive: true, capture: true });

    return () => {
      cancelAnimationFrame(raf);
      cancelAnimationFrame(scrollT);
      fineMq.removeEventListener?.('change', onCapabilityChange);
      reducedMq.removeEventListener?.('change', onCapabilityChange);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseover', onOver);
      window.removeEventListener('focusin', onFocusIn);
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('mouseout', onOut);
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('visibilitychange', onVisibility);
      document.removeEventListener('scroll', onScroll, { capture: true });
      document.body.classList.remove('branded-cursor', 'branded-cursor-text');
    };
  }, []);

  if (!enabled) return null;

  const ringSize = variant === 'text' ? 22 : variant === 'hover' ? 36 : 24;

  return (
    <div aria-hidden="true" className="branded-cursor-layer no-print">
      {/* Trailing ring (sole indicator) */}
      <div
        ref={ringRef}
        className="branded-cursor-ring"
        style={{
          width: ringSize,
          height: ringSize,
          opacity: visible ? (variant === 'hover' ? 1 : 0.9) : 0,
          backgroundColor: variant === 'hover' ? 'rgba(0, 113, 227, 0.08)' : 'transparent',
          borderColor: variant === 'hover' ? 'rgba(0, 113, 227, 0.7)' : 'rgba(29, 29, 31, 0.45)',
        }}
      />
    </div>
  );
}
