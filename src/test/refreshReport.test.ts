import { describe, expect, it } from 'vitest';
import { createSampleProject } from '../lib/sampleData';
import { refreshReport } from '../lib/composition/refreshReport';
import { prepareReviewedUpdate } from '../lib/composition/prepareReviewedUpdate';
import { mergeReviewedCards } from '../lib/composition/mergeReviewedCards';
import { classifyPassages } from '../lib/parsing/classifier';
import { syncMetricCards } from '../lib/composition/syncMetricCards';

describe('Demo-safe report refresh', () => {
  it('preserves a reviewed correction and excluded narrative during refresh', () => {
    const project = createSampleProject();
    const findings = classifyPassages('Average API response time is 220 ms against target 200 ms. Procurement is blocked.').map(finding => ({ ...finding, selected: finding.category === 'metric', metric: finding.metric ? { ...finding.metric, name: 'Average API response time' } : undefined }));
    const prepared = prepareReviewedUpdate(findings, project.metrics, [], [], project.title);
    const reviewed = { ...project, rawNotes: `${project.rawNotes}\nProcurement is blocked.`, metrics: prepared.metrics, cards: mergeReviewedCards(project.cards, prepared.cards) };
    const refreshed = refreshReport(reviewed);
    expect(refreshed).toEqual(reviewed.cards);
    expect(refreshed.find(card => card.type === 'kpi_metric' && card.label === 'Average API response time')).toMatchObject({ value: 220, target: 200, manuallyEdited: true });
    expect(JSON.stringify(refreshed.filter(card => card.type === 'risk_blocker'))).not.toContain('Procurement');
  });

  it('retains manual cards and order and supports initial generation', () => {
    const project = createSampleProject();
    const reversed = { ...project, cards: [...project.cards].reverse() };
    expect(refreshReport(reversed).map(card => card.id)).toEqual(reversed.cards.map(card => card.id));
    expect(refreshReport({ ...project, cards: [] }).map(card => card.type)).toEqual(project.cards.map(card => card.type));
  });

  it('accepts a later explicit structured correction without losing earlier evidence', () => {
    const project = createSampleProject();
    const metrics = project.metrics.map(metric => metric.name === 'Average API response time' ? { ...metric, value: 210 } : metric);
    const cards = syncMetricCards(project.cards.map(card => ({ ...card, manuallyEdited: true })), project.metrics, metrics);
    const refreshed = refreshReport({ ...project, cards, metrics });
    expect(refreshed.find(card => card.type === 'kpi_metric' && card.label === 'Average API response time')).toMatchObject({ value: 210, sourceRef: { confidence: 'manual', notes: expect.stringContaining('240 ms') } });
  });

  it('appends accepted context with matching combined provenance', () => {
    const first = prepareReviewedUpdate(classifyPassages('The team is remote.'), [], [], [], 'Demo');
    const second = prepareReviewedUpdate(classifyPassages('The workshop is on Friday.'), [], [], [], 'Demo');
    const cards = mergeReviewedCards(first.cards, second.cards);
    expect(cards[0]).toMatchObject({ type: 'executive_summary', summary: 'The team is remote. The workshop is on Friday.', sourceRef: { passageText: 'The team is remote.\n\nThe workshop is on Friday.' } });
  });

  it('allocates distinct IDs for separate risks and milestones at identical draft offsets', () => {
    const first = prepareReviewedUpdate(classifyPassages('Procurement is blocked. Phase 1 milestone is achieved.'), [], [], [], 'Demo');
    const second = prepareReviewedUpdate(classifyPassages('Deployment is blocked. Phase 2 milestone is achieved.'), [], [], [], 'Demo');
    const cards = mergeReviewedCards(first.cards, second.cards);
    expect(new Set(cards.map(card => card.id)).size).toBe(cards.length);
    const risk = cards.find(card => card.type === 'risk_blocker')!;
    expect(cards.filter(card => card.id !== risk.id).filter(card => card.type === 'risk_blocker')).toHaveLength(1);
  });

  it.each([
    [190, 200, 'lower', 'improving'], [240, 200, 'lower', 'declining'],
    [190, 200, 'neutral', undefined], [190, undefined, 'lower', undefined],
  ] as const)('recomputes derived metric status for %s against %s', (value, target, direction, trend) => {
    const project = createSampleProject();
    const metrics = project.metrics.map(metric => metric.name === 'Average API response time' ? { ...metric, value, target, direction } : metric);
    const cards = syncMetricCards(project.cards, project.metrics, metrics);
    expect(refreshReport({ ...project, cards, metrics }).find(card => card.type === 'kpi_metric' && card.label === 'Average API response time')).toMatchObject({ trend });
  });
});
