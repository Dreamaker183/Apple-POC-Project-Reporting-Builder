import type { KpiMetricCardData } from '../../types/report';

export function metricStatus(metric: Pick<KpiMetricCardData, 'value' | 'target' | 'direction'>): KpiMetricCardData['trend'] {
  if (metric.target === undefined || !metric.direction || metric.direction === 'neutral') return undefined;
  const onTarget = metric.direction === 'lower' ? metric.value <= metric.target : metric.value >= metric.target;
  return onTarget ? 'improving' : 'declining';
}
