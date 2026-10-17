/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Camera, GitCompare, History, RotateCcw, ChevronDown, X } from 'lucide-react';
import { PeriodSnapshot } from '../../types/report';
import { useLanguage } from '../../lib/i18n/LanguageContext';

interface Props {
  snapshots: PeriodSnapshot[];
  onSaveSnapshot: (label?: string) => void;
  onRestoreSnapshot: (id: string) => void;
  onCompareSnapshot: (id: string) => void;
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
}

export const TimeFlow: React.FC<Props> = ({
  snapshots,
  onSaveSnapshot,
  onRestoreSnapshot,
  onCompareSnapshot,
}) => {
  const { t } = useLanguage();
  const [expanded, setExpanded] = useState(true);
  const [naming, setNaming] = useState(false);
  const [label, setLabel] = useState('');
  const [previewId, setPreviewId] = useState<string | null>(null);
  return (
    <div className="border-t border-black/[0.06] bg-white flex flex-col min-h-0">
      <div className="flex items-center justify-between px-3.5 pt-3 pb-2">
        <button type="button" onClick={() => setExpanded(!expanded)} aria-expanded={expanded} className="flex items-center gap-1.5 text-[11px] font-semibold tracking-wide uppercase text-[#6E6E73]">
          <ChevronDown className={`w-3 h-3 transition-transform ${expanded ? '' : '-rotate-90'}`} />
          <History className="w-3.5 h-3.5" />
          <span>{t('timeflow.history', { count: snapshots.length })}</span>
        </button>
        <button
          type="button"
          onClick={() => { setNaming(true); setExpanded(true); }}
          className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-[#0071E3] hover:bg-[#0071E3]/10 rounded-lg transition-colors"
          title={t('timeflow.saveTitle')}
        >
          <Camera className="w-3 h-3" />
          <span>{t('timeflow.save')}</span>
        </button>
      </div>

      {expanded && <div className="overflow-y-auto px-3.5 pb-3 max-h-72">
        {naming && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              onSaveSnapshot(label.trim() || undefined);
              setLabel('');
              setNaming(false);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setNaming(false);
                setLabel('');
              }
            }}
            className="mb-3 p-2.5 bg-[#F5F5F7] border border-black/[0.08] rounded-xl shadow-2xs space-y-2 animate-in fade-in duration-150"
          >
            <div className="flex items-center justify-between px-0.5">
              <span className="flex items-center gap-1.5 text-[11px] font-medium text-[#1D1D1F]">
                <Camera className="w-3.5 h-3.5 text-[#0071E3]" />
                <span>{t('timeflow.nameAria')}</span>
              </span>
              <button
                type="button"
                aria-label={t('timeflow.cancelAria')}
                onClick={() => {
                  setNaming(false);
                  setLabel('');
                }}
                className="p-1 rounded-md text-[#86868B] hover:text-[#1D1D1F] hover:bg-black/[0.05] active:bg-black/[0.08] transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="flex items-center gap-1.5">
              <input
                aria-label={t('timeflow.nameAria')}
                autoFocus
                type="text"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder={t('timeflow.namePlaceholder')}
                className="min-w-0 flex-1 bg-white border border-black/15 rounded-lg px-2.5 py-1.5 text-xs text-[#1D1D1F] placeholder:text-[#86868B] focus:outline-none focus:ring-2 focus:ring-[#0071E3]/20 focus:border-[#0071E3] transition-all shadow-2xs"
              />
              <button
                type="submit"
                className="shrink-0 px-3 py-1.5 rounded-lg bg-[#0071E3] hover:bg-[#0077ED] active:scale-[0.98] text-white text-xs font-medium shadow-2xs transition-all cursor-pointer"
              >
                {t('timeflow.save')}
              </button>
            </div>
          </form>
        )}
        <div className="text-[11px] text-[#6E6E73] mb-3 flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-[#0071E3]" />{t('timeflow.workingDraft')}</div>
        {snapshots.length === 0 ? (
          <p className="text-[11px] text-[#86868B] leading-relaxed px-1 pb-1">
            {t('timeflow.empty')}
          </p>
        ) : (
          <ol className="relative ml-1.5 border-l border-black/10 space-y-3 py-1">
            {snapshots.map((snap, idx) => (
              <li key={snap.id} className="relative pl-4">
                <span
                  className={`absolute -left-[5px] top-1 w-2.5 h-2.5 rounded-full border-2 border-white shadow-xs ${
                    idx === 0 ? 'bg-[#0071E3]' : snap.origin === 'manual' ? 'bg-emerald-500' : 'bg-black/25'
                  }`}
                />
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-medium text-[#1D1D1F] truncate flex-1" title={snap.label}>
                    {snap.label}
                  </span>
                  <span
                    className={`text-[9px] font-semibold uppercase tracking-wide px-1.5 py-px rounded-full ${
                      snap.origin === 'manual'
                        ? 'bg-emerald-500/10 text-emerald-700'
                        : 'bg-black/[0.05] text-[#86868B]'
                    }`}
                  >
                    {snap.origin === 'manual' ? t('timeflow.saved') : t('timeflow.auto')}
                  </span>
                </div>
                <div className="text-[10px] text-[#86868B] mt-0.5">
                  {formatDate(snap.createdAt)} · {snap.cards.length === 1 ? t('timeflow.cardCount', { count: 1 }) : t('timeflow.cardCountPlural', { count: snap.cards.length })}
                </div>
                <div className="flex items-center gap-1 mt-1">
                  <button
                    type="button"
                    onClick={() => setPreviewId(previewId === snap.id ? null : snap.id)}
                    className="flex items-center gap-1 px-1.5 py-0.5 text-[11px] font-medium text-[#1D1D1F] hover:bg-black/[0.05] rounded-md transition-colors"
                    title={t('timeflow.reviewTitle')}
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>{t('timeflow.review')}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onCompareSnapshot(snap.id)}
                    className="flex items-center gap-1 px-1.5 py-0.5 text-[11px] font-medium text-[#0071E3] hover:bg-[#0071E3]/10 rounded-md transition-colors"
                    title={t('timeflow.compareTitle')}
                  >
                    <GitCompare className="w-3 h-3" />
                    <span>{t('timeflow.compare')}</span>
                  </button>
                </div>
                {previewId === snap.id && <div className="mt-2 rounded-lg bg-[#F5F5F7] p-2 text-[11px] space-y-2"><ul className="space-y-1 text-[#6E6E73]">{snap.cards.slice(0, 4).map((card) => <li key={card.id} className="truncate">{card.title}</li>)}</ul><button type="button" onClick={() => { onRestoreSnapshot(snap.id); setPreviewId(null); }} className="text-[#0071E3] font-medium">{t('timeflow.restore')}</button></div>}
              </li>
            ))}
          </ol>
        )}
      </div>}
    </div>
  );
};
