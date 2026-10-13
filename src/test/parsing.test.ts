/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import { generateSnippetCards } from '../lib/parsing/deterministicParser';
import { SAMPLE_SOURCE_TEXT, SAMPLE_METRICS, SAMPLE_IMAGES } from '../lib/sampleData';
import { MetricInput } from '../types/report';

describe('Deterministic Parser & Extraction', () => {
  it('extracts all core card types from verified sample inputs without fabricating data', () => {
    const cards = generateSnippetCards(
      SAMPLE_SOURCE_TEXT,
      SAMPLE_METRICS,
      SAMPLE_IMAGES,
      'Customer Portal Modernization'
    );

    expect(cards.length).toBeGreaterThan(0);

    // 1. Executive Summary
    const exec = cards.find(c => c.type === 'executive_summary');
    expect(exec).toBeDefined();
    if (exec && exec.type === 'executive_summary') {
      expect(exec.keyAccomplishments.length).toBeGreaterThan(0);
      expect(exec.statusNote).toContain('not yet been confirmed');
      expect(exec.sourceRef?.confidence).toBe('explicit');
    }

    // 2. KPI Metrics
    const metrics = cards.filter(c => c.type === 'kpi_metric');
    expect(metrics.length).toBe(3);
    const sprintMetric = metrics.find(m => m.title === 'Sprint completion');
    expect(sprintMetric).toBeDefined();
    expect(sprintMetric?.value).toBe(85);

    // 3. Risks & Blockers
    const risks = cards.filter(c => c.type === 'risk_blocker');
    expect(risks.length).toBeGreaterThan(0);
    const blocker = risks.find(r => r.isBlocker);
    expect(blocker).toBeDefined();
    expect(blocker?.severity).toBe('critical');

    // 4. Next Steps
    const nextSteps = cards.find(c => c.type === 'next_steps');
    expect(nextSteps).toBeDefined();
    if (nextSteps && nextSteps.type === 'next_steps') {
      expect(nextSteps.items.length).toBeGreaterThan(0);
    }

    // 5. Visual Updates
    const visual = cards.find(c => c.type === 'visual_update');
    expect(visual).toBeDefined();
    if (visual && visual.type === 'visual_update') {
      expect(visual.altText).toContain('Customer portal');
    }
  });

  it('handles empty and insufficient input gracefully without crashing', () => {
    const cards = generateSnippetCards('', [], []);
    expect(cards).toEqual([]);

    const whitespaceCards = generateSnippetCards('   \n  ', [], []);
    expect(whitespaceCards).toEqual([]);
  });

  it('preserves exact source passage references in generated cards', () => {
    const notes = 'Three critical defects remain open, including a payment callback issue.';
    const cards = generateSnippetCards(notes, [], []);

    const risk = cards.find(c => c.type === 'risk_blocker');
    expect(risk).toBeDefined();
    expect(risk?.sourceRef?.passageText).toBe(notes);
    expect(risk?.sourceRef?.confidence).toBe('explicit');
  });
});
