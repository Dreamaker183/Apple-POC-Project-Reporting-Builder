/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { RiskBlockerCardData } from '../../types/report';
import { AlertCircle, ShieldAlert } from 'lucide-react';

interface Props {
  card: RiskBlockerCardData;
  onInspect?: () => void;
  isInlineEditing?: boolean;
  onUpdate?: (updated: Partial<RiskBlockerCardData>) => void;
}

export const RiskBlockerCard: React.FC<Props> = ({ card }) => {
  const isBlocker = card.isBlocker;
  
  const severityLabels: Record<string, { label: string; text: string; dot: string }> = {
    critical: { label: 'Critical Severity', text: 'text-rose-600', dot: 'bg-rose-500' },
    high: { label: 'High Severity', text: 'text-amber-600', dot: 'bg-amber-500' },
    medium: { label: 'Medium Severity', text: 'text-yellow-600', dot: 'bg-yellow-500' },
    low: { label: 'Low Severity', text: 'text-[#86868B]', dot: 'bg-neutral-400' },
  };

  const severity = severityLabels[card.severity] || severityLabels.medium;

  return (
    <div className="space-y-3">
      {/* Title & Status */}
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-medium">
            <span className={`flex items-center gap-1.5 ${severity.text}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${severity.dot}`} />
              {isBlocker ? 'Critical Blocker' : 'Identified Risk'}
            </span>
            <span className="text-[#86868B]">·</span>
            <span className="text-[#86868B]">{severity.label}</span>
          </div>
          <h3 className="text-base font-semibold text-[#1D1D1F] tracking-tight">
            {card.title}
          </h3>
        </div>
      </div>

      <p className="text-sm text-[#424245] leading-relaxed">
        {card.description}
      </p>

      {(card.impact || card.mitigation) && (
        <div className="pt-3 border-t border-black/[0.05] grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          {card.impact && (
            <div className="space-y-0.5">
              <span className="text-[11px] font-semibold text-[#86868B] uppercase tracking-wider">
                Impact
              </span>
              <p className="text-[#1D1D1F] leading-relaxed">{card.impact}</p>
            </div>
          )}
          {card.mitigation && (
            <div className="space-y-0.5">
              <span className="text-[11px] font-semibold text-[#86868B] uppercase tracking-wider">
                Mitigation
              </span>
              <p className="text-[#1D1D1F] leading-relaxed">{card.mitigation}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
