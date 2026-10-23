import { describe, expect, it } from 'vitest';
import { applyQuickFixToProject, calculateExecutiveScore } from '../lib/analysis/executiveScore';
import { ReportProject } from '../types/report';

const baseCard = { createdAt: '2026-10-01', updatedAt: '2026-10-01' };

function createProject(): ReportProject {
  return {
    id: 'trust-test', title: 'Status report', reportingPeriod: '', rawNotes: '',
    metrics: [], images: [], lastSavedAt: '', isDirty: false,
    cards: [
      { ...baseCard, id: 'summary', type: 'executive_summary', title: 'Summary',
        summary: 'Review in progress.', keyAccomplishments: [], statusNote: 'Release unconfirmed' },
      { ...baseCard, id: 'metric', type: 'kpi_metric', title: 'Latency',
        label: 'Latency', value: 240, unit: 'ms' },
      { ...baseCard, id: 'steps', type: 'next_steps', title: 'Next steps',
        items: [{ id: 'review', action: 'Review results', status: 'planned' }] },
      { ...baseCard, id: 'visual', type: 'visual_update', title: 'Results',
        imageUrl: '/results.png', altText: '', caption: '' },
    ],
  };
}

describe('Executive readiness trust boundaries', () => {
  it.each([
    'check-reporting-period', 'check-unconfirmed-release', 'check-metrics-targets',
    'check-action-ownership', 'check-accessibility-alt', 'check-exec-summary',
    'check-metrics-presence', 'unknown-check',
  ])('leaves facts, provenance, and dirty state unchanged for %s', checkId => {
    const project = createProject();
    const before = structuredClone(project);
    expect(applyQuickFixToProject(project, checkId)).toBe(project);
    expect(project).toEqual(before);
  });

  it('does not create accomplishments or cards for a missing summary', () => {
    const project = { ...createProject(), cards: [] };
    expect(applyQuickFixToProject(project, 'check-exec-summary')).toBe(project);
    expect(calculateExecutiveScore(project).items.find(item => item.id === 'check-exec-summary')?.status)
      .toBe('fail');
  });

  it.each([
    'Release not yet confirmed', 'Release NOTYET confirmed', 'Release not-yet confirmed',
    'Release UNCONFIRMED', 'Release TBD', 'Release unknown', 'Release not confirmed',
    'Release to be determined', 'Release pending confirmation',
  ])('keeps uncertain release wording as a warning: %s', statusNote => {
    const project = createProject();
    const uncertain = { ...project, cards: project.cards.map(card =>
      card.type === 'executive_summary' ? { ...card, statusNote } : card) };
    const result = calculateExecutiveScore(applyQuickFixToProject(uncertain, 'check-unconfirmed-release'));
    expect(result.items.find(item => item.id === 'check-unconfirmed-release')?.status).toBe('warning');
    expect(result.score).toBeLessThan(100);
  });

  it('detects release uncertainty in the summary when the status note is absent', () => {
    const project = createProject();
    const uncertain = { ...project, cards: project.cards.map(card =>
      card.type === 'executive_summary'
        ? { ...card, summary: 'Release date is unknown.', statusNote: undefined } : card) };
    expect(calculateExecutiveScore(uncertain).items.find(item => item.id === 'check-unconfirmed-release')?.status)
      .toBe('warning');
  });

  it('cannot turn missing factual information into a perfect score by applying every fix', () => {
    const project = createProject();
    const initial = calculateExecutiveScore(project);
    const fixed = initial.items.reduce((current, item) => applyQuickFixToProject(current, item.id), project);
    expect(calculateExecutiveScore(fixed)).toEqual(initial);
    expect(initial.score).toBeLessThan(100);
  });

  it('describes a release pass as a text check without asserting timeline validation', () => {
    const project = { ...createProject(), cards: [] };
    const release = calculateExecutiveScore(project).items.find(item => item.id === 'check-unconfirmed-release');
    expect(release?.description).toContain('not validated');
    expect(release?.description).not.toContain('unambiguously stated');
  });
});
