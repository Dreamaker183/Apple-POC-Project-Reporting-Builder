/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { EditableText } from '../common/EditableText';
import { RiskBlockerCardData } from '../../types/report';
import { AlertCircle, ShieldAlert } from 'lucide-react';

interface Props {
  card: RiskBlockerCardData;
  onInspect?: () => void;
  isInlineEditing?: boolean;
  onUpdate?: (updated: Partial<RiskBlockerCardData>) => void;
}

export const RiskBlockerCard: React.FC<Props> = ({ card, isInlineEditing, onUpdate }) => {
  const isBlocker = card.isBlocker;
  
  const severityLabels: Record<string, { label: string; text: string; dot: string }> = {
    critical: { label: 'Critical Severity', text: 'text-rose-600', dot: 'bg-rose-500' },
    high: { label: 'High Severity', text: 'text-amber-600', dot: 'bg-amber-500' },
    medium: { label: 'Medium Severity', text: 'text-yellow-600', dot: 'bg-yellow-500' },
    low: { label: 'Low Severity', text: 'text-[#86868B]', dot: 'bg-neutral-400' },
  };

  const severity = severityLabels[card.severity] || severityLabels.medium;

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
            rows={3}
            className={editInput}
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className={editLabel}>Severity</label>
            <select
              value={card.severity}
              onChange={(e) => onUpdate?.({ severity: e.target.value as RiskBlockerCardData['severity'] })}
              className={`${editInput} cursor-pointer`}
            >
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
          <label className="flex items-center gap-2 text-[13px] text-[#1F1F1F] pt-5 cursor-pointer">
            <input
              type="checkbox"
              checked={card.isBlocker}
              onChange={(e) => onUpdate?.({ isBlocker: e.target.checked })}
              className="w-4 h-4 accent-rose-600 cursor-pointer"
            />
            Blocker
          </label>
        </div>
        <div>
          <label className={editLabel}>Impact</label>
          <input
            type="text"
            value={card.impact || ''}
            onChange={(e) => onUpdate?.({ impact: e.target.value })}
            className={editInput}
          />
        </div>
        <div>
          <label className={editLabel}>Mitigation</label>
          <input
            type="text"
            value={card.mitigation || ''}
            onChange={(e) => onUpdate?.({ mitigation: e.target.value })}
            className={editInput}
          />
        </div>
      </div>
    );
  }

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
            <EditableText value={card.title} label="risk title" onCommit={(title) => onUpdate?.({ title })} />
          </h3>
        </div>
      </div>

      <p className="text-sm text-[#424245] leading-relaxed">
        <EditableText value={card.description} label="risk description" multiline onCommit={(description) => onUpdate?.({ description })} />
      </p>

      {(card.impact || card.mitigation) && (
        <div className="pt-3 border-t border-black/[0.05] grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          {card.impact && (
            <div className="space-y-0.5">
              <span className="text-[11px] font-semibold text-[#86868B] uppercase tracking-wider">
                Impact
              </span>
              <EditableText value={card.impact} label="impact" multiline onCommit={(impact) => onUpdate?.({ impact })} className="text-[#1D1D1F] leading-relaxed" />
            </div>
          )}
          {card.mitigation && (
            <div className="space-y-0.5">
              <span className="text-[11px] font-semibold text-[#86868B] uppercase tracking-wider">
                Mitigation
              </span>
              <EditableText value={card.mitigation} label="mitigation" multiline onCommit={(mitigation) => onUpdate?.({ mitigation })} className="text-[#1D1D1F] leading-relaxed" />
            </div>
          )}
        </div>
      )}
    </div>
  );
};
