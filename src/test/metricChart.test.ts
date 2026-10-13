/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import { generateSnippetCards } from '../lib/parsing/deterministicParser';
import { MetricInputSchema, KpiMetricCardSchema } from '../schemas/reportSchema';
import { MetricInput } from '../types/report';

describe('Metric graph forms (chartStyle)', () => {
  it('accepts all graph styles in metric + card schemas', () => {
    for (const style of ['number', 'bar', 'donut', 'trend'] as const) {
      const metric = MetricInputSchema.safeParse({
        id: 'm1', name: 'Velocity', value: 90, unit: '%', target: 100, chartStyle: style,
      });
      expect(metric.success).toBe(true);
      const card = KpiMetricCardSchema.safeParse({
        id: 'c1', title: 'Velocity', createdAt: '', updatedAt: '',
        type: 'kpi_metric', label: 'Velocity', value: 90, unit: '%', chartStyle: style,
      });
      expect(card.success).toBe(true);
    }
  });

  it('rejects unknown graph styles', () => {
    const bad = MetricInputSchema.safeParse({
      id: 'm1', name: 'Velocity', value: 90, unit: '%', chartStyle: 'pie3d',
    });
    expect(bad.success).toBe(false);
  });

  it('carries the chosen graph form from metric input to generated card', () => {
    const metrics: MetricInput[] = [
      { id: 'm-bar', name: 'Completion', value: 85, unit: '%', target: 100, chartStyle: 'bar' },
      { id: 'm-donut', name: 'Uptime', value: 99, unit: '%', target: 100, chartStyle: 'donut' },
      { id: 'm-plain', name: 'Headcount', value: 12, unit: '' },
    ];
    const cards = generateSnippetCards('Sprint update notes.', metrics, [], 'Test');
    const byLabel = new Map(cards.filter(c => c.type === 'kpi_metric').map(c => [c.title, c]));
    expect(byLabel.get('Completion')).toMatchObject({ chartStyle: 'bar' });
    expect(byLabel.get('Uptime')).toMatchObject({ chartStyle: 'donut' });
    expect(byLabel.get('Headcount')).toMatchObject({ chartStyle: undefined });
  });

  it('preserves manually entered previous values and context notes on cards', () => {
    const metrics: MetricInput[] = [
      {
        id: 'm-full', name: 'Sprint completion', value: 85, unit: '%',
        target: 100, previousValue: 70,
        explanation: '85% of planned work, ahead of last sprint',
        chartStyle: 'trend',
      },
    ];
    const cards = generateSnippetCards('Sprint update notes.', metrics, [], 'Test');
    const card = cards.find(c => c.type === 'kpi_metric');
    expect(card).toMatchObject({
      previousValue: 70,
      explanation: '85% of planned work, ahead of last sprint',
      chartStyle: 'trend',
    });
  });
});
