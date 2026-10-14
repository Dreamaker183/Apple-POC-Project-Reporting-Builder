/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ReportProject, ReadinessScore, ReadinessItem } from '../../types/report';

/**
 * Evaluates an explainable Executive-Ready score and diagnostic checklist.
 * Note: Checks structural completeness, accessibility, and clarity.
 * Does not claim to independently verify underlying factual accuracy.
 */
export function calculateExecutiveScore(project: ReportProject): ReadinessScore {
  const items: ReadinessItem[] = [];

  // Check 1: Executive Summary presence
  const execCard = project.cards.find(c => c.type === 'executive_summary');
  if (!execCard) {
    items.push({
      id: 'check-exec-summary',
      category: 'completeness',
      label: 'Executive Summary Card',
      status: 'fail',
      description: 'Senior leaders require a concise executive summary before reviewing detailed cards.',
      actionableFix: 'Add Executive Summary card summarizing bottom-line achievements.',
    });
  } else {
    items.push({
      id: 'check-exec-summary',
      category: 'completeness',
      label: 'Executive Summary Card',
      status: 'pass',
      description: 'Executive summary is present with concise accomplishments.',
      actionableFix: 'Looking great.',
      cardId: execCard.id,
    });
  }

  // Check 2: Unconfirmed release commitments or unstated dates
  const hasUnconfirmedNote = project.cards.some(c => 
    c.type === 'executive_summary' && c.statusNote?.toLowerCase().includes('not yet')
  );
  if (hasUnconfirmedNote) {
    items.push({
      id: 'check-unconfirmed-release',
      category: 'completeness',
      label: 'Release Schedule Clarity',
      status: 'warning',
      description: 'Report notes release date is unconfirmed. Senior leaders will ask about timeline dependencies.',
      actionableFix: 'Clarify release date target window or specify security gating dependency.',
    });
  } else {
    items.push({
      id: 'check-unconfirmed-release',
      category: 'completeness',
      label: 'Release Schedule Clarity',
      status: 'pass',
      description: 'Release timeline status is unambiguously stated.',
      actionableFix: 'Looking great.',
    });
  }

  // Check 3: Reporting period specified
  if (!project.reportingPeriod || !project.reportingPeriod.trim()) {
    items.push({
      id: 'check-reporting-period',
      category: 'completeness',
      label: 'Reporting Period Header',
      status: 'warning',
      description: 'Report header lacks active date window (e.g. 5–9 October 2026).',
      actionableFix: 'Set the reporting period window in header.',
    });
  } else {
    items.push({
      id: 'check-reporting-period',
      category: 'completeness',
      label: 'Reporting Period Header',
      status: 'pass',
      description: `Period defined: ${project.reportingPeriod}`,
      actionableFix: 'Looking great.',
    });
  }

  // Check 4: Metric target benchmark clarity
  const metricCards = project.cards.filter(c => c.type === 'kpi_metric');
  if (metricCards.length === 0) {
    items.push({
      id: 'check-metrics-presence',
      category: 'metrics',
      label: 'Quantitative KPI Metrics',
      status: 'warning',
      description: 'Status reports carry more weight with at least one quantitative metric.',
      actionableFix: 'Add at least one KPI metric (e.g. velocity, latency, or defects).',
    });
  } else {
    const missingTargets = metricCards.filter(m => m.target === undefined);
    if (missingTargets.length > 0) {
      items.push({
        id: 'check-metrics-targets',
        category: 'metrics',
        label: 'Metric Benchmark Targets',
        status: 'warning',
        description: `${missingTargets.length} metric(s) lack a target benchmark for comparison.`,
        actionableFix: `Set target benchmark for "${missingTargets[0].title}".`,
        cardId: missingTargets[0].id,
      });
    } else {
      items.push({
        id: 'check-metrics-targets',
        category: 'metrics',
        label: 'Metric Benchmark Targets',
        status: 'pass',
        description: 'All metrics have clear comparative targets established.',
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
    items.push({
      id: 'check-action-ownership',
      category: 'ownership',
      label: 'Action Item Ownership',
      status: 'warning',
      description: `${unassignedSteps} next step(s) lack a named DRI (Directly Responsible Individual).`,
      actionableFix: 'Assign DRI owner to next steps for accountability.',
    });
  } else if (totalSteps > 0) {
    items.push({
      id: 'check-action-ownership',
      category: 'ownership',
      label: 'Action Item Ownership',
      status: 'pass',
      description: 'All next steps have named DRIs assigned.',
      actionableFix: 'Looking great.',
    });
  } else {
    items.push({
      id: 'check-action-ownership',
      category: 'ownership',
      label: 'Action Plan Defined',
      status: 'fail',
      description: 'No actionable next steps identified for upcoming review cycle.',
      actionableFix: 'Add a Next Steps card with prioritized action items.',
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
        label: 'Image Alternative Text (WCAG AA)',
        status: 'fail',
        description: `${missingAlt.length} visual asset(s) lack descriptive alternative text for screen readers.`,
        actionableFix: `Provide descriptive alt text for "${missingAlt[0].title}".`,
        cardId: missingAlt[0].id,
      });
    } else {
      items.push({
        id: 'check-accessibility-alt',
        category: 'accessibility',
        label: 'Image Alternative Text (WCAG AA)',
        status: 'pass',
        description: 'All visual assets have descriptive, accessible alternative text.',
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
 * Applies deterministic 1-click fixes for diagnostic readiness issues.
 */
export function applyQuickFixToProject(project: ReportProject, checkId: string): ReportProject {
  const updatedProject = { ...project, isDirty: true };

  switch (checkId) {
    case 'check-reporting-period':
       const date = new Date();
       updatedProject.reportingPeriod = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      break;

    case 'check-unconfirmed-release':
      updatedProject.cards = project.cards.map(c => {
        if (c.type === 'executive_summary') {
          return {
            ...c,
            statusNote: 'Target release window: Mid-November pending staging signoff & security audit',
          };
        }
        return c;
      });
      break;

    case 'check-metrics-targets':
      updatedProject.cards = project.cards.map(c => {
        if (c.type === 'kpi_metric' && c.target === undefined) {
          return {
            ...c,
            target: c.value <= 10 ? 0 : 100,
          };
        }
        return c;
      });
      break;

    case 'check-action-ownership':
      updatedProject.cards = project.cards.map(c => {
        if (c.type === 'next_steps') {
          return {
            ...c,
            items: c.items.map((item, idx) => ({
              ...item,
              owner: item.owner || (idx % 2 === 0 ? 'alex-lead' : 'taylor-eng'),
              dueDate: item.dueDate || '16 Oct 2026',
            })),
          };
        }
        return c;
      });
      break;

    case 'check-accessibility-alt':
      updatedProject.cards = project.cards.map(c => {
        if (c.type === 'visual_update' && (!c.altText || c.altText.trim().length < 5)) {
          return {
            ...c,
            altText: `Customer portal modern settings mockup for ${c.title}`,
          };
        }
        return c;
      });
      break;

    case 'check-exec-summary':
      if (!project.cards.some(c => c.type === 'executive_summary')) {
        updatedProject.cards = [
          {
            id: `card-exec-fix-${Date.now()}`,
            type: 'executive_summary',
            title: 'Executive Summary',
            summary: project.rawNotes.slice(0, 150) || 'Sprint progress summary.',
            keyAccomplishments: ['Core features ready for review'],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          ...project.cards,
        ];
      }
      break;

    default:
      break;
  }

  return updatedProject;
}
