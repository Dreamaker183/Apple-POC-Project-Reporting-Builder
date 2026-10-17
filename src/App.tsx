/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { Suspense, lazy, useState, useMemo, useRef, useCallback } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Eye, Folder } from 'lucide-react';

import type { ReportProject, SnippetCard, CardType } from './types/report';
import { generateSnippetCards } from './lib/parsing/deterministicParser';
import { mergeGeneratedCards } from './lib/composition/mergeCards';
import {
  ensureDefaultFolder,
  makeSnapshot,
  addSnapshot,
  latestSnapshotForProject,
  snapshotLabelFor,
  uid,
} from './lib/persistence/projectLibrary';
import { calculateExecutiveScore, applyQuickFixToProject } from './lib/analysis/executiveScore';
import { importReportFromJson } from './lib/export/jsonExport';
import { useLanguage } from './lib/i18n/LanguageContext';

// Hooks
import { useToast } from './hooks/useToast';
import { useUndoRedo } from './hooks/useUndoRedo';
import { useMediaQuery } from './hooks/useMediaQuery';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useProjectLibrary } from './hooks/useProjectLibrary';
import { useCardOperations } from './hooks/useCardOperations';

// Components
import { Header } from './components/layout/Header';
import { ReportCanvas } from './components/composition/ReportCanvas';
import { ProjectSidebar } from './components/projects/ProjectSidebar';
import { TimeFlow } from './components/projects/TimeFlow';
import { SnapshotComparisonModal } from './components/composition/SnapshotComparisonModal';
import { GuidedTour } from './components/guided-demo/GuidedTour';
import { buildTourSteps } from './components/guided-demo/tourSteps';
import { ShortcutsModal } from './components/common/ShortcutsModal';
import { Toast } from './components/common/Toast';
import type { MessageToolId } from './components/export/ExportModal';

const ExportModal = lazy(() =>
  import('./components/export/ExportModal').then((module) => ({ default: module.ExportModal }))
);

export default function App() {
  const { t } = useLanguage();
  const reduceMotion = useReducedMotion();
  const isDesktop = useMediaQuery('(min-width: 1024px)');

  // 1. Toast notifications
  const { toasts, addToast, dismissToast } = useToast();

  // 2. Project Library state & operations
  const {
    library,
    setLibrary,
    project,
    savedLibrary,
    saveError,
    updateActiveProject,
    handleSelectProject: selectProjectInLib,
    handleNewProject: newProjectInLib,
    handleReset: resetInLib,
    handleRenameProject,
    handleDuplicateProject: dupProjectInLib,
    handleMoveProject,
    handleDeleteProject: deleteProjectInLib,
    handleLoadSample: loadSampleInLib,
    handleNewFolder,
    handleRenameFolder,
    handleDeleteFolder,
    handleSaveSnapshot,
    handleRestoreSnapshot: restoreSnapshotInLib,
    handleCompareSnapshot: compareSnapshotInLib,
    activeSnapshots,
    handleNotesChange,
    handleMetricsChange,
    handleImagesChange,
    handleImagesAppend,
    handleScheduleChange,
  } = useProjectLibrary(addToast);

  // 3. Undo / Redo history
  const { canUndo, canRedo, recordHistory, undo, redo, clearHistory } = useUndoRedo<ReportProject>();
  const recordProjectHistory = useCallback(() => recordHistory(project), [recordHistory, project]);

  const handleUndo = useCallback(() => {
    const previous = undo(project);
    if (!previous) return;
    updateActiveProject((prev) => ({
      ...prev,
      ...previous,
      isDirty: true,
      lastSavedAt: new Date().toISOString(),
    }));
    addToast('Reverted most recent action', 'info');
  }, [undo, project, updateActiveProject, addToast]);

  const handleRedo = useCallback(() => {
    const next = redo(project);
    if (!next) return;
    updateActiveProject(() => ({ ...next, isDirty: true }));
  }, [redo, project, updateActiveProject]);

  // 4. Card Operations
  const {
    selectedCardIds,
    inspectedCardId,
    highlightPassage,
    setInspectedCardId,
    setHighlightPassage,
    resetWorkspaceUI,
    handleUpdateCard,
    handleDeleteCard,
    handleDeleteSelectedCards,
    handleDuplicateCard,
    handleMoveCard,
    handleReorderCards,
    handleAddCard,
    handleToggleSelectCard,
    handleSelectSingleCard,
    handleSelectAllCards,
    handleDeselectAllCards,
    handleCopyCard,
    handleCopySelectedCards,
    handleInspectCard,
    handleApplyFindings,
  } = useCardOperations(project, updateActiveProject, recordProjectHistory, addToast);

  // 5. Layout & Modal UI state
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const [mobileArea, setMobileArea] = useState<'projects' | 'canvas'>('canvas');

  const handleAddCardWithNavigation = useCallback((type: CardType) => {
    setMobileArea('canvas');
    return handleAddCard(type);
  }, [handleAddCard]);

  const [baselineCards, setBaselineCards] = useState<SnippetCard[]>(() => {
    const latest = latestSnapshotForProject(library.snapshots, library.activeProjectId);
    return latest ? latest.cards : [];
  });

  const [isExportOpen, setIsExportOpen] = useState(false);
  const [exportInitialMode, setExportInitialMode] = useState<'formats' | 'tools'>('formats');
  const [exportInitialTool, setExportInitialTool] = useState<MessageToolId>('email');
  const [isSnapshotModalOpen, setIsSnapshotModalOpen] = useState(false);
  const [isGuidedTourOpen, setIsGuidedTourOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [tourStepIndex, setTourStepIndex] = useState(0);

  const importInputRef = useRef<HTMLInputElement>(null);

  const toggleSidebar = useCallback(() => {
    if (window.matchMedia('(min-width: 1024px)').matches) {
      setSidebarVisible((v) => !v);
    } else {
      setMobileArea((a) => (a === 'projects' ? 'canvas' : 'projects'));
    }
  }, []);

  // 6. Project Switching & Lifecycle Handlers
  const handleSelectProject = useCallback((id: string) => {
    const target = selectProjectInLib(id);
    if (!target) return;
    clearHistory();
    resetWorkspaceUI(target.cards);
    const latest = latestSnapshotForProject(library.snapshots, id);
    setBaselineCards(latest ? latest.cards : []);
    setMobileArea('canvas');
  }, [selectProjectInLib, clearHistory, resetWorkspaceUI, library.snapshots]);

  const handleNewProject = useCallback((folderId: string) => {
    newProjectInLib(folderId);
    clearHistory();
    resetWorkspaceUI([]);
    setBaselineCards([]);
    setMobileArea('canvas');
  }, [newProjectInLib, clearHistory, resetWorkspaceUI]);

  const handleReset = useCallback(() => {
    resetInLib();
    clearHistory();
    resetWorkspaceUI([]);
    setBaselineCards([]);
    setMobileArea('canvas');
  }, [resetInLib, clearHistory, resetWorkspaceUI]);

  const handleDuplicateProject = useCallback((id: string) => {
    const copy = dupProjectInLib(id);
    if (!copy) return;
    clearHistory();
    resetWorkspaceUI(copy.cards);
    setBaselineCards([]);
  }, [dupProjectInLib, clearHistory, resetWorkspaceUI]);

  const handleDeleteProject = useCallback((id: string) => {
    const result = deleteProjectInLib(id);
    if (result.wasActive) {
      clearHistory();
      resetWorkspaceUI(result.projects[0].cards);
      const latest = latestSnapshotForProject(result.snapshots, result.nextActive);
      setBaselineCards(latest ? latest.cards : []);
    }
  }, [deleteProjectInLib, clearHistory, resetWorkspaceUI]);

  const handleLoadSample = useCallback((useMessy: boolean = false, emptyCards: boolean = false) => {
    recordProjectHistory();
    const sample = loadSampleInLib(useMessy, emptyCards);
    resetWorkspaceUI(sample.cards);
    return sample;
  }, [recordProjectHistory, loadSampleInLib, resetWorkspaceUI]);

  // 7. Snapshot Handlers
  const handleRestoreSnapshot = useCallback((snapshotId: string) => {
    const snap = restoreSnapshotInLib(snapshotId, recordProjectHistory);
    if (!snap) return;
    resetWorkspaceUI(snap.cards);
    if (!isDesktop) setMobileArea('canvas');
  }, [restoreSnapshotInLib, recordProjectHistory, resetWorkspaceUI, isDesktop]);

  const handleCompareSnapshot = useCallback((snapshotId: string) => {
    const snap = compareSnapshotInLib(snapshotId);
    if (!snap) return;
    setBaselineCards(snap.cards);
    setIsSnapshotModalOpen(true);
  }, [compareSnapshotInLib]);

  // 8. Deterministic Card Generation
  const handleGenerateReport = useCallback((newNotes?: string) => {
    const rawNotes = newNotes?.trim()
      ? [project.rawNotes, newNotes.trim()].filter(Boolean).join('\n\n')
      : project.rawNotes;
    if (!rawNotes.trim() && !project.metrics.length && !project.images.length) return [];
    recordProjectHistory();
    const generatedCards = mergeGeneratedCards(
      project.cards,
      generateSnippetCards(rawNotes, project.metrics, project.images, project.title)
    );

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
    return generatedCards;
  }, [project, recordProjectHistory, setLibrary, setInspectedCardId, setHighlightPassage, addToast]);

  // 9. Quick Fixes for Readiness Scores
  const handleApplyQuickFix = useCallback((checkId: string) => {
    recordProjectHistory();
    const updated = applyQuickFixToProject(project, checkId);
    updateActiveProject(() => updated);
    addToast('Applied readiness quick-fix', 'success');
  }, [recordProjectHistory, project, updateActiveProject, addToast]);

  const handleApplyAllFixes = useCallback(() => {
    recordProjectHistory();
    let current = { ...project };
    const score = calculateExecutiveScore(current, t);
    score.items.forEach((item) => {
      if (item.status !== 'pass') {
        current = applyQuickFixToProject(current, item.id);
      }
    });
    const fixed = current;
    updateActiveProject(() => fixed);
    addToast('All diagnostic readiness checks resolved!', 'success');
  }, [recordProjectHistory, project, t, updateActiveProject, addToast]);

  // 10. Import JSON project
  const triggerImportProject = useCallback(() => {
    importInputRef.current?.click();
  }, []);

  const handleImportProjectFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (importInputRef.current) importInputRef.current.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = String(ev.target?.result ?? '');
      const res = importReportFromJson(text);
      if (!res.success || !res.data) {
        addToast(res.error || 'Could not import project JSON', 'error');
        return;
      }
      const folders = ensureDefaultFolder(library.folders);
      const active = library.projects.find((p) => p.id === library.activeProjectId);
      const folderId = active?.folderId && folders.some((f) => f.id === active.folderId)
        ? active.folderId
        : folders[0].id;
      const now = new Date().toISOString();
      const imported: ReportProject = {
        ...res.data,
        sendSchedule: undefined,
        id: uid('proj'),
        folderId,
        createdAt: res.data.createdAt || now,
        reportingPeriod: res.data.reportingPeriod?.trim() ? res.data.reportingPeriod.trim() : (res.data.createdAt || now).slice(0, 10),
        lastSavedAt: now,
        isDirty: false,
      };
      setLibrary((prev) => ({
        ...prev,
        folders: ensureDefaultFolder(prev.folders),
        projects: [...prev.projects, imported],
        activeProjectId: imported.id,
      }));
      clearHistory();
      resetWorkspaceUI(imported.cards);
      setBaselineCards([]);
      setMobileArea('canvas');
      addToast(`Imported "${imported.title}"`, 'success');
    };
    reader.onerror = () => addToast('Failed to read JSON file', 'error');
    reader.readAsText(file);
  }, [library.folders, library.projects, library.activeProjectId, setLibrary, clearHistory, resetWorkspaceUI, addToast]);

  // 11. Readiness Scores (Memoized)
  const readinessScore = useMemo(() => calculateExecutiveScore(project, t), [project, t]);

  const readinessByProject = useMemo(() => {
    const map: Record<string, number> = {};
    for (const p of library.projects) {
      try {
        map[p.id] = calculateExecutiveScore(p, t).score;
      } catch {
        map[p.id] = 0;
      }
    }
    return map;
  }, [library.projects, t]);

  // 12. Tour Steps
  const tourSteps = useMemo(() => buildTourSteps({
    onLoadSample: handleLoadSample,
    setMobileArea,
    setTourStepIndex,
    onGenerateReport: handleGenerateReport,
    getProject: () => project,
    setInspectedCardId,
    setHighlightPassage,
    onApplyAllFixes: handleApplyAllFixes,
    setBaselineCards,
    setIsSnapshotModalOpen,
    setExportInitialMode,
    setExportInitialTool,
    setIsExportOpen,
    setIsGuidedTourOpen,
    isSnapshotModalOpen,
    isExportOpen,
  }, t), [
    handleLoadSample,
    handleGenerateReport,
    project,
    setInspectedCardId,
    setHighlightPassage,
    handleApplyAllFixes,
    setBaselineCards,
    setIsSnapshotModalOpen,
    setExportInitialMode,
    setExportInitialTool,
    setIsExportOpen,
    setIsGuidedTourOpen,
    isSnapshotModalOpen,
    isExportOpen,
    t,
  ]);

  const handleTourNext = useCallback(() => {
    if (tourStepIndex === 0) {
      tourSteps[0]?.onExecute();
    } else if (tourStepIndex === 1) {
      tourSteps[1]?.onExecute();
    } else if (tourStepIndex === 2) {
      tourSteps[2]?.onExecute();
    } else if (tourStepIndex === 3) {
      if (isSnapshotModalOpen) {
        setIsSnapshotModalOpen(false);
        setExportInitialMode('formats');
        setIsExportOpen(true);
        setTourStepIndex(4);
      } else {
        tourSteps[3]?.onExecute();
      }
    } else if (tourStepIndex === 4) {
      tourSteps[4]?.onExecute();
    } else if (tourStepIndex === 5) {
      tourSteps[5]?.onExecute();
    } else {
      setTourStepIndex((prev) => Math.min(prev + 1, tourSteps.length - 1));
    }
  }, [tourStepIndex, tourSteps, isSnapshotModalOpen]);

  const handleTourPrev = useCallback(() => {
    setIsSnapshotModalOpen(false);
    setIsExportOpen(false);
    setTourStepIndex((prev) => Math.max(prev - 1, 0));
  }, []);

  const handleTourClose = useCallback(() => {
    setIsGuidedTourOpen(false);
  }, []);

  const handleTourJump = useCallback((idx: number) => {
    if (idx < 3) {
      setIsSnapshotModalOpen(false);
      setIsExportOpen(false);
    }
    setTourStepIndex(idx);
  }, []);

  // 13. Sharing & Message Tool Triggers
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
    handleSelectSingleCard(card.id);
    setExportInitialMode('tools');
    setExportInitialTool('slack');
    setIsExportOpen(true);
  }, [handleSelectSingleCard]);

  // 14. Keyboard Shortcuts
  useKeyboardShortcuts([
    { key: '\\', meta: true, handler: toggleSidebar },
    { key: 'z', meta: true, shift: true, handler: handleRedo },
    { key: 'z', meta: true, handler: handleUndo },
    { key: 'e', meta: true, handler: handleOpenExport },
    { key: 'Enter', meta: true, handler: () => handleGenerateReport() },
    { key: '?', handler: () => setIsShortcutsOpen(true) },
  ], [toggleSidebar, handleRedo, handleUndo, handleOpenExport, handleGenerateReport]);

  return (
    <div className="workspace-shell h-dvh flex flex-col overflow-hidden bg-[#F5F5F7] text-[#1F1F1F]">
      {/* 1. Header */}
      <Header
        isDirty={savedLibrary !== library}
        saveError={saveError}
        projectTitle={project.title}
        folderName={library.folders.find((f) => f.id === project.folderId)?.name ?? 'Projects'}
        sidebarOpen={isDesktop ? sidebarVisible : mobileArea === 'projects'}
        onToggleSidebar={toggleSidebar}
        canRedo={canRedo}
        onRedo={handleRedo}
        lastSavedAt={project.lastSavedAt}
        canUndo={canUndo}
        onUndo={handleUndo}
        onLoadSample={() => handleLoadSample(false)}
        onOpenExport={handleOpenExport}
        onOpenMessageTools={() => handleOpenMessageTools('email')}
        onPrint={() => window.print()}
        onReset={handleReset}
        onImportProject={triggerImportProject}
        onOpenGuidedTour={() => {
          setIsGuidedTourOpen(true);
          setTourStepIndex(0);
        }}
        onOpenSnapshotDiff={() => setIsSnapshotModalOpen(true)}
        onOpenShortcuts={() => setIsShortcutsOpen(true)}
      />

      {/* 2. Mobile Area Switcher */}
      <div className="lg:hidden flex items-center justify-center px-3 py-1.5 bg-[#F5F5F7] border-b border-black/[0.06] no-print shrink-0">
        <div className="flex items-center p-0.5 bg-black/[0.06] rounded-full text-xs font-medium w-full max-w-sm">
          <button
            type="button"
            onClick={() => setMobileArea('projects')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 sm:py-2 rounded-full transition-all min-h-[32px] ${
              mobileArea === 'projects' ? 'bg-white text-[#1D1D1F] shadow-xs font-semibold' : 'text-[#86868B] hover:text-[#1D1D1F]'
            }`}
          >
            <Folder className="w-3.5 h-3.5" />
            <span>Projects</span>
          </button>

          <button
            type="button"
            onClick={() => setMobileArea('canvas')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 sm:py-2 rounded-full transition-all min-h-[32px] ${
              mobileArea === 'canvas' ? 'bg-white text-[#1D1D1F] shadow-xs font-semibold' : 'text-[#86868B] hover:text-[#1D1D1F]'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Report ({project.cards.length})</span>
          </button>
        </div>
      </div>

      {/* 3. Main Workspace */}
      <main className="workspace-main flex-1 min-h-0 flex overflow-hidden">
        {/* Sidebar */}
        {isDesktop ? (
          <motion.aside
            aria-label="Projects and Time Flow"
            aria-hidden={!sidebarVisible}
            inert={!sidebarVisible}
            initial={false}
            animate={{ width: sidebarVisible ? 272 : 0 }}
            transition={
              reduceMotion
                ? { duration: 0 }
                : { duration: 0.34, ease: [0.32, 0.72, 0, 1] }
            }
            style={{ contain: 'paint' }}
            className={`workspace-sidebar hidden lg:block h-full shrink-0 overflow-hidden no-print ${
              sidebarVisible ? '' : 'pointer-events-none'
            }`}
          >
            <motion.div
              initial={false}
              animate={{
                x: sidebarVisible ? 0 : -24,
                opacity: sidebarVisible ? 1 : 0,
              }}
              transition={
                reduceMotion
                  ? { duration: 0 }
                  : sidebarVisible
                    ? { duration: 0.3, ease: [0.32, 0.72, 0, 1], delay: 0.04 }
                    : { duration: 0.22, ease: [0.32, 0.72, 0, 1] }
              }
              style={{ willChange: 'transform, opacity' }}
              className="w-[272px] h-full overflow-hidden"
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
                onImportProject={triggerImportProject}
              >
                <TimeFlow
                  snapshots={activeSnapshots}
                  onSaveSnapshot={handleSaveSnapshot}
                  onRestoreSnapshot={handleRestoreSnapshot}
                  onCompareSnapshot={handleCompareSnapshot}
                />
              </ProjectSidebar>
            </motion.div>
          </motion.aside>
        ) : (
          <AnimatePresence mode="wait" initial={false}>
            {mobileArea === 'projects' ? (
              <motion.section
                key="mobile-projects"
                aria-label="Projects and Time Flow"
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -20, opacity: 0 }}
                transition={
                  reduceMotion
                    ? { duration: 0 }
                    : { duration: 0.24, ease: [0.32, 0.72, 0, 1] }
                }
                className="workspace-sidebar w-full h-full shrink-0 no-print"
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
                  onImportProject={triggerImportProject}
                >
                  <TimeFlow
                    snapshots={activeSnapshots}
                    onSaveSnapshot={handleSaveSnapshot}
                    onRestoreSnapshot={handleRestoreSnapshot}
                    onCompareSnapshot={handleCompareSnapshot}
                  />
                </ProjectSidebar>
              </motion.section>
            ) : (
              <motion.section
                key="mobile-canvas"
                aria-label="Report Composition and Preview"
                initial={{ x: 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: 20, opacity: 0 }}
                transition={
                  reduceMotion
                    ? { duration: 0 }
                    : { duration: 0.24, ease: [0.32, 0.72, 0, 1] }
                }
                className="workspace-report flex-1 min-w-0 h-full flex flex-col overflow-hidden bg-[#F5F5F7]"
              >
                <ReportCanvas
                  key={project.id}
                  projectId={project.id}
                  projectTitle={project.title}
                  title={project.title}
                  reportingPeriod={project.reportingPeriod}
                  sendSchedule={project.sendSchedule}
                  onScheduleChange={handleScheduleChange}
                  onConfigureDispatch={() => handleOpenMessageTools('slack')}
                  cards={project.cards}
                  selectedCardIds={selectedCardIds}
                  inspectedCardId={inspectedCardId}
                  onUpdateTitle={(title) => updateActiveProject((prev) => ({ ...prev, title, isDirty: true }))}
                  onUpdatePeriod={(reportingPeriod) =>
                    updateActiveProject((prev) => ({
                      ...prev,
                      reportingPeriod,
                      sendSchedule: prev.sendSchedule ? { ...prev.sendSchedule, enabled: false } : undefined,
                      isDirty: true,
                    }))
                  }
                  onToggleSelectCard={handleToggleSelectCard}
                  onSelectAllCards={handleSelectAllCards}
                  onDeselectAllCards={handleDeselectAllCards}
                  onInspectCard={handleInspectCard}
                  onMoveCard={handleMoveCard}
                  onReorderCards={handleReorderCards}
                  onDuplicateCard={handleDuplicateCard}
                  onDeleteCard={handleDeleteCard}
                  onDeleteSelectedCards={handleDeleteSelectedCards}
                  onCopyCard={handleCopyCard}
                  onCopySelectedCards={handleCopySelectedCards}
                  onOpenMessageToolsForSelected={handleOpenMessageToolsForSelected}
                  onShareCard={handleShareCard}
                  onUpdateCard={handleUpdateCard}
                  onAddCard={handleAddCardWithNavigation}
                  rawNotes={project.rawNotes}
                  metrics={project.metrics}
                  images={project.images}
                  highlightPassage={highlightPassage}
                  onNotesChange={handleNotesChange}
                  onMetricsChange={handleMetricsChange}
                  onImagesChange={handleImagesChange}
                  onImagesAppend={handleImagesAppend}
                  onGenerateReport={handleGenerateReport}
                  onApplyFindings={handleApplyFindings}
                  readinessScore={readinessScore}
                  onApplyQuickFix={handleApplyQuickFix}
                  onApplyAllFixes={handleApplyAllFixes}
                  onNotify={addToast}
                />
              </motion.section>
            )}
          </AnimatePresence>
        )}

        {/* Report Canvas (Desktop) */}
        {isDesktop && (
          <section
            aria-label="Report Composition and Preview"
            className="workspace-report flex-1 min-w-0 h-full flex flex-col overflow-hidden bg-[#F5F5F7]"
          >
          <ReportCanvas
            key={project.id}
            projectId={project.id}
            projectTitle={project.title}
            title={project.title}
            reportingPeriod={project.reportingPeriod}
            sendSchedule={project.sendSchedule}
            onScheduleChange={handleScheduleChange}
            onConfigureDispatch={() => handleOpenMessageTools('slack')}
            cards={project.cards}
            selectedCardIds={selectedCardIds}
            inspectedCardId={inspectedCardId}
            onUpdateTitle={(title) => updateActiveProject((prev) => ({ ...prev, title, isDirty: true }))}
            onUpdatePeriod={(reportingPeriod) =>
              updateActiveProject((prev) => ({
                ...prev,
                reportingPeriod,
                sendSchedule: prev.sendSchedule ? { ...prev.sendSchedule, enabled: false } : undefined,
                isDirty: true,
              }))
            }
            onToggleSelectCard={handleToggleSelectCard}
            onSelectAllCards={handleSelectAllCards}
            onDeselectAllCards={handleDeselectAllCards}
            onInspectCard={handleInspectCard}
            onMoveCard={handleMoveCard}
            onReorderCards={handleReorderCards}
            onDuplicateCard={handleDuplicateCard}
            onDeleteCard={handleDeleteCard}
            onDeleteSelectedCards={handleDeleteSelectedCards}
            onCopyCard={handleCopyCard}
            onCopySelectedCards={handleCopySelectedCards}
            onOpenMessageToolsForSelected={handleOpenMessageToolsForSelected}
            onShareCard={handleShareCard}
            onUpdateCard={handleUpdateCard}
            onAddCard={handleAddCardWithNavigation}
            rawNotes={project.rawNotes}
            metrics={project.metrics}
            images={project.images}
            highlightPassage={highlightPassage}
            onNotesChange={handleNotesChange}
            onMetricsChange={handleMetricsChange}
            onImagesChange={handleImagesChange}
            onImagesAppend={handleImagesAppend}
            onGenerateReport={handleGenerateReport}
            onApplyFindings={handleApplyFindings}
            readinessScore={readinessScore}
            onApplyQuickFix={handleApplyQuickFix}
            onApplyAllFixes={handleApplyAllFixes}
            onNotify={addToast}
          />
        </section>
      )}
      </main>

      <input
        ref={importInputRef}
        type="file"
        accept=".json,application/json"
        onChange={handleImportProjectFile}
        className="hidden"
      />

      {/* Guided Tour */}
      <GuidedTour
        currentStepIndex={tourStepIndex}
        isOpen={isGuidedTourOpen}
        onClose={handleTourClose}
        onNext={handleTourNext}
        onPrev={handleTourPrev}
        onJumpToStep={handleTourJump}
        steps={tourSteps}
      />

      {/* Shortcuts Modal */}
      <ShortcutsModal
        isOpen={isShortcutsOpen}
        onClose={() => setIsShortcutsOpen(false)}
      />

      {/* Snapshot Diff Modal */}
      <SnapshotComparisonModal
        currentCards={project.cards}
        initialCards={baselineCards}
        isOpen={isSnapshotModalOpen}
        onClose={() => setIsSnapshotModalOpen(false)}
        onNotify={addToast}
      />

      {/* Export & Message Tools Modal */}
      {isExportOpen && (
        <Suspense
          fallback={
            <div role="status" className="fixed bottom-8 right-8 z-50 rounded-xl bg-white p-4 shadow-lg text-sm">
              Opening share preview…
            </div>
          }
        >
          <ExportModal
            project={project}
            selectedCards={project.cards.filter((c) => selectedCardIds.has(c.id))}
            isOpen={isExportOpen}
            onClose={() => setIsExportOpen(false)}
            onNotify={addToast}
            initialMode={exportInitialMode}
            initialTool={exportInitialTool}
          />
        </Suspense>
      )}

      {/* Toast Feedback */}
      <Toast toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
