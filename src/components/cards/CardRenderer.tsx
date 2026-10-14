/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { SnippetCard } from '../../types/report';
import { ExecutiveSummaryCard } from './ExecutiveSummaryCard';
import { KpiMetricCard } from './KpiMetricCard';
import { RiskBlockerCard } from './RiskBlockerCard';
import { NextStepsCard } from './NextStepsCard';
import { MilestoneCard } from './MilestoneCard';
import { VisualUpdateCard } from './VisualUpdateCard';
import { 
  ChevronUp, 
  ChevronDown, 
  Trash2, 
  CopyPlus, 
  Send,
  MoreHorizontal,
  Check,
  Pencil,
  Link2,
  GripVertical
} from 'lucide-react';

interface DragHandleProps {
  onPointerDown: (e: React.PointerEvent) => void;
  active: boolean;
}

interface Props {
  card: SnippetCard;
  isSelected: boolean;
  isInspected: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
  dragHandle?: DragHandleProps;
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

export const CardRenderer: React.FC<Props> = ({
  card,
  isSelected,
  isInspected,
  canMoveUp,
  canMoveDown,
  dragHandle,
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
  const [showMenu, setShowMenu] = useState(false);
  const [editing, setEditing] = useState(false);
  const [showSource, setShowSource] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const escape = (e: KeyboardEvent) => { if (e.key === 'Escape') { setShowMenu(false); setShowSource(false); } };
    document.addEventListener('keydown', escape);
    return () => document.removeEventListener('keydown', escape);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showMenu]);

  // Clicking the card body text enters inline edit mode.
  // Interactive elements (buttons, inputs, images, menus) keep their own behavior.
  const handleBodyClick = (e: React.MouseEvent) => {
    if (!editing) onInspect(card.id);
  };

  const stopEditing = () => setEditing(false);

  const cardTypeNames: Record<string, string> = {
    executive_summary: 'Executive Summary',
    kpi_metric: 'Metric',
    risk_blocker: 'Risk or Blocker',
    next_steps: 'Next Steps',
    milestone: 'Milestone',
    visual_update: 'Visual Asset',
  };

  return (
    <div
      tabIndex={0}
      role="article"
      aria-label={`${card.title} card`}
      onClick={() => {
        if (!editing) onInspect(card.id);
      }}
      onKeyDown={(e) => {
        if ((e.altKey && e.key === 'ArrowUp') || (e.altKey && e.key === 'ArrowDown')) {
          e.preventDefault();
          if (e.key === 'ArrowUp' && canMoveUp) onMoveUp(card.id);
          if (e.key === 'ArrowDown' && canMoveDown) onMoveDown(card.id);
        }
        if (e.key === 'Escape') {
          setEditing(false);
          setShowMenu(false);
        }
      }}
      className={`group relative bg-white rounded-2xl border p-5 sm:p-6 transition-all duration-200 cursor-pointer outline-none ${
        editing
          ? 'border-[#0071E3] ring-2 ring-[#0071E3]/20 shadow-[0_6px_24px_rgba(0,113,227,0.08)]'
          : isSelected
          ? 'border-[#0071E3]/50 ring-1 ring-[#0071E3]/20 bg-blue-50/[0.12] shadow-xs'
          : 'border-black/[0.06] hover:border-black/[0.12] shadow-[0_1px_3px_rgba(0,0,0,0.02)] hover:shadow-[0_4px_20px_rgba(0,0,0,0.05)]'
      }`}
    >
      {/* Top Quiet Header */}
      <div 
        className="flex items-center justify-between pb-3 mb-3 border-b border-black/[0.04] no-print"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2.5">
          {/* Drag handle: immediate drag on press; long-press anywhere else also arms dragging */}
          {dragHandle && (
            <button
              type="button"
              aria-label={`Drag ${card.title} to reorder`}
              title="Drag to reorder (or press & hold the card)"
              onPointerDown={dragHandle.onPointerDown}
              className={`p-1 -ml-1.5 rounded-lg transition-colors touch-none cursor-grab active:cursor-grabbing ${
                dragHandle.active
                  ? 'text-[#0071E3] bg-[#0071E3]/10'
                  : 'text-[#86868B] hover:text-[#1D1D1F] hover:bg-black/[0.04] opacity-0 group-hover:opacity-100 focus-visible:opacity-100'
              }`}
            >
              <GripVertical className="w-4 h-4" />
            </button>
          )}
          {/* Subtle Checkbox */}
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onToggleSelect(card.id)}
            aria-label={`Select ${card.title}`}
            className="w-3.5 h-3.5 rounded border-black/20 text-[#0071E3] focus:ring-0 focus:outline-none cursor-pointer"
          />

          <span className="text-[11px] font-semibold tracking-wider uppercase text-[#6E6E73]">
            {cardTypeNames[card.type] || card.type}
          </span>
          {card.sourceRef && (
            <span className="text-[11px] text-[#86868B] hidden sm:inline">
              · Source verified
            </span>
          )}
          {card.type === 'visual_update' && card.altText && card.altText.length > 5 && (
            <span className="text-[11px] text-emerald-700 hidden sm:inline">
              · WCAG Alt Text
            </span>
          )}
        </div>

        {/* Clean Hover Actions */}
        <div className="flex items-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
          <button type="button" onClick={() => setEditing(!editing)} aria-label="Edit card details" title="Edit details" className="p-1.5 text-[#6E6E73] hover:bg-black/[0.04] rounded-lg"><Pencil className="w-3.5 h-3.5" /></button>
          {card.sourceRef && <button type="button" onClick={() => setShowSource(!showSource)} aria-label="Show source reference" aria-expanded={showSource} className="p-1.5 text-[#6E6E73] hover:bg-black/[0.04] rounded-lg"><Link2 className="w-3.5 h-3.5" /></button>}
          {/* Quick Duplicate (immediately appends a copy below) */}
          <button
            type="button"
            onClick={() => onCopyCard(card)}
            title="Duplicate card"
            aria-label="Duplicate card"
            className="p-1.5 text-[#86868B] hover:text-[#1D1D1F] rounded-lg hover:bg-black/[0.04] transition-colors"
          >
            <CopyPlus className="w-3.5 h-3.5" />
          </button>

          {/* More Menu (•••) */}
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setShowMenu((prev) => !prev)}
              title="Card options"
              aria-label="Card options"
              className="p-1.5 text-[#86868B] hover:text-[#1D1D1F] rounded-lg hover:bg-black/[0.04] transition-colors"
            >
              <MoreHorizontal className="w-3.5 h-3.5" />
            </button>

            {showMenu && (
              <div className="absolute right-0 top-8 w-44 bg-white/95 backdrop-blur-xl rounded-xl border border-black/[0.08] shadow-[0_8px_30px_rgba(0,0,0,0.12)] py-1.5 z-30 text-xs">
                {onShareCard && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowMenu(false);
                      onShareCard(card);
                    }}
                    className="w-full text-left px-3.5 py-1.5 hover:bg-black/[0.04] text-[#1D1D1F] flex items-center gap-2 transition-colors"
                  >
                    <Send className="w-3.5 h-3.5 text-[#0071E3]" />
                    <span>Send to Chat / Email</span>
                  </button>
                )}

                <button
                  type="button"
                  disabled={!canMoveUp}
                  onClick={() => {
                    setShowMenu(false);
                    onMoveUp(card.id);
                  }}
                  className="w-full text-left px-3.5 py-1.5 hover:bg-black/[0.04] text-[#1D1D1F] disabled:opacity-40 flex items-center gap-2 transition-colors"
                >
                  <ChevronUp className="w-3.5 h-3.5 text-[#86868B]" />
                  <span>Move Up</span>
                </button>

                <button
                  type="button"
                  disabled={!canMoveDown}
                  onClick={() => {
                    setShowMenu(false);
                    onMoveDown(card.id);
                  }}
                  className="w-full text-left px-3.5 py-1.5 hover:bg-black/[0.04] text-[#1D1D1F] disabled:opacity-40 flex items-center gap-2 transition-colors"
                >
                  <ChevronDown className="w-3.5 h-3.5 text-[#86868B]" />
                  <span>Move Down</span>
                </button>

                <div className="my-1 border-t border-black/[0.06]" />

                <button
                  type="button"
                  onClick={() => {
                    setShowMenu(false);
                    onDelete(card.id);
                  }}
                  className="w-full text-left px-3.5 py-1.5 hover:bg-rose-50 text-rose-600 flex items-center gap-2 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {showSource && card.sourceRef && <div className="no-print mb-4 rounded-xl bg-[#F5F5F7] p-3 text-[12px] leading-relaxed text-[#6E6E73]"><span className="block text-[#1D1D1F] font-medium mb-1">Source reference</span>{card.sourceRef.passageText}</div>}
      {/* Specific Card Content (click text to edit inline) */}
      <div onClick={handleBodyClick} className={editing ? 'cursor-text' : ''}>
      {card.type === 'executive_summary' && (
        <ExecutiveSummaryCard
          card={card}
          onInspect={() => onInspect(card.id)}
          isInlineEditing={editing}
          onUpdate={(up) => onUpdateCard({ ...card, ...up })}
        />
      )}
      {card.type === 'kpi_metric' && (
        <KpiMetricCard
          card={card}
          onInspect={() => onInspect(card.id)}
          isInlineEditing={editing}
          onUpdate={(up) => onUpdateCard({ ...card, ...up })}
        />
      )}
      {card.type === 'risk_blocker' && (
        <RiskBlockerCard
          card={card}
          onInspect={() => onInspect(card.id)}
          isInlineEditing={editing}
          onUpdate={(up) => onUpdateCard({ ...card, ...up })}
        />
      )}
      {card.type === 'next_steps' && (
        <NextStepsCard
          card={card}
          onInspect={() => onInspect(card.id)}
          isInlineEditing={editing}
          onUpdate={(up) => onUpdateCard({ ...card, ...up })}
        />
      )}
      {card.type === 'milestone' && (
        <MilestoneCard
          card={card}
          onInspect={() => onInspect(card.id)}
          isInlineEditing={editing}
          onUpdate={(up) => onUpdateCard({ ...card, ...up })}
        />
      )}
      {card.type === 'visual_update' && (
        <VisualUpdateCard
          card={card}
          onInspect={() => onInspect(card.id)}
          isInlineEditing={editing}
          onUpdate={(up) => onUpdateCard({ ...card, ...up })}
        />
      )}
      </div>

      {/* Done editing bar */}
      {editing && (
        <div className="no-print mt-3 pt-3 border-t border-black/[0.06] flex items-center justify-between">
          <span className="text-[11px] text-[#86868B]">Editing — click Done or press Esc</span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              stopEditing();
            }}
            className="flex items-center gap-1 px-3 py-1.5 bg-[#0071E3] hover:bg-[#0077ED] text-white text-xs font-medium rounded-full transition-colors"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Done</span>
          </button>
        </div>
      )}
    </div>
  );
};
