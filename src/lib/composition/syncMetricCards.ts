import type { MetricInput, SnippetCard } from '../../types/report';
import { metricStatus } from '../analysis/metricStatus';

/** An explicit structured-input edit is a user correction, not regeneration. */
export function syncMetricCards(cards: SnippetCard[], previous: MetricInput[], metrics: MetricInput[]): SnippetCard[] {
  return cards.map(card => {
    if (card.type !== 'kpi_metric') return card;
    const input = metrics.find(metric => card.sourceKey === `metric:${metric.id}`);
    const before = previous.find(metric => card.sourceKey === `metric:${metric.id}`);
    if (!input || JSON.stringify(before) === JSON.stringify(input)) return card;
    return { ...card, title: input.name, label: input.name, value: input.value, unit: input.unit,
      target: input.target, previousValue: input.previousValue, direction: input.direction, chartStyle: input.chartStyle,
      explanation: input.explanation, manuallyEdited: true, updatedAt: new Date().toISOString(),
      trend: metricStatus(input),
      sourceRef: { passageText: `${input.name}: ${input.value}${input.unit}`, confidence: 'manual',
        notes: `Structured input corrected by the user. Earlier source retained below; it may report an older value.\n${card.sourceRef?.passageText ?? ''}` },
    };
  });
}
