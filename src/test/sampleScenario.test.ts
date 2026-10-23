import { describe, expect, it } from 'vitest';
import * as sample from '../lib/sampleData';
import { generateSnippetCards } from '../lib/parsing/deterministicParser';
import { compareReportSnapshots } from '../lib/analysis/snapshotDiff';
import { ReportProjectSchema } from '../schemas/reportSchema';
import { SourceReference } from '../types/report';

function expectOriginalSource(text: string, ref?: SourceReference) {
  expect(ref?.confidence).toBe('explicit');
  expect(ref?.startIndex).toBeTypeOf('number');
  expect(ref?.endIndex).toBeTypeOf('number');
  expect(text.slice(ref!.startIndex, ref!.endIndex)).toBe(ref!.passageText);
}

describe('Fictional reporting scenario', () => {
  it.each([false, true])('seeds six source-backed card types (messy=%s)', (messy) => {
    const project = sample.createSampleProject(messy);
    expect(project.title).toMatch(/fictional/i);
    expect(project.rawNotes).toMatch(/fictional/i);
    expect(project.reportingPeriod).toBe('2026-10-09');
    expect(project.rawNotes).toContain('2026-10-03..2026-10-09');
    expect(project.rawNotes).toContain('As of 2026-10-09');
    expect(new Set(project.cards.map(c => c.type))).toEqual(new Set([
      'executive_summary', 'kpi_metric', 'risk_blocker', 'next_steps', 'milestone', 'visual_update',
    ]));
    expect(project.metrics.map(m => [m.name, m.value, m.unit, m.previousValue])).toEqual([
      ['Sprint completion', 85, '%', 70],
      ['Open critical defects', 3, 'defects', 5],
      ['Average API response time', 240, 'ms', 260],
    ]);
    expect(project.metrics[2].target).toBe(200);
    for (const metric of project.metrics) {
      expect(metric.explanation).toContain('2026-10-03..2026-10-09');
      expect(metric.explanation).toContain('2026-09-26..2026-10-02');
      expect(metric.explanation).not.toMatch(/p99/i);
    }
    for (const card of project.cards.filter(c => c.type !== 'visual_update')) {
      expectOriginalSource(project.rawNotes, card.sourceRef);
    }
    const risks = project.cards.filter(c => c.type === 'risk_blocker');
    expect(risks).toHaveLength(1);
    expect(risks[0].description).toContain('payment callback issue');
    expect(risks[0].isBlocker).toBe(true);
    expect(risks[0].mitigation).toBeUndefined();
    expect(risks[0].impact).toBeUndefined();
    const milestones = project.cards.filter(c => c.type === 'milestone');
    expect(milestones).toHaveLength(1);
    expect(milestones[0]).toMatchObject({ status: 'achieved', owner: 'Marcus', dueDate: '2026-10-08' });
    const actions = project.cards.find(c => c.type === 'next_steps')!;
    expect(actions.items.length).toBeGreaterThan(0);
    for (const action of actions.items) {
      expect(action.owner).toBeTruthy();
      expect(action.dueDate).toMatch(/^2026-10-\d{2}$/);
      expect(action.action).toContain(action.owner);
      expect(action.action).toContain(action.dueDate);
      expectOriginalSource(project.rawNotes, action.sourceRef);
    }
    expect(ReportProjectSchema.safeParse(JSON.parse(JSON.stringify(project))).success).toBe(true);
  });

  it('keeps the baseline unresolved and comparisons meaningful and repeatable', () => {
    const baseline = sample.WEEK_40_BASELINE_SNAPSHOT;
    const actions = baseline.find(c => c.type === 'next_steps')!;
    expect(actions.items.find(i => /database/.test(i.action))?.status).toBe('in_progress');
    expect(baseline.filter(c => c.type === 'kpi_metric').map(c => c.value)).toEqual([70, 5, 260]);
    expect(JSON.stringify(baseline)).not.toMatch(/p99/i);
    const first = sample.createSampleProject();
    const second = sample.createSampleProject();
    expect(first.cards.map(c => c.sourceKey)).toEqual(second.cards.map(c => c.sourceKey));
    const diff = compareReportSnapshots(baseline, first.cards);
    expect(diff.metricChanges.map(c => c.diff)).toEqual([15, -2, -20]);
    expect(diff.metricChanges.every(c => c.improved)).toBe(true);
    expect(diff.resolvedRisks).toContain('Legacy database migration timeout');
    expect(diff.newBlockers).toHaveLength(1);
    expect(first.rawNotes).toMatch(/database migration timeout.*resolved/i);
  });

  it('exposes one exact 220 ms update without changing the initial 240 ms metric', () => {
    const update = sample.DEMO_UPDATE_TEXT;
    expect(update).toBe('Average API response time is 220 ms against target 200 ms.');
    expect(sample.SAMPLE_METRICS[2].value).toBe(240);
    const cards = generateSnippetCards(update, [{ ...sample.SAMPLE_METRICS[2], value: 220, explanation: update }], []);
    const metric = cards.find(c => c.type === 'kpi_metric')!;
    expect(metric.value).toBe(220);
    expectOriginalSource(update, metric.sourceRef);
  });
});

describe('Targeted passage extraction regressions', () => {
  it('retains newline bullets, decimal values, and exact offsets including CRLF', () => {
    const text = 'Sync notes\r\n- Critical payment issue blocks checkout at 2.5 requests per second\r\n• Sarah will resolve the payment defect by 2026-10-12\r\n1. Profile handoff milestone achieved on 2026-10-08; owner: Marcus';
    const cards = generateSnippetCards(text, [], []);
    const risk = cards.find(c => c.type === 'risk_blocker')!;
    expect(risk.description).toBe('Critical payment issue blocks checkout at 2.5 requests per second');
    expect(cards.filter(c => c.type === 'risk_blocker')).toHaveLength(1);
    expect(risk.impact).toBeUndefined();
    expect(risk.mitigation).toBeUndefined();
    expect(cards.find(c => c.type === 'next_steps')?.items[0]).toMatchObject({ owner: 'Sarah', dueDate: '2026-10-12' });
    expect(cards.find(c => c.type === 'milestone')?.status).toBe('achieved');
    cards.forEach(c => expectOriginalSource(text, c.sourceRef));
  });

  it('does not use an unrelated number or date as metric evidence', () => {
    const text = 'Build 3 is ready for review on 2026-10-03.';
    const cards = generateSnippetCards(text, [{ id: 'defects', name: 'Open critical defects', value: 3, unit: 'defects' }], []);
    expect(cards.find(c => c.type === 'kpi_metric')?.sourceRef?.startIndex).toBeUndefined();
  });

  it('does not cite an old measurement as evidence for a corrected metric value', () => {
    const text = 'Average API response time is 240 ms against target 200 ms.';
    const cards = generateSnippetCards(text, [{ ...sample.SAMPLE_METRICS[2], value: 220 }], []);
    expect(cards.find(c => c.type === 'kpi_metric')?.sourceRef?.startIndex).toBeUndefined();
  });

  it('preserves ordinary prose boundaries and only emits milestones with explicit status', () => {
    const cards = generateSnippetCards('Checkout is ready for review. Sarah plans to resolve defects by 2026-10-12. Release milestone status is unknown.', [], []);
    expect(cards.filter(c => c.type === 'risk_blocker')).toHaveLength(0);
    expect(cards.filter(c => c.type === 'milestone')).toHaveLength(0);
    expect(cards.find(c => c.type === 'executive_summary')?.summary).toBe('Checkout is ready for review.');
  });
});
