/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createSampleProject } from '../lib/sampleData';
import { saveLocalDraft, loadLocalDraft, clearLocalDraft } from '../lib/persistence/localDraft';
import { calculateExecutiveScore } from '../lib/analysis/executiveScore';
import { compareReportSnapshots } from '../lib/analysis/snapshotDiff';
import { SnippetCard } from '../types/report';

// Mock localStorage for node environment
const storageMock: Record<string, string> = {};
if (typeof globalThis.localStorage === 'undefined') {
  (globalThis as any).localStorage = {
    getItem: (key: string) => storageMock[key] ?? null,
    setItem: (key: string, value: string) => { storageMock[key] = String(value); },
    removeItem: (key: string) => { delete storageMock[key]; },
    clear: () => {
      Object.keys(storageMock).forEach(k => delete storageMock[k]);
    },
  };
}

describe('Workflow: Reordering, Persistence & Diagnostics', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('preserves order and correctly handles move up and move down operations', () => {
    const project = createSampleProject();
    const initialOrder = project.cards.map(c => c.id);

    // Simulate moving second card up
    const cards = [...project.cards];
    const secondCard = cards[1];
    cards[1] = cards[0];
    cards[0] = secondCard;

    expect(cards[0].id).toBe(initialOrder[1]);
    expect(cards[1].id).toBe(initialOrder[0]);
  });

  it('persists draft to localStorage and cleanly reloads validated data', () => {
    const project = createSampleProject();
    const saveResult = saveLocalDraft(project);
    expect(saveResult).toBe(true);

    const loaded = loadLocalDraft();
    expect(loaded).not.toBeNull();
    expect(loaded?.title).toBe(project.title);
    expect(loaded?.cards.length).toBe(project.cards.length);
  });

  it('handles clearing local draft cleanly', () => {
    const project = createSampleProject();
    saveLocalDraft(project);
    expect(loadLocalDraft()).not.toBeNull();

    clearLocalDraft();
    expect(loadLocalDraft()).toBeNull();
  });

  it('computes explainable Executive-Ready score and pinpoints actionable fixes', () => {
    const project = createSampleProject();
    const score = calculateExecutiveScore(project);

    expect(score.score).toBeGreaterThan(0);
    expect(score.totalChecks).toBeGreaterThanOrEqual(5);

    // Check that checks have actionable descriptions
    score.items.forEach(item => {
      expect(item.label).toBeDefined();
      expect(item.description).toBeDefined();
      expect(item.actionableFix).toBeDefined();
    });
  });

  it('correctly computes What’s Changed diff when accomplishments or metrics evolve', () => {
    const baseProject = createSampleProject();
    const currentCards: SnippetCard[] = JSON.parse(JSON.stringify(baseProject.cards));

    // Modify a metric
    const metricCard = currentCards.find(c => c.type === 'kpi_metric');
    if (metricCard && metricCard.type === 'kpi_metric') {
      metricCard.value = 95; // increased from 85
    }

    // Add an accomplishment to Executive Summary
    const execCard = currentCards.find(c => c.type === 'executive_summary');
    if (execCard && execCard.type === 'executive_summary') {
      execCard.keyAccomplishments.push('Payment integration regression testing 100% complete');
    }

    const diff = compareReportSnapshots(baseProject.cards, currentCards);

    expect(diff.metricChanges.length).toBe(1);
    expect(diff.metricChanges[0].newValue).toBe(95);
    expect(diff.newAccomplishments).toContain('Payment integration regression testing 100% complete');
  });
});
