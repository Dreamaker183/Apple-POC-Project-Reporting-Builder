import { describe, expect, it } from 'vitest';
import { cardsFromFindings, classifyPassages, type ClassificationFinding } from '../lib/parsing/classifier';
import { prepareReviewedUpdate } from '../lib/composition/prepareReviewedUpdate';
import type { ImageAssetInput, MetricInput } from '../types/report';

const finding = (metric: MetricInput): ClassificationFinding => ({
  id: 'reviewed-metric', category: 'metric', title: metric.name, detail: 'Reviewed value',
  evidence: 'Original metric evidence.', selected: true, confidence: 'review', metric,
  sourceStart: 0, sourceEnd: 25,
});

describe('classifier regressions', () => {
  it('retains decimals and exact evidence offsets in bullet sentences', () => {
    const text = '- Conversion is 12.5% against a target of 15.5%. Latency is 0.75ms.';
    const metrics = classifyPassages(text).filter(f => f.category === 'metric');
    expect(metrics.map(f => f.metric?.value)).toEqual([12.5, 0.75]);
    expect(metrics[0].metric?.target).toBe(15.5);
    for (const f of metrics) expect(text.slice(f.sourceStart, f.sourceEnd)).toBe(f.evidence);
  });

  it('uses the primary value rather than percentile labels or trailing numbers', () => {
    const metrics = classifyPassages('API latency is 240ms (p99 380ms), target 200ms. p99 latency is 310ms across 12 requests.').filter(f => f.metric);
    expect(metrics.map(f => f.metric?.value)).toEqual([240, 310]);
    expect(metrics[0].metric).toMatchObject({ name: 'API latency', target: 200, unit: 'ms' });
    expect(classifyPassages('Latency dropped from 260ms to 240ms; p99 is 260ms.').find(f => f.metric)?.metric)
      .toMatchObject({ value: 240, previousValue: 260, name: 'Latency' });
  });

  it('treats future completion as an action, not an accomplishment', () => {
    for (const text of ['Maya will complete validation by Friday.', 'The release will be completed by Monday.', 'Alex plans to resolve defects.']) {
      const categories = classifyPassages(text).map(f => f.category);
      expect(categories).toContain('action');
      expect(categories).not.toContain('accomplishment');
    }
  });

  it('recognizes plural risks, negation, resolution and explicit blocker labels', () => {
    expect(classifyPassages('Defects remain open. Bugs affect checkout. Issues need attention.').filter(f => f.category === 'risk')).toHaveLength(3);
    expect(classifyPassages('No defects remain. Bugs were fixed. No blockers remain.').some(f => f.category === 'risk')).toBe(false);
    const cards = cardsFromFindings(classifyPassages('Blocker: vendor approval is pending.'), [], [], 'Portal');
    expect(cards[0]).toMatchObject({ type: 'risk_blocker', isBlocker: true, manuallyEdited: true });
  });
});

describe('prepareReviewedUpdate', () => {
  it('keeps existing IDs and omitted settings while retaining reviewed fields without mutating inputs', () => {
    const existing: MetricInput = { id: 'portal-latency', name: 'Latency', value: 260, unit: 'ms', target: 200, previousValue: 280, direction: 'lower', chartStyle: 'trend' };
    const update: MetricInput = { id: 'metric-source-0', name: ' latency ', value: 235.5, unit: 'milliseconds', target: undefined, previousValue: undefined, direction: undefined, chartStyle: undefined, explanation: 'Corrected by reviewer' };
    const { cards, metrics } = prepareReviewedUpdate([finding(update)], [existing], [], [], 'Portal');
    expect(metrics).toEqual([{ ...existing, name: update.name, value: update.value, unit: update.unit, explanation: update.explanation }]);
    expect(cards[0]).toMatchObject({ sourceKey: 'metric:portal-latency', value: 235.5, target: 200, previousValue: 280, direction: 'lower', chartStyle: 'trend', explanation: update.explanation, manuallyEdited: true });
    expect(existing.value).toBe(260);
    expect(update.id).toBe('metric-source-0');
  });

  it('honors explicit zero and neutral/number overrides', () => {
    const old: MetricInput = { id: 'm', name: 'Defects', value: 4, unit: '', target: 2, previousValue: 5, direction: 'lower', chartStyle: 'trend' };
    const update = { ...old, value: 0, target: 0, previousValue: 0, direction: 'neutral' as const, chartStyle: 'number' as const };
    expect(prepareReviewedUpdate([finding(update)], [old], [], [], 'Portal').metrics).toEqual([update]);
  });

  it('does not overwrite configured direction or graph on a routine extracted update', () => {
    const existing: MetricInput = { id: 'sprint', name: 'Sprint completion', value: 85, unit: '%', target: 100, direction: 'higher', chartStyle: 'bar' };
    const findings = classifyPassages('Sprint completion is 90% against target 100%.');
    expect(prepareReviewedUpdate(findings, [existing], [], [], 'Demo').metrics[0]).toMatchObject({ id: 'sprint', value: 90, direction: 'higher', chartStyle: 'bar' });
  });

  it('allocates unique IDs across updates and projects even for identical source offsets and names with equal slugs', () => {
    const first = finding({ id: 'metric-source-0', name: 'A/B', value: 1, unit: '%' });
    const second = finding({ id: 'metric-source-0', name: 'A B', value: 2, unit: '%' });
    const a = prepareReviewedUpdate([first, second], [], [], [], 'Portal');
    const b = prepareReviewedUpdate([first], [], [], [], 'Portal');
    expect(new Set([...a.metrics, ...b.metrics].map(m => m.id)).size).toBe(3);
    expect(a.cards.map(c => c.sourceKey)).toEqual(a.metrics.map(m => `metric:${m.id}`));
  });

  it('includes pending typed KPIs and images, but no cards for untouched or deselected metrics', () => {
    const existing: MetricInput = { id: 'old', name: 'Revenue', value: 10, unit: '$' };
    const pending: MetricInput = { id: 'attached', name: 'Active users', value: 150, unit: 'users', explanation: 'Typed correction' };
    const image: ImageAssetInput = { id: 'image-1', name: 'screen.png', dataUrl: 'data:image/png;base64,AA==', altText: 'Screen', fileSize: 2, fileType: 'image/png' };
    const excluded = { ...finding({ id: 'ignored', name: 'Ignored', value: 9, unit: '%' }), selected: false };
    const result = prepareReviewedUpdate([excluded], [existing], [pending], [image, image], 'Portal');
    expect(result.metrics.map(m => m.name)).toEqual(['Revenue', 'Active users']);
    expect(result.cards.map(c => c.type)).toEqual(['kpi_metric', 'visual_update']);
    expect(result.cards[0]).toMatchObject({ explanation: 'Typed correction', sourceRef: { confidence: 'manual', notes: expect.stringMatching(/typed|structured/i) } });
    for (const card of result.cards) {
      expect(card.manuallyEdited).toBe(true);
      expect(card.sourceRef?.notes).toMatch(/not.*verif/i);
    }
  });

  it('deduplicates source keys and gives reviewed corrections precedence over pending values', () => {
    const pending: MetricInput = { id: 'pending', name: 'Latency', value: 300, unit: 'ms', target: 200 };
    const reviewed = finding({ id: 'metric-source-0', name: 'Latency', value: 240, unit: 'ms' });
    const risks = classifyPassages('Blocker: approval pending. Blocker: approval pending.');
    const { cards, metrics } = prepareReviewedUpdate([reviewed, reviewed, ...risks], [], [pending, pending], [], 'Portal');
    expect(metrics).toHaveLength(1);
    expect(metrics[0]).toMatchObject({ value: 240, target: 200 });
    expect(cards.filter(c => c.type === 'kpi_metric')).toHaveLength(1);
    expect(cards.find(c => c.type === 'kpi_metric')).toMatchObject({ value: 240, target: 200 });
    expect(new Set(cards.map(c => c.sourceKey)).size).toBe(cards.length);
  });

  it('retains a matching project ID when the reviewer renames a metric', () => {
    const old: MetricInput = { id: 'project-kpi', name: 'Latency', value: 300, unit: 'ms', target: 200 };
    const result = prepareReviewedUpdate([finding({ ...old, name: 'API response time', value: 240 })], [old], [], [], 'Portal');
    expect(result.metrics).toHaveLength(1);
    expect(result.cards[0]).toMatchObject({ sourceKey: 'metric:project-kpi', label: 'API response time', value: 240 });
  });

  it('does not mistake a legacy extraction offset ID for project metric identity', () => {
    const old: MetricInput = { id: 'metric-source-0', name: 'Revenue', value: 300, unit: '$' };
    const result = prepareReviewedUpdate([finding({ id: 'metric-source-0', name: 'Latency', value: 240, unit: 'ms' })], [old], [], [], 'Portal');
    expect(result.metrics).toHaveLength(2);
    expect(result.cards[0]).toMatchObject({ label: 'Latency', value: 240, unit: 'ms' });
    expect(result.cards[0].sourceKey).not.toBe('metric:metric-source-0');
  });

  it('marks every reviewed category and action provenance without treating review as verification', () => {
    const findings = classifyPassages('We shipped the profile. Latency is 240ms. Blocker: approval pending. Phase 2 milestone is on track. Maya will investigate by Friday. The team is remote.');
    const { cards } = prepareReviewedUpdate(findings, [], [], [], 'Portal');
    expect(cards).toHaveLength(5);
    for (const card of cards) {
      expect(card.manuallyEdited).toBe(true);
      expect(card.sourceRef?.confidence).toBe('inferred');
      expect(card.sourceRef?.notes).toMatch(/reviewed/i);
      expect(card.sourceRef?.notes).toMatch(/not.*verif/i);
      if (card.type === 'next_steps') expect(card.items[0].sourceRef?.confidence).toBe('inferred');
    }
  });

  it('keeps the cardsFromFindings API compatible and resolves omitted existing fields', () => {
    const existing: MetricInput = { id: 'm', name: 'Latency', value: 300, unit: 'ms', target: 200 };
    const cards = cardsFromFindings([finding({ id: 'metric-source-0', name: 'Latency', value: 240, unit: 'ms', target: undefined })], [existing], [], 'Portal');
    expect(cards[0]).toMatchObject({ sourceKey: 'metric:m', target: 200, value: 240 });
  });
});
