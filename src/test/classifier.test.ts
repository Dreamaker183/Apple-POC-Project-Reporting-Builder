import { describe, expect, it } from 'vitest';
import { cardsFromFindings, classifyPassages } from '../lib/parsing/classifier';
import { mergeReviewedCards } from '../lib/composition/mergeReviewedCards';
import { createSampleProject } from '../lib/sampleData';

describe('Passage classification review', () => {
  it('keeps evidence offsets and recognizes accomplishment, metric, risk and action findings', () => {
    const text = 'We completed the profile page. API latency dropped from 260ms to 240ms against a 200ms target. Payment validation is blocked by a callback defect. Maya will investigate by Friday.';
    const findings = classifyPassages(text);
    expect(findings.map(f => f.category)).toEqual(['accomplishment', 'metric', 'risk', 'action']);
    for (const finding of findings) expect(text.slice(finding.sourceStart, finding.sourceEnd)).toBe(finding.evidence);
    const metric = findings.find(f => f.category === 'metric')!;
    expect(metric.metric).toMatchObject({ value: 240, previousValue: 260, target: 200, unit: 'ms', chartStyle: 'trend' });
    expect(findings.find(f => f.category === 'action')?.detail).toContain('Maya');
    expect(findings.find(f => f.category === 'action')?.detail).toContain('Friday');
  });

  it('avoids false risk findings for negated and resolved issues', () => {
    const findings = classifyPassages('No blockers remain. The callback defect was resolved. The release is on track.');
    expect(findings.some(f => f.category === 'risk')).toBe(false);
  });

  it('does not call completed work an action and leaves unknown targets blank', () => {
    const findings = classifyPassages('The redesign is complete. Active users reached 120.');
    expect(findings.map(f => f.category)).toEqual(['accomplishment', 'metric']);
    expect(findings.find(f => f.category === 'metric')?.metric?.target).toBeUndefined();
  });

  it('creates only the categories explicitly selected in review', () => {
    const findings = classifyPassages('The profile page shipped. A callback defect blocks validation. Maya will investigate tomorrow.');
    const chosen = findings.map(f => ({ ...f, selected: f.category !== 'risk' }));
    const cards = cardsFromFindings(chosen, [], [], 'Portal');
    expect(cards.some(c => c.type === 'executive_summary')).toBe(true);
    expect(cards.some(c => c.type === 'risk_blocker')).toBe(false);
    expect(cards.some(c => c.type === 'next_steps')).toBe(true);
  });

  it('merges reviewed findings while preserving edited cards and stable IDs', () => {
    const project = createSampleProject();
    const card = { ...project.cards[0], manuallyEdited: true, title: 'My wording' };
    const next = { ...project.cards[0], id: 'new-id', title: 'Generated wording' };
    const merged = mergeReviewedCards([card], [next]);
    expect(merged).toEqual([card]);
    const plain = mergeReviewedCards([project.cards[0]], [next]);
    expect(plain[0]).toMatchObject({ id: project.cards[0].id, title: 'Generated wording' });
  });

  it('appends incremental accomplishments and actions into singleton cards and keeps distinct risks', () => {
    const first = cardsFromFindings(
      classifyPassages('We completed the profile page. Payment validation is blocked by a callback defect. Maya will investigate by Friday.'),
      [],
      [],
      'Portal'
    );
    const second = cardsFromFindings(
      classifyPassages('We shipped the audit log view. Database replication is behind schedule. Alex will tune the replica by Monday.'),
      [],
      [],
      'Portal'
    );
    const merged = mergeReviewedCards(first, second);
    const summaries = merged.filter(c => c.type === 'executive_summary');
    const nextSteps = merged.filter(c => c.type === 'next_steps');
    const risks = merged.filter(c => c.type === 'risk_blocker');
    expect(summaries).toHaveLength(1);
    if (summaries[0].type === 'executive_summary') {
      expect(summaries[0].keyAccomplishments).toHaveLength(2);
    }
    expect(nextSteps).toHaveLength(1);
    if (nextSteps[0].type === 'next_steps') {
      expect(nextSteps[0].items).toHaveLength(2);
    }
    expect(risks).toHaveLength(2);
  });

  it('classifies and converts milestone findings into milestone cards', () => {
    const findings = classifyPassages('Phase 2 milestone is on track for Oct 16.');
    expect(findings[0].category).toBe('milestone');
    const cards = cardsFromFindings(findings, [], [], 'Portal');
    expect(cards[0]).toMatchObject({
      type: 'milestone',
      status: 'on_track',
      dueDate: 'Oct 16',
    });
  });
});
