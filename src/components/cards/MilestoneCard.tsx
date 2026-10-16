/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { EditableText } from '../common/EditableText';
import { MilestoneCardData } from '../../types/report';
import { Calendar, User } from 'lucide-react';

interface Props {
  card: MilestoneCardData;
  onInspect?: () => void;
  isInlineEditing?: boolean;
  onUpdate?: (updated: Partial<MilestoneCardData>) => void;
}

export const MilestoneCard: React.FC<Props> = ({ card, isInlineEditing, onUpdate }) => {
  const statusStyles: Record<string, { label: string; text: string; dot: string }> = {
    achieved: { label: 'Achieved', text: 'text-emerald-600', dot: 'bg-emerald-500' },
    on_track: { label: 'On Track', text: 'text-[#0071E3]', dot: 'bg-[#0071E3]' },
    at_risk: { label: 'At Risk', text: 'text-amber-600', dot: 'bg-amber-500' },
    delayed: { label: 'Delayed', text: 'text-rose-600', dot: 'bg-rose-500' },
  };

  const current = statusStyles[card.status] || statusStyles.on_track;

  const editInput =
    'w-full text-[13px] p-2 bg-neutral-50 border border-black/[0.1] rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#0071E3] text-[#1F1F1F]';
  const editLabel = 'text-[11px] font-medium text-[#86868B] block mb-1';

  if (isInlineEditing) {
    return (
      <div className="space-y-2.5" onClick={(e) => e.stopPropagation()}>
        <div>
          <label className={editLabel}>Title</label>
          <input
            type="text"
            value={card.title}
            onChange={(e) => onUpdate?.({ title: e.target.value })}
            className={`${editInput} font-semibold`}
          />
        </div>
        <div>
          <label className={editLabel}>Description</label>
          <textarea
            value={card.description}
            onChange={(e) => onUpdate?.({ description: e.target.value })}
            rows={2}
            className={editInput}
          />
        </div>
        <div>
          <label className={editLabel}>Status</label>
          <select
            value={card.status}
            onChange={(e) => onUpdate?.({ status: e.target.value as MilestoneCardData['status'] })}
            className={`${editInput} cursor-pointer`}
          >
            <option value="achieved">Achieved</option>
            <option value="on_track">On Track</option>
            <option value="at_risk">At Risk</option>
            <option value="delayed">Delayed</option>
          </select>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className={editLabel}>Due date</label>
            <input
              type="text"
              value={card.dueDate || ''}
              onChange={(e) => onUpdate?.({ dueDate: e.target.value.trim() || undefined })}
              className={editInput}
            />
          </div>
          <div>
            <label className={editLabel}>Owner</label>
            <input
              type="text"
              value={card.owner || ''}
              onChange={(e) => onUpdate?.({ owner: e.target.value.trim() || undefined })}
              className={editInput}
            />
          </div>
        </div>
      </div>
    );
  }

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
               <EditableText
                 value={card.dueDate}
                 label="due date"
                 allowEmpty
                 onCommit={(dueDate) => onUpdate?.({ dueDate: dueDate.trim() || undefined })}
               />
            </span>
          </>
        )}
        {card.owner && (
          <>
            <span className="text-[#86868B]">·</span>
            <span className="text-[#86868B] flex items-center gap-1">
              <User className="w-3 h-3" />
               <EditableText
                 value={card.owner}
                 label="owner"
                 allowEmpty
                 onCommit={(owner) => onUpdate?.({ owner: owner.trim() || undefined })}
               />
            </span>
          </>
        )}
      </div>

      <h3 className="text-base font-semibold text-[#1D1D1F] tracking-tight"><EditableText value={card.title} label="milestone title" onCommit={(title) => onUpdate?.({ title })} /></h3>
      <EditableText value={card.description} label="milestone description" multiline onCommit={(description) => onUpdate?.({ description })} className="text-sm text-[#424245] leading-relaxed" />
    </div>
  );
};
