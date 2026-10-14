/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { Reorder, motion, useDragControls } from 'framer-motion';
import { GripVertical } from 'lucide-react';
import { SnippetCard } from '../../types/report';
import { CardRenderer } from '../cards/CardRenderer';

const HOLD_DELAY_MS = 450;
const MOVE_CANCEL_PX = 12;

type HoldPhase = 'idle' | 'holding' | 'armed' | 'dragging';

interface Props {
  card: SnippetCard;
  index: number;
  canReorder: boolean;
  isSelected: boolean;
  isInspected: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onToggleSelect: (id: string) => void;
  onInspect: (id: string) => void;
  onMoveUp: (id: string) => void;
  onMoveDown: (id: string) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onCopyCard: (card: SnippetCard) => void;
  onShareCard?: (card: SnippetCard) => void;
  onUpdateCard: (updated: SnippetCard) => void;
}

function isInteractiveTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return !!target.closest(
    'button, input, textarea, select, a, [contenteditable="true"], img, video, [data-no-drag]'
  );
}

/**
 * A report card that reorders via press-and-hold drag (mouse + touch) or the
 * grip handle for instant dragging. Quick taps still select/inspect as before.
 */
export const SortableCard: React.FC<Props> = ({
  card,
  index,
  canReorder,
  isSelected,
  isInspected,
  canMoveUp,
  canMoveDown,
  onToggleSelect,
  onInspect,
  onMoveUp,
  onMoveDown,
  onDuplicate,
  onDelete,
  onCopyCard,
  onShareCard,
  onUpdateCard,
}) => {
  const controls = useDragControls();
  const [holdPhase, setHoldPhase] = useState<HoldPhase>('idle');
  const phaseRef = useRef<HoldPhase>('idle');
  const holdTimer = useRef<number | undefined>(undefined);
  const startPos = useRef({ x: 0, y: 0 });
  const dragActiveRef = useRef(false);
  const suppressClickRef = useRef(false);
  const itemRef = useRef<HTMLDivElement | null>(null);

  const setPhase = (phase: HoldPhase) => {
    phaseRef.current = phase;
    setHoldPhase(phase);
  };

  const clearHoldTimer = () => {
    if (holdTimer.current !== undefined) {
      window.clearTimeout(holdTimer.current);
      holdTimer.current = undefined;
    }
  };

  // While armed/dragging on touch, block the scroll gesture so the drag wins.
  // (touch-action is evaluated at touchstart, so flipping it mid-gesture is
  // not enough — this native non-passive listener is what stops scrolling.)
  useEffect(() => {
    const el = itemRef.current;
    if (!el) return;
    const onTouchMove = (e: TouchEvent) => {
      if (phaseRef.current === 'armed' || phaseRef.current === 'dragging') {
        if (e.cancelable) e.preventDefault();
      }
    };
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    return () => el.removeEventListener('touchmove', onTouchMove);
  }, []);

  useEffect(() => clearHoldTimer, []);

  const handleItemPointerDown = (e: React.PointerEvent) => {
    if (!canReorder) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    if (isInteractiveTarget(e.target)) return;
    startPos.current = { x: e.clientX, y: e.clientY };
    clearHoldTimer();
    setPhase('holding');
    holdTimer.current = window.setTimeout(() => {
      holdTimer.current = undefined;
      if (phaseRef.current !== 'holding') return;
      setPhase('armed');
      try {
        navigator.vibrate?.(12);
      } catch {
        /* haptics are best-effort */
      }
    }, HOLD_DELAY_MS);
  };

  const handleItemPointerMove = (e: React.PointerEvent) => {
    const phase = phaseRef.current;
    if (phase === 'holding') {
      // Moved before the hold elapsed: it was a scroll/swipe, not a hold.
      const dx = e.clientX - startPos.current.x;
      const dy = e.clientY - startPos.current.y;
      if (Math.hypot(dx, dy) > MOVE_CANCEL_PX) {
        clearHoldTimer();
        setPhase('idle');
      }
    } else if (phase === 'armed' && !dragActiveRef.current) {
      dragActiveRef.current = true;
      setPhase('dragging');
      controls.start(e);
    }
  };

  const handlePointerEnd = () => {
    clearHoldTimer();
    if (phaseRef.current === 'holding' || phaseRef.current === 'armed') {
      setPhase('idle');
    }
    // When dragging, onDragEnd performs the reset.
  };

  const handlePointerCancel = () => {
    clearHoldTimer();
    dragActiveRef.current = false;
    if (phaseRef.current !== 'dragging') setPhase('idle');
  };

  const handleGripPointerDown = (e: React.PointerEvent) => {
    if (!canReorder) return;
    e.stopPropagation();
    clearHoldTimer();
    dragActiveRef.current = true;
    suppressClickRef.current = true;
    setPhase('dragging');
    controls.start(e);
  };

  const isArmed = holdPhase === 'armed' || holdPhase === 'dragging';

  return (
    <Reorder.Item
      ref={itemRef}
      as="div"
      value={card}
      dragListener={false}
      dragControls={controls}
      onPointerDown={handleItemPointerDown}
      onPointerMove={handleItemPointerMove}
      onPointerUp={handlePointerEnd}
      onPointerCancel={handlePointerCancel}
      onDragStart={() => {
        dragActiveRef.current = true;
        suppressClickRef.current = true;
        setPhase('dragging');
      }}
      onDragEnd={() => {
        dragActiveRef.current = false;
        setPhase('idle');
        window.setTimeout(() => {
          suppressClickRef.current = false;
        }, 120);
      }}
      onClickCapture={(e) => {
        // A drag release fires a click — swallow it so the card isn't
        // (de)selected or inspected as a side effect of reordering.
        if (suppressClickRef.current) {
          e.stopPropagation();
          e.preventDefault();
          suppressClickRef.current = false;
        }
      }}
      onContextMenu={(e) => {
        if (phaseRef.current !== 'idle') e.preventDefault();
      }}
      initial={{ opacity: 0, y: 14 }}
      animate={{
        opacity: 1,
        y: 0,
        scale: holdPhase === 'holding' ? 0.995 : isArmed ? 1.01 : 1,
      }}
      exit={{ opacity: 0, scale: 0.98, transition: { duration: 0.15, ease: 'easeOut' } }}
      transition={{
        layout: { duration: 0.2, ease: 'easeOut' },
        duration: 0.2,
        ease: 'easeOut',
        delay: Math.min(index * 0.02, 0.12),
      }}
      whileDrag={{ scale: 1.02, boxShadow: '0 16px 40px rgba(0,0,0,0.16)' }}
      className={`relative rounded-2xl ${
        holdPhase === 'holding' || holdPhase === 'armed' ? 'select-none' : ''
      } ${
        isArmed
          ? 'ring-2 ring-[#0071E3]/50 shadow-[0_12px_32px_rgba(0,113,227,0.15)]'
          : ''
      } ${holdPhase === 'dragging' || holdPhase === 'armed' ? 'cursor-grabbing z-30' : ''}`}
      style={{ touchAction: 'pan-y' }}
    >
      {/* Hold-to-drag feedback pill */}
      {(holdPhase === 'holding' || holdPhase === 'armed') && canReorder && (
        <div
          aria-hidden="true"
          className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 pl-2.5 pr-3 py-1 rounded-full bg-[#1D1D1F] text-white text-[11px] font-medium shadow-lg whitespace-nowrap pointer-events-none"
        >
          <GripVertical className="w-3 h-3 text-white/70" />
          <span>{holdPhase === 'holding' ? 'Keep holding…' : 'Drag to reorder'}</span>
          {holdPhase === 'holding' && (
            <span className="ml-1 block w-10 h-1 rounded-full bg-white/20 overflow-hidden">
              <motion.span
                className="block h-full w-full origin-left bg-white"
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: HOLD_DELAY_MS / 1000, ease: 'linear' }}
              />
            </span>
          )}
        </div>
      )}

      <CardRenderer
        card={card}
        isSelected={isSelected}
        isInspected={isInspected}
        canMoveUp={canMoveUp}
        canMoveDown={canMoveDown}
        dragHandle={
          canReorder
            ? { onPointerDown: handleGripPointerDown, active: isArmed }
            : undefined
        }
        onToggleSelect={onToggleSelect}
        onInspect={onInspect}
        onMoveUp={onMoveUp}
        onMoveDown={onMoveDown}
        onDuplicate={onDuplicate}
        onDelete={onDelete}
        onCopyCard={onCopyCard}
        onShareCard={onShareCard}
        onUpdateCard={onUpdateCard}
      />
    </Reorder.Item>
  );
};
