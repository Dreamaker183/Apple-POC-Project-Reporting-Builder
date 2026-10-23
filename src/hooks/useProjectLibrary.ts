/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import type {
  ReportProject,
  ProjectLibrary,
  SnippetCard,
  MetricInput,
  ImageAssetInput,
  PeriodSnapshot,
} from '../types/report';
import {
  loadLibrary,
  saveLibrary,
  createBlankProject,
  createFolder,
  ensureDefaultFolder,
  makeSnapshot,
  addSnapshot,
  snapshotsForProject,
  latestSnapshotForProject,
  snapshotLabelFor,
  uid,
} from '../lib/persistence/projectLibrary';
import { createSampleProject, WEEK_40_BASELINE_SNAPSHOT } from '../lib/sampleData';
import { isScheduleDue, sendScheduledReport } from '../lib/integrations/scheduledDispatch';
import { syncMetricCards } from '../lib/composition/syncMetricCards';

/**
 * Core hook that owns the full project library lifecycle:
 * folders, projects, snapshots, persistence, scheduled dispatch,
 * and all mutation handlers.
 */
export function useProjectLibrary(addToast: (msg: string, type?: 'success' | 'error' | 'info') => void) {
  const [library, setLibrary] = useState<ProjectLibrary>(() => loadLibrary());
  const libraryRef = useRef(library);
  libraryRef.current = library;
  const sendingProjects = useRef(new Set<string>());

  // Active project derived from the library
  const project: ReportProject =
    library.projects.find((p) => p.id === library.activeProjectId) ?? library.projects[0];

  // ── Persistence ──────────────────────────────────────────────────

  const [savedLibrary, setSavedLibrary] = useState<ProjectLibrary | null>(null);
  const [saveError, setSaveError] = useState(false);
  const saveFailedNotified = useRef(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      const ok = saveLibrary(library);
      setSaveError(!ok);
      if (!ok && !saveFailedNotified.current) {
        saveFailedNotified.current = true;
        addToast('Local storage is full — try deleting old projects or photos.', 'error');
      } else if (ok) {
        saveFailedNotified.current = false;
        setSavedLibrary(library);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [library, addToast]);

  useEffect(() => {
    const flush = () => saveLibrary(library);
    window.addEventListener('pagehide', flush);
    return () => window.removeEventListener('pagehide', flush);
  }, [library]);

  // ── Scheduled dispatch ───────────────────────────────────────────

  useEffect(() => {
    const tick = async () => {
      for (const scheduledProject of libraryRef.current.projects) {
        if (!isScheduleDue(scheduledProject) || sendingProjects.current.has(scheduledProject.id)) continue;
        const schedule = scheduledProject.sendSchedule!;
        sendingProjects.current.add(scheduledProject.id);
        const run = async () => {
          const persisted = loadLibrary().projects.find(p => p.id === scheduledProject.id)?.sendSchedule;
          if (persisted?.scheduledAt === schedule.scheduledAt && (persisted.status === 'sent' || persisted.status === 'sending')) return;
          const started = { ...libraryRef.current, projects: libraryRef.current.projects.map(p => p.id === scheduledProject.id ? { ...p, sendSchedule: { ...schedule, status: 'sending' as const } } : p) };
          if (!saveLibrary(started)) return;
          setLibrary(started);
          try {
            const result = await sendScheduledReport(scheduledProject);
            setLibrary(prev => {
              const next = { ...prev, projects: prev.projects.map(p => p.id === scheduledProject.id && p.sendSchedule?.scheduledAt === schedule.scheduledAt ? { ...p, sendSchedule: { ...p.sendSchedule, enabled: false, status: result.success ? 'sent' as const : 'error' as const, message: result.message } } : p) };
              saveLibrary(next);
              return next;
            });
            addToast(result.success ? `Scheduled report sent: ${scheduledProject.title}` : result.message, result.success ? 'success' : 'error');
          } catch {
            setLibrary(prev => ({ ...prev, projects: prev.projects.map(p => p.id === scheduledProject.id ? { ...p, sendSchedule: { ...schedule, enabled: false, status: 'error' as const, message: 'Delivery failed. Check the connection and re-enable auto-send.' } } : p) }));
          }
        };
        try {
          if (navigator.locks) await navigator.locks.request(`report-send:${scheduledProject.id}`, { ifAvailable: true }, lock => lock ? run() : Promise.resolve());
          else await run();
        } finally {
          sendingProjects.current.delete(scheduledProject.id);
        }
      }
    };
    const timer = window.setInterval(() => { void tick(); }, 1000);
    return () => window.clearInterval(timer);
  }, [addToast]);

  // ── Active project updater ───────────────────────────────────────

  const updateActiveProject = useCallback((updater: (prev: ReportProject) => ReportProject) => {
    setLibrary((prev) => ({
      ...prev,
      projects: prev.projects.map((p) => (p.id === prev.activeProjectId ? { ...updater(p), lastSavedAt: new Date().toISOString() } : p)),
    }));
  }, []);

  // ── Project CRUD ─────────────────────────────────────────────────

  const handleSelectProject = useCallback((id: string): ReportProject | null => {
    if (id === library.activeProjectId) return null;
    const target = library.projects.find((p) => p.id === id);
    if (!target) return null;
    setLibrary((prev) => ({ ...prev, activeProjectId: id }));
    return target;
  }, [library.activeProjectId, library.projects]);

  const handleNewProject = useCallback((folderId: string): ReportProject => {
    const folders = ensureDefaultFolder(library.folders);
    const fid = folders.some((f) => f.id === folderId) ? folderId : folders[0].id;
    const blank = createBlankProject(fid);
    setLibrary((prev) => ({
      ...prev,
      folders: ensureDefaultFolder(prev.folders),
      projects: [...prev.projects, blank],
      activeProjectId: blank.id,
    }));
    addToast('Created new project', 'success');
    return blank;
  }, [library.folders, addToast]);

  const handleReset = useCallback((): ReportProject => {
    const folders = ensureDefaultFolder(library.folders);
    const active = library.projects.find((p) => p.id === library.activeProjectId);
    const folderId = active?.folderId && folders.some((f) => f.id === active.folderId)
      ? active.folderId
      : folders[0].id;
    const blank = createBlankProject(folderId);
    setLibrary((prev) => ({
      ...prev,
      folders: ensureDefaultFolder(prev.folders),
      projects: [...prev.projects, blank],
      activeProjectId: blank.id,
    }));
    addToast('Created new project', 'success');
    return blank;
  }, [library, addToast]);

  const handleRenameProject = useCallback((id: string, title: string) => {
    setLibrary((prev) => ({
      ...prev,
      projects: prev.projects.map((p) =>
        p.id === id ? { ...p, title, isDirty: true, lastSavedAt: new Date().toISOString() } : p
      ),
    }));
  }, []);

  const handleDuplicateProject = useCallback((id: string): ReportProject | null => {
    const src = library.projects.find((p) => p.id === id);
    if (!src) return null;
    const now = new Date().toISOString();
    const copy: ReportProject = {
      ...src,
      sendSchedule: undefined,
      id: uid('proj'),
      title: `${src.title} (Copy)`,
      createdAt: now,
      reportingPeriod: now.slice(0, 10),
      lastSavedAt: now,
      isDirty: false,
    };
    setLibrary((prev) => ({ ...prev, projects: [...prev.projects, copy], activeProjectId: copy.id }));
    addToast('Project duplicated', 'success');
    return copy;
  }, [library.projects, addToast]);

  const handleMoveProject = useCallback((id: string, folderId: string) => {
    setLibrary((prev) => ({
      ...prev,
      projects: prev.projects.map((p) => (p.id === id ? { ...p, folderId } : p)),
    }));
    addToast('Project moved', 'success');
  }, [addToast]);

  const handleDeleteProject = useCallback((id: string) => {
    const remaining = library.projects.filter((p) => p.id !== id);
    const wasActive = id === library.activeProjectId;
    let folders = library.folders;
    let projects = remaining;
    if (projects.length === 0) {
      folders = ensureDefaultFolder(folders);
      projects = [createBlankProject(folders[0].id)];
    }
    const nextActive = wasActive ? projects[0].id : library.activeProjectId;
    const snapshots = library.snapshots.filter((s) => s.projectId !== id);
    setLibrary({ ...library, folders, projects, snapshots, activeProjectId: nextActive });
    addToast('Project deleted', 'info');
    return { wasActive, nextActive, projects, snapshots };
  }, [library, addToast]);

  const handleLoadSample = useCallback((useMessy: boolean = false, emptyCards: boolean = false) => {
    const sample = createSampleProject(useMessy);
    const cardsToUse = emptyCards ? [] : sample.cards;
    const prepared = { ...sample, id: uid('demo'), folderId: library.folders[0]?.id, cards: cardsToUse, isDirty: true };
    setLibrary(prev => ({ ...prev, projects: [...prev.projects, prepared], activeProjectId: prepared.id,
      snapshots: addSnapshot(prev.snapshots, makeSnapshot(prepared.id, 'Week 40 baseline · Fictional', WEEK_40_BASELINE_SNAPSHOT, 'manual')) }));
    addToast('Opened a new fictional demo project. Existing projects preserved.', 'success');
    return prepared;
  }, [library.folders, addToast]);

  // ── Folder CRUD ──────────────────────────────────────────────────

  const handleNewFolder = useCallback((name: string) => {
    const folder = createFolder(name);
    setLibrary((prev) => ({ ...prev, folders: [...ensureDefaultFolder(prev.folders), folder] }));
    addToast(`Folder "${folder.name}" created`, 'success');
  }, [addToast]);

  const handleRenameFolder = useCallback((id: string, name: string) => {
    setLibrary((prev) => ({
      ...prev,
      folders: prev.folders.map((f) => (f.id === id ? { ...f, name } : f)),
    }));
  }, []);

  const handleDeleteFolder = useCallback((id: string) => {
    const remaining = library.folders.filter((f) => f.id !== id);
    const folders = ensureDefaultFolder(remaining);
    const fallbackId = folders[0].id;
    setLibrary((prev) => ({
      ...prev,
      folders,
      projects: prev.projects.map((p) => (p.folderId === id ? { ...p, folderId: fallbackId } : p)),
    }));
    addToast('Folder deleted — its projects moved to the first folder', 'info');
  }, [library.folders, addToast]);

  // ── Snapshot operations ──────────────────────────────────────────

  const handleSaveSnapshot = useCallback((name?: string) => {
    const label = name?.trim() || snapshotLabelFor(project);
    setLibrary((prev) => ({
      ...prev,
      snapshots: addSnapshot(prev.snapshots, makeSnapshot(prev.activeProjectId, label, project.cards, 'manual', project)),
    }));
    addToast(`Snapshot saved (${label})`, 'success');
  }, [project, addToast]);

  const handleRestoreSnapshot = useCallback((snapshotId: string, recordHistoryFn: () => void) => {
    const snap = library.snapshots.find(
      (s) => s.id === snapshotId && s.projectId === library.activeProjectId
    );
    if (!snap) return null;
    recordHistoryFn();
    updateActiveProject((prev) => ({
      ...prev,
      ...(snap.project ?? {}),
      sendSchedule: prev.sendSchedule,
      id: prev.id,
      folderId: prev.folderId,
      cards: snap.cards,
      isDirty: true,
      lastSavedAt: new Date().toISOString(),
    }));
    addToast(`Restored "${snap.label}" (undoable with ⌘Z)`, 'success');
    return snap;
  }, [library, updateActiveProject, addToast]);

  const handleCompareSnapshot = useCallback((snapshotId: string): PeriodSnapshot | null => {
    return library.snapshots.find(
      (s) => s.id === snapshotId && s.projectId === library.activeProjectId
    ) ?? null;
  }, [library]);

  const activeSnapshots = useMemo(
    () => snapshotsForProject(library.snapshots, library.activeProjectId),
    [library.snapshots, library.activeProjectId]
  );

  // ── Input handlers ───────────────────────────────────────────────

  const handleNotesChange = useCallback((rawNotes: string) => {
    updateActiveProject((prev) => ({ ...prev, rawNotes, isDirty: true }));
  }, [updateActiveProject]);

  const handleMetricsChange = useCallback((metrics: MetricInput[]) => {
    updateActiveProject((prev) => ({ ...prev, metrics, cards: syncMetricCards(prev.cards, prev.metrics, metrics), isDirty: true }));
  }, [updateActiveProject]);

  const handleImagesChange = useCallback((images: ImageAssetInput[]) => {
    updateActiveProject((prev) => ({ ...prev, images, isDirty: true }));
  }, [updateActiveProject]);

  const handleImagesAppend = useCallback((images: ImageAssetInput[]) => {
    const projectId = project.id;
    setLibrary((prev) => ({ ...prev, projects: prev.projects.map((p) => p.id === projectId ? {
      ...p, images: [...p.images, ...images], isDirty: true, lastSavedAt: new Date().toISOString(),
    } : p) }));
  }, [project.id]);

  const handleScheduleChange = useCallback((sendSchedule: ReportProject['sendSchedule']) => {
    updateActiveProject(prev => ({ ...prev, sendSchedule }));
  }, [updateActiveProject]);

  return {
    library,
    setLibrary,
    project,
    savedLibrary,
    saveError,
    updateActiveProject,

    // Project operations
    handleSelectProject,
    handleNewProject,
    handleReset,
    handleRenameProject,
    handleDuplicateProject,
    handleMoveProject,
    handleDeleteProject,
    handleLoadSample,

    // Folder operations
    handleNewFolder,
    handleRenameFolder,
    handleDeleteFolder,

    // Snapshot operations
    handleSaveSnapshot,
    handleRestoreSnapshot,
    handleCompareSnapshot,
    activeSnapshots,

    // Input handlers
    handleNotesChange,
    handleMetricsChange,
    handleImagesChange,
    handleImagesAppend,
    handleScheduleChange,
  } as const;
}
