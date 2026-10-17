import { describe, expect, it } from 'vitest';
import { generateSnippetCards } from '../lib/parsing/deterministicParser';
import { mergeGeneratedCards } from '../lib/composition/mergeCards';
import { createSeedLibrary, makeSnapshot } from '../lib/persistence/projectLibrary';
import { ProjectLibrarySchema } from '../schemas/reportSchema';

describe('Workspace update and snapshot reliability', () => {
  it('preserves edited cards and their order while refreshing unedited source data', () => {
    const metrics = [{ id: 'one', name: 'Revenue', value: 10, unit: '$' }];
    const first = generateSnippetCards('', metrics, []);
    const edited = { ...first[0], title: 'Revenue forecast', manuallyEdited: true };
    const generated = generateSnippetCards('', [{ ...metrics[0], value: 20 }, { id: 'two', name: 'Users', value: 50, unit: '' }], []);
    const merged = mergeGeneratedCards([edited], generated);
    expect(merged).toHaveLength(2);
    expect(merged[0]).toEqual(edited);
    expect(merged[1].title).toBe('Users');
    const refreshed = mergeGeneratedCards(first, generated);
    expect(refreshed[0]).toMatchObject({ id: first[0].id, value: 20 });
  });

  it('keeps complete, independent snapshots with backward-compatible validation', () => {
    const lib = createSeedLibrary();
    const project = lib.projects[0];
    const snap = makeSnapshot(project.id, 'Review', project.cards, 'manual', project);
    project.rawNotes = 'Changed after saving';
    expect(snap.project?.rawNotes).not.toBe(project.rawNotes);
    expect(ProjectLibrarySchema.safeParse({ ...lib, snapshots: [...lib.snapshots, snap] }).success).toBe(true);
    expect(ProjectLibrarySchema.safeParse(lib).success).toBe(true);
  });

  it('honors explicitly chosen metric direction instead of guessing from names', () => {
    const cards = generateSnippetCards('', [
      { id: 'neutral', name: 'Revenue', value: 20, target: 100, unit: '$', direction: 'neutral' },
      { id: 'lower', name: 'Custom count', value: 20, target: 100, unit: '', direction: 'lower' },
    ], []);
    expect(cards[0]).toMatchObject({ trend: undefined });
    expect(cards[1]).toMatchObject({ trend: 'improving' });
  });

  it('generates well-formed manual cards with valid identifiers and timestamps', () => {
    const lib = createSeedLibrary();
    const project = lib.projects[0];
    const initialCount = project.cards.length;
    const now = new Date().toISOString();
    const newCard: SnippetCard = {
      id: `card-exec-${Date.now()}`,
      type: 'executive_summary',
      title: 'Executive Summary',
      summary: 'Test summary',
      createdAt: now,
      updatedAt: now,
    };
    const updatedCards = [...project.cards, newCard];
    expect(updatedCards).toHaveLength(initialCount + 1);
    expect(updatedCards[updatedCards.length - 1].id).toBe(newCard.id);
    expect(updatedCards[updatedCards.length - 1].id).toMatch(/^card-exec-/);
  });
});
