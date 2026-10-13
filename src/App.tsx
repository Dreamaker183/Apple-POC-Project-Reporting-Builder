/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { Suspense, lazy, useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { 
  ReportProject, 
  SnippetCard, 
  CardType, 
  MetricInput, 
  ImageAssetInput,
  ProjectLibrary,
} from './types/report';
import { generateSnippetCards } from './lib/parsing/deterministicParser';
import { mergeGeneratedCards } from './lib/composition/mergeCards';
import { createSampleProject } from './lib/sampleData';
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
} from './lib/persistence/projectLibrary';
import { calculateExecutiveScore, applyQuickFixToProject } from './lib/analysis/executiveScore';
import { copyToClipboard } from './lib/export/clipboard';
import { formatCardToMarkdown } from './lib/export/markdownExport';
import { formatCardToHtml } from './lib/export/htmlExport';

import { Header } from './components/layout/Header';
import { ReportCanvas } from './components/composition/ReportCanvas';
import { ProjectSidebar } from './components/projects/ProjectSidebar';
import { TimeFlow } from './components/projects/TimeFlow';
import type { MessageToolId } from './components/export/ExportModal';
const ExportModal = lazy(() => import('./components/export/ExportModal').then((module) => ({ default: module.ExportModal })));
import { SnapshotComparisonModal } from './components/composition/SnapshotComparisonModal';
import { GuidedTour, TourStep } from './components/guided-demo/GuidedTour';
import { ShortcutsModal } from './components/common/ShortcutsModal';
import { Toast, ToastMessage } from './components/common/Toast';
import { Eye, Folder } from 'lucide-react';

export default function App() {
  // 1. Project library (folders + projects + time-flow snapshots), local-only.
  //    First run migrates the legacy single draft or seeds the sample workspace.
  const [library, setLibrary] = useState<ProjectLibrary>(() => loadLibrary());

  // Active project derived from the library (invariant: at least one project exists)
  const project: ReportProject =
    library.projects.find((p) => p.id === library.activeProjectId) ?? library.projects[0];

  const updateActiveProject = (updater: (prev: ReportProject) => ReportProject) => {
    setLibrary((prev) => ({
      ...prev,
      projects: prev.projects.map((p) => (p.id === prev.activeProjectId ? { ...updater(p), lastSavedAt: new Date().toISOString() } : p)),
    }));
  };

  // 2. Undo stack (stores previous snapshots of cards)
  const [historyStack, setHistoryStack] = useState<ReportProject[]>([]);
  const [redoStack, setRedoStack] = useState<ReportProject[]>([]);
  const [savedLibrary, setSavedLibrary] = useState<ProjectLibrary | null>(null);
  const [saveError, setSaveError] = useState(false);
  const [sidebarVisible, setSidebarVisible] = useState(true);

  // 3. Baseline snapshot for What's Changed diff (per active project)
  const [baselineCards, setBaselineCards] = useState<SnippetCard[]>(() => {
    const latest = latestSnapshotForProject(library.snapshots, library.activeProjectId);
    return latest ? latest.cards : [];
  });

  // 4. UI interaction states
  const [selectedCardIds, setSelectedCardIds] = useState<Set<string>>(new Set());
  const [inspectedCardId, setInspectedCardId] = useState<string | null>(() => {
    return project.cards[0]?.id || null;
  });
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [exportInitialMode, setExportInitialMode] = useState<'formats' | 'tools'>('formats');
  const [exportInitialTool, setExportInitialTool] = useState<MessageToolId>('email');
  const [isSnapshotModalOpen, setIsSnapshotModalOpen] = useState(false);
  const [isGuidedTourOpen, setIsGuidedTourOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [tourStepIndex, setTourStepIndex] = useState(0);

  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [highlightPassage, setHighlightPassage] = useState<{ start?: number; end?: number; text?: string } | null>(null);

  // 5. Mobile workspace area view
  const [mobileArea, setMobileArea] = useState<'projects' | 'canvas'>('canvas');

  // Push toast helper
  const addToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const newToast: ToastMessage = {
      id: `toast-${Date.now()}-${Math.random()}`,
      type,
      message,
    };
    setToasts([newToast]);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Save library locally whenever it changes (debounced, quota-safe)
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

  // Record undo state before destructive operations
  const recordHistory = useCallback(() => {
    setHistoryStack((prev) => [...prev.slice(-19), structuredClone(project)]);
    setRedoStack([]);
  }, [project]);

  // Undo function
  const handleUndo = useCallback(() => {
    if (historyStack.length === 0) return;
    const previousProject = historyStack[historyStack.length - 1];
    setRedoStack((prev) => [...prev, project]);
    setHistoryStack((prev) => prev.slice(0, -1));
    updateActiveProject((prev) => ({
      ...prev,
      ...previousProject,
      isDirty: true,
      lastSavedAt: new Date().toISOString(),
    }));
    addToast('Reverted most recent action', 'info');
  }, [historyStack, project, addToast]);

  const handleRedo = () => {
    if (!redoStack.length) return;
    const next = redoStack[redoStack.length - 1];
    setHistoryStack((prev) => [...prev, project]);
    setRedoStack((prev) => prev.slice(0, -1));
    updateActiveProject(() => ({ ...next, isDirty: true }));
  };

  // Generate cards via deterministic parser (+ auto time-flow snapshot per period)
  const handleGenerateReport = useCallback((newNotes?: string) => {
    const rawNotes = newNotes?.trim() ? [project.rawNotes, newNotes.trim()].filter(Boolean).join('\n\n') : project.rawNotes;
    if (!rawNotes.trim() && !project.metrics.length && !project.images.length) return;
    recordHistory();
    const generatedCards = mergeGeneratedCards(project.cards, generateSnippetCards(
      rawNotes,
      project.metrics,
      project.images,
      project.title
    ));

    const label = snapshotLabelFor(project);
    const projectId = project.id;
    setLibrary((prev) => {
      const active = prev.projects.find((p) => p.id === projectId);
      if (!active) return prev;
      const updated: ReportProject = {
        ...active,
        rawNotes,
        cards: generatedCards,
        isDirty: true,
        lastSavedAt: new Date().toISOString(),
      };
      let snapshots = prev.snapshots;
      if (!prev.snapshots.some((s) => s.projectId === active.id && s.origin === 'auto' && s.label === label)) {
        snapshots = addSnapshot(prev.snapshots, makeSnapshot(active.id, label, generatedCards, 'auto', updated));
      }
      return {
        ...prev,
        projects: prev.projects.map((p) => (p.id === active.id ? updated : p)),
        snapshots,
      };
    });

    if (generatedCards.length > 0) {
      setInspectedCardId(generatedCards[0].id);
      if (generatedCards[0].sourceRef) {
        setHighlightPassage({ text: generatedCards[0].sourceRef.passageText });
      }
    }
    setMobileArea('canvas');
    addToast(`Generated ${generatedCards.length} verified snippet cards`, 'success');
  }, [project, recordHistory, addToast]);

  // Keyboard shortcut listener (Cmd+Z, Cmd+E, Cmd+Enter, ?)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.defaultPrevented) return;
      // Ignore if typing in text inputs
      const target = e.target as HTMLElement;
      const isInput = !!target.closest('input, textarea, select, [contenteditable="true"]');

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z' && !isInput && e.shiftKey) {
        e.preventDefault();
        handleRedo();
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z' && !e.shiftKey && !isInput) {
        if (historyStack.length > 0) {
          e.preventDefault();
          handleUndo();
        }
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'e') {
        e.preventDefault();
        setIsExportOpen(true);
      } else if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        handleGenerateReport();
      } else if (e.key === '?' && !isInput) {
        e.preventDefault();
        setIsShortcutsOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [historyStack, redoStack, handleUndo, handleGenerateReport]);

  // Handlers for inputs
  const handleNotesChange = (rawNotes: string) => {
    updateActiveProject((prev) => ({ ...prev, rawNotes, isDirty: true }));
  };

  const handleMetricsChange = (metrics: MetricInput[]) => {
    updateActiveProject((prev) => ({ ...prev, metrics, isDirty: true }));
  };

  const handleImagesChange = (images: ImageAssetInput[]) => {
    updateActiveProject((prev) => ({ ...prev, images, isDirty: true }));
  };

  const handleImagesAppend = (images: ImageAssetInput[]) => {
    const projectId = project.id;
    setLibrary((prev) => ({ ...prev, projects: prev.projects.map((p) => p.id === projectId ? {
      ...p, images: [...p.images, ...images], isDirty: true, lastSavedAt: new Date().toISOString(),
    } : p) }));
  };

  // Load sample content into the active project (keeps its id + folder)
  const handleLoadSample = (useMessy: boolean = false) => {
    recordHistory();
    const sample = createSampleProject(useMessy);
    updateActiveProject((prev) => ({
      ...prev,
      title: sample.title,
      reportingPeriod: sample.reportingPeriod,
      rawNotes: sample.rawNotes,
      metrics: sample.metrics,
      images: sample.images,
      cards: sample.cards,
      isDirty: true,
      lastSavedAt: new Date().toISOString(),
    }));
    setSelectedCardIds(new Set());
    if (sample.cards.length > 0) {
      setInspectedCardId(sample.cards[0].id);
    }
    addToast(useMessy ? 'Loaded messy standup sample' : 'Loaded Customer Portal sample project', 'success');
  };

  // Header "New Project": blank project in the active folder + switch to it
  const handleReset = () => {
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
    setHistoryStack([]);
    setRedoStack([]);
    setSelectedCardIds(new Set());
    setInspectedCardId(null);
    setHighlightPassage(null);
    setBaselineCards([]);
    setMobileArea('canvas');
    addToast('Created new project', 'success');
  };

  // Fix all outstanding checks in one click (used by the guided tour)
  const handleApplyAllFixes = () => {
    recordHistory();
    let current = { ...project };
    const score = calculateExecutiveScore(current);
    score.items.forEach((item) => {
      if (item.status !== 'pass') {
        current = applyQuickFixToProject(current, item.id);
      }
    });
    const fixed = current;
    updateActiveProject(() => fixed);
    addToast('All diagnostic readiness checks resolved!', 'success');
  };

  // Card modifications
  const handleUpdateCard = (updated: SnippetCard) => {
    recordHistory();
    updateActiveProject((prev) => ({
      ...prev,
      cards: prev.cards.map((c) => (c.id === updated.id ? { ...updated, manuallyEdited: true, updatedAt: new Date().toISOString() } : c)),
      isDirty: true,
    }));
  };

  const handleDeleteCard = (id: string) => {
    recordHistory();
    updateActiveProject((prev) => ({
      ...prev,
      cards: prev.cards.filter((c) => c.id !== id),
      isDirty: true,
    }));
    setSelectedCardIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    if (inspectedCardId === id) {
      const remaining = project.cards.filter((c) => c.id !== id);
      setInspectedCardId(remaining[0]?.id || null);
      if (remaining.length === 0) {
        setHighlightPassage(null);
      }
    }
    addToast('Card removed', 'info');
  };

  const handleDeleteSelectedCards = () => {
    if (selectedCardIds.size === 0) return;
    recordHistory();
    updateActiveProject((prev) => ({
      ...prev,
      cards: prev.cards.filter((c) => !selectedCardIds.has(c.id)),
      isDirty: true,
    }));
    setSelectedCardIds(new Set());
    setInspectedCardId(null);
    setHighlightPassage(null);
    addToast(`Deleted ${selectedCardIds.size} cards`, 'info');
  };

  const handleDuplicateCard = (id: string) => {
    const target = project.cards.find((c) => c.id === id);
    if (!target) return;
    recordHistory();
    const duplicated: SnippetCard = {
      ...target,
      id: uid('card-copy'),
      sourceKey: undefined,
      manuallyEdited: true,
      title: `${target.title} (Copy)`,
      updatedAt: new Date().toISOString(),
    };
    const targetIdx = project.cards.findIndex((c) => c.id === id);
    const newCards = [...project.cards];
    newCards.splice(targetIdx + 1, 0, duplicated);

    updateActiveProject((prev) => ({ ...prev, cards: newCards, isDirty: true }));
    setInspectedCardId(duplicated.id);
    addToast('Duplicated card', 'success');
  };

  const handleMoveCard = (id: string, direction: 'up' | 'down') => {
    const idx = project.cards.findIndex((c) => c.id === id);
    if (idx === -1) return;
    if (direction === 'up' && idx === 0) return;
    if (direction === 'down' && idx === project.cards.length - 1) return;
    recordHistory();

    const newCards = [...project.cards];
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    const temp = newCards[idx];
    newCards[idx] = newCards[targetIdx];
    newCards[targetIdx] = temp;

    updateActiveProject((prev) => ({ ...prev, cards: newCards, isDirty: true }));
  };

  const handleAddCard = (type: CardType) => {
    recordHistory();
    const now = new Date().toISOString();
    let newCard: SnippetCard;

    switch (type) {
      case 'executive_summary':
        newCard = {
          id: `card-exec-${Date.now()}`,
          type: 'executive_summary',
          title: 'Executive Summary',
          summary: 'High-level synthesis of current sprint achievements and milestones.',
          keyAccomplishments: ['Core features ready for review'],
          createdAt: now,
          updatedAt: now,
        };
        break;
      case 'kpi_metric':
        newCard = {
          id: `card-metric-${Date.now()}`,
          type: 'kpi_metric',
          title: 'Sprint Velocity',
          label: 'Sprint Velocity',
          value: 90,
          unit: '%',
          target: 100,
          chartStyle: 'bar',
          createdAt: now,
          updatedAt: now,
        };
        break;
      case 'risk_blocker':
        newCard = {
          id: `card-risk-${Date.now()}`,
          type: 'risk_blocker',
          title: 'Potential Schedule Delay',
          description: 'Awaiting dependency validation from partner team.',
          severity: 'medium',
          isBlocker: false,
          mitigation: 'Daily standup checkpoint scheduled with engineering lead.',
          createdAt: now,
          updatedAt: now,
        };
        break;
      case 'next_steps':
        newCard = {
          id: `card-nextsteps-${Date.now()}`,
          type: 'next_steps',
          title: 'Upcoming Sprint Commitments',
          items: [
            {
              id: `step-${Date.now()}-1`,
              action: 'Complete staging environment regression tests',
              status: 'planned',
            },
          ],
          createdAt: now,
          updatedAt: now,
        };
        break;
      case 'milestone':
        newCard = {
          id: `card-milestone-${Date.now()}`,
          type: 'milestone',
          title: 'API Integration Complete',
          description: 'Endpoints verified and ready for end-to-end integration.',
          status: 'on_track',
          dueDate: '16 October 2026',
          createdAt: now,
          updatedAt: now,
        };
        break;
      case 'visual_update':
        newCard = {
          id: `card-visual-${Date.now()}`,
          type: 'visual_update',
          title: 'UI Preview Asset',
          imageUrl: project.images[0]?.dataUrl || '',
          altText: 'UI preview asset mockup',
          caption: 'User interface candidate build',
          createdAt: now,
          updatedAt: now,
        };
        break;
    }

    updateActiveProject((prev) => ({ ...prev, cards: [...prev.cards, newCard], isDirty: true }));
    setInspectedCardId(newCard.id);
    addToast(`Added new ${newCard.type.replace('_', ' ')} card`, 'success');
  };

  // Card selection
  const handleToggleSelectCard = (id: string) => {
    setSelectedCardIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelectAllCards = () => {
    setSelectedCardIds(new Set(project.cards.map((c) => c.id)));
  };

  const handleDeselectAllCards = () => {
    setSelectedCardIds(new Set());
  };

  // Duplicate immediately after the original (no clipboard round-trip)
  const handleCopyCard = (card: SnippetCard) => {
    handleDuplicateCard(card.id);
  };

  // Copy selected cards
  const handleCopySelectedCards = async () => {
    const selected = project.cards.filter((c) => selectedCardIds.has(c.id));
    if (selected.length === 0) return;
    const md = selected.map(formatCardToMarkdown).join('\n\n---\n\n');
    const html = selected.map(formatCardToHtml).join('<br/>');
    const res = await copyToClipboard(md, html);
    if (res.success) {
      addToast(`Copied ${selected.length} selected cards!`, 'success');
    } else {
      addToast('Failed to copy cards', 'error');
    }
  };

  // ---- Project library: switching, folders, time flow ----
  const resetWorkspaceUI = (cards: SnippetCard[]) => {
    setHistoryStack([]);
    setRedoStack([]);
    setSelectedCardIds(new Set());
    setInspectedCardId(cards[0]?.id ?? null);
    setHighlightPassage(null);
  };

  const handleSelectProject = (id: string) => {
    if (id === library.activeProjectId) return;
    const target = library.projects.find((p) => p.id === id);
    if (!target) return;
    setLibrary((prev) => ({ ...prev, activeProjectId: id }));
    resetWorkspaceUI(target.cards);
    const latest = latestSnapshotForProject(library.snapshots, id);
    setBaselineCards(latest ? latest.cards : []);
    setMobileArea('canvas');
  };

  const handleNewProject = (folderId: string) => {
    const folders = ensureDefaultFolder(library.folders);
    const fid = folders.some((f) => f.id === folderId) ? folderId : folders[0].id;
    const blank = createBlankProject(fid);
    setLibrary((prev) => ({
      ...prev,
      folders: ensureDefaultFolder(prev.folders),
      projects: [...prev.projects, blank],
      activeProjectId: blank.id,
    }));
    resetWorkspaceUI([]);
    setBaselineCards([]);
    setMobileArea('canvas');
    addToast('Created new project', 'success');
  };

  const handleRenameProject = (id: string, title: string) => {
    setLibrary((prev) => ({
      ...prev,
      projects: prev.projects.map((p) =>
        p.id === id ? { ...p, title, isDirty: true, lastSavedAt: new Date().toISOString() } : p
      ),
    }));
  };

  const handleDuplicateProject = (id: string) => {
    const src = library.projects.find((p) => p.id === id);
    if (!src) return;
    const copy: ReportProject = {
      ...src,
      id: uid('proj'),
      title: `${src.title} (Copy)`,
      lastSavedAt: new Date().toISOString(),
      isDirty: false,
    };
    setLibrary((prev) => ({ ...prev, projects: [...prev.projects, copy], activeProjectId: copy.id }));
    resetWorkspaceUI(copy.cards);
    setBaselineCards([]);
    addToast('Project duplicated', 'success');
  };

  const handleMoveProject = (id: string, folderId: string) => {
    setLibrary((prev) => ({
      ...prev,
      projects: prev.projects.map((p) => (p.id === id ? { ...p, folderId } : p)),
    }));
    addToast('Project moved', 'success');
  };

  const handleDeleteProject = (id: string) => {
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
    if (wasActive) {
      resetWorkspaceUI(projects[0].cards);
      const latest = latestSnapshotForProject(snapshots, nextActive);
      setBaselineCards(latest ? latest.cards : []);
    }
    addToast('Project deleted', 'info');
  };

  const handleNewFolder = (name: string) => {
    const folder = createFolder(name);
    setLibrary((prev) => ({ ...prev, folders: [...ensureDefaultFolder(prev.folders), folder] }));
    addToast(`Folder "${folder.name}" created`, 'success');
  };

  const handleRenameFolder = (id: string, name: string) => {
    setLibrary((prev) => ({
      ...prev,
      folders: prev.folders.map((f) => (f.id === id ? { ...f, name } : f)),
    }));
  };

  const handleDeleteFolder = (id: string) => {
    const remaining = library.folders.filter((f) => f.id !== id);
    const folders = ensureDefaultFolder(remaining);
    const fallbackId = folders[0].id;
    setLibrary((prev) => ({
      ...prev,
      folders,
      projects: prev.projects.map((p) => (p.folderId === id ? { ...p, folderId: fallbackId } : p)),
    }));
    addToast('Folder deleted — its projects moved to the first folder', 'info');
  };

  const handleSaveSnapshot = (name?: string) => {
    const label = name?.trim() || snapshotLabelFor(project);
    setLibrary((prev) => ({
      ...prev,
      snapshots: addSnapshot(prev.snapshots, makeSnapshot(prev.activeProjectId, label, project.cards, 'manual', project)),
    }));
    addToast(`Snapshot saved (${label})`, 'success');
  };

  const handleRestoreSnapshot = (snapshotId: string) => {
    const snap = library.snapshots.find(
      (s) => s.id === snapshotId && s.projectId === library.activeProjectId
    );
    if (!snap) return;
    recordHistory();
    updateActiveProject((prev) => ({
      ...prev,
      ...(snap.project ?? {}),
      id: prev.id,
      folderId: prev.folderId,
      cards: snap.cards,
      isDirty: true,
      lastSavedAt: new Date().toISOString(),
    }));
    setSelectedCardIds(new Set());
    setInspectedCardId(snap.cards[0]?.id ?? null);
    setHighlightPassage(null);
    addToast(`Restored "${snap.label}" (undoable with ⌘Z)`, 'success');
  };

  const handleCompareSnapshot = (snapshotId: string) => {
    const snap = library.snapshots.find(
      (s) => s.id === snapshotId && s.projectId === library.activeProjectId
    );
    if (!snap) return;
    setBaselineCards(snap.cards);
    setIsSnapshotModalOpen(true);
  };

  // Computed per-project readiness (sidebar dots)

  const readinessByProject = useMemo(() => {
    const map: Record<string, number> = {};
    for (const p of library.projects) {
      try {
        map[p.id] = calculateExecutiveScore(p).score;
      } catch {
        map[p.id] = 0;
      }
    }
    return map;
  }, [library.projects]);

  const activeSnapshots = useMemo(
    () => snapshotsForProject(library.snapshots, library.activeProjectId),
    [library.snapshots, library.activeProjectId]
  );

  // Guided Tour 5-Step Configuration
  const tourSteps: TourStep[] = [
    {
      title: '1. Ingest Messy, Unstructured Notes',
      badge: 'Composer Input',
      summary: 'Use the bottom composer to paste conversational sprint updates, add metrics, paste tables, or attach images — without hallucinating.',
      actionLabel: 'Load Messy Notes',
      onExecute: () => {
        handleLoadSample(true);
        setMobileArea('canvas');
        setTourStepIndex(1);
      },
    },
    {
      title: '2. Magic Transform with Source Traceability',
      badge: 'Deterministic Extraction',
      summary: 'Transforms raw updates into typed Snippet Cards. Click any card to inspect the exact underlying sentence with truth-preserving confidence.',
      actionLabel: 'Synthesize & Inspect',
      onExecute: () => {
        handleGenerateReport();
        const blocker = project.cards.find(c => c.type === 'risk_blocker');
        if (blocker) {
          setInspectedCardId(blocker.id);
          if (blocker.sourceRef) {
            setHighlightPassage({ text: blocker.sourceRef.passageText });
          }
        }
        setMobileArea('canvas');
        setTourStepIndex(2);
      },
    },
    {
      title: '3. Executive-Ready Diagnostic Score',
      badge: 'Readiness Audit',
      summary: 'Transparent 6-point checklist auditing missing context, unstated dates, missing KPI targets, and WCAG image alt text with 1-click quick-fixes.',
      actionLabel: 'Audit & Quick-Fix',
      onExecute: () => {
        setMobileArea('canvas');
        handleApplyAllFixes();
        setTourStepIndex(3);
      },
    },
    {
      title: '4. What\'s Changed? (Snapshot Diff)',
      badge: 'Comparator',
      summary: 'Compare Week 40 baseline vs Week 41 current state: surfaces metric shifts (completion +15%, defects -2), resolved blockers, and new milestones.',
      actionLabel: 'Open Snapshot Diff',
      onExecute: () => {
        setIsSnapshotModalOpen(true);
        setTourStepIndex(4);
      },
    },
    {
      title: '5. Destination-Aware Presentation Export',
      badge: 'Destination Export',
      summary: 'Formats the single source of truth into Outlook/Gmail tables, Slack mrkdwn, Teams, or formal Weekly Memo with rich clipboard copy and PDF print.',
      actionLabel: 'Preview Formats',
      onExecute: () => {
        setIsSnapshotModalOpen(false);
        setExportInitialMode('formats');
        setIsExportOpen(true);
        setTourStepIndex(5);
      },
    },
    {
      title: '6. Live Message Tool Integration & Audit Trail',
      badge: 'Tool Integration',
      summary: 'Directly deliver reports into Slack, Microsoft Teams, Google Chat, Discord, or Email with live webhooks, payload inspectors, and persistent audit logs.',
      actionLabel: 'Open Message Dispatcher',
      onExecute: () => {
        setIsSnapshotModalOpen(false);
        setExportInitialMode('tools');
        setExportInitialTool('slack');
        setIsExportOpen(true);
        setIsGuidedTourOpen(false);
      },
    },
  ];

  const handleOpenExport = useCallback(() => {
    setExportInitialMode('formats');
    setIsExportOpen(true);
  }, []);

  const handleOpenMessageTools = useCallback((tool: MessageToolId = 'email') => {
    setExportInitialMode('tools');
    setExportInitialTool(tool);
    setIsExportOpen(true);
  }, []);

  const handleOpenMessageToolsForSelected = useCallback(() => {
    setExportInitialMode('tools');
    setExportInitialTool('slack');
    setIsExportOpen(true);
  }, []);

  const handleShareCard = useCallback((card: SnippetCard) => {
    setSelectedCardIds(new Set([card.id]));
    setExportInitialMode('tools');
    setExportInitialTool('slack');
    setIsExportOpen(true);
  }, []);

  return (
    <div className="workspace-shell h-dvh flex flex-col overflow-hidden bg-[#F5F5F7] text-[#1F1F1F]">
      {/* 1. Universal Apple-Inspired Header */}
      <Header
        isDirty={savedLibrary !== library}
        saveError={saveError}
        projectTitle={project.title}
        folderName={library.folders.find((f) => f.id === project.folderId)?.name ?? 'Projects'}
        onToggleSidebar={() => {
          if (window.innerWidth < 1024) setMobileArea(mobileArea === 'projects' ? 'canvas' : 'projects');
          else setSidebarVisible((v) => !v);
        }}
        canRedo={redoStack.length > 0}
        onRedo={handleRedo}
        lastSavedAt={project.lastSavedAt}
        canUndo={historyStack.length > 0}
        onUndo={handleUndo}
        onLoadSample={() => handleLoadSample(false)}
        onOpenExport={handleOpenExport}
        onOpenMessageTools={() => handleOpenMessageTools('email')}
        onPrint={() => window.print()}
        onReset={handleReset}
        onOpenGuidedTour={() => {
          setIsGuidedTourOpen(true);
          setTourStepIndex(0);
        }}
        onOpenSnapshotDiff={() => setIsSnapshotModalOpen(true)}
        onOpenShortcuts={() => setIsShortcutsOpen(true)}
      />

      {/* 2. Mobile Area Switcher */}
      <div className="lg:hidden flex items-center justify-center p-2 bg-[#F5F5F7] border-b border-black/[0.06] no-print">
        <div className="flex items-center p-0.5 bg-black/[0.05] rounded-full text-xs font-medium w-full max-w-sm">
          <button
            type="button"
            onClick={() => setMobileArea('projects')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-full transition-all ${
              mobileArea === 'projects' ? 'bg-white text-[#1D1D1F] shadow-xs font-semibold' : 'text-[#86868B]'
            }`}
          >
            <Folder className="w-3.5 h-3.5" />
            <span>Projects</span>
          </button>

          <button
            type="button"
            onClick={() => setMobileArea('canvas')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-full transition-all ${
              mobileArea === 'canvas' ? 'bg-white text-[#1D1D1F] shadow-xs font-semibold' : 'text-[#86868B]'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Report ({project.cards.length})</span>
          </button>
        </div>
      </div>

      {/* 3. Two-Area Workspace (Desktop: 2 columns, Mobile: selected area) */}
      <main className="workspace-main flex-1 min-h-0 flex overflow-hidden">
        {/* AREA 0: PROJECT LIBRARY (folders + time flow) */}
        <section
          aria-label="Projects and Time Flow"
          className={`workspace-sidebar w-full lg:w-[272px] h-full shrink-0 ${
            mobileArea === 'projects' ? 'block' : sidebarVisible ? 'hidden lg:block' : 'hidden'
          } no-print`}
        >
          <ProjectSidebar
            library={library}
            activeProjectId={library.activeProjectId}
            scores={readinessByProject}
            onSelectProject={handleSelectProject}
            onNewProject={handleNewProject}
            onNewFolder={handleNewFolder}
            onRenameProject={handleRenameProject}
            onDuplicateProject={handleDuplicateProject}
            onMoveProject={handleMoveProject}
            onDeleteProject={handleDeleteProject}
            onRenameFolder={handleRenameFolder}
            onDeleteFolder={handleDeleteFolder}
          >
            <TimeFlow
              snapshots={activeSnapshots}
              onSaveSnapshot={handleSaveSnapshot}
              onRestoreSnapshot={handleRestoreSnapshot}
              onCompareSnapshot={handleCompareSnapshot}
            />
          </ProjectSidebar>
        </section>

        {/* AREA 1: REPORT COMPOSITION + BOTTOM COMPOSER */}
        <section
          aria-label="Report Composition and Preview"
          className={`workspace-report flex-1 min-w-0 h-full flex-col overflow-hidden bg-[#F5F5F7] ${
            mobileArea === 'canvas' ? 'flex' : 'hidden lg:flex'
          }`}
        >
          <ReportCanvas
            key={project.id}
            projectId={project.id}
            title={project.title}
            reportingPeriod={project.reportingPeriod}
            cards={project.cards}
            selectedCardIds={selectedCardIds}
            inspectedCardId={inspectedCardId}
            onUpdateTitle={(title) => updateActiveProject((prev) => ({ ...prev, title, isDirty: true }))}
            onUpdatePeriod={(reportingPeriod) =>
              updateActiveProject((prev) => ({ ...prev, reportingPeriod, isDirty: true }))
            }
            onToggleSelectCard={handleToggleSelectCard}
            onSelectAllCards={handleSelectAllCards}
            onDeselectAllCards={handleDeselectAllCards}
            onInspectCard={(id) => {
              setInspectedCardId(id);
              const card = project.cards.find(c => c.id === id);
              if (card?.sourceRef) {
                setHighlightPassage({ text: card.sourceRef.passageText });
              } else {
                setHighlightPassage(null);
              }
            }}
            onMoveCard={handleMoveCard}
            onDuplicateCard={handleDuplicateCard}
            onDeleteCard={handleDeleteCard}
            onDeleteSelectedCards={handleDeleteSelectedCards}
            onCopyCard={handleCopyCard}
            onCopySelectedCards={handleCopySelectedCards}
            onOpenMessageToolsForSelected={handleOpenMessageToolsForSelected}
            onShareCard={handleShareCard}
            onUpdateCard={handleUpdateCard}
            onAddCard={handleAddCard}
            rawNotes={project.rawNotes}
            metrics={project.metrics}
            images={project.images}
            highlightPassage={highlightPassage}
            onNotesChange={handleNotesChange}
            onMetricsChange={handleMetricsChange}
            onImagesChange={handleImagesChange}
            onImagesAppend={handleImagesAppend}
            onGenerateReport={handleGenerateReport}
            onNotify={addToast}
          />
        </section>
      </main>

      {/* 4. Guided Tour Controller */}
      <GuidedTour
        currentStepIndex={tourStepIndex}
        isOpen={isGuidedTourOpen}
        onClose={() => setIsGuidedTourOpen(false)}
        onNext={() => setTourStepIndex((prev) => Math.min(prev + 1, tourSteps.length - 1))}
        onPrev={() => setTourStepIndex((prev) => Math.max(prev - 1, 0))}
        onJumpToStep={(idx) => setTourStepIndex(idx)}
        steps={tourSteps}
      />

      {/* 5. Keyboard Shortcuts Cheat-Sheet Modal */}
      <ShortcutsModal
        isOpen={isShortcutsOpen}
        onClose={() => setIsShortcutsOpen(false)}
      />

      {/* 6. Snapshot Diff Modal ("What's Changed?") */}
      <SnapshotComparisonModal
        currentCards={project.cards}
        initialCards={baselineCards}
        isOpen={isSnapshotModalOpen}
        onClose={() => setIsSnapshotModalOpen(false)}
        onNotify={addToast}
      />

      {/* 7. Destination-Aware Export & Message Tools Modal */}
      {isExportOpen && <Suspense fallback={<div role="status" className="fixed bottom-8 right-8 z-50 rounded-xl bg-white p-4 shadow-lg text-sm">Opening share preview…</div>}><ExportModal
        project={project}
        selectedCards={project.cards.filter((c) => selectedCardIds.has(c.id))}
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        onNotify={addToast}
        initialMode={exportInitialMode}
        initialTool={exportInitialTool}
      /></Suspense>}

      {/* 8. Toast Feedback */}
      <Toast toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
