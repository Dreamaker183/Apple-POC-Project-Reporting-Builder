/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { SnippetCard, ReadinessScore } from '../../types/report';
import { 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Link2, 
  Trash2, 
  CopyPlus, 
  Check, 
  ArrowRight,
  GitCompare,
  Sparkles,
  Zap
} from 'lucide-react';
import { DiffReport } from '../../lib/analysis/snapshotDiff';

interface Props {
  activeCard: SnippetCard | null;
  onUpdateCard: (updated: SnippetCard) => void;
  onDeleteCard: (id: string) => void;
  onDuplicateCard: (id: string) => void;
  readinessScore: ReadinessScore;
  onFixReadinessItem: (cardId?: string) => void;
  onApplyQuickFix?: (checkId: string) => void;
  onApplyAllFixes?: () => void;
  snapshotDiff: DiffReport | null;
  onHighlightSource: (text?: string) => void;
  onOpenSnapshotModal?: () => void;
}

export const CardInspector: React.FC<Props> = ({
  activeCard,
  onUpdateCard,
  onDeleteCard,
  onDuplicateCard,
  readinessScore,
  onFixReadinessItem,
  onApplyQuickFix,
  onApplyAllFixes,
  snapshotDiff,
  onHighlightSource,
  onOpenSnapshotModal,
}) => {
  const [activeTab, setActiveTab] = useState<'inspector' | 'readiness' | 'diff'>('inspector');

  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (readinessScore.score / 100) * circumference;

  return (
    <div className="flex flex-col h-full bg-[#FAFAFA] border-l border-black/[0.06]">
      {/* Tab Switcher */}
      <div className="p-3.5 border-b border-black/[0.06] bg-white">
        <div className="flex items-center p-0.5 bg-black/[0.04] rounded-lg text-xs font-medium">
          <button
            type="button"
            onClick={() => setActiveTab('inspector')}
            className={`flex-1 py-1 rounded-md transition-all ${
              activeTab === 'inspector'
                ? 'bg-white text-[#1D1D1F] shadow-xs font-semibold'
                : 'text-[#86868B] hover:text-[#1D1D1F]'
            }`}
          >
            Details
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('readiness')}
            className={`flex-1 py-1 rounded-md transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'readiness'
                ? 'bg-white text-[#1D1D1F] shadow-xs font-semibold'
                : 'text-[#86868B] hover:text-[#1D1D1F]'
            }`}
          >
            <span>Readiness</span>
            <span className="text-[10px] text-[#86868B]">
              ({readinessScore.score}%)
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('diff')}
            className={`flex-1 py-1 rounded-md transition-all ${
              activeTab === 'diff'
                ? 'bg-white text-[#1D1D1F] shadow-xs font-semibold'
                : 'text-[#86868B] hover:text-[#1D1D1F]'
            }`}
          >
            Changes
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-3.5">
        {/* TAB 1: CARD INSPECTOR */}
        {activeTab === 'inspector' && (
          activeCard ? (
            <div className="space-y-3.5">
              <div className="flex items-center justify-between pb-2 border-b border-black/[0.04]">
                <div className="text-[11px] font-semibold text-[#86868B] uppercase tracking-wider">
                  {activeCard.type.replace('_', ' ')}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => onDuplicateCard(activeCard.id)}
                    className="p-1 text-[#86868B] hover:text-[#1D1D1F] rounded hover:bg-black/[0.04] transition-colors"
                    title="Duplicate card"
                  >
                    <CopyPlus className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteCard(activeCard.id)}
                    className="p-1 text-[#86868B] hover:text-rose-600 rounded hover:bg-rose-50 transition-colors"
                    title="Delete card"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Title input */}
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-[#86868B]">Title</label>
                <input
                  type="text"
                  value={activeCard.title}
                  onChange={(e) => onUpdateCard({ ...activeCard, title: e.target.value })}
                  className="w-full text-xs p-2 bg-white border border-black/[0.08] rounded-xl focus:border-[#0071E3] focus:outline-none focus:ring-1 focus:ring-[#0071E3]/20 text-[#1D1D1F]"
                />
              </div>

              {/* Type-Specific Forms */}
              {activeCard.type === 'executive_summary' && (
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-[#86868B]">Summary</label>
                    <textarea
                      value={activeCard.summary}
                      onChange={(e) => onUpdateCard({ ...activeCard, summary: e.target.value })}
                      rows={3}
                      className="w-full text-xs p-2 bg-white border border-black/[0.08] rounded-xl focus:border-[#0071E3] focus:outline-none focus:ring-1 focus:ring-[#0071E3]/20 text-[#1D1D1F]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-[#86868B]">
                      Key Accomplishments ({activeCard.keyAccomplishments.length})
                    </label>
                    {activeCard.keyAccomplishments.map((item, idx) => (
                      <input
                        key={idx}
                        type="text"
                        value={item}
                        onChange={(e) => {
                          const updated = [...activeCard.keyAccomplishments];
                          updated[idx] = e.target.value;
                          onUpdateCard({ ...activeCard, keyAccomplishments: updated });
                        }}
                        className="w-full text-xs p-2 bg-white border border-black/[0.08] rounded-xl focus:border-[#0071E3] focus:outline-none mb-1 text-[#1D1D1F]"
                      />
                    ))}
                  </div>
                </div>
              )}

              {activeCard.type === 'kpi_metric' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-[11px] font-medium text-[#86868B]">Value</label>
                      <input
                        type="number"
                        value={activeCard.value}
                        onChange={(e) => onUpdateCard({ ...activeCard, value: parseFloat(e.target.value) || 0 })}
                        className="w-full text-xs p-2 bg-white border border-black/[0.08] rounded-xl focus:border-[#0071E3] focus:outline-none text-[#1D1D1F]"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-medium text-[#86868B]">Unit</label>
                      <input
                        type="text"
                        value={activeCard.unit}
                        onChange={(e) => onUpdateCard({ ...activeCard, unit: e.target.value })}
                        className="w-full text-xs p-2 bg-white border border-black/[0.08] rounded-xl focus:border-[#0071E3] focus:outline-none text-[#1D1D1F]"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-[11px] font-medium text-[#86868B]">Target</label>
                      <input
                        type="number"
                        value={activeCard.target ?? ''}
                        onChange={(e) => onUpdateCard({ ...activeCard, target: e.target.value === '' ? undefined : parseFloat(e.target.value) })}
                        placeholder="Optional"
                        className="w-full text-xs p-2 bg-white border border-black/[0.08] rounded-xl focus:border-[#0071E3] focus:outline-none text-[#1D1D1F]"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-medium text-[#86868B]">Previous</label>
                      <input
                        type="number"
                        value={activeCard.previousValue ?? ''}
                        onChange={(e) => onUpdateCard({ ...activeCard, previousValue: e.target.value === '' ? undefined : parseFloat(e.target.value) })}
                        placeholder="Optional"
                        className="w-full text-xs p-2 bg-white border border-black/[0.08] rounded-xl focus:border-[#0071E3] focus:outline-none text-[#1D1D1F]"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-[#86868B]">Explanation</label>
                    <textarea
                      value={activeCard.explanation || ''}
                      onChange={(e) => onUpdateCard({ ...activeCard, explanation: e.target.value })}
                      rows={2}
                      className="w-full text-xs p-2 bg-white border border-black/[0.08] rounded-xl focus:border-[#0071E3] focus:outline-none text-[#1D1D1F]"
                    />
                  </div>
                </div>
              )}

              {activeCard.type === 'risk_blocker' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-2.5 bg-white border border-black/[0.08] rounded-xl">
                    <span className="text-xs font-medium text-[#1D1D1F]">Blocker Flag</span>
                    <input
                      type="checkbox"
                      checked={activeCard.isBlocker}
                      onChange={(e) => onUpdateCard({ ...activeCard, isBlocker: e.target.checked })}
                      className="w-4 h-4 text-rose-600 rounded cursor-pointer"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-[#86868B]">Severity</label>
                    <select
                      value={activeCard.severity}
                      onChange={(e) => onUpdateCard({ ...activeCard, severity: e.target.value as any })}
                      className="w-full text-xs p-2 bg-white border border-black/[0.08] rounded-xl focus:border-[#0071E3] focus:outline-none text-[#1D1D1F]"
                    >
                      <option value="critical">Critical</option>
                      <option value="high">High</option>
                      <option value="medium">Medium</option>
                      <option value="low">Low</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-[#86868B]">Description</label>
                    <textarea
                      value={activeCard.description}
                      onChange={(e) => onUpdateCard({ ...activeCard, description: e.target.value })}
                      rows={3}
                      className="w-full text-xs p-2 bg-white border border-black/[0.08] rounded-xl focus:border-[#0071E3] focus:outline-none text-[#1D1D1F]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-[#86868B]">Impact</label>
                    <input
                      type="text"
                      value={activeCard.impact || ''}
                      onChange={(e) => onUpdateCard({ ...activeCard, impact: e.target.value })}
                      className="w-full text-xs p-2 bg-white border border-black/[0.08] rounded-xl focus:border-[#0071E3] focus:outline-none text-[#1D1D1F]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-[#86868B]">Mitigation</label>
                    <input
                      type="text"
                      value={activeCard.mitigation || ''}
                      onChange={(e) => onUpdateCard({ ...activeCard, mitigation: e.target.value })}
                      className="w-full text-xs p-2 bg-white border border-black/[0.08] rounded-xl focus:border-[#0071E3] focus:outline-none text-[#1D1D1F]"
                    />
                  </div>
                </div>
              )}

              {activeCard.type === 'next_steps' && (
                <div className="space-y-2.5">
                  <div className="text-[11px] font-medium text-[#86868B]">
                    Action Items ({activeCard.items.length})
                  </div>
                  {activeCard.items.map((item, idx) => (
                    <div key={item.id} className="p-2.5 bg-white border border-black/[0.08] rounded-xl space-y-2">
                      <input
                        type="text"
                        value={item.action}
                        onChange={(e) => {
                          const updated = [...activeCard.items];
                          updated[idx] = { ...item, action: e.target.value };
                          onUpdateCard({ ...activeCard, items: updated });
                        }}
                        placeholder="Action item"
                        className="w-full text-xs p-1.5 border border-black/[0.08] rounded-lg focus:outline-none text-[#1D1D1F]"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={item.owner || ''}
                          onChange={(e) => {
                            const updated = [...activeCard.items];
                            updated[idx] = { ...item, owner: e.target.value };
                            onUpdateCard({ ...activeCard, items: updated });
                          }}
                          placeholder="Owner (@name)"
                          className="w-full text-xs p-1.5 border border-black/[0.08] rounded-lg focus:outline-none text-[#1D1D1F]"
                        />
                        <input
                          type="text"
                          value={item.dueDate || ''}
                          onChange={(e) => {
                            const updated = [...activeCard.items];
                            updated[idx] = { ...item, dueDate: e.target.value };
                            onUpdateCard({ ...activeCard, items: updated });
                          }}
                          placeholder="Due date"
                          className="w-full text-xs p-1.5 border border-black/[0.08] rounded-lg focus:outline-none text-[#1D1D1F]"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {activeCard.type === 'visual_update' && (
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-[#86868B]">
                      WCAG Alternative Text
                    </label>
                    <input
                      type="text"
                      value={activeCard.altText}
                      onChange={(e) => onUpdateCard({ ...activeCard, altText: e.target.value })}
                      className="w-full text-xs p-2 bg-white border border-black/[0.08] rounded-xl focus:border-[#0071E3] focus:outline-none text-[#1D1D1F]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-[#86868B]">Caption</label>
                    <input
                      type="text"
                      value={activeCard.caption}
                      onChange={(e) => onUpdateCard({ ...activeCard, caption: e.target.value })}
                      className="w-full text-xs p-2 bg-white border border-black/[0.08] rounded-xl focus:border-[#0071E3] focus:outline-none text-[#1D1D1F]"
                    />
                  </div>
                </div>
              )}

              {/* Source Traceability Panel */}
              <div className="p-3 bg-white rounded-xl border border-black/[0.06] space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-[#1D1D1F]">
                    <Link2 className="w-3.5 h-3.5 text-[#0071E3]" />
                    <span>Source Grounding</span>
                  </div>
                  <span className="text-[10px] text-[#86868B]">
                    {activeCard.sourceRef?.confidence === 'explicit' ? 'Explicit Fact' : 'Manual Edit'}
                  </span>
                </div>

                {activeCard.sourceRef ? (
                  <div className="space-y-2">
                    <p className="text-xs text-[#1D1D1F] italic bg-[#F5F5F7] p-2 rounded-lg leading-relaxed">
                      "{activeCard.sourceRef.passageText}"
                    </p>
                    <button
                      type="button"
                      onClick={() => onHighlightSource(activeCard.sourceRef?.passageText)}
                      className="w-full py-1 text-xs text-[#0071E3] hover:underline flex items-center justify-center gap-1"
                    >
                      <span>Show in source notes</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <p className="text-xs text-[#86868B]">
                    Composed directly in workspace without automated citation.
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="p-8 text-center text-xs text-[#86868B]">
              Select any card to edit fields or trace source sentences.
            </div>
          )
        )}

        {/* TAB 2: EXECUTIVE-READY SCORE */}
        {activeTab === 'readiness' && (
          <div className="space-y-3.5">
            {/* Radial Activity Gauge */}
            <div className="p-4 bg-white rounded-2xl border border-black/[0.06] text-center shadow-xs flex flex-col items-center">
              <div className="relative w-24 h-24 flex items-center justify-center mb-1">
                <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r={radius}
                    stroke="#F5F5F7"
                    strokeWidth="8"
                    fill="transparent"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r={radius}
                    stroke={readinessScore.score >= 80 ? '#059669' : '#D97706'}
                    strokeWidth="8"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    fill="transparent"
                    className="transition-all duration-500 ease-out"
                  />
                </svg>
                <div className="absolute flex flex-col items-center justify-center text-center">
                  <span className="text-xl font-bold tracking-tight text-[#1D1D1F]">
                    {readinessScore.score}%
                  </span>
                  <span className="text-[10px] text-[#86868B]">
                    Score
                  </span>
                </div>
              </div>

              <div className="text-xs font-semibold text-[#1D1D1F]">
                Executive Readiness
              </div>
              <p className="text-[11px] text-[#86868B] mt-0.5">
                {readinessScore.passedChecks} of {readinessScore.totalChecks} standards met
              </p>

              {readinessScore.score < 100 && onApplyAllFixes && (
                <button
                  type="button"
                  onClick={onApplyAllFixes}
                  className="mt-3 w-full py-1.5 px-3 bg-[#0071E3] hover:bg-[#0077ED] text-white rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 shadow-2xs transition-all active:scale-[0.98]"
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>Fix All ({readinessScore.totalChecks - readinessScore.passedChecks} items)</span>
                </button>
              )}
            </div>

            {/* Checklist */}
            <div className="space-y-2">
              {readinessScore.items.map((item) => (
                <div
                  key={item.id}
                  className="p-3 bg-white rounded-xl border border-black/[0.06] space-y-1.5 shadow-2xs"
                >
                  <div className="flex items-center gap-2">
                    {item.status === 'pass' && (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    )}
                    {item.status === 'warning' && (
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    )}
                    {item.status === 'fail' && (
                      <XCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                    )}
                    <span className="text-xs font-medium text-[#1D1D1F]">
                      {item.label}
                    </span>
                  </div>

                  <p className="text-xs text-[#86868B] leading-relaxed">
                    {item.description}
                  </p>

                  {item.status !== 'pass' && (
                    <div className="pt-1.5 border-t border-black/[0.04] flex items-center justify-between text-xs gap-2">
                      <span className="text-[#0071E3] text-[11px]">
                        {item.actionableFix}
                      </span>
                      {onApplyQuickFix && (
                        <button
                          type="button"
                          onClick={() => onApplyQuickFix(item.id)}
                          className="px-2 py-0.5 bg-[#0071E3] text-white hover:bg-[#0077ED] rounded-md text-[11px] font-medium transition-colors"
                        >
                          Fix
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: WHAT'S CHANGED? SNAPSHOT DIFF */}
        {activeTab === 'diff' && (
          <div className="space-y-3.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#1D1D1F]">
                Week 40 Baseline Diff
              </span>
              {onOpenSnapshotModal && (
                <button
                  type="button"
                  onClick={onOpenSnapshotModal}
                  className="text-xs text-[#0071E3] hover:underline flex items-center gap-1"
                >
                  <GitCompare className="w-3.5 h-3.5" />
                  <span>Full View</span>
                </button>
              )}
            </div>

            {snapshotDiff ? (
              <div className="space-y-3">
                {snapshotDiff.metricChanges.length > 0 && (
                  <div className="p-3 bg-white rounded-xl border border-black/[0.06] space-y-1.5 shadow-2xs">
                    <div className="text-xs font-semibold text-[#1D1D1F]">Metrics</div>
                    {snapshotDiff.metricChanges.map((m, idx) => (
                      <div key={idx} className="flex items-center justify-between text-xs py-1 border-b border-black/[0.04] last:border-none">
                        <span className="text-[#1D1D1F]">{m.label}</span>
                        <div className="flex items-center gap-1.5 text-xs font-medium">
                          <span className="text-[#86868B] line-through">{m.oldValue}{m.unit}</span>
                          <span>→ {m.newValue}{m.unit}</span>
                          <span className={m.improved ? 'text-emerald-600' : 'text-amber-600'}>
                            ({m.diff > 0 ? `+${m.diff}` : m.diff})
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {snapshotDiff.newAccomplishments.length > 0 && (
                  <div className="p-3 bg-white rounded-xl border border-black/[0.06] space-y-1.5 shadow-2xs">
                    <div className="text-xs font-semibold text-emerald-700">New Accomplishments</div>
                    <ul className="space-y-1 text-xs text-[#1D1D1F]">
                      {snapshotDiff.newAccomplishments.map((acc, idx) => (
                        <li key={idx} className="flex items-start gap-1.5">
                          <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                          <span>{acc}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {snapshotDiff.resolvedRisks.length > 0 && (
                  <div className="p-3 bg-white rounded-xl border border-black/[0.06] space-y-1.5 shadow-2xs">
                    <div className="text-xs font-semibold text-emerald-700">Resolved Blockers</div>
                    <ul className="space-y-1 text-xs text-[#1D1D1F]">
                      {snapshotDiff.resolvedRisks.map((risk, idx) => (
                        <li key={idx} className="flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>{risk}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <button
                  type="button"
                  onClick={onOpenSnapshotModal}
                  className="w-full py-1.5 bg-[#0071E3]/10 hover:bg-[#0071E3]/15 text-xs font-medium text-[#0071E3] rounded-xl flex items-center justify-center gap-1.5 transition-colors"
                >
                  <GitCompare className="w-3.5 h-3.5" />
                  <span>Compare Full Snapshots</span>
                </button>
              </div>
            ) : (
              <div className="p-4 text-center text-xs text-[#86868B] bg-white rounded-xl border border-black/[0.06]">
                Baseline snapshot initialized.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
