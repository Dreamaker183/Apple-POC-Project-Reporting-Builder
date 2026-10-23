/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
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
import { useLanguage } from '../../lib/i18n/LanguageContext';

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
  const { t } = useLanguage();
  const [showMenu, setShowMenu] = useState(false);
  const [editing, setEditing] = useState(false);
  const [showSource, setShowSource] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const sourceLabel = card.sourceRef
    ? card.manuallyEdited
      ? 'Edited · source retained'
      : card.sourceRef.confidence === 'explicit'
        ? 'Source-backed'
        : card.sourceRef.confidence === 'inferred'
          ? 'Inferred from source'
          : 'Manually entered'
    : 'Manually entered';

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
    executive_summary: t('canvas.cardTypeExecutive'),
    kpi_metric: t('canvas.cardTypeMetric'),
    risk_blocker: t('canvas.cardTypeRisk'),
    next_steps: t('canvas.cardTypeNext'),
    milestone: t('canvas.cardTypeMilestone'),
    visual_update: t('canvas.cardTypeVisual'),
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
      className={`group relative bg-white rounded-2xl border p-4 sm:p-5 md:p-6 transition-all duration-200 cursor-pointer outline-none ${
        editing
          ? 'border-[#0071E3] ring-2 ring-[#0071E3]/20 shadow-[0_6px_24px_rgba(0,113,227,0.08)]'
          : isInspected
          ? 'border-[#0071E3]/60 ring-1 ring-[#0071E3]/30 bg-blue-50/[0.12] shadow-[0_4px_20px_rgba(0,113,227,0.10)]'
          : isSelected
          ? 'border-[#0071E3]/50 ring-1 ring-[#0071E3]/20 bg-blue-50/[0.12] shadow-xs'
          : 'border-black/[0.06] hover:border-black/[0.12] shadow-[0_1px_3px_rgba(0,0,0,0.02)] hover:shadow-[0_4px_20px_rgba(0,0,0,0.05)]'
      }`}
    >
      {/* Top Quiet Header */}
      <div 
        className="flex items-center justify-between pb-3 mb-3 border-b border-black/[0.04] no-print gap-2"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 flex-wrap">
          {/* Drag handle: immediate drag on press; long-press anywhere else also arms dragging */}
          {dragHandle && (
            <button
              type="button"
              aria-label={t('card.dragCard', { title: card.title })}
              title={t('card.dragHint')}
              onPointerDown={dragHandle.onPointerDown}
              className={`p-1 -ml-1 rounded-lg transition-colors touch-none cursor-grab active:cursor-grabbing min-w-[28px] min-h-[28px] flex items-center justify-center ${
                dragHandle.active
                  ? 'text-[#0071E3] bg-[#0071E3]/10 opacity-100'
                  : 'text-[#86868B] hover:text-[#1D1D1F] hover:bg-black/[0.04] opacity-70 sm:opacity-0 sm:group-hover:opacity-100 focus-visible:opacity-100'
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
            aria-label={t('card.selectCard', { title: card.title })}
            className="w-3.5 h-3.5 rounded border-black/20 text-[#0071E3] focus:ring-0 focus:outline-none cursor-pointer"
          />

          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wide ${
            card.type === 'executive_summary' ? 'bg-[#0071E3]/10 text-[#0071E3]' :
            card.type === 'kpi_metric' ? 'bg-emerald-500/10 text-emerald-700' :
            card.type === 'risk_blocker' ? (card.isBlocker ? 'bg-rose-500/10 text-rose-700' : 'bg-amber-500/10 text-amber-800') :
            card.type === 'next_steps' ? 'bg-purple-500/10 text-purple-700' :
            card.type === 'milestone' ? 'bg-sky-500/10 text-sky-700' :
            'bg-black/[0.05] text-[#1D1D1F]'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${
              card.type === 'executive_summary' ? 'bg-[#0071E3]' :
              card.type === 'kpi_metric' ? 'bg-emerald-500' :
              card.type === 'risk_blocker' ? (card.isBlocker ? 'bg-rose-500' : 'bg-amber-500') :
              card.type === 'next_steps' ? 'bg-purple-500' :
              card.type === 'milestone' ? 'bg-sky-500' :
              'bg-[#86868B]'
            }`} />
            {cardTypeNames[card.type] || card.type}
          </span>
          <span className="text-[11px] text-[#86868B] hidden sm:inline">
            {sourceLabel}
          </span>
        </div>

        {/* Clean Hover Actions */}
        <div className="flex items-center gap-0.5 sm:gap-1 opacity-90 sm:opacity-70 sm:group-hover:opacity-100 transition-opacity shrink-0">
          <button type="button" onClick={() => setEditing(!editing)} aria-label={t('card.editDetails')} title={t('card.editTitle')} className="p-1.5 text-[#6E6E73] hover:bg-black/[0.04] rounded-lg min-w-[30px] min-h-[30px] flex items-center justify-center"><Pencil className="w-3.5 h-3.5" /></button>
          {card.sourceRef && <button type="button" onClick={() => setShowSource(!showSource)} aria-label={t('card.showSource')} aria-expanded={showSource} className="p-1.5 text-[#6E6E73] hover:bg-black/[0.04] rounded-lg min-w-[30px] min-h-[30px] flex items-center justify-center"><Link2 className="w-3.5 h-3.5" /></button>}
          {/* Quick Duplicate (immediately appends a copy below) */}
          <button
            type="button"
            onClick={() => onCopyCard(card)}
            title={t('card.duplicate')}
            aria-label={t('card.duplicate')}
            className="p-1.5 text-[#86868B] hover:text-[#1D1D1F] rounded-lg hover:bg-black/[0.04] transition-colors"
          >
            <CopyPlus className="w-3.5 h-3.5" />
          </button>

          {/* More Menu (•••) */}
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setShowMenu((prev) => !prev)}
              title={t('card.options')}
              aria-label={t('card.options')}
              className="p-1.5 text-[#86868B] hover:text-[#1D1D1F] rounded-lg hover:bg-black/[0.04] transition-colors"
            >
              <MoreHorizontal className="w-3.5 h-3.5" />
            </button>

            <AnimatePresence>
            {showMenu && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -4 }}
                transition={{ duration: 0.14, ease: [0.32, 0.72, 0, 1] }}
                className="absolute right-0 top-8 w-44 bg-white/95 backdrop-blur-xl rounded-xl border border-black/[0.08] shadow-[0_8px_30px_rgba(0,0,0,0.12)] py-1.5 z-30 text-xs origin-top-right"
              >
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
                    <span>{t('card.sendToChat')}</span>
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
                  <span>{t('card.moveUp')}</span>
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
                  <span>{t('card.moveDown')}</span>
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
                  <span>{t('card.delete')}</span>
                </button>
              </motion.div>
            )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {showSource && card.sourceRef && (
        <div className="no-print mb-4 rounded-xl bg-[#F5F5F7] p-3 text-[12px] leading-relaxed text-[#6E6E73]">
          <span className="block text-[#1D1D1F] font-medium mb-1">{t('card.sourceRef')}</span>
          <p>{card.sourceRef.passageText}</p>
          <p className="mt-2">Reference confidence: {card.sourceRef.confidence}</p>
          {card.manuallyEdited && <p>Edited · source retained</p>}
          {card.sourceRef.notes && <p className="mt-1">Notes: {card.sourceRef.notes}</p>}
          <p className="mt-1">Source references provide provenance; factual accuracy has not been independently verified.</p>
        </div>
      )}
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
          <span className="text-[11px] text-[#86868B]">{t('card.editingHint')}</span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              stopEditing();
            }}
            className="flex items-center gap-1 px-3 py-1.5 bg-[#0071E3] hover:bg-[#0077ED] text-white text-xs font-medium rounded-full transition-colors"
          >
            <Check className="w-3.5 h-3.5" />
            <span>{t('card.done')}</span>
          </button>
        </div>
      )}
    </div>
  );
};
