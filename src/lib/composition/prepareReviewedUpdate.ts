import type { ImageAssetInput, MetricInput, SnippetCard } from '../../types/report';
import { cardsFromFindings, resolveReviewedMetric, type ClassificationFinding } from '../parsing/classifier';

/** Prepare the reviewed delta and complete metric list for one project update. */
export function prepareReviewedUpdate(
  findings: ClassificationFinding[],
  existingMetrics: MetricInput[],
  pendingMetrics: MetricInput[],
  pendingImages: ImageAssetInput[],
  projectTitle: string,
): { cards: SnippetCard[]; metrics: MetricInput[] } {
  const selected = findings.filter(f => f.selected);
  const updates = [...pendingMetrics, ...selected.flatMap(f => f.category === 'metric' && f.metric ? [f.metric] : [])];
  const metrics = updates.reduce((current, update) => {
    const resolved = resolveReviewedMetric(update, current);
    return current.some(m => m.id === resolved.id)
      ? current.map(m => m.id === resolved.id ? resolved : m)
      : [...current, resolved];
  }, [...existingMetrics]);
  const resolvedMetric = (metric: MetricInput) => {
    const id = resolveReviewedMetric(metric, metrics).id;
    return metrics.find(m => m.id === id)!;
  };
  const reviewed = selected.map(f => f.category === 'metric' && f.metric ? { ...f, metric: resolvedMetric(f.metric) } : f);
  const reviewedCards = cardsFromFindings(reviewed, metrics, [], projectTitle);
  const pendingCards = pendingMetrics.flatMap(metric => {
    const resolved = resolvedMetric(metric);
    const typed: ClassificationFinding = {
      id: `typed:${resolved.id}`, category: 'metric', title: resolved.name,
      detail: resolved.explanation ?? '', selected: true, confidence: 'review', metric: resolved,
      evidence: `${resolved.name}: ${resolved.value}${resolved.unit}`, sourceStart: 0, sourceEnd: 0,
    };
    return cardsFromFindings([typed], metrics, [], projectTitle).map(card => ({
      ...card,
      sourceRef: { passageText: typed.evidence, confidence: 'manual' as const,
        notes: 'User-reviewed typed structured KPI attachment; review does not independently verify the reported values.' },
    }));
  });
  const imageCards = cardsFromFindings([], [], pendingImages, projectTitle);
  const allCards = [...reviewedCards, ...pendingCards, ...imageCards];
  const cards = allCards.filter((card, index) => allCards.findIndex(c => c.sourceKey === card.sourceKey) === index);
  return { cards, metrics };
}
