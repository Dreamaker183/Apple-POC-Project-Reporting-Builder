/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { SnippetCard } from '../../types/report';
import { compareReportSnapshots, DiffReport } from '../../lib/analysis/snapshotDiff';
import { 
  X, 
  GitCompare, 
  CheckCircle2, 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown, 
  Copy, 
  Check, 
  ArrowRight
} from 'lucide-react';
import { copyToClipboard } from '../../lib/export/clipboard';
import { useDialogFocus } from '../common/useDialogFocus';
import { useLanguage } from '../../lib/i18n/LanguageContext';

interface Props {
  currentCards: SnippetCard[];
  initialCards: SnippetCard[];
  isOpen: boolean;
  onClose: () => void;
  onNotify: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export const SnapshotComparisonModal: React.FC<Props> = ({
  currentCards,
  initialCards,
  isOpen,
  onClose,
  onNotify,
}) => {
  const { t } = useLanguage();
  useDialogFocus(isOpen, onClose);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const baselineCards = initialCards;
  const diff: DiffReport = compareReportSnapshots(baselineCards, currentCards);
  // Preserve DiffReport's boolean shape while presenting neutral changes without judgement.
  const neutralMetrics = new Set(currentCards.flatMap(card => {
    if (card.type !== 'kpi_metric') return [];
    const baseline = baselineCards.find(base => base.type === 'kpi_metric' && base.label.toLowerCase() === card.label.toLowerCase());
    const direction = card.direction ?? (baseline?.type === 'kpi_metric' ? baseline.direction : undefined);
    return direction === 'neutral' ? [card.label] : [];
  }));

  const formatDiffSummaryText = (): string => {
    const lines: string[] = [];
    lines.push(t('diff.logHeader'));
    lines.push(t('diff.logBaseline'));
    lines.push(t('diff.logTarget'));
    lines.push(`──────────────────────────────────────────`);

    if (diff.metricChanges.length > 0) {
      lines.push(`\n${t('diff.logMetricSection')}`);
      diff.metricChanges.forEach(m => {
        const trend = neutralMetrics.has(m.label) ? 'No status judgement' : m.improved ? t('diff.improved') : t('diff.attentionNeeded');
        lines.push(`• ${m.label}: ${m.oldValue}${m.unit} → ${m.newValue}${m.unit} (${m.diff > 0 ? `+${m.diff}` : m.diff}${m.unit}, ${trend})`);
      });
    }

    if (diff.newAccomplishments.length > 0) {
      lines.push(`\n${t('diff.logAccomplishmentsSection')}`);
      diff.newAccomplishments.forEach(a => lines.push(`• ${a}`));
    }

    if (diff.resolvedRisks.length > 0) {
      lines.push('\nREMOVED FROM REPORT — VERIFY RESOLUTION:');
      diff.resolvedRisks.forEach(r => lines.push(`• [Removed from report; verify resolution] ${r}`));
    }

    if (diff.newBlockers.length > 0) {
      lines.push(`\n${t('diff.logBlockersSection')}`);
      diff.newBlockers.forEach(b => lines.push(`! ${t('diff.logBlockerTag')} ${b}`));
    }

    return lines.join('\n');
  };

  const handleCopyDiff = async () => {
    const text = formatDiffSummaryText();
    const res = await copyToClipboard(text);
    if (res.success) {
      setCopied(true);
      onNotify(t('diff.copiedToast'), 'success');
      setTimeout(() => setCopied(false), 2000);
    } else {
      onNotify(t('diff.copyErrorToast'), 'error');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/40 backdrop-blur-xs no-print">
      <div 
        className="bg-white rounded-2xl border border-black/10 shadow-2xl max-w-3xl w-full flex flex-col max-h-[calc(100dvh-1.5rem)] sm:max-h-[88vh] overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="diff-dialog-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-black/[0.08]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#0071E3]/10 text-[#0071E3] flex items-center justify-center shrink-0">
              <GitCompare className="w-4 h-4" />
            </div>
            <div>
              <h2 id="diff-dialog-title" className="text-sm sm:text-base font-bold text-[#1F1F1F]">
                {t('diff.title')}
              </h2>
              <p className="text-xs text-[#727272]">
                {t('diff.subtitle')}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-[#727272] hover:text-[#1F1F1F] rounded-lg hover:bg-neutral-100 transition-colors"
            aria-label={t('diff.closeAria')}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Baseline Selector */}
        <div className="px-4 sm:px-5 py-2.5 sm:py-3 bg-[#FAFAFA] border-b border-black/[0.06] flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-[#727272]">{t('diff.compareAgainst')}</span>
            <span className="text-xs text-[#6E6E73]">{t('diff.flow')}</span>
          </div>

          <button
            type="button"
            onClick={handleCopyDiff}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-black/10 rounded-lg text-xs font-semibold text-[#1F1F1F] hover:bg-neutral-50 transition-colors shadow-xs"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-[#0071E3]" />}
            <span>{copied ? t('diff.copied') : t('diff.copy')}</span>
          </button>
        </div>

        {/* Diff Content Body */}
        <div className="flex-1 overflow-y-auto p-3.5 sm:p-5 space-y-4">
          {/* Changed Metrics */}
          {diff.metricChanges.length > 0 && (
            <div className="p-3.5 sm:p-4 bg-white rounded-xl border border-black/[0.08] shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#1F1F1F] uppercase tracking-wider">
                  {t('diff.metricEvolutions')}
                </span>
                <span className="text-[11px] text-[#727272]">
                  {diff.metricChanges.length === 1
                    ? t('diff.metricsShifted', { count: diff.metricChanges.length })
                    : t('diff.metricsShiftedPlural', { count: diff.metricChanges.length })}
                </span>
              </div>

              <div className="divide-y divide-black/[0.04]">
                {diff.metricChanges.map((m, idx) => (
                  <div key={idx} className="py-2.5 flex flex-wrap sm:flex-nowrap items-start sm:items-center justify-between gap-2 sm:gap-4 first:pt-0 last:pb-0">
                    <div>
                      <div className="text-xs font-semibold text-[#1F1F1F]">{m.label}</div>
                      <div className="text-[11px] text-[#727272]">
                        {t('diff.baselineVal', { oldValue: m.oldValue, unit: m.unit, newValue: m.newValue })}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold ${
                        neutralMetrics.has(m.label)
                          ? 'bg-neutral-50 text-neutral-700 border border-neutral-200'
                          : m.improved
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}>
                        {neutralMetrics.has(m.label) ? <ArrowRight className="w-3.5 h-3.5" /> : m.improved ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                        {neutralMetrics.has(m.label) && <span className="sr-only">No status judgement</span>}
                        <span>{m.diff > 0 ? `+${m.diff}` : m.diff}{m.unit}</span>
                        {m.percentChange !== undefined && (
                          <span className="text-[10px] opacity-80">
                            ({m.percentChange > 0 ? `+${m.percentChange}` : m.percentChange}%)
                          </span>
                        )}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* New Accomplishments */}
          {diff.newAccomplishments.length > 0 && (
            <div className="p-4 bg-emerald-50/40 rounded-xl border border-emerald-200/80 shadow-xs space-y-2.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800 uppercase tracking-wider">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{t('diff.accomplishments')}</span>
              </div>
              <ul className="space-y-1.5">
                {diff.newAccomplishments.map((acc, idx) => (
                  <li key={idx} className="text-xs text-[#1F1F1F] pl-5 relative">
                    <span className="absolute left-1 top-1.5 w-1.5 h-1.5 rounded-full bg-emerald-600" />
                    {acc}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Removed Blockers / Risks */}
          {diff.resolvedRisks.length > 0 && (
            <div className="p-4 bg-blue-50/40 rounded-xl border border-blue-200/80 shadow-xs space-y-2.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#0071E3] uppercase tracking-wider">
                <AlertTriangle className="w-4 h-4 text-[#0071E3] shrink-0" />
                <span>Removed from report</span>
              </div>
              <p className="text-xs text-[#727272]">Verify resolution: absence from this report does not confirm the risk is resolved.</p>
              <ul className="space-y-1.5">
                {diff.resolvedRisks.map((risk, idx) => (
                  <li key={idx} className="text-xs text-[#1F1F1F] flex items-center gap-2">
                    <span>{risk}</span>
                    <span className="text-[10px] font-semibold text-[#727272] bg-neutral-50 px-1.5 py-0.2 rounded border border-neutral-200">
                      Verify resolution
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* New Blockers */}
          {diff.newBlockers.length > 0 && (
            <div className="p-4 bg-rose-50/50 rounded-xl border border-rose-200 shadow-xs space-y-2.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-rose-800 uppercase tracking-wider">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{t('diff.blockers')}</span>
              </div>
              <ul className="space-y-1.5">
                {diff.newBlockers.map((blocker, idx) => (
                  <li key={idx} className="text-xs text-rose-900 font-medium pl-5 relative">
                    <span className="absolute left-1 top-1.5 w-1.5 h-1.5 rounded-full bg-rose-600" />
                    {blocker}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Outstanding Actions */}
          {diff.outstandingActions.length > 0 && (
            <div className="p-4 bg-white rounded-xl border border-black/[0.08] shadow-xs space-y-2">
              <div className="text-xs font-bold text-[#1F1F1F] uppercase tracking-wider">
                {t('diff.actions', { count: diff.outstandingActions.length })}
              </div>
              <ul className="space-y-1">
                {diff.outstandingActions.map((action, idx) => (
                  <li key={idx} className="text-xs text-[#333333] flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-black/40" />
                    <span>{action}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
