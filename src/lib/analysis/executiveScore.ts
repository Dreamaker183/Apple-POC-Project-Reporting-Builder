/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ReportProject, ReadinessScore, ReadinessItem } from '../../types/report';
import { DictKey, en } from '../i18n/dictionaries';

export type ScoreT = (key: DictKey, vars?: Record<string, string | number>) => string;

const englishT: ScoreT = (key, vars) => {
  let text: string = en[key] ?? key;
  if (vars) {
    for (const [name, value] of Object.entries(vars)) {
      text = text.replaceAll(`{${name}}`, String(value));
    }
  }
  return text;
};

/**
 * Evaluates an explainable Executive-Ready score and diagnostic checklist.
 * Note: Checks structural completeness, accessibility, and clarity.
 * Does not claim to independently verify underlying factual accuracy.
 */
export function calculateExecutiveScore(project: ReportProject, t: ScoreT = englishT): ReadinessScore {
  const items: ReadinessItem[] = [];

  // Check 1: Executive Summary presence
  const execCard = project.cards.find(c => c.type === 'executive_summary');
  if (!execCard) {
    items.push({
      id: 'check-exec-summary',
      category: 'completeness',
      label: t('score.execLabel'),
      status: 'fail',
      description: t('score.execMissing'),
      actionableFix: 'Add Executive Summary card summarizing bottom-line achievements.',
      spotlight: 'add-card',
      spotlightCardType: 'executive_summary',
    });
  } else {
    items.push({
      id: 'check-exec-summary',
      category: 'completeness',
      label: t('score.execLabel'),
      status: 'pass',
      description: t('score.execPresent'),
      actionableFix: 'Looking great.',
      cardId: execCard.id,
    });
  }

  // Textual uncertainty detection only; absence is not factual validation.
  const uncertainty = /\b(?:not[\s-]*yet|unconfirmed|t\.?b\.?d\.?|unknown|not\s+(?:been\s+)?confirmed|to\s+be\s+(?:determined|confirmed)|pending\s+confirmation)\b/i;
  const unconfirmedCard = project.cards.find(c =>
    c.type === 'executive_summary' &&
    [c.statusNote, c.summary, ...c.keyAccomplishments].some(text => uncertainty.test(text ?? ''))
  );
  if (unconfirmedCard) {
    items.push({
      id: 'check-unconfirmed-release',
      category: 'completeness',
      label: t('score.releaseLabel'),
      status: 'warning',
      description: t('score.releaseWarn'),
      actionableFix: 'Clarify release date target window or specify security gating dependency.',
      cardId: unconfirmedCard.id,
    });
  } else {
    items.push({
      id: 'check-unconfirmed-release',
      category: 'completeness',
      label: t('score.releaseLabel'),
      status: 'pass',
      description: 'No uncertainty wording detected in executive summaries; release facts are not validated.',
      actionableFix: 'Looking great.',
    });
  }

  // Check 3: Reporting period specified
  if (!project.reportingPeriod || !project.reportingPeriod.trim()) {
    items.push({
      id: 'check-reporting-period',
      category: 'completeness',
      label: t('score.periodLabel'),
      status: 'warning',
      description: t('score.periodMissing'),
      actionableFix: 'Set the reporting period window in header.',
      spotlight: 'header',
    });
  } else {
    items.push({
      id: 'check-reporting-period',
      category: 'completeness',
      label: t('score.periodLabel'),
      status: 'pass',
      description: t('score.periodDefined', { period: project.reportingPeriod }),
      actionableFix: 'Looking great.',
    });
  }

  // Check 4: Metric target benchmark clarity
  const metricCards = project.cards.filter(c => c.type === 'kpi_metric');
  if (metricCards.length === 0) {
    items.push({
      id: 'check-metrics-presence',
      category: 'metrics',
      label: t('score.metricsLabel'),
      status: 'warning',
      description: t('score.metricsMissing'),
      actionableFix: 'Add at least one KPI metric (e.g. velocity, latency, or defects).',
      spotlight: 'add-card',
      spotlightCardType: 'kpi_metric',
    });
  } else {
    const missingTargets = metricCards.filter(m => m.target === undefined);
    if (missingTargets.length > 0) {
      items.push({
        id: 'check-metrics-targets',
        category: 'metrics',
        label: t('score.targetsLabel'),
        status: 'warning',
        description: t('score.targetsMissing', { count: missingTargets.length }),
        actionableFix: `Set target benchmark for "${missingTargets[0].title}".`,
        cardId: missingTargets[0].id,
      });
    } else {
      items.push({
        id: 'check-metrics-targets',
        category: 'metrics',
        label: t('score.targetsLabel'),
        status: 'pass',
        description: 'All metrics have target fields populated; target accuracy is not validated.',
        actionableFix: 'Looking great.',
      });
    }
  }

  // Check 5: Action item ownership & DRIs
  const nextStepsCards = project.cards.filter(c => c.type === 'next_steps');
  let totalSteps = 0;
  let unassignedSteps = 0;
  nextStepsCards.forEach(card => {
    card.items.forEach(item => {
      totalSteps++;
      if (!item.owner || !item.owner.trim()) {
        unassignedSteps++;
      }
    });
  });

  if (totalSteps > 0 && unassignedSteps > 0) {
    const ownerlessCard = nextStepsCards.find(card =>
      card.items.some(item => !item.owner || !item.owner.trim())
    );
    items.push({
      id: 'check-action-ownership',
      category: 'ownership',
      label: t('score.ownershipLabel'),
      status: 'warning',
      description: t('score.ownershipMissing', { count: unassignedSteps }),
      actionableFix: 'Assign DRI owner to next steps for accountability.',
      cardId: ownerlessCard?.id,
    });
  } else if (totalSteps > 0) {
    items.push({
      id: 'check-action-ownership',
      category: 'ownership',
      label: t('score.ownershipLabel'),
      status: 'pass',
      description: 'All next steps have owner fields populated; assignments are not validated.',
      actionableFix: 'Looking great.',
    });
  } else {
    items.push({
      id: 'check-action-ownership',
      category: 'ownership',
      label: t('score.actionPlanLabel'),
      status: 'fail',
      description: t('score.actionPlanMissing'),
      actionableFix: 'Add a Next Steps card with prioritized action items.',
      spotlight: 'add-card',
      spotlightCardType: 'next_steps',
    });
  }

  // Check 6: Image accessibility (WCAG AA Alt Text)
  const visualCards = project.cards.filter(c => c.type === 'visual_update');
  if (visualCards.length > 0) {
    const missingAlt = visualCards.filter(v => !v.altText || v.altText.trim().length < 5);
    if (missingAlt.length > 0) {
      items.push({
        id: 'check-accessibility-alt',
        category: 'accessibility',
        label: t('score.altLabel'),
        status: 'fail',
        description: t('score.altMissing', { count: missingAlt.length }),
        actionableFix: `Provide descriptive alt text for "${missingAlt[0].title}".`,
        cardId: missingAlt[0].id,
      });
    } else {
      items.push({
        id: 'check-accessibility-alt',
        category: 'accessibility',
        label: t('score.altLabel'),
        status: 'pass',
        description: 'All visual cards have alternative text of at least five characters; image accuracy and accessibility are not validated.',
        actionableFix: 'Looking great.',
      });
    }
  }

  // Score calculation: pass = 100%, warning = 60%, fail = 0%
  const totalChecks = items.length;
  let points = 0;
  let passedCount = 0;
  items.forEach(it => {
    if (it.status === 'pass') {
      points += 1;
      passedCount += 1;
    } else if (it.status === 'warning') {
      points += 0.6;
    }
  });

  const finalScore = totalChecks > 0 ? Math.round((points / totalChecks) * 100) : 100;

  return {
    score: finalScore,
    totalChecks,
    passedChecks: passedCount,
    items,
  };
}

/**
 * Compatibility entry point for readiness actions. These checks require facts
 * or human review, so callers must route to field/manual guidance instead.
 * Even alt text needs image knowledge; a title alone cannot establish it.
 */
export function applyQuickFixToProject(project: ReportProject, _checkId: string): ReportProject {
  return project;
}
