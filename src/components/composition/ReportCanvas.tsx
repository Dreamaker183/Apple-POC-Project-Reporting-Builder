/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SnippetCard, CardType, MetricInput, ImageAssetInput } from '../../types/report';
import { CardRenderer } from '../cards/CardRenderer';
import { ChatComposer } from '../composer/ChatComposer';
import { 
  Plus, 
  Trash2, 
  Copy, 
  CheckSquare, 
  Square, 
  Calendar, 
  Layers, 
  Search,
  Send,
  X
} from 'lucide-react';

interface Props {
  title: string;
  reportingPeriod: string;
  cards: SnippetCard[];
  selectedCardIds: Set<string>;
  inspectedCardId: string | null;
  onUpdateTitle: (title: string) => void;
  onUpdatePeriod: (period: string) => void;
  onToggleSelectCard: (id: string) => void;
  onSelectAllCards: () => void;
  onDeselectAllCards: () => void;
  onInspectCard: (id: string) => void;
  onMoveCard: (id: string, direction: 'up' | 'down') => void;
  onDuplicateCard: (id: string) => void;
  onDeleteCard: (id: string) => void;
  onDeleteSelectedCards: () => void;
  onCopyCard: (card: SnippetCard) => void;
  onCopySelectedCards: () => void;
  onOpenMessageToolsForSelected?: () => void;
  onShareCard?: (card: SnippetCard) => void;
  onUpdateCard: (updated: SnippetCard) => void;
  onAddCard: (type: CardType) => void;
  rawNotes: string;
  metrics: MetricInput[];
  images: ImageAssetInput[];
  highlightPassage?: { start?: number; end?: number; text?: string } | null;
  onNotesChange: (notes: string) => void;
  onMetricsChange: (metrics: MetricInput[]) => void;
  onImagesChange: (images: ImageAssetInput[]) => void;
  onGenerateReport: () => void;
  onNotify?: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const ReportCanvas: React.FC<Props> = ({
  title,
  reportingPeriod,
  cards,
  selectedCardIds,
  inspectedCardId,
  onUpdateTitle,
  onUpdatePeriod,
  onToggleSelectCard,
  onSelectAllCards,
  onDeselectAllCards,
  onInspectCard,
  onMoveCard,
  onDuplicateCard,
  onDeleteCard,
  onDeleteSelectedCards,
  onCopyCard,
  onCopySelectedCards,
  onOpenMessageToolsForSelected,
  onShareCard,
  onUpdateCard,
  onAddCard,
  rawNotes,
  metrics,
  images,
  highlightPassage,
  onNotesChange,
  onMetricsChange,
  onImagesChange,
  onGenerateReport,
  onNotify,
}) => {
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [filterType, setFilterType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const addMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (addMenuRef.current && !addMenuRef.current.contains(e.target as Node)) {
        setShowAddMenu(false);
      }
    };
    if (showAddMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showAddMenu]);

  const cardTypeOptions: Array<{ type: CardType; label: string }> = [
    { type: 'executive_summary', label: 'Executive Summary' },
    { type: 'kpi_metric', label: 'KPI Metric' },
    { type: 'risk_blocker', label: 'Risk or Blocker' },
    { type: 'next_steps', label: 'Next Steps & Commitments' },
    { type: 'milestone', label: 'Milestone' },
    { type: 'visual_update', label: 'Visual Update' },
  ];

  // Category counts
  const counts = useMemo(() => {
    return {
      all: cards.length,
      kpi_metric: cards.filter(c => c.type === 'kpi_metric').length,
      risk_blocker: cards.filter(c => c.type === 'risk_blocker').length,
      next_steps: cards.filter(c => c.type === 'next_steps').length,
      visual_update: cards.filter(c => c.type === 'visual_update').length,
    };
  }, [cards]);

  // Filtered cards based on tab and search
  const filteredCards = useMemo(() => {
    return cards.filter(card => {
      if (filterType !== 'all' && card.type !== filterType) {
        return false;
      }
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = card.title.toLowerCase().includes(query);
        const matchesType = card.type.toLowerCase().includes(query);
        return matchesTitle || matchesType;
      }
      return true;
    });
  }, [cards, filterType, searchQuery]);

  const allSelected = cards.length > 0 && selectedCardIds.size === cards.length;
  const someSelected = selectedCardIds.size > 0;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-8 max-w-3xl mx-auto w-full space-y-6">
      {/* Document Header (Minimalist Apple Document Style) */}
      <div className="space-y-2">
        <input
          type="text"
          value={title}
          onChange={(e) => onUpdateTitle(e.target.value)}
          placeholder="Untitled Report"
          className="w-full text-2xl sm:text-3xl font-bold tracking-tight text-[#1D1D1F] bg-transparent border-none focus:outline-none placeholder:text-black/20"
        />

        <div className="flex items-center gap-2 text-xs text-[#86868B]">
          <Calendar className="w-3.5 h-3.5 text-[#86868B]" />
          <input
            type="text"
            value={reportingPeriod}
            onChange={(e) => onUpdatePeriod(e.target.value)}
            placeholder="Add reporting period (e.g. Oct 5–9, 2026)"
            className="bg-transparent border-none focus:outline-none placeholder:text-black/30 font-normal text-[#1D1D1F] w-64 hover:text-[#0071E3] transition-colors"
          />
          <span className="text-black/10">|</span>
          <span>{cards.length} {cards.length === 1 ? 'card' : 'cards'}</span>
        </div>
      </div>

      {/* Clean Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2 no-print">
        {/* Segmented Filter Control */}
        <div className="flex items-center p-0.5 bg-black/[0.04] rounded-lg text-xs font-medium self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setFilterType('all')}
            className={`px-3 py-1 rounded-md transition-all ${
              filterType === 'all'
                ? 'bg-white text-[#1D1D1F] shadow-xs font-semibold'
                : 'text-[#86868B] hover:text-[#1D1D1F]'
            }`}
          >
            All
          </button>
          {counts.kpi_metric > 0 && (
            <button
              type="button"
              onClick={() => setFilterType('kpi_metric')}
              className={`px-3 py-1 rounded-md transition-all ${
                filterType === 'kpi_metric'
                  ? 'bg-white text-[#1D1D1F] shadow-xs font-semibold'
                  : 'text-[#86868B] hover:text-[#1D1D1F]'
              }`}
            >
              KPIs
            </button>
          )}
          {counts.risk_blocker > 0 && (
            <button
              type="button"
              onClick={() => setFilterType('risk_blocker')}
              className={`px-3 py-1 rounded-md transition-all ${
                filterType === 'risk_blocker'
                  ? 'bg-white text-[#1D1D1F] shadow-xs font-semibold'
                  : 'text-[#86868B] hover:text-[#1D1D1F]'
              }`}
            >
              Risks
            </button>
          )}
          {counts.next_steps > 0 && (
            <button
              type="button"
              onClick={() => setFilterType('next_steps')}
              className={`px-3 py-1 rounded-md transition-all ${
                filterType === 'next_steps'
                  ? 'bg-white text-[#1D1D1F] shadow-xs font-semibold'
                  : 'text-[#86868B] hover:text-[#1D1D1F]'
              }`}
            >
              Actions
            </button>
          )}
          {counts.visual_update > 0 && (
            <button
              type="button"
              onClick={() => setFilterType('visual_update')}
              className={`px-3 py-1 rounded-md transition-all ${
                filterType === 'visual_update'
                  ? 'bg-white text-[#1D1D1F] shadow-xs font-semibold'
                  : 'text-[#86868B] hover:text-[#1D1D1F]'
              }`}
            >
              Visuals
            </button>
          )}
        </div>

        {/* Right Tools: Search & Add Card */}
        <div className="flex items-center gap-2">
          {/* Subtle Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[#86868B] absolute left-2.5 top-2" />
            <input
              type="text"
              placeholder="Filter..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="text-xs pl-7 pr-3 py-1 bg-black/[0.03] hover:bg-black/[0.05] focus:bg-white rounded-full border border-transparent focus:border-black/10 focus:outline-none transition-all w-28 sm:w-36"
            />
          </div>

          {/* Add Card Menu */}
          <div className="relative" ref={addMenuRef}>
            <button
              type="button"
              onClick={() => setShowAddMenu((prev) => !prev)}
              className="flex items-center gap-1 px-3 py-1 text-xs font-medium text-[#0071E3] hover:text-[#0077ED] bg-[#0071E3]/10 hover:bg-[#0071E3]/15 rounded-full transition-colors active:scale-[0.98]"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Card</span>
            </button>

            {showAddMenu && (
              <div className="absolute right-0 top-8 z-30 w-48 bg-white/95 backdrop-blur-xl rounded-xl border border-black/[0.08] shadow-[0_8px_30px_rgba(0,0,0,0.12)] py-1 text-xs">
                {cardTypeOptions.map((opt) => (
                  <button
                    key={opt.type}
                    type="button"
                    onClick={() => {
                      setShowAddMenu(false);
                      onAddCard(opt.type);
                    }}
                    className="w-full text-left px-3.5 py-1.5 hover:bg-black/[0.04] text-[#1D1D1F] transition-colors"
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Floating Selection Toolbar (Only visible when cards are selected) */}
      {someSelected && (
        <div className="flex items-center justify-between p-2.5 bg-white/95 backdrop-blur-xl rounded-xl border border-black/[0.08] shadow-[0_4px_20px_rgba(0,0,0,0.06)] text-xs no-print transition-all">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={allSelected ? onDeselectAllCards : onSelectAllCards}
              className="p-1 text-[#86868B] hover:text-[#1D1D1F] rounded"
            >
              {allSelected ? <CheckSquare className="w-3.5 h-3.5 text-[#0071E3]" /> : <Square className="w-3.5 h-3.5" />}
            </button>
            <span className="font-medium text-[#1D1D1F]">
              {selectedCardIds.size} of {cards.length} selected
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={onCopySelectedCards}
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-[#1D1D1F] hover:bg-black/[0.04] rounded-md transition-colors"
            >
              <Copy className="w-3.5 h-3.5 text-[#0071E3]" />
              <span>Copy</span>
            </button>

            {onOpenMessageToolsForSelected && (
              <button
                type="button"
                onClick={onOpenMessageToolsForSelected}
                className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-[#0071E3] hover:bg-[#0071E3]/10 rounded-md transition-colors"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Send</span>
              </button>
            )}

            <button
              type="button"
              onClick={onDeleteSelectedCards}
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete</span>
            </button>

            <button
              type="button"
              onClick={onDeselectAllCards}
              className="p-1 text-[#86868B] hover:text-[#1D1D1F] rounded ml-1"
              title="Clear selection"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Cards Flow */}
      {filteredCards.length === 0 ? (
        <div className="bg-white rounded-2xl border border-black/[0.06] p-12 text-center space-y-3 shadow-2xs">
          <div className="w-10 h-10 rounded-full bg-black/[0.04] text-[#86868B] flex items-center justify-center mx-auto">
            <Layers className="w-5 h-5 text-[#86868B]" />
          </div>
          <h3 className="text-sm font-medium text-[#1D1D1F]">
            {searchQuery ? 'No matching cards' : 'No report cards yet'}
          </h3>
          <p className="text-xs text-[#86868B] max-w-xs mx-auto">
            {searchQuery 
              ? 'Try a different keyword or clear the search filter.'
              : 'Add updates in the composer below or click "+ Card" above to build manually.'
            }
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <AnimatePresence mode="popLayout" initial={true}>
            {filteredCards.map((card, idx) => (
              <motion.div
                key={card.id}
                layout
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.98, transition: { duration: 0.15, ease: 'easeOut' } }}
                transition={{
                  layout: { duration: 0.2, ease: 'easeOut' },
                  duration: 0.2,
                  ease: 'easeOut',
                  delay: Math.min(idx * 0.02, 0.12),
                }}
              >
                <CardRenderer
                  card={card}
                  isSelected={selectedCardIds.has(card.id)}
                  isInspected={inspectedCardId === card.id}
                  canMoveUp={idx > 0}
                  canMoveDown={idx < filteredCards.length - 1}
                  onToggleSelect={onToggleSelectCard}
                  onInspect={onInspectCard}
                  onMoveUp={(id) => onMoveCard(id, 'up')}
                  onMoveDown={(id) => onMoveCard(id, 'down')}
                  onDuplicate={onDuplicateCard}
                  onDelete={onDeleteCard}
                  onCopyCard={onCopyCard}
                  onShareCard={onShareCard}
                  onUpdateCard={onUpdateCard}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
      </div>

      {/* Bottom chatbot-style composer: text, metrics, table, media */}
      <ChatComposer
        rawNotes={rawNotes}
        metrics={metrics}
        images={images}
        highlightPassage={highlightPassage}
        onNotesChange={onNotesChange}
        onMetricsChange={onMetricsChange}
        onImagesChange={onImagesChange}
        onGenerateReport={onGenerateReport}
        onNotify={onNotify}
      />
    </div>
  );
};
