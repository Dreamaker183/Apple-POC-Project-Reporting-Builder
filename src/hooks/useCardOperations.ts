/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useCallback } from 'react';
import type {
  ReportProject,
  SnippetCard,
  CardType,
  MetricInput,
} from '../types/report';
import { uid } from '../lib/persistence/projectLibrary';
import { copyToClipboard } from '../lib/export/clipboard';
import { formatCardToMarkdown } from '../lib/export/markdownExport';
import { formatCardToHtml } from '../lib/export/htmlExport';
import { mergeReviewedCards } from '../lib/composition/mergeReviewedCards';

/**
 * Manages card-level operations: CRUD, selection, reorder, copy.
 * Expects `recordHistory` and `updateActiveProject` injected from the parent.
 */
export function useCardOperations(
  project: ReportProject,
  updateActiveProject: (updater: (prev: ReportProject) => ReportProject) => void,
  recordHistory: () => void,
  addToast: (msg: string, type?: 'success' | 'error' | 'info') => void,
) {
  const [selectedCardIds, setSelectedCardIds] = useState<Set<string>>(new Set());
  const [inspectedCardId, setInspectedCardId] = useState<string | null>(() => {
    return project.cards[0]?.id || null;
  });
  const [highlightPassage, setHighlightPassage] = useState<{ start?: number; end?: number; text?: string } | null>(null);

  // ── Card CRUD ────────────────────────────────────────────────────

  const handleUpdateCard = useCallback((updated: SnippetCard) => {
    recordHistory();
    updateActiveProject((prev) => ({
      ...prev,
      cards: prev.cards.map((c) => (c.id === updated.id ? { ...updated, manuallyEdited: true, updatedAt: new Date().toISOString() } : c)),
      isDirty: true,
    }));
  }, [recordHistory, updateActiveProject]);

  const handleDeleteCard = useCallback((id: string) => {
    recordHistory();
    updateActiveProject((prev) => ({
      ...prev,
      cards: prev.cards.filter((c) => c.id !== id),
      isDirty: true,
    }));
    setSelectedCardIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    if (inspectedCardId === id) {
      const remaining = project.cards.filter((c) => c.id !== id);
      setInspectedCardId(remaining[0]?.id || null);
      if (remaining.length === 0) setHighlightPassage(null);
    }
    addToast('Card removed', 'info');
  }, [recordHistory, updateActiveProject, inspectedCardId, project.cards, addToast]);

  const handleDeleteSelectedCards = useCallback(() => {
    if (selectedCardIds.size === 0) return;
    recordHistory();
    const count = selectedCardIds.size;
    updateActiveProject((prev) => ({
      ...prev,
      cards: prev.cards.filter((c) => !selectedCardIds.has(c.id)),
      isDirty: true,
    }));
    setSelectedCardIds(new Set());
    setInspectedCardId(null);
    setHighlightPassage(null);
    addToast(`Deleted ${count} cards`, 'info');
  }, [selectedCardIds, recordHistory, updateActiveProject, addToast]);

  const handleDuplicateCard = useCallback((id: string) => {
    const target = project.cards.find((c) => c.id === id);
    if (!target) return;
    recordHistory();
    const duplicated: SnippetCard = {
      ...target,
      id: uid('card-copy'),
      sourceKey: undefined,
      manuallyEdited: true,
      title: `${target.title} (Copy)`,
      updatedAt: new Date().toISOString(),
    };
    const targetIdx = project.cards.findIndex((c) => c.id === id);
    const newCards = [...project.cards];
    newCards.splice(targetIdx + 1, 0, duplicated);
    updateActiveProject((prev) => ({ ...prev, cards: newCards, isDirty: true }));
    setInspectedCardId(duplicated.id);
    addToast('Duplicated card', 'success');
  }, [project.cards, recordHistory, updateActiveProject, addToast]);

  const handleMoveCard = useCallback((id: string, direction: 'up' | 'down') => {
    const idx = project.cards.findIndex((c) => c.id === id);
    if (idx === -1) return;
    if (direction === 'up' && idx === 0) return;
    if (direction === 'down' && idx === project.cards.length - 1) return;
    recordHistory();
    const newCards = [...project.cards];
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    const temp = newCards[idx];
    newCards[idx] = newCards[targetIdx];
    newCards[targetIdx] = temp;
    updateActiveProject((prev) => ({ ...prev, cards: newCards, isDirty: true }));
  }, [project.cards, recordHistory, updateActiveProject]);

  const handleReorderCards = useCallback((newCards: SnippetCard[]) => {
    const prevIds = project.cards.map((c) => c.id).join('|');
    const nextIds = newCards.map((c) => c.id).join('|');
    if (prevIds === nextIds) return;
    if (newCards.length !== project.cards.length) return;
    const prevIdSet = new Set(project.cards.map((c) => c.id));
    if (!newCards.every((c) => prevIdSet.has(c.id))) return;
    recordHistory();
    updateActiveProject((prev) => ({ ...prev, cards: newCards, isDirty: true }));
  }, [project.cards, recordHistory, updateActiveProject]);

  const handleAddCard = useCallback((type: CardType) => {
    recordHistory();
    const now = new Date().toISOString();
    let newCard: SnippetCard;

    switch (type) {
      case 'executive_summary':
        newCard = {
          id: `card-exec-${Date.now()}`, type: 'executive_summary',
          title: 'Executive Summary',
          summary: 'High-level synthesis of current sprint achievements and milestones.',
          keyAccomplishments: ['Core features ready for review'],
          createdAt: now, updatedAt: now,
        };
        break;
      case 'kpi_metric':
        newCard = {
          id: `card-metric-${Date.now()}`, type: 'kpi_metric',
          title: 'Sprint Velocity', label: 'Sprint Velocity',
          value: 90, unit: '%', target: 100, chartStyle: 'bar',
          createdAt: now, updatedAt: now,
        };
        break;
      case 'risk_blocker':
        newCard = {
          id: `card-risk-${Date.now()}`, type: 'risk_blocker',
          title: 'Potential Schedule Delay',
          description: 'Awaiting dependency validation from partner team.',
          severity: 'medium', isBlocker: false,
          mitigation: 'Daily standup checkpoint scheduled with engineering lead.',
          createdAt: now, updatedAt: now,
        };
        break;
      case 'next_steps':
        newCard = {
          id: `card-nextsteps-${Date.now()}`, type: 'next_steps',
          title: 'Upcoming Sprint Commitments',
          items: [{ id: `step-${Date.now()}-1`, action: 'Complete staging environment regression tests', status: 'planned' }],
          createdAt: now, updatedAt: now,
        };
        break;
      case 'milestone':
        newCard = {
          id: `card-milestone-${Date.now()}`, type: 'milestone',
          title: 'API Integration Complete',
          description: 'Endpoints verified and ready for end-to-end integration.',
          status: 'on_track', dueDate: '16 October 2026',
          createdAt: now, updatedAt: now,
        };
        break;
      case 'visual_update':
        newCard = {
          id: `card-visual-${Date.now()}`, type: 'visual_update',
          title: 'UI Preview Asset',
          imageUrl: project.images[0]?.dataUrl || '',
          altText: 'UI preview asset mockup',
          caption: 'User interface candidate build',
          createdAt: now, updatedAt: now,
        };
        break;
    }

    updateActiveProject((prev) => ({ ...prev, cards: [...prev.cards, newCard], isDirty: true }));
    setInspectedCardId(newCard.id);
    addToast(`Added new ${newCard.type.replace('_', ' ')} card`, 'success');
  }, [project.images, recordHistory, updateActiveProject, addToast]);

  // ── Selection ────────────────────────────────────────────────────

  const handleToggleSelectCard = useCallback((id: string) => {
    setSelectedCardIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleSelectSingleCard = useCallback((id: string) => {
    setSelectedCardIds(new Set([id]));
  }, []);

  const handleSelectAllCards = useCallback(() => {
    setSelectedCardIds(new Set(project.cards.map((c) => c.id)));
  }, [project.cards]);

  const handleDeselectAllCards = useCallback(() => {
    setSelectedCardIds(new Set());
  }, []);

  // ── Copy ─────────────────────────────────────────────────────────

  const handleCopyCard = useCallback((card: SnippetCard) => {
    handleDuplicateCard(card.id);
  }, [handleDuplicateCard]);

  const handleCopySelectedCards = useCallback(async () => {
    const selected = project.cards.filter((c) => selectedCardIds.has(c.id));
    if (selected.length === 0) return;
    const md = selected.map(formatCardToMarkdown).join('\n\n---\n\n');
    const html = selected.map(formatCardToHtml).join('<br/>');
    const res = await copyToClipboard(md, html);
    if (res.success) {
      addToast(`Copied ${selected.length} selected cards!`, 'success');
    } else {
      addToast('Failed to copy cards', 'error');
    }
  }, [project.cards, selectedCardIds, addToast]);

  // ── Inspect ──────────────────────────────────────────────────────

  const handleInspectCard = useCallback((id: string) => {
    setInspectedCardId(id);
    const card = project.cards.find(c => c.id === id);
    if (card?.sourceRef) {
      setHighlightPassage({ text: card.sourceRef.passageText });
    } else {
      setHighlightPassage(null);
    }
  }, [project.cards]);

  // ── Apply findings from classifier ──────────────────────────────

  const handleApplyFindings = useCallback((notes: string, cards: SnippetCard[], metrics: MetricInput[], selectedCount?: number) => {
    recordHistory();
    const combinedNotes = [project.rawNotes, notes.trim()].filter(Boolean).join('\n\n');
    const updatedCards = mergeReviewedCards(project.cards, cards);
    updateActiveProject((prev) => ({ ...prev, rawNotes: combinedNotes, metrics, cards: updatedCards, isDirty: true }));
    const firstNew = updatedCards.find((card) => cards.some((created) => created.sourceKey === card.sourceKey));
    if (firstNew) setInspectedCardId(firstNew.id);
    const count = selectedCount ?? cards.length;
    addToast(`Added ${count} reviewed ${count === 1 ? 'finding' : 'findings'} to the report`, 'success');
  }, [project.rawNotes, project.cards, recordHistory, updateActiveProject, addToast]);

  // ── Reset workspace UI (used on project switch) ──────────────────

  const resetWorkspaceUI = useCallback((cards: SnippetCard[]) => {
    setSelectedCardIds(new Set());
    setInspectedCardId(cards[0]?.id ?? null);
    setHighlightPassage(null);
  }, []);

  return {
    selectedCardIds,
    inspectedCardId,
    highlightPassage,
    setInspectedCardId,
    setHighlightPassage,
    resetWorkspaceUI,

    handleUpdateCard,
    handleDeleteCard,
    handleDeleteSelectedCards,
    handleDuplicateCard,
    handleMoveCard,
    handleReorderCards,
    handleAddCard,
    handleToggleSelectCard,
    handleSelectSingleCard,
    handleSelectAllCards,
    handleDeselectAllCards,
    handleCopyCard,
    handleCopySelectedCards,
    handleInspectCard,
    handleApplyFindings,
  } as const;
}
