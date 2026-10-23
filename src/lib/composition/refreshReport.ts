import type { ReportProject, SnippetCard } from '../../types/report';
import { generateSnippetCards } from '../parsing/deterministicParser';
import { mergeGeneratedCards } from './mergeCards';

/** Rebuilding an existing brief must not reinterpret previously reviewed or rejected prose. */
export function refreshReport(project: ReportProject): SnippetCard[] {
  if (!project.cards.length) return generateSnippetCards(project.rawNotes, project.metrics, project.images, project.title);
  const structured = generateSnippetCards('', project.metrics, project.images, project.title)
    .filter(card => card.type === 'kpi_metric' || card.type === 'visual_update')
    .map(card => {
      const old = project.cards.find(existing => existing.sourceKey === card.sourceKey);
      if (!old) return card;
      if (old.type === 'kpi_metric' && card.type === 'kpi_metric') {
        const fields = ['label', 'value', 'unit', 'target', 'previousValue', 'explanation', 'chartStyle', 'direction'] as const;
        if (fields.every(field => old[field] === card[field])) return old;
      }
      if (old.type === 'visual_update' && card.type === 'visual_update' && old.imageUrl === card.imageUrl && old.altText === card.altText) return old;
      return card;
    });
  const narrativeIds = new Set(project.cards.filter(card => card.type !== 'kpi_metric' && card.type !== 'visual_update').map(card => card.id));
  const refreshed = mergeGeneratedCards(project.cards.filter(card => !narrativeIds.has(card.id)), structured);
  return project.cards.map(card => narrativeIds.has(card.id) ? card : refreshed.find(next => next.id === card.id))
    .filter((card): card is SnippetCard => Boolean(card))
    .concat(refreshed.filter(card => !project.cards.some(old => old.id === card.id)));
}
