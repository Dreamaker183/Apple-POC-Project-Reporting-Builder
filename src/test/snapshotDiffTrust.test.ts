import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { compareReportSnapshots } from '../lib/analysis/snapshotDiff';
import { SnapshotComparisonModal } from '../components/composition/SnapshotComparisonModal';
import type { KpiMetricCardData, NextStepsCardData, RiskBlockerCardData } from '../types/report';

const dates = { createdAt: '2026-10-01', updatedAt: '2026-10-01' };
const risk = (overrides: Partial<RiskBlockerCardData> = {}): RiskBlockerCardData => ({
  ...dates, id: 'risk-old', type: 'risk_blocker', title: 'Critical Blocker',
  description: 'Database migration timeout', severity: 'high', isBlocker: true, ...overrides,
});
const metric = (overrides: Partial<KpiMetricCardData> = {}): KpiMetricCardData => ({
  ...dates, id: 'metric', type: 'kpi_metric', title: 'Metric', label: 'Custom count',
  value: 10, unit: '', ...overrides,
});
const steps = (items: NextStepsCardData['items'], id = 'steps'): NextStepsCardData => ({
  ...dates, id, type: 'next_steps', title: 'Next steps', items,
});

describe('Snapshot comparison trust', () => {
  it('does not match different risks with the same generic title', () => {
    const diff = compareReportSnapshots([risk()], [risk({ id: 'risk-new', description: 'Payment callback failure' })]);
    expect(diff.resolvedRisks).toEqual(['Critical Blocker']);
    expect(diff.newBlockers).toEqual(['Critical Blocker']);
  });

  it.each([
    { id: 'risk-old', description: 'Updated mitigation details' },
    { id: 'regenerated', description: 'Database migration timeout' },
    { id: 'regenerated', sourceKey: 'risk:database', description: 'Updated details' },
  ])('retains risks with supported identity: %j', current => {
    const diff = compareReportSnapshots([risk({ sourceKey: 'risk:database' })], [risk(current)]);
    expect(diff.resolvedRisks).toEqual([]);
    expect(diff.newBlockers).toEqual([]);
  });

  it('does not treat empty descriptions as a shared identity', () => {
    const diff = compareReportSnapshots([risk({ description: '' })], [risk({ id: 'other', description: '', title: 'Other risk' })]);
    expect(diff.resolvedRisks).toEqual(['Critical Blocker']);
    expect(diff.newBlockers).toEqual(['Other risk']);
  });

  it('detects escalation of an existing risk into a blocker', () => {
    expect(compareReportSnapshots([risk({ isBlocker: false })], [risk()]).newBlockers).toEqual(['Critical Blocker']);
  });

  it.each([
    ['higher', 'Latency', 'ms', 20, true],
    ['higher', 'Latency', 'ms', 5, false],
    ['lower', 'Revenue', '$', 5, true],
    ['lower', 'Revenue', '$', 20, false],
    ['neutral', 'Revenue', '$', 20, false],
    ['neutral', 'Latency', 'ms', 5, false],
  ] as const)('honors direction=%s for %s (unit=%s, current=%s)', (direction, label, unit, value, improved) => {
    const diff = compareReportSnapshots([metric({ label, unit })], [metric({ label, unit, direction, value })]);
    expect(diff.metricChanges[0].improved).toBe(improved);
  });

  it('uses baseline direction when the current snapshot has none', () => {
    const diff = compareReportSnapshots([metric({ direction: 'lower' })], [metric({ value: 5 })]);
    expect(diff.metricChanges[0].improved).toBe(true);
  });

  it('preserves legacy inference, zero-baseline handling, and unchanged omission', () => {
    expect(compareReportSnapshots([metric({ label: 'Latency' })], [metric({ label: 'Latency', value: 5 })]).metricChanges[0].improved).toBe(true);
    expect(compareReportSnapshots([metric({ value: 0 })], [metric()]).metricChanges[0].percentChange).toBeUndefined();
    expect(compareReportSnapshots([metric()], [metric()]).metricChanges).toEqual([]);
  });

  it('counts only baseline non-completed to completed action transitions', () => {
    const baseline = steps([
      { id: 'planned', action: 'Review release', status: 'planned' },
      { id: 'active', action: 'Run migration', status: 'in_progress' },
      { id: 'done', action: 'Publish notes', status: 'completed' },
      { id: 'reopen', action: 'Check callbacks', status: 'completed' },
    ]);
    const current = steps([
      { id: 'planned', action: 'Review release', status: 'completed' },
      { id: 'active', action: 'Run migration', status: 'completed' },
      { id: 'done', action: 'Publish notes', status: 'completed' },
      { id: 'reopen', action: 'Check callbacks', status: 'in_progress' },
      { id: 'new', action: 'New completed task', status: 'completed' },
    ]);
    const diff = compareReportSnapshots([baseline], [current]);
    expect(diff.resolvedActions).toEqual(['Review release', 'Run migration']);
    expect(diff.outstandingActions).toEqual(['Check callbacks']);
    expect(compareReportSnapshots([current], [current]).resolvedActions).toEqual([]);
    expect(compareReportSnapshots([], [current]).resolvedActions).toEqual([]);
  });

  it('matches regenerated actions by text but not reused positional IDs for unrelated tasks', () => {
    const baseline = steps([{ id: 'step-1', action: 'Review release', status: 'planned' }]);
    const current = steps([
      { id: 'step-1', action: 'Unrelated task', status: 'completed' },
      { id: 'step-2', action: 'Review release', status: 'completed' },
    ], 'regenerated');
    expect(compareReportSnapshots([baseline], [current]).resolvedActions).toEqual(['Review release']);
  });

  it('tracks edited action text by stable card/item IDs and rejects ambiguous text fallback', () => {
    const baseline = steps([
      { id: 'review', action: 'Review release', status: 'planned' },
      { id: 'one', action: 'Check results', status: 'planned' },
      { id: 'two', action: 'Check results', status: 'completed' },
    ]);
    expect(compareReportSnapshots([baseline], [steps([
      { id: 'review', action: 'Review release with QA', status: 'completed' },
    ])]).resolvedActions).toEqual(['Review release with QA']);
    expect(compareReportSnapshots([baseline], [steps([
      { id: 'new', action: 'Check results', status: 'completed' },
    ], 'regenerated')]).resolvedActions).toEqual([]);
  });

  it('presents removed risks with verification wording and neutral metrics without improvement styling', () => {
    const html = renderToStaticMarkup(React.createElement(SnapshotComparisonModal, {
      initialCards: [risk(), metric()], currentCards: [metric({ value: 20, direction: 'neutral' })],
      isOpen: true, onClose: () => {}, onNotify: () => {},
    }));
    expect(html).toContain('Removed from report');
    expect(html).toContain('Verify resolution');
    expect(html).not.toMatch(/RESOLVED|Cleared since baseline|line-through|bg-emerald-50|bg-amber-50/);
    expect(html).toContain('No status judgement');
  });

  it('keeps empty comparisons and card counts compatible without mutating inputs', () => {
    const baseline = [risk(), metric()];
    const current = [metric({ value: 20 })];
    const before = structuredClone({ baseline, current });
    expect(compareReportSnapshots(baseline, current)).toMatchObject({ addedCardsCount: 0, removedCardsCount: 1 });
    expect({ baseline, current }).toEqual(before);
    expect(compareReportSnapshots([], [])).toEqual({
      newAccomplishments: [], metricChanges: [], resolvedRisks: [], newBlockers: [],
      outstandingActions: [], resolvedActions: [], addedCardsCount: 0, removedCardsCount: 0,
    });
  });
});
