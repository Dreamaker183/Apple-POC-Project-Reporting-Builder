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
  ArrowRight,
  Sparkles,
  Layers
} from 'lucide-react';
import { copyToClipboard } from '../../lib/export/clipboard';
import { useDialogFocus } from '../common/useDialogFocus';

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
  useDialogFocus(isOpen, onClose);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const baselineCards = initialCards;
  const diff: DiffReport = compareReportSnapshots(baselineCards, currentCards);

  const formatDiffSummaryText = (): string => {
    const lines: string[] = [];
    lines.push(`WHAT'S CHANGED: REPORT SNAPSHOT COMPARISON`);
    lines.push(`Baseline: Selected saved snapshot`);
    lines.push(`Target: Current working report`);
    lines.push(`──────────────────────────────────────────`);

    if (diff.metricChanges.length > 0) {
      lines.push(`\nMETRIC EVOLUTIONS:`);
      diff.metricChanges.forEach(m => {
        lines.push(`• ${m.label}: ${m.oldValue}${m.unit} → ${m.newValue}${m.unit} (${m.diff > 0 ? `+${m.diff}` : m.diff}${m.unit}, ${m.improved ? 'improved' : 'attention needed'})`);
      });
    }

    if (diff.newAccomplishments.length > 0) {
      lines.push(`\nNEW ACCOMPLISHMENTS:`);
      diff.newAccomplishments.forEach(a => lines.push(`• ${a}`));
    }

    if (diff.resolvedRisks.length > 0) {
      lines.push(`\nRESOLVED BLOCKERS/RISKS:`);
      diff.resolvedRisks.forEach(r => lines.push(`✓ [Resolved] ${r}`));
    }

    if (diff.newBlockers.length > 0) {
      lines.push(`\nNEW BLOCKERS:`);
      diff.newBlockers.forEach(b => lines.push(`! [New Blocker] ${b}`));
    }

    return lines.join('\n');
  };

  const handleCopyDiff = async () => {
    const text = formatDiffSummaryText();
    const res = await copyToClipboard(text);
    if (res.success) {
      setCopied(true);
      onNotify('Copied snapshot change summary!', 'success');
      setTimeout(() => setCopied(false), 2000);
    } else {
      onNotify('Failed to copy summary', 'error');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs no-print">
      <div 
        className="bg-white rounded-2xl border border-black/10 shadow-2xl max-w-3xl w-full flex flex-col max-h-[88vh] overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="diff-dialog-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-black/[0.08]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#0071E3]/10 text-[#0071E3] flex items-center justify-center">
              <GitCompare className="w-4 h-4" />
            </div>
            <div>
              <h2 id="diff-dialog-title" className="text-base font-bold text-[#1F1F1F]">
                What's Changed? (Snapshot Diff)
              </h2>
              <p className="text-xs text-[#727272]">
                Deterministic delta between two explicitly supplied report snapshots.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-[#727272] hover:text-[#1F1F1F] rounded-lg hover:bg-neutral-100 transition-colors"
            aria-label="Close diff dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Baseline Selector */}
        <div className="px-5 py-3 bg-[#FAFAFA] border-b border-black/[0.06] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-[#727272]">Compare Against:</span>
            <span className="text-xs text-[#6E6E73]">Saved snapshot → Working draft</span>
          </div>

          <button
            type="button"
            onClick={handleCopyDiff}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-black/10 rounded-lg text-xs font-semibold text-[#1F1F1F] hover:bg-neutral-50 transition-colors shadow-xs"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-[#0071E3]" />}
            <span>{copied ? 'Copied' : 'Copy Change Log'}</span>
          </button>
        </div>

        {/* Diff Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Changed Metrics */}
          {diff.metricChanges.length > 0 && (
            <div className="p-4 bg-white rounded-xl border border-black/[0.08] shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#1F1F1F] uppercase tracking-wider">
                  Quantitative Metric Evolutions
                </span>
                <span className="text-[11px] text-[#727272]">
                  {diff.metricChanges.length} metric{diff.metricChanges.length !== 1 ? 's' : ''} shifted
                </span>
              </div>

              <div className="divide-y divide-black/[0.04]">
                {diff.metricChanges.map((m, idx) => (
                  <div key={idx} className="py-2.5 flex items-center justify-between gap-4 first:pt-0 last:pb-0">
                    <div>
                      <div className="text-xs font-semibold text-[#1F1F1F]">{m.label}</div>
                      <div className="text-[11px] text-[#727272]">
                        Baseline: {m.oldValue}{m.unit} → Current: <strong>{m.newValue}{m.unit}</strong>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold ${
                        m.improved 
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}>
                        {m.improved ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
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
                <span>New Accomplishments Delivered</span>
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

          {/* Resolved Blockers / Risks */}
          {diff.resolvedRisks.length > 0 && (
            <div className="p-4 bg-blue-50/40 rounded-xl border border-blue-200/80 shadow-xs space-y-2.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#0071E3] uppercase tracking-wider">
                <Check className="w-4 h-4 text-[#0071E3] shrink-0" />
                <span>Resolved Blockers & Risks (Cleared since baseline)</span>
              </div>
              <ul className="space-y-1.5">
                {diff.resolvedRisks.map((risk, idx) => (
                  <li key={idx} className="text-xs text-[#1F1F1F] flex items-center gap-2">
                    <span className="line-through text-[#727272]">{risk}</span>
                    <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                      RESOLVED
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
                <span>Newly Identified Critical Blockers</span>
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
                Outstanding Action Commitments ({diff.outstandingActions.length})
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
