/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { AnimatePresence, Reorder } from 'framer-motion';
import { SnippetCard, CardType, MetricInput, ImageAssetInput, ReadinessScore, ReadinessItem, SendSchedule } from '../../types/report';
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
  GripVertical,
  LocateFixed
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

/** Where a readiness check can take you: a card, the report header, or the add-card button. */
type PeekTarget = { kind: 'card'; id: string } | { kind: 'header' } | { kind: 'add' };

function targetForItem(item: ReadinessItem): PeekTarget | null {
  if (item.cardId) return { kind: 'card', id: item.cardId };
  if (item.spotlight === 'header') return { kind: 'header' };
  if (item.spotlight === 'add-card') return { kind: 'add' };
  return null;
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
  const [peek, setPeek] = useState<PeekTarget | null>(null);
  const [flash, setFlash] = useState<'header' | 'add' | null>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null);
  const addMenuRef = useRef<HTMLDivElement>(null);
  const readinessRef = useRef<HTMLDivElement>(null);
  const readinessBtnRef = useRef<HTMLButtonElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const savedScrollTop = useRef<number | null>(null);
  const flashTimer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(flashTimer.current), []);

  const doFlash = (target: 'header' | 'add') => {
    setFlash(target);
    window.clearTimeout(flashTimer.current);
    flashTimer.current = window.setTimeout(() => setFlash(null), 1800);
  };

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

  // Pin the readiness panel with fixed positioning so it stays on screen
  // while the report scrolls underneath during card navigation.
  useEffect(() => {
    if (!showReadiness) {
      setMenuPos(null);
      return;
    }
    const MENU_WIDTH = 320;
    const update = () => {
      const rect = readinessBtnRef.current?.getBoundingClientRect();
      if (!rect) return;
      const left = Math.min(
        Math.max(8, rect.right - MENU_WIDTH),
        Math.max(8, window.innerWidth - MENU_WIDTH - 8)
      );
      const top = Math.min(Math.max(8, rect.bottom + 6), window.innerHeight - 120);
      setMenuPos({ top, left });
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [showReadiness]);

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

  // Jump from a readiness check straight to what it refers to — a card, the
  // report header, or the add-card button. The panel stays open
  // (fixed-positioned) so you can keep exploring checks.
  const smoothBehavior = (): ScrollBehavior =>
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
      ? 'auto'
      : 'smooth';

  const scrollToCardElement = (cardId: string): boolean => {
    const container = scrollRef.current;
    const el = container?.querySelector<HTMLElement>(`[data-card-id="${cardId}"]`);
    if (!container || !el) return false;
    const cRect = container.getBoundingClientRect();
    const eRect = el.getBoundingClientRect();
    const fullyVisible = eRect.top >= cRect.top && eRect.bottom <= cRect.bottom;
    if (!fullyVisible) {
      el.scrollIntoView({ behavior: smoothBehavior(), block: 'center' });
    }
    return true;
  };

  const scrollTargetIntoView = (target: PeekTarget): boolean => {
    const container = scrollRef.current;
    if (!container) return false;
    if (target.kind === 'card') return scrollToCardElement(target.id);
    if (target.kind === 'header') {
      if (container.scrollTop > 8) container.scrollTo({ top: 0, behavior: smoothBehavior() });
      return true;
    }
    const el = addMenuRef.current;
    if (!el) return false;
    const cRect = container.getBoundingClientRect();
    const eRect = el.getBoundingClientRect();
    if (eRect.top < cRect.top || eRect.bottom > cRect.bottom) {
      el.scrollIntoView({ behavior: smoothBehavior(), block: 'nearest' });
    }
    return true;
  };

  const focusCardElement = (cardId: string) => {
    scrollRef.current
      ?.querySelector<HTMLElement>(`[data-card-id="${cardId}"] [role="article"]`)
      ?.focus({ preventScroll: true });
  };

  const afterRender = (fn: () => void) => {
    // Wait for the (possibly re-filtered) list to render before scrolling.
    requestAnimationFrame(() => {
      requestAnimationFrame(fn);
    });
  };

  const handleGotoTarget = (target: PeekTarget) => {
    // The target may be hidden behind a search/filter — clear it first.
    setFilterType('all');
    setSearchQuery('');
    setPeek(null);
    savedScrollTop.current = null;
    if (target.kind === 'card') {
      onInspectCard(target.id);
      afterRender(() => {
        if (scrollToCardElement(target.id)) focusCardElement(target.id);
      });
    } else if (target.kind === 'header') {
      afterRender(() => {
        scrollTargetIntoView(target);
        doFlash('header');
      });
    } else {
      afterRender(() => {
        scrollTargetIntoView(target);
        setShowAddMenu(true);
        doFlash('add');
      });
    }
  };

  // Hovering a check previews its target: it lights up and scrolls into
  // view. Leaving the row navigates back to where you were.
  const handlePeekEnterTarget = (target: PeekTarget) => {
    const container = scrollRef.current;
    if (container && savedScrollTop.current === null) {
      savedScrollTop.current = container.scrollTop;
    }
    setPeek(target);
    requestAnimationFrame(() => {
      scrollTargetIntoView(target);
    });
  };

  const handlePeekLeave = () => {
    setPeek(null);
    const container = scrollRef.current;
    const saved = savedScrollTop.current;
    savedScrollTop.current = null;
    if (container && saved !== null) {
      container.scrollTo({ top: saved, behavior: smoothBehavior() });
    }
  };

  // Applying a fix lands you on what was fixed: the card, the header, or —
  // when the fix just created the card — the new card of that type. When the
  // check has no auto-fix (it only points at the add button), open the menu.
  const handleFixAndGoto = (item: ReadinessItem) => {
    if (!onApplyQuickFix) return;
    onApplyQuickFix(item.id);
    setPeek(null);
    savedScrollTop.current = null;
    setFilterType('all');
    setSearchQuery('');
    if (item.cardId) {
      onInspectCard(item.cardId);
      const id = item.cardId;
      afterRender(() => {
        if (scrollToCardElement(id)) focusCardElement(id);
      });
    } else if (item.spotlight === 'header') {
      afterRender(() => {
        scrollTargetIntoView({ kind: 'header' });
        doFlash('header');
      });
    } else if (item.spotlight === 'add-card' && item.spotlightCardType) {
      const type = item.spotlightCardType;
      afterRender(() => {
        const el = scrollRef.current?.querySelector<HTMLElement>(
          `[data-card-type="${type}"]`
        );
        const id = el?.dataset.cardId;
        if (id) {
          onInspectCard(id);
          if (scrollToCardElement(id)) focusCardElement(id);
        } else {
          scrollTargetIntoView({ kind: 'add' });
          setShowAddMenu(true);
          doFlash('add');
        }
      });
    }
  };

  return (
    <div className="report-canvas flex flex-col h-full min-h-0 overflow-hidden">
      <div ref={scrollRef} className="report-scroll flex-1 min-h-0 overflow-y-auto px-5 sm:px-10 py-8 sm:py-12 max-w-[820px] mx-auto w-full space-y-6">
      {/* Document Header (Minimalist Apple Document Style) */}
      <div
        ref={headerRef}
        data-spotlight="header"
        className={`space-y-2 rounded-xl transition-all duration-200 ${
          peek?.kind === 'header' || flash === 'header'
            ? 'ring-2 ring-[#0071E3]/60 bg-[#0071E3]/[0.04] shadow-[0_8px_28px_rgba(0,113,227,0.15)]'
            : 'ring-2 ring-transparent'
        }`}
      >
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
                  ref={readinessBtnRef}
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
                  <div
                    className="fixed z-40 w-80 bg-white/95 backdrop-blur-xl rounded-2xl border border-black/[0.08] shadow-[0_12px_40px_rgba(0,0,0,0.14)] p-3.5 text-xs space-y-2.5"
                    style={
                      menuPos
                        ? { top: menuPos.top, left: menuPos.left }
                        : { visibility: 'hidden' }
                    }
                  >
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
                      {readinessScore.items.map((item) => {
                        const statusIcon =
                          item.status === 'pass' ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                          ) : item.status === 'warning' ? (
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                          ) : (
                            <XCircle className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5" />
                          );
                        const target = targetForItem(item);
                        const targetHint =
                          target?.kind === 'card'
                            ? 'Go to card'
                            : target?.kind === 'header'
                            ? 'Go to header'
                            : target?.kind === 'add'
                            ? `Add ${cardTypeOptions.find((o) => o.type === item.spotlightCardType)?.label ?? 'card'}`
                            : null;
                        const body = (
                          <>
                            {statusIcon}
                            <span className="min-w-0 flex-1">
                              <span className="font-medium text-[#1D1D1F] block">{item.label}</span>
                              <span className="text-[11px] text-[#6E6E73] leading-snug block">{item.description}</span>
                              {targetHint && (
                                <span className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium text-[#0071E3]">
                                  <LocateFixed className="w-3 h-3" />
                                  <span>{targetHint}</span>
                                </span>
                              )}
                            </span>
                          </>
                        );
                        return (
                          <div key={item.id} className="rounded-xl bg-[#F5F5F7] p-2.5 flex items-start justify-between gap-2">
                            {target ? (
                              <button
                                type="button"
                                onClick={() => handleGotoTarget(target)}
                                onMouseEnter={() => handlePeekEnterTarget(target)}
                                onMouseLeave={handlePeekLeave}
                                onFocus={() => handlePeekEnterTarget(target)}
                                onBlur={handlePeekLeave}
                                title={`${targetHint ?? 'Go to'} — "${item.label}"`}
                                aria-label={`${targetHint ?? 'Go to'}: ${item.label}`}
                                className="flex items-start gap-2 min-w-0 flex-1 text-left rounded-lg hover:bg-[#0071E3]/[0.06] focus-visible:outline-2 focus-visible:outline-[#0071E3] -m-1 p-1 transition-colors"
                              >
                                {body}
                              </button>
                            ) : (
                              <div className="flex items-start gap-2 min-w-0">
                                {body}
                              </div>
                            )}
                            {item.status !== 'pass' && onApplyQuickFix && (
                              <button
                                type="button"
                                onClick={() => handleFixAndGoto(item)}
                                title="Apply fix and go to what was fixed"
                                className="shrink-0 px-2 py-1 rounded-lg bg-white border border-black/10 text-[11px] font-medium text-[#0071E3] hover:bg-[#0071E3]/10"
                              >
                                Fix
                              </button>
                            )}
                          </div>
                        );
                      })}
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
          <div className="relative" ref={addMenuRef} data-spotlight="add-card">
            <button
              type="button"
              onClick={() => setShowAddMenu((prev) => !prev)}
              aria-label="Add card"
              className={`flex items-center gap-1 px-3 py-1 text-xs font-medium text-[#0071E3] hover:text-[#0077ED] bg-[#0071E3]/10 hover:bg-[#0071E3]/15 rounded-full transition-all active:scale-[0.98] ${
                peek?.kind === 'add' || flash === 'add'
                  ? 'ring-2 ring-[#0071E3] bg-[#0071E3]/20 shadow-[0_4px_16px_rgba(0,113,227,0.35)] scale-105'
                  : ''
              }`}
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
            <div className="flex items-center gap-2 no-print select-none">
              <label className="flex items-center gap-1.5 cursor-pointer" title={allSelected ? 'Deselect all cards' : 'Select all cards'}>
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={() => (allSelected ? onDeselectAllCards() : onSelectAllCards())}
                  aria-label={allSelected ? 'Deselect all cards' : 'Select all cards'}
                  className="w-3.5 h-3.5 rounded border-black/20 text-[#0071E3] focus:ring-0 focus:outline-none cursor-pointer"
                />
                <span className="text-[11px] font-medium text-[#86868B]">
                  {allSelected ? 'Deselect all' : 'Select all'}
                </span>
              </label>
              <span className="text-black/10 text-[11px]">|</span>
              <p className="flex items-center gap-1.5 text-[11px] text-[#86868B]">
                <GripVertical className="w-3.5 h-3.5 shrink-0" />
                <span>
                  {canReorder
                    ? 'Press & hold a card (or drag its grip) to reorder'
                    : 'Clear search/filter to reorder cards'}
                </span>
              </p>
            </div>
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
                  isPeeked={peek?.kind === 'card' && peek.id === card.id}
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
