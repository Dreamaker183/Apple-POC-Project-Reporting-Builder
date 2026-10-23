import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { PanelLeft, Undo2, Redo2, Share2, MoreHorizontal, Plus, Upload, Printer, GitCompare, Keyboard, Compass, Sparkles, Check, LoaderCircle, AlertCircle, Presentation } from 'lucide-react';
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
  const iconButton = 'w-9 h-9 shrink-0 flex items-center justify-center rounded-lg text-[#6E6E73] hover:bg-black/[0.05] hover:text-[#1D1D1F] disabled:opacity-30 transition-colors';
  return (
    <header className="shrink-0 bg-white/80 backdrop-blur-xl border-b border-black/[0.06] pt-[env(safe-area-inset-top,0px)] px-3 sm:px-6 flex items-center justify-between gap-2 sm:gap-3 z-40 no-print min-h-[3.5rem] sm:min-h-[4rem]">
      <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
        <button
          type="button"
          className={`${iconButton} ${props.sidebarOpen ? 'bg-black/[0.06] text-[#1D1D1F]' : ''}`}
          onClick={props.onToggleSidebar}
          aria-label={props.sidebarOpen ? t('header.hideSidebar') : t('header.showSidebar')}
          aria-pressed={props.sidebarOpen}
          title={t('header.toggleSidebar')}
        ><PanelLeft className="w-[18px] h-[18px]" /></button>
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-medium text-[#6E6E73] tracking-wide truncate">{props.folderName ?? t('header.projectsFallback')}</div>
          <h1 className="text-[13px] sm:text-[14px] font-semibold tracking-tight truncate">{props.projectTitle ?? t('header.appName')}</h1>
        </div>
        <span className="hidden md:flex items-center gap-1.5 text-[11px] text-[#6E6E73] ml-2 shrink-0" role="status" aria-live="polite">
          {props.saveError ? <AlertCircle className="w-3 h-3 text-rose-600" /> : props.isDirty ? <LoaderCircle className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
          {props.saveError ? t('header.saveError') : props.isDirty ? t('header.saving') : t('header.saved')}
        </span>
      </div>
      <div className="flex items-center gap-1 sm:gap-2 shrink-0">
        <button type="button" onClick={props.onLoadSample} className="hidden sm:flex text-xs text-[#0071E3] px-3 py-2 rounded-full hover:bg-blue-50" title="Open a new fictional demo project; keep existing projects">Open demo</button>
        <a href="/poc" className={iconButton} aria-label="View POC presentation" title="View POC presentation"><Presentation className="w-4 h-4" /></a>
        <button type="button" className={iconButton} disabled={!props.canUndo} onClick={props.onUndo} aria-label={t('header.undo')} title={t('header.undoTitle')}><Undo2 className="w-4 h-4" /></button>
        <button type="button" className={`${iconButton} hidden sm:flex`} disabled={!props.canRedo} onClick={props.onRedo} aria-label={t('header.redo')} title={t('header.redoTitle')}><Redo2 className="w-4 h-4" /></button>
        <div ref={menuRef} className="relative">
          <button type="button" className={iconButton} onClick={() => setOpen(!open)} aria-label={t('header.moreActions')} aria-expanded={open}><MoreHorizontal className="w-[18px] h-[18px]" /></button>
          <AnimatePresence>
            {open && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -4 }}
                transition={{ duration: 0.14, ease: [0.32, 0.72, 0, 1] }}
                className="absolute right-0 top-11 z-50 w-56 max-h-[calc(100dvh-5rem)] overflow-y-auto rounded-xl border border-black/[0.08] bg-white/95 backdrop-blur-xl shadow-[var(--shadow-menu)] p-1.5 origin-top-right"
              >
                {actions.map(({ label, Icon, run }) => (
                  <button
                    key={label}
                    type="button"
                    className="w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] text-[#1D1D1F] hover:bg-black/[0.04] transition-colors"
                    onClick={() => { setOpen(false); run(); }}
                  >
                    <Icon className="w-4 h-4 text-[#6E6E73]" />
                    {label}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <LanguageSwitcher className={iconButton} />
        <button
          type="button"
          onClick={props.onOpenExport}
          className="flex items-center gap-1.5 sm:gap-2 bg-[#0071E3] hover:bg-[#0077ED] active:scale-[0.98] text-white rounded-full px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-[13px] font-medium shadow-sm transition-all shadow-[0_2px_8px_rgba(0,113,227,0.25)] shrink-0"
        >
          <Share2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          <span className="hidden xs:inline sm:inline">{t('header.share')}</span>
        </button>
      </div>
    </header>
  );
}
