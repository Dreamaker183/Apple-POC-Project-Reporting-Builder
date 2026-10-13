/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import { 
  createSampleProject, 
  SAMPLE_MESSY_SOURCE_TEXT, 
  WEEK_40_BASELINE_SNAPSHOT 
} from '../lib/sampleData';
import { generateSnippetCards } from '../lib/parsing/deterministicParser';
import { calculateExecutiveScore, applyQuickFixToProject } from '../lib/analysis/executiveScore';
import { compareReportSnapshots } from '../lib/analysis/snapshotDiff';
import { 
  formatForExecutiveEmail, 
  formatForSlack, 
  formatForTeams, 
  formatForWeeklyStatusMemo 
} from '../lib/export/destinationFormatters';

describe('Surprise-and-Delight Differentiator 1: Magic Transform & Source Traceability', () => {
  it('parses messy unstructured standup text and binds facts to source passages without hallucination', () => {
    const cards = generateSnippetCards(SAMPLE_MESSY_SOURCE_TEXT, [], []);

    expect(cards.length).toBeGreaterThan(0);

    // 1. Executive Summary
    const exec = cards.find(c => c.type === 'executive_summary');
    expect(exec).toBeDefined();
    expect(exec?.sourceRef).toBeDefined();
    expect(exec?.sourceRef?.confidence).toBe('explicit');

    // 2. Unconfirmed timeline note is preserved, never invented
    expect(exec?.statusNote).toContain('release date has not yet been confirmed');

    // 3. Risk & Blocker
    const blocker = cards.find(c => c.type === 'risk_blocker');
    expect(blocker).toBeDefined();
    expect(blocker?.isBlocker).toBe(true);
    expect(blocker?.sourceRef?.passageText).toContain('payment callback issue');
  });
});

describe('Surprise-and-Delight Differentiator 2: Executive-Ready Score', () => {
  it('diagnoses completeness, metrics, ownership, and accessibility with explainable fixes', () => {
    const project = createSampleProject();
    const initialScore = calculateExecutiveScore(project);

    expect(initialScore.score).toBeGreaterThan(0);
    expect(initialScore.items.length).toBeGreaterThanOrEqual(5);

    // Verifies all items explain the issue and provide actionable fix
    initialScore.items.forEach(item => {
      expect(item.description.length).toBeGreaterThan(5);
      expect(item.actionableFix.length).toBeGreaterThan(5);
    });
  });

  it('applies 1-click deterministic quick-fixes to resolve diagnostic warnings', () => {
    let project = createSampleProject();

    // Fix unassigned DRIs
    project = applyQuickFixToProject(project, 'check-action-ownership');
    const scoreAfterDri = calculateExecutiveScore(project);
    const driCheck = scoreAfterDri.items.find(i => i.id === 'check-action-ownership');
    expect(driCheck?.status).toBe('pass');

    // Fix unconfirmed release date note
    project = applyQuickFixToProject(project, 'check-unconfirmed-release');
    const scoreAfterRelease = calculateExecutiveScore(project);
    const releaseCheck = scoreAfterRelease.items.find(i => i.id === 'check-unconfirmed-release');
    expect(releaseCheck?.status).toBe('pass');
  });
});

describe('Surprise-and-Delight Differentiator 3: Destination-Aware Export', () => {
  const project = createSampleProject();

  it('formats identical underlying facts across Executive Email, Slack, Teams, and Weekly Memo', () => {
    const emailHtml = formatForExecutiveEmail(project);
    const slackMrkdwn = formatForSlack(project);
    const teamsFormat = formatForTeams(project);
    const memoFormat = formatForWeeklyStatusMemo(project);

    // Verify all four formats contain the core metric "85%"
    expect(emailHtml).toContain('85%');
    expect(slackMrkdwn).toContain('85%');
    expect(teamsFormat).toContain('85%');
    expect(memoFormat).toContain('85%');

    // Verify all four formats report the payment callback blocker
    expect(emailHtml.toLowerCase()).toContain('payment callback');
    expect(slackMrkdwn.toLowerCase()).toContain('payment callback');
    expect(teamsFormat.toLowerCase()).toContain('payment callback');
    expect(memoFormat.toLowerCase()).toContain('payment callback');

    // Verify destination-specific syntax
    expect(emailHtml).toContain('<table');
    expect(slackMrkdwn).toContain(':bar_chart:');
    expect(teamsFormat).toContain('### 📢');
    expect(memoFormat).toContain('WEEKLY STATUS REPORT:');
  });
});

describe('Surprise-and-Delight Differentiator 4: What\'s Changed? (Snapshot Diff)', () => {
  it('accurately identifies metric shifts, resolved blockers, and new milestones between Week 40 & 41', () => {
    const currentProject = createSampleProject();
    const diff = compareReportSnapshots(WEEK_40_BASELINE_SNAPSHOT, currentProject.cards);

    // 1. Metric shifts (Completion 70% -> 85%, Defects 5 -> 3, Latency 260ms -> 240ms)
    expect(diff.metricChanges.length).toBe(3);

    const completionShift = diff.metricChanges.find(m => m.label.toLowerCase().includes('completion'));
    expect(completionShift).toBeDefined();
    expect(completionShift?.oldValue).toBe(70);
    expect(completionShift?.newValue).toBe(85);
    expect(completionShift?.diff).toBe(15);
    expect(completionShift?.improved).toBe(true);

    const defectShift = diff.metricChanges.find(m => m.label.toLowerCase().includes('defect'));
    expect(defectShift?.oldValue).toBe(5);
    expect(defectShift?.newValue).toBe(3);
    expect(defectShift?.diff).toBe(-2);
    expect(defectShift?.improved).toBe(true);

    // 2. Resolved historical blocker: Legacy database migration timeout
    expect(diff.resolvedRisks).toContain('Legacy database migration timeout');

    // 3. New blocker in Week 41: Payment callback issue
    expect(diff.newBlockers.length).toBeGreaterThan(0);
    expect(diff.newBlockers[0]).toContain('Defect');
  });
});
