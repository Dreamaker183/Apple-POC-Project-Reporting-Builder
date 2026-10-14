/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { AnimatePresence, Reorder } from 'framer-motion';
import { SnippetCard, CardType, MetricInput, ImageAssetInput, ReadinessScore, SendSchedule } from '../../types/report';
import { ReportingDate } from './ReportingDate';
import { SortableCard } from './SortableCard';
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
  X,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Zap,
  GripVertical
} from 'lucide-react';

interface Props {
  projectId: string;
  projectTitle: string;
  title: string;
  reportingPeriod: string;
  sendSchedule?: SendSchedule;
  onScheduleChange: (schedule?: SendSchedule) => void;
  onConfigureDispatch: () => void;
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
  onReorderCards: (cards: SnippetCard[]) => void;
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
  onImagesAppend: (images: ImageAssetInput[]) => void;
  onGenerateReport: (notes?: string) => void;
  onApplyFindings: (notes: string, cards: SnippetCard[], metrics: MetricInput[], selectedCount?: number) => void;
  readinessScore?: ReadinessScore;
  onApplyQuickFix?: (checkId: string) => void;
  onApplyAllFixes?: () => void;
  onNotify?: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const ReportCanvas: React.FC<Props> = ({
  projectId,
  projectTitle,
  title,
  reportingPeriod,
  sendSchedule,
  onScheduleChange,
  onConfigureDispatch,
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
  onReorderCards,
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
  onImagesAppend,
  onGenerateReport,
  onApplyFindings,
  readinessScore,
  onApplyQuickFix,
  onApplyAllFixes,
  onNotify,
}) => {
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [showReadiness, setShowReadiness] = useState(false);
  const [filterType, setFilterType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const addMenuRef = useRef<HTMLDivElement>(null);
  const readinessRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (addMenuRef.current && !addMenuRef.current.contains(e.target as Node)) {
        setShowAddMenu(false);
      }
      if (readinessRef.current && !readinessRef.current.contains(e.target as Node)) {
        setShowReadiness(false);
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowAddMenu(false);
        setShowReadiness(false);
      }
    };
    if (showAddMenu || showReadiness) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [showAddMenu, showReadiness]);

  const cardTypeOptions: Array<{ type: CardType; label: string }> = [
    { type: 'executive_summary', label: 'Executive Summary' },
    { type: 'kpi_metric', label: 'Metric / Data chart' },
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
      milestone: cards.filter(c => c.type === 'milestone').length,
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
        const content = JSON.stringify(card).toLowerCase();
        return content.includes(query);
      }
      return true;
    });
  }, [cards, filterType, searchQuery]);

  const allSelected = cards.length > 0 && selectedCardIds.size === cards.length;
  const someSelected = selectedCardIds.size > 0;

  // Drag-to-reorder targets the full order; while filtered, reordered visible
  // cards are merged back into their original slots.
  const canReorder = filterType === 'all' && !searchQuery.trim();
  const handleReorder = (newOrder: SnippetCard[]) => {
    if (canReorder) {
      onReorderCards(newOrder);
      return;
    }
    const orderById = new Map(newOrder.map((c) => [c.id, c] as const));
    const slots: number[] = [];
    cards.forEach((c, i) => {
      if (orderById.has(c.id)) slots.push(i);
    });
    if (slots.length !== newOrder.length) return;
    const merged = [...cards];
    slots.forEach((slot, k) => {
      merged[slot] = newOrder[k];
    });
    onReorderCards(merged);
  };

  return (
    <div className="report-canvas flex flex-col h-full min-h-0 overflow-hidden">
      <div className="report-scroll flex-1 min-h-0 overflow-y-auto px-5 sm:px-10 py-8 sm:py-12 max-w-[820px] mx-auto w-full space-y-6">
      {/* Document Header (Minimalist Apple Document Style) */}
      <div className="space-y-2">
        <input
          aria-label="Project title"
          type="text"
          value={title}
          onChange={(e) => onUpdateTitle(e.target.value)}
          placeholder="Untitled Report"
           className="w-full text-3xl sm:text-[36px] font-semibold tracking-tight text-[#1D1D1F] bg-transparent border-none focus:outline-none placeholder:text-black/20"
        />

        <div className="flex items-center gap-2 text-xs text-[#86868B]">
          <ReportingDate value={reportingPeriod} schedule={sendSchedule} hasCards={cards.length > 0} onDateChange={onUpdatePeriod} onScheduleChange={onScheduleChange} onConfigure={onConfigureDispatch} />
          <span className="text-black/10">|</span>
          <span>{cards.length} {cards.length === 1 ? 'card' : 'cards'}</span>
          {readinessScore && (
            <>
              <span className="text-black/10 no-print">|</span>
              <div className="relative no-print" ref={readinessRef}>
                <button
                  type="button"
                  onClick={() => setShowReadiness((prev) => !prev)}
                  aria-expanded={showReadiness}
                  aria-label={`Executive readiness ${readinessScore.score}%`}
                  className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/80 hover:bg-white border border-black/[0.06] text-[11px] font-medium text-[#1D1D1F] transition-colors"
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      readinessScore.score >= 80
                        ? 'bg-emerald-500'
                        : readinessScore.score >= 50
                          ? 'bg-amber-500'
                          : 'bg-rose-500'
                    }`}
                  />
                  <span>Readiness · {readinessScore.score}%</span>
                </button>
                {showReadiness && (
                  <div className="absolute right-0 top-7 z-40 w-80 bg-white/95 backdrop-blur-xl rounded-2xl border border-black/[0.08] shadow-[0_12px_40px_rgba(0,0,0,0.14)] p-3.5 text-xs space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-[#1D1D1F]">Executive readiness · {readinessScore.score}%</div>
                        <div className="text-[11px] text-[#6E6E73]">{readinessScore.passedChecks} of {readinessScore.totalChecks} checks passed</div>
                      </div>
                      {readinessScore.score < 100 && onApplyAllFixes && (
                        <button
                          type="button"
                          onClick={() => {
                            onApplyAllFixes();
                            setShowReadiness(false);
                          }}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#0071E3] hover:bg-[#0077ED] text-white text-[11px] font-medium"
                        >
                          <Zap className="w-3 h-3" />
                          <span>Fix all</span>
                        </button>
                      )}
                    </div>
                    <div className="space-y-1.5 max-h-64 overflow-y-auto">
                      {readinessScore.items.map((item) => (
                        <div key={item.id} className="rounded-xl bg-[#F5F5F7] p-2.5 flex items-start justify-between gap-2">
                          <div className="flex items-start gap-2 min-w-0">
                            {item.status === 'pass' ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                            ) : item.status === 'warning' ? (
                              <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                            ) : (
                              <XCircle className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5" />
                            )}
                            <div className="min-w-0">
                              <div className="font-medium text-[#1D1D1F]">{item.label}</div>
                              <div className="text-[11px] text-[#6E6E73] leading-snug">{item.description}</div>
                            </div>
                          </div>
                          {item.status !== 'pass' && onApplyQuickFix && (
                            <button
                              type="button"
                              onClick={() => onApplyQuickFix(item.id)}
                              className="shrink-0 px-2 py-1 rounded-lg bg-white border border-black/10 text-[11px] font-medium text-[#0071E3] hover:bg-[#0071E3]/10"
                            >
                              Fix
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
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
              Metrics
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
          {counts.milestone > 0 && (
            <button
              type="button"
              onClick={() => setFilterType('milestone')}
              className={`px-3 py-1 rounded-md transition-all ${
                filterType === 'milestone'
                  ? 'bg-white text-[#1D1D1F] shadow-xs font-semibold'
                  : 'text-[#86868B] hover:text-[#1D1D1F]'
              }`}
            >
              Milestones
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
            <Search className="w-3.5 h-3.5 text-[#86868B] absolute left-2.5 top-2 pointer-events-none" />
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
            {searchQuery || filterType !== 'all' ? 'No matching cards' : 'Your next report starts here'}
          </h3>
          <p className="text-xs text-[#86868B] max-w-xs mx-auto">
            {searchQuery || filterType !== 'all'
              ? 'Try a different keyword or clear the search filter.'
              : 'Add a project update below, attach your data or photos, then build your report. You can edit every card directly.'
            }
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {cards.length > 1 && (
            <p className="flex items-center gap-1.5 text-[11px] text-[#86868B] no-print select-none">
              <GripVertical className="w-3.5 h-3.5 shrink-0" />
              <span>
                {canReorder
                  ? 'Press & hold a card (or drag its grip) to reorder'
                  : 'Clear search/filter to reorder cards'}
              </span>
            </p>
          )}
          <Reorder.Group
            as="div"
            axis="y"
            layoutScroll
            values={filteredCards}
            onReorder={handleReorder}
            className="space-y-4"
          >
            <AnimatePresence initial={false}>
              {filteredCards.map((card, idx) => (
                <SortableCard
                  key={card.id}
                  card={card}
                  index={idx}
                  canReorder={canReorder}
                  isSelected={selectedCardIds.has(card.id)}
                  isInspected={inspectedCardId === card.id}
                  canMoveUp={cards.findIndex((c) => c.id === card.id) > 0}
                  canMoveDown={cards.findIndex((c) => c.id === card.id) < cards.length - 1}
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
              ))}
            </AnimatePresence>
          </Reorder.Group>
        </div>
      )}
      </div>

      {/* Bottom chatbot-style composer: text, metrics, table, media */}
      <ChatComposer
        projectId={projectId}
        projectTitle={projectTitle}
        rawNotes={rawNotes}
        metrics={metrics}
        images={images}
        highlightPassage={highlightPassage}
        onNotesChange={onNotesChange}
        onMetricsChange={onMetricsChange}
        onImagesChange={onImagesChange}
        onImagesAppend={onImagesAppend}
        hasCards={cards.length > 0}
        onGenerateReport={onGenerateReport}
        onApplyFindings={onApplyFindings}
        onNotify={onNotify}
      />
    </div>
  );
};
