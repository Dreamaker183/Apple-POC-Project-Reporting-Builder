import React, { useEffect, useRef, useState } from 'react';
import { PanelLeft, Undo2, Redo2, Share2, MoreHorizontal, Plus, Upload, Printer, GitCompare, Keyboard, Compass, Sparkles, Check, LoaderCircle, AlertCircle } from 'lucide-react';
import { useLanguage } from '../../lib/i18n/LanguageContext';
import { LanguageSwitcher } from '../common/LanguageSwitcher';

interface Props {
  isDirty: boolean;
  saveError?: boolean;
  projectTitle?: string;
  folderName?: string;
  lastSavedAt: string;
  canUndo: boolean;
  canRedo?: boolean;
  sidebarOpen?: boolean;
  onUndo: () => void;
  onRedo?: () => void;
  onToggleSidebar?: () => void;
  onLoadSample: () => void;
  onOpenExport: () => void;
  onOpenMessageTools: () => void;
  onPrint: () => void;
  onReset: () => void;
  onImportProject?: () => void;
  onOpenGuidedTour: () => void;
  onOpenSnapshotDiff: () => void;
  onOpenShortcuts: () => void;
}

export function Header(props: Props) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const dismiss = (e: PointerEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const escape = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('pointerdown', dismiss);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('pointerdown', dismiss);
      document.removeEventListener('keydown', escape);
    };
  }, [open]);
  const actions = [
    { label: t('header.newProject'), Icon: Plus, run: props.onReset },
    ...(props.onImportProject ? [{ label: t('header.importProject'), Icon: Upload, run: props.onImportProject }] : []),
    { label: t('header.compareSnapshots'), Icon: GitCompare, run: props.onOpenSnapshotDiff },
    { label: t('header.printPdf'), Icon: Printer, run: props.onPrint },
    { label: t('header.shortcuts'), Icon: Keyboard, run: props.onOpenShortcuts },
    { label: t('header.tour'), Icon: Compass, run: props.onOpenGuidedTour },
    { label: t('header.loadSample'), Icon: Sparkles, run: props.onLoadSample },
  ];
  const iconButton = 'w-9 h-9 flex items-center justify-center rounded-lg text-[#6E6E73] hover:bg-black/[0.05] hover:text-[#1D1D1F] disabled:opacity-30 transition-colors';
  return (
    <header className="h-16 shrink-0 bg-white/80 backdrop-blur-xl border-b border-black/[0.06] px-3 sm:px-6 flex items-center justify-between gap-3 z-40 no-print">
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          className={`${iconButton} ${props.sidebarOpen ? 'bg-black/[0.06] text-[#1D1D1F]' : ''}`}
          onClick={props.onToggleSidebar}
          aria-label={props.sidebarOpen ? t('header.hideSidebar') : t('header.showSidebar')}
          aria-pressed={props.sidebarOpen}
          title={t('header.toggleSidebar')}
        ><PanelLeft className="w-[18px] h-[18px]" /></button>
        <div className="min-w-0">
          <div className="text-[11px] font-medium text-[#6E6E73] tracking-wide truncate">{props.folderName ?? t('header.projectsFallback')}</div>
          <h1 className="text-[14px] font-semibold tracking-tight truncate">{props.projectTitle ?? t('header.appName')}</h1>
        </div>
        <span className="hidden md:flex items-center gap-1.5 text-[11px] text-[#6E6E73] ml-4" role="status" aria-live="polite">
          {props.saveError ? <AlertCircle className="w-3 h-3 text-rose-600" /> : props.isDirty ? <LoaderCircle className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
          {props.saveError ? t('header.saveError') : props.isDirty ? t('header.saving') : t('header.saved')}
        </span>
      </div>
      <div className="flex items-center gap-1 sm:gap-2">
        <button type="button" className={iconButton} disabled={!props.canUndo} onClick={props.onUndo} aria-label={t('header.undo')} title={t('header.undoTitle')}><Undo2 className="w-4 h-4" /></button>
        <button type="button" className={`${iconButton} hidden sm:flex`} disabled={!props.canRedo} onClick={props.onRedo} aria-label={t('header.redo')} title={t('header.redoTitle')}><Redo2 className="w-4 h-4" /></button>
        <div ref={menuRef} className="relative">
          <button type="button" className={iconButton} onClick={() => setOpen(!open)} aria-label={t('header.moreActions')} aria-expanded={open}><MoreHorizontal className="w-[18px] h-[18px]" /></button>
          {open && <div className="absolute right-0 top-11 z-50 w-56 rounded-xl border border-black/[0.08] bg-white/95 backdrop-blur-xl shadow-[var(--shadow-menu)] p-1.5">
            {actions.map(({ label, Icon, run }) => <button key={label} type="button" className="w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] hover:bg-black/[0.04]" onClick={() => { setOpen(false); run(); }}><Icon className="w-4 h-4 text-[#6E6E73]" />{label}</button>)}
          </div>}
        </div>
        <LanguageSwitcher className={iconButton} />
        <button type="button" onClick={props.onOpenExport} className="flex items-center gap-2 bg-[#0071E3] hover:bg-[#0077ED] text-white rounded-full px-4 py-2 text-[13px] font-medium shadow-sm transition-colors"><Share2 className="w-4 h-4" /><span>{t('header.share')}</span></button>
      </div>
    </header>
  );
}
