/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { MilestoneCardData } from '../../types/report';
import { Calendar, User } from 'lucide-react';

interface Props {
  card: MilestoneCardData;
  onInspect?: () => void;
  isInlineEditing?: boolean;
  onUpdate?: (updated: Partial<MilestoneCardData>) => void;
}

export const MilestoneCard: React.FC<Props> = ({ card }) => {
  const statusStyles: Record<string, { label: string; text: string; dot: string }> = {
    achieved: { label: 'Achieved', text: 'text-emerald-600', dot: 'bg-emerald-500' },
    on_track: { label: 'On Track', text: 'text-[#0071E3]', dot: 'bg-[#0071E3]' },
    at_risk: { label: 'At Risk', text: 'text-amber-600', dot: 'bg-amber-500' },
    delayed: { label: 'Delayed', text: 'text-rose-600', dot: 'bg-rose-500' },
  };

  const current = statusStyles[card.status] || statusStyles.on_track;

  return (
    <div className="space-y-2.5">
      <div className="flex items-center gap-2 text-xs font-medium">
        <span className={`flex items-center gap-1.5 ${current.text}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${current.dot}`} />
          {current.label}
        </span>
        {card.dueDate && (
          <>
            <span className="text-[#86868B]">·</span>
            <span className="text-[#86868B] flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {card.dueDate}
            </span>
          </>
        )}
        {card.owner && (
          <>
            <span className="text-[#86868B]">·</span>
            <span className="text-[#86868B] flex items-center gap-1">
              <User className="w-3 h-3" />
              {card.owner}
            </span>
          </>
        )}
      </div>

      <h3 className="text-base font-semibold text-[#1D1D1F] tracking-tight">{card.title}</h3>
      <p className="text-sm text-[#424245] leading-relaxed">{card.description}</p>
    </div>
  );
};
