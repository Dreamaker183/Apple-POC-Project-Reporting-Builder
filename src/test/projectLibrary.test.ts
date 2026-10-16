/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createSampleProject } from '../lib/sampleData';
import {
  LIBRARY_STORAGE_KEY,
  addSnapshot,
  createBlankProject,
  createFolder,
  createSeedLibrary,
  latestSnapshotForProject,
  loadLibrary,
  makeSnapshot,
  migrateLegacyDraft,
  normalizeReportingPeriod,
  saveLibrary,
  snapshotLabelFor,
  snapshotsForProject,
} from '../lib/persistence/projectLibrary';
import { PeriodSnapshot } from '../types/report';

// Mock localStorage for node environment
const storageMock: Record<string, string> = {};
if (typeof globalThis.localStorage === 'undefined') {
  (globalThis as any).localStorage = {
    getItem: (key: string) => storageMock[key] ?? null,
    setItem: (key: string, value: string) => { storageMock[key] = String(value); },
    removeItem: (key: string) => { delete storageMock[key]; },
    clear: () => {
      Object.keys(storageMock).forEach(k => delete storageMock[k]);
    },
  };
}

describe('Project library: folders, time flow & migration', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('seeds a workspace with folders, the sample project, and a Week 40 baseline', () => {
    const lib = loadLibrary();
    expect(lib.version).toBe(1);
    expect(lib.folders.length).toBeGreaterThanOrEqual(2);
    expect(lib.projects).toHaveLength(1);
    expect(lib.activeProjectId).toBe(lib.projects[0].id);
    expect(lib.projects[0].folderId).toBe(lib.folders[0].id);
    const snaps = snapshotsForProject(lib.snapshots, lib.projects[0].id);
    expect(snaps).toHaveLength(1);
    expect(snaps[0].origin).toBe('manual');
    expect(snaps[0].cards.length).toBeGreaterThan(0);
  });

  it('migrates a legacy single draft into a one-project library', () => {
    const draft = createSampleProject();
    localStorage.setItem(
      'project_reporting_builder_draft_v1',
      JSON.stringify({ ...draft, lastSavedAt: new Date().toISOString(), isDirty: false })
    );
    const lib = loadLibrary();
    expect(lib.projects).toHaveLength(1);
    expect(lib.projects[0].title).toBe(draft.title);
    expect(lib.projects[0].cards.length).toBe(draft.cards.length);
    expect(lib.activeProjectId).toBe(lib.projects[0].id);
  });

  it('migrateLegacyDraft is pure and assigns the default folder', () => {
    const lib = migrateLegacyDraft(createSampleProject());
    expect(lib.folders).toHaveLength(1);
    expect(lib.projects[0].folderId).toBe(lib.folders[0].id);
    expect(lib.snapshots).toHaveLength(0);
  });

  it('caps auto snapshots FIFO while never auto-removing manual save points', () => {
    let snaps: PeriodSnapshot[] = [
      makeSnapshot('p1', 'Week 40 baseline', [], 'manual'),
    ];
    for (let i = 0; i < 12; i++) {
      snaps = addSnapshot(
        snaps,
        { ...makeSnapshot('p1', `Week ${41 + i}`, [], 'auto'), createdAt: `2026-10-${10 + i}T00:00:00.000Z` }
      );
    }
    const autos = snaps.filter((s) => s.origin === 'auto');
    const manuals = snaps.filter((s) => s.origin === 'manual');
    expect(autos).toHaveLength(10);
    expect(manuals).toHaveLength(1);
    // Oldest auto (Week 41) was trimmed, newest kept
    expect(autos.some((s) => s.label === 'Week 41')).toBe(false);
    expect(autos.some((s) => s.label === 'Week 52')).toBe(true);
  });

  it('isolates snapshot caps per project', () => {
    let snaps: PeriodSnapshot[] = [];
    for (let i = 0; i < 11; i++) {
      snaps = addSnapshot(snaps, makeSnapshot('p1', `S${i}`, [], 'auto'));
      snaps = addSnapshot(snaps, makeSnapshot('p2', `S${i}`, [], 'auto'));
    }
    expect(snaps.filter((s) => s.projectId === 'p1')).toHaveLength(10);
    expect(snaps.filter((s) => s.projectId === 'p2')).toHaveLength(10);
  });

  it('round-trips the library through localStorage with validation', () => {
    const lib = createSeedLibrary();
    expect(saveLibrary(lib)).toBe(true);
    const raw = localStorage.getItem(LIBRARY_STORAGE_KEY);
    expect(raw).not.toBeNull();
    const loaded = loadLibrary();
    expect(loaded.projects[0].title).toBe(lib.projects[0].title);
    expect(loaded.snapshots).toHaveLength(lib.snapshots.length);
  });

  it('falls back to a seed when storage holds corrupted data', () => {
    const mute = vi.spyOn(console, 'error').mockImplementation(() => {});
    localStorage.setItem(LIBRARY_STORAGE_KEY, '{not valid json');
    const lib = loadLibrary();
    mute.mockRestore();
    expect(lib.projects.length).toBeGreaterThan(0);
    expect(lib.activeProjectId).toBe(lib.projects[0].id);
  });

  it('latestSnapshotForProject returns the newest snapshot', () => {
    const snaps: PeriodSnapshot[] = [
      { ...makeSnapshot('p1', 'Old', [], 'auto'), createdAt: '2026-10-01T00:00:00.000Z' },
      { ...makeSnapshot('p1', 'New', [], 'manual'), createdAt: '2026-10-05T00:00:00.000Z' },
    ];
    expect(latestSnapshotForProject(snaps, 'p1')?.label).toBe('New');
    expect(latestSnapshotForProject(snaps, 'missing')).toBeNull();
  });

  it('derives snapshot labels from the reporting period with a date fallback', () => {
    expect(snapshotLabelFor({ reportingPeriod: '2026-10-09' })).toBe('2026-10-09');
    expect(snapshotLabelFor({ reportingPeriod: '   ' }).length).toBeGreaterThan(0);
  });

  it('normalizes legacy free-text periods to empty ISO dates', () => {
    expect(normalizeReportingPeriod('2026-10-09')).toBe('2026-10-09');
    expect(normalizeReportingPeriod('5–9 October 2026')).toBe('');
    expect(normalizeReportingPeriod('')).toBe('');
  });

  it('creates blank projects and folders with sane defaults', () => {
    const folder = createFolder('  Platform  ');
    expect(folder.name).toBe('Platform');
    const blank = createBlankProject(folder.id);
    expect(blank.folderId).toBe(folder.id);
    expect(blank.title).toBe('Untitled Project');
    expect(blank.cards).toHaveLength(0);
    expect(blank.createdAt).toBeDefined();
    expect(blank.reportingPeriod).toBe(blank.createdAt?.slice(0, 10));
    expect(/^\d{4}-\d{2}-\d{2}$/.test(blank.reportingPeriod)).toBe(true);
  });
});
