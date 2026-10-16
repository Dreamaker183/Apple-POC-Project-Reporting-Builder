/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { EditableText } from '../common/EditableText';
import { KpiMetricCardData } from '../../types/report';
import { TrendingUp, TrendingDown, Minus, Target } from 'lucide-react';
import { MetricChart, CHART_STYLE_OPTIONS } from './MetricChart';

const editInput =
  'w-full text-[13px] p-2 bg-neutral-50 border border-black/[0.1] rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#0071E3] text-[#1F1F1F]';
const editLabel = 'text-[11px] font-medium text-[#86868B] block mb-1';

interface Props {
  card: KpiMetricCardData;
  onInspect?: () => void;
  isInlineEditing?: boolean;
  onUpdate?: (updated: Partial<KpiMetricCardData>) => void;
}

export const KpiMetricCard: React.FC<Props> = ({ card, isInlineEditing, onUpdate }) => {
  const isDeclining = card.trend === 'declining';
  const isImproving = card.trend === 'improving';

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap sm:flex-nowrap items-baseline justify-between gap-2 sm:gap-4">
        <div className="flex-1 min-w-0">
          {isInlineEditing ? (
            <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
              <div>
                <label className={editLabel}>Label</label>
                <input
                  type="text"
                  value={card.label}
                  onChange={(e) => onUpdate?.({ label: e.target.value, title: e.target.value })}
                  className={editInput}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={editLabel}>Value</label>
                  <input
                    type="number"
                    step="any"
                    value={card.value}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value);
                      if (!isNaN(v)) onUpdate?.({ value: v });
                    }}
                    className={editInput}
                  />
                </div>
                <div>
                  <label className={editLabel}>Unit</label>
                  <input
                    type="text"
                    value={card.unit}
                    onChange={(e) => onUpdate?.({ unit: e.target.value })}
                    className={editInput}
                  />
                </div>
                <div>
                  <label className={editLabel}>Target</label>
                  <input
                    type="number"
                    step="any"
                    value={card.target ?? ''}
                    onChange={(e) =>
                      onUpdate?.({ target: e.target.value === '' ? undefined : parseFloat(e.target.value) })
                    }
                    placeholder="—"
                    className={editInput}
                  />
                </div>
                <div>
                  <label className={editLabel}>Previous</label>
                  <input
                    type="number"
                    step="any"
                    value={card.previousValue ?? ''}
                    onChange={(e) =>
                      onUpdate?.({ previousValue: e.target.value === '' ? undefined : parseFloat(e.target.value) })
                    }
                    placeholder="—"
                    className={editInput}
                  />
                </div>
              </div>
              <div>
                <label className={editLabel}>Graph form</label>
                <select
                  value={card.chartStyle ?? 'number'}
                  onChange={(e) => onUpdate?.({ chartStyle: e.target.value as KpiMetricCardData['chartStyle'] })}
                  className={`${editInput} capitalize cursor-pointer`}
                >
                  {CHART_STYLE_OPTIONS.map((o) => (
                    <option key={o.id} value={o.id} className="capitalize">
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={editLabel}>Explanation</label>
                <textarea
                  value={card.explanation || ''}
                  onChange={(e) => onUpdate?.({ explanation: e.target.value.trim() || undefined })}
                  rows={2}
                  className={editInput}
                />
              </div>
            </div>
          ) : (
          <>
          <h3 className="text-[13px] font-medium text-[#727272]"><EditableText value={card.label} label="metric label" onCommit={(label) => onUpdate?.({ label, title: label })} /></h3>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-2xl sm:text-3xl font-semibold tracking-tight text-[#1F1F1F]">
              <EditableText value={String(card.value)} label="metric value" onCommit={(text) => { const value = Number(text); if (Number.isFinite(value)) onUpdate?.({ value }); }} />
            </span>
            <span className="text-sm sm:text-base font-medium text-[#727272]">
              <EditableText value={card.unit} label="metric unit" placeholder="unit" allowEmpty onCommit={(unit) => onUpdate?.({ unit })} />
            </span>
          </div>
          </>
          )}
        </div>

        {card.trend && (
          <div className="flex items-center gap-1.5 text-xs font-medium">
            {isDeclining ? (
              <span className="flex items-center gap-1 text-amber-700">
                <TrendingDown className="w-3.5 h-3.5" />
                Attention
              </span>
            ) : isImproving ? (
              <span className="flex items-center gap-1 text-emerald-700">
                <TrendingUp className="w-3.5 h-3.5" />
                On Track
              </span>
            ) : (
              <span className="flex items-center gap-1 text-[#727272]">
                <Minus className="w-3.5 h-3.5" />
                Neutral
              </span>
            )}
          </div>
        )}
      </div>

      {(card.target !== undefined || card.previousValue !== undefined) && (
        <div className="pt-2 border-t border-black/[0.05] flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#727272]">
          {card.target !== undefined && (
            <span className="flex items-center gap-1">
              <Target className="w-3 h-3 text-[#0071E3]" />
              Target: <strong className="font-semibold text-[#1F1F1F]">{card.target}{card.unit}</strong>
            </span>
          )}
          {card.target !== undefined && card.previousValue !== undefined && <span>·</span>}
          {card.previousValue !== undefined && (
            <span>
              Previous: <strong className="font-semibold text-[#1F1F1F]">{card.previousValue}{card.unit}</strong>
            </span>
          )}
        </div>
      )}

      {(card.chartStyle ?? 'number') !== 'number' && (
        <div className="pt-1">
          <MetricChart
            datum={{
              value: card.value,
              unit: card.unit,
              target: card.target,
              previousValue: card.previousValue,
              trend: card.trend,
            }}
            style={card.chartStyle ?? 'number'}
          />
        </div>
      )}

      {card.explanation && (
        <p className="text-xs text-[#727272] leading-relaxed pt-1">
          <EditableText
            value={card.explanation}
            label="metric explanation"
            multiline
            allowEmpty
            onCommit={(explanation) => onUpdate?.({ explanation: explanation.trim() || undefined })}
          />
        </p>
      )}
    </div>
  );
};
