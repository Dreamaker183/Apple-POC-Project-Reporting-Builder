/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { 
  Sparkles, 
  Printer, 
  Check, 
  Clock, 
  Undo2, 
  Trash2,
  GitCompare,
  Compass,
  Keyboard,
  Share2,
  MoreHorizontal,
  ChevronDown
} from 'lucide-react';

interface Props {
  isDirty: boolean;
  lastSavedAt: string;
  canUndo: boolean;
  onUndo: () => void;
  onLoadSample: () => void;
  onOpenExport: () => void;
  onOpenMessageTools: () => void;
  onPrint: () => void;
  onReset: () => void;
  onOpenGuidedTour: () => void;
  onOpenSnapshotDiff: () => void;
  onOpenShortcuts: () => void;
}

export const Header: React.FC<Props> = ({
  isDirty,
  lastSavedAt,
  canUndo,
  onUndo,
  onLoadSample,
  onOpenExport,
  onOpenMessageTools,
  onPrint,
  onReset,
  onOpenGuidedTour,
  onOpenSnapshotDiff,
  onOpenShortcuts,
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };
    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showMenu]);

  const formatSavedTime = (iso: string) => {
    try {
      const date = new Date(iso);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return 'just now';
    }
  };

  return (
    <header className="h-14 bg-white/80 backdrop-blur-xl border-b border-black/[0.06] px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 no-print">
      {/* Brand & Identity */}
      <div className="flex items-center gap-3">
        <div className="w-7 h-7 rounded-lg bg-[#1D1D1F] text-white flex items-center justify-center font-semibold text-[11px] tracking-tight shadow-xs">
          RB
        </div>
        
        <div className="flex items-center gap-2">
          <h1 className="text-sm font-semibold tracking-tight text-[#1D1D1F]">
            Project Reporting Builder
          </h1>
          <span className="text-[#86868B] text-xs">/</span>
          <div className="flex items-center gap-1.5 text-xs text-[#86868B]">
            {isDirty ? (
              <span className="flex items-center gap-1 text-amber-600 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                Unsaved
              </span>
            ) : (
              <span className="flex items-center gap-1 text-[#86868B]">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Saved ({formatSavedTime(lastSavedAt)})
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Clean Right Actions */}
      <div className="flex items-center gap-2">
        {/* Undo Action (Subtle) */}
        {canUndo && (
          <button
            type="button"
            onClick={onUndo}
            className="flex items-center gap-1 px-2.5 py-1 text-xs text-[#86868B] hover:text-[#1D1D1F] rounded-md hover:bg-black/[0.04] transition-colors"
            title="Undo (⌘Z)"
            aria-label="Undo action"
          >
            <Undo2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Undo</span>
          </button>
        )}

        {/* Guided Tour Trigger */}
        <button
          type="button"
          onClick={onOpenGuidedTour}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#1D1D1F] bg-black/[0.04] hover:bg-black/[0.08] rounded-full transition-colors active:scale-[0.98]"
          title="Interactive walkthrough"
        >
          <Compass className="w-3.5 h-3.5 text-[#0071E3]" />
          <span>Tour</span>
        </button>

        {/* Secondary Overflow Actions (•••) */}
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setShowMenu((prev) => !prev)}
            className="p-1.5 text-[#86868B] hover:text-[#1D1D1F] rounded-md hover:bg-black/[0.04] transition-colors flex items-center justify-center"
            title="More actions"
            aria-label="More actions"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>

          {showMenu && (
            <div className="absolute right-0 top-9 w-52 bg-white/95 backdrop-blur-xl rounded-xl border border-black/[0.08] shadow-[0_8px_30px_rgba(0,0,0,0.12)] py-1.5 z-40 text-xs">
              <button
                type="button"
                onClick={() => {
                  setShowMenu(false);
                  onOpenSnapshotDiff();
                }}
                className="w-full text-left px-3.5 py-2 hover:bg-black/[0.04] text-[#1D1D1F] flex items-center gap-2.5 transition-colors"
              >
                <GitCompare className="w-3.5 h-3.5 text-[#86868B]" />
                <span>What's Changed?</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowMenu(false);
                  onLoadSample();
                }}
                className="w-full text-left px-3.5 py-2 hover:bg-black/[0.04] text-[#1D1D1F] flex items-center gap-2.5 transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#0071E3]" />
                <span>Load Sample Project</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowMenu(false);
                  onPrint();
                }}
                className="w-full text-left px-3.5 py-2 hover:bg-black/[0.04] text-[#1D1D1F] flex items-center gap-2.5 transition-colors"
              >
                <Printer className="w-3.5 h-3.5 text-[#86868B]" />
                <span>Print / PDF</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowMenu(false);
                  onOpenShortcuts();
                }}
                className="w-full text-left px-3.5 py-2 hover:bg-black/[0.04] text-[#1D1D1F] flex items-center gap-2.5 transition-colors"
              >
                <Keyboard className="w-3.5 h-3.5 text-[#86868B]" />
                <span>Shortcuts (Press ?)</span>
              </button>

              <div className="my-1 border-t border-black/[0.06]" />

              <button
                type="button"
                onClick={() => {
                  setShowMenu(false);
                  onReset();
                }}
                className="w-full text-left px-3.5 py-2 hover:bg-rose-50 text-rose-600 flex items-center gap-2.5 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Reset Draft</span>
              </button>
            </div>
          )}
        </div>

        {/* Primary Action: Export & Share */}
        <button
          type="button"
          onClick={onOpenExport}
          className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#0071E3] hover:bg-[#0077ED] text-white text-xs font-medium rounded-full shadow-[0_1px_2px_rgba(0,113,227,0.3)] transition-all active:scale-[0.98]"
        >
          <Share2 className="w-3.5 h-3.5" />
          <span>Export & Share</span>
        </button>
      </div>
    </header>
  );
};
