/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  ProjectLibrary,
  ProjectFolder,
  PeriodSnapshot,
  ReportProject,
  SnippetCard,
} from '../../types/report';
import { ProjectLibrarySchema, ReportProjectSchema } from '../../schemas/reportSchema';
import { createSampleProject, WEEK_40_BASELINE_SNAPSHOT } from '../sampleData';

export const LIBRARY_STORAGE_KEY = 'project_reporting_builder_library_v1';
const LEGACY_DRAFT_KEY = 'project_reporting_builder_draft_v1';

export const MAX_AUTO_SNAPSHOTS_PER_PROJECT = 10;
export const MAX_MANUAL_SNAPSHOTS_PER_PROJECT = 20;

export function uid(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function snapshotLabelFor(project: { reportingPeriod: string }): string {
  const period = project.reportingPeriod.trim();
  if (period) return period;
  return new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export function createBlankProject(folderId: string): ReportProject {
  const now = new Date().toISOString();
  return {
    id: uid('proj'),
    title: 'Untitled Project',
    reportingPeriod: '',
    folderId,
    rawNotes: '',
    metrics: [],
    images: [],
    cards: [],
    lastSavedAt: now,
    isDirty: false,
  };
}

export function createFolder(name: string): ProjectFolder {
  return { id: uid('folder'), name: name.trim() || 'Untitled Folder', createdAt: new Date().toISOString() };
}

export function ensureDefaultFolder(folders: ProjectFolder[]): ProjectFolder[] {
  if (folders.length > 0) return folders;
  return [{ id: 'folder-general', name: 'General', createdAt: new Date().toISOString() }];
}

/**
 * Adds a snapshot, enforcing caps: oldest auto snapshots are dropped first
 * (manual save points are never auto-removed; manual cap drops oldest manual).
 */
export function addSnapshot(snapshots: PeriodSnapshot[], snap: PeriodSnapshot): PeriodSnapshot[] {
  const next = [...snapshots, snap];
  const forProject = next.filter((s) => s.projectId === snap.projectId);
  const others = next.filter((s) => s.projectId !== snap.projectId);
  let autos = forProject.filter((s) => s.origin === 'auto').sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  let manuals = forProject.filter((s) => s.origin === 'manual').sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  if (autos.length > MAX_AUTO_SNAPSHOTS_PER_PROJECT) {
    autos = autos.slice(autos.length - MAX_AUTO_SNAPSHOTS_PER_PROJECT);
  }
  if (manuals.length > MAX_MANUAL_SNAPSHOTS_PER_PROJECT) {
    manuals = manuals.slice(manuals.length - MAX_MANUAL_SNAPSHOTS_PER_PROJECT);
  }
  return [...others, ...autos, ...manuals];
}

export function snapshotsForProject(snapshots: PeriodSnapshot[], projectId: string): PeriodSnapshot[] {
  return snapshots
    .filter((s) => s.projectId === projectId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function latestSnapshotForProject(
  snapshots: PeriodSnapshot[],
  projectId: string
): PeriodSnapshot | null {
  const list = snapshotsForProject(snapshots, projectId);
  return list[0] ?? null;
}

export function makeSnapshot(
  projectId: string,
  label: string,
  cards: SnippetCard[],
  origin: 'auto' | 'manual',
  project?: ReportProject
): PeriodSnapshot {
  return {
    id: uid('snap'),
    projectId,
    label,
    createdAt: new Date().toISOString(),
    cards,
    origin,
    project: project ? structuredClone(project) : undefined,
  };
}

export function createSeedLibrary(): ProjectLibrary {
  const sample = createSampleProject();
  const folders: ProjectFolder[] = [
    { id: 'folder-customer-portal', name: 'Customer Portal', createdAt: new Date().toISOString() },
    { id: 'folder-general', name: 'General', createdAt: new Date().toISOString() },
  ];
  const project: ReportProject = { ...sample, folderId: 'folder-customer-portal' };
  return {
    version: 1,
    folders,
    projects: [project],
    snapshots: [
      {
        id: 'snap-week-40-baseline',
        projectId: project.id,
        label: 'Week 40 baseline',
        createdAt: '2026-10-02T17:00:00.000Z',
        cards: WEEK_40_BASELINE_SNAPSHOT,
        origin: 'manual',
      },
    ],
    activeProjectId: project.id,
  };
}

/** Migrates a legacy single draft into a one-project library. Pure + testable. */
export function migrateLegacyDraft(draft: ReportProject): ProjectLibrary {
  const folders = ensureDefaultFolder([]);
  const project: ReportProject = { ...draft, folderId: folders[0].id };
  return {
    version: 1,
    folders,
    projects: [project],
    snapshots: [],
    activeProjectId: project.id,
  };
}

function sanitizeLibrary(lib: ProjectLibrary): ProjectLibrary {
  const folders = ensureDefaultFolder(lib.folders);
  const folderIds = new Set(folders.map((f) => f.id));
  const projects: ReportProject[] = lib.projects.map((p) => ({
    ...p,
    folderId: p.folderId && folderIds.has(p.folderId) ? p.folderId : folders[0].id,
  }));
  if (projects.length === 0) projects.push(createBlankProject(folders[0].id));
  const projectIds = new Set(projects.map((p) => p.id));
  const snapshots = lib.snapshots.filter((s) => projectIds.has(s.projectId));
  const activeProjectId = projectIds.has(lib.activeProjectId)
    ? lib.activeProjectId
    : (projects[0]?.id ?? '');
  return { version: 1, folders, projects, snapshots, activeProjectId };
}

export function loadLibrary(): ProjectLibrary {
  try {
    const raw = localStorage.getItem(LIBRARY_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      const validated = ProjectLibrarySchema.safeParse(parsed);
      if (validated.success) {
        return sanitizeLibrary(validated.data as ProjectLibrary);
      }
      console.warn('Project library failed validation, rebuilding:', validated.error);
    } else {
      // One-time migration from the legacy single-draft key
      const legacyRaw = localStorage.getItem(LEGACY_DRAFT_KEY);
      if (legacyRaw) {
        const legacyParsed = JSON.parse(legacyRaw);
        const validated = ReportProjectSchema.safeParse(legacyParsed);
        if (validated.success) {
          const migrated = migrateLegacyDraft(validated.data as ReportProject);
          try {
            localStorage.setItem(LIBRARY_STORAGE_KEY, JSON.stringify(migrated));
            localStorage.removeItem(LEGACY_DRAFT_KEY);
          } catch {
            // non-fatal: keep running in memory
          }
          return migrated;
        }
      }
    }
  } catch (err) {
    console.error('Failed to load project library:', err);
  }
  return createSeedLibrary();
}

/** Quota-safe save. Returns false when storage is unavailable or full. */
export function saveLibrary(library: ProjectLibrary): boolean {
  try {
    localStorage.setItem(LIBRARY_STORAGE_KEY, JSON.stringify(library));
    return true;
  } catch (err) {
    console.error('Failed to save project library (quota?):', err);
    return false;
  }
}
