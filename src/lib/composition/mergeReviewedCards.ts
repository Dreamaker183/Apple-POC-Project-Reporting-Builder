import { SnippetCard } from '../../types/report';

/** Merge explicitly reviewed findings by stable source identity; retain manual edits and ordering. */
export function mergeReviewedCards(existing: SnippetCard[], reviewed: SnippetCard[]): SnippetCard[] {
  const incoming = [...reviewed];
  const merged: SnippetCard[] = [];

  for (const old of existing) {
    // 1. Exact sourceKey match
    const exactIndex = incoming.findIndex((next) => next.sourceKey && next.sourceKey === old.sourceKey);
    if (exactIndex >= 0) {
      const [next] = incoming.splice(exactIndex, 1);
      if (old.manuallyEdited) {
        merged.push(old);
      } else if (old.type === 'executive_summary' && next.type === 'executive_summary' && next.sourceKey === 'review:summary') {
        const existingSet = new Set(old.keyAccomplishments.map((a) => a.toLowerCase()));
        const added = next.keyAccomplishments.filter((a) => !existingSet.has(a.toLowerCase()));
        merged.push({
          ...next,
          id: old.id,
          createdAt: old.createdAt,
          summary: [old.summary, next.summary].filter(Boolean).filter((v, i, arr) => arr.indexOf(v) === i).join(' '),
          keyAccomplishments: [...old.keyAccomplishments, ...added],
          statusNote: next.statusNote ?? old.statusNote,
        });
      } else if (old.type === 'next_steps' && next.type === 'next_steps' && next.sourceKey === 'review:actions') {
        const existingActions = new Set(old.items.map((item) => item.action.toLowerCase()));
        const addedItems = next.items.filter((item) => !existingActions.has(item.action.toLowerCase()));
        merged.push({
          ...old,
          items: [...old.items, ...addedItems],
          updatedAt: next.updatedAt,
        });
      } else {
        merged.push({ ...next, id: old.id, createdAt: old.createdAt });
      }
      continue;
    }

    // 2. Singleton merge for incremental review:summary -> existing executive_summary
    if (old.type === 'executive_summary' && !merged.some((c) => c.type === 'executive_summary')) {
      const summaryIndex = incoming.findIndex(
        (next) => next.type === 'executive_summary' && next.sourceKey === 'review:summary'
      );
      if (summaryIndex >= 0) {
        const [next] = incoming.splice(summaryIndex, 1);
        if (next.type === 'executive_summary') {
          const existingSet = new Set(old.keyAccomplishments.map((a) => a.toLowerCase()));
          const added = next.keyAccomplishments.filter((a) => !existingSet.has(a.toLowerCase()));
          merged.push({
            ...old,
            summary: old.manuallyEdited
              ? old.summary
              : [old.summary, next.summary].filter(Boolean).filter((v, i, arr) => arr.indexOf(v) === i).join(' '),
            keyAccomplishments: [...old.keyAccomplishments, ...added],
            updatedAt: next.updatedAt,
          });
          continue;
        }
      }
    }

    // 3. Singleton merge for incremental review:actions -> existing next_steps
    if (old.type === 'next_steps' && !merged.some((c) => c.type === 'next_steps')) {
      const actionsIndex = incoming.findIndex(
        (next) => next.type === 'next_steps' && next.sourceKey === 'review:actions'
      );
      if (actionsIndex >= 0) {
        const [next] = incoming.splice(actionsIndex, 1);
        if (next.type === 'next_steps') {
          const existingActions = new Set(old.items.map((item) => item.action.toLowerCase()));
          const addedItems = next.items.filter((item) => !existingActions.has(item.action.toLowerCase()));
          merged.push({
            ...old,
            items: [...old.items, ...addedItems],
            updatedAt: next.updatedAt,
          });
          continue;
        }
      }
    }

    merged.push(old);
  }

  return [...merged, ...incoming];
}
