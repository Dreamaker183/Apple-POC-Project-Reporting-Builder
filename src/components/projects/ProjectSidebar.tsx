/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  Plus,
  FolderPlus,
  Folder,
  FolderOpen,
  ChevronDown,
  MoreHorizontal,
  Check,
  X,
  CopyPlus,
  Trash2,
  Pencil,
  FolderInput,
  Upload,
  Search,
} from 'lucide-react';
import { ProjectLibrary, ReportProject } from '../../types/report';
import { DictKey } from '../../lib/i18n/dictionaries';
import { useLanguage } from '../../lib/i18n/LanguageContext';

type TFn = (key: DictKey, vars?: Record<string, string | number>) => string;

interface Props {
  library: ProjectLibrary;
  activeProjectId: string;
  scores: Record<string, number>;
  onSelectProject: (id: string) => void;
  onNewProject: (folderId: string) => void;
  onNewFolder: (name: string) => void;
  onRenameProject: (id: string, title: string) => void;
  onDuplicateProject: (id: string) => void;
  onMoveProject: (id: string, folderId: string) => void;
  onDeleteProject: (id: string) => void;
  onRenameFolder: (id: string, name: string) => void;
  onDeleteFolder: (id: string) => void;
  onImportProject?: () => void;
  children?: React.ReactNode;
}

function scoreColor(score: number): string {
  if (score >= 80) return 'bg-emerald-500';
  if (score >= 50) return 'bg-amber-500';
  return 'bg-rose-500';
}

function timeAgo(iso: string, t: TFn, dateLocale: string | undefined): string {
  const diff = Date.now() - new Date(iso).getTime();
  if (isNaN(diff) || diff < 0) return '';
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return t('sidebar.timeJustNow');
  if (mins < 60) return t('sidebar.timeMinutesAgo', { n: mins });
  const hours = Math.floor(mins / 60);
  if (hours < 24) return t('sidebar.timeHoursAgo', { n: hours });
  const days = Math.floor(hours / 24);
  if (days < 30) return t('sidebar.timeDaysAgo', { n: days });
  return new Date(iso).toLocaleDateString(dateLocale, { month: 'short', day: 'numeric' });
}

export const ProjectSidebar: React.FC<Props> = ({
  library,
  activeProjectId,
  scores,
  onSelectProject,
  onNewProject,
  onNewFolder,
  onRenameProject,
  onDuplicateProject,
  onMoveProject,
  onDeleteProject,
  onRenameFolder,
  onDeleteFolder,
  onImportProject,
  children,
}) => {
  const { t, dateLocale } = useLanguage();
  const [search, setSearch] = useState('');
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [editingProject, setEditingProject] = useState<{ id: string; value: string } | null>(null);
  const [editingFolder, setEditingFolder] = useState<{ id: string; value: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [newFolderMode, setNewFolderMode] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuFor(null);
        setConfirmDelete(null);
      }
    };
    const escape = (e: KeyboardEvent) => { if (e.key === 'Escape') { setMenuFor(null); setConfirmDelete(null); } };
    if (menuFor) document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', escape); };
  }, [menuFor]);

  const toggleFolder = (id: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const q = search.trim().toLowerCase();
  const matchProject = (p: ReportProject) =>
    q === '' ||
    p.title.toLowerCase().includes(q) ||
    p.reportingPeriod.toLowerCase().includes(q);

  const commitProjectRename = () => {
    if (editingProject && editingProject.value.trim()) {
      onRenameProject(editingProject.id, editingProject.value.trim());
    }
    setEditingProject(null);
  };

  const commitFolderRename = () => {
    if (editingFolder && editingFolder.value.trim()) {
      onRenameFolder(editingFolder.id, editingFolder.value.trim());
    }
    setEditingFolder(null);
  };

  const submitNewFolder = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!newFolderName.trim()) {
      setNewFolderMode(false);
      return;
    }
    onNewFolder(newFolderName.trim());
    setNewFolderName('');
    setNewFolderMode(false);
  };

  return (
    <nav aria-label={t('sidebar.library')} className="flex flex-col h-full bg-[#ECECEE]/70 border-r border-black/[0.06]">
      {/* Header */}
      <div className="p-3.5 pb-2.5 space-y-2.5">
        <div className="flex items-center justify-between">
          <h2 className="text-[15px] font-semibold text-[#1D1D1F] tracking-tight">{t('sidebar.library')}</h2>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onNewProject(library.folders[0]?.id ?? '')}
              className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-white bg-[#0071E3] hover:bg-[#0077ED] rounded-lg transition-colors"
              title={t('sidebar.newProjectTitle')}
            >
              <Plus className="w-3 h-3" />
              <span>{t('sidebar.newProject')}</span>
            </button>
            <button
              type="button"
              onClick={() => setNewFolderMode((v) => !v)}
              className="p-1.5 text-[#86868B] hover:text-[#1D1D1F] hover:bg-black/[0.05] rounded-lg transition-colors"
              title={t('sidebar.newFolder')}
              aria-label={t('sidebar.newFolder')}
            >
              <FolderPlus className="w-3.5 h-3.5" />
            </button>
            {onImportProject && (
              <button
                type="button"
                onClick={onImportProject}
                className="p-1.5 text-[#86868B] hover:text-[#1D1D1F] hover:bg-black/[0.05] rounded-lg transition-colors"
                title={t('sidebar.importTitle')}
                aria-label={t('sidebar.importAria')}
              >
                <Upload className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {newFolderMode && (
          <form onSubmit={submitNewFolder} className="flex items-center gap-1.5">
            <input
              autoFocus
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') setNewFolderMode(false);
              }}
              placeholder={t('sidebar.folderName')}
              className="flex-1 min-w-0 text-xs p-1.5 bg-white border border-black/15 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0071E3]"
            />
            <button
              type="submit"
              className="p-1.5 bg-[#1D1D1F] text-white rounded-lg hover:bg-black transition-colors"
              aria-label={t('sidebar.createFolder')}
            >
              <Check className="w-3.5 h-3.5" />
            </button>
          </form>
        )}

        <div className="relative">
          <Search className="w-3.5 h-3.5 text-[#86868B] absolute left-2.5 top-2 pointer-events-none" />
          <input
            aria-label={t('sidebar.searchAria')}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('sidebar.searchPlaceholder')}
            className="w-full text-xs pl-8 pr-2.5 py-1.5 bg-black/[0.04] hover:bg-black/[0.06] focus:bg-white rounded-lg border border-transparent focus:border-black/10 focus:outline-none transition-all placeholder:text-black/30"
          />
        </div>
      </div>

      {/* Folders + projects */}
      <div className="flex-1 overflow-y-auto px-2.5 pb-3 space-y-1 min-h-0">
        {library.folders.map((folder) => {
          const folderProjects = library.projects.filter(
            (p) => (p.folderId ?? library.folders[0]?.id) === folder.id && matchProject(p)
          );
          const isCollapsed = collapsed.has(folder.id);
          const isEditing = editingFolder?.id === folder.id;
          return (
            <div key={folder.id}>
              <div className="group flex items-center gap-1 px-1.5 py-1.5 rounded-lg hover:bg-black/[0.03]">
                <div className="flex items-center gap-1.5 flex-1 min-w-0 text-left">
                  <button type="button" onClick={() => toggleFolder(folder.id)} aria-label={t('sidebar.toggleFolder', { name: folder.name })} aria-expanded={!isCollapsed}>
                  <ChevronDown
                    className={`w-3 h-3 text-[#86868B] shrink-0 transition-transform ${isCollapsed ? '-rotate-90' : ''}`}
                  />
                  </button>
                  {isCollapsed ? (
                    <Folder className="w-3.5 h-3.5 text-[#86868B] shrink-0" />
                  ) : (
                    <FolderOpen className="w-3.5 h-3.5 text-[#0071E3] shrink-0" />
                  )}
                  {isEditing ? (
                    <input
                      autoFocus
                      type="text"
                      value={editingFolder.value}
                      onChange={(e) => setEditingFolder({ id: folder.id, value: e.target.value })}
                      onBlur={commitFolderRename}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') commitFolderRename();
                        if (e.key === 'Escape') setEditingFolder(null);
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="flex-1 min-w-0 text-xs font-medium p-0.5 bg-white border border-[#0071E3] rounded focus:outline-none"
                    />
                  ) : (
                    <span
                      className="text-xs font-medium text-[#1D1D1F] truncate flex-1"
                      onDoubleClick={() => setEditingFolder({ id: folder.id, value: folder.name })}
                      title={t('sidebar.renameHint')}
                    >
                      {folder.name}
                    </span>
                  )}
                </div>
                <span className="text-[10px] text-[#86868B] shrink-0">{folderProjects.length}</span>
                <button
                  type="button"
                  onClick={() => onNewProject(folder.id)}
                  className="p-1 text-[#86868B] hover:text-[#0071E3] rounded opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                  title={t('sidebar.newProjectIn', { name: folder.name })}
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (confirmDelete === `folder:${folder.id}`) {
                      onDeleteFolder(folder.id);
                      setConfirmDelete(null);
                    } else {
                      setConfirmDelete(`folder:${folder.id}`);
                      setTimeout(() => setConfirmDelete(null), 3000);
                    }
                  }}
                  className={`p-1 rounded transition-colors ${
                    confirmDelete === `folder:${folder.id}`
                      ? 'text-white bg-rose-600 text-[10px] font-medium px-1.5'
                      : 'text-[#86868B] hover:text-rose-600 opacity-0 group-hover:opacity-100 focus:opacity-100'
                  }`}
                  title={confirmDelete === `folder:${folder.id}` ? t('sidebar.confirmHint') : t('sidebar.deleteFolderHint', { name: folder.name })}
                >
                  {confirmDelete === `folder:${folder.id}` ? <span>{t('sidebar.confirmShort')}</span> : <Trash2 className="w-3 h-3" />}
                </button>
              </div>

              {!isCollapsed &&
                folderProjects.map((p) => {
                  const isActive = p.id === activeProjectId;
                  const isEditingRow = editingProject?.id === p.id;
                  return (
                    <div
                      key={p.id}
                      className={`group relative ml-4 flex items-center gap-1.5 pl-2 pr-1 py-1.5 rounded-xl transition-colors ${
                        isActive ? 'bg-white border border-black/[0.08] shadow-2xs' : 'hover:bg-black/[0.03] border border-transparent'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full shrink-0 ${scoreColor(scores[p.id] ?? 0)}`}
                        title={t('sidebar.readinessTitle', { score: scores[p.id] ?? 0 })}
                      />
                      <div className="flex-1 min-w-0 text-left">
                        {isEditingRow ? (
                          <input
                            autoFocus
                            type="text"
                            value={editingProject.value}
                            onChange={(e) => setEditingProject({ id: p.id, value: e.target.value })}
                            onBlur={commitProjectRename}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') commitProjectRename();
                              if (e.key === 'Escape') setEditingProject(null);
                            }}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full text-xs font-medium p-0.5 bg-white border border-[#0071E3] rounded focus:outline-none"
                          />
                        ) : (
                          <button type="button" onClick={() => onSelectProject(p.id)} aria-current={isActive ? 'page' : undefined} className="w-full min-w-0 text-left">
                            <div className={`text-xs truncate ${isActive ? 'font-semibold text-[#1D1D1F]' : 'font-medium text-[#1D1D1F]'}`}>
                              {p.title}
                            </div>
                            <div className="text-[10px] text-[#86868B] truncate">
                              {p.reportingPeriod || t('sidebar.noPeriod')} · {t('sidebar.cardsUnit', { count: p.cards.length })} · {timeAgo(p.lastSavedAt, t, dateLocale)}
                            </div>
                          </button>
                        )}
                      </div>
                      <div className="relative shrink-0" ref={menuFor === p.id ? menuRef : undefined}>
                        <button
                          type="button"
                          onClick={() => {
                            setMenuFor(menuFor === p.id ? null : p.id);
                            setConfirmDelete(null);
                          }}
                          className={`p-1 rounded transition-colors ${
                            menuFor === p.id
                              ? 'bg-black/[0.06] text-[#1D1D1F]'
                              : 'text-[#86868B] hover:text-[#1D1D1F] opacity-0 group-hover:opacity-100 focus:opacity-100'
                          }`}
                          aria-label={t('sidebar.actionsFor', { name: p.title })}
                          aria-expanded={menuFor === p.id}
                        >
                          <MoreHorizontal className="w-3.5 h-3.5" />
                        </button>
                        {menuFor === p.id && (
                          <div className="absolute right-0 top-7 z-30 w-44 bg-white/95 backdrop-blur-xl rounded-xl border border-black/[0.08] shadow-[0_8px_30px_rgba(0,0,0,0.14)] py-1 text-xs">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingProject({ id: p.id, value: p.title });
                                setMenuFor(null);
                              }}
                              className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-black/[0.04] text-left"
                            >
                              <Pencil className="w-3.5 h-3.5 text-[#86868B]" />
                              <span>{t('sidebar.rename')}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                onDuplicateProject(p.id);
                                setMenuFor(null);
                              }}
                              className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-black/[0.04] text-left"
                            >
                              <CopyPlus className="w-3.5 h-3.5 text-[#86868B]" />
                              <span>{t('sidebar.duplicate')}</span>
                            </button>
                            {library.folders.length > 1 && (
                              <div className="border-t border-black/[0.06] mt-1 pt-1 px-3 pb-1">
                                <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-[#86868B] py-1">
                                  <FolderInput className="w-3 h-3" />
                                  <span>{t('sidebar.moveTo')}</span>
                                </div>
                                {library.folders
                                  .filter((f) => f.id !== (p.folderId ?? library.folders[0]?.id))
                                  .map((f) => (
                                    <button
                                      key={f.id}
                                      type="button"
                                      onClick={() => {
                                        onMoveProject(p.id, f.id);
                                        setMenuFor(null);
                                      }}
                                      className="w-full text-left px-1.5 py-1 hover:bg-black/[0.04] rounded-md truncate"
                                    >
                                      {f.name}
                                    </button>
                                  ))}
                              </div>
                            )}
                            <div className="border-t border-black/[0.06] mt-1 pt-1">
                              {confirmDelete === p.id ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    onDeleteProject(p.id);
                                    setMenuFor(null);
                                    setConfirmDelete(null);
                                  }}
                                  className="w-full flex items-center gap-2 px-3 py-1.5 text-white bg-rose-600 text-left"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  <span>{t('sidebar.confirmDelete')}</span>
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setConfirmDelete(p.id);
                                    setTimeout(() => setConfirmDelete(null), 3000);
                                  }}
                                  className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-rose-50 text-rose-600 text-left"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  <span>{t('sidebar.delete')}</span>
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              {!isCollapsed && folderProjects.length === 0 && (
                <button
                  type="button"
                  onClick={() => onNewProject(folder.id)}
                  className="ml-4 text-[11px] text-[#86868B] hover:text-[#0071E3] px-2 py-1 transition-colors"
                >
                  {t('sidebar.newProjectHere')}
                </button>
              )}
            </div>
          );
        })}
        {library.folders.length === 0 && (
          <p className="text-[11px] text-[#86868B] px-2 py-4 text-center">
            {t('sidebar.noFolders')}
          </p>
        )}
      </div>

      {/* Time flow for the active project */}
      {children}
    </nav>
  );
};
