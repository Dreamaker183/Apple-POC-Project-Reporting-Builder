/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { SnippetCard, KpiMetricCardData, RiskBlockerCardData, NextStepsCardData } from '../../types/report';

export interface DiffReport {
  newAccomplishments: string[];
  metricChanges: Array<{
    label: string;
    oldValue: number;
    newValue: number;
    unit: string;
    diff: number;
    percentChange?: number;
    improved: boolean;
  }>;
  resolvedRisks: string[];
  newBlockers: string[];
  outstandingActions: string[];
  resolvedActions: string[];
  addedCardsCount: number;
  removedCardsCount: number;
}

export function compareReportSnapshots(
  baselineCards: SnippetCard[],
  currentCards: SnippetCard[]
): DiffReport {
  const diff: DiffReport = {
    newAccomplishments: [],
    metricChanges: [],
    resolvedRisks: [],
    newBlockers: [],
    outstandingActions: [],
    resolvedActions: [],
    addedCardsCount: 0,
    removedCardsCount: 0,
  };

  // 1. Executive accomplishments comparison
  const baseExec = baselineCards.find(c => c.type === 'executive_summary');
  const currExec = currentCards.find(c => c.type === 'executive_summary');
  if (currExec && currExec.type === 'executive_summary') {
    const baseAcc = (baseExec && baseExec.type === 'executive_summary') 
      ? new Set(baseExec.keyAccomplishments) 
      : new Set<string>();
    
    currExec.keyAccomplishments.forEach(acc => {
      if (!baseAcc.has(acc)) {
        diff.newAccomplishments.push(acc);
      }
    });
  }

  // 2. Metric changes
  const baseMetrics = baselineCards.filter((c): c is KpiMetricCardData => c.type === 'kpi_metric');
  const currMetrics = currentCards.filter((c): c is KpiMetricCardData => c.type === 'kpi_metric');

  currMetrics.forEach(curr => {
    const baseMatch = baseMetrics.find(b => b.label.toLowerCase() === curr.label.toLowerCase());
    if (baseMatch && baseMatch.value !== curr.value) {
      const delta = curr.value - baseMatch.value;
      const isLowerBetter = /defect|bug|time|latency|delay|ms|second/i.test(curr.label + curr.unit);
      const improved = isLowerBetter ? delta < 0 : delta > 0;
      const percentChange = baseMatch.value !== 0 
        ? Number(((delta / baseMatch.value) * 100).toFixed(1))
        : undefined;

      diff.metricChanges.push({
        label: curr.label,
        oldValue: baseMatch.value,
        newValue: curr.value,
        unit: curr.unit,
        diff: Number(delta.toFixed(2)),
        percentChange,
        improved,
      });
    }
  });

  // 3. Risks & Blockers
  const baseRisks = baselineCards.filter((c): c is RiskBlockerCardData => c.type === 'risk_blocker');
  const currRisks = currentCards.filter((c): c is RiskBlockerCardData => c.type === 'risk_blocker');

  // Check for resolved risks in baseline that are no longer in current
  baseRisks.forEach(baseRisk => {
    const stillPresent = currRisks.some(
      curr => curr.title === baseRisk.title || curr.description === baseRisk.description
    );
    if (!stillPresent) {
      diff.resolvedRisks.push(baseRisk.title);
    }
  });

  // Check for newly introduced blockers in current
  currRisks.forEach(currRisk => {
    if (currRisk.isBlocker) {
      const wasInBase = baseRisks.some(
        b => (b.title === currRisk.title || b.description === currRisk.description) && b.isBlocker
      );
      if (!wasInBase) {
        diff.newBlockers.push(currRisk.title);
      }
    }
  });

  // 4. Action items tracking
  const currNextSteps = currentCards.filter((c): c is NextStepsCardData => c.type === 'next_steps');
  currNextSteps.forEach(card => {
    card.items.forEach(item => {
      if (item.status === 'completed') {
        diff.resolvedActions.push(item.action);
      } else {
        diff.outstandingActions.push(item.action);
      }
    });
  });

  // Cards count diff
  const baseIds = new Set(baselineCards.map(c => c.id));
  const currIds = new Set(currentCards.map(c => c.id));

  currentCards.forEach(c => {
    if (!baseIds.has(c.id)) diff.addedCardsCount++;
  });
  baselineCards.forEach(c => {
    if (!currIds.has(c.id)) diff.removedCardsCount++;
  });

  return diff;
}
