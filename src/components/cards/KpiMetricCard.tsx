/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { KpiMetricCardData } from '../../types/report';
import { TrendingUp, TrendingDown, Minus, Target } from 'lucide-react';

interface Props {
  card: KpiMetricCardData;
  onInspect?: () => void;
  isInlineEditing?: boolean;
  onUpdate?: (updated: Partial<KpiMetricCardData>) => void;
}

export const KpiMetricCard: React.FC<Props> = ({ card, onInspect, isInlineEditing, onUpdate }) => {
  const isDeclining = card.trend === 'declining';
  const isImproving = card.trend === 'improving';

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-[11px] font-semibold text-[#727272] tracking-wider uppercase">
        <span>KPI Metric</span>
        {card.sourceRef && (
          <span className="text-[11px] font-normal normal-case text-[#727272]">
            Source verified
          </span>
        )}
      </div>

      <div className="flex items-baseline justify-between gap-4">
        <div>
          <h3 className="text-[13px] font-medium text-[#727272]">{card.label}</h3>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-3xl font-semibold tracking-tight text-[#1F1F1F]">
              {card.value}
            </span>
            <span className="text-base font-medium text-[#727272]">
              {card.unit}
            </span>
          </div>
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

      {card.explanation && (
        <p className="text-xs text-[#727272] leading-relaxed pt-1">
          {card.explanation}
        </p>
      )}
    </div>
  );
};
