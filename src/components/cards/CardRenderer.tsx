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
  Copy, 
  Trash2, 
  CopyPlus, 
  Send,
  MoreHorizontal
} from 'lucide-react';

interface Props {
  card: SnippetCard;
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

export const CardRenderer: React.FC<Props> = ({
  card,
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
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

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

  const cardTypeNames: Record<string, string> = {
    executive_summary: 'Executive Summary',
    kpi_metric: 'KPI Metric',
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
      onClick={() => onInspect(card.id)}
      className={`group relative bg-white rounded-2xl border p-5 sm:p-6 transition-all duration-200 cursor-pointer outline-none ${
        isInspected
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
          {/* Subtle Checkbox */}
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onToggleSelect(card.id)}
            aria-label={`Select ${card.title}`}
            className="w-3.5 h-3.5 rounded border-black/20 text-[#0071E3] focus:ring-0 focus:outline-none cursor-pointer"
          />

          <span className="text-[11px] font-medium tracking-wide uppercase text-[#86868B]">
            {cardTypeNames[card.type] || card.type}
          </span>
          {card.sourceRef && (
            <span className="text-[11px] text-[#86868B] hidden sm:inline">
              · Source Verified
            </span>
          )}
        </div>

        {/* Clean Hover Actions */}
        <div className="flex items-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
          {/* Quick Copy */}
          <button
            type="button"
            onClick={() => onCopyCard(card)}
            title="Copy card"
            aria-label="Copy card to clipboard"
            className="p-1.5 text-[#86868B] hover:text-[#1D1D1F] rounded-lg hover:bg-black/[0.04] transition-colors"
          >
            <Copy className="w-3.5 h-3.5" />
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
                  onClick={() => {
                    setShowMenu(false);
                    onDuplicate(card.id);
                  }}
                  className="w-full text-left px-3.5 py-1.5 hover:bg-black/[0.04] text-[#1D1D1F] flex items-center gap-2 transition-colors"
                >
                  <CopyPlus className="w-3.5 h-3.5 text-[#86868B]" />
                  <span>Duplicate</span>
                </button>

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

      {/* Specific Card Content */}
      {card.type === 'executive_summary' && (
        <ExecutiveSummaryCard
          card={card}
          onInspect={() => onInspect(card.id)}
          onUpdate={(up) => onUpdateCard({ ...card, ...up })}
        />
      )}
      {card.type === 'kpi_metric' && (
        <KpiMetricCard
          card={card}
          onInspect={() => onInspect(card.id)}
          onUpdate={(up) => onUpdateCard({ ...card, ...up })}
        />
      )}
      {card.type === 'risk_blocker' && (
        <RiskBlockerCard
          card={card}
          onInspect={() => onInspect(card.id)}
          onUpdate={(up) => onUpdateCard({ ...card, ...up })}
        />
      )}
      {card.type === 'next_steps' && (
        <NextStepsCard
          card={card}
          onInspect={() => onInspect(card.id)}
          onUpdate={(up) => onUpdateCard({ ...card, ...up })}
        />
      )}
      {card.type === 'milestone' && (
        <MilestoneCard
          card={card}
          onInspect={() => onInspect(card.id)}
          onUpdate={(up) => onUpdateCard({ ...card, ...up })}
        />
      )}
      {card.type === 'visual_update' && (
        <VisualUpdateCard
          card={card}
          onInspect={() => onInspect(card.id)}
          onUpdate={(up) => onUpdateCard({ ...card, ...up })}
        />
      )}
    </div>
  );
};
