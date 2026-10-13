/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ExecutiveSummaryCardData } from '../../types/report';
import { Sparkles, FileText, CheckCircle2 } from 'lucide-react';

interface Props {
  card: ExecutiveSummaryCardData;
  onInspect?: () => void;
  isInlineEditing?: boolean;
  onUpdate?: (updated: Partial<ExecutiveSummaryCardData>) => void;
}

export const ExecutiveSummaryCard: React.FC<Props> = ({ card, onInspect, isInlineEditing, onUpdate }) => {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-[11px] font-semibold text-[#727272] tracking-wider uppercase">
        <span className="flex items-center gap-1.5">
          <FileText className="w-3.5 h-3.5 text-[#0071E3]" />
          Executive Summary
        </span>
        {card.sourceRef && (
          <span className="text-[11px] font-normal normal-case text-[#727272]">
            Source verified
          </span>
        )}
      </div>

      {isInlineEditing ? (
        <div className="space-y-3" onClick={(e) => e.stopPropagation()}>
          <textarea
            aria-label="Summary Text"
            value={card.summary}
            onChange={(e) => onUpdate?.({ summary: e.target.value })}
            className="w-full text-[14px] leading-relaxed p-2.5 bg-neutral-50 border border-black/[0.1] rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#0071E3]"
            rows={3}
          />
        </div>
      ) : (
        <p className="text-[14px] leading-relaxed text-[#1F1F1F]">
          {card.summary}
        </p>
      )}

      {card.keyAccomplishments.length > 0 && (
        <div className="pt-2 border-t border-black/[0.05]">
          <div className="text-[11px] font-semibold text-[#727272] mb-1.5 uppercase tracking-wide">
            Key Accomplishments
          </div>
          <ul className="space-y-1.5">
            {card.keyAccomplishments.map((item, idx) => (
              <li key={idx} className="flex items-start gap-2 text-[13px] text-[#333333]">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 mt-0.5 shrink-0" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {card.statusNote && (
        <div className="mt-2 p-2.5 bg-amber-500/[0.06] border border-amber-500/20 rounded-md text-[12px] text-amber-900 flex items-start gap-2">
          <span className="font-semibold text-amber-700 shrink-0">Note:</span>
          <span>{card.statusNote}</span>
        </div>
      )}
    </div>
  );
};
