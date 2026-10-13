import { SnippetCard } from '../../types/report';

/** Refresh generated content while preserving manual cards, edits and ordering. */
export function mergeGeneratedCards(existing: SnippetCard[], generated: SnippetCard[]): SnippetCard[] {
  const pending = [...generated];
  const result: SnippetCard[] = [];
  for (const old of existing) {
    const index = pending.findIndex((next) =>
      old.sourceKey ? next.sourceKey === old.sourceKey :
        next.type === old.type && next.title === old.title
    );
    if (index >= 0) {
      const [next] = pending.splice(index, 1);
      result.push(old.manuallyEdited ? old : { ...next, id: old.id, createdAt: old.createdAt });
    } else if (old.manuallyEdited || !old.sourceKey) {
      result.push(old);
    }
  }
  return [...result, ...pending];
}
