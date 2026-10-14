/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState } from 'react';
import { Search } from 'lucide-react';
import { ScreenMagnifier } from './ScreenMagnifier';

/**
 * Search glyph that shakes on press and opens a real screen magnifier
 * on double-click / double-tap.
 */
export const MagnifierSearchButton: React.FC = () => {
  const [shaking, setShaking] = useState(false);
  const [loupeOpen, setLoupeOpen] = useState(false);
  const shakeTimer = useRef<number>(0);
  const lastTap = useRef(0);

  const triggerShake = () => {
    setShaking(false);
    // Force reflow so rapid presses re-trigger the keyframe animation.
    requestAnimationFrame(() => {
      setShaking(true);
      window.clearTimeout(shakeTimer.current);
      shakeTimer.current = window.setTimeout(() => setShaking(false), 450);
    });
  };

  const focusSiblingInput = (el: HTMLElement | null) => {
    const input = el?.closest('.relative')?.querySelector('input');
    (input as HTMLInputElement | null)?.focus?.();
  };

  return (
    <>
      <button
        type="button"
        aria-label="Search. Double-click to open screen magnifier."
        title="Double-click for screen magnifier"
        onMouseDown={triggerShake}
        onTouchStart={triggerShake}
        onDoubleClick={(e) => {
          e.stopPropagation();
          triggerShake();
          // Let the shake read first, then pop the loupe.
          window.setTimeout(() => setLoupeOpen(true), 180);
        }}
        onClick={(e) => {
          triggerShake();
          const now = Date.now();
          // Double-tap support for touch + fast mouse double clicks.
          if (now - lastTap.current < 350) {
            window.setTimeout(() => setLoupeOpen(true), 180);
          }
          lastTap.current = now;
          focusSiblingInput(e.currentTarget);
        }}
        className="absolute left-1.5 top-1 p-1 rounded-full text-[#86868B] hover:text-[#0071E3] hover:bg-[#0071E3]/10 focus-visible:outline-2 focus-visible:outline-[#0071E3] transition-colors cursor-pointer"
      >
        <Search className={`w-3.5 h-3.5 ${shaking ? 'magnifier-shake' : ''}`} />
      </button>
      <ScreenMagnifier open={loupeOpen} onClose={() => setLoupeOpen(false)} />
    </>
  );
};
